// Same-origin proxy for the incident.io status feed at status.glitchrealm.ca.
// The feed sends no CORS headers (and the site CSP blocks the domain), so the
// support page's Live Uptime Monitor can't fetch it directly from the browser.
//
//   /.netlify/functions/status-feed               -> raw RSS/Atom XML
//   /.netlify/functions/status-feed?format=json   -> { status, label, incident }
//   /.netlify/functions/status-feed?format=badge  -> SVG status badge for site footers
//     (an <img>, so it works in footers injected via innerHTML where scripts don't run)
const FEEDS = [
  'https://status.glitchrealm.ca/feed.rss',
  'https://status.glitchrealm.ca/feed.atom'
];

const LABELS = {
  operational: 'All systems operational',
  maintenance: 'Under maintenance',
  degraded: 'Degraded performance',
  down: 'Service outage',
  unknown: 'Status'
};

const DOT_COLORS = {
  operational: '#00ff88',
  maintenance: '#4da3ff',
  degraded: '#ffb020',
  down: '#ff3b5c',
  unknown: '#8a9aa0'
};

async function fetchFeed() {
  for (const url of FEEDS) {
    try {
      const resp = await fetch(url, {
        headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9' },
        signal: AbortSignal.timeout(8000)
      });
      if (!resp.ok) continue;

      const xml = await resp.text();
      if (!/<(rss|feed)[\s>]/i.test(xml)) continue;

      return { xml, contentType: resp.headers.get('content-type') };
    } catch (err) {
      console.warn('[status-feed] Failed to fetch', url, err?.message || err);
    }
  }
  return null;
}

function decode(text = '') {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function tag(block, names) {
  for (const name of names) {
    const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
    if (m) return decode(m[1]).trim();
  }
  return '';
}

// Overall status from the feed: every item is an incident/maintenance update; only the
// newest update per incident counts, and anything not resolved/completed is still ongoing.
function summarize(xml) {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  const items = blocks.map((block) => {
    const linkHref = block.match(/<link\b[^>]*href="([^"]+)"/i)?.[1];
    const description = tag(block, ['description', 'summary', 'content']);
    return {
      title: tag(block, ['title']) || 'Status update',
      key: tag(block, ['guid', 'id']) || linkHref || tag(block, ['link']) || tag(block, ['title']),
      date: Date.parse(tag(block, ['pubDate', 'updated', 'published'])) || 0,
      status: (description.match(/<b>\s*Status:\s*([^<]+)<\/b>/i)?.[1] || '').trim().toLowerCase(),
      text: `${tag(block, ['title'])} ${description.replace(/<[^>]+>/g, ' ')}`.toLowerCase()
    };
  }).sort((a, b) => b.date - a.date);

  const seen = new Set();
  const rank = { operational: 0, maintenance: 1, degraded: 2, down: 3 };
  let status = 'operational';
  let incident = null;

  for (const item of items) {
    // incident.io links each update to its incident page; strip any update anchor
    const id = String(item.key).replace(/#.*$/, '');
    if (seen.has(id)) continue;
    seen.add(id);

    if (/\b(resolved|completed|operational)\b/.test(item.status)) continue;
    if (!item.status && /\b(resolved|completed)\b/.test(item.text)) continue;
    // Upcoming maintenance doesn't affect anything yet
    if (/\bscheduled\b/.test(item.status)) continue;

    let level;
    if (/\b(full outage|outage|down|unavailable|major)\b/.test(item.text)) level = 'down';
    else if (/\bmaintenance\b/.test(item.text) || /\bin progress\b/.test(item.status)) level = 'maintenance';
    else level = 'degraded';

    if (rank[level] > rank[status]) {
      status = level;
      incident = { title: item.title, status: item.status };
    }
  }

  return { status, label: LABELS[status], incident };
}

function escapeXml(text) {
  return text.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
}

// Styled like the footer's own links: cyan Rajdhani-style text with a glowing status dot
function badgeSvg(status) {
  const label = LABELS[status];
  const color = DOT_COLORS[status];
  const width = Math.ceil(label.length * 7.4) + 22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="18" viewBox="0 0 ${width} 18" role="img" aria-label="GlitchRealm status: ${escapeXml(label)}">
  <title>GlitchRealm status: ${escapeXml(label)}</title>
  <defs><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>
  <circle cx="8" cy="9" r="4.5" fill="${color}" opacity="0.6" filter="url(#glow)"/>
  <circle cx="8" cy="9" r="3.5" fill="${color}"/>
  <text x="19" y="13.5" fill="#00fff9" font-family="Rajdhani, Orbitron, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" letter-spacing="0.3">${escapeXml(label)}</text>
</svg>`;
}

export default async (req) => {
  const format = new URL(req.url).searchParams.get('format');
  const feed = await fetchFeed();

  const cacheHeaders = {
    // Browsers revalidate quickly; the CDN shields the status page from every visitor's poll
    'Cache-Control': 'public, max-age=15',
    'Netlify-CDN-Cache-Control': 'public, durable, max-age=30, stale-while-revalidate=120',
    'Netlify-Vary': 'query=format'
  };

  if (format === 'badge') {
    const status = feed ? summarize(feed.xml).status : 'unknown';
    return new Response(badgeSvg(status), {
      status: 200,
      headers: {
        ...cacheHeaders,
        'Content-Type': 'image/svg+xml; charset=utf-8',
        ...(feed ? {} : { 'Cache-Control': 'no-store', 'Netlify-CDN-Cache-Control': 'no-store' })
      }
    });
  }

  if (!feed) {
    return Response.json(
      { error: 'Status feed unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (format === 'json') {
    return Response.json(summarize(feed.xml), { headers: cacheHeaders });
  }

  return new Response(feed.xml, {
    status: 200,
    headers: {
      ...cacheHeaders,
      'Content-Type': feed.contentType || 'application/xml; charset=utf-8'
    }
  });
};
