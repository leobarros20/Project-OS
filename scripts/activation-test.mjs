#!/usr/bin/env node
// Activation self-verification — runs the shim exactly as each vendor would.
//
// This is what `project-os init` runs after writing a shim, and what the doctor
// runs on every visit. An activation that has not been fed a vendor's stdin and
// had its stdout parsed against the vendor's schema is an activation that
// works in theory. Every case runs in a throwaway clone; nothing here touches
// the real repo's heartbeat.
//
// Exit 0 = every case passed · 1 = something did not behave as a vendor expects.

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, existsSync, unlinkSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const GIT = 'git -c user.email=t@local -c user.name=t';
const SENTINEL = /^PROJECT-OS v[\d.]+ ACTIVE \d{4}-\d\d-\d\dT[\d:.]+Z \[(\w+)\] state=([A-Z_]+)(?: \S+=\S+)*$/;
const BUDGET_MS = 8000; // measured base ~2.5-3 s here; vendors kill at 15 s (15000 ms on Gemini)
// --fast runs only the vendor contract. Every case clones the repo and makes a
// commit, so the full suite is minutes, and the doctor is run constantly (the
// sabotage suite alone runs it 11 times). The rest are release gates.
const FAST = process.argv.includes('--fast');
const FAST_CASES = /exactly one parseable payload|not installed/;
let sessionSeq = 0; // every run gets its own session id unless a case asks otherwise

const clone = () => {
  const d = mkdtempSync(join(tmpdir(), 'po-act-'));
  cpSync(ROOT, d, { recursive: true, filter: (s) => !/[\\/]\.git[\\/]|[\\/]\.git$|node_modules/.test(s) });
  execSync(`${GIT} init -q && ${GIT} add -A && ${GIT} commit -q -m scratch`, { cwd: d, stdio: 'pipe' });
  rmSync(join(d, '.project-os/heartbeat'), { recursive: true, force: true });
  rmSync(join(d, '.project-os/heartbeat.json'), { force: true });
  return d;
};
const shim = (d, vendor, env = {}, session = `s-${++sessionSeq}`) => {
  const t0 = Date.now();
  const r = spawnSync('sh', ['activation/shim.sh', vendor], { cwd: d, encoding: 'utf8', input: JSON.stringify({ session_id: session, hook_event_name: 'SessionStart', source: 'startup' }), env: { ...process.env, ...env } });
  return { code: r.status, out: r.stdout, err: r.stderr, ms: Date.now() - t0 };
};
// The heartbeat is a DIRECTORY as of 0.7.4: one record per session, because a
// single shared file raced under nine concurrent activations in production.
const hbAll = (d) => {
  const out = [];
  try { for (const f of readdirSync(join(d, '.project-os/heartbeat'))) out.push(JSON.parse(readFileSync(join(d, '.project-os/heartbeat', f), 'utf8'))); } catch { /* none */ }
  try { out.push(JSON.parse(readFileSync(join(d, '.project-os/heartbeat.json'), 'utf8'))); } catch { /* none */ }
  return out.sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));
};
const hb = (d) => hbAll(d).find((r) => r.phase === 'done') || null;
const writeHb = (d, name, rec) => { mkdirSync(join(d, '.project-os/heartbeat'), { recursive: true }); writeFileSync(join(d, '.project-os/heartbeat', name + '.json'), JSON.stringify(rec)); };
const clearHb = (d) => { rmSync(join(d, '.project-os/heartbeat'), { recursive: true, force: true }); rmSync(join(d, '.project-os/heartbeat.json'), { force: true }); };
const parse = (out) => { const j = JSON.parse(out.trim()); const ctx = j.hookSpecificOutput.additionalContext; const m = ctx.split('\n')[0].match(SENTINEL); return { j, ctx, vendor: m && m[1], state: m && m[2], sentinelOk: !!m }; };

const results = [];
const t = (name, fn) => {
  if (FAST && !FAST_CASES.test(name)) return; try { const r = fn(); results.push({ name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { results.push({ name, ok: false, detail: `threw: ${e.message}` }); } };

// 0. Not installed -> silent, exit 0.
t('not installed: prints nothing, exits 0', () => {
  const d = clone(); try {
    unlinkSync(join(d, '.project-os/config.json'));
    const r = shim(d, 'claude');
    return (r.code === 0 && r.out.trim() === '') || `exit=${r.code} stdout=${JSON.stringify(r.out.slice(0, 80))}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 1. Each vendor: one payload, parses, sentinel, exit 0, under cap, under 5s, heartbeat done.
for (const vendor of ['claude', 'codex', 'gemini']) {
  t(`${vendor}: exactly one parseable payload with sentinel, exit 0, within budget`, () => {
    const d = clone(); try {
      const r = shim(d, vendor);
      if (r.code !== 0) return `exit ${r.code}: ${r.err.slice(0, 120)}`;
      if (r.out.trim().split('\n').length !== 1) return `expected 1 line of stdout, got ${r.out.trim().split('\n').length}`;
      const p = parse(r.out);
      if (!p.sentinelOk) return `first line is not the sentinel: ${p.ctx.split('\n')[0]}`;
      if (p.vendor !== vendor) return `sentinel vendor ${p.vendor} != ${vendor}`;
      if (p.ctx.length > 10000) return `payload ${p.ctx.length} chars exceeds Claude's 10k cap`;
      if (r.ms > BUDGET_MS) return `${r.ms}ms, over the ${BUDGET_MS}ms budget`;
      const h = hb(d); if (!h || h.phase !== 'done') return `heartbeat not finalized: ${JSON.stringify(h)}`;
      if (p.state !== 'UNVERIFIED' && p.state !== 'HEALTHY' && p.state !== 'LATE') return `fresh clone should be UNVERIFIED/HEALTHY/LATE, got ${p.state}`;
      return true;
    } finally { rmSync(d, { recursive: true, force: true }); }
  });
}

// 2. First run is UNVERIFIED (no heartbeat); second run is not.
t('first run UNVERIFIED, second run settles', () => {
  const d = clone(); try {
    const a = parse(shim(d, 'claude').out); const b = parse(shim(d, 'claude').out);
    return (a.state === 'UNVERIFIED' && b.state !== 'UNVERIFIED') || `first=${a.state} second=${b.state}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 3. BROKEN_ACTIVATION: a commit newer than the last heartbeat.
t('BROKEN_ACTIVATION when HEAD is newer than the last heartbeat', () => {
  const d = clone(); try {
    writeHb(d, 'ancient', { phase: 'done', at: '2020-01-01T00:00:00.000Z', vendor: 'claude', state: 'HEALTHY' });
    const p = parse(shim(d, 'codex').out);
    return p.state === 'BROKEN_ACTIVATION' || `got ${p.state}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 4. Quiet repo is NOT an alarm: old HEAD and old heartbeat together are healthy.
t('quiet repo: old HEAD + old heartbeat is not an alarm (no wall-clock threshold)', () => {
  const d = clone(); try {
    // Committer date is what %cI reads. Pass it via env, not a shell prefix: that syntax does not exist on Windows.
    execSync(`${GIT} commit -q --amend --no-edit --date="2020-06-01T00:00:00Z"`, { cwd: d, stdio: 'pipe', env: { ...process.env, GIT_COMMITTER_DATE: '2020-06-01T00:00:00Z' } });
    writeHb(d, 'quiet', { phase: 'done', at: '2020-06-02T00:00:00.000Z', vendor: 'claude', state: 'HEALTHY' });
    const p = parse(shim(d, 'gemini').out);
    return p.state !== 'BROKEN_ACTIVATION' || 'a month-old untouched repo raised BROKEN_ACTIVATION — that is the false alarm the commit-relative rule exists to prevent';
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 5. Stranded "started" record from a previous crash is reported.
t('previous run crashed mid-way: next run says so', () => {
  const d = clone(); try {
    // Old, so it is a crash rather than a session still running: a fresh
    // "started" is the normal state when several sessions are open at once.
    writeHb(d, 'crashed', { phase: 'started', at: '2020-01-01T00:00:00.000Z', vendor: 'claude' });
    const p = parse(shim(d, 'claude').out);
    return /never finished|crashed/i.test(p.ctx) || 'stranded started-record was not reported';
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 6. Our own crash is still exactly one payload, state DEGRADED, exit 0.
t('own crash -> one DEGRADED payload, exit 0 (silence is never legal)', () => {
  const d = clone(); try {
    const c = JSON.parse(readFileSync(join(d, '.project-os/config.json'), 'utf8')); c.docsPath = 12345; // .replace on a number throws inside the try
    writeFileSync(join(d, '.project-os/config.json'), JSON.stringify(c));
    const r = shim(d, 'claude'); const p = parse(r.out);
    const h = hbAll(d).find((x) => x.state === 'DEGRADED');
    return (r.code === 0 && p.state === 'DEGRADED' && h && h.exit === 1) || `exit=${r.code} state=${p.state} hb=${JSON.stringify(h)}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 8. Same session id fired twice (plugin + settings hook) -> exactly one payload.
t('double-fire on one session id -> exactly one payload', () => {
  const d = clone(); try {
    const env = {}; const input = JSON.stringify({ session_id: 'dup-1', hook_event_name: 'SessionStart', source: 'startup' });
    const run = () => spawnSync('sh', ['activation/shim.sh', 'claude'], { cwd: d, encoding: 'utf8', input }).stdout;
    const a = run(); const b = run();
    return (a.trim().length > 0 && b.trim() === '') || `first=${a.trim().length} chars, second=${b.trim().length} chars`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 9. Umbrella: a session opened on a folder of repos, which is not a git repo.
// A per-repo activation exits silently there, so a correct install fires zero
// times — measured on a real three-repo umbrella. One payload must name every
// member with its own state.
t('umbrella with two members -> exactly one payload naming both', () => {
  const u = mkdtempSync(join(tmpdir(), 'po-umb-'));
  try {
    for (const name of ['alpha', 'beta']) {
      const d = join(u, name);
      cpSync(ROOT, d, { recursive: true, filter: (s) => !/[\\/]\.git[\\/]|[\\/]\.git$|node_modules/.test(s) });
      execSync(`${GIT} init -q && ${GIT} add -A && ${GIT} commit -q -m scratch`, { cwd: d, stdio: 'pipe' });
      rmSync(join(d, '.project-os/heartbeat'), { recursive: true, force: true });
      rmSync(join(d, '.project-os/heartbeat.json'), { force: true });
      for (const f of ['activate.mjs', 'heartbeat.mjs']) cpSync(join(ROOT, 'activation', f), join(d, '.project-os', f));
    }
    const r = spawnSync(process.execPath, [join(ROOT, 'activation/activate.mjs'), 'claude'], {
      cwd: u, encoding: 'utf8', input: JSON.stringify({ session_id: 'umb-1', source: 'startup' }),
    });
    if (r.status !== 0) return `exit ${r.status}`;
    const outLines = r.stdout.trim().split('\n');
    if (outLines.length !== 1) return `expected 1 payload line, got ${outLines.length}`;
    const ctx = JSON.parse(r.stdout.trim()).hookSpecificOutput.additionalContext;
    const head = ctx.split('\n')[0];
    if (!/umbrella=2/.test(head)) return `sentinel lacks umbrella=2: ${head}`;
    if (!/alpha/.test(ctx) || !/beta/.test(ctx)) return 'payload does not name both members';
    if (ctx.length > 10000) return `payload ${ctx.length} chars over the cap`;
    for (const n of ['alpha', 'beta']) {
      if (!existsSync(join(u, n, '.project-os/heartbeat'))) return `${n} has no heartbeat: its own activation did not run`;
    }
    return true;
  } finally { rmSync(u, { recursive: true, force: true }); }
});

// 10. A folder of non-projects stays silent: the umbrella path must not make
// activation chatty in a stranger's directory.
t('umbrella scan finds nothing -> silent, exit 0', () => {
  const u = mkdtempSync(join(tmpdir(), 'po-umb-none-'));
  try {
    mkdirSync(join(u, 'just-a-folder'), { recursive: true });
    const r = spawnSync(process.execPath, [join(ROOT, 'activation/activate.mjs'), 'claude'], { cwd: u, encoding: 'utf8', input: '{}' });
    return (r.status === 0 && r.stdout.trim() === '') || `exit=${r.status} stdout=${JSON.stringify(r.stdout.slice(0, 80))}`;
  } finally { rmSync(u, { recursive: true, force: true }); }
});

// 11. A declared member that was never installed is a finding, not a footnote.
t('umbrella.json naming an uninstalled member -> NOT_ACTIVATED, named', () => {
  const u = mkdtempSync(join(tmpdir(), 'po-umb-decl-'));
  try {
    const d = join(u, 'alpha');
    cpSync(ROOT, d, { recursive: true, filter: (s) => !/[\\/]\.git[\\/]|[\\/]\.git$|node_modules/.test(s) });
    execSync(`${GIT} init -q && ${GIT} add -A && ${GIT} commit -q -m scratch`, { cwd: d, stdio: 'pipe' });
    for (const f of ['activate.mjs', 'heartbeat.mjs']) cpSync(join(ROOT, 'activation', f), join(d, '.project-os', f));
    mkdirSync(join(u, '.project-os'), { recursive: true });
    writeFileSync(join(u, '.project-os/umbrella.json'), JSON.stringify({ members: [{ name: 'alpha', path: 'alpha' }, { name: 'ghost', path: 'ghost' }] }));
    const r = spawnSync(process.execPath, [join(ROOT, 'activation/activate.mjs'), 'codex'], {
      cwd: u, encoding: 'utf8', input: JSON.stringify({ session_id: 'umb-2', source: 'startup' }),
    });
    const ctx = JSON.parse(r.stdout.trim()).hookSpecificOutput.additionalContext;
    const head = ctx.split('\n')[0];
    if (!/state=NOT_ACTIVATED/.test(head)) return `a declared, uninstalled member did not raise the umbrella state: ${head}`;
    if (!/ghost/.test(ctx)) return 'the missing member is not named in the payload';
    return true;
  } finally { rmSync(u, { recursive: true, force: true }); }
});

// 12. NINE CONCURRENT ACTIVATIONS. This is the reported production failure:
// through 0.7.3 every session wrote the same heartbeat.json twice, nine sessions
// opened inside three minutes raced it, the last writer's "started" survived
// while its "done" was lost, and the pre-push watchdog read "started and never
// finished" and blocked a real merge push.
t('nine concurrent activations leave no stranded record, and the watchdog stays green', () => {
  const d = clone();
  try {
    // Nine at once, in one shell, each with its own session id and its own
    // stdin closed the way a vendor closes it.
    const burst = Array.from({ length: 9 }, (_, i) =>
      `printf '%s' '{"session_id":"conc-${i}","source":"startup"}' | node activation/activate.mjs claude >/dev/null 2>&1 &`
    ).join(' ') + ' wait';
    const r = spawnSync('sh', ['-c', burst], { cwd: d, encoding: 'utf8' });
    if (r.status !== 0) return `the burst itself failed: ${String(r.stderr).slice(0, 160)}`;
    const hbDir = join(d, '.project-os/heartbeat');
    if (!existsSync(hbDir)) return 'no per-session heartbeat directory was written';
    const files = readdirSync(hbDir);
    if (files.length < 9) return `expected 9 per-session records, found ${files.length}: a shared file is still being raced`;
    const stranded = files
      .map((f) => JSON.parse(readFileSync(join(hbDir, f), 'utf8')))
      .filter((r) => r.phase !== 'done');
    if (stranded.length) return `${stranded.length} record(s) left as "started" after every activation exited`;
    const w = spawnSync(process.execPath, [join(d, 'activation/watchdog.mjs'), '--source', 'test'], { cwd: d, encoding: 'utf8', input: '' });
    if (w.status !== 0) return `watchdog went red after a clean concurrent burst: ${w.stdout.trim().slice(0, 200)}`;
    return true;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 13. A session still inside its activation must not look like a crash: with
// concurrent sessions, records in flight are the normal state.
t('a fresh "started" record is running, not stranded', () => {
  const d = clone();
  try {
    mkdirSync(join(d, '.project-os/heartbeat'), { recursive: true });
    writeFileSync(join(d, '.project-os/heartbeat/live.json'), JSON.stringify({ phase: 'started', at: new Date().toISOString(), vendor: 'claude' }));
    writeFileSync(join(d, '.project-os/heartbeat/old.json'), JSON.stringify({ phase: 'done', at: new Date().toISOString(), vendor: 'claude', state: 'HEALTHY' }));
    const w = spawnSync(process.execPath, [join(d, 'activation/watchdog.mjs'), '--source', 'test'], { cwd: d, encoding: 'utf8', input: '' });
    return w.status === 0 || `a running session was reported as a failure: ${w.stdout.trim().slice(0, 200)}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 14. An OLD started record with no matching done is a real crash and must stay red.
t('an old "started" with no "done" is still a finding', () => {
  const d = clone();
  try {
    mkdirSync(join(d, '.project-os/heartbeat'), { recursive: true });
    writeFileSync(join(d, '.project-os/heartbeat/crashed.json'), JSON.stringify({ phase: 'started', at: '2020-01-01T00:00:00.000Z', vendor: 'claude' }));
    writeFileSync(join(d, '.project-os/heartbeat/ok.json'), JSON.stringify({ phase: 'done', at: new Date().toISOString(), vendor: 'claude', state: 'HEALTHY' }));
    const w = spawnSync(process.execPath, [join(d, 'activation/watchdog.mjs'), '--source', 'test'], { cwd: d, encoding: 'utf8', input: '' });
    return (w.status === 1 && /started and never finished/.test(w.stdout)) || `a crashed session was not reported: exit ${w.status} ${w.stdout.trim().slice(0, 160)}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 15. A pre-0.7.4 adopter who has not re-vendored still has a working trail.
t('a legacy single heartbeat.json is still read', () => {
  const d = clone();
  try {
    clearHb(d);
    writeFileSync(join(d, '.project-os/heartbeat.json'), JSON.stringify({ phase: 'done', at: new Date().toISOString(), vendor: 'claude', state: 'HEALTHY' }));
    const w = spawnSync(process.execPath, [join(d, 'activation/watchdog.mjs'), '--source', 'test'], { cwd: d, encoding: 'utf8', input: '' });
    return w.status === 0 || `a legacy heartbeat was not honoured: ${w.stdout.trim().slice(0, 200)}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------
// 0.7.5: the four installer failures found re-vendoring eight real repos.
// Each case reproduces the failure first; it is only worth having if it can fail.
// ---------------------------------------------------------------------------

const INIT = join(ROOT, 'scripts/init.mjs');
const initIn = (cwd, args = []) => spawnSync(process.execPath, [INIT, ...args], { cwd, encoding: 'utf8', input: '' });
const scratchRepo = () => {
  const d = mkdtempSync(join(tmpdir(), 'po-init-'));
  execSync(`${GIT} init -q`, { cwd: d, stdio: 'pipe' });
  writeFileSync(join(d, 'README.md'), '# x\n');
  execSync(`${GIT} add -A && ${GIT} commit -q -m base`, { cwd: d, stdio: 'pipe' });
  return d;
};

// 16. A linked worktree has `.git` as a FILE. init applied every step and then
// crashed with ENOTDIR creating .git/hooks, exiting 1 after the install was done.
t('init on a git worktree installs everything, including the pre-push hook', () => {
  const main = scratchRepo();
  const wt = main + '-wt';
  try {
    execSync(`${GIT} worktree add -q "${wt}" -b feature`, { cwd: main, stdio: 'pipe' });
    if (!existsSync(join(wt, '.git')) || readdirSync(wt).includes('.git') === false) return 'scratch did not create a worktree';
    const r = initIn(wt);
    if (/ENOTDIR|Error:/.test(r.stdout + r.stderr)) return `init crashed on a worktree: ${(r.stdout + r.stderr).split('\n').find((l) => /ENOTDIR|Error/.test(l))}`;
    if (r.status !== 0) return `exit ${r.status}: ${(r.stdout + r.stderr).split('\n').filter(Boolean).slice(-3).join(' | ')}`;
    const hook = execSync('git rev-parse --git-path hooks', { cwd: wt, encoding: 'utf8' }).trim();
    return existsSync(resolve(wt, hook, 'pre-push')) || `pre-push was not installed where git keeps hooks (${hook})`;
  } finally { rmSync(main, { recursive: true, force: true }); rmSync(wt, { recursive: true, force: true }); }
});

// 17. A REFUSAL must not be mistaken for a complete install, and must not hide
// what WAS applied. Partial is its own exit code; complete is the only 0.
t('a refusal exits 3 (not 0, not 1) after applying and observing everything else', () => {
  const d = scratchRepo();
  try {
    const hooks = execSync('git rev-parse --git-path hooks', { cwd: d, encoding: 'utf8' }).trim();
    mkdirSync(join(d, hooks), { recursive: true });
    writeFileSync(join(d, hooks, 'pre-push'), '#!/bin/sh\necho foreign\n');
    const r = initIn(d);
    if (r.status !== 3) return `a partial install exited ${r.status}, expected 3 (0 would read as complete, 1 as failed)`;
    if (!/REFUSED/.test(r.stdout)) return 'the refusal was not printed';
    if (!/RESULT applied=\d+ refused=1 observed=yes/.test(r.stdout)) return `no machine-readable RESULT line: ${r.stdout.split('\n').slice(-3).join(' | ')}`;
    return existsSync(join(d, '.project-os/activate.mjs')) || 'the refused step stopped the others from being applied';
  } finally { rmSync(d, { recursive: true, force: true }); }
});

t('--allow-refusals lets a wrapper continue (exit 0) while the refusal stays visible', () => {
  const d = scratchRepo();
  try {
    const hooks = execSync('git rev-parse --git-path hooks', { cwd: d, encoding: 'utf8' }).trim();
    mkdirSync(join(d, hooks), { recursive: true });
    writeFileSync(join(d, hooks, 'pre-push'), '#!/bin/sh\necho foreign\n');
    const r = initIn(d, ['--allow-refusals']);
    return (r.status === 0 && /REFUSED/.test(r.stdout) && /refused=1/.test(r.stdout)) || `exit ${r.status}, REFUSED printed: ${/REFUSED/.test(r.stdout)}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

t('a clean install is the only exit 0 without the flag', () => {
  const d = scratchRepo();
  try {
    const r = initIn(d);
    return (r.status === 0 && /refused=0 observed=yes/.test(r.stdout)) || `exit ${r.status}: ${r.stdout.split('\n').slice(-3).join(' | ')}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 18. The runtime file set is DERIVED from imports. Plant a new import in a copy
// of the source and the installer must carry it with no edit to init.mjs. The
// hardcoded list broke the umbrella installer once; this is what stops a second time.
t('init copies a NEWLY added import without being edited (umbrella and repo paths)', () => {
  const src = mkdtempSync(join(tmpdir(), 'po-src-'));
  const umb = mkdtempSync(join(tmpdir(), 'po-umb2-'));
  const repo = scratchRepo();
  try {
    cpSync(ROOT, src, { recursive: true, filter: (s) => !/[\\/]\.git[\\/]|[\\/]\.git$|node_modules/.test(s) });
    writeFileSync(join(src, 'activation/newmodule.mjs'), 'export const NEW = 1;\n');
    const act = join(src, 'activation/activate.mjs');
    writeFileSync(act, readFileSync(act, 'utf8').replace("import { join } from 'node:path';", "import { join } from 'node:path';\nimport { NEW as _NEW } from './newmodule.mjs';"));
    // umbrella path: one member installed, session opens on the folder
    const member = join(umb, 'app');
    mkdirSync(join(member, '.project-os'), { recursive: true });
    execSync(`${GIT} init -q`, { cwd: member, stdio: 'pipe' });
    writeFileSync(join(member, '.project-os/config.json'), '{"tier":"solo","verify":"exit 0"}');
    spawnSync(process.execPath, [join(src, 'scripts/init.mjs')], { cwd: umb, encoding: 'utf8', input: '' });
    if (!existsSync(join(umb, '.project-os/newmodule.mjs'))) return 'the umbrella installer did not carry a newly imported module: the file list is hardcoded again';
    // repo path
    spawnSync(process.execPath, [join(src, 'scripts/init.mjs')], { cwd: repo, encoding: 'utf8', input: '' });
    return existsSync(join(repo, '.project-os/newmodule.mjs')) || 'the repo installer did not carry a newly imported module';
  } finally { for (const x of [src, umb, repo]) rmSync(x, { recursive: true, force: true }); }
});

// 19. An umbrella install that produces a DEGRADED payload is not an install.
// The old self-test accepted any payload containing "umbrella=".
t('umbrella self-test FAILS when a member activation is broken (it used to read OK)', () => {
  const u = mkdtempSync(join(tmpdir(), 'po-umb3-'));
  try {
    const member = join(u, 'app');
    mkdirSync(join(member, '.project-os'), { recursive: true });
    execSync(`${GIT} init -q`, { cwd: member, stdio: 'pipe' });
    writeFileSync(join(member, '.project-os/config.json'), '{"tier":"solo","verify":"exit 0"}');
    // a member whose own activation cannot start: it imports a module that is not there
    writeFileSync(join(member, '.project-os/activate.mjs'), "import './does-not-exist.mjs';\n");
    const r = initIn(u);
    if (r.status === 0) return 'an umbrella with a broken member exited 0';
    return /DEGRADED/.test(r.stdout) || `exit ${r.status} but the broken member was not shown as DEGRADED: ${r.stdout.split('\n').slice(-6).join(' | ')}`;
  } finally { rmSync(u, { recursive: true, force: true }); }
});

// 20. The per-session heartbeat directory must be gitignored by init. 0.7.4's
// changelog claimed init did this; it did not, and every session left untracked files.
t('init gitignores the per-session heartbeat directory', () => {
  const d = scratchRepo();
  try {
    initIn(d, ['--allow-refusals']);
    const ignored = spawnSync('git', ['check-ignore', '-q', '.project-os/heartbeat/some-session.json'], { cwd: d });
    return ignored.status === 0 || 'a heartbeat file written by a session would show up as untracked: .project-os/heartbeat/ is not ignored';
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 21. A pre-upgrade `started` with no `done` can never be finished by anything.
// Once a per-session record exists the legacy file is superseded, not red forever.
t('a stale legacy "started" is superseded once a per-session record exists', () => {
  const d = clone();
  try {
    clearHb(d);
    writeFileSync(join(d, '.project-os/heartbeat.json'), JSON.stringify({ phase: 'started', at: '2020-01-01T00:00:00.000Z', vendor: 'claude' }));
    writeHb(d, 'fresh', { phase: 'done', at: new Date().toISOString(), vendor: 'claude', state: 'HEALTHY' });
    const w = spawnSync(process.execPath, [join(d, 'activation/watchdog.mjs'), '--source', 'test'], { cwd: d, encoding: 'utf8', input: '' });
    return w.status === 0 || `a legacy record that nothing can ever finish kept the watchdog red: ${w.stdout.trim().slice(0, 220)}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

t('a stale legacy "started" with NO per-session record stays red, and says how to clear it', () => {
  const d = clone();
  try {
    clearHb(d);
    writeFileSync(join(d, '.project-os/heartbeat.json'), JSON.stringify({ phase: 'started', at: '2020-01-01T00:00:00.000Z', vendor: 'claude' }));
    const w = spawnSync(process.execPath, [join(d, 'activation/watchdog.mjs'), '--source', 'test'], { cwd: d, encoding: 'utf8', input: '' });
    if (w.status !== 1) return `a genuinely stranded legacy record was ignored (exit ${w.status})`;
    return /run activation once/.test(w.stdout) || `red, but with no instruction for clearing it: ${w.stdout.trim().slice(0, 220)}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 7. Red freshness
// 7. Red freshness
// 7. Red freshness -> DOCS_STALE, and the owed list is in the payload.
t('red freshness -> DOCS_STALE with the owed items in the payload', () => {
  const d = clone(); try {
    const mp = join(d, 'project-os-manifest.json'); const m = JSON.parse(readFileSync(mp, 'utf8'));
    m.artifacts = m.artifacts.filter((a) => a.path !== 'docs/flows.md'); writeFileSync(mp, JSON.stringify(m, null, 2));
    const p = parse(shim(d, 'claude').out);
    return (p.state === 'DOCS_STALE' && /docs\/flows\.md/.test(p.ctx)) || `state=${p.state}, owed mentions flows.md: ${/flows\.md/.test(p.ctx)}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

console.log('\nActivation self-verification — does the shim behave as each vendor expects?\n');
for (const r of results) console.log(`[${r.ok ? '  ok  ' : ' FAIL '}] ${r.name}${r.detail ? `\n           ${r.detail}` : ''}`);
const fails = results.filter((r) => !r.ok).length;
console.log(`\nVERDICT: ${fails ? `${fails} FAIL` : 'activation behaves as every vendor expects'}`);
console.log('\nWhat this cannot verify:\n  - That any vendor actually REGISTERED the hook. No vendor exposes an API for that; only its config file and the heartbeat trail are observable.\n  - That the model read the payload. Injection is observed at stdout, never at the model.\n  - Codex trust: it hashes the hooks.json ENTRY (command, timeout, matcher, path), not the shim bytes, so changing activate.mjs does not invalidate it; changing the entry does, and this suite cannot see either.');
process.exit(fails ? 1 : 0);
