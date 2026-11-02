/**
 * GlitchRealm Analytics — Timing
 *
 * Honest time measurement (visible tab only):
 *   - page_engagement   : visible dwell time + scroll depth, flushed every 15s
 *   - session_summary   : per-session engaged seconds + pageview count (on hide)
 *   - web_vitals        : LCP / CLS / INP (PerformanceObserver, best-effort)
 *   - navigation_timing : TTFB / DOM ready / load
 *   - outbound_click, error : interaction + failure tracking
 */

import { track } from './core.js';

const FLUSH_MS = 15000;

const state = {
  engagedMs: 0,        // visible time on this page
  lastTick: 0,         // timestamp of last visible tick
  sessionEngagedMs: 0, // engaged seconds across the session (approx)
  sessionPageviews: 0,
  maxScrollPct: 0,
  vitals: {},
  navTimed: false
};

function now() { return Date.now(); }

function accountTick() {
  const t = now();
  if (state.lastTick) {
    state.engagedMs += Math.min(t - state.lastTick, FLUSH_MS * 2);
    state.sessionEngagedMs += Math.min(t - state.lastTick, FLUSH_MS * 2);
  }
  state.lastTick = t;
}

function startTicker() {
  accountTick();
  setInterval(() => {
    if (document.visibilityState === 'visible') accountTick();
    else state.lastTick = 0;
  }, 1000);
}

function scrollPct() {
  const doc = document.documentElement;
  const scrollable = Math.max(doc.scrollHeight - window.innerHeight, 1);
  return Math.max(0, Math.min(100, Math.round((window.scrollY / scrollable) * 100)));
}

function flushEngagement(final = false) {
  if (!state.lastTick) accountTick();
  const seconds = Math.round(state.engagedMs / 1000);
  if (seconds < 1 && !final) return;
  track('page_engagement', {
    seconds,
    maxScrollPct: state.maxScrollPct,
    final
  });
  state.engagedMs = 0;
}

function flushSessionSummary() {
  const seconds = Math.round(state.sessionEngagedMs / 1000);
  if (seconds < 1 && state.sessionPageviews < 1) return;
  track('session_summary', {
    seconds,
    pageviews: state.sessionPageviews,
    maxScrollPct: state.maxScrollPct
  });
}

function startScroll() {
  let throttle = null;
  window.addEventListener('scroll', () => {
    if (throttle) return;
    throttle = setTimeout(() => {
      throttle = null;
      const pct = scrollPct();
      if (pct > state.maxScrollPct) state.maxScrollPct = pct;
    }, 250);
  }, { passive: true });
}

function startWebVitals() {
  try {
    if (!'PerformanceObserver' in window) return;
    const observe = (type, cb) => {
      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) cb(entry);
        });
        po.observe({ type, buffered: true });
      } catch (e) { /* unsupported type */ }
    };

    observe('largest-contentful-paint', (e) => { state.vitals.lcp = Math.round(e.startTime); });
    observe('layout-shift', (e) => {
      if (!e.hadRecentInput) state.vitals.cls = Math.round(((state.vitals.cls || 0) + e.value) * 1000) / 1000;
    });
    observe('event', (e) => {
      if (e.interactionId && (state.vitals.inp === undefined || e.duration > state.vitals.inp)) {
        state.vitals.inp = Math.round(e.duration);
      }
    });

    // report vitals once on hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && Object.keys(state.vitals).length) {
        track('web_vitals', { ...state.vitals, path: window.location.pathname });
        state.vitals = {};
      }
    });
  } catch (e) { /* ignore */ }
}

function navigationTiming() {
  if (state.navTimed) return;
  state.navTimed = true;
  try {
    const nav = performance.getEntriesByType('navigation')[0] ||
      (performance.timing ? {
        responseStart: performance.timing.responseStart - performance.timing.navigationStart,
        domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd - performance.timing.navigationStart
      } : null);
    if (nav) {
      track('navigation_timing', {
        ttfb: Math.max(0, Math.round(nav.responseStart || 0)),
        domReady: Math.max(0, Math.round(nav.domContentLoadedEventEnd || 0)),
        load: Math.max(0, Math.round(nav.loadEventEnd || 0))
      });
    }
  } catch (e) { /* ignore */ }
}

function startClickTracking() {
  document.addEventListener('click', (e) => {
    try {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (/^(https?:)?\/\//i.test(href) && !href.includes(window.location.hostname)) {
        track('outbound_click', { href: href.slice(0, 240), text: (a.textContent || '').trim().slice(0, 60) });
      }
    } catch (err) { /* ignore */ }
  }, { passive: true });
}

function startErrorTracking() {
  const report = (message, extra) => {
    try {
      track('error', {
        message: String(message || '').slice(0, 240),
        stack: String(extra && extra.stack ? extra.stack : '').slice(0, 600),
        file: String((extra && extra.filename) || '').slice(0, 160),
        line: (extra && extra.lineno) || null,
        userAgent: navigator.userAgent.slice(0, 160)
      });
    } catch (e) { /* ignore */ }
  };
  window.addEventListener('error', (e) => report(e.message, e), { capture: true });
  window.addEventListener('unhandledrejection', (e) => {
    report('unhandledrejection: ' + (e.reason && (e.reason.message || e.reason)), e.reason);
  });
}

export function init() {
  startTicker();
  startScroll();
  startWebVitals();
  startErrorTracking();
  startClickTracking();

  state.sessionPageviews += 1;
  track('page_view', {});
  navigationTiming();

  setInterval(() => flushEngagement(false), FLUSH_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      flushEngagement(false);
      flushSessionSummary();
    } else {
      state.lastTick = 0; // reset tick on return to avoid double counting
    }
  });
  window.addEventListener('pagehide', () => {
    flushEngagement(true);
    flushSessionSummary();
  });
}
