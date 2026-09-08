#!/usr/bin/env node
// Project-OS watchdog — the out-of-band witness (Tier 4).
//
// A stopped heartbeat can only be noticed by something that runs even when
// nobody is working. This is that thing, and it deliberately runs on a
// DIFFERENT execution path from the session hook: a git pre-push (primary)
// and a local scheduled job (the weekly dead-man's switch). Never a billable
// CI service: a watchdog that depends on a metered service inherits that
// service's risk, and protocol failure detection must have zero marginal cost
// or it switches off exactly when the budget runs out — which is when it is
// needed most. Hosted CI remains an OPTION for adopters who have it, never a
// dependency.
//
// Three checks, one appended row in the committed activation ledger:
//   1. install integrity — shim, activator and sentinel string intact
//   2. freshness        — the project's verify command
//   3. activation trail — commits newer than the last heartbeat / ledger row
//
// Usage: node watchdog.mjs --source pre-push|scheduled|manual [--commit]
// Exit:  0 green · 1 red (blocks a push when run as pre-push) · always writes
//        the ledger row first, so a red is recorded even when it blocks.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const args = process.argv.slice(2);
const SOURCE = (args[args.indexOf('--source') + 1] || 'manual').replace(/^--.*/, 'manual');
const COMMIT = args.includes('--commit');
const GRACE_DAYS = 7;

let root; try { root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: 'pipe' }).trim(); } catch { process.exit(0); }
const cfgPath = join(root, '.project-os/config.json');
if (!existsSync(cfgPath)) process.exit(0); // not installed: silent, by the same contract as activation
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const sh = (c) => { try { return execSync(c, { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim(); } catch { return ''; } };
const readJSON = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

const red = [];

// 1. install integrity
const shimPath = existsSync(join(here, 'shim.sh')) ? here : join(root, '.project-os');
for (const f of ['shim.sh', 'activate.mjs']) if (!existsSync(join(shimPath, f))) red.push(`install: ${f} missing from ${shimPath}`);
if (existsSync(join(shimPath, 'activate.mjs')) && !/PROJECT-OS v\$\{VERSION\} ACTIVE/.test(readFileSync(join(shimPath, 'activate.mjs'), 'utf8'))) red.push('install: activator no longer emits the sentinel');

// 2. freshness
if (cfg.verify) { try { execSync(cfg.verify, { cwd: root, encoding: 'utf8', stdio: 'pipe' }); } catch { red.push(`freshness: "${cfg.verify}" is red`); } }

// 3. activation trail (commit-relative, never wall-clock)
const head = sh('git rev-parse --short HEAD');
const headTime = Date.parse(sh('git log -1 --format=%cI HEAD') || 0);
const hb = readJSON(join(root, '.project-os/heartbeat.json'));
if (hb && hb.phase === 'started') red.push(`trail: last activation (${hb.at}) started and never finished`);
if (hb && hb.state === 'BROKEN_ACTIVATION') red.push(`trail: last activation reported BROKEN_ACTIVATION`);
if (hb && hb.at && headTime > Date.parse(hb.at) + 60 * 60e3) red.push(`trail: HEAD (${new Date(headTime).toISOString()}) is newer than the last heartbeat (${hb.at}) — a session committed here without activation firing`);

const ledgerPath = join(root, '.project-os/activation-ledger.md');
if (existsSync(ledgerPath)) {
  const rows = readFileSync(ledgerPath, 'utf8').split('\n').filter((l) => /^\| \d{4}-/.test(l));
  const last = rows[rows.length - 1];
  const lastAt = last ? Date.parse(last.split('|')[1].trim()) : 0;
  if (lastAt && headTime > lastAt + GRACE_DAYS * 86400e3) red.push(`trail: commits landed more than ${GRACE_DAYS} days after the last ledger row (${new Date(lastAt).toISOString().slice(0, 10)}) — the watchdog itself was not running`);
}

// the row, written BEFORE any exit so a red is on record even when it blocks
const state = red.length ? 'RED' : 'GREEN';
if (!existsSync(ledgerPath)) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  writeFileSync(ledgerPath, `# Activation ledger\n\nAppend-only. One row per out-of-band watchdog run (pre-push, scheduled, manual, or hosted CI where an adopter has it). This is the team-scale detector: heartbeats are machine-local and gitignored, so a stopped heartbeat on someone else's machine is only visible here, as commits with no rows behind them.\n\n| When (UTC) | Source | HEAD | State | Detail |\n|---|---|---|---|---|\n`);
}
const when = new Date().toISOString();
appendFileSync(ledgerPath, `| ${when} | ${SOURCE} | ${head} | ${state} | ${red.length ? red.join('; ').replace(/\|/g, '/') : 'ok'} |\n`);

if (COMMIT && SOURCE !== 'pre-push') {
  // A scheduled job commits under the same authority as the lead's automation (BEHAVIOR 7.1).
  sh(`git add "${ledgerPath}" && git commit -q -m "watchdog: ${state} (${SOURCE}) ${when.slice(0, 10)}" -- "${ledgerPath}"`);
}

console.log(red.length ? `PROJECT-OS watchdog [${SOURCE}] RED:\n${red.map((r) => '  - ' + r).join('\n')}` : `PROJECT-OS watchdog [${SOURCE}] green (${head})`);
process.exit(red.length ? 1 : 0);
