# PROJECT_OS.md

**Status:** Working draft · 0.6
**Purpose:** A project operating system. A portable artifact contract for organizing any project — software, game, tool, web product, startup operation — so that humans and AI agents can build, understand, and maintain it together. Drop this file (and its two companion files) at the root of any project.

**Audience:** AI coding agents (Claude Code, Cursor, Codex, etc.), human builders, designers, and product people.

**Companion files:**

- `PROJECT_OS_BEHAVIOR.md` — how an AI agent should act on a project under this OS (session protocol, intent capture, cadence, drift handling).
- `PROJECT_OS_VIEWS.md` — how to render the project map as diagrams and an interactive viewer.

**Reading order for an AI agent starting a session:** read this file in full, then `PROJECT_OS_BEHAVIOR.md` in full, then `PROJECT_OS_VIEWS.md` if the task involves rendering or visualization. Only then begin work.

**Canonical source & versioning:** The version of record lives at https://github.com/leobarros20/Project-OS. The current version is the `Status:` line at the top of each spec file (the three files move in lockstep). `CHANGELOG.md` in that repo records what changed between versions and how to upgrade an existing project. At session start an agent checks whether a newer version exists and offers to apply it — see `PROJECT_OS_BEHAVIOR.md` Part 1, "Checking for OS updates."

---

## Part 0 — What this is

This file is the **artifact contract** for a project operating system. It defines:

- What files exist in the project's documentation set
- What each file contains and how it's structured
- How the files relate to each other
- The seven-layer map model that the artifacts together describe

It does NOT define how the AI agent should behave (that's in `BEHAVIOR.md`) or how to render anything (that's in `VIEWS.md`).

The OS rests on one core principle:

> **The user builds. The AI organizes.**

The artifacts in this OS are the AI's working notes about the project. The user is welcome to read or edit them, but the AI is the one keeping them honest.

**Vocabulary:**

- "The OS" — this file and its two companions, taken together
- "The artifacts" — the files listed in Part 2
- "An agent" — any AI tool reading these files
- "The user" — the human running the project

---

## Part 1 — Why this contract exists

Projects accumulate truth in many places: source code, design files, commit messages, chat transcripts, Slack threads, spec docs, telemetry dashboards, and the heads of the people who built them. When AI tools ship work faster than humans can hold a mental model of what was shipped, that scattered truth becomes a liability.

The fix is not "more documentation." The fix is a **small set of artifacts that the AI maintains continuously in the background** while the human keeps building.

This contract works for:

- Software apps (mobile, desktop, web)
- Games (any engine, any genre)
- Internal tools and CLIs
- Startups and businesses (the "project" is the operation, the "screens" are touchpoints with customers)
- Personal projects, learning projects, prototypes

---

## Part 2 — The artifact set

A project organized under this OS contains the following files. **All listed files are expected to exist on a mature project at its declared tier** — Part 7 defines the tiers and which pieces activate at each; the *Optional* set below is adopted deliberately, never assumed.

### Created on day one

```
README.md
PROJECT_OS.md             (this file)
PROJECT_OS_BEHAVIOR.md    (companion — AI runtime rules)
PROJECT_OS_VIEWS.md       (companion — rendering and viewer)
PROJECT_SUMMARY.md
JOURNAL.md
docs/outcomes.md
docs/structure.md
docs/architecture.md
docs/constants.md
```

### Team tier (activated by Part 7)

```
docs/ORCHESTRATOR.md      (the lead's board — see 3.19)
```

### Filled in as the project grows

```
docs/contexts.md
docs/flows.md
docs/features/
  01-feature-name.md
  ...

docs/decisions/
  0001-some-decision.md
  ...

docs/screens.md
docs/screens/
  YYYY-MM-DD-screen-name.png   (QA captures — see VIEWS.md)

docs/components/
  01-container-name.md      (L5 — one per significant container; see docs/architecture.md)
  ...

docs/data-model.md
docs/permissions.md
docs/integrations.md
docs/telemetry.md
```

### Generated visualizations (rendered, not authored)

```
docs/diagrams/
  master-map.md
  outcomes-view.md
  contexts-view.md
  flows-{flow-name}.md
  c4-context.md
  c4-containers.md
  c4-components-{container-name}.md
  c4-code-{subsystem}.md

docs/viewer/
  index.html                (interactive viewer — see VIEWS.md)

docs/project-os-status.md   (freshness report — emitted by the freshness check; see 3.21)
```

### Optional — adopted per project

```
docs/token-ledger.md      (AI compute log — see 3.18; optional as of 0.6)
docs/conventions.md       (working agreement / agent manifesto — see 3.20)
```

Each is adopted by a recorded decision, not by default. If adopted, each carries a freshness classification like every other artifact (see below).

### Optional — Conversation history

```
.ai-history/
  YYYY-MM-DD-tool-session-N.md
```

This folder is not required. When transcripts are present, the AI uses them as additional context. When absent, the AI works from the current session and the artifacts. Either is fine. See `BEHAVIOR.md` for how transcripts are mined.

### Optional — Quarantine for archived files

```
.archive/
  YYYY-MM-DD-batch-name/
    [moved files preserving original paths]
  MANIFEST.md
```

Created when the AI proposes a cleanup or migration of stale files (see `BEHAVIOR.md` Part 6). Files moved here are NOT deleted automatically; they remain quarantined until the user confirms in a later session. The folder's `MANIFEST.md` tracks what was moved, when, why, and from where.

**The forcing rule:** if an artifact's content is unknown, the AI fills it with its best inference and marks the section `Status: Inferred`. Empty mandatory files are a failure state. Inferred-and-marked is the floor.

### The freshness rule — every artifact declares how it stays fresh

An artifact whose update cadence is "manual, periodic" will die — the field evidence is uniform: artifacts stay fresh exactly where automation or an enforced ritual forces them, and rot everywhere else, hardest during the busiest weeks, which is when the record matters most. So the OS does not permit an undeclared cadence. **Every artifact the OS declares is explicitly classified** into one of three buckets, and an unclassified artifact is a red state — the check must be able to detect its own incompleteness:

- **CALENDAR** — must be written on a cadence; silence is the failure.
- **DEBT** — known stale, with a ticket **and an expiry date**. Past the date it is red regardless of contents; an open-ended exemption is how debt becomes permanent.
- **DESCRIPTIVE** — changes only when its subject changes, so age is not evidence of rot. Each entry records *why* it is trusted, so trust is a decision rather than an oversight.

Generated artifacts (`docs/diagrams/`, `docs/viewer/`, `docs/project-os-status.md`, status dashboards) are build outputs, never maintained files — the only artifact that never rots is the one a check rewrites on every run. Their emitter owns their freshness; while an emitter is not yet wired, the artifact is carried as DEBT (ticketed, expiring), never as a silent lapse.

**Default classification** (a project may re-bucket to match its reality — each move recorded with its reason, in the manifest the freshness check reads):

| Artifact | Default class |
|---|---|
| `JOURNAL.md` | CALENDAR — session-end entry; silence fails |
| `PROJECT_SUMMARY.md` | CALENDAR — refreshed within its limit (default ~30 days) or after major changes |
| `docs/token-ledger.md` (if adopted) | CALENDAR — session-end, committing layer only |
| `README.md`, `docs/outcomes.md`, `docs/contexts.md`, `docs/flows.md`, `docs/data-model.md`, `docs/permissions.md`, `docs/integrations.md`, `docs/telemetry.md`, `docs/structure.md`, `docs/screens.md`, `docs/features/`, `docs/decisions/`, `docs/architecture.md`, `docs/components/`, `docs/constants.md`, `docs/ORCHESTRATOR.md`, `docs/conventions.md` | DESCRIPTIVE — trust reason recorded per entry |
| `docs/diagrams/`, `docs/viewer/`, `docs/project-os-status.md` | GENERATED — the emitter owns freshness; un-wired emitters carry the artifact as DEBT |

How the classification is checked, what the check emits, and the two traps to avoid are behavior — see `BEHAVIOR.md` Part 1 ("The protocol is a process").

---

## Part 3 — File specifications

Each file below has a **purpose**, a **template**, and **structural rules**. Maintenance cadence and elicitation behaviour live in `BEHAVIOR.md`. Rendering of diagrams lives in `VIEWS.md`. Templates are copy-paste ready. Code blocks inside templates are written with tildes (`~~~`) so they survive being nested.

### 3.1 — README.md

**Purpose:** The first thing any reader sees. Orients them in 60 seconds. Append-only at the top.

~~~markdown
# [Project name]

## YYYY-MM-DD · [author or "AI agent"]

[One sentence: what this is and who it's for.]

### Quick start

[2–5 lines: how to run the project locally, or how to use the deployed version.]

### Key files for understanding this project

- `PROJECT_SUMMARY.md` — what this project is, architecture, current state
- `JOURNAL.md` — what changed recently and what's broken
- `docs/outcomes.md` — what success looks like
- `docs/contexts.md` — how the system is naturally divided
- `docs/flows.md` — what happens in order, end to end
- `docs/architecture.md` — the technical map: system context + containers (the most detailed layers)
- `docs/components/` — components inside each container
- `docs/constants.md` — the live values catalog: every env var, config constant, token, and physics value — touchable from the viewer
- `docs/token-ledger.md` — AI compute usage log: one row per session, viewable in the Ledger tab
- `docs/features/` — feature specs
- `docs/decisions/` — why the system is shaped this way
- `docs/screens.md` — screens / scenes / pages inventory
- `docs/telemetry.md` — how we measure that outcomes are happening
- `docs/diagrams/master-map.md` — the rendered visual map
- `docs/viewer/index.html` — the interactive project viewer

### For AI agents

Before making changes, read `PROJECT_OS.md`, `PROJECT_OS_BEHAVIOR.md`, and `PROJECT_OS_VIEWS.md` for the artifact conventions, behaviour rules, and rendering spec used here.

---

## YYYY-MM-DD · [previous author]

[Previous version of the README, kept as history.]
~~~

---

### 3.2 — PROJECT_SUMMARY.md

**Purpose:** Answer "what is this thing?" comprehensively but briefly. **Append-only at the top.** Each major revision keeps the previous one underneath as history.

~~~markdown
# [Project name] — Project Summary

## Revision YYYY-MM-DD · [author]

### Overview
[2–3 sentences. What it does, who it's for, why it exists.]

### Problem statement
[The problem this solves.]

### Solution
[How the project addresses the problem, in plain language.]

### Target audience
[Specific, not generic.]

---

### Core capabilities
- [Capability A] — [one-line description] (see `docs/features/01-capability-a.md`)

### Key flows
[Pointer to `docs/flows.md`. List the major flows by name.]

---

### Technical stack
- Language(s): [...]
- Framework(s): [...]
- Storage: [...]
- Build / deploy / hosting: [...]
- External services: [...]

### Top-level structure
(tree of the project root, formatted as a code block)

### Bounded contexts
[Pointer to `docs/contexts.md`. List the named contexts.]

### Required permissions / integrations
[See `docs/permissions.md` and `docs/integrations.md`.]

---

### Current state
- DONE — [thing that works]
- PARTIAL — [thing that's wired but not complete]
- BROKEN — [thing that doesn't work yet]
- NOT STARTED — [thing planned but untouched]

---

### Decisions worth knowing about
- See `docs/decisions/0001-...` — [decision summary]

---

### Next steps
[Up to 5 items.]

---

## Revision YYYY-MM-DD · [previous author]
[Previous full summary.]
~~~

---

### 3.3 — JOURNAL.md

**Purpose:** Append-only log of what changed, what's broken, and what's next. The single most valuable file for resuming work after a break.

~~~markdown
# [Project name] — Journal

Append new entries at the top. Never edit past entries.

---

## YYYY-MM-DD HH:MM · [author or "AI agent: claude-code session"]

**Status:** [One-line summary.]

### Done
- [What got built, fixed, or learned]

### Known gaps
- HIGH — [thing that's broken]
- MED — [...]
- LOW — [...]

### Decisions and inferences captured
- [Significant decision] → `docs/decisions/00NN-...md`
- [Inferred value or constraint] → tagged onto `docs/outcomes.md` Outcome X
- [Inferred context boundary] → added to `docs/contexts.md`

### Files touched
- [paths, with one-line "why" each]

### Clarifications needed from user
- [Question the AI is holding for the user's next session]
- [If none, omit this section]

### Next session
- [What the next session should pick up]

---

## YYYY-MM-DD HH:MM · [previous author]
[Previous entry...]
~~~

---

### 3.4 — docs/outcomes.md

**Purpose:** The top layer of the project map. What does success look like, in plain language? This file answers "if this project worked, what would be different in the world?"

A game has outcomes ("players experience X feeling"). A business has outcomes ("customers complete checkout"). A tool has outcomes ("user finishes the task without leaving the tool"). A personal project has outcomes too.

**Inferred values and soft constraints are tagged onto the outcomes they affect.** When the user says "this animation should be faster" and clarifies that "feeling responsive matters here," the AI captures `fast, responsive animations` as a constraint on the affected outcome.

~~~markdown
# Outcomes

## Why this project exists
[2–4 sentences. The motivating problem, opportunity, or curiosity.]

## What success looks like

### Outcome 1 — [short name]
**Status:** Confirmed | Inferred | Achieved | Abandoned | Superseded

- **Description:** [one or two sentences in plain language]
- **Measured by:** [the signal that tells us this is happening — see `docs/telemetry.md`]
- **Linked features:** [feature spec paths]
- **Linked screens:** [screen identifiers]

**Values and constraints that apply here:**
- [Inferred or stated value, e.g. "Interactions should feel fast — fade-ins under 200ms"]
- [Each item cites the source: journal entry or session transcript]

### Outcome 2 — [short name]
[...]

## What this project is NOT trying to do
- [Non-goal]

## Stakeholders / audience
[Who cares about each outcome.]

## Constraints
[Hard project-wide limits. Privacy, performance, budget, taste, platform rules.]
~~~

**Never delete an outcome** — mark its status.

---

### 3.5 — docs/contexts.md

**Purpose:** Describe the **natural divisions** of the system — the bounded regions where one consistent meaning of each concept lives. This is Domain-Driven Design's bounded context idea, generalized to any project.

A game has contexts (Combat, Inventory, World, Save). A business has contexts (Sales, Billing, Support). A CLI has contexts (Parsing, Execution, Output).

**Inferred values and constraints that apply specifically within a context are tagged on that context.**

~~~markdown
# Bounded contexts

The natural divisions of this project. Each context owns one consistent meaning for the concepts inside it.

## Context map (overview)
[ASCII or table showing which contexts talk to which.]

---

## Context 1 — [Name]

**Status:** Confirmed | Inferred | Superseded
**One-line purpose:** [What does this part of the system care about?]

**Key concepts here (and what they mean in this context):**
- **[Concept]** — [definition specific to this context]

**Owns these entities:** [list from `docs/data-model.md`]

**Modules / folders that belong here:**
- [path]

**Linked features:** [paths to feature specs]

**Talks to:**
- **[Other context]** — via [mechanism]

**Translation at the boundary:**
[If this context's idea of a concept differs from a neighbour's, describe the translation.]

**Values and constraints that apply within this context:**
- [Inferred or stated]
- [Each item cites its source]

---

## Context 2 — [Name]
[...]
~~~

**How an agent detects contexts (heuristics):**

- Clusters of files sharing vocabulary that other clusters don't use
- Folders imported as a unit by other folders
- Entities persisted together
- Modules gated by the same feature flag or permission
- Modules touched in the same pull requests over time
- Concepts the user groups together when describing their work

---

### 3.6 — docs/flows.md

**Purpose:** Describe the **end-to-end timelines** in the project — what happens, in order. Flows cross bounded contexts and tie them together temporally.

A game has flows (player dies → respawn timer → choose loadout → spawn). A business has flows (lead enters → qualification → demo → close). A tool has flows (user runs command → input validated → action executed → output rendered).

~~~markdown
# Flows

End-to-end paths through the system. Each flow is a timeline crossing one or more bounded contexts.

---

## Flow 1 — [Name]

**Status:** Confirmed | Inferred
**Triggered by:** [What starts this flow]
**Frequency:** [How often]
**Serves outcomes:** [from `docs/outcomes.md`]
**Crosses contexts:** [from `docs/contexts.md`]

### Timeline

1. **[Actor or system]** does **[Command]**
   - Context: [name]
   - Triggers event: `[event_name]`
   - Screen shown: [from `docs/screens.md`]
   - Telemetry: `[event from docs/telemetry.md]`
2. [...]

### Branches and edge cases
- **If [condition]:** [alternate path]

### Known gaps in this flow
- [Step that doesn't work yet]

---

## Flow 2 — [Name]
[...]
~~~

---

### 3.7 — docs/features/

**Purpose:** One file per significant feature, describing intent. Answers "what is this feature supposed to do, for whom, in service of which outcome?"

**File naming:** `NN-feature-name.md`. Don't renumber when features are added or removed.

~~~markdown
# NN — [Feature name]

**Status:** Planned | In progress | Shipped | Deprecated
**Created:** YYYY-MM-DD · [author]
**Last updated:** YYYY-MM-DD · [author]
**Serves outcomes:** [from `docs/outcomes.md`]
**Lives in contexts:** [from `docs/contexts.md`]
**Drives flows:** [from `docs/flows.md`]
**Linked decisions:** [decision doc numbers]
**Linked screens:** [identifiers in `docs/screens.md`]

## Problem
[User problem in user-language.]

## Solution
[How the feature solves it.]

## In scope
- [Behaviour we will support]

## Out of scope
- [Behaviour we will NOT support, and why]

## User-facing flow
[Pointer to `docs/flows.md` or brief inline summary.]

## Acceptance criteria
- [ ] [What "done" looks like]

## Known edge cases
- [Edge case + how it's handled]

## Implementation notes
- Entry point: [file]
- Key modules: [files]
- Data persistence: [where state lives]
- Telemetry events: [event names]

---

## Revision history
- YYYY-MM-DD · [author] — [what changed]
~~~

---

### 3.8 — docs/decisions/

**Purpose:** Capture the WHY behind structural choices that will outlive any single session.

**File naming:** `NNNN-short-decision-name.md`. Never reuse a number. Never delete a file — supersede it.

~~~markdown
# NNNN — [Decision title in plain language]

**Status:** Proposed | Accepted | Deprecated | Superseded by [NNNN]
**Date:** YYYY-MM-DD
**Author:** [name or "AI agent"]
**Affects:** [files, modules, screens, features, contexts]
**Serves outcomes:** [from `docs/outcomes.md`]

## Context
[The situation that forced the decision. 2–6 sentences.]

## Decision
[The choice, stated plainly.]

## Consequences

**Good:**
- [What this enables]

**Costs:**
- [What this commits us to]

## Alternatives considered
- **[Alternative 1]** — [why rejected]

## Related
- Supersedes: [NNNN if any]
- Related decisions: [NNNN if any]
- Related code: [paths]
~~~

**Rules:**

- Write one when a multi-paragraph "why" comment appears in code.
- Skip tactical choices that won't matter in 6 months.
- Never edit an Accepted decision. Supersede it.

---

### 3.9 — docs/screens.md and docs/screens/

**Purpose:** Inventory of every screen, scene, page, level, or interactive surface.

"Screen" here means "any thing the user sees and interacts with." For a mobile app: literal screens. For a game: scenes, levels, menus, HUDs. For a web product: pages and modals. For a CLI: command surfaces. For a business: customer touchpoints.

~~~markdown
# Screen inventory

One row per screen. Visual captures during QA live in `docs/screens/` named `YYYY-MM-DD-screen-name.png`. Mark a retired surface by setting its Name cell to `[name] (Deprecated)` or adding a `Status` column; retired screens are never removed from the table — they move to the viewer's history view (see `VIEWS.md` Part 8).

| # | Name | Route / trigger | Purpose | Context | Entry from | Exits to | Design | Code | Latest QA capture |
|---|------|-----------------|---------|---------|------------|----------|--------|------|-------------------|
| 1 | Welcome | `welcome` | First screen new users see | Onboarding | App launch | Permissions | `figma/01-welcome.html` | `ui/screens/WelcomeScreen.kt` | `docs/screens/2026-04-12-welcome.png` |

## Flow groups
[Cluster the screens into logical flows.]

### Onboarding flow
1 → 2 → 3 → 4

## Screens not in the main flow
[Overlays, dialogs, modals.]
~~~

QA capture cadence (Tier 1 trivial / Tier 2 meaningful / Tier 3 milestone) lives in `VIEWS.md`.

---

### 3.10 — docs/data-model.md

**Purpose:** Describe the core entities, their fields, where they're persisted, **which bounded context they live in**, and project-specific terminology.

A game has data models (player state, save files, level data). A small tool has them (config, input, output). A business operation has them (customer, order, ticket).

~~~markdown
# Data model

## Entities

### [EntityName]
[One-line description.]

**Lives in context:** [name from `docs/contexts.md`]

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | primary key |

- **Persisted in:** [where]
- **Created by:** [where]
- **Mutated by:** [where]
- **Lifecycle:** [how long]
- **Used by features:** [paths]

---

## Glossary

Project-specific terms.

- **[Term]** — [definition]
~~~

---

### 3.11 — docs/permissions.md

**Purpose:** OS-level permissions, scopes, OAuth grants. Required for any project that requests any permission. If a project genuinely asks for nothing, write a one-line file stating that.

~~~markdown
# Permissions

| Permission | Why we need it | What breaks without it | When requested | User-facing copy |
|------------|----------------|------------------------|----------------|------------------|
| [name] | [purpose] | [degradation] | [moment] | ["copy"] |

## Notes on sensitive permissions
[Any permission that triggers extra system dialogs or user concern.]
~~~

---

### 3.12 — docs/integrations.md

**Purpose:** Catalogue every external service, SDK, or API the project calls at runtime.

~~~markdown
# Integrations

| Service | Purpose | Where credentials live | What breaks without it | Opt-in/out logic | Privacy implications |
|---------|---------|------------------------|------------------------|------------------|----------------------|
| [name] | [why] | [env var] | [degradation] | [logic] | [what leaves device] |
~~~

---

### 3.13 — docs/telemetry.md

**Purpose:** Define how the project measures whether its outcomes are happening. The chain is: **events → metrics → KPIs → outcomes**. Every outcome should have at least one KPI; every KPI should be computable from events.

~~~markdown
# Telemetry

## Why this exists
[How telemetry connects to outcomes.]

## Privacy posture
[What data leaves the device. Opt-in mechanics. Promise vs reality.]

---

## Event catalogue

| Event name | Fires when | Properties | Context | Linked flow | Linked feature | Linked outcome |
|------------|------------|------------|---------|-------------|----------------|----------------|

---

## Metrics

| Metric | Definition | Computed from | Cadence |
|--------|------------|---------------|---------|

---

## KPIs

| KPI | Target | Computed from metrics | Reviewed by | Cadence |
|-----|--------|------------------------|-------------|---------|

---

## Outcome traceability

- **Outcome:** [...]
  - KPI: [...] (target: [...])

---

## Where telemetry lives
[Tool/service. Dashboard link. Who has access.]
~~~

---

### 3.14 — docs/structure.md

**Purpose:** A map of the project's filesystem. Tells any reader (human or AI) what each top-level folder contains, whether it's current or stale, who owns it, and what to do with it.

A real project accumulates folders fast: source code, design exports, reference docs, build artifacts, AI experiment scratch space, old documentation from before the OS arrived. Without this file, every new session burns time on the same scan. This file is the durable answer.

**Required for every project.** Day one starts with a stub describing the source code layout. It grows as the project accumulates side directories.

~~~markdown
# Project structure

A map of every top-level directory and notable subdirectory in this project. Update when folders are added, moved, renamed, or archived.

## Status legend

- **Current** — actively maintained, authoritative
- **Reference** — kept for lookup, not actively modified (Figma exports, brand assets, third-party docs)
- **Legacy** — superseded by something newer; kept until safe to archive
- **Generated** — produced by tooling or the AI; safe to regenerate
- **Build artifact** — output of `build` or similar; never committed in the long run

## Top-level directories

### `[folder-name]/`
- **Status:** Current | Reference | Legacy | Generated | Build artifact
- **Purpose:** [one line — what this contains]
- **Owner:** [Human-authored / AI-maintained / Build output / Third-party drop]
- **Touch policy:** [Free to edit / Read-only / Regenerate from X / Archive candidate]
- **Notes:** [anything unusual — origin, what it supersedes, what depends on it]

### `[next-folder]/`
[...]

## Notable subdirectories
[Only call out subdirs that have a different status or purpose from their parent.]

### `[parent]/[subdir]/`
- **Status:** [...]
- **Notes:** [...]

## Files at the project root
[Top-level files that aren't already covered by `PROJECT_OS.md`, `README.md`, etc. Build configs, manifests, lock files, ad-hoc HTML drops.]

| File | Status | Purpose |
|---|---|---|
| [filename] | Current/Legacy/etc | [one line] |

## Orphans and unclear
[Files or folders the AI couldn't confidently classify. Listed here for the user to confirm in a Mode 3 check-in.]

- `[path]` — [why it's unclear]

## Archive candidates
[Things flagged for moving to `.archive/` pending user confirmation. See `BEHAVIOR.md` Part 6.]

- `[path]` — [why it should be archived; what it's superseded by]

---

## Revision history
- YYYY-MM-DD · [author] — [what changed]
~~~

**Maintenance rule:** The AI updates this file when:
- A new top-level directory appears in the project
- A directory's status changes (current → legacy, generated → archive candidate, etc.)
- A file or folder is moved or archived
- A new orphan is discovered

When the AI proposes archival or deletion of any directory, it must update this file in the same change. See `BEHAVIOR.md` Part 6 for the cleanup protocol.

---

### 3.15 — docs/architecture.md

**Purpose:** The durable home for the technical layers **L3 (system context)** and **L4 (containers)** — how the system is actually built and runs. Where the intent files answer *why* and *what*, this answers *how*. It is maintained continuously alongside the code and is, with `docs/components/`, the most detailed structural artifact in the OS. A day-one file: starts as a stub describing the deployable system and grows as containers are added.

~~~markdown
# Architecture

The technical map of the system. Durable home for Layer 3 (system context) and Layer 4 (containers), maintained in lockstep with the code. When this file and the code disagree, the code wins and this file is corrected (see `PROJECT_OS.md` Part 5).

## System context (Layer 3)

**The product:** [one line — the deployable system as a whole]

**External actors:**
- **[Actor]** — [who they are; how they interact]

**External systems and dependencies:**
- **[System / SDK / API]** — [what we use it for; protocol] — see `docs/integrations.md`

**Trust / data boundaries:** [what data crosses each boundary, and in which direction]

**Rendered view:** `docs/diagrams/c4-context.md`

---

## Containers (Layer 4)

A container is anything that runs as its own process or deployable unit: an app, a service, a database, a worker, a client bundle, a game-scene host.

### Container 1 — [Name]

**Status:** Current | Planned | Deprecated | Superseded by [name]
**Runtime type:** [Activity / service / server process / scene / database / worker / client bundle / ...]
**One-line purpose:** [what this container is responsible for]
**Tech stack:** [language, framework, key libraries]
**Hosts contexts:** [from `docs/contexts.md` — a container may host one or more contexts]
**Entry point:** [path]
**Components:** see `docs/components/NN-[name].md` (L5)

**Talks to:**
- **[Other container / external system]** — via [calls | reads | writes | starts | binds | events to]

**State it owns:** [data stores, queues, caches — cite `docs/data-model.md` entities]

**Runtime / scaling notes:** [concurrency, lifecycle, where it is deployed]

---

### Container 2 — [Name]
[...]

---

## Runtime topology

[How the containers connect at runtime. The application boundary must be explicit: which boxes are our code and which are external. Pointer to `docs/diagrams/c4-containers.md`.]

## Build, deploy, hosting

[How each container is built and where it runs. Pointer to CI / deploy config.]

---

## Revision history
- YYYY-MM-DD · [author] — [what changed]
~~~

**Structural rules:**

- One Container subsection per runtime unit. Never collapse two runtime units into one entry.
- Every container over the L5 forcing-rule threshold links down to its `docs/components/` file.
- **Never delete a container** — mark it `Deprecated` or `Superseded by [name]`. Retired containers stay in the file and surface in the viewer's history view (see `VIEWS.md` Part 8 and Part 6 below).
- The prose here is authored and maintained; only the L3/L4 *diagrams* are rendered.

---

### 3.16 — docs/components/

**Purpose:** **Layer 5.** One file per significant container, decomposing it into components — the responsibility-clusters of modules inside that container, their key files, public surface, and how they call and import each other. This is the deepest *authored* technical layer; below it, **Layer 6 (code)** is rendered directly from source.

**File naming:** `NN-container-name.md`, matching the container in `docs/architecture.md`. Don't renumber when containers are added or removed.

**Forcing rule:** create a components file for **every container over ~500 lines of code or ~5 files**. A genuinely single-file container may be represented by its file alone.

~~~markdown
# NN — [Container name] components

**Container:** [name from `docs/architecture.md`]
**Status:** Current | Deprecated | Superseded by [name]
**Hosts contexts:** [from `docs/contexts.md`]
**Last updated:** YYYY-MM-DD · [author]

## Component map
[Pointer to `docs/diagrams/c4-components-[container].md`, plus an ASCII sketch of the components and their edges.]

---

## Component 1 — [Name]

**Responsibility:** [the single thing this component is responsible for]
**Belongs to context:** [from `docs/contexts.md`]
**Key files:**
- `path/to/file` — [what it does]

**Public surface:** [the functions / classes other components call — names + one line each]
**Imports / calls:**
- **[Other component]** — [why]

**Emits events:** [telemetry events fired here — from `docs/telemetry.md`]
**Code-level view (L6):** `docs/diagrams/c4-code-[component].md` (rendered from source)

---

## Component 2 — [Name]
[...]
~~~

**Structural rules:**

- One Component subsection per responsibility cluster.
- Always cite real file paths so the viewer can deep-link and L6 can be rendered from them.
- **Never delete a component** — mark its status; deprecated components surface in the history view.

---

### 3.17 — docs/constants.md

**Purpose:** **Layer 7.** The live values catalog — every environment variable, configuration constant, design token, physics value, animation speed, and feature flag that the project reads at runtime. This is the bridge between the map and actual behavior: a non-programmer can read this file to understand "what controls X" and use the viewer to change it without touching code.

**A day-one file.** Start with a stub listing the key knobs. Grows as the AI extracts constants from config files, `.env` examples, theme files, and physics modules.

~~~markdown
# Constants

The live values that control how this project behaves. Touchable from the viewer: change a value there and the AI applies it to the source file on the next session.

## Group — [Name]

**Scope:** [container name or "global"]
**Source:** [path to the file where these values live, e.g. mobile/src/config/theme.ts or .env]

| Constant | Value | Type | Min | Max | Notes |
|---|---|---|---|---|---|
| ANIMATION_SPEED | 200 | ms | 50 | 2000 | Default transition duration across the UI |
| BORDER_RADIUS | 10 | px | 0 | 50 | Card corner radius |
| ACCENT_COLOR | #7c5cff | color | — | — | Primary brand color |

## Group — Physics

**Scope:** GameEngine container
**Source:** src/physics/constants.ts

| Constant | Value | Type | Min | Max | Notes |
|---|---|---|---|---|---|
| GRAVITY | 9.8 | float | 0 | 50 | Downward acceleration (m/s²) |
| JUMP_FORCE | 15 | float | 0 | 100 | Upward impulse on jump |
| FRICTION | 0.8 | float | 0 | 1 | Surface friction coefficient |

## Group — Environment

**Scope:** Sync Service
**Source:** .env

| Constant | Value | Type | Min | Max | Notes |
|---|---|---|---|---|---|
| API_URL | https://api.example.com | url | — | — | Base API endpoint |
| MAX_BATCH_SIZE | 100 | integer | 1 | 1000 | Records per sync batch |
| SYNC_INTERVAL_MS | 30000 | ms | 1000 | 300000 | Background sync cadence |
~~~

**Type vocabulary** (drives the input type the viewer renders):

| Type | Viewer input | Use for |
|---|---|---|
| `ms` | slider + number | Durations, timeouts |
| `px` | slider + number | Sizes, spacing |
| `float` | slider + number | Physics, ratios, opacities |
| `integer` | slider + number | Counts, limits |
| `color` | color picker | Colors, hex values |
| `boolean` | toggle | Feature flags, on/off switches |
| `url` | text field | API endpoints, CDN URLs |
| `string` | text field | Labels, identifiers |

**Rules:**
- One Group per logical cluster (UI tokens, physics, environment, auth, etc.).
- **Source** must point to a real file or `environment`. The AI reads that file to extract and sync values.
- `Min` / `Max` are optional but make the viewer render a slider — always fill them for numeric values where a sane range exists.
- Never include secrets (actual API keys, passwords, tokens) in plaintext here. Use a placeholder like `[set in environment]` and mark the type `secret`.
- The AI syncs this file whenever a config or env file changes. When the viewer proposes a change, the AI reads the proposal from JOURNAL.md and applies it to the Source file.

---

### 3.18 — docs/token-ledger.md (optional)

**Purpose:** A session-by-session log of AI compute spend on this project. Every session in which an AI agent performs work under this OS ends with a new row appended here — timestamp, model name, token counts (input, output, total), and a one-line summary of the task. The viewer's **Ledger tab** reads this file and renders it with date-range filtering and cumulative totals, giving any reader an honest accounting of how much compute has been put into this project and what it was spent on.

**Optional as of 0.6 — adopted per project.** The field evidence: a ledger survives only where its append is bound to the committing layer's session-end ritual, and dies where it floats free of the protocol. If adopted:

- The append is a **committing-layer ritual**: one row at session end, written by the thread that commits (at team tier, the lead — workers never append).
- Classify it **CALENDAR (session-end)** in the freshness manifest (Part 2). A ledger the project stops appending is retired honestly — DEBT with a ticket and expiry, or dropped via the cleanup flow with a tombstone note — never left to rot silently.
- An automated append (a post-commit or scheduled estimator) is a sanctioned upgrade; where one exists, it runs under the lead's credential like any automation (`BEHAVIOR.md` Part 7).

~~~markdown
# Token Ledger

AI compute usage per session. Append a new row at the end of each session.

| Timestamp | Model | Input | Output | Total | Task |
|-----------|-------|-------|--------|-------|------|
| YYYY-MM-DD HH:MM UTC | model-name | 0 | 0 | 0 | one-line task description |
~~~

**Column definitions:**

| Column | Format | Notes |
|--------|--------|-------|
| Timestamp | `YYYY-MM-DD HH:MM UTC` | When the session ended |
| Model | model identifier | e.g. `claude-sonnet-4-5`, `claude-opus-4` |
| Input | integer | Prompt + context tokens (no commas) |
| Output | integer | Generated tokens (no commas) |
| Total | integer | Input + Output |
| Task | plain text | One-line summary of what was done this session |

**Rules:**
- **Append only.** Never edit past rows.
- Token counts come from the model's own usage reporting where available. If unavailable, prefix with `~` to flag as an estimate (e.g. `~18400`).
- Never include session content in this file — only the metadata row.
- The viewer filters by the `YYYY-MM-DD` prefix of the Timestamp column and shows cumulative totals for the selected range.

---

### 3.19 — docs/ORCHESTRATOR.md (team tier)

**Purpose:** The lead's board — the asynchronous broadcast channel every worker thread reads at the start of each work cycle. Standing directives, team charters, and dated broadcasts. Team tier and above only (Part 7); a solo project has no board.

**Not a handoff queue.** Finished work returns through the handoff queue (`BEHAVIOR.md` Part 7), never through this file.

~~~markdown
# Orchestrator board — [Project]

The lead's broadcast channel to every team. Read this at the START of each work
cycle. Only the lead writes here (via /broadcast). Workers read it; they never
edit it. To return finished work, use /handoff — not this file.

## Standing directives (always in effect)

- **One committer.** You are a Worker: never `git commit / push / pull / fetch / merge`
  — anywhere, including worktrees. Fail-closed hooks block it. Only the lead
  commits (numbered `NN - description`). (See the single-committer ADR.)
- [directive]

## Team charters (current)

### [TEAM NAME]
**Scope:** [what this team owns] · **Ground truth:** [the artifacts/files it reads first]
**Now:** [current focus + issues] · **Next:** [queued] · **Boundary:** [what it must not touch]

## Broadcasts (newest first — append-only, never edit past entries)

### YYYY-MM-DD · Orchestrator → [audience] — [subject]
- [directive / status change / hold / per-team instruction — short and actionable]
~~~

**Rules:**

- Only the lead writes to this file — broadcasts are appended at the top of the Broadcasts section; the directives and charters sections are edited in place. Past broadcasts are never edited.
- **Two-tier durability.** The board carries *current* directives and announcements; the *permanent* contract lives in the docs. A lasting rule graduates into `docs/conventions.md` (or `BEHAVIOR.md` Part 7 upstream) in the same change that broadcasts it — the board and the commit log are not where rules live.
- **Contested shared docs:** when two teams need the same file (e.g. `PROJECT_SUMMARY.md`), workers note the intended edit in their handoff instead of racing on the file; the lead serializes at commit time.

---

### 3.20 — docs/conventions.md (optional)

**Purpose:** The project's working agreement — an agent manifesto. Repo-local operating rules that bind every agent in every session, including concurrent ones: coordination discipline, code conventions, security posture, decision authority. Separately versioned, because it is amended by explicit decision, not by drift.

**Why it is a separate file:** the OS trio governs the artifact set, and the user's own tool configuration carries their portable preferences. This file holds what both leave out — how agents share *this* repo without colliding, and the conventions their work must meet.

Header (required):

~~~markdown
# [Project] Working Agreement (Agent Manifesto)

**Status:** Active · v1.0 · adopted YYYY-MM-DD
**Binds:** every AI agent that edits this repo (any tool), in every session, including concurrent ones.
**Authority:** [the user] is the only one who can amend, suspend, or grant an exception to anything in this file. An agent that thinks a rule is wrong asks inline; it does not silently deviate.
~~~

**Required sections:** Prime directives · Multi-agent coordination · Common code practices · Decisions: autonomous vs. surface-to-the-user · Authority and amendment · Revision history (one dated line per version). Everything else is project-local.

**Rules:**

- Version bumps only on the user's approval; each is dated and logged in the Revision history.
- When this file and the OS spec appear to disagree, surface it to the user rather than picking silently.
- Rules graduate *into* this file — from broadcasts, session agreements, and commit messages, which is where rules go to be forgotten.

---

### 3.21 — docs/project-os-status.md (generated)

**Purpose:** The protocol's report of its own state. One generated file listing every artifact the OS declares, its freshness classification (Part 2), how far behind it is, and the action if stale. Agents **read state here; they never derive it** by comparing fifteen file dates. It is emitted by the same freshness check that enforces (`BEHAVIOR.md` Part 1), so it cannot go stale with respect to the repo it describes.

**Never hand-edited.** If it looks old, run the check; do not edit the file — a hand-written status file would itself go stale, and that would be funny exactly once.

Structure (emitted, not authored — adapt to the project's checker):

~~~markdown
# Project-OS status

Generated by [the freshness check]. Do not edit by hand; rerun [command].

**Read this first.** It is the one place that says what the protocol is owed
right now. Everything below is derived, so it cannot be out of date with the
repo it describes.

Reference point: newest substantive commit, **YYYY-MM-DD**.

## Written on a cadence
| Artifact | Newest entry | Behind | Limit | State |

## Known debt, time-boxed
| Artifact | Ticket | Due | Days left | Why |

## Trusted, because they change only when their subject does
| Artifact | Last touched | Why it is trusted |

## What a test cannot see
- [each honest gap, stated plainly]
~~~

**Rules:**

- Anything marked LAPSED, MISSING, or PAST DUE is work the current session owes before it finishes — not a note for someone else. Say so in the first message of the session rather than discovering it at commit time.
- The **"What a test cannot see"** section is mandatory: the check states its own ceiling (see the two traps in `BEHAVIOR.md` Part 1).

---

## Part 4 — The eight-layer map

The artifacts above together describe a seven-layer map of the project. This part defines the layers and which artifacts feed each. **Rendering specifications for each layer live in `VIEWS.md`.**

### 4.0 — The canonical layer ordering

The map has **eight layers**. The ordering is fixed.

```
INTENT LAYERS (the "why" and the "what happens")
─────────────────────────────────────────────────
Layer 0 — Outcomes              Why does this exist? What is success?
Layer 1 — Contexts              How is the system divided? What does each word mean where?
Layer 2 — Flows                 What happens, in order? Who triggers what?

STRUCTURAL LAYERS (the "how it's built")
─────────────────────────────────────────────────
Layer 3 — System context        The product + everything outside it (C4 L1)
Layer 4 — Containers            The major runtime parts (C4 L2)
Layer 5 — Components            Modules inside one container (C4 L3)
Layer 6 — Code                  Classes, functions, files (C4 L4)

LIVE VALUES LAYER (the "actual numbers")
─────────────────────────────────────────────────
Layer 7 — Constants             The actual values: env vars, config, tokens, physics,
                                animation speeds, feature flags. Touchable from the viewer.
```

**Three things are NOT layers — they are cross-cutting threads:**

```
Features          Touch outcomes (L0), contexts (L1), flows (L2), screens (L3–L5), code (L6).
Decisions         Each ADR constrains something at a specific layer or across layers.
Telemetry         Events fire at L4/L5/L6 and roll up through metrics and KPIs to L0.
Values            Tagged onto outcomes and contexts; constrain everything below.
```

When rendering, **never show features, decisions, telemetry, or values as their own layer**. They are overlays, edges, or annotations on the layers.

### 4.0.1 — The depth principle

The structural layers (L3–L6) are the **most detailed layers of the map**. The intent layers (L0–L2) answer *why* and *what happens* in a handful of nodes each; the structural layers answer *how the system is actually built and runs*, and they must be captured and rendered to the deepest resolution the project supports — system context down to containers, containers down to components, components down to files and function signatures.

This has two consequences the rest of the OS enforces:

- **Durable technical artifacts.** L3–L4 live in `docs/architecture.md` and L5 in `docs/components/`, maintained continuously alongside the code with at least the rigor of `docs/outcomes.md` or `docs/contexts.md`. L6 is rendered directly from source (code is the strongest evidence — see Part 5) but rendered comprehensively, not sketched.
- **Technical layers are first-class in every view.** A rendering or viewer that shows rich intent but shallow structure is incomplete. The technical layers are shown by default and are the deepest drill-down, never hidden behind an "advanced" toggle. See `VIEWS.md` Part 1 (depth principle) and Part 8 (viewer defaults).
- **L7 is the floor of the map — the actual values.** Layer 7 (Constants) is the most granular layer: every environment variable, configuration constant, design token, physics value, animation speed, and feature flag that controls how the project actually behaves at runtime. `docs/constants.md` is its durable home. Unlike L6 (which is read-only code), **L7 is editable from the viewer**: a non-programmer can move a slider, change a color, flip a toggle — the viewer queues the change as a proposal, and the AI applies it to the source file on the next session. This is the bridge between "understanding the project" and "actually changing how it behaves" without touching code.

### 4.1 — Source artifacts per layer

For each layer, the artifacts that feed it.

| Layer | Primary sources | Secondary |
|---|---|---|
| L0 Outcomes | `docs/outcomes.md` | `docs/telemetry.md`, `docs/features/` |
| L1 Contexts | `docs/contexts.md` | `docs/data-model.md`, `docs/features/`, code folders |
| L2 Flows | `docs/flows.md` | `docs/screens.md`, `docs/telemetry.md`, `docs/features/` |
| L3 System context | `docs/architecture.md`, `PROJECT_SUMMARY.md` | `docs/integrations.md`, `docs/permissions.md`, `docs/structure.md`, manifest |
| L4 Containers | `docs/architecture.md`, manifest, top-level folder structure | `PROJECT_SUMMARY.md`, `docs/structure.md` |
| L5 Components | `docs/components/`, per-container source code | `docs/screens.md`, `docs/features/`, `docs/contexts.md`, `docs/decisions/` |
| L6 Code | source files, rendered code views (`docs/diagrams/c4-code-*.md`) | type signatures, public APIs, `docs/components/` |
| L7 Constants | `docs/constants.md` (AI-maintained, sourced from config files, `.env`, theme files, physics modules) | `docs/components/`, source config files |

---

## Part 5 — Triangulation rules

When the artifacts contradict each other (and they will), use this hierarchy:

1. **Source code is the strongest evidence.** What the code actually does is truth at runtime.
2. **Configuration files (manifests, build files) are second-strongest.** They declare what the code is permitted to do.
3. **Telemetry data is third.** What's happening in production for real users.
4. **The active conversation is fourth.** What the user is currently saying.
5. **JOURNAL is fifth.** Recent build state.
6. **Optional conversation history (`.ai-history/`) is sixth.** Reliable for past intent.
7. **PROJECT_SUMMARY, feature specs, outcomes, contexts, flows, narrative docs are seventh.** Intent that may have drifted.
8. **README is weakest.** Public framing often outlives the system.

When sources disagree, the AI surfaces the disagreement (it doesn't silently pick one), and the weaker source is updated to match — OR a new decision doc explains why the discrepancy exists.

**Common drift patterns:**

- `PROJECT_SUMMARY.md` describes an earlier architecture, missing newer subsystems.
- `README.md` makes promises the code partially violates.
- Feature specs describe scope that was later cut.
- Decisions marked Accepted that were silently reversed in code.
- `docs/outcomes.md` lists outcomes that have no KPI in `docs/telemetry.md`.
- `docs/contexts.md` shows a clean boundary, but code imports from both contexts.
- `docs/flows.md` describes a step firing a telemetry event the code doesn't fire.

How the AI handles drift is specified in `BEHAVIOR.md`.

---

## Part 6 — Lifecycle status and project history

Every node in the map carries a lifecycle status, and nodes are **never deleted** — when something is dropped, reversed, or replaced, its status changes and it stays in the artifacts. This is what preserves the project's history, and it is what makes the viewer's **history view** possible (see `VIEWS.md` Part 8).

### Active vs. retired statuses

Each artifact's status values fall into two groups. **Active** = part of the project as it stands today. **Retired** = real history, kept for the record but no longer the current plan.

| Artifact | Active (shown in the current view) | Retired (shown only in the history view) |
|---|---|---|
| Outcomes | Confirmed, Inferred, Achieved | Abandoned, Superseded |
| Contexts | Confirmed, Inferred | Superseded |
| Features | Planned, In progress, Shipped | Deprecated |
| Decisions | Proposed, Accepted | Deprecated, Superseded by NNNN |
| Containers / Components | Current, Planned | Deprecated, Superseded |
| Screens | active rows in the inventory | Deprecated / Removed |

`Achieved` is **active**, not retired — a met outcome is still true. Only things that no longer describe the project today (abandoned, superseded, deprecated, removed) are retired.

### The rule

- Changing direction is a **status change plus a pointer**, never a deletion. A superseded decision points to the one that replaced it (`Superseded by NNNN`); a deprecated feature notes what replaced it and when; a removed screen names its successor.
- Retired nodes keep **all their edges**. The history view reconstructs "what the project used to look like" from them, with supersession lineage drawn explicitly.
- The current view hides retired nodes entirely, so it always reflects the project as it stands today.
- The only mechanism that removes a *file* is the cleanup/archival flow in `BEHAVIOR.md` Part 6 — and that is for stale files left on disk, never for retiring a live node.

---

## Part 7 — Tier profiles

A project declares its tier, and the tier decides which parts of the OS activate. The contract scales down as well as up: running team machinery on a solo project is ceremony, and running a solo contract under many concurrent threads is how work gets clobbered.

### The three tiers

| Tier | Shape | What activates |
|---|---|---|
| **solo** | One thread works the repo | The artifact set (Parts 2–3) without the teams module. No board, no handoff queue, no committer hooks — the one thread commits directly. |
| **team** | One lead + worker threads on one repo | Everything in solo, plus the teams module (`BEHAVIOR.md` Part 7): the board (3.19), the handoff queue, single-committer enforcement, commit numbering. |
| **multi-team** | Several chartered teams under one lead | Team tier, plus team charters on the board (3.19) and per-team focus. |

### The solo tier may externalize the OS

At solo tier the OS may live **outside the repo**: a wiki (Notion or similar) as the human HQ and a project board (GitHub Projects or similar) as the tracker *are* the OS, and the repo keeps only `README.md`, an overview document, and local ADRs recording deviations. This is a recognized profile, not a violation.

- **Declare it:** the README (or the repo's agent-config file) records the tier and points at the external systems.
- **Deviations are still recorded** — as lightweight local ADRs in `docs/adr/` or `docs/decisions/`.
- **The freshness rule still applies** to whatever artifacts *do* live in-repo; the external board's freshness is owned by whatever cadence maintains it, named in the tier declaration.

### Declaring the tier

- In-repo tiers: a `Tier:` line in the `PROJECT_SUMMARY.md` header.
- Externalized solo: the tier note lives in `README.md` (or the agent-config file).
- Moving between tiers is a **recorded decision** (ADR) — moving up activates enforcement machinery; moving down retires it deliberately.

---

## Part 8 — What this file does not include

- **AI behaviour during sessions.** See `PROJECT_OS_BEHAVIOR.md`.
- **Rendering and visualization.** See `PROJECT_OS_VIEWS.md`.
- **Sprint plans, roadmaps, OKRs.** These belong in a task tracker.
- **API reference documentation.** If the code is well-typed, the types are the API.
- **Detailed code comments masquerading as documentation.** Comments explain local "why" inside code.
- **Diagrams as the source of truth.** Diagrams are generated views; the artifacts are the source.
