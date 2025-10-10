# GlitchRealm AI Coding Agent Instructions

## Project Overview
GlitchRealm is a **cyberpunk-themed browser gaming platform** hosting HTML5 games with integrated authentication, playtime tracking, game submissions, and community features. The codebase is a **static multi-page site** with no build process—pure HTML/CSS/JS deployed to Netlify.

## Critical Architecture Patterns

### 1. Firebase Global Window Pattern
**All Firebase services are exposed as global window objects:**
```javascript
window.firebaseApp
window.firebaseAuth
window.firebaseFirestore
window.firestoreCollection
window.firestoreQuery
window.firestoreDoc
// ... etc.
```

- **firebase-core.js**: Centralized initialization script that sets up Firebase with `LOCAL` persistence and exposes services globally
- **Per-page initialization**: Some pages re-initialize Firebase for specific needs (e.g., submit-game.html)
- **Dual Firebase projects**: Main app uses `shared-sign-in`, status page uses separate `glitchrealm` project
- **Lazy loading**: Firebase modules dynamically imported as needed via CDN URLs

### 2. No Build System
- **ES6 modules from CDN**: All Firebase imports from `gstatic.com/firebasejs/10.7.1/`
- **No bundler**: No webpack, vite, rollup—direct HTML `<script>` tags
- **Deployment**: Netlify handles minification/compression via `netlify.toml` config
- **Cloud Functions**: Node.js 20 runtime in `/functions` directory

### 3. Firestore Schema & Security
**Collections:**
- `game_submissions`: User-submitted games (fields: title, description, extendedDescription, howToPlay, screenshots, playUrl, coverImageUrl, tags, badge, status, ownerId)
- `verified_users`: Verified creator badges
- `reviews`: Game reviews with moderation
- `playtime`: Per-user playtime tracking with `/playtime/{userId}/games/{gameId}` subcollection
- `community_posts`: Community discussions
- `news_articles`: News/blog posts

**Firestore Rules Pattern:**
- 3 update paths: owner-claim (legacy), owner-update (content only), admin/dev-update (everything)
- Validators check **final merged document state**, not just changed fields
- When editing, **preserve required fields** even if not displayed in UI (e.g., `playUrl`, `coverImageUrl`)

### 4. Developer Authentication
**Hardcoded developer UIDs** across multiple files:
```javascript
const DEV_UIDS = new Set([
  '6iZDTXC78aVwX22qrY43BOxDRLt1',
  'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
  'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
  '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
  'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
]);
```
Used in: `submit-game.html`, `games.html`, `moderation.html`, `firestore.rules` (as `isDeveloper()` function)

### 5. Supabase Integration
- **Image storage**: Game covers stored in Supabase bucket `game-covers` (CDN: `hkogcnxmrrkxggwcrqyh.supabase.co`)
- **Avatar system**: User avatars via Supabase storage with `supabase-avatar.js` integration
- **Config**: `supabase-config.js` initializes client

### 6. Game Integration Architecture
**Games live in `/Games/{GameName}/` folders:**
- CodeRunner: `/Games/CodeRunner/`
- ByteSurge: `/Games/ByteSurge/`
- ByteWars: `/Games/ByteWars/`

**Integration points:**
1. **Playtime tracking**: Games import `game-playtime-tracker.js` to track play sessions
2. **Firebase Auth**: Games access `window.firebaseAuth` for user state
3. **Launch methods**: 
   - Local: `/Games/{GameName}/index.html`
   - External: Netlify-hosted versions (e.g., `neurocorebytewars.netlify.app`)
4. **Game launcher**: `game-launcher.js` manages game windows and playtime events

**Community submissions:**
- Users submit games via `submit-game.html` → Firestore `game_submissions` collection
- Games displayed dynamically in `games.html` via `buildSubmissionCard()` function
- Detail pages: `game-detail.html?id={documentId}` with extended content

### 7. Styling & Theme
**CSS Variables** (`:root` in `styles.css`):
- `--primary-cyan`: cyan accent (hex: 00fff9)
- `--primary-magenta`: magenta accent (hex: ff0080)
- `--dark-bg`: background (hex: 0a0a0a)
- `--success`: success green (hex: 00ff41)

**Key CSS patterns:**
- `.glitch`: Animated glitch text effect with `::before`/`::after` pseudo-elements
- `.neural-button`: Primary CTA buttons with hover states
- `.step-indicator`: Multi-step form progress visualization
- Animations: `@keyframes` for scanlines, modal transitions, glitch effects

### 8. Licensing
**Dual license structure:**
- **Code**: MIT License (`LICENSE` file)
- **Non-code assets**: All Rights Reserved (`LICENSE-ASSETS` file)
- **Trademarks**: See `NOTICE` file
- Always respect this distinction when modifying/suggesting changes

## Common Workflows

### Editing Game Submissions (script.js)
When updating game submissions, **always include required fields** even if not visible in edit form:
```javascript
// Store original values in modal dataset
modal.dataset.playUrl = game.playUrl;
modal.dataset.coverImageUrl = game.coverImageUrl;

// Include in update payload
const updates = {
  title: titleInput.value,
  description: descInput.value,
  playUrl: modal.dataset.playUrl, // ← Critical!
  coverImageUrl: modal.dataset.coverImageUrl, // ← Critical!
  // ... other fields
};
```
**Why**: Firestore validators check the merged document state, and `playUrl`/`coverImageUrl` are required fields.

### Adding Firestore Fields
1. Update `firestore.rules` validators (e.g., `isValidGameSubmissionUpdate()`)
2. Add field to submission form UI
3. Update JavaScript to include field in create/update payloads
4. Test with Firestore emulator or staging environment

### Multi-step Forms
Use the **step indicator pattern** from `submit-game.html`:
```html
<div class="step-indicator">
  <div class="step"><div class="step-number active" id="step1">1</div></div>
  <div class="step-line" id="line1"></div>
  <div class="step"><div class="step-number" id="step2">2</div></div>
</div>
```
CSS classes: `.active`, `.completed` toggle via JavaScript `updateStepIndicator(step)`

## File Structure Quick Reference
```
/                         # Root: HTML pages
/assets/                  # Static assets (images, icons)
  /Favicon and Icons/
  /game logos/
  /icons/
/Games/{GameName}/        # Individual game folders
/functions/               # Firebase Cloud Functions
/supabase/                # Supabase SQL setup scripts
/.github/                 # GitHub config (this file)
firebase-core.js          # Centralized Firebase init
firebase-*.js             # Modular Firebase helpers
script.js                 # Main site JavaScript
styles.css                # Global cyberpunk theme
firestore.rules           # Firestore security rules
netlify.toml              # Deployment config
```

## Testing & Debugging
- **Playtime**: Use `playtime-test.html` for tracker debugging
- **Auth flow**: Check `portal-auth.js` and `signin.js`
- **Firestore errors**: Check browser console for permission errors—often due to missing required fields
- **Game cards**: Dynamic injection via `buildSubmissionCard()` in `games.html`

## Key Dependencies
- **Firebase SDK**: 10.7.1 (modular), 9.0.0-9.23.0 (compat for games)
- **Supabase**: Latest client SDK via CDN
- **Fonts**: Rajdhani (Google Fonts)
- **No npm packages**: Pure browser JavaScript

## Documentation Files
- `README.md`: Brief project overview
- `planning.md`: Original build checklist
- `AVATAR_IMPLEMENTATION.md`: Avatar system guide
- `GAME_DETAIL_PAGES_IMPLEMENTATION.md`: Game detail page technical docs
- `BUGFIX_GAME_SUBMISSION_EDIT.md`: Permission error fix documentation

---
**When in doubt**: Check `firebase-core.js` for initialization patterns, `firestore.rules` for data structure/validation, and `styles.css` for theme variables. Use semantic search for cross-file patterns.

DO NOT EVER MAKE A .MD DO NOT CREATE TEST PAGES EITHER