#!/bin/sh
# project-os v0.6.2 — studio adapter: Codex CLI
#
#   trigger <thread-id> <message-file>   drive the director's existing thread NOW
#   notify-hook                          Codex `notify` handler: wake the lead's review
#
# Verified on Codex CLI 0.153.2: `codex exec resume <threadId> "<prompt>"` drives
# an existing thread from any shell, synchronously; the turn lands as role=user.
# In exec mode the director has native multi-agent tools (spawn_agent,
# wait_agent, send_message, list_agents, followup_task; feature `multi_agent`),
# so a director triggered from a console can create and run its specialists
# without the desktop app.
#
# Exit codes for `trigger`:  0 delivered · 2 thread locked by another writer
# (it is open in a UI: Codex holds a single-writer lock, released only when the
# holding process exits) · 3 timeout · 1 other failure. Never silent.

CMD="${1:-}"; shift 2>/dev/null

case "$CMD" in
  trigger)
    THREAD="${1:?thread-id}"; MSG="${2:?message-file}"
    command -v codex >/dev/null 2>&1 || { echo "codex not on PATH" 1>&2; exit 1; }
    PROMPT="A new Project-OS studio message is addressed to you at: $MSG
Read it with the bridge CLI (inbox --for <your party>), act per your director runbook, acknowledge it with a durable reference, and reply through the bridge. Do not commit to the default branch."
    OUT="$(mktemp 2>/dev/null || echo "/tmp/po-studio-$$.txt")"
    # `timeout` is not universal (absent on macOS by default); fall back to no limit.
    if command -v timeout >/dev/null 2>&1; then
      timeout "${PROJECT_OS_STUDIO_TIMEOUT:-900}" codex exec resume "$THREAD" "$PROMPT" -o "$OUT" 2>"$OUT.err"; RC=$?
    else
      codex exec resume "$THREAD" "$PROMPT" -o "$OUT" 2>"$OUT.err"; RC=$?
    fi
    if grep -q "already has an active writer" "$OUT.err" 2>/dev/null; then
      echo "director thread $THREAD is open in another client (single-writer lock). Message stays pending in the mailbox." 1>&2
      rm -f "$OUT" "$OUT.err"; exit 2
    fi
    [ "$RC" -eq 124 ] && { echo "timeout driving $THREAD" 1>&2; rm -f "$OUT" "$OUT.err"; exit 3; }
    cat "$OUT" 2>/dev/null; rm -f "$OUT" "$OUT.err"
    exit "$RC"
    ;;
  notify-hook)
    # Codex `notify` fires on agent-turn-complete with a JSON argument that
    # carries cwd. When the finished turn belongs to a repo with a studio, mark
    # the lead's inbox as needing review — the delivery IS the event that wakes
    # the review, not a poll. The marker is machine-local and read by activation.
    JSON="${1:-}"
    CWD="$(printf '%s' "$JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).cwd||"")}catch{console.log("")}})' 2>/dev/null)"
    [ -n "$CWD" ] && [ -f "$CWD/.project-os/studio/registry.json" ] || exit 0
    date -u +%Y-%m-%dT%H:%M:%SZ > "$CWD/.project-os/studio/review-pending"
    exit 0
    ;;
  *)
    echo "usage: codex.sh trigger <thread-id> <message-file> | notify-hook <json>" 1>&2; exit 1 ;;
esac
