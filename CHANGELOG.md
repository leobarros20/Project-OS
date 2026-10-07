# Project-OS — Changelog & migration guide

**Canonical repo:** https://github.com/leobarros20/Project-OS
**Current version:** 0.7.10

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

## 0.7.10 — 2026-10-08

### What changed

**The activation ledger merges by union.** `.project-os/activation-ledger.md` is append-only and every branch's push appends a row to it, so with the one-branch-per-worker model of Part 7 every open PR conflicted with the default branch on that file each time another PR landed. An adopter counted five rebases in one day whose only conflict was the ledger, and one merge rejected for it; the resolution was always "both sets of rows", which is mechanical. Now `init` declares `.project-os/activation-ledger.md merge=union` in `.gitattributes` (foreign lines kept, idempotent), and git takes both sides in local merges and in the rebase before a PR that Part 7 already requires. A hosted web merge does not honour merge attributes, which is one more reason the rebase comes first. Tested: two branches each appending a row merge cleanly with the attribute and conflict without it (the control), and no row is lost.

**The newest ledger row is the newest timestamp, never the last line.** A union merge leaves rows in arbitrary order, and both the watchdog and the doctor read "the last line" as "the latest run" — which, after a union merge, could be an old row and a false "commits landed more than 7 days after the last ledger row". Both now take the newest timestamp. Tested with a ledger whose last line is from 2020 and whose first row is now. `PROJECT_OS_BEHAVIOR.md` 7.2 says so in one sentence, for people as much as for code.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.7.10 versions.
2. **Re-vendor every adopting repo with `project-os init`** (the `.gitattributes` line, plus the watchdog that reads by timestamp). Or add the line by hand now:
   ```
   .project-os/activation-ledger.md merge=union
   ```
3. Open PRs that conflict on the ledger today: rebase once after the attribute is on the default branch; git resolves it.
4. `JOURNAL.md` entry for the upgrade.

---


## 0.7.9 — 2026-10-07

### What changed

**`init` refuses a dirty source checkout.** `init` copies the runtime from its own checkout. A checkout of the spec repo with uncommitted changes therefore shipped work in progress into every adopter that ran it — twice: once unnoticed (0.6.5), once caught by an adopter who found 135 uncommitted lines above the tag and vendored by hand with `git show <tag>:<path>`. Now, when the source is a git checkout, `init` refuses **before writing anything** (exit `2`, pre-flight) if anything it copies — `activation/`, `scripts/`, `hooks/`, `version.json`, `.claude-plugin/` — differs from HEAD, names the dirty files, and offers the three ways out: commit or stash there, vendor from the tag, or `--allow-dirty` when it is deliberate. Every run prints its source: the version from `version.json` and whether HEAD **is** the tag that version declares, is past it (*copying unreleased code*), or has no such tag. A plugin copy with no `.git` is a release by construction and says so. Tested with a git-backed copy of the source: a clean one proceeds, a dirty one is refused with the file named and nothing written, `--allow-dirty` proceeds.

*Fixed after tagging (one commit past v0.7.9):* the tag lookup used `^{commit}`, which cmd.exe eats, so on Windows the source line said "no tag" for a checkout that was exactly at the tag. The refusal was never affected; only the informational line.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.7.9 versions (version line only; no text changed).
2. Nothing to re-vendor: this changes `init` itself, not what it installs. The next `init` from a checkout prints its source line; read it.
3. If `init` now refuses with exit `2`, the checkout it runs from has uncommitted changes. Do not pass `--allow-dirty` to make it go: vendor from the tag, or ask the spec repo's lead to commit.
4. `JOURNAL.md` entry for the upgrade.

---


## 0.7.8 — 2026-10-07

### What changed

From an adopter's QA log: five causes of a red pre-push guard, met one after another by four teams. Four were the OS's to fix.

- **The trail lives in the clone's git dir, not in the working tree.** Heartbeats and double-fire markers now live under `<git common dir>/project-os/` (`.git/project-os/` in a plain checkout). Three consequences, each with a test: a **new worktree shares the clone's trail**, so its first push is no longer "no activation has ever finished"; **`git clean -fdx` and `git stash -a` cannot take the trail with them**; and every worktree of one clone sees one trail, which is what "machine-local" meant all along. An umbrella folder is not a repo, so its trail stays under its own `.project-os/`. Records written by 0.7.4–0.7.7 into `.project-os/heartbeat/` are still read, as a fallback, until the new location has entries. Nothing to move or delete.
- **A red verify carries the command's own last words.** `freshness: "<cmd>" is red` now ends with the last three non-empty lines the command printed, so a verify that failed for want of `node_modules`, or behind a half-finished `npm install` that left `tsc` unknown, says so in the ledger row instead of sending a team hunting. The test assembles the failure text at runtime, so it cannot pass by matching the command's own text — the first version of that test did exactly that, and the pre-fix run caught it.
- **"No activation has ever finished" names the command**, and says that a fresh clone starts empty and that worktrees share the trail.
- **The doctor reads the real trail.** Since 0.7.4 it had been reading the pre-0.7.4 single `heartbeat.json`, reporting a weeks-old record as "last real heartbeat" while the per-session directory held the truth. Found by reading, not reported. It now uses the shared helper; a stranded record is a FAIL that names the file and the command; the sabotage case that proves the doctor can see `BROKEN_ACTIVATION` writes where the trail actually lives.

The fifth cause — a package install that dies mid-way and leaves an empty `node_modules/.bin` — is the adopter's. The second fix is what makes it visible.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.7.8 versions (version line only; no text changed).
2. **Re-vendor every adopting repo and every umbrella with `project-os init`.** Re-running is safe.
3. Nothing to move or delete: the old trail is read until the new one has entries, and the first activation after the upgrade writes the new location. A repo red today with "no activation has ever finished" in a worktree is green as soon as any session on that clone finishes an activation.
4. `JOURNAL.md` entry for the upgrade.

---


## 0.7.7 — 2026-10-07

### What changed

**A run killed mid-way no longer silences its session forever** (`activation/activate.mjs`). The double-fire marker `.project-os/.activated-<session>` was read as permanent. A run that died before finishing — its vendor's timeout, a harness stopping a background command, a session cut — left the marker and a `started` heartbeat behind. Every later fire for that session exited at the marker in silence, so nothing could ever write the `done` that clears the stranded record; after an hour the watchdog blocked every push with "started and never finished", and the only way out was finding and deleting a gitignored file by hand, which no message named. Reported from an adopter where four teams lost an hour each, on two consecutive days. Now the marker is a **claim, not a lock**: honoured while the run it belongs to can still be running (younger than `DEDUP_MS`, 60 s — a concurrent double fire starts milliseconds apart and a vendor kills a hook at about 15 s), or once that session has a finished record; otherwise the fire is the relaunch. The concurrent double fire the guard exists for still yields exactly one payload (tested); a dead run's session recovers on its next fire (tested; fails on 0.7.6). Nothing else about the trail changed: a stranded record is still cleared only by its own session's `done`, because letting any later activation clear it is how the nine-session race of 0.7.4 would come back.

**Every "started and never finished" now names the file and the command that clears it**, in the watchdog row and in the activation payload (`clearHint` in `activation/heartbeat.mjs`): the session's heartbeat file, and a one-line command that finishes that session with its id on stdin — or, when that session is gone for good, delete the file. The legacy single-file case keeps its own wording.

**`activation-test --only <regex>`** runs a subset of cases by name, so one case can be shown to fail before its fix lands without waiting for the whole suite. Never a release gate.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.7.7 versions (version line only; no text changed).
2. **Re-vendor every adopting repo with `project-os init`** so `.project-os/activate.mjs`, `heartbeat.mjs` and `watchdog.mjs` are the 0.7.7 copies. Re-running is safe.
3. A repo whose watchdog is red today with "started and never finished" needs nothing deleted: after step 2, the next fire for that session finishes it, and the message tells you the file and the command if you want it green sooner.
4. `JOURNAL.md` entry for the upgrade.

---


## 0.7.6 — 2026-10-07

### What changed

**The workbench has a shape (`PROJECT_OS.md` 3.22, *Shape*).** 0.7 gave every project one directory where writing may be wrong; it said nothing about what that directory looks like to the person who reads it, and that person reads it in a notes tool, not in the repo. Now, the same in every project so that habit does the finding: the README is the **index** (what each folder holds, the handful of notes worth opening first; kept by habit, never checked); **six kinds as sub-folders** — `research/`, `meetings/`, `marketing/`, `design/`, `references/`, `drafts/` — whose *names* follow the project's language (`notesFolders` in `.project-os/config.json`, same reason as `notesPath`) while the *kinds* never change; **every note opens with frontmatter** (`date`, `topic`, `status`, and `source` when imported), where `status: promoted → <where>` is the one line clause 4 already asked for; wikilinks between notes are fine, links into `docs/` are plain paths; **non-technical material has no other home** than the kind that fits; and **arrival and filing are two steps** — an import still lands flat (0.7.1), and filing it into a kind is a later step by a person who has read it.

`init` creates the index and the six folders, each with a one-line README because git keeps no empty directory, and substitutes the configured names into the index. An existing README is never touched. Tested: a renamed workbench with two renamed kinds gets exactly those names, nothing under the defaults, and a second run recognises what the first created.

**Freshness is unchanged.** The workbench stays excluded as a class, index included. Making the index the one checked file in there would be an exception to an exception; it is kept by habit instead, and the spec says so.

Routed from an adopter's playbook, where it was applied first. What was *not* taken, because it is that adopter's and not the protocol's: which notes tool, how the tool reaches the repo, a tool-specific URL field (`source` covers it), and a deadline to re-file existing notes.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.7.6 versions.
2. Re-run `project-os init`: it creates the missing kind folders. An existing README is not touched; to adopt the index, merge the template's *What is where* and *Every note opens with* sections into it by hand, or delete it and re-run.
3. If the folder names should follow another language, set `notesFolders` in `.project-os/config.json` **before** step 2.
4. Notes already at the workbench root: file them into kinds when somebody has read them. Nothing is red while they stay where they are.
5. `JOURNAL.md` entry for the upgrade.

---


## 0.7.5 — 2026-10-07

### What changed

Four installer failures found by re-vendoring 0.7.4 across eight real repos, plus a fifth that the same pass should have found and did not. Every one is reproduced by a test that fails against the old code before it passes against the new.

- **`init` crashed on a git worktree.** In a linked worktree `.git` is a *file*, so creating `.git/hooks` died with `ENOTDIR` — **after** every other step had already been applied, which made it look like a failed install that had in fact mostly succeeded. Worktrees are the branch-per-worker model this OS recommends, so the installer meets them constantly. The hooks directory is now asked of git (`git rev-parse --git-path hooks`). Hooks are shared by every worktree of a repository, so this installs once for all of them.
- **A refusal no longer reads as a complete install, and no longer hides what was applied.** `init` used to exit 1 for a refusal, which aborted every wrapper around it before the steps that came *after* the refused one. It was applied-and-observed, then reported as failed. Exit codes now say what happened: **0** is complete and observed and is the *only* 0; **3** is "everything that could be applied was, and seen firing, and N items need a human"; **1** is a real failure; **2** is a pre-flight problem. A final `RESULT applied=N refused=M observed=yes|no` line is machine-readable. `--allow-refusals` maps 3 to 0 for a wrapper that handles the printed list itself. *This is deliberately not "exit 0 when the non-refused steps applied"*: a caller that checks only the exit status would then read a partial install as finished, which is exactly how a broken install goes unnoticed.
- **The runtime files `init` copies are derived from what the entry points import**, not typed into a list. 0.7.4 fixed the umbrella installer by adding `heartbeat.mjs` to a hardcoded list — the same mechanism that had just broken it, and it would have broken on the next import. Add an import to `activate.mjs` and `init` carries the file with no edit. A test plants a new import and checks both installer paths copy it.
- **The umbrella self-test no longer passes a broken install.** It accepted any payload containing `umbrella=`, so a `DEGRADED` result — a member's activation that could not start — read as OK. It now fails on `DEGRADED` and prints each member's state. The repo self-test fails on `DEGRADED` too.
- **A pre-upgrade `started` heartbeat is superseded, not red forever.** The legacy single `heartbeat.json` is now read only while the per-session directory is empty. A legacy `started` that crashed before the upgrade can never be finished by anything — every new activation writes its own file — so under the age rule it stayed red on every push until somebody deleted the file by hand. When it *is* the only record and genuinely stranded, the watchdog now says what clears it: run activation once.

### Correction to 0.7.4

**0.7.4's migration said `init` adds `.project-os/heartbeat/` to `.gitignore`. It did not.** The line was added to the spec repo's own `.gitignore` and never to the list `init` writes, so in every repo re-vendored with 0.7.4 each session left untracked files in `git status` — confirmed in two adopters before this release. `init` now writes it. This is the third time a claim of this kind has gone into this changelog without anyone opening the file it was about; the record is left standing rather than rewritten.

### Reported, and not reproduced

The report said the umbrella installer copies `activate.mjs` but not `heartbeat.mjs`. At the published 0.7.4 it does: an umbrella install writes both. It could have come from an older copy of `init.mjs`, or from a member re-vendored before the dispatcher. The structural cause — a hardcoded file list — was real and is fixed regardless; the specific symptom is not claimed as reproduced.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.7.5 versions.
2. **Re-vendor every adopting repo with `project-os init`** (and every umbrella folder). Re-running is safe. Worktrees now work.
3. A wrapper around `init` should treat **exit 3 as "continue, then surface the REFUSED list"**, or pass `--allow-refusals` and read the `RESULT` line. Exit 1 is the only failure.
4. If a repo's `git status` shows untracked files under `.project-os/heartbeat/`, that is the 0.7.4 gitignore gap: the re-vendor above writes the line.
5. If the watchdog is red with "the pre-0.7.4 single heartbeat.json", run activation once; the legacy file is then superseded and ignored.
6. `JOURNAL.md` entry for the upgrade.

### Also in 0.7.5 — the security ladder (spec change, `PROJECT_OS.md` 3.23 and `PROJECT_OS_BEHAVIOR.md` Part 5)

The controls catalog (3.23) gains a **`Level per surface`** table and a rule that defines three rungs: **level 1** (a secret in the client, no per-row authorization, a client-decided paywall) blocks a release; **level 2** (server-side secrets, per-row rules on every table tested by omitting the identity, entitlement checked server-side against the billing provider) is the minimum before the first real user; **level 3** (rate limits on signup, login and metered calls, hard spend caps that fail closed, bot protection on public forms, a committed security audit) is the launch gate. The project's level is the lowest row. Bootstrap step **12b** fills the table before any user exists. Routed from an adopter's playbook, where it was applied first; generalizable because the rungs are about where secrets, authorization and entitlement are decided, not about any one stack. The freshness check is unchanged: the table is prose in a `DESCRIPTIVE` artifact, and the evidence it names is classified in the manifest like every other row (3.23's "the check reads the manifest, not this file").

---

## 0.7.4 — 2026-10-03

### What changed

**The heartbeat is a directory, one record per session.** Reported from a real product with evidence, and the evidence is the point: nine team sessions were woken inside three minutes, every one of them ran activation and finished, and the single shared `.project-os/heartbeat.json` ended holding the *last writer's* `started` — its own `done` lost in the race. The pre-push watchdog read "started and never finished" and **blocked a real merge push**. The ledger row shows RED at 03:37 and GREEN three minutes later, once somebody re-ran activation by hand.

- Each activation now writes `.project-os/heartbeat/<session>.json`, its own file, `started` then `done`. Concurrent sessions cannot overwrite each other.
- **And the half the file layout alone does not fix:** with sessions running concurrently, *a `started` record existing is the normal state*, not a failure. Nine agents working means records in flight. So a `started` record is a finding only when it is older than an hour **and** its own session never wrote a `done`. "Running right now" and "crashed long ago" are different things, and the old check could not tell them apart.
- The watchdog, the activator and the doctor all read the trail through one shared helper (`activation/heartbeat.mjs`), so there is one definition of "what the trail says" rather than three.
- **A pre-0.7.4 `heartbeat.json` is still read**, so an adopter who has not re-vendored keeps a working trail. Finished records older than a week are pruned, so the directory cannot grow forever.
- **The documented manual-run command now redirects stdin** (`< /dev/null`). The fallback in the static block hung under a non-TTY wrapper, which is the residual limit 0.7.1 wrote down and then left in the instructions anyway.

- **The doctor stopped being expensive.** Giving the activation suite a sibling module and a nine-process burst made the doctor minutes long, and the sabotage suite runs the doctor eleven times — the whole development loop went from a minute to the better part of an hour. The suite now takes `--fast`, which runs the vendor contract only (four cases, 30 s instead of four minutes); the burst and the other release gates run on the full suite. Also fixed: `activation-test` carried the same false claim about Codex hook trust that 0.7.3 corrected in the doctor. It was in a second file and the first fix did not reach it.

### Corrected from the report

The report inferred that the nine 24-byte `.activated-<session>` markers proved the activations completed. They do not: that marker is written at **start** and holds an ISO timestamp (24 bytes), or the word `dedup` for a second fire on the same session. It is not evidence of completion, which is why the report's proposed rule — treat a `started` heartbeat as red only when no marker exists — would never have fired. The age-plus-own-session rule above is the mechanism that actually distinguishes the two cases.

### Found while fixing it

Adding the shared helper gave `activate.mjs` a sibling import, and the **umbrella installer copied only the dispatcher** — so an umbrella install would have been broken on arrival. Caught by the umbrella test, not by an adopter. Both the installer and the test now copy the pair.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.7.4 versions.
2. **Re-vendor every adopting repo**: `project-os init`. It installs the new `heartbeat.mjs` beside `activate.mjs` — they travel together now, and an install with only one of them does not run. Re-run it on umbrella folders too.
3. Add `.project-os/heartbeat/` to `.gitignore` (init does this). The old `heartbeat.json` can stay: it is read as a legacy record and ignored once the directory has entries.
4. If a watchdog is currently blocking a push with "started and never finished" and the sessions in question did finish, that is this bug. Re-vendor, then re-run the watchdog.
5. `JOURNAL.md` entry for the upgrade.

---

## 0.7.3 — 2026-09-29

### What changed

**Evidence by construction: two optional security artifacts** (`PROJECT_OS.md` 3.23, 3.24). The distinction they rest on is stated in the spec rather than assumed: privacy law applies to a product with users whether or not anybody is certified, while security and AI-management certifications audit the **organization**, not the code — no repository can be compliant by itself. What a repository can do is make the evidence a by-product of ordinary work, so the day a buyer or an auditor asks, the answer is a file that was already being maintained rather than a month of archaeology.

- **`docs/security/controls.md`** — one row per control: the framework clauses it speaks to, **where the control lives in the repo**, and **which generated artifact proves it ran**. Nine families when they apply: access and identity, change management, secure SDLC, data governance, logging and monitoring, encryption and backups, incident response, vendor management, AI systems. The third column is the one nobody keeps, and it is the reason this belongs in this OS at all: a control with no named evidence is a claim, and a claim nothing regenerates is the stale-artifact failure the freshness rule already exists to catch. Evidence is a path or the literal words `none yet` — never a description of an intention.
- **`docs/security/ai-register.md`** — one entry per AI system, written **before** the system ships. Not a model card: a record of what it decides and who can overrule it. "Assists only, decides nothing" is a valid answer and should be written rather than left blank. One named owner, a person and not a team.
- **Classification, and the decision about how the check sees it:** the catalog and the register are `DESCRIPTIVE`; every evidence artifact the catalog names is classified in the **freshness manifest** as `GENERATED` (with its emitter) or `CALENDAR`, so a dead control is a red row in the status file. **The check does not parse the catalog's tables** — an evidence artifact missing from the manifest is simply unclassified there, which is already red. One mechanism, not two: a parser for this file would be a second place to get the rules wrong.
- **Bootstrap creates both even with no users and no AI system** (`BEHAVIOR.md` Part 5, step 12a), with the `Not applicable yet` table filled in — what is absent, and the condition that changes it. The habit has to exist before the need. A blank catalog and one that says "no users yet, revisit at first signup" look identical to a checker and completely different to a reader.

### Fixed, and a correction to the record

- **The doctor's honesty line about Codex hook trust is finally right**: trust hashes the **hooks.json entry** (command, timeout, matcher, path), not the shim's bytes, and Codex *does* expose `trustStatus` via `codex app-server` → `hooks/list`. **0.6.3's entry claimed this was already fixed. It was not** — that edit failed silently and the wrong line shipped for three weeks. The 0.6.3 entry now carries the correction inline instead of being quietly rewritten, because a changelog that repairs its own false claims in place is worth less than one that shows them. The lesson is the one this project keeps relearning at its own expense: a claim is not a fact until something checks it, including a claim in a changelog.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.7.3 versions; re-vendor `.project-os/` with `project-os init` to pick up the corrected doctor.
2. Adopting the security artifacts is a decision, not a default. To adopt: create both from the 3.23 and 3.24 templates, fill `Not applicable yet` honestly, and add every evidence artifact the catalog names to the freshness manifest as `GENERATED` or `CALENDAR`. A catalog whose evidence is not in the manifest is a catalog nothing checks.
3. `JOURNAL.md` entry for the upgrade.

---

## 0.7.2 — 2026-09-28

### What changed

Two bugs in the freshness check that only appear **in an adopting repo**, never in the spec repo — which is why the spec repo's own green never caught them. Both were found by installing 0.7.1 across eight repos, and both are reproduced and confirmed here in a scratch adopter before release.

- **A renamed workbench no longer reads as unclassified.** Part 2 names the workbench by its default (`notes/`), but an adopter that sets `notesPath` to something else (say `notas/`) got `notes/README.md — UNCLASSIFIED` on every run: the declaration was matched literally against a directory that does not exist there. The declaration now resolves to the configured `notesPath`, so the spec's default name and the project's chosen name are the same declaration.
- **Lockstep no longer demands the spec repo's own files.** The check compared `version.json`, `CHANGELOG.md` and `.claude-plugin/plugin.json` alongside the three spec `Status:` lines. An adopter carries only the spec files, so all three read `missing` and every adopting repo went red on lockstep. It now compares only the version-bearing files that are actually present. At least one adopter had hand-patched this twice before it was reported, which is the signal that a checker's own bug had become somebody's routine.
- **The `verify` contract is written down**: it runs under `execSync` from the repo root, i.e. the platform's default shell — `cmd.exe` on Windows. A command that works in a terminal can still fail there; `./gradlew …` is the case that bit a real adopter, whose test suite was green while the watchdog read red. The config schema now says so, and names the fix (a wrapper script or an absolute interpreter path). No new check was added: the doctor and the watchdog already invoke `verify` identically, so this class of mismatch already surfaces as a config FAIL.

### Migration (agent instructions — idempotent)

1. **Re-vendor the checker**: run `project-os init` in each adopting repo. It overwrites `.project-os/` with the fixed copies and leaves your config, manifest and artifacts untouched.
2. If a repo hand-patched either bug locally, drop the patch — the shipped copy now carries the fix, and a local divergence is the thing that makes the next upgrade silently skip you.
3. If `verify` is a shell-specific command (a `./gradlew` wrapper, an activated virtualenv, anything relying on your interactive shell), confirm it runs under `execSync` from the repo root and wrap it if it does not. Running the doctor is the fastest way to find out.
4. `JOURNAL.md` entry for the upgrade.

---

## 0.7.1 — 2026-09-22

### What changed

- **Importing into the workbench is seamless or it is not done** (`PROJECT_OS.md` 3.22). Material brought in from a wiki or a notes app writes **flat**, exactly where a hand-written note would go, and never into a folder named after the tool it came from. Provenance lives in the note's **frontmatter** (source URL, source id, export date), never in a path. Sub-folders mirror the source's own hierarchy, and only when the source had one. The reason is the point of the directory: once imported, that material is just notes, and a folder named after the exporter tells every future reader it is somebody else's stuff living here on sufferance. Six months later nobody should need to know where a note came from in order to use it — and if they do care, the frontmatter says. The workbench README carries the same rule.

- **Activation can no longer hang on stdin.** `readFileSync(0)` blocks until EOF, so a hand-run with a terminal on stdin never returned — and a session-start hook that hangs emits no payload, which is silence, the one illegal outcome. It now skips the read when stdin is a terminal. Every vendor closes stdin after writing its event, so the shipped path was never affected; this was found by hanging exactly that way in a wrapper. Residual limit, stated rather than hidden: an inherited pipe that stays open still blocks a synchronous read, so a manual run inside a wrapper should redirect from /dev/null.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.7.1 versions; re-run `project-os init` to refresh the workbench README.
2. If imported material sits under a folder named after its source tool, move it up into the workbench root (keeping any sub-tree the source itself had) and confirm each file carries its provenance in frontmatter. If it does not, add it before moving — the frontmatter is what replaces the folder.

---

## 0.7 — 2026-09-21

### What changed

**The workbench: one directory where writing is allowed to be wrong** (`PROJECT_OS.md` 3.22). `docs/` is the map — maintained, freshness-checked, obliged to be true. Nothing in the OS was a place for explorations, references, drafts, notes from a conversation, or material imported from outside. That material had two fates and both were bad: it bloated `docs/`, where the protocol correctly policed it into stale and red, or it stayed in a chat window and was lost.

- **Not a source of truth, and that is the clause that fails.** An agent may read it for context, must never cite it as fact, and must never update `docs/`, a manifest or a decision record from it without confirming with the owner. Stated in the spec, in the `BEHAVIOR.md` cadence, and again in the directory's own README — because an agent that skipped the spec still meets it there.
- **Exempt from freshness by construction, not by an exemption row.** The check excludes the directory as a class: no file under it is ever CALENDAR or DEBT, its age is never a finding, and adding a note never turns a build red. This is the one exception to the Part 2 rule that every declared artifact carries a class. Verified both ways: a real unclassified artifact still goes red, and a new note does not.
- **Every note carries a date; nobody is ever obliged to update one.** A stale note is working as intended.
- **Promotion is the exit**, via the new `/promote` skill: the note becomes a decision record, a `docs/` artifact or a tracker issue; it is rewritten rather than pasted; it is classified in the same change if the manifest tracks it; and the note stays where it is with one line saying where it went, so the trail survives. Promotion always confirms with the owner first — an agent quietly turning a draft into a decision is the exact failure the workbench exists to prevent.
- **Not a dumping ground** (a decision goes in decisions, a session record in the journal, a specification in `docs/`), and **weight matters**: binaries are allowed, but past a few megabytes the material belongs outside the repo. Observed in practice at 11 MB and 8 MB in two real projects, both past that line.
- **The name is configurable** (`notesPath` in `.project-os/config.json`, default `notes/`), so a team working in another language is not forced into English. `init` creates the directory with its README.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.7 versions.
2. Run `project-os init`: it creates the workbench with its README and adds `notesPath` to a config that lacks it. Or create it by hand from the 3.22 template.
3. If material nobody maintains is sitting in `docs/` — imported exports, references, drafts — move it into the workbench and drop its manifest rows. It stops being a freshness finding the moment it moves.
4. `JOURNAL.md` entry for the upgrade.

---

## 0.6.5 — 2026-09-21

### What changed

- **Umbrella activation** (`BEHAVIOR.md` Part 1). Several project repos often live under one folder, and that folder is where sessions open. It is not a git repository, so a per-repo activation found no root and exited silently by contract — and a completely correct install inside every member fired **zero times**. Measured on a real three-repo umbrella: spec, manifest, status file, config and session hooks present in each member, no heartbeat ever written. Activation now looks for members when it is not itself inside an installed project: a declared `.project-os/umbrella.json`, or a **bounded one-level** scan for siblings containing `.project-os/config.json`. Each member runs **its own** activation in its own repo and keeps its own heartbeat; one payload names every member with its own state, under the vendor cap. A folder with no members stays silent. A declared member that is not installed is reported, not skipped.
- **Hook commands survive a non-git cwd**: the templates now resolve the root with a fallback to the working directory. Without it the command expanded to an empty path on exactly the umbrella folders this release is about.
- **`project-os init` installs umbrellas too**: run it on the folder and it writes the dispatcher, declares the members it found, merges the vendor hooks, and self-tests for one payload naming them all. Members still need their own init.
- **The doctor gains an umbrella check**; activation-test gains three cases (two members named in one payload, a stranger folder staying silent, a declared-but-uninstalled member raising the state).
- **Recorded in the spec, from a real publish**: a freshly pushed version file can 404 on a raw-content CDN's negative cache for minutes while an authenticated fetch returns it. An update check must treat 404 as *keep the cached answer*, never as a broken install.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.6.5 versions.
2. Re-run `project-os init` in each member repo to pick up the hook-command fallback (it rewrites only what changed).
3. If sessions open on a folder holding several repos, run `project-os init` **on that folder** and commit the `.project-os/umbrella.json` it writes. Confirm one payload naming every member before calling it done.
4. `JOURNAL.md` entry for the upgrade.

---

## 0.6.4 — 2026-09-20

### What changed

- **`project-os init` exists.** Six files named it; none shipped it, so every adopter hand-copied nine things. `scripts/init.mjs` (`/project-os init`) copies the runtime into `.project-os/`, writes config defaults without overwriting, merges the SessionStart entry into each vendor config it detects while keeping foreign hooks, writes the static block into `AGENTS.md` and any `CLAUDE.md`/`GEMINI.md`, adds the gitignore lines, installs the pre-push watchdog, and ends by firing activation from the root and from a subdirectory — an install that has not been observed firing is not an install. It refuses what it cannot own. `--dry-run` prints the plan and writes nothing; re-running is safe.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.6.4 versions.
2. Any adopter still hand-installing per 0.6/5 and 0.6.3/2: run `node <project-os>/scripts/init.mjs --dry-run` from the repo root, read the plan, then run it without the flag. It reconciles an existing partial install rather than duplicating it.
3. `JOURNAL.md` entry for the upgrade.

---

## 0.6.3 — 2026-09-10

### What changed

Bug fixes to the shipped vendor templates, found by a review that loaded them into each vendor for the first time. All three templates were broken on day one; none had been exercised by its vendor, only simulated.

- **Gemini template timeout was 10 milliseconds.** Gemini measures hook timeouts in ms (verified in the bundle: `Hook timed out after ${timeout}ms`); the activation takes ~3 s, so Gemini killed it every session. Now `15000`. Claude and Codex measure in seconds and stay at `15`.
- **Codex refused the shipped hooks.json.** Its top level accepts only `description` and `hooks`; the `_project-os` marker key made Codex log an unknown-field error and load zero hooks. The marker now lives in `description`. Also corrected: Codex hook trust hashes the hooks.json *entry* (command, timeout, matcher, path), not the shim bytes — changing `activate.mjs` does not invalidate trust; and Codex *does* expose `trustStatus` via `codex app-server` → `hooks/list`. The doctor's honesty line said the opposite on both counts. **Correction, 2026-09-29: that edit silently failed and this entry was wrong for three weeks — the line still said "the shim's hash" until 0.7.3 actually changed it.** The record is left here rather than rewritten, because a changelog that quietly repairs its own false claims is worth less than one that shows them.
- **The Codex `[features]` fragment could stop Codex from starting**: appended to a config that already had `[features]`, it produced a duplicate table. It is now a single key that `init` merges into an existing table, and it is documented as unnecessary on Codex CLI ≥ 0.153.2, where hooks are stable.
- **Hook commands resolve the repo root themselves**: `node "$(git rev-parse --show-toplevel)/.project-os/activate.mjs" <vendor>`. The previous `sh .project-os/shim.sh` was cwd-relative — from a subdirectory it exited 127 with no payload, no DEGRADED, and the plugin gate read "not installed". It also removes the `sh` dependency, which Gemini on Windows (hooks via PowerShell) does not have.
- **Double-fire guard.** Claude runs a plugin's SessionStart hook and a project's settings hook in parallel with no dedupe; a repo with both received two payloads. Activation now reads the vendor's stdin (session id, source) and emits once per session; the second run exits quietly and records `dedup`.
- **One source of truth for the version: `version.json`** at the repo root, and the version markers in every shipped file (shim, plugin hook, templates, block, pre-push) now agree. The activation-test sentinel accepts trailing `key=value` fields and its time budget is a measured base plus a cap rather than a flat 5 s.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.6.3 versions.
2. If `.project-os/` exists: replace the three vendor config entries with the 0.6.3 templates (root-resolved command; Gemini timeout in ms; Codex marker in `description`). If `.codex/config.toml` gained a second `[features]` table, merge it into the first. Codex users re-trust the changed entry in `/hooks` — the entry changed, so trust legitimately resets.
3. Re-run the activation self-test from a **subdirectory** as well as the root; both must produce one payload.
4. `JOURNAL.md` entry for the upgrade.

---

## 0.6.2 — 2026-09-08

### What changed

- **New in the teams module: the studio** (`BEHAVIOR.md` 7.8). A lead delegates a whole objective to a **director** — a persistent thread on a provider that can spawn agents — who decomposes it, spawns and reuses dedicated **specialists**, consolidates, and delivers. Authority never inverts: human > lead > director > specialists. Every new team at team tier should be offered as the project's studio, with the roster proposed for the kind of project.
- **A four-message contract with receipts** (`request` · `question` · `delivery` · `acceptance`|`correction`), immutable and id-addressed, over a file mailbox the project's own sync layer carries. A receipt means handled, never approved.
- **Activation is the requester, never a schedule.** Sending a request triggers the director's thread synchronously through a provider adapter; a delivery wakes the lead's review through the provider's turn-complete notification. Measured: a polling heartbeat spent 66% of a director's tokens on empty wake-ups.
- **Cross-provider authorization goes through the human, in the repo.** A director's "the owner approved" is a claim; measured, two correct agents stalled 48 hours over one. The studio never commits to the default branch.
- **Two open items stated in the spec:** the single-writer lock a UI may hold on the director's thread (the adapter reports it, exit 2, instead of pretending), and the cost envelope of reloading the director's context per activation.
- Shipped: `studio/bridge.py`, `studio/adapters/codex.sh` (verified on Codex CLI 0.153.2: `exec resume` drives an existing thread; native `multi_agent` tools in exec mode), registry + director-runbook templates, `/studio request|inbox|accept|correct|init`. Activation surfaces a pending director delivery at session start.

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.6.2 versions.
2. Nothing to do unless adopting a studio. To adopt: `/studio init` (registry + runbook + mailbox on the project's existing sync layer), record the director's thread id once the human has created it, propose the specialist roster for the kind of project, record the adoption as an ADR. Any prior polling automation that wakes a director is retired — activation is by request only.
3. If a studio already exists on a bespoke bridge: map its parties to `lead`/`director`, point `bridge_root` at the existing mailbox (message and receipt formats are compatible), and switch its trigger to `send --trigger`.
4. `JOURNAL.md` entry for the upgrade.

---

## 0.6.1 — 2026-09-08

### What changed

- **The teams module recommends one branch per topic and one merger, from bootstrap** (`BEHAVIOR.md` 7.2, inverted). 0.6 made the uncommitted handoff the standard and worker branches a gated variant. Field use decided otherwise: the recommended model is now a lead that owns `main` and is the only merger; one worker per topic on its own branch, committing and pushing to it freely; the handoff is a pull request; conflicts are resolved in the PR by the single merger. **Why, stated in the spec and not just the mechanism:** each worker's context stays *closed around one topic and rich in the resolutions made there*, and the PR is the durable record of how each thing was resolved.
- **The rules that keep the model from degenerating are explicit:** territory and file ownership persist (branches do not stop two teams editing one file; ownership does); workers rebase on `main` before opening or updating a PR (reference case: four zombie PRs 9–47 commits behind); fail-closed hooks guard `main`, not the workers' branches; the merger verifies locally in a clean worktree, because hosted CI is never a dependency.
- **The uncommitted handoff is now the documented variant** — legitimate at solo tier or with no PR-capable remote, with its risk written down: work living only uncommitted in a worktree disappears with a `worktree remove`.
- **The roster depends on the kind of project** (7.7, bootstrap 16b): the AI proposes teams from what it detects — a game, a mobile app and a site do not share a roster — and the lead adjusts.
- **The four team skills** follow the new model; the board's standing directive and the activation payload say "your branch, never `main`".

### Migration (agent instructions — idempotent)

1. Overwrite the three spec files with the 0.6.1 versions.
2. If the project is at team tier and runs the uncommitted handoff with a PR-capable remote: adopt the branch model **at a natural break**, not mid-flight — record it as an ADR (superseding the single-committer one), update the board's standing directive, and re-point the hooks to guard `main` rather than all commits. If the remote cannot hold PRs, or the tier is solo, record that the uncommitted variant stays, with its written risk.
3. Add the rebase-before-PR rule and the local-clean-worktree verification to the lead's `/handoffs` step; ensure every worker brief names its territory.
4. If no roster exists on the board, propose one from `docs/architecture.md` / `docs/screens.md` for the lead to adjust.
5. `JOURNAL.md` entry for the upgrade.

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
- **Protocol failure detection must have zero marginal cost.** A watchdog that depends on a metered service inherits that service's risk and switches off exactly when the budget runs out — which is when it is needed most. Out-of-band witnesses run locally (a pre-push hook, a scheduled job); hosted CI is an option, never a dependency.
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
