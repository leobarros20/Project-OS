---
name: handoff
description: Return finished work to the lead for review and commit. Worker threads only — never commit, push, merge or deploy. Reads .project-os/config.json for the repo, tracker, lanes and verify command.
---

# /handoff — return finished work

Team tier and above (`.project-os/config.json` → `tier`). At solo tier there is
no lead to hand to; commit directly.

Read `.project-os/config.json` first. Every `<bracket>` below comes from it.

## 1. Get green before you hand off

```
<verify>
```

Don't hand off broken. A worker's "done" is a claim the lead re-verifies, so a
failing handoff costs two people's time instead of one.

## 2. Leave the work uncommitted

**Do not stage, commit, branch, or push — anywhere, including a worktree.**
Fail-closed hooks block it at team tier, and that block is the system working.

- **Shared tree:** leave the edits in place; the lead picks them up from `git status`.
- **Isolated worktree:** leave them uncommitted there and name the path below.
  Worktrees are auto-cleaned only when unchanged, so uncommitted work is safe.

## 3. File the queue entry

**`tracker: github`**
```bash
gh label create ready-for-review --repo <repo> --color FBCA04 \
  --description "Worker handoff awaiting lead review" 2>/dev/null || true

gh issue create --repo <repo> --label ready-for-review \
  --title "HANDOFF: <lane> — <short summary>" \
  --body "$(cat <<'BODY'
**Tree:** <shared working tree | .claude/worktrees/NAME/>
**What changed:** <files + symbols + why>
**Verification done:** <exact commands run + result>
**UI?** <trail left where the project keeps it, or n/a>
**QA ticket:** <#issue — REQUIRED for a feature; n/a for docs/policy/refactor>
**Needs <owner> action:** <deploy / secret / console, or none>
BODY
)"
```

**`tracker: gitlab`** — same body, `glab issue create --label ready-for-review`.
**`tracker: linear`** — same body as the issue description, label `ready-for-review`.
**`tracker: none`** — degrade, never break: append the same body to
`<docsPath>handoffs/YYYY-MM-DD-<lane>.md`. A file queue is worse than an issue
queue at notifying, and it is much better than no queue.

Lanes for this project: `<lanes>`.

## 4. Stop

No commit, no push, no merge, no deploy — even if the task appears to require
it. If it does, say so in the queue entry and stop. The lead reviews, verifies,
commits and closes.

If the contested file another lane is also editing needs a change, **note the
intended edit in the handoff instead of racing on the file.** The lead
serializes at commit time.
