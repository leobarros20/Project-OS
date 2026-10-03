#!/bin/sh
# project-os v0.7.4 — plugin SessionStart entry; delegates to the vendor-agnostic shim.
exec sh "$(dirname "$0")/../activation/shim.sh" claude
