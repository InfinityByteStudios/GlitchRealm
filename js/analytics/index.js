/**
 * GlitchRealm Analytics — entry point
 *
 * <script type="module" src="/js/analytics/index.js"></script>
 *
 * Starts the first-party tracker when analytics consent is granted
 * (js/cookie-consent.js), then:
 *   - captures URL/referrer attribution on every page
 *   - measures engagement time, scroll depth, web vitals
 *   - builds Play-click attribution snapshots and tracks playtime
 *
 * Existing third-party analytics (GA4 / Firebase / Cloudflare) are untouched:
 * every event recorded here is also mirrored to gtag()/Firebase when present.
 */

import * as core from './core.js';
import * as attribution from './attribution.js';
import * as timing from './timing.js';
import * as playtime from './playtime.js';

/* ── public API ──────────────────────────────────────────── */

function playClick({ gameId, gameName, gameUrl, buttonEl, locationOnPage } = {}) {
  if (!core.ctx.started || !gameId) return null;

  const playId = 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const snapshot = attribution.buildPlaySnapshot({ gameId, gameName, playId, buttonEl, locationOnPage });
  snapshot.sessionId = core.getSessionId();
  snapshot.visitorId = core.getVisitorId();

  attribution.persistPendingPlay(snapshot);
  core.track('play_click', snapshot);

  let url = gameUrl || null;
  if (url) url = attribution.attachGameParams(url, snapshot);

  return { playId, snapshot, url };
}

const api = {
  track: (name, props) => core.track(name, props),
  playClick,
  startPlay: (opts) => playtime.startPlay(opts),
  endPlay: (reason) => playtime.endPlay && playtime.endPlay(reason),
  flush: () => core.flush(),
  resetVisitorId: () => core.resetVisitorId(),
  getVisitorId: () => core.getVisitorId(),
  getSessionId: () => core.getSessionId(),
  getAttribution: () => attribution.summaryProps(),
  getFirstTouch: () => attribution.getFirstTouch(),
  getLastPlay: () => attribution.getLastPlay(),
  isPlaying: () => playtime.isPlaying()
};

window.grAnalytics = api;
window.GrAnalytics = api;

/* ── startup / consent orchestration ─────────────────────── */

let started = false;

function begin() {
  if (started) return;
  started = true;

  core.start(() => {
    attribution.capture();
    attribution.trackPath(window.location.pathname + window.location.search);
    timing.init();
    playtime.init();
    setupPlayButtonCapture();
    setupGamePageHeartbeat();
  });

  // legacy CustomEvents from the existing GameLauncher (compat bridge)
  window.addEventListener('gameStarted', (e) => {
    const d = e.detail || {};
    if (!playtime.isPlaying() && core.ctx.started) {
      playtime.startPlay({
        gameId: d.gameId,
        gameName: d.gameName,
        attribution: attribution.getLastPlay()
      });
    }
  });
  window.addEventListener('gameEnded', () => {
    if (playtime.isPlaying()) playtime.endPlay('event');
  });
}

function tryStart() {
  if (started) return;
  if (core.consentGranted() && !core.doNotTrack()) begin();
}

tryStart();

window.addEventListener('gr:consentchange', (e) => {
  const detail = e.detail || {};
  if (detail.analytics === true) tryStart();
  else if (detail.analytics === false) {
    started = false;
    core.stop();
  }
});

/* ── generic Play-button capture (games page etc.) ───────── */

let openCaptureInstalled = false;

function setupPlayButtonCapture() {
  // record every window.open so external "Play Now" buttons give us a
  // window handle for playtime accounting
  try {
    if (!openCaptureInstalled) {
      openCaptureInstalled = true;
      const orig = window.open.bind(window);
      window.__grLastOpen = null;
      window.open = function (...args) {
        const win = orig(...args);
        window.__grLastOpen = { url: String(args[0] || ''), win, ts: Date.now() };
        return win;
      };
    }
  } catch (e) { /* ignore */ }

  document.addEventListener('click', (e) => {
    try {
      if (!core.ctx.started) return;
      const el = e.target.closest('button, a, [role="button"]');
      if (!el) return;
      if (el.closest('[data-game-launch]')) return; // handled by game-launcher integration

      const card = el.closest('.game-card, [data-game-id], .card');
      const idEl = card && (card.matches('[data-game-id]') ? card : card.querySelector('[data-game-id]'));
      const text = (el.textContent || '').trim().toLowerCase();
      const looksLikePlay = /play/.test(text) || el.classList.contains('card-btn');

      const gameId = idEl ? idEl.getAttribute('data-game-id') : null;
      if (!looksLikePlay || !gameId) return;

      const res = playClick({
        gameId,
        gameName: (card.querySelector('h3, .card-title, [data-game-name]')?.textContent || '').trim().slice(0, 100) || gameId,
        buttonEl: el,
        locationOnPage: window.location.pathname
      });

      // attach the game window handle if the button's own onclick opened one
      setTimeout(() => {
        const last = window.__grLastOpen;
        const win = last && Date.now() - last.ts < 2500 ? last.win : null;
        playtime.startPlay({
          gameId,
          gameName: res && res.snapshot.gameName,
          playId: res && res.playId,
          gameWindow: win,
          attribution: res && res.snapshot
        });
      }, 80);
    } catch (err) { /* ignore */ }
  }, { passive: true });
}

/* ── same-origin game pages: heartbeat takeover ──────────── */

function setupGamePageHeartbeat() {
  try {
    const gr = attribution.readGameParams();
    const playId = gr.gr_pid;
    if (!playId) return;

    core.track('game_loaded', { ...gr, path: window.location.pathname });

    // keep the parent's play alive while the game tab is being played
    setInterval(() => {
      try {
        localStorage.setItem('gr_active_play', JSON.stringify({
          playId,
          gameId: gr.gr_gid || null,
          lastBeat: Date.now(),
          seconds: 0
        }));
      } catch (e) { /* ignore */ }
    }, 15000);
  } catch (e) { /* ignore */ }
}
