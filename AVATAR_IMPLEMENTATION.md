# Avatar Upload Imp### 3. User Portal Integration
- **`portal-avatar-integration.js`** - Full upload flow for user-portal.html:
  - **Only active on User Portal page** - avatar uploads restricted for security
  - Hover over avatar → upload overlay appears
  - Click overlay → file selector opens
  - Upload to Supabase Storage
  - Update profile with new avatar
  - Display new avatar immediately
  - "Revert to Provider Avatar" button (shows only when custom avatar exists)
- **`user-portal.html`** - Script import added

### 4. Sitewide Avatar Display & Navigation
- **`header-avatar-integration.js`** - Displays custom avatars in header/nav:
  - Automatically checks Supabase for custom avatar
  - Falls back to Firebase photoURL if no custom avatar
  - **Click avatar → navigate to User Portal** (for avatar changes)
  - Upload overlays hidden outside User Portal
  - Works on all pages with header
  - Profile cache for performance
- **`index.html`** - Script import added (add to other pages as needed)ry

## ✅ What's Been Implemented

### 1. Database Setup (Supabase)
- **SQL Scripts** in `supabase/` folder:
  - `avatars_setup.sql` - Full setup (profiles, RLS, bucket, policies)
  - `avatars_storage_owner.sql` - Storage policies (if main script skips)
  - `README.md` - Complete documentation

### 2. Core Avatar System
- **`supabase-config.js`** - Configuration file (YOU MUST EDIT with your Supabase credentials)
- **`supabase-avatar.js`** - Core functions:
  - `uploadAvatarComplete()` - Upload avatar to storage
  - `updateProfileAvatar()` - Update profile with avatar URL
  - `deleteAvatar()` - Delete avatar and revert to provider photo
  - `getProfile()` - Fetch user profile
  - `getAvatarUrl()` - Get avatar with priority: custom → provider → default

### 3. User Portal Integration
- **`portal-avatar-integration.js`** - Full upload flow for user-portal.html:
  - Hover over avatar → upload overlay appears
  - Click overlay → file selector opens
  - Upload to Supabase Storage
  - Update profile with new avatar
  - Display new avatar immediately
  - "Revert to Provider Avatar" button (shows only when custom avatar exists)
- **`user-portal.html`** - Script import added

### 4. Sitewide Avatar Display
- **`header-avatar-integration.js`** - Displays custom avatars in header/nav:
  - Automatically checks Supabase for custom avatar
  - Falls back to Firebase photoURL if no custom avatar
  - Works on all pages with header
  - Profile cache for performance
- **`index.html`** - Script import added (add to other pages as needed)

## 🚀 Setup Instructions

### Step 1: Run SQL in Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → SQL Editor
2. Copy entire contents of `supabase/avatars_setup.sql`
3. Paste and click "Run"
4. If you see "Skipping storage.objects..." notice, also run `supabase/avatars_storage_owner.sql` as owner

### Step 2: Configure Credentials
Edit `supabase-config.js`:
```javascript
export const SUPABASE_CONFIG = {
    url: 'https://yourproject.supabase.co',  // From Dashboard → Settings → API
    anonKey: 'eyJhbG...'  // From Dashboard → Settings → API (anon/public key)
};
```

### Step 3: Add Header Integration to Other Pages
Add this line before `</body>` on any page with the header:
```html
<script type="module" src="header-avatar-integration.js"></script>
```

This enables:
- Custom avatar display from Supabase
- Click avatar → navigate to User Portal (for changes)
- Upload overlays are automatically hidden (uploads only allowed from User Portal)

Already added to:
- ✅ `index.html`
- ✅ `user-portal.html`

Add to (recommended):
- `games.html`
- `community.html`
- `projects.html`
- `about.html`
- `support.html`
- `moderation.html`
- `submit-game.html`
- etc.

### Step 4: Test
1. Sign in to GlitchRealm
2. **Click your avatar in the nav** → redirects to User Portal
3. On User Portal, hover over your avatar
4. Click the upload overlay
5. Select an image (JPEG/PNG, max 5MB)
6. Image uploads → profile updates → avatar displays everywhere
7. Navigate to any other page → your custom avatar shows everywhere
8. Click avatar on any page → returns to User Portal

## 📁 File Structure

```
GlitchRealm/
├── supabase/
│   ├── avatars_setup.sql          # Main DB setup
│   ├── avatars_storage_owner.sql  # Storage policies (owner-only)
│   └── README.md                  # Full documentation
├── supabase-config.js             # YOUR CREDENTIALS (edit this!)
├── supabase-avatar.js             # Core avatar functions
├── portal-avatar-integration.js   # User Portal upload UI
├── header-avatar-integration.js   # Header avatar display
├── user-portal.html               # ✅ Integration added
└── index.html                     # ✅ Integration added
```

## 🔐 Security & Priority

### Avatar Display Priority
1. **Supabase custom_photo_url** (user uploaded)
2. **Firebase photoURL** (provider avatar from Google/GitHub/etc.)
3. **Default avatar** (`assets/icons/anonymous.png`)

### RLS Policies
- **Profiles**: Anyone can read; users update own row
- **Storage**: Users can only upload/update/delete their own files at `<uid>/...`
- **Bucket**: Private (use signed URLs if needed)

## 🎨 Features

✅ **User Portal only uploads** - Avatar changes restricted to user-portal.html for security  
✅ **Click avatar to navigate** - Clicking profile picture anywhere takes you to User Portal  
✅ Hover overlay on avatar with upload icon (User Portal only)  
✅ File validation (image type, max 5MB)  
✅ Upload to user-specific folder (`<uid>/<timestamp>.ext`)  
✅ Automatic profile update with new avatar URL  
✅ Instant UI refresh after upload  
✅ Revert button (deletes custom avatar, shows provider photo)  
✅ Sitewide avatar display with Supabase priority  
✅ Profile caching for performance  
✅ Integration with existing Firebase auth  

## 🔧 Next Steps (Optional)

1. **Add to more pages**: Copy the `<script type="module" src="header-avatar-integration.js"></script>` line to other pages
2. **Image cropping**: Wire existing crop modal into the upload flow (modal exists, just needs connection)
3. **Public avatars**: Change storage policy from `authenticated` to `public` in `avatars_storage_owner.sql` and re-run
4. **Thumbnail generation**: Add Supabase Edge Function to create smaller versions
5. **Avatar moderation**: Add admin review for uploaded avatars

## 🐛 Troubleshooting

### Avatar not uploading
- Check browser console for errors
- Verify `supabase-config.js` has correct URL and key
- Check Supabase Dashboard → Storage → avatars bucket exists

### Avatar not displaying
- Check Supabase Dashboard → Database → Tables → profiles (row should exist)
- Check `custom_photo_url` field is populated
- Clear browser cache
- Check browser console for fetch errors

### "Must be owner" error in SQL
- Run `supabase/avatars_storage_owner.sql` as database owner
- Or contact Supabase support to apply storage policies

## 📞 Support

See full documentation in `supabase/README.md` for detailed usage, API reference, and troubleshooting.
