// analytics-query — admin-protected reporting API for GlitchRealm's own
// analytics data (fed by analytics-collect).
//
// Auth: Firebase ID token (Authorization: Bearer <token>) whose uid is in the
// admin/developer UID list (env GLITCHREALM_ADMIN_UIDS + fallbacks).
//
// Reports (GET ?report=<name>&days=<7|30|90>&gameId=<id>):
//   overview     headline KPIs for the range
//   timeseries   per-day pageviews / unique visitors / plays / playtime
//   top-games    plays + playtime per game (play_daily)
//   attribution  play sources grouped by source / medium / campaign / referrer
//   referrers    page_view referrer hosts
//   pages        top paths by views
//   errors       recent error events
//   live         active visitors/sessions (drop tabs as soon as they close)
//   recent       last N raw events (debug)
//
// Storage: Firestore collections fed by analytics-collect — analytics_events,
// event_daily, play_attribution, play_sessions, play_daily, session_state.
//
// The admin.glitchrealm.ca dashboard consumes this API.

import crypto from 'node:crypto';
import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'shared-sign-in';
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ';
const HAS_SERVICE_ACCOUNT = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

const FALLBACK_ADMINS = [
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
];

const RAW_SCAN_LIMIT = 2000; // bounded raw scan per report
const SCAN_PAGE_SIZE = 1000; // Firestore caps a single get() page
const MAX_DAYS = 90;

let adminApp = null;

function getAdmin() {
  if (!HAS_SERVICE_ACCOUNT) return null;
  if (!adminApp) {
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        projectId: FIREBASE_PROJECT_ID
      });
    } catch (e) {
      console.error('[analytics-query] admin init failed:', e.message);
      return null;
    }
  }
  return adminApp;
}

function allowedUids() {
  const env = (process.env.GLITCHREALM_ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
  return Array.from(new Set([...env, ...FALLBACK_ADMINS]));
}

async function verifyToken(idToken) {
  const app = getAdmin();
  if (app) {
    try {
      const decoded = await admin.auth(app).verifyIdToken(String(idToken), true);
      return { uid: decoded.uid };
    } catch (e) {
      return null;
    }
  }
  // no service account: REST fallback
  try {
    const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.users && data.users[0] ? { uid: data.users[0].localId } : null;
  } catch (e) {
    return null;
  }
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function json(body, status = 200, origin = '*') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function dayKey(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function rangeStart(days) {
  const n = Math.max(1, Math.min(MAX_DAYS, Number(days) || 7));
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (n - 1));
  return { start, n };
}

async function scanEvents(db, { names, since, gameId, limit = RAW_SCAN_LIMIT }) {
  // Firestore needs a composite index to combine an equality/in filter on one
  // field with a range filter on another (e.g. name + ts), which caused 500s.
  // Instead: scan by ts range only (single-field index, most recent first),
  // page through, and apply name/gameId filters in memory.
  const want = Math.max(1, Math.min(limit, RAW_SCAN_LIMIT));
  const out = [];
  let query = db.collection('analytics_events')
    .where('ts', '>=', since)
    .orderBy('ts', 'desc')
    .limit(SCAN_PAGE_SIZE);
  let cursor = null;
  while (out.length < want) {
    let snap;
    try {
      snap = cursor ? await query.startAfter(cursor).get() : await query.get();
    } catch (e) {
      break; // tolerate storage hiccups — partial data beats a 500
    }
    const docs = snap.docs;
    if (!docs.length) break;
    for (const d of docs) {
      const data = d.data();
      if (names && names.length && !names.includes(data.name)) continue;
      if (gameId && data.props?.gameId !== gameId) continue;
      out.push(data);
      if (out.length >= want) break;
    }
    if (docs.length < SCAN_PAGE_SIZE) break;
    cursor = docs[docs.length - 1];
  }
  return out;
}

function tsMillis(v) {
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (v && typeof v.seconds === 'number') return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function groupCount(items, keyFn) {
  const out = {};
  for (const it of items) {
    const k = keyFn(it) || '(none)';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function topN(obj, n = 15) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

async function reportOverview(db, { since, days, gameId }) {
  const evs = await scanEvents(db, { since, gameId });
  const visitors = new Set();
  const sessions = new Set();
  let pageviews = 0, plays = 0, playClicks = 0, errors = 0, newsletter = 0;
  const perDayVisitors = {};
  const perDayPageviews = {};
  const perDayPlays = {};
  for (const ev of evs) {
    const day = ev.day || dayKey(new Date(ev.ts?.toMillis ? ev.ts.toMillis() : ev.ts));
    if (ev.visitorHash) visitors.add(ev.visitorHash);
    if (ev.sessionHash) sessions.add(ev.sessionHash);
    if (ev.name === 'page_view') { pageviews++; perDayPageviews[day] = (perDayPageviews[day] || 0) + 1; }
    if (ev.name === 'play_click') { playClicks++; perDayPlays[day] = (perDayPlays[day] || 0) + 1; }
    if (ev.name === 'game_start') { plays++; perDayPlays[day] = (perDayPlays[day] || 0) + 1; }
    if (ev.name === 'error' || ev.name === 'game_error') errors++;
    if (ev.name === 'newsletter_subscribe') newsletter++;
    if (ev.visitorHash) perDayVisitors[day] = perDayVisitors[day] || new Set(), perDayVisitors[day].add(ev.visitorHash);
  }
  // playtime from play_daily rollups
  const playDaily = await db.collection('play_daily').where('day', '>=', dayKey(since)).get();
  let playtime = 0;
  const playtimeByGame = {};
  playDaily.forEach(d => {
    const data = d.data();
    if (gameId && data.gameId !== gameId) return;
    playtime += Number(data.seconds || 0);
    playtimeByGame[data.gameId] = (playtimeByGame[data.gameId] || 0) + Number(data.seconds || 0);
  });

  const timeseries = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - i);
    const day = dayKey(d);
    timeseries.push({
      day,
      pageviews: perDayPageviews[day] || 0,
      visitors: perDayVisitors[day] ? perDayVisitors[day].size : 0,
      plays: perDayPlays[day] || 0
    });
  }

  return {
    days,
    pageviews, visitors: visitors.size, sessions: sessions.size,
    playClicks, plays, playtime_s: Math.round(playtime),
    errors, newsletter,
    playtimeByGame: topN(playtimeByGame, 20),
    timeseries
  };
}

async function reportTimeseries(db, { since, days }) {
  const o = await reportOverview(db, { since, days });
  return { days, timeseries: o.timeseries };
}

async function reportTopGames(db, { since, days }) {
  const snap = await db.collection('play_daily').where('day', '>=', dayKey(since)).get();
  const games = {};
  snap.forEach(d => {
    const { gameId, seconds, plays } = d.data();
    if (!games[gameId]) games[gameId] = { gameId, plays: 0, seconds: 0 };
    games[gameId].plays += Number(plays || 0);
    games[gameId].seconds += Number(seconds || 0);
  });
  const rows = Object.values(games).sort((a, b) => b.plays - a.plays);
  return { days, games: rows };
}

async function reportAttribution(db, { since, gameId }) {
  // scan by ts range only (single-field index, newest first) and filter
  // gameId in memory — equality + range across fields needs a composite index
  const rows = [];
  let cursor = null;
  while (rows.length < RAW_SCAN_LIMIT) {
    let snap;
    try {
      let q = db.collection('play_attribution').where('ts', '>=', since).orderBy('ts', 'desc').limit(SCAN_PAGE_SIZE);
      if (cursor) q = q.startAfter(cursor);
      snap = await q.get();
    } catch (e) {
      break; // partial data beats a 500
    }
    const docs = snap.docs;
    if (!docs.length) break;
    for (const d of docs) {
      const data = d.data();
      if (gameId && data.gameId !== gameId) continue;
      rows.push(data);
      if (rows.length >= RAW_SCAN_LIMIT) break;
    }
    if (docs.length < SCAN_PAGE_SIZE) break;
    cursor = docs[docs.length - 1];
  }
  const bySource = groupCount(rows, r => r.source);
  const byMedium = groupCount(rows, r => r.medium);
  const byCampaign = groupCount(rows, r => r.campaign);
  const byReferrerKind = groupCount(rows, r => r.referrerKind);
  const byFirstTouch = groupCount(rows, r => r.firstTouchSource);
  return {
    total: rows.length,
    bySource: topN(bySource),
    byMedium: topN(byMedium),
    byCampaign: topN(byCampaign, 20),
    byReferrerKind: topN(byReferrerKind),
    byFirstTouch: topN(byFirstTouch)
  };
}

async function reportReferrers(db, { since }) {
  const evs = await scanEvents(db, { names: ['page_view'], since });
  const hosts = groupCount(evs, ev => {
    const r = ev.referrer || '';
    try { return r ? new URL(r).hostname : 'direct'; } catch (e) { return r.slice(0, 60); }
  });
  return { total: evs.length, referrers: topN(hosts) };
}

async function reportPages(db, { since }) {
  const evs = await scanEvents(db, { names: ['page_view'], since });
  const paths = groupCount(evs, ev => (ev.path || '/').split('?')[0]);
  // engagement seconds per path
  const eng = {};
  const evs2 = await scanEvents(db, { names: ['page_engagement'], since });
  for (const ev of evs2) {
    const p = (ev.path || '/').split('?')[0];
    eng[p] = (eng[p] || 0) + (ev.props?.seconds || 0);
  }
  return {
    pages: topN(paths).map(p => ({ ...p, engaged_s: Math.round(eng[p.key] || 0) }))
  };
}

async function reportErrors(db, { since }) {
  const evs = await scanEvents(db, { names: ['error', 'game_error'], since, limit: 200 });
  return {
    count: evs.length,
    recent: evs.slice(0, 50).map(ev => ({
      ts: ev.ts, name: ev.name, path: ev.path,
      message: ev.props?.message || null, file: ev.props?.file || null,
      line: Number.isFinite(ev.props?.line) ? ev.props.line : null
    }))
  };
}

async function reportLive(db) {
  const now = Date.now();
  const fiveMinAgo = new Date(now - 5 * 60 * 1000);
  const tenMinAgo = new Date(now - 10 * 60 * 1000);

  const recent = await scanEvents(db, { since: fiveMinAgo, limit: 1000 });

  // sessions seen in the last 5 minutes
  const sessions = new Map(); // sessionHash -> { visitorHash, lastEventMs }
  for (const ev of recent) {
    if (!ev.sessionHash) continue;
    const s = sessions.get(ev.sessionHash) || { visitorHash: null, lastEventMs: 0 };
    if (!s.visitorHash && ev.visitorHash) s.visitorHash = ev.visitorHash;
    s.lastEventMs = Math.max(s.lastEventMs, tsMillis(ev.ts));
    sessions.set(ev.sessionHash, s);
  }

  // session_state is written by analytics-collect: a 60s presence ping keeps
  // lastSeen fresh, and an explicit endedAt is written when the tab closes —
  // so closed tabs leave the "active" counts immediately instead of after a
  // decaying time window.
  const hashes = Array.from(sessions.keys()).slice(0, 500);
  const stateByHash = new Map();
  for (let i = 0; i < hashes.length; i += 50) {
    const chunk = hashes.slice(i, i + 50);
    try {
      const snaps = await Promise.all(chunk.map(h => db.collection('session_state').doc(h).get()));
      snaps.forEach((snap, j) => { if (snap.exists) stateByHash.set(chunk[j], snap.data()); });
    } catch (e) { /* fall back to event-window heuristics */ }
  }

  const ACTIVE_FRESH_MS = 3 * 60 * 1000;
  const activeSessions = new Set();
  for (const [hash, s] of sessions) {
    const st = stateByHash.get(hash);
    const lastSeen = st && st.lastSeen ? tsMillis(st.lastSeen) : s.lastEventMs;
    const ended = st && st.endedAt ? tsMillis(st.endedAt) : 0;
    const active = lastSeen >= now - ACTIVE_FRESH_MS && (!ended || lastSeen > ended + 30 * 1000);
    if (active) activeSessions.add(hash);
  }

  const activeVisitors = new Set();
  for (const [hash, s] of sessions) {
    if (!s.visitorHash) continue;
    if (activeSessions.has(hash)) activeVisitors.add(s.visitorHash);
  }

  // plays started in the last 10 minutes that haven't ended (and whose
  // session is still live) count as active
  let activePlays = [];
  try {
    const psSnap = await db.collection('play_sessions')
      .where('startedAt', '>=', tenMinAgo).orderBy('startedAt', 'desc').limit(50).get();
    activePlays = psSnap.docs
      .map(d => d.data())
      .filter(s => !s.endedAt && (!s.sessionHash || activeSessions.has(s.sessionHash)))
      .map(s => ({
        gameId: s.gameId || null,
        gameName: s.gameName || null,
        startedAt: s.startedAt,
        source: s.source || null,
        playSeconds: Number.isFinite(s.playSeconds) ? s.playSeconds : null
      }));
  } catch (e) { /* live panel degrades gracefully */ }

  return {
    visitorsLast5Min: activeVisitors.size,
    activeVisitors: activeVisitors.size,
    activeSessions: activeSessions.size,
    recentEvents: recent.length,
    activePlays
  };
}

async function reportRecent(db, { since }) {
  const evs = await scanEvents(db, { since, limit: 200 });
  return { events: evs };
}

export default async (request) => {
  const origin = request.headers.get('origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, origin);

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return json({ error: 'unauthorized' }, 401, origin);

  const user = await verifyToken(token);
  if (!user) return json({ error: 'unauthorized' }, 401, origin);
  if (!allowedUids().includes(user.uid)) return json({ error: 'forbidden' }, 403, origin);

  const app = getAdmin();
  if (!app) return json({ error: 'storage_unavailable' }, 503, origin);
  const db = admin.firestore(app);

  const url = new URL(request.url);
  const report = url.searchParams.get('report') || 'overview';
  const days = Number(url.searchParams.get('days') || 7);
  const gameId = url.searchParams.get('gameId') || null;
  const { start: since } = rangeStart(days);
  const nDays = Math.max(1, Math.min(MAX_DAYS, days));

  try {
    let body;
    switch (report) {
      case 'overview': body = await reportOverview(db, { since, days: nDays, gameId }); break;
      case 'timeseries': body = await reportTimeseries(db, { since, days: nDays }); break;
      case 'top-games': body = await reportTopGames(db, { since, days: nDays }); break;
      case 'attribution': body = await reportAttribution(db, { since, gameId }); break;
      case 'referrers': body = await reportReferrers(db, { since }); break;
      case 'pages': body = await reportPages(db, { since }); break;
      case 'errors': body = await reportErrors(db, { since }); break;
      case 'live': body = await reportLive(db); break;
      case 'recent': body = await reportRecent(db, { since }); break;
      default: return json({ error: 'unknown_report' }, 400, origin);
    }
    return json({ ok: true, report, generatedAt: new Date().toISOString(), ...body }, 200, origin);
  } catch (e) {
    console.error('[analytics-query] report failed:', e.message);
    return json({ error: 'report_failed', detail: e.message }, 500, origin);
  }
};
