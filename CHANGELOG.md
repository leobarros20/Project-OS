# Project-OS — Changelog & migration guide

**Canonical repo:** https://github.com/leobarros20/Project-OS
**Current version:** 0.5.1

This file does two jobs:

1. **What changed** in each version — a plain-language summary.
2. **How to bring an existing project up to that version** — written as instructions an AI agent can follow directly. The steps are **idempotent**: each checks whether the change is already present before making it, so re-running is safe.

---

## How to update a project under Project-OS

1. Read the version in the project's local `PROJECT_OS.md` header (the `Status:` line).
2. Compare it to **Current version** above.
3. If the project is behind, apply each version's **Migration** section below, in order, oldest-first.
4. Overwrite the three spec files (`PROJECT_OS.md`, `PROJECT_OS_BEHAVIOR.md`, `PROJECT_OS_VIEWS.md`) with the latest versions, then update the project's own artifacts per the migration steps.
5. Record the update in the project's `JOURNAL.md`.

**Dry run first:** before applying, list what each step *would* create or change and show the user. Apply only what's missing.

---

## 0.5.1 — 2026-06-06

### What changed

- **New day-one artifact: `docs/token-ledger.md`** (`PROJECT_OS.md` §3.18) — a session-by-session log of AI compute spend. One row appended at the end of every session: timestamp (UTC), model identifier, input / output / total token counts, and a one-line task summary. Append-only, never edited; estimates are prefixed with `~`; session content never goes in the file.
- **Session protocol knows about the ledger.** Reading order gains step 9b (glance at the cumulative totals at session start — awareness only), the end-of-session cadence now includes appending the ledger row, and bootstrap gains step 13b (create the file and append the bootstrap session's row). All in `PROJECT_OS_BEHAVIOR.md`.
- **Viewer: new Ledger tab.** Reads `docs/token-ledger.md` and renders stat cards (sessions, input, output, total), a date-range filter on the timestamp's `YYYY-MM-DD` prefix, and the session table with a cumulative totals row. Read-only. Specified in `PROJECT_OS_VIEWS.md` 8.1 (capability 14) with acceptance test 12.

### Migration (agent instructions — idempotent)

1. Overwrite `PROJECT_OS.md`, `PROJECT_OS_BEHAVIOR.md`, `PROJECT_OS_VIEWS.md` with the 0.5.1 versions.
2. If `docs/token-ledger.md` does not exist, create it from the template in `PROJECT_OS.md` §3.18 — the header plus the table header row — then append one row for the current session (timestamp: now, model: current model, token counts: best estimate prefixed with `~`, task: "upgrade to Project-OS 0.5.1"). Do not back-fill rows for past sessions.
3. If `docs/viewer/index.html` exists, update it to add the **Ledger** tab per `PROJECT_OS_VIEWS.md` 8.1 capability 14 (date-range filter, stat cards, table with totals row) — or re-vendor the reference viewer from the canonical repo's `viewer/index.html`, which includes it. If it does not exist, no action.
4. From this session onward, append one ledger row at the end of every session (this is now part of the end-of-session cadence in `PROJECT_OS_BEHAVIOR.md`).
5. Add a `JOURNAL.md` entry noting the upgrade to 0.5.1 and what was created or changed.

---

## 0.5 — 2026-06-05

### What changed

- **New Layer 7 — Constants, the live-values floor of the map.** The eight-layer map replaces the seven-layer map: below L6 (Code) sits L7, the actual values the project runs on — env vars, config constants, design tokens, physics values, animation speeds, feature flags. Defined in `PROJECT_OS.md` Part 4.
- **New day-one artifact: `docs/constants.md`** (`PROJECT_OS.md` §3.17) — the live values catalog, organized in groups. Each group has a **Scope** (container) and a **Source** (the real file the values live in); each constant has a value, a type from the fixed vocabulary (`ms`, `px`, `float`, `integer`, `color`, `boolean`, `url`, `string`, `secret`), and optional min/max. Secrets are never stored in plaintext — placeholder `[set in environment]`, type `secret`.
- **L7 is the only editable layer.** The viewer renders constants as type-aware inputs (sliders, color pickers, toggles). Edits queue as proposals; a **Copy to AI** button formats them as a JOURNAL-ready block; the AI applies them to the Source files next session. Edit-in-viewer moved from "future direction" to shipped, for L7 only (`PROJECT_OS_VIEWS.md` 8.7).
- **Session protocol knows about constants.** Reading order gains step 9a (scan `docs/constants.md` for touched source files; apply any queued proposal from JOURNAL.md first), the autonomous cadence syncs the file after any config / `.env` / theme / physics change, and bootstrap gains step 13a (extract constants from every config surface). All in `PROJECT_OS_BEHAVIOR.md`.
- **Viewer: new Constants and Canvas tabs.** Constants — the editable L7 surface described above, with secrets masked. Canvas — an IcePanel-style spatial alternative to the band-based Map: swimlanes per layer, nodes as cards, bezier edges, pan/zoom. Specified in `PROJECT_OS_VIEWS.md` 8.1 (capabilities 12–13) with acceptance tests 10–11.

### Migration (agent instructions — idempotent)

1. Overwrite `PROJECT_OS.md`, `PROJECT_OS_BEHAVIOR.md`, `PROJECT_OS_VIEWS.md` with the 0.5 versions.
2. If `docs/constants.md` does not exist, create it from the template in `PROJECT_OS.md` §3.17 — walk every config file, `.env.example`, theme file, and physics/constants module and extract values into typed groups with **Scope** and **Source** filled in. Add min/max for every numeric value where a sane range is inferable. Never include actual secrets — use `[set in environment]` with type `secret`.
3. Check `JOURNAL.md` for a "Proposed constants changes" block queued by a viewer. If one exists and is unapplied, apply each change to its Source file and mark the block applied.
4. If `docs/viewer/index.html` exists, update it to add the **Constants** tab (type-aware editable inputs, proposal queue, Copy to AI, secrets masked) and the **Canvas** tab (spatial swimlane view with pan/zoom) per `PROJECT_OS_VIEWS.md` 8.1 capabilities 12–13 — or re-vendor the reference viewer from the canonical repo's `viewer/index.html`. If it does not exist, no action.
5. Add a `JOURNAL.md` entry noting the upgrade to 0.5 and what was created or changed.

---

## 0.4.1 — 2026-06-04

### What changed

- **Technical layers are now the most detailed layers of the map.** They get durable, continuously-maintained homes: new `docs/architecture.md` (Layer 3 system context + Layer 4 containers) and `docs/components/` (Layer 5). Layer 6 stays rendered from source, but comprehensively, with `file:line` links.
- **The viewer shows technical layers by default.** The old "non-coder mode" that hid Layers 3–6 is gone; hiding them is now an opt-in **Simplify** toggle.
- **New Current / History split.** Retired nodes (`Deprecated` / `Superseded` / `Abandoned` / `Removed`) are hidden from the live map and shown only in a **History** view. New `PROJECT_OS.md` Part 6 defines which statuses are *active* vs. *retired*.
- **Self-updating.** Agents now check this repo for a newer version at session start (`PROJECT_OS_BEHAVIOR.md` Part 1) and use this file to apply the upgrade.

### Migration (agent instructions — idempotent)

1. Overwrite `PROJECT_OS.md`, `PROJECT_OS_BEHAVIOR.md`, `PROJECT_OS_VIEWS.md` with the 0.4.1 versions.
2. If `docs/architecture.md` does not exist, create it from the template in `PROJECT_OS.md` §3.15 — system context plus every container, filled from the project's manifest, entry points, and runtime config. Do not stub it thinly.
3. For every container over ~500 LOC or ~5 files, if a `docs/components/NN-*.md` file does not exist, create it from the template in §3.16.
4. Confirm every node's status is one of the values in `PROJECT_OS.md` Part 6, and tag any retired items (`Deprecated` / `Superseded` / `Abandoned`) accordingly.
5. If `docs/viewer/index.html` exists, update it to: show technical layers by default (Simplify is the opt-in that hides them), add the Current / History toggle, and add container → component → code drill-down with `file:line` links. If it does not exist, no action.
6. Regenerate `docs/diagrams/c4-*.md` to full technical depth (containers, components, code).
7. Add a `JOURNAL.md` entry noting the upgrade to 0.4.1 and what was created or changed.

---

## 0.4 — baseline

Initial published contract: the artifact set and templates, the seven-layer map, the behaviour/session protocol, and the rendering + interactive-viewer spec.
