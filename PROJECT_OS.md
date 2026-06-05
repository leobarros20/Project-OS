# PROJECT_OS.md

**Status:** Working draft · 0.4
**Purpose:** A project operating system. A portable artifact contract for organizing any project — software, game, tool, web product, startup operation — so that humans and AI agents can build, understand, and maintain it together. Drop this file (and its two companion files) at the root of any project.

**Audience:** AI coding agents (Claude Code, Cursor, Codex, etc.), human builders, designers, and product people.

**Companion files:**

- `PROJECT_OS_BEHAVIOR.md` — how an AI agent should act on a project under this OS (session protocol, intent capture, cadence, drift handling).
- `PROJECT_OS_VIEWS.md` — how to render the project map as diagrams and an interactive viewer.

**Reading order for an AI agent starting a session:** read this file in full, then `PROJECT_OS_BEHAVIOR.md` in full, then `PROJECT_OS_VIEWS.md` if the task involves rendering or visualization. Only then begin work.

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

A project organized under this OS contains the following files. **All listed files are expected to exist on a mature project.**

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
```

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

Created when the AI proposes a cleanup or migration of stale files (see `BEHAVIOR.md` Part 7). Files moved here are NOT deleted automatically; they remain quarantined until the user confirms in a later session. The folder's `MANIFEST.md` tracks what was moved, when, why, and from where.

**The forcing rule:** if an artifact's content is unknown, the AI fills it with its best inference and marks the section `Status: Inferred`. Empty mandatory files are a failure state. Inferred-and-marked is the floor.

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

**Status:** Confirmed | Inferred
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

One row per screen. Visual captures during QA live in `docs/screens/` named `YYYY-MM-DD-screen-name.png`.

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
[Things flagged for moving to `.archive/` pending user confirmation. See `BEHAVIOR.md` Part 7.]

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

When the AI proposes archival or deletion of any directory, it must update this file in the same change. See `BEHAVIOR.md` Part 7 for the cleanup protocol.

---

## Part 4 — The seven-layer map

The artifacts above together describe a seven-layer map of the project. This part defines the layers and which artifacts feed each. **Rendering specifications for each layer live in `VIEWS.md`.**

### 4.0 — The canonical layer ordering

The map has **seven layers**. The ordering is fixed.

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
```

**Three things are NOT layers — they are cross-cutting threads:**

```
Features          Touch outcomes (L0), contexts (L1), flows (L2), screens (L3–L5), code (L6).
Decisions         Each ADR constrains something at a specific layer or across layers.
Telemetry         Events fire at L4/L5/L6 and roll up through metrics and KPIs to L0.
Values            Tagged onto outcomes and contexts; constrain everything below.
```

When rendering, **never show features, decisions, telemetry, or values as their own layer**. They are overlays, edges, or annotations on the layers.

### 4.1 — Source artifacts per layer

For each layer, the artifacts that feed it.

| Layer | Primary sources | Secondary |
|---|---|---|
| L0 Outcomes | `docs/outcomes.md` | `docs/telemetry.md`, `docs/features/` |
| L1 Contexts | `docs/contexts.md` | `docs/data-model.md`, `docs/features/`, code folders |
| L2 Flows | `docs/flows.md` | `docs/screens.md`, `docs/telemetry.md`, `docs/features/` |
| L3 System context | `PROJECT_SUMMARY.md` | `docs/integrations.md`, `docs/permissions.md`, `docs/structure.md`, manifest |
| L4 Containers | manifest, top-level folder structure | `PROJECT_SUMMARY.md` |
| L5 Components | per-container source code | `docs/screens.md`, `docs/features/`, `docs/contexts.md`, `docs/decisions/` |
| L6 Code | source files | type signatures, public APIs |

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

## Part 6 — What this file does not include

- **AI behaviour during sessions.** See `PROJECT_OS_BEHAVIOR.md`.
- **Rendering and visualization.** See `PROJECT_OS_VIEWS.md`.
- **Sprint plans, roadmaps, OKRs.** These belong in a task tracker.
- **API reference documentation.** If the code is well-typed, the types are the API.
- **Detailed code comments masquerading as documentation.** Comments explain local "why" inside code.
- **Diagrams as the source of truth.** Diagrams are generated views; the artifacts are the source.
