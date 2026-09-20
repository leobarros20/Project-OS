# Journal — Project-OS

Append-at-top. One entry per session that changed the repo. What was done AND what could not be verified.

## 2026-09-20 · Project OS Team lead (Claude)

### Done
- `scripts/init.mjs` shipped: the install command six files named and none shipped. Copies the runtime, merges vendor hooks (foreign hooks kept), writes the static block, gitignore, pre-push; ends with an observed injection from root and a subdirectory. Verified in a scratch repo: dry-run writes nothing; real run 8 changes; idempotent rerun 0 changes; refusal path on a foreign pre-push.
- `/project-os init` section in the skill. Version 0.6.4 in lockstep.
- This journal created; it moves from DEBT (self-host-1) to CALENDAR in the manifest.

### Not verified
- `init` against a real adopter with an existing `.codex/hooks.json` or `.gemini/settings.json` (only `.claude/` with a foreign hook was exercised).
- Codex trust after init: the merged entry will show untrusted until a human trusts it in `/hooks`; not observable from here.

### Known gaps
- **Unpublished.** origin/main = e7f9fa1 (v0.6). Local: 0.6.4, 7 commits and 4 tags ahead. External adopters see 0.6 and a 404 on version.json. The push waits on the owner's own word in this session or his own hands; relayed instructions were refused four times on purpose.
- Update detection (activation reporting local vs canonical in its first line) accepted 09-10, not started.
- Spec-repo exemption (self-host-2/3) still undecided by the owner; DEBT expiries 2026-11-15.

### Next session
- Update detection, per `paye-hq/briefs/project-os-update-detection.md` sections A–J.
