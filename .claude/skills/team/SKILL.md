---
name: team
description: Spin up a workstream as its own session with a self-contained work order. Lead only. Use it when a lane needs its own thread — the brief must stand alone, because a spawned session has no memory of the conversation that created it.
---

# /team — spin up a workstream

Lead only, team tier and above. Read `.project-os/config.json`.

## The one rule that makes or breaks this

**A spawned session has no memory of the conversation that created it.** Every
assumption you are carrying right now — what "the redesign" means, which file
you were just looking at, what was decided an hour ago — is invisible to it. A
brief that reads well to you and omits that context produces a thread that
confidently does the wrong thing.

Write the brief so a stranger could execute it.

## The work order

```markdown
# <lane> — work order

**Mission:** <what this lane owns, in one line>
**Scope:** <the files, directories and surfaces it may change>
**Boundary:** <what it must NOT touch — other lanes' territory, shared modules>

**Current state:** <what exists today, including what is broken or half-done>
**Why these choices:** <decisions already made, so the thread does not re-litigate them>

**Ground truth:** read <docsPath>project-os-status.md first, then <the artifacts
this lane depends on>.

**Constraints:**
- You are a Worker: never `git commit / push / pull / merge` — anywhere,
  including worktrees. Hooks enforce it.
- Before handing off: `<verify>` must pass.
- Return work with `/handoff`. Do not relay it through <owner>.

**Gotchas:** <the traps that cost someone a day — platform quirks, flaky steps>
**Done means:** <the observable condition, not "it works">
```

## After spawning

Add the lane to the board's **Team charters** section (`/broadcast`) with its
scope, current focus and boundary, and to `lanes` in `.project-os/config.json`
so `/handoff` offers it.

Each lane owns its own tickets as a living backlog. Tickets are not commits: a
worker owns its issues, the code still returns through the queue.

## Watching without steering

Observing running lanes and steering them are different acts. Reading a lane's
state — its queue entries, its branch, its board section — cannot mutate anyone's
work, so it needs no confirmation. Sending an instruction into a running lane
can, so it stays a deliberate, human-gated act. Do not collapse the two.
