// GlitchRealm Admin Panel - Core Logic
// Requires Firebase globals set by index.html module script

const DEV_UIDS = new Set();
const FALLBACK_ADMIN_UIDS = [
    '6iZDTXC78aVwX22qrY43BOxDRLt1',
    'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
    'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
    '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
    'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
];

function applyUidListToDevSet(list) {
    DEV_UIDS.clear();
    (Array.isArray(list) ? list : []).forEach((uid) => {
        const value = String(uid || '').trim();
        if (value) DEV_UIDS.add(value);
    });
    return DEV_UIDS;
}

function buildFallbackUidList() {
    const merged = [];

    if (window.__ADMIN_UIDS__ instanceof Set) {
        window.__ADMIN_UIDS__.forEach((uid) => merged.push(String(uid || '').trim()));
    }

    if (window.GlitchRealmDev && window.GlitchRealmDev.DEV_UIDS) {
        try {
            Array.from(window.GlitchRealmDev.DEV_UIDS).forEach((uid) => {
                merged.push(String(uid || '').trim());
            });
        } catch (e) {
            // ignore and continue
        }
    }

    FALLBACK_ADMIN_UIDS.forEach((uid) => merged.push(uid));
    return merged.filter(Boolean);
}

async function loadAdminUids() {
    try {
        if (window.__ADMIN_UIDS__ instanceof Set && window.__ADMIN_UIDS__.size > 0) {
            return applyUidListToDevSet(Array.from(window.__ADMIN_UIDS__));
        }

        if (typeof window.loadAdminUids === 'function') {
            const setFromInline = await window.loadAdminUids();
            return applyUidListToDevSet(Array.from(setFromInline || []));
        }

        const endpoints = [
            '/.netlify/functions/admin-auth-uids',
            'https://glitchrealm.ca/.netlify/functions/admin-auth-uids',
            '/.netlify/functions/admin-uids',
            'https://glitchrealm.ca/.netlify/functions/admin-uids'
        ];
        let data = null;

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, { credentials: 'omit' });
                if (!res.ok) continue;
                data = await res.json();
                break;
            } catch (e) {
                // Try next endpoint
            }
        }

        if (!data) throw new Error('Failed to load admin UIDs');
        const list = Array.isArray(data?.uids) ? data.uids.map(v => String(v || '').trim()).filter(Boolean) : [];
        if (!list.length) {
            const fallback = buildFallbackUidList();
            applyUidListToDevSet(fallback);
            window.__ADMIN_UIDS__ = new Set(fallback);
            return DEV_UIDS;
        }

        applyUidListToDevSet(list);
        window.__ADMIN_UIDS__ = new Set(list);
    } catch (e) {
        const fallback = buildFallbackUidList();
        applyUidListToDevSet(fallback);
        window.__ADMIN_UIDS__ = new Set(fallback);
    }

    return DEV_UIDS;
}

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
    // Attach login handler only when inline onsubmit is not present.
    // The page currently uses an inline gate (UID pre-check) that calls handleLogin.
    const loginForm = document.getElementById('login-form');
    if (loginForm && !loginForm.hasAttribute('onsubmit')) {
        loginForm.addEventListener('submit', handleLogin);
    }
    await loadAdminUids();
    await waitForFirebase();
}

function handleLogin(e) {
    e.preventDefault();
    const uidInput = document.getElementById('login-uid').value.trim();
    const password = (document.getElementById('login-password') && document.getElementById('login-password').value) || '';
    const errorEl = document.getElementById('login-error');

    errorEl.style.display = 'none';

    if (!DEV_UIDS.has(uidInput)) {
        errorEl.textContent = 'Invalid admin UID.';
        errorEl.style.display = 'block';
        return;
    }

    // Require a password so we can create a Firebase auth session (needed for Firestore permissions)
    if (!password) {
        errorEl.textContent = 'Please enter your password.';
        errorEl.style.display = 'block';
        return;
    }

    (async () => {
        try {
            // Ensure Firebase helpers are ready
            await waitForFirebase();

            // Lookup the user's email from the users collection (doc id = uid)
            let email = null;
            try {
                const userDocSnap = await window.firestoreGetDoc(docRef('users', uidInput));
                if (userDocSnap && userDocSnap.exists && userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    email = userData && (userData.email || userData.emailAddress || userData.email_address);
                } else {
                    // Not found — we'll fallback to asking for email
                    email = null;
                }
            } catch (lookupErr) {
                // Firestore read may be blocked by security rules if unauthenticated.
                // Fall back to asking the admin for their email so we can sign in.
                console.warn('UID lookup failed (may be permission issue), falling back to email input', lookupErr);
                email = null;
            }

            // If we couldn't derive email from UID, require the email input from the user
            if (!email) {
                // Reveal email input field in the login form
                try { document.getElementById('login-email-field').style.display = 'block'; } catch(e){}
                const providedEmail = (document.getElementById('login-email') && document.getElementById('login-email').value.trim()) || '';
                if (!providedEmail) {
                    errorEl.textContent = 'Unable to look up email for this UID. Please enter the admin email below and try again.';
                    errorEl.style.display = 'block';
                    return;
                }
                email = providedEmail;
            }

            // Import signInWithEmailAndPassword dynamically (Firebase auth helper)
            const authMod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { signInWithEmailAndPassword, signOut } = authMod;

            // Attempt sign-in to establish Firebase auth session
            await signInWithEmailAndPassword(window.firebaseAuth, email, password);

            // Ensure current user is the expected admin
            const activeUser = window.currentFirebaseUser || (window.firebaseAuth && window.firebaseAuth.currentUser);
            if (!activeUser || !DEV_UIDS.has(activeUser.uid)) {
                // Unexpected: sign-in succeeded but user isn't in DEV_UIDS
                try { await signOut(window.firebaseAuth); } catch(e){}
                errorEl.textContent = 'Signed in but not authorized as admin.';
                errorEl.style.display = 'block';
                return;
            }

            // Authenticated and authorized — show admin UI
            currentUser = { uid: activeUser.uid, email: activeUser.email };
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('access-denied').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'flex';
            document.getElementById('admin-name').textContent = activeUser.displayName || 'Admin';
            document.getElementById('admin-avatar').textContent = (activeUser.displayName || 'A').charAt(0).toUpperCase();

            setupNavigation();
            loadDashboard();

        } catch (err) {
            console.error('Login error:', err);
            errorEl.textContent = err && err.message ? err.message : 'Authentication failed.';
            errorEl.style.display = 'block';
        }
    })();
}

// ================================================================
// HELPERS
// ================================================================
const db = () => window.firebaseDb;
const col = (...args) => window.firestoreCollection(db(), ...args);
const docRef = (...args) => window.firestoreDoc(db(), ...args);

function normalizePathSegments(path) {
    return String(path || '').split('/').map(s => s.trim()).filter(Boolean);
}

function colPath(path) {
    const segments = normalizePathSegments(path);
    if (segments.length === 0 || segments.length % 2 === 0) {
        throw new Error('Collection path must have an odd number of segments.');
    }
    return window.firestoreCollection(db(), ...segments);
}

function docPath(path, id) {
    const segments = normalizePathSegments(path);
    if (segments.length === 0 || segments.length % 2 === 0) {
        throw new Error('Collection path must have an odd number of segments before document ID.');
    }
    return window.firestoreDoc(db(), ...segments, id);
}

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
        'staff-status': 'Staff Status',
        maintenance: 'Maintenance',
        database: 'Database Browser',
        effects: 'Seasonal Effects'
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
    const customCollectionInput = document.getElementById('db-collection-custom');
    if (customCollectionInput) {
        customCollectionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadDbCollection();
            }
        });
    }

    // Banner form
    document.getElementById('banner-form').addEventListener('submit', handleBannerSubmit);

    // Doc editor modal
    document.getElementById('doc-editor-close').addEventListener('click', closeDocEditor);
    document.getElementById('doc-editor-cancel').addEventListener('click', closeDocEditor);
    document.getElementById('doc-editor-save').addEventListener('click', saveDocEdit);
    document.getElementById('doc-editor-delete').addEventListener('click', deleteDocFromEditor);

    // Staff status
    document.getElementById('staff-status-save-btn').addEventListener('click', saveStaffStatus);
    document.getElementById('staff-status-reset-btn').addEventListener('click', resetStaffStatus);
}

function loadSection(name) {
    switch (name) {
        case 'dashboard': loadDashboard(); break;
        case 'games': loadGames(); break;
        case 'news': loadNews(); break;
        case 'community': loadCommunity(); break;
        case 'banners': loadBanners(); break;
        case 'reports': loadReports(); break;
        case 'staff-status': loadStaffStatus(); break;
        case 'maintenance': loadMaintenance(); break;
        case 'effects': loadEffects(); break;
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
    const selectedCollection = document.getElementById('db-collection').value;
    const customCollection = (document.getElementById('db-collection-custom')?.value || '').trim();
    const collectionName = customCollection || selectedCollection;
    const container = document.getElementById('db-results');

    if (!collectionName) {
        container.innerHTML = '<div class="loading-placeholder">Select a collection first</div>';
        return;
    }

    container.innerHTML = '<div class="loading-placeholder">Loading...</div>';

    try {
        const snap = await window.firestoreGetDocs(window.firestoreQuery(colPath(collectionName), window.firestoreLimit(100)));
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
        const snap = await window.firestoreGetDoc(docPath(collectionName, id));
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
        await window.firestoreSetDoc(docPath(editorState.collection, editorState.id), data);
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
        await window.firestoreDeleteDoc(docPath(editorState.collection, editorState.id));
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
// STAFF STATUS
// ================================================================
const STAFF_STATUS_COLORS = {
    operational: { bg: '#00ff00', label: 'Operational' },
    degraded: { bg: '#ffaa00', label: 'Degraded' },
    down: { bg: '#ff0000', label: 'Down' }
};

async function loadStaffStatus() {
    const indicator = document.getElementById('staff-status-indicator');
    const currentText = document.getElementById('staff-status-current');
    const metaEl = document.getElementById('staff-status-meta');

    try {
        const snap = await window.firestoreGetDoc(window.firestoreDoc(db(), 'system', 'status'));
        if (!snap.exists()) {
            currentText.textContent = 'Not set';
            metaEl.textContent = '';
            document.getElementById('staff-status-select').value = 'operational';
            document.getElementById('staff-status-message').value = '';
            document.getElementById('staff-status-description').value = '';
            return;
        }
        const data = snap.data();
        const status = data.status || 'operational';
        const message = data.message || 'All Systems Operational';
        const description = data.description || '';
        const colors = STAFF_STATUS_COLORS[status] || STAFF_STATUS_COLORS.operational;

        indicator.style.background = colors.bg;
        indicator.style.boxShadow = `0 0 10px ${colors.bg}`;
        currentText.textContent = `${colors.label} — ${message}`;

        const parts = [];
        if (data.updatedBy) parts.push(`Updated by: ${data.updatedBy}`);
        if (data.updatedAt) parts.push(`at ${data.updatedAt}`);
        metaEl.textContent = parts.join(' ');

        // Populate form fields
        document.getElementById('staff-status-select').value = status;
        document.getElementById('staff-status-message').value = message;
        document.getElementById('staff-status-description').value = description;
    } catch (err) {
        console.error('Failed to load staff status:', err);
        currentText.textContent = 'Error loading status';
        metaEl.textContent = err.message;
    }
}

async function saveStaffStatus() {
    const statusVal = document.getElementById('staff-status-select').value;
    const message = document.getElementById('staff-status-message').value.trim();
    const description = document.getElementById('staff-status-description').value.trim();
    const savingEl = document.getElementById('staff-status-saving');

    if (!message) {
        showToast('Status message is required', 'error');
        return;
    }
    if (message.length > 100) {
        showToast('Message must be 100 characters or fewer', 'error');
        return;
    }

    savingEl.textContent = 'Saving...';
    savingEl.style.color = '';

    const payload = {
        status: statusVal,
        message: message,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser ? currentUser.uid : 'unknown'
    };

    if (description) {
        payload.description = description;
    }

    try {
        await window.firestoreSetDoc(window.firestoreDoc(db(), 'system', 'status'), payload);
        showToast(`Status updated to: ${STAFF_STATUS_COLORS[statusVal]?.label || statusVal}`, 'success');
        savingEl.textContent = '';
        loadStaffStatus();
    } catch (err) {
        console.error('Failed to save staff status:', err);
        showToast('Save failed: ' + err.message, 'error');
        savingEl.textContent = 'Save failed.';
        savingEl.style.color = '#ff4757';
    }
}

async function resetStaffStatus() {
    if (!confirm('Reset status to Operational?')) return;

    const payload = {
        status: 'operational',
        message: 'All Systems Operational',
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser ? currentUser.uid : 'unknown'
    };

    try {
        await window.firestoreSetDoc(window.firestoreDoc(db(), 'system', 'status'), payload);
        showToast('Status reset to Operational', 'success');
        loadStaffStatus();
    } catch (err) {
        showToast('Reset failed: ' + err.message, 'error');
    }
}

// ================================================================
// MAINTENANCE MODE
// ================================================================
async function loadMaintenance() {
    const badge = document.getElementById('maint-badge');
    try {
        const snap = await window.firestoreGetDoc(window.firestoreDoc(db(), 'site_config', 'maintenance'));
        if (!snap.exists()) {
            badge.textContent = 'NOT SET';
            badge.style.background = '#333'; badge.style.color = '#888';
            return;
        }
        const d = snap.data();
        document.getElementById('maint-enabled').checked = !!d.enabled;
        document.getElementById('maint-title').value = d.title || '';
        document.getElementById('maint-message').value = d.message || '';
        document.getElementById('maint-bypass').value = (d.allowedPaths || []).filter(p => p !== '/maintenance.html').join(', ');
        if (d.expiresAt) {
            const dt = d.expiresAt.toDate ? d.expiresAt.toDate() : new Date(d.expiresAt);
            const pad = n => String(n).padStart(2, '0');
            document.getElementById('maint-expires').value =
                `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        } else {
            document.getElementById('maint-expires').value = '';
        }
        if (d.enabled) {
            badge.textContent = 'ACTIVE'; badge.style.background = '#ff4757'; badge.style.color = '#fff';
        } else {
            badge.textContent = 'OFF'; badge.style.background = '#1a3a1a'; badge.style.color = '#00ff41';
        }
    } catch (err) {
        showToast('Failed to load maintenance settings', 'error');
    }
}

// Convert a local 'YYYY-MM-DDTHH:mm' wall time in an IANA time zone to a UTC Date
function findEpochForLocal(localIso, timeZone) {
    const [date, time] = (localIso || '').split('T');
    if (!date || !time) return null;
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const desired = { year, month, day, hour, minute };

    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    const getParts = (epoch) => {
        const parts = fmt.formatToParts(new Date(epoch));
        const map = {};
        for (const p of parts) map[p.type] = p.value;
        return {
            year: Number(map.year),
            month: Number(map.month),
            day: Number(map.day),
            hour: Number(map.hour),
            minute: Number(map.minute)
        };
    };

    // Search window: the day range ±24h to safely cover DST transitions
    const dayStartUtc = Date.UTC(year, month - 1, day, 0, 0);
    let lo = dayStartUtc - 24 * 3600 * 1000;
    let hi = dayStartUtc + 24 * 3600 * 1000 + 23 * 60 * 1000;

    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const p = getParts(mid);
        const cmp = (p.year - desired.year) || (p.month - desired.month) || (p.day - desired.day) || (p.hour - desired.hour) || (p.minute - desired.minute);
        if (cmp === 0) return new Date(mid);
        if (cmp < 0) lo = mid + 60000; else hi = mid - 60000;
    }
    return null;
}

document.getElementById('maint-save-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('maint-status');
    statusEl.textContent = 'Saving...';
    statusEl.style.color = '';

    const enabled = document.getElementById('maint-enabled').checked;
    const title = document.getElementById('maint-title').value.trim();
    const message = document.getElementById('maint-message').value.trim();
    const expiresVal = document.getElementById('maint-expires').value;
    const bypassPaths = document.getElementById('maint-bypass').value.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
        enabled,
        title: title || 'Under Maintenance',
        message: message || 'We are performing scheduled maintenance. Please check back shortly.',
        allowedPaths: ['/maintenance.html', ...bypassPaths],
        allowedUids: Array.from(DEV_UIDS),
        updatedAt: window.firestoreServerTimestamp(),
        updatedBy: currentUser ? currentUser.uid : null
    };

    if (expiresVal) {
        // Interpret the input as Calgary time (America/Edmonton) and convert to UTC
        try {
            const tz = 'America/Edmonton';
            const zoned = findEpochForLocal(expiresVal, tz);
            if (zoned) {
                payload.expiresAt = zoned;
            } else {
                // fallback: treat as local
                payload.expiresAt = new Date(expiresVal);
            }
        } catch (e) {
            payload.expiresAt = new Date(expiresVal);
        }
    } else {
        try {
            const mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            payload.expiresAt = mod.deleteField();
        } catch (e) { payload.expiresAt = null; }
    }

    try {
        await window.firestoreSetDoc(window.firestoreDoc(db(), 'site_config', 'maintenance'), payload, { merge: true });
        showToast(enabled ? 'Maintenance mode ENABLED' : 'Maintenance settings saved', enabled ? 'error' : 'success');
        statusEl.textContent = '';
        loadMaintenance();
    } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
        statusEl.textContent = 'Save failed.';
        statusEl.style.color = '#ff4757';
    }
});

document.getElementById('maint-clear-btn').addEventListener('click', async () => {
    try {
        await window.firestoreSetDoc(window.firestoreDoc(db(), 'site_config', 'maintenance'), {
            enabled: false,
            updatedAt: window.firestoreServerTimestamp(),
            updatedBy: currentUser ? currentUser.uid : null
        }, { merge: true });
        document.getElementById('maint-enabled').checked = false;
        document.getElementById('maint-title').value = '';
        document.getElementById('maint-message').value = '';
        document.getElementById('maint-expires').value = '';
        document.getElementById('maint-bypass').value = '';
        showToast('Maintenance mode disabled', 'success');
        loadMaintenance();
    } catch (err) {
        showToast('Failed to disable: ' + err.message, 'error');
    }
});

// ================================================================
// SEASONAL EFFECTS
// ================================================================
const FX_PRESETS = [
    { id: 'canada-day',   name: 'Canada Day',     emoji: '🍁', defaultStart: '07-01T00:00', defaultEnd: '07-02T23:59', color: '#ff0000', intensity: 'medium' },
    { id: 'christmas',    name: 'Christmas',       emoji: '❄️', defaultStart: '12-20T00:00', defaultEnd: '12-26T23:59', color: '#ffffff', intensity: 'medium' },
    { id: 'halloween',    name: 'Halloween',       emoji: '🎃', defaultStart: '10-28T00:00', defaultEnd: '11-01T02:00', color: '#ff8c00', intensity: 'medium' },
    { id: 'valentines',   name: "Valentine's Day", emoji: '❤️', defaultStart: '02-13T00:00', defaultEnd: '02-15T23:59', color: '#ff1493', intensity: 'low'    },
    { id: 'new-year',     name: "New Year's",      emoji: '🎆', defaultStart: '12-31T20:00', defaultEnd: '01-01T23:59', color: '#ffd700', intensity: 'high'   },
    { id: 'st-patricks',  name: "St. Patrick's",   emoji: '☘️', defaultStart: '03-17T00:00', defaultEnd: '03-18T23:59', color: '#00c853', intensity: 'medium' }
];

let effectsState = { presets: {}, custom: [] };

function normalizeEmojiList(emojis, fallbackEmoji) {
    const raw = Array.isArray(emojis) ? emojis : [];
    const clean = raw.map(v => String(v || '').trim()).filter(Boolean);
    if (clean.length) return clean;
    const fallback = String(fallbackEmoji || '').trim();
    return fallback ? [fallback] : ['✨'];
}

function collectEmojiValues(selector) {
    return Array.from(document.querySelectorAll(selector))
        .map(el => String(el.value || '').trim())
        .filter(Boolean);
}

function buildEmojiEditorRows(kind, key, emojis) {
    return emojis.map((emoji, index) => `
        <div class="fx-emoji-input-row" style="display:flex; gap:8px; align-items:center;">
            <input type="text" class="${kind === 'preset' ? 'fx-preset-emoji' : 'fx-custom-emoji-edit'}" ${kind === 'preset' ? `data-id="${key}"` : `data-idx="${key}"`} maxlength="4" value="${escapeHTML(emoji)}" style="width:40px;text-align:center;padding:4px;background:#111;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:1.1rem;">
            <button type="button" class="btn-danger btn-sm fx-remove-emoji" data-kind="${kind}" ${kind === 'preset' ? `data-id="${key}"` : `data-idx="${key}"`} title="Remove emoji" ${index === 0 && emojis.length === 1 ? 'disabled' : ''}>-</button>
        </div>
    `).join('');
}

function fxLocalToStr(dt) {
    if (!dt) return '';
    const d = dt.toDate ? dt.toDate() : new Date(dt);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function currentYear() { return new Date().getFullYear(); }

function defaultDatetime(mmddTime, yearOffset) {
    const y = currentYear() + (yearOffset || 0);
    return `${y}-${mmddTime}`;
}

async function loadEffects() {
    try {
        const snap = await window.firestoreGetDoc(window.firestoreDoc(db(), 'site_config', 'seasonal_effects'));
        if (snap.exists()) {
            const d = snap.data();
            effectsState.presets = d.presets || {};
            effectsState.custom = d.custom || [];
        } else {
            effectsState = { presets: {}, custom: [] };
        }
    } catch (err) {
        effectsState = { presets: {}, custom: [] };
    }
    renderPresets();
    renderCustomEffects();
}

function renderPresets() {
    const container = document.getElementById('effects-presets');
    container.innerHTML = FX_PRESETS.map(p => {
        const saved = effectsState.presets[p.id] || {};
        const enabled = saved.enabled || false;
        const startVal = saved.startAt ? fxLocalToStr(saved.startAt) : defaultDatetime(p.defaultStart);
        const endVal = saved.endAt ? fxLocalToStr(saved.endAt) : defaultDatetime(p.defaultEnd, p.id === 'new-year' ? 1 : 0);
        const intensity = saved.intensity || p.intensity;
        const emojis = normalizeEmojiList(saved.emojis, saved.emoji || p.emoji);
        const color = saved.color || p.color;

        return `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:12px;margin-bottom:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;min-width:170px;font-weight:700;">
                <input type="checkbox" class="fx-preset-enabled" data-id="${p.id}" ${enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent,#00fff9);">
                <span style="font-size:1.2rem;">${emojis[0]}</span> ${escapeHTML(p.name)}
            </label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;flex:1;min-width:0;">
                <input type="datetime-local" class="fx-preset-start" data-id="${p.id}" value="${startVal}" style="padding:4px 6px;background:#111;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:.82rem;font-family:Rajdhani,sans-serif;">
                <span style="color:#666;align-self:center;">→</span>
                <input type="datetime-local" class="fx-preset-end" data-id="${p.id}" value="${endVal}" style="padding:4px 6px;background:#111;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:.82rem;font-family:Rajdhani,sans-serif;">
                <select class="fx-preset-intensity" data-id="${p.id}" style="padding:4px 6px;background:#111;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:.82rem;font-family:Rajdhani,sans-serif;">
                    <option value="low" ${intensity==='low'?'selected':''}>Low</option>
                    <option value="medium" ${intensity==='medium'?'selected':''}>Medium</option>
                    <option value="high" ${intensity==='high'?'selected':''}>High</option>
                </select>
                <div class="fx-emoji-list" data-kind="preset" data-id="${p.id}" style="display:flex; flex-direction:column; gap:6px;">
                    ${buildEmojiEditorRows('preset', p.id, emojis)}
                </div>
                <button type="button" class="btn-secondary btn-sm fx-add-emoji" data-kind="preset" data-id="${p.id}" title="Add emoji">+</button>
                <input type="color" class="fx-preset-color" data-id="${p.id}" value="${color}" style="width:32px;height:28px;padding:0;border:1px solid #333;border-radius:4px;background:#111;cursor:pointer;" title="Particle color">
            </div>
        </div>`;
    }).join('');
}

function renderCustomEffects() {
    const container = document.getElementById('effects-custom-list');
    if (effectsState.custom.length === 0) {
        container.innerHTML = '<p style="color:#666;font-size:.85rem;">No custom effects yet.</p>';
        return;
    }
    container.innerHTML = effectsState.custom.map((c, i) => {
        const startVal = c.startAt ? fxLocalToStr(c.startAt) : '';
        const endVal = c.endAt ? fxLocalToStr(c.endAt) : '';
        const emojis = normalizeEmojiList(c.emojis, c.emoji || '✨');
        return `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:12px;margin-bottom:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;min-width:170px;font-weight:700;">
                <input type="checkbox" class="fx-custom-enabled" data-idx="${i}" ${c.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--accent,#00fff9);">
                <span style="font-size:1.2rem;">${emojis[0]}</span> ${escapeHTML(c.name || 'Untitled')}
            </label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;flex:1;min-width:0;align-items:center;">
                <input type="datetime-local" class="fx-custom-start" data-idx="${i}" value="${startVal}" style="padding:4px 6px;background:#111;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:.82rem;font-family:Rajdhani,sans-serif;">
                <span style="color:#666;">→</span>
                <input type="datetime-local" class="fx-custom-end" data-idx="${i}" value="${endVal}" style="padding:4px 6px;background:#111;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:.82rem;font-family:Rajdhani,sans-serif;">
                <select class="fx-custom-intensity" data-idx="${i}" style="padding:4px 6px;background:#111;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:.82rem;font-family:Rajdhani,sans-serif;">
                    <option value="low" ${c.intensity==='low'?'selected':''}>Low</option>
                    <option value="medium" ${c.intensity==='medium'?'selected':''}>Medium</option>
                    <option value="high" ${c.intensity==='high'?'selected':''}>High</option>
                </select>
                <div class="fx-emoji-list" data-kind="custom" data-idx="${i}" style="display:flex; flex-direction:column; gap:6px;">
                    ${buildEmojiEditorRows('custom', i, emojis)}
                </div>
                <button type="button" class="btn-secondary btn-sm fx-add-emoji" data-kind="custom" data-idx="${i}" title="Add emoji">+</button>
                <input type="color" class="fx-custom-color-edit" data-idx="${i}" value="${c.color || '#ffffff'}" style="width:32px;height:28px;padding:0;border:1px solid #333;border-radius:4px;background:#111;cursor:pointer;">
                <button class="btn-danger btn-sm" onclick="removeCustomEffect(${i})">✕</button>
            </div>
        </div>`;
    }).join('');
}

document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.fx-add-emoji');
    if (addBtn) {
        const kind = addBtn.dataset.kind;
        const keyAttr = kind === 'preset' ? 'id' : 'idx';
        const key = addBtn.dataset[keyAttr];
        const list = document.querySelector(`.fx-emoji-list[data-kind="${kind}"][data-${keyAttr}="${key}"]`);
        if (!list) return;
        const inputClass = kind === 'preset' ? 'fx-preset-emoji' : 'fx-custom-emoji-edit';
        list.insertAdjacentHTML('beforeend', `
            <div class="fx-emoji-input-row" style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="${inputClass}" data-${keyAttr}="${key}" maxlength="4" value="" style="width:40px;text-align:center;padding:4px;background:#111;border:1px solid #333;border-radius:4px;color:#e0e0e0;font-size:1.1rem;">
                <button type="button" class="btn-danger btn-sm fx-remove-emoji" data-kind="${kind}" data-${keyAttr}="${key}" title="Remove emoji">-</button>
            </div>
        `);
        return;
    }

    const removeBtn = e.target.closest('.fx-remove-emoji');
    if (removeBtn) {
        const row = removeBtn.closest('.fx-emoji-input-row');
        const list = removeBtn.closest('.fx-emoji-list');
        if (!row || !list) return;
        const rowCount = list.querySelectorAll('.fx-emoji-input-row').length;
        if (rowCount <= 1) return;
        row.remove();
        return;
    }

    const addNewBtn = e.target.closest('#fx-custom-add-emoji');
    if (addNewBtn) {
        const list = document.getElementById('fx-custom-emojis');
        if (!list) return;
        list.insertAdjacentHTML('beforeend', `
            <div class="fx-emoji-input-row" style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="fx-custom-emoji-new" maxlength="4" placeholder="✨" style="width:64px; text-align:center;">
                <button type="button" class="btn-danger btn-sm fx-remove-emoji-new" title="Remove emoji">-</button>
            </div>
        `);
        return;
    }

    const removeNewBtn = e.target.closest('.fx-remove-emoji-new');
    if (removeNewBtn) {
        const list = document.getElementById('fx-custom-emojis');
        if (!list) return;
        const row = removeNewBtn.closest('.fx-emoji-input-row');
        const rowCount = list.querySelectorAll('.fx-emoji-input-row').length;
        if (rowCount <= 1) return;
        if (row) row.remove();
    }
});

// Add custom effect to local state
document.getElementById('fx-add-custom-btn').addEventListener('click', () => {
    const name = document.getElementById('fx-custom-name').value.trim();
    const emojis = collectEmojiValues('.fx-custom-emoji-new');
    const startVal = document.getElementById('fx-custom-start').value;
    const endVal = document.getElementById('fx-custom-end').value;
    const intensity = document.getElementById('fx-custom-intensity').value;
    const color = document.getElementById('fx-custom-color').value;

    if (!name) return showToast('Give the effect a name', 'error');
    if (!emojis.length) return showToast('Pick at least one emoji or symbol', 'error');
    if (!startVal || !endVal) return showToast('Set start and end dates', 'error');

    const tz = 'America/Edmonton';
    effectsState.custom.push({
        name,
        emoji: emojis[0],
        emojis,
        enabled: true,
        startAt: findEpochForLocal(startVal, tz) || new Date(startVal),
        endAt: findEpochForLocal(endVal, tz) || new Date(endVal),
        intensity,
        color
    });

    document.getElementById('fx-custom-name').value = '';
    const newEmojiList = document.getElementById('fx-custom-emojis');
    if (newEmojiList) {
        newEmojiList.innerHTML = `
            <div class="fx-emoji-input-row" style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="fx-custom-emoji-new" maxlength="4" placeholder="✨" style="width:64px; text-align:center;">
                <button type="button" class="btn-danger btn-sm fx-remove-emoji-new" title="Remove emoji">-</button>
            </div>
        `;
    }
    document.getElementById('fx-custom-start').value = '';
    document.getElementById('fx-custom-end').value = '';
    renderCustomEffects();
    showToast('Effect added — click Save All to persist', 'info');
});

window.removeCustomEffect = function(idx) {
    effectsState.custom.splice(idx, 1);
    renderCustomEffects();
    showToast('Effect removed — click Save All to persist', 'info');
};

// Save all effects to Firestore
document.getElementById('fx-save-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('fx-status');
    statusEl.textContent = 'Saving...';
    statusEl.style.color = '';

    const tz = 'America/Edmonton';
    const presets = {};

    FX_PRESETS.forEach(p => {
        const el = (cls) => document.querySelector(`.${cls}[data-id="${p.id}"]`);
        const enabled = el('fx-preset-enabled')?.checked || false;
        const startVal = el('fx-preset-start')?.value || '';
        const endVal = el('fx-preset-end')?.value || '';
        const intensity = el('fx-preset-intensity')?.value || p.intensity;
        const emojis = normalizeEmojiList(collectEmojiValues(`.fx-preset-emoji[data-id="${p.id}"]`), p.emoji);
        const color = el('fx-preset-color')?.value || p.color;

        presets[p.id] = {
            enabled,
            emoji: emojis[0],
            emojis,
            color,
            intensity,
            startAt: startVal ? (findEpochForLocal(startVal, tz) || new Date(startVal)) : null,
            endAt: endVal ? (findEpochForLocal(endVal, tz) || new Date(endVal)) : null
        };
    });

    // Update custom effects from current DOM state
    effectsState.custom.forEach((c, i) => {
        const el = (cls) => document.querySelector(`.${cls}[data-idx="${i}"]`);
        c.enabled = el('fx-custom-enabled')?.checked ?? c.enabled;
        const sv = el('fx-custom-start')?.value;
        const ev = el('fx-custom-end')?.value;
        if (sv) c.startAt = findEpochForLocal(sv, tz) || new Date(sv);
        if (ev) c.endAt = findEpochForLocal(ev, tz) || new Date(ev);
        c.intensity = el('fx-custom-intensity')?.value || c.intensity;
        c.emojis = normalizeEmojiList(collectEmojiValues(`.fx-custom-emoji-edit[data-idx="${i}"]`), c.emoji || '✨');
        c.emoji = c.emojis[0];
        c.color = el('fx-custom-color-edit')?.value || c.color;
    });

    const payload = {
        presets,
        custom: effectsState.custom,
        updatedAt: window.firestoreServerTimestamp(),
        updatedBy: currentUser ? currentUser.uid : null
    };

    try {
        await window.firestoreSetDoc(window.firestoreDoc(db(), 'site_config', 'seasonal_effects'), payload);
        showToast('Seasonal effects saved!', 'success');
        statusEl.textContent = '';
        loadEffects();
    } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
        statusEl.textContent = 'Save failed.';
        statusEl.style.color = '#ff4757';
    }
});

// ================================================================
// BOOT
// ================================================================
// Only attach the submit listener if the form does NOT already have
// an inline onsubmit handler (handleLoginInline in index.html).
// Having both causes handleLogin to fire with an empty DEV_UIDS set
// before init() finishes loading UIDs.
const loginForm = document.getElementById('login-form');
if (loginForm && !loginForm.hasAttribute('onsubmit')) {
    loginForm.addEventListener('submit', handleLogin);
}

init();
