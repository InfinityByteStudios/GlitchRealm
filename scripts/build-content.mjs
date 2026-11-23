/**
 * GlitchRealm — build-time content baking.
 *
 * Runs inside `scripts/build.mjs` right after the site is copied into `dist/`
 * and before header/footer inlining, minification and asset versioning.
 *
 * What it produces:
 *   - the homepage "newest game" card and the full games catalog as real HTML
 *   - one static HTML page per game: /games/<slug>/ with title, description,
 *     how-to-play, screenshots, related games and JSON-LD
 *   - canonical / robots / Open Graph / Twitter / JSON-LD on every public page
 *   - llms.txt and llms-full.txt
 *   - legal.glitchrealm.ca robots.txt and sitemap.xml
 *   - pretty (extensionless) internal links
 *
 * Everything is baked for every visitor — crawlers and people receive the same
 * document. No UA sniffing, no client-side rendering required to read a page.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  ORIGIN,
  LEGAL_ORIGIN,
  SITE_NAME,
  OG_IMAGE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  PUBLIC_PAGES,
  LEGAL_PAGES,
  LEGAL_INDEX,
  isNoindexPath,
  absoluteUrl,
  organizationNode,
  websiteNode,
  breadcrumbNode,
} from './lib/site.mjs';

import {
  loadGames,
  renderMarkdown,
  markdownToText,
  escapeAttr,
  buildGameCard,
  buildNewestGameCard,
  gameJsonLd,
  usableScreenshot,
} from './lib/games.mjs';
import { buildSitemapXml } from './lib/sitemap.mjs';

const log = (message) => console.log(`[content] ${message}`);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function replaceOnce(html, search, replacement, label) {
  if (!html.includes(search)) {
    throw new Error(`[content] anchor not found (${label}): ${search.slice(0, 70)}`);
  }
  return html.replace(search, replacement);
}

function stripDataAttribute(attribute) {
  return (html) => html.replace(new RegExp(`\\s${attribute}(?:="[^"]*")?`, 'g'), '');
}

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------

const NEWEST_GAME_EXCLUDED_IDS = new Set(['YxnZNN7g1gT0ih5Q1wqo']);

function bakeHomepage(dist, games) {
  const file = path.join(dist, 'index.html');
  if (!fs.existsSync(file)) return;
  const newest = games.find(
    (game) => !NEWEST_GAME_EXCLUDED_IDS.has(game.id) && game.source === 'community'
  ) || games[0];
  if (!newest) return;

  let html = read(file);
  const card = buildNewestGameCard(newest);
  const openTag = '<div class="featured-card" id="newest-game-card"';

  const start = html.indexOf(openTag);
  if (start === -1) return;

  // Balanced-tag replacement: the card contains nested <div>s.
  let depth = 0;
  let index = start;
  let end = -1;
  const openPattern = /<div\b/gi;
  const closePattern = /<\/div\s*>/gi;
  while (index < html.length) {
    openPattern.lastIndex = index;
    closePattern.lastIndex = index;
    const nextOpen = openPattern.exec(html);
    const nextClose = closePattern.exec(html);
    if (!nextClose) break;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      index = nextOpen.index + nextOpen[0].length;
      continue;
    }
    depth -= 1;
    index = nextClose.index + nextClose[0].length;
    if (depth === 0) {
      end = index;
      break;
    }
  }
  if (end === -1) return;

  html = html.slice(0, start) + card + html.slice(end);
  write(file, html);
  log(`index.html: newest game "${newest.title}"`);
}

// ---------------------------------------------------------------------------
// Games catalog
// ---------------------------------------------------------------------------

function bakeGamesPage(dist, games) {
  const file = path.join(dist, 'subdomains', 'pages', 'games', 'games.html');
  if (!fs.existsSync(file)) return;

  let html = read(file);

  // Drop cards baked by a previous build, then insert a fresh, complete set
  // before the coming-soon card. Balanced removal avoids leaving stray divs.
  html = removeCards(html);
  const cards = games.map(buildGameCard).join('\n                    ');
  const marker = '<div class="game-card coming-soon"';
  const at = html.indexOf(marker);
  if (at === -1) {
    log('games.html: coming-soon marker missing, cards not inserted');
    return;
  }
  html = `${html.slice(0, at)}${cards}\n                    ${html.slice(at)}`;

  // The in-house cards are hand-written; add crawlable links to their static
  // detail pages without touching the rest of the card markup.
  for (const game of games.filter((item) => item.source === 'featured')) {
    html = addFeaturedDetailsLink(html, game);
  }

  write(file, html);
  log(`games.html: ${games.length} game cards baked into HTML`);
}

/** Removes one element by its exact opening tag, matching nested tags. */
function removeElement(html, openTag) {
  const start = html.indexOf(openTag);
  if (start === -1) return html;
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
    if (!nextClose) return html;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      index = nextOpen.index + nextOpen[0].length;
      continue;
    }
    depth -= 1;
    index = nextClose.index + nextClose[0].length;
    if (depth === 0) return html.slice(0, start) + html.slice(index);
  }
  return html;
}

function removeCards(html) {
  let output = html;
  const openTag = '<div class="game-card is-submission" data-prerendered="1"';
  let guard = 0;
  while (output.includes(openTag) && guard < 500) {
    guard += 1;
    const start = output.indexOf(openTag);
    let depth = 0;
    let index = start;
    let end = -1;
    const openPattern = /<div\b/gi;
    const closePattern = /<\/div\s*>/gi;
    while (index < output.length) {
      openPattern.lastIndex = index;
      closePattern.lastIndex = index;
      const nextOpen = openPattern.exec(output);
      const nextClose = closePattern.exec(output);
      if (!nextClose) break;
      if (nextOpen && nextOpen.index < nextClose.index) {
        depth += 1;
        index = nextOpen.index + nextOpen[0].length;
        continue;
      }
      depth -= 1;
      index = nextClose.index + nextClose[0].length;
      if (depth === 0) {
        end = index;
        break;
      }
    }
    if (end === -1) break;
    output = output.slice(0, start) + output.slice(end);
  }
  // Collapse the blank lines the removal leaves behind.
  return output.replace(/\n(?:[ \t]*\n){2,}/g, '\n\n');
}

function addFeaturedDetailsLink(html, game) {
  const marker = `data-game="${game.id}"`;
  const start = html.indexOf(marker);
  if (start === -1) return html;

  const contentAt = html.indexOf('<div class="card-content">', start);
  if (contentAt === -1) return html;

  const playAt = html.indexOf('data-play-url=', contentAt);
  if (playAt === -1) return html;

  // Insert the link just before the play button's opening tag.
  const buttonAt = html.lastIndexOf('<button', playAt);
  if (buttonAt === -1) return html;

  const link = `\n                            <a class="card-details-link" href="${game.detailPath}">View ${escapeAttr(game.title)} details</a>`;
  return html.slice(0, buttonAt) + link + html.slice(buttonAt);
}

/**
 * Expands the GAME-DETAIL-REDIRECTS marker in dist/_redirects with one forced
 * rule per published game. Old `/game-detail.html?id=<id>` links then land on
 * the static page immediately, even for games approved after the last deploy.
 */
function writeGameRedirects(dist, games) {
  const file = path.join(dist, '_redirects');
  if (!fs.existsSync(file)) return;

  const marker = '# GAME-DETAIL-REDIRECTS';
  const lines = [];
  for (const game of games) {
    if (!game.id || !game.slug) continue;
    lines.push(`/game-detail.html  id=${game.id}   ${game.detailPath}   301!`);
    lines.push(`/game-detail       id=${game.id}   ${game.detailPath}   301!`);
  }

  const html = read(file);
  if (!html.includes(marker)) return;
  write(file, html.replace(marker, lines.join('\n')));
  log(`_redirects: ${games.length} game-detail id rule(s)`);
}

// ---------------------------------------------------------------------------
// Static game pages
// ---------------------------------------------------------------------------

function absoluteAssetUrls(html) {
  return html.replace(/\b(src|href)="([^"]+)"/g, (match, attr, url) => {
    if (!url || /^(?:https?:)?\/\//i.test(url) || /^(?:#|data:|mailto:|tel:|javascript:)/i.test(url)) {
      return match;
    }
    if (url.startsWith('/')) return match;
    return `${attr}="/${url}"`;
  });
}

function renderGamePage(template, game, games) {
  const url = game.canonicalUrl;
  const title = `${game.title} - Play Free on GlitchRealm`;
  const description = markdownToText(game.description || game.extendedDescription || '', 158);
  const cover = game.cover && game.cover.startsWith('http')
    ? game.cover
    : `${ORIGIN}${game.cover || '/assets/icons/anonymous.png'}`;

  let html = template;

  // --- head -------------------------------------------------------------
  html = replaceOnce(html, '<title>Game Details - GlitchRealm</title>', `<title>${escapeAttr(title)}</title>`, 'title');
  html = replaceOnce(
    html,
    '<meta name="description" content="Explore cyberpunk games on GlitchRealm - Play original indie games in your browser.">',
    `<meta name="description" content="${escapeAttr(description)}">`,
    'description'
  );
  html = replaceOnce(
    html,
    '<link rel="canonical" href="https://glitchrealm.ca/game-detail.html">',
    `<link rel="canonical" href="${escapeAttr(url)}">`,
    'canonical'
  );

  // The static page never re-renders, so the Markdown library is dead weight.
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/marked@[^"]+"><\/script>\s*/i, '');

  // The template ships generic Open Graph tags; replace them so the page has
  // exactly one of each, describing this game.
  html = html.replace(/<meta\s+property=["']og:[^"']*["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>\s*/gi, '');

  const ogTags = [
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${escapeAttr(url)}">`,
    `<meta property="og:image" content="${escapeAttr(cover)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(description)}">`,
    `<meta name="twitter:image" content="${escapeAttr(cover)}">`,
  ].join('\n  ');

  const structuredData = gameJsonLd(game, games)
    .map((node) => `<script type="application/ld+json">${JSON.stringify(node)}</script>`)
    .join('\n  ');

  html = html.replace(
    '</head>',
    `  ${ogTags}\n  ${structuredData}\n</head>`
  );

  // --- breadcrumbs ------------------------------------------------------
  html = html.replace(/href="\/index\.html"/g, 'href="/"');
  html = html.replace(/href="\/games\.html"/g, 'href="/games"');
  html = replaceOnce(
    html,
    '<li aria-hidden="true" style="color: rgba(255,255,255,0.4);" id="breadcrumbSeparator" style="display:none;">/</li>',
    '<li aria-hidden="true" style="color: rgba(255,255,255,0.4);" id="breadcrumbSeparator">/</li>',
    'breadcrumb separator'
  );
  html = replaceOnce(
    html,
    '<li id="breadcrumbGame" aria-current="page" style="display:none;"></li>',
    `<li id="breadcrumbGame" aria-current="page">${escapeHtmlText(game.title)}</li>`,
    'breadcrumb game'
  );

  // --- content state ----------------------------------------------------
  // The baked page is already complete. Drop the loading and not-found
  // placeholders so they cannot leak into the document text.
  html = removeElement(html, '<div id="loadingState" class="loading-state">');
  html = removeElement(html, '<div id="notFoundState" class="not-found" style="display:none;">');
  html = replaceOnce(
    html,
    '<article id="gameContent" itemscope itemtype="https://schema.org/VideoGame" style="display:none;">',
    '<article id="gameContent" itemscope itemtype="https://schema.org/VideoGame">',
    'game content'
  );

  // --- hero -------------------------------------------------------------
  html = replaceOnce(
    html,
    '<h1 id="gameTitle" itemprop="name">Game Title</h1>',
    `<h1 id="gameTitle" itemprop="name">${escapeHtmlText(game.title)}</h1>`,
    'game title'
  );
  html = replaceOnce(
    html,
    '<img id="gameCover" src="" alt="Game Cover" itemprop="image" width="560" height="315" loading="eager" fetchpriority="high">',
    `<img id="gameCover" src="${escapeAttr(game.cover)}" alt="${escapeAttr(game.title)} cover art" itemprop="image" width="560" height="315" loading="eager" fetchpriority="high">`,
    'game cover'
  );
  html = replaceOnce(
    html,
    '<span id="gameBadge" class="detail-badge" style="display:none;"></span>',
    game.badge
      ? `<span id="gameBadge" class="detail-badge ${escapeAttr(game.badge)}">${escapeAttr(String(game.badge).toUpperCase())}</span>`
      : '<span id="gameBadge" class="detail-badge" style="display:none;"></span>',
    'game badge'
  );
  html = replaceOnce(
    html,
    '<span id="gameStatus" class="detail-badge"></span>',
    `<span id="gameStatus" class="detail-badge">${escapeAttr(String(game.status || 'published').toUpperCase())}</span>`,
    'game status'
  );

  const tags = game.tags
    .map((tag) => `<span class="detail-tag">${escapeHtmlText(tag)}</span>`)
    .join('');
  html = replaceOnce(
    html,
    '<div id="gameTags" class="detail-tags" itemprop="genre"></div>',
    `<div id="gameTags" class="detail-tags" itemprop="genre">${tags}</div>`,
    'game tags'
  );
  html = replaceOnce(
    html,
    '<p id="gameDescription" class="detail-description" itemprop="description"></p>',
    `<p id="gameDescription" class="detail-description" itemprop="description">${escapeHtmlText(game.description)}</p>`,
    'game description'
  );

  // --- play -------------------------------------------------------------
  html = replaceOnce(
    html,
    '<a id="playButton" href="#" target="_blank" class="play-btn" style="display:none;">',
    game.playUrl
      ? `<a id="playButton" href="${escapeAttr(game.playUrl)}" target="_blank" rel="noopener noreferrer" class="play-btn">`
      : '<a id="playButton" href="/games" class="play-btn">',
    'play button'
  );
  if (!game.playUrl) {
    html = replaceOnce(html, '▶ Play Now', 'Browse more games', 'play button label');
  }

  // --- long-form content ------------------------------------------------
  const extended = renderMarkdown(game.extendedDescription);
  if (extended) {
    html = html.replace(
      '<section id="extendedDescSection" class="detail-section" style="display:none;">',
      '<section id="extendedDescSection" class="detail-section">'
    );
    html = replaceOnce(
      html,
      '<div id="extendedDescription"></div>',
      `<div id="extendedDescription">${extended}</div>`,
      'extended description'
    );
  }

  const howTo = renderMarkdown(game.howToPlay);
  if (howTo) {
    html = html.replace(
      '<section id="howToPlaySection" class="detail-section" style="display:none;">',
      '<section id="howToPlaySection" class="detail-section">'
    );
    html = replaceOnce(
      html,
      '<div id="howToPlay"></div>',
      `<div id="howToPlay">${howTo}</div>`,
      'how to play'
    );
  }

  const shots = game.screenshots.map(usableScreenshot).filter(Boolean).slice(0, 6);
  if (shots.length) {
    html = html.replace(
      '<section id="screenshotsSection" class="detail-section" style="display:none;">',
      '<section id="screenshotsSection" class="detail-section">'
    );
    const grid = shots
      .map(
        (src, index) =>
          `<a class="screenshot" href="${escapeAttr(src)}" target="_blank" rel="noopener"><img src="${escapeAttr(src)}" alt="${escapeAttr(game.title)} screenshot ${index + 1}" loading="lazy"></a>`
      )
      .join('\n            ');
    html = replaceOnce(
      html,
      '<div id="screenshotsGrid" class="screenshots-grid"></div>',
      `<div id="screenshotsGrid" class="screenshots-grid">\n            ${grid}\n          </div>`,
      'screenshots'
    );
  } else {
    html = html.replace(
      /<section id="screenshotsSection"[\s\S]*?<\/section>/,
      ''
    );
  }

  // --- related games ----------------------------------------------------
  const related = games
    .filter((other) => other.slug !== game.slug)
    .slice(0, 6)
    .map(
      (other) =>
        `<li><a href="${escapeAttr(other.detailPath)}">${escapeHtmlText(other.title)}</a></li>`
    )
    .join('\n            ');

  const relatedSection = `<section id="relatedGames" class="detail-section">
        <h2>More GlitchRealm Games</h2>
        <ul class="related-games-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px 24px;padding-left:20px;">
            ${related}
        </ul>
        <p><a href="/games">Browse the full games library</a></p>
      </section>
      `;

  html = html.replace(
    '<div id="adsense-bottom" class="adsense-container"',
    `${relatedSection}<div id="adsense-bottom" class="adsense-container"`
  );

  // --- hydration data ---------------------------------------------------
  const staticData = {
    id: game.id,
    slug: game.slug,
    title: game.title,
    description: game.description || '',
    tags: game.tags,
    playUrl: game.playUrl || '',
    ownerId: game.ownerId || '',
    status: game.status || 'published',
    canonicalUrl: url,
  };
  html = html.replace(
    '<script type="module">',
    `<script>window.__GAME_DETAIL_STATIC__ = ${JSON.stringify(staticData)};</script>\n  <script type="module">`
  );

  return absoluteAssetUrls(html);
}

function escapeHtmlText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateGamePages(dist, games) {
  const templateFile = path.join(dist, 'subdomains', 'pages', 'games', 'game-detail.html');
  if (!fs.existsSync(templateFile)) {
    throw new Error('[content] game-detail template missing from dist');
  }
  const template = read(templateFile);

  for (const game of games) {
    const html = renderGamePage(template, game, games);
    write(path.join(dist, 'games', game.slug, 'index.html'), html);
  }
  log(`wrote ${games.length} static game page(s) under /games/<slug>/`);
}

/** Injects a slug map into the dynamic game-detail fallback and redirects
 *  known ids to their static page even when the redirect rules are skipped. */
function injectGameSlugRedirects(dist, games) {
  const file = path.join(dist, 'subdomains', 'pages', 'games', 'game-detail.html');
  if (!fs.existsSync(file)) return;

  const map = Object.fromEntries(games.map((game) => [game.id, game.slug]));
  const script = `<script>(function(){try{var m=${JSON.stringify(map)};var id=new URLSearchParams(location.search).get('id');var slug=id&&m[id];if(slug){location.replace('/games/'+slug+'/');}}catch(e){}})();</script>`;

  let html = read(file);
  html = html.replace('</head>', `  ${script}\n</head>`);
  write(file, html);
}

// ---------------------------------------------------------------------------
// Head metadata for every public page
// ---------------------------------------------------------------------------

const ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const ROBOTS_NOINDEX = 'noindex, nofollow';

function targetsFor(page) {
  const files = [];
  if (page.origin === 'legal') {
    const name = page.path === '/' ? null : page.path.slice(1);
    if (name) {
      files.push(path.join('dist', `${name}.html`));
      files.push(path.join('dist', 'subdomains', 'pages', 'legal', `${name}.html`));
    } else {
      files.push(path.join('dist', 'subdomains', 'legal', 'index.html'));
    }
  } else {
    const rel = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`;
    files.push(path.join('dist', rel));
    const source = page.source;
    if (source) files.push(path.join('dist', source));
  }
  return files.filter((file) => fs.existsSync(file));
}

function setMeta(html, attribute, key, content) {
  const pattern = new RegExp(`<meta\\s+${attribute}=["']${key}["'][^>]*>\\s*`, 'gi');
  html = html.replace(pattern, '');
  return html.replace(
    '</head>',
    `  <meta ${attribute}="${key}" content="${escapeAttr(content)}">\n</head>`
  );
}

function setCanonical(html, url) {
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '');
  return html.replace('</head>', `  <link rel="canonical" href="${escapeAttr(url)}">\n</head>`);
}

function setStructuredData(html, nodes) {
  html = html.replace(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    ''
  );
  const payload = JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes });
  return html.replace(
    '</head>',
    `  <script type="application/ld+json">${payload}</script>\n</head>`
  );
}

function webPageNode(page) {
  const url = absoluteUrl(page);
  return {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    isPartOf: { '@id': `${ORIGIN}/#website` },
    about: { '@id': `${ORIGIN}/#organization` },
    inLanguage: 'en',
  };
}

function pageTrail(page) {
  const url = absoluteUrl(page);
  if (page.kind === 'legal') {
    return [
      { name: 'Home', url: `${ORIGIN}/` },
      { name: 'Legal', url: `${LEGAL_ORIGIN}/` },
      ...(page.path === '/' ? [] : [{ name: page.title.replace(/ - GlitchRealm$/, ''), url }]),
    ];
  }
  if (page.path === '/') return [{ name: 'Home', url }];
  return [
    { name: 'Home', url: `${ORIGIN}/` },
    { name: page.title.replace(/ [-|].*$/, ''), url },
  ];
}

function applyHeadMetadata(dist, games) {
  let updated = 0;

  for (const page of [...PUBLIC_PAGES, ...LEGAL_PAGES, LEGAL_INDEX]) {
    for (const file of targetsFor(page)) {
      let html = read(file);
      const url = absoluteUrl(page);

      html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(page.title)}</title>`);
      html = setMeta(html, 'name', 'description', page.description);
      html = setMeta(html, 'name', 'robots', ROBOTS_INDEX);
      html = setCanonical(html, url);
      html = setMeta(html, 'property', 'og:type', 'website');
      html = setMeta(html, 'property', 'og:site_name', SITE_NAME);
      html = setMeta(html, 'property', 'og:title', page.title);
      html = setMeta(html, 'property', 'og:description', page.description);
      html = setMeta(html, 'property', 'og:url', url);
      html = setMeta(html, 'property', 'og:image', OG_IMAGE);
      html = setMeta(html, 'property', 'og:image:width', String(OG_IMAGE_WIDTH));
      html = setMeta(html, 'property', 'og:image:height', String(OG_IMAGE_HEIGHT));
      html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
      html = setMeta(html, 'name', 'twitter:title', page.title);
      html = setMeta(html, 'name', 'twitter:description', page.description);
      html = setMeta(html, 'name', 'twitter:image', OG_IMAGE);

      if (!/<html[^>]*\blang=/i.test(html)) {
        html = html.replace(/<html\b/i, '<html lang="en"');
      }

      const nodes = [organizationNode(), websiteNode()];
      if (page.path === '/games') {
        const items = games.slice(0, 50).map((game, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: game.canonicalUrl,
          name: game.title,
        }));
        nodes.push({
          '@type': 'CollectionPage',
          '@id': `${url}#webpage`,
          url,
          name: page.title,
          description: page.description,
          isPartOf: { '@id': `${ORIGIN}/#website` },
          inLanguage: 'en',
          mainEntity: { '@type': 'ItemList', numberOfItems: games.length, itemListElement: items },
        });
      } else {
        nodes.push(webPageNode(page));
      }
      nodes.push(breadcrumbNode(pageTrail(page)));

      html = setStructuredData(html, nodes);
      write(file, html);
      updated += 1;
    }
  }

  log(`head metadata + JSON-LD on ${updated} public page(s)`);
}

/** Adds noindex to internal, duplicate and utility pages. */
function applyNoindex(dist) {
  // Map a dist file back to the public URL it is served at. The mirrored
  // sources under subdomains/pages/... are public pages, not internal ones.
  const publicByFile = new Map();
  try {
    for (const raw of read(path.join(dist, '_redirects')).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const [from, to, status] = line.split(/\s+/);
      if (!from?.startsWith('/') || !to?.startsWith('/') || status !== '200') continue;
      const key = to.replace(/^\//, '');
      if (!publicByFile.has(key)) publicByFile.set(key, from);
    }
  } catch {
    /* no redirects file — fall back to path-based rules */
  }

  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'assets' || entry.name === 'css' || entry.name === 'js' || entry.name === 'components') continue;
        walk(full);
      } else if (entry.name.endsWith('.html')) {
        files.push(full);
      }
    }
  };
  walk(dist);

  let updated = 0;
  for (const file of files) {
    const rel = path.relative(dist, file).split(path.sep).join('/');
    const publicPath = publicByFile.get(rel);
    const urlPath = publicPath || `/${rel.replace(/\.html$/, '')}`;
    const dirUrl = publicPath || `/${rel.replace(/\/index\.html$/, '')}`;
    const noindex =
      isNoindexPath(urlPath)
      || isNoindexPath(dirUrl)
      || rel.startsWith('subdomains/admin/')
      || rel.startsWith('subdomains/pages/admin/')
      || rel.startsWith('subdomains/pages/account/')
      || rel.startsWith('subdomains/pages/auth/');

    if (!noindex) continue;

    let html = read(file);
    if (/<meta[^>]+name=["']robots["']/i.test(html)) {
      html = html.replace(
        /<meta[^>]+name=["']robots["'][^>]*>/gi,
        `<meta name="robots" content="${ROBOTS_NOINDEX}">`
      );
    } else {
      html = html.replace('</head>', `  <meta name="robots" content="${ROBOTS_NOINDEX}">\n</head>`);
    }
    write(file, html);
    updated += 1;
  }
  log(`noindex on ${updated} internal/duplicate page(s)`);
}

// ---------------------------------------------------------------------------
// Pretty URLs
// ---------------------------------------------------------------------------

function prettyUrlMap() {
  const map = new Map([['/index.html', '/']]);
  for (const page of [...PUBLIC_PAGES, ...LEGAL_PAGES]) {
    if (page.path === '/') continue;
    if (page.origin === 'legal') {
      map.set(`/${page.path.slice(1)}.html`, `${LEGAL_ORIGIN}${page.path}`);
      map.set(`${LEGAL_ORIGIN}${page.path}.html`, `${LEGAL_ORIGIN}${page.path}`);
    } else {
      map.set(`/${page.path.slice(1)}.html`, page.path);
      map.set(`${ORIGIN}${page.path.slice(1)}.html`, `${ORIGIN}${page.path}`);
    }
  }
  return map;
}

function rewritePrettyLinks(dist, games) {
  const map = prettyUrlMap();
  const gameMap = new Map(games.map((game) => [game.id, game.detailPath]));
  const files = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'assets' || entry.name === 'css' || entry.name === 'js' || entry.name === 'components') continue;
        walk(full);
      } else if (entry.name.endsWith('.html')) {
        files.push(full);
      }
    }
  };
  walk(dist);

  let changed = 0;
  for (const file of files) {
    const before = read(file);
    let html = before;

    // /game-detail.html?id=X (and ?id=X&…) -> the static page
    html = html.replace(
      /(?:https:\/\/glitchrealm\.ca)?\/game-detail(?:\.html)?\?id=([A-Za-z0-9]+)[^"'\s<]*/g,
      (match, id) => gameMap.get(id) || match
    );

    html = html.replace(/\b(href)="([^"]+)"/g, (match, attr, url) => {
      const [pathname, suffix] = url.split(/(?=[?#])/);
      const pretty = map.get(pathname);
      return pretty ? `${attr}="${pretty}${suffix || ''}"` : match;
    });

    if (html !== before) {
      write(file, html);
      changed += 1;
    }
  }
  log(`pretty internal links on ${changed} page(s)`);
}

// ---------------------------------------------------------------------------
// llms.txt
// ---------------------------------------------------------------------------

function writeLlmsTxt(dist, games) {
  const lines = [];
  lines.push(`# ${SITE_NAME}`);
  lines.push('');
  lines.push('> GlitchRealm is a free cyberpunk and indie browser gaming platform. Every game runs in the browser — no download or install.');
  lines.push('');
  lines.push('GlitchRealm hosts original in-house titles and community-submitted HTML5 games. Games are played on the site or launched in a new tab, and all of them are free to play.');
  lines.push('');
  lines.push('## Games');
  lines.push('');
  for (const game of games) {
    const text = markdownToText(game.description || game.extendedDescription || '', 180);
    lines.push(`- [${game.title}](${game.canonicalUrl}): ${text || 'Free browser game on GlitchRealm.'}`);
  }
  lines.push('');
  lines.push('## Core pages');
  lines.push('');
  for (const page of PUBLIC_PAGES) {
    lines.push(`- [${page.title.replace(/ [-|].*$/, '')}](${absoluteUrl(page)}): ${page.description}`);
  }
  lines.push('');
  lines.push('## Legal');
  lines.push('');
  for (const page of LEGAL_PAGES) {
    lines.push(`- [${page.title.replace(/ - GlitchRealm$/, '')}](${absoluteUrl(page)}): ${page.description}`);
  }
  lines.push(`- [Legal Center](${LEGAL_ORIGIN}/): Every GlitchRealm policy in one place.`);
  lines.push('');
  lines.push('## Optional');
  lines.push('');
  lines.push(`- [Sitemap](${ORIGIN}/sitemap.xml): Machine-readable list of every indexable page.`);
  lines.push(`- [Full text reference](${ORIGIN}/llms-full.txt): Complete game descriptions, how-to-play guides and page summaries.`);
  lines.push(`- [Games feed](${ORIGIN}/games): The full catalog with descriptions.`);
  lines.push('');

  write(path.join(dist, 'llms.txt'), lines.join('\n'));

  // Expanded version: full descriptions for games, one line per other page.
  const full = [];
  full.push(`# ${SITE_NAME} — Full Reference`);
  full.push('');
  full.push('The complete text index of GlitchRealm for language models and agents. Every URL below returns the same content to humans and crawlers.');
  full.push('');
  for (const game of games) {
    full.push(`## ${game.title}`);
    full.push('');
    full.push(`URL: ${game.canonicalUrl}`);
    full.push(`Play: ${game.playUrl || 'Not available'}`);
    full.push(`Developer: ${game.developer || 'GlitchRealm'}`);
    full.push(`Tags: ${game.tags.join(', ') || 'None'}`);
    full.push('');
    full.push(markdownToText(game.description || '', 0) || 'No short description.');
    full.push('');
    const extended = markdownToText(game.extendedDescription || '', 0);
    if (extended) full.push(extended);
    full.push('');
    const howTo = markdownToText(game.howToPlay || '', 0);
    if (howTo) {
      full.push('How to play:');
      full.push('');
      full.push(howTo);
      full.push('');
    }
  }
  for (const page of [...PUBLIC_PAGES, ...LEGAL_PAGES]) {
    full.push(`## ${page.title.replace(/ [-|].*$/, '')}`);
    full.push('');
    full.push(`URL: ${absoluteUrl(page)}`);
    full.push('');
    full.push(page.description);
    full.push('');
  }
  write(path.join(dist, 'llms-full.txt'), full.join('\n'));

  log('wrote llms.txt and llms-full.txt');
}

// ---------------------------------------------------------------------------
// Legal host files
// ---------------------------------------------------------------------------

function writeLegalHostFiles(dist) {
  const robots = [
    '# legal.glitchrealm.ca',
    'User-agent: *',
    'Allow: /',
    '',
    'User-agent: GPTBot',
    'Allow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    `Sitemap: ${LEGAL_ORIGIN}/sitemap.xml`,
    '',
  ].join('\n');
  write(path.join(dist, 'legal-robots.txt'), robots);

  const urls = [LEGAL_INDEX, ...LEGAL_PAGES];
  const entries = urls
    .map((page) => `  <url>\n    <loc>${absoluteUrl(page)}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`)
    .join('\n');
  write(
    path.join(dist, 'legal-sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
  );

  log('wrote legal host robots.txt and sitemap.xml');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function bakeContent(dist, root) {
  const games = loadGames(root);

  bakeHomepage(dist, games);
  bakeGamesPage(dist, games);
  generateGamePages(dist, games);
  injectGameSlugRedirects(dist, games);
  writeGameRedirects(dist, games);

  applyHeadMetadata(dist, games);
  applyNoindex(dist);
  rewritePrettyLinks(dist, games);
  writeLlmsTxt(dist, games);
  writeLegalHostFiles(dist);
  write(path.join(dist, 'sitemap.xml'), buildSitemapXml(root));
  log('wrote sitemap.xml');

  return games;
}

/**
 * Second pretty-link pass, run by build.mjs after the header and footer
 * partials are inlined (they are added to every page after bakeContent).
 */
export function finalizePrettyLinks(dist, root) {
  rewritePrettyLinks(dist, loadGames(root));
}
