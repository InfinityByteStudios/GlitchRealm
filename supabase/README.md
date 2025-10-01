# Supabase Avatar Setup for GlitchRealm

This directory contains SQL scripts and documentation for setting up Supabase Storage and profiles for custom avatar uploads.

## Files

- **`avatars_setup.sql`** - Main setup script (profiles table, RLS policies, helper functions, bucket creation)
- **`avatars_storage_owner.sql`** - Owner-only script for storage policies (run if main script skips storage setup)

## Setup Steps

### 1. Run Main Setup Script

1. Open your Supabase Dashboard → SQL Editor
2. Copy the entire contents of `avatars_setup.sql`
3. Paste and click "Run"

This creates:
- `public.profiles` table with RLS enabled
- `public.ensure_profile()` function (call after sign-in)
- `avatars` storage bucket (private)
- Storage RLS policies (if you own the storage.objects table)

### 2. If Storage Policies Were Skipped

If you saw a NOTICE like:
```
Skipping storage.objects RLS/policy creation: current role (...) is not owner
```

Then run `avatars_storage_owner.sql` as the database owner:
1. Open SQL Editor as owner (or contact Supabase support)
2. Copy contents of `avatars_storage_owner.sql`
3. Paste and Run

### 3. Configure Your App

Edit `supabase-config.js` in the root directory:

```javascript
export const SUPABASE_CONFIG = {
    url: 'https://yourproject.supabase.co',
    anonKey: 'your-anon-key-here'
};
```

Get these values from:
- Supabase Dashboard → Settings → API
- Copy "Project URL" and "anon public" key

### 4. Test the Integration

1. Sign in to GlitchRealm with any provider
2. Go to User Portal (`user-portal.html`)
3. Hover over your avatar → upload overlay appears
4. Click overlay → file selector opens
5. Select an image (max 5MB)
6. Image uploads to `avatars/<uid>/<timestamp>.ext`
7. Profile updated with `custom_photo_url`
8. Avatar displays everywhere you're signed in

## Architecture

### Avatar Priority

When displaying avatars, the system uses this priority:

1. **Supabase `custom_photo_url`** - User's uploaded avatar
2. **Firebase `photoURL`** - Provider avatar (Google, GitHub, etc.)
3. **Default avatar** - `assets/icons/anonymous.png`

### Files Integration

- **`supabase-avatar.js`** - Core avatar upload/delete/profile functions
- **`supabase-config.js`** - Supabase credentials (you must edit this)
- **`portal-avatar-integration.js`** - User Portal upload UI and logic (only active on user-portal.html)
- **`header-avatar-integration.js`** - Header/nav avatar display with Supabase priority + click navigation

### User Flow

1. **From any page**: User sees their custom avatar (or provider avatar, or default)
2. **Click avatar**: Navigates to User Portal (user-portal.html)
3. **On User Portal**: Hover over avatar → upload overlay appears → click to change
4. **After upload**: Avatar updates everywhere across the site
5. **Security**: Avatar uploads only allowed from User Portal page

### Database Schema

**`public.profiles`**
```sql
- id: uuid (PK, references auth.users)
- username: text (unique)
- display_name: text
- custom_photo_url: text  -- Public/signed URL for avatar
- avatar_storage_path: text  -- Storage path: <uid>/filename.ext
- avatar_updated_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
```

**`storage.buckets.avatars`**
- Private bucket
- Files stored at `<uid>/<timestamp>_<filename>.ext`
- RLS policies enforce user can only upload/delete their own files

## Usage

### Ensure Profile Exists (after sign-in)

```javascript
import { ensureProfile } from './supabase-avatar.js';

// After Firebase auth
firebaseAuth.onAuthStateChanged(async (user) => {
    if (user) {
        await ensureProfile(user);
    }
});
```

### Upload Avatar

```javascript
import { uploadAvatarComplete } from './supabase-avatar.js';

async function handleAvatarUpload(file, userId) {
    try {
        const avatarUrl = await uploadAvatarComplete(file, userId);
        console.log('Avatar uploaded:', avatarUrl);
    } catch (error) {
        console.error('Upload failed:', error);
    }
}
```

### Get Avatar URL

```javascript
import { getAvatarUrl, getProfile } from './supabase-avatar.js';

const profile = await getProfile(user.uid);
const avatarUrl = getAvatarUrl(firebaseUser, profile);
```

### Delete/Revert Avatar

```javascript
import { deleteAvatar } from './supabase-avatar.js';

await deleteAvatar(userId, avatarStoragePath);
// Profile fields cleared, reverts to provider avatar
```

## Security

- **RLS on `profiles`**: Anyone can read; users can insert/update own row
- **RLS on `storage.objects`**:
  - `avatars_anyone_read`: authenticated users can read
  - `avatars_insert_own`: users can only upload to `<their-uid>/...`
  - `avatars_update_own`: users can only update their own files
  - `avatars_delete_own`: users can only delete their own files

- **Bucket**: Private by default; consider signed URLs for controlled sharing

## Optional: Make Avatars Public

To allow unauthenticated users to view avatars, update the read policy in `avatars_storage_owner.sql`:

Change:
```sql
CREATE POLICY avatars_anyone_read ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars');
```

To:
```sql
CREATE POLICY avatars_anyone_read ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');
```

## Troubleshooting

### "must be owner of table objects"
Run `avatars_storage_owner.sql` as the database owner or contact Supabase support.

### Avatar not updating
1. Check browser console for errors
2. Verify Supabase credentials in `supabase-config.js`
3. Check Storage → avatars bucket exists
4. Verify RLS policies in Database → Policies

### Profile not found
Ensure you called `ensure_profile()` RPC after sign-in.

### File upload fails
- Check file size (max 5MB)
- Verify file is an image type
- Check Storage quota in Supabase Dashboard

## Future Enhancements

- Image cropping modal integration (already styled in portal)
- Automatic thumbnail generation
- Avatar moderation queue
- Multiple avatar slots
- GIF/animated avatar support
- Integration with Firebase Auth photoURL sync for email-only accounts
