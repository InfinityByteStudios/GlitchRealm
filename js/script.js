// GlitchRealm Games - Interactive Effects

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
            .then(function(registration) {
                // Check for updates on every page load
                registration.update();
            })
            .catch(function(error) {
            });
    });
}

// Early auth state restoration (before DOM loads)
;(function(){
    // Check if we have a cached auth state
    try {
        const cachedAuthState = localStorage.getItem('firebase_auth_state');
        if (cachedAuthState) {
            const authData = JSON.parse(cachedAuthState);
            // If auth state exists and is recent (within 24 hours), show user profile immediately
            if (authData.timestamp && (Date.now() - authData.timestamp) < 86400000) {
                window.__cachedAuthState = authData;
            }
        }
    } catch(e) {
        console.warn('[News Auth] Failed to check cached auth state:', e);
    }
})();

/**
 * Load Supabase avatar if available (higher priority than cached Firebase photoURL)
 * This ensures custom uploaded avatars are shown instead of provider avatars
 */
async function loadSupabaseAvatarIfAvailable(userId) {
    if (!userId) return;
    
    try {
        // Dynamically import Supabase avatar utilities if not already loaded
        if (!window.getProfile || !window.getAvatarUrl) {
            const module = await import('./supabase-avatar.js');
            window.getProfile = module.getProfile;
            window.getAvatarUrl = module.getAvatarUrl;
        }
        
        // Get Supabase profile
        const profile = await window.getProfile(userId);
        
        // If custom avatar exists, update all avatar elements
        if (profile?.custom_photo_url) {
            const userAvatar = document.getElementById('user-avatar');
            const userAvatarLarge = document.getElementById('user-avatar-large');
            
            if (userAvatar) userAvatar.src = profile.custom_photo_url;
            if (userAvatarLarge) userAvatarLarge.src = profile.custom_photo_url;
        }
    } catch (err) {
        // Graceful failure - just use the cached photoURL
        console.warn('[News Auth] Could not load Supabase avatar:', err);
    }
}

// Auth message display function - must be available early
function showAuthMessage(message, type) {
    // Remove existing messages
    const existingMessage = document.querySelector('.auth-message-toast');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message-toast auth-message ${type || 'info'}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'messageSlideOut 0.3s ease-in forwards';
            setTimeout(() => messageDiv.remove(), 300);
        }
    }, 4000);
}

document.addEventListener('DOMContentLoaded', function() {
    
    // IMMEDIATELY restore UI from cached auth state if available
    try {
        if (window.__cachedAuthState) {
            const userProfile = document.getElementById('user-profile');
            const userName = document.getElementById('user-name');
            const userPortalLink = document.getElementById('user-portal-link');
            
            // Anonymous sessions are guest identities, not a signed-in account:
            // they must never make the header look signed in.
            if (!window.__cachedAuthState.isAnonymous && userProfile) {
                userProfile.style.display = 'flex';
                if (userPortalLink) userPortalLink.style.display = 'block';
                
                if (userName) {
                    userName.textContent = window.__cachedAuthState.displayName || 
                                          window.__cachedAuthState.email?.split('@')[0] || 
                                          'User';
                }
                
                // Also update avatar if available
                const userAvatar = document.getElementById('user-avatar');
                const userAvatarLarge = document.getElementById('user-avatar-large');
                if (window.__cachedAuthState.photoURL) {
                    if (userAvatar) userAvatar.src = window.__cachedAuthState.photoURL;
                    if (userAvatarLarge) userAvatarLarge.src = window.__cachedAuthState.photoURL;
                }
                
                
                // Check for Supabase custom avatar asynchronously (higher priority than cached photoURL)
                loadSupabaseAvatarIfAvailable(window.__cachedAuthState.uid).catch(err => {
                    console.warn('[Auth] Could not check for Supabase avatar:', err);
                });
            }
        }
    } catch(e) {
        console.warn('[Auth] Failed to restore UI from cache:', e);
    }
    
    // Initialize all effects
    initGlitchEffects();
    initCardAnimations();
    // Parallax disabled: .background-animation's CSS animation overrides the inline
    // transform, so the scroll handler only cost style recalcs every frame (hurt INP).
    initConsoleMessage();
    initBadgeAutoHide();
    // Default lazy-load images without an explicit loading attribute
    try {
        document.querySelectorAll('img:not([loading])').forEach(img => {
            img.setAttribute('loading', 'lazy');
        });
    } catch (e) { /* non-fatal */ }

    // Global daily popup scheduler
    try {
        window.GR_POPUP_SCHEDULER_ACTIVE = true;
        const DAY_MS = 24 * 60 * 60 * 1000;
        const lastKey = 'gr.popups.lastShownAt.v1';
        const orderKey = 'gr.popups.rotationIndex.v1';
        const now = Date.now();
        const lastShownAt = parseInt(localStorage.getItem(lastKey) || '0', 10);
        const canShow = !lastShownAt || (now - lastShownAt) >= DAY_MS;

        // Define popup providers (non-intrusive checks only)
        // Single source of truth for the Terms update version (override by setting window.GR_TERMS_UPDATE_VERSION before this script runs)
        // Game Card Menu Button Logic
        function setupGameCardMenus() {
            const gameCards = document.querySelectorAll('.game-card');
            const currentUid = window.firebaseAuth?.currentUser?.uid || '';
            gameCards.forEach(card => {
                const menu = card.querySelector('.game-card-menu');
                if (!menu) return;
                // Always hide inline action buttons (Edit/Delete/Report) — use dropdown only
                menu.querySelectorAll('.edit-btn, .delete-btn, .report-btn').forEach(btn => btn.style.display = 'none');
                // Always show the three-dot menu trigger
                menu.querySelector('.three-dot-btn')?.setAttribute('style', 'display:inline-block;');
            });
        }

        // Expose for dynamic pages (e.g., games.html) to re-run after injecting cards
        try { window.setupGameCardMenus = setupGameCardMenus; } catch {}

        // Run setup on DOMContentLoaded and on auth state change
        setupGameCardMenus();
        if (window.firebaseAuth && typeof window.firebaseAuth.onAuthStateChanged === 'function') {
            window.firebaseAuth.onAuthStateChanged(() => {
                setTimeout(setupGameCardMenus, 300);
            });
        }

        // Report modal wiring (games)
        // Use window-scoped state so other handlers (like the form submit) can access it reliably
    // Initialize global state and a legacy alias to prevent ReferenceError in older code paths
    window.reportTargetGameId = window.reportTargetGameId ?? null;
    // Legacy alias for any code that referenced bare `reportTargetGameId`
    try { if (typeof reportTargetGameId === 'undefined') { var reportTargetGameId = window.reportTargetGameId; } } catch {}
        function openReportGameModal(gameId){
            window.reportTargetGameId = gameId || null;
            try { reportTargetGameId = window.reportTargetGameId; } catch {}
            const modal = document.getElementById('report-game-modal');
            if (!modal) { alert('Report UI not available.'); return; }
            try { modal.dataset.gameId = String(gameId || ''); } catch {}
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        function closeReportGameModal(){
            const modal = document.getElementById('report-game-modal');
            if (!modal) return;
            window.reportTargetGameId = null;
            try { reportTargetGameId = null; } catch {}
            try { document.getElementById('report-game-form')?.reset(); } catch {}
            try { delete modal.dataset.gameId; } catch {}
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        // Expose helpers on window for cross-scope access
        window.openReportGameModal = openReportGameModal;
        window.closeReportGameModal = closeReportGameModal;
        // Close handlers
        document.getElementById('close-report-game')?.addEventListener('click', (e)=>{ e.preventDefault(); closeReportGameModal(); });
        document.getElementById('cancel-report-game')?.addEventListener('click', (e)=>{ e.preventDefault(); closeReportGameModal(); });
        document.getElementById('report-game-modal')?.addEventListener('click', (e)=>{ const m = document.getElementById('report-game-modal'); if (e.target === m) closeReportGameModal(); });

        // Favorites helpers
        function favKey(){
            const uid = window.firebaseAuth?.currentUser?.uid || 'guest';
            return 'gr.favorites.v1.' + uid;
        }
        function getFavorites(){
            try { return JSON.parse(localStorage.getItem(favKey())||'[]'); } catch { return []; }
        }
        function setFavorites(list){
            try { localStorage.setItem(favKey(), JSON.stringify(list)); } catch {}
        }
        function isFavorite(gameId){
            return getFavorites().includes(gameId);
        }
        function toggleFavorite(gameId){
            const list = getFavorites();
            const idx = list.indexOf(gameId);
            if (idx === -1) { list.push(gameId); setFavorites(list); showAuthMessage('Saved to favorites', 'success'); }
            else { list.splice(idx,1); setFavorites(list); showAuthMessage('Removed from favorites', 'info'); }
        }

        // Ensure a dropdown menu exists per card for the three-dot action (Report + Star)
        function ensureGameOptionsMenu(card){
            if (!card) return;
            let menu = card.querySelector('.game-options-menu');
            if (!menu) {
                const imgWrap = card.querySelector('.card-image');
                if (!imgWrap) return;
                menu = document.createElement('div');
                menu.className = 'game-options-menu';
                menu.setAttribute('role','menu');
                menu.setAttribute('aria-hidden','true');
                menu.style.display = 'none';
                const gameId = card.getAttribute('data-game') || '';
                menu.innerHTML = `
                    <button class="menu-item star" role="menuitem">Star</button>
                    <button class="menu-item report" role="menuitem">Report</button>
                `;
                imgWrap.appendChild(menu);
            }
            // Sync Star/Unstar label
            const gameId = card.getAttribute('data-game') || '';
            const starBtn = menu.querySelector('.menu-item.star');
            if (starBtn) starBtn.textContent = isFavorite(gameId) ? 'Unstar' : 'Star';
            return menu;
        }

        function closeAllGameMenus(){
            document.querySelectorAll('.game-options-menu').forEach(m => { m.style.display='none'; m.setAttribute('aria-hidden','true'); });
            document.querySelectorAll('.three-dot-btn[aria-expanded="true"]').forEach(btn => btn.setAttribute('aria-expanded','false'));
        }

        // Fallback: fetch ownerId for a card if missing
        async function ensureCardOwner(card){
            try {
                if (!card) return '';
                const existing = card.getAttribute('data-owner') || '';
                if (existing) return existing;
                const gameId = card.getAttribute('data-game') || '';
                if (!gameId) return '';
                // Only attempt for community submissions (we mark them with is-submission)
                if (!card.classList.contains('game-card') || !card.classList.contains('is-submission')) return '';
                // Cache to avoid repeated lookups
                if (!window.__grOwnerCache) window.__grOwnerCache = new Map();
                if (window.__grOwnerCache.has(gameId)) {
                    const cached = window.__grOwnerCache.get(gameId) || '';
                    if (cached) card.setAttribute('data-owner', String(cached));
                    return cached;
                }
                // Load Firestore if needed
                let f;
                try { f = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'); } catch { return ''; }
                const db = window.firebaseFirestore || f.getFirestore();
                const dref = (window.firestoreDoc || f.doc)(db, 'game_submissions', gameId);
                const snap = await (window.firestoreGetDoc || f.getDoc)(dref);
                if (!snap.exists()) return '';
                const data = snap.data() || {};
                const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
                if (ownerId) {
                    window.__grOwnerCache.set(gameId, ownerId);
                    card.setAttribute('data-owner', String(ownerId));
                }
                return ownerId;
            } catch { return ''; }
        }

        // Open/close dropdowns and handle actions
        document.body.addEventListener('click', function(e) {
            // Open/close when clicking three-dot
            const dot = e.target.closest('.three-dot-btn');
            if (dot) {
                const card = dot.closest('.game-card');
                (async () => {
                    // If we don't have owner set yet, fetch it so the Edit item can appear
                    const ownerBefore = card?.getAttribute('data-owner') || '';
                    if (!ownerBefore) { await ensureCardOwner(card); }
                    const menu = ensureGameOptionsMenu(card);
                    if (menu) {
                        const open = menu.style.display !== 'block';
                        closeAllGameMenus();
                        menu.style.display = open ? 'block' : 'none';
                        dot.setAttribute('aria-expanded', open ? 'true' : 'false');
                        menu.setAttribute('aria-hidden', open ? 'false' : 'true');
                    }
                })();
                return;
            }

            // Menu actions
            const menu = e.target.closest('.game-options-menu');
            if (menu) {
                const card = menu.closest('.game-card');
                const gameId = card?.getAttribute('data-game');
                if (e.target.closest('.menu-item.report')) {
                    closeAllGameMenus();
                    openReportGameModal(gameId);
                    return;
                }
                if (e.target.closest('.menu-item.star')) {
                    toggleFavorite(gameId);
                    // Update label immediately
                    const starBtn = menu.querySelector('.menu-item.star');
                    if (starBtn) starBtn.textContent = isFavorite(gameId) ? 'Unstar' : 'Star';
                    closeAllGameMenus();
                    return;
                }
            }

            // Existing owner action buttons
            const btn = e.target.closest('.menu-btn');
            if (btn && !btn.classList.contains('three-dot-btn')) {
                const action = btn.getAttribute('data-action');
                const card = btn.closest('.game-card');
                const gameId = card?.getAttribute('data-game');
                switch (action) {
                    case 'delete':
                        (async () => {
                            const card = btn.closest('.game-card');
                            const owner = card?.getAttribute('data-owner') || '';
                            const uid = window.firebaseAuth?.currentUser?.uid || '';
                            if (!uid || uid !== owner) { alert('You can only delete your own submission.'); return; }
                            if (!confirm('Delete this submission permanently? This cannot be undone.')) return;
                            try {
                                // Ensure firestore
                                if (!window.firebaseFirestore || !window.firestoreDoc || !window.firestoreDeleteDoc) {
                                    const f = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                                    window.firebaseFirestore = window.firebaseFirestore || f.getFirestore();
                                    window.firestoreDoc = window.firestoreDoc || f.doc;
                                    window.firestoreDeleteDoc = window.firestoreDeleteDoc || f.deleteDoc;
                                }
                                const dref = window.firestoreDoc(window.firebaseFirestore, 'game_submissions', gameId);
                                await window.firestoreDeleteDoc(dref);
                                // Optimistic removal (realtime listener will also remove)
                                try { card?.remove(); } catch {}
                                showAuthMessage('Submission deleted.', 'success');
                            } catch (err) {
                                console.error('Delete failed:', err);
                                alert('Failed to delete submission.');
                            }
                        })();
                        break;
                    case 'report':
                        openReportGameModal(gameId);
                        break;
                }
            }
        });

        // Close menus on outside click
        document.addEventListener('click', function(ev){
            if (!ev.target.closest('.game-options-menu') && !ev.target.closest('.three-dot-btn')) {
                closeAllGameMenus();
            }
        });
        // Close on Escape
        document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape') closeAllGameMenus(); });
        
    const TERMS_UPDATE_VERSION = window.GR_TERMS_UPDATE_VERSION || '2025-09-05';

    const providers = [
            {
                id: 'legal',
                canShow: () => {
                    // First visit must show legal notice
                    const accepted = localStorage.getItem('gr.legal.accepted') === '1';
                    const declined = localStorage.getItem('gr.legal.declined') === '1';
                    const el = document.getElementById('terms-popup');
                    return !!el && !accepted && !declined;
                },
                show: () => {
                    const overlay = document.getElementById('terms-popup');
                    if (!overlay) return false;
                    overlay.style.display = 'flex';
                    const accept = document.getElementById('accept-terms');
                    const decline = document.getElementById('decline-terms');
                    const finalize = (didAccept) => {
                        try { localStorage.setItem('gr.legal.' + (didAccept ? 'accepted' : 'declined'), '1'); } catch {}
                        overlay.style.display = 'none';
                        if (!didAccept) {
                            // Inform user and attempt to close; fallback to about:blank
                            try {
                                alert('You declined the Terms. This tab will be closed. If closing is blocked by your browser, you will be redirected to about:blank.');
                            } catch {}
                            try { window.close(); } catch {}
                            // Always ensure the user is navigated away
                            setTimeout(() => {
                                try { window.location.replace('about:blank'); } catch { window.location.href = 'about:blank'; }
                            }, 50);
                        }
                    };
                    accept && accept.addEventListener('click', () => finalize(true), { once: true });
                    decline && decline.addEventListener('click', () => finalize(false), { once: true });
                    return true;
                }
            },
            {
                id: 'terms-updated',
                canShow: () => {
                    // Show when a new terms version exists and not yet acknowledged
                    const el = document.getElementById('terms-update-popup');
                    if (!el) return false;
                    const seenKey = 'gr.terms.updated.seen.v' + TERMS_UPDATE_VERSION;
                    const seen = localStorage.getItem(seenKey) === '1';
                    return !seen;
                },
                show: () => {
                    const overlay = document.getElementById('terms-update-popup');
                    if (!overlay) return false;
                    // Lock background scroll while visible
                    overlay.dataset.prevOverflow = document.body.style.overflow || '';
                    document.body.style.overflow = 'hidden';
                    overlay.style.display = 'flex';
                    const seenKey = 'gr.terms.updated.seen.v' + TERMS_UPDATE_VERSION;
                    const dismiss = document.getElementById('dismiss-terms-update');
                    const accept = document.getElementById('accept-terms-update');
                    const inlineLinks = overlay.querySelectorAll('a.popup-inline-link');
                    const closeOnly = () => {
                        overlay.style.display = 'none';
                        document.body.style.overflow = overlay.dataset.prevOverflow || '';
                        delete overlay.dataset.prevOverflow;
                    };
                    const acknowledge = () => {
                        try { localStorage.setItem(seenKey, '1'); } catch {}
                        closeOnly();
                    };
                    // Mirror regular TOS decline on Dismiss
                    if (dismiss) {
                        const onDismiss = (e) => {
                            try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); } catch {}
                            try { localStorage.setItem('gr.legal.declined', '1'); } catch {}
                            try {
                                alert('You declined the Terms. This tab will be closed. If closing is blocked by your browser, you will be redirected to about:blank.');
                            } catch {}
                            try { window.close(); } catch {}
                            setTimeout(() => {
                                try { window.location.replace('about:blank'); } catch { window.location.href = 'about:blank'; }
                            }, 50);
                        };
                        dismiss.addEventListener('click', onDismiss, { once: true });
                        dismiss.addEventListener('pointerdown', onDismiss, { once: true });
                        dismiss.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onDismiss(e); }, { once: true });
                    }
                    accept && accept.addEventListener('click', () => acknowledge(), { once: true });
                    inlineLinks.forEach(a => a.addEventListener('click', () => { try { localStorage.setItem(seenKey, '1'); } catch {} }, { once: true }));
                    // Dismiss on backdrop click or Escape
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOnly(); }, { once: true });
                    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOnly(); }, { once: true });
                    return true;
                }
            },
            // Add more providers here safely without changing functionality
        ];

        function pickProvider() {
            // If legal can show, always prioritize it (first-visit requirement)
            const legal = providers.find(p => p.id === 'legal');
            if (legal && legal.canShow()) return legal;

            // Prioritize terms update next
            const termsUpdated = providers.find(p => p.id === 'terms-updated');
            if (termsUpdated && termsUpdated.canShow()) return termsUpdated;

            // Otherwise rotate through remaining eligible providers
            const eligible = providers.filter(p => p.id !== 'legal' && p.id !== 'terms-updated' && p.canShow());
            if (eligible.length === 0) return null;
            let idx = parseInt(localStorage.getItem(orderKey) || '0', 10);
            if (Number.isNaN(idx)) idx = 0;
            const provider = eligible[idx % eligible.length];
            localStorage.setItem(orderKey, ((idx + 1) % Math.max(eligible.length, 1)).toString());
            return provider;
        }

        if (canShow) {
            const p = pickProvider();
            if (p && p.show()) {
                try { localStorage.setItem(lastKey, String(now)); } catch {}
            }
        }
    } catch (e) {
        // Non-fatal: scheduler shouldn’t break the page
        console.warn('Popup scheduler error:', e);
    }

    // Submit Report Game form -> Firestore
    (function(){
        const form = document.getElementById('report-game-form');
        if (!form) return;
    form.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const auth = window.firebaseAuth;
        if (!auth || !auth.currentUser) { alert('Please sign in to report.'); return; }
                // Resolve the target game id from global or modal dataset as fallback
                const modalEl = document.getElementById('report-game-modal');
                const targetId = window.reportTargetGameId || modalEl?.dataset?.gameId;
                if (!targetId) { alert('No game selected.'); return; }

                // Ensure Firestore (reuse globals if available)
                let db, addDoc, collection, Timestamp;
                try {
                    if (window.firebaseFirestore && window.firestoreAddDoc && window.firestoreCollection) {
                        db = window.firebaseFirestore;
                        addDoc = window.firestoreAddDoc;
                        collection = window.firestoreCollection;
                    } else {
                        const mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                        db = mod.getFirestore();
                        addDoc = mod.addDoc;
                        collection = mod.collection;
                    }
                    // Timestamp may be absent; use Date now if not available
                    try { Timestamp = (await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')).Timestamp; } catch(_) { Timestamp = null; }
                } catch (err) {
                    console.error('Firestore init failed for report:', err);
                    alert('Reporting is unavailable right now.');
                    return;
                }

                const baseReason = (document.querySelector('input[name="report-game-reason"]:checked')?.value || 'Other').slice(0, 60);
                let details = String(document.getElementById('report-game-details')?.value || '').trim();
                // Build combined reason while enforcing total length <= 500 (rules requirement)
                let combinedReason = baseReason;
                if (details) {
                    // Reserve space for ": " separator
                    const maxDetailsLen = Math.max(0, 500 - (baseReason.length + 2));
                    details = details.slice(0, maxDetailsLen);
                    combinedReason = `${baseReason}: ${details}`;
                }
                // Double-check cap at 500 just in case
                combinedReason = combinedReason.slice(0, 500);

                const payload = {
                    gameId: String(targetId),
                    userId: auth.currentUser.uid,
                    reason: combinedReason,
                    createdAt: Timestamp && Timestamp.fromDate ? Timestamp.fromDate(new Date()) : new Date(),
                    status: 'open'
                };

                await addDoc(collection(db, 'game_reports'), payload);
                closeReportGameModal();
                showAuthMessage('Report submitted. Thank you!', 'success');
            } catch (err) {
                console.error('Submit game report failed:', err);
                alert('Failed to submit report.');
            }
        });
    })();
    // Service worker not available on news subdomain (no sw.js)
    // Main site handles caching and offline support
    
    // Initialize input focus effects (the traditional sign-in / registration
    // modal has been retired, so only the shared form styling remains here).
    initializeInputFocusEffects();
    
    // Initialize Firebase auth (async)
    initializeAuth();
    
    // Glitch text effects
    function initGlitchEffects() {
        const glitchElements = document.querySelectorAll('.glitch, .glitch-large');
        
        glitchElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                element.style.animation = 'none';
                element.offsetHeight; // Trigger reflow
                element.style.animation = null;
            });
        });
    }
    
    // Game card hover effects
    function initCardAnimations() {
        // Handled by CSS :hover — no JS needed for basic transform/scale
    }
    
    // Parallax scrolling effect
    function initParallaxEffect() {
        const background = document.querySelector('.background-animation');
        let ticking = false;
        
        function updateBackground() {
            const scrolled = window.pageYOffset;
            const parallax = scrolled * 0.5;
            
            if (background) {
                if (GR_SETTINGS?.reduceMotion) return; // respect reduce motion
                background.style.transform = `translateY(${parallax}px)`;
            }
            
            ticking = false;
        }
        
        function requestTick() {
            if (!ticking) {
                requestAnimationFrame(updateBackground);
                ticking = true;
            }
        }
        
    window.addEventListener('scroll', requestTick, { passive: true });
    }
    
    // Console-style message on home page
    function initConsoleMessage() {
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            setTimeout(() => {
                console.log(`
%c
 ██████╗ ██╗     ██╗████████╗ ██████╗██╗  ██╗██████╗ ███████╗ █████╗ ██╗     ███╗   ███╗
██╔════╝ ██║     ██║╚══██╔══╝██╔════╝██║  ██║██╔══██╗██╔════╝██╔══██╗██║     ████╗ ████║
██║  ███╗██║     ██║   ██║   ██║     ███████║██████╔╝█████╗  ███████║██║     ██╔████╔██║
██║   ██║██║     ██║   ██║   ██║     ██╔══██║██╔══██╗██╔══╝  ██╔══██║██║     ██║╚██╔╝██║
╚██████╔╝███████╗██║   ██║   ╚██████╗██║  ██║██║  ██║███████╗██║  ██║███████╗██║ ╚═╝ ██║
 ╚═════╝ ╚══════╝╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝
                                                                                           
%c Welcome to the Digital Realm! �
%c Ready to jack in? Check out our games at /games.html
`, 
                'color: #00fff9; font-family: monospace; font-size: 10px;',
                'color: #ff0080; font-size: 16px; font-weight: bold;',
                'color: #ffff00; font-size: 12px;'
                );
            }, 1000);
        }
    }
    
    // Button click effects
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (!this.disabled) {
                // Create ripple effect
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.classList.add('ripple');
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            }
        });
    });
    
    // Random glitch effects on logo
    const logo = document.querySelector('.logo .glitch');
    if (logo) {
        setInterval(() => {
            if (Math.random() > 0.95) {
                logo.style.animation = 'none';
                logo.offsetHeight; // Trigger reflow
                logo.style.animation = 'glitch-1 0.2s ease-in-out, glitch-2 0.2s ease-in-out';
                
                setTimeout(() => {
                    logo.style.animation = '';
                }, 200);
            }
        }, 1000);
    }
    
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            // Only handle internal hash links, not external URLs
            if (href && href.startsWith('#') && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
      // Auto-hide NEW badges after 3 days
    function initBadgeAutoHide() {
        const newBadges = document.querySelectorAll('.game-badge.new');
          newBadges.forEach(badge => {
            const gameCard = badge.closest('.game-card');
            
            // Check if gameCard exists before trying to get its attributes
            if (gameCard) {
                const gameId = gameCard.getAttribute('data-game');
                
                if (gameId) {
                    const storageKey = `badge-new-${gameId}`;
                    const badgeShownDate = localStorage.getItem(storageKey);
                    
                    if (!badgeShownDate) {
                        // First time showing the badge, store current date
                        localStorage.setItem(storageKey, Date.now().toString());
                    } else {
                        // Check if 3 days have passed
                        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
                        const currentTime = Date.now();
                        const shownTime = parseInt(badgeShownDate);
                        
                        if (currentTime - shownTime >= threeDaysInMs) {
                            // Hide the badge after 3 days
                            badge.style.display = 'none';
                        }
                    }
                }
            }
        });
    }
    
    // Studio Modal Functions
    window.openStudioModal = function(studioId) {
        const modal = document.getElementById('studioModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        // Set content based on studio
        if (studioId === 'infinitybyte') {
            modalTitle.textContent = 'About InfinityByte Studios';
            modalContent.innerHTML = `
                <p>InfinityByte Studio is an independent game development team focused on creating bold, experimental, and challenging experiences. From fast-paced shooters to deep strategy games, we build projects that push the limits of gameplay and creativity.</p>
                
                <p>Every game we release is crafted with care, driven by community feedback, and powered by a passion for innovation. Whether you're diving into the digital battlegrounds of NeuroCore or exploring our upcoming spin-offs, you're stepping into worlds designed to be more than just fun—they're made to be remembered.</p>
                
                <p>This site is where you'll find everything we're building, testing, and dreaming up. Thanks for playing.</p>
            `;
        }
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };
    
    window.closeStudioModal = function() {
        const modal = document.getElementById('studioModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    };
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('studioModal');
        if (event.target === modal) {
            closeStudioModal();
        }
    });
      // Close modal with Escape key
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeStudioModal();
        }
    });
});

// Firebase Authentication - called from main DOMContentLoaded

// Input focus effects for the shared neural form styling.
// (The traditional sign-in / registration modal has been retired from the
//  public site; the underlying authentication implementation is retained.)
function initializeInputFocusEffects() {
    const neuralInputs = document.querySelectorAll('.neural-input');
    neuralInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
}

async function initializeAuth() {
    try {
        if (!window.firebaseAuth) {
            setTimeout(initializeAuth, 500);
            return;
        }
        // Attempt to initialize App Check if configured
        try {
            const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { initializeAppCheck, ReCaptchaV3Provider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js');
            if (window.GR_APPCHECK_DEBUG) {
                // Enable debug token mode; Firebase will log the token to console on first run
                try { self.FIREBASE_APPCHECK_DEBUG_TOKEN = window.GR_APPCHECK_DEBUG === true ? true : String(window.GR_APPCHECK_DEBUG); } catch {}
            }
            if (window.GR_APPCHECK_SITE_KEY) {
                try {
                    const app = getApp();
                    initializeAppCheck(app, {
                        provider: new ReCaptchaV3Provider(String(window.GR_APPCHECK_SITE_KEY)),
                        isTokenAutoRefreshEnabled: true,
                    });
                } catch (appCheckErr) {
                    console.warn('[AppCheck] Initialization skipped or failed:', appCheckErr?.message || appCheckErr);
                }
            } else {
            }
        } catch (e) {
        }

        // The Firebase authentication implementation is retained; only the
        // public sign-in / registration UI has been retired.
        const { getRedirectResult, signInAnonymously, signOut, onAuthStateChanged, deleteUser } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    // Expose deleteUser to global scope for account deletion
    window.deleteUser = deleteUser;

    // Retain the anonymous-auth capability: visitors receive an anonymous
    // Firebase identity automatically (no sign-in UI) so they can leave reviews.
    window.signInAnonymously = signInAnonymously;
    
    const auth = window.firebaseAuth;
    try { auth.languageCode = navigator.language || 'en'; } catch {}

    // DOM elements (with null checks for dynamic loading)
    const signOutBtn = document.getElementById('sign-out-btn');
    const userProfile = document.getElementById('user-profile');

    // If we returned from a redirect sign-in, complete the flow
    try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult && redirectResult.user) {
            showAuthMessage('Signed in successfully!', 'success');
        }
    } catch (redirectErr) {
        console.warn('getRedirectResult error (safe to ignore if no redirect happened):', redirectErr);
    }
    
    // If header elements aren't loaded yet, store auth function for later
    if (!userProfile) {
        window.pendingAuthInit = () => initializeAuth();
        return;
    }
    
    // Sign out
    signOutBtn?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showAuthMessage('Account deleted.', 'info');
        } catch (error) {
            console.error('Sign-out error:', error);        }
    });

    // Auth state observer with profile monitoring
    onAuthStateChanged(auth, (rawUser) => {
        // Anonymous sessions are created silently just to let guests leave
        // reviews; they must not make the header look "logged in".
        const user = rawUser && rawUser.isAnonymous ? null : rawUser;
        const notificationBell = document.getElementById('notification-bell');
        const moderationMenuBtn = document.getElementById('moderation-menu-btn');
        const userPortalLink = document.getElementById('user-portal-link');
        
        if (user) {
            // User is signed in
            updateUserProfile(user);
            if (userProfile) userProfile.style.display = 'flex';
            if (notificationBell) notificationBell.style.display = 'flex';
            // The User Portal is an account feature: only surface it once a real
            // (non-anonymous) session exists so navigation never implies that a
            // traditional sign-in is required to browse.
            if (userPortalLink) userPortalLink.style.display = 'block';
            // Toggle Moderation menu visibility for dev UIDs only
            try {
                const DEV_UIDS = window.GlitchRealmDev?.DEV_UIDS || window.__ADMIN_UIDS__ || new Set();
                if (moderationMenuBtn) {
                    const newBtn = moderationMenuBtn.cloneNode(true);
                    moderationMenuBtn.parentNode.replaceChild(newBtn, moderationMenuBtn);
                    const show = DEV_UIDS.has(user.uid);
                    if (show) {
                        newBtn.style.display = 'flex';
                        newBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            window.location.href = 'moderation.html';
                        });
                    } else {
                        // Remove entirely so CSS cannot force it visible
                        newBtn.remove();
                    }
                }
            } catch (e) { /* non-fatal */ }
            
            // Set up profile picture monitoring
            if (!window.profileMonitorInterval) {
                setupProfilePictureMonitoring(auth);
            }

            // Start notifications listener for this user
            (async () => {
                try {
                    await startGlobalNotificationsListener();
                } catch (e) {
                    console.warn('[Notifications] Failed to start listener:', e);
                }
            })();

            // Notifications use a global feed; listener now starts after sign-in.
            // Optional: auto-open portal on sign-in
            if (GR_SETTINGS.portalAutoOpenOnSignIn && !/user-portal\.html$/i.test(location.pathname)) {
                setTimeout(() => { window.location.href = 'user-portal.html'; }, 300);
            }
        } else {
            // User is signed out
            if (userProfile) userProfile.style.display = 'none';
            if (notificationBell) notificationBell.style.display = 'none';
            if (moderationMenuBtn) moderationMenuBtn.remove();
            if (userPortalLink) userPortalLink.style.display = 'none';
            
            // Clear profile monitoring
            if (window.profileMonitorInterval) {
                clearInterval(window.profileMonitorInterval);
                window.profileMonitorInterval = null;
            }

            // Stop notifications listener when signed out
            if (window.detachNotificationsListener) {
                window.detachNotificationsListener();
            }
            updateNotificationCount(0);
        }
    });

    // Listen for auth state changes from other tabs/windows
    window.addEventListener('storage', (e) => {
        if (e.key === 'firebase_auth_state') {
            // Force auth state refresh (anonymous guest sessions are not a
            // signed-in profile; skip them so the header stays "signed out")
            const user = auth.currentUser;
            if (user && !user.isAnonymous) {
                updateUserProfile(user);
            }
        }
    });
    
    // Listen for custom Firebase auth events
    window.addEventListener('firebaseAuthStateChanged', (e) => {
        const user = e.detail?.user;
        
        if (user && !user.isAnonymous) {
            // Ensure UI is updated even if onAuthStateChanged already fired
            setTimeout(() => {
                if (auth.currentUser) {
                    updateUserProfile(auth.currentUser);
                }
            }, 100);
        }
    });

    // Anonymous Firebase sessions are intentionally NOT deleted when the tab is
    // closed or hidden. Firebase LOCAL persistence keeps the anonymous identity
    // stable across refreshes and returning visits, so a guest's review
    // attribution and the per-identity review rate limit stay meaningful.

    // Update user profile with data and photo
    function updateUserProfile(user) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'Anonymous User';
        const email = getUserEmail(user);
        const profilePicture = user.photoURL || getDefaultAvatar(user);
        const provider = getProviderName(user);

        // Update profile trigger elements
        const userNameElement = document.getElementById('user-name');
        const userAvatarElement = document.getElementById('user-avatar');
        
        if (userNameElement) userNameElement.textContent = displayName;
        if (userAvatarElement) userAvatarElement.src = profilePicture;
        
        // Update profile menu elements
        const userDisplayNameElement = document.getElementById('user-display-name');
        const userEmailElement = document.getElementById('user-email');
        const userProviderElement = document.getElementById('user-provider');
        const userAvatarLargeElement = document.getElementById('user-avatar-large');
          if (userDisplayNameElement) userDisplayNameElement.textContent = displayName;
        if (userEmailElement) userEmailElement.textContent = email;
        if (userProviderElement) userProviderElement.textContent = provider;
        if (userAvatarLargeElement) userAvatarLargeElement.src = profilePicture;

        // If the Email Management section exists on this page, populate the current email field
        const currentEmailInput = document.getElementById('current-email');
        if (currentEmailInput) {
            // Only set a real email; avoid writing placeholder labels like 'Anonymous User'
            if (user.email) {
                currentEmailInput.value = user.email;
            } else {
                currentEmailInput.value = '';
            }
        }
        
        // Profile picture upload now handled by portal-avatar-integration.js (Supabase)
        // Old initializeProfilePictureUpload() call removed
    }
    
    // Profile picture upload handled by portal-avatar-integration.js (Supabase)
    // Old initializeProfilePictureUpload / showCropModal / cropAndUploadImage removed
    
    // Update UI for external auth state (for SSO)
    function updateUIForUser(user) {
        const userProfile = document.getElementById('user-profile');
        const userPortalLink = document.getElementById('user-portal-link');
        if (user) {
            updateUserProfile(user);
            if (userProfile) userProfile.style.display = 'flex';
            if (userPortalLink) userPortalLink.style.display = 'block';
        } else {
            if (userProfile) userProfile.style.display = 'none';
            if (userPortalLink) userPortalLink.style.display = 'none';
        }
    }
    // Expose the UI updater for other modules (portal, header, notifications)
    window.updateUIForUser = updateUIForUser;

        // --- Firestore Notifications: initialization and listeners ---
        // Lazily ensure Firestore SDK and instance are available on window
        async function ensureFirestore() {
            if (window.firebaseFirestore && window.firestoreCollection && window.firestoreQuery && window.firestoreWhere && window.firestoreOnSnapshot) {
                return window.firebaseFirestore;
            }
            try {
                const appAuthReady = !!window.firebaseAuth;
                // Import Firestore SDK (modular)
                const firestoreMod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, addDoc, deleteField } = firestoreMod;
                // Try to reuse an already initialized app via compat or prior module scripts
                // Some pages initialize Firestore in page <script type="module"> blocks; expose helpers for reuse
                const db = window.firebaseFirestore || getFirestore();
                window.firebaseFirestore = db;
                window.firestoreCollection = collection;
                window.firestoreQuery = query;
                window.firestoreWhere = where;
                window.firestoreOnSnapshot = onSnapshot;
                window.firestoreDoc = doc;
                window.firestoreUpdateDoc = updateDoc;
                window.firestoreServerTimestamp = serverTimestamp;
                window.firestoreOrderBy = orderBy;
                window.firestoreAddDoc = addDoc;
                window.firestoreDeleteField = deleteField;
                return db;
            } catch (e) {
                console.warn('Failed to initialize Firestore SDK:', e);
                throw e;
            }
        }

        // Manage a single active notifications unsubscribe
        let notificationsUnsubscribe = null;
        function detachNotificationsListener() {
            if (typeof notificationsUnsubscribe === 'function') {
                try { notificationsUnsubscribe(); } catch {}
            }
            notificationsUnsubscribe = null;
        }

        async function startGlobalNotificationsListener() {
            const db = await ensureFirestore();
            const auth = window.firebaseAuth;
            const user = auth?.currentUser;

            // Always clean up before reattaching
            detachNotificationsListener();

            // No user means no listener and zero badge
            if (!user) {
                updateNotificationCount(0);
                return;
            }

            const notificationsRef = window.firestoreCollection(db, 'notifications');
            const q = window.firestoreQuery(
                notificationsRef,
                window.firestoreWhere('userId', '==', user.uid)
            );

            notificationsUnsubscribe = window.firestoreOnSnapshot(q, (snapshot) => {
                const unreadCount = snapshot.docs.filter(doc => doc.data()?.read !== true).length;
                updateNotificationCount(unreadCount);
            }, (error) => {
                console.warn('Global notifications snapshot error:', error);
            });
        }

        // Expose detach for use in auth sign-out branch
        window.detachNotificationsListener = detachNotificationsListener;
        window.startGlobalNotificationsListener = startGlobalNotificationsListener;

    // Profile picture monitoring - listen for profile changes via auth reload
    // Instead of polling every 2 seconds, check on visibility change (more efficient)
    function setupProfilePictureMonitoring(auth) {
        const handleVisibilityChange = async () => {
            if (document.visibilityState !== 'visible') return;
            const user = auth.currentUser;
            if (!user) return;
            try {
                await user.reload();
                updateUserProfile(user);
            } catch (e) { /* silent - non-critical */ }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window._profileMonitorCleanup = () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    
    // Force refresh profile data (can be called manually)
    function refreshUserProfile() {
        const currentUser = window.firebaseAuth?.currentUser;
        if (currentUser) {
            // Reload user data from Firebase
            currentUser.reload().then(() => {
                updateUserProfile(currentUser);
                
                showAuthMessage('Profile refreshed!', 'info');
            }).catch(error => {
                console.error('Error refreshing profile:', error);
                showAuthMessage('Failed to refresh profile.', 'error');
            });
        }
    }
    
    // Make refresh function globally available
    window.refreshUserProfile = refreshUserProfile;// Get user email from various sources
    function getUserEmail(user) {
        // For anonymous users (no email and no provider data)
        if ((!user.email) && (!user.providerData || user.providerData.length === 0)) {
            return 'Anonymous User';
        }
        
        // Primary email from user object (works for most cases)
        if (user.email) {
            return user.email;
        }
        
        // Try to get email from provider data (backup method)
        if (user.providerData && user.providerData.length > 0) {
            const provider = user.providerData[0];
            if (provider.email) {
                return provider.email;
            }
            
            // For Google and GitHub, use a fallback based on provider
            if (provider.providerId === 'google.com') {
                return 'Google Account';
            } else if (provider.providerId === 'github.com') {
                return 'GitHub Account';
            }
        }
        
        // Final fallback
        return 'Account Email';
    }

    // Get default avatar based on user data
    function getDefaultAvatar(user) {
        // If anonymous user, use the anonymous icon
        if (!user.email && (!user.providerData || user.providerData.length === 0)) {
            return 'assets/icons/anonymous.png';
        }
        
        // For other users without a photo, create an avatar with their initial
        const initial = (user.displayName || user.email || 'A')[0].toUpperCase();
        const seed = user.email || user.uid;
        const colors = ['ff0080', '00fff9', 'ffff00', '8a2be2', '00ff41'];
        const color = colors[seed.length % colors.length];
        
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${color}&color=000&size=128&bold=true&format=png`;
    }

    // Get provider name from user data
    function getProviderName(user) {
        if (!user.providerData || user.providerData.length === 0) {
            return 'Anonymous';
        }
        
        const providerId = user.providerData[0].providerId;
        switch (providerId) {
            case 'google.com':
                return 'Google';
            case 'github.com':
                return 'GitHub';
            case 'facebook.com':
                return 'Facebook';
            case 'twitter.com':
                return 'Twitter';            default:
                return 'Email';
        }
    }
    
    } catch (error) {
        console.error('Auth initialization error:', error);
        // Even if Firebase fails, basic modal should still work
        showAuthMessage('Authentication system unavailable. Basic features enabled.', 'info');
    }
}

// CSS Animations are now in styles.css (glitchOverlay, rippleEffect, messageSlideIn/Out, fadeOut)

// Global Settings
const GR_SETTINGS = {
    notificationsBadgeEnabled: true,
    reduceMotion: false,
    portalAutoOpenOnSignIn: false
};

function loadSettings() {
    try {
        const badge = localStorage.getItem('gr.settings.notifications.badgeEnabled');
        const motion = localStorage.getItem('gr.settings.accessibility.reduceMotion');
        const autoPortal = localStorage.getItem('gr.settings.portal.autoOpenOnSignIn');
        if (badge !== null) GR_SETTINGS.notificationsBadgeEnabled = badge === '1';
        if (motion !== null) GR_SETTINGS.reduceMotion = motion === '1';
        if (autoPortal !== null) GR_SETTINGS.portalAutoOpenOnSignIn = autoPortal === '1';
    } catch (e) {}
    applySettings();
}

function applySettings() {
    const root = document.documentElement;
    if (GR_SETTINGS.reduceMotion) root.classList.add('gr-reduce-motion');
    else root.classList.remove('gr-reduce-motion');
}

// Initial settings load (safe to call before DOMContentLoaded — only touches documentElement)
try { loadSettings(); } catch (e) {}


// Chatbot FAB initializer (works even when footer scripts don't run)
function setupChatbotFab() {
    // Restrict chatbot to support page only
    if (!/\/support\.html$/i.test(location.pathname)) return;
    const btn = document.getElementById('chatbot-fab');
    if (!btn) return; // No FAB on this page

    // Ensure loader script exists only once
    let loader = document.getElementById('doai-chatbot-loader');
    if (!loader) {
        loader = document.createElement('script');
        loader.id = 'doai-chatbot-loader';
        loader.async = true;
        loader.src = 'https://kcur57gey4euhzpupakvb43g.agents.do-ai.run/static/chatbot/widget.js';
        // Mirror data-* attributes used in footer.html so it boots correctly
        loader.setAttribute('data-agent-id', 'bd55ebc0-7b86-11f0-b074-4e013e2ddde4');
        loader.setAttribute('data-chatbot-id', 'iLcsXT380jITKSw3t6GQxi14J3z3bc64');
    loader.setAttribute('data-name', 'GlitchRealm Bot');
        loader.setAttribute('data-primary-color', '#031B4E');
        loader.setAttribute('data-secondary-color', '#E5E8ED');
        loader.setAttribute('data-button-background-color', '#0061EB');
        loader.setAttribute('data-starting-message', 'Hello! How can I help you today?');
        loader.setAttribute('data-logo', '/static/chatbot/icons/default-agent.svg');
        loader.addEventListener('load', () => {
            resolveOpenFnCache = null; // reset
        });
        loader.addEventListener('error', () => {
            console.warn('[Chatbot] Failed to load widget script');
        });
    document.body.appendChild(loader);
    }

    // Small status hint bubble
    function hint(msg, isError) {
        try {
            const el = document.createElement('div');
            el.textContent = msg;
            el.style.position = 'fixed';
            el.style.right = '90px';
            el.style.bottom = '26px';
            el.style.padding = '8px 12px';
            el.style.border = '1px solid var(--primary-cyan)';
            el.style.background = 'rgba(0,0,0,0.85)';
            el.style.color = isError ? 'var(--danger)' : 'var(--primary-cyan)';
            el.style.borderRadius = '6px';
            el.style.zIndex = 2300;
            el.style.fontFamily = 'Rajdhani, sans-serif';
            el.style.fontSize = '0.9rem';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1400);
        } catch {}
    }

    // Detect an open() function from various namespaces
    let resolveOpenFnCache = null;
    let readyInstance = null; // capture instance from ready event if provided
    let pendingOpen = false; // set true on click until opened or timeout
    function resolveOpenFn() {
        if (resolveOpenFnCache) return resolveOpenFnCache;
        // Prefer an explicit instance first
        try {
            if (readyInstance) {
                const m = ['open','toggle','show','start','expand','openChat','openWidget','openChatbot'].find(k => typeof readyInstance[k] === 'function');
                if (m) return (resolveOpenFnCache = () => readyInstance[m]());
                if (readyInstance.widget) {
                    const wm = ['open','toggle','show','start','expand','openChat','openWidget','openChatbot'].find(k => typeof readyInstance.widget[k] === 'function');
                    if (wm) return (resolveOpenFnCache = () => readyInstance.widget[wm]());
                }
            }
        } catch {}
        const g = window;
        const namespaces = [g.DOAIChatbot, g.DoAIChatbot, g.doAIChatbot, g.doaiChatbot, g.DOAI, g.DoAI, g.doAI, g.doai].filter(Boolean);
        try {
            for (const k of Object.keys(g)) {
                if (/doai|DoAI|DOAI/i.test(k)) {
                    try { namespaces.push(g[k]); } catch {}
                }
            }
        } catch {}
        const methods = ['open', 'toggle', 'show', 'start', 'expand', 'openChat', 'openWidget', 'openChatbot'];
        for (const ns of namespaces) {
            if (!ns) continue;
            for (const m of methods) {
                try { if (typeof ns[m] === 'function') return (resolveOpenFnCache = () => ns[m]()); } catch {}
            }
            try {
                if (ns.widget) {
                    for (const m of methods) {
                        if (typeof ns.widget[m] === 'function') return (resolveOpenFnCache = () => ns.widget[m]());
                    }
                }
            } catch {}
        }
        return null;
    }

    function tryOpen() {
        const fn = resolveOpenFn();
        if (fn) {
            try { fn(); return true; } catch (e) { console.warn('[Chatbot] open failed:', e); }
        }
        // Fire events and postMessage as a fallback
        try { window.dispatchEvent(new CustomEvent('doai:open')); } catch {}
        try { window.dispatchEvent(new Event('doai-open')); } catch {}
        try { window.postMessage({ type: 'doai:open' }, '*'); } catch {}
        return false;
    }

    // Update cache when widget posts messages or loads
    window.addEventListener('message', (ev) => {
        try {
            if (typeof ev.origin === 'string' && ev.origin.includes('agents.do-ai.run')) {
                if (ev.data && (ev.data.type || ev.data.event)) {
                }
                resolveOpenFnCache = null;
                // If user clicked and widget just spoke, try to open immediately
                if (pendingOpen) {
                    tryOpen();
                }
                // Try styling the widget launcher when we detect its messages
                setTimeout(styleWidgetLauncher, 100);
            }
        } catch {}
    });
    ['doai:ready', 'doai-ready', 'DoAI:ready'].forEach(evt => window.addEventListener(evt, (e) => {
        if (e && e.detail) readyInstance = e.detail;
        resolveOpenFnCache = null;
        if (pendingOpen) {
            tryOpen();
        }
    }));
    window.addEventListener('load', () => { resolveOpenFnCache = null; });

    // If tryOpen keeps failing, probe for candidates and log them once
    let probed = false;
    function deepProbe() {
        if (probed) return; probed = true;
        try {
            const candidates = [];
            for (const k of Object.keys(window)) {
                if (/doai|chat|bot|widget/i.test(k)) {
                    try {
                        const v = window[k];
                        if (v && (typeof v === 'object' || typeof v === 'function')) {
                            const keys = Object.keys(v).slice(0, 10);
                            candidates.push({ key: k, type: typeof v, keys });
                        }
                    } catch {}
                }
            }
        } catch {}
        // Try posting directly to widget iframes
        try {
            document.querySelectorAll('iframe[src*="agents.do-ai.run"]').forEach((ifr) => {
                try { ifr.contentWindow?.postMessage({ type: 'doai:open' }, '*'); } catch {}
            });
        } catch {}
    }

    // Try to find the widget's own launcher button and make it look like our FAB
    let widgetStyled = false;
    function styleWidgetLauncher() {
        if (widgetStyled) return true;
        const candidates = [];
        try {
            const selectors = [
                '[data-doai-launcher]',
                '[class*="doai"][class*="launch"]',
                '.doai-launcher',
                '.doai-widget-launcher',
                '.doai-chatbot-launcher',
                '.doai-floating-button',
                'button[aria-label*="chat" i]',
                'button[title*="chat" i]'
            ];
            selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => candidates.push(el)));
        } catch {}
        const launcher = candidates.find(el => {
            try {
                const r = el.getBoundingClientRect();
                return r.width && r.height; // visible-ish
            } catch { return false; }
        });
        if (!launcher) return false;

        try {
            launcher.classList.add('chatbot-fab', 'doai-styled-fab');
            // Minimal inline to standardize placement; visual look comes from CSS class with !important
            Object.assign(launcher.style, {
                position: 'fixed',
                right: '20px',
                bottom: '20px',
                width: '56px',
                height: '56px',
                zIndex: '2200'
            });
            // Hide any existing icon and inject our speech bubble SVG if not present
            const existingIcon = launcher.querySelector('svg, img');
            if (existingIcon) existingIcon.style.display = 'none';
            if (!launcher.querySelector('.gr-fab-icon')) {
                const wrapper = document.createElement('span');
                wrapper.className = 'gr-fab-icon';
                wrapper.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.48 3 2 6.94 2 11.8c0 2.48 1.24 4.72 3.26 6.28V21l2.98-1.64c1.11.31 2.3.48 3.76.48 5.52 0 10-3.94 10-8.8S17.52 3 12 3zm-5 8h10v2H7v-2zm8-3v2H7V8h8z"/></svg>';
                launcher.appendChild(wrapper);
            }
            // Hide our duplicate FAB if present
            const fab = document.getElementById('chatbot-fab');
            if (fab) fab.style.display = 'none';
            widgetStyled = true;
            return true;
        } catch (e) {
            console.warn('[Chatbot] Failed to style widget launcher', e);
            return false;
        }
    }

    // Bind click with retries and console logs
    btn.addEventListener('click', () => {
        hint('Opening chat…');
        pendingOpen = true;
        if (tryOpen()) { pendingOpen = false; return; }
        let elapsed = 0;
        const step = 500; // ms
        const max = 20000; // 20s
        const timer = setInterval(() => {
            elapsed += step;
            if (tryOpen()) { clearInterval(timer); pendingOpen = false; return; }
            if (elapsed === 2000) hint('Chatbot still loading…');
            if (elapsed >= max) {
                clearInterval(timer);
                hint('Chatbot not ready', true);
                deepProbe();
                pendingOpen = false;
            }
        }, step);
    }, { once: false });

    // Periodically attempt to style the widget's launcher for a short window
    let styleAttempts = 0;
    const styleTimer = setInterval(() => {
        styleAttempts++;
        if (styleWidgetLauncher() || styleAttempts > 30) {
            clearInterval(styleTimer);
        }
    }, 300);
}

// Profile action buttons
function initializeProfileActions() {
    const closeDropdown = () => {
        const dd = document.querySelector('.profile-dropdown');
        if (dd) setDropdownOpen(dd, false);
    };

    // This runs again after every auth-state change, so bind each control once.
    const bind = (el, handler) => {
        if (!el || el.dataset.actionsBound) return;
        el.dataset.actionsBound = '1';
        el.addEventListener('click', handler);
    };

    bind(document.getElementById('refresh-profile-btn'), () => { closeDropdown(); refreshUserProfile(); });
    bind(document.getElementById('user-portal-btn'), () => { closeDropdown(); window.location.href = 'user-portal.html'; });
    bind(document.getElementById('sign-out-btn'), () => { closeDropdown(); signOut(); });

    // Account deletion is requested by email now (self-service deletion UI was
    // retired). The entry is an anchor with a mailto: href, so no navigation
    // handler is needed here.
    bind(document.getElementById('delete-account-btn'), () => { closeDropdown(); });
    bind(document.getElementById('settings-btn'), () => { closeDropdown(); window.location.href = '/settings.html'; });

    // Notification bell
    bind(document.getElementById('notification-bell'), (e) => {
        e.preventDefault();
        handleNotificationClick();
    });
}

// Account deletion is now requested by email (the self-service deletion UI
// was retired). The underlying deleteUser / deleteUserAccount implementation
// is retained for administrative use.

// Terms Agreement Popup Functionality
document.addEventListener('DOMContentLoaded', function() {
    const termsPopup = document.getElementById('terms-popup');
    const acceptBtn = document.getElementById('accept-terms');
    const declineBtn = document.getElementById('decline-terms');

    // Only run if the terms popup exists on this page
    if (!termsPopup) {
        return;
    }

    // Check if user has already agreed to terms
    const hasAgreedToTerms = localStorage.getItem('glitchRealm_termsAgreed');
    const termsVersion = '1.0'; // Update this when terms change
    const currentVersion = localStorage.getItem('glitchRealm_termsVersion');
    
    // If global scheduler is active, let it decide when to show to avoid stacking
    const schedulerActive = !!window.GR_POPUP_SCHEDULER_ACTIVE;
    if (!schedulerActive) {
        // Show popup unless they specifically agreed to current version
        if (!hasAgreedToTerms || currentVersion !== termsVersion) {
            termsPopup.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            termsPopup.style.display = 'none';
        }
    } else {
        termsPopup.style.display = 'none';
    }
    
    // Handle accept button
    acceptBtn.addEventListener('click', function() {
        // Store agreement in localStorage
        localStorage.setItem('glitchRealm_termsAgreed', 'true');
        localStorage.setItem('glitchRealm_termsVersion', termsVersion);
        localStorage.setItem('glitchRealm_termsAcceptedDate', new Date().toISOString());
        
        // Hide popup with animation
        termsPopup.style.animation = 'fadeOut 0.3s ease-in';
        setTimeout(() => {
            termsPopup.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
        
        showAuthMessage('Welcome to GlitchRealm!', 'success');
    });    // Handle decline button
    declineBtn.addEventListener('click', function() {        // Show popup alert explaining what will happen
        alert('You will be taken to about:blank or the tab will be closed (depending on your browser) since you did not agree to the Terms of Service and/or Privacy Policy. You can close this tab afterwards.');
        
        // Clear any previous agreement so popup shows again next time
        localStorage.removeItem('glitchRealm_termsAgreed');
        localStorage.removeItem('glitchRealm_termsVersion');
        localStorage.removeItem('glitchRealm_termsAcceptedDate');
        
        // Try multiple methods to close/redirect
        try {
            // First try to close the window
            window.close();
            
            // If that doesn't work after a short delay, redirect to about:blank
            setTimeout(() => {
                window.location.href = 'about:blank';
            }, 100);
            
        } catch (e) {
            // Fallback - redirect to about:blank
            window.location.href = 'about:blank';
        }
    });
    
    // Prevent closing popup with Escape key for terms agreement
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && termsPopup.style.display === 'flex') {
            e.preventDefault();
            showAuthMessage('You must accept or decline the terms to continue.', 'info');
        }
    });
    
    // Prevent clicking outside to close for terms agreement
    termsPopup.addEventListener('click', function(e) {
        if (e.target === termsPopup) {
            e.preventDefault();
            showAuthMessage('Please choose to accept or decline the terms.', 'info');
        }
    });
});

// fadeOut animation is now in styles.css

// Load Header and Footer
document.addEventListener('DOMContentLoaded', function() {
    
    // Load header IMMEDIATELY — it's above-the-fold critical content.
    // The build inlines components/header.html into each page and marks the
    // placeholder with data-inlined="1"; in that case the fetch is skipped
    // entirely (the partial's scripts already executed during parsing).
    const HEADER_VERSION = '2';

    const initializeHeader = (headerPlaceholder, runScripts) => {
        if (!headerPlaceholder) return;

        // After injecting header via innerHTML, inline <script> tags don't auto-execute.
        // Re-run any script tags (e.g., sign-in button setup) safely.
        if (runScripts) {
            try {
                const headerScripts = headerPlaceholder.querySelectorAll('script');
                headerScripts.forEach(orig => {
                    if (orig.dataset.executed === '1') return;
                    const clone = document.createElement('script');
                    for (const attr of orig.attributes) {
                        if (attr.name === 'id' && document.getElementById(attr.value)) continue;
                        clone.setAttribute(attr.name, attr.value);
                    }
                    clone.dataset.fromHeader = '1';
                    if (!orig.src) clone.textContent = orig.textContent || '';
                    document.body.appendChild(clone);
                    orig.dataset.executed = '1';
                });
            } catch (e) { console.warn('Header script execution issue:', e); }
        }

        // Also call setupSignInButton immediately in case inline script didn't set listener
        if (window._setupSignInButton) window._setupSignInButton();

        // Update active nav link based on current page
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if ((href === 'index.html' || href === './index.html') && currentPage === 'index.html') {
                link.classList.add('active');
            }
        });

        // Initialize auth elements immediately — innerHTML is synchronous,
        // no setTimeout needed since DOM is already updated at this point.
        if (window.firebaseAuth) {
            if (window.pendingAuthInit) {
                window.pendingAuthInit();
                window.pendingAuthInit = null;
            } else {
                initializeAuthElements();
            }
            // Wire Moderation menu based on current auth state (dev UIDs only)
            try {
                const user = window.firebaseAuth.currentUser;
                const moderationMenuBtn = document.getElementById('moderation-menu-btn');
                if (moderationMenuBtn) {
                    const DEV_UIDS = window.GlitchRealmDev?.DEV_UIDS || window.__ADMIN_UIDS__ || new Set();
                    const newBtn = moderationMenuBtn.cloneNode(true);
                    moderationMenuBtn.parentNode.replaceChild(newBtn, moderationMenuBtn);
                    const show = !!(user && DEV_UIDS.has(user.uid));
                    if (show) {
                        newBtn.style.display = 'flex';
                        newBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            window.location.href = 'moderation.html';
                        });
                    } else {
                        newBtn.remove();
                    }
                }
            } catch (e) { /* non-fatal */ }
        } else {
            initializeAuthElements();
        }

        // Initialize dropdowns immediately
        initializeDropdowns();
    };

    const loadHeader = () => {
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (!headerPlaceholder) return;

        // Build-inlined partial: no request, no CLS, no script re-execution.
        if (headerPlaceholder.dataset.inlined === '1') {
            initializeHeader(headerPlaceholder, false);
            return;
        }

        fetch('components/header.html?v=' + HEADER_VERSION)
            .then(response => response.text())
            .then(data => {
                headerPlaceholder.innerHTML = data;
                initializeHeader(headerPlaceholder, true);
            })
            .catch(error => {
                console.error('Error loading header:', error);
            });
    };

    // Start header fetch immediately — no requestIdleCallback delay
    loadHeader();

    // Load footer (defer to idle — it's below the fold)
    const initializeFooter = (footerPlaceholder) => {
        // Initialize chatbot FAB only on support page after attempting to (re)load scripts
        if (/\/support\.html$/i.test(location.pathname)) {
            try { setupChatbotFab(); } catch (e) { console.warn('setupChatbotFab failed:', e); }
        }
    };

    const loadFooter = () => {
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (!footerPlaceholder) return;

        // Build-inlined partial: scripts already executed during parsing.
        if (footerPlaceholder.dataset.inlined === '1') {
            initializeFooter(footerPlaceholder);
            return;
        }

        fetch('components/footer.html')
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
                // After injecting footer via innerHTML, inline <script> tags don't auto-execute.
                // Re-run any script tags (e.g., chatbot loader, Buy Me a Coffee widget) safely.
                try {
                    const footerScripts = footerPlaceholder.querySelectorAll('script');
                    footerScripts.forEach(orig => {
                        if (orig.dataset.executed === '1') return;
                        const clone = document.createElement('script');
                        for (const attr of orig.attributes) {
                            if (attr.name === 'id' && document.getElementById(attr.value)) continue;
                            clone.setAttribute(attr.name, attr.value);
                        }
                        clone.dataset.fromFooter = '1';
                        if (!orig.src) clone.textContent = orig.textContent || '';
                        document.body.appendChild(clone);
                        orig.dataset.executed = '1';
                    });
                } catch (e) { console.warn('Footer script execution issue:', e); }

                initializeFooter(footerPlaceholder);
            })
            .catch(error => console.error('Error loading footer:', error));
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => loadFooter());
    } else {
        setTimeout(loadFooter, 150);
    }
});

// Function to initialize authentication elements after header is loaded
function initializeAuthElements() {
    
    // Re-get DOM elements after header is loaded
    const userProfile = document.getElementById('user-profile');
    const userPortalLink = document.getElementById('user-portal-link');
        
        // Re-initialize dropdown functionality (idempotent)
        initializeDropdowns();
        
        // Profile picture upload now handled by portal-avatar-integration.js (Supabase)
        // Old initializeProfilePictureUpload() and initializeCropModal() removed
        
        // Re-initialize profile action buttons
        initializeProfileActions();
        
        // Re-initialize auth state check
        if (window.firebaseAuth && window.firebaseAuth.currentUser) {
            const user = window.firebaseAuth.currentUser;
            if (user.isAnonymous) {
                // Guest identities are not a signed-in account.
                if (userProfile) userProfile.style.display = 'none';
                if (userPortalLink) userPortalLink.style.display = 'none';
            } else {
                updateUserProfile(user);
                if (userProfile) userProfile.style.display = 'flex';
                if (userPortalLink) userPortalLink.style.display = 'block';
            }
        }
}

// ==================== DROPDOWN STATE ====================
// One owner for dropdown state. This used to be two independent initializers
// that each cloned the trigger and bound their own click handler, so a single
// click toggled the menu twice (open, then immediately closed). State now goes
// through setDropdownOpen(), which also keeps aria-expanded / aria-hidden in
// sync for screen readers and the keyboard navigation module.
function setDropdownOpen(dropdown, open) {
    if (!dropdown) return;

    const trigger = dropdown.querySelector('.dropdown-trigger, .profile-trigger');
    const menu = dropdown.querySelector('.nav-dropdown-menu, .profile-menu');
    // On mobile the profile menu is shown by `.user-profile.open`.
    const wrapper = dropdown.classList.contains('profile-dropdown')
        ? dropdown.closest('.user-profile')
        : null;

    dropdown.classList.toggle('open', !!open);
    if (wrapper) wrapper.classList.toggle('open', !!open);
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (menu) menu.setAttribute('aria-hidden', open ? 'false' : 'true');
}

// accessibility-keyboard-nav.js drives the same menu from the keyboard.
window.setDropdownOpen = setDropdownOpen;

function closeDropdowns(except) {
    document.querySelectorAll('.nav-dropdown.open, .profile-dropdown.open').forEach((dropdown) => {
        if (dropdown !== except) setDropdownOpen(dropdown, false);
    });
    if (!except || !except.classList.contains('profile-dropdown')) {
        document.querySelectorAll('.user-profile.open').forEach((wrapper) => wrapper.classList.remove('open'));
    }
}

// Idempotent: safe to call on DOMContentLoaded, after the header is injected,
// and on every auth-state change. The bind guard lives on the element itself so
// a freshly injected header is still wired up, but a second call never adds a
// duplicate handler.
function initializeDropdowns() {
    const navDropdown = document.querySelector('.nav-dropdown');
    const navTrigger = navDropdown?.querySelector('.dropdown-trigger');

    if (navDropdown && navTrigger && !navTrigger.dataset.dropdownBound) {
        navTrigger.dataset.dropdownBound = '1';
        navTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const willOpen = !navDropdown.classList.contains('open');
            closeDropdowns(navDropdown);
            setDropdownOpen(navDropdown, willOpen);
        });
    }

    if (navDropdown) {
        navDropdown.querySelectorAll('.nav-dropdown-link').forEach((link) => {
            if (link.dataset.dropdownBound) return;
            link.dataset.dropdownBound = '1';
            link.addEventListener('click', () => setDropdownOpen(navDropdown, false));
        });
    }

    const profileDropdown = document.querySelector('.profile-dropdown');
    const profileTrigger = profileDropdown?.querySelector('.profile-trigger');

    if (profileDropdown && profileTrigger && !profileTrigger.dataset.dropdownBound) {
        profileTrigger.dataset.dropdownBound = '1';
        profileTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const willOpen = !profileDropdown.classList.contains('open');
            closeDropdowns(profileDropdown);
            setDropdownOpen(profileDropdown, willOpen);
        });
    }

    initializeProfileActions();

    // Global close handlers: bound once for the lifetime of the page.
    if (window._globalDropdownHandlerAdded) return;
    window._globalDropdownHandlerAdded = true;

    document.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-dropdown.open, .profile-dropdown.open').forEach((dropdown) => {
            if (!dropdown.contains(e.target)) setDropdownOpen(dropdown, false);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const open = document.querySelector('.nav-dropdown.open, .profile-dropdown.open');
        if (!open) return;
        closeDropdowns();
        const trigger = open.querySelector('.dropdown-trigger, .profile-trigger');
        if (trigger) trigger.focus();
    });
}

// Notification Bell Functions
function handleNotificationClick() {
    // Clear notification count
    updateNotificationCount(0);
    
    // Show notifications popup
    showNotificationsPopup();
}

async function showNotificationsPopup() {
    const auth = window.firebaseAuth;
    const db = window.firebaseFirestore;
    
    if (!auth || !db) {
        console.error('Firebase not initialized');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        alert('Please sign in to view notifications');
        return;
    }
    
    // Create modal HTML if it doesn't exist
    let modal = document.getElementById('notifications-popup-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notifications-popup-modal';
        modal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 100000; align-items: center; justify-content: center;';
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(10,10,30,0.98), rgba(20,10,30,0.98)); border: 2px solid var(--primary-cyan); border-radius: 16px; max-width: 600px; width: 90%; max-height: 80vh; overflow: hidden; box-shadow: 0 0 40px rgba(0,255,249,0.3); position: relative;">
                <div style="padding: 25px 30px; border-bottom: 1px solid rgba(0,255,249,0.2); display: flex; align-items: center; justify-content: space-between;">
                    <h2 style="color: var(--primary-cyan); margin: 0; font-size: 1.8rem; display: flex; align-items: center; gap: 12px;">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        Notifications
                    </h2>
                    <button id="close-notifications-popup" style="background: none; border: none; color: rgba(255,255,255,0.7); font-size: 2rem; cursor: pointer; line-height: 1; padding: 0; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.3s ease;">&times;</button>
                </div>
                <div id="notifications-popup-list" style="padding: 20px 30px; overflow-y: auto; max-height: calc(80vh - 100px);"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close button handler
        document.getElementById('close-notifications-popup').onclick = () => {
            modal.style.display = 'none';
        };
        
        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }
    
    // Show modal
    modal.style.display = 'flex';
    
    // Load notifications
    const list = document.getElementById('notifications-popup-list');
    list.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 30px;">Loading notifications...</p>';
    
    try {
        const { collection, query, where, orderBy, getDocs, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        
        list.innerHTML = '';
        
        if (notifications.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 30px;">No notifications yet</p>';
        } else {
            notifications.forEach(notif => {
                const item = document.createElement('div');
                item.style.cssText = `
                    background: ${notif.read ? 'rgba(0,255,249,0.05)' : 'rgba(0,255,249,0.12)'};
                    border: 1px solid ${notif.read ? 'rgba(0,255,249,0.2)' : 'var(--primary-cyan)'};
                    border-radius: 10px;
                    padding: 18px;
                    margin-bottom: 15px;
                    cursor: ${notif.read ? 'default' : 'pointer'};
                    transition: all 0.3s ease;
                `;
                
                const time = notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString() : 'Just now';
                
                item.innerHTML = `
                    <div style="color: var(--primary-cyan); font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">${notif.title || 'Notification'}</div>
                    <div style="color: rgba(255,255,255,0.85); font-size: 0.95rem; line-height: 1.6; margin-bottom: 10px;">${notif.message || ''}</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">${time}</div>
                `;
                
                // Mark as read when clicked
                if (!notif.read) {
                    item.onmouseenter = () => {
                        item.style.background = 'rgba(0,255,249,0.15)';
                        item.style.borderColor = 'rgba(0,255,249,0.6)';
                    };
                    item.onmouseleave = () => {
                        item.style.background = 'rgba(0,255,249,0.12)';
                        item.style.borderColor = 'var(--primary-cyan)';
                    };
                    
                    item.onclick = async () => {
                        try {
                            await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                            item.style.background = 'rgba(0,255,249,0.05)';
                            item.style.borderColor = 'rgba(0,255,249,0.2)';
                            item.style.cursor = 'default';
                            item.onmouseenter = null;
                            item.onmouseleave = null;
                            item.onclick = null;
                            
                            // Update badge count
                            const currentCount = parseInt(document.getElementById('notification-count')?.textContent || '0');
                            if (currentCount > 0) {
                                updateNotificationCount(currentCount - 1);
                            }
                        } catch (error) {
                            console.error('Error marking notification as read:', error);
                        }
                    };
                }
                
                list.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        list.innerHTML = '<p style="text-align: center; color: rgba(255,100,100,0.8); padding: 30px;">Error loading notifications. Please try again later.</p>';
    }
}

function updateNotificationCount(count) {
    const badgeEnabled = GR_SETTINGS.notificationsBadgeEnabled !== false;

    // Update notification count in dropdown menu
    const notificationCountElement = document.getElementById('notification-count');
    const notificationCountInline = document.getElementById('notification-count-inline');
    const notificationCountTrigger = document.getElementById('notification-count-trigger');
    if (notificationCountElement) {
        if (count > 0) {
            notificationCountElement.textContent = count > 99 ? '99+' : count.toString();
            notificationCountElement.style.display = 'flex';
        } else {
            notificationCountElement.style.display = 'none';
        }
    }
    if (notificationCountInline) {
        const inlineText = count > 99 ? '99+' : Math.max(count, 0).toString();
        notificationCountInline.textContent = inlineText;
        notificationCountInline.style.display = (count > 0) ? 'inline-flex' : 'none';
    }
    if (notificationCountTrigger) {
        const triggerText = count > 99 ? '99+' : Math.max(count, 0).toString();
        notificationCountTrigger.textContent = triggerText;
        notificationCountTrigger.style.display = (count > 0) ? 'inline-flex' : 'none';
    }
    
    // Update notification count badge on profile trigger
    const notificationCountBadge = document.getElementById('notification-count-badge');
    if (notificationCountBadge) {
        if ((count > 0) || badgeEnabled) {
            notificationCountBadge.textContent = count > 99 ? '99+' : count.toString();
            notificationCountBadge.style.display = 'flex';
        } else {
            notificationCountBadge.style.display = 'none';
        }
    }
}

// Auto-initialize notification bell when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Mobile Navigation
    initializeMobileNavigation();
});

// Mobile Menu Toggle Functionality
function initializeMobileNavigation() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    let isMenuOpen = false;

    // Debug logging

    function toggleMobileMenu() {
        isMenuOpen = !isMenuOpen;
        
        if (mobileMenuToggle) {
            mobileMenuToggle.classList.toggle('active', isMenuOpen);
        }
        if (navLinks) {
            navLinks.classList.toggle('active', isMenuOpen);
        }
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        
        // Close other dropdowns when menu opens
        if (isMenuOpen) {
            closeAllDropdowns();
        }
    }

    function closeMobileMenu() {
        if (isMenuOpen) {
            isMenuOpen = false;
            if (mobileMenuToggle) {
                mobileMenuToggle.classList.remove('active');
            }
            if (navLinks) {
                navLinks.classList.remove('active');
            }
            document.body.style.overflow = '';
        }
    }

    function closeAllDropdowns() {
        closeDropdowns();
    }

    // Mobile menu toggle click handler
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileMenu();
        });
        
        // Also add touch event for better mobile support
        mobileMenuToggle.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMobileMenu();
        });
        
    } else {
        console.warn('Mobile menu toggle button not found!');
    }

    // Close mobile menu when clicking on nav links (except dropdowns)
    if (navLinks) {
        navLinks.addEventListener('click', function(e) {
            // Close menu if clicking on a direct nav link (not dropdown triggers)
            if (e.target.classList.contains('nav-link') && 
                !e.target.classList.contains('dropdown-trigger') &&
                !e.target.classList.contains('profile-trigger')) {
                closeMobileMenu();
            }
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (isMenuOpen && 
            navLinks && !navLinks.contains(e.target) && 
            mobileMenuToggle && !mobileMenuToggle.contains(e.target)) {
            closeMobileMenu();
        }
    });

    // Close mobile menu on window resize to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && isMenuOpen) {
            closeMobileMenu();
        }
    });

    // Touch handling for better mobile experience
    let touchStartY = 0;
    if (navLinks) {
        navLinks.addEventListener('touchstart', function(e) {
            touchStartY = e.touches[0].clientY;
        });

        navLinks.addEventListener('touchmove', function(e) {
            // Allow scrolling within the nav menu
            const touchY = e.touches[0].clientY;
            const scrollTop = this.scrollTop;
            const scrollHeight = this.scrollHeight;
            const height = this.clientHeight;
            const deltaY = touchY - touchStartY;

            // Prevent overscroll
            if ((scrollTop === 0 && deltaY > 0) || 
                (scrollTop === scrollHeight - height && deltaY < 0)) {
                e.preventDefault();
            }
        });
    }
    
}
