/**
 * Changelog generation orchestrator.
 *
 * Pipeline: extract from git → enrich with GitHub (optional) → classify →
 * calculate next semver → build one grouped release → describe (AI optional) →
 * merge into the committed manifest → render static artifacts → validate →
 * move into place → crawl-discovery test.
 *
 * Any validation failure aborts before publication and preserves the previous
 * valid release history. Generated artifacts only replace the live files after
 * every check passes.
 *
 * Usage:
 *   node scripts/changelog/generate.js [--dry-run] [--out <dir>] [--report <file>]
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const git = require('./lib/git');
const github = require('./lib/github');
const classify = require('./lib/classify');
const versioning = require('./lib/versioning');
const describe = require('./lib/describe');
const manifest = require('./lib/manifest');
const render = require('./lib/render');
const validate = require('./lib/validate');
const crawl = require('./lib/crawl');

function log(message) {
	console.log(`[changelog] ${message}`);
}

function warn(message) {
	console.warn(`[changelog] WARNING: ${message}`);
}

function parseArgs(argv) {
	const args = { dryRun: false, out: null, report: null };
	for (let index = 2; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--dry-run') args.dryRun = true;
		else if (arg === '--out') args.out = argv[++index];
		else if (arg === '--report') args.report = argv[++index];
	}
	return args;
}

function buildCommitRange({ units, fromCommit, head }) {
	const last = units.length ? units[units.length - 1].mainline || units[units.length - 1].commits[0].hash : null;
	const files = [...new Set(units.flatMap((unit) => unit.files))];
	return {
		from: fromCommit || null,
		to: last || head,
		commits: units.reduce((sum, unit) => sum + unit.commits.length, 0),
		prCount: units.filter((unit) => unit.kind === 'pull-request').length,
		files,
	};
}

function buildChangeEntries(displayEntries, { cap, total }) {
	const changes = {};
	for (const key of classify.CATEGORY_KEYS) changes[key] = [];
	const limit = cap || config.rendering.maxEntriesPerRelease;
	for (const { unit, classification } of displayEntries.slice(0, limit)) {
		const display = describe.deterministicEntry(classification.category, unit);
		const url = unit.pr && unit.pr.url ? unit.pr.url : null;
		changes[classification.category].push({
			title: display.title,
			description: display.description,
			audiencePhrase: display.audiencePhrase,
			url,
			author: unit.pr && unit.pr.author ? unit.pr.author : unit.commits[0].authorName,
			committedAt: unit.commits[0].committedAt,
			kind: unit.kind,
		});
	}
	const totalCount = total !== undefined ? total : displayEntries.length;
	const shown = Math.min(totalCount, limit);
	return { changes, truncated: Math.max(0, totalCount - shown), shown, totalUnits: totalCount };
}

async function createRelease({ units, base, level, tags, isBaseline, fromCommit, head, ghResult }) {
	const classified = classify.classifyUnits(units);
	if (!classified.bump) return null;
	const effectiveLevel = level || classified.bump;
	// Baseline (no published version yet): use the configured initial version,
	// never a guess. Incremental: bump the highest known version.
	const version = base
		? versioning.nextVersion({ base, level: effectiveLevel, tags })
		: versioning.normalize(config.versioning.initialVersion);
	if (!version) {
		throw new Error(base
			? `Cannot compute next version from base "${base}" with level "${effectiveLevel}"`
			: `CHANGELOG_INITIAL_VERSION "${config.versioning.initialVersion}" is not a valid MAJOR.MINOR.PATCH version`);
	}

	const categoryCounts = classify.categoriesFor(classified.entries);
	const categoryLabel = Object.entries(categoryCounts)
		.map(([key, count]) => `${count} ${classify.CATEGORY_LABELS[key]}`)
		.join(', ');

	const range = buildCommitRange({ units, fromCommit, head });
	const isVeryFirst = !base;
	// Display order: newest change first. The AI (and the cache) covers the
	// entries that are actually rendered, not the oldest slice.
	const displayCap = isVeryFirst ? config.rendering.baselineMaxEntries : config.rendering.maxEntriesPerRelease;
	const displayEntries = classified.entries.slice().reverse().slice(0, displayCap);
	const copy = await describe.describeRelease({
		categoryLabel,
		entries: displayEntries,
		isBaseline: isVeryFirst,
		categoryCounts,
	});

	const { changes, truncated } = buildChangeEntries(displayEntries, { cap: displayCap, total: classified.entries.length });

	// publishedAt = committer timestamp of the newest change in the release.
	// It is a real git timestamp (never the build time) and therefore stable
	// across idempotent rebuilds; generatedAt records the build time.
	const newestCommitTs = units.reduce((newest, unit) => {
		const ts = unit.commits[0].committedAt;
		return ts && (!newest || ts > newest) ? ts : newest;
	}, null);
	const publishedAt = newestCommitTs || new Date().toISOString();

	const pullRequests = units
		.filter((unit) => unit.kind === 'pull-request')
		.map((unit) => ({
			number: unit.prNumber,
			title: (unit.pr && unit.pr.title) || unit.mergeCommit.subject,
			mergedAt: unit.mergedAt,
			url: (unit.pr && unit.pr.url) || null,
		}));

	const commitList = units.flatMap((unit) => unit.commits.map((commit) => commit.hash));

	return {
		version,
		title: copy.title,
		summary: copy.summary,
		description: copy.summary,
		status: config.versioning.autoPublish ? 'published' : 'draft',
		publishedAt,
		tag: `v${version}`,
		baseline: isVeryFirst || undefined,
		isBaseline: isVeryFirst || undefined,
		categories: categoryCounts,
		changes,
		changesTruncated: truncated || undefined,
		changesShown: changes && Object.values(changes).reduce((sum, list) => sum + list.length, 0),
		commitRange: range,
		commits: commitList.slice(0, 200),
		pullRequests,
		publishedThrough: range.to,
		lastModifiedAt: publishedAt,
		generatedAt: new Date().toISOString(),
		aiGenerated: copy.aiUsed || undefined,
		githubEnriched: ghResult && ghResult.enriched > 0 ? ghResult.enriched : undefined,
	};
}

function pruneStaleReleaseDirs({ published, changelogDir }) {
	if (!fs.existsSync(changelogDir)) return [];
	const removed = [];
	const keep = new Set(published.map((release) => render.slugFor(release.version)));
	for (const entry of fs.readdirSync(changelogDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		if (!/^v\d+-\d+-\d+$/.test(entry.name)) continue;
		if (!keep.has(entry.name)) {
			fs.rmSync(path.join(changelogDir, entry.name), { recursive: true, force: true });
			removed.push(entry.name);
		}
	}
	return removed;
}

function writeIfChanged(file, content) {
	if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
	fs.writeFileSync(file, content, 'utf8');
	return true;
}

async function main() {
	const args = parseArgs(process.argv);
	// changelogDir is where all generated artifacts live (config.outDir by
	// default); siteRoot is only used to locate the repo-level sitemap.xml.
	const changelogDir = args.out ? path.join(path.resolve(args.out), 'changelog') : config.outDir;
	const siteRoot = args.out ? path.resolve(args.out) : config.repoRoot;
	const dryRun = args.dryRun;
	const report = {
		mode: null,
		head: null,
		incompleteHistory: false,
		tagsAvailable: null,
		newRelease: null,
		publishedCount: 0,
		warnings: [],
		aiUsed: false,
		artifacts: [],
		crawl: null,
	};

	if (!fs.existsSync(path.join(config.repoRoot, '.git'))) {
		log('Not a git repository; nothing to generate.');
		return 0;
	}

	// ---- 1. Git extraction ----
	const head = git.headCommit();
	report.head = head;
	const tags = git.listSemverTags();
	report.tagsAvailable = tags.available;
	if (!tags.available) report.warnings.push(`Tags unavailable: ${tags.reason}`);
	const warnings = [];

	// ---- 2. Manifest frontier ----
	const loadedManifest = manifest.load();
	const publishedBefore = manifest.publishedReleases(loadedManifest);
	const candidates = [];
	for (const release of publishedBefore) {
		if (release.commitRange && release.commitRange.to) candidates.push(release.commitRange.to);
		if (release.publishedThrough) candidates.push(release.publishedThrough);
	}
	for (const tag of tags.tags) {
		if (tag.commit) candidates.push(tag.commit);
	}
	const frontier = git.newestAncestorOfHead(candidates);

	// ---- 3. Collect change units after the frontier ----
	const extraction = git.collectUnits({ afterCommit: frontier });
	report.incompleteHistory = extraction.incomplete;
	warnings.push(...extraction.warnings);

	// ---- 4. Base version ----
	const tagVersions = tags.tags.map((tag) => tag.version);
	const publishedVersions = publishedBefore.map((release) => release.version);
	const allKnownVersions = [...publishedVersions, ...tagVersions].sort(versioning.compare);
	const base = allKnownVersions.length ? allKnownVersions[allKnownVersions.length - 1] : null;

	let units = extraction.units;
	// Guard: a frontier newer than everything (e.g. manifest ahead of HEAD)
	if (frontier && !units.length) {
		log('No commits after the last published release; refreshing artifacts only.');
	}

	let newRelease = null;
	// When the last published boundary is not visible in this clone (partial
	// history), publishing could duplicate an existing release. Skip safely and
	// only refresh artifacts; the next full-history build publishes the range.
	const boundaryMissing = candidates.length > 0 && !frontier;
	if (boundaryMissing) {
		warn('The last published release boundary is not visible in this clone (partial history); skipping release publication for safety.');
		report.warnings.push('published boundary not visible');
	}
	if (units.length && !boundaryMissing) {
		if (!base && !config.versioning.initialVersion) {
			warn('No published version or tag exists and CHANGELOG_INITIAL_VERSION is not configured; skipping release publication.');
			report.warnings.push('initial version not configured');
		} else {
			report.mode = base ? 'incremental' : 'baseline';
			// ---- 5. Enrich with GitHub (optional, degrades gracefully) ----
			const ghResult = await github.enrichPullRequests(units);
			if (ghResult.rateLimited) {
				warn('GitHub API rate limit reached; continuing without PR enrichment.');
				report.warnings.push('github rate limited');
			} else if (ghResult.unavailable) {
				report.warnings.push('github enrichment incomplete');
			}

			// ---- 6/7. Classify, version, describe ----
			newRelease = await createRelease({
				units,
				base,
				level: null,
				tags: tags.tags,
				isBaseline: !base,
				fromCommit: frontier,
				head,
				ghResult,
			});

			if (!newRelease) {
				log('All candidate changes are excluded by configuration; no release generated.');
			} else {
				// ---- Safeguards: duplicates, extensions and downgrades ----
				const known = [...loadedManifest.releases.map((r) => r.version), ...tagVersions];
				const existingSameVersion = loadedManifest.releases.find((r) => r.version === newRelease.version);

				if (existingSameVersion) {
					const existingTo = existingSameVersion.commitRange ? existingSameVersion.commitRange.to : null;
					const newTo = newRelease.commitRange ? newRelease.commitRange.to : null;
					const sameRange = Boolean(existingTo && newTo && existingTo === newTo);
					const existingVisible = existingTo ? git.hasCommit(existingTo) : false;
					const rangeGrows = existingTo && newTo && existingVisible
						? git.isAncestor(existingTo, newTo)
						: false;

					if (sameRange) {
						// Already published for exactly this commit range — nothing to do.
						log(`Release v${newRelease.version} already covers this commit range; no new release.`);
						newRelease = null;
					} else if (rangeGrows || !existingVisible) {
						// The release grows with new commits (or the clone lacks the
						// published boundary). Extend the existing record instead of
						// publishing a duplicate version.
						warn(`Release v${newRelease.version} extends an already published commit range; updating that record.`);
						newRelease.extendsExisting = true;
						newRelease.publishedAt = existingSameVersion.publishedAt || newRelease.publishedAt;
						if (!manifest.isHumanEdited(existingSameVersion)) {
							newRelease.title = existingSameVersion.title || newRelease.title;
							newRelease.summary = existingSameVersion.summary || newRelease.summary;
							newRelease.description = existingSameVersion.description || newRelease.description;
						}
					} else {
						throw new Error(
							`Refusing to overwrite published release v${newRelease.version} with an unrelated commit range `
							+ `(${existingTo} -> ${newTo}). Resolve this manually before publishing.`,
						);
					}
				} else if (known.includes(newRelease.version)) {
					throw new Error(`Refusing to publish duplicate version v${newRelease.version}`);
				}

				if (newRelease && base && !newRelease.extendsExisting && versioning.compare(newRelease.version, base) <= 0) {
					throw new Error(`Refusing to publish v${newRelease.version}: would not advance beyond v${base}`);
				}
				if (newRelease && !newRelease.extendsExisting) {
					report.aiUsed = Boolean(newRelease.aiGenerated);
					report.newRelease = { version: newRelease.version, status: newRelease.status, isBaseline: Boolean(newRelease.isBaseline) };
					log(`${report.mode === 'baseline' ? 'Baseline release' : 'Release'} v${newRelease.version} (${newRelease.status}): ${newRelease.title}`);
				} else if (newRelease && newRelease.extendsExisting) {
					report.newRelease = { version: newRelease.version, status: newRelease.status, extended: true };
					log(`Release v${newRelease.version} extended with newer commits.`);
				}
			}
		}
	} else if (!publishedBefore.length) {
		log('No published releases and no new commits; nothing to publish.');
	}

	// ---- 8. Merge into manifest (atomic, union) ----
	let finalManifest = loadedManifest;
	if (newRelease && !dryRun) {
		manifest.mergeRelease(finalManifest, newRelease);
		manifest.finalize(finalManifest, { generatedAt: new Date().toISOString() });
		const saveResult = manifest.save(finalManifest);
		if (!saveResult.ok) {
			if (saveResult.previous !== null) manifest.restore(saveResult.previous);
			throw new Error(`Failed to save manifest: ${saveResult.error && saveResult.error.message}`);
		}
	} else if (newRelease && dryRun) {
		log(`[dry-run] would add release v${newRelease.version} (${newRelease.status})`);
	}

	// ---- 9. Render published set ----
	const published = manifest.publishedReleases(finalManifest);
	for (const release of published) {
		const errors = validate.releaseRecordChecks(release);
		if (errors.length) {
			throw new Error(`Published release v${release.version} failed record validation: ${errors.join('; ')}`);
		}
	}
	report.publishedCount = published.length;

	const latest = published[0] || null;
	const totalPages = Math.max(1, Math.ceil(published.length / config.rendering.paginationSize));

	const artifacts = [];
	if (!dryRun) {
		fs.mkdirSync(changelogDir, { recursive: true });

		const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'changelog-render-'));
		try {
			const overviewHtml = render.renderOverviewPage({ releases: published, page: 1, totalPages, latest });
			fs.writeFileSync(path.join(tmp, 'index.html'), overviewHtml, 'utf8');
			for (let page = 2; page <= totalPages; page += 1) {
				const pageDir = path.join(tmp, `page-${page}`);
				fs.mkdirSync(pageDir, { recursive: true });
				fs.writeFileSync(
					path.join(pageDir, 'index.html'),
					render.renderOverviewPage({ releases: published, page, totalPages, latest: page === 1 ? latest : null }),
					'utf8',
				);
			}
			for (const release of published) {
				const dir = path.join(tmp, render.slugFor(release.version));
				fs.mkdirSync(dir, { recursive: true });
				fs.writeFileSync(
					path.join(dir, 'index.html'),
					render.renderReleasePage({ release, newer: published[published.indexOf(release) - 1] || null, older: published[published.indexOf(release) + 1] || null }),
					'utf8',
				);
			}
			fs.writeFileSync(path.join(tmp, 'feed.xml'), render.renderRss(published), 'utf8');
			fs.writeFileSync(path.join(tmp, 'atom.xml'), render.renderAtom(published), 'utf8');
			fs.writeFileSync(path.join(tmp, 'releases.json'), render.renderReleasesJson(published), 'utf8');
			fs.writeFileSync(path.join(tmp, 'releases.schema.json'), render.renderSchema(), 'utf8');

			// ---- 10. Validate rendered output before publishing it ----
			validate.assertWellFormedXml(fs.readFileSync(path.join(tmp, 'feed.xml'), 'utf8'));
			validate.assertValidRss(fs.readFileSync(path.join(tmp, 'feed.xml'), 'utf8'));
			validate.assertWellFormedXml(fs.readFileSync(path.join(tmp, 'atom.xml'), 'utf8'));
			validate.assertValidAtom(fs.readFileSync(path.join(tmp, 'atom.xml'), 'utf8'));
			validate.assertValidReleasesJson(JSON.parse(fs.readFileSync(path.join(tmp, 'releases.json'), 'utf8')), { publishedCount: published.length });
			validate.assertOverviewDiscovers(fs.readFileSync(path.join(tmp, 'index.html'), 'utf8'), published);
			for (const release of published) {
				validate.assertReleasePageContent(
					fs.readFileSync(path.join(tmp, render.slugFor(release.version), 'index.html'), 'utf8'),
					release,
				);
			}

			// ---- 11. Move validated artifacts into place ----
			for (const entry of fs.readdirSync(tmp, { withFileTypes: true })) {
				const src = path.join(tmp, entry.name);
				const dest = path.join(changelogDir, entry.name);
				if (entry.isDirectory()) {
					fs.rmSync(dest, { recursive: true, force: true });
					fs.mkdirSync(dest, { recursive: true });
					// renameSync can fail across filesystems (tmp vs workspace);
					// copy-then-remove is always safe.
					fs.cpSync(src, dest, { recursive: true });
					fs.rmSync(src, { recursive: true, force: true });
				} else {
					fs.cpSync(src, dest, { force: true });
					fs.rmSync(src, { force: true });
				}
				artifacts.push(entry.name);
			}
		} finally {
			fs.rmSync(tmp, { recursive: true, force: true });
		}

		const removedDirs = pruneStaleReleaseDirs({ published, changelogDir });
		if (removedDirs.length) log(`Removed stale generated release page(s): ${removedDirs.join(', ')}`);
	} else {
		log('[dry-run] skipping artifact rendering');
	}

	// ---- 12. Crawler discovery test (no JavaScript involved) ----
	if (!dryRun) {
		const sitemapFile = path.join(siteRoot, 'sitemap.xml');
		const sitemapXml = fs.existsSync(sitemapFile) ? fs.readFileSync(sitemapFile, 'utf8') : null;
		const crawlResult = crawl.run({ releases: published, sitemapXml: null });
		// The sitemap is (re)generated after this step in the build; the
		// authoritative sitemap cross-check runs inside scripts/generate-sitemap.js.
		report.crawl = { ok: crawlResult.ok, failures: crawlResult.failures };
		if (!crawlResult.ok) {
			throw new Error(`Crawler discovery test failed:\n- ${crawlResult.failures.join('\n- ')}`);
		}
		log(`Crawler discovery test passed (${published.length} release(s) discoverable without JavaScript).`);
	}

	for (const warning of warnings.concat(report.warnings)) {
		if (warning) warn(warning);
	}
	log(`Done. Published releases: ${published.length}. Latest: ${latest ? `v${latest.version}` : 'none'}.`);

	if (args.report) {
		fs.writeFileSync(args.report, `${JSON.stringify({ ...report, artifacts }, null, 2)}\n`, 'utf8');
	}
	return 0;
}

module.exports = { main };

if (require.main === module) {
	main()
		.then((code) => process.exit(code))
		.catch((error) => {
			console.error(`[changelog] GENERATION FAILED: ${error.message}`);
			console.error('[changelog] Previous release history was preserved. Fix the issue and rebuild.');
			if (config.logging.verbose && error.stack) console.error(error.stack);
			process.exit(1);
		});
}
