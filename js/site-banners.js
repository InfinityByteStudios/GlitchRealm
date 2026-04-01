// Site Banner Display - Fetches active banners from Firestore and shows them
// Include this script on any page that should display admin banners
(async function () {
    'use strict';

    // Wait for Firebase to be ready
    function waitForFirebase() {
        return new Promise(resolve => {
            if (window.firebaseFirestore || window.firebaseDb) return resolve();
            const handlers = ['firebaseCoreReady', 'firebaseReady'];
            let resolved = false;
            handlers.forEach(evt => {
                window.addEventListener(evt, () => {
                    if (!resolved) { resolved = true; resolve(); }
                }, { once: true });
            });
            // Fallback timeout
            setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 5000);
        });
    }

    await waitForFirebase();

    // Get Firestore instance — prefer window globals, fallback to dynamic import
    let db, collection, query, where, getDocs, orderBy, Timestamp, mod;
    try {
        mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        collection = window.firestoreCollection || mod.collection;
        query = window.firestoreQuery || mod.query;
        where = mod.where;
        getDocs = window.firestoreGetDocs || mod.getDocs;
        orderBy = mod.orderBy;
        Timestamp = mod.Timestamp;

        db = window.firebaseFirestore || (window.firebaseApp ? mod.getFirestore(window.firebaseApp) : null);
        if (!db) return;
    } catch (e) {
        console.warn('[Site Banners] Firebase unavailable:', e);
        return;
    }

    try {
        const q = query(
            collection(db, 'site_banners'),
            where('active', '==', true)
        );

        // Prefer global onSnapshot if available (set by firebase-core), otherwise use modular onSnapshot
        const onSnapshotFn = window.firestoreOnSnapshot || mod.onSnapshot;
        if (!onSnapshotFn) {
            // Fallback to one-time fetch if realtime isn't available
            const snap = await getDocs(q);
            renderSnapshot(snap);
            return;
        }

        // Keep a live subscription so banners update immediately when admins change them
        const unsubscribe = onSnapshotFn(q, (snap) => {
            renderSnapshot(snap);
        }, (err) => {
            console.warn('[Site Banners] onSnapshot error:', err);
        });

        // Save unsubscribe for debugging if needed
        window.__gr_banner_unsubscribe = unsubscribe;

        // Render helper used for both snapshot and one-time fetch
        function renderSnapshot(snap) {
                if (!snap || snap.empty) { removeBannerContainer(); return; }

                const now = new Date();
                const banners = [];
                let skipped = 0;

                snap.forEach(doc => {
                    const data = doc.data();

                    // Skip expired banners
                    if (data.expiresAt) {
                        const expires = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
                        if (expires <= now) { skipped++; return; }
                    }
                    // Skip banners the user already dismissed (stored in localStorage)
                    const dismissedKey = 'gr_banner_' + doc.id;
                    if (data.dismissible && localStorage.getItem(dismissedKey)) { skipped++; return; }

                    banners.push({ id: doc.id, ...data });
                });

                if (banners.length === 0) { removeBannerContainer(); return; }

            // Inject banner CSS if not present
            let style = document.getElementById('gr-banner-style');
            if (!style) {
                style = document.createElement('style');
                style.id = 'gr-banner-style';
                style.textContent = `
            #gr-banner-container{position:fixed;top:0;left:0;width:100%;z-index:1001}
            .gr-site-banner{position:relative;width:100%;padding:10px 40px 10px 16px;font-family:Rajdhani,-apple-system,BlinkMacSystemFont,sans-serif;font-size:.88rem;font-weight:700;text-align:center;animation:grBannerSlide .3s ease}
            .gr-site-banner a{color:inherit;text-decoration:underline;margin-left:6px}
            .gr-site-banner a:hover{opacity:.95}
            .gr-site-banner .gr-banner-close{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:inherit;font-size:1.2rem;cursor:pointer;opacity:.9;padding:4px 8px;line-height:1}
            .gr-site-banner .gr-banner-close:hover{opacity:1}
            /* Opaque solid backgrounds for strong visibility */
            .gr-banner-info{background:#00d4ff;color:#00121a;border-bottom:1px solid rgba(0,0,0,0.08)}
            .gr-banner-warning{background:#ffb800;color:#111;border-bottom:1px solid rgba(0,0,0,0.08)}
            .gr-banner-error{background:#ff4757;color:#fff;border-bottom:1px solid rgba(0,0,0,0.08)}
            .gr-banner-success{background:#00ff41;color:#062006;border-bottom:1px solid rgba(0,0,0,0.08)}
            @keyframes grBannerSlide{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}
        `;
                document.head.appendChild(style);
            }

            // Create or update fixed container for all banners
            let container = document.getElementById('gr-banner-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'gr-banner-container';
                document.body.insertBefore(container, document.body.firstChild);
            }

            // Clear existing children and repopulate
            container.innerHTML = '';
            banners.forEach(b => {
                const el = document.createElement('div');
                el.className = `gr-site-banner gr-banner-${b.type || 'info'}`;
                el.setAttribute('role', 'alert');

                let inner = escapeText(b.message);
                if (b.linkUrl && b.linkText) {
                    inner += ` <a href="${escapeAttr(b.linkUrl)}" target="_blank" rel="noopener">${escapeText(b.linkText)}</a>`;
                }

                if (b.dismissible) {
                    inner += `<button class="gr-banner-close" aria-label="Dismiss" data-id="${b.id}">&times;</button>`;
                }

                el.innerHTML = inner;
                container.appendChild(el);
            });

            // Push the fixed nav down by the banner container height
            function adjustNavTop() {
                const h = container.offsetHeight;
                const nav = document.querySelector('.nav, nav, header.nav');
                if (nav) nav.style.top = h + 'px';
            }

            // Run after paint so offsetHeight is accurate
            requestAnimationFrame(adjustNavTop);

            // Dismiss handlers
            container.querySelectorAll('.gr-banner-close').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = this.dataset.id;
                    localStorage.setItem('gr_banner_' + id, '1');
                    this.parentElement.remove();
                    requestAnimationFrame(adjustNavTop);
                });
            });
        }

        function removeBannerContainer() {
            const existing = document.getElementById('gr-banner-container');
            if (existing) existing.remove();
            const nav = document.querySelector('.nav, nav, header.nav');
            if (nav) nav.style.top = '';
        }
    } catch (e) {
        console.warn('[Site Banners] Failed to load banners:', e);
    }

    function escapeText(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function escapeAttr(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
})();
