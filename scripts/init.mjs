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
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, appendFileSync, chmodSync, readdirSync } from 'node:fs';
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

// ------------------------------------------------- the runtime is a DERIVED set
// The files init copies are whatever the entry points actually import, found by
// reading them, never a list typed here. A hardcoded list broke the umbrella
// installer when heartbeat.mjs was added, and the next import would have broken
// it again: a list that must be remembered is the failure this project keeps
// meeting. Add an import to activate.mjs and init copies the file with no edit.
const activationDir = join(SRC, 'activation');
const importsOf = (entry, seen) => {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  let text = '';
  try { text = readFileSync(join(activationDir, entry), 'utf8'); } catch { return seen; }
  for (const m of text.matchAll(/from\s+['"]\.\/([A-Za-z0-9_.-]+\.mjs)['"]/g)) importsOf(m[1], seen);
  return seen;
};
const runtimeFor = (entries) => { const s = new Set(); for (const e of entries) importsOf(e, s); return [...s]; };

// Exit codes. Complete and observed is the ONLY 0: a wrapper that checks only the
// exit status must never mistake a partial install for a finished one.
const EXIT = { OK: 0, FAILED: 1, PREFLIGHT: 2, REFUSALS: 3 };
const finish = ({ observed }) => {
  const fatal = !observed;
  say(`\nRESULT applied=${plan.length} refused=${refused.length} observed=${observed ? 'yes' : 'no'}`);
  if (fatal) process.exit(EXIT.FAILED);
  if (refused.length) {
    // Everything that could be applied WAS, and it was seen firing; what is left
    // is a human's to finish. --allow-refusals lets a wrapper keep going while it
    // handles the printed list itself, instead of aborting before the steps that
    // came after the refused one.
    process.exit(flag('--allow-refusals') ? EXIT.OK : EXIT.REFUSALS);
  }
  process.exit(EXIT.OK);
};

// ------------------------------------------------ 0. the source must be a RELEASE
// init copies from its own checkout, so a dirty checkout of the spec repo ships
// work in progress into every adopter that runs it. It happened twice; the
// second time the adopter noticed 135 uncommitted lines above the tag and
// vendored from the tag by hand. A git-backed source now refuses when the
// files it copies differ from HEAD, and says whether HEAD is the tag that
// version.json declares. A plugin copy (no .git) is a release by construction.
{
  const srcVersion = (() => { try { return JSON.parse(readFileSync(join(SRC, 'version.json'), 'utf8')).version || '?'; } catch { return '?'; } })(); // readJSON is declared further down
  const srcGit = (c) => { try { return execSync(c, { cwd: SRC, encoding: 'utf8', stdio: 'pipe' }).trim(); } catch { return null; } };
  if (srcGit('git rev-parse --is-inside-work-tree') === 'true') {
    const dirty = srcGit('git status --porcelain -- activation scripts hooks version.json .claude-plugin') || '';
    const head = srcGit('git rev-parse HEAD');
    const tagged = srcGit(`git rev-parse -q --verify v${srcVersion}^{commit}`);
    if (dirty && !flag('--allow-dirty')) {
      say(`  ✗ REFUSED before writing anything: the Project-OS checkout at ${SRC} has uncommitted changes in what init copies:`);
      for (const l of dirty.split('\n')) say('      ' + l);
      say(`  init copies from its checkout, so a dirty one would ship work in progress into this repo. Commit or stash it there, vendor from the tag (git show v${srcVersion}:<path>), or pass --allow-dirty if that is what you mean.`);
      process.exit(EXIT.PREFLIGHT);
    }
    const where = tagged && tagged === head ? `clean checkout at tag v${srcVersion}` : tagged ? `HEAD is NOT tag v${srcVersion} — copying unreleased code` : `no tag v${srcVersion} in this checkout`;
    say(`  source: Project-OS ${srcVersion} (${where}${dirty ? '; dirty, --allow-dirty given' : ''})`);
  } else {
    say(`  source: Project-OS ${srcVersion} (plugin copy, no git: a release by construction)`);
  }
}

// ---------------------------------------------------------------- pre-flight
let root;
try { root = execSync('git rev-parse --show-toplevel', { cwd: TARGET, encoding: 'utf8', stdio: 'pipe' }).trim(); }
catch {
  // Not a git repo. It may be an UMBRELLA: the folder several project repos sit
  // under, and the folder sessions actually open on. Installing there is what
  // stops a correct per-repo install from firing zero times.
  const members = (() => { try { return readdirSync(TARGET, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.') && existsSync(join(TARGET, e.name, '.project-os/config.json'))).map((e) => e.name); } catch { return []; } })();
  if (!members.length) { say(`not a git repository, and no member repos with .project-os/config.json under it: ${TARGET}`); process.exit(2); }
  say(`Project-OS init → UMBRELLA ${TARGET}${DRY ? '  (dry run, nothing written)' : ''}`);
  say(`  members: ${members.join(', ')}`);
  const wrU = (rel, content) => { if (!DRY) { mkdirSync(dirname(join(TARGET, rel)), { recursive: true }); writeFileSync(join(TARGET, rel), content); } };
  // The dispatcher needs everything it imports. That set is DERIVED from its
  // imports (see runtimeFor), so a future import cannot silently re-break this.
  const umbrellaFiles = runtimeFor(['activate.mjs']);
  if (!DRY) {
    mkdirSync(join(TARGET, '.project-os'), { recursive: true });
    for (const f of umbrellaFiles) copyFileSync(join(SRC, 'activation', f), join(TARGET, '.project-os', f));
  }
  say(`${DRY ? '[dry-run] would' : '  ✓'} write the umbrella dispatcher and what it imports: ${umbrellaFiles.map((f) => '.project-os/' + f).join(', ')}`);
  const declPath = join(TARGET, '.project-os/umbrella.json');
  if (existsSync(declPath)) say('  = .project-os/umbrella.json exists, not touched');
  else { say(`${DRY ? '[dry-run] would' : '  ✓'} write .project-os/umbrella.json declaring ${members.length} member(s)`); wrU('.project-os/umbrella.json', JSON.stringify({ _comment: 'Members of this umbrella. A declaration survives a rename and says which repos a human meant; without it activation falls back to a one-level scan.', members: members.map((m) => ({ name: m, path: m })) }, null, 2) + '\n'); }
  for (const [v, t] of Object.entries({ claude: '.claude/settings.json', codex: '.codex/hooks.json', gemini: '.gemini/settings.json' })) {
    if (!existsSync(join(TARGET, `.${v}`)) && !(opt('--vendors') || '').includes(v)) continue;
    const tpl = JSON.parse(readFileSync(join(SRC, 'activation/templates', v === 'claude' ? 'claude.settings.json' : v === 'codex' ? 'codex.hooks.json' : 'gemini.settings.json'), 'utf8'));
    let cur = existsSync(join(TARGET, t)) ? JSON.parse(readFileSync(join(TARGET, t), 'utf8')) : {};
    cur.hooks = cur.hooks || {}; cur.hooks.SessionStart = cur.hooks.SessionStart || [];
    if (cur.hooks.SessionStart.some((g) => (g.hooks || []).some((h) => /activate\.mjs/.test(h.command || '')))) { say(`  = ${t} already has the activation hook`); continue; }
    cur.hooks.SessionStart.push(tpl.hooks.SessionStart[0]);
    say(`${DRY ? '[dry-run] would' : '  ✓'} merge SessionStart hook into ${t}`); wrU(t, JSON.stringify(cur, null, 2) + '\n');
  }
  if (DRY) { say('\nRun without --dry-run to apply. Each member repo still needs its own init.'); finish({ observed: true }); }
  const r = spawnSync(process.execPath, [join(TARGET, '.project-os/activate.mjs'), 'init-selftest'], { cwd: TARGET, encoding: 'utf8', input: JSON.stringify({ session_id: `init-umb-${Date.now()}`, source: 'startup' }) });
  let ctx = null; try { ctx = JSON.parse(r.stdout.trim()).hookSpecificOutput.additionalContext; } catch { /* none */ }
  const head = ctx ? ctx.split('\n')[0] : null;
  const state = head ? (head.match(/state=([A-Z_]+)/) || [, ''])[1] : '';
  // A payload that merely EXISTS is not a pass. DEGRADED means the dispatcher or a
  // member's own activation broke (a missing import lands here), and the old test
  // accepted any line containing "umbrella=", so a DEGRADED install read as OK.
  const good = !!head && /umbrella=/.test(head) && state !== 'DEGRADED';
  say('\nSelf-test — one payload naming every member, and none of them broken:');
  say(`  ${good ? 'OK   ' : 'FAIL '}${head || `exit ${r.status}, no payload`}`);
  if (ctx) for (const l of ctx.split('\n').filter((x) => /^\s{2}\S.*: state=/.test(x))) say(l);
  say(good
    ? '\nUmbrella installed and OBSERVED. Each member repo still needs its own init (run this from inside each one).'
    : '\nNOT a working umbrella install. Fix and re-run; re-running is safe.');
  finish({ observed: good });
}
say(`Project-OS init → ${root}${DRY ? '  (dry run, nothing written)' : ''}`);
const version = JSON.parse(readFileSync(join(SRC, 'version.json'), 'utf8')).version;
say(`  tooling ${version} from ${SRC}`);
if (!existsSync(join(root, 'PROJECT_OS.md'))) say('  note: no PROJECT_OS.md here — the spec ships with the plugin; activation will run, the freshness manifest is yours to write');
const hooksPath = (() => { try { return execSync('git config --get core.hooksPath', { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim(); } catch { return ''; } })();

const wr = (rel, content, mode) => { if (!DRY) { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), content); if (mode) chmodSync(join(root, rel), mode); } };
const readJSON = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };

// ------------------------------------------------------- 1. the runtime files
for (const f of [...runtimeFor(['activate.mjs', 'watchdog.mjs']), 'shim.sh']) {
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
    owner: '', lanes: [], docsPath: 'docs/', notesPath: 'notes/', autoInject: true,
    _note: `written by project-os init ${version}; detected vendors: ${vendorsHint.join(', ') || 'none'}. Set verify to the command that must pass before a handoff.`,
  };
  did('write .project-os/config.json (defaults; edit verify, tier, owner)'); wr('.project-os/config.json', JSON.stringify(cfg, null, 2) + '\n');
}

// ------------------------------------------------------------ 2b. workbench
// The one directory where writing is allowed to be wrong (PROJECT_OS.md 3.22).
// Created on day one: a repo without it puts that material in docs/, where the
// protocol correctly polices it into red, or in a chat window, where it is lost.
{
  const cfg = readJSON(cfgPath) || {};
  const notes = (cfg.notesPath || 'notes/').replace(/\/?$/, '/');
  // Six kinds, the same in every project so that habit does the finding. The
  // NAMES follow the project's language (notesFolders); the kinds never change.
  const KINDS = {
    research: 'competitors, user signals, market notes, anything learned about the problem',
    meetings: 'notes from conversations, and the decisions still pending someone',
    marketing: 'copy, content, campaign drafts',
    design: 'explorations, references, notes on screens and motion',
    references: 'external material: articles, links, papers',
    drafts: 'half-formed ideas that have no shape yet',
  };
  const names = Object.fromEntries(Object.keys(KINDS).map((k) => [k, String((cfg.notesFolders || {})[k] || k).replace(/\/+$/, '')]));
  let index = readFileSync(join(SRC, 'activation/templates/notes-README.md'), 'utf8');
  for (const k of Object.keys(KINDS)) index = index.split('`' + k + '/`').join('`' + names[k] + '/`');
  const readme = join(root, notes, 'README.md');
  if (existsSync(readme)) say(`  = ${notes}README.md exists, not touched`);
  else { did(`create ${notes} with its index README (the workbench — nothing under it is a source of truth)`); wr(notes + 'README.md', index); }
  const missing = Object.keys(KINDS).filter((k) => !existsSync(join(root, notes, names[k])));
  if (!missing.length) say(`  = ${notes}kind folders present`);
  else {
    did(`create ${missing.length} kind folder(s) in ${notes}: ${missing.map((k) => names[k] + '/').join(', ')}`);
    // one-line README per folder: git keeps no empty directory, so a bare folder would vanish on clone
    for (const k of missing) wr(`${notes}${names[k]}/README.md`, `# ${names[k]}\n\n${KINDS[k][0].toUpperCase() + KINDS[k].slice(1)}. Nothing here is a source of truth; see ../README.md.\n`);
  }
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
const giLines = ['.project-os/heartbeat.json', '.project-os/heartbeat/', '.project-os/.activated-*', '.project-os/studio/review-pending'].filter((l) => !giCur.split('\n').includes(l));
if (giLines.length) { did(`add ${giLines.length} line(s) to .gitignore`); if (!DRY) appendFileSync(gi, (giCur && !giCur.endsWith('\n') ? '\n' : '') + '# Project-OS: machine-local state\n' + giLines.join('\n') + '\n'); }
else say('  = .gitignore current');

// ------------------------------------------------------------ 6. pre-push
const prePushSrc = readFileSync(join(SRC, 'activation/templates/pre-push'), 'utf8');
if (hooksPath) refuse(`core.hooksPath is set to "${hooksPath}" and I did not set it — add the pre-push watchdog there yourself (activation/templates/pre-push)`);
else {
  // Ask git where hooks live. In a linked worktree `.git` is a FILE pointing at
  // the main checkout, so joining '.git/hooks' crashed with ENOTDIR AFTER every
  // other step had already been applied. Hooks are shared by every worktree of a
  // repository, so this installs once for all of them.
  const hooksDir = (() => {
    try { return resolve(root, execSync('git rev-parse --git-path hooks', { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim()); }
    catch { return join(root, '.git/hooks'); }
  })();
  const hp = join(hooksDir, 'pre-push');
  const hpLabel = hp.split('\\').join('/').replace(root.split('\\').join('/') + '/', '');
  const cur = existsSync(hp) ? readFileSync(hp, 'utf8') : '';
  if (cur && !/id:watchdog-pre-push/.test(cur)) refuse(`${hpLabel} exists and is not mine — I will not overwrite a hook I did not write; chain the watchdog into it by hand`);
  else if (cur === prePushSrc) say(`  = ${hpLabel} current`);
  else { did(`install ${hpLabel} (watchdog)`); if (!DRY) { mkdirSync(hooksDir, { recursive: true }); writeFileSync(hp, prePushSrc); chmodSync(hp, 0o755); } }
}

// ------------------------------------------------ 7. self-test: observe it
if (DRY) { say(`\nPlan: ${plan.length} change(s)${refused.length ? `, ${refused.length} refused` : ''}. Run without --dry-run to apply.`); finish({ observed: true }); }

const fire = (cwd, label) => {
  const r = spawnSync(process.execPath, [join(root, '.project-os/activate.mjs'), 'init-selftest'], { cwd, encoding: 'utf8', input: JSON.stringify({ session_id: `init-${label}-${Date.now()}`, source: 'startup' }) });
  const line = (() => { try { return JSON.parse(r.stdout.trim()).hookSpecificOutput.additionalContext.split('\n')[0]; } catch { return null; } })();
  return { ok: r.status === 0 && !!line && /^PROJECT-OS v[\d.]+ ACTIVE /.test(line) && !/state=DEGRADED/.test(line), line, code: r.status };
};
say('\nSelf-test — the install is not done until it has been seen firing:');
const sub = join(root, '.project-os');
const a = fire(root, 'root'), b = fire(sub, 'subdir');
say(`  from repo root:     ${a.ok ? 'OK  ' : 'FAIL'} ${a.line || `exit ${a.code}, no payload`}`);
say(`  from a subdirectory: ${b.ok ? 'OK  ' : 'FAIL'} ${b.line || `exit ${b.code}, no payload`}`);
const observed = a.ok && b.ok;
const ok = observed && !refused.length;
say(ok
  ? `\nInstalled and OBSERVED. Next: set "verify" in .project-os/config.json, run node .project-os/watchdog.mjs --source manual once, and schedule it weekly (activation/templates/schedule.md).`
  : observed
    ? `\nInstalled and OBSERVED, but ${refused.length} item(s) were REFUSED above and need a human. Everything else was applied and seen firing; re-running is safe.`
    : `\nNOT a working install — activation did not fire from one of the two locations. Fix and re-run; re-running is safe.`);
finish({ observed });
