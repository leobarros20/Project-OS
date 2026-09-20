#!/usr/bin/env node
// project-os init — install the Project-OS activation into an adopting repo.
//
// Six files named this command before it existed; every adopter had to hand-copy
// nine things. This does them, idempotently, and ends with one OBSERVED
// injection — an install that has not been seen firing is not an install.
//
// What it writes (all inside the adopting repo):
//   .project-os/activate.mjs, shim.sh, watchdog.mjs   copied from the Project-OS checkout/plugin
//   .project-os/config.json                            from the schema defaults, never overwritten
//   .claude/settings.json | .codex/hooks.json | .gemini/settings.json
//                                                      SessionStart entry MERGED; foreign hooks kept
//   AGENTS.md (+ CLAUDE.md / GEMINI.md when present)   the static block between BEGIN/END markers
//   .gitignore                                         heartbeat + per-session markers
//   .git/hooks/pre-push                                the watchdog, only if no foreign hook is there
//
// Refuses what it cannot own: a core.hooksPath it did not set, a pre-push it did
// not write, a vendor settings file that is not valid JSON. Refusing is louder
// than producing a dead install.
//
// Usage: node <project-os>/scripts/init.mjs [--dry-run] [--vendors claude,codex,gemini] [--target <repo>]

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, appendFileSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const DRY = flag('--dry-run');
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');          // the Project-OS checkout or plugin root
const TARGET = resolve(opt('--target') || process.cwd());

const say = (s) => console.log(s);
const plan = [];
const did = (what) => { plan.push(what); say(`${DRY ? '[dry-run] would' : '  ✓'} ${what}`); };
const refuse = (why) => { say(`  ✗ REFUSED: ${why}`); refused.push(why); };
const refused = [];

// ---------------------------------------------------------------- pre-flight
let root;
try { root = execSync('git rev-parse --show-toplevel', { cwd: TARGET, encoding: 'utf8', stdio: 'pipe' }).trim(); }
catch { say('not a git repository: ' + TARGET); process.exit(2); }
say(`Project-OS init → ${root}${DRY ? '  (dry run, nothing written)' : ''}`);
const version = JSON.parse(readFileSync(join(SRC, 'version.json'), 'utf8')).version;
say(`  tooling ${version} from ${SRC}`);
if (!existsSync(join(root, 'PROJECT_OS.md'))) say('  note: no PROJECT_OS.md here — the spec ships with the plugin; activation will run, the freshness manifest is yours to write');
const hooksPath = (() => { try { return execSync('git config --get core.hooksPath', { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim(); } catch { return ''; } })();

const wr = (rel, content, mode) => { if (!DRY) { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), content); if (mode) chmodSync(join(root, rel), mode); } };
const readJSON = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };

// ------------------------------------------------------- 1. the runtime files
for (const f of ['activate.mjs', 'shim.sh', 'watchdog.mjs']) {
  const src = join(SRC, 'activation', f), dst = join(root, '.project-os', f);
  const same = existsSync(dst) && readFileSync(src, 'utf8') === readFileSync(dst, 'utf8');
  if (same) { say(`  = .project-os/${f} already current`); continue; }
  did(`write .project-os/${f}`); if (!DRY) { mkdirSync(dirname(dst), { recursive: true }); copyFileSync(src, dst); }
}

// --------------------------------------------------------------- 2. config
const cfgPath = join(root, '.project-os/config.json');
if (existsSync(cfgPath)) say('  = .project-os/config.json exists, not touched');
else {
  const vendorsHint = ['claude', 'codex', 'gemini'].filter((v) => existsSync(join(root, `.${v}`)));
  const cfg = {
    $schema: 'https://raw.githubusercontent.com/leobarros20/Project-OS/main/.project-os/config.schema.json',
    tier: 'solo', repo: (() => { try { const u = execSync('git remote get-url origin', { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim(); const m = u.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/); return m ? m[1] : ''; } catch { return ''; } })(),
    tracker: 'github', verify: 'echo "set the verify command in .project-os/config.json"', commitStyle: 'conventional',
    owner: '', lanes: [], docsPath: 'docs/', autoInject: true,
    _note: `written by project-os init ${version}; detected vendors: ${vendorsHint.join(', ') || 'none'}. Set verify to the command that must pass before a handoff.`,
  };
  did('write .project-os/config.json (defaults; edit verify, tier, owner)'); wr('.project-os/config.json', JSON.stringify(cfg, null, 2) + '\n');
}

// ------------------------------------------------- 3. vendor session hooks
const vendors = (opt('--vendors') || '').split(',').filter(Boolean);
const targets = {
  claude: { file: '.claude/settings.json', tpl: 'claude.settings.json' },
  codex:  { file: '.codex/hooks.json',     tpl: 'codex.hooks.json' },
  gemini: { file: '.gemini/settings.json', tpl: 'gemini.settings.json' },
};
const chosen = vendors.length ? vendors : Object.keys(targets).filter((v) => existsSync(join(root, `.${v}`)));
if (!chosen.length) say('  - no vendor config dirs found (.claude/.codex/.gemini); pass --vendors to force. The static block below still activates on every tool.');
for (const v of chosen) {
  const t = targets[v]; if (!t) { refuse(`unknown vendor "${v}"`); continue; }
  const tpl = readJSON(join(SRC, 'activation/templates', t.tpl));
  const ours = tpl.hooks.SessionStart[0];
  const p = join(root, t.file);
  let cur = existsSync(p) ? readJSON(p) : {};
  if (existsSync(p) && cur === null) { refuse(`${t.file} is not valid JSON — fix it by hand, I will not overwrite a file I cannot read`); continue; }
  cur.hooks = cur.hooks || {}; cur.hooks.SessionStart = cur.hooks.SessionStart || [];
  const already = cur.hooks.SessionStart.some((g) => (g.hooks || []).some((h) => /activate\.mjs/.test(h.command || '')));
  if (already) { say(`  = ${t.file} already has the activation hook`); continue; }
  if (v === 'codex' && tpl.description) cur.description = tpl.description;
  cur.hooks.SessionStart.push(ours);
  did(`merge SessionStart hook into ${t.file}${cur.hooks.SessionStart.length > 1 ? ' (foreign hooks kept)' : ''}`);
  wr(t.file, JSON.stringify(cur, null, 2) + '\n');
  if (v === 'codex') say('    note: Codex will show this entry as untrusted until a human trusts it in /hooks; hooks are stable on Codex >= 0.153.2, no [features] flag needed');
}

// --------------------------------------------------- 4. the static block
const block = readFileSync(join(SRC, 'activation/templates/PROJECT-OS.block.md'), 'utf8').trim() + '\n';
const BEGIN = /<!-- BEGIN PROJECT-OS[\s\S]*?<!-- END PROJECT-OS[^\n]*-->\n?/;
const instrFiles = ['AGENTS.md', ...['CLAUDE.md', 'GEMINI.md'].filter((f) => existsSync(join(root, f)))];
for (const f of instrFiles) {
  const p = join(root, f); const cur = existsSync(p) ? readFileSync(p, 'utf8') : '';
  if (cur.includes(block.trim())) { say(`  = ${f} block current`); continue; }
  const next = BEGIN.test(cur) ? cur.replace(BEGIN, block) : (cur ? cur.replace(/\s*$/, '\n\n') : '') + block;
  did(`${BEGIN.test(cur) ? 'update' : 'add'} PROJECT-OS block in ${f}`); wr(f, next);
}

// ------------------------------------------------------------- 5. gitignore
const gi = join(root, '.gitignore'); const giCur = existsSync(gi) ? readFileSync(gi, 'utf8') : '';
const giLines = ['.project-os/heartbeat.json', '.project-os/.activated-*', '.project-os/studio/review-pending'].filter((l) => !giCur.split('\n').includes(l));
if (giLines.length) { did(`add ${giLines.length} line(s) to .gitignore`); if (!DRY) appendFileSync(gi, (giCur && !giCur.endsWith('\n') ? '\n' : '') + '# Project-OS: machine-local state\n' + giLines.join('\n') + '\n'); }
else say('  = .gitignore current');

// ------------------------------------------------------------ 6. pre-push
const prePushSrc = readFileSync(join(SRC, 'activation/templates/pre-push'), 'utf8');
if (hooksPath) refuse(`core.hooksPath is set to "${hooksPath}" and I did not set it — add the pre-push watchdog there yourself (activation/templates/pre-push)`);
else {
  const hp = join(root, '.git/hooks/pre-push');
  const cur = existsSync(hp) ? readFileSync(hp, 'utf8') : '';
  if (cur && !/id:watchdog-pre-push/.test(cur)) refuse('.git/hooks/pre-push exists and is not mine — I will not overwrite a hook I did not write; chain the watchdog into it by hand');
  else if (cur === prePushSrc) say('  = .git/hooks/pre-push current');
  else { did('install .git/hooks/pre-push (watchdog)'); wr('.git/hooks/pre-push', prePushSrc, 0o755); }
}

// ------------------------------------------------ 7. self-test: observe it
if (DRY) { say(`\nPlan: ${plan.length} change(s)${refused.length ? `, ${refused.length} refused` : ''}. Run without --dry-run to apply.`); process.exit(refused.length ? 1 : 0); }

const fire = (cwd, label) => {
  const r = spawnSync(process.execPath, [join(root, '.project-os/activate.mjs'), 'init-selftest'], { cwd, encoding: 'utf8', input: JSON.stringify({ session_id: `init-${label}-${Date.now()}`, source: 'startup' }) });
  const line = (() => { try { return JSON.parse(r.stdout.trim()).hookSpecificOutput.additionalContext.split('\n')[0]; } catch { return null; } })();
  return { ok: r.status === 0 && !!line && /^PROJECT-OS v[\d.]+ ACTIVE /.test(line), line, code: r.status };
};
say('\nSelf-test — the install is not done until it has been seen firing:');
const sub = join(root, '.project-os');
const a = fire(root, 'root'), b = fire(sub, 'subdir');
say(`  from repo root:     ${a.ok ? 'OK  ' : 'FAIL'} ${a.line || `exit ${a.code}, no payload`}`);
say(`  from a subdirectory: ${b.ok ? 'OK  ' : 'FAIL'} ${b.line || `exit ${b.code}, no payload`}`);
const ok = a.ok && b.ok && !refused.length;
say(ok
  ? `\nInstalled and OBSERVED. Next: set "verify" in .project-os/config.json, run node .project-os/watchdog.mjs --source manual once, and schedule it weekly (activation/templates/schedule.md).`
  : `\nNOT a working install${refused.length ? ` — ${refused.length} item(s) refused above` : ' — activation did not fire from one of the two locations'}. Fix and re-run; re-running is safe.`);
process.exit(ok ? 0 : 1);
