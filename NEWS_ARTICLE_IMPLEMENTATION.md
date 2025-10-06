# News Article System Implementation

## Overview
Updated the GlitchRealm news publishing system with proper Firestore security rules and client-side access controls for article submission and image uploads.

## Changes Made

### 1. Firestore Rules (`firestore.rules`)

Added comprehensive security rules for the `news_articles` collection:

#### **Collection Rules**
- **Read Access**: 
  - Published articles (draft=false) are publicly readable
  - Authors can read their own draft articles
  - Developers can read all articles (published and drafts)
  
- **Create Access**: 
  - Only developers can create articles
  - Must set authorUid to their own UID
  - Must pass validation (title, summary, content, etc.)
  
- **Update Access**: 
  - Only developers can update articles
  - Author UID and creation timestamp are immutable
  - All updates must pass validation
  
- **Delete Access**: 
  - Only developers can delete articles

#### **Validation Functions**

**`isValidNewsArticle(data)`** - Validates article creation:
- Required fields: `title`, `summary`, `content`, `authorUid`, `createdAt`, `updatedAt`, `draft`
- Title: 1-140 characters
- Summary: 1-400 characters
- Content: 1-50,000 characters
- Categories: optional list, max 10 items
- Tags: optional list, max 25 items
- Cover image URL: optional, max 2000 characters
- Embed URL: optional, max 2000 characters
- Published timestamp: optional (null for drafts)

**`isValidNewsArticleUpdate()`** - Validates article updates:
- Allows changes to: title, summary, content, categories, tags, coverImageUrl, embed, draft, publishedAt, updatedAt
- Immutable fields: authorUid, createdAt
- All field constraints same as creation

### 2. Client-Side Access Control (`publish.js`)

#### **New Functions**

**`isDevUID(uid)`**
- Checks if a user UID is in the EDITOR_UIDS list
- Returns boolean

**`updateImageUploadAccess(user)`**
- Enables/disables the cover image file input based on dev status
- Shows/hides "Coming Soon" badge for non-developers
- Shows/hides restriction message for non-developers

**Enhanced `uploadCoverIfAny()`**
- Added double-check: verifies user is a developer before uploading to Supabase
- Throws error if non-developer attempts image upload
- Prevents bypass attempts

**Updated `requireEditor(user)`**
- Now calls `updateImageUploadAccess(user)` after authorization check
- Ensures image upload state matches user permissions

**Enhanced `onAuthStateChanged` handler**
- Calls `updateImageUploadAccess(user)` for all authenticated users
- Properly sets image upload state on page load

### 3. UI Improvements (`publish.html`)

#### **Cover Image Field**
- Added "Coming Soon" badge (hidden by default, shown for non-devs)
- File input starts as `disabled`
- Added restriction message (hidden by default, shown for non-devs)

#### **Styling**
```css
.coming-soon-badge {
  display: inline-block;
  margin-left: 8px;
  background: linear-gradient(135deg, #ff6b00, #ff9500);
  padding: 3px 10px;
  border-radius: 12px;
  font-size: .55rem;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
  color: #fff;
  box-shadow: 0 2px 8px rgba(255,107,0,0.4);
}

#cover:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

## Developer UIDs (Authorized Editors)
The following UIDs have full article publishing and image upload access:
- `6iZDTXC78aVwX22qrY43BOxDRLt1`
- `YR3c4TBw09aK7yYxd7vo0AmI6iG3`
- `g14MPDZzUzR9ELP7TD6IZgk3nzx2`
- `4oGjihtDjRPYI0LsTDhpXaQAJjk1`
- `ZEkqLM6rNTZv1Sun0QWcKYOIbon1`

## Image Storage
- Images are uploaded to **Supabase** storage bucket `news-media/covers/`
- **NOT** using Firebase Storage (as per requirements)
- Only developers can upload images
- Non-developers see grayed-out upload field with "Coming Soon" badge

## Article Submission Flow

### For Developers:
1. Sign in with authorized developer account
2. Navigate to `/news/publish.html`
3. Fill out article form (all fields enabled)
4. Optionally upload cover image to Supabase
5. Click "Publish" (published immediately) or "Save Draft" (draft mode)
6. Firestore validates and saves article

### For Non-Developers:
1. Sign in with any account
2. Navigate to `/news/publish.html`
3. See "Access Restricted" message (currently blocks entire form)
4. Cannot submit articles

**Note**: Currently, only developers can create articles. If you want non-developers to submit articles (but not upload images), you'll need to modify the `requireEditor()` function logic.

## Security Features

### Multi-Layer Protection
1. **Firestore Rules** - Server-side validation (cannot be bypassed)
2. **Client-side Checks** - UX/UI restrictions for better user experience
3. **Upload Validation** - Double-check in upload function prevents bypass

### Image Upload Restrictions
- File input disabled for non-developers (HTML attribute)
- "Coming Soon" badge visible for non-developers
- Upload function throws error if non-dev attempts upload
- Firestore doesn't directly validate image URLs (they come from Supabase)

## Testing Checklist

- [ ] Developer can create articles with images
- [ ] Developer can create draft articles
- [ ] Developer can update their own articles
- [ ] Developer can delete articles
- [ ] Non-developer sees grayed-out image upload
- [ ] Non-developer sees "Coming Soon" badge
- [ ] Non-developer cannot bypass image upload restrictions
- [ ] Published articles are publicly readable
- [ ] Draft articles are only readable by author and developers
- [ ] Firestore rejects invalid article data
- [ ] Firestore rejects non-developer article creation attempts

## Future Enhancements

1. **Allow Non-Developer Submissions**
   - Modify `requireEditor()` to allow article submission
   - Keep image upload restricted
   - Add moderation workflow (pending/approved status)

2. **Rich Text Editor**
   - Replace plain textarea with Markdown editor
   - Add preview functionality
   - Syntax highlighting for code blocks

3. **Draft Management**
   - List user's draft articles
   - Edit existing drafts
   - Auto-save functionality

4. **Media Gallery**
   - Browse uploaded images
   - Reuse existing images
   - Image management interface

## Notes
- Storage rules were **NOT** modified (as requested)
- All image uploads go to Supabase, not Firebase
- The system checks locally if user is a developer (based on UID)
- Article submission can work without images (coverImageUrl is optional)
