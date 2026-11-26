/**
 * GitHub PR enrichment (optional).
 *
 * The GitHub API makes release data richer (real PR titles, labels and exact
 * merge timestamps) but is never required: without credentials or network
 * access, generation falls back to merge-commit subjects and commit data.
 *
 * Rate limits are respected: on 403/429 the module stops fetching and reports
 * how many PRs were enriched instead of hammering the API.
 */

const config = require('../config');

const CACHE = new Map();

function authHeaders(token) {
	const headers = {
		Accept: 'application/vnd.github+json',
		'User-Agent': 'glitchrealm-changelog-bot',
		'X-GitHub-Api-Version': '2022-11-28',
	};
	if (token) headers.Authorization = `Bearer ${token}`;
	return headers;
}

async function fetchJson(url, { token, timeoutMs }) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(url, {
			headers: authHeaders(token),
			signal: controller.signal,
		});
		if (response.status === 403 || response.status === 429) {
			const remaining = response.headers.get('x-ratelimit-remaining');
			return { rateLimited: true, status: response.status, remaining };
		}
		if (response.status === 404) return { notFound: true, status: 404 };
		if (!response.ok) return { error: true, status: response.status };
		return { data: await response.json(), status: response.status };
	} catch (error) {
		return { error: true, status: 0, message: error.message };
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Enrich change units that reference pull requests.
 * Mutates units in place: adds pr { title, labels, mergedAt, url } when found.
 */
async function enrichPullRequests(units) {
	const { owner, repo, token, prLimit, timeoutMs, apiBase } = config.github;
	const prUnits = units.filter((unit) => unit.kind === 'pull-request' && unit.prNumber);
	if (!prUnits.length) {
		return { enriched: 0, rateLimited: false, unavailable: false };
	}

	let enriched = 0;
	let rateLimited = false;
	let unavailable = false;
	const limit = Math.min(prUnits.length, prLimit);

	for (const unit of prUnits.slice(0, limit)) {
		const number = unit.prNumber;
		const cacheKey = `${owner}/${repo}#${number}`;
		let result = CACHE.get(cacheKey);
		if (!result) {
			result = await fetchJson(`${apiBase}/repos/${owner}/${repo}/pulls/${number}`, { token, timeoutMs });
			CACHE.set(cacheKey, result);
		}
		if (result.rateLimited) {
			rateLimited = true;
			break;
		}
		if (result.unavailable || result.error) {
			unavailable = true;
			continue;
		}
		if (!result.data) continue;
		const pr = result.data;
		unit.pr = {
			number,
			title: pr.title || null,
			url: pr.html_url || null,
			mergedAt: pr.merged_at || null,
			labels: Array.isArray(pr.labels)
				? pr.labels.map((label) => (typeof label === 'string' ? label : label.name)).filter(Boolean)
				: [],
			// Author identity is public repo metadata, safe to display.
			author: pr.user && pr.user.login ? pr.user.login : null,
		};
		// PR merge timestamp is authoritative when present.
		if (unit.pr.mergedAt) unit.mergedAt = unit.pr.mergedAt;
		if (unit.pr.title) unit.prTitle = unit.pr.title;
		enriched += 1;
	}

	if (prUnits.length > limit) {
		unavailable = true;
	}
	return { enriched, rateLimited, unavailable };
}

module.exports = { enrichPullRequests };
