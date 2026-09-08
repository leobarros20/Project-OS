#!/bin/sh
# project-os v0.6 id:activation-shim
# Vendor-agnostic session-start shim. Usage: shim.sh <vendor>
#
# The only job of this file is to make sure activate.mjs runs, and to speak if
# it cannot. Same contract as activate.mjs: no .project-os/config.json -> silent
# exit 0; config present -> exactly one payload, exit 0, on every path.
#
# Never install this shim where its interpreter is missing — init checks that.
# But if node vanishes AFTER install, this still speaks instead of going quiet.

VENDOR="${1:-unknown}"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || ROOT="."
[ -f "$ROOT/.project-os/config.json" ] || exit 0

HERE="$(cd "$(dirname "$0")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"PROJECT-OS v0.6 ACTIVE %s [%s] state=DEGRADED\\nProject-OS is installed here but node is not on PATH, so the checker cannot run. Say so in your first reply and run the doctor."}}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$VENDOR"
  exit 0
fi

node "$HERE/activate.mjs" "$VENDOR" 2>/dev/null || \
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"PROJECT-OS v0.6 ACTIVE %s [%s] state=DEGRADED\\nProject-OS activation failed to start. Run the doctor before new work."}}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$VENDOR"
exit 0
