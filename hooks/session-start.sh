#!/bin/sh
# project-os v0.6.5 — plugin SessionStart entry; delegates to the vendor-agnostic shim.
exec sh "$(dirname "$0")/../activation/shim.sh" claude
