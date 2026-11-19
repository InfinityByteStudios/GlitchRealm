#!/usr/bin/env node
/**
 * Verifies that every local asset reference in the built site resolves.
 *
 * Public URLs are rewrites (`/games.html` -> `/subdomains/pages/games/games.html`),
 * so relative references must be resolved against the *public* URL, not the
 * file's location in dist/.
 *
 * Only asset-bearing tags are checked (img/script/link/source/video) — page
 * anchors are covered by `_redirects` and contain tutorial/prose false
 * positives (e.g. code examples on /edu pages).
 *
 * Exit code 1 if anything is missing (used as a build guard).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) {
  console.error('[links] dist/ not found — run `npm run build` first');
  process.exit(1);
}

const rewrites = new Map();
const publicByTarget = new Map();
const allSources = new Set();

for (const raw of fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const [from, to, status] = line.split(/\s+/);
  if (!from.startsWith('/') || !to) continue;
  allSources.add(from);
  if (!to.startsWith('/') || status !== '200') continue;
  rewrites.set(from, to);
  const key = to.replace(/^\//, '');
  if (!publicByTarget.has(key)) publicByTarget.set(key, from);
}

function publicUrlFor(file) {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  if (publicByTarget.has(rel)) return publicByTarget.get(rel);
  return '/' + rel;
}

// Only pages published on the main domain. Subdomains (legal/help/edu/School)
// are served under their own host with different paths.
function listHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['components', 'Games', 'assets', 'utilities', 'subdomains'].includes(entry.name)) continue;
      listHtml(full, out);
    } else if (entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

const pages = [
  ...listHtml(DIST).filter((file) => path.dirname(file) === DIST),
  ...(fs.existsSync(path.join(DIST, 'subdomains/pages'))
    ? listHtml(path.join(DIST, 'subdomains/pages'))
    : []),
];

const SKIP = /^(?:https?:)?\/\/|^(?:data:|#|mailto:|tel:|javascript:)/i;
// Pre-existing broken references, tracked separately from build regressions.
const KNOWN_MISSING = new Set(['icon.png', '/assets/placeholder-game.png', 'admin-panel.css']);
const missing = new Map();

for (const file of pages) {
  if (file.includes(`${path.sep}pages${path.sep}legal${path.sep}`)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const pageUrl = publicUrlFor(file);

  for (const tag of html.matchAll(/<(?:img|script|link|source|video|audio)\b[^>]*>/gi)) {
    const raw = tag[0];
    const attrs = [];
    for (const attr of raw.matchAll(/\b(?:src|href|poster)=["']([^"']+)["']/gi)) attrs.push(attr[1]);
    for (const attr of raw.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
      for (const part of attr[1].split(',')) attrs.push(part.trim().split(/\s+/)[0]);
    }

    for (let url of attrs) {
      if (!url || SKIP.test(url) || url.includes('${')) continue;
      url = url.split('?')[0].split('#')[0];
      if (!url || url === '/') continue;
      if (url.startsWith('/.netlify/') || KNOWN_MISSING.has(url)) continue;

      const publicPath = url.startsWith('/')
        ? url
        : path.posix.normalize(`${path.posix.dirname(pageUrl)}/${url}`);

      if (allSources.has(publicPath)) continue;

      const resolved = path.join(DIST, decodeURIComponent(publicPath));
      const candidates = [resolved, `${resolved}.html`, path.join(resolved, 'index.html')];
      if (!candidates.some((candidate) => fs.existsSync(candidate))) {
        const key = `${url}  (from ${pageUrl})`;
        missing.set(key, (missing.get(key) || 0) + 1);
      }
    }
  }
}

if (missing.size) {
  console.error(`[links] ${missing.size} missing local asset reference(s):`);
  for (const key of [...missing.keys()].slice(0, 60)) console.error(`  - ${key}`);
  process.exit(1);
}

console.log(`[links] all local asset references resolve (${pages.length} pages)`);
