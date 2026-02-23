/**
 * Gravatar Integration for GlitchRealm
 * Provides automatic avatar fallback and profile enhancement using Gravatar API
 * Works alongside the existing Supabase avatar system
 */

// Gravatar API Configuration
const GRAVATAR_CONFIG = {
  apiKey: '6660:gk-WP7wBMaTBQYLhYKUQ-wfxHPw8emd596JfYNUcOuL_qwdbHF8KPRa5jeo7tJvZ',
  baseUrl: 'https://api.gravatar.com/v3',
  avatarBaseUrl: 'https://0.gravatar.com/avatar',
  enabled: true
};

/**
 * Generate SHA256 hash of email for Gravatar
 * @param {string} email - User's email address
 * @returns {Promise<string>} SHA256 hash
 */
async function getGravatarHash(email) {
  if (!email) return null;
  
  // Trim and lowercase (CRITICAL for Gravatar)
  const processedEmail = email.trim().toLowerCase();
  
  // Generate SHA256 hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(processedEmail);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Get Gravatar avatar URL for a user
 * @param {string} email - User's email address
 * @param {Object} options - Avatar options
 * @param {number} options.size - Avatar size in pixels (default: 200)
 * @param {string} options.default - Default avatar type (404, mp, identicon, monsterid, wavatar, retro, robohash, blank)
 * @param {string} options.rating - Rating filter (g, pg, r, x)
 * @returns {Promise<string>} Avatar URL
 */
export async function getGravatarAvatarUrl(email, options = {}) {
  if (!email || !GRAVATAR_CONFIG.enabled) return null;
  
  const hash = await getGravatarHash(email);
  if (!hash) return null;
  
  const {
    size = 200,
    default: defaultAvatar = 'mp', // Mystery Person fallback
    rating = 'g'
  } = options;
  
  const params = new URLSearchParams({
    s: size.toString(),
    d: defaultAvatar,
    r: rating
  });
  
  return `${GRAVATAR_CONFIG.avatarBaseUrl}/${hash}?${params}`;
}

/**
 * Fetch Gravatar profile data
 * @param {string} email - User's email address
 * @returns {Promise<Object|null>} Profile data or null
 */
export async function getGravatarProfile(email) {
  if (!email || !GRAVATAR_CONFIG.enabled || !GRAVATAR_CONFIG.apiKey) return null;
  
  try {
    const hash = await getGravatarHash(email);
    if (!hash) return null;
    
    const response = await fetch(`${GRAVATAR_CONFIG.baseUrl}/profiles/${hash}`, {
      headers: {
        'Authorization': `Bearer ${GRAVATAR_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Gravatar API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.warn('Failed to fetch Gravatar profile:', err);
    return null;
  }
}

/**
 * Check if Gravatar avatar exists for email
 * @param {string} email - User's email address
 * @returns {Promise<boolean>} True if avatar exists
 */
export async function hasGravatarAvatar(email) {
  if (!email || !GRAVATAR_CONFIG.enabled) return false;
  
  try {
    const url = await getGravatarAvatarUrl(email, { default: '404' });
    if (!url) return false;
    
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (err) {
    console.warn('Failed to check Gravatar avatar:', err);
    return false;
  }
}

/**
 * Get best available avatar for user
 * Priority: Supabase upload > Gravatar > Default
 * @param {Object} user - Firebase user object
 * @param {string} supabaseAvatarUrl - Current Supabase avatar URL (if any)
 * @returns {Promise<string|null>} Best avatar URL
 */
export async function getBestAvatar(user, supabaseAvatarUrl = null) {
  // Priority 1: User uploaded avatar via Supabase
  if (supabaseAvatarUrl) {
    return supabaseAvatarUrl;
  }
  
  // Priority 2: Gravatar avatar
  if (user?.email) {
    const gravatarUrl = await getGravatarAvatarUrl(user.email, {
      size: 200,
      default: 'mp'
    });
    if (gravatarUrl) {
      return gravatarUrl;
    }
  }
  
  // Priority 3: Firebase photoURL (from OAuth providers)
  if (user?.photoURL) {
    return user.photoURL;
  }
  
  // Fallback: null (will use default avatar in UI)
  return null;
}

/**
 * Update Firestore user profile with Gravatar data
 * Only updates empty fields, doesn't overwrite existing data
 * @param {string} uid - User's Firebase UID
 * @param {string} email - User's email address
 */
export async function enrichProfileWithGravatar(uid, email) {
  if (!uid || !email || !GRAVATAR_CONFIG.enabled) {
    return;
  }
  
  try {
    
    const gravatarProfile = await getGravatarProfile(email);
    if (!gravatarProfile) {
      return;
    }
    
    
    // Import Firestore functions dynamically
    const { getFirestore, doc, getDoc, setDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const db = getFirestore(window.firebaseApp);
    if (!db) {
      console.warn('[Gravatar] Firestore not initialized');
      return;
    }
    
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const currentData = userSnap.exists() ? userSnap.data() : {};
    
    
    // Prepare enrichment data (only for empty fields)
    const enrichmentData = {};
    
    if (!currentData.displayName && gravatarProfile.display_name) {
      enrichmentData.displayName = gravatarProfile.display_name;
    }
    
    if (!currentData.location && gravatarProfile.location) {
      enrichmentData.location = gravatarProfile.location;
    }
    
    if (!currentData.bio && gravatarProfile.description) {
      enrichmentData.bio = gravatarProfile.description;
    }
    
    if (!currentData.jobTitle && gravatarProfile.job_title) {
      enrichmentData.jobTitle = gravatarProfile.job_title;
    }
    
    if (!currentData.company && gravatarProfile.company) {
      enrichmentData.company = gravatarProfile.company;
    }
    
    if (!currentData.pronouns && gravatarProfile.pronouns) {
      enrichmentData.pronouns = gravatarProfile.pronouns;
    }
    
    // Add Gravatar avatar URL if no avatar is set
    if (!currentData.avatarUrl && gravatarProfile.avatar_url) {
      enrichmentData.avatarUrl = gravatarProfile.avatar_url;
      enrichmentData.avatarSource = 'gravatar';
    }
    
    // Add verified social accounts
    if (gravatarProfile.verified_accounts && gravatarProfile.verified_accounts.length > 0) {
      enrichmentData.gravatarVerifiedAccounts = gravatarProfile.verified_accounts;
    }
    
    // Only update if we have enrichment data
    if (Object.keys(enrichmentData).length > 0) {
      // Use setDoc with merge to create document if it doesn't exist
      await setDoc(userRef, {
        ...enrichmentData,
        gravatarEnriched: true,
        gravatarEnrichedAt: Timestamp.now()
      }, { merge: true });
      
    } else {
    }
    
  } catch (err) {
    console.error('[Gravatar] Failed to enrich profile:', err);
  }
}

/**
 * Generate QR code for Gravatar profile
 * @param {string} email - User's email address
 * @param {Object} options - QR code options
 * @returns {Promise<string|null>} QR code image URL
 */
export async function getGravatarQRCode(email, options = {}) {
  if (!email || !GRAVATAR_CONFIG.enabled) return null;
  
  try {
    const hash = await getGravatarHash(email);
    if (!hash) return null;
    
    const {
      size = 300,
      version = 3, // Modern dots style
      type = 'user'
    } = options;
    
    const params = new URLSearchParams({
      size: size.toString(),
      version: version.toString(),
      type
    });
    
    return `${GRAVATAR_CONFIG.baseUrl}/qr-code/${hash}?${params}`;
  } catch (err) {
    console.warn('Failed to generate Gravatar QR code:', err);
    return null;
  }
}

/**
 * Initialize Gravatar integration on auth state change
 * Call this after Firebase auth initialization
 */
export function initGravatarIntegration() {
  if (!GRAVATAR_CONFIG.enabled) {
    return;
  }
  
  
  // Listen for auth state changes
  if (window.firebaseAuth) {
    window.firebaseAuth.onAuthStateChanged(async (user) => {
      if (user && user.email) {
        
        try {
          // Import Firestore functions
          const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
          const db = getFirestore(window.firebaseApp);
          
          if (db) {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : {};
            
            
            // Only enrich if not already done
            if (!userData.gravatarEnriched) {
              await enrichProfileWithGravatar(user.uid, user.email);
            } else {
            }
          }
        } catch (err) {
          console.error('[Gravatar] Error in auth state handler:', err);
        }
      } else {
      }
    });
  } else {
    console.warn('[Gravatar] Firebase Auth not available yet');
  }
}

/**
 * Manual Gravatar enrichment for testing
 * Call this from browser console: window.testGravatarEnrichment()
 */
export async function testGravatarEnrichment() {
  const user = window.firebaseAuth?.currentUser;
  if (!user) {
    console.error('[Gravatar Test] No user signed in');
    return;
  }
  
  if (!user.email) {
    console.error('[Gravatar Test] User has no email');
    return;
  }
  
  
  // Force enrichment even if already done
  try {
    const { getFirestore, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const db = getFirestore(window.firebaseApp);
    const userRef = doc(db, 'users', user.uid);
    
    // Clear the enrichment flag to force re-enrichment
    await setDoc(userRef, {
      gravatarEnriched: false
    }, { merge: true });
    
    await enrichProfileWithGravatar(user.uid, user.email);
    
  } catch (err) {
    console.error('[Gravatar Test] Error:', err);
  }
}

// Export configuration for external modification if needed
export { GRAVATAR_CONFIG };
