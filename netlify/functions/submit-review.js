// submit-review — server-side review intake for GlitchRealm.
//
// Replaces direct client writes to the `reviews` collection. Every submission:
//   1. Is authenticated via a Firebase ID token (silent anonymous sign-in or a
//      regular account — no sign-in button needed).
//   2. Passes honeypot + schema validation.
//   3. Is rate limited per user and per IP.
//   4. Runs through the advanced word filter (netlify/functions/lib/content-filter.mjs).
//   5. Runs through AI moderation (Netlify AI Gateway) when a comment is present.
//   6. Is written to Firestore with the Admin SDK (bypasses security rules, so
//      direct client writes to `reviews` are disabled in the rules).

import crypto from 'node:crypto';
import admin from 'firebase-admin';
import { createContentFilter } from './lib/content-filter.mjs';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'shared-sign-in';
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

const HAS_SERVICE_ACCOUNT = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

// Rate limits
const MIN_INTERVAL_MS = 20 * 1000;        // per user: min time between reviews
const USER_DAILY_LIMIT = 5;               // per user: max reviews per UTC day
const IP_HOURLY_LIMIT = 10;               // per IP: max reviews per UTC hour
const IP_DAILY_LIMIT = 25;                // per IP: max reviews per UTC day

// AI moderation — NVIDIA's dedicated content-safety classifier, served
// through the site's Netlify AI Gateway proxy (all models under /api/v1).
const AI_MODEL = 'nvidia/nemotron-3.5-content-safety';
const AI_TIMEOUT_MS = 12000;

let adminApp;

function getAdminDb() {
  if (!HAS_SERVICE_ACCOUNT) return null;
  if (!adminApp) {
    const serviceAccount = {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
    adminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: FIREBASE_PROJECT_ID });
  }
  return admin.firestore(adminApp);
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.length === 0 ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function json(statusCode, body, origin) {
  // This function runs on the v2 runtime (ES module export), which requires a
  // web Response — returning a legacy { statusCode, body } object causes a 502.
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
  });
}

function hashKey(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

function utcBuckets(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
  const hour = `${day}T${pad(now.getUTCHours())}`;
  return { day, hour };
}

async function verifyIdToken(idToken) {
  const db = getAdminDb();
  if (db) {
    try {
      const decoded = await admin.auth(adminApp).verifyIdToken(String(idToken), true);
      return { uid: decoded.uid, name: decoded.name || null, email: decoded.email || null, provider: decoded.firebase?.sign_in_provider || 'unknown' };
    } catch (err) {
      return null;
    }
  }
  // Fallback: verify through the Identity Toolkit REST API (no service account).
  try {
    const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const user = data.users && data.users[0];
    if (!user) return null;
    return {
      uid: user.localId,
      name: user.displayName || null,
      email: user.email || null,
      provider: user.providerUserInfo?.[0]?.providerId || 'anonymous'
    };
  } catch {
    return null;
  }
}

async function checkRateLimits(db, uid, ip) {
  if (!db) return { ok: true }; // No storage available: fail open (filter + AI still apply)
  const now = Date.now();
  const { day, hour } = utcBuckets(new Date(now));
  const counters = [];

  if (uid) {
    counters.push({ id: `user:${hashKey(uid)}:${day}`, max: USER_DAILY_LIMIT });
    counters.push({ id: `usergap:${hashKey(uid)}`, minGap: true });
  }
  if (ip) {
    counters.push({ id: `ip:${hashKey(ip)}:${hour}`, max: IP_HOURLY_LIMIT });
    counters.push({ id: `ip:${hashKey(ip)}:${day}`, max: IP_DAILY_LIMIT });
  }

  for (const counter of counters) {
    const ref = db.collection('review_rate_limits').doc(counter.id);
    const snap = await ref.get();
    const data = snap.data() || {};

    if (counter.minGap) {
      const lastAt = Number(data.lastAt || 0);
      if (lastAt && now - lastAt < MIN_INTERVAL_MS) {
        return { ok: false, reason: 'Please wait a moment before submitting another review.' };
      }
      continue;
    }

    if (Number(data.count || 0) >= counter.max) {
      return { ok: false, reason: 'You have submitted too many reviews recently. Please try again later.' };
    }
  }

  return { ok: true, counters };
}

async function recordRateLimits(db, counters) {
  if (!db || !counters) return;
  const now = Date.now();
  for (const counter of counters) {
    const ref = db.collection('review_rate_limits').doc(counter.id);
    if (counter.minGap) {
      await ref.set({ lastAt: now, scope: 'user-min-gap' }, { merge: true });
    } else {
      await ref.set({
        count: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }
}

async function loadModerationConfig(db) {
  const defaults = { bannedWords: [], suspiciousWords: [], bannedPatterns: [], aiModerationEnabled: true };
  if (!db) return defaults;
  try {
    const snap = await db.collection('moderation_config').doc('filters').get();
    if (!snap.exists) return defaults;
    const data = snap.data() || {};
    return {
      bannedWords: Array.isArray(data.bannedWords) ? data.bannedWords : [],
      suspiciousWords: Array.isArray(data.suspiciousWords) ? data.suspiciousWords : [],
      bannedPatterns: Array.isArray(data.bannedPatterns) ? data.bannedPatterns : [],
      aiModerationEnabled: data.aiModerationEnabled !== false
    };
  } catch {
    return defaults;
  }
}

async function runAiModeration(comment) {
  const gatewayUrl = (process.env.NETLIFY_AI_GATEWAY_URL || '').replace(/\/$/, '');
  const gatewayKey = process.env.NETLIFY_AI_GATEWAY_KEY;
  if (!gatewayUrl || !gatewayKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const resp = await fetch(`${gatewayUrl}/api/v1/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayKey}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        // This is a reasoning model: internal reasoning consumes output tokens
        // before the final verdict, so the budget must be generous or the
        // response comes back with `content: null`.
        max_tokens: 2000,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `Task: classify the following user-submitted game review for content safety violations (hate speech, harassment, sexual content, violence, self-harm, or severe profanity). The review is gameplay feedback for a browser gaming platform, so references to in-game combat, difficulty, or frustration are expected and acceptable. Reply with exactly one word, "safe" or "unsafe".\n\nReview:\n${comment}`
          }
        ]
      })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = String(
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ''
    ).toLowerCase();

    // Content-safety models emit "safe" or "unsafe" (sometimes followed by
    // policy category labels). Parse defensively.
    const unsafeMatch = text.match(/\bunsafe\b/);
    const safeMatch = text.match(/\bsafe\b/);
    if (unsafeMatch && (!safeMatch || text.indexOf('unsafe') < text.indexOf('safe'))) {
      return { verdict: 'block', reason: `content safety violation (${AI_MODEL})` };
    }
    if (safeMatch) {
      return { verdict: 'approve', reason: `content safety: safe (${AI_MODEL})` };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default async (req, context) => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, origin);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' }, origin);
  }

  // Honeypot: bots filling hidden fields get a fake success, nothing is stored.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json(200, { status: 'pending', reason: 'Review received.' }, origin);
  }

  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  const gameId = typeof body.gameId === 'string' ? body.gameId.trim().slice(0, 100) : '';
  const gameName = typeof body.gameName === 'string' ? body.gameName.trim().slice(0, 100) : '';
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : '';
  const rating = Number(body.rating);
  const userDisplayName = typeof body.userDisplayName === 'string' ? body.userDisplayName.trim().slice(0, 50) : '';
  const authorPhotoUrl = typeof body.authorPhotoUrl === 'string' ? body.authorPhotoUrl.trim().slice(0, 2000) : '';

  if (!idToken) return json(401, { error: 'Authentication required' }, origin);
  if (!gameId) return json(400, { error: 'gameId is required' }, origin);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json(400, { error: 'rating must be an integer between 1 and 5' }, origin);

  const identity = await verifyIdToken(idToken);
  if (!identity) return json(401, { error: 'Invalid or expired session token' }, origin);

  const db = getAdminDb();

  const ip = context && context.ip ? context.ip : (req.headers.get('x-nf-client-connection-ip') || '');
  const limits = await checkRateLimits(db, identity.uid, ip);
  if (!limits.ok) {
    return json(429, { error: limits.reason }, origin);
  }

  // Layer 1-2: word filter (defaults + admin-managed config).
  const config = await loadModerationConfig(db);
  const filter = createContentFilter(config);
  const filterResult = filter.check(comment);

  // Layer 3: AI moderation (only when there is something to moderate).
  let aiVerdict = null;
  let moderationStatus;
  let reason;

  if (filterResult.status === 'blocked') {
    return json(200, { status: 'blocked', reason: filterResult.reason }, origin);
  } else if (comment && config.aiModerationEnabled) {
    aiVerdict = await runAiModeration(comment);
    if (aiVerdict) {
      if (aiVerdict.verdict === 'block') {
        return json(200, { status: 'blocked', reason: aiVerdict.reason || 'content blocked by moderation' }, origin);
      }
      moderationStatus = aiVerdict.verdict === 'flag' ? 'pending' : 'approved';
      reason = `${aiVerdict.reason} (AI moderation)`;
    }
  }

  if (!moderationStatus) {
    moderationStatus = filterResult.status;
    reason = filterResult.reason;
  }

  const isGuest = identity.provider === 'anonymous' || !identity.email;
  const displayName = (userDisplayName || identity.name || (identity.email ? identity.email.split('@')[0] : '') || 'Guest').slice(0, 50);

  const review = {
    gameId,
    gameName,
    rating,
    comment,
    moderationStatus,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    userId: identity.uid,
    userDisplayName: displayName,
    authorPhotoUrl: authorPhotoUrl || 'assets/icons/anonymous.png',
    reason: String(reason).slice(0, 200),
    isGuest,
    authProvider: identity.provider,
    moderationSource: aiVerdict ? 'ai+filter' : 'filter',
    aiVerdict,
    clientIpHash: ip ? hashKey(ip) : null
  };

  let reviewId = null;
  if (db) {
    try {
      const docRef = await db.collection('reviews').add(review);
      reviewId = docRef.id;
    } catch (err) {
      return json(500, { error: 'Could not save your review. Please try again later.' }, origin);
    }
  } else {
    return json(500, { error: 'Review storage is not configured. Please try again later.' }, origin);
  }

  await recordRateLimits(db, limits.counters);

  return json(200, { status: moderationStatus, reason, id: reviewId }, origin);
};
