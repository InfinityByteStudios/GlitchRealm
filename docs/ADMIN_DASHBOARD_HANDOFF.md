# HANDOFF — Analytics Dashboard for admin.glitchrealm.ca

> These instructions are for a **different AI / developer** whose task is to
> build the analytics dashboard UI on **admin.glitchrealm.ca**. The tracking
> layer and its APIs already exist. Do **not** modify `js/analytics/**` or the
> `netlify/functions/analytics-*.mjs` files except to fix a bug they discover.

## Goal

Build `Analytics` into the Admin Control Panel served from
`subdomains/admin/` (routed to https://admin.glitchrealm.ca via the
`/subdomains/admin/:splat` rewrite in `_redirects`).

Recommended files:

- `subdomains/admin/analytics.html` — the dashboard page
- `subdomains/admin/analytics.js` — its logic (module script)
- Extend `subdomains/admin/admin.css` with an `analytics` section (or add a scoped stylesheet)

Add a link/tab to the new page from `subdomains/admin/index.html` (and the
sidebar in `subdomains/admin/admin.js` if one exists).

## Data source

`GET /.netlify/functions/analytics-query?report=<name>&days=<7|30|90>&gameId=<id>`

Auth: Firebase ID token of a signed-in admin.

```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
// ... initialize with the shared-sign-in config, or reuse js/firebase-core.js
//    which exposes window.firebaseApp / window.firebaseAuth

async function fetchReport(report, days = 7, gameId = null) {
  const user = window.currentFirebaseUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const url = new URL('/.netlify/functions/analytics-query', window.location.origin);
  url.searchParams.set('report', report);
  url.searchParams.set('days', String(days));
  if (gameId) url.searchParams.set('gameId', gameId);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`analytics-query ${res.status}`);
  return res.json();
}
```

Access control: the function verifies the token and checks the uid against the
admin/developer UID list (env `GLITCHREALM_ADMIN_UIDS` + fallbacks — same list
as `subdomains/admin/admin.js` and `netlify/functions/admin-uids.js`).
401 = signed out/expired, 403 = not an admin, 503 = Firestore creds missing
(`FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` env vars).

## Reports (shape of each response)

All responses: `{ ok, report, generatedAt, ... }`.

1. **overview** `{ days, pageviews, visitors, sessions, playClicks, plays,
   playtime_s, errors, newsletter, playtimeByGame:[{key,count}],
   timeseries:[{day, pageviews, visitors, plays}] }`

2. **timeseries** `{ days, timeseries:[{day, pageviews, visitors, plays}] }`

3. **top-games** `{ days, games:[{gameId, plays, seconds}] }`

4. **attribution** `{ total, bySource:[{key,count}], byMedium,
   byCampaign, byReferrerKind, byFirstTouch }`

5. **referrers** `{ total, referrers:[{key,count}] }`

6. **pages** `{ pages:[{key, count, engaged_s}] }`

7. **errors** `{ count, recent:[{ts, name, path, message, file}] }`

8. **live** `{ visitorsLast5Min, recentEvents,
   activePlays:[{gameId, gameName, startedAt, source}] }`

9. **recent** `{ events:[raw analytics_events docs] }` (debug tab)

Timestamps (`ts`, `startedAt`) arrive as Firestore Timestamps serialized as
`{seconds, nanoseconds}`; render with `new Date(ts.seconds * 1000)`.

## UI spec

Cyberpunk style matching the existing admin panel (dark, cyan `#00fff9`
accents, Orbitron headings, Rajdhani body — see `subdomains/admin/admin.css`
and the site's `css/styles.css` variables).

Layout, top to bottom:

1. **Range selector** — segmented control: 7 / 30 / 90 days; gameId filter
   dropdown populated from `top-games` (+ "All games"). Refresh button.
2. **KPI cards** (from `overview`): Unique visitors, Pageviews, Sessions,
   Play clicks, Plays, Total playtime (format `playtime_s` → `Xh Ym`),
   JS errors, Newsletter signups. Show delta vs previous period by calling
   the same report twice (offset the range — set `days` to 2×N and slice the
   timeseries, or just show the count without delta if simpler).
3. **Traffic chart** — `overview.timeseries` as a lightweight inline SVG
   line/area chart (pageviews + visitors). **No chart CDN** — the CSP is
   `script-src 'self' ...`; draw the SVG by hand or use tiny helper functions.
   Include a `<noscript>`-safe fallback: render a CSS bar table.
4. **Where plays came from** (the headline feature) — `attribution` report:
   horizontal bar lists for Source / Medium / Campaign / First touch /
   Referrer kind, each `key + count + share%` of `total`. Highlight the top
   source. Show `total` as "Tracked play clicks".
5. **Top games** — table from `top-games`: game, plays, playtime
   (`seconds` → hours), plays/hour avg. Add a per-game drill-down: selecting a
   game re-fetches `overview`/`attribution` with `gameId`.
6. **Referrers & top pages** — two columns: `referrers` list; `pages` list
   with views + engaged seconds (`engaged_s` → `Xm Ys`).
7. **Live** — auto-refresh every 30s: `visitorsLast5Min`,
   `activePlays` list (game, started ago, source).
8. **Errors** — last 50 from `errors.recent`: relative time, path,
   message (truncated, expandable), file.
9. **Debug** (collapsed by default) — `recent` raw events as JSON.

State/UX conventions:

- All fetches gated on admin auth, same pattern as `subdomains/admin/admin.js`
  (show "Access denied" panel for non-admins; re-fetch token on 401 once via
  `getIdToken(true)`).
- Handle empty data ("No data yet — events appear once consented visitors
  browse the site"), loading skeletons, and error toasts.
- Dates in the visitor's locale; counts `Intl.NumberFormat`.
- Export button: build CSV client-side from the loaded reports and download
  (`Blob` + `URL.createObjectURL`).

## Constraints

- No new npm packages, no external CDN scripts, no inline `onclick=` handlers
  in the dashboard markup (attach listeners in `analytics.js`).
- Static site — no build step; plain ES modules + CSS only.
- Keep the page under admin auth at all times (fail closed).
- Do not store or display raw IPs (they are not collected) or emails.
- Test against `netlify dev` locally; `analytics-query` returns 503 until
  Firebase service-account env vars exist in the Netlify environment.

## Acceptance checklist

- [ ] Page reachable at https://admin.glitchrealm.ca/analytics (or via the
      admin index as `analytics.html`) and only for admin UIDs.
- [ ] All 8 reports render with real Firestore data after consented traffic.
- [ ] Attribution panel shows source/medium/campaign breakdowns.
- [ ] Live panel auto-refreshes; errors panel lists real JS errors.
- [ ] No console errors; zero third-party script loads.
