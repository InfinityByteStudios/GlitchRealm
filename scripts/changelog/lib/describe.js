/**
 * Human-readable release copy.
 *
 * Two modes:
 *   1. Deterministic templates (always available) — cleaned commit subjects
 *      plus factual audience information derived from the files actually
 *      changed. Nothing is invented.
 *   2. AI polish (optional) — when the Netlify AI Gateway is configured, the
 *      deterministic copy is rewritten by the configured model (default:
 *      MiniMax M3.1 Flash). The model may only rephrase provided facts; any
 *      malformed or unavailable response falls back to mode 1.
 */

const config = require('../config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_FILE = path.join(__dirname, '..', '.ai-cache.json');
const CACHE_LIMIT = 50;

function cacheKey(payload) {
	return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24);
}

function loadCache() {
	try {
		const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
		return raw && typeof raw === 'object' ? raw : {};
	} catch {
		return {};
	}
}

function saveCache(cache) {
	try {
		const keys = Object.keys(cache);
		if (keys.length > CACHE_LIMIT) {
			for (const key of keys.slice(0, keys.length - CACHE_LIMIT)) delete cache[key];
		}
		fs.writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, '\t')}\n`, 'utf8');
	} catch {
		/* cache is an optimization; failures are non-fatal */
	}
}

const TASK_ID_RE = /\s*\([0-9a-f]{16,64}\)\s*$/i;

// Display-only content mask: commit subjects occasionally contain slurs or
// abuse (this is a public changelog). Raw values remain in git; masked text
// never appears in generated pages or feeds. Patterns allow leetspeak and
// separator-obfuscated spellings.
const SEP = '[\\s.\\-_+]*';
const MASK_RULES = [
	new RegExp(`\\bn[i1!|]${SEP}g{1,2}(?:${SEP}[ae3])?(?:${SEP}r{1,2})?(?:${SEP}g{1,2}(?:${SEP}[ae3])?(?:${SEP}r{1,2})?)?(?:s|let|lets)?\\b`, 'gi'),
	new RegExp(`\\bf${SEP}a${SEP}g{1,2}(?:${SEP}[ae3o])?(?:${SEP}r)?(?:s|ot|ots|otry)?\\b`, 'gi'),
	/\bretard(?:ed|s)?\b/gi,
	/\bk[i1]ke[s]?\b/gi,
	/\bch[i1]nk(?:s|y)?\b/gi,
	/\btrann(?:y|ies)\b/gi,
	/\bcunt(?:s|y)?\b/gi,
];

function maskAbuse(text) {
	let output = String(text || '');
	for (const rule of MASK_RULES) {
		output = output.replace(rule, '[filtered]');
	}
	return output;
}

const AUDIENCE_RULES = [
	{ re: /^Games\//, audience: 'players', feature: 'game experiences' },
	{ re: /game-detail|games\.html|game_/, audience: 'players', feature: 'the game catalog' },
	{ re: /submit-game|submissions?\b/i, audience: 'creators', feature: 'game submission' },
	{ re: /auth|signin|sign-in|account|password/, audience: 'user accounts', feature: 'sign-in and account management' },
	{ re: /admin|moderation/, audience: 'administrators', feature: 'the admin control panel' },
	{ re: /developer-dashboard|developers/, audience: 'developers', feature: 'the developer portal' },
	{ re: /netlify\/|firebase\.json|firestore|supabase/, audience: 'infrastructure', feature: 'backend services' },
	{ re: /newsletter|community|news\.html|social/, audience: 'community members', feature: 'community features' },
	{ re: /docs?\//, audience: 'contributors', feature: 'project documentation' },
	{ re: /css\/|js\/|index\.html/, audience: 'site visitors', feature: 'the main site' },
	{ re: /sitemap|robots|seo|meta/, audience: 'search engines and AI agents', feature: 'site discoverability' },
];

function stripPrefix(subject) {
	let text = String(subject || '').trim();
	const match = /^([a-zA-Z]+)(\([^)]*\))?(!)?:\s*(.*)$/.exec(text);
	if (match) text = match[4];
	text = text.replace(TASK_ID_RE, '');
	text = text.replace(/\s+/g, ' ').trim();
	text = text.replace(/\.$/, '');
	return maskAbuse(text);
}

function sentenceCase(text) {
	if (!text) return '';
	const first = text.charAt(0).toUpperCase();
	return `${first}${text.slice(1)}`;
}

function pastTense(category, subject) {
	const cleaned = stripPrefix(subject);
	if (!cleaned) return '';
	const present = /^(Add|Improve|Fix|Update|Enhance|Implement|Introduce|Optimize|Refactor|Remove|Support|Enable|Build|Clarify|Serve|Prerender|Standardize)\b/i.exec(cleaned);
	if (present) {
		const verb = present[1];
		const rest = cleaned.slice(verb.length);
		const past = {
			Add: 'Added',
			Improve: 'Improved',
			Fix: 'Fixed',
			Update: 'Updated',
			Enhance: 'Enhanced',
			Implement: 'Implemented',
			Introduce: 'Introduced',
			Optimize: 'Optimized',
			Refactor: 'Refactored',
			Remove: 'Removed',
			Support: 'Supported',
			Enable: 'Enabled',
			Build: 'Built',
			Clarify: 'Clarified',
			Serve: 'Served',
			Prerender: 'Prerendered',
			Standardize: 'Standardized',
		}[verb] || `${verb}ed`;
		return sentenceCase(`${past}${rest}`);
	}
	return sentenceCase(cleaned);
}

function audiencesFor(files) {
	const found = new Map();
	for (const file of files || []) {
		for (const rule of AUDIENCE_RULES) {
			if (rule.re.test(file)) {
				found.set(rule.audience, rule.feature);
				break;
			}
		}
	}
	return [...found.entries()].map(([audience, feature]) => ({ audience, feature }));
}

function audiencePhrase(audiences) {
	if (!audiences.length) return '';
	const unique = [...new Set(audiences.map((a) => a.audience))];
	if (unique.length === 1) return `Affects ${unique[0]}.`;
	return `Affects ${unique.slice(0, 3).join(', ')}.`;
}

function deterministicEntry(category, unit) {
	const subject = unit.prTitle || unit.commits[0].subject;
	const displayTitle = sentenceCase(stripPrefix(subject));
	const description = pastTense(category, subject);
	const audiences = audiencesFor(unit.files);
	return {
		title: displayTitle,
		description,
		audiencePhrase: audiencePhrase(audiences),
		features: audiences.map((a) => a.feature).filter(Boolean).slice(0, 2),
	};
}

// ---------------------------------------------------------------------------
// AI polish (Netlify AI Gateway)
// ---------------------------------------------------------------------------

function gatewayEndpoint() {
	const base = config.ai.gatewayUrl;
	if (!base) return null;
	// The Netlify AI Gateway exposes a single OpenAI-compatible endpoint and
	// routes by model ID (provider-prefixed IDs such as openrouter/* work).
	return `${base}/v1/chat/completions`;
}

function buildPrompt(categoryLabel, items, isBaseline) {
	const lines = items.map(
		(item, index) => `${index}. [${item.category}] ${item.title}${item.audiencePhrase ? ` (${item.audiencePhrase.replace(/\.$/, '')})` : ''}`,
	);
	return [
		'You are writing release notes for GlitchRealm (glitchrealm.ca), a browser-game platform for players, game creators and developers.',
		'Facts about one release follow. Rewrite each entry as one clear sentence for a public changelog.',
		'Rules you must never break:',
		'- Use ONLY the facts provided. Do not invent features, outcomes, metrics or reasons.',
		'- Explain what changed and, when stated, which part of GlitchRealm it affects and for whom.',
		'- No technical abbreviations without explanation. No marketing language.',
		isBaseline ? '- This is the initial baseline release; keep the summary general.' : '',
		'Respond with ONLY minified JSON: {"title": string (<=70 chars, no version number), "summary": string (1-2 sentences), "entries": {"<index>": string}}',
		'',
		`Release category buckets present: ${categoryLabel}.`,
		'Entries:',
		lines.join('\n'),
	].filter(Boolean).join('\n');
}

async function callGatewayOnce(prompt) {
	const endpoint = gatewayEndpoint();
	if (!endpoint || !config.ai.gatewayKey) return null;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);
	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${config.ai.gatewayKey}`,
			},
			body: JSON.stringify({
				model: config.ai.model,
				max_tokens: config.ai.maxOutputTokens,
				temperature: 0.4,
				messages: [
					{ role: 'system', content: 'You produce factual, concise release notes as strict JSON. Never invent facts.' },
					{ role: 'user', content: prompt },
				],
			}),
			signal: controller.signal,
		});
		if (!response.ok) return null;
		const data = await response.json();
		const choice = data && data.choices && data.choices[0];
		const message = choice && choice.message;
		// Some reasoning models return text in reasoning_content with a null
		// content field; accept either.
		const content = message ? (message.content || message.reasoning_content || null) : null;
		if (!content || typeof content !== 'string') return null;
		return extractJson(content);
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

async function callGateway(prompt) {
	const first = await callGatewayOnce(prompt);
	if (first) return first;
	// One retry: gateway hiccups and empty-model responses are intermittent.
	return callGatewayOnce(prompt);
}

function extractJson(text) {
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end <= start) return null;
	try {
		return JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}
}

function validAiPayload(payload, itemCount) {
	if (!payload || typeof payload !== 'object') return false;
	if (typeof payload.title !== 'string' || !payload.title.trim()) return false;
	if (typeof payload.summary !== 'string' || !payload.summary.trim()) return false;
	if (payload.entries && typeof payload.entries !== 'object') return false;
	if (payload.entries) {
		for (const value of Object.values(payload.entries)) {
			if (typeof value !== 'string' || !value.trim()) return false;
		}
	}
	return Object.keys(payload.entries || {}).length <= itemCount;
}

/**
 * Build display copy for a release.
 * Returns { title, summary, entries: Map<unitIndex, {title, description, audiencePhrase}> }
 */
async function describeRelease({ categoryLabel, entries, isBaseline, categoryCounts }) {
	const deterministic = entries.map((entry) => deterministicEntry(entry.classification.category, entry.unit));

	const title = isBaseline
		? 'Platform Baseline'
		: sentenceCase(deterministic[0] ? stripPrefix(deterministic[0].title) : 'Platform updates');

	const countsText = Object.entries(categoryCounts)
		.map(([category, count]) => `${count} ${category.replace(/s$/, '')}${count === 1 ? '' : 's'}`)
		.join(', ');

	let summary;
	if (isBaseline) {
		summary = 'Initial tracked release: establishes the versioning baseline for GlitchRealm and records the platform state at the time the changelog system was adopted.';
	} else {
		summary = deterministic.length === 1
			? `${deterministic[0].title}.`
			: `A grouped release covering ${countsText}.`;
	}

	const result = { title, summary, entries: new Map(), aiUsed: false };
	deterministic.forEach((entry, index) => {
		result.entries.set(index, entry);
	});

	if (!config.ai.enabled) return result;

	const cacheInput = {
		model: config.ai.model,
		isBaseline: Boolean(isBaseline),
		categoryLabel,
		items: deterministic.slice(0, 40).map((entry) => ({
			title: entry.title,
			audiencePhrase: entry.audiencePhrase,
			description: entry.description,
		})),
	};
	const key = cacheKey(cacheInput);
	const cache = loadCache();

	function applyAiPayload(payload) {
		if (!validAiPayload(payload, deterministic.length)) return false;
		result.title = String(payload.title).slice(0, 90);
		result.summary = String(payload.summary).slice(0, 400);
		for (const [index, text] of Object.entries(payload.entries || {})) {
			const numeric = parseInt(index, 10);
			if (!Number.isInteger(numeric) || numeric < 0 || numeric >= deterministic.length) continue;
			result.entries.set(numeric, {
				...deterministic[numeric],
				description: String(text).slice(0, 400),
			});
		}
		result.aiUsed = true;
		return true;
	}

	if (cache[key]) {
		if (applyAiPayload(cache[key])) return result;
		delete cache[key];
	}

	if (!deterministic.length) return result;

	const prompt = buildPrompt(
		categoryLabel,
		cacheInput.items.map((item) => ({ title: item.title, category: categoryLabel, audiencePhrase: item.audiencePhrase })),
		Boolean(isBaseline),
	);
	const payload = await callGateway(prompt.slice(0, config.ai.maxInputChars));
	if (payload && applyAiPayload(payload)) {
		// Retry once for entries the model skipped in its first response.
		const hasCustom = new Set([...result.entries.keys()].filter((index) => {
			const entry = result.entries.get(index);
			return entry.description && entry.description !== deterministic[index].description;
		}));
		const uncovered = deterministic
			.map((entry, index) => ({ entry, index }))
			.filter(({ index }) => !hasCustom.has(index))
			.slice(0, 30);
		if (uncovered.length && uncovered.length < deterministic.length) {
			const retryPrompt = buildPrompt(
				categoryLabel,
				uncovered.map(({ entry }) => ({ title: entry.title, category: categoryLabel, audiencePhrase: entry.audiencePhrase })),
				Boolean(isBaseline),
			);
			const retryPayload = await callGateway(retryPrompt.slice(0, config.ai.maxInputChars));
			if (retryPayload && retryPayload.entries) {
				for (const [index, text] of Object.entries(retryPayload.entries)) {
					const slot = uncovered[parseInt(index, 10)];
					if (!slot || typeof text !== 'string' || !text.trim()) continue;
					result.entries.set(slot.index, { ...deterministic[slot.index], description: String(text).slice(0, 400) });
				}
			}
		}
		cache[key] = {
			title: result.title,
			summary: result.summary,
			entries: Object.fromEntries([...result.entries.entries()]
				.filter(([, entry]) => entry.description !== undefined)
				.map(([index, entry]) => [index, entry.description])),
		};
		saveCache(cache);
	}
	return result;
}

module.exports = {
	stripPrefix,
	sentenceCase,
	pastTense,
	audiencesFor,
	describeRelease,
	deterministicEntry,
};
