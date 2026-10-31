# Prompt: Build the Review Moderation Admin Page

Copy everything below this line and give it to the AI that builds the admin page.

---

You are extending the GlitchRealm Games admin console (located at `subdomains/admin/index.html` with logic in `subdomains/admin/admin.js`; helper patterns live in `subdomains/admin/moderation.js`). The site is a static HTML/CSS/JS site using Firebase (client SDK via `js/firebase-core.js` globals like `window.firebaseAuth`, `window.firebaseFirestore`, `window.firestoreCollection`, `window.firestoreQuery`, `window.firestoreWhere`, etc.). Admin access is determined by `isAdmin(uid)` / `isDeveloper(uid)` against a UID list served by `netlify/functions/admin-auth-uids.js` and mirrored in the Firestore rules in `config/firestore.rules`. Match the existing admin console's cyberpunk styling, section navigation (`loadSection()` pattern in admin.js), `showToast()` notifications, and reusable list-rendering helpers.

## Background

Reviews for games are no longer written directly by browsers. They are submitted through a server-side Netlify Function (`netlify/functions/submit-review.js`), which:
1. Verifies the reviewer's Firebase ID token (visitors use silent anonymous sign-in, so many reviews now come from guests),
2. Rate limits per user and per IP,
3. Runs the text through an advanced word filter (`netlify/functions/lib/content-filter.mjs`) that defeats leetspeak, masking characters, unicode lookalikes, spacing tricks and repeated letters,
4. Runs the comment through AI moderation (Netlify AI Gateway) which returns `approve`, `flag`, or `block`,
5. Writes the review to Firestore with the Admin SDK with a `moderationStatus` of `approved`, `pending`, or `blocked`.

## Your task — add a "Reviews" section to the admin console with three sub-tabs

### 1. Moderation queue
- Query the `reviews` collection (Firestore). Default view: `moderationStatus == 'pending'`, with tabs/filters for `pending`, `blocked`, `approved`, and "all".
- Each review card shows: game name (`gameName`), star rating (`rating`, 1–5), comment (`comment`), reviewer (`userDisplayName` + `authorPhotoUrl`, or a "Guest" badge when `isGuest == true`), timestamp (`timestamp`), the moderation `reason`, `moderationSource` (`filter` / `ai+filter`), and when present the `aiVerdict` object (`{verdict, reason}`).
- Actions per review, using Firestore client SDK (admins pass the rules):
  - Approve: set `moderationStatus: 'approved'`
  - Reject/Block: set `moderationStatus: 'blocked'` (use `'rejected'` if the admin wants it hidden but distinguishable from auto-blocked)
  - Delete: remove the document entirely
  - After each action, update the list optimistically and `showToast()` the result.
- Support search by game name / reviewer name and sorting by newest first.
- Show counters per status as badges in the tab headers.

### 2. Filter word manager
- The server function merges a Firestore document `moderation_config/filters` over its built-in defaults. Build an editor for that document with these fields:
  - `bannedWords`: string array — submissions containing these (after normalization) are rejected outright and never stored.
  - `suspiciousWords`: string array — submissions containing these are queued as `pending` for human review.
  - `bannedPatterns`: string array of regex source strings (case-insensitive, compiled server-side) for catch-all bypass detection.
  - `aiModerationEnabled`: boolean toggle — when false, only the word filter decides.
- UI: editable list per field (add/remove rows), a boolean toggle, and a "Test" box where an admin can paste sample text and see how it would be classified. The test can call the same normalization logic by replicating it client-side or simply call `/.netlify/functions/submit-review` in a dry-run fashion if you add that capability — otherwise keep the test offline/approximate.
- Save writes the whole document with `window.firestoreSetDoc`. Only admins can write this collection per the rules; developers can read it.

### 3. Stats & activity
- Counters: total reviews, pending count, approved count, blocked/rejected count, reviews in the last 24h/7d.
- Recent activity feed: latest 50 reviews across all statuses with their moderation decision and reason.
- Surface abuse signals: number of distinct guest reviewers, and (read-only) the `clientIpHash` values that appear most often, so admins can spot spam farms. Do not display raw IPs — only the pre-hashed values.
- Note: rate-limit counters live in `review_rate_limits` and are not readable by clients (rules deny all); skip direct reads of that collection and derive activity from `reviews` only.

## Data model reference (reviews collection)

```
gameId: string
gameName: string
rating: int 1–5
comment: string (may be empty for rating-only reviews)
moderationStatus: 'approved' | 'pending' | 'blocked' | 'rejected'
timestamp: Firestore timestamp
userId: Firebase uid (may be an anonymous account)
userDisplayName: string (guests use stable "Guest-XXXX" names)
authorPhotoUrl: string
reason: string (why it was approved/flagged/blocked)
isGuest: boolean
authProvider: string ('anonymous', 'google.com', 'password', ...)
moderationSource: 'filter' | 'ai+filter'
aiVerdict: { verdict: 'approve'|'flag'|'block', reason: string } | null
clientIpHash: string | null (sha256 prefix, for abuse correlation only)
```

## Constraints

- Do not add any framework or build step — plain HTML/CSS/JS matching the existing console.
- All Firestore access must go through the existing `js/firebase-core.js` globals; wait for `window.firebaseReady` before querying.
- Reuse the admin auth gate already present in `subdomains/admin/index.html` / `admin.js`; do not create a second login flow.
- Escape all user-generated content when rendering (there is an `escapeHTML` helper in admin.js).
- Keep everything readable without horizontal scrolling at 1280px width; the existing console is the style reference.

## Deployment notes to mention in your final summary

- `config/firestore.rules` must be deployed to Firebase (`firebase deploy --only firestore:rules`) for `moderation_config` access and the new "no direct client writes" review rule to take effect.
- The Firebase "Anonymous" sign-in provider must be enabled in the Firebase console (it is already used elsewhere on the site).
