# Quick Setup Guide for auth.glitchrealm.ca

## Step-by-Step Deployment

### Option 1: Separate Netlify Site (Recommended)

#### Step 1: Create New Netlify Site
```bash
# From your terminal:
cd "c:\Users\Hanan\Desktop\InfinityByte Studios\Shared\GlitchRealm"

# If you have Netlify CLI installed:
netlify sites:create --name glitchrealm-auth
```

Or manually:
1. Go to https://app.netlify.com
2. Click "Add new site"
3. Choose "Deploy manually" or "Import from Git"
4. Set base directory to `auth`

#### Step 2: Configure Build Settings
- **Base directory:** `auth`
- **Build command:** (leave empty)
- **Publish directory:** `.` (current directory, since we're already in auth/)

#### Step 3: Add Custom Domain
1. Site settings → Domain management
2. Add custom domain: `auth.glitchrealm.ca`
3. Follow DNS instructions

#### Step 4: Update DNS
Add a CNAME record:
- **Type:** CNAME
- **Name:** auth
- **Target:** [your-site-name].netlify.app
- **Proxy:** Off (or On if using Cloudflare)

---

### Option 2: Branch-Based Deploy (Alternative)

Create a separate branch for auth subdomain:
```bash
git checkout -b auth-subdomain
# Push only the auth directory
git push origin auth-subdomain
```

Configure in Netlify:
- Create new site from `auth-subdomain` branch
- Set publish directory to `auth`

---

### Option 3: Subdomain via _redirects (Simpler, but less isolated)

If you don't want a separate Netlify site, add to your main site's `_redirects` file:

```
# In the root _redirects file
/auth/*  /auth/:splat  200
```

Then configure DNS to point `auth.glitchrealm.ca` to the same Netlify site.

---

## DNS Configuration Examples

### Cloudflare DNS
```
Type: CNAME
Name: auth
Content: glitchrealm-auth.netlify.app
Proxy status: DNS only (gray cloud)
TTL: Auto
```

### GoDaddy DNS
```
Type: CNAME
Host: auth
Points to: glitchrealm-auth.netlify.app
TTL: 1 Hour
```

### Namecheap DNS
```
Type: CNAME Record
Host: auth
Value: glitchrealm-auth.netlify.app
TTL: Automatic
```

---

## Testing Checklist

After deployment, test:
- [ ] https://auth.glitchrealm.ca loads
- [ ] CSS styles load correctly
- [ ] Sign-in form works
- [ ] Google/GitHub sign-in works
- [ ] Redirect to main site works after login
- [ ] Auth state persists on main site
- [ ] "Continue as Guest" redirects to https://glitchrealm.ca
- [ ] SSL certificate is valid

---

## Firebase Configuration

Ensure your Firebase console has these authorized domains:
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add:
   - `glitchrealm.ca`
   - `auth.glitchrealm.ca`
   - `localhost` (for testing)

---

## Post-Deployment

### Update Links on Main Site
Search for all references to `signin.html` and update them to `https://auth.glitchrealm.ca`:

Files to check:
- `index.html` (sign-in buttons)
- `header.html` (navigation links)
- `user-portal.html` (auth links)
- Any other pages with sign-in links

### Monitor
- Check Netlify deploy logs
- Monitor Firebase usage
- Test from different devices/browsers

---

## Rollback Plan

If something goes wrong:
1. Remove CNAME record for `auth.glitchrealm.ca`
2. Remove redirects from main site's netlify.toml
3. Revert to using `auth.glitchrealm.ca` on main domain

The old signin.html on the main site will still work as fallback.
