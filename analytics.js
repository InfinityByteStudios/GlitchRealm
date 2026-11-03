// GlitchRealm Admin — Analytics dashboard logic (ES module)
// Data source: GET https://glitchrealm.ca/.netlify/functions/analytics-query?report=<name>&days=<N>&gameId=<id>
// Hosted by the main site — this admin site has no analytics functions, so the API is called
// cross-origin (CORS is handled server-side; auth is the Firebase ID token, sent as a Bearer header).
// Auth: Firebase ID token of a signed-in admin (same UID list as admin.js).
// Fail closed: nothing renders or fetches until an authorized admin is signed in.

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const FALLBACK_ADMIN_UIDS = [
    '6iZDTXC78aVwX22qrY43BOxDRLt1',
    'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
    'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
    '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
    'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
];

const ANALYTICS_QUERY_URL = 'https://glitchrealm.ca/.netlify/functions/analytics-query';

const EMPTY_MSG = 'No data yet — events appear once consented visitors browse the site.';

const state = {
    days: 7,
    gameId: '',
    gate: 'pending', // pending | ok | denied | signedout
    loading: false,
    loaded: false,
    cache: {},
    liveTimer: null,
    liveUpdating: false,
    retrying: false,
    lastUpdated: null
};

const gameNames = new Map(); // gameId -> display name (best effort)

// ================================================================
// TINY DOM + FORMAT HELPERS
// ================================================================
const $ = (sel) => document.querySelector(sel);

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}

function escapeAttr(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

const nf = new Intl.NumberFormat();
function fmtInt(n) {
    const v = Number(n);
    return Number.isFinite(v) ? nf.format(Math.round(v)) : '0';
}

function fmtPct(frac) {
    if (!Number.isFinite(frac) || frac <= 0) return '0%';
    const pct = frac * 100;
    return (pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10) + '%';
}

function fmtHours(seconds) {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    if (s < 60) return fmtInt(s) + 's';
    const m = Math.floor(s / 60);
    if (m < 60) return fmtInt(m) + 'm';
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return fmtInt(h) + 'h' + (rem ? ' ' + fmtInt(rem) + 'm' : '');
}

// Engaged-time style: "Xm Ys" (promotes to hours for long values)
function fmtMinutes(seconds) {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    if (s < 3600) {
        if (s < 60) return fmtInt(s) + 's';
        const m = Math.floor(s / 60);
        const rem = s % 60;
        return fmtInt(m) + 'm' + (rem ? ' ' + fmtInt(rem) + 's' : '');
    }
    return fmtHours(s);
}

function fmtDate(d, withTime) {
    if (!d) return '—';
    const opts = withTime
        ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { month: 'short', day: 'numeric' };
    try {
        return d.toLocaleDateString(undefined, opts);
    } catch (e) {
        return d.toISOString().slice(0, 10);
    }
}

function relTime(date) {
    if (!date) return '—';
    const diff = Date.now() - date.getTime();
    if (diff < 0) return 'just now';
    const s = Math.floor(diff / 1000);
    if (s < 45) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    return d + 'd ago';
}

// Firestore timestamps arrive serialized as {seconds, nanoseconds}
function toDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === 'object' && typeof v.toDate === 'function') {
        try { return v.toDate(); } catch (e) { return null; }
    }
    if (typeof v === 'object' && typeof v.seconds === 'number') {
        return new Date(v.seconds * 1000);
    }
    if (typeof v === 'number') return new Date(v > 1e12 ? v : v * 1000);
    if (typeof v === 'string') {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function toast(message, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) { console.log('[analytics]', type, message); return; }
    el.textContent = message;
    el.className = 'toast ' + type + ' show';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 4000);
}

// ================================================================
// ACCESS CONTROL (fail closed)
// ================================================================
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.firebaseAuth) return resolve();
        window.addEventListener('firebaseReady', resolve, { once: true });
    });
}

async function adminUidSet() {
    if (window.__ADMIN_UIDS__ instanceof Set && window.__ADMIN_UIDS__.size) return window.__ADMIN_UIDS__;
    if (typeof window.loadAdminUids === 'function') {
        try {
            const s = await window.loadAdminUids();
            if (s instanceof Set && s.size) return s;
        } catch (e) { /* fall through */ }
    }
    return new Set(FALLBACK_ADMIN_UIDS);
}

function currentUser() {
    return (window.firebaseAuth && window.firebaseAuth.currentUser) || window.currentFirebaseUser || null;
}

async function updateGate() {
    await waitForFirebase();
    const user = currentUser();
    const gateEl = $('#an-gate');
    const bodyEl = $('#an-body');
    if (!gateEl || !bodyEl) return;

    if (!user) {
        state.gate = 'signedout';
        gateEl.hidden = false;
        bodyEl.hidden = true;
        setGateCopy('Sign in required', 'Sign in through the admin console to view analytics.');
        return;
    }

    const uids = await adminUidSet();
    if (!uids.has(user.uid)) {
        state.gate = 'denied';
        gateEl.hidden = false;
        bodyEl.hidden = true;
        setGateCopy('Access denied', 'Your account is not on the admin list, so analytics are unavailable.');
        return;
    }

    state.gate = 'ok';
    gateEl.hidden = true;
    bodyEl.hidden = false;
}

function setGateCopy(title, msg) {
    const t = $('#an-gate-title');
    const m = $('#an-gate-msg');
    if (t) t.textContent = title;
    if (m) m.textContent = msg;
}

// Server rejected the admin claim — hide the dashboard entirely (fail closed).
function forceDeniedGate() {
    state.gate = 'denied';
    const gateEl = $('#an-gate');
    const bodyEl = $('#an-body');
    if (gateEl) gateEl.hidden = false;
    if (bodyEl) bodyEl.hidden = true;
    setGateCopy('Access denied', 'Your account is not on the admin list, so analytics are unavailable.');
}

// ================================================================
// API CLIENT
// ================================================================
async function callApi(report, days, gameId, forceToken) {
    const user = currentUser();
    if (!user) {
        const e = new Error('Not signed in');
        e.status = 401;
        throw e;
    }
    const token = await user.getIdToken(!!forceToken);

    const url = new URL(ANALYTICS_QUERY_URL);
    url.searchParams.set('report', report);
    url.searchParams.set('days', String(days));
    if (gameId) url.searchParams.set('gameId', gameId);

    let res;
    try {
        res = await fetch(url, {
            headers: { Authorization: 'Bearer ' + token },
            credentials: 'omit'
        });
    } catch (networkErr) {
        throw new Error('Network error contacting the analytics API');
    }

    if (res.status === 404 || res.status === 405) {
        const e = new Error('analytics-query endpoint not found (' + res.status + ')');
        e.status = res.status;
        throw e;
    }
    if (!res.ok) {
        const e = new Error('analytics-query ' + res.status);
        e.status = res.status;
        throw e;
    }
    return res.json();
}

async function fetchReport(report, days, gameId) {
    try {
        return await callApi(report, days, gameId, false);
    } catch (err) {
        if (err && err.status === 401) {
            // Token likely expired — force-refresh once, then retry.
            try {
                return await callApi(report, days, gameId, true);
            } catch (retryErr) {
                if (retryErr && retryErr.status === 401) {
                    state.gate = 'signedout';
                    await updateGate();
                }
                throw retryErr;
            }
        }
        throw err;
    }
}

function describeApiError(err) {
    if (!err) return 'Unknown error';
    if (err.status === 401) return 'Sign-in expired. Refresh the page to sign in again.';
    if (err.status === 403) return 'Access denied — this account is not authorized for analytics.';
    if (err.status === 429) return 'Rate limited — slow down and retry in a moment.';
    if (err.status === 500) return 'The report failed on the server (report_failed) — this is usually temporary. Try again.';
    if (err.status === 503) return 'Analytics backend unavailable — storage credentials are missing on the server.';
    return err.message || 'Request failed';
}

// ================================================================
// PANEL PLUMBING
// ================================================================
function panelEl(id) { return document.getElementById(id); }

function panelLoading(el, label) {
    if (el) el.innerHTML = '<div class="loading-placeholder">' + escapeHTML(label || 'Loading…') + '</div>';
}

function panelEmpty(el, msg) {
    if (el) el.innerHTML = '<div class="empty-state"><p>' + escapeHTML(msg || EMPTY_MSG) + '</p></div>';
}

function panelError(el, err, retryKey) {
    if (!el) return;
    const retry = retryKey
        ? '<div class="an-error-actions"><button type="button" class="btn-secondary btn-sm an-retry" data-report="' + escapeAttr(retryKey) + '">Retry</button></div>'
        : '';
    el.innerHTML = '<div class="empty-state"><h3>Could not load</h3><p>' + escapeHTML(describeApiError(err)) + '</p>' + retry + '</div>';
}

function panelContent(el, html) {
    if (el) el.innerHTML = html;
}

// ================================================================
// LOAD ORCHESTRATION
// ================================================================
function isSectionActive() {
    const sec = document.getElementById('sec-analytics');
    return !!(sec && sec.classList.contains('active'));
}

async function loadAll() {
    if (state.gate !== 'ok' || state.loading) return;
    if (!isSectionActive()) return;

    state.loading = true;
    updateStatusLine('Updating…');

    const days = state.days;
    const gameId = state.gameId || null;
    // KPI deltas: totals over 2N days minus totals over N days = the previous N-day window.
    const jobs = {
        overview: fetchReport('overview', days, gameId),
        overviewPrev: fetchReport('overview', days * 2, gameId),
        topGames: fetchReport('top-games', days, null),
        attribution: fetchReport('attribution', days, gameId),
        referrers: fetchReport('referrers', days, null),
        pages: fetchReport('pages', days, null),
        errors: fetchReport('errors', days, null),
        live: fetchReport('live', days, null),
        recent: fetchReport('recent', days, null)
    };

    const entries = Object.entries(jobs);
    const settled = await Promise.allSettled(entries.map(([, p]) => p));
    const out = {};
    entries.forEach(([key], i) => { out[key] = settled[i]; });

    // A 403 means the server rejected the admin claim — fail closed entirely.
    const forbidden = settled.some(r => r.status === 'rejected' && r.reason && r.reason.status === 403);
    if (forbidden) {
        state.cache = {};
        state.loading = false;
        updateExportButton();
        forceDeniedGate();
        toast('Access denied — analytics are restricted to admin accounts', 'error');
        return;
    }

    state.cache = {};
    for (const [key, r] of Object.entries(out)) {
        if (r.status === 'fulfilled') state.cache[key] = r.value;
    }

    renderKpis(out.overview, out.overviewPrev);
    renderTraffic(out.overview);
    renderAttribution(out.attribution);
    renderTopGames(out.topGames);
    renderReferrers(out.referrers);
    renderPages(out.pages);
    renderLive(out.live);
    renderErrors(out.errors);
    renderDebug(out.recent);

    const okCount = settled.filter(r => r.status === 'fulfilled').length;
    const failCount = settled.length - okCount;
    if (okCount === 0) {
        const firstErr = settled.find(r => r.status === 'rejected');
        toast('Analytics failed to load — ' + describeApiError(firstErr && firstErr.reason), 'error');
        updateStatusLine('Load failed');
    } else {
        if (failCount > 0) toast(failCount + ' analytics report' + (failCount === 1 ? '' : 's') + ' failed to load', 'error');
        state.loaded = true;
        state.lastUpdated = new Date();
        updateStatusLine();
    }

    state.loading = false;
    updateExportButton();
}

async function refetchReport(cacheKey, report, days, gameId) {
    try {
        const value = await fetchReport(report, days, gameId);
        if (state.cache) state.cache[cacheKey] = value;
        return { status: 'fulfilled', value };
    } catch (reason) {
        return { status: 'rejected', reason };
    }
}

// Per-report retry: re-fetches a single failed report and re-renders only its panel(s).
const RETRY_DEFS = {
    overview: async () => {
        const gameId = state.gameId || null;
        const [ov, prev] = await Promise.all([
            refetchReport('overview', 'overview', state.days, gameId),
            refetchReport('overviewPrev', 'overview', state.days * 2, gameId)
        ]);
        renderKpis(ov, prev);
        renderTraffic(ov);
        return ov.status === 'fulfilled' ? null : ov.reason;
    },
    topGames: async () => {
        const r = await refetchReport('topGames', 'top-games', state.days, null);
        renderTopGames(r);
        return r.status === 'fulfilled' ? null : r.reason;
    },
    attribution: async () => {
        const r = await refetchReport('attribution', 'attribution', state.days, state.gameId || null);
        renderAttribution(r);
        return r.status === 'fulfilled' ? null : r.reason;
    },
    referrers: async () => {
        const r = await refetchReport('referrers', 'referrers', state.days, null);
        renderReferrers(r);
        return r.status === 'fulfilled' ? null : r.reason;
    },
    pages: async () => {
        const r = await refetchReport('pages', 'pages', state.days, null);
        renderPages(r);
        return r.status === 'fulfilled' ? null : r.reason;
    },
    errors: async () => {
        const r = await refetchReport('errors', 'errors', state.days, null);
        renderErrors(r);
        return r.status === 'fulfilled' ? null : r.reason;
    },
    live: async () => {
        const r = await refetchReport('live', 'live', state.days, null);
        renderLive(r);
        return r.status === 'fulfilled' ? null : r.reason;
    },
    recent: async () => {
        const r = await refetchReport('recent', 'recent', state.days, null);
        renderDebug(r);
        return r.status === 'fulfilled' ? null : r.reason;
    }
};

async function retryReport(key) {
    const fn = RETRY_DEFS[key];
    if (!fn || state.retrying) return;
    state.retrying = true;
    try {
        const err = await fn();
        if (err) {
            if (err.status === 403) {
                state.cache = {};
                forceDeniedGate();
                toast('Access denied — analytics are restricted to admin accounts', 'error');
            } else {
                toast('Retry failed — ' + describeApiError(err), 'error');
            }
        } else {
            state.lastUpdated = new Date();
            if (!state.loaded) state.loaded = true;
            updateStatusLine();
            updateExportButton();
        }
    } finally {
        state.retrying = false;
    }
}

function updateStatusLine(override) {
    const el = $('#an-status');
    if (!el) return;
    if (override) { el.textContent = override; return; }
    const parts = [];
    if (state.lastUpdated) parts.push('Updated ' + relTime(state.lastUpdated));
    if (state.gameId) parts.push('game: ' + gameLabel(state.gameId));
    el.textContent = parts.join(' · ') || '';
}

// ================================================================
// KPI CARDS
// ================================================================
const KPI_DEFS = [
    { key: 'visitors', label: 'Unique visitors', goodUp: true, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', iconCls: 'an-ic-cyan' },
    { key: 'pageviews', label: 'Pageviews', goodUp: true, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>', iconCls: 'an-ic-info' },
    { key: 'sessions', label: 'Sessions', goodUp: true, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>', iconCls: 'an-ic-magenta' },
    { key: 'playClicks', label: 'Play clicks', goodUp: true, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/></svg>', iconCls: 'an-ic-cyan' },
    { key: 'plays', label: 'Plays', goodUp: true, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>', iconCls: 'an-ic-success' },
    { key: 'playtime_s', label: 'Total playtime', goodUp: true, fmt: fmtMinutes, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>', iconCls: 'an-ic-warning' },
    { key: 'errors', label: 'JS errors', goodUp: false, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 10l4 4M10 10l-4 4M15 10h.01M18 13h.01"/></svg>', iconCls: 'an-ic-error' },
    { key: 'newsletter', label: 'Newsletter signups', goodUp: true, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>', iconCls: 'an-ic-info' }
];

function renderKpis(res, prevRes) {
    const el = panelEl('an-kpis');
    if (!el) return;

    if (!res || res.status !== 'fulfilled') {
        panelError(el, res && res.reason, 'overview');
        return;
    }

    const data = res.value || {};
    const prev = prevRes && prevRes.status === 'fulfilled' ? prevRes.value || {} : null;

    const html = KPI_DEFS.map(def => {
        const cur = num(data[def.key]);
        let deltaHTML = '';
        if (prev) {
            const prevVal = num(prev[def.key]) - cur; // totals(2N) − totals(N)
            const d = cur - prevVal;
            let cls = 'flat';
            let arrow = '◆';
            let text = 'no prior data';
            if (prevVal > 0 || prevVal < 0) {
                if (d === 0) { cls = 'flat'; arrow = '▬'; text = '0% vs prev'; }
                else {
                    const pct = prevVal > 0 ? Math.round((d / prevVal) * 100) : null;
                    const up = d > 0;
                    arrow = up ? '▲' : '▼';
                    text = pct === null
                        ? (up ? 'new' : '−' + fmtInt(Math.abs(d)))
                        : Math.abs(pct) + '% vs prev';
                    cls = (up === def.goodUp) ? 'up' : 'down';
                }
            }
            deltaHTML = '<span class="stat-delta ' + cls + '" title="vs previous ' + state.days + ' days">' + arrow + ' ' + escapeHTML(text) + '</span>';
        }
        const value = def.fmt ? def.fmt(cur) : fmtInt(cur);
        return (
            '<div class="stat-card stat-card-static an-kpi">' +
                '<div class="an-kpi-top">' +
                    '<div class="stat-icon ' + def.iconCls + '">' + def.icon + '</div>' +
                    '<div class="stat-info"><span class="stat-value">' + escapeHTML(value) + '</span>' +
                    '<span class="stat-label">' + escapeHTML(def.label) + '</span></div>' +
                '</div>' +
                deltaHTML +
            '</div>'
        );
    }).join('');

    panelContent(el, html);
}

// ================================================================
// TRAFFIC CHART (hand-drawn SVG, no libraries)
// ================================================================
function niceCeil(v) {
    const v2 = Math.max(1, v);
    const exp = Math.pow(10, Math.floor(Math.log10(v2)));
    for (const m of [1, 2, 2.5, 5, 10]) {
        if (m * exp >= v2) return m * exp;
    }
    return 10 * exp;
}

function renderTraffic(res) {
    const el = panelEl('an-chart');
    const meta = $('#an-chart-meta');
    if (!el) return;

    if (!res || res.status !== 'fulfilled') {
        panelError(el, res && res.reason, 'overview');
        if (meta) meta.textContent = '';
        return;
    }

    const ts = Array.isArray(res.value && res.value.timeseries) ? res.value.timeseries : [];
    if (!ts.length) {
        panelEmpty(el);
        if (meta) meta.textContent = '';
        return;
    }

    const days = ts.map(d => String(d.day || ''));
    const pv = ts.map(d => num(d.pageviews));
    const vi = ts.map(d => num(d.visitors));

    const W = 760, H = 240, PL = 46, PR = 14, PT = 16, PB = 30;
    const iw = W - PL - PR, ih = H - PT - PB;
    const maxV = niceCeil(Math.max(1, ...pv, ...vi));
    const xAt = (i) => days.length === 1 ? PL + iw / 2 : PL + (i / (days.length - 1)) * iw;
    const yAt = (v) => PT + ih - (v / maxV) * ih;

    const linePath = (vals) => vals.map((v, i) => (i === 0 ? 'M' : 'L') + xAt(i).toFixed(1) + ' ' + yAt(v).toFixed(1)).join(' ');
    const areaPath = pv.length > 1
        ? 'M' + xAt(0).toFixed(1) + ' ' + (PT + ih) + ' ' +
          pv.map((v, i) => 'L' + xAt(i).toFixed(1) + ' ' + yAt(v).toFixed(1)).join(' ') +
          ' L' + xAt(pv.length - 1).toFixed(1) + ' ' + (PT + ih) + ' Z'
        : '';

    // Gridlines + y labels (4 divisions)
    let grid = '';
    for (let g = 0; g <= 4; g++) {
        const val = maxV - (maxV / 4) * g;
        const yy = yAt(val);
        grid += '<line x1="' + PL + '" y1="' + yy.toFixed(1) + '" x2="' + (W - PR) + '" y2="' + yy.toFixed(1) + '" class="an-grid-line"/>';
        grid += '<text x="' + (PL - 8) + '" y="' + (yy + 3.5).toFixed(1) + '" class="an-axis-label" text-anchor="end">' + escapeHTML(fmtInt(val)) + '</text>';
    }

    // X labels: first / middle / last
    const midIdx = Math.floor((days.length - 1) / 2);
    const xLabel = (i, anchor) => {
        const d = toDate(days[i] ? days[i] + 'T00:00:00' : null);
        return '<text x="' + xAt(i).toFixed(1) + '" y="' + (H - 8) + '" class="an-axis-label" text-anchor="' + anchor + '">' + escapeHTML(fmtDate(d, false)) + '</text>';
    };
    const xLabels = days.length === 1
        ? xLabel(0, 'middle')
        : xLabel(0, 'start') + xLabel(midIdx, 'middle') + xLabel(days.length - 1, 'end');

    // Point markers with native tooltips
    const dots = (vals, name, cls) => vals.map((v, i) =>
        '<circle cx="' + xAt(i).toFixed(1) + '" cy="' + yAt(v).toFixed(1) + '" r="2.5" class="' + cls + '">' +
        '<title>' + escapeHTML(fmtDate(toDate(days[i] + 'T00:00:00'), true)) + ' — ' + name + ': ' + fmtInt(v) + '</title>' +
        '</circle>'
    ).join('');

    const svg =
        '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Traffic over the selected range" preserveAspectRatio="xMidYMid meet">' +
            '<defs>' +
                '<linearGradient id="an-fill-pv" x1="0" y1="0" x2="0" y2="1">' +
                    '<stop offset="0%" stop-color="#00fff9" stop-opacity="0.28"/>' +
                    '<stop offset="100%" stop-color="#00fff9" stop-opacity="0.02"/>' +
                '</linearGradient>' +
            '</defs>' +
            grid +
            (areaPath ? '<path d="' + areaPath + '" fill="url(#an-fill-pv)" stroke="none"/>' : '') +
            '<path d="' + linePath(pv) + '" fill="none" stroke="#00fff9" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
            '<path d="' + linePath(vi) + '" fill="none" stroke="#4cc3ff" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round"/>' +
            dots(pv, 'Pageviews', 'an-dot-pv') +
            dots(vi, 'Visitors', 'an-dot-vi') +
            xLabels +
        '</svg>';

    const totalPv = pv.reduce((a, b) => a + b, 0);
    const totalVi = vi.reduce((a, b) => a + b, 0);
    if (meta) meta.textContent = fmtInt(totalPv) + ' pageviews · ' + fmtInt(totalVi) + ' visitors over ' + state.days + 'd';

    // CSS bar table fallback (also useful for copy/paste and no-JS/SVG edge cases)
    const maxRow = Math.max(1, ...pv);
    const rows = ts.map((d, i) =>
        '<div class="an-bar-tr">' +
            '<span class="an-bar-day">' + escapeHTML(fmtDate(toDate(days[i] + 'T00:00:00'), false)) + '</span>' +
            '<span class="an-bar-track"><span class="an-bar-fill" style="width:' + Math.round((pv[i] / maxRow) * 100) + '%"></span></span>' +
            '<span class="an-bar-val">' + fmtInt(pv[i]) + ' pv · ' + fmtInt(vi[i]) + ' v</span>' +
        '</div>'
    ).join('');

    panelContent(el,
        svg +
        '<div class="an-legend">' +
            '<span><span class="swatch" style="background:#00fff9"></span>Pageviews</span>' +
            '<span><span class="swatch" style="background:#4cc3ff"></span>Visitors</span>' +
        '</div>' +
        '<details class="an-chart-table"><summary>Data table</summary>' + rows + '</details>'
    );
}

// ================================================================
// ATTRIBUTION — where plays came from
// ================================================================
const ATTR_GROUPS = [
    { key: 'bySource', title: 'Source', full: true },
    { key: 'byMedium', title: 'Medium' },
    { key: 'byCampaign', title: 'Campaign' },
    { key: 'byFirstTouch', title: 'First touch' },
    { key: 'byReferrerKind', title: 'Referrer kind' }
];

function barListHTML(items, total, emptyKeyLabel) {
    const list = (Array.isArray(items) ? items : [])
        .map(it => ({ key: String((it && it.key) || emptyKeyLabel || '—'), count: num(it && it.count) }))
        .sort((a, b) => b.count - a.count);

    if (!list.length || total <= 0) {
        return '<div class="empty-state"><p>' + escapeHTML(EMPTY_MSG) + '</p></div>';
    }

    const max = Math.max(...list.map(i => i.count), 1);
    return '<div class="an-bars">' + list.slice(0, 12).map((it, idx) =>
        '<div class="an-bar-row' + (idx === 0 ? ' top' : '') + '">' +
            '<span class="an-bar-key" title="' + escapeAttr(it.key) + '">' + escapeHTML(it.key) + '</span>' +
            '<span class="an-bar-track"><span class="an-bar-fill" style="width:' + Math.max(2, Math.round((it.count / max) * 100)) + '%"></span></span>' +
            '<span class="an-bar-val">' + fmtInt(it.count) + ' · ' + fmtPct(total ? it.count / total : 0) + '</span>' +
        '</div>'
    ).join('') + '</div>' +
    (list.length > 12 ? '<div class="subtle-text an-more">+ ' + (list.length - 12) + ' more…</div>' : '');
}

function renderAttribution(res) {
    const el = panelEl('an-attr');
    const totalEl = $('#an-attr-total');
    if (!el) return;

    if (!res || res.status !== 'fulfilled') {
        panelError(el, res && res.reason, 'attribution');
        if (totalEl) totalEl.textContent = '';
        return;
    }

    const data = res.value || {};
    const total = num(data.total);
    if (totalEl) totalEl.textContent = 'Tracked play clicks: ' + fmtInt(total);

    if (total <= 0) {
        panelEmpty(el);
        return;
    }

    const html = ATTR_GROUPS.map(g =>
        '<div class="an-attr-group' + (g.full ? ' full' : '') + '">' +
            '<h4>' + escapeHTML(g.title) + '</h4>' +
            barListHTML(data[g.key], total) +
        '</div>'
    ).join('');

    panelContent(el, html);
}

// ================================================================
// TOP GAMES + drill-down
// ================================================================
async function enrichGameNames() {
    // Best-effort: pull published game titles from Firestore for friendlier labels.
    if (gameNames.has('__enriched__')) return;
    gameNames.set('__enriched__', true);
    try {
        await waitForFirebase();
        const snap = await window.firestoreGetDocs(window.firestoreCollection(window.firebaseDb, 'games'));
        snap.forEach(d => {
            const data = d.data() || {};
            const name = data.title || data.name || data.gameName || data.gameTitle || data.slug;
            if (name) gameNames.set(d.id, String(name));
        });
    } catch (e) {
        // Permissions or collection absent — raw IDs remain the labels.
    }
}

function gameLabel(id) {
    return gameNames.get(id) || id;
}

function renderTopGames(res) {
    const el = panelEl('an-topgames');
    if (!el) return;

    if (!res || res.status !== 'fulfilled') {
        panelError(el, res && res.reason, 'topGames');
        return;
    }

    const games = (Array.isArray(res.value && res.value.games) ? res.value.games : [])
        .map(g => ({ gameId: String((g && g.gameId) || '—'), plays: num(g && g.plays), seconds: num(g && g.seconds) }))
        .sort((a, b) => b.plays - a.plays);

    // Populate the game filter dropdown (keep current selection).
    refreshGameFilter(games.map(g => g.gameId));

    if (!games.length) {
        panelEmpty(el);
        return;
    }

    const rows = games.map(g => {
        const avg = g.plays > 0 ? g.seconds / g.plays : null;
        return '<tr data-game="' + escapeAttr(g.gameId) + '" tabindex="0" title="Filter dashboard by this game">' +
            '<td>' + escapeHTML(gameLabel(g.gameId)) + '<span class="an-sub mono">' + escapeHTML(g.gameId) + '</span></td>' +
            '<td class="num">' + fmtInt(g.plays) + '</td>' +
            '<td class="num">' + escapeHTML(fmtHours(g.seconds)) + '</td>' +
            '<td class="num">' + (avg === null ? '—' : escapeHTML(fmtMinutes(avg))) + '</td>' +
        '</tr>';
    }).join('');

    panelContent(el,
        '<table class="an-table"><thead><tr>' +
            '<th>Game</th><th class="num">Plays</th><th class="num">Playtime</th><th class="num">Avg/play</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>'
    );
}

function refreshGameFilter(ids) {
    const sel = $('#an-game-filter');
    if (!sel) return;
    const current = state.gameId;
    const existing = new Set(Array.from(sel.options).map(o => o.value));
    ids.forEach(id => {
        if (id && id !== '—' && !existing.has(id)) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = gameLabel(id);
            sel.appendChild(opt);
        }
    });
    // Apply friendly labels to any existing options now that names may have loaded.
    Array.from(sel.options).forEach(o => {
        if (o.value) o.textContent = gameLabel(o.value);
    });
    // Make sure a persisted selection always has an option to bind to.
    if (current && !Array.from(sel.options).some(o => o.value === current)) {
        const opt = document.createElement('option');
        opt.value = current;
        opt.textContent = gameLabel(current);
        sel.appendChild(opt);
    }
    if (current) sel.value = current;
}

// ================================================================
// REFERRERS + PAGES
// ================================================================
function renderReferrers(res) {
    const el = panelEl('an-referrers');
    if (!el) return;
    if (!res || res.status !== 'fulfilled') { panelError(el, res && res.reason, 'referrers'); return; }

    const data = res.value || {};
    const total = num(data.total);
    const list = Array.isArray(data.referrers) ? data.referrers : [];
    if (!list.length || total <= 0) { panelEmpty(el); return; }

    const max = Math.max(...list.map(i => num(i.count)), 1);
    panelContent(el, '<div class="an-bars">' + list.slice(0, 15).map((it, idx) =>
        '<div class="an-bar-row' + (idx === 0 ? ' top' : '') + '">' +
            '<span class="an-bar-key" title="' + escapeAttr(it.key || 'direct') + '">' + escapeHTML(it.key || 'direct') + '</span>' +
            '<span class="an-bar-track"><span class="an-bar-fill" style="width:' + Math.max(2, Math.round((num(it.count) / max) * 100)) + '%"></span></span>' +
            '<span class="an-bar-val">' + fmtInt(it.count) + ' · ' + fmtPct(total ? num(it.count) / total : 0) + '</span>' +
        '</div>'
    ).join('') + '</div>');
}

function renderPages(res) {
    const el = panelEl('an-pages');
    if (!el) return;
    if (!res || res.status !== 'fulfilled') { panelError(el, res && res.reason, 'pages'); return; }

    const pages = Array.isArray(res.value && res.value.pages) ? res.value.pages : [];
    if (!pages.length) { panelEmpty(el); return; }

    const max = Math.max(...pages.map(p => num(p.count)), 1);
    panelContent(el, '<div class="an-bars">' + pages.slice(0, 15).map((p, idx) =>
        '<div class="an-bar-row' + (idx === 0 ? ' top' : '') + '">' +
            '<span class="an-bar-key mono" title="' + escapeAttr(p.key || '/') + '">' + escapeHTML(p.key || '/') + '</span>' +
            '<span class="an-bar-track"><span class="an-bar-fill" style="width:' + Math.max(2, Math.round((num(p.count) / max) * 100)) + '%"></span></span>' +
            '<span class="an-bar-val">' + fmtInt(p.count) + ' · ' + escapeHTML(fmtMinutes(p.engaged_s)) + ' engaged</span>' +
        '</div>'
    ).join('') + '</div>');
}

// ================================================================
// LIVE
// ================================================================
function renderLive(res) {
    const el = panelEl('an-live');
    const meta = $('#an-live-meta');
    if (!el) return;

    if (res && res.status === 'rejected') {
        panelError(el, res.reason, 'live');
        if (meta) meta.textContent = '';
        return;
    }
    if (!res) return; // no data yet this cycle — leave existing content

    const data = res.value || {};
    const plays = Array.isArray(data.activePlays) ? data.activePlays : [];
    // activeVisitors is the current name for the ~3-minute ping window; visitorsLast5Min is the legacy alias.
    const visitors = num(data.activeVisitors !== undefined && data.activeVisitors !== null ? data.activeVisitors : data.visitorsLast5Min);
    const sessions = num(data.activeSessions);

    if (meta) {
        const checked = state.lastLiveCheck ? ' · checked ' + relTime(state.lastLiveCheck) : '';
        meta.textContent = 'Auto-refreshes every 30s' + checked;
    }

    const playsHTML = plays.length
        ? plays.slice(0, 10).map(p => {
            const started = toDate(p.startedAt);
            const src = p.source ? String(p.source) : '';
            // playSeconds is the running duration; it can be null early in a play.
            const running = (typeof p.playSeconds === 'number' && Number.isFinite(p.playSeconds))
                ? escapeHTML(fmtMinutes(p.playSeconds)) + ' played'
                : '';
            return '<div class="recent-item">' +
                '<span class="recent-item-title">' + escapeHTML(p.gameName || gameLabel(p.gameId || '—')) + '</span>' +
                '<span class="recent-item-meta">' +
                    (src ? 'via ' + escapeHTML(src) + ' · ' : '') +
                    'started ' + escapeHTML(started ? relTime(started) : '—') +
                    (running ? ' · ' + running : '') +
                '</span>' +
            '</div>';
        }).join('')
        : '<div class="empty-state"><p>No active plays right now.</p></div>';

    panelContent(el,
        '<div class="an-live-stats">' +
            '<div class="an-live-stat"><span class="stat-value">' + fmtInt(visitors) + '</span><span class="stat-label">Active visitors</span></div>' +
            '<div class="an-live-stat"><span class="stat-value">' + fmtInt(sessions) + '</span><span class="stat-label">Active sessions</span></div>' +
            '<div class="an-live-stat"><span class="stat-value">' + fmtInt(plays.length) + '</span><span class="stat-label">Active plays</span></div>' +
        '</div>' +
        '<div class="recent-list">' + playsHTML + '</div>'
    );
}

async function refreshLive() {
    if (state.gate !== 'ok' || state.liveUpdating || !isSectionActive()) return;
    if (document.hidden) return;
    state.liveUpdating = true;
    state.lastLiveCheck = new Date();
    try {
        const data = await fetchReport('live', state.days, null);
        renderLive({ status: 'fulfilled', value: data });
    } catch (e) {
        // Silent for background refreshes; surface only repeated failures via meta line.
        const meta = $('#an-live-meta');
        if (meta) meta.textContent = 'Live update failed — will retry';
    } finally {
        state.liveUpdating = false;
    }
}

// ================================================================
// ERRORS
// ================================================================
function renderErrors(res) {
    const el = panelEl('an-errors');
    const meta = $('#an-errors-meta');
    if (!el) return;

    if (!res || res.status !== 'fulfilled') {
        panelError(el, res && res.reason, 'errors');
        if (meta) meta.textContent = '';
        return;
    }

    const data = res.value || {};
    const recent = Array.isArray(data.recent) ? data.recent : [];
    if (meta) meta.textContent = fmtInt(data.count) + ' in range · showing last ' + recent.length;

    if (!recent.length) {
        panelEmpty(el, 'No JavaScript errors recorded — the site is healthy.');
        return;
    }

    const rows = recent.map(e => {
        const when = toDate(e.ts);
        const msg = String(e.message || '');
        const truncated = msg.length > 140 ? msg.slice(0, 140) + '…' : msg;
        const needsExpand = msg.length > 140;
        // name is "error" (window errors / unhandled rejections) or "game_error"
        const name = String(e.name || 'Error');
        const isGameError = name === 'game_error';
        const file = e.file ? String(e.file) : '';
        const loc = file + (file && e.line !== undefined && e.line !== null && e.line !== '' ? ':' + escapeHTML(String(e.line)) : '');
        return '<div class="an-err">' +
            '<div class="an-err-head">' +
                '<span class="recent-item-meta">' + escapeHTML(when ? relTime(when) : '—') + '</span>' +
                '<span class="an-err-name' + (isGameError ? ' game' : '') + '" title="' + escapeAttr(isGameError ? 'Error reported by a game' : 'Window error / unhandled rejection') + '">' + escapeHTML(name) + '</span>' +
                '<span class="an-err-path mono">' + escapeHTML(e.path || '—') + '</span>' +
            '</div>' +
            (msg
                ? (needsExpand
                    ? '<button type="button" class="an-err-msg" title="Click to expand">' + escapeHTML(truncated) + '</button>' +
                      '<pre class="an-err-full" hidden>' + escapeHTML(msg) + '</pre>'
                    : '<div class="an-err-msg static">' + escapeHTML(msg) + '</div>')
                : '') +
            (loc ? '<div class="an-err-file mono">' + loc + '</div>' : '') +
        '</div>';
    }).join('');

    panelContent(el, rows);
}

// ================================================================
// DEBUG (collapsed raw events)
// ================================================================
function renderDebug(res) {
    const el = panelEl('an-debug');
    const meta = $('#an-debug-meta');
    if (!el) return;

    if (!res || res.status !== 'fulfilled') {
        panelContent(el, '');
        if (meta) meta.textContent = describeApiError(res && res.reason);
        return;
    }

    const events = Array.isArray(res.value && res.value.events) ? res.value.events : [];
    if (meta) meta.textContent = events.length + ' raw event' + (events.length === 1 ? '' : 's') + ' returned';
    // Cap the dump so very large windows don't bloat the DOM.
    panelContent(el, escapeHTML(JSON.stringify(events.slice(0, 50), null, 2)));
}

// ================================================================
// CSV EXPORT
// ================================================================
function csvCell(v) {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function csvRows(rows) {
    return rows.map(r => r.map(csvCell).join(',')).join('\n');
}

function buildCsv() {
    const c = state.cache;
    const sections = [];
    const stamp = new Date().toISOString();
    sections.push(csvRows([
        ['GlitchRealm analytics export'],
        ['Generated', stamp],
        ['Range days', state.days],
        ['Game filter', state.gameId || 'All games']
    ]));

    const ov = c.overview;
    if (ov) {
        sections.push(csvRows([
            ['KPIs'],
            ['metric', 'value'],
            ['Unique visitors', num(ov.visitors)],
            ['Pageviews', num(ov.pageviews)],
            ['Sessions', num(ov.sessions)],
            ['Play clicks', num(ov.playClicks)],
            ['Plays', num(ov.plays)],
            ['Playtime seconds', num(ov.playtime_s)],
            ['JS errors', num(ov.errors)],
            ['Newsletter signups', num(ov.newsletter)]
        ]));
        if (Array.isArray(ov.timeseries) && ov.timeseries.length) {
            sections.push(csvRows([
                ['Traffic'],
                ['day', 'pageviews', 'visitors', 'plays'],
                ...ov.timeseries.map(d => [d.day, num(d.pageviews), num(d.visitors), num(d.plays)])
            ]));
        }
    }

    if (c.topGames && Array.isArray(c.topGames.games)) {
        sections.push(csvRows([
            ['Top games'],
            ['gameId', 'plays', 'playtimeSeconds'],
            ...c.topGames.games.map(g => [g.gameId, num(g.plays), num(g.seconds)])
        ]));
    }

    if (c.attribution) {
        const dims = [['bySource', 'source'], ['byMedium', 'medium'], ['byCampaign', 'campaign'], ['byFirstTouch', 'firstTouch'], ['byReferrerKind', 'referrerKind']];
        const rows = [['dimension', 'key', 'count']];
        dims.forEach(([key, label]) => {
            (Array.isArray(c.attribution[key]) ? c.attribution[key] : []).forEach(it => rows.push([label, it.key, num(it.count)]));
        });
        if (rows.length > 1) sections.push(csvRows(rows));
    }

    if (c.referrers && Array.isArray(c.referrers.referrers)) {
        sections.push(csvRows([
            ['Referrers'],
            ['referrer', 'count'],
            ...c.referrers.referrers.map(r => [r.key || 'direct', num(r.count)])
        ]));
    }

    if (c.pages && Array.isArray(c.pages.pages)) {
        sections.push(csvRows([
            ['Top pages'],
            ['path', 'views', 'engagedSeconds'],
            ...c.pages.pages.map(p => [p.key, num(p.count), num(p.engaged_s)])
        ]));
    }

    if (c.errors && Array.isArray(c.errors.recent)) {
        sections.push(csvRows([
            ['JS errors'],
            ['ts', 'name', 'path', 'message', 'file', 'line'],
            ...c.errors.recent.map(e => {
                const d = toDate(e.ts);
                return [d ? d.toISOString() : '', e.name || '', e.path || '', e.message || '', e.file || '', e.line ?? ''];
            })
        ]));
    }

    return sections.join('\n\n');
}

function exportCsv() {
    if (!state.loaded) { toast('Load the analytics data first', 'info'); return; }
    const csv = buildCsv();
    if (!csv) { toast('Nothing to export yet', 'info'); return; }
    try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'glitchrealm-analytics-' + state.days + 'd-' + new Date().toISOString().slice(0, 10) + (state.gameId ? '-' + state.gameId.replace(/[^a-z0-9_-]+/gi, '_') : '') + '.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast('CSV exported', 'success');
    } catch (e) {
        toast('Export failed: ' + e.message, 'error');
    }
}

// ================================================================
// EVENTS + BOOT
// ================================================================
function bindEvents() {
    // Range segmented control
    const range = $('#an-range');
    if (range) {
        range.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-days]');
            if (!btn) return;
            const days = parseInt(btn.dataset.days, 10);
            if (!days || days === state.days) return;
            state.days = days;
            range.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
            loadAll();
        });
    }

    // Game filter
    const gameSel = $('#an-game-filter');
    if (gameSel) {
        gameSel.addEventListener('change', () => {
            state.gameId = gameSel.value || '';
            loadAll();
        });
    }

    // Refresh + export
    const refresh = $('#an-refresh');
    if (refresh) refresh.addEventListener('click', () => loadAll());
    const exportBtn = $('#an-export');
    if (exportBtn) exportBtn.addEventListener('click', exportCsv);

    // Per-panel retry buttons (rendered inside failed panels) + errors-head refresh
    const body = document.getElementById('an-body');
    if (body) {
        body.addEventListener('click', (e) => {
            const btn = e.target.closest('.an-retry');
            if (!btn) return;
            retryReport(btn.dataset.report);
        });
    }
    const errRefresh = $('#an-errors-refresh');
    if (errRefresh) errRefresh.addEventListener('click', () => retryReport('errors'));

    // Top-games drill-down (delegated)
    const tg = panelEl('an-topgames');
    if (tg) {
        tg.addEventListener('click', (e) => {
            const row = e.target.closest('tr[data-game]');
            if (!row) return;
            drillDown(row.dataset.game);
        });
        tg.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const row = e.target.closest('tr[data-game]');
            if (!row) return;
            e.preventDefault();
            drillDown(row.dataset.game);
        });
    }

    // Expandable error messages (delegated)
    const errBox = panelEl('an-errors');
    if (errBox) {
        errBox.addEventListener('click', (e) => {
            const btn = e.target.closest('.an-err-msg:not(.static)');
            if (!btn) return;
            const full = btn.nextElementSibling;
            if (full && full.classList.contains('an-err-full')) {
                full.hidden = !full.hidden;
                btn.classList.toggle('open', !full.hidden);
            }
        });
    }

    // Also react to the sidebar nav item directly (works even before admin.js binds).
    document.querySelectorAll('.nav-item[data-section="analytics"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.gate === 'ok') loadAll();
        });
    });
}

function drillDown(gameId) {
    if (!gameId) return;
    state.gameId = gameId;
    const sel = $('#an-game-filter');
    if (sel) sel.value = gameId;
    loadAll();
    toast('Filtered to ' + gameLabel(gameId), 'info');
    const sec = document.getElementById('sec-analytics');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateExportButton() {
    const btn = $('#an-export');
    if (btn) btn.disabled = !state.loaded;
}

async function boot() {
    await waitForFirebase();
    bindEvents();
    updateExportButton();

    // Initial panel states
    ['#an-kpis'].forEach(sel => panelLoading(panelEl(sel.slice(1)), 'Loading analytics…'));

    onAuthStateChanged(window.firebaseAuth, async () => {
        await updateGate();
        if (state.gate === 'ok' && isSectionActive() && !state.loaded) loadAll();
    });
    await updateGate();

    // Best-effort friendly game labels
    enrichGameNames().then(() => refreshGameFilter([]));

    // Live auto-refresh
    if (state.liveTimer) clearInterval(state.liveTimer);
    state.liveTimer = setInterval(refreshLive, 30000);

    // If the analytics section is already open (e.g. restored after reload), load once ready.
    if (state.gate === 'ok' && isSectionActive()) loadAll();
}

boot();

// Public hook used by admin.js loadSection('analytics')
window.GlitchRealmAnalytics = {
    load: loadAll,
    refreshLive: refreshLive
};
