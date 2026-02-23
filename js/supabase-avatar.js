/**
 * Supabase Avatar Upload & Profile Management
 * Integrates with Firebase Auth for GlitchRealm
 * Now with Gravatar fallback support
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG } from './supabase-config.js';
import { getBestAvatar, getGravatarAvatarUrl, hasGravatarAvatar } from './gravatar-integration.js';

// Check if Supabase is configured
const isConfigured = SUPABASE_CONFIG.url && 
                     SUPABASE_CONFIG.anonKey && 
                     !SUPABASE_CONFIG.url.includes('YOUR_SUPABASE') &&
                     !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE');

// Initialize Supabase client (only if configured)
export const supabase = isConfigured 
    ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
    : null;

// Helper to check if Supabase is ready
function checkSupabaseReady() {
    if (!supabase) {
        console.warn('⚠️ Supabase not configured. Please update supabase-config.js with your project credentials.');
        console.warn(' See AVATAR_IMPLEMENTATION.md for setup instructions.');
        return false;
    }
    return true;
}

/**
 * Ensure user profile exists in Supabase
 * Call after Firebase sign-in
 */
export async function ensureProfile(firebaseUser) {
  if (!firebaseUser) return;
  if (!checkSupabaseReady()) return;
  
  try {
    // Sign in to Supabase using Firebase ID token (if using Supabase Auth)
    // For now, we'll use service role or custom JWT exchange
    // Simplified: just ensure row exists via RPC
    const { error } = await supabase.rpc('ensure_profile');
    
    if (error) {
      console.warn('Could not ensure profile:', error);
    }
  } catch (err) {
    console.error('ensureProfile error:', err);
  }
}

/**
 * Upload avatar to Supabase Storage
 * @param {File} file - The image file (after crop)
 * @param {string} userId - Firebase UID
 * @returns {Promise<{path: string, url: string}>}
 */
export async function uploadAvatar(file, userId) {
  if (!checkSupabaseReady()) {
    throw new Error('Supabase not configured. Please update supabase-config.js');
  }
  
  if (!file || !userId) {
    throw new Error('File and userId required');
  }

  const timestamp = Date.now();
  const ext = file.name.split('.').pop() || 'png';
  const filePath = `${userId}/${timestamp}.${ext}`;

  // Upload to avatars bucket
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
    throw error;
  }

  // Get public URL (or signed URL if bucket is private)
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: urlData.publicUrl
  };
}

/**
 * Update user profile with new avatar
 * @param {string} userId - Firebase UID
 * @param {string} avatarPath - Storage path
 * @param {string} avatarUrl - Public/signed URL
 */
export async function updateProfileAvatar(userId, avatarPath, avatarUrl) {
  if (!checkSupabaseReady()) {
    throw new Error('Supabase not configured');
  }
  
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      avatar_storage_path: avatarPath,
      custom_photo_url: avatarUrl,
      avatar_updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    });

  if (error) {
    console.error('Profile update error:', error);
    throw error;
  }
}

/**
 * Delete avatar from storage and clear profile
 * @param {string} userId - Firebase UID
 * @param {string} avatarPath - Storage path to delete
 */
export async function deleteAvatar(userId, avatarPath) {
  if (!checkSupabaseReady()) {
    throw new Error('Supabase not configured');
  }
  
  if (!avatarPath) return;

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('avatars')
    .remove([avatarPath]);

  if (storageError) {
    console.warn('Storage delete error:', storageError);
  }

  // Clear profile fields
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      avatar_storage_path: null,
      custom_photo_url: null,
      avatar_updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Profile clear error:', updateError);
    throw updateError;
  }
}

/**
 * Get user profile (including avatar)
 * @param {string} userId - Firebase UID
 * @param {Object} firebaseUser - Firebase user object (for Gravatar fallback)
 * @returns {Promise<object>}
 */
export async function getProfile(userId, firebaseUser = null) {
  if (!checkSupabaseReady()) {
    return null; // Return null if not configured (graceful degradation)
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is ok
    console.error('Get profile error:', error);
    throw error;
  }

  return data || null;
}

/**
 * Get avatar URL with fallback priority: Supabase > Gravatar > Firebase > Default
 * @param {object} firebaseUser - Firebase user object
 * @param {object} profile - Supabase profile object
 * @returns {Promise<string>} Avatar URL
 */
export async function getAvatarUrl(firebaseUser, profile) {
  // Priority 1: Custom uploaded avatar via Supabase
  if (profile?.custom_photo_url) {
    return profile.custom_photo_url;
  }
  
  // Priority 2: Gravatar avatar (if user has email)
  if (firebaseUser?.email) {
    try {
      const gravatarUrl = await getGravatarAvatarUrl(firebaseUser.email, {
        size: 200,
        default: 'mp'
      });
      if (gravatarUrl) {
        // Check if Gravatar actually exists (avoid showing default if user doesn't have one)
        const hasGravatar = await hasGravatarAvatar(firebaseUser.email);
        if (hasGravatar) {
          return gravatarUrl;
        }
      }
    } catch (err) {
      console.warn('Gravatar check failed:', err);
    }
  }
  
  // Priority 3: Firebase provider photo (Google, GitHub, etc.)
  if (firebaseUser?.photoURL) {
    return firebaseUser.photoURL;
  }
  
  // Priority 4: Default anonymous avatar
  return 'assets/icons/anonymous.png';
}

/**
 * Complete avatar upload flow: crop, upload, update profile
 * @param {File} originalFile - Original image file
 * @param {string} userId - Firebase UID
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} Final avatar URL
 */
export async function uploadAvatarComplete(originalFile, userId, onProgress = null) {
  try {
    if (onProgress) onProgress('Uploading...');
    
    // Upload the file (assumed already cropped by modal)
    const { path, url } = await uploadAvatar(originalFile, userId);
    
    if (onProgress) onProgress('Updating profile...');
    
    // Update profile
    await updateProfileAvatar(userId, path, url);
    
    if (onProgress) onProgress('Complete!');
    
    return url;
  } catch (error) {
    console.error('Upload flow error:', error);
    throw error;
  }
}
