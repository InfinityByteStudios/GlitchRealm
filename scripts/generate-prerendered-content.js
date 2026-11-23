/**
 * GlitchRealm — Firestore snapshot refresh
 *
 * Fetches the published games from Firestore and writes one JSON snapshot per
 * game to `assets/game-data/`. The build (`scripts/build-content.mjs`) turns
 * those snapshots into static HTML for every visitor.
 *
 * This script deliberately does NOT modify the source HTML any more. Every
 * build used to rewrite index.html and games.html in the working tree, which
 * made builds unreproducible and produced noisy diffs. All derivative markup
 * is now generated into dist/ at build time.
 */

const fs = require('fs');
const path = require('path');

const FIREBASE_PROJECT_ID = 'shared-sign-in';
const FIRESTORE_RUN_QUERY =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

const ROOT = path.resolve(__dirname, '..');
const COVER_MANIFEST = path.join(ROOT, 'assets', 'cover-thumbs', 'manifest.json');
const GAME_DATA_DIR = path.join(ROOT, 'assets', 'game-data');

let coverThumbs = {};
try {
  coverThumbs = JSON.parse(fs.readFileSync(COVER_MANIFEST, 'utf8')) || {};
} catch (e) {
  coverThumbs = {};
}

function coverSrc(game, preferred = 'w960') {
  const original = typeof game.coverImageUrl === 'string' ? game.coverImageUrl : '';
  const thumb = original ? coverThumbs[original] : null;
  if (!thumb) return original || 'assets/icons/anonymous.png';
  return thumb[preferred] || thumb.w480 || thumb.w960 || original;
}

const PUBLISHED_STATUSES = ['published', 'Published'];

function parseFirestoreFields(fields) {
  const game = {};
  for (const field of [
    'title', 'description', 'extendedDescription', 'howToPlay', 'coverImageUrl',
    'playUrl', 'badge', 'ownerUsername', 'ownerId', 'trailerUrl', 'status',
  ]) {
    if (fields[field]?.stringValue !== undefined) game[field] = fields[field].stringValue;
  }
  for (const field of ['tags', 'screenshots']) {
    if (fields[field]?.arrayValue?.values) {
      game[field] = fields[field].arrayValue.values.map((value) => value.stringValue).filter(Boolean);
    }
  }
  if (fields.featured?.booleanValue !== undefined) game.featured = fields.featured.booleanValue;
  if (fields.createdAt?.timestampValue) game.createdAt = fields.createdAt.timestampValue;
  return game;
}

async function fetchPublishedGames(limit = 200) {
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'game_submissions' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'IN',
          value: { arrayValue: { values: PUBLISHED_STATUSES.map((status) => ({ stringValue: status })) } },
        },
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: { value: limit },
    },
  };

  const response = await fetch(FIRESTORE_RUN_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    console.warn(`[snapshots] Firestore runQuery failed (${response.status}) — keeping existing snapshots`);
    return [];
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  const games = [];
  for (const row of data) {
    if (!row.document?.fields) continue;
    const game = parseFirestoreFields(row.document.fields);
    game.id = row.document.name.split('/').pop();
    games.push(game);
  }
  return games;
}

const GAME_DATA_FIELDS = [
  'title', 'description', 'extendedDescription', 'howToPlay',
  'coverImageUrl', 'playUrl', 'trailerUrl', 'screenshots',
  'tags', 'badge', 'status', 'ownerId', 'ownerUsername', 'createdAt',
];

function writeGameDataJson(games) {
  fs.mkdirSync(GAME_DATA_DIR, { recursive: true });
  for (const file of fs.readdirSync(GAME_DATA_DIR)) {
    if (file.endsWith('.json')) fs.unlinkSync(path.join(GAME_DATA_DIR, file));
  }

  let written = 0;
  for (const game of games) {
    if (!game.id) continue;
    const data = { id: game.id };
    for (const field of GAME_DATA_FIELDS) {
      if (game[field] !== undefined) data[field] = game[field];
    }
    data.coverThumbUrl = coverSrc(game, 'w960');
    fs.writeFileSync(path.join(GAME_DATA_DIR, `${game.id}.json`), JSON.stringify(data));
    written += 1;
  }
  console.log(`[snapshots] assets/game-data: wrote ${written} game snapshot(s)`);
}

async function main() {
  const games = await fetchPublishedGames();
  if (!games.length) {
    console.log('[snapshots] No published games returned — keeping existing snapshots');
    return;
  }
  console.log(`[snapshots] Fetched ${games.length} published games`);
  writeGameDataJson(games);
}

main().catch((error) => {
  console.warn('[snapshots] Failed:', error?.message || error);
});
