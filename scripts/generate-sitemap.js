/**
 * Sitemap Generator for GlitchRealm
 *
 * Produces a curated sitemap.xml at build time:
 *   - Hand-picked static pages (only public, indexable ones)
 *   - Published game detail pages fetched from Firestore (no auth needed —
 *     the collection is publicly readable, same as the client JS)
 *
 * Replaces the @netlify/plugin-sitemap crawl, which was publishing internal
 * URLs (node_modules, tests, admin, auth, components, etc.) into the sitemap.
 */

const FIREBASE_PROJECT_ID = 'shared-sign-in';
const FIRESTORE_RUN_QUERY =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

const BASE_URL = 'https://glitchrealm.ca';
const TODAY = new Date().toISOString().split('T')[0];

// ---------------------------------------------------------------------------
// Curated static pages (only public, indexable ones)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Firestore REST helpers
// ---------------------------------------------------------------------------

async function fetchPublishedGames(limit = 200) {
  try {
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'game_submissions' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'IN',
            value: { arrayValue: { values: [{ stringValue: 'published' }, { stringValue: 'Published' }] } },
          },
        },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: { value: limit },
      },
    };
    const resp = await fetch(FIRESTORE_RUN_QUERY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      console.warn(`[sitemap] Firestore runQuery failed (${resp.status}) — using static pages only`);
      return [];
    }
    const data = await resp.json();
    const games = [];
    for (const row of data) {
      if (!row.document) continue;
      const fields = row.document.fields || {};
      const game = {
        id: row.document.name.split('/').pop(),
        title: fields.title?.stringValue || '',
        updatedAt: fields.updatedAt?.timestampValue || fields.createdAt?.timestampValue || '',
      };
      games.push(game);
    }
    return games;
  } catch (err) {
    console.warn(`[sitemap] Firestore fetch failed (${err.message}) — using static pages only`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoDate(value) {
  if (!value) return TODAY;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return TODAY;
    return d.toISOString().split('T')[0];
  } catch {
    return TODAY;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function generateSitemap() {
  const games = await fetchPublishedGames();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const page of STATIC_PAGES) {
    xml += `  <url>
    <loc>${escapeXml(BASE_URL + page.url)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  for (const game of games) {
    xml += `  <url>
    <loc>${escapeXml(`${BASE_URL}/game-detail.html?id=${encodeURIComponent(game.id)}`)}</loc>
    <lastmod>${isoDate(game.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  xml += `</urlset>
`;

  const fs = require('fs');
  fs.writeFileSync('sitemap.xml', xml);
  console.log(`[sitemap] wrote ${STATIC_PAGES.length} static pages + ${games.length} game detail pages to sitemap.xml`);
}

generateSitemap().catch((err) => {
  console.error('[sitemap] failed:', err);
  process.exit(0); // Don't fail the deploy — the sitemap is not critical
});
