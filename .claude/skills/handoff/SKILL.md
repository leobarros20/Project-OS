---
name: handoff
description: Return finished work to the lead as a pull request from your own branch. Worker threads only — never touch main, never merge. Reads .project-os/config.json for the repo, tracker, lanes and verify command.
---

# /handoff — return finished work

Team tier and above (`.project-os/config.json` → `tier`). At solo tier there is
no lead to hand to; commit directly.

You are one topic, on one branch. Everything you decided lives in this thread
and this branch; the PR is where the record of *how* it was resolved ends up.
Keep it that way — do not wander into another team's territory, and do not
touch `main`.

## 1. Get green

```
<verify>
```

Don't hand off broken. A worker's "done" is a claim the merger re-verifies, so
a failing handoff costs two people's time instead of one.

## 2. Rebase on main, then push your branch

```bash
git fetch origin && git rebase origin/main     # resolve conflicts HERE, on your branch
git push --force-with-lease origin <your-branch>
```

A PR that drifts behind `main` is a zombie: it cannot be reviewed against
reality and its conflicts compound. Rebasing is yours to do, every time you
open or update the PR. Your branch is yours to commit and push freely; `main`
is never yours.

## 3. Open (or update) the pull request

**`tracker: github`**
```bash
gh pr create --repo <repo> --base main --head <your-branch> \
  --title "<lane>: <short summary>" \
  --body "$(cat <<'BODY'
**What changed:** <files + symbols + why>
**Verification done:** <exact commands run + result, on the rebased branch>
**UI?** <trail left where the project keeps it, or n/a>
**QA ticket:** <#issue — REQUIRED for a feature; n/a for docs/policy/refactor>
**Needs <owner> action:** <deploy / secret / console, or none>
**Territory touched outside my lane:** <none, or which files and why — the merger decides>
BODY
)"
```

**`tracker: gitlab`** — same body, `glab mr create`.
**`tracker: linear`** — open the PR on the remote; link it from the issue.
**`tracker: none`** — no PR-capable remote: use the **uncommitted variant**.
Leave the work uncommitted in your tree, append the same body to
`<docsPath>handoffs/YYYY-MM-DD-<lane>.md`, and know the risk: uncommitted work
in a worktree disappears with a `worktree remove`.

Lanes for this project: `<lanes>`.

## 4. Stop

No merge, no push to `main`, no deploy — even if the task appears to require
it. If it does, say so in the PR and stop. The merger reviews, verifies in a
clean worktree, resolves any conflict *between* PRs, and merges.
