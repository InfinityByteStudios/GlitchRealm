// Same-origin proxy for the incident.io status feed at status.glitchrealm.ca.
// The feed sends no CORS headers (and the site CSP blocks the domain), so the
// support page's Live Uptime Monitor can't fetch it directly from the browser.
const FEEDS = [
  'https://status.glitchrealm.ca/feed.rss',
  'https://status.glitchrealm.ca/feed.atom'
];

export default async () => {
  for (const url of FEEDS) {
    try {
      const resp = await fetch(url, {
        headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9' },
        signal: AbortSignal.timeout(8000)
      });
      if (!resp.ok) continue;

      const xml = await resp.text();
      if (!/<(rss|feed)[\s>]/i.test(xml)) continue;

      return new Response(xml, {
        status: 200,
        headers: {
          'Content-Type': resp.headers.get('content-type') || 'application/xml; charset=utf-8',
          // Browsers revalidate quickly; the CDN shields the status page from every visitor's 30s poll
          'Cache-Control': 'public, max-age=15',
          'Netlify-CDN-Cache-Control': 'public, durable, max-age=30, stale-while-revalidate=120'
        }
      });
    } catch (err) {
      console.warn('[status-feed] Failed to fetch', url, err?.message || err);
    }
  }

  return Response.json(
    { error: 'Status feed unavailable' },
    { status: 502, headers: { 'Cache-Control': 'no-store' } }
  );
};
