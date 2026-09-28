# Journal — Project-OS

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
