# GlitchRealm First-Party Analytics System

Own analytics layer that runs **alongside** the existing third-party analytics
(GA4 via Firebase, Cloudflare Web Analytics). Nothing third-party was removed;
every event recorded here is also mirrored to `gtag()` / Firebase Analytics
when they are present.

## File map

| Path | Purpose |
|---|---|
| `js/analytics/core.js` | Identity (visitor/session ids), consent gate, event queue, batching, dual dispatch (own collector + gtag + Firebase) |
| `js/analytics/attribution.js` | URL params (`utm_*`, click ids, `ref/source/via/from`), referrer classification, first-touch (30d) / last-touch, Play-click attribution snapshots, click-path chain, `gr_*` params on game URLs |
| `js/analytics/timing.js` | Visible-time dwell (`page_engagement`), scroll depth, `session_summary`, web vitals (LCP/CLS/INP), navigation timing, outbound clicks, JS errors |
| `js/analytics/playtime.js` | Play sessions: start/heartbeat/end accounting, idle pause, window-close detection, write-back to `playtime/{uid}/games/{gameId}` |
| `js/analytics/index.js` | Entry module; wires consent, exposes `window.grAnalytics`, generic Play-button capture, game-page heartbeat |
| `netlify/functions/analytics-collect.mjs` | Ingestion endpoint (validate, sanitize, bot filter, IP-hash, rate limit; writes Firestore via Admin SDK) |
| `netlify/functions/analytics-query.mjs` | Admin-protected reporting API for the dashboard |
| `admin/analytics-dashboard` | ⚠️ lives on **admin.glitchrealm.ca** (`subdomains/admin/`) — see `docs/ADMIN_DASHBOARD_HANDOFF.md` |

Pages that load `js/analytics/index.js`: `index.html`,
`/games` (games.html), `/game-detail`, `/community-games`, and the local
`Games/UnderYourSkin/index.html` (game-side heartbeat).

## Public API

```js
window.grAnalytics.track('game_score', { gameId, score });   // any event
window.grAnalytics.playClick({ gameId, gameName, gameUrl }); // returns { playId, snapshot, url }
window.grAnalytics.startPlay({ gameId, playId, gameWindow });
window.grAnalytics.endPlay('closed');
window.grAnalytics.flush(); window.grAnalytics.resetVisitorId();
```

`js/game-launcher.js` calls `playClick()` → appends
`?gr_sid=&gr_pid=&gr_gid=&gr_src=&gr_cmp=` to the game URL → `startPlay()` with
the opened window handle.

## Events

`page_view`, `page_engagement`, `session_summary`, `play_click`, `game_start`,
`game_heartbeat`, `game_end`, `game_loaded`, `game_error`, `error`,
`web_vitals`, `navigation_timing`, `outbound_click`, `search`,
`search_no_result`, `wishlist_add/remove`, `review_submit/vote`,
`newsletter_subscribe`, `support_ticket`, `share_click`, plus game/ad events.

All events carry: `ts`, `visitorId`, `sessionId`, `userId|`, `path`,
`referrer`, `env` and attribution props (`source`, `medium`, `campaign`,
`firstSource`, `firstCampaign`) automatically.

## Data model (Firestore, Admin SDK writes only)

| Collection | Shape |
|---|---|
| `analytics_events` | raw events (`name`, `ts`, `day`, `visitorHash`, `sessionHash`, `userId`, `path`, `referrer`, `env`, `props`, `country`, `ua`, `ipHash`) |
| `event_daily/{day}_{name}` | per-day per-event counters (rollup) |
| `play_attribution` | one doc per `play_click`: full source snapshot |
| `play_sessions/{playId}` | per-play: attribution, `startedAt`, `duration_s`, `endReason` |
| `play_daily/{day}_{gameId}` | per-day per-game `seconds` + `plays` rollups |
| `analytics_rate_limits` | per-minute ingest counters |

Identifiers are hashed with a daily-rotating salt; raw IP is never stored.

## Consent & privacy

- Off until `js/cookie-consent.js` grants `analytics: true`; honors GPC/DNT.
- Listens for the new `gr:consentchange` window event; revocation stops collection.
- Visitor id expires after 30 days; resettable via the consent manager.
- No emails/PII in props (regex-scrubbed), no cross-site tracking, no cookies.
- Retention of raw events should be handled by a scheduled cleanup job (TBD).
