# Avatar Display Fix - Supabase Custom Avatars

## Problem
Profile pictures were not always showing correctly after implementing auth state caching. The issue occurred because:

1. **Firebase photoURL** is cached for fast UI restoration
2. **Supabase custom avatars** are stored separately in Supabase profiles table
3. When restoring from cache, only Firebase photoURL was used, ignoring custom Supabase avatars
4. This caused users with custom uploaded avatars to see their provider photo instead

## Solution Architecture

### Priority Order (Highest to Lowest)
1. **Supabase custom_photo_url** - User uploaded custom avatar
2. **Firebase photoURL** - Provider avatar (Google/GitHub)
3. **Default avatar** - ui-avatars.com or anonymous.png

### Implementation

#### 1. New Function: `loadSupabaseAvatarIfAvailable(userId)`
- Added to both `script.js` and `news/script.js`
- Asynchronously loads Supabase profile after cached UI restoration
- Updates avatar elements if custom avatar exists
- Gracefully fails if Supabase not configured

```javascript
async function loadSupabaseAvatarIfAvailable(userId) {
    if (!userId) return;
    
    try {
        // Dynamically import Supabase utilities
        if (!window.getProfile || !window.getAvatarUrl) {
            const module = await import('./supabase-avatar.js');
            window.getProfile = module.getProfile;
            window.getAvatarUrl = module.getAvatarUrl;
        }
        
        // Get Supabase profile
        const profile = await window.getProfile(userId);
        
        // If custom avatar exists, update UI
        if (profile?.custom_photo_url) {
            const userAvatar = document.getElementById('user-avatar');
            const userAvatarLarge = document.getElementById('user-avatar-large');
            
            if (userAvatar) userAvatar.src = profile.custom_photo_url;
            if (userAvatarLarge) userAvatarLarge.src = profile.custom_photo_url;
        }
    } catch (err) {
        // Graceful failure - use cached photoURL
        console.warn('Could not load Supabase avatar:', err);
    }
}
```

#### 2. Updated DOMContentLoaded Handler
- Restores UI from cached auth state immediately (Firebase photoURL)
- Calls `loadSupabaseAvatarIfAvailable()` asynchronously
- If Supabase avatar exists, it replaces the Firebase photo

```javascript
document.addEventListener('DOMContentLoaded', function() {
    if (window.__cachedAuthState) {
        // Restore UI with cached Firebase photoURL
        if (window.__cachedAuthState.photoURL) {
            if (userAvatar) userAvatar.src = window.__cachedAuthState.photoURL;
            if (userAvatarLarge) userAvatarLarge.src = window.__cachedAuthState.photoURL;
        }
        
        // Check for Supabase custom avatar (higher priority)
        loadSupabaseAvatarIfAvailable(window.__cachedAuthState.uid).catch(err => {
            console.warn('Could not check for Supabase avatar:', err);
        });
    }
});
```

#### 3. firebase-core.js Enhancement (from previous fix)
- Removed conditional check `&& !userAvatar.src`
- Now always updates avatar when photoURL exists
- Ensures consistent avatar updates across all auth state changes

```javascript
// BEFORE (buggy)
if (userAvatar && !userAvatar.src) userAvatar.src = user.photoURL;

// AFTER (fixed)
if (userAvatar) userAvatar.src = user.photoURL;
```

## User Flow

### Scenario 1: User with Custom Supabase Avatar
1. Page loads → Cache restored → Shows Firebase photoURL (provider photo)
2. Supabase profile loads (~100-200ms) → Custom avatar URL retrieved
3. Avatar elements updated → Shows custom uploaded photo

**Visual**: Brief flash of provider photo → Custom photo appears

### Scenario 2: User without Custom Avatar
1. Page loads → Cache restored → Shows Firebase photoURL (provider photo)
2. Supabase profile loads → No custom_photo_url found
3. No update needed → Provider photo remains

**Visual**: Provider photo shows immediately, no changes

### Scenario 3: Supabase Not Configured
1. Page loads → Cache restored → Shows Firebase photoURL
2. Supabase import fails gracefully
3. Fallback to cached photoURL → Provider photo remains

**Visual**: Provider photo shows, no errors

## Files Modified

### Main Site
- **script.js**
  - Added `loadSupabaseAvatarIfAvailable()` function (line ~20)
  - Updated DOMContentLoaded to call Supabase loader (line ~457)

### News Subdomain  
- **news/script.js**
  - Added `loadSupabaseAvatarIfAvailable()` function (line ~20)
  - Updated DOMContentLoaded to call Supabase loader (line ~457)

### Previous Related Fixes
- **firebase-core.js** - Removed avatar.src conditional check
- **sw.js** - Cache-control for auth files (v4)
- **Multiple HTML files** - HTTP cache-control headers

## Testing Checklist

- [ ] User with Google/GitHub auth and NO custom avatar
  - Should show provider photo immediately
  - No avatar changes after load
  
- [ ] User with Google/GitHub auth and custom Supabase avatar
  - Should show provider photo briefly
  - Custom avatar should replace it within 200ms
  
- [ ] User with Email/Password auth and custom Supabase avatar
  - Should show default avatar briefly
  - Custom avatar should replace it within 200ms
  
- [ ] Supabase not configured (fresh deployment)
  - Should show provider photo or default
  - No errors in console
  - Graceful degradation
  
- [ ] Hard refresh (Ctrl+Shift+R)
  - Cache cleared, full reload
  - Should work same as normal load
  
- [ ] Cross-tab sync
  - Sign in one tab → Other tabs update
  - Upload avatar one tab → Other tabs update

## Benefits

✅ **Instant UI**: Cached auth state shows immediately  
✅ **Custom Avatars**: Supabase photos prioritized correctly  
✅ **Graceful Fallback**: Works without Supabase  
✅ **No Blocking**: Async load doesn't delay page  
✅ **Consistent**: Works across main site and news subdomain  

## Notes

- Dynamic import of `supabase-avatar.js` only when needed
- Error handling prevents broken UI if Supabase fails
- Import path differs: `./supabase-avatar.js` (main) vs `../supabase-avatar.js` (news)
- Function cached in `window.getProfile` to avoid re-importing
