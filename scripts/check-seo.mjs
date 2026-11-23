#!/usr/bin/env node
/**
 * Build guard — SEO and machine-readability invariants.
 *
 * Runs after the build and fails the deploy when a public page is missing the
 * things crawlers and AI agents need: a title, a description, one canonical,
 * exactly one <h1>, valid JSON-LD and a resolvable sitemap entry.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ORIGIN, LEGAL_ORIGIN } from './lib/site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const errors = [];
const fail = (message) => errors.push(message);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function distFile(loc) {
  if (loc.startsWith(`${LEGAL_ORIGIN}/`) || loc === LEGAL_ORIGIN) {
    const pathname = loc.slice(LEGAL_ORIGIN.length) || '/';
    if (pathname === '/') return path.join(DIST, 'subdomains', 'legal', 'index.html');
    return path.join(DIST, `${pathname.replace(/^\//, '')}.html`);
  }
  if (!loc.startsWith(ORIGIN)) return null;
  const pathname = loc.slice(ORIGIN.length) || '/';
  if (pathname === '/') return path.join(DIST, 'index.html');
  if (pathname.endsWith('/')) return path.join(DIST, pathname.slice(1), 'index.html');
  return path.join(DIST, `${pathname.slice(1)}.html`);
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

const sitemapFile = path.join(DIST, 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) {
  fail('dist/sitemap.xml is missing');
}

let sitemapLocs = [];
if (fs.existsSync(sitemapFile)) {
  const xml = read(sitemapFile);
  sitemapLocs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  if (sitemapLocs.length < 10) fail(`sitemap has only ${sitemapLocs.length} URLs`);
  for (const loc of sitemapLocs) {
    if (/\.html(\?|$)/.test(loc)) fail(`sitemap lists a non-canonical .html URL: ${loc}`);
    if (loc.includes('?')) fail(`sitemap lists a query-string URL: ${loc}`);
    if (loc.includes('/game-detail')) fail(`sitemap lists the dynamic game-detail URL: ${loc}`);
  }
  if (sitemapLocs.some((loc) => loc.includes('/privacy-policy.html'))) {
    fail('sitemap still lists main-domain legal duplicates');
  }
}

// ---------------------------------------------------------------------------
// Every sitemap URL must resolve to a real file, and that file must be complete
// ---------------------------------------------------------------------------

for (const loc of sitemapLocs) {
  const file = distFile(loc);
  if (!file) {
    fail(`sitemap URL outside the known hosts: ${loc}`);
    continue;
  }
  if (!fs.existsSync(file)) {
    fail(`sitemap URL has no local page: ${loc} -> ${path.relative(ROOT, file)}`);
    continue;
  }

  const html = read(file);
  const head = html.slice(0, html.toLowerCase().indexOf('</head>') + 7);

  const title = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || '';
  if (!title) fail(`${loc}: missing <title>`);

  const description = (head.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1]?.trim() || '';
  if (description.length < 30) fail(`${loc}: missing or too-short meta description`);

  const canonical = (head.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1] || '';
  if (!canonical) fail(`${loc}: missing canonical`);
  else if (canonical !== loc) fail(`${loc}: canonical points elsewhere (${canonical})`);

  const robots = (head.match(/<meta\s+name=["']robots["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
  if (/noindex/i.test(robots)) fail(`${loc}: sitemap URL is noindex`);

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) fail(`${loc}: expected exactly one <h1>, found ${h1Count}`);

  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!ldBlocks.length) fail(`${loc}: no JSON-LD`);
  for (const block of ldBlocks) {
    try {
      const parsed = JSON.parse(block[1]);
      const nodes = parsed['@graph'] || [parsed];
      if (!nodes.length || !nodes.every((node) => node && node['@type'])) {
        fail(`${loc}: JSON-LD has no typed nodes`);
      }
    } catch (error) {
      fail(`${loc}: invalid JSON-LD (${error.message})`);
    }
  }

  const ogImage = (head.match(/<meta\s+property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || [])[1] || '';
  if (!ogImage) fail(`${loc}: missing og:image`);
}

// ---------------------------------------------------------------------------
// llms.txt coverage
// ---------------------------------------------------------------------------

const llmsFile = path.join(DIST, 'llms.txt');
if (!fs.existsSync(llmsFile)) {
  fail('dist/llms.txt is missing');
} else {
  const llms = read(llmsFile);
  const missing = sitemapLocs.filter((loc) => !llms.includes(loc));
  // llms.txt may legitimately omit the standalone /Games/ page.
  const required = missing.filter((loc) => !loc.includes('/Games/'));
  if (required.length) {
    fail(`llms.txt does not mention ${required.length} sitemap URL(s), e.g. ${required.slice(0, 5).join(', ')}`);
  }
}

if (!fs.existsSync(path.join(DIST, 'llms-full.txt'))) {
  fail('dist/llms-full.txt is missing');
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (errors.length) {
  console.error(`[seo] ${errors.length} problem(s):`);
  for (const message of errors.slice(0, 60)) console.error(`  - ${message}`);
  if (errors.length > 60) console.error(`  … and ${errors.length - 60} more`);
  process.exit(1);
}

console.log(`[seo] ${sitemapLocs.length} sitemap URL(s) are complete and consistent`);
