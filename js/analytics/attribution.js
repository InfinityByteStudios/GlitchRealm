/**
 * GlitchRealm Analytics — Attribution
 *
 * Captures "where the visitor came from" and carries it through to the
 * moment they click Play:
 *   - URL parameters (utm_*, ad click ids, ref/source/via/from/game, gr_*)
 *   - document.referrer classification (direct / search / social / internal / referral)
 *   - first-touch (localStorage, 30-day TTL) and last-touch (per session)
 *   - per-click Play attribution snapshot + click-path chain
 *   - propagation of attribution into the game URL (?gr_sid=...&gr_gid=...)
 *
 * Nothing is written to storage until core consent gating has started the
 * tracker (see core.js start()).
 */

const KEYS = {
  firstTouch: 'gr_attr_first',
  lastTouch: 'gr_attr_last',
  chain: 'gr_chain',
  pendingPlay: 'gr_pending_play',
  lastPlay: 'gr_last_play'
};

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // first-touch expires after 30 days

const PARAM_ALIASES = {
  utm_source: 'source',
  utm_medium: 'medium',
  utm_campaign: 'campaign',
  utm_term: 'term',
  utm_content: 'content',
  utm_id: 'campaignId',
  gclid: 'clickId',
  fbclid: 'clickId',
  msclkid: 'clickId',
  ttclid: 'clickId',
  twclid: 'clickId',
  dclid: 'clickId',
  igshid: 'clickId',
  ref: 'source',
  source: 'source',
  via: 'source',
  from: 'source',
  game: 'gameParam',
  gr_src: 'source'
};

const SEARCH_HOSTS = [
  'google.', 'bing.com', 'duckduckgo.com', 'search.brave.com', 'yandex.',
  'baidu.com', 'ecosia.org', 'startpage.com', 'qwant.com', 'yahoo.com'
];

const SOCIAL_HOSTS = [
  'reddit.com', 'x.com', 'twitter.com', 'discord.com', 'ptb.discord.com', 'canary.discord.com',
  'youtube.com', 'youtu.be', 'twitch.tv', 'tiktok.com', 'instagram.com', 'facebook.com',
  'linkedin.com', 'bsky.app', 'mastodon.', 'pinterest.com', 'threads.net'
];

function readParams() {
  const params = new URLSearchParams(window.location.search);
  const hash = (window.location.hash || '').replace(/^#/, '');
  // allow #utm_source=... style tags too
  if (hash.includes('=')) {
    try {
      const h = new URLSearchParams(hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash);
      h.forEach((v, k) => { if (!params.has(k)) params.append(k, v); });
    } catch (e) { /* ignore */ }
  }
  return params;
}

function classifyReferrer(referrer) {
  if (!referrer) return { kind: 'direct', host: null, path: null };
  try {
    const u = new URL(referrer);
    const here = u.origin === window.location.origin;
    let kind = 'referral';
    if (here) kind = 'internal';
    else {
      const host = u.hostname.replace(/^www\./, '');
      if (SEARCH_HOSTS.some(s => host.includes(s))) kind = 'search';
      else if (SOCIAL_HOSTS.some(s => host.includes(s))) kind = 'social';
    }
    return {
      kind,
      host: u.hostname.slice(0, 100),
      path: u.pathname.slice(0, 200)
    };
  } catch (e) {
    return { kind: 'referral', host: null, path: null };
  }
}

/* ── storage helpers ─────────────────────────────────────── */

function saveFirstTouch(touch) {
  // first touch wins; keep for 30 days, refresh on repeat visit
  try {
    const existing = JSON.parse(localStorage.getItem(KEYS.firstTouch) || 'null');
    if (existing && existing.at && Date.now() - existing.at < TTL_MS) return;
    localStorage.setItem(KEYS.firstTouch, JSON.stringify({ ...touch, at: Date.now() }));
  } catch (e) { /* quota / private mode */ }
}

function readTouch(key, isLocal) {
  try {
    const store = isLocal ? localStorage : sessionStorage;
    const raw = store.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (isLocal && obj.at && Date.now() - obj.at > TTL_MS) {
      store.removeItem(key);
      return null;
    }
    return obj;
  } catch (e) { return null; }
}

/* ── capture ─────────────────────────────────────────────── */

export function capture() {
  const params = readParams();
  const ref = classifyReferrer(document.referrer);

  const values = {};
  params.forEach((v, k) => { values[k.slice(0, 40)] = String(v).slice(0, 120); });

  const touch = {
    source: null, medium: null, campaign: null, term: null, content: null,
    campaignId: null, clickId: null,
    referrer: ref
  };

  for (const [param, field] of Object.entries(PARAM_ALIASES)) {
    const v = params.get(param);
    if (v && !touch[field]) touch[field] = String(v).slice(0, 120);
  }
  // gr_/game params are internal, not part of "source"
  for (const f of ['source', 'medium', 'campaign', 'term', 'content', 'campaignId', 'clickId']) {
    if (touch[f] && touch[f].startsWith('gr_')) touch[f] = null;
  }
  if (touch.source && !touch.medium) touch.medium = ref.kind === 'direct' && params.get('utm_source') ? 'campaign' : ref.kind;
  if (!touch.source && ref.kind !== 'direct') touch.source = ref.host;
  if (!touch.medium) touch.medium = ref.kind === 'direct' ? 'direct' : ref.kind;
  if (touch.gameParam) delete touch.gameParam;

  touch.landingPath = (window.location.pathname + window.location.search).slice(0, 240);
  touch.params = values;

  saveFirstTouch(touch);
  try { sessionStorage.setItem(KEYS.lastTouch, JSON.stringify(touch)); } catch (e) { /* ignore */ }

  return touch;
}

export function getFirstTouch() {
  return readTouch(KEYS.firstTouch, true);
}

export function getLastTouch() {
  return readTouch(KEYS.lastTouch, false);
}

/* ── click-path chain (pages visited this session) ───────── */

export function trackPath(path) {
  try {
    const chain = JSON.parse(sessionStorage.getItem(KEYS.chain) || '[]');
    if (!chain.length || chain[chain.length - 1] !== path) {
      chain.push(path);
      sessionStorage.setItem(KEYS.chain, JSON.stringify(chain.slice(-12)));
    }
  } catch (e) { /* ignore */ }
}

export function getChain() {
  try {
    return JSON.parse(sessionStorage.getItem(KEYS.chain) || '[]').slice(-12);
  } catch (e) { return []; }
}

/* ── Play click attribution snapshot ─────────────────────── */

export function buildPlaySnapshot({ gameId, gameName, playId, buttonEl, locationOnPage } = {}) {
  const first = getFirstTouch() || {};
  const last = getLastTouch() || {};
  const ref = classifyReferrer(document.referrer);

  let button = null, section = null, position = null;
  try {
    if (buttonEl) {
      button = (buttonEl.textContent || '').trim().slice(0, 40) || null;
      const card = buttonEl.closest('.game-card, .card, [data-game-id]');
      if (card) {
        section = (card.closest('[data-section], section, .games-grid')?.id) || null;
        const idEl = card.matches('[data-game-id]') ? card : card.querySelector('[data-game-id]');
        position = idEl ? Array.prototype.indexOf.call(idEl.parentElement.children, idEl) : null;
      }
    }
  } catch (e) { /* ignore */ }

  return {
    gameId: gameId || null,
    gameName: gameName || null,
    playId: playId || null,
    ts: Date.now(),
    clickPath: getChain(),
    clickPage: (window.location.pathname + window.location.search).slice(0, 240),
    referrerHost: ref.host,
    referrerPath: ref.path,
    referrerKind: ref.kind,
    source: last.source || null,
    medium: last.medium || null,
    campaign: last.campaign || null,
    term: last.term || null,
    content: last.content || null,
    clickId: last.clickId || null,
    firstTouchSource: first.source || null,
    firstTouchCampaign: first.campaign || null,
    firstTouchAt: first.at || null,
    button,
    section,
    position,
    locationOnPage: locationOnPage || null
  };
}

export function persistPendingPlay(snapshot) {
  try {
    sessionStorage.setItem(KEYS.pendingPlay, JSON.stringify(snapshot));
    localStorage.setItem(KEYS.lastPlay, JSON.stringify({ ...snapshot, at: Date.now() }));
  } catch (e) { /* ignore */ }
}

export function takePendingPlay() {
  try {
    const raw = sessionStorage.getItem(KEYS.pendingPlay);
    if (raw) sessionStorage.removeItem(KEYS.pendingPlay);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function getLastPlay() {
  try {
    const raw = localStorage.getItem(KEYS.lastPlay);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/* ── attribution summary stamped onto every event ────────── */

export function summaryProps() {
  const last = getLastTouch() || {};
  const first = getFirstTouch() || {};
  const out = {};
  if (last.source) out.source = last.source;
  if (last.medium) out.medium = last.medium;
  if (last.campaign) out.campaign = last.campaign;
  if (first.source) out.firstSource = first.source;
  if (first.campaign) out.firstCampaign = first.campaign;
  return out;
}

/* ── propagate attribution into the game URL ─────────────── */

export function attachGameParams(url, snapshot) {
  try {
    const u = new URL(url, window.location.origin);
    if (snapshot) {
      if (snapshot.sessionId) u.searchParams.set('gr_sid', String(snapshot.sessionId).slice(0, 40));
      if (snapshot.playId) u.searchParams.set('gr_pid', String(snapshot.playId).slice(0, 40));
      if (snapshot.gameId) u.searchParams.set('gr_gid', String(snapshot.gameId).slice(0, 60));
      if (snapshot.source) u.searchParams.set('gr_src', String(snapshot.source).slice(0, 100));
      if (snapshot.campaign) u.searchParams.set('gr_cmp', String(snapshot.campaign).slice(0, 100));
    }
    return u.toString();
  } catch (e) {
    return url;
  }
}

/* ── game-side: read gr_* params when the tracker runs inside a game page ── */

export function readGameParams() {
  const p = new URLSearchParams(window.location.search);
  const out = {};
  ['gr_sid', 'gr_pid', 'gr_gid', 'gr_src', 'gr_cmp'].forEach(k => {
    const v = p.get(k);
    if (v) out[k] = String(v).slice(0, 100);
  });
  return out;
}
