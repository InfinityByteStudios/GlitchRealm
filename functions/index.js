// GlitchRealm Firebase Cloud Functions
// Runtime: Node.js 20

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

try {
	admin.initializeApp();
} catch (e) {
	// no-op in emulator cold starts
}

const db = admin.firestore();
const storage = admin.storage();

// Helpers
const DEV_UIDS = new Set([
	'6iZDTXC78aVwX22qrY43BOxDRLt1',
	'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
	'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
	'4oGjihtDjRPYI0LsTDhpXaQAJjk1',
	'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
]);

function isAdmin(context) {
	return Boolean(context.auth?.token?.admin) || false;
}

function isDeveloper(uid) {
	return DEV_UIDS.has(uid);
}

// Callable: moderate game submissions (publish/unpublish/delete)
exports.moderateSubmission = functions.https.onCall(async (data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
	}
	const uid = context.auth.uid;
	if (!(isAdmin(context) || isDeveloper(uid))) {
		throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
	}

	const { id, action } = data || {};
	if (!id || !action) {
		throw new functions.https.HttpsError('invalid-argument', 'id and action are required');
	}
	const ref = db.collection('game_submissions').doc(id);
	const snap = await ref.get();
	if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Submission not found');

	if (action === 'publish') {
		await ref.update({ status: 'published', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
	} else if (action === 'unpublish') {
		await ref.update({ status: 'draft', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
	} else if (action === 'delete') {
		await ref.delete();
	} else {
		throw new functions.https.HttpsError('invalid-argument', 'Unknown action');
	}
	return { ok: true };
});

// Scheduled cleanup for expired community_post_reports
exports.cleanupExpiredReports = functions.pubsub.schedule('every 60 minutes').onRun(async () => {
	const now = admin.firestore.Timestamp.now();
	const q = await db.collection('community_post_reports')
		.where('status', '==', 'closed')
		.where('expiresAt', '<=', now)
		.limit(50)
		.get();
	const batch = db.batch();
	q.docs.forEach((d) => batch.delete(d.ref));
	if (!q.empty) await batch.commit();
	return null;
});

// Storage trigger: ensure uploaded image contentType is preserved (no-op placeholder)
exports.onCoverUpload = functions.storage.object().onFinalize(async (object) => {
	// You can add image processing here if needed (e.g., generate thumbnails)
	// For now, we just log.
	const { name, contentType } = object;
	functions.logger.info('Uploaded:', name, contentType);
});

// ========= Proper Express API ========= //

// Auth middlewares
async function decodeAuth(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const m = authHeader.match(/^Bearer (.+)$/);
	if (!m) { req.user = null; return next(); }
	try {
		const token = await admin.auth().verifyIdToken(m[1]);
		req.user = token;
	} catch (e) {
		req.user = null;
	}
	next();
}

function requireAuth(req, res, next) {
	if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
	next();
}

function requireMod(req, res, next) {
	const uid = req.user?.uid;
	if (!uid) return res.status(401).json({ error: 'Unauthorized' });
	const isAdm = Boolean(req.user.admin);
	if (!(isAdm || isDeveloper(uid))) return res.status(403).json({ error: 'Forbidden' });
	next();
}

const api = express();
api.use(cors({ origin: true }));
api.use(express.json());
api.use(decodeAuth);

// Health
api.get('/health', (_req, res) => res.json({ ok: true }));

// Public: list published submissions
api.get('/submissions', async (req, res) => {
	try {
		const pageSize = Math.min(parseInt(req.query.limit || '24', 10), 50);
		const q = await db.collection('game_submissions')
			.where('status', '==', 'published')
			.orderBy('createdAt', 'desc')
			.limit(pageSize)
			.get();
		res.json(q.docs.map(d => ({ id: d.id, ...d.data() })));
	} catch (e) {
		res.status(500).json({ error: 'Failed to list submissions' });
	}
});

// Creator: create submission (draft)
api.post('/submissions', requireAuth, async (req, res) => {
	try {
		const uid = req.user.uid;
		const body = req.body || {};
		const { title, description, coverImageUrl, tags } = body;
		if (!title || !description) return res.status(400).json({ error: 'title and description required' });
		// Verified or developer only: mirror of rules check
		const verifiedDoc = await db.collection('verified_users').doc(uid).get();
		const isVerified = verifiedDoc.exists && verifiedDoc.data().verified === true;
		if (!(isVerified || isDeveloper(uid))) return res.status(403).json({ error: 'Not verified' });
		const now = admin.firestore.FieldValue.serverTimestamp();
		const payload = { title, description, ownerId: uid, status: 'draft', createdAt: now, updatedAt: now };
		if (typeof coverImageUrl === 'string' && coverImageUrl) payload.coverImageUrl = coverImageUrl;
		if (Array.isArray(tags) && tags.length) payload.tags = tags.slice(0, 3);
		const ref = await db.collection('game_submissions').add(payload);
		res.status(201).json({ id: ref.id });
	} catch (e) {
		res.status(500).json({ error: 'Failed to create submission' });
	}
});

// Creator: update own submission
api.patch('/submissions/:id', requireAuth, async (req, res) => {
	try {
		const uid = req.user.uid;
		const ref = db.collection('game_submissions').doc(req.params.id);
		const snap = await ref.get();
		if (!snap.exists) return res.status(404).json({ error: 'Not found' });
		const data = snap.data();
		if (data.ownerId !== uid && !(isAdmin({ auth: { token: req.user } }) || isDeveloper(uid))) return res.status(403).json({ error: 'Forbidden' });
		const patch = {};
		const { title, description, coverImageUrl, tags, status } = req.body || {};
		if (title) patch.title = title;
		if (description) patch.description = description;
		if (typeof coverImageUrl === 'string') patch.coverImageUrl = coverImageUrl;
		if (Array.isArray(tags)) patch.tags = tags.slice(0, 3);
		// status change allowed only by owner to draft or moderator to publish/draft
		if (status) {
			const moderator = isDeveloper(uid) || req.user.admin === true;
			if (status === 'draft' && (uid === data.ownerId || moderator)) patch.status = 'draft';
			else if (status === 'published' && moderator) patch.status = 'published';
		}
		patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
		await ref.update(patch);
		res.json({ ok: true });
	} catch (e) {
		res.status(500).json({ error: 'Failed to update submission' });
	}
});

// Moderator: publish/unpublish/delete
api.post('/submissions/:id/publish', requireAuth, requireMod, async (req, res) => {
	await db.collection('game_submissions').doc(req.params.id).update({ status: 'published', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
	res.json({ ok: true });
});
api.post('/submissions/:id/unpublish', requireAuth, requireMod, async (req, res) => {
	await db.collection('game_submissions').doc(req.params.id).update({ status: 'draft', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
	res.json({ ok: true });
});
api.delete('/submissions/:id', requireAuth, requireMod, async (req, res) => {
	await db.collection('game_submissions').doc(req.params.id).delete();
	res.json({ ok: true });
});

// Signed upload URL for covers (optional, if you prefer direct-to-GCS uploads)
api.post('/uploads/covers:signedUrl', requireAuth, async (req, res) => {
	try {
		const uid = req.user.uid;
		const fileName = (req.body?.fileName || 'upload').replace(/[^a-zA-Z0-9_.-]/g, '_');
		const bucket = storage.bucket();
		const file = bucket.file(`game-covers/${uid}/${Date.now()}_${fileName}`);
		const [url] = await file.getSignedUrl({ action: 'write', expires: Date.now() + 10 * 60 * 1000, contentType: req.body?.contentType || 'application/octet-stream' });
		res.json({ url, objectPath: file.name });
	} catch (e) {
		res.status(500).json({ error: 'Failed to create signed URL' });
	}
});

exports.api = functions.https.onRequest(api);
