#!/usr/bin/env node
// Project-OS doctor — verifies that the INSTALLATION actually works.
//
// Why this exists, and it is not hypothetical: twice in two days we learned that
// an installed thing is not a working thing. A product measured 4 of 10 sessions
// opening blind while its skill sat installed and healthy. This repo wrote an
// injector, committed it, and never registered it — present, and never once
// called. Presence is not registration; registration is not firing; and green is
// not evidence unless the check could have gone red.
//
// Design rule: this must be able to FAIL on an install that merely looks healthy.
// If it cannot, it is decoration. scripts/doctor-sabotage.mjs breaks each check
// deliberately and confirms each one goes red.
//
// Usage: node scripts/doctor.mjs [--json]
// Exit:  0 = no failures · 1 = at least one FAIL

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const JSON_OUT = process.argv.includes('--json');
const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const sh = (cmd, opts = {}) => execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
const quiet = (cmd, opts) => {
  try { return { ok: true, out: sh(cmd, opts) }; }
  catch (e) { return { ok: false, out: String(e.stdout || '') + String(e.stderr || '') }; }
};

const results = [];
const check = (id, title, fn) => {
  let r;
  try { r = fn(); } catch (e) { r = { state: 'FAIL', detail: `check threw: ${e.message}` }; }
  results.push({ id, title, ...r });
};

const cfgPath = join(ROOT, '.project-os/config.json');
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : null;
const manifestPath = join(ROOT, 'project-os-manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;

// -------------------------------------------------------------- 1. activation
// Presence is not registration, registration is not firing, and firing is not
// being read. No vendor exposes "is my hook registered?", so this check does the
// two things that ARE observable: run the shim exactly as each vendor would and
// parse its output against the shared contract, then read the heartbeat trail.
check('activation', 'Does activation behave as every vendor expects, and has it been firing?', () => {
  const suite = quiet('node scripts/activation-test.mjs');
  if (!suite.ok) {
    const fails = suite.out.split('\n').filter((l) => l.includes('[ FAIL ]')).map((l) => l.replace(/.*\]\s*/, ''));
    return { state: 'FAIL', detail: `vendor simulation failed: ${fails.join(' · ') || suite.out.slice(-200)}` };
  }
  const hb = existsSync(join(ROOT, '.project-os/heartbeat.json')) ? JSON.parse(readFileSync(join(ROOT, '.project-os/heartbeat.json'), 'utf8')) : null;
  if (!hb) return { state: 'WARN', detail: 'shim behaves correctly for claude/codex/gemini (simulated), but no heartbeat exists on this machine — activation has never fired here for real. Expected on a spec repo nobody works in; a defect on a product repo.' };
  if (hb.phase === 'started') return { state: 'FAIL', detail: `last activation (${hb.at}) started and never finished — it crashed mid-run` };
  if (hb.state === 'BROKEN_ACTIVATION') return { state: 'FAIL', detail: `last activation reported BROKEN_ACTIVATION at ${hb.at}: a commit landed with no session heartbeat — a hook is unregistered, untrusted or dead on some machine` };
  const wired = ['.claude/settings.json', '.codex/hooks.json', '.gemini/settings.json'].filter((f) => existsSync(join(ROOT, f)) && /SessionStart/.test(readFileSync(join(ROOT, f), 'utf8')));
  return { state: 'PASS', detail: `simulated claude/codex/gemini all pass; last real heartbeat ${hb.at} [${hb.vendor}] state=${hb.state}${wired.length ? `; repo-level wiring present for: ${wired.join(', ')}` : '; no repo-level vendor config here (activation ships via the plugin)'}` };
});

// ------------------------------------------------------- 2. freshness sabotage
// An unproven green is not evidence. Prove the check can fail, in a scratch copy.
check('non-vacuous', 'Is the freshness check non-vacuous?', () => {
  if (!manifest) return { state: 'FAIL', detail: 'no project-os-manifest.json to sabotage' };
  const scratch = mkdtempSync(join(tmpdir(), 'po-doctor-'));
  try {
    // Copy the tree without history, then make it a real repo: freshness.mjs
    // reads git dates, and a scratch with no .git would fail for the wrong
    // reason — which would look like a passing sabotage and prove nothing.
    cpSync(ROOT, scratch, {
      recursive: true,
      filter: (s) => !/[\\/]\.git[\\/]|[\\/]\.git$|node_modules/.test(s),
    });
    const git = 'git -c user.email=doctor@local -c user.name=doctor';
    quiet(`${git} init -q && ${git} add -A && ${git} commit -q -m sabotage-scratch`, { cwd: scratch });
    const mPath = join(scratch, 'project-os-manifest.json');
    const m = JSON.parse(readFileSync(mPath, 'utf8'));
    const victim = m.artifacts.find((a) => a.class === 'DESCRIPTIVE' || a.class === 'DEBT');
    if (!victim) return { state: 'FAIL', detail: 'manifest has no removable entry to sabotage with' };
    m.artifacts = m.artifacts.filter((a) => a.path !== victim.path);
    writeFileSync(mPath, JSON.stringify(m, null, 2));
    const r = quiet(`node "${join(scratch, 'scripts/freshness.mjs')}" --check`, { cwd: scratch });
    const wentRed = !r.ok && /UNCLASSIFIED/i.test(r.out);
    return wentRed
      ? { state: 'PASS', detail: `removing "${victim.path}" from a scratch manifest produced a red — the check can fail, so its green means something` }
      : { state: 'FAIL', detail: `removing "${victim.path}" did NOT produce an UNCLASSIFIED red. A check that cannot fail is decoration. Output: ${r.out.slice(0, 180)}` };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

// ------------------------------------------------ 3. every artifact classified
check('classified', 'Is every artifact classified, and no debt past due?', () => {
  const r = quiet('node scripts/freshness.mjs --check');
  if (r.ok) return { state: 'PASS', detail: 'freshness green: every declared artifact classified, nothing lapsed, no expired debt' };
  const reds = r.out.split('\n').filter((l) => l.trim().startsWith('- ')).map((l) => l.trim().slice(2));
  return { state: 'FAIL', detail: `freshness red (${reds.length}): ${reds.slice(0, 4).join(' · ')}${reds.length > 4 ? ' …' : ''}` };
});

// ------------------------------------------------------------ 4. generator alive
// "A generated artifact is only as alive as its generator" — from a real
// dead-scheduler incident: the file looked fine, nothing had regenerated it.
check('generators', 'Is every generator actually alive?', () => {
  if (!manifest) return { state: 'FAIL', detail: 'no manifest' };
  const gens = manifest.artifacts.filter((a) => a.class === 'GENERATED');
  if (!gens.length) return { state: 'SKIP', detail: 'no GENERATED artifacts declared' };
  const problems = [];
  for (const g of gens) {
    if (!existsSync(join(ROOT, g.emitter))) { problems.push(`${g.path}: emitter ${g.emitter} missing`); continue; }
    if (!existsSync(join(ROOT, g.path))) { problems.push(`${g.path}: declared GENERATED but never emitted`); continue; }
    const lastGen = quiet(`git log -1 --format=%h -- "${g.path}"`).out;
    if (!lastGen) continue;
    const behind = Number(quiet(`git rev-list --count ${lastGen}..HEAD`).out || 0);
    if (behind > 20) problems.push(`${g.path}: last emitted at ${lastGen}, ${behind} commits behind HEAD — the generator may be dead`);
  }
  return problems.length
    ? { state: 'FAIL', detail: problems.join(' · ') }
    : { state: 'PASS', detail: `${gens.length} generated artifact(s); each emitter present and its output current` };
});

// --------------------------------------------------- 5. config matches reality
check('config', 'Does the config match reality?', () => {
  if (!cfg) return { state: 'FAIL', detail: 'no .project-os/config.json — nothing is parameterized' };
  const problems = [];
  if (!cfg.verify) problems.push('no verify command configured');
  else if (!quiet(cfg.verify).ok) problems.push(`verify command "${cfg.verify}" exited non-zero`);
  if (cfg.repo) {
    // Only compare when the lookup SUCCEEDED. Reading a failed command's output
    // as data turns "there is no remote" into "the remote is wrong" — which is
    // how this check first produced a false red on a clean clone.
    const r = quiet('git remote get-url origin');
    const name = cfg.repo.split('/')[1];
    if (r.ok && r.out && name && !r.out.toLowerCase().includes(name.toLowerCase())) {
      problems.push(`config repo "${cfg.repo}" does not match origin "${r.out}"`);
    }
  }
  if (cfg.tracker === 'github' && !quiet('gh auth status').ok) {
    problems.push('tracker is github but gh is not authenticated — the handoff queue would fail at the moment it is needed');
  }
  if (cfg.tier && cfg.tier !== 'solo' && (!cfg.lanes || !cfg.lanes.length)) {
    problems.push(`tier is ${cfg.tier} but no lanes are declared`);
  }
  if (cfg.tier === 'solo' && existsSync(join(ROOT, cfg.docsPath || 'docs/', 'ORCHESTRATOR.md'))) {
    problems.push('tier is solo but a team board exists — one of the two is wrong');
  }
  return problems.length
    ? { state: 'FAIL', detail: problems.join(' · ') }
    : { state: 'PASS', detail: `tier=${cfg.tier} · verify runs green · repo and tracker resolve` };
});

// ------------------------------------------------------------------ 6. honesty
const CANNOT_SEE = [
  'Whether any documented sentence is TRUE. Every check here verifies structure, presence and freshness — never correctness.',
  'Whether an injection actually reached a model. The shim is run and its output measured; that an agent then read it is unobservable from here.',
  'Whether any vendor REGISTERED the hook. No vendor exposes an API for it; only the config file, the shim and the heartbeat trail are observable. Codex in particular binds hook trust to the shim\'s hash — a Project-OS upgrade silently disables it until a human re-trusts it in /hooks, and nothing here can see that.',
  'Whether a CHANGELOG migration works. Nothing executes an upgrade against a real older repo, so every migration step stays a claim until an adopter runs it.',
  'Anything about build caches. This runs as a plain script with no cache; a port into a caching build system must re-verify the inputs-as-a-set trap itself.',
  'Whether the spec is any good. Adoption experience arrives as a message, never as a file date.',
];

const fails = results.filter((r) => r.state === 'FAIL');
const warns = results.filter((r) => r.state === 'WARN');

if (JSON_OUT) {
  console.log(JSON.stringify({ ok: fails.length === 0, checks: results, cannotSee: CANNOT_SEE }, null, 2));
} else {
  const glyph = { PASS: '  ok  ', FAIL: ' FAIL ', WARN: ' warn ', SKIP: ' skip ' };
  console.log('\nProject-OS doctor — is this installation actually working?\n');
  for (const r of results) console.log(`[${glyph[r.state]}] ${r.title}\n           ${r.detail}\n`);
  console.log('What this doctor CANNOT see:');
  for (const c of CANNOT_SEE) console.log(`  - ${c}`);
  console.log('');
  console.log(fails.length ? `VERDICT: ${fails.length} FAIL, ${warns.length} warn` : `VERDICT: healthy${warns.length ? ` (${warns.length} warn)` : ''}`);
}
process.exit(fails.length ? 1 : 0);
