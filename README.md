# Project-OS

**A portable operating system for project documentation.** Drop three files into any project — software, game, tool, startup, anything — and an AI agent keeps a living, navigable map of that project in sync as you build.

The whole thing rests on one principle:

> **The user builds. The AI organizes.**

You write code, design screens, make decisions. The AI watches, infers meaning, and continuously maintains a small set of documents that describe the project across eight layers — from *why it exists* down to *the code* and *the live values it runs on* — so that humans and AI agents can build, understand, and maintain it together.

---

## The three files you add

Copy these into the root of your project. They are the contract; the AI reads them and does the rest.

| File | What it is |
|---|---|
| `PROJECT_OS.md` | **Artifact contract** — which documents exist and how each is structured. |
| `PROJECT_OS_BEHAVIOR.md` | **Runtime rules** — how the AI behaves: session protocol, when it updates docs, how it handles drift, how it checks for its own updates. |
| `PROJECT_OS_VIEWS.md` | **Rendering spec** — how the map is drawn as diagrams and the interactive viewer. |

---

## What the AI creates and maintains

Once the OS is in place, the agent creates a directory of documents and keeps them current as the code changes. **You never have to write or maintain these yourself** — the AI does, and asks you a question only when something genuinely needs your judgment.

### Root files

| File | Purpose |
|---|---|
| `README.md` | 60-second orientation for anyone arriving at the project. |
| `PROJECT_SUMMARY.md` | What the project is, its architecture, and its current state (done / partial / broken / not started). |
| `JOURNAL.md` | Append-only log of what changed, what's broken, and what's next — the file you read to resume after a break. |

### `docs/` — the project map

The map has eight layers. The first three are *intent* (the why and the what); the next four are *technical* (how it's actually built) and are the most detailed; the last is *live values* (the actual numbers the project runs on, editable from the viewer).

| Document | Layer | Purpose |
|---|---|---|
| `docs/outcomes.md` | L0 | Why the project exists and what success looks like, in plain language. |
| `docs/contexts.md` | L1 | The natural divisions of the system — where each concept has one consistent meaning. |
| `docs/flows.md` | L2 | End-to-end timelines: what happens, in order, and who triggers what. |
| `docs/architecture.md` | L3–L4 | System context and containers — how the system is actually built and runs. |
| `docs/components/` | L5 | The components inside each container, with their key files and call graph. |
| `docs/constants.md` | L7 | The live values catalog — env vars, config, tokens, physics — touchable from the viewer. |
| `docs/data-model.md` | — | Core entities, their fields, and where each lives. |
| `docs/features/` | — | One file per feature: the problem, the scope, and what "done" means. |
| `docs/decisions/` | — | Architecture decision records — *why* the system is shaped the way it is. |
| `docs/screens.md` (+ `docs/screens/`) | — | Every screen / scene / page, plus QA screenshots over time. |
| `docs/permissions.md`, `docs/integrations.md`, `docs/telemetry.md` | — | External surface and how outcomes are measured. |
| `docs/token-ledger.md` | — | AI compute log (optional) — one row per session, rendered in the viewer's Ledger tab. |
| `docs/project-os-status.md` | — | Generated freshness report — the protocol's own state, emitted by the check that enforces it. |
| `docs/structure.md` | — | A map of every folder in the repo: what it is, who owns it, whether it's current or stale. |
| `docs/diagrams/` | — | Rendered diagrams of the layers (generated, not hand-written). |
| `docs/viewer/index.html` | — | The interactive viewer (see below). |

Nothing here is ever silently deleted: when a feature is dropped or a decision reversed, it's marked *retired* and kept as history, not erased.

---

## The viewer

A single self-contained HTML file that renders the eight-layer map as a navigable graph — no build step, no server, no dependencies. It shows the technical layers in full detail by default, hides retired items behind a **History** view, and lets you drill from a container down to a component down to a line of code — then edit live constants (L7) and check the project's AI compute spend, all from the same file.

A working reference implementation ships in [`viewer/`](viewer/) — open `viewer/index.html` to see it with a built-in demo project, or point it at your own `docs/` folder. See [`viewer/README.md`](viewer/README.md).

---

## Adopt it in your project

1. Copy `PROJECT_OS.md`, `PROJECT_OS_BEHAVIOR.md`, and `PROJECT_OS_VIEWS.md` into your project root.
2. Tell your AI agent to read them and bootstrap. It will create the documents above, filling each with its best inference and marking anything uncertain.
3. Keep building. The agent maintains the map in the background and surfaces a question only when it needs one.

The agent also checks this repository for newer versions at the start of a session and offers to upgrade — see [`CHANGELOG.md`](CHANGELOG.md).

---

**Status:** working draft `v0.6`. This repository is the specification plus a reference viewer.
