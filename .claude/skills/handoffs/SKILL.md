---
name: handoffs
description: Drain the pull-request queue — list every branch ready for review, verify each locally, resolve conflicts once, merge. Lead only; you are the single merger. Run it at the start of a working turn so the user never has to relay a handoff.
---

# /handoffs — drain the queue

Lead only. You own `main` and you are the only merger. Read
`.project-os/config.json`; every `<bracket>` comes from it.

## 1. Gather the queue

```bash
gh pr list --repo <repo> --base main --state open        # the declared queue
git fetch origin && git branch -r --no-merged origin/main  # branches with work, PR or not
```

`tracker: none` → the uncommitted variant: `git status --short`, `git worktree
list`, and `<docsPath>handoffs/`. Do **not** sweep in uncommitted edits nobody
handed off — in-flight work and a handoff look identical from outside.

## 2. Per PR: is it current, is it true, does it fit

1. **Is it rebased?** `git rev-list --count origin/main..origin/<branch>` and
   `--count origin/<branch>..origin/main`. Behind `main` → send it back to
   rebase. Do not rebase a worker's branch for them; that is their thread's
   record.
2. **Read the actual diff.** A worker's "done" is **a claim to re-verify**, and
   the branch may have moved since the claim was written.
3. **Verify locally, in a clean worktree** — hosted CI is never a dependency:
   ```bash
   git worktree add --detach /tmp/po-verify origin/<branch> && (cd /tmp/po-verify && <verify>); git worktree remove /tmp/po-verify
   ```
   Keep the path short; long ones fail on Windows.
4. **Does it fit with the other open PRs?** Two PRs that each pass alone can
   collide when combined — the same name declared twice, a shared record
   written with two shapes. Merge them in an order that surfaces it, and verify
   the integrated `main` after each merge, not once at the end.
5. **Territory.** A PR touching files outside its lane's ownership says so in
   its body. If it does not, bounce it. If it does, you decide — once, in the
   PR, with a comment that records why.
6. **Bounce** substantive PRs missing their docs artifacts: journal-worthy work
   with no artifact updates, a feature with no QA ticket. Returning incomplete
   work is the gate doing its job.

## 3. Merge, then close the loop

Merge with the owner token injected inline (never exported); `commitStyle`
applies to the merge commit. Then run the session close phase (`/project-os`)
so the journal entry and the freshness gates cover what just landed on `main`.

**Conflicts between PRs are yours.** Resolve them in the PR, once, and leave
the resolution written there. Nobody else merges, ever — a worker that merged
or pushed to `main` is a violation to surface to <owner>, not to quietly fix.
