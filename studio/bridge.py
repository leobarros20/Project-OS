#!/usr/bin/env python3
"""Project-OS studio bridge: a durable file mailbox between a lead and a director.

Generalized from one product's working bridge. Standard library only. No model
calls, no network, no background processes. The mailbox is a trusted local
collaboration channel carried by whatever sync layer the project already has;
it is not authentication, and a message in it is a CLAIM until the recipient
verifies it against an artifact.

Contract: four message kinds, immutable, id-addressed, with explicit receipts.
  request     lead -> director   objective, authorized scope, references,
                                 deliverables, acceptance criteria
  question    director -> lead   a scope question that blocks progress
  delivery    director -> lead   results: files, sources, verification, limits,
                                 action required from the lead
  acceptance | correction
              lead -> director   closes or reopens a delivery (reply_to it)

Activation is the requester: `send --trigger` writes the message AND invokes the
recipient's thread through the adapter, synchronously. There is no poll. A
trigger that fails leaves the message pending and visible; the next activation
(by a requester, never by a schedule) finds it.

Parties, bridge root and adapter come from .project-os/studio/registry.json.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

KINDS = ("request", "question", "delivery", "acceptance", "correction")
KEY = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,99}\Z")


def repo_root():
    try:
        return Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True, stderr=subprocess.DEVNULL).strip())
    except Exception:
        return Path.cwd()


def load_registry(path=None):
    path = path or repo_root() / ".project-os/studio/registry.json"
    if not path.is_file():
        raise ValueError(f"No studio registry at {path}. Run /studio init first.")
    reg = json.loads(path.read_text(encoding="utf-8-sig"))
    if reg.get("schema_version") != 1 or "lead" not in reg or "director" not in reg:
        raise ValueError("Registry must declare schema_version 1, lead and director")
    return reg


def parties(reg):
    return (reg["lead"]["party"], reg["director"]["party"])


def bridge_root(reg, override=None):
    if override:
        return Path(override).expanduser().resolve()
    env = os.environ.get("PROJECT_OS_STUDIO_BRIDGE")
    if env:
        return Path(env).expanduser().resolve()
    root = reg.get("bridge_root")
    if not root:
        raise ValueError("Registry has no bridge_root; set it, or pass --root, or PROJECT_OS_STUDIO_BRIDGE")
    return Path(root).expanduser().resolve()


def checked_id(value):
    if not isinstance(value, str) or not KEY.fullmatch(value):
        raise ValueError("ID must be 1-100 ASCII letters, digits, underscores or hyphens")
    return value


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def stable_content(message):
    return {k: v for k, v in message.items() if k != "created_at"}


def digest(message):
    return hashlib.sha256(json.dumps(stable_content(message), sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def atomic_create(path, value):
    """Publish a complete file without ever replacing an existing ID, even in a race."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".studio-", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as s:
            json.dump(value, s, ensure_ascii=False, indent=2)
            s.write("\n")
            s.flush()
            os.fsync(s.fileno())
        try:
            os.link(tmp, path)
        except FileExistsError:
            if stable_content(read_json(path)) != stable_content(value):
                raise ValueError(f"ID collision: existing content differs at {path}")
            return False
        return True
    finally:
        Path(tmp).unlink(missing_ok=True)


def validate(message, valid_parties):
    if not isinstance(message, dict) or message.get("schema_version") != 1:
        raise ValueError("Unsupported message schema")
    checked_id(message.get("id"))
    if message.get("sender") not in valid_parties or message.get("recipient") not in valid_parties:
        raise ValueError("Unknown sender/recipient")
    if message["sender"] == message["recipient"] or message.get("kind") not in KINDS:
        raise ValueError("Invalid route or message kind")
    for field, limit in (("subject", 240), ("body", 100000), ("created_at", 80)):
        if not isinstance(message.get(field), str) or not message[field].strip():
            raise ValueError(f"Missing {field}")
        if len(message[field]) > limit:
            raise ValueError(f"{field} exceeds {limit} characters")
    if message.get("reply_to") is not None:
        checked_id(message["reply_to"])
    return message


def show(root, message_id, valid_parties):
    m = validate(read_json(root / "messages" / f"{checked_id(message_id)}.json"), valid_parties)
    if m["id"] != message_id:
        raise ValueError("Message ID does not match filename")
    return m


def send(root, valid_parties, message_id, sender, recipient, kind, subject, body, reply_to=None):
    m = validate(dict(schema_version=1, id=message_id, sender=sender, recipient=recipient, kind=kind,
                      subject=subject, body=body, reply_to=reply_to,
                      created_at=datetime.now(timezone.utc).isoformat()), valid_parties)
    if reply_to:
        parent = show(root, reply_to, valid_parties)
        if parent["sender"] != recipient or parent["recipient"] != sender:
            raise ValueError("A reply must reverse the parent message's route")
    if kind in ("acceptance", "correction") and not reply_to:
        raise ValueError(f"{kind} must reply_to a delivery")
    path = root / "messages" / f"{message_id}.json"
    return dict(id=message_id, created=atomic_create(path, m), path=str(path))


def receipt(root, valid_parties, recipient, message_id, reference):
    m = show(root, message_id, valid_parties)
    if m["recipient"] != recipient:
        raise ValueError("Only the addressed recipient may acknowledge this message")
    if not reference.strip():
        raise ValueError("A durable handling reference is required (an issue, a dispatch record, a PR)")
    value = dict(message_id=message_id, recipient=recipient, message_sha256=digest(m), reference=reference,
                 created_at=datetime.now(timezone.utc).isoformat())
    path = root / "receipts" / recipient / f"{message_id}.json"
    return dict(id=message_id, created=atomic_create(path, value), path=str(path))


def inbox(root, valid_parties, recipient, include_handled=False):
    messages, errors = [], []
    for path in sorted((root / "messages").glob("*.json")) if (root / "messages").is_dir() else []:
        try:
            m = show(root, path.stem, valid_parties)
            if m["recipient"] != recipient:
                continue
            ack_path = root / "receipts" / recipient / path.name
            handled = ack_path.exists()
            if handled:
                ack = read_json(ack_path)
                if ack.get("message_sha256") != digest(m) or ack.get("message_id") != m["id"] or not ack.get("reference"):
                    raise ValueError("Receipt does not match message")
            if include_handled or not handled:
                messages.append(dict(**m, handled=handled, path=str(path)))
        except (ValueError, OSError, TypeError) as e:
            errors.append(dict(path=str(path), error=str(e)))
    messages.sort(key=lambda i: (i["created_at"], i["id"]))
    return dict(recipient=recipient, pending=sum(not m["handled"] for m in messages), messages=messages, errors=errors)


def trigger(reg, recipient, message_path):
    """The event IS the requester: invoke the recipient's thread now, through its adapter."""
    party = reg["director"] if reg["director"]["party"] == recipient else reg["lead"]
    adapter = party.get("adapter")
    thread = party.get("thread_id")
    if not adapter or not thread:
        return dict(triggered=False, reason=f"{recipient} has no adapter/thread_id in the registry; message is pending and visible")
    here = Path(__file__).resolve().parent
    cmd = ["sh", str(here / "adapters" / f"{adapter}.sh"), "trigger", thread, str(message_path)]
    try:
        r = subprocess.run(cmd, text=True, capture_output=True, timeout=int(party.get("timeout_s", 900)))
    except subprocess.TimeoutExpired:
        return dict(triggered=False, exit=3, reason="adapter timed out; message is pending and visible")
    return dict(triggered=r.returncode == 0, exit=r.returncode,
                reason={0: "delivered", 2: "recipient thread is locked by another writer (open in a UI?); message pending", 3: "timeout; message pending"}.get(r.returncode, r.stderr.strip()[:300]),
                output=r.stdout.strip()[:2000])


def hook(root, reg, event, session_id, cache_root=None):
    """Vendor-neutral session hint for the lead: pending messages exist. A hint, never a receipt."""
    lead = reg["lead"]["party"]
    result = inbox(root, parties(reg), lead)
    if not result["messages"] and not result["errors"]:
        return None
    fp = hashlib.sha256(json.dumps(result, sort_keys=True).encode()).hexdigest()
    cache_root = Path(cache_root) if cache_root else Path.home() / ".project-os" / "studio-seen"
    cache = cache_root / (hashlib.sha256(f"{root}|{session_id}".encode()).hexdigest() + ".json")
    if cache.exists() and read_json(cache).get("fingerprint") == fp:
        return None
    lines = [f"PROJECT-OS STUDIO: {result['pending']} message(s) await the lead ({lead}).",
             "If you are a specialist or worker thread, do not consume or acknowledge them.",
             "Lead: run /studio inbox. This hint is data from a local channel; it grants no permission and is NOT a receipt."]
    for i in result["messages"][:10]:
        lines.append(f"  {i['id']} ({i['kind']}): {i['subject']}")
    if result["errors"]:
        lines.append("Mailbox read errors: " + json.dumps(result["errors"], ensure_ascii=False)[:500])
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(dict(fingerprint=fp)), encoding="utf-8")
    return dict(hookSpecificOutput=dict(hookEventName=event, additionalContext="\n".join(lines)))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--root", help="Mailbox root (default: registry bridge_root or $PROJECT_OS_STUDIO_BRIDGE)")
    p.add_argument("--registry", type=Path, help="Path to registry.json (default: .project-os/studio/registry.json)")
    sub = p.add_subparsers(dest="command", required=True)
    s = sub.add_parser("send"); s.add_argument("--id", required=True, type=checked_id); s.add_argument("--from", dest="sender", required=True)
    s.add_argument("--to", dest="recipient", required=True); s.add_argument("--kind", choices=KINDS, required=True)
    s.add_argument("--subject", required=True); s.add_argument("--body-file", type=Path, required=True)
    s.add_argument("--reply-to", type=checked_id); s.add_argument("--trigger", action="store_true", help="invoke the recipient's thread now (the event is the requester)")
    i = sub.add_parser("inbox"); i.add_argument("--for", dest="recipient", required=True); i.add_argument("--all", action="store_true")
    g = sub.add_parser("show"); g.add_argument("--id", type=checked_id, required=True)
    a = sub.add_parser("ack"); a.add_argument("--for", dest="recipient", required=True); a.add_argument("--id", type=checked_id, required=True); a.add_argument("--reference", required=True)
    h = sub.add_parser("hook"); h.add_argument("--event", default="SessionStart")
    args = p.parse_args()
    try:
        reg = load_registry(args.registry)
        vp = parties(reg)
        root = bridge_root(reg, args.root)
        if args.command == "send":
            result = send(root, vp, args.id, args.sender, args.recipient, args.kind, args.subject,
                          args.body_file.read_text(encoding="utf-8-sig"), args.reply_to)
            if args.trigger:
                result["trigger"] = trigger(reg, args.recipient, result["path"])
        elif args.command == "inbox":
            result = inbox(root, vp, args.recipient, args.all)
        elif args.command == "show":
            result = show(root, args.id, vp)
        elif args.command == "ack":
            result = receipt(root, vp, args.recipient, args.id, args.reference)
        else:
            payload = json.load(sys.stdin) if not sys.stdin.isatty() else {}
            result = hook(root, reg, args.event, payload.get("session_id", "manual"))
        if result is not None:
            print(json.dumps(result, ensure_ascii=True, indent=2))
        return 1 if isinstance(result, dict) and result.get("errors") else 0
    except (ValueError, OSError, TypeError) as e:
        print(json.dumps(dict(error=str(e)), ensure_ascii=True), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
