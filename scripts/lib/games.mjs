/**
 * GlitchRealm — build-time game content.
 *
 * Reads the Firestore snapshots in `assets/game-data/` plus the curated
 * in-house titles, then renders real HTML: catalog cards, the homepage
 * "newest game" card and a full static detail page per game.
 *
 * The browser no longer has to fetch Firestore before it can show a game.
 */

import fs from 'node:fs';
import path from 'node:path';

import { GAME_CONTENT, computeContentReady } from './game-content.mjs';

/** In-house games that are authored directly in games.html. */
const FEATURED_GAMES = [
  {
    id: 'coderunner',
    title: 'CodeRunner',
    description:
      'Navigate through digital mazes while solving programming challenges. Race against time in this cyberpunk coding adventure.',
    extendedDescription:
      '**CodeRunner** is a free cyberpunk puzzle game from NanoShade Studios. Guide your runner through neon digital mazes while solving programming challenges against the clock.\n\nLike every game on GlitchRealm it runs in your browser, so there is nothing to download or install.',
    howToPlay:
      '### Controls\n\n- Move with the **arrow keys** or **WASD**.\n- Read each room\'s programming puzzle and plan your route before you move.\n- Beat the timer to clear the maze.\n\nSelect **Play Now** to launch CodeRunner in a new tab.',
    tags: ['Puzzle', 'Coding', 'Adventure'],
    developer: 'NanoShade Studios',
    playUrl: 'https://coderunner.game.glitchrealm.ca/',
    cover: '/assets/game%20logos/coderunner%20logo.webp',
    badge: null,
    status: 'published',
  },
  {
    id: 'bytesurge',
    title: 'ByteSurge',
    description:
      'Ride the digital waves in this high-speed cyberpunk racing adventure. Master the art of data surfing through neon-lit networks.',
    extendedDescription:
      '**ByteSurge** is a high-speed cyberpunk racer from NanoShade Studios. Surf data streams through neon-lit networks, dodge corrupted traffic and chase the fastest line through the grid.\n\nRuns are short by design. Each attempt is a single stretch of network: learn where the traffic patterns bunch up, find the line that keeps your speed high, and restart immediately when a crash ends the run. The score is speed and distance, so a clean line beats a cautious one.\n\nThe visual language is borrowed from terminal interfaces and neon signage — hard edges, bright traces on dark backgrounds and a constant sense of motion. It is a free browser game: no download, no install and no account required to play.',
    howToPlay:
      '### Controls\n\n- Steer with the **arrow keys** or **A/D**.\n- Keep your speed up through the data streams and avoid corrupted traffic.\n- Restart instantly after a crash and chase a faster run.\n\nSelect **Play Now** to launch ByteSurge in a new tab.',
    tags: ['Racing', 'Speed', 'Cyberpunk'],
    developer: 'NanoShade Studios',
    playUrl: 'https://bytesurgeloop.netlify.app/',
    cover: '/assets/game%20logos/ByteSurge.webp',
    badge: 'new',
    status: 'published',
  },
  {
    id: 'neurocore',
    title: 'NeuroCore: Byte Wars',
    description:
      'Engage in neural combat using advanced algorithms. Battle through digital networks in this strategic warfare game.',
    extendedDescription:
      '**NeuroCore: Byte Wars** is a strategy game from InfinityByte Studios. Command neural combat programs, out-think rival algorithms and fight for control of the network.\n\nThe match is decided by position, not by the size of your army. Each round you commit programs to nodes while the enemy does the same, and the network state shifts as nodes change hands. Watching how the opposition spends its units is more useful than spending yours quickly.\n\nIt is built for short sessions: a few rounds, a clear result, and a reason to try a different opening next time. The interface keeps the board readable so the decision stays in the open rather than in hidden statistics.\n\nIt runs directly in your browser as part of the GlitchRealm library, with no download and no install.',
    howToPlay:
      '### Controls\n\n- Build and deploy your programs using the in-game command panel.\n- Watch enemy movement and commit your units to the right node.\n- Adapt your strategy each round as the network changes.\n\nSelect **Play Now** to launch NeuroCore: Byte Wars in a new tab.',
    tags: ['Strategy', 'Combat', 'Sci-Fi'],
    developer: 'InfinityByte Studios',
    playUrl: 'https://bytewars.game.glitchrealm.ca/',
    cover: '/assets/game%20logos/neurocore%20byte%20wars%20logo.webp',
    badge: null,
    status: 'published',
  },
];

const GAME_DATA_DIR = path.join('assets', 'game-data');
const COVER_MANIFEST = path.join('assets', 'cover-thumbs', 'manifest.json');

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '') || 'game';
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Loads every published game, gives it a stable slug and returns the list in
 * catalog order (in-house titles first, then community submissions newest
 * first, matching games.html).
 */
export function loadGames(root) {
  const manifest = readJson(path.join(root, COVER_MANIFEST), {});
  const dataDir = path.join(root, GAME_DATA_DIR);
  const community = [];

  let files = [];
  try {
    files = fs.readdirSync(dataDir).filter((file) => file.endsWith('.json'));
  } catch {
    files = [];
  }

  for (const file of files) {
    const data = readJson(path.join(dataDir, file), null);
    if (!data || !data.title) continue;
    if (data.status && !/^published$/i.test(data.status)) continue;

    const cover = data.coverImageUrl || '';
    const thumb = cover ? manifest[cover] : null;
    community.push({
      ...data,
      id: data.id || file.replace(/\.json$/, ''),
      tags: Array.isArray(data.tags) ? data.tags : [],
      developer: data.ownerUsername || 'Community Creator',
      cover: (thumb && (thumb.w960 || thumb.w480)) || cover || '/assets/icons/anonymous.png',
      coverSrcset: thumb && thumb.w480 && thumb.w960
        ? `${thumb.w480} 480w, ${thumb.w960} 960w`
        : '',
      screenshots: Array.isArray(data.screenshots) ? data.screenshots : [],
      source: 'community',
    });
  }

  community.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  const games = [
    ...FEATURED_GAMES.map((game) => ({ ...game, screenshots: [], source: 'featured' })),
    ...community,
  ];

  const used = new Set();
  for (const game of games) {
    let slug = slugify(game.title);
    let suffix = 2;
    while (used.has(slug)) slug = `${slugify(game.title)}-${suffix++}`;
    used.add(slug);
    game.slug = slug;
    game.detailPath = `/game/${slug}/`;
    game.canonicalUrl = `https://glitchrealm.ca/game/${slug}/`;
    game.legacyPath = `/games/${slug}/`;

    // Content that lives outside Firestore. Existing copy always wins; the
    // override file only fills fields the snapshot left empty and adds the
    // structural sections (controls / tips / FAQ) around the game's own text.
    const override = GAME_CONTENT[slug] || GAME_CONTENT[game.id] || {};
    if (!String(game.extendedDescription || '').trim()) {
      game.extendedDescription = override.extendedDescription || '';
    }
    if (!String(game.howToPlay || '').trim()) {
      game.howToPlay = override.howToPlay || '';
    }
    game.controls = Array.isArray(game.controls) ? game.controls : (override.controls || []);
    game.tips = Array.isArray(game.tips) ? game.tips : (override.tips || []);
    game.faq = Array.isArray(game.faq) ? game.faq : (override.faq || []);
    game.contentReady = computeContentReady(game);
  }

  return games;
}

// ---------------------------------------------------------------------------
// Markdown (a small, safe subset: headings, bold, italics, lists, links, code)
// ---------------------------------------------------------------------------

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function renderInline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  return out;
}

/** Renders the Markdown used in game descriptions. Headings are demoted so a
 *  game page keeps exactly one <h1> (its title) and section <h2>s. */
export function renderMarkdown(markdown) {
  if (!markdown) return '';
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let list = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const source = heading[1].length;
      const level = source <= 2 ? 3 : Math.min(6, source + 1);
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (list !== 'ul') {
        closeList();
        out.push('<ul>');
        list = 'ul';
      }
      out.push(`<li>${renderInline(bullet[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      if (list !== 'ol') {
        closeList();
        out.push('<ol>');
        list = 'ol';
      }
      out.push(`<li>${renderInline(ordered[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  return out.join('\n');
}

/** Plain text version of a Markdown block, for meta descriptions. */
export function markdownToText(markdown, maxLength = 0) {
  let text = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (maxLength && text.length > maxLength) {
    text = `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…`;
  }
  return text;
}

// ---------------------------------------------------------------------------
// Catalog cards
// ---------------------------------------------------------------------------

export function buildNewestGameCard(game) {
  const cover = escapeAttr(game.cover || '');
  const coverStyle = cover
    ? `style="background-image:url('${cover}');background-size:cover;background-position:center;"`
    : '';
  const title = escapeHtml(game.title);
  const description = escapeHtml(game.description || 'No description available.');
  const developer = escapeHtml(game.developer || 'Community Creator');
  const playUrl = /^https?:\/\//i.test(game.playUrl || '') ? escapeAttr(game.playUrl) : '';
  const coverImg = cover
    ? `<img src="${cover}" alt="${title} cover art" class="featured-logo-image" width="600" height="250" loading="eager" fetchpriority="high" decoding="async">`
    : '';

  return `<div class="featured-card" id="newest-game-card" data-prerendered="1" data-baked-id="${escapeAttr(game.id)}" data-detail-path="${escapeAttr(game.detailPath)}">
                    <div class="featured-image" id="newest-game-image" data-baked-id="${escapeAttr(game.id)}" data-detail-path="${escapeAttr(game.detailPath)}" ${coverStyle}>
                        <a class="featured-image-link" href="${escapeAttr(game.detailPath)}" aria-label="View ${title} details" style="display:block;position:absolute;inset:0;z-index:1;">
                            ${coverImg}
                            <div class="game-badge new">NEW</div>
                        </a>
                    </div>
                    <div class="featured-info" id="newest-game-info">
                        <h3><a href="${escapeAttr(game.detailPath)}">${title}</a></h3>
                        <p class="featured-description"><a href="${escapeAttr(game.detailPath)}" style="color:inherit;text-decoration:none;">${description}</a></p>
                        <p class="featured-developer">Made by <strong>${developer}</strong></p>
                        <p><a href="${escapeAttr(game.detailPath)}" class="featured-details-link">Game details</a></p>
                        <a href="${playUrl || escapeAttr(game.detailPath)}" class="play-btn featured-play-btn" target="_blank" rel="noopener noreferrer">
                            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" style="flex-shrink:0;" aria-hidden="true">
                                <polygon points="0,0 10,6 0,12"/>
                            </svg>
                            <span>${playUrl ? 'Play Now' : 'View Game'}</span>
                        </a>
                    </div>
                </div>`;
}

export function buildGameCard(game) {
  const title = escapeHtml(game.title);
  const description = escapeHtml(markdownToText(game.description || '', 180));
  const cover = escapeAttr(game.cover || '/assets/icons/anonymous.png');
  const srcset = game.coverSrcset ? ` srcset="${escapeAttr(game.coverSrcset)}" sizes="(max-width: 480px) 100vw, (max-width: 900px) 50vw, 320px"` : '';
  const playUrl = /^https?:\/\//i.test(game.playUrl || '') ? escapeAttr(game.playUrl) : '';
  const tags = game.tags.slice(0, 4)
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join('');
  const developer = escapeHtml(game.developer || 'Community Creator');

  const playMarkup = playUrl
    ? `<a class="btn btn-primary card-btn play-now-btn" href="${playUrl}" target="_blank" rel="noopener noreferrer" data-play-url="${playUrl}" data-play-game="${escapeAttr(game.id)}" data-play-name="${escapeAttr(game.title)}">Play Now</a>`
    : '<span class="btn btn-disabled card-btn" aria-disabled="true">Play link pending</span>';

  return `<div class="game-card is-submission" data-prerendered="1" data-game="${escapeAttr(game.id)}" data-detail-path="${escapeAttr(game.detailPath)}">
                        <div class="card-image">
                            <a class="card-image-link" href="${escapeAttr(game.detailPath)}" aria-label="View ${title} details" style="display:block;width:100%;height:100%;position:relative;">
                                <img src="${cover}"${srcset} alt="${title}" class="game-logo-image" loading="lazy" decoding="async" width="320" height="180">
                                <div class="card-overlay"></div>
                            </a>
                            <div class="game-badge new" style="display:${game.badge === 'new' ? 'block' : 'none'};">NEW</div>
                        </div>
                        <div class="card-content">
                            <h3 class="card-title"><a href="${escapeAttr(game.detailPath)}">${title}</a></h3>
                            <p class="card-description"><a href="${escapeAttr(game.detailPath)}" style="color:inherit;text-decoration:none;">${description || 'No description provided.'}</a></p>
                            <p class="card-developer">Made by <strong>${developer}</strong></p>
                            <div class="card-tags">${tags}</div>
                            <a class="card-details-link" href="${escapeAttr(game.detailPath)}">View game details →</a>
                            ${playMarkup}
                        </div>
                    </div>`;
}

/** VideoGame + BreadcrumbList structured data for a static game page. */
export function gameJsonLd(game, allGames) {
  const related = allGames
    .filter((other) => other.slug !== game.slug)
    .slice(0, 6)
    .map((other) => ({ '@type': 'VideoGame', name: other.title, url: other.canonicalUrl }));

  const shots = (game.screenshots || []).map(usableScreenshot).filter(Boolean).slice(0, 6);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      '@id': `${game.canonicalUrl}#videogame`,
      name: game.title,
      description: markdownToText(game.description || game.extendedDescription || '', 300),
      url: game.canonicalUrl,
      image: game.cover && game.cover.startsWith('http')
        ? game.cover
        : `https://glitchrealm.ca${game.cover || '/assets/icons/anonymous.png'}`,
      ...(shots.length ? { screenshot: shots } : {}),
      genre: game.tags,
      gamePlatform: 'Web Browser',
      operatingSystem: 'Any',
      applicationCategory: 'Game',
      playMode: 'SinglePlayer',
      inLanguage: 'en',
      isAccessibleForFree: true,
      publisher: {
        '@type': 'Organization',
        name: game.developer || 'GlitchRealm',
      },
      ...(game.playUrl ? { sameAs: game.playUrl } : {}),
      ...(related.length ? { isRelatedTo: related } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://glitchrealm.ca/' },
        { '@type': 'ListItem', position: 2, name: 'Games', item: 'https://glitchrealm.ca/games' },
        { '@type': 'ListItem', position: 3, name: game.title, item: game.canonicalUrl },
      ],
    },
  ];
}

/** FAQPage structured data for the visible FAQ section on a game page. */
export function gameFaqJsonLd(game) {
  if (!Array.isArray(game.faq) || game.faq.length < 3) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${game.canonicalUrl}#faq`,
    mainEntity: game.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/** Turns stored screenshot URLs into ones an <img> can actually load. */
export function usableScreenshot(url) {
  if (!url) return null;
  let clean = String(url).trim();
  const githubBlob = clean.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i);
  if (githubBlob) {
    clean = `https://raw.githubusercontent.com/${githubBlob[1]}/${githubBlob[2]}/${githubBlob[3]}`;
  }
  return /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(clean) ? clean : null;
}
