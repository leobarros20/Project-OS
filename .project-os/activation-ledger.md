# Activation ledger

Append-only. One row per out-of-band watchdog run (pre-push, scheduled, manual, or hosted CI where an adopter has it). This is the team-scale detector: heartbeats are machine-local and gitignored, so a stopped heartbeat on someone else's machine is only visible here, as commits with no rows behind them.

| When (UTC) | Source | HEAD | State | Detail |
|---|---|---|---|---|
| 2026-09-08T05:02:04.320Z | manual | e40daf3 | GREEN | ok |
