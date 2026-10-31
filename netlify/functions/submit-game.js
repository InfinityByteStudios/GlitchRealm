const FIREBASE_PROJECT_ID = 'shared-sign-in';
const FIREBASE_WEB_API_KEY = 'AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hkogcnxmrrkxggwcrqyh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb2djbnhtcnJreGdnd2NycXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTA5MDQsImV4cCI6MjA3Mjc2NjkwNH0.mOrnXNJBQLgMg1oq4zW1ySvCMXAbo-ZNAMwx59NJyxM';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'game-covers';
const SHARED_SECRET = process.env.SUBMIT_SHARED_SECRET || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

const HAS_SERVICE_ACCOUNT = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

let adminApp;
let adminDb;

function randomDocId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.length === 0 ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-submit-key',
    'Access-Control-Max-Age': '86400'
  };
}

function json(statusCode, body, origin) {
  return { statusCode, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function fail(statusCode, message, origin) {
  return json(statusCode, { error: message }, origin);
}

function validateString(v, name, max, pattern) {
  if (typeof v !== 'string' || v.trim().length === 0) return `${name} is required`;
  if (v.length > max) return `${name} exceeds ${max} characters`;
  if (pattern && !pattern.test(v)) return `${name} is invalid`;
  return null;
}

async function uploadCover(ownerId, filename, buffer, contentType) {
  const safeName = String(filename || 'cover').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const objectPath = `${ownerId}/${Date.now()}_${safeName}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': contentType || 'application/octet-stream',
      'Cache-Control': '3600',
      'x-upsert': 'true'
    },
    body: buffer
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Supabase upload failed (${resp.status}): ${text.slice(0, 300)}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;
}

async function fetchRemoteCover(coverUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let resp;
  try {
    resp = await fetch(coverUrl, { signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timeout);
  }
  if (!resp.ok) throw new Error(`Failed to fetch cover URL (${resp.status})`);
  const contentType = resp.headers.get('content-type') || '';
  if (!/^image\//i.test(contentType)) throw new Error('Cover URL did not return an image (content-type check failed)');
  const arrayBuffer = await resp.arrayBuffer();
  if (arrayBuffer.byteLength > 5 * 1024 * 1024) throw new Error('Cover image exceeds 5MB');
  return { buffer: Buffer.from(arrayBuffer), contentType, filename: (new URL(coverUrl)).pathname.split('/').pop() || 'remote-cover.png' };
}

async function anonymousFirebaseToken() {
  const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_WEB_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true })
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Firebase anonymous sign-in failed (${resp.status}): ${data.error?.message || 'unknown'}`);
  }
  return { idToken: data.idToken, uid: data.localId };
}

function firestoreFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      out[key] = { arrayValue: { values: value.map(v => ({ stringValue: String(v) })) } };
    } else if (value instanceof Date) {
      out[key] = { timestampValue: value.toISOString() };
    } else if (typeof value === 'string' || typeof value === 'number') {
      out[key] = { stringValue: String(value) };
    }
  }
  return out;
}

async function restWrite(fields) {
  const { idToken, uid } = await anonymousFirebaseToken();
  const payload = { ...fields, ownerId: uid, createdAt: new Date(), updatedAt: new Date() };
  const docId = randomDocId();
  const docName = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/game_submissions/${docId}`;
  const resp = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      writes: [{
        update: {
          name: docName,
          fields: firestoreFields(payload)
        },
        currentDocument: { exists: false }
      }]
    })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data.error?.message || data[0]?.error?.message || `Firestore write failed (${resp.status})`;
    throw new Error(msg);
  }
  return docId;
}

module.exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return fail(405, 'Method not allowed, use POST', origin);
  }
  if (SHARED_SECRET) {
    const provided = event.headers?.['x-submit-key'] || event.headers?.['X-Submit-Key'] || '';
    if (provided !== SHARED_SECRET) return fail(401, 'Invalid or missing x-submit-key header', origin);
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return fail(400, 'Request body must be valid JSON', origin);
  }

  const errors = [];
  const title = String(payload.title || '').trim();
  const description = String(payload.description || '').trim();
  const playUrl = String(payload.playUrl || '').trim();
  let coverImageUrl = String(payload.coverImageUrl || payload.coverUrl || '').trim();
  const externalOwnerId = String(payload.ownerId || payload.externalUserId || '').trim().slice(0, 128);
  const ownerUsername = String(payload.ownerUsername || '').trim().slice(0, 100);
  const extendedDescription = String(payload.extendedDescription || '').trim();
  const howToPlay = String(payload.howToPlay || '').trim();
  const trailerUrl = String(payload.trailerUrl || '').trim();
  const badge = String(payload.badge || '').trim();
  const tags = Array.isArray(payload.tags) ? payload.tags.map(t => String(t).trim()).filter(Boolean) : [];
  const screenshots = Array.isArray(payload.screenshots) ? payload.screenshots.map(s => String(s).trim()).filter(s => /^https?:\/\//i.test(s)) : [];

  const e1 = validateString(title, 'title', 120);
  if (e1) errors.push(e1);
  const e2 = validateString(description, 'description', 5000);
  if (e2) errors.push(e2);
  const e3 = validateString(playUrl, 'playUrl', 2000, /^https?:\/\//i);
  if (e3) errors.push(e3);
  if (coverImageUrl && coverImageUrl.length > 2000) errors.push('coverImageUrl exceeds 2000 characters');
  if (extendedDescription && extendedDescription.length > 10000) errors.push('extendedDescription exceeds 10000 characters');
  if (howToPlay && howToPlay.length > 5000) errors.push('howToPlay exceeds 5000 characters');
  if (trailerUrl && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/i.test(trailerUrl)) errors.push('trailerUrl must be a youtube.com, youtu.be or vimeo.com URL');
  if (tags.length > 3) errors.push('tags allows at most 3 entries');
  if (screenshots.length > 10) errors.push('screenshots allows at most 10 entries');
  if (badge && !['new', 'updated', 'beta'].includes(badge)) errors.push('badge must be one of: new, updated, beta');
  if (errors.length > 0) return json(400, { error: 'Validation failed', details: errors }, origin);

  try {
    const coverData = payload.coverBase64
      ? (() => {
          const match = String(payload.coverBase64).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
          if (!match) throw new Error('coverBase64 must be a data URL like data:image/png;base64,...');
          const buffer = Buffer.from(match[2], 'base64');
          if (buffer.length > 5 * 1024 * 1024) throw new Error('Cover image exceeds 5MB');
          const ext = (match[1].split('/')[1] || 'png').replace(/[^a-zA-Z0-9]/g, '');
          return { buffer, contentType: match[1], filename: `cover.${ext}` };
        })()
      : (coverImageUrl && !coverImageUrl.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`) ? await fetchRemoteCover(coverImageUrl) : null);

    if (coverData) {
      coverImageUrl = await uploadCover(externalOwnerId || 'external', coverData.filename, coverData.buffer, coverData.contentType);
    }

    const doc = {
      title,
      description,
      playUrl,
      ownerUsername: ownerUsername || 'External',
      status: 'draft'
    };
    if (coverImageUrl) doc.coverImageUrl = coverImageUrl;
    if (externalOwnerId) doc.externalOwnerId = externalOwnerId;
    if (extendedDescription) doc.extendedDescription = extendedDescription;
    if (howToPlay) doc.howToPlay = howToPlay;
    if (trailerUrl) doc.trailerUrl = trailerUrl;
    if (tags.length > 0) doc.tags = tags;
    if (screenshots.length > 0) doc.screenshots = screenshots;
    if (badge) doc.badge = badge;

    let id;
    if (HAS_SERVICE_ACCOUNT) {
      const { initializeApp, cert } = require('firebase-admin/app');
      const { getFirestore, FieldValue } = require('firebase-admin/firestore');
      if (!adminDb) {
        const serviceAccount = {
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        };
        adminApp = initializeApp({ credential: cert(serviceAccount), projectId: FIREBASE_PROJECT_ID });
        adminDb = getFirestore(adminApp);
      }
      const docRef = await adminDb.collection('game_submissions').add({ ...doc, ownerId: 'external', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      id = docRef.id;
    } else {
      id = await restWrite(doc);
    }

    return json(200, { ok: true, id, coverImageUrl: coverImageUrl || null, status: 'draft' }, origin);
  } catch (err) {
    return fail(500, err && err.message ? err.message : 'Submission failed', origin);
  }
};
