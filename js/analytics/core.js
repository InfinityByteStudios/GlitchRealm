/**
 * GlitchRealm Analytics — Core
 *
 * First-party analytics core: identity (visitor/session ids), consent gating,
 * event queueing with batching, and dual dispatch to:
 *   1. The site's own collector  (POST /.netlify/functions/analytics-collect)
 *   2. GA4 via gtag()            (if a gtag snippet is present)
 *   3. Firebase Analytics        (if window.firebaseApp + firebase-analytics loaded)
 *
 * Third-party analytics on the site is left untouched — this layer runs
 * alongside it so both sources record the same event taxonomy.
 *
 * Consent: nothing is collected or stored until the visitor grants the
 * "analytics" consent via js/cookie-consent.js. Do Not Track / GPC is honored.
 */

/* ── shared context (populated by index.js, consumed by modules) ── */
export const ctx = {
  endpoint: '/.netlify/functions/analytics-collect',
  batchSize: 10,
  batchDelayMs: 8000,
  maxPayloadEvents: 20,
  maxPropValue: 300,
  sessionTimeoutMs: 30 * 60 * 1000,
  started: false,
  decorate: null // hook set by attribution module to stamp attribution props
};

const KEYS = {
  visitor: 'gr_vid',
  visitorTs: 'gr_vid_ts',
  session: 'gr_sid',
  sessionStart: 'gr_sid_start',
  sessionLast: 'gr_sid_last',
  queue: 'gr_evt_queue'
};

const VisitorTtlMs = 30 * 24 * 60 * 60 * 1000; // 30 days, per privacy policy

/* ── helpers ─────────────────────────────────────────────── */

function safeStorage(kind) {
  try {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage;
    return {
      get(k) { return s.getItem(k); },
      set(k, v) { s.setItem(k, v); },
      remove(k) { s.removeItem(k); }
    };
  } catch (e) { return null; }
}
export const local = safeStorage('local');
export const session = safeStorage('session');

function uuid() {
  const c = window.crypto || window.msCrypto;
  if (c && c.randomUUID) return c.randomUUID();
  return 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) +
         '-' + Math.random().toString(36).slice(2, 10);
}

export function doNotTrack() {
  try {
    if (navigator.globalPrivacyControl === true) return true;
    const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    return dnt === '1' || dnt === 'yes';
  } catch (e) { return false; }
}

export function consentGranted() {
  try {
    if (typeof window.getCookieConsent === 'function') {
      const c = window.getCookieConsent();
      if (c) return c.analytics === true;
      return false; // banner present but no decision yet
    }
  } catch (e) { /* fall through */ }
  return false;
}

/* ── identity ────────────────────────────────────────────── */

export function getVisitorId() {
  if (!local) return null;
  const now = Date.now();
  let vid = local.get(KEYS.visitor);
  let ts = Number(local.get(KEYS.visitorTs) || 0);
  if (!vid || !ts || now - ts > VisitorTtlMs) {
    vid = uuid();
    local.set(KEYS.visitor, vid);
    local.set(KEYS.visitorTs, String(now));
  }
  return vid;
}

export function resetVisitorId() {
  if (local) {
    local.remove(KEYS.visitor);
    local.remove(KEYS.visitorTs);
  }
  return getVisitorId();
}

export function getSessionId() {
  if (!session) return null;
  const now = Date.now();
  const last = Number(session.get(KEYS.sessionLast) || 0);
  let sid = session.get(KEYS.session);
  if (sid && last && now - last > ctx.sessionTimeoutMs) {
    sid = null; // expired by inactivity
  }
  if (!sid) {
    sid = 's-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    session.set(KEYS.session, sid);
    session.set(KEYS.sessionStart, String(now));
  }
  session.set(KEYS.sessionLast, String(now));
  return sid;
}

export function sessionStartedAt() {
  if (!session) return null;
  const v = Number(session.get(KEYS.sessionStart) || 0);
  return v || null;
}

/* ── device / env snapshot ───────────────────────────────── */

export function envSnapshot() {
  let screen = null;
  try {
    screen = window.screen ? `${window.screen.width}x${window.screen.height}` : null;
  } catch (e) { /* ignore */ }
  return {
    lang: (navigator.language || '').slice(0, 12) || null,
    tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 48) || null,
    screen,
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100
  };
}

/* ── prop sanitizing ─────────────────────────────────────── */

export function sanitizeProps(props) {
  const out = {};
  if (!props || typeof props !== 'object') return out;
  const emailish = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  for (const key of Object.keys(props)) {
    let v = props[key];
    if (v === undefined || v === null) continue;
    if (typeof v === 'number' && Number.isFinite(v)) { out[key] = Math.round(v * 100) / 100; continue; }
    if (typeof v === 'boolean') { out[key] = v; continue; }
    if (typeof v === 'string') {
      let s = v.slice(0, ctx.maxPropValue);
      if (emailish.test(s)) s = s.replace(emailish, '[email]');
      out[key] = s;
      continue;
    }
    if (Array.isArray(v)) {
      out[key] = v.slice(0, 12).map(x => String(x).slice(0, 60));
      continue;
    }
    // anything else -> stringified, capped
    try { out[key] = JSON.stringify(v).slice(0, ctx.maxPropValue); } catch (e) { /* skip */ }
  }
  return out;
}

/* ── queue + transport ───────────────────────────────────── */

const queue = [];
let flushTimer = null;
let flushing = false;

function enqueue(event) {
  queue.push(event);
  if (local) {
    try { local.set(KEYS.queue, JSON.stringify(queue.slice(-ctx.maxPayloadEvents * 2))); } catch (e) { /* quota */ }
  }
  if (queue.length >= ctx.batchSize) flush();
  else {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, ctx.batchDelayMs);
  }
}

function restoreQueue() {
  if (!local) return;
  try {
    const raw = local.get(KEYS.queue);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved)) queue.unshift(...saved.slice(-ctx.maxPayloadEvents * 2));
    local.remove(KEYS.queue);
  } catch (e) { /* ignore */ }
}

export function flush() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }

  const batch = queue.splice(0, ctx.maxPayloadEvents);
  const payload = JSON.stringify({ v: 1, events: batch });
  let sent = false;

  try {
    if (navigator.sendBeacon) {
      sent = navigator.sendBeacon(ctx.endpoint, new Blob([payload], { type: 'application/json' }));
    }
  } catch (e) { sent = false; }

  const finish = (ok) => {
    if (!ok) queue.unshift(...batch); // retry on next flush
    if (local) {
      try { local.set(KEYS.queue, JSON.stringify(queue.slice(-ctx.maxPayloadEvents * 2))); } catch (e) { /* quota */ }
    }
    flushing = false;
    if (queue.length >= ctx.batchSize) flush();
  };

  if (sent) { finish(true); return; }

  fetch(ctx.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
    credentials: 'omit'
  }).then(r => finish(r.ok)).catch(() => finish(false));
}

/* ── third-party sinks (kept intact, fed the same taxonomy) ── */

function dispatchToGtag(name, props, base) {
  try {
    if (typeof window.gtag === 'function') {
      const gtagProps = { ...sanitizeProps(props) };
      gtagProps.session_id = base.sessionId || undefined;
      if (base.userId) gtagProps.user_id = base.userId;
      window.gtag('event', name, gtagProps);
    }
  } catch (e) { /* ignore */ }
}

function dispatchToFirebase(name, props) {
  try {
    if (window.firebaseApp && typeof window.firebaseAnalyticsLogEvent === 'function') {
      window.firebaseAnalyticsLogEvent(window.firebaseApp, name, sanitizeProps(props));
    }
  } catch (e) { /* ignore */ }
}

/* ── public API ──────────────────────────────────────────── */

export function track(name, props = {}) {
  if (!ctx.started) return;

  const base = {
    name: String(name || '').slice(0, 60),
    ts: Date.now(),
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    userId: (window.currentFirebaseUser && window.currentFirebaseUser.uid) || null,
    path: (window.location.pathname + window.location.search).slice(0, 300),
    origin: window.location.origin,
    referrer: document.referrer ? String(document.referrer).slice(0, 300) : null,
    title: document.title ? String(document.title).slice(0, 120) : null,
    env: envSnapshot()
  };

  if (ctx.decorate) {
    try { props = { ...ctx.decorate(), ...sanitizeProps(props) }; } catch (e) { /* ignore */ }
  }

  const event = { ...base, props: sanitizeProps(props) };
  enqueue(event);

  dispatchToGtag(base.name, props, base);
  dispatchToFirebase(base.name, props);
}

/* ── lifecycle ───────────────────────────────────────────── */

export function start(onStart) {
  if (ctx.started) return;
  if (doNotTrack()) return;
  if (!consentGranted()) return;

  ctx.started = true;
  restoreQueue();
  getSessionId();
  if (typeof onStart === 'function') onStart();

  // keep session alive on activity
  const touch = () => { if (ctx.started) getSessionId(); };
  ['click', 'keydown', 'pointerdown', 'scroll'].forEach(t =>
    window.addEventListener(t, touch, { passive: true }));

  // flush on leave / hide
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
}

export function stop() {
  ctx.started = false;
  flush();
}
