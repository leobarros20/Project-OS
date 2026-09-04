#!/bin/sh
# Project-OS session opener, shipped WITH the plugin.
#
# Guarded and fail-open by construction: every branch exits 0. A broken or absent
# Project-OS state must never break someone's session — a documentation tool that
# can wedge a session is worse than no documentation tool.
#
# The trap this guards against, named in BEHAVIOR.md Part 1: an injector whose
# status artifact is missing exits silently and injects nothing, so the install
# looks done and does nothing. Here that case SPEAKS instead of vanishing.

STATUS="docs/project-os-status.md"
[ -f .project-os/config.json ] || exit 0

if [ ! -f "$STATUS" ]; then
  echo "[Project-OS] No generated status artifact at $STATUS. The protocol cannot tell you what it is owed until the freshness check has run once. See .project-os/config.json 'verify'."
  exit 0
fi

echo "[Project-OS] Session protocol, injected automatically — nothing had to be invoked to receive this."
echo ""
echo "OPENING: $STATUS is generated, so it cannot be stale with respect to this repo. Read it"
echo "instead of re-deriving obligations from file dates. Anything LAPSED, MISSING or PAST DUE is"
echo "work this session owes before it finishes — say so now, not at commit time."
echo ""
echo "CLOSING, before handing back or committing: artifacts that travel with the code go in the same"
echo "change; the journal entry records what you did AND what you could not verify; run the verify"
echo "command. If a freshness gate goes red, write the missing artifact — never raise a threshold,"
echo "reclassify an entry, or extend a debt expiry to get green. Narrowing the check is the failure"
echo "this protocol exists to stop, and it is cheap to spot in a diff."

RED="$(sed -n '/^## RED/,$p' "$STATUS" 2>/dev/null | sed -n '3,12p')"
if [ -n "$RED" ]; then
  echo ""
  echo "OWED RIGHT NOW:"
  echo "$RED"
fi
exit 0
