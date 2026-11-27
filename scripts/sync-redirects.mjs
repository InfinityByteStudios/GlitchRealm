#!/usr/bin/env node
/**
 * Publishes `_redirects` into the deploy directory and validates it.
 *
 * Netlify only reads `_redirects` from the root of the *publish* directory.
 * The canonical copy lives at the project root (so it is the single source of
 * truth and easy to review), while `netlify.toml` publishes `dist/`. This
 * script runs after `scripts/build.mjs` and before the validation scripts:
 *
 *   1. fails clearly if `dist/` was not produced
 *   2. expands the `# GAME-DETAIL-REDIRECTS` marker into one forced rule per
 *      published game (same output as the build's own expansion)
 *   3. validates status codes, targets, URLs, loops and conflicting rules
 *   4. writes the complete ruleset to `dist/_redirects`
 *
 * Every existing rule is preserved: nothing is reordered, rewritten or dropped.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadGames } from './lib/games.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SOURCE = path.join(ROOT, '_redirects');
const TARGET = path.join(DIST, '_redirects');
const MARKER = '# GAME-DETAIL-REDIRECTS';

const errors = [];
const warnings = [];
const error = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

/* ---------------------------------------------------------------- preflight */

if (!fs.existsSync(DIST) || !fs.statSync(DIST).isDirectory()) {
  console.error(
    '[redirects] dist/ does not exist.\n' +
      '            Run `node scripts/build.mjs` before syncing _redirects.'
  );
  process.exit(1);
}

if (!fs.existsSync(SOURCE)) {
  console.error('[redirects] _redirects not found at the project root.');
  process.exit(1);
}

let text = fs.readFileSync(SOURCE, 'utf8');
const games = loadGames(ROOT).filter((game) => game.id && game.slug);

/* ------------------------------------------- generated game-detail redirects */

let generated = 0;
if (text.includes(MARKER)) {
  if (!games.length) {
    console.error(
      '[redirects] the GAME-DETAIL-REDIRECTS marker is present but no published\n' +
        '            games were loaded from assets/game-data/. Refusing to write a\n' +
        '            ruleset that silently drops every game redirect.'
    );
    process.exit(1);
  }

  const lines = [];
  for (const game of games) {
    lines.push(`/game-detail.html  id=${game.id}   ${game.detailPath}   301!`);
    lines.push(`/game-detail       id=${game.id}   ${game.detailPath}   301!`);
    lines.push(`${game.legacyPath}   ${game.detailPath}   301!`);
  }

  text = text.replace(MARKER, lines.join('\n'));
  generated = lines.length;
}

/* ------------------------------------------------------------- validation */

const STATUS = /^!?(200|301|302|303|307|308|404|410)!?$/;
const DIRECT_REDIRECT = /^30[1278]$/;
const rules = [];
const seen = new Map();

const lines = text.split(/\r?\n/);
for (let index = 0; index < lines.length; index += 1) {
  const raw = lines[index];
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;

  const lineNo = index + 1;

  // Markdown or prose accidentally pasted into the file.
  if (/^[-*]\s/.test(line) || /\]\(/.test(line) || /<https?:/.test(line)) {
    error(`line ${lineNo}: looks like Markdown, not a redirect rule: ${line}`);
    continue;
  }

  const tokens = line.split(/\s+/);
  const status = tokens[tokens.length - 1];
  if (!STATUS.test(status)) {
    error(`line ${lineNo}: invalid status "${status}" (expected 200/301/302/303/307/308/404/410, optional "!")`);
    continue;
  }
  if (tokens.length < 3) {
    error(`line ${lineNo}: needs at least "from to status": ${line}`);
    continue;
  }

  const from = tokens[0];
  const to = tokens[tokens.length - 2];
  const conditions = tokens.slice(1, -2);

  if (!from.startsWith('/') && !/^https?:\/\//.test(from)) {
    error(`line ${lineNo}: "from" must start with / or be an absolute URL: ${from}`);
  }
  if (/^https?:\/\//.test(from)) {
    try {
      new URL(from);
    } catch {
      error(`line ${lineNo}: malformed absolute URL in "from": ${from}`);
    }
  }
  if (!to.startsWith('/') && !/^https?:\/\//.test(to)) {
    error(`line ${lineNo}: "to" must start with / or be an absolute URL: ${to}`);
  }
  for (const condition of conditions) {
    if (!/^[A-Za-z0-9_.-]+=[^\s=]+$/.test(condition)) {
      error(`line ${lineNo}: unsupported condition "${condition}" (expected key=value)`);
    }
  }
  if (/^https?:\/\//.test(to)) {
    try {
      new URL(to);
    } catch {
      error(`line ${lineNo}: malformed absolute URL in "to": ${to}`);
    }
  }

  // Immediate loop.
  if (from === to) {
    error(`line ${lineNo}: redirects to itself (loop): ${line}`);
  }

  // Two rules for the same source with different destinations is a conflict.
  const key = `${from} ${conditions.join(' ')}`.trim();
  const redirectStatus = status.replace(/!/g, '');
  if (DIRECT_REDIRECT.test(redirectStatus)) {
    if (seen.has(key)) {
      const previous = seen.get(key);
      if (previous.to !== to || previous.status.replace(/!/g, '') !== redirectStatus) {
        error(
          `line ${lineNo}: conflicts with line ${previous.lineNo} for "${from}" ` +
            `(${previous.to} ${previous.status} vs ${to} ${status})`
        );
      }
    } else {
      seen.set(key, { lineNo, to, status });
    }
  }

  rules.push({ lineNo, from, to, status, conditions });
}

if (text.includes(MARKER)) {
  error('the GAME-DETAIL-REDIRECTS marker is still present after expansion');
}

// The complete ruleset must contain the canary and every generated game rule.
const canary = rules.find((rule) => rule.from === '/rules-canary');
if (!canary) {
  error('/rules-canary is missing — the canary must stay the first rule in the file');
} else if (canary.to !== '/' || canary.status !== '301!') {
  error(`/rules-canary must redirect to / with 301!, found "${canary.to} ${canary.status}"`);
}

for (const game of games) {
  const legacy = rules.find((rule) => rule.from === game.legacyPath);
  if (!legacy || legacy.to !== game.detailPath) {
    error(`missing legacy redirect ${game.legacyPath} -> ${game.detailPath}`);
  }
  const byId = rules.find(
    (rule) => rule.from === '/game-detail.html' && rule.conditions.includes(`id=${game.id}`)
  );
  if (!byId || byId.to !== game.detailPath) {
    error(`missing id redirect /game-detail.html?id=${game.id} -> ${game.detailPath}`);
  }
}

/* ------------------------------------------------------------------ report */

if (warnings.length) {
  for (const message of warnings.slice(0, 20)) console.warn(`[redirects] warning: ${message}`);
}

if (errors.length) {
  console.error(`[redirects] ${errors.length} problem(s) in _redirects:`);
  for (const message of errors.slice(0, 40)) console.error(`  - ${message}`);
  process.exit(1);
}

fs.writeFileSync(TARGET, text, 'utf8');

const counts = rules.reduce((acc, rule) => {
  const status = rule.status.replace(/!/g, '');
  acc[status] = (acc[status] || 0) + 1;
  return acc;
}, {});

console.log(
  `[redirects] dist/_redirects written: ${rules.length} rule(s) ` +
    `(${counts['301'] || 0} x 301, ${counts['200'] || 0} x 200), ` +
    `${games.length} game(s), ${generated} generated game rule(s)`
);
