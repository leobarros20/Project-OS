<!-- BEGIN PROJECT-OS v0.6.1 — do not edit inside these markers; `project-os init` rewrites this block -->
## Project-OS — read before doing anything

This repo runs under Project-OS. The protocol is a process, not a memory test:
you do not have to remember it, but you do have to check that it reached you.

**1. Did activation fire?** If your context already contains a line beginning
`PROJECT-OS v0.6.1 ACTIVE`, automatic activation happened — follow what it says.
**If it did not**, automatic activation did NOT happen on this machine. Say so
in your first reply, in one line, then run it by hand:

```
PROJECT_OS_ORIGIN=agent-manual node .project-os/activate.mjs <your-tool>
```

A manual run is itself the signature that the hooks are dead and the fallback
is working. Do not skip this because the repo looks fine — a repo whose
activation silently stopped looks exactly like a healthy one.

**2. Read the state, never derive it.** `docs/project-os-status.md` is generated
by the freshness check and is the one place that says what the protocol is owed
right now. Anything LAPSED / MISSING / PAST DUE is work this session owes before
it finishes.

**3. Close the session.** Before you hand back or commit: artifacts that travel
with the code go in the same change; the journal entry records what you did AND
what you could not verify; run the verify command in `.project-os/config.json`.
If a freshness gate is red, write the missing artifact — never raise a
threshold, reclassify an entry, or extend a debt expiry to get green.

**4. At team tier** (`tier` in `.project-os/config.json` is not `solo`): you may
be a Worker — one topic, one branch. Commit and push only to YOUR branch, never
to `main`; never merge. Rebase on `main`, then return finished work as a pull
request with `/handoff`. The lead is the only merger.

The full contract: `PROJECT_OS.md`, `PROJECT_OS_BEHAVIOR.md`, `PROJECT_OS_VIEWS.md`
(shipped with the Project-OS plugin; the spec is not copied into this repo).
<!-- END PROJECT-OS v0.6.1 -->
