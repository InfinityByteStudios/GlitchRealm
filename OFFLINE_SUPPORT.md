# Offline Support & Network Status

## Overview
GlitchRealm now includes comprehensive offline support with a custom branded offline page and network status monitoring.

## Files Added

### 1. `offline.html` - Custom Offline Page
A fully branded offline experience shown when users lose internet connection.

**Features:**
- Animated GlitchRealm logo with glitch effect
- Floating particle background animation
- WiFi symbol with slash-through indicator
- Real-time connection status monitoring
- Automatic redirect when connection restored
- Retry connection button
- Troubleshooting tips
- Keyboard support (Enter to retry)
- Responsive design for mobile/desktop

**Design Elements:**
- Dark cyberpunk aesthetic matching GlitchRealm branding
- Cyan (#00fff9) and neon green (#00ff41) accent colors
- Scanline overlay effect
- Pulsing animations
- Glitch text effects

### 2. `network-status.css` - Toast Notification Styles
CSS for the network status toast that appears on all pages.

### 3. `network-status.js` - Network Monitor Script
JavaScript that monitors connection status and shows notifications.

**Features:**
- Automatic detection of online/offline events
- Toast notifications for status changes
- Auto-hide after 3 seconds when back online
- Manual close button
- Periodic connection checks (fallback)
- Global API: `window.NetworkStatus.show()` / `.hide()`

## Service Worker Updates

### Updated `sw.js`
- Added `/offline.html` to precache list
- Modified offline fallback logic:
  1. Try network first
  2. Fallback to cached page
  3. If no cache, serve offline page
  4. Ultimate fallback to index.html

## How It Works

### Offline Page Flow
```
User loses connection
    ↓
Service worker catches fetch failure
    ↓
Serves /offline.html from cache
    ↓
Page monitors navigator.onLine
    ↓
Auto-redirects when connection restored
```

### Network Status Toast Flow
```
Connection status changes
    ↓
Browser fires online/offline event
    ↓
Toast appears with appropriate message
    ↓
Auto-hides after 3s (if online) or stays visible (if offline)
```

## Implementation

### Option 1: Include Network Status on All Pages
Add to your main HTML files (in `<head>`):

```html
<link rel="stylesheet" href="/network-status.css">
<script src="/network-status.js" defer></script>
```

### Option 2: Add to Main Stylesheet
Copy contents of `network-status.css` into `styles.css`.

### Option 3: Load via Script.js
Add to the end of `script.js`:

```javascript
// Load network status monitor
const networkCSS = document.createElement('link');
networkCSS.rel = 'stylesheet';
networkCSS.href = '/network-status.css';
document.head.appendChild(networkCSS);

const networkJS = document.createElement('script');
networkJS.src = '/network-status.js';
networkJS.defer = true;
document.body.appendChild(networkJS);
```

## Testing Offline Mode

### Method 1: Browser DevTools
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Refresh page → should show offline.html

### Method 2: Service Worker
1. Open DevTools → Application → Service Workers
2. Check "Offline" checkbox
3. Navigate to any page

### Method 3: System Network
1. Disconnect Wi-Fi/Ethernet
2. Refresh page or navigate

## Features Breakdown

### Offline Page (`offline.html`)

#### Visual Elements
- **Logo**: Animated GlitchRealm wordmark with glitch effect
- **Icon**: 3-arc WiFi symbol with red slash
- **Status Badge**: Live connection status indicator
- **Error Code**: Styled error message
- **Particles**: 50 floating animated dots

#### Interactive Elements
- **Retry Button**: 
  - Shows loading spinner during check
  - Changes text based on status
  - Keyboard accessible (Enter key)
- **Connection Monitor**:
  - Checks every 3 seconds
  - Updates UI in real-time
  - Auto-redirects when online

#### Accessibility
- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- High contrast colors
- Readable font sizes

### Network Status Toast

#### States
- **Offline**: Red/orange theme, warning icon, stays visible
- **Online**: Green theme, checkmark icon, auto-hides after 3s

#### Behavior
- Slides up from bottom-right
- Cubic-bezier easing for smooth animation
- Close button for manual dismissal
- Mobile-responsive positioning

## Customization

### Change Colors
Edit the CSS variables in `offline.html`:
- Primary cyan: `#00fff9`
- Accent green: `#00ff41`
- Error red: `#ff6b6b`
- Background: `#0a0e1a` to `#1a1f2e`

### Change Messages
Edit text in `offline.html`:
- Main heading: Line 282
- Status message: Lines 287-290
- Error code: Line 292
- Tips: Lines 300-308

### Disable Auto-Redirect
Remove this code block from `offline.html` (lines ~360-363):
```javascript
setTimeout(() => {
    window.location.href = '/';
}, 2000);
```

### Change Toast Duration
Edit `network-status.js` line 42:
```javascript
hideTimeout = setTimeout(() => {
    hideToast();
}, 3000); // Change 3000 to desired milliseconds
```

## Browser Support

- ✅ Chrome/Edge 40+
- ✅ Firefox 44+
- ✅ Safari 11.1+
- ✅ Opera 27+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

Service Workers require HTTPS in production (works on localhost for development).

## Debugging

### Check Service Worker
```javascript
// In browser console
navigator.serviceWorker.getRegistrations()
    .then(regs => console.log('SW Registrations:', regs));
```

### Check Cache
```javascript
// In browser console
caches.keys().then(keys => console.log('Cache keys:', keys));
caches.open('gr-v3-static')
    .then(cache => cache.keys())
    .then(keys => console.log('Cached URLs:', keys.map(r => r.url)));
```

### Force Offline Page
Navigate directly to: `https://yourdomain.com/offline.html`

### Network Monitor API
```javascript
// Force show offline toast
window.NetworkStatus.show(false);

// Force show online toast
window.NetworkStatus.show(true);

// Hide toast
window.NetworkStatus.hide();
```

## Performance

### Offline Page
- **Size**: ~15KB (HTML + inline CSS/JS)
- **Load time**: Instant (served from cache)
- **Animations**: GPU-accelerated transforms

### Network Status
- **Size**: ~2KB CSS + ~2KB JS
- **Overhead**: Minimal (event listeners only)
- **Polling**: Every 5 seconds (fallback only)

## Future Enhancements

1. **Offline Content Caching**
   - Cache game pages for offline play
   - Store user data locally (IndexedDB)
   - Sync when connection restored

2. **Progressive Web App (PWA)**
   - Add manifest.json
   - Install prompt
   - Standalone mode

3. **Advanced Network Detection**
   - Detect slow connections (2G/3G)
   - Warn about limited connectivity
   - Show data-saving mode

4. **Offline Games**
   - Allow certain games to work offline
   - Cache game assets aggressively
   - Local save states

## Troubleshooting

### Offline page not showing
1. Clear site data (DevTools → Application → Clear storage)
2. Unregister service worker
3. Hard refresh (Ctrl+Shift+R)
4. Check console for SW errors

### Toast not appearing
1. Verify `network-status.css` is loaded
2. Check `network-status.js` is executing
3. Look for JS errors in console
4. Test with `window.NetworkStatus.show(false)`

### Auto-redirect not working
1. Check browser console for errors
2. Verify navigator.onLine API works
3. Try manual retry button
4. Check if redirecting to correct URL

## Notes

- Service worker requires HTTPS in production
- Offline page is cached during SW installation
- Network events may not fire on all browsers/platforms
- Fallback polling ensures detection even without events
- Toast notifications respect prefers-reduced-motion
