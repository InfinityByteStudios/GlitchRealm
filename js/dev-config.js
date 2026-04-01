/**
 * GlitchRealm Developer Configuration
 * 
 * Centralized configuration for developer features, UIDs, and logging.
 * This file should be imported by other modules to avoid hardcoded values.
 * 
 * Features:
 * - Centralized DEV_UIDS Set for O(1) lookups
 * - isDev() function with multiple fallback mechanisms
 * - Production-safe logger that no-ops verbose logs except errors
 * - Automatic auth state caching for reliability
 * 
 * Fallback mechanisms for isDev():
 * 1. Primary: Firebase auth currentUser check
 * 2. Fallback: Firebase loading state detection
 * 3. Fallback: localStorage cached dev status
 * 4. Fallback: Safe default (false) for production
 * 5. Error handling: Catches and logs errors, defaults to false
 */

// Developer UIDs - loaded at runtime from Netlify environment-backed function
const DEV_UIDS = new Set();
const FALLBACK_DEV_UIDS = [
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
];

function hydrateDevUidsFromCache() {
  try {
    const raw = localStorage.getItem('glitchRealm_admin_uids');
    if (!raw) {
      // No cache — seed with fallback UIDs so isDev() works before fetch completes
      FALLBACK_DEV_UIDS.forEach(uid => DEV_UIDS.add(uid));
      return;
    }
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || !list.length) {
      FALLBACK_DEV_UIDS.forEach(uid => DEV_UIDS.add(uid));
      return;
    }
    DEV_UIDS.clear();
    list.map(v => String(v || '').trim()).filter(Boolean).forEach(uid => DEV_UIDS.add(uid));
  } catch (e) {
    // On parse error seed with fallback UIDs
    FALLBACK_DEV_UIDS.forEach(uid => DEV_UIDS.add(uid));
  }
}

async function loadDevUids() {
  try {
    const endpoints = [
      '/.netlify/functions/admin-auth-uids',
      'https://glitchrealm.ca/.netlify/functions/admin-auth-uids',
      '/.netlify/functions/admin-uids',
      'https://glitchrealm.ca/.netlify/functions/admin-uids'
    ];
    let data = null;

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, { credentials: 'omit' });
        if (!res.ok) continue;
        data = await res.json();
        break;
      } catch (e) {
        // Try next endpoint
      }
    }

    if (!data) throw new Error('Unable to load admin UIDs');
    const list = Array.isArray(data?.uids) ? data.uids.map(v => String(v || '').trim()).filter(Boolean) : [];
    if (!list.length) throw new Error('Empty UID list from endpoint');
    DEV_UIDS.clear();
    list.forEach(uid => DEV_UIDS.add(uid));

    try {
      localStorage.setItem('glitchRealm_admin_uids', JSON.stringify(list));
    } catch (e) {
      // ignore localStorage write errors
    }

    if (typeof window !== 'undefined' && window.GlitchRealmDev) {
      window.GlitchRealmDev.DEV_UIDS = DEV_UIDS;
    }
  } catch (error) {
    // If fetch failed and DEV_UIDS is empty, apply fallback
    if (DEV_UIDS.size === 0) {
      FALLBACK_DEV_UIDS.forEach(uid => DEV_UIDS.add(uid));
    }
  }
}

hydrateDevUidsFromCache();

// Check if current user is a developer with fallback mechanisms
const isDev = () => {
  if (typeof window === 'undefined') return false;

  try {
    // Primary: Check Firebase auth
    const auth = window.firebaseAuth || window.firebase?.auth?.();
    if (auth?.currentUser) {
      return DEV_UIDS.has(auth.currentUser.uid);
    }

    // Fallback 1: Check if Firebase is still loading
    if (window.firebase && !auth) {
      // Firebase exists but auth not ready - assume non-dev for safety
      return false;
    }

    // Fallback 2: Check localStorage for cached dev status (if previously set)
    const cachedDevStatus = localStorage.getItem('glitchRealm_devMode');
    if (cachedDevStatus === 'true') {
      // Only trust cached status temporarily, verify on next auth state change
      return true;
    }

    // Fallback 3: No auth available - default to false for production safety
    return false;
  } catch (error) {
    // Fallback 4: Any error in dev detection - default to false for safety
    console.error('Error in isDev() check:', error);
    return false;
  }
};

// Cache dev status when auth becomes available
const cacheDevStatus = (user) => {
  try {
    if (user && DEV_UIDS.has(user.uid)) {
      localStorage.setItem('glitchRealm_devMode', 'true');
    } else {
      localStorage.removeItem('glitchRealm_devMode');
    }
  } catch (error) {
    // Ignore localStorage errors (e.g., in private browsing)
    console.warn('Could not cache dev status:', error);
  }
};

// Lightweight logger that no-ops in production except errors
const logger = {
  log: () => {},
  warn: (...args) => {
    if (isDev()) console.warn(...args);
  },
  error: (...args) => console.error(...args), // Always log errors
  group: (...args) => {
    if (isDev()) console.group(...args);
  },
  groupEnd: () => {
    if (isDev()) console.groupEnd();
  },
  info: (...args) => {
    if (isDev()) console.info(...args);
  },
  debug: (...args) => {
    if (isDev()) console.debug(...args);
  },
  // Conditional logging - only logs if condition is true AND in dev mode
  logIf: () => {},
  // Performance-aware logging - uses performance.now() for timing
  time: (label) => {
    if (isDev()) console.time(label);
  },
  timeEnd: (label) => {
    if (isDev()) console.timeEnd(label);
  }
};

// Firebase auth state recovery with retry logic
const authStateRecovery = {
  maxRetries: 3,
  retryDelay: 1000,
  currentRetries: 0,
  
  // Initialize auth with retry logic
  init() {
    this.attemptAuthInit();
  },
  
  // Attempt to initialize Firebase auth
  attemptAuthInit() {
    try {
      const auth = window.firebaseAuth || window.firebase?.auth?.();
      
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        logger.debug('[AuthRecovery] Firebase auth available, setting up listener');
        this.setupAuthListener(auth);
        return true;
      } else {
        logger.debug('[AuthRecovery] Firebase auth not ready, will retry');
        this.scheduleRetry();
        return false;
      }
    } catch (error) {
      logger.error('[AuthRecovery] Error initializing auth:', error);
      this.handleAuthError(error);
      return false;
    }
  },
  
  // Set up auth state listener with error handling
  setupAuthListener(auth) {
    try {
      auth.onAuthStateChanged(
        (user) => {
          // Success callback
          logger.debug('[AuthRecovery] Auth state changed:', user ? 'signed in' : 'signed out');
          cacheDevStatus(user);
          this.markAuthLoaded();
          
          // Update UI based on auth state
          this.updateUIForAuthState(user);
        },
        (error) => {
          // Error callback
          logger.error('[AuthRecovery] Auth state change error:', error);
          this.handleAuthError(error);
        }
      );
      
      // Mark auth as loaded when listener is successfully attached
      setTimeout(() => this.markAuthLoaded(), 100);
      
    } catch (error) {
      logger.error('[AuthRecovery] Error setting up auth listener:', error);
      this.handleAuthError(error);
    }
  },
  
  // Schedule retry attempt
  scheduleRetry() {
    if (this.currentRetries < this.maxRetries) {
      this.currentRetries++;
      logger.debug(`[AuthRecovery] Scheduling retry ${this.currentRetries}/${this.maxRetries} in ${this.retryDelay}ms`);
      
      setTimeout(() => {
        if (!this.attemptAuthInit()) {
          // If still failing, increase delay for next retry
          this.retryDelay *= 1.5;
        }
      }, this.retryDelay);
    } else {
      logger.warn('[AuthRecovery] Max retries exceeded, falling back to no-auth mode');
      this.fallbackToNoAuth();
    }
  },
  
  // Handle auth errors with fallback rendering
  handleAuthError(error) {
    logger.error('[AuthRecovery] Auth error occurred:', error);
    
    // Mark auth as loaded (failed) so we don't wait forever
    this.markAuthLoaded();
    
    // Render fallback content
    if (typeof window !== 'undefined' && window.GlitchRealmDev?.loadingStateManager) {
      window.GlitchRealmDev.loadingStateManager.renderFallbackContent();
    }
  },
  
  // Fallback to no-auth mode
  fallbackToNoAuth() {
    logger.warn('[AuthRecovery] Falling back to no-auth mode');
    
    // Mark auth as loaded so initialization can complete
    this.markAuthLoaded();
    
    // Update UI for signed-out state
    this.updateUIForAuthState(null);
  },
  
  // Mark auth as loaded in loading state manager
  markAuthLoaded() {
    if (typeof window !== 'undefined' && window.GlitchRealmDev?.loadingStateManager) {
      window.GlitchRealmDev.loadingStateManager.markResourceLoaded('auth');
    }
  },
  
  // Update UI based on auth state
  updateUIForAuthState(user) {
    try {
      const signInBtn = document.getElementById('sign-in-btn');
      const userProfile = document.getElementById('user-profile');
      const userName = document.getElementById('user-name');
      
      if (user) {
        // User is signed in
        if (signInBtn) signInBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        if (userName) {
          userName.textContent = user.displayName || 
                                user.email?.split('@')[0] || 
                                'User';
        }
        
        // Update avatar if available
        const userAvatar = document.getElementById('user-avatar');
        const userAvatarLarge = document.getElementById('user-avatar-large');
        if (user.photoURL) {
          if (userAvatar) userAvatar.src = user.photoURL;
          if (userAvatarLarge) userAvatarLarge.src = user.photoURL;
        }
        
        logger.debug('[AuthRecovery] UI updated for signed-in user');
      } else {
        // User is signed out
        if (signInBtn) signInBtn.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
        
        logger.debug('[AuthRecovery] UI updated for signed-out state');
      }
    } catch (error) {
      logger.error('[AuthRecovery] Error updating UI for auth state:', error);
    }
  }
};

// Initialize auth state listener if Firebase is available
const initAuthListener = () => {
  authStateRecovery.init();
};

// Loading state management for preventing stuck loading states
const loadingStateManager = {
  criticalResources: ['auth', 'config', 'styles'],
  loadedResources: new Set(),
  initTimeout: null,

  init() {
    // Provide requestIdleCallback polyfill early
    if (typeof window.requestIdleCallback !== 'function') {
      window.requestIdleCallback = (cb, opts) => setTimeout(cb, opts?.timeout ? Math.min(opts.timeout, 100) : 100);
      window.cancelIdleCallback = (id) => clearTimeout(id);
    }

    // 5-second timeout to prevent stuck loading states
    this.initTimeout = setTimeout(() => {
      this.renderFallbackContent();
    }, 5000);

    this.markResourceLoaded('config');

    if (document.readyState !== 'loading' || document.querySelector('link[rel="stylesheet"]')) {
      this.markResourceLoaded('styles');
    } else {
      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (link.sheet) this.markResourceLoaded('styles');
        else link.addEventListener('load', () => this.markResourceLoaded('styles'), { once: true });
      });
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.markResourceLoaded('styles'), 100);
      });
    }
  },

  markResourceLoaded(name) {
    if (!this.criticalResources.includes(name)) return;
    this.loadedResources.add(name);
    if (this.loadedResources.size === this.criticalResources.length) {
      if (this.initTimeout) { clearTimeout(this.initTimeout); this.initTimeout = null; }
      const main = document.getElementById('main-content') || document.querySelector('main');
      if (main) { main.style.visibility = 'visible'; main.style.opacity = '1'; }
      document.querySelectorAll('.fallback-message').forEach(m => m.remove());
    }
  },

  renderFallbackContent() {
    const signInBtn = document.getElementById('sign-in-btn');
    const userProfile = document.getElementById('user-profile');
    if (signInBtn) { signInBtn.style.display = 'block'; signInBtn.textContent = 'Sign In'; }
    if (userProfile) userProfile.style.display = 'none';

    const main = document.getElementById('main-content') || document.querySelector('main');
    if (main) { main.style.visibility = 'visible'; main.style.opacity = '1'; }

    document.querySelectorAll('.loading, .auth-loading, [data-loading="true"]').forEach(el => el.style.display = 'none');
  }
};

// Export for global access
if (typeof window !== 'undefined') {
  window.GlitchRealmDev = {
    DEV_UIDS,
    isDev,
    logger,
    cacheDevStatus,
    initAuthListener,
    loadingStateManager,
    authStateRecovery
  };

  // Auto-initialize auth listener when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthListener);
  } else {
    // DOM already loaded, try to initialize immediately
    setTimeout(initAuthListener, 100);
  }
  
  // Initialize loading state management
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadingStateManager.init());
  } else {
    loadingStateManager.init();
  }

  // Refresh developer UID list from env-backed endpoint.
  loadDevUids();
}


