# The dead-man's switch — scheduling the watchdog

The pre-push hook only runs when someone pushes. A protocol whose activation
silently died on a machine that stopped pushing is invisible to it. So a
second, scheduled run is the weekly dead-man's switch: it runs whether or not
anyone works, writes its row to `.project-os/activation-ledger.md`, and commits
it under the lead's authority. **It must never depend on a billable service.**

Pick one; all write the same ledger row.

## Local cron (macOS / Linux)

```
# weekly, Monday 07:00 — replace the path
0 7 * * 1  cd /path/to/repo && node .project-os/watchdog.mjs --source scheduled --commit >> .project-os/watchdog.log 2>&1
```

## Windows Task Scheduler

```
schtasks /Create /SC WEEKLY /D MON /ST 07:00 /TN "project-os-watchdog" ^
  /TR "cmd /c cd /d C:\path\to\repo && node .project-os\watchdog.mjs --source scheduled --commit"
```

## An agent's scheduled task (where the tool has one)

A scheduled agent task that runs `node .project-os/watchdog.mjs --source scheduled --commit`
in the repo. It commits with the same credential as the lead's other
automation (BEHAVIOR Part 7.1) — it is an automation under the lead, not a
second committer.

## Hosted CI — optional, never a dependency

If an adopter already pays for hosted CI, the same command on a weekly cron is
fine. Do not make it the only witness: a watchdog on a metered service inherits
that service's risk and switches off exactly when the budget runs out, which is
when it is needed most. The local paths above are the reference.

## What the doctor checks

The doctor treats the ledger the way activation treats the heartbeat: not by
wall-clock age, but relative to commits. Commits landing more than 7 days after
the last ledger row mean the watchdog itself stopped — and that is reported as
red, because a dead dead-man's switch is the one failure nothing else can see.
