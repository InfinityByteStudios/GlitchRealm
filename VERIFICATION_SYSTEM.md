# Verification System - User Guide

## Overview

The GlitchRealm verification system allows users to become verified creators with the ability to submit games and/or publish news articles. When verified, your chosen username will be displayed as attribution for your content.

## Features

### 1. **Username Attribution**
When you get verified, you choose a username that will be shown:
- For games: "Made by [YourUsername]"
- For articles: "By [YourUsername]"

### 2. **Verification Types**
You can request verification for one or both of the following:

#### Games Verification
- Allows you to submit games to the GlitchRealm games library
- Your verified username appears on your game submissions
- Games go through moderation before being published

#### News Verification
- Allows you to write and publish news articles
- Your verified username appears as the article author
- Currently limited to approved developers

### 3. **Verification Request Process**

1. **Sign In**: You must be signed in to request verification
2. **Navigate to User Portal**: Go to [user-portal.html](user-portal.html#verification-section)
3. **Fill Out the Form**:
   - **Username** (required): The name that will appear as "Made by [username]"
   - **Display Name** (optional): Your creator or studio name
   - **Verification Type** (required): Select Games, News, or both
   - **Bio** (optional): Tell us about your work and experience
   - **Links** (optional, up to 5): Portfolio, itch.io, Steam, GitHub, etc.
4. **Submit**: Click "Submit Verification"
5. **Wait for Review**: Admins/developers will review your request

### 4. **Verification Status**

Your verification request can have one of these statuses:
- **Draft**: You haven't submitted yet
- **Pending**: Your request is under review
- **Approved**: You are now verified! 🎉
- **Denied**: Your request was not approved (contact support for details)

## Database Schema

### Verification Requests Collection (`verification_requests/{uid}`)
```javascript
{
  uid: string,              // User ID (required)
  username: string,         // Username for attribution (required, max 50 chars)
  displayName: string,      // Display name (optional, max 100 chars)
  bio: string,              // User bio (optional, max 1000 chars)
  links: array,             // Array of URLs (optional, max 5)
  verificationTypes: array, // ['games', 'news'] or subset (required, 1-2 items)
  status: string,           // 'pending', 'draft', 'approved', or 'denied'
  createdAt: timestamp,     // When the request was created
  decidedAt: timestamp,     // When admin approved/denied (admin-only)
  reviewerId: string,       // UID of reviewing admin (admin-only)
  notes: string             // Admin notes (admin-only)
}
```

### Verified Users Collection (`verified_users/{uid}`)
```javascript
{
  verified: true,           // Always true for verified users
  verifiedAt: timestamp,    // When verification was granted
  username: string,         // Username for attribution (max 50 chars)
  verificationTypes: array, // ['games', 'news'] or subset
  badgeType: string,        // 'creator', 'developer', 'artist', 'community' (optional)
  reviewerId: string        // UID of admin who verified (optional)
}
```

### Game Submissions (`game_submissions/{id}`)
Now includes:
```javascript
{
  // ... existing fields ...
  ownerUsername: string     // Owner's verified username (max 100 chars)
}
```

### News Articles (`news_articles/{id}`)
Now includes:
```javascript
{
  // ... existing fields ...
  authorUsername: string    // Author's verified username (max 100 chars)
}
```

## Security Rules

### Verification Requests
- **Read**: Requester can read their own; admins/devs can read all
- **Create**: User can create their own request with valid schema
- **Update**: 
  - Users can update their own non-privileged fields (username, displayName, bio, links, verificationTypes)
  - Admins/devs can update status and review fields
  - Once approved/denied, users cannot modify (contact support instead)
- **Delete**: Requester or admins/devs can delete

### Verified Users
- **Read**: Public (anyone can read)
- **Write**: Admins and developers only

## Admin Workflow

### Approving a Verification Request

1. **Review the Request**: Check the user's bio, links, and requested verification types
2. **Update the Request Status**:
   ```javascript
   // In moderation.js or admin panel
   await updateDoc(doc(db, 'verification_requests', uid), {
     status: 'approved',
     decidedAt: serverTimestamp(),
     reviewerId: currentAdminUid,
     notes: 'Optional admin notes'
   });
   ```

3. **Create Verified User Entry**:
   ```javascript
   await setDoc(doc(db, 'verified_users', uid), {
     verified: true,
     verifiedAt: serverTimestamp(),
     username: requestData.username,
     verificationTypes: requestData.verificationTypes,
     badgeType: 'creator', // or 'developer', 'artist', 'community'
     reviewerId: currentAdminUid
   });
   ```

### Denying a Verification Request

```javascript
await updateDoc(doc(db, 'verification_requests', uid), {
  status: 'denied',
  decidedAt: serverTimestamp(),
  reviewerId: currentAdminUid,
  notes: 'Reason for denial (optional)'
});
```

## Helper Functions

The `verified-user-helper.js` module provides utilities:

```javascript
import { 
  getVerifiedUserData,
  getVerifiedUsername,
  isVerifiedForType,
  getDisplayName,
  getCachedUsername
} from './verified-user-helper.js';

// Get all verified user data
const userData = await getVerifiedUserData(uid);

// Get just the username
const username = await getVerifiedUsername(uid);

// Check if verified for specific type
const canSubmitGames = await isVerifiedForType(uid, 'games');
const canPublishNews = await isVerifiedForType(uid, 'news');

// Get display name with fallback
const name = await getDisplayName(uid, 'Anonymous');

// Get username with caching (reduces Firestore reads)
const cachedName = await getCachedUsername(uid);
```

## Migration Notes

### Existing Users
- Existing game submissions without `ownerUsername` will still work
- Existing news articles without `authorUsername` will still work
- When these are next edited, the username field should be added

### Adding Username to Existing Content
Run this migration script for existing verified users:

```javascript
// Example migration script
const verifiedUsers = await getDocs(collection(db, 'verified_users'));

for (const userDoc of verifiedUsers.docs) {
  const uid = userDoc.id;
  const username = userDoc.data().username;
  
  if (!username) continue;
  
  // Update all game submissions by this user
  const gamesQuery = query(
    collection(db, 'game_submissions'),
    where('ownerId', '==', uid)
  );
  const gamesDocs = await getDocs(gamesQuery);
  
  for (const gameDoc of gamesDocs.docs) {
    await updateDoc(gameDoc.ref, { ownerUsername: username });
  }
  
  // Update all articles by this user
  const articlesQuery = query(
    collection(db, 'news_articles'),
    where('authorUid', '==', uid)
  );
  const articlesDocs = await getDocs(articlesQuery);
  
  for (const articleDoc of articlesDocs.docs) {
    await updateDoc(articleDoc.ref, { authorUsername: username });
  }
}
```

## Testing

### Test Verification Request
1. Sign in as a test user
2. Go to User Portal → Verification Section
3. Fill out the form with username "TestCreator"
4. Select "Games" verification type
5. Submit the request
6. Verify the document was created in Firestore

### Test Admin Approval
1. Sign in as an admin
2. Navigate to the moderation panel
3. Find the pending verification request
4. Approve it and verify the `verified_users` entry is created

### Test Game Submission
1. Sign in as the verified user
2. Go to Submit Game page
3. Submit a test game
4. Verify `ownerUsername` is set correctly in Firestore
5. Check that "Made by TestCreator" appears on the game card

### Test Article Publishing
1. Sign in as a verified news publisher
2. Go to news publishing page
3. Create and publish an article
4. Verify `authorUsername` is set correctly
5. Check that "By TestCreator" appears on the article

## FAQ

**Q: Can I change my username after verification?**
A: Currently, you'll need to contact support. Username changes require updating all your existing content.

**Q: What if I want both Games and News verification?**
A: Select both checkboxes in the verification form. Admins will review both requests together.

**Q: What happens to my content if verification is revoked?**
A: Your existing content remains, but you won't be able to submit new content. The username attribution stays.

**Q: Can I be verified for Games but not News?**
A: Yes! You can choose either or both verification types based on what you want to do.

## Support

For verification issues or questions:
- Visit [support.html](support.html)
- Email: [your support email]
- Discord: [your discord link]
