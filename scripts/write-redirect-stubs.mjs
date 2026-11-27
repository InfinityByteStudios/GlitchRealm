#!/usr/bin/env node
/**
 * File-based redirect fallback.
 *
 * The production Netlify project does not apply `_redirects`, `_headers` or the
 * `netlify.toml` redirect/header blocks at all (verified: the deploy serves our
 * exact `dist/`, pretty URLs work, but `/rules-canary`, `/edu/*` and the CSP
 * header are all missing). Redirect *rules* are therefore not reliable.
 *
 * This script mirrors every unconditional 3xx rule from `dist/_redirects` as a
 * tiny HTML redirect page at the source path, so the redirect works straight
 * from the file on any static host:
 *
 *   - `location.replace()` keeps query strings and hashes (auth flows)
 *   - `<meta http-equiv="refresh">` covers clients without JavaScript
 *   - `noindex, follow` + canonical keep the stub out of search results
 *
 * Safety rules:
 *   - never replaces `index.html` / the site root
 *   - skips any source that also has query-conditional rules (e.g.
 *     `/game-detail.html?id=…`) so those keep working via the app
 *   - skips rules whose target resolves back to the same file (would loop)
 *   - skips wildcard rules; only literal paths are emitted
 *
 * If the platform ever starts honouring `_redirects`, the real rules take
 * precedence over these files, so the fallback becomes inert, not harmful.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const RULES = path.join(DIST, '_redirects');
const ORIGIN = 'https://glitchrealm.ca';

const fail = (message) => {
  console.error(`[redirect-stubs] ${message}`);
  process.exit(1);
};

if (!fs.existsSync(RULES)) fail('dist/_redirects is missing — run sync-redirects.mjs first.');

const REDIRECT = /^!?(301|302|303|307|308)!?$/;

function absolute(target) {
  if (/^https?:\/\//i.test(target)) return target;
  return `${ORIGIN}${target.startsWith('/') ? '' : '/'}${target}`;
}

function esc(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function stub(target) {
  const url = absolute(target);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Redirecting…</title>
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${esc(url)}">
<script>location.replace(${JSON.stringify(url)} + location.search + location.hash);</script>
</head>
<body style="margin:0;background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif">
<p style="padding:2rem">This page has moved to <a href="${esc(url)}" style="color:#00fff9">${esc(url)}</a>.</p>
</body>
</html>
`;
}

/** Where the public URL `from` lives inside dist. */
function outputPath(url) {
  const clean = url.split(/[?#]/)[0];
  if (clean === '/' || clean === '') return path.join(DIST, 'index.html');
  if (clean.endsWith('/')) return path.join(DIST, clean.slice(1), 'index.html');
  const last = clean.split('/').pop();
  if (last.includes('.')) return path.join(DIST, clean.slice(1));
  return path.join(DIST, `${clean.slice(1)}.html`);
}

const raw = fs.readFileSync(RULES, 'utf8');
const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));

const parsed = lines.map((line) => {
  const tokens = line.split(/\s+/);
  return {
    from: tokens[0],
    to: tokens[tokens.length - 2],
    status: tokens[tokens.length - 1],
    conditions: tokens.slice(1, -2),
  };
});

// Paths that need JavaScript (query-conditional rules) must not be replaced.
const conditionalSources = new Set(
  parsed.filter((rule) => rule.conditions.length).map((rule) => rule.from)
);

const root = path.resolve(DIST, 'index.html');
const seen = new Set();
let written = 0;
let skippedLoop = 0;
let skippedOther = 0;

for (const rule of parsed) {
  if (!REDIRECT.test(rule.status)) continue;
  if (!rule.from.startsWith('/') || !rule.to) {
    skippedOther += 1;
    continue;
  }
  if (rule.from.includes('*') || rule.from.includes(':') || rule.to.includes(':splat')) {
    skippedOther += 1;
    continue;
  }
  if (conditionalSources.has(rule.from)) {
    skippedOther += 1;
    continue;
  }

  const out = path.resolve(outputPath(rule.from));
  if (out === root) {
    skippedOther += 1;
    continue;
  }

  // Loop guard: `/games.html -> /games` resolves to the same file the host
  // serves for `/games`, so a stub there would redirect to itself.
  if (path.resolve(outputPath(rule.to)) === out) {
    skippedLoop += 1;
    continue;
  }

  if (seen.has(out)) continue;
  seen.add(out);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, stub(rule.to), 'utf8');
  written += 1;
}

console.log(
  `[redirect-stubs] wrote ${written} redirect page(s) ` +
    `(${skippedLoop} same-file/clean-URL, ${skippedOther} conditional/wildcard/protected)`
);
