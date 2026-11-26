/**
 * Shared configuration for the changelog pipeline.
 *
 * Every value can be overridden with environment variables so the same code
 * runs locally, in GitHub Actions and inside the Netlify build. No secrets
 * are ever written into generated artifacts.
 */

const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function envBool(name, fallback) {
	const raw = process.env[name];
	if (raw === undefined || raw === '') return fallback;
	const value = String(raw).trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(value)) return true;
	if (['0', 'false', 'no', 'off'].includes(value)) return false;
	return fallback;
}

function envInt(name, fallback) {
	const raw = process.env[name];
	if (raw === undefined || raw === '') return fallback;
	const parsed = parseInt(String(raw).trim(), 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function envList(name, fallback) {
	const raw = process.env[name];
	if (raw === undefined || raw === '') return fallback;
	return String(raw)
		.split(',')
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);
}

function envPatternList(name, fallback) {
	const raw = process.env[name];
	if (raw === undefined || raw === '') return fallback;
	return String(raw)
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
}

const SITE_URL = (process.env.CHANGELOG_SITE_URL || 'https://glitchrealm.ca').replace(/\/+$/, '');
const SITE_NAME = process.env.CHANGELOG_SITE_NAME || 'GlitchRealm';
const SITE_ORG = process.env.CHANGELOG_SITE_ORG || 'GlitchRealm Games';

const repository = (process.env.GITHUB_REPOSITORY || process.env.CHANGELOG_GITHUB_REPOSITORY || 'InfinityByteStudios/GlitchRealm')
	.replace(/^.*github\.com\//, '')
	.replace(/\.git$/, '')
	.replace(/\/+$/, '');
const [GITHUB_OWNER, GITHUB_REPO] = repository.split('/');

const config = {
	repoRoot: REPO_ROOT,
	// Generated artifacts live in <repo>/changelog; versions.json is committed,
	// everything else is regenerated on every build.
	outDir: path.join(REPO_ROOT, 'changelog'),
	manifestFile: 'versions.json',
	siteUrl: SITE_URL,
	siteName: SITE_NAME,
	siteOrg: SITE_ORG,
	changelogUrl: `${SITE_URL}/changelog/`,
	feedUrl: `${SITE_URL}/changelog/feed.xml`,
	atomUrl: `${SITE_URL}/changelog/atom.xml`,
	indexUrl: `${SITE_URL}/changelog/releases.json`,
	github: {
		owner: GITHUB_OWNER || 'InfinityByteStudios',
		repo: GITHUB_REPO || 'GlitchRealm',
		apiBase: 'https://api.github.com',
		token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
		prLimit: envInt('CHANGELOG_GITHUB_PR_LIMIT', 60),
		timeoutMs: envInt('CHANGELOG_GITHUB_TIMEOUT_MS', 8000),
	},
	versioning: {
		// Never guessed: when no tag and no published record exists, the first
		// release only publishes if an initial version is configured.
		// Set CHANGELOG_INITIAL_VERSION=none to disable initial publication.
		initialVersion: (() => {
			const raw = (process.env.CHANGELOG_INITIAL_VERSION || '').trim();
			if (raw.toLowerCase() === 'none') return '';
			return raw || '1.0.0';
		})(),
		autoPublish: envBool('CHANGELOG_AUTO_PUBLISH', true),
	},
	classification: {
		// Commit types that are excluded from release entries entirely.
		excludeTypes: envList('CHANGELOG_EXCLUDE_TYPES', []),
		// Commit subjects that never become release entries: platform/agent
		// housekeeping commits and explicit skip markers. Configurable with
		// CHANGELOG_EXCLUDE_COMMITS (comma-separated regular expressions).
		excludeCommitPatterns: envPatternList('CHANGELOG_EXCLUDE_COMMITS', [
			'^Agent runner\\b',
			'\\[skip ci\\]',
			'\\[skip netlify\\]',
			'\\[skip changelog',
		]).map((pattern) => {
			try {
				return new RegExp(pattern, 'i');
			} catch {
				return null;
			}
		}).filter(Boolean),
	},
	rendering: {
		// Maximum change entries rendered fully on one release page. Larger
		// releases keep the complete categorized counts and truncate the item
		// list with an explicit note (never silently).
		maxEntriesPerRelease: envInt('CHANGELOG_MAX_ENTRIES', 100),
		// Baseline (first) release lists only recent entries; older commits are
		// covered by the explicit scope note.
		baselineMaxEntries: envInt('CHANGELOG_BASELINE_MAX_ENTRIES', 30),
		// When more published releases exist than this, the overview paginates.
		paginationSize: envInt('CHANGELOG_PAGINATION_SIZE', 60),
	},
	ai: {
		enabled: envBool('CHANGELOG_AI_ENABLED', true),
		// Primary engineering model for generated summaries. MiniMax M3.1 Flash
		// is served through the Netlify AI Gateway (openrouter provider path).
		model: process.env.CHANGELOG_AI_MODEL || 'minimax/minimax-m3.1-flash',
		timeoutMs: envInt('CHANGELOG_AI_TIMEOUT_MS', 45000),
		maxOutputTokens: envInt('CHANGELOG_AI_MAX_TOKENS', 1600),
		maxInputChars: envInt('CHANGELOG_AI_MAX_INPUT_CHARS', 12000),
		gatewayUrl: (process.env.NETLIFY_AI_GATEWAY_URL || process.env.OPENAI_BASE_URL || '').replace(/\/+$/, ''),
		gatewayKey: process.env.NETLIFY_AI_GATEWAY_KEY || process.env.OPENAI_API_KEY || '',
	},
	logging: {
		verbose: envBool('CHANGELOG_VERBOSE', false),
	},
};

module.exports = config;
