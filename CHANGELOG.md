# Project-OS — Changelog & migration guide

**Canonical repo:** https://github.com/leobarros20/Project-OS
**Current version:** 0.4.1

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
