#!/usr/bin/env node
// Sabotage test for the doctor — the gate applied to our own gate.
//
// The doctor's design rule is that it must be able to fail on an install that
// merely LOOKS healthy. That claim is worthless unless it is exercised, so this
// breaks each doctor check deliberately, in a throwaway copy, and asserts the
// targeted check turns FAIL. If a sabotage does not produce a red, the doctor is
// decoration for that dimension and this script says so.
//
// Nothing here touches the real repo: every case runs in its own temp clone.
//
// Usage: node scripts/doctor-sabotage.mjs
// Exit:  0 = every sabotage was caught · 1 = at least one went undetected

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const GIT = 'git -c user.email=sabotage@local -c user.name=sabotage';

const run = (cmd, cwd) => {
  try { return { ok: true, out: execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' }) }; }
  catch (e) { return { ok: false, out: String(e.stdout || '') + String(e.stderr || '') }; }
};

const clone = () => {
  const dir = mkdtempSync(join(tmpdir(), 'po-sabotage-'));
  cpSync(ROOT, dir, { recursive: true, filter: (s) => !/[\\/]\.git[\\/]|[\\/]\.git$|node_modules/.test(s) });
  run(`${GIT} init -q && ${GIT} add -A && ${GIT} commit -q -m scratch`, dir);
  return dir;
};

const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJSON = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2));

// Each case: break one thing, then require that check id to come back FAIL.
const CASES = [
  {
    id: 'injector',
    what: 'config claims autoInject:true while nothing registers the hook',
    break: (d) => { const c = readJSON(join(d, '.project-os/config.json')); c.autoInject = true; writeJSON(join(d, '.project-os/config.json'), c); },
  },
  {
    id: 'injector',
    what: 'config claims autoInject:true and the injector script is gone entirely',
    break: (d) => {
      const c = readJSON(join(d, '.project-os/config.json')); c.autoInject = true; writeJSON(join(d, '.project-os/config.json'), c);
      rmSync(join(d, '.claude/hooks/project-os-open.sh'), { force: true });
    },
  },
  {
    id: 'non-vacuous',
    what: 'the freshness check is blinded so it can no longer detect an unclassified artifact',
    break: (d) => {
      const p = join(d, 'scripts/freshness.mjs');
      const src = readFileSync(p, 'utf8').replace(
        /for \(const p of unclassified\) red\.push\([^\n]*\);/,
        'for (const p of unclassified) { /* sabotaged: silently ignored */ }'
      );
      writeFileSync(p, src);
    },
  },
  {
    id: 'classified',
    what: 'a DEBT item is past its expiry date',
    break: (d) => {
      const p = join(d, 'project-os-manifest.json'); const m = readJSON(p);
      const debt = m.artifacts.find((a) => a.class === 'DEBT'); debt.due = '2020-01-01';
      writeJSON(p, m);
    },
  },
  {
    id: 'classified',
    what: 'an artifact the spec declares is removed from the manifest',
    break: (d) => {
      const p = join(d, 'project-os-manifest.json'); const m = readJSON(p);
      m.artifacts = m.artifacts.filter((a) => a.path !== 'docs/flows.md');
      writeJSON(p, m);
    },
  },
  {
    id: 'generators',
    what: 'a generated artifact points at an emitter that does not exist (the dead-generator case)',
    break: (d) => {
      const p = join(d, 'project-os-manifest.json'); const m = readJSON(p);
      m.artifacts.find((a) => a.class === 'GENERATED').emitter = 'scripts/does-not-exist.mjs';
      writeJSON(p, m);
    },
  },
  {
    id: 'config',
    what: 'the configured verify command does not actually run',
    break: (d) => {
      const p = join(d, '.project-os/config.json'); const c = readJSON(p);
      c.verify = 'node scripts/this-command-does-not-exist.mjs'; writeJSON(p, c);
    },
  },
  {
    id: 'config',
    what: 'tier says team but no lanes are declared',
    break: (d) => {
      const p = join(d, '.project-os/config.json'); const c = readJSON(p);
      c.tier = 'team'; c.lanes = []; writeJSON(p, c);
    },
  },
];

console.log('\nDoctor sabotage — can the doctor actually fail?\n');
let undetected = 0;

// Control: an untouched clone must come back with no FAIL. Without this, a doctor
// that fails on everything would "pass" every sabotage and look rigorous.
{
  const d = clone();
  try {
    const r = run(`node "${join(d, 'scripts/doctor.mjs')}" --json`, d);
    const report = JSON.parse(r.out);
    const failing = report.checks.filter((c) => c.state === 'FAIL');
    if (failing.length) {
      console.log(`[ BAD ] control: an untouched clone already FAILS (${failing.map((c) => c.id).join(', ')}) — sabotage results below are meaningless`);
      undetected++;
    } else {
      console.log('[  ok  ] control: an untouched clone produces no FAIL');
    }
  } finally { rmSync(d, { recursive: true, force: true }); }
}

for (const c of CASES) {
  const d = clone();
  try {
    c.break(d);
    const r = run(`node "${join(d, 'scripts/doctor.mjs')}" --json`, d);
    let caught = false;
    try {
      const report = JSON.parse(r.out);
      caught = report.checks.some((x) => x.id === c.id && x.state === 'FAIL');
    } catch { caught = false; }
    console.log(`[${caught ? '  ok  ' : ' MISS '}] ${c.id}: ${c.what}`);
    if (!caught) { undetected++; console.log(`         NOT CAUGHT — the doctor is decoration for this case.`); }
  } finally { rmSync(d, { recursive: true, force: true }); }
}

console.log('');
console.log(undetected
  ? `VERDICT: ${undetected} sabotage(s) went undetected — fix the doctor before trusting a green from it.`
  : `VERDICT: every sabotage produced a red. The doctor's green means something.`);
console.log('\nWhat this sabotage suite cannot prove:');
console.log('  - That the six checks are the RIGHT six. It proves each one fires, never that nothing important is unchecked.');
console.log('  - That a real broken install looks like these synthetic ones.');
process.exit(undetected ? 1 : 0);
