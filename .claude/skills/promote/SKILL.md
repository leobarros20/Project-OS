---
name: promote
description: Promote a matured note out of the workbench into the map — a decision record, a docs/ artifact, or a tracker issue — and stamp the note with where it went. Use when a draft has stopped being a draft. Never promotes without the owner's confirmation.
---

# /promote — a note graduates into the map

The workbench (`PROJECT_OS.md` 3.22) is where writing is allowed to be wrong.
`docs/` is the map and has to be true. This is the one-way door between them,
and it is deliberately manual: **an agent silently turning a draft into a
decision is the failure the workbench exists to prevent.**

Read `.project-os/config.json` for `notesPath` and `docsPath`.

## 1. Read the note and say what it actually is

A note usually wants to become exactly one of these. Name which, in one line,
before doing anything:

| The note is… | It becomes |
|---|---|
| a choice between options, with a reason | a decision record in `<docsPath>decisions/` |
| a description of how something works or should | the `<docsPath>` artifact that owns that subject |
| work somebody has to do | an issue on the project's tracker |
| still thinking | **nothing.** Leave it. Not every note graduates. |

## 2. Confirm with the owner, always

Say what you would create, where, and from which note. Wait for a yes. The
workbench's first clause is that nothing in it is a source of truth, and you are
about to make a piece of it exactly that — the confirmation is the mechanism
that keeps the clause honest. Do not skip it because the note looks obvious.

## 3. Create the real artifact

Write it as that artifact's own template demands — a decision record gets its
context, decision, consequences and alternatives; a `docs/` artifact follows
its section in `PROJECT_OS.md` Part 3. **Rewrite, do not paste.** A note is
usually one person's thinking; the artifact has to stand on its own for a
stranger. Anything the note asserts but nobody verified goes in as a question
for the owner, not as a fact.

If the new artifact is one the freshness manifest tracks, classify it in the
same change (`CALENDAR` / `DEBT` with a ticket and expiry / `DESCRIPTIVE` with
its trust reason) — an artifact that arrives unclassified turns the check red,
which is the check doing its job.

## 4. Stamp the note, and leave it where it is

Add one line at the top of the note. Do not delete it and do not move it: the
trail is the point, and a reader who finds the note later has to be able to see
that it already went somewhere.

```markdown
> **Promoted 2026-09-21** → `docs/decisions/0031-thing.md`. This note is the
> draft it came from and is no longer maintained.
```

## 5. Close the session normally

The new artifact is a same-change artifact: it travels with its journal entry
and whatever else the close phase owes (`/project-os`).

## What this cannot do

- It cannot tell whether the note is *right*. Promotion moves writing across the
  line where it becomes obliged to be true; it does not verify it. That is the
  owner's confirmation and, after it, the artifact's own review.
- It cannot promote a binary or an imported export into anything. Material like
  that stays in the workbench, or leaves the repo entirely if it is large.
