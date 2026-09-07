# Project-OS — Changelog & migration guide

**Canonical repo:** https://github.com/leobarros20/Project-OS
**Current version:** 0.6

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

## 0.6 — 2026-09-03

### What changed

0.6 promotes patterns proven in real multi-product, multi-agent use into canon. The headline: **the protocol is now a process that reports its own state, not a memory test** — and the OS scales by tier instead of assuming one shape.

- **The session protocol is an invocable process** (`BEHAVIOR.md` Part 1, rewritten). Measured in the field, a 15-file reading list plus ~10 carried triggers produced lapses that only the human ever caught. Three mandatory mechanisms replace memory: a **freshness check** wired into the project's own build/test system; a **generated status file** `docs/project-os-status.md` (§3.21) that agents read instead of deriving state; and a **`project-os` skill** (open/close phases — reference template ships in Part 1) that, where the platform supports it, **injects itself** at session start rather than waiting to be remembered (measured: 4 of 10 sessions on one product delivered work having never opened it, while its closing gate was healthy). Three traps are part of the contract: checker inputs declared as a set (a file-by-file input list lets a stale result serve a cached green); an explicit "what this check cannot verify" statement; and an injector with no status artifact to inject, which exits silently — installation counts only after an observed injection with a deliberately reddened row. When a gate goes red, write the missing artifact — never narrow the check. Considered and declined (2026-07-29): deleting reader-less artifacts; keep the structure, add process.
- **The freshness rule** (`PROJECT_OS.md` Part 2): every artifact is explicitly classified **CALENDAR** (cadence; silence fails) / **DEBT** (ticketed, with an expiry — past it, red regardless) / **DESCRIPTIVE** (trust reason recorded), and an unclassified artifact is itself a red. Generated artifacts are build outputs; an un-wired emitter carries its artifact as DEBT. A default classification table ships in Part 2.
- **Teams module** (`BEHAVIOR.md` Part 7 — new; the old Part 7 closer is now Part 8). One lead owns all git writes; workers never touch git. The standard handoff is the **uncommitted handoff** (work stays uncommitted in the shared tree or a worktree; the queue is `ready-for-review` issues with a standard body; the lead re-verifies, integrates, commits path-scoped, closes with "merged in <sha>", and bounces substantive handoffs lacking their docs artifacts). A committed-worker-branches variant is documented, gated on an explicit hook carve-out plus a superseding ADR. Enforcement: fail-closed `pre-commit`/`pre-push`/`pre-merge-commit` hooks keyed to an **out-of-repo owner token** (absence blocks everyone — fail closed, never open); automation commits under the lead's credential. Commit numbering `NN - description`, next = highest + 1 (never a count), enforced by a `commit-msg` guard. The board `docs/ORCHESTRATOR.md` (§3.19) carries standing directives, team charters, and append-only broadcasts — and is explicitly not the queue.
- **Tier profiles** (`PROJECT_OS.md` Part 7 — new; the old Part 7 closer is now Part 8): **solo / team / multi-team** decide which OS pieces activate. The solo tier may run the **externalized profile** — wiki + project board as the OS, repo keeping README, an overview, and deviation ADRs — recognized formally, declared in the README, with tier moves recorded as ADRs.
- **`BEHAVIOR.md` Part 0 gains the distillation corollary:** the active chat is raw project memory that must be distilled into the artifacts; nothing important stays trapped in a conversation.
- **Bootstrap gains a lifecycle** (`BEHAVIOR.md` Part 5): optional disposable `KICKOFF.md` (step 0) deleted at bootstrap's end with a "preserved in history at commit NN" pointer in both the deletion commit and the journal (step 19); tier declaration (step 4); freshness-check wiring with a non-vacuity test (step 16a); teams-module standing-up at team tier (step 16b).
- **`docs/token-ledger.md` is demoted from day-one to optional** (§3.18): field evidence shows a ledger survives only as a committing-layer session-end ritual; if adopted it is classified CALENDAR(session-end), appended only by the thread that commits, with automated append as a sanctioned upgrade. The viewer's Ledger tab already handles absence.
- **New optional artifact `docs/conventions.md`** (§3.20): a separately versioned working agreement (Status/Binds/Authority header, required sections, revision history) for the repo-local rules that belong neither in the OS trio nor in user-global config.

Reference implementations exist as neutral patterns: a Gradle-based product wires the freshness check as a unit test that emits the status file; a Node-based product wires it into a deterministic post-commit status generator (fail-open, degrade-gracefully). Map the mechanism to the project's own build system — the buckets, the emitted status file, and the skill are the contract; the tooling is free.

### Migration (agent instructions — idempotent)

1. Overwrite `PROJECT_OS.md`, `PROJECT_OS_BEHAVIOR.md`, `PROJECT_OS_VIEWS.md` with the 0.6 versions.
2. **Declare the tier** (`PROJECT_OS.md` Part 7): add a `Tier: solo | team | multi-team` line to the `PROJECT_SUMMARY.md` header (externalized solo: the note goes in `README.md` instead, naming the external systems). If the tier is not already recorded anywhere, infer it from how the repo is actually worked, mark the inference, and queue a Mode 3 confirmation.
3. **Classify every artifact** per the freshness rule (Part 2): CALENDAR / DEBT / DESCRIPTIVE, in a manifest the check reads. DEBT requires a ticket and an expiry date. Anything already stale enters as DEBT honestly — not as a silent CALENDAR violation.
4. **Wire the freshness check** into the project's own test or build system, emitting `docs/project-os-status.md` (§3.21) with its mandatory "What a test cannot see" section. Verify it is not vacuous: delete one manifest entry and confirm red; age a doc and confirm red without a forced rerun. If the check cannot be wired this session, create it as a ticketed DEBT item with an expiry — do not skip silently.
5. **Create the `project-os` skill** from the `BEHAVIOR.md` Part 1 template (open/close phases) and point the repo's agent-config file at it. Where the agent platform supports session-start hooks, install the injector too — then confirm it is live by reddening one row deliberately and observing the injection in a fresh session; an injector with nothing to inject fails silently.
6. **Token ledger decision** (§3.18): if `docs/token-ledger.md` exists and is current, keep it — classify CALENDAR(session-end, committing layer). If it exists and is stale, either revive it (classify + one catch-up row noting the gap) or retire it honestly via the Part 6 cleanup flow with a tombstone note. If absent, no action — it is optional now.
7. **If the tier is team or multi-team**, stand up the teams module (`BEHAVIOR.md` Part 7) where missing: `docs/ORCHESTRATOR.md` from the §3.19 template; handoff / handoffs / broadcast skills; fail-closed single-committer hooks + out-of-repo owner token (or record the policy-only downgrade and its threat model in an ADR); the `commit-msg` numbering guard. Record single-committer as an ADR if not already recorded. A project already running a variant maps it onto Part 7 and records any deviation (e.g. committed worker branches need the hook carve-out + superseding ADR).
8. **Optionally adopt `docs/conventions.md`** (§3.20): if repo-local working agreements are scattered across boards, chats, or commit messages, graduate them into a v1.0 manifesto.
9. Add a `JOURNAL.md` entry noting the upgrade to 0.6 and what was created or changed. (The KICKOFF lifecycle is bootstrap-only — no migration action.)

---

## Parked — candidates for future versions

Mechanisms observed in the field but not yet canon. Each is verified at its source before being folded; none is binding.

- Optional UX-foundation-artifacts module: per-persona empathy/journey maps + service blueprint with an inferred→validated lifecycle.
- Territory-split committer model (a second committer bounded by path territory, as an alternative to strict single-committer).
- Verify-at-source: another agent's reported result is a claim; the open phase and handoff intake re-verify against the artifact.
- Clean-worktree escape hatch: when a shared tree is broken by another lane, verify your change in a clean worktree at HEAD — never sweep in or revert the other lane's work.
- Ignore-hygiene as a correctness property: a protocol that reads `git status` degrades as that surface gets noisy.
- Releases build from a clean checkout, never a developer machine.
- The inherited-standard version stamp becomes a gated artifact (a stale "which version of the shared standard do I follow" is otherwise invisible).
- Classify generated artifacts by their **generator's** cadence, so a dead scheduler goes red even while its output looks fine.
- Threshold immutability under failure; sabotage-verified testing; ratchet gates for incremental migrations; an adversarial close phase.
- Environment-blocked obligations entering the DEBT bucket; a self-injecting cross-machine inbox; per-stream legal basis for data streams; agent-readable design-system manifests.
- **CI as a budget, not a utility:** expensive paths dispatch-only, local verification as the daily loop, batched pushes, and the accepted tradeoff written in the workflow beside its compensating control — with the measurement trap that a timing endpoint reporting zero billable hides the real cost (per-job duration × class multiplier).
- **Event-driven activation for delegated agents.** A polling heartbeat over a large-context agent is the most expensive way ever devised to ask "anything new?" — measured: 27 of 44 director turns were empty hourly wakeups at ~178k input tokens each for 4 output tokens, 66% of the thread's total spend buying 108 tokens of output. The only reliable event source is the requester, at the moment of request; a director that has to go looking for work should not exist as a schedule.
- **Cross-provider authorization lands in a shared artifact, or the human is the only valid relay.** An approval given inside one provider's conversation is invisible to the integrator on another; "a message is a claim, the artifact is the fact" then correctly rejects it, and the system stalls with both agents following their rules — measured: 48 hours, 11 unacknowledged deliveries, a shared gate red for every lane, unblocked only when the human commented with their own account.
- **A single-writer lock on an agent thread makes "who has it open" part of the protocol.** A thread open in one client cannot be driven by another, and the lock survives inactivity; any design where a lead drives a peer agent directly must declare who owns the thread and when it is yielded, or direct dispatch works in the test and fails in daily use.
- **The supervisor's observation tool is a distinct mechanism from the session protocol**, and one does not substitute for the other: a read-only cross-team snapshot (sessions + review queue + git + board, no actuation) is safe unconfirmed *because reading cannot mutate another agent's work*, while the steering half stays human-gated. A product can carry the observing half and still have no session protocol at all.

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
