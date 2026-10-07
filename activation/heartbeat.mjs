// Project-OS heartbeat — one record per session, never one shared file.
//
// WHY THIS IS A DIRECTORY AND NOT A FILE. Through 0.7.3 every activation wrote
// the same `.project-os/heartbeat.json` twice: "started", then "done". With one
// session that is a clean trail. With nine sessions opened inside three minutes
// it is a race, and it happened: the last writer's "started" survived, its own
// "done" was lost, the pre-push watchdog read "started and never finished", and
// it blocked a real merge push. The ledger row is still there, RED at 03:37 and
// GREEN three minutes later once somebody re-ran activation by hand.
//
// AND THE SECOND HALF, which the file layout alone does not fix: with sessions
// running concurrently, "a started record exists" is the NORMAL state, not a
// failure. Nine agents working means nine records in flight. So a started
// record is a finding only when it is old enough that no plausible session is
// still inside it, and only for the session that owns it.
//
// Note for anyone reading the markers instead: `.activated-<session>` is
// written at START (its 24 bytes are an ISO timestamp). It is not evidence that
// an activation finished, so it cannot be used to clear a stranded "started".
// And it is a CLAIM, not a lock: honoured only while the run it belongs to can
// still be running (DEDUP_MS), or once that session has a finished record. An
// old marker with no `done` behind it is a dead run — through 0.7.6 it was read
// as permanent, and a run killed mid-way silenced its session forever.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

// A session that started longer ago than this is not still running.
export const STRANDED_MS = 60 * 60e3;

// A double-fire marker younger than this may belong to a run still in flight
// (the two hooks of a concurrent double fire start milliseconds apart; a hook
// is killed by its vendor at ~15 s). Older, with no `done` for the session, it
// is the residue of a dead run and the next fire is a relaunch.
export const DEDUP_MS = 60e3;

/** The one sentence a person needs when a stranded record is reported: which file holds it, and the command that finishes that session. */
export function clearHint(rec, vendor = '<tool>') {
  if (rec.legacy) return 'this is the pre-0.7.4 single heartbeat.json; run activation once (node .project-os/activate.mjs ' + vendor + ' </dev/null) and it is superseded';
  return `file ${posix(rec.file || rec.session + '.json')} — finish that session: printf '{"session_id":"${rec.session}"}' | node .project-os/activate.mjs ${vendor}  (or delete the file if that session is gone for good)`;
}

// WHERE THE TRAIL LIVES: in the clone's git common dir, not in the working
// tree. Through 0.7.7 it was `.project-os/heartbeat/` under the checkout, which
// meant three things an adopter's QA log recorded one after another: a NEW
// WORKTREE started with no trail and its first push was red with "no activation
// has ever finished"; `git clean`/`git stash -u` took the trail with the rest of
// the untracked files; and every worktree of one clone kept a separate idea of
// what had happened on this machine. The git dir is shared by every worktree of
// a clone, never touched by clean or stash, and never committed — which is what
// "machine-local" was always supposed to mean. An umbrella folder is not a
// repo, so it keeps the trail under its own `.project-os/`. Records written by
// 0.7.4–0.7.7 into the old location are still read, as a fallback, until the
// new location has entries.
const trailCache = new Map();
export function trailDir(root) {
  if (trailCache.has(root)) return trailCache.get(root);
  let d;
  try { d = join(resolve(root, execSync('git rev-parse --git-common-dir', { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim()), 'project-os'); }
  catch { d = join(root, '.project-os'); }
  trailCache.set(root, d);
  return d;
}
const dir = (root) => join(trailDir(root), 'heartbeat');
const legacyDir = (root) => join(root, '.project-os/heartbeat');
/** The double-fire marker for a session, beside the trail. */
export const markerPath = (root, sid) => join(trailDir(root), 'activated-' + safe(sid));
const posix = (p) => String(p).split('\\').join('/');
const safe = (s) => String(s || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || `pid-${process.pid}`;
const readJSON = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };

/** Write this session's own record. Two calls per activation: 'started', then 'done'. */
export function writeHeartbeat(root, id, record) {
  try {
    mkdirSync(dir(root), { recursive: true });
    writeFileSync(join(dir(root), `${safe(id)}.json`), JSON.stringify(record, null, 2) + '\n');
  } catch { /* a failed heartbeat write is reported by the caller, never fatal */ }
}

/**
 * Every record on this machine, newest first. Reads the per-session directory
 * and, when a pre-0.7.4 `heartbeat.json` is still present, that single legacy
 * record too — an adopter who has not re-vendored keeps a working trail.
 */
export function allHeartbeats(root) {
  const out = [];
  for (const d of [dir(root), legacyDir(root)]) {
    try {
      for (const f of readdirSync(d)) {
        if (!f.endsWith('.json')) continue;
        const r = readJSON(join(d, f));
        if (r && r.at) out.push({ ...r, session: f.replace(/\.json$/, ''), file: join(d, f) });
      }
    } catch { /* no directory yet */ }
    if (out.length) break; // the old location is a fallback, not a second source
  }
  // The pre-0.7.4 single file is a FALLBACK, and only while the per-session
  // directory is empty. Once any per-session record exists the legacy file is
  // SUPERSEDED and ignored. Reading both forever was a trap: a legacy "started"
  // that crashed before the upgrade can never be finished by anything — every
  // new activation writes its own file — so under the age rule it stayed red on
  // every push until somebody deleted the file by hand. Observed on a real
  // umbrella member whose last pre-upgrade activation had hung.
  if (!out.length) {
    const legacy = readJSON(join(root, '.project-os/heartbeat.json'));
    if (legacy && legacy.at) out.push({ ...legacy, session: 'legacy', legacy: true, file: join(root, '.project-os/heartbeat.json') });
  }
  return out.sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));
}

/**
 * What the trail actually says right now:
 *   latest    the newest FINISHED activation — the one BROKEN_ACTIVATION compares against
 *   running   records started recently enough that a session may still be inside them
 *   stranded  started, old, and never finished: a real crash, per session
 */
export function heartbeatState(root, now = Date.now()) {
  const all = allHeartbeats(root);
  const done = all.filter((r) => r.phase === 'done');
  const started = all.filter((r) => r.phase === 'started');
  const stranded = started.filter((r) => now - Date.parse(r.at || 0) > STRANDED_MS
    && !done.some((d) => d.session === r.session && Date.parse(d.at || 0) >= Date.parse(r.at || 0)));
  const running = started.filter((r) => !stranded.includes(r)
    && !done.some((d) => d.session === r.session && Date.parse(d.at || 0) >= Date.parse(r.at || 0)));
  return { latest: done[0] || null, running, stranded, all };
}

/** Drop finished records older than a week so the directory cannot grow forever. */
export function pruneHeartbeats(root, now = Date.now(), keepMs = 7 * 24 * 60 * 60e3) {
  try {
    for (const f of readdirSync(dir(root))) {
      const p = join(dir(root), f);
      const r = readJSON(p);
      if (r && r.phase === 'done' && now - Date.parse(r.at || 0) > keepMs) unlinkSync(p);
    }
  } catch { /* nothing to prune */ }
}

export { existsSync as _existsSync };
