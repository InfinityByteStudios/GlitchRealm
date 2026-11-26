/**
 * Crawler discovery test — simulates a search/AI crawler with JavaScript
 * disabled, entirely against the generated static tree:
 *
 *   1. Request /changelog/ (and every pagination page linked from it).
 *   2. Extract every release link from the returned HTML.
 *   3. Visit each release page and extract its full release data.
 *   4. Cross-check against releases.json and the XML sitemap.
 *
 * Any missing release fails the build.
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

function readFileSafe(...segments) {
	const file = path.join(...segments);
	return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function collectOverviewPages(outDir) {
	const pages = [];
	const index = readFileSafe(outDir, 'index.html');
	if (index) pages.push({ file: path.join(outDir, 'index.html'), html: index });
	if (fs.existsSync(outDir)) {
		for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
			if (entry.isDirectory() && /^page-\d+$/.test(entry.name)) {
				const pageHtml = readFileSafe(outDir, entry.name, 'index.html');
				if (pageHtml) pages.push({ file: path.join(outDir, entry.name, 'index.html'), html: pageHtml });
			}
		}
	}
	return pages;
}

function extractReleaseLinks(html) {
	const links = new Set();
	for (const match of html.matchAll(/href="\/changelog\/(v\d+-\d+-\d+)\/"/g)) {
		links.add(match[1]);
	}
	return [...links];
}

function extractReleaseData(html, slug) {
	const data = { slug };
	const version = slug.replace(/-/g, '.').replace(/^v/, '');
	data.version = version;
	const time = /<time datetime="([^"]+)"[^>]*itemprop="datePublished"/.exec(html)
		|| /itemprop="datePublished"[^>]*datetime="([^"]+)"/.exec(html)
		|| /<time datetime="([^"]+)"/.exec(html);
	data.publishedAt = time ? time[1] : null;
	const title = /<h1[^>]*>([^<]+)<\/h1>/.exec(html);
	data.title = title ? title[1].trim() : null;
	data.sections = [...html.matchAll(/class="changelog-section changelog-section-([a-z]+)"/g)].map((m) => m[1]);
	data.hasCanonical = /<link rel="canonical" href="[^"]*\/changelog\/v\d+-\d+-\d+\/"/.test(html);
	data.hasSummary = /class="changelog-summary"/.test(html);
	data.hasEntry = /class="changelog-entry-title"/.test(html) || /class="changelog-note"/.test(html);
	data.hasNav = /class="changelog-nav"/.test(html);
	return data;
}

function run({ releases, sitemapXml } = {}) {
	const failures = [];
	const outDir = config.outDir;
	const slugOf = (version) => `v${version.replace(/\./g, '-')}`;

	const pages = collectOverviewPages(outDir);
	if (!pages.length) {
		failures.push('No overview page found at /changelog/index.html');
	}

	const linkedSlugs = new Set();
	for (const page of pages) {
		for (const slug of extractReleaseLinks(page.html)) linkedSlugs.add(slug);
	}

	const published = releases || [];
	for (const release of published) {
		const slug = slugOf(release.version);
		if (!linkedSlugs.has(slug)) {
			failures.push(`Overview does not link to release ${slug} (crawler could not discover it)`);
		}
		const pageHtml = readFileSafe(outDir, slug, 'index.html');
		if (!pageHtml) {
			failures.push(`Release page missing: /changelog/${slug}/`);
			continue;
		}
		const data = extractReleaseData(pageHtml, slug);
		if (data.version !== release.version) failures.push(`${slug}: extracted version ${data.version} != ${release.version}`);
		if (!data.publishedAt) failures.push(`${slug}: no <time datetime> publication date in initial HTML`);
		if (!data.title) failures.push(`${slug}: no <h1> title in initial HTML`);
		if (!data.hasCanonical) failures.push(`${slug}: missing canonical link`);
		if (!data.hasSummary) failures.push(`${slug}: missing summary in initial HTML`);
		if (!data.hasEntry) failures.push(`${slug}: no rendered change entries in initial HTML`);
		if (!data.hasNav) failures.push(`${slug}: missing previous/next release navigation`);
		for (const [key, entries] of Object.entries(release.changes || {})) {
			if (!entries.length) continue;
			if (!data.sections.includes(key)) failures.push(`${slug}: category ${key} not rendered`);
		}
	}

	if (published.length) {
		const releasesJson = readFileSafe(outDir, 'releases.json');
		if (!releasesJson) {
			failures.push('releases.json missing');
		} else {
			try {
				const data = JSON.parse(releasesJson);
				for (const release of published) {
					if (!data.releases.some((r) => r.version === release.version)) {
						failures.push(`releases.json missing release ${release.version}`);
					}
				}
				if (data.releases.length !== published.length) {
					failures.push(`releases.json has ${data.releases.length} releases but manifest has ${published.length} published`);
				}
			} catch (error) {
				failures.push(`releases.json is not valid JSON: ${error.message}`);
			}
		}

		const feed = readFileSafe(outDir, 'feed.xml');
		const atom = readFileSafe(outDir, 'atom.xml');
		if (!feed) failures.push('feed.xml missing');
		if (!atom) failures.push('atom.xml missing');
		if (feed) {
			for (const release of published) {
				if (!feed.includes(`/changelog/${slugOf(release.version)}/`)) {
					failures.push(`RSS feed missing release ${release.version}`);
				}
			}
		}
		if (atom) {
			for (const release of published) {
				if (!atom.includes(`/changelog/${slugOf(release.version)}/`)) {
					failures.push(`Atom feed missing release ${release.version}`);
				}
			}
		}

		if (sitemapXml) {
			for (const release of published) {
				const url = `${config.siteUrl}/changelog/${slugOf(release.version)}/`;
				if (!sitemapXml.includes(url)) failures.push(`Sitemap missing ${url}`);
			}
			if (!sitemapXml.includes(`${config.siteUrl}/changelog/`)) {
				failures.push('Sitemap missing /changelog/ overview');
			}
		}
	}

	return { ok: failures.length === 0, failures, checkedSlugs: [...linkedSlugs] };
}

module.exports = { run, extractReleaseLinks, extractReleaseData };
