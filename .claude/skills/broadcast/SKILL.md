---
name: broadcast
description: Post a directive to the orchestrator board — the async channel every worker reads at the start of a work cycle. Lead only. Use it for a standing rule, a status change, a hold, or a per-lane instruction when live messaging between sessions is unavailable.
---

# /broadcast — post to the board

Lead only, team tier and above. The board is `<docsPath>ORCHESTRATOR.md`
(`PROJECT_OS.md` 3.19). Workers read it; they never write to it.

## Append the entry

At the **top** of `## Broadcasts`, newest first. Never edit a past entry.

```markdown
### YYYY-MM-DD · Orchestrator → <audience>
- <directive, status change, hold or per-lane instruction — short and actionable>
```

## Then decide where it actually lives

This is the part that gets skipped, and skipping it is why rules evaporate.

**Two-tier durability:** the board carries *current* directives and
announcements; the *permanent* contract lives in the docs. If what you are
broadcasting is a lasting rule, graduate it in the **same change**:

- A rule the whole repo must follow → `<docsPath>conventions.md` (3.20).
- A per-lane scope change → the board's own **Team charters** section, edited
  in place.
- A change to how the protocol itself works → the spec, upstream.

A rule that lives only in a broadcast is a rule that lasts until the next
person scrolls past it. The board and the commit log are not where rules live.

## Commit

Commit the board with everything the broadcast graduated, in one change, per
`commitStyle`. At team tier only the lead commits.
