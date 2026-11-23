#!/usr/bin/env node
/**
 * Build guard — the page must be readable with JavaScript switched off.
 *
 * This is the check that keeps the "content is rendered on the device" bug
 * from coming back: every public page has to carry its real text in the HTML,
 * and every game page has to name the game, describe it and link to play.
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
  console.error('[static] dist/sitemap.xml missing — run the build first');
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

function visibleText(html) {
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

const MIN_TEXT = {
  '/': 800,
  '/games': 3000,
  '/support': 3000,
  '/community': 600,
  '/about': 600,
};

let checked = 0;

for (const loc of locs) {
  if (loc.includes('/Games/')) continue; // standalone game, not a content page
  const file = distFile(loc);
  if (!file || !fs.existsSync(file)) {
    fail(`${loc}: page file missing`);
    continue;
  }
  checked += 1;

  const html = fs.readFileSync(file, 'utf8');
  const text = visibleText(html);
  const isGamePage = loc.startsWith(`${ORIGIN}/games/`) && loc !== `${ORIGIN}/games`;
  const min = isGamePage ? 700 : (MIN_TEXT[loc] || 500);

  if (text.length < min) {
    fail(`${loc}: only ${text.length} characters of text in the HTML (need ${min})`);
  }

  if (isGamePage) {
    if (!/id="gameTitle"/.test(html)) fail(`${loc}: static game title missing`);
    if (!/id="gameDescription"/.test(html)) fail(`${loc}: static game description missing`);
    if (!/class="play-btn"/.test(html)) fail(`${loc}: no play button in the HTML`);
    if (!/id="relatedGames"/.test(html)) fail(`${loc}: no related-games links in the HTML`);
    if (/id="gameContent"[^>]*style="display:none"/.test(html)) {
      fail(`${loc}: game content is hidden until JavaScript runs`);
    }
    if (/Loading game details/.test(text)) fail(`${loc}: still shows the loading placeholder`);
  }
}

// The catalog must contain the games as markup, not an empty grid.
const gamesFile = path.join(DIST, 'games.html');
if (fs.existsSync(gamesFile)) {
  const html = fs.readFileSync(gamesFile, 'utf8');
  const cards = (html.match(/class="game-card[^"]*"/g) || []).length;
  if (cards < 10) fail(`/games: only ${cards} game cards in the HTML`);
  const detailLinks = (html.match(/href="\/games\/[a-z0-9-]+\/"/g) || []).length;
  if (detailLinks < 10) fail(`/games: only ${detailLinks} links to static game pages`);
} else {
  fail('/games: games.html missing');
}

const homeFile = path.join(DIST, 'index.html');
if (fs.existsSync(homeFile)) {
  const html = fs.readFileSync(homeFile, 'utf8');
  if (!/id="newest-game-card"/.test(html)) fail('/: newest game card missing');
  if (!/class="featured-description"/.test(html)) fail('/: newest game description missing');
}

if (errors.length) {
  console.error(`[static] ${errors.length} problem(s):`);
  for (const message of errors.slice(0, 40)) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(`[static] ${checked} page(s) carry their content in the HTML (JS off)`);
