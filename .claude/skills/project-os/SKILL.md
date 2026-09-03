---
name: project-os
description: Open and close a session on the Project-OS spec repo under its own protocol. Run it at the start of a working turn to see what the protocol is owed, and again before finishing to discharge it. This repo authors the contract, so running it here is also the contract's own test.
---

# Project-OS, on the repo that writes it

This repo ships the spec every adopter follows. Until 2026-09-03 it ran none of
it — which meant the contract was never tested against itself, and every defect
was found by an adopter instead. This skill closes that gap.

If something in this protocol is annoying, wrong, or impossible here, that is a
finding about the spec, not an excuse to skip it. Record it in the CHANGELOG's
parked section.

---

## Phase 1 — Opening a session

### 1. Read the state. One file, always current.

```bash
node scripts/freshness.mjs && cat docs/project-os-status.md
```

It lists every artifact the spec declares, its bucket, and what is owed.
It is **generated**; if it looks wrong, fix the manifest or the script — never
edit the status file. Anything under **RED** is work this session owes before it
finishes. Say so in the first message rather than discovering it at commit time.

### 2. Is the tree yours?

```bash
git status --short && git log --oneline -3
```

This repo has auto-committed stray work before (a commit literally titled `.`).
Uncommitted work you did not write is a finding, not a base to build on.

### 3. Then the scoped reading list

`PROJECT_OS_BEHAVIOR.md` Part 1, scoped to the task. For spec edits that means
at minimum the part being changed, plus `CHANGELOG.md` for what shipped last.

---

## Phase 2 — Closing a session

Each item is a gate. Anything skipped, say so and why, in the same message.

### The artifacts that live in the same change

- **Changed any of the three spec files?** All three move in lockstep — the
  `Status:` version line matches across `PROJECT_OS.md`,
  `PROJECT_OS_BEHAVIOR.md`, `PROJECT_OS_VIEWS.md`. The check enforces this.
- **Shipped a version?** It gets a `CHANGELOG.md` entry with **idempotent
  migration steps** in the same change. A version without one cannot be adopted
  by the book, which is the exact failure that froze adopters at 0.4.
- **Added or removed an artifact from Part 2?** Classify it in
  `project-os-manifest.json` in the same change, or the check goes red.
- **Changed the viewer's capabilities?** Update `viewer/README.md`, and verify
  in a browser before claiming a capability works.

### Verify

```bash
node scripts/freshness.mjs
```

If it goes red, write the missing artifact. Do not raise a threshold, move an
entry to DESCRIPTIVE, or extend a DEBT expiry to get green — narrowing the check
is the failure this design exists to stop, and it is cheap to spot in a diff.

### Commit

Commit messages here use a subject line plus a body explaining what changed and
why. Use a message file (`git commit -F .git/CC_COMMITMSG`) — here-strings with
quotes have broken commits in this repo. **Never push without Leo saying so**;
committing is not authorization to publish.

---

## What this process cannot do, stated plainly

- **It cannot tell whether the spec is any good.** The check verifies files
  exist and versions agree; whether 0.6's teams module actually helps a real
  team is answered by adopters, and that signal arrives as a message, not a file
  date.
- **It cannot see prose-only artifacts.** The artifact set is parsed from
  `PROJECT_OS.md` Part 2's fenced listings. An artifact introduced in prose but
  never listed there is invisible to the check.
- **It cannot verify migration steps actually work.** Nothing here executes a
  0.5.1 → 0.6 upgrade against a real repo. Until an adopter runs it, the
  migration is a claim.
