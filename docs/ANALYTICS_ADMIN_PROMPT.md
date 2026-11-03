# PROMPT — Access GlitchRealm analytics data in the Admin Panel

> Paste-ready prompt for another AI/developer working on the **admin panel**
> (admin.glitchrealm.ca). This supersedes the report shapes listed in
> `docs/ADMIN_DASHBOARD_HANDOFF.md`.

---

## Prompt (copy from here down)

You are working on the GlitchRealm Games admin panel. Your task is to read and
display first-party analytics data (traffic, playtime, referrers, top pages,
JavaScript errors, live activity) through the existing reporting API. Do
**not** modify the tracking layer (`js/analytics/**`) or the Netlify functions
(`netlify/functions/analytics-*.mjs`) — they are maintained separately and are
already deployed.

### Data source

All analytics data is served by one admin-protected endpoint:

```
GET https://glitchrealm.ca/.netlify/functions/analytics-query?report=<name>&days=<7|30|90>&gameId=<id>
```

Auth: a Firebase ID token of a signed-in admin in the `Authorization` header:

```js
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

Error meanings: `401` = signed out or token expired (retry once with
`user.getIdToken(true)`), `403` = not an admin, `503` = storage credentials
missing, `500` = `report_failed` — show a retry state, do not assume the panel
is broken.

### Reports and response shapes

Every response is `{ ok: true, report, generatedAt, ... }`.

1. **overview** — headline KPIs
   `{ days, pageviews, visitors, sessions, playClicks, plays, playtime_s,
   errors, newsletter, playtimeByGame:[{key,count}],
   timeseries:[{day, pageviews, visitors, plays}] }`
   - `playtime_s` = total seconds played across all games in the range.
     Format with `Xh Ym` / `Xm Ys`.
   - `playtimeByGame` = seconds per game (key = gameId), top 20.

2. **timeseries** — `{ days, timeseries:[{day, pageviews, visitors, plays}] }`

3. **top-games** — `{ days, games:[{gameId, plays, seconds}] }` — plays and
   total playtime per game (`seconds` → format as hours).

4. **attribution** — where plays came from
   `{ total, bySource:[{key,count}], byMedium, byCampaign, byReferrerKind,
   byFirstTouch }` — render each list as key + count + share of `total`
   ("Tracked play clicks").

5. **referrers** — Top referrers
   `{ total, referrers:[{key, count}] }` — `key` is a hostname or `"direct"`.

6. **pages** — Top pages
   `{ pages:[{key, count, engaged_s}] }` — views per path plus total engaged
   seconds on that path (`engaged_s` → `Xm Ys`).

7. **errors** — JavaScript errors
   `{ count, recent:[{ts, name, path, message, file, line}] }` — `name` is
   `error` (window errors / unhandled rejections) or `game_error`. Render
   relative time, path, truncated expandable message, `file:line`.
   Timestamps arrive as Firestore Timestamps serialized as
   `{seconds, nanoseconds}` → `new Date(ts.seconds * 1000)`.

8. **live** — real-time activity
   `{ visitorsLast5Min, activeVisitors, activeSessions, recentEvents,
   activePlays:[{gameId, gameName, startedAt, source, playSeconds}] }`
   - `activeVisitors` (and the legacy `visitorsLast5Min` alias) counts
     visitors whose session pinged within the last ~3 minutes. A closed tab
     stops pinging immediately, so the count drops right away — do not add a
     "decay" of your own.
   - `activePlays` = plays started in the last 10 minutes that have not ended;
     `playSeconds` is the running duration (may be null early in a play).

9. **recent** — `{ events:[raw analytics_events docs] }` (debug view).

### How playtime works (for display)

- Each play gets a session doc: started on `game_start`, `duration_s` written
  on `game_end` (including when the tab is closed — the tracker ends the play
  on pagehide), and `playSeconds` refreshed every 30s heartbeat.
- Aggregate playtime per game/day is rolled up and surfaces in `overview`
  (`playtime_s`, `playtimeByGame`) and `top-games` (`seconds`).
- Signed-in players also get per-game totals written back to
  `playtime/{uid}/games/{gameId}` (`totalPlaytime`, `hours`, `sessions`) — the
  user portal and leaderboards read from there.

### Suggested widgets (cyberpunk style, cyan #00fff9 accents, Orbitron/Rajdhani)

- KPI row from **overview**: Visitors, Pageviews, Sessions, Plays, Total
  playtime, JS errors.
- **Top referrers** and **Top pages** side by side (referrers + pages reports).
- **Playtime by game** table (top-games: plays, playtime, avg per play).
- **JavaScript errors** list (errors report) with a refresh button.
- **Live** card auto-refreshing every 30s (activeVisitors, activeSessions,
  activePlays with running durations).

### Constraints

- Keep all fetching behind admin auth; fail closed.
- Never display IPs or emails — they are not collected (visitors are hashed).
- No new npm packages or external CDN scripts; plain ES modules + CSS.
- Escape all dynamic strings when rendering.
- Handle empty data gracefully ("No data yet — events appear once consented
  visitors browse the site").

---

## Background notes (for reference, not part of the prompt)

- Raw data lives in Firestore collections written by
  `netlify/functions/analytics-collect.mjs`: `analytics_events` (raw events),
  `event_daily` (per-day counters), `play_attribution` (one doc per play
  click), `play_sessions` (per play with duration), `play_daily` (per
  game/day playtime rollup), `session_state` (presence: `lastSeen` ping every
  60s, `endedAt` when the tab closes).
- The reporting API avoids Firestore composite indexes on purpose: it scans by
  `ts` range and filters in memory, so report names must not be assumed to map
  1:1 to Firestore queries.
- Visitors are counted only after they grant the analytics cookie consent;
  closed tabs are excluded from live counts via `session_state.endedAt`.