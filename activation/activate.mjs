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

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const VERSION = '0.7';
const VENDOR = (process.argv[2] || 'unknown').toLowerCase();
const CAP = 9000;           // Claude clips at 10,000 chars; Codex ~2,500 tokens. Stay under.
const GRACE_MS = 60 * 60e3; // a commit up to 1h after the last heartbeat is the same session.

let root, inRepo = true;
try { root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: 'pipe' }).trim(); }
catch { root = process.cwd(); inRepo = false; }

const cfgPath = join(root, '.project-os/config.json');
const now = new Date();
const iso = now.toISOString();

// The vendor's hook payload on stdin: source (startup|resume|clear|compact) and
// session id. Read best-effort; never block on it. Read BEFORE any branch, so
// the umbrella path can hand the same stdin to each member.
let hookIn = {};
try { const raw = readFileSync(0, 'utf8'); if (raw.trim()) hookIn = JSON.parse(raw); } catch { /* no stdin, or not JSON */ }
const SESSION = String(hookIn.session_id || hookIn.sessionId || '');
const SOURCE = String(hookIn.source || 'startup');

// ---- UMBRELLA: this folder is not itself an installed project ---------------
// A folder holding several project repos is where sessions actually open, and it
// is not a git repo, so `git rev-parse` fails and a per-repo activation exits
// silently by contract. Measured: a three-repo umbrella whose members each had a
// correct install, and activation had fired ZERO times — "installed and nobody
// notices" surviving inside a correct install, which is the one thing this file
// exists to prevent. Silence is right for a stranger's folder and wrong for a
// project's own home; the difference is a declared or discoverable member.
if (!existsSync(cfgPath)) {
  const members = findMembers(root);
  if (!members.length) process.exit(0); // NOT_INSTALLED: silent by contract.
  runUmbrella(root, members);
  process.exit(0);
}

const hbPath = join(root, '.project-os/heartbeat.json');

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

// ---------------------------------------------------------------- umbrella ---
// Function declarations: hoisted, so the umbrella branch near the top can call
// them before the single-repo consts below it are initialized.

function findMembers(dir) {
  // Declared first: .project-os/umbrella.json names its members explicitly. A
  // declaration beats a scan — it survives a renamed folder, and it says which
  // repos a human meant rather than which happen to sit nearby.
  try {
    const decl = JSON.parse(readFileSync(join(dir, '.project-os/umbrella.json'), 'utf8'));
    const named = (decl.members || [])
      .map((m) => (typeof m === 'string' ? { path: m } : m))
      .map((m) => ({ name: m.name || m.path, dir: join(dir, m.path), declared: true }));
    if (named.length) return named.map((m) => ({ ...m, installed: existsSync(join(m.dir, '.project-os/config.json')) }));
  } catch { /* no declaration, or unreadable: fall through to the scan */ }
  // Otherwise a bounded ONE-level scan. Never deeper: a deep walk of somebody's
  // home directory is not a thing a session-start hook may do.
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => ({ name: e.name, dir: join(dir, e.name), declared: false, installed: existsSync(join(dir, e.name, '.project-os/config.json')) }))
      .filter((m) => m.installed);
  } catch { return []; }
}

function runUmbrella(dir, members) {
  const rank = { HEALTHY: 0, UNVERIFIED: 1, LATE: 2, DOCS_STALE: 3, DEGRADED: 4, BROKEN_ACTIVATION: 5, NOT_ACTIVATED: 5 };
  const budget = Math.max(80, Math.floor((CAP - 1200) / Math.max(members.length, 1)));
  const lines = [];
  let worst = 'HEALTHY';

  for (const m of members) {
    const act = join(m.dir, '.project-os/activate.mjs');
    if (!m.installed) {
      // Declared and not installed is a finding, not a footnote: somebody wrote
      // this member down and the install never happened, or was removed.
      lines.push('  ' + m.name + ': state=NOT_ACTIVATED — declared in umbrella.json but has no .project-os/config.json; run project-os init there or drop it from the declaration');
      worst = 'NOT_ACTIVATED';
      continue;
    }
    if (!existsSync(act)) {
      lines.push('  ' + m.name + ': state=NOT_ACTIVATED — installed but .project-os/activate.mjs is missing; run project-os init there');
      worst = 'NOT_ACTIVATED';
      continue;
    }
    // Each member runs its OWN activation, in its own repo: its heartbeat, its
    // freshness, its verdict. The umbrella never fakes a member's state.
    const r = spawnSync(process.execPath, [act, VENDOR], {
      cwd: m.dir,
      encoding: 'utf8',
      timeout: 20000,
      input: JSON.stringify({ session_id: SESSION, source: SOURCE }),
      env: { ...process.env, PROJECT_OS_ORIGIN: process.env.PROJECT_OS_ORIGIN || 'umbrella' },
    });
    let ctx = null;
    try { ctx = JSON.parse((r.stdout || '').trim()).hookSpecificOutput.additionalContext; } catch { /* no parseable payload */ }
    if (!ctx) {
      lines.push('  ' + m.name + ': state=DEGRADED — its activation produced no payload (exit ' + r.status + (r.error ? ', ' + r.error.message : '') + ')');
      if (rank.DEGRADED > (rank[worst] ?? 0)) worst = 'DEGRADED';
      continue;
    }
    const st = (ctx.split('\n')[0].match(/state=([A-Z_]+)/) || [, 'UNKNOWN'])[1];
    if ((rank[st] ?? 9) > (rank[worst] ?? 0)) worst = st;
    const owed = ctx.split(/^OWED RIGHT NOW:/m)[1];
    const detail = owed && !/nothing/.test(owed.slice(0, 40))
      ? ' — owes: ' + owed.trim().split('\n').slice(0, 3).join('; ').slice(0, budget)
      : '';
    lines.push('  ' + m.name + ': state=' + st + detail);
  }

  const head = 'PROJECT-OS v' + VERSION + ' ACTIVE ' + iso + ' [' + VENDOR + '] state=' + worst + ' umbrella=' + members.length;
  const body = [
    'This session opened on an umbrella folder (' + dir + '), not inside a project. It is not a git repository, so a per-repo activation would have exited silently — that is how a correct install fires zero times.',
    'Each member below ran its OWN activation, in its own repo, and keeps its own heartbeat:',
    lines.join('\n'),
    'Before working: cd into the member repo you are changing. Its generated status file is what says what that project owes; this summary is not a substitute. Anything above that is not HEALTHY is work owed there.',
  ].join('\n\n');
  let text = head + '\n' + body;
  if (text.length > CAP) text = text.slice(0, CAP - 40) + '\n…[truncated to vendor cap]';
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }) + '\n');
}
