// analytics-collect — first-party analytics ingestion for GlitchRealm.
//
// Receives event batches from js/analytics (sendBeacon / fetch keepalive),
// validates + sanitizes them, filters bots, derives server-side facts
// (timestamp, UA, country) and writes to Firestore with the Admin SDK:
//
//   analytics_events/{autoId}   raw event log (all events)
//   event_daily/{day}_{name}    per-day per-event-name counters (rollup)
//   play_attribution/{autoId}   one doc per play_click with full snapshot
//   play_sessions/{playId}      one doc per play (doc id = client playId)
//   session_state/{sessionHash} session presence (lastSeen ping / endedAt)
//
// No client-side Firestore rules are needed for these collections — writes
// happen here with Admin credentials only.

import crypto from 'node:crypto';
import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'shared-sign-in';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const HAS_SERVICE_ACCOUNT = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

const MAX_EVENTS_PER_BATCH = 20;
const MAX_BODY_BYTES = 48 * 1024;
const MAX_MINUTE_EVENTS = 240; // per visitor+ip per minute (generous; heartbeats are 30s)

const EVENT_ALLOWLIST = new Set([
  'page_view', 'page_engagement', 'session_summary', 'search', 'search_no_result',
  'game_list_view', 'game_filter', 'game_page_view', 'play_click',
  'game_start', 'game_heartbeat', 'game_end', 'game_loaded', 'game_error',
  'wishlist_add', 'wishlist_remove', 'review_submit', 'review_vote',
  'newsletter_subscribe', 'push_opt_in', 'support_ticket', 'share_click',
  'outbound_click', 'error', 'web_vitals', 'navigation_timing',
  'session_ping', 'session_end',
  'game_launch', 'game_pause', 'game_resume', 'game_level_complete',
  'game_score', 'ad_request', 'ad_impression', 'ad_click', 'reward_shown'
]);

const STRING_PROPS = new Set(['gameId', 'gameName', 'source', 'medium', 'campaign', 'term',
  'content', 'clickId', 'firstTouchSource', 'firstTouchCampaign', 'button', 'section',
  'referrerHost', 'referrerPath', 'referrerKind', 'clickPage', 'playId', 'reason',
  'locationOnPage', 'message', 'stack', 'file', 'href', 'path', 'gameParam']);

const NUM_PROPS = new Set(['seconds', 'maxScrollPct', 'duration_s', 'playSeconds', 'gained',
  'pageviews', 'lcp', 'cls', 'inp', 'ttfb', 'domReady', 'load', 'position', 'firstTouchAt',
  'line', 'level_reached', 'score']);

let adminApp = null;
let lastSaltDay = null;
let ipSalt = null;

function getAdminDb() {
  if (!HAS_SERVICE_ACCOUNT) return null;
  if (!adminApp) {
    try {
      const serviceAccount = {
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      };
      adminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: FIREBASE_PROJECT_ID });
    } catch (e) {
      console.error('[analytics-collect] admin init failed:', e.message);
      return null;
    }
  }
  return admin.firestore(adminApp);
}

function corsHeaders(origin) {
  const wildcard = ALLOWED_ORIGINS.length === 0;
  const allow = wildcard ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function hashKey(value, salt) {
  return crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex').slice(0, 24);
}

function utcDay(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
}

function isBot(ua) {
  if (!ua) return true;
  const u = ua.toLowerCase();
  return /(bot|crawler|spider|crawling|headless|phantom|slurp|bingpreview|facebookexternalhit|lighthouse|pagespeed|curl\/|wget|python-requests|scrapy)/.test(u);
}

function sanitizeString(v, max = 240) {
  return String(v).slice(0, max);
}

function sanitizeProps(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw)) {
    if (STRING_PROPS.has(key) && (typeof value === 'string' || typeof value === 'number')) {
      out[key] = sanitizeString(value, 240);
    } else if (NUM_PROPS.has(key) && typeof value === 'number' && Number.isFinite(value)) {
      out[key] = Math.max(-1, Math.min(86400, Math.round(value * 1000) / 1000));
    } else if (key === 'clickPath' && Array.isArray(value)) {
      out.clickPath = value.slice(0, 12).map(p => sanitizeString(p, 240));
    } else if (key === 'attribution' && value && typeof value === 'object') {
      out.attribution = {
        source: sanitizeString(value.source || '', 100) || null,
        medium: sanitizeString(value.medium || '', 100) || null,
        campaign: sanitizeString(value.campaign || '', 100) || null,
        referrerHost: sanitizeString(value.referrerHost || '', 100) || null,
        clickPage: sanitizeString(value.clickPage || '', 240) || null
      };
    } else if (key === 'params' && value && typeof value === 'object') {
      const params = {};
      for (const [pk, pv] of Object.entries(value).slice(0, 16)) {
        if (/^(utm_|ref$|source$|via$|from$|gclid|fbclid|msclkid|ttclid|twclid|dclid|igshid)/.test(pk)) {
          params[sanitizeString(pk, 24)] = sanitizeString(pv, 80);
        }
      }
      if (Object.keys(params).length) out.params = params;
    }
  }
  return out;
}

function sanitizeEvent(raw, salt) {
  if (!raw || typeof raw !== 'object') return null;
  const name = sanitizeString(raw.name, 60);
  if (!EVENT_ALLOWLIST.has(name)) return null;

  const ts = typeof raw.ts === 'number' && raw.ts > 0 && raw.ts < Date.now() + 60000 ? raw.ts : Date.now();

  const ev = {
    name,
    ts: new Date(ts),
    serverTs: admin.firestore.FieldValue.serverTimestamp(),
    day: utcDay(new Date(ts)),
    visitorHash: raw.visitorId ? hashKey(String(raw.visitorId).slice(0, 80), salt) : null,
    sessionHash: raw.sessionId ? hashKey(String(raw.sessionId).slice(0, 80), salt) : null,
    userId: raw.userId ? sanitizeString(raw.userId, 60) : null,
    path: sanitizeString(raw.path || '', 300) || null,
    origin: sanitizeString(raw.origin || '', 120) || null,
    referrer: raw.referrer ? sanitizeString(raw.referrer, 300) : null,
    title: raw.title ? sanitizeString(raw.title, 160) : null,
    props: sanitizeProps(raw.props)
  };

  if (raw.env && typeof raw.env === 'object') {
    ev.env = {
      lang: sanitizeString(raw.env.lang || '', 12) || null,
      tz: sanitizeString(raw.env.tz || '', 48) || null,
      screen: sanitizeString(raw.env.screen || '', 12) || null,
      dpr: typeof raw.env.dpr === 'number' ? raw.env.dpr : null
    };
  }

  if (name === 'play_click') ev.playId = sanitizeString(raw.props && raw.props.playId, 40) || null;
  if (name === 'game_start' || name === 'game_end') ev.playId = sanitizeString(raw.props && raw.props.playId, 40) || null;
  if (name === 'game_heartbeat') ev.playId = sanitizeString(raw.props && raw.props.playId, 40) || null;

  return ev;
}

async function checkRate(db, identity, dayHour) {
  try {
    const ref = db.collection('analytics_rate_limits').doc(`${identity}:${dayHour}`);
    const snap = await ref.get();
    const count = Number(snap.data()?.count || 0);
    if (count >= MAX_MINUTE_EVENTS) return false;
    await ref.set({
      count: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  } catch (e) {
    return true; // fail open — analytics, not security-critical
  }
}

export default async (request, context) => {
  const origin = request.headers.get('origin') || '';
  const cors = corsHeaders(origin);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
  if (!HAS_SERVICE_ACCOUNT) {
    return new Response(JSON.stringify({ error: 'storage_unavailable' }), {
      status: 503, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  // rotating daily salt for ip/identity hashing
  const today = utcDay();
  if (ipSalt === null || lastSaltDay !== today) {
    ipSalt = crypto.createHash('sha256')
      .update(`${process.env.ANALYTICS_IP_SALT || FIREBASE_PROJECT_ID}:${today}`)
      .digest('hex');
    lastSaltDay = today;
  }

  const ua = request.headers.get('user-agent') || '';
  if (isBot(ua)) return new Response(null, { status: 204, headers: cors });

  const country = context.geo?.country?.code || request.headers.get('x-country') || null;

  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413, headers: cors });
    body = JSON.parse(raw);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS_PER_BATCH) : [];
  if (!events.length) return new Response(null, { status: 204, headers: cors });

  const db = getAdminDb();
  if (!db) {
    return new Response(JSON.stringify({ error: 'storage_unavailable' }), {
      status: 503, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  const clientIp = request.headers.get('x-nf-client-connection-ip') || '';
  const minute = new Date().toISOString().slice(0, 16);
  const identity = hashKey(clientIp, ipSalt).slice(0, 12);
  const allowed = await checkRate(db, identity, minute.replace(/[-:T]/g, ''));
  if (!allowed) return new Response(null, { status: 204, headers: cors });

  const batch = db.batch();
  let writeCount = 0;

  for (const rawEvent of events) {
    const ev = sanitizeEvent(rawEvent, ipSalt);
    if (!ev) continue;

    ev.ua = ua.slice(0, 180);
    ev.country = country;
    ev.ipHash = identity;

    batch.set(db.collection('analytics_events').doc(), ev);
    writeCount++;

    // per-day, per-name counter rollup
    batch.set(db.collection('event_daily').doc(`${ev.day}_${ev.name}`), {
      day: ev.day, name: ev.name,
      count: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const props = ev.props || {};

    // session presence: 60s pings keep lastSeen fresh; session_end (sent when
    // the tab closes/navigates away) stamps endedAt so live reports can drop
    // closed tabs immediately
    if ((ev.name === 'session_ping' || ev.name === 'session_end') && ev.sessionHash) {
      const sessionDoc = {
        sessionHash: ev.sessionHash,
        visitorHash: ev.visitorHash || null,
        day: ev.day,
        lastSeen: ev.ts
      };
      if (ev.name === 'session_end') sessionDoc.endedAt = ev.ts;
      batch.set(db.collection('session_state').doc(ev.sessionHash), sessionDoc, { merge: true });
      writeCount++;
    }

    // heartbeats keep the running play duration fresh even if game_end is lost
    if (ev.name === 'game_heartbeat' && ev.playId) {
      batch.set(db.collection('play_sessions').doc(String(ev.playId).slice(0, 60)), {
        playSeconds: typeof props.playSeconds === 'number' ? props.playSeconds : null,
        lastBeatAt: ev.ts
      }, { merge: true });
      writeCount++;
    }

    if (ev.name === 'play_click') {
      batch.set(db.collection('play_attribution').doc(), {
        playId: ev.playId || null,
        gameId: props.gameId || null,
        gameName: props.gameName || null,
        visitorHash: ev.visitorHash,
        sessionHash: ev.sessionHash,
        userId: ev.userId,
        ts: ev.ts,
        day: ev.day,
        clickPage: props.clickPage || null,
        clickPath: props.clickPath || null,
        source: props.source || null,
        medium: props.medium || null,
        campaign: props.campaign || null,
        term: props.term || null,
        content: props.content || null,
        clickId: props.clickId || null,
        firstTouchSource: props.firstTouchSource || null,
        firstTouchCampaign: props.firstTouchCampaign || null,
        referrerHost: props.referrerHost || null,
        referrerKind: props.referrerKind || null,
        button: props.button || null,
        section: props.section || null,
        position: props.position ?? null,
        country: country
      });
      writeCount++;
    }

    if (ev.name === 'game_start') {
      const playId = ev.playId || `${ev.sessionHash || 'anon'}_${Date.now()}`;
      batch.set(db.collection('play_sessions').doc(playId), {
        playId,
        gameId: props.gameId || null,
        gameName: props.gameName || null,
        visitorHash: ev.visitorHash,
        sessionHash: ev.sessionHash,
        userId: ev.userId,
        startedAt: ev.ts,
        day: ev.day,
        attribution: props.attribution || null,
        source: props.attribution?.source || null,
        duration_s: null,
        endedAt: null,
        endReason: null
      }, { merge: true });
      writeCount++;
    }

    if (ev.name === 'game_end') {
      const playId = ev.playId;
      if (playId) {
        batch.set(db.collection('play_sessions').doc(String(playId).slice(0, 60)), {
          endedAt: ev.ts,
          duration_s: typeof props.duration_s === 'number' ? props.duration_s : null,
          endReason: props.reason || null
        }, { merge: true });
        writeCount++;
      }
      // also roll up play seconds per game per day
      if (props.gameId) {
        batch.set(db.collection('play_daily').doc(`${ev.day}_${String(props.gameId).slice(0, 60)}`), {
          day: ev.day, gameId: String(props.gameId).slice(0, 60),
          seconds: admin.firestore.FieldValue.increment(Math.max(0, Math.round(Number(props.duration_s) || 0))),
          plays: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        writeCount++;
      }
    }
  }

  try {
    if (writeCount > 0) await batch.commit();
  } catch (e) {
    console.error('[analytics-collect] batch commit failed:', e.message);
    return new Response(JSON.stringify({ error: 'storage_error' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  return new Response(null, { status: 204, headers: cors });
};
