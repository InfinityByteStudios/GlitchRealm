/**
 * Auth Sync Module for News Section
 * Syncs authentication state with main GlitchRealm site and auth.glitchrealm.ca
 */

import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const auth = getAuth(window.firebaseApp);

/**
 * Redirect to auth subdomain with return URL
 */
export function redirectToAuth() {
  const currentUrl = window.location.href;
  const returnUrl = encodeURIComponent(currentUrl);
  
  // Store return URL in localStorage as backup
  try {
    localStorage.setItem('gr.returnTo', currentUrl);
  } catch (e) {
    console.warn('[Auth Sync] Could not save return URL to localStorage:', e);
  }
  
  // Redirect to auth subdomain with return parameter in hash
  window.location.href = `https://auth.glitchrealm.ca/#return=${returnUrl}`;
}

/**
 * Sign out and redirect to auth page
 */
export async function signOut() {
  try {
    await auth.signOut();
    
    // Clear any stored return URLs
    try {
      localStorage.removeItem('gr.returnTo');
      sessionStorage.removeItem('gr.returnTo');
    } catch (e) {}
    
    // Redirect to auth page
    redirectToAuth();
  } catch (err) {
    console.error('[Auth Sync] Sign out error:', err);
  }
}

/**
 * Check if user is signed in
 */
export function isSignedIn() {
  return auth.currentUser !== null;
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Initialize auth sync - call this on page load
 */
export function initAuthSync() {
  
  // Listen for auth state changes
  onAuthStateChanged(auth, (user) => {
    if (user) {
      
      // Broadcast sign-in event
      window.dispatchEvent(new CustomEvent('gr-auth-signed-in', { 
        detail: { user } 
      }));
    } else {
      
      // Broadcast sign-out event
      window.dispatchEvent(new CustomEvent('gr-auth-signed-out'));
    }
  });
  
  // Handle return from auth bridge
  const hash = window.location.hash;
  if (hash && hash.includes('provider=')) {
  }
}

// Auto-initialize on module load
initAuthSync();
