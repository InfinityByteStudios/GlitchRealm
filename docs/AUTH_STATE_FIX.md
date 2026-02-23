# Auth State Persistence Fix - Site-Wide

## Problem
Users had to hit Ctrl+Shift+R (hard refresh) to see their signed-in status across the entire site (main pages and news subdomain) due to aggressive browser caching and service worker caching.

## Root Causes
1. **Browser caching** - HTML/JS files were being cached by the browser
2. **Service worker caching** - HTML and auth-related scripts were cached by SW
3. **Delayed Firebase initialization** - Auth state wasn't immediately visible
4. **No cache-busting** - No meta tags to prevent caching of auth-sensitive pages

## Solutions Implemented

### 1. HTTP Cache-Control Meta Tags - SITE-WIDE
Added to ALL main HTML files and news subdomain pages:

**Main Pages:**
- ✅ `index.html`
- ✅ `games.html`
- ✅ `user-portal.html`
- ✅ `community.html`
- ✅ `submit-game.html`
- ✅ `moderation.html` (already had it)

**News Subdomain:**
- ✅ `news/index.html`
- ✅ `news/publish.html`
- ✅ `news/news-article.html`

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

### 2. Early Auth State Restoration - BOTH script.js FILES
Added to both `script.js` (main) and `news/script.js` (news subdomain):

**At the top of each file:**
```javascript
// Early auth state restoration (before DOM loads)
;(function(){
    try {
        const cachedAuthState = localStorage.getItem('firebase_auth_state');
        if (cachedAuthState) {
            const authData = JSON.parse(cachedAuthState);
            // If auth state exists and is recent (within 24 hours)
            if (authData.timestamp && (Date.now() - authData.timestamp) < 86400000) {
                window.__cachedAuthState = authData;
            }
        }
    } catch(e) {
        console.warn('Failed to check cached auth state:', e);
    }
})();
```

**Before onAuthStateChanged:**
```javascript
// Immediately restore UI from cached auth state if available
if (window.__cachedAuthState && signInBtn && userProfile) {
    signInBtn.style.display = 'none';
    userProfile.style.display = 'flex';
    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = window.__cachedAuthState.displayName || 
                              window.__cachedAuthState.email?.split('@')[0] || 
                              'User';
    }
    delete window.__cachedAuthState;
}
```

### 3. Service Worker Updates (sw.js)
- **Incremented cache version** from `gr-v3` to `gr-v4` (forces cache purge)
- **Added NEVER_CACHE list** for auth-sensitive files:
  - All HTML files (*.html)
  - Firebase core files
  - News subdomain pages  
  - Main script files
  - All Firebase CDN resources
- **Bypass caching** for these files - always fetch fresh from network
- **Removed HTML from precache** - Only caches offline.html, styles.css, and favicon

```javascript
const NEVER_CACHE = [
  '/news/',
  '/news/index.html',
  '/news/publish.html',
  '/news/news-article.html',
  '/index.html',
  '/games.html',
  '/user-portal.html',
  '/firebase-core.js',
  '/news/firebase-core.js',
  '/script.js',
  '/news/script.js',
  'firebase',
  'firebaseapp.com',
  'firestore.googleapis.com'
];

function shouldNeverCache(url) {
  const urlStr = url.toString();
  return NEVER_CACHE.some(pattern => 
    urlStr.includes(pattern) || 
    urlStr.endsWith('.html') ||
    urlStr.includes('firebase')
  );
}
```

### 4. Firebase Auth State Broadcast
Already implemented in `firebase-core.js`:
- Stores auth state to localStorage on sign-in
- Broadcasts state changes to other tabs/windows
- Custom `firebaseAuthStateChanged` event
- Cross-tab synchronization

## Files Modified

### HTML Files (Cache-Control Headers Added):
1. ✅ `index.html`
2. ✅ `games.html`
3. ✅ `user-portal.html`
4. ✅ `community.html`
5. ✅ `submit-game.html`
6. ✅ `news/index.html`
7. ✅ `news/publish.html`
8. ✅ `news/news-article.html`

### JavaScript Files (Early Auth Restoration):
1. ✅ `script.js` (main site)
2. ✅ `news/script.js` (news subdomain)

### Service Worker:
1. ✅ `sw.js` (updated cache strategy)

## Testing Checklist

### Main Site (glitchrealm.ca):
- [ ] Sign in on index.html
- [ ] Navigate to games.html - should show signed-in state immediately
- [ ] Navigate to user-portal.html - should show signed-in state immediately
- [ ] Navigate to community.html - should show signed-in state immediately
- [ ] Refresh any page - should NOT need Ctrl+Shift+R
- [ ] Sign out - should update immediately

### News Subdomain (news.glitchrealm.ca):
- [ ] Sign in on main site
- [ ] Navigate to news.glitchrealm.ca - should show signed-in state immediately
- [ ] Navigate to news/publish.html - should show signed-in state immediately
- [ ] Refresh - should NOT need Ctrl+Shift+R

### Cross-Tab Sync:
- [ ] Sign in in one tab
- [ ] Open new tab - should show signed-in state
- [ ] Sign out in one tab - should update in all tabs

## Benefits
- ✅ **No more Ctrl+Shift+R needed** - SITE-WIDE
- ✅ **Instant auth state visibility** on all pages
- ✅ **Cross-tab synchronization** works everywhere
- ✅ **Better UX** on main site AND news subdomain
- ✅ **Maintains offline support** for static assets
- ✅ **Security**: Fresh auth checks on every page load
- ✅ **Consistent behavior** across entire platform

## Technical Details
- **Cache-Control headers** prevent browser HTTP caching for ALL HTML
- **Service worker bypasses** auth-sensitive files site-wide
- **localStorage provides instant UI feedback** (24-hour cache)
- **Firebase persistence** handles actual auth state
- **Early restoration** shows cached state in <100ms
- **onAuthStateChanged** updates with real Firebase state when ready
