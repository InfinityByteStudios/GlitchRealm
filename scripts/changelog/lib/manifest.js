/**
 * Release manifest (changelog/versions.json).
 *
 * The committed manifest is the permanent release record. Rules:
 *   - union merge: existing releases are never removed by regeneration
 *   - published releases are never silently overwritten (explicit edits win)
 *   - writes are atomic (temp file + rename) so failed generation never
 *     corrupts the previous valid history
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');
const versioning = require('./versioning');

const SCHEMA_VERSION = 1;

function manifestPath() {
	return path.join(config.outDir, config.manifestFile);
}

const COMPUTED_FIELDS = [
	'summary',
	'changes',
	'commits',
	'pullRequests',
	'commitRange',
	'categories',
	'publishedThrough',
	'generatedAt',
	'counts',
];

function emptyManifest() {
	return {
		schemaVersion: SCHEMA_VERSION,
		generatedAt: null,
		latestVersion: null,
		releases: [],
	};
}

function load() {
	const file = manifestPath();
	if (!fs.existsSync(file)) return emptyManifest();
	try {
		const data = JSON.parse(fs.readFileSync(file, 'utf8'));
		if (!data || !Array.isArray(data.releases)) return emptyManifest();
		if (!data.schemaVersion) data.schemaVersion = SCHEMA_VERSION;
		return data;
	} catch (error) {
		throw new Error(`Manifest ${file} is not valid JSON: ${error.message}`);
	}
}

function findByVersion(manifest, version) {
	return manifest.releases.find((release) => release.version === version) || null;
}

function findMatchingRecord(manifest, computed) {
	// Match by exact commit range first (deduplication), then by version.
	const rangeTo = computed.commitRange && computed.commitRange.to;
	const byRange = rangeTo
		? manifest.releases.find((r) => r.commitRange && r.commitRange.to === rangeTo)
		: null;
	if (byRange) return byRange;
	if (computed.version) return findByVersion(manifest, computed.version);
	return null;
}

function isHumanEdited(record) {
	return Boolean(record.humanEdited);
}

/**
 * Merge a computed release into the manifest without destroying history.
 * Human-edited fields (title, description via humanEdited flag, status) win.
 */
function mergeRelease(manifest, computed) {
	const existing = findMatchingRecord(manifest, computed);
	if (existing) {
		const rangeChanged = JSON.stringify(existing.commitRange || {}) !== JSON.stringify(computed.commitRange || {});
		if (existing.status === 'published' && !rangeChanged) {
			// Published record with identical range stays as-is; only refresh
			// computed fields when the record is not human-edited.
			if (!isHumanEdited(existing)) {
				Object.assign(existing, computed, {
					title: existing.title,
					publishedAt: existing.publishedAt,
					status: 'published',
				});
			}
			return existing;
		}
		// Update computed fields, keep human edits and publication metadata.
		const preserved = {};
		if (isHumanEdited(existing)) {
			preserved.title = existing.title;
			preserved.description = existing.description;
		}
		if (existing.status === 'published') {
			preserved.status = 'published';
			preserved.publishedAt = existing.publishedAt;
		}
		if (existing.tag) preserved.tag = existing.tag;
		if (existing.humanEdited) preserved.humanEdited = true;
		const merged = { ...existing, ...computed, ...preserved };
		Object.assign(existing, merged);
		return existing;
	}
	manifest.releases.push({ ...computed });
	return manifest.releases[manifest.releases.length - 1];
}

function sortReleases(manifest) {
	manifest.releases.sort((a, b) => {
		const cmp = versioning.compare(b.version, a.version);
		if (cmp !== 0) return cmp;
		return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
	});
	manifest.latestVersion = manifest.releases.find((r) => r.status === 'published')?.version
		|| manifest.releases[0]?.version
		|| null;
}

function finalize(manifest, { generatedAt }) {
	sortReleases(manifest);
	manifest.generatedAt = generatedAt;
	return manifest;
}

function publishedReleases(manifest) {
	return manifest.releases
		.filter((release) => release.status === 'published')
		.sort((a, b) => versioning.compare(b.version, a.version));
}

/**
 * Atomic write: serialize to a temp file in the same directory, then rename.
 * Returns the previous content on failure so callers can restore it.
 */
function save(manifest) {
	const file = manifestPath();
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
	const tmp = path.join(path.dirname(file), `.${path.basename(file)}.tmp-${process.pid}`);
	try {
		fs.writeFileSync(tmp, `${JSON.stringify(manifest, null, '\t')}\n`, 'utf8');
		fs.renameSync(tmp, file);
		return { ok: true, previous };
	} catch (error) {
		try { fs.unlinkSync(tmp); } catch { /* temp cleanup best effort */ }
		return { ok: false, previous, error };
	}
}

function restore(previous) {
	if (previous === null) {
		const file = manifestPath();
		if (fs.existsSync(file)) fs.unlinkSync(file);
		return;
	}
	const file = manifestPath();
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const tmp = `${file}.restore-${process.pid}`;
	fs.writeFileSync(tmp, previous, 'utf8');
	fs.renameSync(tmp, file);
}

module.exports = {
	SCHEMA_VERSION,
	manifestPath,
	emptyManifest,
	load,
	save,
	restore,
	findByVersion,
	findMatchingRecord,
	mergeRelease,
	finalize,
	publishedReleases,
	isHumanEdited,
	COMPUTED_FIELDS,
};
