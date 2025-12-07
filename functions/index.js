// GlitchRealm Firebase Cloud Functions
// Runtime: Node.js 20

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

try {
	admin.initializeApp({
		storageBucket: 'shared-sign-in.appspot.com'
	});
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
exports.cleanupExpiredReports = functions.scheduler.onSchedule('every 60 minutes', async () => {
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
// Commented out due to v1/v2 API incompatibility - needs migration to v2 API
// exports.onCoverUpload = functions.storage.object().onFinalize(async (object) => {
// 	// You can add image processing here if needed (e.g., generate thumbnails)
// 	// For now, we just log.
// 	const { name, contentType } = object;
// 	functions.logger.info('Uploaded:', name, contentType);
// });

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
// Allow all origins during development; tighten as needed. Enable credentials for cookie-based auth in the future.
api.use(cors({ origin: true, credentials: true }));
api.use(express.json());
api.use(decodeAuth);

// Simple in-memory cache with TTL
const memCache = new Map(); // key -> { data, etag, lastModified, expiresAt }
function setCache(key, data, etag, lastModified, ttlMs = 60_000) {
	memCache.set(key, { data, etag, lastModified, expiresAt: Date.now() + ttlMs });
}
function getCache(key) {
	const entry = memCache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) { memCache.delete(key); return null; }
	return entry;
}
function invalidatePrefix(prefix) {
	for (const k of memCache.keys()) if (k.startsWith(prefix)) memCache.delete(k);
}
function makeEtag(obj) {
	const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
	return 'W/"' + crypto.createHash('sha1').update(json).digest('hex') + '"';
}

// Health
api.get('/health', (_req, res) => res.json({ ok: true }));

// Current user info (auth required)
api.get('/me', requireAuth, async (req, res) => {
	try {
		const uid = req.user.uid;
		const verifiedDoc = await db.collection('verified_users').doc(uid).get();
		const isVerified = verifiedDoc.exists && verifiedDoc.data().verified === true;
		const dev = isDeveloper(uid);
		const adm = Boolean(req.user.admin);
		res.json({ uid, isVerified, isDeveloper: dev, isAdmin: adm });
	} catch (e) {
		res.status(500).json({ error: 'Failed to load user' });
	}
});

// Public: list published submissions
api.get('/submissions', async (req, res) => {
	try {
		const pageSize = Math.min(parseInt(req.query.limit || '24', 10), 50);
		const status = (req.query.status || '').toString();
		const authed = Boolean(req.user);
		const uid = req.user?.uid;
		const moderator = authed && (isDeveloper(uid) || Boolean(req.user.admin));

		// If not moderator or no status provided, serve published list with caching
		if (!moderator || !status || status === 'published') {
			const cacheKey = `submissions?limit=${pageSize}`;
			const cached = getCache(cacheKey);
			if (cached) {
				const inm = req.headers['if-none-match'];
				const ims = req.headers['if-modified-since'];
				if ((inm && inm === cached.etag) || (ims && new Date(ims).getTime() >= new Date(cached.lastModified).getTime())) {
					res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60, stale-if-error=600');
					res.setHeader('ETag', cached.etag);
					res.setHeader('Last-Modified', cached.lastModified);
					return res.status(304).end();
				}
				res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60, stale-if-error=600');
				res.setHeader('ETag', cached.etag);
				res.setHeader('Last-Modified', cached.lastModified);
				return res.json(cached.data);
			}

			const q = await db.collection('game_submissions')
				.where('status', '==', 'published')
				.orderBy('createdAt', 'desc')
				.limit(pageSize)
				.get();
			const data = q.docs.map(d => ({ id: d.id, ...d.data() }));
			let latest = 0;
			for (const doc of q.docs) {
				const v = doc.get('updatedAt') || doc.get('createdAt');
				const ts = v?.toMillis ? v.toMillis() : (v?.seconds ? v.seconds * 1000 : 0);
				if (ts > latest) latest = ts;
			}
			const lastModified = new Date(latest || Date.now()).toUTCString();
			const etag = makeEtag(data.map(d => `${d.id}:${d.updatedAt?.toMillis ? d.updatedAt.toMillis() : ''}`).join('|'));
			setCache(cacheKey, data, etag, lastModified, 60_000);
			res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60, stale-if-error=600');
			res.setHeader('ETag', etag);
			res.setHeader('Last-Modified', lastModified);
			return res.json(data);
		}

		// Moderator view: filter by status or all (no public caching)
		let qRef = db.collection('game_submissions').orderBy('createdAt', 'desc');
		if (status && status !== 'all') {
			qRef = db.collection('game_submissions').where('status', '==', status).orderBy('createdAt', 'desc');
		}
		const q = await qRef.limit(pageSize).get();
		const data = q.docs.map(d => ({ id: d.id, ...d.data() }));
		res.json(data);
	} catch (e) {
		res.status(500).json({ error: 'Failed to list submissions' });
	}
});

// Creator: create submission (draft)
api.post('/submissions', requireAuth, async (req, res) => {
	try {
		const uid = req.user.uid;
		const body = req.body || {};
		const { title, description, coverImageUrl, tags, playUrl } = body;
		if (!title || !description) return res.status(400).json({ error: 'title and description required' });
		// Require a valid playUrl (http/https)
		const validPlay = typeof playUrl === 'string' && /^https?:\/\//i.test(playUrl) && playUrl.length <= 2000;
		if (!validPlay) return res.status(400).json({ error: 'playUrl required (must start with http or https)' });
		// Verified or developer only may create submissions
		const vSnap = await db.collection('verified_users').doc(uid).get();
		const isVerified = vSnap.exists && vSnap.data().verified === true;
		if (!(isVerified || isDeveloper(uid))) return res.status(403).json({ error: 'Not verified' });
		const now = admin.firestore.FieldValue.serverTimestamp();
		const payload = { title, description, ownerId: uid, status: 'draft', createdAt: now, updatedAt: now, playUrl };
		if (typeof coverImageUrl === 'string' && coverImageUrl) payload.coverImageUrl = coverImageUrl;
		if (Array.isArray(tags) && tags.length) payload.tags = tags.slice(0, 3);
		const ref = await db.collection('game_submissions').add(payload);
		invalidatePrefix('submissions?');
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
		const { title, description, coverImageUrl, tags, status, playUrl } = req.body || {};
		if (title) patch.title = title;
		if (description) patch.description = description;
		if (typeof coverImageUrl === 'string') patch.coverImageUrl = coverImageUrl;
		if (Array.isArray(tags)) patch.tags = tags.slice(0, 3);
		if (typeof playUrl === 'string') {
			if (playUrl) {
				const ok = /^https?:\/\//i.test(playUrl) && playUrl.length <= 2000;
				if (!ok) return res.status(400).json({ error: 'Invalid playUrl' });
				patch.playUrl = playUrl;
			} else {
				patch.playUrl = admin.firestore.FieldValue.delete();
			}
		}
		// status change allowed only by owner to draft or moderator to publish/draft
		if (status) {
			const moderator = isDeveloper(uid) || req.user.admin === true;
			if (status === 'draft' && (uid === data.ownerId || moderator)) patch.status = 'draft';
			else if (status === 'published' && moderator) patch.status = 'published';
		}
		patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
		await ref.update(patch);
		invalidatePrefix('submissions?');
		res.json({ ok: true });
	} catch (e) {
		res.status(500).json({ error: 'Failed to update submission' });
	}
});

// Moderator: publish/unpublish/delete
api.post('/submissions/:id/publish', requireAuth, requireMod, async (req, res) => {
	await db.collection('game_submissions').doc(req.params.id).update({ status: 'published', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
	invalidatePrefix('submissions?');
	res.json({ ok: true });
});
api.post('/submissions/:id/unpublish', requireAuth, requireMod, async (req, res) => {
	await db.collection('game_submissions').doc(req.params.id).update({ status: 'draft', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
	invalidatePrefix('submissions?');
	res.json({ ok: true });
});
api.delete('/submissions/:id', requireAuth, requireMod, async (req, res) => {
	await db.collection('game_submissions').doc(req.params.id).delete();
	invalidatePrefix('submissions?');
	res.json({ ok: true });
});

// Signed upload URL for covers (optional, if you prefer direct-to-GCS uploads)
api.post('/uploads/covers:signedUrl', requireAuth, async (req, res) => {
	try {
		const uid = req.user.uid;
		const fileName = (req.body?.fileName || 'upload').replace(/[^a-zA-Z0-9_.-]/g, '_');
	const bucket = storage.bucket();
	const file = bucket.file(`game-covers/${uid}/${Date.now()}_${fileName}`);
	const contentType = req.body?.contentType || 'application/octet-stream';
	const [url] = await file.getSignedUrl({
		action: 'write',
		expires: Date.now() + 10 * 60 * 1000,
		contentType,
		version: 'v4'
	});
	const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURI(file.name)}`;
	res.json({ url, objectPath: file.name, bucket: bucket.name, publicUrl, contentType });
	} catch (e) {
		functions.logger.error('Failed to create signed URL', e);
		res.status(500).json({ error: 'Failed to create signed URL' });
	}
});

// Callable: Delete user account and all associated data
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
	}

	const uid = context.auth.uid;
	const email = context.auth.token.email;

	try {
		functions.logger.info(`Starting account deletion for user ${uid} (${email})`);

		// 1. Delete user data from Firestore collections
		const collections = [
			'users',
			'game_submissions',
			'user_profiles',
			'user_settings',
			'verified_users',
			'playtime_records',
			'user_stats',
			'user_preferences'
		];

		const batch = db.batch();
		let deletedDocs = 0;

		for (const collectionName of collections) {
			try {
				// Query for user's documents
				const querySnapshot = await db.collection(collectionName)
					.where('userId', '==', uid)
					.get();

				querySnapshot.forEach(doc => {
					batch.delete(doc.ref);
					deletedDocs++;
				});

				// Also check for documents where the user ID is the document ID
				try {
					const userDoc = await db.collection(collectionName).doc(uid).get();
					if (userDoc.exists) {
						batch.delete(userDoc.ref);
						deletedDocs++;
					}
				} catch (e) {
					functions.logger.warn(`Could not check document ${uid} in ${collectionName}: ${e.message}`);
				}

				// Special handling for game_submissions (check ownerId field)
				if (collectionName === 'game_submissions') {
					const ownerQuery = await db.collection(collectionName)
						.where('ownerId', '==', uid)
						.get();
					
					ownerQuery.forEach(doc => {
						batch.delete(doc.ref);
						deletedDocs++;
					});
				}

			} catch (e) {
				functions.logger.warn(`Error processing collection ${collectionName}: ${e.message}`);
			}
		}

		// Commit Firestore deletions
		if (deletedDocs > 0) {
			await batch.commit();
			functions.logger.info(`Deleted ${deletedDocs} Firestore documents`);
		}

		// 2. Delete user files from Cloud Storage
		try {
			const bucket = storage.bucket();
			const userFolders = [
				`users/${uid}/`,
				`game-covers/${uid}/`,
				`user-uploads/${uid}/`,
				`profile-images/${uid}/`
			];

			let deletedFiles = 0;
			for (const folder of userFolders) {
				try {
					const [files] = await bucket.getFiles({ prefix: folder });
					
					for (const file of files) {
						await file.delete();
						deletedFiles++;
					}
				} catch (e) {
					functions.logger.warn(`Error deleting files from ${folder}: ${e.message}`);
				}
			}

			if (deletedFiles > 0) {
				functions.logger.info(`Deleted ${deletedFiles} storage files`);
			}
		} catch (e) {
			functions.logger.error(`Error during storage cleanup: ${e.message}`);
		}

		// 3. Delete the user's authentication record
		try {
			await admin.auth().deleteUser(uid);
			functions.logger.info(`Deleted authentication record for user ${uid}`);
		} catch (e) {
			functions.logger.error(`Error deleting authentication record: ${e.message}`);
			// Don't throw here - we still want to report success for data cleanup
		}

		// 4. Invalidate any relevant caches
		try {
			invalidatePrefix('submissions?');
		} catch (e) {
			functions.logger.warn(`Error invalidating cache: ${e.message}`);
		}

		functions.logger.info(`Account deletion completed for user ${uid}`);
		
		return {
			success: true,
			message: 'Account and all associated data have been permanently deleted',
			deletedAt: new Date().toISOString(),
			userId: uid
		};

	} catch (error) {
		functions.logger.error(`Account deletion failed for user ${uid}:`, error);
		throw new functions.https.HttpsError('internal', `Account deletion failed: ${error.message}`);
	}
});

// Callable: Export user data (optional - for GDPR compliance)
exports.exportUserData = functions.https.onCall(async (data, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
	}

	const uid = context.auth.uid;
	
	try {
		const userData = {
			userId: uid,
			email: context.auth.token.email,
			exportedAt: new Date().toISOString(),
			data: {}
		};

		// Export data from various collections
		const collections = [
			'users',
			'game_submissions',
			'user_profiles',
			'user_settings',
			'verified_users',
			'playtime_records',
			'user_stats',
			'user_preferences'
		];

		for (const collectionName of collections) {
			try {
				// Get documents where userId field matches
				const querySnapshot = await db.collection(collectionName)
					.where('userId', '==', uid)
					.get();

				const docs = [];
				querySnapshot.forEach(doc => {
					docs.push({ id: doc.id, ...doc.data() });
				});

				// Also check for documents where the user ID is the document ID
				try {
					const userDoc = await db.collection(collectionName).doc(uid).get();
					if (userDoc.exists) {
						docs.push({ id: userDoc.id, ...userDoc.data() });
					}
				} catch (e) {
					// Document doesn't exist, that's fine
				}

				// Special handling for game_submissions
				if (collectionName === 'game_submissions') {
					const ownerQuery = await db.collection(collectionName)
						.where('ownerId', '==', uid)
						.get();
					
					ownerQuery.forEach(doc => {
						docs.push({ id: doc.id, ...doc.data() });
					});
				}

				if (docs.length > 0) {
					userData.data[collectionName] = docs;
				}

			} catch (e) {
				functions.logger.warn(`Error exporting collection ${collectionName}: ${e.message}`);
			}
		}

		return userData;

	} catch (error) {
		functions.logger.error(`Data export failed for user ${uid}:`, error);
		throw new functions.https.HttpsError('internal', `Data export failed: ${error.message}`);
	}
});

exports.api = functions.https.onRequest(api);

// ========= Identity Platform Blocking Functions ========= //
// These are HTTP Cloud Functions called by Firebase Auth Identity Platform
// They must return specific JSON responses as per Firebase blocking functions spec

// Before user creation - validate and optionally block user registration
exports.beforeCreate = functions.https.onRequest(async (req, res) => {
	// Set CORS headers
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'POST');
	res.set('Access-Control-Allow-Headers', 'Content-Type');
	
	// Handle preflight
	if (req.method === 'OPTIONS') {
		res.status(204).send('');
		return;
	}
	
	// Validate POST method
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	
	try {
		const { data } = req.body;
		// data contains: uid, email, emailVerified, displayName, photoURL, etc.
		
		// You can add validation here:
		// - Block disposable email domains
		// - Require email verification
		// - Set custom claims
		// - Etc.
		
		// Allow the registration to proceed
		res.json({
			// No userRecord modifications needed - just allow through
		});
	} catch (error) {
		functions.logger.error('beforeCreate error:', error);
		res.status(500).json({ error: 'Internal error' });
	}
});

// Before user sign-in - validate and optionally block sign-in attempts
exports.beforeSignIn = functions.https.onRequest(async (req, res) => {
	// Set CORS headers
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'POST');
	res.set('Access-Control-Allow-Headers', 'Content-Type');
	
	// Handle preflight
	if (req.method === 'OPTIONS') {
		res.status(204).send('');
		return;
	}
	
	// Validate POST method
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	
	try {
		const { data } = req.body;
		// data contains: uid, email, emailVerified, displayName, photoURL, signInMethod, etc.
		
		// You can add validation here:
		// - Require email verification
		// - Block suspended users
		// - Add custom session claims
		// - Etc.
		
		// Allow the sign-in to proceed
		res.json({
			// No sessionClaims modifications needed - just allow through
		});
	} catch (error) {
		functions.logger.error('beforeSignIn error:', error);
		res.status(500).json({ error: 'Internal error' });
	}
});

// Callable: Exchange Firebase ID token for custom token (cross-domain auth)
exports.exchangeAuthToken = functions.https.onCall(async (data, context) => {
	console.log('[exchangeAuthToken] Received data:', { 
		hasData: !!data, 
		dataKeys: data ? Object.keys(data) : [],
		idTokenType: data?.idToken ? typeof data.idToken : 'undefined',
		idTokenLength: data?.idToken ? data.idToken.length : 0
	});
	
	const { idToken } = data || {};
	
	if (!idToken) {
		console.error('[exchangeAuthToken] No idToken in data. Full data:', JSON.stringify(data));
		throw new functions.https.HttpsError('invalid-argument', 'ID token is required');
	}
	
	try {
		// Verify the ID token from the auth subdomain
		const decodedToken = await admin.auth().verifyIdToken(idToken);
		const uid = decodedToken.uid;
		
		console.log('[exchangeAuthToken] Verified ID token for user:', uid);
		
		// Create a custom token for this user that can be used on the main domain
		const customToken = await admin.auth().createCustomToken(uid);
		
		console.log('[exchangeAuthToken] Created custom token for user:', uid);
		
		return { customToken };
	} catch (error) {
		console.error('[exchangeAuthToken] Error:', error);
		throw new functions.https.HttpsError(
			'internal',
			'Failed to exchange token: ' + error.message
		);
	}
});
