/**
 * GlitchRealm — build-time prerender
 *
 * Bakes live Firestore game content into the static HTML so crawlers
 * (Googlebot, Mediapartners-Google, AdsBot-Google) always receive real
 * content in the initial HTML response, regardless of which Netlify layer
 * serves the request (static assets, the prerender service, or the
 * `netlify/edge-functions/prerender.js` edge function).
 *
 * The rendered markup uses the same class names/ids as the client-side
 * renderers, so the page JavaScript simply refreshes the same content for
 * visitors. Nothing is hidden from users, so this is dynamic rendering
 * rather than cloaking.
 *
 * Targets:
 *   index.html                              -> "Newest Game" card
 *   subdomains/pages/games/games.html       -> community game cards
 */

const fs = require('fs');
const path = require('path');

const FIREBASE_PROJECT_ID = 'shared-sign-in';
const FIRESTORE_RUN_QUERY =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const GAMES_HTML = path.join(ROOT, 'subdomains', 'pages', 'games', 'games.html');

// Games temporarily hidden from the "Newest Game" slot (Firestore doc IDs).
// Mirrors NEWEST_GAME_EXCLUDED_IDS in index.html and the edge function.
const NEWEST_GAME_EXCLUDED_IDS = new Set(['YxnZNN7g1gT0ih5Q1wqo']);

const PUBLISHED_STATUSES = ['published', 'Published'];

function escapeHtml(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/`/g, '&#96;');
}

function parseFirestoreFields(fields) {
  const game = {};
  if (fields.title?.stringValue !== undefined) game.title = fields.title.stringValue;
  if (fields.description?.stringValue !== undefined) game.description = fields.description.stringValue;
  if (fields.extendedDescription?.stringValue !== undefined) game.extendedDescription = fields.extendedDescription.stringValue;
  if (fields.howToPlay?.stringValue !== undefined) game.howToPlay = fields.howToPlay.stringValue;
  if (fields.coverImageUrl?.stringValue !== undefined) game.coverImageUrl = fields.coverImageUrl.stringValue;
  if (fields.playUrl?.stringValue !== undefined) game.playUrl = fields.playUrl.stringValue;
  if (fields.tags?.arrayValue?.values) {
    game.tags = fields.tags.arrayValue.values.map((v) => v.stringValue).filter(Boolean);
  }
  if (fields.badge?.stringValue !== undefined) game.badge = fields.badge.stringValue;
  if (fields.ownerUsername?.stringValue !== undefined) game.ownerUsername = fields.ownerUsername.stringValue;
  if (fields.featured?.booleanValue !== undefined) game.featured = fields.featured.booleanValue;
  if (fields.status?.stringValue !== undefined) game.status = fields.status.stringValue;
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
          value: { arrayValue: { values: PUBLISHED_STATUSES.map((s) => ({ stringValue: s })) } },
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
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) {
    console.warn(`[prerender] Firestore runQuery failed (${resp.status}) — keeping existing HTML`);
    return [];
  }

  const data = await resp.json();
  if (!Array.isArray(data)) return [];

  const games = [];
  for (const row of data) {
    if (!row.document || !row.document.fields) continue;
    const game = parseFirestoreFields(row.document.fields);
    game.id = row.document.name.split('/').pop();
    games.push(game);
  }
  return games;
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

/**
 * Replaces the element that opens with `openTag` by scanning for its matching
 * closing tag. Handles nested elements with the same tag name, which a naive
 * regex cannot do (the old homepage injection silently failed because of this).
 */
function replaceElement(html, openTag, replacement) {
  const start = html.indexOf(openTag);
  if (start === -1) return null;

  const tagName = openTag.match(/^<([a-zA-Z0-9-]+)/)[1];
  const openPattern = new RegExp(`<${tagName}\\b`, 'gi');
  const closePattern = new RegExp(`</${tagName}\\s*>`, 'gi');

  let depth = 0;
  let index = start;
  while (index < html.length) {
    openPattern.lastIndex = index;
    closePattern.lastIndex = index;
    const nextOpen = openPattern.exec(html);
    const nextClose = closePattern.exec(html);
    if (!nextClose) return null;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      index = nextOpen.index + nextOpen[0].length;
      continue;
    }
    depth -= 1;
    index = nextClose.index + nextClose[0].length;
    if (depth === 0) {
      return html.slice(0, start) + replacement + html.slice(index);
    }
  }
  return null;
}

/**
 * Removes every element opened with `openTag` (balanced-tag aware).
 */
function removeElements(html, openTag) {
  let output = html;
  let guard = 0;
  while (output.includes(openTag) && guard < 200) {
    const replaced = replaceElement(output, openTag, '');
    if (replaced === null) break;
    output = replaced;
    guard += 1;
  }
  return output;
}

function buildNewestGameCard(game) {
  const cover = game.coverImageUrl
    ? `style="background-image:url('${escapeAttr(game.coverImageUrl)}');background-size:cover;background-position:center;"`
    : '';
  const detailUrl = `/game-detail.html?id=${encodeURIComponent(game.id)}`;
  const title = escapeHtml(game.title || 'Untitled Game');
  const description = escapeHtml(game.description || 'No description available.');
  const owner = escapeHtml(game.ownerUsername || 'Community Creator');

  return `<div class="featured-card" id="newest-game-card" data-prerendered="1">
                    <div class="featured-image" id="newest-game-image" ${cover}>
                        <div class="game-badge new">NEW</div>
                    </div>
                    <div class="featured-info" id="newest-game-info">
                        <h3>${title}</h3>
                        <p class="featured-description">${description}</p>
                        <p class="featured-developer">Made by <strong>${owner}</strong></p>
                        <a href="${escapeAttr(detailUrl)}" class="play-btn featured-play-btn">
                            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" style="flex-shrink: 0;">
                                <polygon points="0,0 10,6 0,12"/>
                            </svg>
                            <span>Play Now</span>
                        </a>
                    </div>
                </div>`;
}

function buildGameCard(game) {
  const id = game.id;
  const title = escapeHtml(game.title || 'Untitled');
  const description = escapeHtml((game.description || '').slice(0, 180));
  const cover = game.coverImageUrl ? escapeAttr(game.coverImageUrl) : 'assets/icons/anonymous.png';
  const playUrl = /^https?:\/\//i.test(game.playUrl || '') ? escapeAttr(game.playUrl) : '';
  const tags = Array.isArray(game.tags) ? game.tags.slice(0, 4) : [];
  const owner = escapeHtml(game.ownerUsername || 'Community Creator');
  const detailUrl = `/game-detail.html?id=${encodeURIComponent(id)}`;

  const tagMarkup = tags
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join('');

  const playMarkup = playUrl
    ? `<button class="btn btn-primary card-btn play-now-btn" data-play-url="${playUrl}">Play Now</button>`
    : `<button class="btn btn-disabled card-btn" disabled>Play link pending</button>`;

  return `<div class="game-card is-submission" data-prerendered="1" data-game="${escapeAttr(id)}">
                        <div class="card-image">
                            <img src="${cover}" srcset="${cover} 320w, ${cover} 640w, ${cover} 960w" sizes="(max-width: 480px) 320px, (max-width: 768px) 640px, 960px" alt="${title}" class="game-logo-image" loading="lazy" decoding="async" width="320" height="180">
                            <div class="card-overlay"></div>
                            <div class="game-badge new" style="display:${game.featured ? 'block' : 'none'};">NEW</div>
                        </div>
                        <div class="card-content">
                            <h3 class="card-title"><a href="${escapeAttr(detailUrl)}">${title}</a></h3>
                            <p class="card-description">${description || 'No description provided.'}</p>
                            <p class="card-developer">Made by <strong>${owner}</strong></p>
                            <div class="card-tags">${tagMarkup}</div>
                            ${playMarkup}
                        </div>
                    </div>`;
}

function injectNewestGame(html, game) {
  const card = buildNewestGameCard(game);
  const replaced = replaceElement(html, '<div class="featured-card" id="newest-game-card"', card);
  if (replaced) return replaced;

  // Fallback: swap the placeholder info block only.
  return html.replace(
    /<div class="featured-info" id="newest-game-info">[\s\S]*?<\/div>/,
    `<div class="featured-info" id="newest-game-info">\n                        <h3>${escapeHtml(game.title || 'Untitled Game')}</h3>\n                        <p class="featured-description">${escapeHtml(game.description || 'No description available.')}</p>\n                        <p class="featured-developer">Made by <strong>${escapeHtml(game.ownerUsername || 'Community Creator')}</strong></p>\n                        <a href="/game-detail.html?id=${encodeURIComponent(game.id)}" class="play-btn featured-play-btn"><span>Play Now</span></a>\n                    </div>`
  );
}

function injectGameCards(html, games) {
  if (!games.length) return html;
  const cards = games.map(buildGameCard).join('\n                    ');

  // Remove any previously baked cards, then insert before the coming-soon card.
  html = removeElements(html, '<div class="game-card is-submission" data-prerendered="1"');

  const marker = '<div class="game-card coming-soon"';
  const at = html.indexOf(marker);
  if (at !== -1) {
    return html.slice(0, at) + cards + '\n                    ' + html.slice(at);
  }

  const container = '<div class="game-cards">';
  const containerAt = html.indexOf(container);
  if (containerAt !== -1) {
    const insertAt = containerAt + container.length;
    return html.slice(0, insertAt) + '\n                    ' + cards + html.slice(insertAt);
  }

  return html;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const games = await fetchPublishedGames();
  if (!games.length) {
    console.log('[prerender] No published games found — HTML left unchanged');
    return;
  }
  console.log(`[prerender] Fetched ${games.length} published games`);

  const newest = games.find((g) => !NEWEST_GAME_EXCLUDED_IDS.has(g.id));
  if (newest) {
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    const updated = injectNewestGame(html, newest);
    if (updated && updated !== html) {
      fs.writeFileSync(INDEX_HTML, updated);
      console.log(`[prerender] index.html: baked newest game "${newest.title}"`);
    }
  }

  const gamesHtml = fs.readFileSync(GAMES_HTML, 'utf8');
  const updatedGames = injectGameCards(gamesHtml, games);
  if (updatedGames !== gamesHtml) {
    fs.writeFileSync(GAMES_HTML, updatedGames);
    console.log(`[prerender] games.html: baked ${games.length} community game cards`);
  }
}

main().catch((error) => {
  console.warn('[prerender] Failed:', error?.message || error);
});
