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
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const GIT = 'git -c user.email=t@local -c user.name=t';
const SENTINEL = /^PROJECT-OS v[\d.]+ ACTIVE \d{4}-\d\d-\d\dT[\d:.]+Z \[(\w+)\] state=([A-Z_]+)(?: \S+=\S+)*$/;
const BUDGET_MS = 8000; // measured base ~2.5-3 s here; vendors kill at 15 s (15000 ms on Gemini)
let sessionSeq = 0; // every run gets its own session id unless a case asks otherwise

const clone = () => {
  const d = mkdtempSync(join(tmpdir(), 'po-act-'));
  cpSync(ROOT, d, { recursive: true, filter: (s) => !/[\\/]\.git[\\/]|[\\/]\.git$|node_modules/.test(s) });
  execSync(`${GIT} init -q && ${GIT} add -A && ${GIT} commit -q -m scratch`, { cwd: d, stdio: 'pipe' });
  const hb = join(d, '.project-os/heartbeat.json'); if (existsSync(hb)) unlinkSync(hb);
  return d;
};
const shim = (d, vendor, env = {}, session = `s-${++sessionSeq}`) => {
  const t0 = Date.now();
  const r = spawnSync('sh', ['activation/shim.sh', vendor], { cwd: d, encoding: 'utf8', input: JSON.stringify({ session_id: session, hook_event_name: 'SessionStart', source: 'startup' }), env: { ...process.env, ...env } });
  return { code: r.status, out: r.stdout, err: r.stderr, ms: Date.now() - t0 };
};
const hb = (d) => { try { return JSON.parse(readFileSync(join(d, '.project-os/heartbeat.json'), 'utf8')); } catch { return null; } };
const parse = (out) => { const j = JSON.parse(out.trim()); const ctx = j.hookSpecificOutput.additionalContext; const m = ctx.split('\n')[0].match(SENTINEL); return { j, ctx, vendor: m && m[1], state: m && m[2], sentinelOk: !!m }; };

const results = [];
const t = (name, fn) => { try { const r = fn(); results.push({ name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { results.push({ name, ok: false, detail: `threw: ${e.message}` }); } };

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
    writeFileSync(join(d, '.project-os/heartbeat.json'), JSON.stringify({ phase: 'done', at: '2020-01-01T00:00:00.000Z', vendor: 'claude', state: 'HEALTHY' }));
    const p = parse(shim(d, 'codex').out);
    return p.state === 'BROKEN_ACTIVATION' || `got ${p.state}`;
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 4. Quiet repo is NOT an alarm: old HEAD and old heartbeat together are healthy.
t('quiet repo: old HEAD + old heartbeat is not an alarm (no wall-clock threshold)', () => {
  const d = clone(); try {
    // Committer date is what %cI reads. Pass it via env, not a shell prefix: that syntax does not exist on Windows.
    execSync(`${GIT} commit -q --amend --no-edit --date="2020-06-01T00:00:00Z"`, { cwd: d, stdio: 'pipe', env: { ...process.env, GIT_COMMITTER_DATE: '2020-06-01T00:00:00Z' } });
    writeFileSync(join(d, '.project-os/heartbeat.json'), JSON.stringify({ phase: 'done', at: '2020-06-02T00:00:00.000Z', vendor: 'claude', state: 'HEALTHY' }));
    const p = parse(shim(d, 'gemini').out);
    return p.state !== 'BROKEN_ACTIVATION' || 'a month-old untouched repo raised BROKEN_ACTIVATION — that is the false alarm the commit-relative rule exists to prevent';
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 5. Stranded "started" record from a previous crash is reported.
t('previous run crashed mid-way: next run says so', () => {
  const d = clone(); try {
    writeFileSync(join(d, '.project-os/heartbeat.json'), JSON.stringify({ phase: 'started', at: new Date().toISOString(), vendor: 'claude' }));
    const p = parse(shim(d, 'claude').out);
    return /never finished|crashed/i.test(p.ctx) || 'stranded started-record was not reported';
  } finally { rmSync(d, { recursive: true, force: true }); }
});

// 6. Our own crash is still exactly one payload, state DEGRADED, exit 0.
t('own crash -> one DEGRADED payload, exit 0 (silence is never legal)', () => {
  const d = clone(); try {
    const c = JSON.parse(readFileSync(join(d, '.project-os/config.json'), 'utf8')); c.docsPath = 12345; // .replace on a number throws inside the try
    writeFileSync(join(d, '.project-os/config.json'), JSON.stringify(c));
    const r = shim(d, 'claude'); const p = parse(r.out); const h = hb(d);
    return (r.code === 0 && p.state === 'DEGRADED' && h && h.state === 'DEGRADED' && h.exit === 1) || `exit=${r.code} state=${p.state} hb=${JSON.stringify(h)}`;
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
console.log('\nWhat this cannot verify:\n  - That any vendor actually REGISTERED the hook. No vendor exposes an API for that; only its config file and the heartbeat trail are observable.\n  - That the model read the payload. Injection is observed at stdout, never at the model.\n  - Codex trust: a changed shim hash disables the hook until a human re-trusts it in /hooks, and nothing here can see that.');
process.exit(fails ? 1 : 0);
