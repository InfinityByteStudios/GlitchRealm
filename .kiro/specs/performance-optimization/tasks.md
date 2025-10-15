# Implementation Plan

- [x] 1. Create centralized developer configuration system





  - Create `dev-config.js` with DEV_UIDS Set and isDev() function
  - Implement lightweight logger that no-ops in production except errors
  - Add fallback mechanisms for missing Firebase auth
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Update existing files to use centralized dev config and more files if they use them





    - Import dev-config.js and replace lines 8-19 DEV_UIDS array
    - Update isDev checks to use centralized function
    - Wrap verbose console logs with logger calls
    - _Requirements: 3.1, 3.4_

  - [x] 2.2 Update submit-game.html to use centralized config


    - Replace lines 463-469 DEV_UIDS array with import
    - Wrap debug console logs (lines 1082-1310) with logger.log() calls
    - Keep essential error logging unwrapped
    - _Requirements: 3.2, 3.3_

  - [x] 2.3 Update games.html to use centralized logging


    - Import dev-config.js and replace any inline DEV_UIDS
    - Wrap console statements with logger calls for production safety
    - Add fallback for backward compatibility
    - _Requirements: 3.1, 3.2_

- [x] 3. Optimize performance-optimization.js to fix loading issues





  - [x] 3.1 Add autoInit config flag and expose API


    - Create config object with autoInit: true flag
    - Expose window.GlitchRealmPerf API with reinit, report, config methods
    - Add conditional auto-init based on config.autoInit
    - _Requirements: 2.3, 1.5, 1.6_

  - [x] 3.2 Defer expensive image measurements to idle time


    - Replace querySelectorAll with document.images in generateOptimizationReport()
    - Move naturalWidth checks to requestIdleCallback with 2500ms timeout
    - Add fallback to setTimeout(100ms) if requestIdleCallback unavailable
    - Use cached data attributes when available to avoid forced reflows
    - _Requirements: 2.1, 2.3, 1.1_

  - [x] 3.3 Batch MutationObserver callbacks to reduce frame allocations


    - Implement pendingNodes array and processingScheduled flag
    - Create processBatch function that processes nodes in requestAnimationFrame
    - Update MutationObserver to batch addedNodes instead of processing immediately
    - Add node type checking before processing
    - _Requirements: 2.1, 2.2, 1.6_

- [x] 4. Implement hoisted DOM and RegEx utilities





  - [x] 4.1 Create pre-compiled moderation patterns in games.html


    - Define MODERATION_PATTERNS object with offensive, spam regex at module scope
    - Pre-compile all regex patterns used in content checking
    - Remove duplicate pattern definitions throughout the file
    - _Requirements: 4.3, 4.4_



  - [x] 4.2 Implement TEXT_NORMALIZER with LRU cache

    - Create TEXT_NORMALIZER with normalize() and createVariations() methods
    - Implement LRU cache with 500 entry limit for normalized text
    - Add cache eviction logic when maxCacheSize reached
    - _Requirements: 4.3, 4.4_

  - [x] 4.3 Add DOM_REFS caching system


    - Create DOM_REFS object with postsList, emptyEl, loadMoreBtn properties
    - Implement init() method to cache DOM references in long-lived contexts
    - Update functions to use cached references instead of repeated queries
    - _Requirements: 4.3, 4.4_

  - [x] 4.4 Optimize community.js with hoisted utilities


    - Cache escapeHtml regex at module scope (lines 159-161)
    - Hoist verified badge SVG template to avoid recreation
    - Pre-compile badge HTML templates
    - Update checkContent() function to use hoisted patterns
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Implement image and layout optimization





  - [x] 5.1 Add width/height attributes to critical game card images


    - Add width="320" height="180" to game logo images in games.html
    - Add loading="lazy" and decoding="async" attributes to non-critical images
    - Ensure all game card images have proper dimensions to prevent CLS
    - _Requirements: 1.4, 7.2, 7.3_

  - [x] 5.2 Add aspect-ratio CSS for layout stability


    - Create .game-card img CSS rule with aspect-ratio: 16 / 9
    - Add width: 100%, height: auto, object-fit: cover properties
    - Implement loading placeholder with skeleton animation
    - _Requirements: 1.3, 7.2, 8.1_

  - [x] 5.3 Add preload links for critical images


    - Add preload links in document head for favicon.svg
    - Preload ByteSurge.png and CodeRunner Logo.png (max 3 critical images)
    - Ensure preloaded images are actually used on the page
    - _Requirements: 1.1, 1.2, 7.1_

  - [x] 5.4 Implement responsive images with srcset where applicable


    - Add srcset attributes for hero images with 320w, 640w, 960w variants
    - Include sizes attribute with appropriate breakpoints
    - Maintain fallback src for browsers without srcset support
    - _Requirements: 7.4, 9.4_

- [x] 6. Optimize Firebase operations and verified badge loading





  - [x] 6.1 Implement batched verified cache system


    - Create verifiedCache object with cache Map and pending Map
    - Implement get() method with request deduplication
    - Add batchGet() method to fetch multiple UIDs in single query
    - Implement _fetchBatch() to handle Firestore batch queries (max 10 docs)
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Update renderVerifiedBadgesWithin to use batch loading


    - Collect all UIDs that need verification in the container
    - Call verifiedCache.batchGet() with collected UIDs
    - Update individual badge rendering to use cached results
    - Maintain backward compatibility with existing ensureVerified() function
    - _Requirements: 4.1, 5.1, 5.4_

  - [x] 6.3 Optimize firebase-playtime-sync.js operations


    - Add early returns for no-op scenarios in sync functions
    - Batch Firestore reads/writes more efficiently
    - Reduce redundant snapshot queries
    - Implement error handling for sync failures
    - _Requirements: 5.4, 8.1_

- [x] 7. Create ESLint configuration and CI setup





  - [x] 7.1 Create ESLint configuration file


    - Create .eslintrc.json with browser environment and ES2021 support
    - Add rules for no-console (warn with error exception) and no-unused-vars
    - Configure globals for Firebase, performance APIs
    - _Requirements: 6.1, 6.2_

  - [x] 7.2 Set up GitHub Actions performance workflow


    - Create .github/workflows/performance.yml for PR performance checks
    - Configure Lighthouse CI with treosh/lighthouse-ci-action@v9
    - Set up performance budget validation
    - Configure artifact upload for performance reports
    - _Requirements: 6.2, 6.3_

  - [x] 7.3 Create performance budget and Lighthouse configuration


    - Create lighthouse-budget.json with FCP 1500ms, LCP 2500ms, CLS 0.1 limits
    - Create lighthouserc.json configuration file
    - Add performance testing scripts to package.json
    - _Requirements: 6.3, 6.4_

  - [x] 7.4 Add Netlify-specific optimizations


    - Create netlify.toml with image compression and CSS bundling
    - Create _headers file with appropriate cache control for assets
    - Create _redirects file for SPA routing if needed
    - _Requirements: 9.1, 9.2, 9.5_

- [x] 8. Implement loading state error prevention





  - [x] 8.1 Add initialization timeout protection


    - Create initTimeout with 5000ms limit to prevent stuck loading states
    - Implement checkCriticalResources() function to track loaded resources
    - Add renderFallbackContent() for timeout scenarios
    - Clear timeout when all critical resources loaded
    - _Requirements: 1.5, 1.6, 8.1_

  - [x] 8.2 Add Firebase auth state recovery


    - Update onAuthStateChanged to mark auth as loaded resource
    - Add error handling for auth failures with fallback rendering
    - Implement retry logic for failed auth initialization
    - _Requirements: 1.5, 1.6, 5.4_

  - [x] 8.3 Create resource loading fallbacks


    - Define criticalResources array with 'auth', 'config', 'styles'
    - Track loadedResources Set to monitor initialization progress
    - Implement graceful degradation for missing performance features
    - Add fallbacks for requestIdleCallback, IntersectionObserver, WebP support
    - _Requirements: 1.5, 1.6, 8.2_

- [x] 9. Write comprehensive tests for performance optimizations
  - [x] 9.1 Create unit tests for dev config system
    - Test isDev() function with various auth states
    - Verify logger no-ops in production mode
    - Test fallback mechanisms for missing Firebase auth
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 9.2 Create integration tests for loading state fixes
    - Test full loading sequence without hard refresh requirement
    - Verify InfinityByte, email, and GITHUB text appear correctly
    - Test timeout protection and fallback rendering
    - _Requirements: 1.5, 1.6_

  - [x] 9.3 Create performance measurement tests
    - Test Core Web Vitals meet budget requirements (FCP, LCP, CLS)
    - Test frame drops during gameplay
    - Test bundle size increase <= 5%
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 8.3_




- [ ] 10. Final integration and validation
  - [x] 10.1 Validate all optimizations work together







    - Run complete Lighthouse audit on optimized site
    - Test loading state reliability across multiple page loads
    - Verify no regressions in Games folder functionality
    - Confirm Firestore security rules unchanged
    - _Requirements: 8.1, 8.4, 8.5_

  - [ ] 10.2 Create rollback documentation and test rollback procedures
    - Document rollback steps for each optimization category
    - Create step-by-step rollback procedures for each major change
    - Test that rollbacks restore original functionality
    - Verify rollback procedures work on Netlify deployment
    - _Requirements: 8.5, 9.3_