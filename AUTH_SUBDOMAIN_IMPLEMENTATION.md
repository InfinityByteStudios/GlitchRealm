# Auth Subdomain Implementation Summary

## What Was Created

I've set up a dedicated authentication subdomain `auth.glitchrealm.ca` for your GlitchRealm sign-in page.

### Files Created

1. **`auth/index.html`** - Sign-in page optimized for subdomain
   - All resource paths use absolute URLs (e.g., `/styles.css`)
   - "Continue as Guest" redirects to `https://glitchrealm.ca`
   - Identical functionality to your current signin.html

2. **`auth/netlify.toml`** - Netlify configuration for auth subdomain
   - Security headers (X-Frame-Options, CSP, etc.)
   - Cache control for static assets
   - Redirects for /signin and /login to root

3. **`auth/README.md`** - Technical documentation
   - How cross-domain auth works
   - File structure explanation
   - Security considerations
   - Troubleshooting guide

4. **`auth/SETUP.md`** - Step-by-step setup instructions
   - 3 deployment options explained
   - DNS configuration examples for different providers
   - Testing checklist
   - Rollback plan

5. **`deploy-auth.ps1`** - PowerShell deployment helper
   - Verifies all files are present
   - Shows next steps for deployment

### Files Modified

1. **`netlify.toml`** (main site)
   - Added redirects: `auth.glitchrealm.ca`, `/signin`, `/login` → `https://auth.glitchrealm.ca`
   - Force redirects to ensure old links work

## How It Works

### Architecture
```
User visits glitchrealm.ca/signin
         ↓
301 Redirect to auth.glitchrealm.ca
         ↓
Sign-in page loads
         ↓
User authenticates with Firebase
         ↓
Firebase sets auth token (shared across *.glitchrealm.ca)
         ↓
User returns to glitchrealm.ca (authenticated)
```

### Why This Works
- Firebase auth state persists across subdomains
- Using `LOCAL` persistence mode
- Auth token stored in browser local storage
- Both domains use the same Firebase project

## Deployment Steps

### Quick Start (Manual Deploy)
1. Go to https://app.netlify.com
2. Click "Add new site" → "Deploy manually"
3. Drag the `auth` folder from your project
4. In site settings, add custom domain: `auth.glitchrealm.ca`
5. Update your DNS with the CNAME record Netlify provides

### Using Git
1. Push your code to GitHub
2. Create new Netlify site from Git
3. Set base directory to `auth`
4. Add custom domain: `auth.glitchrealm.ca`

## DNS Configuration

Add this CNAME record to your DNS:
```
Type: CNAME
Name: auth
Value: [your-auth-site].netlify.app
TTL: 3600 (or Auto)
```

If using Cloudflare:
- Set Proxy status to "DNS only" (gray cloud)

## Firebase Setup

Add to authorized domains in Firebase Console:
1. Go to Firebase Console
2. Authentication → Settings → Authorized domains
3. Click "Add domain"
4. Enter: `auth.glitchrealm.ca`

## Testing Checklist

After deployment:
- [ ] https://auth.glitchrealm.ca loads
- [ ] Page styles load correctly (cyberpunk theme)
- [ ] Sign-in form submits
- [ ] Google sign-in works
- [ ] GitHub sign-in works
- [ ] After login, user returns to main site
- [ ] Auth state persists on glitchrealm.ca
- [ ] Old links (glitchrealm.caauth.glitchrealm.ca) redirect properly
- [ ] SSL certificate shows as valid

## Benefits

1. **Security**: Isolated authentication domain
2. **Performance**: Can be cached independently
3. **Organization**: Clear separation of concerns
4. **Scalability**: Easy to add more auth methods
5. **Branding**: Professional subdomain structure

## Maintenance

### Updating the Sign-In Page
Simply edit `auth/index.html` and redeploy. Since it loads CSS/JS from the main site, those updates happen automatically.

### Keeping in Sync
The auth subdomain loads these from the main site:
- `/styles.css`
- `/firebase-core.js`
- `/signin.js`
- `/script.js`

When you update these on the main site, the auth page gets the updates automatically.

## Need Help?

See the detailed guides:
- **Technical details**: `auth/README.md`
- **Setup instructions**: `auth/SETUP.md`

## Next Actions

1. Run `deploy-auth.ps1` to verify setup
2. Deploy to Netlify (manual or Git)
3. Configure DNS
4. Add domain to Firebase
5. Test the flow
6. Update any hardcoded signin links on your site

Good luck! 🚀
