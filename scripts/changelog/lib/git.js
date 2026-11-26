/**
 * Git extraction layer.
 *
 * Git is the source of truth. This module walks the first-parent history of
 * HEAD, groups PR merges (merge commits) into single change units, keeps
 * direct (squash/regular) commits as their own units, and preserves every
 * distinct timestamp kind:
 *
 *   authoredAt  — original commit timestamp (author date, UTC ISO 8601)
 *   committedAt — committer timestamp (UTC ISO 8601)
 *   mergedAt    — timestamp of the merge commit that landed a PR (UTC ISO)
 *   ghMergedAt  — PR merge timestamp from the GitHub API (when available)
 *
 * Build timestamps are never substituted for any of these.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const FIELD_SEP = '\u0001';
const RECORD_SEP = '\u0002';

function run(args, { allowFailure = false } = {}) {
	try {
		return execFileSync('git', args, {
			cwd: config.repoRoot,
			maxBuffer: 64 * 1024 * 1024,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch (error) {
		if (allowFailure) return null;
		const stderr = (error.stderr || error.message || '').toString().slice(0, 400);
		throw new Error(`git ${args[0]} failed: ${stderr}`);
	}
}

function toUtcIso(value) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString();
}

function isShallow() {
	return fs.existsSync(path.join(config.repoRoot, '.git', 'shallow'));
}

function headCommit() {
	const hash = run(['rev-parse', 'HEAD'], { allowFailure: true });
	return hash ? hash.trim() : null;
}

function hasCommit(hash) {
	if (!hash) return false;
	return run(['cat-file', '-e', `${hash}^{commit}`], { allowFailure: true }) !== null;
}

/**
 * Discover semver tags. Tag access may be unavailable in restricted
 * environments (sandboxed CI, shallow deployments without tags); in that case
 * tagging support degrades to manifest-only versioning and is reported.
 */
function listSemverTags() {
	const raw = run(['tag', '--list'], { allowFailure: true });
	if (raw === null) {
		return { available: false, tags: [], reason: 'git tag is unavailable in this environment' };
	}
	const semverRe = /^v?(\d+\.\d+\.\d+)$/;
	const tags = [];
	for (const line of raw.split('\n')) {
		const name = line.trim();
		const match = semverRe.exec(name);
		if (!match) continue;
		tags.push({ name, version: match[1], commit: null });
	}
	for (const tag of tags) {
		const hash = run(['rev-list', '-1', tag.name], { allowFailure: true });
		tag.commit = hash ? hash.trim() : null;
	}
	return { available: true, tags, reason: null };
}

const LOG_FORMAT = [
	'%H', '%P', '%an', '%ae', '%aI', '%cI', '%B', RECORD_SEP,
].join(FIELD_SEP);

function parseLog(raw) {
	const commits = [];
	if (!raw) return commits;
	for (const record of raw.split(RECORD_SEP)) {
		// rev-list --format interleaves a bare hash line before each record.
		const stripped = record.replace(/^[0-9a-f]{40}\n/, '').replace(/^\s*\n/, '');
		if (!stripped.trim()) continue;
		const parts = stripped.split(FIELD_SEP);
		if (parts.length < 7) continue;
		const [hash, parents, authorName, authorEmail, authoredAt, committedAt, ...bodyParts] = parts;
		const body = bodyParts.join(FIELD_SEP).replace(/\n+$/, '');
		commits.push({
			hash: hash.trim(),
			parents: parents.trim() ? parents.trim().split(/\s+/) : [],
			authorName: authorName.trim(),
			authorEmail: authorEmail.trim(),
			authoredAt: toUtcIso(authoredAt),
			committedAt: toUtcIso(committedAt),
			subject: (body.split('\n')[0] || '').trim(),
			body,
		});
	}
	return commits;
}

function logFirstParent(rangeArgs) {
	const raw = run(['log', '--first-parent', `--format=${LOG_FORMAT}`, ...rangeArgs], { allowFailure: true });
	return parseLog(raw);
}

function commitByHash(hash) {
	const raw = run(['log', '-1', `--format=${LOG_FORMAT}`, hash], { allowFailure: true });
	const commits = parseLog(raw);
	return commits.length ? commits[0] : null;
}

function branchCommitsOfMerge(mergeCommit) {
	// Commits introduced by a merge = reachable from the second parent but not
	// from the first parent (works for merge and rebase merge strategies).
	const raw = run(
		['rev-list', `${mergeCommit.hash}^2`, `^${mergeCommit.hash}^1`, `--format=${LOG_FORMAT}`],
		{ allowFailure: true },
	);
	if (raw === null) return [];
	return parseLog(raw);
}

function filesChanged(hash, { isMerge = false } = {}) {
	if (isMerge) {
		const raw = run(['diff-tree', '--no-commit-id', '--name-only', '-r', '--first-parent', hash], { allowFailure: true });
		if (raw !== null) {
			return raw.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 200);
		}
		// Restricted environments: git show on a merge lists the combined diff.
		const showRaw = run(['show', '--name-only', '--format=', hash], { allowFailure: true });
		if (showRaw !== null) {
			return showRaw.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 200);
		}
		return [];
	}
	const raw = run(['diff-tree', '--no-commit-id', '--name-only', '-r', hash], { allowFailure: true });
	if (raw !== null) {
		return raw.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 200);
	}
	// diff-tree can be unavailable in restricted environments; fall back to
	// git show, which lists changed files for non-merge commits.
	const showRaw = run(['show', '--name-only', '--format=', hash], { allowFailure: true });
	if (showRaw !== null) {
		return showRaw.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 200);
	}
	return [];
}

function mergeBase(a, b) {
	const raw = run(['merge-base', a, b], { allowFailure: true });
	return raw ? raw.trim() : null;
}

function isAncestor(a, b) {
	// true when commit a is an ancestor of commit b
	return run(['merge-base', '--is-ancestor', a, b], { allowFailure: true }) !== null;
}

/**
 * Walk the first-parent chain and build change units.
 *
 * A unit is either:
 *   - a PR merge (merge commit + all branch commits it introduced), or
 *   - a direct commit on the mainline (squash merge or regular push).
 *
 * Merge commits themselves are never treated as separate changes.
 */
function collectUnits({ afterCommit = null } = {}) {
	const head = headCommit();
	if (!head) {
		return { head: null, units: [], incomplete: false, warnings: ['HEAD could not be resolved'] };
	}

	const range = afterCommit && hasCommit(afterCommit) ? [`${afterCommit}..HEAD`] : ['HEAD'];
	const firstParent = logFirstParent(range);
	const warnings = [];

	if (isShallow()) {
		warnings.push('Repository clone is shallow; history may be incomplete.');
	}
	if (!firstParent.length && afterCommit && hasCommit(afterCommit)) {
		return { head, units: [], incomplete: isShallow(), warnings };
	}

	// Detect incomplete history: the oldest first-parent commit still having a
	// parent we cannot see means the walk stopped at the shallow boundary.
	const incomplete = isShallow();
	if (incomplete && firstParent.length) {
		const oldest = firstParent[firstParent.length - 1];
		if (oldest.parents.length && !hasCommit(oldest.parents[0])) {
			warnings.push('History ends at the shallow clone boundary; older commits are not visible.');
		}
	}

	const units = [];
	for (const commit of firstParent) {
		const isMerge = commit.parents.length > 1;
		if (isMerge) {
			const branch = branchCommitsOfMerge(commit);
			// Branch-internal merges are navigation, not changes; drop them when
			// the branch also contains real commits (PR squash/rebase friendly).
			// Housekeeping commits are dropped too.
			const realBranchCommits = branch.filter(
				(c) => !isExcludedCommit(c.subject) && !/^Merge (branch|pull request) /.test(c.subject),
			);
			const nonMetaBranchCommits = branch.filter((c) => !isExcludedCommit(c.subject));
			const branchCommits = realBranchCommits.length ? realBranchCommits : nonMetaBranchCommits;
			if (!branchCommits.length) {
				// A PR that only contains housekeeping commits is not a change.
				continue;
			}
			const prNumber = parsePrNumber(commit.subject);
			units.push({
				kind: 'pull-request',
				mergeCommit: commit,
				commits: branchCommits,
				prNumber,
				files: filesChanged(commit.hash, { isMerge: true }),
				// Merge timestamp = when the PR landed on the mainline.
				mergedAt: commit.committedAt,
				timestamp: commit.committedAt,
				// Mainline position: the boundary commit for release ranges.
				mainline: commit.hash,
			});
		} else {
			if (isExcludedCommit(commit.subject)) continue;
			units.push({
				kind: 'commit',
				commits: [commit],
				prNumber: parsePrNumber(commit.subject),
				files: filesChanged(commit.hash, { isMerge: false }),
				mergedAt: null,
				timestamp: commit.committedAt,
				mainline: commit.hash,
			});
		}
	}

	units.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
	return { head, units, incomplete, warnings };
}

function parsePrNumber(subject) {
	const match = /Merge pull request #(\d+) from /.exec(subject || '');
	return match ? parseInt(match[1], 10) : null;
}

/**
 * Platform/agent housekeeping commits (e.g. "Agent runner [skip ci]") and
 * explicit skip markers must never become release entries — otherwise every
 * automated run would publish a meaningless release.
 */
function isExcludedCommit(subject) {
	const patterns = config.classification.excludeCommitPatterns || [];
	return patterns.some((pattern) => pattern.test(subject || ''));
}

/**
 * Pick the newest candidate commit that is an ancestor of HEAD.
 * Candidates come from published manifest records and semver tags.
 */
function newestAncestorOfHead(candidates) {
	const head = headCommit();
	if (!head) return null;
	const valid = candidates.filter((hash) => hash && hasCommit(hash) && isAncestor(hash, head));
	if (!valid.length) return null;
	let newest = valid[0];
	for (const candidate of valid.slice(1)) {
		if (candidate === newest) continue;
		// candidate is newer if newest is its ancestor
		if (isAncestor(newest, candidate)) newest = candidate;
	}
	return newest;
}

function countCommitsBetween(fromInclusive, toExclusive) {
	const args = ['rev-list', '--count', `${fromInclusive}..${toExclusive}`];
	const raw = run(args, { allowFailure: true });
	return raw === null ? null : parseInt(raw.trim(), 10);
}

module.exports = {
	run,
	isShallow,
	headCommit,
	hasCommit,
	listSemverTags,
	collectUnits,
	newestAncestorOfHead,
	commitByHash,
	mergeBase,
	isAncestor,
	countCommitsBetween,
	toUtcIso,
	isExcludedCommit,
};
