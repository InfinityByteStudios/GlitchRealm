# Auth Subdomain Setup - auth.glitchrealm.ca

This directory contains the dedicated authentication subdomain for GlitchRealm.

## Setup Instructions

### 1. Netlify Site Setup
1. Go to Netlify Dashboard
2. Click "Add new site" → "Import an existing project"
3. Connect to your GitHub repository
4. **Build settings:**
   - Base directory: `auth`
   - Build command: (leave empty)
   - Publish directory: `auth`
5. Deploy the site

### 2. Domain Configuration
1. In Netlify site settings → Domain management
2. Click "Add custom domain"
3. Enter: `auth.glitchrealm.ca`
4. Netlify will provide DNS instructions

### 3. DNS Configuration
In your DNS provider (e.g., Cloudflare, GoDaddy):
- **Type:** CNAME
- **Name:** auth
- **Value:** [your-netlify-subdomain].netlify.app
- **TTL:** Auto or 3600

### 4. SSL/HTTPS
Netlify automatically provisions SSL certificates for custom domains. This may take a few minutes after DNS propagation.

## File Structure

```
auth/
├── index.html          # Main sign-in page
├── netlify.toml        # Netlify configuration for auth subdomain
└── README.md           # This file
```

## How It Works

### Cross-Domain Authentication
- Firebase auth state is shared across `glitchrealm.ca` and `auth.glitchrealm.ca`
- After successful sign-in, users are redirected back to main site
- Session persists using Firebase's `LOCAL` persistence mode

### Redirects
Main site (`glitchrealm.ca`) redirects:
- `/signin.html` → `https://auth.glitchrealm.ca`
- `/signin` → `https://auth.glitchrealm.ca`
- `/login` → `https://auth.glitchrealm.ca`

### Resource Loading
All assets (CSS, JS, images) are loaded from the main domain using absolute paths:
- `/styles.css` → loads from glitchrealm.ca
- `/firebase-core.js` → loads from glitchrealm.ca
- `/signin.js` → loads from glitchrealm.ca

## Testing

### Local Testing
Since this is a subdomain, local testing requires:
1. Update `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
   ```
   127.0.0.1 auth.glitchrealm.local
   ```
2. Use a local server that supports custom domains

### Production Testing
After deployment:
1. Visit `https://auth.glitchrealm.ca`
2. Test sign-in flow
3. Verify redirect back to main site after authentication
4. Check that auth state persists on main site

## Security Considerations

### Headers Set
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Privacy protection
- `Permissions-Policy` - Restricts unnecessary browser features

### Firebase Configuration
- Uses same Firebase project as main site
- `authDomain: shared-sign-in.firebaseapp.com`
- Local persistence for cross-domain auth

## Maintenance

### Updating Sign-In Page
1. Make changes to `/auth/index.html`
2. Commit and push to GitHub
3. Netlify auto-deploys the auth subdomain

### Keeping JS/CSS in Sync
Since auth subdomain loads resources from main site, CSS/JS updates on main site automatically apply to auth subdomain.

## Troubleshooting

### "Continue as Guest" button goes nowhere
- Should redirect to `https://glitchrealm.ca`
- Check the onclick handler in index.html

### Auth state not persisting
- Verify Firebase config matches main site
- Check browser console for CORS errors
- Ensure Firebase auth domain includes both domains

### CSS/JS not loading
- Verify absolute paths start with `/`
- Check Netlify deploy logs
- Test resource URLs directly in browser

## Support
For issues or questions, contact the GlitchRealm development team.
