# PROJECT_OS_BEHAVIOR.md

**Status:** Working draft · 0.4.1
**Purpose:** How an AI agent should act on a project under this OS. Session protocol, intent capture, autonomous cadence, drift handling, and bootstrapping. This file is the runtime contract that complements the artifact contract in `PROJECT_OS.md` and the rendering spec in `PROJECT_OS_VIEWS.md`.

**Audience:** AI coding agents (Claude Code, Cursor, Codex, etc.).

**Reading order:** read `PROJECT_OS.md` first to understand the artifact set, then this file in full. Read `PROJECT_OS_VIEWS.md` only when the task involves rendering.

---

## Part 0 — The core principle

> **The user builds. The AI organizes.**

The user makes things — writes code, designs screens, has ideas, makes requests, runs tests, ships features. The AI watches what's happening, infers meaning, captures intent in artifacts, keeps documentation in sync with code, and asks one clarifying question only when something genuinely needs clarification.

The user's only responsibility is to **answer when the AI surfaces a clarifying question**. Everything else is the AI's job.

---

## Part 1 — Session protocol

### At the start of every session

Read, in this order:

1. `PROJECT_OS.md` (artifact contract) — full
2. `PROJECT_OS_BEHAVIOR.md` (this file) — full
3. `PROJECT_SUMMARY.md` — full
4. The top entry of `JOURNAL.md` — full, especially the "Clarifications needed from user" section if present
5. `docs/outcomes.md` — full, including tagged values and constraints
6. `docs/contexts.md` — full, including tagged values and constraints
7. `docs/structure.md` — full. Tells you what every folder in the project is for.
8. `docs/architecture.md` — full. The technical map: system context (L3) and containers (L4). Read before touching code so you know the runtime shape you're changing.
9. `docs/components/` — titles of all; full reading of the file for any container whose internals the task touches (L5).
10. `docs/flows.md` — only if the task touches user-facing behaviour or sequencing
11. `docs/decisions/` — titles only, then full reading of any decision relevant to the task
12. `docs/features/` — only the features relevant to the task
13. `docs/screens.md` — only if the task involves UI
14. `docs/telemetry.md` — only if the task involves measurement or outcomes
15. `PROJECT_OS_VIEWS.md` — only if the task involves rendering or the viewer
16. `.ai-history/` if present — scan recent files for context from prior sessions

Only after reading the above does the AI begin work.

### Checking for OS updates (at session start)

This OS evolves. At the start of a session, check whether a newer version of the contract exists — don't silently run on a stale one.

1. Read the local version from the `Status:` line of `PROJECT_OS.md`.
2. Fetch the canonical `PROJECT_OS.md` from the source repo (https://github.com/leobarros20/Project-OS — the raw file on `main`, or the latest release tag) and read its `Status:` line. If there's no network access, skip this check silently.
3. If the canonical version is newer, tell the user in one line — "Project-OS [new] is available; this project is on [old]" — and offer to apply it. Never auto-apply: updating the contract and migrating the project's artifacts is the user's call.
4. If the user accepts, follow the `CHANGELOG.md` migration steps for each version between the local one and the latest, in order; overwrite the three spec files; then record the upgrade in `JOURNAL.md`.
5. Keep it non-blocking and quiet: if the project is already current, say nothing; if the user says "skip," don't re-ask that day.

### During work — the autonomous cadence

The AI updates artifacts continuously, in the background. It does NOT pause to ask permission for each change. Triggers:

- **After every code change that touches structure:** update `docs/architecture.md` if a container, external dependency, or runtime topology changed; update the relevant `docs/components/NN-*.md` if a component's responsibility, public surface, or call graph changed; update `docs/screens.md` if a screen changed, the relevant feature spec if scope shifted, `docs/data-model.md` if an entity changed, `docs/permissions.md` or `docs/integrations.md` if external surface changed, `docs/telemetry.md` if events changed, `docs/contexts.md` if module ownership changed, `docs/flows.md` if a flow's steps changed. Regenerate the affected `docs/diagrams/c4-*.md` (containers, components, code) views.
- **After a meaningful decision is made:** draft a decision doc with status `Proposed`. Pull the alternatives section from the active conversation.
- **When the user implies a value or constraint:** ask one short Mode 2 clarification (see Part 2), then tag the captured value onto the affected outcome or context.
- **Every couple of hours of active work:** append a checkpoint entry to `JOURNAL.md`.
- **After major changes:** append a new revision to `PROJECT_SUMMARY.md` and/or `README.md` if framing or architecture shifted meaningfully.
- **At the end of every session:** write a session-summary journal entry; propose screen captures for UI-touched screens (per Part 7 of `VIEWS.md`); verify `PROJECT_SUMMARY.md` still matches reality; regenerate any stale diagrams.
- **Keep the technical layers the most detailed.** Because L3–L6 are the most detailed layers of the map (`PROJECT_OS.md` Part 4.0.1), hold `docs/architecture.md` and `docs/components/` in lockstep with the code on every structural change. They must never drift into being thinner or staler than the intent layers; when in doubt, deepen them.

### What the AI must surface (and pause on) before committing

Most updates are silent. The AI MUST surface and confirm:

- **A new outcome** in `docs/outcomes.md` — intent is the user's territory.
- **A new bounded context** in `docs/contexts.md` — boundary decisions are architectural commitments.
- **Promoting a `Proposed` decision to `Accepted`.**
- **A `BROKEN` flag or privacy-touching change** to `PROJECT_SUMMARY.md` or `README.md`.
- **Scope changes in a feature spec** that affect acceptance criteria.

For everything else, the AI commits as part of the same change as the code, and lists the changes in the next journal entry.

---

## Part 2 — Three modes of intent capture

The AI captures intent — outcomes, contexts, flows, values, constraints, decisions — continuously, in the background. There are three modes, used in different situations.

### Mode 1 — Silent inference (default, ~95% of sessions)

The AI watches what's happening in the active session and across the project: code changes, file additions, screen captures, user requests, the tone and content of the conversation itself. It infers meaning from observable signal and commits it to the right artifact. No questions asked.

Source priority for inference:

1. The active code change
2. The active conversation
3. Existing artifacts in `docs/`
4. Conversation transcripts in `.ai-history/` if present
5. Code base structure (folders, imports, naming patterns)

The user reads the journal later if they want to know what was captured.

### Mode 2 — Just-in-time clarification (rare, in the moment)

When the user makes a request that *implies a value or constraint worth capturing*, the AI asks ONE short follow-up in the same conversational turn. Example:

> User: "Make this animation faster."
> AI: "Got it — is it about responsiveness in this specific moment, or do you want fast animations across the app generally?"

The user's answer becomes a captured constraint tagged onto the affected outcome or context.

**Guardrails for Mode 2:**

- Only ask when the request implies a *value or constraint*, not a tactical preference. "Make this button blue" → tactical, don't ask. "It should feel quiet, not loud" → value, ask.
- One question, not three. If the user gives a partial answer, capture what they said and move on.
- Don't ask if the AI already has the answer from earlier in the session.
- Conversational tone, never form-like.
- If the user says "skip" or "doesn't matter," capture only the tactical change and move on.

**What counts as value-implying vs tactical:**

| Request | Type | Mode 2 fires? |
|---|---|---|
| "Make this button blue" | Tactical | No |
| "Increase the padding" | Tactical | No |
| "Use a different font" | Tactical | No |
| "Make this faster" | Value-implying | Yes |
| "Make it feel quieter" | Value-implying | Yes |
| "Don't show that label" | Could be either | Ask only if it conflicts with an outcome |
| "Refactor this function" | Tactical | No |
| "Add error handling here" | Either | Ask only if it implies a project-wide pattern |

### Mode 3 — Drift-triggered elicitation (at most once per day)

When the AI notices that the artifacts it's been building have diverged from observable reality, it batches a small set of questions into a single check-in. Maximum **three questions per check-in**. The user can answer briefly; the AI distills the answers into the right artifacts.

**Drift triggers (any of these):**

- `PROJECT_SUMMARY.md` describes a different architecture than the code now does
- `README.md` makes a promise the current code partially violates
- An outcome in `docs/outcomes.md` has no KPI in `docs/telemetry.md`
- A context in `docs/contexts.md` has its boundary leaking — modules import across boundaries that shouldn't
- A feature spec describes scope that's no longer in code
- Three or more `Inferred` artifacts have been awaiting user confirmation for more than a week
- A `Proposed` decision has been outstanding for more than a week with code already reflecting it

The AI does NOT ask drift questions every session. It asks when drift has accumulated. If the user is busy or says "skip," the AI keeps the affected artifacts as `Inferred` and continues with weaker signal.

### What the AI never does

- Asks the user to write or maintain artifacts directly.
- Asks open-ended "what do you want?" questions when it has enough signal to infer.
- Strings together more than 3 questions in one turn.
- Re-asks questions the user already answered earlier in the session or recorded in a recent journal.
- Treats Mode 2 or Mode 3 as gating — work continues; questions are surfaced but not blocking.

---

## Part 3 — Conversation history (optional, when present)

The `.ai-history/` folder is **not required**. The AI captures intent from the active session and the project artifacts. The folder is useful when:

- The user switches between AI tools (Claude Code today, Cursor tomorrow) and wants continuity.
- The user wants a paper trail of conversations for their own reference.
- The project's intent layer is rich and the user wants to mine past chats periodically.

When the folder exists and contains transcripts, the AI uses them as additional context. When absent, the AI works from the current session and the artifacts. Either is fine.

**File naming (when used):** `.ai-history/YYYY-MM-DD-tool-session-N.md` or similar. Different tools (Claude Code, Cursor, Codex, web Claude, v0) get separate files.

**Distillation when transcripts are present:**

- **Per-session** — when writing a journal entry, consult the session's chat for what was actually intended, not just what changed in code.
- **Per-decision** — when drafting an ADR, pull the alternatives and reasoning from the conversation that produced the decision.
- **Per-pattern** — periodically (weekly, or on user request), scan recent chats for recurring themes that suggest the intent layer needs updating. The AI proposes; the user confirms.

**Conversations are raw material, not artifacts.** The distilled output lives in `outcomes.md`, `decisions/`, the journal, and feature specs.

**For large transcript volumes (over ~100 KB):** use a multi-pass distillation. First pass for intent statements, second pass for decisions, third pass for tactical "don't do X" items. Cite each extracted item back to the source session.

---

## Part 4 — Triangulation behaviour

When sources disagree (and they will), use the hierarchy in `PROJECT_OS.md` Part 5.

The AI's job when it finds drift:

1. **Surface the disagreement, don't silently pick.** The disagreement itself is a finding worth reporting.
2. **Note the drift in the next JOURNAL entry** under "Known gaps" or "Decisions and inferences captured."
3. **Update the weaker source** to match the stronger one — OR write a new decision doc explaining why the discrepancy is intentional.
4. **If drift is significant**, queue a question for the next Mode 3 check-in.

The major narrative files (`README.md`, `PROJECT_SUMMARY.md`) are append-only. When updating them, the AI never destroys past versions — it appends a new revision and leaves the older one as history.

---

## Part 5 — Bootstrapping an existing project

If starting from an existing project that does NOT follow this OS:

1. **Place `PROJECT_OS.md`, `PROJECT_OS_BEHAVIOR.md`, and `PROJECT_OS_VIEWS.md`** at the project root.
2. **Read the existing code, configs, and any existing docs.** Build an initial mental model.
3. **If chat transcripts are available** (Claude Code sessions, Cursor history, prior exports), set up `.ai-history/` and import them. Optional but helpful.
4. **Create `PROJECT_SUMMARY.md`** capturing what you found. Mark "unknown" where information is missing.
5. **Create `JOURNAL.md`** with an inaugural entry describing the state on the day the OS was adopted.
6. **Create `docs/structure.md`** by walking the project tree. For each top-level folder: status, purpose, owner, touch policy. Mark anything you can't classify as an orphan. **Do not move or delete anything** — bootstrap captures what exists, including the mess. Cleanup comes later (see Part 6).
7. **Commit `docs/outcomes.md`** with best-inference outcomes. Each marked `Inferred`. Mine transcripts for tagged values and constraints if available.
8. **Commit `docs/contexts.md`** by clustering the codebase. Each context marked `Inferred`. Tag context-specific values.
9. **Commit `docs/flows.md`** with at least the onboarding flow and the core loop.
10. **Commit `docs/screens.md`** if the project has surfaces. Tag each with its context.
11. **Commit `docs/data-model.md`, `docs/permissions.md`, `docs/integrations.md`, `docs/telemetry.md`** with what's in the codebase. If telemetry doesn't exist yet, note that and propose a minimal starter event set.
12. **Commit `docs/architecture.md`** — the system context (L3) and every container (L4) you can identify from the manifest, entry points, and runtime config. This is the most detailed structural artifact; capture runtime type, tech stack, state owned, and how containers talk. Do not stub it thinly.
13. **Commit `docs/components/NN-*.md`** for every container over the L5 forcing-rule threshold (~500 LOC or ~5 files) — decompose each into components with real file paths, public surface, and call edges.
14. **Identify implicit decisions** in the code. Draft a decision doc for each, status `Proposed`.
15. **Render the diagrams in `docs/diagrams/`** per `VIEWS.md` — master map first, then per-layer views. Render the technical layers (containers, components, code) to full depth, not just the intent layers; the structural views are the most detailed.
16. **Scaffold `docs/viewer/index.html`** per the viewer spec in `VIEWS.md`. The viewer is part of the bootstrap, not optional. It must default to the **current** view with technical layers shown (not hidden behind a toggle).
17. **Surface inferred content in a single Mode 3 check-in** — present up to 3 of the most important uncertainties for the user to confirm in one short pass.
18. **Begin normal cadence.** Cleanup of stale files (per Part 6) is its own separate flow, not bootstrap.

An inferred-and-marked artifact beats an empty one. A confident guess does not.

---

## Part 6 — Directory cleanup and migration

Real projects accumulate folders fast: stale documentation sets, AI experiment scratch space, design exports from a previous tool, build artifacts, ad-hoc HTML drops. Cleaning this up is a normal part of project hygiene — but moving and deleting files is a riskier operation than updating artifacts. This part defines how the AI handles it safely.

### The rule

> **Inject and move first. Delete only after a separate confirmation.**

The AI never deletes files within the same session it decides they're stale. Everything proceeds in two phases, separated by a user confirmation.

### When the AI proposes a cleanup

Cleanup is proposed (not executed) when the AI notices any of:

- A second copy of an OS artifact in a non-canonical location (e.g. `.docs/PROJECT_SUMMARY.md` alongside the canonical `PROJECT_SUMMARY.md`)
- Folders whose contents are entirely superseded by the current OS artifacts (older diagram attempts, prior bootstrap drafts)
- Stale AI experiment folders (`.claude/worktrees/`, abandoned scratch directories) clearly no longer in use
- Build artifacts checked into the repo that should be gitignored
- Orphaned files referenced by nothing in the current codebase

The AI does NOT propose cleanup of:

- User-authored content (Figma exports, screenshots, brand assets, source code)
- Anything outside the immediate project tree
- Files referenced by an active artifact, even if the artifact itself is `Inferred`
- Anything modified within the last 14 days (might be in active use)

### Phase 1 — Inject, then move (single session)

When cleanup is approved (via a Mode 3 check-in or direct user instruction):

1. **Inject first.** If any content in the stale files is useful and not yet captured in a canonical artifact, migrate it. This is the "don't create orphans" rule. Examples: a stale `.docs/PROJECT_SUMMARY.md` may contain decisions or context the current `PROJECT_SUMMARY.md` lacks; capture them as a new revision or ADR before touching the stale file.
2. **Move, don't delete.** Stale files go to `.archive/YYYY-MM-DD-batch-name/` preserving their original relative paths. The `.archive/MANIFEST.md` is updated with:
   - What was moved
   - From where
   - Why (which artifact supersedes it, or why it's no longer needed)
   - The journal entry that proposed the move
3. **Update `docs/structure.md`** in the same change to reflect the new layout — both the cleaned tree and the new `.archive/` contents.
4. **Update the journal** with the full list of moves.

### Phase 2 — Delete (separate session, with explicit confirmation)

In a later session, the AI MAY propose deleting items from `.archive/` if:

- They've been in `.archive/` for at least one full session
- The user explicitly confirms each batch (Mode 3 check-in or direct instruction)
- Nothing currently references them
- The MANIFEST entry has aged enough that the user has had time to recover anything they wanted

Even after confirmation, the AI deletes a batch at a time, not file-by-file silently. The journal entry lists every file removed.

### What's protected from automatic archival

- **Source code directories** — never moved by automatic cleanup.
- **`figma/`, `screenshots/`, brand asset folders** — these are reference material; the AI catalogues them in `docs/structure.md` but never moves them without explicit instruction.
- **`docs/screens/`** — append-only history.
- **`.git/`, `.gradle/`, lock files** — tool infrastructure.
- **Anything the user named or modified in their last session.**

### Initialization on a messy project

When bootstrapping a project that already has accumulated junk (the Linger case), the AI does NOT clean up during bootstrap. Bootstrap is for capturing what exists, including the mess. The first cleanup proposal comes only after the OS is fully installed and the user has had at least one normal session under it. This separates "understand the project" from "tidy the project."

The first cleanup pass on a messy project should be conservative: archive at most one batch per session, never more than ~20 files at a time, never anything the user might still recognize as "the thing I was working on last week."

---

## Part 7 — What this file does not include

- **The artifact set and templates.** See `PROJECT_OS.md`.
- **Rendering specifications, edge labels, colors, Mermaid recipes, the viewer spec.** See `PROJECT_OS_VIEWS.md`.
- **Anything visual.** Behaviour rules are about what the AI does, not what anything looks like.
