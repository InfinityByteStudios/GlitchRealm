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

function escapeAttr(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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
        reviews: 'Reviews',
        'staff-status': 'Staff Status',
        maintenance: 'Maintenance',
        database: 'Database Browser',
        effects: 'Seasonal Effects'
    };

    const sectionDescs = {
        dashboard: 'A quick look at what needs your attention.',
        games: 'Review, publish and manage submitted games.',
        news: 'Publish, unpublish and edit news articles.',
        community: 'Moderate, pin and edit community posts.',
        banners: 'Announcements shown at the top of every page.',
        reports: 'User reports on games and community posts.',
        reviews: 'Moderate game reviews, tune the content filter and track review activity.',
        'staff-status': 'The system status shown on the Support page.',
        maintenance: 'Temporarily redirect visitors to a maintenance page.',
        database: 'Browse and edit raw Firestore documents.',
        effects: 'Falling particle effects shown across the site.'
    };
    const sectionDesc = document.getElementById('section-desc');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.section;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(`sec-${target}`).classList.add('active');
            sectionTitle.textContent = sectionNames[target] || target;
            if (sectionDesc) sectionDesc.textContent = sectionDescs[target] || '';

            // Close mobile sidebar
            sidebar.classList.remove('open');
            window.scrollTo(0, 0);

            // Load section data
            loadSection(target);
        });
    });

    // Mobile toggle
    document.getElementById('mobile-toggle').addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    if (backdrop) backdrop.addEventListener('click', () => sidebar.classList.remove('open'));

    // Dashboard shortcuts (stat cards / "View all" links)
    document.querySelectorAll('[data-goto]').forEach(el => {
        el.addEventListener('click', () => {
            const nav = document.querySelector(`.nav-item[data-section="${el.dataset.goto}"]`);
            if (nav) nav.click();
        });
    });

    // Close the document editor with Escape or by clicking outside it
    const docModal = document.getElementById('doc-editor-modal');
    docModal.addEventListener('click', (e) => { if (e.target === docModal) closeDocEditor(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && docModal.style.display !== 'none') closeDocEditor();
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

    // Reviews section
    document.querySelectorAll('#reviews-subtabs .subtab').forEach(btn => {
        btn.addEventListener('click', () => switchReviewsSubtab(btn.dataset.subtab));
    });
    document.querySelectorAll('#reviews-status-tabs .filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#reviews-status-tabs .filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderReviewsQueue();
        });
    });
    document.getElementById('reviews-search').addEventListener('input', debounce(() => renderReviewsQueue(), 300));
    document.getElementById('reviews-reload-btn').addEventListener('click', async () => {
        reviewsState.loaded = false;
        await loadReviewsData(true);
        renderReviewsQueue();
        showToast('Reviews refreshed', 'info');
    });
    document.getElementById('mod-save-btn').addEventListener('click', saveModerationConfig);
    document.getElementById('mod-test-btn').addEventListener('click', runFilterTest);
    bindModerationListEditors();

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
        case 'reviews': loadReviewsSection(); break;
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

        setNavCount('nav-count-games', pendingGames.length);
        setNavCount('nav-count-reports', totalReports);

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

function setNavCount(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count > 99 ? '99+' : String(count);
    el.hidden = !count;
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
                    ${g.playUrl ? ' · <a href="' + escapeHTML(g.playUrl) + '" target="_blank" rel="noopener" class="inline-link">Play ↗</a>' : ''}
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

        const typeIcons = { info: 'ℹ️', warning: '⚠️', error: '🚨', success: '✅' };

        container.innerHTML = items.map(b => `
            <div class="list-item ${b.active ? 'is-active' : 'is-inactive'}">
                <div class="list-item-icon tone-${typeIcons[b.type] ? b.type : 'info'}">
                    ${typeIcons[b.type] || 'ℹ️'}
                </div>
                <div class="list-item-body">
                    <div class="list-item-title">${escapeHTML(b.message)}</div>
                    <div class="list-item-sub">
                        ${b.active ? '<span class="pill pill-success">Active</span>' : '<span class="pill pill-muted">Inactive</span>'}
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

        container.innerHTML = allReports.map(r => `
            <div class="list-item report-${escapeHTML(r.status || 'unknown')}">
                <div class="list-item-icon tone-${r.type === 'game' ? 'info' : 'community'}">
                    ${r.type === 'game' ? '🎮' : '💬'}
                </div>
                <div class="list-item-body">
                    <div class="list-item-title">${escapeHTML(r.reason || 'No reason given')}</div>
                    <div class="list-item-sub">
                        <span class="status-badge status-${r.status === 'open' ? 'draft' : r.status === 'closed' ? 'archived' : 'published'}">${escapeHTML(r.status || 'unknown')}</span>
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
            <p class="db-meta"><strong>${docs.length}</strong> document${docs.length === 1 ? '' : 's'} in <code>${escapeHTML(collectionName)}</code> · Click an ID to view or edit${keys.length > displayKeys.length ? ` · Showing ${displayKeys.length} of ${keys.length} fields` : ''}</p>
            <div class="db-table-wrap">
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
                            <td class="doc-id" title="${escapeHTML(d.id)}" onclick="editDoc('${collectionName}','${d.id}')">${d.id.length > 16 ? d.id.slice(0, 16) + '...' : d.id}</td>
                            ${displayKeys.map(k => {
                                const val = d.data[k];
                                let display = '';
                                if (val === null || val === undefined) display = '<span class="db-null">null</span>';
                                else if (val?.toDate) display = formatDate(val);
                                else if (typeof val === 'boolean') display = val ? '<span class="db-true">true</span>' : '<span class="db-false">false</span>';
                                else if (Array.isArray(val)) display = `<span class="db-obj">[${val.length}]</span>`;
                                else if (typeof val === 'object') display = '<span class="db-obj">{…}</span>';
                                else display = escapeHTML(truncate(String(val), 40));
                                return `<td>${display}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            </div>
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
            badge.textContent = 'Not set';
            badge.className = 'pill pill-muted';
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
            badge.textContent = 'Live — visitors are redirected'; badge.className = 'pill pill-danger';
        } else {
            badge.textContent = 'Off'; badge.className = 'pill pill-success';
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
        <div class="fx-emoji-input-row">
            <input type="text" class="${kind === 'preset' ? 'fx-preset-emoji' : 'fx-custom-emoji-edit'} fx-emoji-input" ${kind === 'preset' ? `data-id="${key}"` : `data-idx="${key}"`} maxlength="4" value="${escapeHTML(emoji)}">
            <button type="button" class="btn-icon fx-remove-emoji" data-kind="${kind}" ${kind === 'preset' ? `data-id="${key}"` : `data-idx="${key}"`} title="Remove emoji" ${index === 0 && emojis.length === 1 ? 'disabled' : ''}>−</button>
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
        <div class="fx-row ${enabled ? 'is-on' : ''}">
            <label class="fx-row-head">
                <span class="switch">
                    <input type="checkbox" class="fx-preset-enabled" data-id="${p.id}" ${enabled ? 'checked' : ''}>
                    <span class="switch-track" aria-hidden="true"></span>
                </span>
                <span class="fx-row-emoji">${escapeHTML(emojis[0])}</span>
                <span class="fx-row-name">${escapeHTML(p.name)}</span>
            </label>
            <div class="fx-row-fields">
                <div class="fx-field fx-field-dates">
                    <span class="fx-field-label">Runs</span>
                    <div class="fx-dates">
                        <input type="datetime-local" class="fx-preset-start fx-input" data-id="${p.id}" value="${startVal}" aria-label="${escapeHTML(p.name)} start">
                        <span class="fx-arrow">→</span>
                        <input type="datetime-local" class="fx-preset-end fx-input" data-id="${p.id}" value="${endVal}" aria-label="${escapeHTML(p.name)} end">
                    </div>
                </div>
                <div class="fx-field">
                    <span class="fx-field-label">Intensity</span>
                    <select class="fx-preset-intensity fx-input" data-id="${p.id}">
                        <option value="low" ${intensity==='low'?'selected':''}>Low</option>
                        <option value="medium" ${intensity==='medium'?'selected':''}>Medium</option>
                        <option value="high" ${intensity==='high'?'selected':''}>High</option>
                    </select>
                </div>
                <div class="fx-field">
                    <span class="fx-field-label">Color</span>
                    <input type="color" class="fx-preset-color color-input" data-id="${p.id}" value="${color}" title="Particle color">
                </div>
                <div class="fx-field">
                    <span class="fx-field-label">Emojis</span>
                    <div class="fx-emoji-editor">
                        <div class="fx-emoji-list" data-kind="preset" data-id="${p.id}">
                            ${buildEmojiEditorRows('preset', p.id, emojis)}
                        </div>
                        <button type="button" class="btn-icon fx-add-emoji" data-kind="preset" data-id="${p.id}" title="Add emoji">+</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderCustomEffects() {
    const container = document.getElementById('effects-custom-list');
    if (effectsState.custom.length === 0) {
        container.innerHTML = '<p class="empty-inline">No custom effects yet. Add one below.</p>';
        return;
    }
    container.innerHTML = effectsState.custom.map((c, i) => {
        const startVal = c.startAt ? fxLocalToStr(c.startAt) : '';
        const endVal = c.endAt ? fxLocalToStr(c.endAt) : '';
        const emojis = normalizeEmojiList(c.emojis, c.emoji || '✨');
        return `
        <div class="fx-row ${c.enabled ? 'is-on' : ''}">
            <div class="fx-row-top">
                <label class="fx-row-head">
                    <span class="switch">
                        <input type="checkbox" class="fx-custom-enabled" data-idx="${i}" ${c.enabled ? 'checked' : ''}>
                        <span class="switch-track" aria-hidden="true"></span>
                    </span>
                    <span class="fx-row-emoji">${escapeHTML(emojis[0])}</span>
                    <span class="fx-row-name">${escapeHTML(c.name || 'Untitled')}</span>
                </label>
                <button class="btn-danger btn-sm" onclick="removeCustomEffect(${i})" title="Remove effect">Remove</button>
            </div>
            <div class="fx-row-fields">
                <div class="fx-field fx-field-dates">
                    <span class="fx-field-label">Runs</span>
                    <div class="fx-dates">
                        <input type="datetime-local" class="fx-custom-start fx-input" data-idx="${i}" value="${startVal}" aria-label="Start">
                        <span class="fx-arrow">→</span>
                        <input type="datetime-local" class="fx-custom-end fx-input" data-idx="${i}" value="${endVal}" aria-label="End">
                    </div>
                </div>
                <div class="fx-field">
                    <span class="fx-field-label">Intensity</span>
                    <select class="fx-custom-intensity fx-input" data-idx="${i}">
                        <option value="low" ${c.intensity==='low'?'selected':''}>Low</option>
                        <option value="medium" ${c.intensity==='medium'?'selected':''}>Medium</option>
                        <option value="high" ${c.intensity==='high'?'selected':''}>High</option>
                    </select>
                </div>
                <div class="fx-field">
                    <span class="fx-field-label">Color</span>
                    <input type="color" class="fx-custom-color-edit color-input" data-idx="${i}" value="${c.color || '#ffffff'}" title="Particle color">
                </div>
                <div class="fx-field">
                    <span class="fx-field-label">Emojis</span>
                    <div class="fx-emoji-editor">
                        <div class="fx-emoji-list" data-kind="custom" data-idx="${i}">
                            ${buildEmojiEditorRows('custom', i, emojis)}
                        </div>
                        <button type="button" class="btn-icon fx-add-emoji" data-kind="custom" data-idx="${i}" title="Add emoji">+</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

document.addEventListener('change', (e) => {
    if (e.target.matches('.fx-preset-enabled, .fx-custom-enabled')) {
        const row = e.target.closest('.fx-row');
        if (row) row.classList.toggle('is-on', e.target.checked);
    }
});

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
            <div class="fx-emoji-input-row">
                <input type="text" class="${inputClass} fx-emoji-input" data-${keyAttr}="${key}" maxlength="4" value="">
                <button type="button" class="btn-icon fx-remove-emoji" data-kind="${kind}" data-${keyAttr}="${key}" title="Remove emoji">−</button>
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
            <div class="fx-emoji-input-row">
                <input type="text" class="fx-custom-emoji-new fx-emoji-input" maxlength="4" placeholder="✨">
                <button type="button" class="btn-icon fx-remove-emoji-new" title="Remove emoji">−</button>
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
            <div class="fx-emoji-input-row">
                <input type="text" class="fx-custom-emoji-new fx-emoji-input" maxlength="4" placeholder="✨">
                <button type="button" class="btn-icon fx-remove-emoji-new" title="Remove emoji">−</button>
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
// REVIEWS
// ================================================================
const REVIEWS_BLOCKED_SET = ['blocked', 'rejected'];

let reviewsState = {
    loaded: false,
    reviews: [],
    subtab: 'queue',
    modLoaded: false,
    modLoading: false,
    modState: null
};

function loadReviewsSection() {
    switchReviewsSubtab(reviewsState.subtab || 'queue');
}

function switchReviewsSubtab(name) {
    if (!['queue', 'filters', 'stats'].includes(name)) name = 'queue';
    reviewsState.subtab = name;

    document.querySelectorAll('#reviews-subtabs .subtab').forEach(btn => {
        const active = btn.dataset.subtab === name;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('#sec-reviews .subtab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`reviews-panel-${name}`);
    if (panel) panel.classList.add('active');

    if (name === 'queue') {
        loadReviewsData().then(renderReviewsQueue);
    } else if (name === 'filters') {
        loadModerationConfig();
    } else if (name === 'stats') {
        loadReviewsData().then(renderReviewsStats);
    }
}

function loadReviewsData(force) {
    if (reviewsState.loaded && !force) return Promise.resolve();
    if (!reviewsState.loadPromise) {
        reviewsState.loadPromise = (async () => {
            try {
                const snap = await window.firestoreGetDocs(col('reviews'));
                const items = [];
                snap.forEach(d => items.push({ id: d.id, ...d.data() }));
                items.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
                reviewsState.reviews = items;
                reviewsState.loaded = true;
                setNavCount('nav-count-reviews', items.filter(r => r.moderationStatus === 'pending').length);
            } catch (err) {
                console.error('Failed to load reviews:', err);
                showToast('Failed to load reviews: ' + err.message, 'error');
                const container = document.getElementById('reviews-list');
                if (container) container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(err.message)}</p></div>`;
            } finally {
                reviewsState.loadPromise = null;
            }
        })();
    }
    return reviewsState.loadPromise;
}

function updateReviewCounts() {
    const rs = reviewsState.reviews;
    const pending = rs.filter(r => r.moderationStatus === 'pending').length;
    const blocked = rs.filter(r => REVIEWS_BLOCKED_SET.includes(r.moderationStatus)).length;
    const approved = rs.filter(r => r.moderationStatus === 'approved').length;
    document.getElementById('revcount-pending').textContent = pending;
    document.getElementById('revcount-blocked').textContent = blocked;
    document.getElementById('revcount-approved').textContent = approved;
    document.getElementById('revcount-all').textContent = rs.length;
}

function renderStars(rating) {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<span class="star ${i <= r ? 'star-on' : 'star-off'}">★</span>`;
    }
    return `<span class="stars" aria-label="${r} out of 5 stars" title="${r} out of 5">${html}</span>`;
}

function reviewStatusBadge(status) {
    const cls = status === 'approved' ? 'status-published'
        : status === 'pending' ? 'status-draft'
        : 'status-archived';
    return `<span class="status-badge ${cls}">${escapeHTML(status || 'unknown')}</span>`;
}

function reviewerAvatarHTML(r) {
    const name = r.userDisplayName || 'Guest';
    const initial = escapeHTML(name.charAt(0).toUpperCase());
    if (r.authorPhotoUrl) {
        const safeUrl = escapeAttr(r.authorPhotoUrl);
        return `<img class="review-avatar" src="${safeUrl}" alt="" loading="lazy" onerror="this.style.display='none'">`;
    }
    return `<div class="review-avatar review-avatar-initial">${initial}</div>`;
}

function reviewAiVerdictHTML(r) {
    const v = r.aiVerdict;
    if (!v || !v.verdict) return '';
    const cls = v.verdict === 'approve' ? 'pill-success' : v.verdict === 'block' ? 'pill-danger' : 'pill-warning';
    const reason = v.reason ? ` — ${escapeHTML(String(v.reason))}` : '';
    return `<span class="pill ${cls}" title="AI moderation verdict">AI: ${escapeHTML(v.verdict)}${reason}</span>`;
}

function renderReviewsQueue() {
    if (!reviewsState.loaded) {
        document.getElementById('reviews-list').innerHTML = '<div class="loading-placeholder">Loading…</div>';
        return;
    }

    updateReviewCounts();

    const activeBtn = document.querySelector('#reviews-status-tabs .filter-tab.active');
    const statusFilter = activeBtn ? activeBtn.dataset.status : 'pending';
    const search = (document.getElementById('reviews-search')?.value || '').toLowerCase().trim();

    let items = reviewsState.reviews;
    if (statusFilter === 'pending') items = items.filter(r => r.moderationStatus === 'pending');
    else if (statusFilter === 'blocked') items = items.filter(r => REVIEWS_BLOCKED_SET.includes(r.moderationStatus));
    else if (statusFilter === 'approved') items = items.filter(r => r.moderationStatus === 'approved');

    if (search) {
        items = items.filter(r =>
            (r.gameName || '').toLowerCase().includes(search) ||
            (r.userDisplayName || '').toLowerCase().includes(search)
        );
    }

    const container = document.getElementById('reviews-list');
    const line = document.getElementById('reviews-count-line');
    if (line) {
        line.textContent = statusFilter === 'all'
            ? `Showing ${items.length} of ${reviewsState.reviews.length} reviews`
            : `Showing ${items.length} review${items.length === 1 ? '' : 's'}`;
    }

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No reviews found</h3><p>Try a different status filter or search.</p></div>';
        return;
    }

    container.innerHTML = items.map(r => {
        const guest = r.isGuest === true;
        const comment = (r.comment || '').trim();
        const metaBits = [];
        if (r.moderationSource) metaBits.push(`Source: ${escapeHTML(r.moderationSource)}`);
        if (r.authProvider) metaBits.push(`Auth: ${escapeHTML(r.authProvider)}`);
        if (guest) metaBits.push('Guest reviewer');

        return `
        <div class="review-card" data-id="${r.id}">
            <div class="review-card-top">
                <div class="review-card-title">
                    <span class="item-card-title">${escapeHTML(r.gameName || r.gameId || 'Unknown game')}</span>
                    ${reviewStatusBadge(r.moderationStatus)}
                </div>
                <div class="review-card-stars">${renderStars(r.rating)} <span class="review-time">${formatDate(r.timestamp)}</span></div>
            </div>
            ${comment ? `<div class="review-comment">${escapeHTML(comment)}</div>` : '<div class="review-comment review-comment-empty">Rating-only review (no comment)</div>'}
            <div class="review-reviewer">
                ${reviewerAvatarHTML(r)}
                <div class="review-reviewer-info">
                    <span class="review-reviewer-name">${escapeHTML(r.userDisplayName || 'Unknown')}${guest ? ' <span class="pill pill-guest">Guest</span>' : ''}</span>
                    <span class="review-reviewer-sub">${metaBits.join(' · ')}</span>
                </div>
            </div>
            ${(r.reason || r.moderationSource || r.aiVerdict) ? `
            <div class="review-modmeta">
                ${r.reason ? `<div class="review-modmeta-line"><span class="review-modmeta-label">Reason</span>${escapeHTML(r.reason)}</div>` : ''}
                ${r.aiVerdict && r.aiVerdict.verdict ? `<div class="review-modmeta-line"><span class="review-modmeta-label">AI verdict</span>${reviewAiVerdictHTML(r)}</div>` : ''}
            </div>` : ''}
            <div class="item-card-actions">
                ${r.moderationStatus !== 'approved' ? `<button class="btn-success btn-sm" onclick="reviewSetStatus('${r.id}','approved')">Approve</button>` : ''}
                ${r.moderationStatus !== 'rejected' ? `<button class="btn-warn btn-sm" onclick="reviewSetStatus('${r.id}','rejected')">Reject</button>` : ''}
                ${r.moderationStatus !== 'blocked' ? `<button class="btn-danger btn-sm" onclick="reviewSetStatus('${r.id}','blocked')">Block</button>` : ''}
                <button class="btn-danger btn-sm" onclick="reviewDelete('${r.id}')">Delete</button>
            </div>
        </div>`;
    }).join('');
}

window.reviewSetStatus = async function(id, status) {
    const idx = reviewsState.reviews.findIndex(r => r.id === id);
    if (idx === -1) return showToast('Review not found', 'error');

    const labels = { approved: 'approved', rejected: 'rejected (hidden, marked as manually rejected)', blocked: 'blocked' };
    if (!confirm(`Set this review to "${labels[status] || status}"?`)) return;

    const original = reviewsState.reviews[idx].moderationStatus;

    // Optimistic update
    reviewsState.reviews[idx] = { ...reviewsState.reviews[idx], moderationStatus: status };
    renderReviewsQueue();

    try {
        await window.firestoreUpdateDoc(docRef('reviews', id), {
            moderationStatus: status,
            moderatedAt: window.firestoreServerTimestamp(),
            moderatedBy: currentUser ? currentUser.uid : null
        });
        setNavCount('nav-count-reviews', reviewsState.reviews.filter(r => r.moderationStatus === 'pending').length);
        showToast(`Review ${status}`, 'success');
    } catch (err) {
        // Revert on failure
        reviewsState.reviews[idx] = { ...reviewsState.reviews[idx], moderationStatus: original };
        renderReviewsQueue();
        showToast('Failed: ' + err.message, 'error');
    }
};

window.reviewDelete = async function(id) {
    if (!confirm('Delete this review permanently? This cannot be undone.')) return;
    const idx = reviewsState.reviews.findIndex(r => r.id === id);
    if (idx === -1) return showToast('Review not found', 'error');

    const removed = reviewsState.reviews[idx];

    // Optimistic update
    reviewsState.reviews.splice(idx, 1);
    renderReviewsQueue();

    try {
        await window.firestoreDeleteDoc(docRef('reviews', id));
        setNavCount('nav-count-reviews', reviewsState.reviews.filter(r => r.moderationStatus === 'pending').length);
        showToast('Review deleted', 'info');
    } catch (err) {
        // Revert on failure
        reviewsState.reviews.splice(idx, 0, removed);
        renderReviewsQueue();
        showToast('Delete failed: ' + err.message, 'error');
    }
};

// ----------------------------------------------------------------
// Filter word manager (moderation_config/filters)
// ----------------------------------------------------------------
const MOD_LIST_FIELDS = [
    { key: 'bannedWords', placeholder: 'e.g. badword' },
    { key: 'suspiciousWords', placeholder: 'e.g. suspiciousword' },
    { key: 'bannedPatterns', placeholder: 'e.g. b\\s*[^a-z]*\\s*a\\s*[^a-z]*\\s*d' }
];

async function loadModerationConfig() {
    if (reviewsState.modLoading) return;
    reviewsState.modLoading = true;
    const container = document.getElementById('reviews-panel-filters');
    try {
        const snap = await window.firestoreGetDoc(window.firestoreDoc(db(), 'moderation_config', 'filters'));
        const d = snap.exists() ? snap.data() : {};
        reviewsState.modState = {
            bannedWords: (d.bannedWords || []).map(String),
            suspiciousWords: (d.suspiciousWords || []).map(String),
            bannedPatterns: (d.bannedPatterns || []).map(String),
            aiModerationEnabled: d.aiModerationEnabled !== false,
            existed: snap.exists(),
            base: d
        };
        reviewsState.modLoaded = true;
        renderModerationEditor();
    } catch (err) {
        console.error('Failed to load moderation config:', err);
        showToast('Failed to load filter config: ' + err.message, 'error');
    } finally {
        reviewsState.modLoading = false;
    }
}

function renderModerationEditor() {
    const s = reviewsState.modState;
    if (!s) return;

    document.getElementById('mod-ai-enabled').checked = !!s.aiModerationEnabled;

    MOD_LIST_FIELDS.forEach(f => {
        const wrap = document.querySelector(`.word-rows[data-field="${f.key}"]`);
        if (!wrap) return;
        const values = s[f.key] || [];
        wrap.innerHTML = values.length === 0
            ? '<p class="empty-inline">Empty — leave blank to rely on the built-in defaults.</p>'
            : values.map((v, i) => `
                <div class="word-row">
                    <input type="text" class="mod-word-input mono-input" data-field="${f.key}" data-idx="${i}" value="${escapeAttr(v)}" placeholder="${f.placeholder}" spellcheck="false" autocomplete="off">
                    <button type="button" class="btn-icon mod-remove-word" data-field="${f.key}" data-idx="${i}" title="Remove">&times;</button>
                </div>`).join('');
    });
}

function bindModerationListEditors() {
    // Live-update state as rows are edited
    document.getElementById('reviews-panel-filters').addEventListener('input', (e) => {
        if (!e.target.matches('.mod-word-input')) return;
        const s = reviewsState.modState;
        if (!s) return;
        const { field, idx } = e.target.dataset;
        const list = s[field];
        if (Array.isArray(list)) list[Number(idx)] = e.target.value;
    });

    document.getElementById('reviews-panel-filters').addEventListener('click', (e) => {
        const s = reviewsState.modState;
        if (!s) return;

        const addBtn = e.target.closest('.mod-add-word');
        if (addBtn) {
            s[addBtn.dataset.field].push('');
            renderModerationEditor();
            const rows = document.querySelectorAll(`.word-rows[data-field="${addBtn.dataset.field}"] .mod-word-input`);
            if (rows.length) rows[rows.length - 1].focus();
            return;
        }

        const removeBtn = e.target.closest('.mod-remove-word');
        if (removeBtn) {
            const { field, idx } = removeBtn.dataset;
            s[field].splice(Number(idx), 1);
            renderModerationEditor();
        }
    });
}

async function saveModerationConfig() {
    const s = reviewsState.modState;
    if (!s) return showToast('Filter config not loaded yet', 'error');

    // Collect current values from state (inputs already sync into state on input)
    const payload = {
        bannedWords: s.bannedWords.map(v => String(v || '').trim()).filter(Boolean),
        suspiciousWords: s.suspiciousWords.map(v => String(v || '').trim()).filter(Boolean),
        bannedPatterns: s.bannedPatterns.map(v => String(v || '').trim()).filter(Boolean),
        aiModerationEnabled: document.getElementById('mod-ai-enabled').checked,
        updatedAt: window.firestoreServerTimestamp(),
        updatedBy: currentUser ? currentUser.uid : null
    };

    // Validate regex patterns so a typo never breaks the server filter
    for (const p of payload.bannedPatterns) {
        try { new RegExp(p, 'i'); } catch (e) {
            return showToast(`Invalid regex pattern: "${p}" — ${e.message}`, 'error');
        }
    }

    // Preserve any unknown fields already stored in the document
    const base = s.base || {};
    Object.keys(base).forEach(k => {
        if (!(k in payload) && !['updatedAt', 'updatedBy'].includes(k)) payload[k] = base[k];
    });

    const statusEl = document.getElementById('mod-save-status');
    statusEl.textContent = 'Saving…';

    try {
        await window.firestoreSetDoc(window.firestoreDoc(db(), 'moderation_config', 'filters'), payload);
        s.bannedWords = [...payload.bannedWords];
        s.suspiciousWords = [...payload.suspiciousWords];
        s.bannedPatterns = [...payload.bannedPatterns];
        s.aiModerationEnabled = payload.aiModerationEnabled;
        s.existed = true;
        s.base = { ...payload };
        renderModerationEditor();
        statusEl.textContent = '';
        showToast('Filter configuration saved', 'success');
    } catch (err) {
        console.error('Failed to save moderation config:', err);
        statusEl.textContent = 'Save failed.';
        statusEl.style.color = '#ff4757';
        showToast('Save failed: ' + err.message, 'error');
    }
}

// Offline approximation of the server-side normalization used by
// netlify/functions/lib/content-filter.mjs — good enough to preview
// how a sample would be classified.
const MOD_LOOKALIKES = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g',
    '@': 'a', '$': 's', '!': 'i', '|': 'i', '+': 't', '€': 'e', '£': 'l', '¥': 'y',
    'а': 'a', 'в': 'b', 'е': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p',
    'с': 'c', 'т': 't', 'у': 'y', 'х': 'x', 'і': 'i', 'ѕ': 's', 'ԁ': 'd', 'ј': 'j',
    'α': 'a', 'β': 'b', 'γ': 'g', 'ε': 'e', 'ι': 'i', 'κ': 'k', 'ο': 'o', 'ρ': 'p',
    'σ': 's', 'τ': 't', 'υ': 'u', 'χ': 'x', 'ɡ': 'g', 'ℓ': 'l', '０': '0'
};

function modNormalize(raw, { compact = false } = {}) {
    let s = String(raw || '').toLowerCase();
    // Strip diacritics / unicode lookalike forms
    s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    // Strip zero-width chars, soft hyphens, bidi controls
    s = s.replace(/[\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2064\u206a-\u206f\ufeff]/g, '');
    // Map lookalikes (cyrillic/greek homoglyphs, leetspeak digits/symbols)
    s = Array.from(s).map(ch => MOD_LOOKALIKES[ch] || ch).join('');
    // Collapse repeated letters ("baaaad" -> "bad")
    s = s.replace(/([a-z])\1+/g, '$1');
    if (compact) {
        // Defeat separator tricks ("b.a.d", "b a d")
        return s.replace(/[^a-z0-9]/g, '');
    }
    // Keep word boundaries, drop remaining punctuation tricks
    return s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function runFilterTest() {
    const s = reviewsState.modState;
    const resultEl = document.getElementById('mod-test-result');
    if (!s) return showToast('Filter config not loaded yet', 'error');

    const raw = document.getElementById('mod-test-input').value;
    if (!raw.trim()) {
        resultEl.className = 'mod-test-result';
        resultEl.textContent = '';
        return showToast('Enter some sample text first', 'error');
    }

    const spaced = modNormalize(raw);
    const compact = modNormalize(raw, { compact: true });

    const listHit = (list, kind) => {
        for (const entry of list) {
            const w = String(entry || '').trim().toLowerCase();
            if (!w) continue;
            const targets = compact.includes(modNormalize(w, { compact: true })) ? ['compact'] : [];
            if (spaced.includes(modNormalize(w))) targets.push('spaced');
            if (targets.length) return { kind, entry: w, via: targets[0] };
        }
        return null;
    };

    let hit = listHit(s.bannedWords, 'banned word');
    let verdict = hit ? 'blocked' : null;
    let reason = hit ? `Contains banned word "${hit.entry}"` : null;

    if (!verdict) {
        for (const p of s.bannedPatterns) {
            const src = String(p || '').trim();
            if (!src) continue;
            try {
                if (new RegExp(src, 'i').test(spaced) || new RegExp(src, 'i').test(compact)) {
                    verdict = 'blocked';
                    reason = `Matches banned pattern /${src}/i`;
                    break;
                }
            } catch (e) { /* invalid pattern — server would reject it at save time */ }
        }
    }

    if (!verdict) {
        hit = listHit(s.suspiciousWords, 'suspicious word');
        if (hit) {
            verdict = 'pending';
            reason = `Contains suspicious word "${hit.entry}" — queued for review`;
        }
    }

    if (!verdict) {
        verdict = 'approved';
        reason = s.aiModerationEnabled
            ? 'No filter match — would still go through AI moderation'
            : 'No filter match';
    }

    const cls = verdict === 'blocked' ? 'pill-danger' : verdict === 'pending' ? 'pill-warning' : 'pill-success';
    resultEl.className = `mod-test-result`;
    resultEl.innerHTML = `<span class="pill ${cls}">${verdict}</span> <span class="mod-test-reason">${escapeHTML(reason)}</span>`;
}

// ----------------------------------------------------------------
// Stats & activity
// ----------------------------------------------------------------
function renderReviewsStats() {
    if (!reviewsState.loaded) {
        document.getElementById('revstats-feed').innerHTML = '<div class="loading-placeholder">Loading…</div>';
        return;
    }

    const rs = reviewsState.reviews;
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const ms = (r) => r.timestamp?.toMillis?.() || 0;

    const total = rs.length;
    const pending = rs.filter(r => r.moderationStatus === 'pending').length;
    const approved = rs.filter(r => r.moderationStatus === 'approved').length;
    const blockedRejected = rs.filter(r => REVIEWS_BLOCKED_SET.includes(r.moderationStatus)).length;
    const last24h = rs.filter(r => ms(r) >= now - DAY).length;
    const last7d = rs.filter(r => ms(r) >= now - 7 * DAY).length;

    const stats = [
        { value: total, label: 'Total reviews' },
        { value: pending, label: 'Pending' },
        { value: approved, label: 'Approved' },
        { value: blockedRejected, label: 'Blocked / rejected' },
        { value: last24h, label: 'Last 24 hours' },
        { value: last7d, label: 'Last 7 days' }
    ];
    document.getElementById('revstats-grid').innerHTML = stats.map(s => `
        <div class="stat-card stat-card-static">
            <div class="stat-icon reviews-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div class="stat-info">
                <span class="stat-value">${s.value}</span>
                <span class="stat-label">${s.label}</span>
            </div>
        </div>`).join('');

    // Recent activity feed (latest 50)
    const feed = rs.slice(0, 50);
    document.getElementById('revstats-feed').innerHTML = feed.length === 0
        ? '<div class="empty-state"><p>No reviews yet</p></div>'
        : feed.map(r => `
            <div class="recent-item rev-feed-item">
                <div class="rev-feed-main">
                    <span class="recent-item-title">${escapeHTML(r.gameName || r.gameId || 'Unknown game')} ${reviewStatusBadge(r.moderationStatus)}</span>
                    <span class="recent-item-meta">
                        ${escapeHTML(r.userDisplayName || 'Unknown')}${r.isGuest ? ' (guest)' : ''}
                        ${r.rating ? '· ' + Number(r.rating) + '/5' : ''}
                        ${r.reason ? '· ' + escapeHTML(truncate(r.reason, 90)) : ''}
                    </span>
                </div>
                <span class="recent-item-meta">${formatDate(r.timestamp)}</span>
            </div>`).join('');

    // Abuse signals
    const guests = new Set(rs.filter(r => r.isGuest === true && r.userId).map(r => r.userId));
    const ipCounts = new Map();
    rs.forEach(r => {
        const h = r.clientIpHash;
        if (h) ipCounts.set(h, (ipCounts.get(h) || 0) + 1);
    });
    const topIps = Array.from(ipCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const abuseEl = document.getElementById('revstats-abuse');
    const parts = [];
    parts.push(`<div class="recent-item"><span class="recent-item-title">Distinct guest reviewers</span><span class="recent-item-meta">${guests.size}</span></div>`);
    if (topIps.length === 0) {
        parts.push('<div class="recent-item"><span class="recent-item-title">No IP hash data</span><span class="recent-item-meta">—</span></div>');
    } else {
        topIps.forEach(([hash, count]) => {
            parts.push(`
                <div class="recent-item">
                    <span class="recent-item-title mono" title="${escapeAttr(hash)}">${escapeHTML(hash.length > 12 ? hash.slice(0, 12) + '…' : hash)}</span>
                    <span class="recent-item-meta">${count} review${count === 1 ? '' : 's'}</span>
                </div>`);
        });
    }
    parts.push('<div class="recent-item rev-abuse-note"><span class="recent-item-meta">Rate-limit counters live in <code>review_rate_limits</code> (server-only) and are not readable here. Only pre-hashed IP prefixes are shown — raw IPs are never stored or displayed.</span></div>');
    abuseEl.innerHTML = parts.join('');
}

// Only attach the submit listener if the form does NOT already have
// an inline onsubmit handler (handleLoginInline in index.html).
// Having both causes handleLogin to fire with an empty DEV_UIDS set
// before init() finishes loading UIDs.
const loginForm = document.getElementById('login-form');
if (loginForm && !loginForm.hasAttribute('onsubmit')) {
    loginForm.addEventListener('submit', handleLogin);
}

init();
