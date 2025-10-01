/**
 * Header Avatar Integration for Main Site
 * Integrates Supabase custom avatars with Firebase auth across all pages
 * NOTE: Avatar upload is disabled in header - users must go to User Portal to change avatar
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG } from './supabase-config.js';

// Initialize Supabase client
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Cache for profiles to avoid repeated queries
const profileCache = new Map();

/**
 * Get user profile from Supabase
 * @param {string} userId - Firebase UID
 * @returns {Promise<object|null>}
 */
async function getSupabaseProfile(userId) {
    if (!userId) return null;
    
    // Check cache first
    if (profileCache.has(userId)) {
        return profileCache.get(userId);
    }
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('custom_photo_url, avatar_storage_path')
            .eq('id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // Not found is ok
            console.warn('Profile fetch error:', error);
            return null;
        }
        
        // Cache the result
        if (data) {
            profileCache.set(userId, data);
        }
        
        return data || null;
    } catch (err) {
        console.error('getSupabaseProfile error:', err);
        return null;
    }
}

/**
 * Get avatar URL with Supabase priority
 * Priority: Supabase custom_photo_url -> Firebase photoURL -> default
 * @param {object} firebaseUser - Firebase user object
 * @param {object} supabaseProfile - Supabase profile object (optional)
 * @returns {Promise<string>}
 */
export async function getAvatarUrlWithSupabase(firebaseUser, supabaseProfile = null) {
    if (!firebaseUser) {
        return 'assets/icons/anonymous.png';
    }
    
    // If profile not provided, fetch it
    if (!supabaseProfile) {
        supabaseProfile = await getSupabaseProfile(firebaseUser.uid);
    }
    
    // Priority 1: Supabase custom avatar
    if (supabaseProfile?.custom_photo_url) {
        return supabaseProfile.custom_photo_url;
    }
    
    // Priority 2: Firebase provider avatar
    if (firebaseUser.photoURL) {
        return firebaseUser.photoURL;
    }
    
    // Priority 3: Default avatar
    return 'assets/icons/anonymous.png';
}

/**
 * Hook into existing updateUserProfile function
 * This enhances it to check Supabase for custom avatars
 */
export async function enhanceUserProfileWithSupabase(user) {
    if (!user) return;
    
    try {
        // Get Supabase profile
        const profile = await getSupabaseProfile(user.uid);
        
        // Get avatar URL with Supabase priority
        const avatarUrl = await getAvatarUrlWithSupabase(user, profile);
        
        // Update avatar elements
        const userAvatarElement = document.getElementById('user-avatar');
        const userAvatarLargeElement = document.getElementById('user-avatar-large');
        
        if (userAvatarElement) {
            userAvatarElement.src = avatarUrl;
        }
        if (userAvatarLargeElement) {
            userAvatarLargeElement.src = avatarUrl;
        }
        
        // Also update any other avatar elements on the page
        document.querySelectorAll('.user-avatar, .user-avatar-large').forEach(el => {
            el.src = avatarUrl;
        });
        
    } catch (error) {
        console.error('enhanceUserProfileWithSupabase error:', error);
    }
}

/**
 * Clear profile cache for a user (call after avatar update)
 * @param {string} userId - Firebase UID
 */
export function clearProfileCache(userId) {
    if (userId) {
        profileCache.delete(userId);
    } else {
        profileCache.clear();
    }
}

/**
 * Initialize Supabase avatar integration
 * Hooks into Firebase auth state changes
 * Also adds click handler to avatar to navigate to User Portal
 */
export function initializeSupabaseAvatarIntegration() {
    console.log('Initializing Supabase avatar integration...');
    
    // Add click handlers to avatars to navigate to user portal
    setupAvatarClickHandlers();
    
    // Wait for Firebase auth to be available
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth && window.onAuthStateChanged) {
            clearInterval(checkFirebase);
            
            // Listen for auth state changes
            window.onAuthStateChanged(window.firebaseAuth, async (user) => {
                if (user) {
                    // Wait a bit for existing updateUserProfile to run first
                    setTimeout(async () => {
                        await enhanceUserProfileWithSupabase(user);
                        // Re-setup click handlers after avatar update
                        setupAvatarClickHandlers();
                    }, 500);
                }
            });
            
            console.log('Supabase avatar integration active');
        }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(() => clearInterval(checkFirebase), 10000);
}

/**
 * Setup click handlers on avatars to navigate to user portal
 */
function setupAvatarClickHandlers() {
    // Find all avatar elements (both small and large)
    const avatars = document.querySelectorAll('#user-avatar, #user-avatar-large, .user-avatar, .user-avatar-large');
    
    avatars.forEach(avatar => {
        // Remove any existing click handlers by cloning
        const newAvatar = avatar.cloneNode(true);
        avatar.parentNode.replaceChild(newAvatar, avatar);
        
        // Add new click handler
        newAvatar.style.cursor = 'pointer';
        newAvatar.title = 'Go to User Portal to change avatar';
        
        newAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = 'user-portal.html';
        });
    });
    
    // Also disable upload overlays in header if they exist
    const uploadOverlays = document.querySelectorAll('.avatar-upload-overlay, .avatar-upload-overlay-large');
    uploadOverlays.forEach(overlay => {
        // Hide upload overlays in header (not in user portal)
        if (!window.location.pathname.includes('user-portal')) {
            overlay.style.display = 'none';
        }
    });
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSupabaseAvatarIntegration);
} else {
    initializeSupabaseAvatarIntegration();
}

// Export for manual usage
window.getAvatarUrlWithSupabase = getAvatarUrlWithSupabase;
window.enhanceUserProfileWithSupabase = enhanceUserProfileWithSupabase;
window.clearSupabaseProfileCache = clearProfileCache;
