# Activation ledger

Append-only. One row per out-of-band watchdog run (pre-push, scheduled, manual, or hosted CI where an adopter has it). This is the team-scale detector: heartbeats are machine-local and gitignored, so a stopped heartbeat on someone else's machine is only visible here, as commits with no rows behind them.

| When (UTC) | Source | HEAD | State | Detail |
|---|---|---|---|---|
| 2026-09-08T05:02:04.320Z | manual | e40daf3 | GREEN | ok |
| 2026-09-20T23:41:56.848Z | manual | 12ff8a3 | RED | trail: last activation reported BROKEN_ACTIVATION; trail: commits landed more than 7 days after the last ledger row (2026-09-08) — the watchdog itself was not running |
| 2026-09-21T02:36:52.402Z | manual | df86e2b | RED | trail: last activation reported BROKEN_ACTIVATION |
| 2026-09-21T02:37:41.867Z | manual | df86e2b | GREEN | ok |
