// GlitchRealm Admin Panel - Core Logic
// Requires Firebase globals set by index.html module script

const DEV_UIDS = new Set([
    '6iZDTXC78aVwX22qrY43BOxDRLt1',
    'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
    'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
    '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
    'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
]);

let currentUser = null;
let cachedData = {};

// ================================================================
// INIT
// ================================================================
function waitForFirebase() {
    return new Promise(resolve => {
        if (window.firebaseDb) return resolve();
        window.addEventListener('firebaseReady', resolve, { once: true });
    });
}

async function init() {
    // Attach login handler immediately — no Firebase needed for UID check
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    await waitForFirebase();
}

function handleLogin(e) {
    e.preventDefault();
    const uidInput = document.getElementById('login-uid').value.trim();
    const errorEl = document.getElementById('login-error');

    errorEl.style.display = 'none';

    if (!DEV_UIDS.has(uidInput)) {
        errorEl.textContent = 'Invalid admin UID.';
        errorEl.style.display = 'block';
        return;
    }

    // UID valid — grant access
    currentUser = { uid: uidInput };
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('access-denied').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';

    document.getElementById('admin-name').textContent = 'Admin';
    document.getElementById('admin-avatar').textContent = 'A';

    setupNavigation();
    loadDashboard();
}

// ================================================================
// HELPERS
// ================================================================
const db = () => window.firebaseDb;
const col = (...args) => window.firestoreCollection(db(), ...args);
const docRef = (...args) => window.firestoreDoc(db(), ...args);

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(ts) {
    if (!ts) return 'N/A';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function truncate(str, max = 80) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '...' : str;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// ================================================================
// NAVIGATION
// ================================================================
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const sectionTitle = document.getElementById('section-title');

    const sectionNames = {
        dashboard: 'Dashboard',
        games: 'Game Submissions',
        news: 'News Articles',
        community: 'Community Posts',
        banners: 'Site Banners',
        reports: 'Reports',
        database: 'Database Browser'
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.section;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(`sec-${target}`).classList.add('active');
            sectionTitle.textContent = sectionNames[target] || target;

            // Close mobile sidebar
            document.querySelector('.sidebar').classList.remove('open');

            // Load section data
            loadSection(target);
        });
    });

    // Mobile toggle
    document.getElementById('mobile-toggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });

    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', () => {
        cachedData = {};
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) loadSection(activeNav.dataset.section);
        showToast('Data refreshed', 'info');
    });

    // Filters & search
    document.getElementById('games-filter').addEventListener('change', () => loadGames());
    document.getElementById('games-search').addEventListener('input', debounce(() => loadGames(), 300));
    document.getElementById('news-filter').addEventListener('change', () => loadNews());
    document.getElementById('news-search').addEventListener('input', debounce(() => loadNews(), 300));
    document.getElementById('community-filter').addEventListener('change', () => loadCommunity());
    document.getElementById('community-search').addEventListener('input', debounce(() => loadCommunity(), 300));
    document.getElementById('reports-type-filter').addEventListener('change', () => loadReports());
    document.getElementById('reports-status-filter').addEventListener('change', () => loadReports());

    // DB browser
    document.getElementById('db-load-btn').addEventListener('click', () => loadDbCollection());

    // Banner form
    document.getElementById('banner-form').addEventListener('submit', handleBannerSubmit);

    // Doc editor modal
    document.getElementById('doc-editor-close').addEventListener('click', closeDocEditor);
    document.getElementById('doc-editor-cancel').addEventListener('click', closeDocEditor);
    document.getElementById('doc-editor-save').addEventListener('click', saveDocEdit);
    document.getElementById('doc-editor-delete').addEventListener('click', deleteDocFromEditor);
}

function loadSection(name) {
    switch (name) {
        case 'dashboard': loadDashboard(); break;
        case 'games': loadGames(); break;
        case 'news': loadNews(); break;
        case 'community': loadCommunity(); break;
        case 'banners': loadBanners(); break;
        case 'reports': loadReports(); break;
    }
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ================================================================
// DASHBOARD
// ================================================================
async function loadDashboard() {
    try {
        const [gamesSnap, newsSnap, communitySnap, gameReportsSnap, communityReportsSnap, bannersSnap] = await Promise.all([
            window.firestoreGetDocs(col('game_submissions')),
            window.firestoreGetDocs(col('news_articles')),
            window.firestoreGetDocs(col('community_posts')),
            window.firestoreGetDocs(window.firestoreQuery(col('game_reports'), window.firestoreWhere('status', '==', 'open'))),
            window.firestoreGetDocs(window.firestoreQuery(col('community_post_reports'), window.firestoreWhere('status', '==', 'open'))),
            window.firestoreGetDocs(window.firestoreQuery(col('site_banners'), window.firestoreWhere('active', '==', true)))
        ]);

        const totalReports = gameReportsSnap.size + communityReportsSnap.size;

        document.getElementById('stat-games').textContent = gamesSnap.size;
        document.getElementById('stat-news').textContent = newsSnap.size;
        document.getElementById('stat-community').textContent = communitySnap.size;
        document.getElementById('stat-reports').textContent = totalReports;
        document.getElementById('stat-banners').textContent = bannersSnap.size;

        // Pending games
        const pendingGames = [];
        gamesSnap.forEach(d => {
            const data = d.data();
            if (data.status === 'draft') pendingGames.push({ id: d.id, ...data });
        });

        const pendingEl = document.getElementById('dash-pending-games');
        if (pendingGames.length === 0) {
            pendingEl.innerHTML = '<div class="empty-state"><p>No pending games</p></div>';
        } else {
            pendingEl.innerHTML = pendingGames.slice(0, 5).map(g => `
                <div class="recent-item">
                    <span class="recent-item-title">${escapeHTML(g.title)}</span>
                    <span class="recent-item-meta">${formatDate(g.createdAt)}</span>
                </div>
            `).join('');
        }

        // Recent reports
        const allReports = [];
        gameReportsSnap.forEach(d => allReports.push({ id: d.id, type: 'game', ...d.data() }));
        communityReportsSnap.forEach(d => allReports.push({ id: d.id, type: 'community', ...d.data() }));
        allReports.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

        const reportsEl = document.getElementById('dash-recent-reports');
        if (allReports.length === 0) {
            reportsEl.innerHTML = '<div class="empty-state"><p>No open reports</p></div>';
        } else {
            reportsEl.innerHTML = allReports.slice(0, 5).map(r => `
                <div class="recent-item">
                    <span class="recent-item-title">${escapeHTML(r.reason || 'No reason')}</span>
                    <span class="recent-item-meta">${r.type === 'game' ? 'Game' : 'Community'}</span>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Dashboard load error:', err);
        showToast('Failed to load dashboard: ' + err.message, 'error');
    }
}

// ================================================================
// GAME SUBMISSIONS
// ================================================================
async function loadGames() {
    const container = document.getElementById('games-list');
    const filter = document.getElementById('games-filter').value;
    const search = document.getElementById('games-search').value.toLowerCase().trim();

    container.innerHTML = '<div class="loading-placeholder">Loading...</div>';

    try {
        let q = col('game_submissions');
        if (filter !== 'all') {
            q = window.firestoreQuery(q, window.firestoreWhere('status', '==', filter));
        }

        const snap = await window.firestoreGetDocs(q);
        let items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));

        if (search) {
            items = items.filter(g =>
                (g.title || '').toLowerCase().includes(search) ||
                (g.description || '').toLowerCase().includes(search) ||
                (g.ownerId || '').toLowerCase().includes(search)
            );
        }

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No games found</h3><p>Try changing your filters</p></div>';
            return;
        }

        container.innerHTML = items.map(g => `
            <div class="item-card" data-id="${g.id}">
                <div class="item-card-header">
                    <span class="item-card-title">${escapeHTML(g.title)}</span>
                    <span class="status-badge status-${g.status || 'draft'}">${g.status || 'draft'}</span>
                </div>
                <div class="item-card-desc">${escapeHTML(g.description || '')}</div>
                <div class="item-card-meta">
                    Owner: ${escapeHTML(g.ownerUsername || g.ownerId || 'Unknown')} · ${formatDate(g.createdAt)}
                    ${g.playUrl ? ' · <a href="' + escapeHTML(g.playUrl) + '" target="_blank" rel="noopener" style="color:var(--primary-cyan);">Play</a>' : ''}
                </div>
                <div class="item-card-actions">
                    ${g.status === 'draft' ? `<button class="btn-success" onclick="approveGame('${g.id}')">Publish</button>` : ''}
                    ${g.status === 'published' ? `<button class="btn-warn" onclick="unpublishGame('${g.id}')">Unpublish</button>` : ''}
                    <button class="btn-secondary btn-sm" onclick="editDoc('game_submissions','${g.id}')">Edit</button>
                    <button class="btn-danger btn-sm" onclick="deleteItem('game_submissions','${g.id}','${escapeHTML(g.title)}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
}

window.approveGame = async function(id) {
    if (!confirm('Publish this game submission? It will be visible on the Games page.')) return;
    try {
        await window.firestoreUpdateDoc(docRef('game_submissions', id), {
            status: 'published',
            updatedAt: window.firestoreServerTimestamp()
        });
        showToast('Game published successfully', 'success');
        loadGames();
        loadDashboard();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

window.unpublishGame = async function(id) {
    if (!confirm('Unpublish this game? It will be hidden from the Games page.')) return;
    try {
        await window.firestoreUpdateDoc(docRef('game_submissions', id), {
            status: 'draft',
            updatedAt: window.firestoreServerTimestamp()
        });
        showToast('Game unpublished', 'info');
        loadGames();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

// ================================================================
// NEWS ARTICLES  
// ================================================================
async function loadNews() {
    const container = document.getElementById('news-list');
    const filter = document.getElementById('news-filter').value;
    const search = document.getElementById('news-search').value.toLowerCase().trim();

    container.innerHTML = '<div class="loading-placeholder">Loading...</div>';

    try {
        const snap = await window.firestoreGetDocs(col('news_articles'));
        let items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));

        // Filter by status
        if (filter === 'draft') items = items.filter(a => a.draft === true);
        else if (filter === 'published') items = items.filter(a => a.draft === false);

        if (search) {
            items = items.filter(a =>
                (a.title || '').toLowerCase().includes(search) ||
                (a.summary || '').toLowerCase().includes(search)
            );
        }

        items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No articles found</h3></div>';
            return;
        }

        container.innerHTML = items.map(a => `
            <div class="item-card" data-id="${a.id}">
                <div class="item-card-header">
                    <span class="item-card-title">${escapeHTML(a.title)}</span>
                    <span class="status-badge ${a.draft ? 'status-draft' : 'status-published'}">${a.draft ? 'Draft' : 'Published'}</span>
                </div>
                <div class="item-card-desc">${escapeHTML(a.summary || '')}</div>
                <div class="item-card-meta">
                    Author: ${escapeHTML(a.authorUsername || a.authorUid || 'Unknown')} · ${formatDate(a.createdAt)}
                </div>
                <div class="item-card-actions">
                    ${a.draft ? `<button class="btn-success" onclick="publishArticle('${a.id}')">Publish</button>` : `<button class="btn-warn" onclick="unpublishArticle('${a.id}')">Unpublish</button>`}
                    <button class="btn-secondary btn-sm" onclick="editDoc('news_articles','${a.id}')">Edit</button>
                    <button class="btn-danger btn-sm" onclick="deleteItem('news_articles','${a.id}','${escapeHTML(a.title)}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
}

window.publishArticle = async function(id) {
    if (!confirm('Publish this article?')) return;
    try {
        await window.firestoreUpdateDoc(docRef('news_articles', id), {
            draft: false,
            publishedAt: window.firestoreServerTimestamp(),
            updatedAt: window.firestoreServerTimestamp()
        });
        showToast('Article published', 'success');
        loadNews();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

window.unpublishArticle = async function(id) {
    if (!confirm('Unpublish this article?')) return;
    try {
        await window.firestoreUpdateDoc(docRef('news_articles', id), {
            draft: true,
            updatedAt: window.firestoreServerTimestamp()
        });
        showToast('Article unpublished', 'info');
        loadNews();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

// ================================================================
// COMMUNITY POSTS
// ================================================================
async function loadCommunity() {
    const container = document.getElementById('community-list');
    const filter = document.getElementById('community-filter').value;
    const search = document.getElementById('community-search').value.toLowerCase().trim();

    container.innerHTML = '<div class="loading-placeholder">Loading...</div>';

    try {
        let q = col('community_posts');
        if (filter !== 'all') {
            q = window.firestoreQuery(q, window.firestoreWhere('status', '==', filter));
        }

        const snap = await window.firestoreGetDocs(q);
        let items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));

        if (search) {
            items = items.filter(p =>
                (p.title || '').toLowerCase().includes(search) ||
                (p.body || '').toLowerCase().includes(search)
            );
        }

        items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No posts found</h3></div>';
            return;
        }

        container.innerHTML = items.map(p => `
            <div class="item-card" data-id="${p.id}">
                <div class="item-card-header">
                    <span class="item-card-title">${escapeHTML(p.title)}</span>
                    <span class="status-badge status-${p.status || 'published'}">${p.status || 'published'}</span>
                </div>
                <div class="item-card-desc">${escapeHTML(truncate(p.body, 120))}</div>
                <div class="item-card-meta">
                    By: ${escapeHTML(p.authorName || p.userId || 'Anonymous')} · ${formatDate(p.createdAt)}
                    ${p.likesCount ? ` · ${p.likesCount} likes` : ''} ${p.commentsCount ? ` · ${p.commentsCount} comments` : ''}
                </div>
                <div class="item-card-actions">
                    ${p.pinned ? `<button class="btn-warn btn-sm" onclick="togglePin('${p.id}', false)">Unpin</button>` : `<button class="btn-secondary btn-sm" onclick="togglePin('${p.id}', true)">Pin</button>`}
                    <button class="btn-secondary btn-sm" onclick="editDoc('community_posts','${p.id}')">Edit</button>
                    <button class="btn-danger btn-sm" onclick="deleteItem('community_posts','${p.id}','${escapeHTML(p.title)}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
}

window.togglePin = async function(id, pinned) {
    try {
        await window.firestoreUpdateDoc(docRef('community_posts', id), { pinned });
        showToast(pinned ? 'Post pinned' : 'Post unpinned', 'success');
        loadCommunity();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

// ================================================================
// SITE BANNERS
// ================================================================
async function loadBanners() {
    const container = document.getElementById('banners-list');
    container.innerHTML = '<div class="loading-placeholder">Loading...</div>';

    try {
        const snap = await window.firestoreGetDocs(col('site_banners'));
        let items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));

        // Sort active first, then by creation date
        items.sort((a, b) => {
            if (a.active && !b.active) return -1;
            if (!a.active && b.active) return 1;
            return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
        });

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No banners</h3><p>Create one above to notify all users.</p></div>';
            return;
        }

        const typeColors = {
            info: 'rgba(0,212,255,0.12)',
            warning: 'rgba(255,184,0,0.12)',
            error: 'rgba(255,71,87,0.12)',
            success: 'rgba(0,255,65,0.12)'
        };
        const typeIcons = { info: 'ℹ️', warning: '⚠️', error: '🚨', success: '✅' };

        container.innerHTML = items.map(b => `
            <div class="list-item" style="border-left: 3px solid ${b.active ? 'var(--success)' : 'var(--text-muted)'};">
                <div class="list-item-icon" style="background: ${typeColors[b.type] || typeColors.info};">
                    ${typeIcons[b.type] || 'ℹ️'}
                </div>
                <div class="list-item-body">
                    <div class="list-item-title">${escapeHTML(b.message)}</div>
                    <div class="list-item-sub">
                        ${b.active ? '<strong style="color:var(--success);">ACTIVE</strong>' : '<span style="color:var(--text-muted);">INACTIVE</span>'}
                        · Type: ${b.type || 'info'}
                        ${b.expiresAt ? ' · Expires: ' + formatDate(b.expiresAt) : ' · No expiry'}
                        ${b.linkUrl ? ' · Link: ' + escapeHTML(b.linkUrl) : ''}
                        · Created: ${formatDate(b.createdAt)}
                    </div>
                </div>
                <div class="list-item-actions">
                    ${b.active
                        ? `<button class="btn-warn btn-sm" onclick="toggleBanner('${b.id}', false)">Deactivate</button>`
                        : `<button class="btn-success btn-sm" onclick="toggleBanner('${b.id}', true)">Activate</button>`
                    }
                    <button class="btn-danger btn-sm" onclick="deleteBanner('${b.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
}

async function handleBannerSubmit(e) {
    e.preventDefault();
    const message = document.getElementById('banner-message').value.trim();
    const type = document.getElementById('banner-type').value;
    const linkUrl = document.getElementById('banner-link').value.trim();
    const linkText = document.getElementById('banner-link-text').value.trim();
    const expiresVal = document.getElementById('banner-expires').value;
    const dismissible = document.getElementById('banner-dismissible').checked;

    if (!message) return showToast('Banner message is required', 'error');

    const bannerData = {
        message,
        type,
        active: true,
        dismissible,
        createdAt: window.firestoreServerTimestamp(),
        createdBy: currentUser.uid
    };

    if (linkUrl) {
        bannerData.linkUrl = linkUrl;
        bannerData.linkText = linkText || 'Learn more';
    }

    if (expiresVal) {
        bannerData.expiresAt = window.firestoreTimestamp.fromDate(new Date(expiresVal));
    }

    try {
        const ref = window.firestoreDoc(window.firestoreCollection(db(), 'site_banners'));
        await window.firestoreSetDoc(ref, bannerData);
        showToast('Banner published to all users!', 'success');
        document.getElementById('banner-form').reset();
        loadBanners();
        loadDashboard();
    } catch (err) {
        showToast('Failed to create banner: ' + err.message, 'error');
    }
}

window.toggleBanner = async function(id, active) {
    try {
        await window.firestoreUpdateDoc(docRef('site_banners', id), { active });
        showToast(active ? 'Banner activated' : 'Banner deactivated', 'success');
        loadBanners();
        loadDashboard();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

window.deleteBanner = async function(id) {
    if (!confirm('Delete this banner permanently?')) return;
    try {
        await window.firestoreDeleteDoc(docRef('site_banners', id));
        showToast('Banner deleted', 'info');
        loadBanners();
        loadDashboard();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

// ================================================================
// REPORTS
// ================================================================
async function loadReports() {
    const container = document.getElementById('reports-list');
    const typeFilter = document.getElementById('reports-type-filter').value;
    const statusFilter = document.getElementById('reports-status-filter').value;

    container.innerHTML = '<div class="loading-placeholder">Loading...</div>';

    try {
        let allReports = [];

        if (typeFilter === 'all' || typeFilter === 'game') {
            let q = col('game_reports');
            if (statusFilter !== 'all') q = window.firestoreQuery(q, window.firestoreWhere('status', '==', statusFilter));
            const snap = await window.firestoreGetDocs(q);
            snap.forEach(d => allReports.push({ id: d.id, type: 'game', collection: 'game_reports', ...d.data() }));
        }

        if (typeFilter === 'all' || typeFilter === 'community') {
            let q = col('community_post_reports');
            if (statusFilter !== 'all') q = window.firestoreQuery(q, window.firestoreWhere('status', '==', statusFilter));
            const snap = await window.firestoreGetDocs(q);
            snap.forEach(d => allReports.push({ id: d.id, type: 'community', collection: 'community_post_reports', ...d.data() }));
        }

        allReports.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

        if (allReports.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No reports found</h3></div>';
            return;
        }

        const statusColors = {
            open: 'var(--error)',
            pending: 'var(--warning)',
            closed: 'var(--text-muted)',
            reviewing: 'var(--info)',
            resolved: 'var(--success)',
            rejected: 'var(--text-muted)'
        };

        container.innerHTML = allReports.map(r => `
            <div class="list-item" style="border-left: 3px solid ${statusColors[r.status] || 'var(--border)'};">
                <div class="list-item-icon" style="background: rgba(255,71,87,0.1); color: var(--error); font-size: 0.7rem; font-weight: 700;">
                    ${r.type === 'game' ? '🎮' : '💬'}
                </div>
                <div class="list-item-body">
                    <div class="list-item-title">${escapeHTML(r.reason || 'No reason given')}</div>
                    <div class="list-item-sub">
                        <span class="status-badge status-${r.status === 'open' ? 'draft' : r.status === 'closed' ? 'archived' : 'published'}" style="font-size:0.55rem;">${r.status}</span>
                        · ${r.type === 'game' ? 'Game: ' + escapeHTML(r.gameId || '?') : 'Post: ' + escapeHTML(r.postId || '?')}
                        · Reporter: ${escapeHTML(r.userId || 'Unknown')}
                        · ${formatDate(r.createdAt)}
                    </div>
                </div>
                <div class="list-item-actions">
                    ${r.status !== 'closed' ? `<button class="btn-warn btn-sm" onclick="closeReport('${r.collection}','${r.id}')">Close</button>` : ''}
                    ${r.status === 'closed' ? `<button class="btn-secondary btn-sm" onclick="reopenReport('${r.collection}','${r.id}')">Reopen</button>` : ''}
                    <button class="btn-secondary btn-sm" onclick="editDoc('${r.collection}','${r.id}')">View</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
}

window.closeReport = async function(collectionName, id) {
    try {
        const now = new Date();
        const expiresDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours TTL
        await window.firestoreUpdateDoc(window.firestoreDoc(db(), collectionName, id), {
            status: 'closed',
            closedAt: window.firestoreServerTimestamp(),
            expiresAt: window.firestoreTimestamp.fromDate(expiresDate)
        });
        showToast('Report closed', 'success');
        loadReports();
        loadDashboard();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

window.reopenReport = async function(collectionName, id) {
    try {
        const snap = await window.firestoreGetDoc(window.firestoreDoc(db(), collectionName, id));
        if (!snap.exists()) return showToast('Document not found', 'error');
        const data = snap.data();

        // Build update to reopen: set status to open, remove closedAt and expiresAt
        const updateData = { status: 'open' };

        // For Firestore, we need to set these fields to null instead of using deleteField
        // since the rules check for null values on reopen
        if (data.closedAt !== undefined) updateData.closedAt = null;
        if (data.expiresAt !== undefined) updateData.expiresAt = null;

        await window.firestoreUpdateDoc(window.firestoreDoc(db(), collectionName, id), updateData);
        showToast('Report reopened', 'info');
        loadReports();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

// ================================================================
// DATABASE BROWSER
// ================================================================
async function loadDbCollection() {
    const collectionName = document.getElementById('db-collection').value;
    const container = document.getElementById('db-results');

    if (!collectionName) {
        container.innerHTML = '<div class="loading-placeholder">Select a collection first</div>';
        return;
    }

    container.innerHTML = '<div class="loading-placeholder">Loading...</div>';

    try {
        const snap = await window.firestoreGetDocs(window.firestoreQuery(col(collectionName), window.firestoreLimit(100)));
        const docs = [];
        snap.forEach(d => docs.push({ id: d.id, data: d.data() }));

        if (docs.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>Empty collection</h3></div>';
            return;
        }

        // Gather all unique keys across documents
        const allKeys = new Set();
        docs.forEach(d => Object.keys(d.data).forEach(k => allKeys.add(k)));
        const keys = Array.from(allKeys).sort();

        // Show only first 6 columns plus ID
        const displayKeys = keys.slice(0, 6);

        container.innerHTML = `
            <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:12px;">${docs.length} documents · Click ID to edit</p>
            <table class="db-table">
                <thead>
                    <tr>
                        <th>Document ID</th>
                        ${displayKeys.map(k => `<th>${escapeHTML(k)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${docs.map(d => `
                        <tr>
                            <td class="doc-id" onclick="editDoc('${collectionName}','${d.id}')">${d.id.length > 16 ? d.id.slice(0, 16) + '...' : d.id}</td>
                            ${displayKeys.map(k => {
                                const val = d.data[k];
                                let display = '';
                                if (val === null || val === undefined) display = '<span style="opacity:0.4;">null</span>';
                                else if (val?.toDate) display = formatDate(val);
                                else if (typeof val === 'boolean') display = val ? '✓' : '✗';
                                else if (Array.isArray(val)) display = `[${val.length}]`;
                                else if (typeof val === 'object') display = '{...}';
                                else display = escapeHTML(truncate(String(val), 40));
                                return `<td>${display}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(err.message)}</p></div>`;
    }
}

// ================================================================
// DOCUMENT EDITOR
// ================================================================
let editorState = { collection: '', id: '' };

window.editDoc = async function(collectionName, id) {
    try {
        const snap = await window.firestoreGetDoc(window.firestoreDoc(db(), collectionName, id));
        if (!snap.exists()) return showToast('Document not found', 'error');

        editorState = { collection: collectionName, id };

        document.getElementById('doc-editor-title').textContent = `${collectionName} / ${id}`;
        document.getElementById('doc-editor-id').value = id;

        // Convert timestamps to readable format for editing
        const data = snap.data();
        const jsonReady = {};
        for (const [key, val] of Object.entries(data)) {
            if (val?.toDate) jsonReady[key] = { _type: 'timestamp', value: val.toDate().toISOString() };
            else jsonReady[key] = val;
        }

        document.getElementById('doc-editor-json').value = JSON.stringify(jsonReady, null, 2);
        document.getElementById('doc-editor-modal').style.display = 'flex';
    } catch (err) {
        showToast('Failed to load document: ' + err.message, 'error');
    }
};

function closeDocEditor() {
    document.getElementById('doc-editor-modal').style.display = 'none';
}

async function saveDocEdit() {
    const jsonStr = document.getElementById('doc-editor-json').value;
    let parsed;

    try {
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        return showToast('Invalid JSON: ' + e.message, 'error');
    }

    // Convert timestamp markers back
    const data = {};
    for (const [key, val] of Object.entries(parsed)) {
        if (val && typeof val === 'object' && val._type === 'timestamp' && val.value) {
            data[key] = window.firestoreTimestamp.fromDate(new Date(val.value));
        } else {
            data[key] = val;
        }
    }

    if (!confirm(`Save changes to ${editorState.collection}/${editorState.id}?`)) return;

    try {
        await window.firestoreSetDoc(window.firestoreDoc(db(), editorState.collection, editorState.id), data);
        showToast('Document saved', 'success');
        closeDocEditor();
        // Refresh the current section
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) loadSection(activeNav.dataset.section);
    } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
    }
}

async function deleteDocFromEditor() {
    if (!confirm(`DELETE ${editorState.collection}/${editorState.id}? This cannot be undone.`)) return;
    try {
        await window.firestoreDeleteDoc(window.firestoreDoc(db(), editorState.collection, editorState.id));
        showToast('Document deleted', 'info');
        closeDocEditor();
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) loadSection(activeNav.dataset.section);
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    }
}

// ================================================================
// SHARED: DELETE
// ================================================================
window.deleteItem = async function(collectionName, id, name) {
    if (!confirm(`Delete "${name}" from ${collectionName}? This cannot be undone.`)) return;
    try {
        await window.firestoreDeleteDoc(window.firestoreDoc(db(), collectionName, id));
        showToast(`Deleted: ${name}`, 'info');
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) loadSection(activeNav.dataset.section);
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    }
};

// ================================================================
// BOOT
// ================================================================
// Attach login form handler immediately on script load
const loginForm = document.getElementById('login-form');
if (loginForm) loginForm.addEventListener('submit', handleLogin);

init();
