/**
 * Netlify Edge Function — live XML sitemap
 *
 * Serves /sitemap.xml with the current list of publicly published games
 * straight from Firestore, so newly approved/published or removed games are
 * reflected without waiting for the next deploy (the build-time
 * scripts/generate-sitemap.js output remains as the static fallback).
 *
 * Mirrors the static-page list and published-status handling in
 * scripts/generate-sitemap.js and netlify/edge-functions/prerender.js.
 *
 * On any failure the function returns nothing and the build-time static
 * sitemap.xml is served instead, so the sitemap can never break.
 */

const FIREBASE_PROJECT_ID = 'shared-sign-in';
const FIRESTORE_RUN_QUERY =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

const BASE_URL = 'https://glitchrealm.ca';
const PUBLISHED_STATUSES = ['published', 'Published'];
const GAMES_LIMIT = 200;

// Same curated static pages as scripts/generate-sitemap.js
const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/games.html', priority: '0.9', changefreq: 'daily' },
  { url: '/about.html', priority: '0.7', changefreq: 'monthly' },
  { url: '/community.html', priority: '0.8', changefreq: 'weekly' },
  { url: '/submit-game.html', priority: '0.8', changefreq: 'monthly' },
  { url: '/news.html', priority: '0.7', changefreq: 'weekly' },
  { url: '/contact.html', priority: '0.6', changefreq: 'monthly' },
  { url: '/donate.html', priority: '0.6', changefreq: 'monthly' },
  { url: '/credits.html', priority: '0.5', changefreq: 'monthly' },
  { url: '/support.html', priority: '0.6', changefreq: 'monthly' },
  { url: '/legal.html', priority: '0.5', changefreq: 'monthly' },
  { url: '/privacy-policy.html', priority: '0.5', changefreq: 'monthly' },
  { url: '/terms-of-service.html', priority: '0.5', changefreq: 'monthly' },
  { url: '/cookie-policy.html', priority: '0.5', changefreq: 'monthly' },
  { url: '/eula.html', priority: '0.5', changefreq: 'monthly' },
  { url: '/coppa.html', priority: '0.5', changefreq: 'monthly' },
  { url: '/accessibility-statement.html', priority: '0.5', changefreq: 'monthly' },
  { url: '/Games/UnderYourSkin/', priority: '0.8', changefreq: 'weekly' },
];

function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoDate(value, fallback) {
  if (!value) return fallback;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return fallback;
    return d.toISOString().split('T')[0];
  } catch {
    return fallback;
  }
}

async function fetchPublishedGames() {
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'game_submissions' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'IN',
          value: { arrayValue: { values: PUBLISHED_STATUSES.map((s) => ({ stringValue: s })) } },
        },
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: { value: GAMES_LIMIT },
    },
  };

  const resp = await fetch(FIRESTORE_RUN_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`runQuery ${resp.status}`);

  const data = await resp.json();
  if (!Array.isArray(data)) throw new Error('unexpected runQuery response');

  const games = [];
  for (const row of data) {
    if (!row.document || !row.document.fields) continue;
    const fields = row.document.fields;
    games.push({
      id: row.document.name.split('/').pop(),
      updatedAt: fields.updatedAt?.timestampValue || fields.createdAt?.timestampValue || '',
    });
  }
  return games;
}

function buildSitemap(games, today) {
  const seen = new Set();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const page of STATIC_PAGES) {
    const loc = BASE_URL + page.url;
    if (seen.has(loc)) continue;
    seen.add(loc);
    xml += `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  for (const game of games) {
    const loc = `${BASE_URL}/game-detail.html?id=${encodeURIComponent(game.id)}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    xml += `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${isoDate(game.updatedAt, today)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  return xml + '</urlset>\n';
}

export default async (req, context) => {
  let games;
  const today = new Date().toISOString().split('T')[0];
  try {
    games = await fetchPublishedGames();
  } catch {
    return; // fall through to the build-time static sitemap.xml
  }

  return new Response(buildSitemap(games, today), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
      'X-Robots-Tag': 'noindex',
    },
  });
};

export const config = {
  path: '/sitemap.xml',
  onError: 'bypass',
};
