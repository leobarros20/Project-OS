---
name: handoffs
description: Drain the handoff queue — list every workstream ready for review, verify each, then commit and close. Lead only. Run it at the start of a working turn so the user never has to relay a handoff.
---

# /handoffs — drain the queue

Lead only. Read `.project-os/config.json`; every `<bracket>` comes from it.

## 1. Gather the queue (three sources, not one)

```bash
# declared queue — tracker: github
gh issue list --repo <repo> --label ready-for-review --state open
# tracker: none → ls <docsPath>handoffs/

git status --short        # shared-tree work other sessions left
git worktree list         # isolated worktrees, work left uncommitted inside
```

Map the three together. Do **not** sweep in uncommitted edits nobody handed
off: that is either in-flight work that does not compile yet, or another lane's
half-finished slice. Both have happened, and both look identical to a handoff
from the outside.

## 2. Review, then integrate

A worker's "done" is **a claim to re-verify, not a guarantee** — the tree may
also have changed since the claim was written.

1. Read the actual diff. Not the summary of it.
2. Run the integrated gate on the combined result: `<verify>`. Per-file checks
   pass on collisions that only break when the pieces load together — the same
   name declared in two lanes, the same shared record written with mismatched
   shapes. Catching those is the whole reason one person integrates.
3. **Bounce** a substantive handoff missing its docs artifacts: journal-worthy
   work with no artifact updates, a feature with no QA ticket. Returning
   incomplete work is the gate doing its job.

If another lane's in-flight work breaks compilation, verify yours in a clean
worktree at HEAD. Never revert their work, never sweep it in.

## 3. Commit and close

Stage the **exact paths** (`git commit <paths>`, never `-a`/`-A`).

- `commitStyle: numbered` → next number is **highest existing + 1**, never a
  commit count: `git log --pretty=%s | grep -oE '^[0-9]+' | sort -n | tail -1`.
  Count-based picking produces duplicates the moment two callers race.
- `commitStyle: conventional` → a descriptive subject.

Where single-committer hooks are installed, the owner token is injected inline
per command, never exported into the environment — a persistent variable would
authorize every thread in that shell.

Then close: `gh issue close <n> --repo <repo> --comment "merged in <sha>"`.

Finally run the session close phase (`/project-os`) so the journal entry and
the freshness gates cover what just landed.

**Never bypass the hooks.** If a worker committed or pushed anywhere, that is a
violation — surface it to <owner> rather than quietly fixing it.
