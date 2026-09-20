#!/usr/bin/env node
// Project-OS activation — the one payload every session starts with.
//
// Runs on the adopting repo's session-start event, for any vendor that fires
// one. Verified identical injection contract on Claude Code, Codex CLI and
// Gemini CLI: {"hookSpecificOutput":{"hookEventName":"SessionStart",
// "additionalContext": "..."}}. Vendor name comes in as argv[2] and only labels
// the sentinel; the behavior is the same everywhere.
//
// THE ONE RULE: .project-os/config.json is the switch.
//   absent  -> print nothing, exit 0, always. A repo without Project-OS is silent.
//   present -> print EXACTLY ONE payload on every code path, including our own
//              crash, and exit 0. Silence is never a legal outcome for an
//              installed repo — "installed and broken and nobody notices" is
//              the failure this file exists to make impossible.
//
// Heartbeat is written TWICE: "started" before the checker, then rewritten with
// the result. That is what separates never-fired / fired-and-crashed /
// fired-and-succeeded, which one timestamp cannot.
//
// No threshold is measured in wall-clock time. BROKEN_ACTIVATION fires when the
// last commit is newer than the last heartbeat: commits are the only proof a
// session happened, and a session without a heartbeat is exactly the failure.
// A repo nobody touched for a month is HEALTHY and quiet.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VERSION = '0.6.4';
const VENDOR = (process.argv[2] || 'unknown').toLowerCase();
const CAP = 9000;           // Claude clips at 10,000 chars; Codex ~2,500 tokens. Stay under.
const GRACE_MS = 60 * 60e3; // a commit up to 1h after the last heartbeat is the same session.

let root;
try { root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: 'pipe' }).trim(); }
catch { root = process.cwd(); }

const cfgPath = join(root, '.project-os/config.json');
if (!existsSync(cfgPath)) process.exit(0); // NOT_INSTALLED: silent by contract.

const hbPath = join(root, '.project-os/heartbeat.json');
const now = new Date();
const iso = now.toISOString();

// The vendor's hook payload on stdin: source (startup|resume|clear|compact) and
// session id. Read best-effort; never block on it.
let hookIn = {};
try { const raw = readFileSync(0, 'utf8'); if (raw.trim()) hookIn = JSON.parse(raw); } catch { /* no stdin, or not JSON */ }
const SESSION = String(hookIn.session_id || hookIn.sessionId || '');
const SOURCE = String(hookIn.source || 'startup');

// Double-fire guard: a plugin hook and an init-copied settings hook can BOTH run
// on the same session start (Claude runs matching hooks in parallel, no dedupe).
// One payload per session: the second activation exits quietly and records why.
if (SESSION) {
  const seen = join(root, '.project-os/.activated-' + SESSION.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64));
  if (existsSync(seen)) { try { writeFileSync(seen, 'dedup'); } catch {} process.exit(0); }
  try { mkdirSync(join(root, '.project-os'), { recursive: true }); writeFileSync(seen, iso); } catch {}
}
const sh = (c) => { try { return execSync(c, { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim(); } catch { return ''; } };
const readJSON = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const emit = (state, body) => {
  const head = `PROJECT-OS v${VERSION} ACTIVE ${iso} [${VENDOR}] state=${state}`;
  let text = `${head}\n${body}`;
  if (text.length > CAP) text = text.slice(0, CAP - 40) + '\n…[truncated to vendor cap]';
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }) + '\n');
};

// ---- witness 1: what did the PREVIOUS run leave behind? --------------------
const prev = readJSON(hbPath);
let inherited = null;
if (!prev) inherited = 'UNVERIFIED';
else if (prev.phase === 'started') inherited = 'DEGRADED_PREVIOUS';
else {
  const headTime = Date.parse(sh('git log -1 --format=%cI HEAD') || 0);
  const hbTime = Date.parse(prev.at || 0);
  if (headTime && hbTime && headTime > hbTime + GRACE_MS) inherited = 'BROKEN_ACTIVATION';
}

// ---- heartbeat #1 ------------------------------------------------------------
try {
  mkdirSync(join(root, '.project-os'), { recursive: true });
  writeFileSync(hbPath, JSON.stringify({ phase: 'started', at: iso, vendor: VENDOR, version: VERSION, origin: process.env.PROJECT_OS_ORIGIN || 'hook' }, null, 2));
} catch { /* a failed heartbeat write is reported below, never fatal */ }

let state = 'HEALTHY';
let detail = '';
try {
  const cfg = readJSON(cfgPath) || {};
  // run the project's own verify (the freshness check lives inside it)
  let verifyOk = true;
  if (cfg.verify) { try { execSync(cfg.verify, { cwd: root, encoding: 'utf8', stdio: 'pipe' }); } catch { verifyOk = false; } }
  const meta = readJSON(join(root, '.project-os/meta.json'));
  const head = sh('git rev-parse HEAD');
  if (!verifyOk) state = 'DOCS_STALE';
  else if (meta && meta.docsVerifiedAtCommit && head && meta.docsVerifiedAtCommit !== head) state = 'LATE';
  if (inherited === 'UNVERIFIED' && state === 'HEALTHY') state = 'UNVERIFIED';
  if (inherited === 'BROKEN_ACTIVATION') { state = 'BROKEN_ACTIVATION'; detail = `Last commit is newer than the last heartbeat (${prev.at}). A session happened here without activation firing — the hook is not registered, not trusted, or not running on that machine.`; }
  else if (inherited === 'DEGRADED_PREVIOUS') detail = `The previous activation (${prev.at}, ${prev.vendor}) started and never finished — it crashed mid-run. Run the doctor.`;
  else if (inherited === 'UNVERIFIED') detail = 'First activation on this machine (no previous heartbeat). Fresh clone or first install — this is expected once. Run the doctor to confirm.';

  const docsPath = (cfg.docsPath || 'docs/').replace(/\/?$/, '/');
  const status = join(root, docsPath, 'project-os-status.md');
  let owed = '';
  if (existsSync(status)) {
    const red = readFileSync(status, 'utf8').split(/^## RED/m)[1];
    if (red) owed = red.split('\n').filter((l) => l.startsWith('- ')).slice(0, 10).join('\n');
  } else {
    owed = `- No status file at ${docsPath}project-os-status.md yet — run: ${cfg.verify || 'the verify command'}`;
  }

  const body = [
    detail,
    `OPENING: read ${docsPath}project-os-status.md — it is generated, so it is the one place that cannot be stale about what the protocol is owed right now. Do not re-derive obligations from file dates.`,
    `CLOSING, before handing back or committing: same-change artifacts travel with the code; the journal entry records what you did AND what you could not verify; run \`${cfg.verify || 'verify'}\`. If a freshness gate is red, write the missing artifact — never raise a threshold, reclassify an entry, or extend a debt expiry to get green.`,
    cfg.tier && cfg.tier !== 'solo' ? `TIER ${cfg.tier}: you may be a Worker: commit and push only to your own branch, never to main; finished work returns as a pull request via /handoff.` : '',
    owed ? `OWED RIGHT NOW:\n${owed}` : 'OWED RIGHT NOW: nothing — freshness is green.',
  ].filter(Boolean).join('\n\n');

  writeFileSync(hbPath, JSON.stringify({ phase: 'done', at: iso, vendor: VENDOR, version: VERSION, state, exit: 0, origin: process.env.PROJECT_OS_ORIGIN || 'hook' }, null, 2));
  emit(state, body);
} catch (e) {
  // THE TRAP: our own crash is still exactly one payload, still exit 0.
  try { writeFileSync(hbPath, JSON.stringify({ phase: 'done', at: iso, vendor: VENDOR, version: VERSION, state: 'DEGRADED', exit: 1, error: String(e.message || e).slice(0, 200) }, null, 2)); } catch { /* nothing left to do */ }
  emit('DEGRADED', `Project-OS activation crashed while running: ${String(e.message || e).slice(0, 300)}\nThe protocol is installed here but its checker did not complete. Say so in your first reply and run the doctor before doing new work.`);
}
process.exit(0);
