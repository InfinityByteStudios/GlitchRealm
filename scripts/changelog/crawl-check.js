/**
 * Standalone crawler discovery check.
 *
 * Simulates a crawler with JavaScript disabled against the generated
 * changelog tree and the (already regenerated) sitemap.xml:
 *
 *   node scripts/changelog/crawl-check.js [--sitemap <file>]
 *
 * Exits non-zero if any published release is missing from the overview HTML,
 * the release pages, releases.json, the feeds or the sitemap.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const manifest = require('./lib/manifest');
const crawl = require('./lib/crawl');

function parseArgs(argv) {
	const args = { sitemap: null };
	for (let index = 2; index < argv.length; index += 1) {
		if (argv[index] === '--sitemap') args.sitemap = argv[++index];
	}
	return args;
}

const args = parseArgs(process.argv);
const sitemapFile = args.sitemap || path.join(config.repoRoot, 'sitemap.xml');
const sitemapXml = fs.existsSync(sitemapFile) ? fs.readFileSync(sitemapFile, 'utf8') : null;

const data = manifest.load();
const published = manifest.publishedReleases(data);
const result = crawl.run({ releases: published, sitemapXml });

if (!result.ok) {
	console.error(`[crawl-check] FAILED:\n- ${result.failures.join('\n- ')}`);
	process.exit(1);
}

console.log(`[crawl-check] OK — ${published.length} published release(s) fully discoverable without JavaScript.`);
if (published.length) {
	console.log(`[crawl-check] Latest: v${published[0].version}`);
}
process.exit(0);
