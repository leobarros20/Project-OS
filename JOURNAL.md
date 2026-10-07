# Journal — Project-OS

## 2026-10-07 (evening) · Project OS Team lead (Claude)

### Done
- **0.7.7: a dead run's marker is a claim, not a lock.** An adopter's team lead reported, with the exact sequence: a run killed mid-way leaves `started` + the double-fire marker; the marker silences every later fire for that session; nothing can ever write the `done`; after an hour the watchdog blocks every push, and no message names the file. Verified at the source (one line: marker present → exit 0 before any heartbeat) before touching anything. Both of the two remedies they offered were taken, because they are complementary: the marker now expires (honoured while the run can still be running, 60 s, or once the session has a `done`), and every "started and never finished" names the file and the command that finishes that session. Three new cases; two fail on 0.7.6 and one is the control (a fresh marker still dedupes).
- **Their workaround, judged as they asked:** deleting the marker by hand and re-running that session to the end was the right move and the only one 0.7.6 offered; no `--no-verify`, so the ledger stayed honest. Nothing to correct there.
- `activation-test --only <regex>`: a subset by name, for proving a failure before its fix without the 15-minute suite. Not a gate.

### A test of mine that could not pass
- My first version of the relaunch case checked the written `done` through the test helper, which keeps no `session` field, so the assertion could never be true no matter what the code did. The manual reproduction said `done`; the test said no. A test that cannot pass is as useless as one that cannot fail, and the way I caught it is the same as always: run the scenario by hand and compare.

### Not done, and why
- A record stranded by a session that is gone for good still needs its file deleted by a person. The alternative — letting any later `done` clear any stranded record — is exactly how the nine-session race of 0.7.4 would come back. The message now says which file; that was the missing piece.
- The QA log the report cites (`clipper-hub/docs/qa.md`, four causes) is not at that path on this machine. Asked for it; the other three causes may be more findings.

### Decisiones pendientes de Leo
- Sin cambios respecto de las entradas anteriores de hoy.

## 2026-10-07 (later) · Project OS Team lead (Claude)

### Decision: the workbench gets a shape (0.7.6)
- Routed from an adopter's playbook the same day. Taken, generalized: the README as index; six kinds as sub-folders with names in the project's language (`notesFolders`, the `notesPath` pattern); frontmatter `date` · `topic` · `status` · `source`; wikilinks between notes; non-technical material has no other home; arrival (flat, 0.7.1) and filing (by a person, later) are two steps, so the two rules do not conflict.
- Not taken: the adopter's notes tool and how it reaches the repo, a tool-specific URL field, and its re-filing deadline. Those are theirs.
- Kept as is, on purpose: the class exclusion from freshness, index included. The adopter checks its index; the spec does not, because an exception to an exception is how a rule stops being explainable. Said in the spec.
- Why a release and not a parked note: `init` now creates folders, which is installer behaviour, and installer behaviour ships with a test (one, plus the existing self-test).
- This repo's own workbench got the six folders too.

### Found while gating, not fixed, worth a line
- **A saturated machine can turn a correct install into silence.** With 59 node processes from other sessions on this machine, activation took 8 to 17 s (freshness alone 2 s, the rest is process start under load); the vendor hook timeout in the templates is 15 s. A vendor that kills the hook at its timeout delivers no payload, which is the one outcome the module forbids — and the module only notices it *afterwards* (the next run reports the crashed predecessor; the watchdog sees a stranded start after an hour). The three vendor-contract cases of the test suite went over their 8 s budget for the same reason; the published v0.7.5 code, run as a control under the same load, failed them identically, so the release was held until the subset passed on a quieter machine rather than shipped on "it is only timing". Candidate for later: the activation payload could carry its own elapsed time, so a slow-but-alive activation is visible before it becomes a dead one.

### Decisiones pendientes de Leo
- Sin cambios respecto de la entrada anterior de hoy.

## 2026-10-07 · Project OS Team lead (Claude)

### Done
- **0.7.5: five installer failures, each reproduced before it was fixed.** Four came from re-vendoring 0.7.4 across eight real repos (reported 10-06 with evidence in the learnings log); the fifth, the `.gitignore` line for the heartbeat directory, I found by opening the file the 0.7.4 changelog made a claim about. Eleven new activation-test cases; all eleven fail against the 0.7.4 code and pass against 0.7.5 — the pre-fix run is in the release notes, not just asserted.
- **`init` on a worktree** works: the hooks directory is asked of git, not joined from `.git/`.
- **`init` exit codes say what happened.** 0 is complete-and-observed and is the only 0; 3 is applied-and-observed-with-refusals; 1 is a failure. A `RESULT applied= refused= observed=` line closes every run. `--allow-refusals` is for a wrapper that handles the printed list. I deliberately did not do what the report proposed (exit 0 when the non-refused steps applied): a wrapper that checks only the exit status would then read a partial install as finished.
- **The runtime file list is derived from imports.** 0.7.4 fixed the umbrella installer by extending a hardcoded list, which is the mechanism that broke it. A test plants a new import in a copy of the source and checks both installer paths carry it.
- **Both self-tests fail on `DEGRADED`.** The umbrella one accepted any payload with `umbrella=` in it, so a member whose activation could not start read as an installed umbrella.
- **A legacy `heartbeat.json` is superseded** once any per-session record exists. When it is genuinely the only record and stranded, the watchdog says what clears it.
- **The security ladder** routed into 3.23 (a `Level per surface` table and the three-rung rule) and bootstrap step 12b. Spec stays neutral: no vendor names, no product names.

### Reported, and not reproduced
- "The umbrella installer copies `activate.mjs` but not `heartbeat.mjs`." At the published 0.7.4 it copies both; I ran it. The structural cause (a hardcoded list) was real and is gone; the symptom is not claimed as reproduced. Possibly an older `init.mjs`, possibly a member re-vendored before its umbrella.

### Corrected in 0.7.4's record
- Its migration said `init` adds `.project-os/heartbeat/` to `.gitignore`. It did not; the line went into this repo's `.gitignore` and never into the list `init` writes. Two adopters confirmed: the directory exists and is not ignored. Third time a changelog claim of this kind went in without opening the file it was about. The correction stands inside the 0.7.5 entry; 0.7.4's text is left as written.

### Open, not mine to fix
- An umbrella member's own activation was timing out on 10-04 (no payload within the dispatcher's budget), surfaced only as the umbrella's `DEGRADED`. Whether the 10-06 re-vendor cleared it, I have not seen. Its lead's.
- One adopter's `verify` command is red on its own watchdog ledger and took over five minutes from my shell. Its lead's.

### Decisiones pendientes de Leo
1. **Registrar el hook de activación en el propio `.claude/settings.json` de project-OS.** Hoy nadie trabaja acá por hook; corro la activación a mano al cerrar sesión. Si alguien abre este repo sin saberlo, no hay activación. Decisión abierta desde 0.6.
2. **Exención del repo del spec en su propia deuda de self-host** (DEBT `self-host-1/2/3`, vencen 2026-10-15 y 2026-11-15). O el repo del spec se adopta a sí mismo en serio (hook + watchdog programado), o se declara exento con una fila explícita. Lo que no puede pasar es que venza en silencio.
3. **Párrafo del studio sobre `openai/codex-plugin-cc` y Codex 0.154 (read-only mientras hay un writer activo).** Lo escribí como hipótesis; pediste probarlo vos antes de que entre al spec.
4. **Modelo de esta sesión.** Según los avisos del sistema, los parches y tests de 0.7.5 corrieron bajo Sonnet 5.5 (la orquestación dijo haberlo cambiado por cuota) y el ruteo de la escalera más el cierre de release bajo Fable 5.1. Si querés que el texto del spec lo revise el modelo mayor antes de que un adoptante lo lea, es tu decisión, no la mía.

## 2026-10-03 · Project OS Team lead (Claude)

### Done
- **0.7.4: the heartbeat is a directory, one record per session.** Reported from a real product with a ledger row as evidence: nine sessions woken in three minutes raced the single heartbeat.json, the last writer's "started" survived, and the pre-push watchdog blocked a real merge push with "started and never finished". Each activation now writes its own file, and — the half the layout alone does not fix — a "started" record is a finding only when it is OLD and its own session never finished. With concurrent sessions, records in flight are the normal state.
- Shared helper (activation/heartbeat.mjs) so the activator, watchdog and doctor have one definition of what the trail says. Legacy heartbeat.json still read. Four new tests: the nine-session burst, a running session, an old crash, and the legacy path. 18/18 green.
- The documented manual-run command now redirects stdin, which 0.7.1 knew it needed and left out of the instructions anyway.

### Corrected in the report
- The reporter inferred the 24-byte markers proved completion. They do not: that marker is written at START. Their proposed rule (red only when no marker exists) would never have fired. Said so, with the mechanism that does work.

### Two things I broke and caught
- Adding the shared helper gave activate.mjs a sibling import, and the umbrella installer copied only the dispatcher — an umbrella install would have been broken on arrival. The umbrella test caught it, not an adopter.
- The same change made the doctor minutes long, and the sabotage suite runs the doctor eleven times, so the dev loop went to most of an hour. Added --fast (vendor contract only, 30 s); release gates stay on the full suite.

### Found while fixing, and it is the same failure as last time
- activation-test still carried the false Codex claim that 0.7.3 corrected in the doctor. One fix, two files, and I only checked one. The lesson repeats: a correction is not done until every copy of the claim is checked.
## 2026-09-29 · Project OS Team lead (Claude)

### Done
- **0.7.3: evidence by construction.** Two optional artifacts, docs/security/controls.md (3.23) and docs/security/ai-register.md (3.24). The honest distinction is in the spec: privacy law applies to a product with users regardless of certification, while security and AI-management certifications audit the ORGANIZATION, not the code. No repo can be compliant by itself; what it can do is make the evidence a by-product of ordinary work.
- Decision made and stated where the request left it open: **the freshness check does not parse the catalog tables.** Evidence artifacts go in the manifest like everything else, so an unclassified one is already red. One mechanism, not two.
- Bootstrap step 12a creates both even with no users and no AI system, with the Not-applicable-yet table filled in. The habit before the need.

### Fixed, and it is a failure of mine worth naming
- The doctor honesty line about Codex hook trust finally says the right thing (trust hashes the hooks.json ENTRY, not the shim bytes). **0.6.3 claimed this fix shipped. It did not** — the edit failed silently and I published the claim without opening the file. Three weeks of a changelog asserting something false about my own repo. The 0.6.3 entry now carries the correction inline rather than being rewritten, because a changelog that quietly repairs its own false claims is worth less than one that shows them. This time I grepped the file before writing the entry.
- The general lesson, which is the one this project keeps relearning at its own cost: a claim is not a fact until something checks it, and that includes a claim in a changelog about a one-line edit.

### Not verified
- Neither security artifact has been used by a real adopter; the templates are untested against an actual audit question.
## 2026-09-28 · Project OS Team lead (Claude)

### Done
- **0.7.2:** two freshness bugs that only appear in an ADOPTING repo, never here — which is exactly why this repo's own green never caught them. A renamed workbench (notesPath) read as UNCLASSIFIED because Part 2 names it by its default; lockstep demanded version.json / CHANGELOG / plugin.json, which only the spec repo has, so every adopter went red. Both were fixed upstream by the orchestrator (1bf6a0c) after installing 0.7.1 in eight repos.
- **Reproduced both before releasing** rather than taking the report on trust: built a scratch adopter (notesPath=notas/, no version files), confirmed green with the fix, reverted each hunk and confirmed each red. The fixes are correct and minimal.
- Wrote the verify contract into the config schema: it runs under execSync from the repo root, i.e. cmd.exe on Windows. A ./gradlew command was green in a real adopter's test suite and red in its watchdog for exactly this reason.

### Declined, with the reason
- The request also asked for a doctor check that runs verify like the watchdog. Read both first: they already invoke it identically (execSync, cwd root), so that class of mismatch already surfaces as a config FAIL. Adding a second check would have been ceremony, not coverage.

### Worth noting about how this was found
- At least one adopter hand-patched one of these bugs twice before anybody reported it. A checker bug that becomes somebody's routine is invisible to the checker, and nothing in the design catches that today.

### Not verified
- The migration step (re-vendoring via init) against a repo that hand-patched the checker; nobody has run that path yet.
## 2026-09-22 · Project OS Team lead (Claude)

### Done
- **0.7.1:** importing into the workbench is flat. Material from another tool lands where a hand-written note would, never in a folder named after its source; provenance goes in frontmatter; sub-folders mirror the source hierarchy only when the source had one. Correction from Leo: the handover has to be seamless, and a folder named after the exporter says the opposite.
- Verified against the real imports before writing it: they are already flat, carrying notion_url / notion_id / exportado in frontmatter, with sub-trees only where the source had them. The spec now matches practice rather than prescribing against it.

### Also found, by accident
- **Activation hung forever when stdin stayed open.** A backgrounded shell left an inherited pipe open and the synchronous stdin read never returned. A hung hook emits nothing, and silence is the one outcome the module forbids. Fixed (skip the read when stdin is a terminal) and the residual limit written into the spec rather than hidden. Every vendor closes stdin, so no adopter was affected — it was found because a wrapper did not.

### Not verified
- No adopter has yet run the 0.7.1 migration step (moving a tool-named folder up into the workbench root); nobody currently has one.
## 2026-09-21 (later) · Project OS Team lead (Claude)

### Done
- **0.7: the workbench.** New section 3.22: one directory where writing is allowed to be wrong — explorations, references, drafts, imported material. Nothing under it is a source of truth; an agent reads it for context, never cites it as fact, and never updates docs/ or a decision record from it without confirming. Excluded from freshness **as a class**, which is the one exception to the Part 2 rule that every declared artifact carries a class.
- Name configurable via notesPath (default notes/); init creates it with its README; new /promote skill takes a matured note into a decision record, a docs/ artifact or an issue and stamps the note with where it went.
- Verified both directions: a real unclassified artifact still goes red, and adding a note does not.

### Closed from the previous entry
- The two reds (BROKEN_ACTIVATION, watchdog) are closed by running activation as a **session-close ritual**, which is the weaker path the spec sanctions where no hook is registered — not by narrowing any check. The heartbeat records origin=session-close, so the trail says honestly how it fired. Registering the hook here is still the owner's open decision, and until then this ritual has to be run by hand every session, which is exactly the failure mode 0.6 was written about.

### Not verified
- The workbench against a real adopter migration (moving unmaintained material out of docs/).
- /promote end to end; it is deliberately manual and needs a real note.

## 2026-09-21 · Project OS Team lead (Claude)

### Done
- **0.6.5: umbrella activation.** A folder holding several project repos is where sessions open, is not a git repo, and so a per-repo activation exited silently — a correct install in every member fired zero times (measured on a real three-repo umbrella). Activation now dispatches to declared or discovered members, each running its own activation in its own repo with its own heartbeat, and emits one payload naming them all. A folder with no members stays silent.
- Hook command templates fall back to the working directory when `git rev-parse` fails; without it the command expanded to an empty path on exactly those folders.
- `project-os init` installs umbrellas; doctor gained an umbrella check; activation-test gained three umbrella cases (13/13 green).
- Recorded in the spec: a freshly published version file can 404 on a CDN's negative cache while an authenticated fetch returns it — an update check treats 404 as "keep the cache", never as a broken install.
- **Published.** origin/main carries 0.6.4 and tags v0.6 through v0.6.4; raw version.json returns 200.

### Known gaps, both red on purpose
- **The doctor reports BROKEN_ACTIVATION for this repo, and it is right.** Commits land here with no session heartbeat because activation is not registered in this repo's own settings — the registration decision was deferred to the owner and is still open. The check is not narrowed to hide it; it stays red until the hook is registered or an exemption is recorded.
- The spec-repo exemption (self-host-2/3) remains undecided; DEBT expiries 2026-11-15.
- Update detection (activation reporting local vs canonical) is still the next feature, unstarted.

### Not verified
- Umbrella dispatch against a real multi-repo product; only scratch umbrellas were exercised here.
- `init` against an existing `.codex/hooks.json` or `.gemini/settings.json`.

Append-at-top. One entry per session that changed the repo. What was done AND what could not be verified.

## 2026-09-20 · Project OS Team lead (Claude)

### Done
- `scripts/init.mjs` shipped: the install command six files named and none shipped. Copies the runtime, merges vendor hooks (foreign hooks kept), writes the static block, gitignore, pre-push; ends with an observed injection from root and a subdirectory. Verified in a scratch repo: dry-run writes nothing; real run 8 changes; idempotent rerun 0 changes; refusal path on a foreign pre-push.
- `/project-os init` section in the skill. Version 0.6.4 in lockstep.
- This journal created; it moves from DEBT (self-host-1) to CALENDAR in the manifest.

### Not verified
- `init` against a real adopter with an existing `.codex/hooks.json` or `.gemini/settings.json` (only `.claude/` with a foreign hook was exercised).
- Codex trust after init: the merged entry will show untrusted until a human trusts it in `/hooks`; not observable from here.

### Known gaps
- **Unpublished.** origin/main = e7f9fa1 (v0.6). Local: 0.6.4, 7 commits and 4 tags ahead. External adopters see 0.6 and a 404 on version.json. The push waits on the owner's own word in this session or his own hands; relayed instructions were refused four times on purpose.
- Update detection (activation reporting local vs canonical in its first line) accepted 09-10, not started.
- Spec-repo exemption (self-host-2/3) still undecided by the owner; DEBT expiries 2026-11-15.

### Next session
- Update detection, per `paye-hq/briefs/project-os-update-detection.md` sections A–J.
