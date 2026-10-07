# Notes

The workbench. `docs/` is the map and must be true; this is where thinking is
allowed to be wrong: explorations, references, links, drafts, notes from a
conversation, material imported from somewhere else. It is written to be read
in a notes tool, not in the repo.

**Nothing here is a source of truth.** Read it for context. Never cite it as
fact. Never update `docs/`, a manifest or a decision record from it without
confirming with the owner first — a draft is not a decision, and an agent
quietly promoting one into the map is the failure this line exists to stop.

## What is where

| Folder | Holds |
|---|---|
| `research/` | competitors, user signals, market notes, anything learned about the problem |
| `meetings/` | notes from conversations, and the decisions still pending someone |
| `marketing/` | copy, content, campaign drafts |
| `design/` | explorations, references, notes on screens and motion |
| `references/` | external material: articles, links, papers |
| `drafts/` | half-formed ideas that have no shape yet |

A note that fits none stays here at the root. Media sits next to its note,
never loose.

## Start here

<!-- the handful of notes worth opening first; kept by habit when a cycle closes -->

## Every note opens with

```yaml
---
date: YYYY-MM-DD
topic: one line
status: exploring        # exploring | ready-to-promote | promoted → <where> | archived
source:                  # url or id, only when the note was imported
---
```

The date says when it was true for whoever wrote it. Nobody has to update a
note, ever: a stale note is working as intended, and the freshness check
excludes this whole directory as a class. When a note matures, promote it (a
decision record, a `docs/` artifact, an issue) and set `status: promoted → …`
so the trail survives. Links between notes may be wikilinks; a link into
`docs/` is a plain relative path.

Material imported from another tool lands here flat, never in a folder named
after the tool; its origin lives in `source`. Filing it into a folder above is
a later step, by a person who has read it. Past a few megabytes, material
belongs outside the repo.
