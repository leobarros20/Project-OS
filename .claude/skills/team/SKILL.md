---
name: team
description: Propose the team roster for this kind of project, then spin up a workstream as its own session on its own branch with a self-contained work order. Lead only. A spawned session has no memory of the conversation that created it — the brief must stand alone.
---

# /team — the roster, then a workstream

Lead only, team tier and above. Read `.project-os/config.json`.

## Why teams look like this

One worker per topic, each in its own thread and on its own branch, so its
context stays **closed around one area and rich in the resolutions made
there**. The PR it opens is the record of how each thing got resolved. One
merger keeps `main` coherent. That is the whole design; everything below serves
it.

## 1. The roster depends on the kind of project

Do not copy a roster from elsewhere. Propose one from what this project
actually is — `docs/architecture.md` (containers), `docs/screens.md`
(surfaces), `docs/flows.md` — one topic per worker, and let the lead adjust:

| Project looks like | A roster that fits |
|---|---|
| a game | engine / physics · gameplay · content · UI · build & release |
| a mobile app | client · backend / sync · design system · growth · release |
| a website | content · frontend · infra |
| an internal tool / CLI | core · integrations · docs |

Write the agreed roster to the board (`/broadcast`, **Team charters**) and to
`lanes` in `.project-os/config.json` so `/handoff` offers it. Each lane's
charter names its **territory** — the files and areas it owns — because
branches do not stop two teams editing one file; ownership does.

## 2. The one rule that makes or breaks a spawn

**A spawned session has no memory of the conversation that created it.** Every
assumption you carry right now — what "the redesign" means, which file you were
just looking at, what was decided an hour ago — is invisible to it. Write the
brief so a stranger could execute it.

## 3. The work order

```markdown
# <lane> — work order

**Mission:** <what this lane owns, in one line>
**Territory:** <the files, directories and surfaces it may change>
**Boundary:** <what it must NOT touch — other lanes' territory, shared modules>
**Branch:** <team/<lane> or claude/<topic>> — yours to commit and push freely; `main` is never yours

**Current state:** <what exists today, including what is broken or half-done>
**Why these choices:** <decisions already made, so the thread does not re-litigate them>

**Ground truth:** read <docsPath>project-os-status.md first, then <the artifacts
this lane depends on>.

**Constraints:**
- Rebase on `main` before opening or updating your PR.
- `<verify>` must pass on the rebased branch before you hand off.
- Return work with `/handoff` (a pull request). Never merge. Never push to `main`.

**Gotchas:** <the traps that cost someone a day — platform quirks, flaky steps>
**Done means:** <the observable condition, not "it works">
```

Each lane owns its own tickets as a living backlog. Tickets are not merges: a
worker owns its issues, the code still returns through the PR.

## 4. Watching without steering

Reading a lane's state — its PR, its branch, its board section — cannot mutate
anyone's work, so it needs no confirmation. Sending an instruction into a
running lane can, so it stays a deliberate, human-gated act. Do not collapse
the two.
