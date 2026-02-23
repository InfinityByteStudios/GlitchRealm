/**
 * Helper functions for verified user data
 * This module provides utilities to fetch and display verified user information
 */

/**
 * Get verified user data including username and verification types
 * @param {string} uid - User ID to check
 * @returns {Promise<object|null>} Verified user data or null if not verified
 */
export async function getVerifiedUserData(uid) {
    if (!uid || !window.firebaseFirestore) return null;
    
    try {
        const db = window.firebaseFirestore;
        const docRef = window.firestoreDoc(db, 'verified_users', uid);
        const docSnap = await window.firestoreGetDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().verified === true) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error('Error fetching verified user data:', error);
        return null;
    }
}

/**
 * Get the username for a verified user
 * @param {string} uid - User ID
 * @returns {Promise<string|null>} Username or null if not verified/no username set
 */
export async function getVerifiedUsername(uid) {
    const userData = await getVerifiedUserData(uid);
    return userData?.username || null;
}

/**
 * Check if user is verified for a specific type (games, news, or both)
 * @param {string} uid - User ID
 * @param {string} type - Verification type to check ('games' or 'news')
 * @returns {Promise<boolean>} True if user is verified for the specified type
 */
export async function isVerifiedForType(uid, type) {
    const userData = await getVerifiedUserData(uid);
    if (!userData) return false;
    
    const types = userData.verificationTypes || [];
    return types.includes(type);
}

/**
 * Get display name for a user (verified username or fallback)
 * @param {string} uid - User ID
 * @param {string} fallback - Fallback name if no verified username
 * @returns {Promise<string>} Display name to show
 */
export async function getDisplayName(uid, fallback = 'Anonymous') {
    const username = await getVerifiedUsername(uid);
    return username || fallback;
}

/**
 * Cache for verified usernames to reduce Firestore reads
 */
const usernameCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get username with caching
 * @param {string} uid - User ID
 * @returns {Promise<string|null>} Username or null
 */
export async function getCachedUsername(uid) {
    if (!uid) return null;
    
    const now = Date.now();
    const cached = usernameCache.get(uid);
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        return cached.username;
    }
    
    const username = await getVerifiedUsername(uid);
    usernameCache.set(uid, { username, timestamp: now });
    return username;
}

/**
 * Clear the username cache
 */
export function clearUsernameCache() {
    usernameCache.clear();
}
