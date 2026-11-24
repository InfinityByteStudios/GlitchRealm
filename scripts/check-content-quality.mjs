#!/usr/bin/env node
/**
 * Build guard — content depth and AdSense readiness.
 *
 * AdSense rejected the site once for "low value content". This check keeps the
 * pages that review depends on from drifting back to thin, machine-generated
 * stubs:
 *   - every indexed page has a real description and one <h1>
 *   - every game page has About / Controls / Tips / FAQ / Details sections
 *   - game pages carry VideoGame + FAQPage structured data
 *   - no hand-placed ad units (Auto ads only) and one consent-mode default
 *   - retired URLs (/newsletter, /projects) are not linked internally
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ORIGIN, LEGAL_ORIGIN } from './lib/site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const errors = [];
const fail = (message) => errors.push(message);

const sitemapFile = path.join(DIST, 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) {
  console.error('[quality] dist/sitemap.xml missing — run the build first');
  process.exit(1);
}

const locs = [...fs.readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

function distFile(loc) {
  if (loc.startsWith(LEGAL_ORIGIN)) {
    const pathname = loc.slice(LEGAL_ORIGIN.length) || '/';
    return pathname === '/'
      ? path.join(DIST, 'subdomains', 'legal', 'index.html')
      : path.join(DIST, `${pathname.replace(/^\//, '')}.html`);
  }
  const pathname = loc.slice(ORIGIN.length) || '/';
  if (pathname === '/') return path.join(DIST, 'index.html');
  if (pathname.endsWith('/')) return path.join(DIST, pathname.slice(1), 'index.html');
  return path.join(DIST, `${pathname.slice(1)}.html`);
}

function textOf(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const GAME_MIN_WORDS = 450;
let gamePages = 0;

for (const loc of locs) {
  if (loc.includes('/Games/')) continue;
  const file = distFile(loc);
  if (!file || !fs.existsSync(file)) {
    fail(`${loc}: page file missing`);
    continue;
  }

  const html = fs.readFileSync(file, 'utf8');
  const text = textOf(html);
  const h1s = (html.match(/<h1\b/gi) || []).length;
  if (h1s !== 1) fail(`${loc}: ${h1s} <h1> elements (need exactly 1)`);

  const description = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  if (!description || description[1].trim().length < 50) {
    fail(`${loc}: meta description missing or shorter than 50 characters`);
  }

  if (/data-ad-slot=/.test(html)) fail(`${loc}: hand-placed ad unit present`);

  if (loc.startsWith(`${ORIGIN}/game/`)) {
    gamePages += 1;
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words < GAME_MIN_WORDS) {
      fail(`${loc}: ${words} words of readable text (need ${GAME_MIN_WORDS})`);
    }
    for (const id of ['gameDetailsSection', 'extendedDescSection', 'controlsSection', 'tipsSection', 'faqSection', 'relatedGames']) {
      if (!html.includes(`id="${id}"`)) fail(`${loc}: missing #${id}`);
    }
    if (!/"@type":"VideoGame"/.test(html)) fail(`${loc}: VideoGame JSON-LD missing`);
    if (!/"@type":"FAQPage"/.test(html)) fail(`${loc}: FAQPage JSON-LD missing`);
    if (!/google-adsense-account/.test(html)) fail(`${loc}: AdSense account meta missing`);
    if (/data-ad-slot=/.test(html)) fail(`${loc}: hand-placed ad unit still present`);
    if (/Loading game details/.test(text)) fail(`${loc}: loading placeholder leaked into the HTML`);
  }
}

if (gamePages < 10) fail(`only ${gamePages} game pages in the sitemap`);

// Catalogue integrity: one card per game, every card links to a detail page.
const gamesFile = path.join(DIST, 'games.html');
if (fs.existsSync(gamesFile)) {
  const html = fs.readFileSync(gamesFile, 'utf8');
  const cards = [...html.matchAll(/<div class="game-card[^"]*"[^>]*data-game="([^"]+)"/g)].map((m) => m[1]);
  const unique = new Set(cards);
  if (cards.length !== unique.size) {
    fail(`/games: ${cards.length - unique.size} duplicate game card(s)`);
  }
  if (!/href="\/game\/[a-z0-9-]+\/"/.test(html)) fail('/games: no links to /game/<slug>/ pages');
  if (/coming soon/i.test(textOf(html))) fail('/games: "coming soon" placeholder still present');
}

// Retired URLs must not be linked from live pages.
const retired = ['/newsletter', '/projects'];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['assets', 'css', 'js', 'components'].includes(entry.name)) continue;
      walk(full);
    } else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(full, 'utf8');
      for (const href of retired) {
        if (new RegExp(`href=["']${href}(?:["'/?#])`, 'i').test(html)) {
          fail(`${path.relative(DIST, full)}: links to retired ${href}`);
        }
      }
    }
  }
};
walk(DIST);

// Auto ads: public pages declare consent defaults once and ship no manual units.
const adFiles = ['index.html', 'games.html', path.join('game', 'xfps', 'index.html')];
for (const rel of adFiles) {
  const file = path.join(DIST, rel);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  if ((html.match(/adsbygoogle\.js/g) || []).length !== 1) {
    fail(`${rel}: expected exactly one AdSense loader`);
  }
  if (!/gtag\('consent','default'/.test(html)) fail(`${rel}: consent-mode default missing`);
  if (/data-ad-slot=/.test(html)) fail(`${rel}: hand-placed ad unit present`);
}

if (errors.length) {
  console.error(`[quality] ${errors.length} problem(s):`);
  for (const message of errors.slice(0, 60)) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(`[quality] ${locs.length} page(s) meet the content-depth gate (${gamePages} game pages)`);
