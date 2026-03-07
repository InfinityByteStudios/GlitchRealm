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

    // Get Firestore instance
    let db, collection, query, where, getDocs, orderBy, Timestamp;
    try {
        const mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        collection = mod.collection;
        query = mod.query;
        where = mod.where;
        getDocs = mod.getDocs;
        orderBy = mod.orderBy;
        Timestamp = mod.Timestamp;

        if (window.firebaseFirestore) {
            db = window.firebaseFirestore;
        } else if (window.firebaseDb) {
            db = window.firebaseDb;
        } else if (window.firebaseApp) {
            db = mod.getFirestore(window.firebaseApp);
        } else {
            return; // No Firebase available
        }
    } catch (e) {
        console.warn('[Site Banners] Firebase unavailable:', e);
        return;
    }

    try {
        const q = query(
            collection(db, 'site_banners'),
            where('active', '==', true)
        );
        const snap = await getDocs(q);

        if (snap.empty) return;

        const now = new Date();
        const banners = [];

        snap.forEach(doc => {
            const data = doc.data();
            // Skip expired banners
            if (data.expiresAt) {
                const expires = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
                if (expires <= now) return;
            }
            // Skip banners the user already dismissed (stored in localStorage)
            const dismissedKey = 'gr_banner_' + doc.id;
            if (data.dismissible && localStorage.getItem(dismissedKey)) return;

            banners.push({ id: doc.id, ...data });
        });

        if (banners.length === 0) return;

        // Inject banner CSS
        const style = document.createElement('style');
        style.textContent = `
            #gr-banner-container{position:fixed;top:0;left:0;width:100%;z-index:1001}
            .gr-site-banner{position:relative;width:100%;padding:10px 40px 10px 16px;font-family:Rajdhani,-apple-system,BlinkMacSystemFont,sans-serif;font-size:.88rem;font-weight:600;text-align:center;animation:grBannerSlide .3s ease}
            .gr-site-banner a{color:inherit;text-decoration:underline;margin-left:6px}
            .gr-site-banner a:hover{opacity:.85}
            .gr-site-banner .gr-banner-close{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:inherit;font-size:1.2rem;cursor:pointer;opacity:.7;padding:4px 8px;line-height:1}
            .gr-site-banner .gr-banner-close:hover{opacity:1}
            .gr-banner-info{background:rgba(0,212,255,0.12);border-bottom:1px solid rgba(0,212,255,0.3);color:#00d4ff}
            .gr-banner-warning{background:rgba(255,184,0,0.12);border-bottom:1px solid rgba(255,184,0,0.3);color:#ffb800}
            .gr-banner-error{background:rgba(255,71,87,0.12);border-bottom:1px solid rgba(255,71,87,0.3);color:#ff4757}
            .gr-banner-success{background:rgba(0,255,65,0.08);border-bottom:1px solid rgba(0,255,65,0.3);color:#00ff41}
            @keyframes grBannerSlide{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}
        `;
        document.head.appendChild(style);

        // Create a fixed container for all banners
        const container = document.createElement('div');
        container.id = 'gr-banner-container';

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

        // Insert fixed container at very top of body
        document.body.insertBefore(container, document.body.firstChild);

        // Push the fixed nav down by the banner container height
        function adjustNavTop() {
            const h = container.offsetHeight;
            const nav = document.querySelector('.nav, nav, header.nav');
            if (nav) nav.style.top = h + 'px';
        }

        // Run after paint so offsetHeight is accurate
        requestAnimationFrame(adjustNavTop);

        // Dismiss handlers
        document.querySelectorAll('.gr-banner-close').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.dataset.id;
                localStorage.setItem('gr_banner_' + id, '1');
                this.parentElement.remove();
                requestAnimationFrame(adjustNavTop);
            });
        });
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
