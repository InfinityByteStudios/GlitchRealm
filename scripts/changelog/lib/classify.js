/**
 * Change classification.
 *
 * Combines Conventional Commits syntax, PR labels and conservative keyword
 * fallbacks to place every change unit into a release category and compute
 * the semver bump level. MAJOR always wins over MINOR, MINOR over PATCH.
 */

const config = require('../config');

const CATEGORY_KEYS = ['features', 'improvements', 'fixes', 'performance', 'security', 'maintenance', 'breaking'];

const CATEGORY_LABELS = {
	features: 'New Features',
	improvements: 'Improvements',
	fixes: 'Bug Fixes',
	performance: 'Performance',
	security: 'Security',
	maintenance: 'Maintenance',
	breaking: 'Breaking Changes',
};

// Type -> { level, category }
const TYPE_MAP = {
	feat: { level: 'minor', category: 'features' },
	fix: { level: 'patch', category: 'fixes' },
	perf: { level: 'patch', category: 'performance' },
	docs: { level: 'patch', category: 'maintenance' },
	refactor: { level: 'patch', category: 'improvements' },
	chore: { level: 'patch', category: 'maintenance' },
	style: { level: 'patch', category: 'improvements' },
	test: { level: 'patch', category: 'maintenance' },
	ci: { level: 'patch', category: 'maintenance' },
	build: { level: 'patch', category: 'maintenance' },
};

const LABEL_MAP = [
	{ match: /^(breaking[-_ ]?change|breaking)$/, level: 'major', category: 'breaking' },
	{ match: /^(security)$/, level: 'patch', category: 'security' },
	{ match: /^(feature|enhancement|feat)$/, level: 'minor', category: 'features' },
	{ match: /^(bug|fix)$/, level: 'patch', category: 'fixes' },
	{ match: /^(performance|perf|optimi[sz]ation)$/, level: 'patch', category: 'performance' },
	{ match: /^(documentation|docs)$/, level: 'patch', category: 'maintenance' },
	{ match: /^(chore|maintenance|dependencies|dependency|deps)$/, level: 'patch', category: 'maintenance' },
	{ match: /^(refactor|improvement|ui)$/, level: 'patch', category: 'improvements' },
];

const LEVEL_PRIORITY = { major: 3, minor: 2, patch: 1 };

const KEYWORD_RULES = [
	{ re: /\b(security|vulnerab|xss|csrf|cve)\b/i, level: 'patch', category: 'security' },
	{ re: /\b(performance|faster|speed|optimi[sz]|cache)\b/i, level: 'patch', category: 'performance' },
	{ re: /\b(fix|fixed|broken|breaks|regression|error|crash|bug)\b/i, level: 'patch', category: 'fixes' },
	{ re: /\b(add|added|new|introduce|implement|support|enable)\b/i, level: 'minor', category: 'features' },
];

function parseConventional(subject) {
	const match = /^([a-zA-Z]+)(\([^)]*\))?(!)?:\s*(.*)$/.exec(subject || '');
	if (!match) return null;
	const [, rawType, scope, bang, rest] = match;
	const type = rawType.toLowerCase();
	if (!TYPE_MAP[type]) return null;
	return {
		type,
		scope: scope ? scope.slice(1, -1) : null,
		breaking: Boolean(bang),
		text: rest.trim(),
	};
}

function hasBreakingFooter(body) {
	return /^BREAKING[ -]CHANGE:/mi.test(body || '');
}

function classifyUnit(unit) {
	const primary = unit.commits[0];
	const body = unit.commits.map((c) => c.body).join('\n');
	const subjects = unit.commits.map((c) => c.subject || '');

	let conventional = null;
	for (const subject of subjects) {
		conventional = parseConventional(subject);
		if (conventional) break;
	}

	let level = null;
	let category = null;
	// A BREAKING CHANGE footer counts regardless of subject syntax.
	let breaking = hasBreakingFooter(body);
	const signals = [];

	if (conventional) {
		const mapped = TYPE_MAP[conventional.type];
		if (mapped) {
			level = mapped.level;
			category = mapped.category;
			signals.push(`type:${conventional.type}`);
		}
		breaking = conventional.breaking || hasBreakingFooter(body);
	}

	const labels = [];
	if (unit.pr && Array.isArray(unit.pr.labels)) {
		labels.push(...unit.pr.labels.map((l) => String(l).toLowerCase().trim()));
	}
	for (const label of labels) {
		for (const rule of LABEL_MAP) {
			if (rule.match.test(label)) {
				if (LEVEL_PRIORITY[rule.level] >= LEVEL_PRIORITY[level || 'patch']) {
					level = rule.level;
					category = rule.category;
					signals.push(`label:${label}`);
				}
				if (rule.category === 'breaking') breaking = true;
				break;
			}
		}
	}

	if (breaking) {
		level = 'major';
		category = 'breaking';
		signals.push('breaking-change');
	}

	if (!level) {
		// Conservative keyword fallback on the display subject.
		const haystack = subjects.join(' ');
		for (const rule of KEYWORD_RULES) {
			if (rule.re.test(haystack)) {
				level = rule.level;
				category = rule.category;
				signals.push(`keyword:${rule.category}`);
				break;
			}
		}
	}

	if (!level) {
		level = 'patch';
		category = 'maintenance';
		signals.push('default');
	}

	if (config.classification.excludeTypes.includes(conventional ? conventional.type : '')) {
		return { level, category, breaking, excluded: true, signals };
	}

	return { level, category, breaking, excluded: false, signals, conventional };
}

function classifyUnits(units) {
	const result = {
		entries: [],
		bump: null,
		levels: new Set(),
		empty: units.length === 0,
	};
	let best = null;
	// Dedup by unit identity so the same commit (e.g. seen via a merge and
	// directly) is never processed twice.
	const seen = new Set();
	for (const unit of units) {
		const identity = unit.mainline || unit.mergeCommit?.hash || unit.commits[0].hash;
		if (seen.has(identity)) continue;
		seen.add(identity);
		const classification = classifyUnit(unit);
		if (classification.excluded) continue;
		result.entries.push({ unit, classification });
		result.levels.add(classification.level);
		if (!best || LEVEL_PRIORITY[classification.level] > LEVEL_PRIORITY[best]) {
			best = classification.level;
		}
	}
	result.bump = best;
	return result;
}

function categoriesFor(entries) {
	const categories = {};
	for (const { classification } of entries) {
		if (!categories[classification.category]) categories[classification.category] = 0;
		categories[classification.category] += 1;
	}
	return categories;
}

module.exports = {
	CATEGORY_KEYS,
	CATEGORY_LABELS,
	LEVEL_PRIORITY,
	parseConventional,
	hasBreakingFooter,
	classifyUnit,
	classifyUnits,
	categoriesFor,
};
