# Gravatar Integration for GlitchRealm

## Overview
GlitchRealm now integrates with **Gravatar API v3.0.0** to provide automatic avatar and profile enrichment for users. This creates a better onboarding experience by leveraging users' existing Gravatar profiles.

## What is Gravatar?
Gravatar (Globally Recognized Avatar) is a service used by 70+ million users worldwide that provides:
- Consistent avatars across all Gravatar-enabled sites
- Rich profile data (location, bio, job title, verified social accounts)
- Automatic profile synchronization

## Integration Architecture

### Avatar Priority System
GlitchRealm uses a **4-tier fallback system** for user avatars:

1. **Supabase Upload** (highest priority): Custom avatar uploaded by user
2. **Gravatar**: Avatar from user's Gravatar profile based on email
3. **Firebase Provider**: Photo from OAuth provider (Google, GitHub)
4. **Default**: Anonymous avatar placeholder

### Profile Enrichment
When a user signs in with an email that has a Gravatar profile, GlitchRealm automatically:
- Fetches their Gravatar profile data
- Populates **empty fields only** (never overwrites existing data)
- Stores enrichment timestamp in Firestore

**Enriched Fields:**
- `displayName` - Display name
- `location` - User location
- `bio` - Profile description
- `jobTitle` - Job title
- `company` - Company name
- `pronouns` - User pronouns
- `avatarUrl` - Gravatar avatar URL (if no custom upload)
- `gravatarVerifiedAccounts` - Verified social media accounts

## Technical Implementation

### Files
- **`gravatar-integration.js`**: Core Gravatar API integration
- **`supabase-avatar.js`**: Avatar system with Gravatar fallback
- **`firebase-core.js`**: Auto-initialization of Gravatar on auth

### Key Functions

#### `getGravatarHash(email)`
Generates SHA256 hash of email (Gravatar's identifier):
```javascript
const hash = await getGravatarHash('user@example.com');
// Returns: '27205e5c51cb03f862138b22bcb5dc20...'
```

#### `getGravatarAvatarUrl(email, options)`
Gets avatar URL for an email:
```javascript
const avatarUrl = await getGravatarAvatarUrl('user@example.com', {
  size: 200,
  default: 'mp', // Mystery Person fallback
  rating: 'g'
});
```

#### `getGravatarProfile(email)`
Fetches full profile data (requires API key):
```javascript
const profile = await getGravatarProfile('user@example.com');
// Returns: { display_name, location, bio, verified_accounts, ... }
```

#### `getBestAvatar(user, supabaseAvatarUrl)`
Gets best available avatar using priority system:
```javascript
const avatarUrl = await getBestAvatar(firebaseUser, supabaseAvatar);
```

#### `enrichProfileWithGravatar(uid, email)`
Enriches Firestore profile with Gravatar data:
```javascript
await enrichProfileWithGravatar(user.uid, user.email);
```

#### `getGravatarQRCode(email, options)`
Generates QR code for profile sharing:
```javascript
const qrUrl = await getGravatarQRCode('user@example.com', {
  size: 300,
  version: 3, // Modern dots style
  type: 'user'
});
```

### API Configuration
Located in `gravatar-integration.js`:
```javascript
const GRAVATAR_CONFIG = {
  apiKey: '6660:gk-WP7wBMaTBQYLhYKUQ-wfxHPw8emd596JfYNUcOuL_qwdbHF8KPRa5jeo7tJvZ',
  baseUrl: 'https://api.gravatar.com/v3',
  avatarBaseUrl: 'https://0.gravatar.com/avatar',
  enabled: true
};
```

## Automatic Features

### On User Sign-In
1. Firebase auth state change detected
2. Gravatar profile fetched (if email exists)
3. Firestore profile enriched with missing data
4. Avatar updated if no custom upload exists
5. Enrichment flag set to prevent re-enrichment

### Avatar Display
All avatar displays automatically use Gravatar fallback:
```javascript
// In header, user portal, etc.
const avatarUrl = await getAvatarUrl(firebaseUser, supabaseProfile);
```

## Rate Limits
- **Default**: 1000 requests/hour with API key
- **Custom limits**: Available for free upon request to Gravatar team
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Total allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Security & Privacy

### API Key Security
✅ **DO:**
- Store API key server-side only
- Use environment variables in production
- Rotate keys periodically

❌ **DON'T:**
- Expose API key in client-side code (currently acceptable for demo, but migrate to backend)
- Commit API keys to public repos
- Share keys across environments

### User Privacy
- Gravatar integration respects user privacy
- Only enriches profiles for users who voluntarily use Gravatar
- Never overwrites user-entered data
- Profile enrichment can be disabled by setting `GRAVATAR_CONFIG.enabled = false`

## Troubleshooting

### Avatar Not Loading
1. Check if email hash is correct (trim whitespace, lowercase)
2. Verify user has set up Gravatar at gravatar.com
3. Check browser console for API errors

### Profile Not Enriching
1. Verify API key is valid
2. Check if user has public Gravatar profile
3. Look for `gravatarEnriched: true` in Firestore user document
4. Check rate limits in response headers

### Hash Mismatch
Gravatar uses **SHA256** (not MD5 like older docs):
```javascript
// CORRECT ✅
const hash = await getGravatarHash(email); // Uses SHA256

// INCORRECT ❌
const hash = md5(email); // Old Gravatar used MD5
```

## Future Enhancements

### Planned Features
- [ ] Gravatar Quick Editor integration (in-app profile editing)
- [ ] Gravatar Hovercards (profile popups on avatar hover)
- [ ] Backend API key proxy for enhanced security
- [ ] Profile QR code in user portal
- [ ] Gravatar profile syncing (2-way sync)

### Migration Path
Currently the API key is client-side for simplicity. For production:
1. Create backend endpoint: `POST /api/gravatar/profile`
2. Store API key in environment variables
3. Proxy requests through backend
4. Update `gravatar-integration.js` to use backend endpoint

## Resources
- **Gravatar API Documentation**: https://docs.gravatar.com/api/
- **OpenAPI Spec**: https://api.gravatar.com/v3/openapi
- **Developer Dashboard**: https://gravatar.com/developers
- **Support**: Gravatar team via developer dashboard

## License Note
Gravatar API is **free and open** for all use cases. No attribution required, though appreciated.

---

**Last Updated**: November 12, 2025  
**GlitchRealm Version**: 1.0  
**Gravatar API Version**: 3.0.0
