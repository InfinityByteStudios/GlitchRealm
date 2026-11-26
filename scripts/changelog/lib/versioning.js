/**
 * Semantic versioning helpers with hard safeguards:
 *   - strict MAJOR.MINOR.PATCH
 *   - never downgrade
 *   - never duplicate a version
 *   - never guess an initial version (it must be configured)
 */

const INITIAL_VERSION = '0.0.0';

const SEMVER_RE = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parse(version) {
	const match = SEMVER_RE.exec(String(version || '').trim());
	if (!match) return null;
	return {
		major: parseInt(match[1], 10),
		minor: parseInt(match[2], 10),
		patch: parseInt(match[3], 10),
	};
}

function format(parts) {
	return `${parts.major}.${parts.minor}.${parts.patch}`;
}

function normalize(version) {
	const parts = parse(version);
	return parts ? format(parts) : null;
}

function compare(a, b) {
	const pa = parse(a);
	const pb = parse(b);
	if (!pa || !pb) return 0;
	if (pa.major !== pb.major) return pa.major - pb.major;
	if (pa.minor !== pb.minor) return pa.minor - pb.minor;
	return pa.patch - pb.patch;
}

function bump(base, level) {
	const parts = parse(base);
	if (!parts) return null;
	if (level === 'major') return format({ major: parts.major + 1, minor: 0, patch: 0 });
	if (level === 'minor') return format({ ...parts, minor: parts.minor + 1, patch: 0 });
	if (level === 'patch') return format({ ...parts, patch: parts.patch + 1 });
	return null;
}

/**
 * Guarded next-version calculation.
 * Throws when the result would downgrade or duplicate an existing version.
 */
function nextVersion({ base, level, existingVersions = [], tags = [] }) {
	if (!base) return null;
	const candidate = bump(base, level);
	if (!candidate) {
		throw new Error(`Cannot compute next version from base "${base}" with level "${level}"`);
	}
	for (const existing of existingVersions) {
		if (compare(candidate, existing) < 0) {
			throw new Error(
				`Computed version v${candidate} would downgrade existing published version v${existing}`,
			);
		}
	}
	const tagVersions = tags.map((t) => t.version);
	if (tagVersions.includes(candidate)) {
		throw new Error(`Version v${candidate} already exists as a git tag; refusing to duplicate`);
	}
	return candidate;
}

module.exports = { parse, format, normalize, compare, bump, nextVersion, INITIAL_VERSION };
