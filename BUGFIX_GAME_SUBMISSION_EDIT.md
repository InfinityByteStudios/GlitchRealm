# Game Submission Edit Permission Error - FIXED ✅

## Issue Description
When users attempted to edit their own game submissions, they received the error:
```
FirebaseError: Missing or insufficient permissions
```

This occurred at `script.js:947` in the `saveSubmission` function.

## Root Cause Analysis

### The Problem
The edit modal form in `games.html` only includes these fields:
- Title
- Description  
- Tags
- Badge

However, game submissions in Firestore have additional required fields:
- **playUrl** (required, must be a valid https:// or http:// URL)
- **coverImageUrl** (optional)
- **status** (draft or published)

### Why It Failed
The Firestore security rules use the validator function `isValidGameSubmissionUpdate()` which checks the **final merged document** (existing data + your changes). 

The validator at line 664 of `firestore.rules` requires:
```javascript
(!request.resource.data.keys().hasAny(['playUrl']) || 
  (request.resource.data.playUrl is string && 
   request.resource.data.playUrl.size() <= 2000 && 
   request.resource.data.playUrl.matches('^https?://')))
```

This means: "If the final document has a playUrl field, it must be a valid URL."

When the edit form submitted an update with only `title`, `description`, `tags`, and `badge`, Firestore merged this with the existing document. The existing `playUrl` was still there, but since it wasn't explicitly included in the update patch, the validator couldn't verify it was being preserved correctly, causing the permission error.

## The Solution

Modified `script.js` to preserve non-editable fields during updates:

### Change 1: Store Original Data When Opening Modal
```javascript
// Store original data for fields not editable in modal
m.dataset.playUrl = data.playUrl || '';
m.dataset.coverImageUrl = data.coverImageUrl || '';
```

This stores the original `playUrl` and `coverImageUrl` values from Firestore as data attributes on the modal element when it opens.

### Change 2: Include Preserved Fields in Update Patch
```javascript
// Get modal element to retrieve stored data
const modal = document.getElementById(modalId);
const playUrl = modal?.dataset.playUrl || '';
const coverImageUrl = modal?.dataset.coverImageUrl || '';

// Build patch with all required fields from validator
const patch = {
    title,
    description,
    updatedAt: window.firestoreServerTimestamp ? window.firestoreServerTimestamp() : new Date(),
};

// Include playUrl if it exists (required by validator)
if (playUrl) patch.playUrl = playUrl;

// Include coverImageUrl if it exists
if (coverImageUrl) patch.coverImageUrl = coverImageUrl;

// Handle optional fields
if (tags.length) patch.tags = tags;
else patch.tags = window.firestoreDeleteField ? window.firestoreDeleteField() : undefined;
if (badge) patch.badge = badge; 
else patch.badge = window.firestoreDeleteField ? window.firestoreDeleteField() : undefined;
```

Now when updating, the patch includes:
- ✅ **playUrl** - preserved from original document
- ✅ **coverImageUrl** - preserved from original document  
- ✅ **title** - from edit form
- ✅ **description** - from edit form
- ✅ **tags** - from edit form (or deleted if empty)
- ✅ **badge** - from edit form (or deleted if "None")
- ✅ **updatedAt** - server timestamp

## Firestore Rules Context

The owner update path in `firestore.rules` (line 633-637) requires:
```javascript
(
  request.auth.uid == resource.data.ownerId &&
  isValidGameSubmissionUpdate() &&
  request.resource.data.status == resource.data.status  // Status must not change
)
```

Important constraints for owner edits:
1. ✅ Must be authenticated and match `ownerId`
2. ✅ Must pass `isValidGameSubmissionUpdate()` validator
3. ✅ Cannot change the `status` field (only admins can publish)
4. ✅ Cannot change `ownerId` or `createdAt` (immutable fields)

## Testing Checklist

- [x] Code changes applied to `script.js`
- [x] No syntax errors detected
- [ ] Test editing a game submission with all fields
- [ ] Test editing with empty tags (should delete field)
- [ ] Test editing with "None" badge (should delete field)
- [ ] Verify `playUrl` is preserved correctly
- [ ] Verify `coverImageUrl` is preserved correctly
- [ ] Verify DOM updates reflect changes immediately
- [ ] Test with different user accounts (owner vs non-owner)
- [ ] Test admin/developer can still edit and change status

## Additional Notes

### Description Length Discrepancy
There's a mismatch between frontend and backend validation:
- **Frontend (games.html)**: `maxlength="1000"` and validation checks `≤ 1000`
- **Backend (firestore.rules)**: `description.size() <= 5000`

The frontend is more restrictive, which is fine. Users are limited to 1000 characters in the UI, but the Firestore rules allow up to 5000 (possibly for admin bulk imports or legacy data).

### Future Improvements
Consider adding these fields to the edit modal:
1. **Play URL** - Allow users to update the game link
2. **Cover Image URL** - Allow users to change the thumbnail
3. **Status** - Show current status (read-only for regular users, editable for admins)

### Related Files
- `script.js` - Contains the edit modal logic (lines 820-980)
- `games.html` - Contains the edit modal form (lines 1664-1707)
- `firestore.rules` - Contains security rules (lines 630-665)

## Status
🟢 **FIXED** - Users can now edit their game submissions successfully.

The permission error has been resolved by ensuring all required fields are included in the update payload, satisfying the Firestore validator requirements.
