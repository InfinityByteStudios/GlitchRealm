// analytics-cleanup — scheduled retention job for GlitchRealm's analytics data.
//
// Docs for this were "TBD" (see docs/ANALYTICS_SYSTEM.md): without it the
// raw-event log and presence collections grow without bound. Netlify runs this
// daily via `config.schedule`; no cron service or external trigger needed.
//
// What it deletes (oldest first, batched, resumable across runs):
//   analytics_events    older than 90 days (raw event log)
//   play_attribution    older than 90 days (per play_click snapshots)
//   session_state       lastSeen older than 30 days (presence docs)
//   analytics_rate_limits updatedAt older than 2 days (per identity:minute docs)
//
// Kept forever (small rollups, used by every report):
//   event_daily, play_daily, play_sessions
//
// To run it locally / manually: `netlify functions:invoke analytics-cleanup`
// (invocations go through the same handler).

import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'shared-sign-in';
const HAS_SERVICE_ACCOUNT = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

// retention windows, days
const RAW_EVENT_DAYS = 90;
const ATTRIBUTION_DAYS = 90;
const SESSION_STATE_DAYS = 30;
const RATE_LIMIT_DAYS = 2;

// Firestore batches cap at 500 ops; stay well under per loop iteration
const BATCH_SIZE = 300;
const MAX_BATCHES_PER_RUN = 40; // ~12k docs per daily run, then continues next day

let adminApp = null;

function getAdminDb() {
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
      console.error('[analytics-cleanup] admin init failed:', e.message);
      return null;
    }
  }
  return admin.firestore(adminApp);
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// Deletes docs older than `cutoff` using `tsField` for ordering, bounded by
// MAX_BATCHES_PER_RUN so one invocation never times out. Returns count deleted.
async function deleteOld(db, collection, tsField, cutoff) {
  let deleted = 0;
  for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
    let snap;
    try {
      snap = await db.collection(collection)
        .where(tsField, '<', cutoff)
        .orderBy(tsField, 'asc')
        .limit(BATCH_SIZE)
        .get();
    } catch (e) {
      console.error(`[analytics-cleanup] query failed on ${collection}:`, e.message);
      break;
    }
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    try {
      await batch.commit();
      deleted += snap.size;
    } catch (e) {
      console.error(`[analytics-cleanup] delete failed on ${collection}:`, e.message);
      break;
    }
    if (snap.size < BATCH_SIZE) break;
  }
  return deleted;
}

async function runCleanup() {
  const db = getAdminDb();
  if (!db) return { error: 'storage_unavailable' };

  const summary = {};
  summary.analytics_events = await deleteOld(db, 'analytics_events', 'ts', daysAgo(RAW_EVENT_DAYS));
  summary.play_attribution = await deleteOld(db, 'play_attribution', 'ts', daysAgo(ATTRIBUTION_DAYS));
  summary.session_state = await deleteOld(db, 'session_state', 'lastSeen', daysAgo(SESSION_STATE_DAYS));
  summary.analytics_rate_limits = await deleteOld(db, 'analytics_rate_limits', 'updatedAt', daysAgo(RATE_LIMIT_DAYS));

  console.log('[analytics-cleanup] deleted:', JSON.stringify(summary));
  return { ok: true, deleted: summary };
}

export const config = {
  schedule: '@daily'
};

// Netlify scheduled functions receive the trigger payload in the request body;
// manual invocation (POST/GET) goes through the same path.
export default async () => {
  const result = await runCleanup();
  return new Response(JSON.stringify(result), {
    status: result.error ? 503 : 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
