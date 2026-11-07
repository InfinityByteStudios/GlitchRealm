/**
 * Netlify Edge Function — Crawler-friendly rendering (dynamic rendering)
 *
 * Injects live Firestore data into HTML for search-engine and ad crawlers only:
 *   /                     -> homepage "Newest Game" section
 *   /games.html, /games   -> community submission cards into the games grid
 *   /game-detail.html, /game-detail?id=... -> full game detail page content
 *
 * Regular users get the original page untouched (JS loads the data as before).
 * This is Google's recommended "dynamic rendering" approach for JS-heavy sites:
 * the same content, rendered server-side for bots. Not cloaking.
 *
 * On any failure (Firestore down, bad id, unpublishing) the function falls back
 * to the original page, so nothing ever breaks.
 */

const FIREBASE_PROJECT_ID = 'shared-sign-in';
const FIRESTORE_BASE =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Games temporarily hidden from the "Newest Game" homepage slot (Firestore doc IDs).
// Mirrors NEWEST_GAME_EXCLUDED_IDS in index.html.
const NEWEST_GAME_EXCLUDED_IDS = new Set(['YxnZNN7g1gT0ih5Q1wqo']);

// ---------------------------------------------------------------------------
// Bot detection
// ---------------------------------------------------------------------------

const BOT_UA_FRAGMENTS = [
  'Googlebot', 'Mediapartners-Google', 'AdsBot-Google', 'AdsBot-Google-Mobile',
  'Google-InspectionTool', 'GoogleOther', 'Googlebot-News', 'Googlebot-Image',
  'Googlebot-Video', 'Google-AdSense', 'Google-AdSense-Target', 'FeedFetcher',
  'Google-Site-Verification', 'Google-Safety', 'Google-Snippets',
  'Bingbot', 'BingPreview', 'adidxbot',
  'DuckDuckBot', 'YandexBot', 'YandexImages', 'YandexNews', 'Baiduspider',
  'Sogou', 'Exabot', 'PetalBot', 'Applebot', 'SeznamBot',
  'facebookexternalhit', 'facebot', 'Twitterbot', 'Slackbot-LinkExpanding',
  'LinkedInBot', 'WhatsApp', 'TelegramBot', 'Discordbot',
  'Pinterestbot', 'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot',
  'Screaming Frog', 'Majestic-SEO', 'Sistrix', 'rogerbot',
  'HeadlessChrome', 'Lighthouse', 'PageSpeed', 'WPT-Bot',
  'Netlify', 'BetterUptime', 'UptimeRobot', 'Pingdom', 'StatusCake',
];

function isBot(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return BOT_UA_FRAGMENTS.some((f) => lower.includes(f.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Firestore REST helpers
// ---------------------------------------------------------------------------

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
  return game;
}

async function fetchGameDoc(gameId) {
  const resp = await fetch(`${FIRESTORE_BASE}/game_submissions/${encodeURIComponent(gameId)}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.fields) return null;
  const game = parseFirestoreFields(data.fields);
  game.id = gameId;
  return game;
}

async function fetchPublishedGames(limit = 10) {
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
  const resp = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return [];
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

// ---------------------------------------------------------------------------
// Game detail page
// ---------------------------------------------------------------------------

function buildMetaTags(game, gameId) {
  const cover = game.coverImageUrl || 'https://glitchrealm.ca/assets/Favicon%20and%20Icons/apple-touch-icon.png';
  const desc = game.description || 'Explore this cyberpunk game on GlitchRealm.';
  const url = `https://glitchrealm.ca/game-detail.html?id=${encodeURIComponent(gameId)}`;
  return `
    <title>${escapeHtml(game.title)} - GlitchRealm</title>
    <meta name="description" content="${escapeAttr(desc)}">
    <meta property="og:title" content="${escapeAttr(game.title)} - GlitchRealm">
    <meta property="og:description" content="${escapeAttr(desc)}">
    <meta property="og:image" content="${escapeAttr(cover)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeAttr(url)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeAttr(game.title)} - GlitchRealm">
    <meta name="twitter:description" content="${escapeAttr(desc)}">
    <meta name="twitter:image" content="${escapeAttr(cover)}">`;
}

function buildJsonLd(game, gameId) {
  const url = `https://glitchrealm.ca/game-detail.html?id=${encodeURIComponent(gameId)}`;
  const cover = game.coverImageUrl || 'https://glitchrealm.ca/assets/Favicon%20and%20Icons/apple-touch-icon.png';
  return `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": ${JSON.stringify(game.title || 'Untitled Game')},
      "description": ${JSON.stringify(game.description || 'Explore this cyberpunk game on GlitchRealm.')},
      "image": ${JSON.stringify(cover)},
      "url": ${JSON.stringify(url)},
      "genre": ${JSON.stringify(game.tags || [])},
      "gamePlatform": "Web Browser",
      "operatingSystem": "Any",
      "publisher": { "@type": "Organization", "name": "GlitchRealm Games" },
      "author": { "@type": "Person", "name": ${JSON.stringify(game.ownerUsername || 'Community Creator')} }
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://glitchrealm.ca/" },
        { "@type": "ListItem", "position": 2, "name": "Games", "item": "https://glitchrealm.ca/games.html" },
        { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(game.title || 'Game')}, "item": ${JSON.stringify(url)} }
      ]
    }
    </script>`;
}

function buildDetailContent(game, gameId) {
  const tagsHtml = (game.tags || []).map((t) => `<span class="detail-tag">${escapeHtml(t)}</span>`).join('');
  const badgeHtml = game.badge && ['new', 'updated', 'beta'].includes(game.badge)
    ? `<span class="detail-badge ${game.badge}">${game.badge.toUpperCase()}</span>`
    : '';
  const cover = game.coverImageUrl || 'assets/game logos/ByteSurge.webp';
  const desc = game.description || 'No description provided.';
  const url = `https://glitchrealm.ca/game-detail.html?id=${encodeURIComponent(gameId)}`;

  return `
    <article id="gameContent" itemscope itemtype="https://schema.org/VideoGame" style="display:block;">
      <div class="detail-header">
        <div class="detail-cover">
          <img id="gameCover" src="${escapeAttr(cover)}" alt="${escapeAttr(game.title)} Cover" itemprop="image" width="560" height="315" loading="eager">
        </div>
        <div class="detail-info">
          <h1 id="gameTitle" itemprop="name">${escapeHtml(game.title)}</h1>
          <div class="detail-meta">
            ${badgeHtml}
            <span id="gameStatus" class="detail-badge">${escapeHtml((game.status || 'draft').toUpperCase())}</span>
          </div>
          <div id="gameTags" class="detail-tags" itemprop="genre">${tagsHtml}</div>
          <p id="gameDescription" class="detail-description" itemprop="description">${escapeHtml(desc)}</p>
          <div class="action-buttons">
            ${game.playUrl ? `<a id="playButton" href="${escapeAttr(game.playUrl)}" target="_blank" rel="noopener" class="play-btn">▶ Play Now</a>` : ''}
            <a href="${escapeAttr(url)}" class="play-btn" style="display:none;">View Details</a>
          </div>
        </div>
      </div>
      ${game.extendedDescription ? `
      <section id="extendedDescSection" class="detail-section">
        <h2>About This Game</h2>
        <div id="extendedDescription">${escapeHtml(game.extendedDescription)}</div>
      </section>` : ''}
      ${game.howToPlay ? `
      <section id="howToPlaySection" class="detail-section">
        <h2>How to Play</h2>
        <div id="howToPlay">${escapeHtml(game.howToPlay)}</div>
      </section>` : ''}
    </article>`;
}

function injectGameDetail(html, game, gameId) {
  let out = html;

  // Replace the static title with the game-specific one
  out = out.replace('<title>Game Details - GlitchRealm</title>', buildMetaTags(game, gameId));

  // Inject JSON-LD before </head>
  out = out.replace('</head>', `${buildJsonLd(game, gameId)}</head>`);

  // Replace the loading state (and notFound/gameContent placeholders) with the
  // prerendered content. The JS then just fills in the same data on top.
  const loadingState = /<div id="loadingState" class="loading-state">[\s\S]*?<\/div>\s*<div id="notFoundState"[\s\S]*?<\/div>\s*<article id="gameContent"[\s\S]*?<\/article>/.exec(out);
  if (loadingState) {
    out = out.replace(loadingState[0], buildDetailContent(game, gameId));
  } else {
    // Fallback: hide loading state, inject content before </main>
    out = out.replace('<div id="loadingState" class="loading-state">', '<div id="loadingState" class="loading-state" style="display:none;">');
    out = out.replace('</main>', `${buildDetailContent(game, gameId)}</main>`);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Homepage "Newest Game" section
// ---------------------------------------------------------------------------

function buildNewestGameHtml(game) {
  const cover = game.coverImageUrl
    ? `style="background-image:url('${escapeAttr(game.coverImageUrl)}');background-size:cover;background-position:center;"`
    : '';
  const detailUrl = `https://glitchrealm.ca/game-detail.html?id=${encodeURIComponent(game.id)}`;
  return `
    <div class="featured-image" id="newest-game-image" ${cover}>
      <div class="game-badge new">NEW</div>
    </div>
    <div class="featured-info" id="newest-game-info">
      <h3>${escapeHtml(game.title || 'Untitled Game')}</h3>
      <p class="featured-description">${escapeHtml(game.description || 'No description available.')}</p>
      <p class="featured-developer">Made by <strong>${escapeHtml(game.ownerUsername || 'Community Creator')}</strong></p>
      <a href="${escapeAttr(detailUrl)}" class="play-btn featured-play-btn">
        <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" style="flex-shrink: 0;">
          <polygon points="0,0 10,6 0,12"/>
        </svg>
        <span>Play Now</span>
      </a>
    </div>`;
}

function injectHomepage(html, game) {
  const cardHtml = buildNewestGameHtml(game);
  // Replace the loading placeholder inside #newest-game-card
  const m = /<div class="featured-card" id="newest-game-card">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/.exec(html);
  if (m) {
    return html.replace(
      m[0],
      `<div class="featured-card" id="newest-game-card">${cardHtml}\n</div>\n</div>\n</section>`,
    );
  }
  // Fallback: replace just the loading info div
  return html.replace(
    /<div class="featured-info" id="newest-game-info">[\s\S]*?<\/div>/,
    `<div class="featured-info" id="newest-game-info">${cardHtml}</div>`,
  );
}

// ---------------------------------------------------------------------------
// Games page community grid
// ---------------------------------------------------------------------------

function buildGameCard(game) {
  const id = game.id;
  const title = escapeHtml(game.title || 'Untitled');
  const desc = escapeHtml((game.description || '').slice(0, 180));
  const cover = (typeof game.coverImageUrl === 'string' && game.coverImageUrl) ? game.coverImageUrl : 'assets/icons/anonymous.png';
  const playUrl = (typeof game.playUrl === 'string' && /^https?:\/\//i.test(game.playUrl)) ? game.playUrl : null;
  const tags = Array.isArray(game.tags) ? game.tags.slice(0, 4) : [];
  const badge = (typeof game.badge === 'string' && ['new', 'updated', 'beta'].includes(game.badge)) ? game.badge : null;
  const badgeLabel = badge === 'new' ? 'NEW' : (badge === 'updated' ? 'UPDATED' : (badge === 'beta' ? 'BETA' : ''));
  const ownerUsername = escapeHtml(game.ownerUsername || 'Community Creator');
  const detailUrl = `https://glitchrealm.ca/game-detail.html?id=${encodeURIComponent(id)}`;

  return `
    <div class="game-card is-submission" data-game="${escapeAttr(id)}">
      <div class="card-image">
        <img src="${escapeAttr(cover)}" srcset="${escapeAttr(cover)} 320w, ${escapeAttr(cover)} 640w, ${escapeAttr(cover)} 960w" sizes="(max-width: 480px) 320px, (max-width: 768px) 640px, 960px" alt="${title}" class="game-logo-image" loading="lazy" decoding="async" width="320" height="180">
        <div class="card-overlay"></div>
        ${badge ? `<div class="game-badge ${badge}">${badgeLabel}</div>` : `<div class="game-badge new" style="display:${game.featured ? 'block' : 'none'};">NEW</div>`}
        <button class="wishlist-btn" data-game-id="${escapeAttr(id)}" data-game-title="${escapeAttr(game.title || '')}" data-cover-url="${escapeAttr(cover)}" data-play-url="${playUrl ? escapeAttr(playUrl) : ''}" title="Add to wishlist">♡</button>
        <div class="game-card-menu" data-game-menu>
          <button class="menu-btn edit-btn" data-action="edit" title="Edit Game" style="display:none;">✏️ Edit</button>
          <button class="menu-btn delete-btn" data-action="delete" title="Delete Game" style="display:none;">🗑️ Delete</button>
          <button class="menu-btn report-btn" data-action="report" title="Report Game" style="display:none;">🚩 Report</button>
          <button class="menu-btn three-dot-btn" data-action="report" title="Report Game">⋮</button>
        </div>
      </div>
      <div class="card-content">
        <h3 class="card-title">${title}</h3>
        <p class="card-description">${desc || 'No description provided.'}</p>
        <p class="card-developer">Made by <strong>${ownerUsername}</strong>
          <button class="review-btn" data-review-id="${escapeAttr(id)}" data-review-title="${escapeAttr(game.title || 'Untitled')}">⭐ Review</button>
          <span class="rating-display" data-game-id="${escapeAttr(id)}"><span class="no-rating">N/A (0)</span></span>
        </p>
        <div class="card-tags">
          ${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        ${playUrl
          ? `<button class="btn btn-primary card-btn play-now-btn" data-play-url="${escapeAttr(playUrl)}">Play Now</button>`
          : `<button class="btn btn-disabled card-btn" disabled>Play link pending</button>`}
        <a href="${escapeAttr(detailUrl)}" class="game-card-link" style="position:absolute;inset:0;z-index:1;" aria-label="${title} details"></a>
      </div>
    </div>`;
}

function injectGamesPage(html, games) {
  if (!games.length) return html;
  const cards = games.map(buildGameCard).join('\n');
  // Insert the submission cards before the "More Games Coming Soon" card.
  const m = /<div class="game-card coming-soon"/.exec(html);
  if (m) {
    return html.replace(m[0], `${cards}\n${m[0]}`);
  }
  // Fallback: append before the closing of .game-cards
  const container = /<div class="game-cards">/.exec(html);
  if (container) {
    return html.replace(container[0], `${container[0]}\n${cards}`);
  }
  return html;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const ua = req.headers.get('user-agent') || '';

  if (!isBot(ua)) return; // pass through — users get the JS-rendered page

  let html;
  try {
    const response = await context.next();
    html = await response.text();
    if (!html || html.length < 200) return;
  } catch {
    return;
  }

  try {
    // ---- Game detail page ----
    if (path === '/game-detail.html' || path === '/game-detail') {
      const gameId = url.searchParams.get('id');
      if (!gameId) return;
      const game = await fetchGameDoc(gameId);
      if (!game) return;
      const out = injectGameDetail(html, game, gameId);
      return new Response(out, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
          'X-Robots-Tag': 'index, follow',
        },
      });
    }

    // ---- Homepage ----
    if (path === '/' || path === '/index.html') {
      const games = await fetchPublishedGames(10);
      const newest = games.find((g) => !NEWEST_GAME_EXCLUDED_IDS.has(g.id));
      if (!newest) return;
      const out = injectHomepage(html, newest);
      return new Response(out, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
          'X-Robots-Tag': 'index, follow',
        },
      });
    }

    // ---- Games page ----
    if (path === '/games.html' || path === '/games') {
      const games = await fetchPublishedGames(50);
      if (!games.length) return;
      const out = injectGamesPage(html, games);
      return new Response(out, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
          'X-Robots-Tag': 'index, follow',
        },
      });
    }
  } catch (error) {
    console.error('[prerender] error:', error);
  }
  return; // on any failure, serve the original page
};

export const config = {
  path: [
    '/',
    '/index.html',
    '/games.html',
    '/games',
    '/game-detail.html',
    '/game-detail',
  ],
  onError: 'bypass',
};
