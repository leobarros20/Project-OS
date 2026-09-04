# PROJECT_OS_BEHAVIOR.md

**Status:** Working draft · 0.6
**Purpose:** How an AI agent should act on a project under this OS. Session protocol, intent capture, autonomous cadence, drift handling, bootstrapping, and team orchestration. This file is the runtime contract that complements the artifact contract in `PROJECT_OS.md` and the rendering spec in `PROJECT_OS_VIEWS.md`.

**Audience:** AI coding agents (Claude Code, Cursor, Codex, etc.).

**Reading order:** read `PROJECT_OS.md` first to understand the artifact set, then this file in full. Read `PROJECT_OS_VIEWS.md` only when the task involves rendering.

---

## Part 0 — The core principle

> **The user builds. The AI organizes.**

The user makes things — writes code, designs screens, has ideas, makes requests, runs tests, ships features. The AI watches what's happening, infers meaning, captures intent in artifacts, keeps documentation in sync with code, and asks one clarifying question only when something genuinely needs clarification.

The user's only responsibility is to **answer when the AI surfaces a clarifying question**. Everything else is the AI's job.

And one corollary the whole artifact set depends on: **the active chat is raw project memory.** Treat every conversation as raw material that must be distilled into `JOURNAL.md`, `PROJECT_SUMMARY.md`, and the relevant `docs/` artifacts. Do not leave important decisions or context trapped only in the conversation — a decision that lives only in a chat, or only in a commit message, is a decision nobody will find.

---

## Part 1 — Session protocol

### The protocol is a process, not a memory test

Earlier versions of this part were a fifteen-file reading list plus roughly ten conditional update triggers carried in the agent's head for the whole session. Measured in the field, that design fails: on one real product it produced three lapses in three weeks (a journal 33 commits and 18 days behind; a summary 141 commits and 52 days behind), every one found by the user and none by the system. More policy did not fix it — the rule was already policy when the lapses happened. Per-file tripwires did not fix it — the rot moved to whichever file the check did not watch. The diagnosis: **the check was always narrower than the diagnosis behind it, and the protocol had no way to report its own state.**

What never rotted, anywhere: the artifact a check rewrites on every run. So as of 0.6 the protocol is a *process* with three mandatory mechanisms:

1. **The freshness check.** A check wired into the project's own build or test system enumerates the artifact set from this spec, requires every artifact to carry its freshness classification (`PROJECT_OS.md` Part 2), and goes red when a CALENDAR artifact lapses, a DEBT artifact passes its expiry, or *any* artifact is unclassified — the check detects its own incompleteness. Adding an artifact without deciding how it stays fresh becomes a red build.
2. **The generated status file.** The same check **emits** `docs/project-os-status.md` (`PROJECT_OS.md` 3.21). Agents read state there — one file, always current — and never derive it by comparing file dates.
3. **The invocable skill — that injects itself.** The protocol ships as a `project-os` skill with an **open** phase and a **close** phase, discoverable automatically by every agent on the repo. But a protocol that must be *remembered* is a protocol that lapses: measured on one product, 4 of 10 sessions delivered work having never opened the skill, while its closing gate was healthy — the two halves were failing differently, and only measurement showed which. So where the agent platform supports it, a **session-start hook injects the generated status file and the closing obligations into every session automatically**, hoisting anything LAPSED / MISSING / PAST DUE. The skill remains the full protocol; the hook only guarantees nobody starts blind. Where no hook mechanism exists, the repo's agent-config file points at the skill as the first instruction — weaker, and known to be weaker.

**Three traps, part of the contract:**

- **Declare the checker's inputs as a set, not file by file.** File-by-file inputs let a stale result serve a cached green — the same narrowness one layer down, in the thing built to stop narrowness. Verify by aging a doc and confirming red *without* a forced rerun.
- **State what the check cannot verify.** These gates verify that a dated heading exists, never that it says anything true; a stricter check would only raise the incentive to satisfy its letter. Each project's check and its status file carry an explicit "what this check cannot see" statement.
- **An injector with nothing to inject fails silently.** A session-start hook whose status artifact is missing exits quietly and injects nothing — the install looks done and does nothing. Installation is complete only when an **observed injection** has been confirmed in a real session, with a deliberately reddened row proving the content is live.

Two more rules keep the mechanism honest:

- **When a freshness check goes red, write the missing artifact.** Do not raise a threshold, do not move an entry to DESCRIPTIVE, do not extend a debt expiry without the user re-scoping the ticket. Narrowing the check is the exact failure this design exists to stop, and it is cheap to spot in a diff.
- **Verify the check is not vacuous, once, at setup:** delete one entry from the manifest and confirm red.

Deliberately *not* part of the design: deleting artifacts that have no current reader. That is the obvious efficiency, and it was considered and declined (2026-07-29) — keep the structure, put a process in place instead. Recorded here so the next adopter does not re-propose it.

### The `project-os` skill (reference template)

Ship this as a skill; adapt the bracketed parts to the project. The reading list it references is the one below.

~~~markdown
---
name: project-os
description: Open and close a session under the Project-OS protocol. Run it at
  the start of a working turn to see what the protocol is owed, and again before
  finishing to discharge it. Any agent on this repo, not just the lead.
---

## Phase 1 — Opening a session

1. **Read the state. One file, always current:** `docs/project-os-status.md`.
   It is generated by [the freshness check]; if it looks old, run the check —
   do not edit it. Anything LAPSED / MISSING / PAST DUE is work you owe before
   you finish. Say so in your first message rather than discovering it at
   commit time.
2. **Is the default branch green?** [CI status command]. Red means stop and
   diagnose before building on top.
3. **Is the tree yours?** `git status --short`. Uncommitted work you did not
   write is either a handoff to drain or someone's in-flight edit. Never sweep
   either into your commit (see Part 7 at team tier).
4. **Then the scoped reading list** — `PROJECT_OS_BEHAVIOR.md` Part 1, scoped
   to your task. Do not skip the top entry of `JOURNAL.md`: it is where the
   previous session left its unfinished business.

## Phase 2 — Closing a session

Each item is a gate, not a suggestion. Anything you skip, say you skipped and why.

1. **Same-change artifacts** (they travel with the code, per the cadence in
   Part 1): architecture/components/screens/data-model/constants updates, an
   ADR for any meaningful decision, [project-specific same-change gates].
2. **Deliberate-step artifacts** (they rot, which is why they are gated):
   `JOURNAL.md` entry — record what you did AND what you could not verify;
   `PROJECT_SUMMARY.md` when the status file says it is due; [others per the
   status file].
3. **Verify** — run [the project's test/build command]; the suite includes the
   freshness gates, so a lapse you did not fix surfaces here. If a gate goes
   red, write the missing artifact — never narrow the check.
4. **Commit** per the project's conventions (at team tier: only the lead
   commits — workers stop and run /handoff instead).
5. **Confirm it landed green** before calling the session done.

## What this process cannot do

[The project's honest ceiling — at minimum: the gates verify dated headings
exist, not that they say anything true; name anything the check cannot reach.]
~~~

### At the start of every session

The skill's open phase runs first (status file → CI → tree → then this list). Read, in this order, scoped to the task:

1. `PROJECT_OS.md` (artifact contract) — full
2. `PROJECT_OS_BEHAVIOR.md` (this file) — full
3. `PROJECT_SUMMARY.md` — full
4. The top entry of `JOURNAL.md` — full, especially the "Clarifications needed from user" section if present
5. `docs/outcomes.md` — full, including tagged values and constraints
6. `docs/contexts.md` — full, including tagged values and constraints
7. `docs/structure.md` — full. Tells you what every folder in the project is for.
8. `docs/architecture.md` — full. The technical map: system context (L3) and containers (L4). Read before touching code so you know the runtime shape you're changing.
9. `docs/components/` — titles of all; full reading of the file for any container whose internals the task touches (L5).
9a. `docs/constants.md` — scan for any group whose source file is touched by this task. If the viewer has queued a proposed change (found in JOURNAL.md under "Proposed constants changes"), apply it before anything else and mark it applied.
9b. `docs/token-ledger.md` — if the project has adopted it (optional as of 0.6), glance at the cumulative totals (awareness only; no action needed at session start).
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
- **After any change to a config file, `.env` example, theme file, or physics/constants module:** sync `docs/constants.md` — update changed values, add new constants, mark removed ones as retired.
- **When the viewer queues a proposed constants change:** it writes a journal-formatted block to the next JOURNAL.md entry. The AI reads it, applies the value to the Source file, and confirms in the same journal entry. This is how a non-programmer's slider move becomes a real code change.
- **After a meaningful decision is made:** draft a decision doc with status `Proposed`. Pull the alternatives section from the active conversation.
- **When the user implies a value or constraint:** ask one short Mode 2 clarification (see Part 2), then tag the captured value onto the affected outcome or context.
- **Every couple of hours of active work:** append a checkpoint entry to `JOURNAL.md`.
- **After major changes:** append a new revision to `PROJECT_SUMMARY.md` and/or `README.md` if framing or architecture shifted meaningfully.
- **At the end of every session:** run the `project-os` skill's close phase. It discharges: the session-summary journal entry; a row appended to `docs/token-ledger.md` if the project has adopted it (committing layer only — at team tier the lead appends, workers never do); screen-capture proposals for UI-touched screens (per Part 7 of `VIEWS.md`); the `PROJECT_SUMMARY.md` reality check; regeneration of stale generated artifacts; and the freshness gates themselves — a lapse the session did not fix goes red here, not in the next audit.
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

0. **Optional: start from a kickoff brief.** A new project may begin as a disposable `KICKOFF.md` — a self-contained handoff brief (mission, current state, what's left and who owns it, why the choices were made, gotchas, how to run it) whose own header states it can be deleted once the project is bootstrapped. The brief is raw material: bootstrap distills it into the artifacts below, pre-seeding `PROJECT_SUMMARY.md`, `docs/outcomes.md`, and the tier declaration. It is deleted at the end of bootstrap (step 19), never maintained alongside the artifacts it seeded.
1. **Place `PROJECT_OS.md`, `PROJECT_OS_BEHAVIOR.md`, and `PROJECT_OS_VIEWS.md`** at the project root.
2. **Read the existing code, configs, and any existing docs.** Build an initial mental model.
3. **If chat transcripts are available** (Claude Code sessions, Cursor history, prior exports), set up `.ai-history/` and import them. Optional but helpful.
4. **Create `PROJECT_SUMMARY.md`** capturing what you found. Mark "unknown" where information is missing. Declare the tier (`PROJECT_OS.md` Part 7) in the header — `Tier: solo | team | multi-team` — inferring from how the repo is actually worked and marking the inference if unconfirmed.
5. **Create `JOURNAL.md`** with an inaugural entry describing the state on the day the OS was adopted.
6. **Create `docs/structure.md`** by walking the project tree. For each top-level folder: status, purpose, owner, touch policy. Mark anything you can't classify as an orphan. **Do not move or delete anything** — bootstrap captures what exists, including the mess. Cleanup comes later (see Part 6).
7. **Commit `docs/outcomes.md`** with best-inference outcomes. Each marked `Inferred`. Mine transcripts for tagged values and constraints if available.
8. **Commit `docs/contexts.md`** by clustering the codebase. Each context marked `Inferred`. Tag context-specific values.
9. **Commit `docs/flows.md`** with at least the onboarding flow and the core loop.
10. **Commit `docs/screens.md`** if the project has surfaces. Tag each with its context.
11. **Commit `docs/data-model.md`, `docs/permissions.md`, `docs/integrations.md`, `docs/telemetry.md`** with what's in the codebase. If telemetry doesn't exist yet, note that and propose a minimal starter event set.
12. **Commit `docs/architecture.md`** — the system context (L3) and every container (L4) you can identify from the manifest, entry points, and runtime config. This is the most detailed structural artifact; capture runtime type, tech stack, state owned, and how containers talk. Do not stub it thinly.
13. **Commit `docs/components/NN-*.md`** for every container over the L5 forcing-rule threshold (~500 LOC or ~5 files) — decompose each into components with real file paths, public surface, and call edges.
13a. **Commit `docs/constants.md`** — walk every config file, `.env.example`, theme file, and physics/constants module and extract values into typed groups. Mark numeric values with min/max where the range is inferable. Do not include actual secrets — use `[set in environment]` as the value for any secret and type `secret`.
13b. **If adopting the optional `docs/token-ledger.md`** (a recorded decision — see `PROJECT_OS.md` 3.18): create the file with its header and empty table, then immediately append the first row for this bootstrap session (timestamp: now, model: current model, token counts: best estimate or `~estimate`, task: "bootstrap").
14. **Identify implicit decisions** in the code. Draft a decision doc for each, status `Proposed`.
15. **Render the diagrams in `docs/diagrams/`** per `VIEWS.md` — master map first, then per-layer views. Render the technical layers (containers, components, code) to full depth, not just the intent layers; the structural views are the most detailed.
16. **Scaffold `docs/viewer/index.html`** per the viewer spec in `VIEWS.md`. The viewer is part of the bootstrap, not optional. It must default to the **current** view with technical layers shown (not hidden behind a toggle).
16a. **Wire the freshness check** (Part 1): classify every artifact per `PROJECT_OS.md` Part 2, wire the check into the project's own test or build system, emit `docs/project-os-status.md`, and verify the check is not vacuous (delete one manifest entry → red; age a doc → red without a forced rerun). Create the `project-os` skill from the Part 1 template and point the repo's agent-config file at it.
16b. **If the tier is team or multi-team** (Part 7): stand up the teams module — the board (`PROJECT_OS.md` 3.19), the handoff / handoffs / broadcast / team skills (shipped: `.claude/skills/`), single-committer enforcement (fail-closed hooks + out-of-repo owner token, or a recorded policy-only downgrade), and the commit-numbering guard. Record single-committer as an ADR.
17. **Surface inferred content in a single Mode 3 check-in** — present up to 3 of the most important uncertainties for the user to confirm in one short pass.
18. **Begin normal cadence.** Cleanup of stale files (per Part 6) is its own separate flow, not bootstrap.
19. **If bootstrap started from a `KICKOFF.md`** (step 0): delete it now, in its own commit whose message records "preserved in history at commit NN", and note the same pointer in the inaugural `JOURNAL.md` entry — a commit-message-only pointer is invisible from the working tree. The brief served its purpose; keeping it alongside the artifacts it seeded creates a second, rotting source of truth.

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

## Part 7 — Teams: parallel workstreams under one lead

Active at the team and multi-team tiers (`PROJECT_OS.md` Part 7). A project under this OS is often worked by **multiple AI threads at once — one team per workstream** (a feature, a subsystem, design, growth, infra). This is how a single human keeps many streams moving in parallel; this part is what keeps it safe.

### 7.1 — One lead, many workers

- Exactly **one lead thread** (the Orchestrator) owns git. It is the sole author of every git-writing and remote-sync operation (`add` / `commit` / `push` / `pull` / `fetch` / `merge`) and the project's integration point. Every other thread is a **Worker**: it reads, edits, builds, and tests freely, and **never touches git — anywhere, including worktrees**.
- **Automation commits under the lead's authority.** A scheduled task or hook that writes a generated artifact uses the lead's credential and identity. It is an automation under the lead, not a second committer — one credential, one code path; the commit-numbering guard (7.4) is what keeps two callers on one credential from colliding.
- Adopting this model is a **recorded decision** (an ADR): the roles, the enforcement level, and the threat model.

### 7.2 — The handoff (the standard mechanic)

Finished work moves through one mechanic — the **uncommitted handoff**:

1. **Verify first.** The worker's build and tests pass before it hands off. Don't hand off broken.
2. **Leave the work uncommitted** — in the shared working tree, or in the worker's isolated worktree. Uncommitted worktree changes are safe (worktrees are auto-cleaned only when unchanged); the handoff names the worktree path so the lead can read it directly.
3. **File the queue entry:** an issue on the project's tracker, labeled `ready-for-review`, titled `HANDOFF: <team> — <short summary>`, with the standard body — **Tree** (shared, or the worktree path) · **What changed** (files + symbols + why) · **Verification done** (exact commands + results) · **UI touched?** (what trail was left) · **QA ticket** (required for features; n/a for docs/policy/refactor) · **Needs lead action** (deploy / secret / console, or none).
4. **Stop.** No commit, no push, no merge, no deploy — even if the task seems to require it. If it does, say so in the issue and stop. The queue replaces relaying work through the user.
5. **The lead drains the queue** — declared issues, plus `git status` on the shared tree, plus the worktree list. For each handoff: read the actual diff (a worker's "done" is a **claim to re-verify**, not a guarantee), run the integrated gate on the combined result (7.6), then stage the **exact paths** (`git commit <paths>`, never `-a`) and commit with the owner token; close the issue with "merged in `<sha>`".
6. **The lead bounces** a substantive handoff that lacks its docs artifacts — journal-worthy work with no artifact updates, a feature with no QA ticket. Returning incomplete work to its team is the system working.

The queue is **issues, not a file** — separate entries never collide, and the board (3.19) is explicitly not the queue. For contested shared docs, workers note the intended edit in the handoff instead of racing on the file; the lead serializes at commit time.

**Documented variant — committed worker branches.** Workers committing to isolated, namespaced branches (the lead reviews and merges) is a sanctioned variant **only** with both (a) an explicit hook carve-out permitting worker commits on those branches and (b) a superseding ADR recording the trade. Without both, the fail-closed hooks of 7.3 make the variant inoperable: a worker's commit is blocked everywhere — which is the system working, not a failure.

### 7.3 — Enforcement: fail-closed, out-of-repo

Policy alone fails under load — measured repeatedly, and always during the busiest weeks. At team tier the single-committer rule is enforced by three version-controlled hooks — `pre-commit`, `pre-push`, `pre-merge-commit` — sharing one mechanism:

- An **owner token** lives **outside the repo** (a sibling folder the repo cannot reach): one opaque line in a file only the lead's environment references.
- Each hook reads the token file and the authorization environment variable, strips whitespace from both, and passes **only on a non-empty exact match**. A missing token file blocks *everyone, the lead included*: fail closed, never open.
- The lead injects the token **inline per command**, never as a persistent environment variable — a worker thread's ordinary `git commit` must always hit the closed gate.
- **Honest threat model, stated in the ADR:** this is a guardrail against forgetful threads, not a cryptographic lock. Hook bypasses (`--no-verify`, hooks-path overrides) and plain `fetch` cannot be intercepted client-side; they remain policy-forbidden, and the no-bypass rule stays load-bearing regardless of the hooks.
- **Policy-only is a recognized downgrade** at adoption time — some projects run the same roles with no hooks. Record the choice and its threat model in the ADR; expect it to hold less firmly.

### 7.4 — Commit numbering

Commits are numbered `NN - description`, direct to the default branch, in **one shared monotonic sequence across all authorized callers** (the lead and any sanctioned automation). The next number is **highest existing + 1 — never a commit count**: count-based picking produces duplicates the moment two callers race. A `commit-msg` hook enforces the format and blocks duplicate numbers, suggesting the next free one. Known limit of the reference implementation: amending a commit while keeping its own number false-positives (the subject is already in history) — amend the message only, or renumber.

### 7.5 — The board

`docs/ORCHESTRATOR.md` (`PROJECT_OS.md` 3.19) is the lead's asynchronous broadcast channel — the coordination bus when threads cannot message each other live. Only the lead writes it (via a `/broadcast` step that appends a dated entry, newest first, never editing past entries). Workers read it at the start of every work cycle. **Two-tier durability:** the board carries current directives and announcements; the permanent contract lives in the docs — a lasting rule graduates into `docs/conventions.md` (or this file, upstream) in the same change that broadcasts it.

### 7.6 — Integration is the lead's job, and it happens at commit time

Because the teams share one codebase, **collisions surface at the seams**: two threads independently declaring the same name in a global namespace, or writing the same shared record with mismatched schemas — each passes per-file checks, and the combination breaks only when loaded together. Durable defenses:

1. **Shared declarations live in ONE module**, imported by the rest — never re-declared per thread. Document shared data schemas at the shared module and have every writer cite it.
2. **The lead verifies the integrated whole before committing** — the real load path, a full build, the test suite — not just per-file syntax. The single-committer model exists precisely so this gate has one owner.
3. **Seams with no build-time check get an append-only intake trail.** Where one team produces what another must curate (a design system, a shared vocabulary), the producing teams append to an intake file in the same change as the work, and the owning team drains it. The inbox stays raw and append-only; the curated backlog stays owned.

### 7.7 — Spinning up a team

A workstream is spun up as its **own session** (and, when isolation matters, its own worktree), briefed with a **self-contained work order**: scope, the files and areas it owns, the constraints (no git; verify before handoff), and how to hand off. A spawned session has no memory of the conversation that created it — the brief must stand alone. Teams own their own tickets and keep them as a living backlog; the code still returns through the queue.

---

## Part 8 — What this file does not include

- **The artifact set and templates.** See `PROJECT_OS.md`.
- **Rendering specifications, edge labels, colors, Mermaid recipes, the viewer spec.** See `PROJECT_OS_VIEWS.md`.
- **Anything visual.** Behaviour rules are about what the AI does, not what anything looks like.
- **The user's portfolio- or organization-level choices.** This OS defines mechanisms any project can run; which products adopt which options is recorded in each project's own ADRs and conventions.
