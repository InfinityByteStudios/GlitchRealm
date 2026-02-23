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

// Developer UIDs - centralized to avoid duplication across files
const DEV_UIDS = new Set([
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
]);

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
  log: (...args) => {
    if (isDev()) console.log(...args);
  },
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
  logIf: (condition, ...args) => {
    if (condition && isDev()) console.log(...args);
  },
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
  // Critical resources that must load for full functionality
  criticalResources: ['auth', 'config', 'styles'],
  
  // Track which resources have loaded
  loadedResources: new Set(),
  
  // Initialization timeout (5 seconds)
  initTimeout: null,
  
  // Feature support detection
  featureSupport: {
    requestIdleCallback: false,
    intersectionObserver: false,
    webp: false,
    performanceObserver: false
  },
  
  // Initialize timeout protection
  init() {
    logger.debug('[LoadingState] Initializing timeout protection');
    
    // Detect feature support first
    this.detectFeatureSupport();
    
    // Set 5-second timeout to prevent stuck loading states
    this.initTimeout = setTimeout(() => {
      logger.error('[LoadingState] Initialization timeout - forcing fallback render');
      this.renderFallbackContent();
    }, 5000);
    
    // Mark config as loaded since we're in dev-config.js
    this.markResourceLoaded('config');
    
    // Check if styles are already loaded
    if (document.readyState === 'complete' || 
        document.readyState === 'interactive' ||
        document.querySelector('link[rel="stylesheet"]')) {
      this.markResourceLoaded('styles');
    }
    
    // Listen for style loading if not already loaded
    if (!this.loadedResources.has('styles')) {
      this.watchForStyles();
    }
  },
  
  // Detect browser feature support for graceful degradation
  detectFeatureSupport() {
    try {
      // Check for requestIdleCallback support
      this.featureSupport.requestIdleCallback = typeof window.requestIdleCallback === 'function';
      
      // Check for IntersectionObserver support
      this.featureSupport.intersectionObserver = typeof window.IntersectionObserver === 'function';
      
      // Check for PerformanceObserver support
      this.featureSupport.performanceObserver = typeof window.PerformanceObserver === 'function';
      
      // Check for WebP support
      this.detectWebPSupport();
      
      logger.debug('[LoadingState] Feature support detected:', this.featureSupport);
      
    } catch (error) {
      logger.error('[LoadingState] Error detecting feature support:', error);
    }
  },
  
  // Detect WebP support asynchronously
  detectWebPSupport() {
    try {
      const webpTestImage = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
      const img = new Image();
      
      img.onload = () => {
        this.featureSupport.webp = (img.width === 2 && img.height === 2);
        logger.debug('[LoadingState] WebP support:', this.featureSupport.webp);
      };
      
      img.onerror = () => {
        this.featureSupport.webp = false;
        logger.debug('[LoadingState] WebP not supported');
      };
      
      img.src = webpTestImage;
      
    } catch (error) {
      this.featureSupport.webp = false;
      logger.debug('[LoadingState] WebP detection failed:', error);
    }
  },
  
  // Get fallback function for requestIdleCallback
  getIdleCallback() {
    if (this.featureSupport.requestIdleCallback) {
      return window.requestIdleCallback.bind(window);
    } else {
      // Fallback to setTimeout with 100ms delay
      return (callback, options = {}) => {
        const timeout = options.timeout || 100;
        return setTimeout(callback, Math.min(timeout, 100));
      };
    }
  },
  
  // Get fallback for IntersectionObserver
  createIntersectionObserver(callback, options = {}) {
    if (this.featureSupport.intersectionObserver) {
      return new IntersectionObserver(callback, options);
    } else {
      // Fallback: immediately trigger callback for all observed elements
      logger.debug('[LoadingState] IntersectionObserver not supported, using fallback');
      return {
        observe: (element) => {
          // Simulate intersection with a delay
          setTimeout(() => {
            callback([{
              target: element,
              isIntersecting: true,
              intersectionRatio: 1
            }]);
          }, 100);
        },
        unobserve: () => {},
        disconnect: () => {}
      };
    }
  },
  
  // Implement graceful degradation for missing performance features
  implementGracefulDegradation() {
    try {
      // Provide global fallbacks for performance features
      if (!this.featureSupport.requestIdleCallback) {
        logger.debug('[LoadingState] Providing requestIdleCallback fallback');
        window.requestIdleCallback = this.getIdleCallback();
        window.cancelIdleCallback = (id) => clearTimeout(id);
      }
      
      // Provide IntersectionObserver fallback if needed
      if (!this.featureSupport.intersectionObserver) {
        logger.debug('[LoadingState] IntersectionObserver not available - lazy loading will use fallback');
      }
      
      // Disable advanced performance features if not supported
      if (!this.featureSupport.performanceObserver) {
        logger.debug('[LoadingState] PerformanceObserver not available - advanced metrics disabled');
        // Disable performance monitoring that relies on PerformanceObserver
        if (window.GlitchRealmPerf) {
          window.GlitchRealmPerf.config = window.GlitchRealmPerf.config || {};
          window.GlitchRealmPerf.config.disableAdvancedMetrics = true;
        }
      }
      
    } catch (error) {
      logger.error('[LoadingState] Error implementing graceful degradation:', error);
    }
  },
  
  // Mark a critical resource as loaded
  markResourceLoaded(resourceName) {
    if (this.criticalResources.includes(resourceName)) {
      this.loadedResources.add(resourceName);
      logger.debug(`[LoadingState] Resource loaded: ${resourceName} (${this.loadedResources.size}/${this.criticalResources.length})`);
      this.checkCriticalResources();
    }
  },
  
  // Check if all critical resources are loaded
  checkCriticalResources() {
    if (this.loadedResources.size === this.criticalResources.length) {
      logger.debug('[LoadingState] All critical resources loaded - clearing timeout');
      if (this.initTimeout) {
        clearTimeout(this.initTimeout);
        this.initTimeout = null;
      }
      this.renderFullContent();
    }
  },
  
  // Watch for styles to load
  watchForStyles() {
    // Check for loaded stylesheets
    const checkStyles = () => {
      const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
      let allLoaded = true;
      
      for (const link of stylesheets) {
        try {
          // Check if stylesheet is loaded by accessing sheet property
          if (!link.sheet || link.sheet.cssRules.length === 0) {
            allLoaded = false;
            break;
          }
        } catch (e) {
          // Cross-origin stylesheets may throw errors, consider them loaded
          continue;
        }
      }
      
      if (allLoaded && stylesheets.length > 0) {
        this.markResourceLoaded('styles');
      }
    };
    
    // Check immediately
    checkStyles();
    
    // Also listen for load events on stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      if (link.sheet) {
        this.markResourceLoaded('styles');
      } else {
        link.addEventListener('load', () => this.markResourceLoaded('styles'), { once: true });
      }
    });
    
    // Fallback: assume styles loaded after DOM is complete
    if (document.readyState === 'complete') {
      setTimeout(() => this.markResourceLoaded('styles'), 100);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.markResourceLoaded('styles'), 100);
      });
    }
  },
  
  // Render fallback content when timeout occurs
  renderFallbackContent() {
    logger.warn('[LoadingState] Rendering fallback content due to timeout');
    
    try {
      // Show basic content without waiting for all resources
      const signInBtn = document.getElementById('sign-in-btn');
      const userProfile = document.getElementById('user-profile');
      
      // Show sign-in button as fallback
      if (signInBtn) {
        signInBtn.style.display = 'block';
        signInBtn.textContent = 'Sign In';
      }
      
      // Hide user profile if showing
      if (userProfile) {
        userProfile.style.display = 'none';
      }
      
      // Show main content areas
      const mainContent = document.getElementById('main-content') || document.querySelector('main');
      if (mainContent) {
        mainContent.style.visibility = 'visible';
        mainContent.style.opacity = '1';
      }
      
      // Remove loading indicators
      const loadingElements = document.querySelectorAll('.loading, .auth-loading, [data-loading="true"]');
      loadingElements.forEach(el => {
        el.style.display = 'none';
      });
      
      // Show fallback message
      this.showFallbackMessage();
      
    } catch (error) {
      logger.error('[LoadingState] Error rendering fallback content:', error);
    }
  },
  
  // Render full content when all resources are loaded
  renderFullContent() {
    logger.debug('[LoadingState] All critical resources loaded - rendering full content');
    
    try {
      // Implement graceful degradation for missing features
      this.implementGracefulDegradation();
      
      // Ensure main content is visible
      const mainContent = document.getElementById('main-content') || document.querySelector('main');
      if (mainContent) {
        mainContent.style.visibility = 'visible';
        mainContent.style.opacity = '1';
      }
      
      // Remove any fallback messages
      const fallbackMessages = document.querySelectorAll('.fallback-message');
      fallbackMessages.forEach(msg => msg.remove());
      
      // Initialize performance features with fallbacks
      this.initializePerformanceFeatures();
      
    } catch (error) {
      logger.error('[LoadingState] Error rendering full content:', error);
    }
  },
  
  // Initialize performance features with appropriate fallbacks
  initializePerformanceFeatures() {
    try {
      // Initialize lazy loading with fallbacks
      this.initializeLazyLoading();
      
      // Initialize performance monitoring with fallbacks
      this.initializePerformanceMonitoring();
      
    } catch (error) {
      logger.error('[LoadingState] Error initializing performance features:', error);
    }
  },
  
  // Initialize lazy loading with IntersectionObserver fallback
  initializeLazyLoading() {
    try {
      const lazyImages = document.querySelectorAll('img[loading="lazy"]');
      
      if (lazyImages.length === 0) return;
      
      if (this.featureSupport.intersectionObserver) {
        // Use native IntersectionObserver
        const imageObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
              }
              imageObserver.unobserve(img);
            }
          });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
        
      } else {
        // Fallback: load all images immediately
        logger.debug('[LoadingState] Loading all lazy images immediately (no IntersectionObserver)');
        lazyImages.forEach(img => {
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
        });
      }
      
    } catch (error) {
      logger.error('[LoadingState] Error initializing lazy loading:', error);
    }
  },
  
  // Initialize performance monitoring with fallbacks
  initializePerformanceMonitoring() {
    try {
      // Only initialize if performance optimization script is available
      if (typeof window.GlitchRealmPerf === 'undefined') return;
      
      // Configure based on feature support
      const config = window.GlitchRealmPerf.config || {};
      
      if (!this.featureSupport.requestIdleCallback) {
        config.useIdleCallback = false;
        logger.debug('[LoadingState] Disabled idle callback in performance monitoring');
      }
      
      if (!this.featureSupport.intersectionObserver) {
        config.useIntersectionObserver = false;
        logger.debug('[LoadingState] Disabled intersection observer in performance monitoring');
      }
      
      if (!this.featureSupport.performanceObserver) {
        config.disableAdvancedMetrics = true;
        logger.debug('[LoadingState] Disabled advanced metrics in performance monitoring');
      }
      
      // Update configuration
      window.GlitchRealmPerf.config = config;
      
    } catch (error) {
      logger.error('[LoadingState] Error initializing performance monitoring:', error);
    }
  },
  
  // Show fallback message to user
  showFallbackMessage() {
    // Don't show multiple messages
    if (document.querySelector('.fallback-message')) return;
    
    const message = document.createElement('div');
    message.className = 'fallback-message';
    message.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 165, 0, 0.1);
      border: 2px solid #ffa500;
      color: #ffa500;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: 'Orbitron', monospace;
      font-size: 0.85rem;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `;
    message.textContent = 'Loading in safe mode - some features may be limited';
    
    document.body.appendChild(message);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 5000);
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
}


