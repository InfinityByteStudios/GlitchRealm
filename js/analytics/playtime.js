/**
 * GlitchRealm Analytics — Playtime
 *
 * Tracks per-game play sessions launched from the site.
 *
 * Games usually open in a new tab/window (often cross-origin, e.g.
 * coderunner.game.glitchrealm.ca), so time is measured in the parent page:
 *   - a play starts when Play is clicked and a game window exists
 *   - every second, playtime accrues while the game window is open AND the
 *     visitor is not idle (parent page visible or focus on the game window)
 *   - a heartbeat is sent every 30s (game_heartbeat)
 *   - the play ends when the game window closes (or after a 90s grace period
 *     of no heartbeat) — game_end carries the total duration
 *
 * For same-origin game pages that include this tracker themselves, the game
 * page takes over the heartbeat via localStorage so timing stays precise.
 *
 * Signed-in visitors get their totals written back to the existing Firestore
 * path used by the user portal and leaderboards:
 *   playtime/{uid}/games/{gameId}  -> { totalPlaytime (seconds), hours, ... }
 */

import { track } from './core.js';
import { local } from './core.js';

const HEARTBEAT_MS = 30000;
const END_POLL_MS = 2000;
const IDLE_MS = 90000;        // no input anywhere -> pause clock
const STALE_BEAT_MS = 90000;  // game-side heartbeat considered dead

const KEY_ACTIVE = 'gr_active_play';

let active = null; // { playId, gameId, gameName, gameWindow, startedAt, seconds, idle, beatTimer, endTimer, attribution }
let lastInput = Date.now();

export function isPlaying() { return active !== null; }

function markInput() { lastInput = Date.now(); }

function accrueSeconds() {
  if (!active || active.ended) return 0;
  const beat = Math.round((Date.now() - active.lastBeat) / 1000);
  active.lastBeat = Date.now();
  const idleFor = Date.now() - lastInput;
  const idle = idleFor > IDLE_MS;
  if (idle) return 0;
  // cap pathological ticks (background throttling)
  const gained = Math.min(beat, HEARTBEAT_MS / 1000 * 2);
  active.seconds += gained;
  return gained;
}

function heartbeat() {
  if (!active || active.ended) return;
  const gained = accrueSeconds();
  track('game_heartbeat', {
    gameId: active.gameId,
    playId: active.playId,
    playSeconds: Math.round(active.seconds),
    gained: Math.round(gained)
  });
  try { localStorage.setItem(KEY_ACTIVE, JSON.stringify(activeBeat())); } catch (e) { /* ignore */ }
}

function activeBeat() {
  return {
    playId: active.playId,
    gameId: active.gameId,
    lastBeat: Date.now(),
    seconds: Math.round(active.seconds)
  };
}

function writeBack(reason) {
  if (!active || !active.seconds) return;
  const uid = window.currentFirebaseUser && window.currentFirebaseUser.uid;
  if (!uid) return;
  const seconds = Math.round(active.seconds);
  try {
    // write-back via the global Firestore helpers (rules allow owner writes)
    const doWrite = async () => {
      const db = window.firebaseFirestore;
      const doc = window.firestoreDoc;
      const { getFirestore, doc as fdoc, getDoc, setDoc } =
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const ref = fdoc(db, 'playtime', uid, 'games', String(active.gameId));
      const snap = await getDoc(ref);
      const prev = snap.exists() ? snap.data() : {};
      const total = (Number(prev.totalPlaytime) || 0) + seconds;
      const data = {
        gameId: String(active.gameId),
        userId: uid,
        gameName: active.gameName || prev.gameName || null,
        iconUrl: prev.iconUrl || null,
        totalPlaytime: total,
        hours: Math.round((total / 3600) * 100) / 100,
        sessions: (Number(prev.sessions) || 0) + (reason === 'end' ? 1 : 0),
        lastUpdated: new Date(),
        lastSource: active.attribution && active.attribution.source || prev.lastSource || null,
        lastPlayId: active.playId
      };
      await setDoc(ref, data, { merge: true });
    };
    doWrite().catch(() => { /* offline — playtime stays in analytics events */ });
  } catch (e) { /* ignore */ }
}

function endPlay(reason = 'closed') {
  if (!active || active.ended) return;
  active.ended = true;
  accrueSeconds();
  const duration = Math.round(active.seconds);

  if (active.beatTimer) clearInterval(active.beatTimer);
  if (active.endTimer) clearInterval(active.endTimer);

  track('game_end', {
    gameId: active.gameId,
    gameName: active.gameName,
    playId: active.playId,
    duration_s: duration,
    reason,
    attribution: active.attribution || null
  });

  if (duration >= 5) writeBack(reason);

  try { localStorage.removeItem(KEY_ACTIVE); } catch (e) { /* ignore */ }
  active = null;
}

export function startPlay({ gameId, gameName, playId, gameWindow, attribution } = {}) {
  if (!gameId) return null;
  if (active && !active.ended) endPlay('superseded');

  lastInput = Date.now();
  active = {
    playId: playId || ('p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    gameId: String(gameId).slice(0, 60),
    gameName: gameName ? String(gameName).slice(0, 100) : null,
    gameWindow: gameWindow && !gameWindow.closed ? gameWindow : null,
    startedAt: Date.now(),
    lastBeat: Date.now(),
    seconds: 0,
    ended: false,
    beatFromGame: false,
    lastGameBeat: 0,
    returnedAt: null,
    attribution: attribution || null
  };

  track('game_start', {
    gameId: active.gameId,
    gameName: active.gameName,
    playId: active.playId,
    attribution: active.attribution
  });

  try { localStorage.setItem(KEY_ACTIVE, JSON.stringify(activeBeat())); } catch (e) { /* ignore */ }

  active.beatTimer = setInterval(heartbeat, HEARTBEAT_MS);
  active.endTimer = setInterval(() => {
    if (!active || active.ended) return;

    // 1) the game window we opened was closed
    if (active.gameWindow && active.gameWindow.closed) return endPlay('closed');

    // 2) a same-origin game page stopped sending its heartbeat
    if (active.beatFromGame && Date.now() - active.lastGameBeat > STALE_BEAT_MS) return endPlay('stale');

    // 3) no window handle (external links): end once the player is back on
    //    the parent tab, focused, for a full minute
    if (!active.gameWindow) {
      if (document.hasFocus() && document.visibilityState === 'visible') {
        if (!active.returnedAt) active.returnedAt = Date.now();
        else if (Date.now() - active.returnedAt > 60000) return endPlay('returned');
      } else {
        active.returnedAt = null;
      }
    }
  }, END_POLL_MS);

  return active.playId;
}

export function init() {
  ['pointerdown', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(t =>
    window.addEventListener(t, markInput, { passive: true }));

  // same-origin game pages: fresh heartbeat from the game keeps the play alive
  window.addEventListener('storage', (e) => {
    if (e.key === KEY_ACTIVE && active && !active.ended) {
      try {
        const beat = JSON.parse(e.newValue || 'null');
        if (beat && beat.playId === active.playId) {
          active.beatFromGame = true;
          active.lastGameBeat = Date.now();
        }
      } catch (err) { /* ignore */ }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) heartbeat(); // flush partial seconds on hide
  });

  // orphaned plays (page reloaded mid-play, no active record): emit stale end
  try {
    const beat = JSON.parse(localStorage.getItem(KEY_ACTIVE) || 'null');
    if (beat && Date.now() - beat.lastBeat > STALE_BEAT_MS) {
      track('game_end', {
        gameId: beat.gameId,
        playId: beat.playId,
        duration_s: Math.round(beat.seconds || 0),
        reason: 'orphaned'
      });
      localStorage.removeItem(KEY_ACTIVE);
    }
  } catch (e) { /* ignore */ }
}
