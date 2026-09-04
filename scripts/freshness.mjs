#!/usr/bin/env node
// Project-OS freshness check — the spec repo running its own protocol.
//
// Enumerates the artifact set FROM PROJECT_OS.md Part 2 (not from a hand-kept
// list), requires every artifact to be classified in project-os-manifest.json,
// and emits docs/project-os-status.md. Red when a CALENDAR artifact lapses, a
// DEBT item passes its expiry, a classified file is missing, or any declared
// artifact is unclassified — the check detects its own incompleteness.
//
// Usage: node scripts/freshness.mjs        (writes the status file, exits 1 on red)
//        node scripts/freshness.mjs --check (same, but does not write)

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const WRITE = !process.argv.includes('--check');
const OUT = join(ROOT, 'docs/project-os-status.md');

const sh = (cmd) => { try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; } };
const today = new Date(sh('git log -1 --format=%ad --date=short') || Date.now());
const days = (d) => Math.floor((today - new Date(d)) / 86400000);

const manifest = JSON.parse(readFileSync(join(ROOT, 'project-os-manifest.json'), 'utf8'));
const classified = new Map(manifest.artifacts.map((a) => [a.path, a]));
const exempt = new Set((manifest.exempt || []).map((e) => e.path));

// --- Enumerate what the spec itself declares (the self-incompleteness check) ---
const spec = readFileSync(join(ROOT, 'PROJECT_OS.md'), 'utf8');
const part2 = spec.slice(spec.indexOf('## Part 2'), spec.indexOf('## Part 3'));
// Part 2 lists artifacts in fenced blocks, mixing flat paths ("docs/outcomes.md")
// with folder-scoped nesting ("docs/features/" followed by indented instances).
// Indented entries are resolved against their parent folder; template names
// (YYYY-..., 01-..., 0001-...) are per-project instances, not named artifacts.
const declared = new Set();
const isTemplate = (p) => p.split('/').some((seg) => /^(YYYY|NN|\d)/.test(seg) || /[[\]{}]/.test(seg));
for (const block of part2.match(/```[\s\S]*?```/g) || []) {
  let folder = '';
  for (const raw of block.split('\n')) {
    const line = raw.replace(/```\w*/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indented = /^\s{2,}\S/.test(line);
    const name = line.trim().split(/\s+/)[0];
    if (name.endsWith('/')) { folder = indented && folder ? folder + name : name; continue; }
    if (!/\.(md|html)$/.test(name)) continue;
    const full = indented ? folder + name : name;
    if (!indented) folder = '';
    if (!isTemplate(full)) declared.add(full);
  }
}

const unclassified = [...declared].filter((p) => !classified.has(p) && !exempt.has(p));

// --- Evaluate each classified artifact ---
const rows = { CALENDAR: [], DEBT: [], DESCRIPTIVE: [], GENERATED: [] };
let red = [];

for (const a of manifest.artifacts) {
  const abs = join(ROOT, a.path);
  const present = existsSync(abs);
  const last = present ? sh(`git log -1 --format=%ad --date=short -- "${a.path}"`) : '';
  const behind = last ? days(last) : null;

  if (a.class === 'CALENDAR') {
    const state = !present ? 'MISSING' : behind > a.limitDays ? 'LAPSED' : 'ok';
    if (state !== 'ok') red.push(`${a.path} — ${state}`);
    rows.CALENDAR.push([a.path, last || '—', behind === null ? '—' : `${behind} d`, `${a.limitDays} d`, state]);
  } else if (a.class === 'DEBT') {
    const left = days(a.due) * -1;
    const state = left < 0 ? 'PAST DUE' : 'debt';
    if (state === 'PAST DUE') red.push(`${a.path} — PAST DUE (${a.ticket}, due ${a.due})`);
    rows.DEBT.push([a.path, a.ticket, a.due, `${left} d`, state, a.why]);
  } else if (a.class === 'GENERATED') {
    const emitterOk = existsSync(join(ROOT, a.emitter));
    if (!emitterOk) red.push(`${a.path} — emitter ${a.emitter} missing`);
    rows.GENERATED.push([a.path, a.emitter, emitterOk ? 'wired' : 'EMITTER MISSING']);
  } else {
    if (!present) red.push(`${a.path} — MISSING (classified DESCRIPTIVE)`);
    rows.DESCRIPTIVE.push([a.path, last || 'MISSING', a.why]);
  }
}

// The three spec files must move in lockstep (PROJECT_OS.md line 15 claims it).
const versions = ['PROJECT_OS.md', 'PROJECT_OS_BEHAVIOR.md', 'PROJECT_OS_VIEWS.md'].map((f) => {
  const m = readFileSync(join(ROOT, f), 'utf8').match(/^\*\*Status:\*\*.*?·\s*([0-9.]+)/m);
  return [f, m ? m[1] : '?'];
});
const lockstep = new Set(versions.map((v) => v[1])).size === 1;
if (!lockstep) red.push(`spec files out of lockstep: ${versions.map((v) => `${v[0]}=${v[1]}`).join(', ')}`);
for (const p of unclassified) red.push(`${p} — declared in PROJECT_OS.md Part 2 but UNCLASSIFIED in the manifest`);

// --- Emit ---
const t = (head, body) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${body.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`;
const md = `# Project-OS status

Generated by \`scripts/freshness.mjs\`. Do not edit by hand; rerun
\`node scripts/freshness.mjs\`.

**Read this first.** It is the one place that says what the protocol is owed
right now. Everything below is derived, so it cannot be out of date with the
repo it describes.

Reference point: newest commit, **${today.toISOString().slice(0, 10)}**. Spec version: **${versions[0][1]}** (lockstep: ${lockstep ? 'yes' : 'NO'}).

## Written on a cadence

Silence is the failure here.

${t(['Artifact', 'Newest entry', 'Behind', 'Limit', 'State'], rows.CALENDAR)}
## Known debt, time-boxed

Stale on purpose, with a ticket and a date. Past the date this goes red whatever
the contents, so it cannot become permanent by being ignored.

${t(['Artifact', 'Ticket', 'Due', 'Left', 'State', 'Why'], rows.DEBT)}
## Generated

The emitter owns freshness. A dead emitter is red even when its output looks fine.

${t(['Artifact', 'Emitter', 'State'], rows.GENERATED)}
## Trusted, because they change only when their subject does

Age is not evidence of rot for these. Moving an artifact here to quiet a failure
is the abuse this design guards against, so each carries its reason.

${t(['Artifact', 'Last touched', 'Why it is trusted'], rows.DESCRIPTIVE)}
## What this check cannot see

- **Whether any of it is true.** It verifies that files exist and were touched,
  never that a sentence in them is correct or worth reading.
- **Whether the spec is any good.** Adopters' experience is the real signal, and
  it arrives by message, not by file date.
- **Its own staleness against the spec's prose.** The artifact set is parsed from
  \`PROJECT_OS.md\` Part 2's file lists; a new artifact introduced only in prose,
  with no listing, is invisible here.
- **Nothing about caching.** This runs as a plain script with no build cache, so
  the cached-green trap does not apply — a build-system port must re-check it by
  declaring inputs as a set.

${red.length ? `## RED (${red.length})\n\n${red.map((r) => `- ${r}`).join('\n')}\n` : '## Green\n\nNothing owed.\n'}`;

if (WRITE) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, md);
  // Record the commit the docs were last verified against. The SessionStart
  // drift tripwire compares this to HEAD, so a session opens KNOWING whether the
  // documentation is behind the code instead of assuming it is not.
  const meta = join(ROOT, '.project-os/meta.json');
  mkdirSync(dirname(meta), { recursive: true });
  writeFileSync(meta, JSON.stringify({
    docsVerifiedAtCommit: sh('git rev-parse HEAD'),
    docsVerifiedAtDate: today.toISOString().slice(0, 10),
    red: red.length,
    specVersion: versions[0][1],
  }, null, 2) + '\n');
}
console.log(red.length ? `RED (${red.length}):\n${red.map((r) => '  - ' + r).join('\n')}` : 'Project-OS freshness: green');
process.exit(red.length ? 1 : 0);
