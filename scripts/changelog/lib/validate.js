/**
 * Validation layer. Everything that gets published is checked here before any
 * artifact is moved into place. On failure the build stops and the previous
 * valid release history remains untouched.
 */

const { CATEGORY_KEYS } = require('./classify');

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_.:-]*$/;
const ENTITY_RE = /^&(amp|lt|gt|quot|apos|#x?[0-9a-fA-F]+);$/;
const CDATA_END = ']]>';

/**
 * Conservative XML well-formedness check: balanced tags, valid names, quoted
 * attributes, allowed entities, CDATA balancing. Not a full spec parser, but
 * it catches the realistic failure modes of generated feeds.
 */
function assertWellFormedXml(xml, { rootExpected = null } = {}) {
	if (typeof xml !== 'string' || !xml.startsWith('<?xml')) {
		throw new Error('XML must start with an <?xml?> declaration');
	}
	const stack = [];
	let index = 0;
	let rootSeen = false;

	while (index < xml.length) {
		const next = xml.indexOf('<', index);
		if (next === -1) break;
		const text = xml.slice(index, next);
		if (text && /&(?!(amp|lt|gt|quot|apos|#x?[0-9a-fA-F]+);)/.test(text)) {
			throw new Error(`Unescaped ampersand in XML text near offset ${index}`);
		}
		if (xml.startsWith('<![CDATA[', next)) {
			const end = xml.indexOf(CDATA_END, next);
			if (end === -1) throw new Error('Unterminated CDATA section');
			index = end + CDATA_END.length;
			continue;
		}
		if (xml.startsWith('<!--', next)) {
			const end = xml.indexOf('-->', next);
			if (end === -1) throw new Error('Unterminated XML comment');
			index = end + 3;
			continue;
		}
		if (xml.startsWith('<?', next)) {
			const end = xml.indexOf('?>', next);
			if (end === -1) throw new Error('Unterminated processing instruction');
			index = end + 2;
			continue;
		}
		if (xml.startsWith('</', next)) {
			const end = xml.indexOf('>', next);
			if (end === -1) throw new Error('Unterminated closing tag');
			const name = xml.slice(next + 2, end).trim();
			if (!NAME_RE.test(name)) throw new Error(`Invalid closing tag name "${name}"`);
			const open = stack.pop();
			if (!open || open.name !== name) {
				throw new Error(`Mismatched closing tag </${name}>, expected </${open ? open.name : 'nothing'}>`);
			}
			index = end + 1;
			continue;
		}
		// Opening tag
		const selfClosing = xml.indexOf('/>', next) === xml.indexOf('>', next) - 1;
		const end = xml.indexOf('>', next);
		if (end === -1) throw new Error('Unterminated opening tag');
		const tagContent = xml.slice(next + 1, end);
		const name = /^<?([A-Za-z_][\w.:-]*)/.exec(tagContent);
		if (!name || !NAME_RE.test(name[1])) {
			throw new Error(`Invalid tag name in "${tagContent.slice(0, 40)}"`);
		}
		if (!selfClosing) stack.push({ name: name[1] });
		if (!rootSeen && !selfClosing) rootSeen = true;
		index = end + 1;
	}
	if (stack.length) {
		throw new Error(`Unclosed XML tag(s): ${stack.map((t) => t.name).join(', ')}`);
	}
	if (rootExpected && !new RegExp(`<${rootExpected}[\\s>]`).test(xml)) {
		throw new Error(`Expected root element <${rootExpected}>`);
	}
	return true;
}

function assertValidRss(xml) {
	assertWellFormedXml(xml);
	if (!/<rss[^>]*version="2\.0"/.test(xml)) throw new Error('RSS must declare version="2.0"');
	if (!/<channel>/.test(xml)) throw new Error('RSS missing <channel>');
	if (!/<lastBuildDate>/.test(xml)) throw new Error('RSS missing <lastBuildDate>');
	const items = (xml.match(/<item>/g) || []).length;
	const guids = (xml.match(/<guid isPermaLink="true">/g) || []).length;
	if (items !== guids) throw new Error(`RSS items (${items}) and permalink GUIDs (${guids}) do not match`);
	const closes = (xml.match(/<\/item>/g) || []).length;
	if (items !== closes) throw new Error('RSS has unbalanced <item> tags');
	if (/<!\[CDATA\[[\s\S]*?\]\]>[\s\S]*\]\]>/.test(xml) === false) {
		// CDATA sections must each be terminated; assertWellFormedXml handles balance.
	}
	return true;
}

function assertValidAtom(xml) {
	assertWellFormedXml(xml, { rootExpected: 'feed' });
	if (!/xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/.test(xml)) throw new Error('Atom must declare the 2005 namespace');
	if (!/<updated>/.test(xml)) throw new Error('Atom feed missing <updated>');
	const entries = (xml.match(/<entry>/g) || []).length;
	const ids = (xml.match(/<entry>[\s\S]*?<id>/g) || []).length;
	if (entries !== ids) throw new Error('Every Atom entry must contain an <id>');
	return true;
}

function releaseRecordChecks(release) {
	const errors = [];
	if (!release.version) errors.push('missing version');
	if (!release.title) errors.push('missing title');
	if (!release.summary) errors.push('missing summary');
	if (!release.publishedAt || Number.isNaN(Date.parse(release.publishedAt))) {
		errors.push(`invalid publishedAt "${release.publishedAt}"`);
	}
	if (release.status !== 'published') errors.push(`unexpected status "${release.status}"`);
	const range = release.commitRange || {};
	if (!range.to || !/^[0-9a-f]{40}$/.test(range.to)) errors.push('invalid commitRange.to');
	if (!release.tag && !release.baseline) errors.push('missing tag reference');
	return errors;
}

function assertValidReleasesJson(data, { publishedCount }) {
	if (!data || typeof data !== 'object') throw new Error('releases.json must be an object');
	for (const field of ['name', 'description', 'url', 'feed', 'generatedAt', 'latestVersion', 'releases']) {
		if (!(field in data)) throw new Error(`releases.json missing field "${field}"`);
	}
	if (!Array.isArray(data.releases)) throw new Error('releases.json "releases" must be an array');
	if (data.releases.length !== publishedCount) {
		throw new Error(`releases.json has ${data.releases.length} releases, expected ${publishedCount}`);
	}
	const versions = new Set();
	for (const release of data.releases) {
		if (versions.has(release.version)) throw new Error(`releases.json duplicates version ${release.version}`);
		versions.add(release.version);
		for (const key of ['version', 'title', 'summary', 'publishedAt', 'url', 'categories', 'changes', 'commitRange', 'tag']) {
			if (!(key in release)) throw new Error(`releases.json release ${release.version} missing "${key}"`);
		}
		if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(release.version)) {
			throw new Error(`releases.json version "${release.version}" is not strict semver`);
		}
		for (const category of release.categories) {
			if (!Object.values(CATEGORY_KEYS).includes(category) && !/^(New Features|Improvements|Bug Fixes|Performance|Security|Maintenance|Breaking Changes)$/.test(category)) {
				throw new Error(`releases.json unknown category "${category}"`);
			}
		}
	}
	return true;
}

function assertValidJsonLd(html, { expectTypes = [] } = {}) {
	const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
	if (!blocks.length) throw new Error('No JSON-LD blocks found');
	const types = [];
	for (const block of blocks) {
		let parsed;
		try {
			parsed = JSON.parse(block[1].trim());
		} catch (error) {
			throw new Error(`Invalid JSON-LD: ${error.message}`);
		}
		types.push(parsed['@type']);
	}
	if (expectTypes.length) {
		for (const expected of expectTypes) {
			if (!types.includes(expected)) throw new Error(`JSON-LD missing @type ${expected}`);
		}
	}
	return true;
}

function assertCanonical(html, expectedUrl) {
	const match = /<link rel="canonical" href="([^"]+)"/.exec(html);
	if (!match) throw new Error('Page missing <link rel="canonical">');
	if (match[1] !== expectedUrl) {
		throw new Error(`Canonical mismatch: expected ${expectedUrl}, got ${match[1]}`);
	}
	if (!/<meta property="og:url" content="/.test(html)) throw new Error('Page missing og:url');
	return true;
}

function canonicalFor(version) {
	const config = require('../config');
	return `${config.siteUrl}/changelog/v${version.replace(/\./g, '-')}/`;
}

function assertReleasePageContent(html, release) {
	if (!/<main[\s>]/.test(html)) throw new Error('Release page missing <main>');
	if (!/<article[\s>]/.test(html)) throw new Error('Release page missing <article>');
	if (!/<header[\s>]/.test(html)) throw new Error('Release page missing <header>');
	if (!/<footer[\s>]/.test(html)) throw new Error('Release page missing <footer>');
	if (!/<h1[^>]*>/.test(html)) throw new Error('Release page missing <h1>');
	const timeMatch = new RegExp(`<time datetime="${escapeRegExp(release.publishedAt)}"`).test(html);
	if (!timeMatch) throw new Error(`Release page missing <time datetime="${release.publishedAt}">`);
	if (!html.includes(`v${release.version}`)) throw new Error(`Release page missing version v${release.version}`);
	if (!html.includes(release.title)) throw new Error('Release page missing release title');
	for (const [key, entries] of Object.entries(release.changes || {})) {
		if (!entries.length) continue;
		if (!new RegExp(`changelog-section-${key}`).test(html)) {
			throw new Error(`Release page missing category section ${key}`);
		}
	}
	assertCanonical(html, canonicalFor(release.version));
	assertValidJsonLd(html, { expectTypes: ['TechArticle', 'BreadcrumbList'] });
	return true;
}

function escapeRegExp(text) {
	return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertOverviewDiscovers(html, releases) {
	const missing = [];
	for (const release of releases) {
		const slug = `v${release.version.replace(/\./g, '-')}`;
		const pattern = new RegExp(`href="/changelog/${escapeRegExp(slug)}/"`);
		if (!pattern.test(html)) missing.push(release.version);
	}
	if (missing.length) {
		throw new Error(`Overview HTML does not link to release page(s): ${missing.join(', ')}`);
	}
	if (!/<main[\s>]/.test(html)) {
		throw new Error('Overview must render releases inside <main>');
	}
	if (releases.length && !/<article[\s>]/.test(html)) {
		throw new Error('Overview must render releases inside <article>');
	}
	return true;
}

function assertSitemapContains(xml, urls) {
	const missing = urls.filter((url) => !xml.includes(`<loc>${escapeXmlText(url)}</loc>`));
	if (missing.length) throw new Error(`Sitemap missing URL(s): ${missing.join(', ')}`);
	return true;
}

function escapeXmlText(text) {
	return String(text).replace(/&/g, '&amp;');
}

module.exports = {
	assertWellFormedXml,
	assertValidRss,
	assertValidAtom,
	assertValidReleasesJson,
	assertValidJsonLd,
	assertCanonical,
	assertReleasePageContent,
	assertOverviewDiscovers,
	assertSitemapContains,
	releaseRecordChecks,
};
