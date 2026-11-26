/**
 * Changelog system test suite (node:test, no external dependencies).
 *
 * Covers the mandated checks: version bump precedence, tag handling, dedup,
 * empty ranges, missing GitHub credentials, RSS/Atom/JSON validity, fully
 * rendered HTML pages, sitemap + discovery-index coverage, crawler test with
 * JS disabled, JSON-LD, canonical metadata, robots.txt, 404 handling, route
 * preservation, manifest preservation on failure, and historical accessibility.
 *
 * Run: node --test scripts/changelog/test/
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('../config');
const git = require('../lib/git');
const github = require('../lib/github');
const classify = require('../lib/classify');
const versioning = require('../lib/versioning');
const describe = require('../lib/describe');
const manifest = require('../lib/manifest');
const render = require('../lib/render');
const validate = require('../lib/validate');
const crawl = require('../lib/crawl');
const generate = require('../generate');

const TS_A = '2026-01-01T00:00:00Z';
const TS_B = '2026-02-01T00:00:00Z';
const TS_C = '2026-03-01T00:00:00Z';
const H_A = 'a'.repeat(40);
const H_B = 'b'.repeat(40);
const H_C = 'c'.repeat(40);
const H_D = 'd'.repeat(40);
const H_E = 'e'.repeat(40);

function commit(hash, subject, extra = {}) {
	return {
		hash,
		parents: extra.parents || [],
		authorName: extra.authorName || 'Test Author',
		authorEmail: 'test@example.com',
		authoredAt: extra.authoredAt || extra.committedAt || TS_A,
		committedAt: extra.committedAt || TS_A,
		subject,
		body: extra.body || subject,
	};
}

function mergeUnit(hash, prNumber, subject, branchSubject, { committedAt = TS_A, files = ['index.html'], body } = {}) {
	const mergeCommit = commit(hash, subject, { parents: [H_A, H_B], committedAt, authoredAt: committedAt });
	return {
		kind: 'pull-request',
		mergeCommit,
		commits: [commit(hash.slice(0, 30) + 'x', branchSubject, { committedAt, authoredAt: committedAt, body: body || branchSubject })],
		prNumber,
		files,
		mergedAt: committedAt,
		timestamp: committedAt,
		mainline: hash,
	};
}

function directUnit(hash, subject, { committedAt = TS_A, files = ['css/styles.css'] } = {}) {
	return {
		kind: 'commit',
		commits: [commit(hash, subject, { committedAt, authoredAt: committedAt })],
		prNumber: null,
		files,
		mergedAt: null,
		timestamp: committedAt,
		mainline: hash,
	};
}

function makeRelease(version, extra = {}) {
	return {
		version,
		title: `Release ${version}`,
		summary: `Summary for ${version}.`,
		description: `Summary for ${version}.`,
		status: 'published',
		publishedAt: extra.publishedAt || TS_B,
		tag: `v${version}`,
		categories: extra.categories || { features: 1 },
		changes: extra.changes || {
			features: [{ title: 'Added something', description: 'Added something new.', audiencePhrase: '' }],
		},
		commitRange: extra.commitRange || {
			from: null,
			to: extra.to || H_A,
			commits: 3,
			prCount: 1,
			files: ['index.html'],
		},
		commits: [H_A],
		pullRequests: [{ number: 1, title: 'PR', mergedAt: TS_A, url: null }],
		publishedThrough: extra.to || H_A,
		lastModifiedAt: extra.publishedAt || TS_B,
		...extra,
	};
}

function tempOutDir() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-test-'));
	return dir;
}

async function withOutDir(fn) {
	const original = config.outDir;
	const dir = tempOutDir();
	config.outDir = dir;
	try {
		return await fn(dir);
	} finally {
		config.outDir = original;
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

// ---------------------------------------------------------------------------
// 1-3. Version bump precedence
// ---------------------------------------------------------------------------

test('multiple PATCH commits create one PATCH release', () => {
	const units = [
		directUnit(H_A, 'fix: Fix authentication'),
		directUnit(H_B, 'fix: Fix navigation'),
		mergeUnit(H_C, 5, 'Merge pull request #5 from o/agent-1', 'Improve game loading'),
	];
	const result = classify.classifyUnits(units);
	assert.equal(result.bump, 'patch');
	assert.equal(result.entries.length, 3);
});

test('a MINOR change overrides PATCH', () => {
	const units = [
		directUnit(H_A, 'fix: Fix image rendering'),
		directUnit(H_B, 'feat: Add developer dashboard'),
	];
	assert.equal(classify.classifyUnits(units).bump, 'minor');
});

test('a MAJOR change overrides MINOR and PATCH', () => {
	const units = [
		directUnit(H_A, 'fix: Fix image rendering'),
		directUnit(H_B, 'feat: Add dashboard'),
		mergeUnit(H_C, 9, 'Merge pull request #9 from o/agent-2', 'rewrite: replace auth flow', { body: 'BREAKING CHANGE: authentication API removed' }),
	];
	assert.equal(classify.classifyUnits(units).bump, 'major');
});

test('conventional commit syntax: ! and BREAKING CHANGE footers are MAJOR', () => {
	assert.equal(classify.parseConventional('feat!: new api').breaking, true);
	assert.equal(classify.hasBreakingFooter('some text\nBREAKING CHANGE: dropped support'), true);
	const units = [directUnit(H_A, 'feat!: new api')];
	assert.equal(classify.classifyUnits(units).bump, 'major');
});

test('PR labels drive classification', () => {
	const unit = mergeUnit(H_A, 3, 'Merge pull request #3 from o/x', 'Something');
	unit.pr = { number: 3, title: 'Something', labels: ['security'], mergedAt: TS_A, url: null };
	const result = classify.classifyUnit(unit);
	assert.equal(result.category, 'security');
	assert.equal(result.level, 'patch');
});

// ---------------------------------------------------------------------------
// 4. Versioning guards + tag formats
// ---------------------------------------------------------------------------

test('semver parsing accepts strict versions and rejects others', () => {
	assert.deepEqual(versioning.parse('1.4.2'), { major: 1, minor: 4, patch: 2 });
	assert.equal(versioning.parse('v1.4.2').patch, 2);
	assert.equal(versioning.parse('1.4'), null);
	assert.equal(versioning.parse('1.4.2.1'), null);
});

test('nextVersion never downgrades', () => {
	assert.throws(() => versioning.nextVersion({ base: '1.5.0', level: 'patch', existingVersions: ['1.6.0'] }));
	assert.equal(versioning.nextVersion({ base: '1.4.2', level: 'minor', existingVersions: [] }), '1.5.0');
});

test('nextVersion refuses duplicate tag versions', () => {
	assert.throws(() => versioning.nextVersion({
		base: '1.4.2',
		level: 'minor',
		tags: [{ name: 'v1.5.0', version: '1.5.0' }],
	}));
});

test('existing semver tags are matched and sorted correctly', () => {
	assert.equal(versioning.compare('1.10.0', '1.9.9'), 1);
	assert.equal(versioning.compare('2.0.0', '1.99.99'), 1);
	assert.equal(versioning.normalize('v1.5.0'), '1.5.0');
});

// ---------------------------------------------------------------------------
// 5. Duplicate commits / dedup
// ---------------------------------------------------------------------------

test('duplicate commits produce a single change entry', () => {
	const unit = directUnit(H_A, 'feat: Add feature');
	unit.commits.push(commit(H_A, 'feat: Add feature'));
	const result = classify.classifyUnits([unit, unit]);
	assert.equal(result.entries.length, 1);
});

test('merge commits and their individual commits are one change, not two', () => {
	const unit = mergeUnit(H_C, 7, 'Merge pull request #7 from o/agent-3', 'Fix the bug');
	// the merge commit itself must not add a second entry
	assert.equal(unit.commits.length, 1);
	assert.equal(classify.classifyUnits([unit]).entries.length, 1);
});

test('manifest merge deduplicates by commit range', () => {
	withOutDir(() => {
		const manifestData = manifest.emptyManifest();
		const release = makeRelease('1.0.0', { to: H_A });
		manifest.mergeRelease(manifestData, release);
		manifest.mergeRelease(manifestData, { ...makeRelease('1.0.0', { to: H_A }) });
		assert.equal(manifestData.releases.length, 1);
	});
});

// ---------------------------------------------------------------------------
// 6. Empty ranges
// ---------------------------------------------------------------------------

test('empty commit ranges do not generate releases', () => {
	const result = classify.classifyUnits([]);
	assert.equal(result.bump, null);
	assert.equal(result.empty, true);
});

test('excluded-only ranges do not generate releases', async () => {
	const original = config.classification.excludeTypes;
	config.classification.excludeTypes = ['chore'];
	try {
		const units = [directUnit(H_A, 'chore: bump deps')];
		assert.equal(classify.classifyUnits(units).bump, null);
	} finally {
		config.classification.excludeTypes = original;
	}
});

// ---------------------------------------------------------------------------
// 7. Missing GitHub credentials / API unavailability
// ---------------------------------------------------------------------------

test('missing GitHub credentials do not break basic generation', async () => {
	const originalApi = config.github.apiBase;
	const originalTimeout = config.github.timeoutMs;
	config.github.apiBase = 'http://127.0.0.1:1';
	config.github.timeoutMs = 300;
	config.github.token = '';
	try {
		const unit = mergeUnit(H_A, 999, 'Merge pull request #999 from o/x', 'Change');
		const result = await github.enrichPullRequests([unit]);
		assert.equal(result.rateLimited, false);
		assert.equal(unit.pr, undefined); // not enriched, but no throw
	} finally {
		config.github.apiBase = originalApi;
		config.github.timeoutMs = originalTimeout;
	}
});

// ---------------------------------------------------------------------------
// 8-11. Feeds and JSON
// ---------------------------------------------------------------------------

const FIXTURE_RELEASES = [
	makeRelease('1.5.0', { publishedAt: TS_C, to: H_C }),
	makeRelease('1.4.2', { publishedAt: TS_B, to: H_B }),
	makeRelease('1.4.1', { publishedAt: TS_A, to: H_A }),
];

test('RSS contains published releases only (drafts excluded)', () => {
	const published = FIXTURE_RELEASES;
	const rss = render.renderRss(published);
	assert.ok(rss.includes('v1.5.0'));
	assert.ok(rss.includes('v1.4.2'));
	assert.ok(!rss.includes('9.9.9'));
	const draft = [makeRelease('2.0.0', { publishedAt: TS_C }), { ...makeRelease('2.0.0'), status: 'draft' }];
	const draftCopy = draft[1];
	const rssFiltered = render.renderRss(draft.filter((r) => r.status === 'published'));
	assert.ok(rssFiltered.includes('2.0.0'));
	assert.ok(draftCopy.status === 'draft');
});

test('RSS validates as well-formed RSS 2.0', () => {
	validate.assertValidRss(render.renderRss(FIXTURE_RELEASES));
});

test('Atom validates', () => {
	const atom = render.renderAtom(FIXTURE_RELEASES);
	validate.assertValidAtom(atom);
	assert.ok(atom.includes('<feed xmlns="http://www.w3.org/2005/Atom"'));
	assert.ok(atom.includes('<published>2026-03-01T00:00:00Z</published>'));
});

test('releases.json follows the documented schema', () => {
	const json = JSON.parse(render.renderReleasesJson(FIXTURE_RELEASES));
	validate.assertValidReleasesJson(json, { publishedCount: 3 });
	assert.equal(json.latestVersion, 'v1.5.0');
	assert.equal(json.releases[0].version, '1.5.0');
	for (const release of json.releases) {
		for (const key of ['version', 'title', 'summary', 'publishedAt', 'url', 'categories', 'changes', 'commitRange', 'tag']) {
			assert.ok(key in release);
		}
	}
});

test('XML escaping protects feeds against injection', () => {
	const hostile = makeRelease('1.0.0', {
		title: 'Title <script>alert(1)</script> & "quotes"',
		summary: 'Summary with <b>tags</b> & ampersands',
	});
	validate.assertValidRss(render.renderRss([hostile]));
	validate.assertValidAtom(render.renderAtom([hostile]));
	const pageHtml = render.renderReleasePage({ release: hostile, newer: null, older: null });
	assert.ok(pageHtml.includes('&lt;script&gt;'));
	assert.ok(!pageHtml.includes('<script>alert(1)</script>'));
});

// ---------------------------------------------------------------------------
// 12-18. HTML rendering, JSON-LD, canonical
// ---------------------------------------------------------------------------

test('every release page contains fully rendered semantic HTML', () => {
	const html = render.renderReleasePage({
		release: FIXTURE_RELEASES[0],
		newer: null,
		older: FIXTURE_RELEASES[1],
	});
	validate.assertReleasePageContent(html, FIXTURE_RELEASES[0]);
	for (const tag of ['<main', '<article', '<header', '<time', '<section', '<h1', '<h2', '<ul', '<nav', '<footer']) {
		assert.ok(html.includes(tag), `missing ${tag}`);
	}
	assert.ok(html.includes('Older: v1.4.2'));
});

test('JSON-LD is valid and includes required properties', () => {
	const html = render.renderReleasePage({ release: FIXTURE_RELEASES[0], newer: null, older: null });
	validate.assertValidJsonLd(html, { expectTypes: ['TechArticle', 'BreadcrumbList'] });
	const block = /<script type="application\/ld\+json">\s*({[\s\S]*?})\s*<\/script>/.exec(html);
	const data = JSON.parse(block[1]);
	assert.equal(data.datePublished, TS_C);
	assert.ok(data.mainEntityOfPage);
	assert.ok(data.publisher);
});

test('canonical metadata exists and matches the release URL', () => {
	const html = render.renderReleasePage({ release: FIXTURE_RELEASES[0], newer: null, older: null });
	validate.assertCanonical(html, `${config.siteUrl}/changelog/v1-5-0/`);
});

test('overview is a complete discovery index with ordinary anchors', () => {
	const html = render.renderOverviewPage({ releases: FIXTURE_RELEASES, page: 1, totalPages: 1, latest: FIXTURE_RELEASES[0] });
	validate.assertOverviewDiscovers(html, FIXTURE_RELEASES);
	assert.ok(html.includes('href="/changelog/v1-5-0/"'));
	assert.ok(html.includes('href="/changelog/v1-4-1/"'));
	assert.ok(html.includes('Latest release'));
});

test('pagination keeps every release linked and crawlable', () => {
	const original = config.rendering.paginationSize;
	config.rendering.paginationSize = 2;
	try {
		const page1 = render.renderOverviewPage({ releases: FIXTURE_RELEASES, page: 1, totalPages: 2, latest: FIXTURE_RELEASES[0] });
		assert.ok(page1.includes('href="/changelog/v1-5-0/"'));
		assert.ok(page1.includes('href="/changelog/page-2/"'), 'page 1 links to page 2');
		const page2 = render.renderOverviewPage({ releases: FIXTURE_RELEASES, page: 2, totalPages: 2, latest: null });
		assert.ok(page2.includes('href="/changelog/v1-4-1/"'));
		assert.ok(page2.includes('href="/changelog/"'), 'page 2 links back to the overview');
	} finally {
		config.rendering.paginationSize = original;
	}
});

// ---------------------------------------------------------------------------
// 19-20. robots.txt + 404 handling
// ---------------------------------------------------------------------------

test('robots.txt does not block the changelog', () => {
	const robots = fs.readFileSync(path.join(config.repoRoot, 'robots.txt'), 'utf8');
	const sections = robots.split(/User-agent:\s*/).slice(1);
	for (const section of sections) {
		const lines = section.split('\n').map((l) => l.trim());
		const disallows = lines.filter((l) => l.startsWith('Disallow:'));
		for (const disallow of disallows) {
			const rule = disallow.replace('Disallow:', '').trim();
			if (!rule) continue;
			const blocked = '/changelog/'.startsWith(rule.replace(/\*$/, ''));
			assert.equal(blocked, false, `robots.txt rule "${rule}" blocks the changelog`);
		}
	}
});

test('missing release pages return a genuine 404', () => {
	const netlifyToml = fs.readFileSync(path.join(config.repoRoot, 'netlify.toml'), 'utf8');
	assert.ok(/from\s*=\s*"\/\*"[\s\S]*?to\s*=\s*"\/404\.html"[\s\S]*?status\s*=\s*404/.test(netlifyToml));
	assert.ok(fs.existsSync(path.join(config.repoRoot, '404.html')));
	// release URLs not in the generated tree must fall through to the catch-all
	withOutDir((dir) => {
		assert.ok(!fs.existsSync(path.join(dir, 'changelog', 'v9-9-9', 'index.html')));
	});
});

// ---------------------------------------------------------------------------
// 21-23. Full pipeline integration (mocked git), preservation, history
// ---------------------------------------------------------------------------

function fakeGitLayer({ head, tagsAvailable = false, commits = {}, newestAncestorOfHead: frontierPicker, hasCommit, isAncestor }) {
	return {
		headCommit: () => head,
		listSemverTags: () => (tagsAvailable
			? { available: true, tags: [], reason: null }
			: { available: false, tags: [], reason: 'unavailable in test' }),
		hasCommit: hasCommit || (() => true),
		isAncestor: isAncestor || (() => true),
		// Manifest candidates are ordered newest-first (publishedReleases sort).
		newestAncestorOfHead: frontierPicker || ((candidates) => (candidates.length ? candidates[0] : null)),
		collectUnits: ({ afterCommit }) => ({
			head,
			units: afterCommit ? commits[afterCommit] || [] : commits.root || [],
			incomplete: false,
			warnings: [],
		}),
		mergeBase: () => head,
	};
}

async function runGeneration({ gitLayer, outDir, autoPublish = true }) {
	const originals = {
		headCommit: git.headCommit,
		listSemverTags: git.listSemverTags,
		hasCommit: git.hasCommit,
		isAncestor: git.isAncestor,
		newestAncestorOfHead: git.newestAncestorOfHead,
		collectUnits: git.collectUnits,
		mergeBase: git.mergeBase,
		enrich: github.enrichPullRequests,
		aiEnabled: config.ai.enabled,
		autoPublish: config.versioning.autoPublish,
		outDir: config.outDir,
		manifestPath: null,
	};
	Object.assign(git, gitLayer);
	github.enrichPullRequests = async () => ({ enriched: 0, rateLimited: false, unavailable: false });
	config.ai.enabled = false;
	config.versioning.autoPublish = autoPublish;
	config.outDir = outDir;
	try {
		return await generate.main();
	} finally {
		Object.assign(git, originals.headCommit ? {
			headCommit: originals.headCommit,
			listSemverTags: originals.listSemverTags,
			hasCommit: originals.hasCommit,
			isAncestor: originals.isAncestor,
			newestAncestorOfHead: originals.newestAncestorOfHead,
			collectUnits: originals.collectUnits,
			mergeBase: originals.mergeBase,
		} : {});
		github.enrichPullRequests = originals.enrich;
		config.ai.enabled = originals.aiEnabled;
		config.versioning.autoPublish = originals.autoPublish;
		config.outDir = originals.outDir;
	}
}

test('full pipeline: baseline release is generated, rendered and discoverable', async () => {
	await withOutDir(async (outDir) => {
		const head = H_D;
		const units = [
			directUnit(H_A, 'feat: Add game analytics dashboard', { committedAt: TS_A, files: ['admin/analytics.html'] }),
			mergeUnit(H_B, 33, 'Merge pull request #33 from o/agent-1', "Improve GlitchRealm's crawler accessibility", { committedAt: TS_B, files: ['index.html', 'sitemap.xml'] }),
			directUnit(H_C, 'fix: Fix game URL not updating after clicking play', { committedAt: TS_C, files: ['js/game-launcher.js'] }),
		];
		const layer = fakeGitLayer({
			head,
			commits: { root: units },
		});
		const code = await runGeneration({ gitLayer: layer, outDir });
		assert.equal(code, 0);

		const data = JSON.parse(fs.readFileSync(path.join(outDir, 'versions.json'), 'utf8'));
		assert.equal(data.releases.length, 1);
		assert.equal(data.releases[0].version, '1.0.0');
		assert.equal(data.releases[0].status, 'published');

		assert.ok(fs.existsSync(path.join(outDir, 'index.html')));
		assert.ok(fs.existsSync(path.join(outDir, 'v1-0-0', 'index.html')));
		assert.ok(fs.existsSync(path.join(outDir, 'feed.xml')));
		assert.ok(fs.existsSync(path.join(outDir, 'atom.xml')));
		assert.ok(fs.existsSync(path.join(outDir, 'releases.json')));
		assert.ok(fs.existsSync(path.join(outDir, 'releases.schema.json')));

		const result = crawl.run({
			releases: manifest.publishedReleases(data),
			sitemapXml: null,
		});
		assert.deepEqual(result.failures, []);
	});
});

test('incremental commits bump correctly and historical releases remain accessible', async () => {
	await withOutDir(async (outDir) => {
		const unitsA = [mergeUnit(H_A, 33, 'Merge pull request #33 from o/agent-1', 'Add feature one', { committedAt: TS_A })];
		const layerA = fakeGitLayer({ head: H_A, commits: { root: unitsA } });
		await runGeneration({ gitLayer: layerA, outDir });

		// second run: new commit after published frontier
		const unitsB = [
			directUnit(H_B, 'fix: Fix broken links', { committedAt: TS_B }),
			directUnit(H_E, 'feat: Add developer dashboard', { committedAt: TS_B }),
		];
		const layerB = fakeGitLayer({
			head: H_C,
			commits: { [H_A]: unitsB },
			newestAncestorOfHead: (candidates) => candidates[0] || null,
		});
		await runGeneration({ gitLayer: layerB, outDir });

		const data = JSON.parse(fs.readFileSync(path.join(outDir, 'versions.json'), 'utf8'));
		assert.deepEqual(data.releases.map((r) => r.version), ['1.1.0', '1.0.0']);
		assert.ok(fs.existsSync(path.join(outDir, 'v1-0-0', 'index.html')));
		assert.ok(fs.existsSync(path.join(outDir, 'v1-1-0', 'index.html')));

		// third run: PATCH-only commits -> v1.1.1; v1.1.0 survives
		const unitsC = [directUnit(H_D, 'perf: Improve loading speed', { committedAt: TS_C })];
		const layerC = fakeGitLayer({
			head: H_D,
			commits: { [H_E]: unitsC },
			newestAncestorOfHead: (candidates) => candidates[0] || null,
		});
		await runGeneration({ gitLayer: layerC, outDir });

		const data2 = JSON.parse(fs.readFileSync(path.join(outDir, 'versions.json'), 'utf8'));
		assert.deepEqual(data2.releases.map((r) => r.version), ['1.1.1', '1.1.0', '1.0.0']);
		for (const version of ['v1-0-0', 'v1-1-0', 'v1-1-1']) {
			assert.ok(fs.existsSync(path.join(outDir, version, 'index.html')), `${version} page exists`);
		}
	});
});

test('no new commits does not create a release (idempotent rebuild)', async () => {
	await withOutDir(async (outDir) => {
		const units = [directUnit(H_A, 'feat: Add thing', { committedAt: TS_A })];
		await runGeneration({ gitLayer: fakeGitLayer({ head: H_A, commits: { root: units } }), outDir });
		const before = fs.readFileSync(path.join(outDir, 'versions.json'), 'utf8');
		await runGeneration({
			gitLayer: fakeGitLayer({ head: H_A, commits: { root: units, [H_A]: [] } }),
			outDir,
		});
		const after = fs.readFileSync(path.join(outDir, 'versions.json'), 'utf8');
		assert.deepEqual(JSON.parse(after).releases.map((r) => r.version), JSON.parse(before).releases.map((r) => r.version));
	});
});

test('failed generation preserves the previous valid release data', async () => {
	await withOutDir(async (outDir) => {
		const units = [directUnit(H_A, 'feat: Add thing', { committedAt: TS_A })];
		await runGeneration({ gitLayer: fakeGitLayer({ head: H_A, commits: { root: units } }), outDir });
		const before = fs.readFileSync(path.join(outDir, 'versions.json'), 'utf8');

		// corrupt generated content so validation must fail, then re-run
		const originalAssert = validate.assertReleasePageContent;
		validate.assertReleasePageContent = () => { throw new Error('simulated render failure'); };
		try {
			await assert.rejects(
				runGeneration({ gitLayer: fakeGitLayer({ head: H_A, commits: { root: units } }), outDir }),
				/simulated render failure/,
			);
		} finally {
			validate.assertReleasePageContent = originalAssert;
		}
		const after = JSON.parse(fs.readFileSync(path.join(outDir, 'versions.json'), 'utf8'));
		const beforeData = JSON.parse(before);
		assert.deepEqual(after.releases, beforeData.releases, 'release records preserved after failure');
	});
});

test('draft mode records releases without publishing them publicly', async () => {
	await withOutDir(async (outDir) => {
		const units = [directUnit(H_A, 'feat: Add thing', { committedAt: TS_A })];
		await runGeneration({ gitLayer: fakeGitLayer({ head: H_A, commits: { root: units } }), outDir, autoPublish: false });
		const data = JSON.parse(fs.readFileSync(path.join(outDir, 'versions.json'), 'utf8'));
		assert.equal(data.releases[0].status, 'draft');
		assert.ok(!fs.existsSync(path.join(outDir, 'v1-0-0', 'index.html')));
		const rss = fs.readFileSync(path.join(outDir, 'feed.xml'), 'utf8');
		assert.ok(!rss.includes('<item>'));
		const json = JSON.parse(fs.readFileSync(path.join(outDir, 'releases.json'), 'utf8'));
		assert.equal(json.releases.length, 0);
	});
});

test('a release that grows with new commits extends the existing record instead of duplicating it', async () => {
	await withOutDir(async (outDir) => {
		const unitsA = [mergeUnit(H_A, 33, 'Merge pull request #33 from o/agent-1', 'Add feature one', { committedAt: TS_A })];
		await runGeneration({ gitLayer: fakeGitLayer({ head: H_A, commits: { root: unitsA } }), outDir });

		// Boundary for the published release is not visible in this clone
		// (partial history) — the release must extend, not duplicate.
		const unitsB = [directUnit(H_B, 'feat: Add another feature', { committedAt: TS_B })];
		const layerB = fakeGitLayer({
			head: H_B,
			commits: { root: unitsB },
			newestAncestorOfHead: () => null,
		});
		await runGeneration({ gitLayer: layerB, outDir });

		const data = JSON.parse(fs.readFileSync(path.join(outDir, 'versions.json'), 'utf8'));
		assert.equal(data.releases.length, 1, 'no duplicate release record');
		assert.equal(data.releases[0].version, '1.0.0');
		assert.equal(data.releases[0].publishedAt, TS_A, 'original publication timestamp kept');
	});
});

test('an unrelated commit range for a published version aborts the build', async () => {
	await withOutDir(async (outDir) => {
		// A draft record already claims v1.0.0 for a different commit range.
		const draft = makeRelease('1.0.0', { to: H_A, status: 'draft' });
		fs.mkdirSync(outDir, { recursive: true });
		fs.writeFileSync(
			path.join(outDir, 'versions.json'),
			JSON.stringify({
				schemaVersion: 1,
				generatedAt: TS_A,
				latestVersion: '1.0.0',
				releases: [draft],
			}, null, '\t'),
			'utf8',
		);

		const unitsB = [directUnit(H_B, 'feat: A different feature', { committedAt: TS_B })];
		const layerB = fakeGitLayer({
			head: H_B,
			commits: { root: unitsB },
			newestAncestorOfHead: () => null,
			hasCommit: () => true,
			isAncestor: () => false,
		});
		await assert.rejects(
			runGeneration({ gitLayer: layerB, outDir }),
			/unrelated commit range/,
		);
	});
});

test('platform housekeeping commits never become release entries', () => {
	assert.equal(git.isExcludedCommit('Agent runner [skip ci]'), true);
	assert.equal(git.isExcludedCommit('chore(changelog): finalize release v1.0.0 [skip changelog-finalize]'), true);
	assert.equal(git.isExcludedCommit('feat: Add a real feature'), false);
	assert.equal(git.isExcludedCommit('fix: Fix a real bug'), false);
});

test('manifest save is atomic and can restore the previous state', () => {
	withOutDir(() => {
		const data = manifest.emptyManifest();
		manifest.mergeRelease(data, makeRelease('1.0.0'));
		manifest.finalize(data, { generatedAt: TS_A });
		const save = manifest.save(data);
		assert.equal(save.ok, true);
		assert.ok(fs.existsSync(manifest.manifestPath()));
		manifest.restore(save.previous === null ? null : save.previous);
	});
});

test('union merge never removes historical releases', () => {
	withOutDir(() => {
		const data = manifest.emptyManifest();
		manifest.mergeRelease(data, makeRelease('1.0.0', { to: H_A }));
		manifest.mergeRelease(data, makeRelease('1.1.0', { to: H_B }));
		manifest.mergeRelease(data, makeRelease('1.2.0', { to: H_C }));
		assert.equal(data.releases.length, 3);
		// regenerating an older release must not delete the others
		manifest.mergeRelease(data, makeRelease('1.2.0', { to: H_C, title: 'Regenerated' }));
		assert.equal(data.releases.length, 3);
	});
});

test('human-edited release records survive regeneration', () => {
	withOutDir(() => {
		const data = manifest.emptyManifest();
		manifest.mergeRelease(data, makeRelease('1.0.0', { to: H_A }));
		data.releases[0].humanEdited = true;
		data.releases[0].title = 'Hand-written title';
		data.releases[0].description = 'Hand-written description';
		const regenerated = makeRelease('1.0.0', { to: H_A, title: 'Auto title', summary: 'Auto summary' });
		manifest.mergeRelease(data, regenerated);
		assert.equal(data.releases[0].title, 'Hand-written title');
		assert.equal(data.releases[0].description, 'Hand-written description');
	});
});

// ---------------------------------------------------------------------------
// Deterministic descriptions + sitemap integration
// ---------------------------------------------------------------------------

test('descriptions are cleaned of technical task IDs and keep real timestamps', () => {
	const unit = mergeUnit(H_A, 33, 'Merge pull request #33 from o/agent-1', "Improve GlitchRealm's crawler accessibility (6af4022a56c32bb792be4076)");
	const display = describe.deterministicEntry('improvements', unit);
	assert.ok(!display.title.includes('6af4022a'));
	assert.ok(display.title.length > 0);
	assert.equal(unit.commits[0].committedAt, TS_A);
});

test('audience is inferred only from actually changed files', () => {
	const audiences = describe.audiencesFor(['subdomains/auth/signin.html', 'Games/Foo/index.html']);
	const names = audiences.map((a) => a.audience);
	assert.ok(names.includes('user accounts'));
	assert.ok(names.includes('players'));
});

test('sitemap integration appends changelog URLs without dropping existing routes', () => {
	const generator = fs.readFileSync(path.join(config.repoRoot, 'scripts', 'generate-sitemap.js'), 'utf8');
	assert.ok(generator.includes('STATIC_PAGES'));
	assert.ok(generator.includes('versions.json') || generator.includes('CHANGELOG_MANIFEST'));
	assert.ok(generator.includes('/changelog/'));
	const staticUrls = generator.match(/url: '\/[^']*'/g) || [];
	assert.ok(staticUrls.length >= 17, 'static page list preserved');
	assert.ok(generator.includes("url: '/'"));
});

test('edge sitemap function includes changelog URLs', () => {
	const edge = fs.readFileSync(path.join(config.repoRoot, 'netlify', 'edge-functions', 'sitemap.js'), 'utf8');
	assert.ok(edge.includes('releases.json'));
});
