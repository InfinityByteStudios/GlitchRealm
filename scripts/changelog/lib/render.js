/**
 * Static rendering: changelog overview, release pages, RSS 2.0, Atom 1.0 and
 * the machine-readable releases.json index.
 *
 * Everything is fully rendered HTML/XML/JSON — no JavaScript is required to
 * read any release. Drafts are excluded from every public artifact.
 */

const config = require('../config');
const versioning = require('./versioning');
const { CATEGORY_LABELS, CATEGORY_KEYS } = require('./classify');

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
	return escapeHtml(text);
}

function escapeXml(text) {
	return escapeHtml(text);
}

function slugFor(version) {
	return `v${String(version).replace(/\./g, '-')}`;
}

function releaseUrl(version) {
	return `/changelog/${slugFor(version)}/`;
}

function releaseAbsoluteUrl(version) {
	return `${config.siteUrl}${releaseUrl(version)}`;
}

function formatDate(iso) {
	if (!iso) return '';
	try {
		return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
	} catch {
		return iso;
	}
}

function rfc2822(iso) {
	if (!iso) return '';
	try {
		return new Date(iso).toUTCString();
	} catch {
		return iso;
	}
}

function categoryChips(categories) {
	const keys = CATEGORY_KEYS.filter((key) => (categories || {})[key] > 0);
	if (!keys.length) return '<ul class="changelog-chips"><li class="changelog-chip">Platform updates</li></ul>';
	return `<ul class="changelog-chips">${keys
		.map((key) => `<li class="changelog-chip changelog-chip-${key}">${escapeHtml(CATEGORY_LABELS[key])}</li>`)
		.join('')}</ul>`;
}

// ---------------------------------------------------------------------------
// Related internal links (descriptive anchors only, derived from real paths)
// ---------------------------------------------------------------------------

const LINK_RULES = [
	{ test: (release, paths) => paths.some((p) => /auth|sign-?in|account|password/i.test(p)), href: 'https://auth.glitchrealm.ca/', text: 'Sign in to GlitchRealm' },
	{ test: (release, paths) => paths.some((p) => /submit-game|submission/i.test(p)), href: '/submit-game.html', text: 'Submit a game to GlitchRealm' },
	{ test: (release, paths) => paths.some((p) => /developer-dashboard|developers\//i.test(p)), href: 'https://developers.glitchrealm.ca/', text: 'Developer resources' },
	{ test: (release, paths) => paths.some((p) => /^Games\//i.test(p) || /game-detail|games\.html/i.test(p)), href: '/games.html', text: 'Browse games on GlitchRealm' },
	{ test: (release) => (release.categories.security > 0), href: '/support.html', text: 'Get support' },
	{ test: (release) => (release.categories.features > 0 || release.categories.improvements > 0), href: '/index.html', text: 'Play on GlitchRealm' },
];

function relatedLinks(release) {
	const paths = (release.commitRange && release.commitRange.files) || [];
	const links = [];
	const seen = new Set();
	for (const rule of LINK_RULES) {
		if (links.length >= 4) break;
		let keep = false;
		try { keep = rule.test(release, paths); } catch { keep = false; }
		if (keep && !seen.has(rule.href)) {
			seen.add(rule.href);
			links.push({ href: rule.href, text: rule.text });
		}
	}
	return links;
}

// ---------------------------------------------------------------------------
// Page shell (matches the existing site header/footer partial convention)
// ---------------------------------------------------------------------------

const FONTS_PRELOAD = `
    <link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/rajdhani-400-latin.woff2">
    <link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/orbitron-latin.woff2">`;

function pageShell({ title, description, canonical, ogImage, extraHead, bodyHtml }) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttr(description)}">
    <link rel="canonical" href="${escapeAttr(canonical)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="${escapeAttr(config.siteOrg)}">
    <meta property="og:title" content="${escapeAttr(title)}">
    <meta property="og:description" content="${escapeAttr(description)}">
    <meta property="og:url" content="${escapeAttr(canonical)}">
    <meta property="og:image" content="${escapeAttr(ogImage || `${config.siteUrl}/assets/Favicon%20and%20Icons/apple-touch-icon.png`)}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeAttr(title)}">
    <meta name="twitter:description" content="${escapeAttr(description)}">
    <link rel="alternate" type="application/rss+xml" title="${escapeAttr(`${config.siteName} Changelog`)}" href="/changelog/feed.xml">
    <link rel="alternate" type="application/atom+xml" title="${escapeAttr(`${config.siteName} Changelog`)}" href="/changelog/atom.xml">${FONTS_PRELOAD}
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="stylesheet" href="/css/styles.css">
    <script type="module" src="/js/firebase-core.js"></script>${extraHead || ''}
</head>
<body>
    <div class="background-animation" aria-hidden="true"></div>
    <div id="header-placeholder"></div>
${bodyHtml}
    <div id="footer-placeholder"></div>
    <script src="/js/script.js" defer></script>
    <script type="module" src="/js/header-avatar-integration.js"></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

function jsonLdScript(object) {
	// Escape <, > and & inside the serialized JSON so embedded payloads can
	// never close the script element (JSON-LD XSS hardening).
	const serialized = JSON.stringify(object)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026');
	return `    <script type="application/ld+json">\n    ${serialized}\n    </script>`;
}

function releaseJsonLd(release) {
	const url = releaseAbsoluteUrl(release.version);
	const data = {
		'@context': 'https://schema.org',
		'@type': 'TechArticle',
		headline: `${config.siteName} v${release.version} — ${release.title}`,
		description: release.summary,
		datePublished: release.publishedAt,
		dateModified: release.lastModifiedAt || release.publishedAt,
		mainEntityOfPage: { '@type': 'WebPage', '@id': url },
		url,
		publisher: { '@type': 'Organization', name: config.siteOrg, url: `${config.siteUrl}/` },
		author: { '@type': 'Organization', name: config.siteOrg, url: `${config.siteUrl}/` },
		about: { '@type': 'SoftwareApplication', name: `${config.siteName} Games`, applicationCategory: 'GameApplication', url: `${config.siteUrl}/` },
		keywords: Object.keys(release.categories || {})
			.filter((key) => release.categories[key] > 0)
			.map((key) => CATEGORY_LABELS[key])
			.join(', '),
	};
	const breadcrumb = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Home', item: `${config.siteUrl}/` },
			{ '@type': 'ListItem', position: 2, name: 'Changelog', item: config.changelogUrl },
			{ '@type': 'ListItem', position: 3, name: `v${release.version}`, item: url },
		],
	};
	return `${jsonLdScript(data)}\n${jsonLdScript(breadcrumb)}`;
}

function overviewJsonLd(releases) {
	return jsonLdScript({
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: `${config.siteName} Changelog`,
		description: 'Official release history and platform updates for GlitchRealm Games.',
		url: config.changelogUrl,
		isPartOf: { '@type': 'WebSite', name: config.siteName, url: `${config.siteUrl}/` },
		publisher: { '@type': 'Organization', name: config.siteOrg },
		mainEntity: {
			'@type': 'ItemList',
			itemListElement: releases.map((release, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				url: releaseAbsoluteUrl(release.version),
				name: `${config.siteName} v${release.version}`,
			})),
		},
	});
}

// ---------------------------------------------------------------------------
// Release page
// ---------------------------------------------------------------------------

function renderEntries(release, { full = true } = {}) {
	const maxEntries = config.rendering.maxEntriesPerRelease;
	const sections = [];
	const shown = [];
	let truncated = 0;

	for (const key of CATEGORY_KEYS) {
		const entries = (release.changes && release.changes[key]) || [];
		if (!entries.length) continue;
		const visible = full ? entries.slice(0, maxEntries - shown.length) : [];
		if (full) {
			shown.push(...visible);
			truncated += entries.length - visible.length;
		}
		const items = visible
			.map((entry) => `            <li class="changelog-entry">
                <span class="changelog-entry-title">${escapeHtml(entry.title)}</span>
                <p class="changelog-entry-description">${escapeHtml(entry.description)}${entry.audiencePhrase ? ` ${escapeHtml(entry.audiencePhrase)}` : ''}</p>${entry.url ? `                <a class="changelog-entry-link" href="${escapeAttr(entry.url)}" rel="noopener">View pull request</a>` : ''}
            </li>`)
			.join('\n');
		sections.push(`        <section class="changelog-section changelog-section-${key}">
            <h2>${escapeHtml(CATEGORY_LABELS[key])}</h2>
            <ul class="changelog-entries">
${items}
            </ul>
        </section>`);
	}

	if (truncated > 0 || (release.changesTruncated || 0) > 0) {
		const totalShown = release.changesShown !== undefined ? release.changesShown : shown.length;
		const totalCount = totalShown + (release.changesTruncated || truncated);
		sections.push(`        <p class="changelog-note">Showing ${totalShown} of ${totalCount} changes in this release. The complete change list is preserved in the release manifest and the public repository history.</p>`);
	}
	return sections.join('\n');
}

function renderReleasePage({ release, newer, older }) {
	const url = releaseAbsoluteUrl(release.version);
	const title = `${config.siteName} v${release.version} — ${release.title}`;
	const description = release.summary;

	const related = relatedLinks(release);
	const relatedHtml = related.length
		? `        <section class="changelog-related">
            <h2>Related on GlitchRealm</h2>
            <ul>
${related.map((link) => `                <li><a href="${escapeAttr(link.href)}">${escapeHtml(link.text)}</a></li>`).join('\n')}
            </ul>
        </section>`
		: '';

	const rangeText = release.commitRange && release.commitRange.commits !== undefined
		? `<p class="changelog-meta">Includes ${release.commitRange.commits} git commit${release.commitRange.commits === 1 ? '' : 's'}${release.commitRange.prCount ? ` across ${release.commitRange.prCount} pull request${release.commitRange.prCount === 1 ? '' : 's'}` : ''}.</p>`
		: '';

	const nav = `    <nav class="changelog-nav" aria-label="Release navigation">
        <a href="${escapeAttr(config.changelogUrl.replace(config.siteUrl, ''))}" class="changelog-nav-link">&larr; All releases</a>
        ${newer ? `<a href="${escapeAttr(releaseUrl(newer.version))}" class="changelog-nav-link">Newer: v${escapeHtml(newer.version)}</a>` : '<span class="changelog-nav-link changelog-nav-disabled">Newest release</span>'}
        ${older ? `<a href="${escapeAttr(releaseUrl(older.version))}" class="changelog-nav-link">Older: v${escapeHtml(older.version)}</a>` : '<span class="changelog-nav-link changelog-nav-disabled">Oldest release</span>'}
    </nav>`;

	const body = `
    <main class="changelog-main">
        <article class="changelog-article" itemscope itemtype="https://schema.org/TechArticle">
            <header class="changelog-header">
                <p class="changelog-version" itemprop="softwareVersion">GlitchRealm v${escapeHtml(release.version)}</p>
                <h1 class="changelog-title" itemprop="headline">${escapeHtml(release.title)}</h1>
                <p class="changelog-date">Published <time datetime="${escapeAttr(release.publishedAt)}" itemprop="datePublished">${escapeHtml(formatDate(release.publishedAt))}</time> (UTC)</p>
                ${rangeText}
                <p class="changelog-summary" itemprop="description">${escapeHtml(release.summary)}</p>
                ${categoryChips(release.categories)}
            </header>
${renderEntries(release, { full: true })}
${relatedHtml}
            <footer class="changelog-footer">
                <p><a href="${escapeAttr(config.changelogUrl.replace(config.siteUrl, ''))}">Browse the complete ${escapeHtml(config.siteName)} changelog</a></p>
            </footer>
        </article>
${nav}
    </main>`;

	return pageShell({
		title,
		description,
		canonical: url,
		extraHead: releaseJsonLd(release),
		bodyHtml: body,
	});
}

// ---------------------------------------------------------------------------
// Overview (complete discovery index)
// ---------------------------------------------------------------------------

function renderReleaseCard(release, { featured = false } = {}) {
	return `        <article class="changelog-release${featured ? ' changelog-release-featured' : ''}" data-release="${escapeAttr(release.version)}" data-categories="${escapeAttr(Object.keys(release.categories).filter((k) => release.categories[k] > 0).join(' '))}">
            <header>
                <h3 class="changelog-release-title"><a href="${escapeAttr(releaseUrl(release.version))}">${escapeHtml(config.siteName)} v${escapeHtml(release.version)} — ${escapeHtml(release.title)}</a></h3>
                <p class="changelog-release-date">Published <time datetime="${escapeAttr(release.publishedAt)}">${escapeHtml(formatDate(release.publishedAt))}</time></p>
            </header>
            <p class="changelog-release-summary">${escapeHtml(release.summary)}</p>
            ${categoryChips(release.categories)}
            <p class="changelog-release-more"><a href="${escapeAttr(releaseUrl(release.version))}">Read the full v${escapeHtml(release.version)} release notes</a></p>
        </article>`;
}

function paginationLinks({ page, totalPages }) {
	if (totalPages <= 1) return '';
	const links = [];
	if (page > 1) {
		links.push(`<a href="${escapeAttr(page - 1 === 1 ? '/changelog/' : `/changelog/page-${page - 1}/`)}" rel="prev">&larr; Newer releases</a>`);
	}
	for (let index = 1; index <= totalPages; index += 1) {
		if (index === page) {
			links.push(`<span class="changelog-page-current">Page ${index}</span>`);
		} else {
			links.push(`<a href="${escapeAttr(index === 1 ? '/changelog/' : `/changelog/page-${index}/`)}">Page ${index}</a>`);
		}
	}
	if (page < totalPages) {
		links.push(`<a href="${escapeAttr(`/changelog/page-${page + 1}/`)}" rel="next">Older releases &rarr;</a>`);
	}
	return `    <nav class="changelog-pagination" aria-label="Release history pages">${links.join(' ')}</nav>`;
}

function renderOverviewPage({ releases, page = 1, totalPages = 1, latest }) {
	const slice = page === 1 && totalPages === 1
		? releases
		: releases.slice((page - 1) * config.rendering.paginationSize, page * config.rendering.paginationSize);

	const featuredHtml = latest
		? `        <section class="changelog-latest" aria-labelledby="changelog-latest-title">
            <h2 id="changelog-latest-title">Latest release</h2>
${renderReleaseCard(latest, { featured: true })}
        </section>`
		: '';

	const listHtml = slice.length
		? slice.map((release) => renderReleaseCard(release)).join('\n')
		: '        <p class="changelog-note">No published releases yet. New releases appear here automatically when they are published.</p>';

	const title = page === 1 ? `${config.siteName} Changelog — Release History` : `${config.siteName} Changelog — Release History (Page ${page})`;
	const description = page === 1
		? `Every published ${config.siteName} release: new features, improvements, fixes and maintenance. Machine-readable feeds available.`
		: `Older ${config.siteName} release notes, page ${page} of ${totalPages}.`;

	const body = `
    <main class="changelog-main">
        <header class="changelog-intro">
            <h1>${escapeHtml(config.siteName)} Changelog</h1>
            <p class="changelog-intro-text">Every published release of <strong>${escapeHtml(config.siteName)}</strong> (${escapeHtml(config.siteUrl.replace(/^https?:\/\//, ''))}): what changed, which part of the platform it affects, and when it shipped. Subscribe via <a href="/changelog/feed.xml">RSS</a> or <a href="/changelog/atom.xml">Atom</a>, or use the machine-readable <a href="/changelog/releases.json">JSON release index</a>.</p>
        </header>
${featuredHtml}
        <section class="changelog-history" aria-labelledby="changelog-history-title">
            <h2 id="changelog-history-title">All releases</h2>
${listHtml}
        </section>
${paginationLinks({ page, totalPages })}
    </main>`;

	return pageShell({
		title,
		description,
		canonical: page === 1 ? config.changelogUrl : `${config.siteUrl}/changelog/page-${page}/`,
		extraHead: overviewJsonLd(slice),
		bodyHtml: body,
	});
}

// ---------------------------------------------------------------------------
// Feeds
// ---------------------------------------------------------------------------

function releaseBodyHtml(release) {
	const sections = [];
	for (const key of CATEGORY_KEYS) {
		const entries = (release.changes && release.changes[key]) || [];
		if (!entries.length) continue;
		const items = entries.map((entry) => `<li>${escapeHtml(entry.title)} — ${escapeHtml(entry.description)}</li>`).join('');
		sections.push(`<h3>${escapeHtml(CATEGORY_LABELS[key])}</h3><ul>${items}</ul>`);
	}
	return `<p>${escapeHtml(release.summary)}</p>${sections.join('')}<p><a href="${escapeAttr(releaseAbsoluteUrl(release.version))}">Full release notes</a></p>`;
}

function renderRss(releases) {
	const items = releases.map((release) => {
		const url = releaseAbsoluteUrl(release.version);
		const categories = Object.keys(release.categories)
			.filter((key) => release.categories[key] > 0)
			.map((key) => `    <category>${escapeXml(CATEGORY_LABELS[key])}</category>`)
			.join('\n');
		return `    <item>
      <title>${escapeXml(`${config.siteName} v${release.version} — ${release.title}`)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${escapeXml(rfc2822(release.publishedAt))}</pubDate>
      <description>${escapeXml(release.summary)}</description>
      <content:encoded><![CDATA[${releaseBodyHtml(release)}]]></content:encoded>
${categories}
    </item>`;
	}).join('\n');

	const lastBuild = releases.length ? rfc2822(releases[0].publishedAt) : rfc2822(new Date().toISOString());

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${config.siteName} Changelog`)}</title>
    <link>${escapeXml(config.changelogUrl)}</link>
    <description>${escapeXml(`Official release history and platform updates for ${config.siteOrg}.`)}</description>
    <language>en</language>
    <lastBuildDate>${escapeXml(lastBuild)}</lastBuildDate>
    <atom:link href="${escapeXml(config.feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

function renderAtom(releases) {
	const entries = releases.map((release) => {
		const url = releaseAbsoluteUrl(release.version);
		const categories = Object.keys(release.categories)
			.filter((key) => release.categories[key] > 0)
			.map((key) => `    <category term="${escapeXml(CATEGORY_LABELS[key])}" />`)
			.join('\n');
		return `  <entry>
    <id>${escapeXml(url)}</id>
    <title>${escapeXml(`${config.siteName} v${release.version} — ${release.title}`)}</title>
    <link rel="alternate" href="${escapeXml(url)}" />
    <published>${escapeXml(release.publishedAt)}</published>
    <updated>${escapeXml(release.lastModifiedAt || release.publishedAt)}</updated>
${categories}
    <content type="html">${escapeXml(releaseBodyHtml(release))}</content>
  </entry>`;
	}).join('\n');

	const updated = releases.length ? (releases[0].lastModifiedAt || releases[0].publishedAt) : new Date().toISOString();

	return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(config.changelogUrl)}</id>
  <title>${escapeXml(`${config.siteName} Changelog`)}</title>
  <subtitle>${escapeXml(`Official release history and platform updates for ${config.siteOrg}.`)}</subtitle>
  <link rel="alternate" href="${escapeXml(config.changelogUrl)}" />
  <link rel="self" href="${escapeXml(config.atomUrl)}" />
  <updated>${escapeXml(updated)}</updated>
${entries}
</feed>
`;
}

// ---------------------------------------------------------------------------
// releases.json (public machine-readable index)
// ---------------------------------------------------------------------------

function releaseForIndex(release) {
	const changes = {};
	for (const key of CATEGORY_KEYS) {
		const entries = (release.changes && release.changes[key]) || [];
		if (!entries.length) continue;
		changes[key] = entries.map((entry) => ({
			title: entry.title,
			description: entry.description,
			url: entry.url || undefined,
		}));
	}
	return {
		version: release.version,
		title: release.title,
		summary: release.summary,
		publishedAt: release.publishedAt,
		url: releaseAbsoluteUrl(release.version),
		categories: Object.keys(release.categories)
			.filter((key) => release.categories[key] > 0)
			.map((key) => CATEGORY_LABELS[key]),
		changes,
		commitRange: {
			from: release.commitRange ? release.commitRange.from : null,
			to: release.commitRange ? release.commitRange.to : null,
		},
		tag: release.tag || null,
	};
}

function renderReleasesJson(releases) {
	return `${JSON.stringify({
		name: `${config.siteName} Changelog`,
		description: `Official release history and platform updates for ${config.siteOrg}.`,
		url: config.changelogUrl,
		feed: config.feedUrl,
		atom: config.atomUrl,
		generatedAt: new Date().toISOString(),
		latestVersion: releases.length ? `v${releases[0].version}` : null,
		count: releases.length,
		schema: `${config.siteUrl}/changelog/releases.schema.json`,
		releases: releases.map(releaseForIndex),
	}, null, 2)}\n`;
}

/**
 * JSON Schema (draft 2020-12) for releases.json, served publicly so AI agents
 * and integrations can validate the index.
 */
function renderSchema() {
	const releaseProperties = {
		version: { type: 'string', pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+$' },
		title: { type: 'string', minLength: 1 },
		summary: { type: 'string', minLength: 1 },
		publishedAt: { type: 'string', format: 'date-time' },
		url: { type: 'string', format: 'uri' },
		categories: { type: 'array', items: { type: 'string' } },
		changes: {
			type: 'object',
			additionalProperties: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						title: { type: 'string' },
						description: { type: 'string' },
						url: { type: 'string', format: 'uri' },
					},
					required: ['title', 'description'],
				},
			},
		},
		commitRange: {
			type: 'object',
			properties: {
				from: { type: ['string', 'null'], pattern: '^[0-9a-f]{40}$' },
				to: { type: ['string', 'null'], pattern: '^[0-9a-f]{40}$' },
			},
		},
		tag: { type: ['string', 'null'] },
	};
	return `${JSON.stringify({
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		$id: `${config.siteUrl}/changelog/releases.schema.json`,
		title: `${config.siteName} Changelog releases.json`,
		type: 'object',
		properties: {
			name: { type: 'string' },
			description: { type: 'string' },
			url: { type: 'string', format: 'uri' },
			feed: { type: 'string', format: 'uri' },
			atom: { type: 'string', format: 'uri' },
			generatedAt: { type: 'string', format: 'date-time' },
			latestVersion: { type: ['string', 'null'], pattern: '^v[0-9]+\\.[0-9]+\\.[0-9]+$' },
			count: { type: 'integer', minimum: 0 },
			schema: { type: 'string', format: 'uri' },
			releases: {
				type: 'array',
				items: {
					type: 'object',
					properties: releaseProperties,
					required: ['version', 'title', 'summary', 'publishedAt', 'url', 'categories', 'changes', 'commitRange', 'tag'],
					additionalProperties: false,
				},
			},
		},
		required: ['name', 'description', 'url', 'feed', 'generatedAt', 'latestVersion', 'count', 'releases'],
	}, null, 2)}\n`;
}

module.exports = {
	escapeHtml,
	escapeXml,
	slugFor,
	releaseUrl,
	releaseAbsoluteUrl,
	formatDate,
	renderOverviewPage,
	renderReleasePage,
	renderRss,
	renderAtom,
	renderReleasesJson,
	renderSchema,
};
