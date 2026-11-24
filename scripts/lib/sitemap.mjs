/**
 * GlitchRealm — sitemap generation.
 *
 * One list, built from `scripts/lib/site.mjs` (public pages) and
 * `scripts/lib/games.mjs` (published games as /game/<slug>/). Used by the
 * pre-build script that refreshes the committed sitemap.xml and by the build
 * itself, which writes dist/sitemap.xml — so the two can never disagree.
 */

import fs from 'node:fs';
import path from 'node:path';

import { ORIGIN, PUBLIC_PAGES, LEGAL_PAGES, absoluteUrl } from './site.mjs';
import { loadGames } from './games.mjs';

function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fileDate(root, source) {
  try {
    const stat = fs.statSync(path.join(root, source));
    return stat.mtime.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

export function buildSitemapXml(root) {
  const games = loadGames(root);
  const entries = [];

  for (const page of PUBLIC_PAGES) {
    entries.push(urlEntry(absoluteUrl(page), fileDate(root, page.source), page.changefreq, page.priority));
  }

  for (const page of LEGAL_PAGES) {
    entries.push(urlEntry(absoluteUrl(page), fileDate(root, page.source), page.changefreq, page.priority));
  }

  for (const game of games) {
    // Thin submissions are generated but stay out of the index until their
    // copy is filled in (see computeContentReady).
    if (game.contentReady === false) continue;
    const snapshot = path.join('assets', 'game-data', `${game.id}.json`);
    entries.push(urlEntry(game.canonicalUrl, fileDate(root, snapshot), 'weekly', '0.8'));
  }

  // Hand-built standalone game that lives outside the catalog pipeline.
  // (Not listed in the sitemap: it is a Godot WASM app shell, not a content page.)

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}
