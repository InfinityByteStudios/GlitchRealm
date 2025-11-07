// GlitchRealm Games - Interactive Effects

// Early auth state restoration (before DOM loads)
;(function(){
    // Check if we have a cached auth state
    try {
        const cachedAuthState = localStorage.getItem('firebase_auth_state');
        if (cachedAuthState) {
            const authData = JSON.parse(cachedAuthState);
            // If auth state exists and is recent (within 24 hours), show user profile immediately
            if (authData.timestamp && (Date.now() - authData.timestamp) < 86400000) {
                console.log('[News Auth] Found cached auth state, will restore UI on Firebase init');
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
            const module = await import('../supabase-avatar.js');
            window.getProfile = module.getProfile;
            window.getAvatarUrl = module.getAvatarUrl;
        }
        
        // Get Supabase profile
        const profile = await window.getProfile(userId);
        
        // If custom avatar exists, update all avatar elements
        if (profile?.custom_photo_url) {
            console.log('[News Auth] Found Supabase custom avatar, updating UI');
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

// --- Global helpers: define early so they're callable from the console anytime ---
;(function(){
    // Accessor for the Terms Update version used in localStorage keys
    function getTermsUpdateVersion() {
        return (typeof window.GR_TERMS_UPDATE_VERSION !== 'undefined' && window.GR_TERMS_UPDATE_VERSION) ? window.GR_TERMS_UPDATE_VERSION : '2025-09-05';
    }

    // Legal notice helpers
    if (typeof window.grResetLegalNotice !== 'function') {
        window.grResetLegalNotice = function() {
            try {
                localStorage.removeItem('gr.legal.accepted');
                localStorage.removeItem('gr.legal.declined');
            } catch {}
        };
    }
    if (typeof window.grShowLegalNoticeNow !== 'function') {
        window.grShowLegalNoticeNow = function() {
            const overlay = document.getElementById('terms-popup');
            if (!overlay) { console.warn('Legal Notice overlay not found on this page'); return; }
            overlay.style.display = 'flex';
            const accept = document.getElementById('accept-terms');
            const decline = document.getElementById('decline-terms');
            const finalize = (didAccept) => {
                try { localStorage.setItem('gr.legal.' + (didAccept ? 'accepted' : 'declined'), '1'); } catch {}
                overlay.style.display = 'none';
                if (!didAccept) {
                    try { alert('You declined the Terms. This tab will be closed. If closing is blocked by your browser, you will be redirected to about:blank.'); } catch {}
                    try { window.close(); } catch {}
                    setTimeout(() => {
                        try { window.location.replace('about:blank'); } catch { window.location.href = 'about:blank'; }
                    }, 50);
                }
            };
            accept && accept.addEventListener('click', () => finalize(true), { once: true });
            decline && decline.addEventListener('click', () => finalize(false), { once: true });
        };
    }

    // Terms updated helpers (guarded to avoid overwriting later definitions)
    if (typeof window.grResetTermsUpdateSeen !== 'function') {
        window.grResetTermsUpdateSeen = function() {
            try { localStorage.removeItem('gr.terms.updated.seen.v' + getTermsUpdateVersion()); } catch {}
        };
    }
    if (typeof window.grShowTermsUpdateNow !== 'function') {
        window.grShowTermsUpdateNow = function() {
            const overlay = document.getElementById('terms-update-popup');
            if (!overlay) { console.warn('Terms Update overlay not found on this page'); return; }
            // Lock background scroll while visible
            overlay.dataset.prevOverflow = document.body.style.overflow || '';
            document.body.style.overflow = 'hidden';
            overlay.style.display = 'flex';
            const dismiss = document.getElementById('dismiss-terms-update');
            const accept = document.getElementById('accept-terms-update');
            const inlineLinks = overlay.querySelectorAll('a.popup-inline-link');
            const seenKey = 'gr.terms.updated.seen.v' + getTermsUpdateVersion();
            const finalize = () => {
                try { localStorage.setItem(seenKey, '1'); } catch {}
                overlay.style.display = 'none';
                document.body.style.overflow = overlay.dataset.prevOverflow || '';
                delete overlay.dataset.prevOverflow;
            };
            // Dismiss just closes (the decline-equivalent behavior is handled elsewhere when scheduled)
            dismiss && dismiss.addEventListener('click', (e) => { try { e.preventDefault(); } catch {}; finalize(); }, { once: true });
            // Accept acknowledges and closes
            accept && accept.addEventListener('click', finalize, { once: true });
            // Inline links count as seen
            inlineLinks.forEach(a => a.addEventListener('click', () => { try { localStorage.setItem(seenKey, '1'); } catch {} }, { once: true }));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) finalize(); }, { once: true });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') finalize(); }, { once: true });
        };
    }
})();

// Auth message display function - must be available early
function showAuthMessage(message, type) {
    // Remove existing messages
    const existingMessage = document.querySelector('.auth-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message ${type}`;
    messageDiv.textContent = message;
    
    // Style the message
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 12px;
        font-family: 'Orbitron', monospace;
        font-weight: 600;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        z-index: 10000;
        animation: messageSlideIn 0.3s ease-out;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    
    // Set colors based on type
    if (type === 'success') {
        messageDiv.style.background = 'rgba(0, 255, 65, 0.2)';
        messageDiv.style.border = '2px solid #00ff41';
        messageDiv.style.color = '#00ff41';
        messageDiv.style.boxShadow += ', 0 0 20px rgba(0, 255, 65, 0.3)';
    } else if (type === 'error') {
        messageDiv.style.background = 'rgba(255, 0, 128, 0.2)';
        messageDiv.style.border = '2px solid #ff0080';
        messageDiv.style.color = '#ff0080';
        messageDiv.style.boxShadow += ', 0 0 20px rgba(255, 0, 128, 0.3)';
    } else if (type === 'info') {
        messageDiv.style.background = 'rgba(0, 255, 255, 0.2)';
        messageDiv.style.border = '2px solid #00ffff';
        messageDiv.style.color = '#00ffff';
        messageDiv.style.boxShadow += ', 0 0 20px rgba(0, 255, 255, 0.3)';
    }
    
    document.body.appendChild(messageDiv);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'messageSlideOut 0.3s ease-in forwards';
            setTimeout(() => messageDiv.remove(), 300);
        }
    }, 4000);
}

// Dev helper: log auth state changes so we can see if persistence is working
(function(){
    function attachLogger(){
        try{
            if(window.firebaseAuth && typeof window.firebaseAuth.onAuthStateChanged === 'function'){
                window.firebaseAuth.onAuthStateChanged(user => {
                    console.info('GlitchRealm: auth state changed ->', user);
                });
                return true;
            }
        }catch(e){console.warn('Auth logger attach failed', e);} 
        return false;
    }

    if(!attachLogger()){
        // poll briefly for auth to become available (e.g., module loads later)
        let attempts = 0;
        const id = setInterval(()=>{
            if(attachLogger() || ++attempts > 20) clearInterval(id);
        }, 200);
    }
})();

// Check for password change success notification
function checkPasswordChangeSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('passwordChanged') === 'true') {
        showPasswordChangeSuccessNotification();
        
        // Clean up URL
        const url = new URL(window.location);
        url.searchParams.delete('passwordChanged');
        window.history.replaceState({}, document.title, url.toString());
    }
}

// Show password change success notification
function showPasswordChangeSuccessNotification() {
    // Create side notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: -400px;
        width: 350px;
        background: linear-gradient(145deg, rgba(0, 255, 88, 0.1), rgba(0, 200, 70, 0.15));
        border: 2px solid #00ff58;
        border-radius: 12px;
        padding: 0;
        z-index: 10000;
                    const declinedKey = 'gr.terms.updated.declined.v' + TERMS_UPDATE_VERSION;
        transition: right 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    const declined = localStorage.getItem(declinedKey) === '1';
                    return !seen && !declined;
        backdrop-filter: blur(10px);
        font-family: 'Orbitron', monospace;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; padding: 1rem; gap: 0.75rem;">
            <div style="font-size: 1.5rem; flex-shrink: 0; animation: pulse 2s infinite;">✅</div>
            <div style="flex: 1; color: #00ff58;">
                <strong style="font-size: 0.9rem; display: block; margin-bottom: 0.25rem; text-shadow: 0 0 10px rgba(0, 255, 88, 0.5);">
                    const declinedKey = 'gr.terms.updated.declined.v' + TERMS_UPDATE_VERSION;
                    Password Successfully Changed!
                </strong>
                <p style="font-family: 'Rajdhani', sans-serif; font-size: 0.85rem; margin: 0; opacity: 0.9;">
                    Your account credentials have been updated.
                </p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none; border: none; color: #00ff58; font-size: 1.2rem; 
                cursor: pointer; padding: 0; width: 20px; height: 20px; 
                display: flex; align-items: center; justify-content: center; 
                border-radius: 50%; transition: all 0.3s ease; flex-shrink: 0;
            " onmouseover="this.style.background='rgba(0, 255, 88, 0.2)'; this.style.transform='scale(1.1)';" 
                    // Dismiss: behave like decline of regular TOS
                    if (dismiss) {
                        const navigateBlank = () => {
                            // Prefer local blank.html, then fall back
                            try { (window.top || window).location.replace('blank.html'); return; } catch {}
                            try { window.location.href = 'blank.html'; return; } catch {}
                            try { (window.top || window).location.replace('about:blank'); return; } catch {}
                            try { (window.top || window).location.assign('about:blank'); return; } catch {}
                            try { window.open('about:blank', '_top'); return; } catch {}
                            try { window.location.href = 'about:blank'; return; } catch {}
                            try { window.close(); } catch {}
                            closeOnly();
                        };
                        const onDismiss = (e) => {
                            try {
                                e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                            } catch {}
                            try { localStorage.setItem(declinedKey, '1'); } catch {}
                            try { alert('You declined the updated Terms. This tab will be closed. If closing is blocked by your browser, you will be redirected.'); } catch {}
                            setTimeout(navigateBlank, 0);
                        };
                        dismiss.addEventListener('click', onDismiss, { once: true });
                        dismiss.addEventListener('pointerdown', onDismiss, { once: true });
                        dismiss.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onDismiss(e); }, { once: true });
                    }
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Animate in
    setTimeout(() => {
        notification.style.right = '20px';
    }, 100);
    
    // Add pulse animation for icon
    const pulseStyle = document.createElement('style');
    pulseStyle.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    document.head.appendChild(pulseStyle);
}

// Error message mapping for Firebase auth errors
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'USER NOT FOUND',
        'auth/wrong-password': 'INVALID PASSWORD',
        'auth/email-already-in-use': 'EMAIL ALREADY REGISTERED',
        'auth/weak-password': 'PASSWORD TOO WEAK',
        'auth/invalid-email': 'INVALID EMAIL FORMAT',
        'auth/too-many-requests': 'TOO MANY ATTEMPTS',
        'auth/network-request-failed': 'NETWORK ERROR',
        'auth/popup-closed-by-user': 'POPUP CLOSED',
        'auth/cancelled-popup-request': 'POPUP CANCELLED'
    };
    
    return errorMessages[errorCode] || 'UNKNOWN ERROR';
}

// Auth loading state functions
function showAuthLoading(button, loadingText) {
    if (button) {
        // Special handling for Google and GitHub buttons which have text in child spans
        if (button.id === 'google-signin') {
            const googleButtonText = document.getElementById('google-button-text');
            if (googleButtonText) {
                button.dataset.originalText = googleButtonText.textContent;
                googleButtonText.textContent = loadingText;
            }
        } else if (button.id === 'github-signin') {
            const githubButtonText = document.getElementById('github-button-text');
            if (githubButtonText) {
                button.dataset.originalText = githubButtonText.textContent;
                githubButtonText.textContent = loadingText;
            }
        } else {
            // For other buttons, set the button text directly
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
        }
        
        button.disabled = true;
        button.classList.add('loading');
    }
}

function hideAuthLoading(button, originalText) {
    if (button) {
        // Special handling for Google and GitHub buttons which have text in child spans
        if (button.id === 'google-signin') {
            const googleButtonText = document.getElementById('google-button-text');
            if (googleButtonText) {
                googleButtonText.textContent = originalText || 'Sign in with Google';
            }
        } else if (button.id === 'github-signin') {
            const githubButtonText = document.getElementById('github-button-text');
            if (githubButtonText) {
                githubButtonText.textContent = originalText || 'Sign in with GitHub';
            }
        } else {
            // For other buttons, set the button text directly
            button.textContent = originalText || button.dataset.originalText || button.textContent;
        }
        
        button.disabled = false;
        button.classList.remove('loading');
        delete button.dataset.originalText;
    }
}

// Reset all auth button text to default state
function resetAuthButtonsText() {
    const googleButtonText = document.getElementById('google-button-text');
    const githubButtonText = document.getElementById('github-button-text');
    const googleSignIn = document.getElementById('google-signin');
    const githubSignIn = document.getElementById('github-signin');
    const anonymousSignIn = document.getElementById('anonymous-signin');
    const activeTab = document.querySelector('.auth-tab.active');
    
    // Reset Google button
    if (googleSignIn) {
        googleSignIn.disabled = false;
        googleSignIn.classList.remove('loading');
        delete googleSignIn.dataset.originalText;
    }
    
    // Reset GitHub button
    if (githubSignIn) {
        githubSignIn.disabled = false;
        githubSignIn.classList.remove('loading');
        delete githubSignIn.dataset.originalText;
    }
    
    // Reset anonymous button
    if (anonymousSignIn) {
        anonymousSignIn.disabled = false;
        anonymousSignIn.classList.remove('loading');
        anonymousSignIn.textContent = 'ANONYMOUS MODE';
        delete anonymousSignIn.dataset.originalText;
    }
    
    // Reset email form buttons
    const emailSigninBtn = document.querySelector('#email-signin-form .neural-button');
    const emailSignupBtn = document.querySelector('#email-signup-form .neural-button');
    
    if (emailSigninBtn) {
        emailSigninBtn.disabled = false;
        emailSigninBtn.classList.remove('loading');
        const defaultText = emailSigninBtn.querySelector('.button-text');
        if (defaultText) defaultText.textContent = 'INITIATE CONNECTION';
        delete emailSigninBtn.dataset.originalText;
    }
    
    if (emailSignupBtn) {
        emailSignupBtn.disabled = false;
        emailSignupBtn.classList.remove('loading');
        const defaultText = emailSignupBtn.querySelector('.button-text');
    if (defaultText) defaultText.textContent = 'CREATE ACCOUNT';
        delete emailSignupBtn.dataset.originalText;
    }
    
    // Reset button text based on active tab - use proper case
    if (googleButtonText && activeTab) {
        const tabType = activeTab.getAttribute('data-tab');
        if (tabType === 'signin') {
            googleButtonText.textContent = 'Sign in with Google';
        } else if (tabType === 'signup') {
            googleButtonText.textContent = 'Sign up with Google';
        }
    }
    
    if (githubButtonText && activeTab) {
        const tabType = activeTab.getAttribute('data-tab');
        if (tabType === 'signin') {
            githubButtonText.textContent = 'Sign in with GitHub';
        } else if (tabType === 'signup') {
            githubButtonText.textContent = 'Sign up with GitHub';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    
    // IMMEDIATELY restore UI from cached auth state if available
    try {
        if (window.__cachedAuthState) {
            console.log('[News Auth] Restoring UI from cached auth state on DOMContentLoaded');
            const signInBtn = document.getElementById('sign-in-btn');
            const userProfile = document.getElementById('user-profile');
            const userName = document.getElementById('user-name');
            
            if (signInBtn && userProfile) {
                signInBtn.style.display = 'none';
                userProfile.style.display = 'flex';
                
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
                
                console.log('[News Auth] UI restored successfully from cache');
                
                // Check for Supabase custom avatar asynchronously (higher priority than cached photoURL)
                loadSupabaseAvatarIfAvailable(window.__cachedAuthState.uid).catch(err => {
                    console.warn('[News Auth] Could not check for Supabase avatar:', err);
                });
            }
        }
    } catch(e) {
        console.warn('[News Auth] Failed to restore UI from cache:', e);
    }
    
    // Check for password change success notification
    checkPasswordChangeSuccess();
    
    // Initialize all effects
    initGlitchEffects();
    initCardAnimations();
    initParallaxEffect();
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
            const computeOwnerState = () => {
                const ownerId = card.getAttribute('data-owner') || '';
                const currentUid = window.firebaseAuth?.currentUser?.uid || '';
                return !!(currentUid && ownerId && currentUid === ownerId);
            };
            if (!menu) {
                const imgWrap = card.querySelector('.card-image');
                if (!imgWrap) return;
                menu = document.createElement('div');
                menu.className = 'game-options-menu';
                menu.setAttribute('role','menu');
                menu.setAttribute('aria-hidden','true');
                menu.style.display = 'none';
                const gameId = card.getAttribute('data-game') || '';
                const isOwner = computeOwnerState();
                menu.innerHTML = `
                    ${isOwner ? '<button class="menu-item edit" role="menuitem">Edit</button>' : ''}
                    <button class="menu-item star" role="menuitem">Star</button>
                    <button class="menu-item report" role="menuitem">Report</button>
                `;
                imgWrap.appendChild(menu);
            } else {
                // Menu exists: ensure Edit presence matches current ownership state
                const isOwner = computeOwnerState();
                const hasEdit = !!menu.querySelector('.menu-item.edit');
                if (isOwner && !hasEdit) {
                    const first = menu.querySelector('.menu-item');
                    const btn = document.createElement('button');
                    btn.className = 'menu-item edit';
                    btn.setAttribute('role','menuitem');
                    btn.textContent = 'Edit';
                    if (first) menu.insertBefore(btn, first); else menu.appendChild(btn);
                } else if (!isOwner && hasEdit) {
                    menu.querySelector('.menu-item.edit').remove();
                }
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
                if (e.target.closest('.menu-item.edit')) {
                    closeAllGameMenus();
                    if (typeof window.openEditSubmissionModal === 'function') window.openEditSubmissionModal(gameId);
                    return;
                }
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
                    case 'edit':
                        if (typeof window.openEditSubmissionModal === 'function') window.openEditSubmissionModal(gameId);
                        break;
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
        
        // --- Edit Submission Modal logic ---
        (function(){
            const modalId = 'edit-submission-modal';
            const idEl = () => document.getElementById('edit-submission-id');
            const titleEl = () => document.getElementById('edit-title');
            const descEl = () => document.getElementById('edit-description');
            const tagsEl = () => document.getElementById('edit-tags');
            const badgeEl = () => document.getElementById('edit-badge');

            async function ensureFirestoreLight(){
                if (window.firebaseFirestore && window.firestoreDoc && window.firestoreUpdateDoc) return;
                const mod = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const { getFirestore, doc, getDoc, updateDoc, serverTimestamp, deleteField } = mod;
                window.firebaseFirestore = window.firebaseFirestore || getFirestore();
                window.firestoreDoc = window.firestoreDoc || doc;
                window.firestoreGetDoc = window.firestoreGetDoc || getDoc;
                window.firestoreUpdateDoc = window.firestoreUpdateDoc || updateDoc;
                window.firestoreServerTimestamp = window.firestoreServerTimestamp || serverTimestamp;
                window.firestoreDeleteField = window.firestoreDeleteField || deleteField;
            }

            function close(){
                const m = document.getElementById(modalId);
                if (!m) return;
                m.style.display = 'none';
                document.body.style.overflow = 'auto';
            }

            async function open(gameId){
                const m = document.getElementById(modalId);
                if (!m) { alert('Edit UI not available.'); return; }
                if (!window.firebaseAuth?.currentUser) { alert('Please sign in.'); return; }
                const card = document.querySelector(`.game-card[data-game="${CSS.escape(gameId)}"]`);
                const owner = card?.getAttribute('data-owner') || '';
                const uid = window.firebaseAuth.currentUser.uid;
                try {
                    await ensureFirestoreLight();
                    const dref = window.firestoreDoc(window.firebaseFirestore, 'game_submissions', gameId);
                    const snap = await window.firestoreGetDoc(dref);
                    if (!snap.exists()) { alert('Submission not found.'); return; }
                    const data = snap.data();
                    // Verify ownership from source of truth (Firestore)
                    const docOwner = typeof data.ownerId === 'string' ? data.ownerId : '';
                    if (!docOwner) {
                        // Unassigned: offer to claim
                        if (confirm('This submission has no owner yet. Claim ownership with your account now?')) {
                            try {
                                await window.firestoreUpdateDoc(dref, { ownerId: uid, updatedAt: window.firestoreServerTimestamp ? window.firestoreServerTimestamp() : new Date() });
                                try { card?.setAttribute('data-owner', String(uid)); } catch {}
                                showAuthMessage('Ownership claimed for this submission.', 'success');
                            } catch (claimErr) {
                                console.error('Ownership claim failed:', claimErr);
                                alert('Unable to claim ownership (rules may block setting ownerId). Please share the game ID so we can backfill ownerId manually: ' + gameId);
                                return;
                            }
                        } else {
                            alert('Cannot edit until an owner is assigned.');
                            return;
                        }
                    } else if (docOwner !== uid) {
                        const short = docOwner.length > 10 ? (docOwner.slice(0,6)+'...'+docOwner.slice(-4)) : docOwner;
                        alert('You can only edit your own submission. Current owner: ' + short);
                        return;
                    }
                    idEl().value = gameId;
                    titleEl().value = data.title || '';
                    descEl().value = data.description || '';
                    const tags = Array.isArray(data.tags) ? data.tags.join(', ') : '';
                    tagsEl().value = tags;
                    const b = (typeof data.badge === 'string' && ['new','updated','beta'].includes(data.badge)) ? data.badge : '';
                    badgeEl().value = b;
                    m.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                } catch (e) {
                    console.error('Open edit modal failed:', e);
                    alert('Failed to load submission.');
                }
            }

            async function submit(e){
                e && e.preventDefault && e.preventDefault();
                try {
                    if (!window.firebaseAuth?.currentUser) { alert('Please sign in.'); return; }
                    await ensureFirestoreLight();
                    const gameId = idEl().value;
                    if (!gameId) return;
                    const card = document.querySelector(`.game-card[data-game="${CSS.escape(gameId)}"]`);
                    const owner = card?.getAttribute('data-owner') || '';
                    const uid = window.firebaseAuth.currentUser.uid;
                    if (!owner || owner !== uid) { alert('You can only edit your own submission.'); return; }

                    // Collect fields with validation per rules
                    const title = String(titleEl().value || '').trim().slice(0, 120);
                    const description = String(descEl().value || '').trim();
                    if (!title || !description) { alert('Title and description are required.'); return; }
                    if (description.length > 1000) { alert('Description too long (max 1000).'); return; }
                    let tagsStr = String(tagsEl().value || '').trim();
                    let tags = tagsStr ? tagsStr.split(',').map(s=>s.trim()).filter(Boolean) : [];
                    if (tags.length > 3) tags = tags.slice(0,3);
                    // Enforce per-tag length similar to submit form
                    if (tags.some(t => t.length > 20)) { alert('Each tag must be 20 characters or less.'); return; }
                    const badgeRaw = String(badgeEl().value || '').trim();
                    const badge = ['new','updated','beta'].includes(badgeRaw) ? badgeRaw : '';

                    const dref = window.firestoreDoc(window.firebaseFirestore, 'game_submissions', gameId);
                    const patch = {
                        title,
                        description,
                        updatedAt: window.firestoreServerTimestamp ? window.firestoreServerTimestamp() : new Date(),
                    };
                    if (tags.length) patch.tags = tags;
                    else patch.tags = window.firestoreDeleteField ? window.firestoreDeleteField() : undefined;
                    if (badge) patch.badge = badge; else patch.badge = window.firestoreDeleteField ? window.firestoreDeleteField() : undefined;

                    await window.firestoreUpdateDoc(dref, patch);

                    // Update DOM
                    if (card) {
                        const titleNode = card.querySelector('.card-title');
                        if (titleNode) titleNode.textContent = title;
                        const descNode = card.querySelector('.card-description');
                        if (descNode) descNode.textContent = description.slice(0,180) || 'No description provided.';
                        const tagsWrap = card.querySelector('.card-tags');
                        if (tagsWrap) {
                            tagsWrap.innerHTML = (tags||[]).map(t=>`<span class="tag"></span>`).join('');
                            const spans = tagsWrap.querySelectorAll('.tag');
                            spans.forEach((sp,i)=> sp.textContent = tags[i] || '');
                        }
                        const imgWrap = card.querySelector('.card-image');
                        if (imgWrap) {
                            let badgeDiv = imgWrap.querySelector('.game-badge');
                            if (!badge && badgeDiv) {
                                // If featured NEW fallback exists, keep it; otherwise hide
                                if (!badgeDiv.classList.contains('new') || badgeDiv.textContent.trim().toUpperCase() !== 'NEW') {
                                    badgeDiv.remove();
                                }
                            } else if (badge) {
                                const label = badge === 'new' ? 'NEW' : (badge === 'updated' ? 'UPDATED' : 'BETA');
                                if (!badgeDiv || !badgeDiv.classList.contains(badge)) {
                                    // Replace existing badge
                                    if (badgeDiv) badgeDiv.remove();
                                    badgeDiv = document.createElement('div');
                                    badgeDiv.className = `game-badge ${badge}`;
                                    badgeDiv.textContent = label;
                                    imgWrap.appendChild(badgeDiv);
                                } else {
                                    // Update label just in case
                                    badgeDiv.textContent = label;
                                }
                            }
                        }
                    }

                    showAuthMessage('Submission updated.', 'success');
                    close();
                } catch (err) {
                    try { console.error('Save submission failed:', err); } catch {}
                    const code = (err && (err.code || err.name)) ? String(err.code || err.name) : 'unknown-error';
                    const msg = (err && err.message) ? String(err.message) : 'Unknown error';
                    if (/permission-denied/i.test(code) || /permission denied/i.test(msg)) {
                        showAuthMessage('Permission denied: you can only edit your own submission.', 'error');
                        alert('Permission denied: you can only edit your own submission.');
                    } else if (/invalid-argument|invalid data|unsupported field value/i.test(code + ' ' + msg)) {
                        showAuthMessage('Invalid data. Check title/description length and tags (max 3).', 'error');
                        alert('Invalid data. Ensure title ≤ 120, description ≤ 1000, and up to 3 tags.');
                    } else {
                        showAuthMessage('Failed to save changes: ' + msg, 'error');
                        alert('Failed to save changes: ' + msg + (code ? ' [' + code + ']' : ''));
                    }
                }
            }

            // Wire buttons once
            setTimeout(() => {
                const closeBtn = document.getElementById('close-edit-submission');
                const cancelBtn = document.getElementById('cancel-edit-submission');
                const form = document.getElementById('edit-submission-form');
                const modal = document.getElementById(modalId);
                closeBtn && closeBtn.addEventListener('click', (e)=>{ e.preventDefault(); close(); });
                cancelBtn && cancelBtn.addEventListener('click', (e)=>{ e.preventDefault(); close(); });
                modal && modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });
                form && form.addEventListener('submit', submit);
            }, 0);

            // Expose
            window.openEditSubmissionModal = open;
            window.closeEditSubmissionModal = close;
            // Debug helper to check ownership quickly from console
            window.debugSubmissionOwnership = async function(gameId){
                try {
                    await ensureFirestoreLight();
                    const dref = window.firestoreDoc(window.firebaseFirestore, 'game_submissions', String(gameId));
                    const snap = await window.firestoreGetDoc(dref);
                    if (!snap.exists()) { console.log('No such submission'); return; }
                    const data = snap.data();
                    const ownerId = data?.ownerId || '(none)';
                    console.log('[debugSubmissionOwnership]', { gameId, ownerId, currentUid: window.firebaseAuth?.currentUser?.uid });
                } catch (e) { console.log('debugSubmissionOwnership error', e); }
            };
        })();
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
            {
                id: 'community-intro',
                canShow: () => {
                    const seen = localStorage.getItem('gr.community.intro.v1') === '1';
                    const el = document.getElementById('community-intro');
                    return !!el && !seen;
                },
                show: () => {
                    const el = document.getElementById('community-intro');
                    if (!el) return false;
                    el.style.display = 'flex';
                    const close = document.getElementById('community-intro-close');
                    const dismiss = document.getElementById('community-intro-dismiss');
                    const open = document.getElementById('community-intro-open');
                    const hide = () => { el.style.display = 'none'; };
                    const setSeen = () => { try { localStorage.setItem('gr.community.intro.v1', '1'); } catch {} };
                    close && close.addEventListener('click', () => { hide(); setSeen(); }, { once: true });
                    dismiss && dismiss.addEventListener('click', () => { hide(); setSeen(); }, { once: true });
                    open && open.addEventListener('click', () => { setSeen(); }, { once: true });
                    el.addEventListener('click', (e) => { if (e.target === el) { hide(); setSeen(); } }, { once: true });
                    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hide(); setSeen(); } }, { once: true });
                    return true;
                }
            }
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

        // Expose helpers to manually reset or show the Terms Updated popup
        window.grResetTermsUpdateSeen = function() {
            try { localStorage.removeItem('gr.terms.updated.seen.v' + TERMS_UPDATE_VERSION); } catch {}
        };
        window.grShowTermsUpdateNow = function() {
            const overlay = document.getElementById('terms-update-popup');
            if (!overlay) { console.warn('Terms Update overlay not found'); return; }
            try { localStorage.removeItem('gr.terms.updated.seen.v' + TERMS_UPDATE_VERSION); } catch {}
            // Lock background scroll while visible
            overlay.dataset.prevOverflow = document.body.style.overflow || '';
            document.body.style.overflow = 'hidden';
            overlay.style.display = 'flex';
            const dismiss = document.getElementById('dismiss-terms-update');
            const accept = document.getElementById('accept-terms-update');
            const inlineLinks = overlay.querySelectorAll('a.popup-inline-link');
            const seenKey = 'gr.terms.updated.seen.v' + TERMS_UPDATE_VERSION;
            const closeOnly = () => { 
                overlay.style.display = 'none';
                document.body.style.overflow = overlay.dataset.prevOverflow || '';
                delete overlay.dataset.prevOverflow;
            };
            const acknowledge = () => {
                try { localStorage.setItem(seenKey, '1'); } catch {}
                closeOnly();
            };
            if (dismiss) {
                const onDismiss2 = (e) => {
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
                dismiss.addEventListener('click', onDismiss2, { once: true });
                dismiss.addEventListener('pointerdown', onDismiss2, { once: true });
                dismiss.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onDismiss2(e); }, { once: true });
            }
            accept && accept.addEventListener('click', () => acknowledge(), { once: true });
            inlineLinks.forEach(a => a.addEventListener('click', () => { try { localStorage.setItem(seenKey, '1'); } catch {} }, { once: true }));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOnly(); }, { once: true });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOnly(); }, { once: true });
        };

        // Helpers for the original Legal Notice popup
        window.grResetLegalNotice = function() {
            try { localStorage.removeItem('gr.legal.accepted'); localStorage.removeItem('gr.legal.declined'); } catch {}
        };
        window.grShowLegalNoticeNow = function() {
            const overlay = document.getElementById('terms-popup');
            if (!overlay) { console.warn('Legal Notice overlay not found'); return; }
            overlay.style.display = 'flex';
            const accept = document.getElementById('accept-terms');
            const decline = document.getElementById('decline-terms');
            const finalize = (didAccept) => {
                try { localStorage.setItem('gr.legal.' + (didAccept ? 'accepted' : 'declined'), '1'); } catch {}
                overlay.style.display = 'none';
                if (!didAccept) {
                    try {
                        alert('You declined the Terms. This tab will be closed. If closing is blocked by your browser, you will be redirected to about:blank.');
                    } catch {}
                    try { window.close(); } catch {}
                    setTimeout(() => {
                        try { window.location.replace('about:blank'); } catch { window.location.href = 'about:blank'; }
                    }, 50);
                }
            };
            // Re-bind with once:true to avoid duplicates
            accept && accept.addEventListener('click', () => finalize(true), { once: true });
            decline && decline.addEventListener('click', () => finalize(false), { once: true });
        };
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
    
    // Initialize modal functionality immediately
    document.body.addEventListener('click', function(e) {
        const closeModal = document.getElementById('close-modal');
        const signInModal = document.getElementById('signin-modal');
        if (closeModal && signInModal && (e.target === closeModal || closeModal.contains(e.target))) {
            e.preventDefault();
            signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            if (typeof resetAuthButtonsText === 'function') resetAuthButtonsText();
        }
    });
    initializeBasicModal();
    
    // Initialize shared authentication system for SSO
    initializeSharedAuth();
    
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
        const gameCards = document.querySelectorAll('.game-card');
        
        gameCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                if (!this.classList.contains('coming-soon')) {
                    this.style.transform = 'translateY(-10px) scale(1.02)';
                    addGlitchEffect(this);
                }
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = '';
                removeGlitchEffect(this);
            });
        });
    }
    
    // Add temporary glitch effect to cards
    function addGlitchEffect(element) {
        const overlay = element.querySelector('.card-overlay');
        if (overlay) {
            overlay.style.animation = 'glitchOverlay 0.5s ease-in-out infinite';
        }
    }
    
    function removeGlitchEffect(element) {
        const overlay = element.querySelector('.card-overlay');
        if (overlay) {
            overlay.style.animation = '';
        }
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
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
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

// Basic modal functionality that works without Firebase
function initializeBasicModal() {
    // DOM elements
    const signInBtn = document.getElementById('sign-in-btn');
    const signInModal = document.getElementById('signin-modal');
    const closeModal = document.getElementById('close-modal');
      // Initialize Google button text helper function
    function initializeGoogleButtonText() {
        const googleButtonText = document.getElementById('google-button-text');
        const githubButtonText = document.getElementById('github-button-text');
        const activeTab = document.querySelector('.auth-tab.active');
        if (googleButtonText && activeTab) {
            const tabType = activeTab.getAttribute('data-tab');
            if (tabType === 'signin') {
                googleButtonText.textContent = 'Sign in with Google';
            } else if (tabType === 'signup') {
                googleButtonText.textContent = 'Sign up with Google';
            }
        }
        if (githubButtonText && activeTab) {
            const tabType = activeTab.getAttribute('data-tab');
            if (tabType === 'signin') {
                githubButtonText.textContent = 'Sign in with GitHub';
            } else if (tabType === 'signup') {
                githubButtonText.textContent = 'Sign up with GitHub';
            }
        }
    }
      // Sign-in button now redirects to auth.glitchrealm.ca (no JavaScript needed)
    // signInBtn?.addEventListener('click', (e) => {
    //     e.preventDefault();
    //     if (signInModal) {
    //         signInModal.style.display = 'flex';
    //         document.body.style.overflow = 'hidden';
    //         
    //         // Initialize Google button text based on active tab
    //         initializeGoogleButtonText();
    //     }
    // });

    if (closeModal) {
        // Remove all previous click listeners to avoid duplicate/conflicting handlers
        const newCloseModal = closeModal.cloneNode(true);
        closeModal.parentNode.replaceChild(newCloseModal, closeModal);
        newCloseModal.addEventListener('click', function(e) {
            e.preventDefault();
            if (signInModal) {
                signInModal.style.display = 'none';
                document.body.style.overflow = 'auto';
                resetAuthButtonsText();
            }
        });
    }

    signInModal?.addEventListener('click', (e) => {
        if (e.target === signInModal) {
            signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetAuthButtonsText();
        }
    });    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && signInModal && signInModal.style.display === 'flex') {
            signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetAuthButtonsText();
        }
    });    // Tab switching functionality for neural modal
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form-container');
    const googleButtonText = document.getElementById('google-button-text');
    const githubButtonText = document.getElementById('github-button-text');
    
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.getAttribute('data-tab');
            
            // Update tab states
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update form visibility
            authForms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${tabType}-form`) {
                    form.classList.add('active');
                }
            });
            
            // Update Google button text based on active tab
            if (googleButtonText) {
                if (tabType === 'signin') {
                    googleButtonText.textContent = 'Sign in with Google';
                } else if (tabType === 'signup') {
                    googleButtonText.textContent = 'Sign up with Google';
                }
            }
            
            // Update GitHub button text based on active tab
            if (githubButtonText) {
                if (tabType === 'signin') {
                    githubButtonText.textContent = 'Sign in with GitHub';
                } else if (tabType === 'signup') {
                    githubButtonText.textContent = 'Sign up with GitHub';
                }
            }
        });
    });

    // Input focus effects for neural inputs
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
            console.log('Firebase not yet initialized, retrying...');
            setTimeout(initializeAuth, 500);
            return;
        }        console.log('Initializing Firebase Auth...');
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
                    console.log('[AppCheck] Initialized with reCAPTCHA v3');
                } catch (appCheckErr) {
                    console.warn('[AppCheck] Initialization skipped or failed:', appCheckErr?.message || appCheckErr);
                }
            } else {
                console.log('[AppCheck] GR_APPCHECK_SITE_KEY not set; skipping App Check init');
            }
        } catch (e) {
            console.log('[AppCheck] Not initialized (modules unavailable or not needed).');
        }

        const { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, GithubAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged, deleteUser } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    // Expose deleteUser to global scope for account deletion
    window.deleteUser = deleteUser;
    
    const auth = window.firebaseAuth;
    try { auth.languageCode = navigator.language || 'en'; } catch {}
    const forceRedirect = !!window.GR_AUTH_FORCE_REDIRECT;
    const googleProvider = new GoogleAuthProvider();
    const githubProvider = new GithubAuthProvider();
    try { githubProvider.setCustomParameters({ allow_signup: 'true' }); } catch {}

    // DOM elements (with null checks for dynamic loading)
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const signInModal = document.getElementById('signin-modal');
    const closeModal = document.getElementById('close-modal');
    const userProfile = document.getElementById('user-profile');

    // If we returned from a redirect sign-in, complete the flow
    try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult && redirectResult.user) {
            // Close modal if present and restore scrolling
            if (signInModal) {
                signInModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
            showAuthMessage('Signed in successfully!', 'success');
            console.log('Completed redirect sign-in:', {
                providerId: redirectResult.providerId,
                user: { uid: redirectResult.user.uid, email: redirectResult.user.email }
            });
        }
    } catch (redirectErr) {
        console.warn('getRedirectResult error (safe to ignore if no redirect happened):', redirectErr);
    }
    const userName = document.getElementById('user-name');
    
    // If header elements aren't loaded yet, store auth function for later
    if (!signInBtn || !signInModal || !userProfile) {
        console.log('Header elements not yet loaded, deferring auth initialization...');
        window.pendingAuthInit = () => initializeAuth();
        return;
    }
    
    // Auth tabs and forms
    const authTabs = document.querySelectorAll('.auth-tab');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
      // Sign-in buttons
    const googleSignIn = document.getElementById('google-signin');
    const githubSignIn = document.getElementById('github-signin');
    const anonymousSignIn = document.getElementById('anonymous-signin');
    const emailSigninForm = document.getElementById('email-signin-form');
    const emailSignupForm = document.getElementById('email-signup-form');// Tab switching functionality
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update active tab
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding form
            if (targetTab === 'signin') {
                signinForm.classList.add('active');
                signupForm.classList.remove('active');
            } else if (targetTab === 'signup') {
                signupForm.classList.add('active');
                signinForm.classList.remove('active');
            }
              // Update Google button text based on active tab
            const googleButtonText = document.getElementById('google-button-text');
            const githubButtonText = document.getElementById('github-button-text');
            if (googleButtonText) {
                if (targetTab === 'signin') {
                    googleButtonText.textContent = 'Sign in with Google';
                } else if (targetTab === 'signup') {
                    googleButtonText.textContent = 'Sign up with Google';
                }
            }
            if (githubButtonText) {
                if (targetTab === 'signin') {
                    githubButtonText.textContent = 'Sign in with GitHub';
                } else if (targetTab === 'signup') {
                    githubButtonText.textContent = 'Sign up with GitHub';
                }
            }
        });
    });

    // Authentication methods (Firebase-dependent)
    googleSignIn?.addEventListener('click', async () => {
        let finalized = false;
        try {
            showAuthLoading(googleSignIn, 'CONNECTING...');
            if (forceRedirect) {
                console.warn('Forcing Google sign-in via redirect (GR_AUTH_FORCE_REDIRECT=true)');
                await signInWithRedirect(auth, googleProvider);
                return;
            }
            await signInWithPopup(auth, googleProvider);
            finalized = true;
            if (signInModal) signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            showAuthMessage('Neural sync successful!', 'success');
        } catch (error) {
            console.error('Google sign-in error:', error);
            const code = String(error?.code || error?.message || '');
            const shouldRedirect = /popup-blocked|operation-not-supported-in-this-environment|internal-error|unauthorized-domain/i.test(code);
            if (shouldRedirect) {
                try {
                    console.warn('Falling back to redirect for Google sign-in...');
                    await signInWithRedirect(auth, googleProvider);
                    return; // Will navigate and complete via getRedirectResult()
                } catch (redirectErr) {
                    console.error('Google redirect sign-in failed:', redirectErr);
                }
            }
            showAuthMessage('Connection failed. Please try again.', 'error');
        } finally {
            if (!finalized) {
                // Reset to proper default text based on active tab
                const activeTab = document.querySelector('.auth-tab.active');
                const tabType = activeTab ? activeTab.getAttribute('data-tab') : 'signin';
                const defaultText = tabType === 'signup' ? 'Sign up with Google' : 'Sign in with Google';
                hideAuthLoading(googleSignIn, defaultText);
            }
        }
    });

    // GitHub sign-in (with redirect fallback for popup/internal errors)
    githubSignIn?.addEventListener('click', async () => {
        let finalized = false;
        try {
            showAuthLoading(githubSignIn, 'CONNECTING...');
            if (forceRedirect) {
                console.warn('Forcing GitHub sign-in via redirect (GR_AUTH_FORCE_REDIRECT=true)');
                await signInWithRedirect(auth, githubProvider);
                return;
            }
            await signInWithPopup(auth, githubProvider);
            finalized = true;
            if (signInModal) signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            showAuthMessage('GitHub sync successful!', 'success');
        } catch (error) {
            console.error('GitHub sign-in error:', error);
            const code = String(error?.code || error?.message || '');
            const shouldRedirect = /popup-blocked|operation-not-supported-in-this-environment|internal-error|unauthorized-domain/i.test(code);
            if (shouldRedirect) {
                try {
                    console.warn('Falling back to redirect for GitHub sign-in...');
                    // Keep loading state; navigation should occur
                    await signInWithRedirect(auth, githubProvider);
                    return; // Will navigate away; getRedirectResult will complete later
                } catch (redirectErr) {
                    console.error('GitHub redirect sign-in failed:', redirectErr);
                }
            }
            showAuthMessage('GitHub connection failed. Please try again.', 'error');
        } finally {
            // Reset to proper default text based on active tab unless we’ve navigated/finished
            if (!finalized) {
                const activeTab = document.querySelector('.auth-tab.active');
                const tabType = activeTab ? activeTab.getAttribute('data-tab') : 'signin';
                const defaultText = tabType === 'signup' ? 'Sign up with GitHub' : 'Sign in with GitHub';
                hideAuthLoading(githubSignIn, defaultText);
            }
        }
    });

    anonymousSignIn?.addEventListener('click', async () => {
        try {
            showAuthLoading(anonymousSignIn, 'INITIALIZING...');
            await signInAnonymously(auth);
            signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            showAuthMessage('Anonymous mode activated!', 'success');
        } catch (error) {
            console.error('Anonymous sign-in error:', error);
            const code = String(error?.code || error?.message || '');
            if (/app-check/i.test(code) || /firebase-app-check-token-is-invalid/i.test(code)) {
                showAuthMessage('App Check required. Configure App Check or disable enforcement.', 'error');
                console.warn('App Check appears to be enforced for Auth. Provide GR_APPCHECK_SITE_KEY and initialize App Check, or temporarily disable enforcement for Authentication in Firebase Console.');
            } else {
                showAuthMessage('Initialization failed. Please try again.', 'error');
            }
        } finally {
            hideAuthLoading(anonymousSignIn, 'ANONYMOUS MODE');
        }
    });

    // Email/Password sign-in
    emailSigninForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;
        const submitBtn = emailSigninForm.querySelector('.neural-button');

        try {
            showAuthLoading(submitBtn, 'AUTHENTICATING...');
            await signInWithEmailAndPassword(auth, email, password);
            signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            showAuthMessage('Access granted!', 'success');
        } catch (error) {
            console.error('Email sign-in error:', error);
            showAuthMessage('Authentication failed. Check your credentials.', 'error');
        } finally {
            hideAuthLoading(submitBtn, 'INITIATE CONNECTION');
        }
    });

    // Create account
    emailSignupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const submitBtn = emailSignupForm.querySelector('.neural-button');        if (password !== confirmPassword) {
            showAuthMessage('Passwords do not match!', 'error');
            return;
        }

        if (password.length < 6) {
            showAuthMessage('Password must be at least 6 characters!', 'error');
            return;
        }

        try {
            showAuthLoading(submitBtn, 'CREATING LINK...');
            await createUserWithEmailAndPassword(auth, email, password);
            signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            showAuthMessage('Account established!', 'success');
        } catch (error) {
            console.error('Account creation error:', error);
            showAuthMessage('Link creation failed: ' + getErrorMessage(error.code), 'error');
        } finally {
            hideAuthLoading(submitBtn, 'CREATE ACCOUNT');
        }
    });

    // Sign out
    signOutBtn?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showAuthMessage('Account deleted.', 'info');
        } catch (error) {
            console.error('Sign-out error:', error);        }
    });

    // Forgot password functionality
    const forgotPasswordBtn = document.querySelector('.forgot-link');
    forgotPasswordBtn?.addEventListener('click', () => {
        window.location.href = 'forgot-password.html';
    });

    // Check for existing authentication in other games (NEW FEATURE)
    if (window.sharedAuth) {
        // First check localStorage for existing auth state
        const existingAuthState = window.sharedAuth.checkExistingAuthState();
        if (existingAuthState) {
            console.log('Found existing auth state in localStorage, updating UI...');
            const mockUser = {
                uid: existingAuthState.uid,
                email: existingAuthState.email,
                displayName: existingAuthState.displayName,
                photoURL: existingAuthState.photoURL,
                providerData: existingAuthState.providerData
            };
            if (typeof window.updateUIForUser === 'function') {
                window.updateUIForUser(mockUser);
                showAuthMessage('Synced with existing account.', 'info');
            }
        } else {
            // If no localStorage auth, actively check other games
            console.log('No localStorage auth found, checking other games...');
            window.sharedAuth.checkOtherGamesForAuth().then(foundAuth => {
                if (foundAuth) {
                    showAuthMessage('Connected via cross-game account.', 'success');
                } else {
                    console.log('No existing authentication found in other games');
                }
            }).catch(error => {
                console.error('Error checking other games for auth:', error);
            });
        }
    }

    // Auth state observer with profile monitoring
    onAuthStateChanged(auth, (user) => {
        const notificationBell = document.getElementById('notification-bell');
        const moderationMenuBtn = document.getElementById('moderation-menu-btn');
        
        if (user) {
            // User is signed in
            try { console.log('[Auth] User signed in:', { uid: user.uid, email: user.email }); } catch {}
            updateUserProfile(user);
            if (signInBtn) signInBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (notificationBell) notificationBell.style.display = 'flex';
            // Toggle Moderation menu visibility for dev UIDs only
            try {
                const DEV_UIDS = new Set([
                    '6iZDTXC78aVwX22qrY43BOxDRLt1',
                    'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
                    'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
                    '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
                    'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
                ]);
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
            
            // Store auth state for SSO
            if (window.sharedAuth) {
                window.sharedAuth.storeAuthState(user);
            }
            
            // Set up profile picture monitoring
            if (!window.profileMonitorInterval) {
                setupProfilePictureMonitoring(auth);
            }

            // Notifications now use a global feed; listener starts on page load.
            // Optional: auto-open portal on sign-in
            if (GR_SETTINGS.portalAutoOpenOnSignIn && !/user-portal\.html$/i.test(location.pathname)) {
                setTimeout(() => { window.location.href = 'user-portal.html'; }, 300);
            }
        } else {
            // User is signed out
            try { console.log('[Auth] User signed out'); } catch {}
            if (signInBtn) signInBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
            if (notificationBell) notificationBell.style.display = 'none';
            if (moderationMenuBtn) moderationMenuBtn.remove();
            
            // Clear auth state for SSO
            if (window.sharedAuth) {
                window.sharedAuth.clearAuthState();
            }
            
            // Clear profile monitoring
            if (window.profileMonitorInterval) {
                clearInterval(window.profileMonitorInterval);
                window.profileMonitorInterval = null;
            }

            // Global notifications remain active regardless of auth state.
        }
    });

    // Listen for auth state changes from other tabs/windows
    window.addEventListener('storage', (e) => {
        if (e.key === 'firebase_auth_state') {
            console.log('[Auth] Auth state changed in another tab');
            
            // Force auth state refresh
            if (auth.currentUser) {
                console.log('[Auth] Updating UI for current user');
                updateUserProfile(auth.currentUser);
            } else {
                console.log('[Auth] No current user, checking for changes');
                // Auth state might have changed, let Firebase handle it
                auth.currentUser; // This triggers internal check
            }
        }
    });
    
    // Listen for custom Firebase auth events
    window.addEventListener('firebaseAuthStateChanged', (e) => {
        const user = e.detail?.user;
        console.log('[Auth] Custom auth state event received:', user ? user.uid : 'signed out');
        
        if (user) {
            // Ensure UI is updated even if onAuthStateChanged already fired
            setTimeout(() => {
                if (auth.currentUser) {
                    updateUserProfile(auth.currentUser);
                }
            }, 100);
        }
    });

    // Delete anonymous accounts when tab is closed or becomes hidden
    function handleAnonymousAccountCleanup() {
        const user = auth.currentUser;
        if (user && user.isAnonymous) {
            try {
                deleteUser(user).then(() => {
                    console.log('Anonymous account deleted on tab close/hide');
                }).catch((error) => {
                    console.log('Anonymous account cleanup attempted:', error.message);
                });
            } catch (error) {
                console.log('Anonymous account cleanup attempted');
            }
        }
    }

    // Handle tab close/hide events
    window.addEventListener('beforeunload', handleAnonymousAccountCleanup);
    
    // Also handle when tab becomes hidden (more reliable on mobile)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            handleAnonymousAccountCleanup();
        }
    });

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
    
    // Profile picture upload functionality
    function initializeProfilePictureUpload() {
        // DISABLED: This old profile picture upload is replaced by Supabase avatar integration
        // The new system is in portal-avatar-integration.js and handles uploads properly
        // Only runs on user-portal.html with Supabase Storage
        
        console.log('Old profile picture upload disabled - using Supabase avatar system');
        return; // Exit early - don't set up old handlers
        
        const uploadOverlays = document.querySelectorAll('.avatar-upload-overlay, .avatar-upload-overlay-large');
        const fileInput = document.getElementById('profile-picture-upload');
        
        console.log('Initializing profile picture upload...');
        console.log('Found upload overlays:', uploadOverlays.length);
        console.log('Found file input:', !!fileInput);
        
        if (!fileInput) {
            console.log('Profile picture upload input not found');
            return;
        }
        
        // Add click handlers to upload overlays
        uploadOverlays.forEach((overlay, index) => {
            console.log(`Adding click handler to overlay ${index}:`, overlay);
            overlay.addEventListener('click', (e) => {
                console.log('Upload overlay clicked - FEATURE DISABLED');
                e.stopPropagation(); // Prevent dropdown from closing
                
                // FEATURE DISABLED: Profile picture upload is currently disabled
                showAuthMessage('📷 Profile picture upload feature is temporarily disabled.', 'info');
                
                // Commented out: fileInput.click();
            });
        });
        
        // Handle file selection
        fileInput.addEventListener('change', async (e) => {
            console.log('File input changed, files:', e.target.files);
            const file = e.target.files[0];
            if (!file) return;
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showAuthMessage('❌ Please select a valid image file.', 'error');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showAuthMessage('❌ Image file size must be less than 5MB.', 'error');
                return;
            }
            
            try {
                // FEATURE DISABLED: Skip crop modal and upload directly
                // showCropModal(file);
                console.log('Crop modal feature disabled - uploading directly');
                await uploadProfilePicture(file);
            } catch (error) {
                console.error('Error uploading profile picture:', error);
                showAuthMessage('❌ Failed to process image.', 'error');
            }
        });
    }
    
    // Upload profile picture function (Supabase Storage)
    async function uploadProfilePicture(file) {
        const user = auth.currentUser;
        if (!user) {
            showAuthMessage('❌ You must be signed in to change your profile picture.', 'error');
            return;
        }

        try {
            showAuthMessage('📷 Uploading profile picture...', 'info');

            // Initialize Supabase client once
            async function ensureSupabase() {
                if (window.grSupabase) return window.grSupabase;
                const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
                const createClient = mod.createClient || mod.default?.createClient;
                const SUPABASE_URL = window.GR_SUPABASE_URL || 'https://hkogcnxmrrkxggwcrqyh.supabase.co';
                const SUPABASE_ANON_KEY = window.GR_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb2djbnhtcnJreGdnd2NycXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTA5MDQsImV4cCI6MjA3Mjc2NjkwNH0.mOrnXNJBQLgMg1oq4zW1ySvCMXAbo-ZNAMwx59NJyxM';
                window.grSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                return window.grSupabase;
            }

            const supabase = await ensureSupabase();
            const bucket = 'profile-pictures'; // Assumes this bucket exists and is public or policies allow access
            const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
            const path = `${user.uid}/${Date.now()}_${safeName}`;

            // Upload with upsert to avoid conflicts when retrying
            const { data: upData, error: upErr } = await supabase
                .storage
                .from(bucket)
                .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type || 'image/jpeg' });

            if (upErr) {
                console.error('Supabase upload error:', upErr);
                showAuthMessage('❌ Failed to upload to storage.', 'error');
                return;
            }

            // Get a public URL (requires bucket to be public). Otherwise, consider generating a signed URL.
            const { data: pub, error: pubErr } = supabase.storage.from(bucket).getPublicUrl(path);
            if (pubErr) {
                console.error('Supabase getPublicUrl error:', pubErr);
                showAuthMessage('❌ Failed to obtain file URL.', 'error');
                return;
            }
            const publicUrl = pub.publicUrl;

            // Update Firebase user profile with new photo URL
            const { updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await updateProfile(user, { photoURL: publicUrl });

            // Update UI immediately
            updateUserProfile(user);

            showAuthMessage('✅ Profile picture updated successfully!', 'success');

            // Store auth state for SSO
            if (window.sharedAuth) {
                window.sharedAuth.storeAuthState(user);
            }

        } catch (error) {
            console.error('Profile update error:', error);
            showAuthMessage('❌ Failed to update profile picture.', 'error');
        }
    }
    
    // Show crop modal for profile picture
    function showCropModal(file) {
        console.log('showCropModal called with file:', file.name);
        
        const modal = document.getElementById('crop-modal');
        const cropImage = document.getElementById('crop-image');
        const zoomSlider = document.getElementById('zoom-slider');
        
        console.log('Modal elements found:', { 
            modal: !!modal, 
            cropImage: !!cropImage, 
            zoomSlider: !!zoomSlider 
        });
        
        if (!modal || !cropImage) {
            console.error('Crop modal elements not found');
            console.log('Available elements in DOM:', {
                cropModal: document.querySelector('#crop-modal'),
                cropImage: document.querySelector('#crop-image'),
                allModals: document.querySelectorAll('[id*="modal"]')
            });
            // Fallback: directly upload without cropping
            uploadProfilePicture(file);
            return;
        }
        
        // Create a FileReader to load the image
        const reader = new FileReader();
        reader.onload = function(e) {
            cropImage.src = e.target.result;
            
            // Wait for image to load before showing modal
            cropImage.onload = function() {
                // Show modal with proper class
                modal.style.display = 'flex';
                modal.classList.add('show');
                
                // Reset zoom and apply initial transform
                if (zoomSlider) {
                    zoomSlider.value = 1;
                    cropImage.style.transform = 'scale(1)';
                    cropImage.style.transformOrigin = 'center center';
                    
                    console.log('Image loaded and zoom reset to 1');
                }
                
                // Store the original file for later use
                modal.dataset.originalFile = JSON.stringify({
                    name: file.name,
                    type: file.type,
                    size: file.size
                });
            };
        };
        
        reader.readAsDataURL(file);
    }
    
    // Initialize crop modal event listeners
    function initializeCropModal() {
        const modal = document.getElementById('crop-modal');
        const cropImage = document.getElementById('crop-image');
        const zoomSlider = document.getElementById('zoom-slider');
        const cancelBtn = document.getElementById('crop-cancel');
        const confirmBtn = document.getElementById('crop-confirm');
        const closeBtn = document.getElementById('crop-modal-close');
        
        if (!modal) return;
        
        // Ensure modal is hidden on initialization
        modal.style.display = 'none';
        modal.classList.remove('show');
        
        // Zoom functionality
        if (zoomSlider && cropImage) {
            // Remove any existing listeners first
            const newZoomSlider = zoomSlider.cloneNode(true);
            zoomSlider.parentNode.replaceChild(newZoomSlider, zoomSlider);
            
            newZoomSlider.addEventListener('input', (e) => {
                const zoomValue = parseFloat(e.target.value);
                console.log('Zoom value changed to:', zoomValue);
                cropImage.style.transform = `scale(${zoomValue})`;
                cropImage.style.transformOrigin = 'center center';
            });
            
            newZoomSlider.addEventListener('change', (e) => {
                const zoomValue = parseFloat(e.target.value);
                console.log('Zoom value final:', zoomValue);
                cropImage.style.transform = `scale(${zoomValue})`;
                cropImage.style.transformOrigin = 'center center';
            });
        }
        
        // Cancel button
        if (cancelBtn) {
            // Remove existing listeners by cloning
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            newCancelBtn.addEventListener('click', (e) => {
                console.log('Cancel button clicked');
                e.preventDefault();
                e.stopPropagation();
                hideCropModal();
            });
        }
        
        // Close button
        if (closeBtn) {
            // Remove existing listeners by cloning
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            
            newCloseBtn.addEventListener('click', (e) => {
                console.log('Close button clicked');
                e.preventDefault();
                e.stopPropagation();
                hideCropModal();
            });
        }
        
        // Confirm button
        if (confirmBtn) {
            // Remove existing listeners by cloning
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            newConfirmBtn.addEventListener('click', async (e) => {
                console.log('Confirm button clicked');
                e.preventDefault();
                e.stopPropagation();
                await cropAndUploadImage();
            });
        }
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('Modal backdrop clicked');
                hideCropModal();
            }
        });
        
        // Add event delegation for button clicks
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'crop-cancel' || e.target.classList.contains('crop-cancel')) {
                console.log('Cancel clicked via delegation');
                e.preventDefault();
                e.stopPropagation();
                hideCropModal();
            }
            
            if (e.target.id === 'crop-modal-close' || e.target.classList.contains('crop-modal-close')) {
                console.log('Close clicked via delegation');
                e.preventDefault();
                e.stopPropagation();
                hideCropModal();
            }
            
            if (e.target.id === 'crop-confirm' || e.target.classList.contains('crop-confirm')) {
                console.log('Confirm clicked via delegation');
                e.preventDefault();
                e.stopPropagation();
                cropAndUploadImage();
            }
        });
        
        // Add keyboard support
        document.addEventListener('keydown', (e) => {
            if (modal.classList.contains('show')) {
                if (e.key === 'Escape') {
                    console.log('Escape key pressed');
                    hideCropModal();
                }
                if (e.key === 'Enter') {
                    console.log('Enter key pressed');
                    e.preventDefault();
                    cropAndUploadImage();
                }
            }
        });
    }
    
    // Hide crop modal
    function hideCropModal() {
        console.log('hideCropModal called');
        const modal = document.getElementById('crop-modal');
        if (modal) {
            console.log('Modal found, hiding...');
            modal.classList.remove('show');
            
            // Hide after transition
            setTimeout(() => {
                modal.style.display = 'none';
                console.log('Modal display set to none');
            }, 300);
            
            // Clear the file input
            const fileInput = document.getElementById('profile-picture-upload');
            if (fileInput) {
                fileInput.value = '';
                console.log('File input cleared');
            }
        } else {
            console.error('Modal not found when trying to hide');
        }
    }
    
    // Crop and upload the image
    async function cropAndUploadImage() {
        const modal = document.getElementById('crop-modal');
        const cropImage = document.getElementById('crop-image');
        const zoomSlider = document.getElementById('zoom-slider');
        
        if (!modal || !cropImage || !zoomSlider) return;
        
        try {
            showAuthMessage('📷 Processing image...', 'info');
            
            // Create a canvas to crop the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to desired profile picture size
            const size = 200; // 200x200 profile picture
            canvas.width = size;
            canvas.height = size;
            
            // Get the zoom value
            const zoom = parseFloat(zoomSlider.value);
            
            // Create a new image element to get natural dimensions
            const img = new Image();
            img.onload = async function() {
                // Calculate crop dimensions
                const cropSize = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
                const cropX = (img.naturalWidth - cropSize) / 2;
                const cropY = (img.naturalHeight - cropSize) / 2;
                
                // Draw the cropped image on canvas
                ctx.drawImage(
                    img,
                    cropX, cropY, cropSize, cropSize, // Source rectangle
                    0, 0, size, size // Destination rectangle
                );
                
                // Convert canvas to blob
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        // Create a new File object
                        const originalFileData = JSON.parse(modal.dataset.originalFile || '{}');
                        const croppedFile = new File([blob], originalFileData.name || 'profile.jpg', {
                            type: 'image/jpeg'
                        });
                        
                        // Hide modal
                        hideCropModal();
                        
                        // Upload the cropped image
                        await uploadProfilePicture(croppedFile);
                    }
                }, 'image/jpeg', 0.9);
            };
            
            img.src = cropImage.src;
            
        } catch (error) {
            console.error('Crop error:', error);
            showAuthMessage('❌ Failed to crop image.', 'error');
        }
    }
    
    // Update UI for external auth state (for SSO)
    function updateUIForUser(user) {
        if (user) {
            updateUserProfile(user);
            const signInBtn = document.getElementById('sign-in-btn');
            const userProfile = document.getElementById('user-profile');
            if (signInBtn) signInBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
        } else {
            const signInBtn = document.getElementById('sign-in-btn');
            const userProfile = document.getElementById('user-profile');
            if (signInBtn) signInBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
        }
    }
      // Make updateUIForUser available globally for SharedAuthSystem
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
            // Clean up any existing listener
            detachNotificationsListener();

            // Global notifications collection: /notifications
            const notificationsRef = window.firestoreCollection(db, 'notifications');
            // Optionally filter unread only; if you want total, remove where clause
            const q = window.firestoreQuery(
                notificationsRef,
                window.firestoreWhere('read', '==', false)
            );
            notificationsUnsubscribe = window.firestoreOnSnapshot(q, (snapshot) => {
                const count = snapshot.size || 0;
                updateNotificationCount(count);
            }, (error) => {
                console.warn('Global notifications snapshot error:', error);
            });
        }

        // Expose detach for use in auth sign-out branch
        window.detachNotificationsListener = detachNotificationsListener;

        // Create a test notification for the current user
        async function createTestNotification() {
            try {
                const db = await ensureFirestore();
                const notifRef = window.firestoreCollection(db, 'notifications');
                await window.firestoreAddDoc(notifRef, {
                    title: 'Test Notification',
                    body: 'This is a test notification from Dev.',
                    read: false,
                    createdAt: window.firestoreServerTimestamp(),
                    type: 'test',
                    priority: 'normal'
                });
                showAuthMessage('Test notification created.', 'success');
            } catch (e) {
                console.error('Failed to create test notification:', e);
                showAuthMessage('Failed to create test notification.', 'error');
            }
        }

        // Expose for console use
        window.createTestNotification = createTestNotification;

    // Profile picture monitoring system
    function setupProfilePictureMonitoring(auth) {
        let lastPhotoURL = auth.currentUser?.photoURL;
        let lastDisplayName = auth.currentUser?.displayName;
        
        window.profileMonitorInterval = setInterval(() => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                // Check if profile picture or display name changed
                if (currentUser.photoURL !== lastPhotoURL || currentUser.displayName !== lastDisplayName) {
                    console.log('Profile picture or display name changed, updating UI...');
                    
                    // Update the UI with new profile data
                    updateUserProfile(currentUser);
                    
                    // Update SSO state with new data
                    if (window.sharedAuth) {
                        window.sharedAuth.storeAuthState(currentUser);
                    }
                    
                    // Show notification about profile update
                    showAuthMessage('Profile updated successfully!', 'success');
                    
                    // Update stored values
                    lastPhotoURL = currentUser.photoURL;
                    lastDisplayName = currentUser.displayName;
                }
            }
        }, 2000); // Check every 2 seconds
    }
    
    // Force refresh profile data (can be called manually)
    function refreshUserProfile() {
        const currentUser = window.firebaseAuth?.currentUser;
        if (currentUser) {
            // Reload user data from Firebase
            currentUser.reload().then(() => {
                console.log('User profile refreshed from Firebase');
                updateUserProfile(currentUser);
                
                // Update SSO state
                if (window.sharedAuth) {
                    window.sharedAuth.storeAuthState(currentUser);
                }
                
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

// Shared Authentication System for Cross-Game SSO
class SharedAuthSystem {
    constructor() {
        this.storageKey = 'glitchRealm_auth_state';
        this.eventKey = 'glitchRealm_auth_change';
        this.gameOrigins = [
            'https://coderunner-test.netlify.app',
            'https://neurocorebytewars.netlify.app'
        ];
        this.initCrossTabSync();
    }

    // Initialize cross-tab/cross-site authentication sync
    initCrossTabSync() {
        // Listen for auth state changes from other tabs/games
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey && e.newValue !== e.oldValue) {
                this.handleExternalAuthChange(e.newValue);
            }
        });

        // Listen for custom auth events (for same-tab communication)
        window.addEventListener(this.eventKey, (e) => {
            this.handleExternalAuthChange(e.detail);
        });
    }

    // Store auth state when user signs in
    storeAuthState(user) {
        const authData = {
            isSignedIn: true,
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            providerData: user.providerData,
            timestamp: Date.now(),
            source: 'glitchRealm'
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(authData));
        this.broadcastAuthChange(authData);
    }

    // Clear auth state when user signs out
    clearAuthState() {
        const authData = {
            isSignedIn: false,
            timestamp: Date.now(),
            source: 'glitchRealm'
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(authData));
        this.broadcastAuthChange(authData);
    }

    // Broadcast auth changes to other tabs/games
    broadcastAuthChange(authData) {
        // Broadcast to other tabs via custom event
        window.dispatchEvent(new CustomEvent(this.eventKey, { detail: authData }));
        
        // Also use postMessage for cross-origin communication
        this.broadcastToGames(authData);
    }

    // Broadcast to other games that might be running
    broadcastToGames(authData) {
        this.gameOrigins.forEach(origin => {
            try {
                // Send auth state to other games via postMessage
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = origin;
                iframe.onload = () => {
                    iframe.contentWindow.postMessage({
                        type: 'auth_update',
                        data: authData
                    }, origin);
                    setTimeout(() => document.body.removeChild(iframe), 1000);
                };
                document.body.appendChild(iframe);
            } catch (error) {
                console.log('Could not communicate with game:', origin);
            }
        });
    }

    // NEW: Actively check other games for existing auth state
    async checkOtherGamesForAuth() {
        console.log('Checking other games for existing authentication...');
        
        const promises = this.gameOrigins.map(origin => {
            return new Promise((resolve) => {
                try {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = origin;
                    
                    // Set up message listener for this specific check
                    const messageHandler = (event) => {
                        if (event.origin === origin && event.data && event.data.type === 'auth_status_response') {
                            window.removeEventListener('message', messageHandler);
                            resolve(event.data.authData);
                        }
                    };
                    
                    window.addEventListener('message', messageHandler);
                    
                    iframe.onload = () => {
                        // Request auth status from the other game
                        iframe.contentWindow.postMessage({
                            type: 'auth_status_request'
                        }, origin);
                        
                        // Cleanup after timeout
                        setTimeout(() => {
                            window.removeEventListener('message', messageHandler);
                            if (document.body.contains(iframe)) {
                                document.body.removeChild(iframe);
                            }
                            resolve(null); // No response
                        }, 3000);
                    };
                    
                    iframe.onerror = () => {
                        window.removeEventListener('message', messageHandler);
                        resolve(null);
                    };
                    
                    document.body.appendChild(iframe);
                } catch (error) {
                    console.log('Could not check auth for:', origin);
                    resolve(null);
                }
            });
        });
        
        try {
            const results = await Promise.all(promises);
            const validAuth = results.find(authData => 
                authData && 
                authData.isSignedIn && 
                authData.timestamp > Date.now() - (24 * 60 * 60 * 1000) // 24 hours
            );
            
            if (validAuth) {
                console.log('Found existing authentication from another game:', validAuth);
                this.syncExternalSignIn(validAuth);
                return true;
            }
        } catch (error) {
            console.error('Error checking other games for auth:', error);
        }
        
        return false;
    }

    // Handle auth state changes from other tabs/games
    handleExternalAuthChange(authDataInput) {
        try {
            let authData;
            
            // Handle both JSON strings and objects
            if (typeof authDataInput === 'string') {
                authData = JSON.parse(authDataInput);
            } else if (typeof authDataInput === 'object' && authDataInput !== null) {
                authData = authDataInput;
            } else {
                console.warn('Invalid auth data format:', authDataInput);
                return;
            }
            
            // Only process if this change is recent and from another source
            if (authData.timestamp > Date.now() - 5000) { // 5 second window
                if (authData.isSignedIn && !window.firebaseAuth?.currentUser) {
                    // User signed in elsewhere - we should sync this state
                    console.log('User signed in from another game/tab');
                    this.syncExternalSignIn(authData);
                } else if (!authData.isSignedIn && window.firebaseAuth?.currentUser) {
                    // User signed out elsewhere - sign out here too
                    console.log('User signed out from another game/tab');
                    if (window.firebaseAuth) {
                        window.firebaseAuth.signOut();
                    }
                }
            }
        } catch (error) {
            console.error('Error handling external auth change:', error);
        }
    }

    // Sync sign-in state from external source
    async syncExternalSignIn(authData) {
        try {
            // Update UI to show signed-in state without going through Firebase again
            if (typeof window.updateUIForUser === 'function') {
                const mockUser = {
                    uid: authData.uid,
                    email: authData.email,
                    displayName: authData.displayName,
                    photoURL: authData.photoURL,
                    providerData: authData.providerData
                };
                window.updateUIForUser(mockUser);
                
                // Show notification that we synced from another game
                if (typeof showAuthMessage === 'function') {
                    showAuthMessage('Synced from existing account.', 'info');
                }
            }
        } catch (error) {
            console.error('Error syncing external sign-in:', error);
        }
    }

    // Check for existing auth state on page load
    checkExistingAuthState() {
        const authDataString = localStorage.getItem(this.storageKey);
        if (authDataString) {
            try {
                const authData = JSON.parse(authDataString);
                // If auth is recent (less than 24 hours) and user is signed in
                if (authData.isSignedIn && 
                    authData.timestamp > Date.now() - (24 * 60 * 60 * 1000) &&
                    authData.uid) { // Make sure we have actual user data
                    console.log('Found existing auth state from localStorage');
                    return authData;
                }
            } catch (error) {
                console.error('Error checking existing auth state:', error);
                // Clear invalid auth data
                localStorage.removeItem(this.storageKey);
            }
        }
        return null;
    }
}

// Initialize shared auth system
function initializeSharedAuth() {
    if (!window.sharedAuth) {
        window.sharedAuth = new SharedAuthSystem();
    }
}

// Listen for auth status requests from other games
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'auth_status_request') {
        // Respond with current auth state
        const authData = window.sharedAuth ? window.sharedAuth.checkExistingAuthState() : null;
        const currentUser = window.firebaseAuth?.currentUser;
        
        let responseData = null;
        if (currentUser) {
            responseData = {
                isSignedIn: true,
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                providerData: currentUser.providerData,
                timestamp: Date.now(),
                source: 'glitchRealm'
            };
        } else if (authData) {
            responseData = authData;
        }
        
        event.source.postMessage({
            type: 'auth_status_response',
            authData: responseData
        }, event.origin);
    } else if (event.data && event.data.type === 'auth_update' && window.sharedAuth) {
        window.sharedAuth.handleExternalAuthChange(event.data.data);
    }
});

// CSS Animations added via JavaScript
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes glitchOverlay {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: rippleEffect 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes rippleEffect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes messageSlideIn {
        from {
            opacity: 0;
            transform: translateX(100px) scale(0.8);
        }
        to {
            opacity: 1;
            transform: translateX(0) scale(1);
        }
    }
    
    @keyframes messageSlideOut {
        from {
            opacity: 1;
            transform: translateX(0) scale(1);
        }
        to {
            opacity: 0;
            transform: translateX(100px) scale(0.8);
        }
    }
`;
document.head.appendChild(animationStyle);

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

// Initial settings load
try { loadSettings(); } catch (e) {}
document.addEventListener('DOMContentLoaded', () => { try { loadSettings(); } catch (e) {} });

// Globally style the widget's launcher to match our FAB (works even without our own button)
let __doaiWidgetStyled = false;
function styleDoAIWidgetLauncher() {
    if (__doaiWidgetStyled) return true;
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
        const candidates = [];
        selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => candidates.push(el)));
        const launcher = candidates.find(el => {
            try { const r = el.getBoundingClientRect(); return r.width && r.height; } catch { return false; }
        });
        if (!launcher) return false;
        launcher.classList.add('chatbot-fab', 'doai-styled-fab');
        Object.assign(launcher.style, {
            position: 'fixed', right: '20px', bottom: '20px', width: '56px', height: '56px', zIndex: '2200'
        });
        // Hide original icon and inject ours
        const existingIcon = launcher.querySelector('svg, img');
        if (existingIcon) existingIcon.style.display = 'none';
        if (!launcher.querySelector('.gr-fab-icon')) {
            const wrapper = document.createElement('span');
            wrapper.className = 'gr-fab-icon';
            wrapper.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.48 3 2 6.94 2 11.8c0 2.48 1.24 4.72 3.26 6.28V21l2.98-1.64c1.11.31 2.3.48 3.76.48 5.52 0 10-3.94 10-8.8S17.52 3 12 3zm-5 8h10v2H7v-2zm8-3v2H7V8h8z"/></svg>';
            launcher.appendChild(wrapper);
        }
        __doaiWidgetStyled = true;
        return true;
    } catch {
        return false;
    }
}

// Try to preload chatbot script early and bind when FAB appears
// Chatbot auto-loader now restricted to support page only
(function primeChatbotInit() {
    if (!/\/support\.html$/i.test(location.pathname)) return; // Do not load chatbot off support page
    function ensureLoaderPresent() {
        if (!document.getElementById('doai-chatbot-loader')) {
            const s = document.createElement('script');
            s.id = 'doai-chatbot-loader';
            s.async = true;
            s.src = 'https://kcur57gey4euhzpupakvb43g.agents.do-ai.run/static/chatbot/widget.js';
            s.setAttribute('data-agent-id', 'bd55ebc0-7b86-11f0-b074-4e013e2ddde4');
            s.setAttribute('data-chatbot-id', 'iLcsXT380jITKSw3t6GQxi14J3z3bc64');
            s.setAttribute('data-name', 'GlitchRealm Bot');
            s.setAttribute('data-primary-color', '#031B4E');
            s.setAttribute('data-secondary-color', '#E5E8ED');
            s.setAttribute('data-button-background-color', '#0061EB');
            s.setAttribute('data-starting-message', 'Hello! How can I help you today?');
            s.setAttribute('data-logo', '/static/chatbot/icons/default-agent.svg');
            document.body.appendChild(s);
        }
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        try { ensureLoaderPresent(); } catch {}
    } else {
        document.addEventListener('DOMContentLoaded', () => { try { ensureLoaderPresent(); } catch {} });
    }
    function tryBind() {
        if (document.getElementById('chatbot-fab')) {
            try { setupChatbotFab(); } catch {}
            return true;
        }
        return false;
    }
    if (!tryBind()) {
        const obs = new MutationObserver(() => { if (tryBind()) { obs.disconnect(); } });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        setTimeout(() => { try { obs.disconnect(); } catch {} }, 10000);
    }
    let tries = 0;
    const t = setInterval(() => { tries++; if (styleDoAIWidgetLauncher() || tries > 40) clearInterval(t); }, 250);
})();

// If the widget posts any messages, attempt styling immediately
if (/\/support\.html$/i.test(location.pathname)) {
    window.addEventListener('message', (ev) => {
        try { if (typeof ev.origin === 'string' && ev.origin.includes('agents.do-ai.run')) { styleDoAIWidgetLauncher(); } } catch {}
    });
}

// One-time coachmark bubble above chat button
function maybeShowChatCoachmark() {
    try { if (localStorage.getItem('gr.chatCoachmark.dismissed') === '1') return; } catch {}
    const onHome = /(^|\/)(index\.html)?$/i.test(location.pathname) || location.pathname === '/';
    const onPortal = /(^|\/)user-portal\.html$/i.test(location.pathname);
    if (!(onHome || onPortal)) return; // show only on home or user portal

    // Ensure launcher is present (widget button)
    const attempt = () => {
        const launcher = document.querySelector('.doai-styled-fab.chatbot-fab');
        if (!launcher) return false;
        if (document.querySelector('.chatbot-coachmark')) return true;
        const bubble = document.createElement('div');
        bubble.className = 'chatbot-coachmark';
        bubble.innerHTML = `
            <button class="coach-close" aria-label="Close">×</button>
            <div>Hello! How can I help you today?</div>
            <div class="coach-action">Open chat</div>
        `;
        document.body.appendChild(bubble);
        const dismiss = () => { try { localStorage.setItem('gr.chatCoachmark.dismissed', '1'); } catch {}; bubble.remove(); };
        bubble.querySelector('.coach-close')?.addEventListener('click', dismiss);
        bubble.querySelector('.coach-action')?.addEventListener('click', () => {
            // Simulate click on launcher
            try { launcher.click(); } catch {}
            dismiss();
        });
        // Auto-dismiss on chat open attempt via our event channel
        window.addEventListener('doai:open', dismiss, { once: true });
        return true;
    };
    let tries = 0;
    const timer = setInterval(() => { tries++; if (attempt() || tries > 40) clearInterval(timer); }, 250);
}

// Trigger coachmark after minimal delay
// Only show/chat coachmark if chatbot allowed (support page only now)
if (/\/support\.html$/i.test(location.pathname)) {
    setTimeout(maybeShowChatCoachmark, 1200);
}

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
            console.log('[Chatbot] Widget script loaded');
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
                    console.log('[Chatbot] message from widget:', ev.data.type || ev.data.event);
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
        console.log('[Chatbot] ready event:', evt, e && e.detail);
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
            console.log('[Chatbot] probe candidates:', candidates);
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
            console.log('[Chatbot] Styled widget launcher to match FAB');
            return true;
        } catch (e) {
            console.warn('[Chatbot] Failed to style widget launcher', e);
            return false;
        }
    }

    // Bind click with retries and console logs
    btn.addEventListener('click', () => {
        console.log('[Chatbot] FAB clicked');
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

// Function to initialize profile dropdown functionality
function initializeProfileDropdown() {
    console.log('Initializing profile dropdown functionality...');
    const profileTrigger = document.querySelector('.profile-trigger');
    const profileDropdown = document.querySelector('.profile-dropdown');
    
    console.log('Profile dropdown elements found:', { profileTrigger, profileDropdown });
    
    if (profileTrigger && profileDropdown) {
        console.log('Setting up profile dropdown event listeners...');
        
        // Clear any existing event listeners by removing and re-adding the element
        const newProfileTrigger = profileTrigger.cloneNode(true);
        profileTrigger.parentNode.replaceChild(newProfileTrigger, profileTrigger);
        
        newProfileTrigger.addEventListener('click', (e) => {
            console.log('Profile dropdown clicked!');
            e.preventDefault();
            e.stopPropagation();
            
            // Close other dropdowns first
            document.querySelectorAll('.nav-dropdown.open').forEach(dd => {
                dd.classList.remove('open');
            });
            
            profileDropdown.classList.toggle('open');
            console.log('Profile dropdown classes after toggle:', profileDropdown.className);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target) && !profileTrigger.contains(e.target)) {
                profileDropdown.classList.remove('open');
            }
        });
        
        // Close dropdown with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                profileDropdown.classList.remove('open');
            }
        });
        
        console.log('Profile dropdown initialized successfully');
    } else {
        console.log('Profile dropdown elements not found');
    }
}

// Function to initialize profile action buttons
function initializeProfileActions() {
    const refreshProfileBtn = document.getElementById('refresh-profile-btn');
    if (refreshProfileBtn) {
        refreshProfileBtn.addEventListener('click', () => {
            const profileDropdown = document.querySelector('.profile-dropdown');
            if (profileDropdown) {
                profileDropdown.classList.remove('open');
            }
            refreshUserProfile();
        });
    }

    // NEW: User Portal navigation
    const userPortalBtn = document.getElementById('user-portal-btn');
    if (userPortalBtn) {
        userPortalBtn.addEventListener('click', () => {
            const profileDropdown = document.querySelector('.profile-dropdown');
            if (profileDropdown) profileDropdown.classList.remove('open');
            window.location.href = 'user-portal.html';
        });
    }

    // Sign out functionality
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            const profileDropdown = document.querySelector('.profile-dropdown');
            if (profileDropdown) {
                profileDropdown.classList.remove('open');
            }
            signOut();
        });
    }

    // Delete account functionality - redirect to dedicated page
    const deleteAccountBtn = document.getElementById('delete-account-btn');

    if (deleteAccountBtn) {
        // Redirect to delete account page
        deleteAccountBtn.addEventListener('click', () => {
            const profileDropdown = document.querySelector('.profile-dropdown');
            if (profileDropdown) {
                profileDropdown.classList.remove('open');
            }
            // Redirect to dedicated delete account page
            window.location.href = '/delete-account.html';
        });

    }

    // Settings button functionality
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        console.log('Settings button found, adding click listener');
        settingsBtn.addEventListener('click', () => {
            console.log('Settings button clicked');
            const profileDropdown = document.querySelector('.profile-dropdown');
            if (profileDropdown) {
                profileDropdown.classList.remove('open');
            }
            showSettingsModal();
        });
    } else {
        console.log('Settings button not found during initialization');
    }
}

// Delete user account function
async function deleteUserAccount() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.error('No user is currently signed in');
            showMessage('Error: No user is currently signed in', 'error');
            return;
        }

        console.log('Attempting to delete user account:', user.uid);
        
        // Delete user data from Firestore first
        try {
            // Delete user reviews
            const reviewsRef = collection(db, 'reviews');
            const userReviewsQuery = query(reviewsRef, where('userId', '==', user.uid));
            const reviewsSnapshot = await getDocs(userReviewsQuery);
            
            const deletePromises = [];
            reviewsSnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref));
            });
            
            // Delete user profile data if it exists
            const userDocRef = doc(db, 'users', user.uid);
            deletePromises.push(deleteDoc(userDocRef));
            
            // Wait for all deletions to complete
            await Promise.all(deletePromises);
            console.log('User data deleted from Firestore');
            
        } catch (firestoreError) {
            console.warn('Error deleting user data from Firestore:', firestoreError);
            // Continue with account deletion even if Firestore cleanup fails
        }

        // Delete the user account
        await user.delete();
        
        console.log('User account deleted successfully');
        showMessage('Account deleted successfully. You have been signed out.', 'success');
        
        // Clear any cached user data
        localStorage.removeItem('userProfileCache');
        localStorage.removeItem('gamePlayPreference');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error deleting user account:', error);
        
        // Handle specific error cases
        if (error.code === 'auth/requires-recent-login') {
            showMessage('For security reasons, please sign out and sign back in before deleting your account.', 'error');
        } else if (error.code === 'auth/user-not-found') {
            showMessage('User account not found.', 'error');
        } else {
            showMessage('Error deleting account: ' + error.message, 'error');
        }
    }
}

// Message display function
function showMessage(message, type) {
    // Create or get existing message element
    let messageElement = document.getElementById('auth-message');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'auth-message';
        messageElement.className = 'auth-message';
        document.body.appendChild(messageElement);
    }

    // Set message content and type
    messageElement.textContent = message;
    messageElement.className = `auth-message ${type}`;
    messageElement.style.display = 'block';

    // Auto hide after 5 seconds
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

function showSettingsModal() {
    // Remove any existing settings modal
    const existingModal = document.getElementById('settingsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create settings modal
    const settingsModal = document.createElement('div');
    settingsModal.className = 'auth-overlay';
    settingsModal.innerHTML = `
        <div class="auth-panel settings-panel">
            <div class="auth-header">
                <div class="auth-logo">
                    <span class="glitch-constant" data-text="SETTINGS">SETTINGS</span>
                </div>
                <button class="auth-close" onclick="closeSettingsModal()">
                    <span class="close-icon">×</span>
                </button>
            </div>
            
            <div class="auth-content">
                <div class="settings-content">
                    <div class="form-title">
                        <span class="glitch-small" data-text="GENERAL">GENERAL</span>
                    </div>
                    <div class="settings-section">
                        <h4>Game Launch Preference</h4>
                        <div class="setting-item"><label class="setting-label"><input type="radio" name="gamePreference" value="ask" ${!localStorage.getItem('gamePlayPreference') ? 'checked' : ''}><span class="radio-custom"></span>Always ask (show modal)</label></div>
                        <div class="setting-item"><label class="setting-label"><input type="radio" name="gamePreference" value="local" ${localStorage.getItem('gamePlayPreference') === 'local' ? 'checked' : ''}><span class="radio-custom"></span>Always play in GlitchRealm</label></div>
                        <div class="setting-item"><label class="setting-label"><input type="radio" name="gamePreference" value="external" ${localStorage.getItem('gamePlayPreference') === 'external' ? 'checked' : ''}><span class="radio-custom"></span>Always open external site</label></div>
                    </div>

                    <div class="form-title" style="margin-top:18px;">
                        <span class="glitch-small" data-text="ACCESSIBILITY">ACCESSIBILITY</span>
                    </div>
                    <div class="settings-section">
                        <div class="setting-item">
                            <label class="setting-label">
                                <input type="checkbox" id="setting-reduce-motion" ${GR_SETTINGS.reduceMotion ? 'checked' : ''}>
                                <span class="radio-custom"></span>
                                Reduce motion effects (less parallax/animation)
                            </label>
                        </div>
                    </div>

                    <div class="form-title" style="margin-top:18px;">
                        <span class="glitch-small" data-text="NOTIFICATIONS">NOTIFICATIONS</span>
                    </div>
                    <div class="settings-section">
                        <div class="setting-item">
                            <label class="setting-label">
                                <input type="checkbox" id="setting-notifications-badge" ${GR_SETTINGS.notificationsBadgeEnabled ? 'checked' : ''}>
                                <span class="radio-custom"></span>
                                Show unread count badge on bell/profile
                            </label>
                        </div>
                    </div>

                    <div class="form-title" style="margin-top:18px;">
                        <span class="glitch-small" data-text="PORTAL">PORTAL</span>
                    </div>
                    <div class="settings-section">
                        <div class="setting-item">
                            <label class="setting-label">
                                <input type="checkbox" id="setting-portal-auto" ${GR_SETTINGS.portalAutoOpenOnSignIn ? 'checked' : ''}>
                                <span class="radio-custom"></span>
                                Open User Portal automatically after sign-in
                            </label>
                        </div>
                    </div>

                    <div class="settings-actions">
                        <button class="neural-button secondary" onclick="closeSettingsModal()">Cancel</button>
                        <button class="neural-button primary" onclick="saveSettings()">Save Settings</button>
                    </div>
                </div>
            </div>
            
            <div class="auth-bg-effect"></div>
            <div class="auth-scanlines"></div>
        </div>
    `;
    
    settingsModal.id = 'settingsModal';
    document.body.appendChild(settingsModal);
    settingsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

window.closeSettingsModal = function() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
};

window.saveSettings = function() {
    const selectedPreference = document.querySelector('input[name="gamePreference"]:checked');
    if (selectedPreference) {
        if (selectedPreference.value === 'ask') localStorage.removeItem('gamePlayPreference');
        else localStorage.setItem('gamePlayPreference', selectedPreference.value);
    }

    // New toggles
    const reduceMotion = document.getElementById('setting-reduce-motion')?.checked;
    const badgeEnabled = document.getElementById('setting-notifications-badge')?.checked;
    const portalAuto = document.getElementById('setting-portal-auto')?.checked;

    try {
        localStorage.setItem('gr.settings.accessibility.reduceMotion', reduceMotion ? '1' : '0');
        localStorage.setItem('gr.settings.notifications.badgeEnabled', badgeEnabled ? '1' : '0');
        localStorage.setItem('gr.settings.portal.autoOpenOnSignIn', portalAuto ? '1' : '0');
    } catch (e) {}

    GR_SETTINGS.reduceMotion = !!reduceMotion;
    GR_SETTINGS.notificationsBadgeEnabled = !!badgeEnabled;
    GR_SETTINGS.portalAutoOpenOnSignIn = !!portalAuto;
    applySettings();
    if (!GR_SETTINGS.notificationsBadgeEnabled) {
        // Hide any visible badges immediately
        const notificationCountElement = document.getElementById('notification-count');
        const notificationCountBadge = document.getElementById('notification-count-badge');
        if (notificationCountElement) notificationCountElement.style.display = 'none';
        if (notificationCountBadge) notificationCountBadge.style.display = 'none';
    }

    // Confirmation toast
    const message = document.createElement('div');
    message.className = 'settings-saved-message';
    message.textContent = 'Settings saved!';
    message.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: linear-gradient(45deg, #00fff9, #ff0080);
        color: #0a0a0a; padding: 12px 18px; border-radius: 8px;
        font-weight: bold; z-index: 10000; animation: messageSlideIn 0.3s ease;
    `;
    document.body.appendChild(message);
    setTimeout(() => { message.style.animation = 'messageSlideOut 0.3s ease'; setTimeout(() => message.remove(), 300); }, 1400);
    closeSettingsModal();
};

// Delete account functionality
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const deleteAccountModal = document.getElementById('delete-account-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const deleteConfirmationInput = document.getElementById('delete-confirmation-input');

    if (deleteAccountBtn && deleteAccountModal) {
        // Open delete account modal
        deleteAccountBtn.addEventListener('click', () => {
            profileDropdown.classList.remove('open');
            deleteAccountModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';            if (deleteConfirmationInput) {
                deleteConfirmationInput.value = '';
                deleteConfirmationInput.disabled = false; // Ensure it's enabled
                deleteConfirmationInput.readOnly = false; // Ensure it's not read-only
                deleteConfirmationInput.style.pointerEvents = 'auto'; // Ensure pointer events
                
                // Add a small delay to ensure modal is fully rendered
                setTimeout(() => {
                    deleteConfirmationInput.focus();
                    deleteConfirmationInput.click(); // Also try clicking to ensure focus
                    console.log('Delete confirmation input should now be focused and ready for input');
                }, 100);
            }
        });

        // Cancel deletion
        cancelDeleteBtn?.addEventListener('click', () => {
            deleteAccountModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            showAuthMessage('Account termination cancelled.', 'info');
        });

        // Close modal when clicking outside of it
        deleteAccountModal.addEventListener('click', (e) => {
            if (e.target === deleteAccountModal) {
                deleteAccountModal.style.display = 'none';
                document.body.style.overflow = 'auto';
                showAuthMessage('Account termination cancelled.', 'info');
            }
        });

        // Handle confirmation input
        deleteConfirmationInput?.addEventListener('input', () => {
            if (confirmDeleteBtn) {
                confirmDeleteBtn.disabled = deleteConfirmationInput.value !== 'DELETE MY ACCOUNT';
            }
        });
        
        // Add click handler to ensure input is focusable
        deleteConfirmationInput?.addEventListener('click', () => {
            console.log('Delete confirmation input clicked');
            deleteConfirmationInput.focus();
        });
        
        // Add focus event for debugging
        deleteConfirmationInput?.addEventListener('focus', () => {
            console.log('Delete confirmation input focused');
        });
        
        // Add keydown event for debugging
        deleteConfirmationInput?.addEventListener('keydown', (e) => {
            console.log('Key pressed in delete confirmation input:', e.key);
        });
        
        // Confirm deletion
        confirmDeleteBtn?.addEventListener('click', async () => {
            if (deleteConfirmationInput?.value !== 'DELETE MY ACCOUNT') {
                return;
            }

            try {
                showAuthLoading(confirmDeleteBtn, 'TERMINATING...');
                deleteConfirmationInput.disabled = true;
                cancelDeleteBtn.disabled = true;
                  const user = window.firebaseAuth.currentUser;
                if (!user) {
                    throw new Error('No active account found');
                }

                // Start deletion process
                showAuthMessage('Initiating account deletion...', 'info');
                
                // Delete the user from Firebase
                await window.deleteUser(user);
                
                // Clear any local data
                localStorage.removeItem('lastSignInTime');
                sessionStorage.clear();
                
                // Close modal and show success
                deleteAccountModal.style.display = 'none';
                document.body.style.overflow = 'auto';
                showAuthMessage('Neural link successfully terminated. All traces removed.', 'success');
                  } catch (error) {
                console.error('Account deletion error:', error);
                
                if (error.code === 'auth/requires-recent-login') {
                    // Close the delete modal first
                    deleteAccountModal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    
                    showAuthMessage('Security protocol: Recent neural sync required for account termination. Please sign in again to continue.', 'error');
                    
                    // Automatically sign out the user so they can sign back in
                    try {
                        await window.firebaseAuth.signOut();
                        // Clear any stored data
                        localStorage.removeItem('lastSignInTime');
                        sessionStorage.clear();
                        
                        // Redirect to sign in page after a brief delay
                        setTimeout(() => {
                            try { sessionStorage.setItem('gr.returnTo', window.location.href); } catch {}
                            window.location.href = `Sign In/index.html?redirect=${encodeURIComponent(window.location.href)}&message=${encodeURIComponent('Please sign in again to delete your account')}&type=info`;
                        }, 2000);
                    } catch (signOutError) {
                        console.error('Sign out error:', signOutError);
                        // Still redirect to sign in page
                        setTimeout(() => {
                            try { sessionStorage.setItem('gr.returnTo', window.location.href); } catch {}
                            window.location.href = `Sign In/index.html?redirect=${encodeURIComponent(window.location.href)}&message=${encodeURIComponent('Please sign in again to delete your account')}&type=info`;
                        }, 2000);
                    }
                    return; // Exit early since we're redirecting
                } else if (error.code === 'auth/network-request-failed') {
                    showAuthMessage('Connection interrupted. Check your network connection and try again.', 'error');
                } else if (error.code === 'auth/internal-error') {
                    showAuthMessage('Internal system error. Please try again in a few moments.', 'error');
                } else {
                    showAuthMessage('Account deletion failed: ' + getErrorMessage(error.code), 'error');
                }
                
                deleteConfirmationInput.disabled = false;
                cancelDeleteBtn.disabled = false;
            } finally {
                hideAuthLoading(confirmDeleteBtn, 'DELETE ACCOUNT');
            }
        });        // Handle Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && deleteAccountModal.style.display === 'flex') {
                deleteAccountModal.style.display = 'none';
                document.body.style.overflow = 'auto';
                showAuthMessage('Account termination cancelled.', 'info');
            }        });
    }

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

// Add fadeOut animation to CSS if not already present
if (!document.querySelector('#fadeOutKeyframes')) {
    const style = document.createElement('style');
    style.id = 'fadeOutKeyframes';
    style.textContent = `
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Load Header and Footer
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting header/footer loading...');
    
    // Load header (defer to idle when available to reduce TBT)
    const loadHeader = () => fetch('header.html?v=' + Date.now())
        .then(response => {
            console.log('Header fetch response:', response.status);
            return response.text();
        })
        .then(data => {
            console.log('Header data received, length:', data.length);
            const headerPlaceholder = document.getElementById('header-placeholder');
            console.log('Header placeholder found:', !!headerPlaceholder);
            
            if (headerPlaceholder) {
                headerPlaceholder.innerHTML = data;
                
                // Add a visual indicator that header was loaded
                console.log('Header loaded successfully!');

        // After header injection, try to show the Terms Updated popup once per version
                try {
                    const overlay = document.getElementById('terms-update-popup');
                    if (overlay) {
            const TERMS_UPDATE_VERSION = window.GR_TERMS_UPDATE_VERSION || '2025-09-05';
            const seenKey = 'gr.terms.updated.seen.v' + TERMS_UPDATE_VERSION;
                        const seen = localStorage.getItem(seenKey) === '1';
                        if (!seen) {
                            overlay.style.display = 'flex';
                            const dismiss = document.getElementById('dismiss-terms-update');
                            const accept = document.getElementById('accept-terms-update');
                            const inlineLinks = overlay.querySelectorAll('a.popup-inline-link');
                            const finalize = () => {
                                try { localStorage.setItem(seenKey, '1'); } catch {}
                                overlay.style.display = 'none';
                                // In case any scroll lock was set elsewhere, restore it safely
                                try {
                                    if (overlay.dataset && 'prevOverflow' in overlay.dataset) {
                                        document.body.style.overflow = overlay.dataset.prevOverflow || '';
                                        delete overlay.dataset.prevOverflow;
                                    }
                                } catch {}
                            };
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
                            // Accept should acknowledge and close
                            accept && accept.addEventListener('click', finalize, { once: true });
                            // Inline links also acknowledge once clicked
                            inlineLinks.forEach(a => a.addEventListener('click', () => { try { localStorage.setItem(seenKey, '1'); } catch {} }, { once: true }));
                            overlay.addEventListener('click', (e) => { if (e.target === overlay) finalize(); }, { once: true });
                            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') finalize(); }, { once: true });
                        }
                    }
                } catch (e) { /* non-fatal */ }
                
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
                
                // Reinitialize authentication elements after header is loaded
                // Add a small delay to ensure DOM is fully updated
                setTimeout(() => {
                    console.log('Initializing auth elements...');
                    
                    // Initialize auth elements
                    if (window.firebaseAuth) {
                        if (window.pendingAuthInit) {
                            window.pendingAuthInit();
                            window.pendingAuthInit = null;
                        } else {
                            initializeAuthElements();
                        }
                        // Also wire Moderation menu based on current auth state (dev UIDs only)
                        try {
                            const user = window.firebaseAuth.currentUser;
                            const moderationMenuBtn = document.getElementById('moderation-menu-btn');
                            if (moderationMenuBtn) {
                                const DEV_UIDS = new Set([
                                    '6iZDTXC78aVwX22qrY43BOxDRLt1',
                                    'YR3c4TBw09aK7yYxd7vo0AmI6iG3',
                                    'g14MPDZzUzR9ELP7TD6IZgk3nzx2',
                                    '4oGjihtDjRPYI0LsTDhpXaQAJjk1',
                                    'ZEkqLM6rNTZv1Sun0QWcKYOIbon1'
                                ]);
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
                        console.log('Firebase auth not ready, initializing basic auth elements...');
                        initializeAuthElements();
                    }
                    
                    // Force dropdown initialization after a bit more delay
                    setTimeout(() => {
                        console.log('Force initializing dropdowns...');
                        forceInitializeDropdowns();
                        // After dropdowns are ready, maybe show the Portal intro popup
                        setTimeout(() => {
                            maybeShowPortalIntro();
                            // Also introduce the GlitchRealm Bot (shows only once and only on home/portal)
                            setTimeout(() => { try { maybeShowBotIntro(); } catch (e) { console.warn('Bot intro failed:', e); } }, 500);
                        }, 300);
                    }, 200);
                }, 100);
            }
        })
        .catch(error => {
            console.error('Error loading header:', error);
        });

    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => loadHeader());
    } else {
        setTimeout(loadHeader, 0);
    }

    // Also try to initialize dropdowns independently after a delay
    setTimeout(() => {
        console.log('Independent dropdown initialization...');
        forceInitializeDropdowns();
        
        // Also force sign-in button if it exists
        // Disabled - sign-in button is now a direct link to auth.glitchrealm.ca
        // const signInBtn = document.getElementById('sign-in-btn');
        // const signInModal = document.getElementById('signin-modal');
        // if (signInBtn) {
        //     signInBtn.onclick = function(e) {
        //         e.preventDefault();
        //         console.log('Sign in clicked (backup handler)');
        //         const overlay = document.getElementById('signin-modal');
        //         if (overlay) {
        //             overlay.style.display = 'flex';
        //             document.body.style.overflow = 'hidden';
        //         } else {
        //             const currentUrl = window.location.href;
        //             try { sessionStorage.setItem('gr.returnTo', currentUrl); } catch {}
        //             window.location.href = `Sign In/index.html?redirect=${encodeURIComponent(currentUrl)}`;
        //         }
        //     };
        // }
        
        // Force profile functions as backup
        setTimeout(() => {
            console.log('Backup profile function setup...');
            if (window.fixProfileFunctions) {
                window.fixProfileFunctions();
            }
        }, 200);
    }, 500);

    // Load footer (defer slightly)
    const loadFooter = () => fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            const footerPlaceholder = document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                footerPlaceholder.innerHTML = data;
                // After injecting footer via innerHTML, inline <script> tags don't auto-execute.
                // Re-run any script tags (e.g., chatbot loader, Buy Me a Coffee widget) safely.
                try {
                    const footerScripts = footerPlaceholder.querySelectorAll('script');
                    footerScripts.forEach(orig => {
                        // Skip if already executed
                        if (orig.dataset.executed === '1') return;
                        const clone = document.createElement('script');
                        // Copy attributes
                        for (const attr of orig.attributes) {
                            // Avoid duplicate IDs colliding (e.g., chatbot loader) by keeping the same id only if not already in DOM
                            if (attr.name === 'id' && document.getElementById(attr.value)) continue;
                            clone.setAttribute(attr.name, attr.value);
                        }
                        // Mark provenance
                        clone.dataset.fromFooter = '1';
                        // Inline script content
                        if (!orig.src) clone.textContent = orig.textContent || '';
                        // Append to body to execute
                        document.body.appendChild(clone);
                        orig.dataset.executed = '1';
                    });
                } catch (e) { console.warn('Footer script execution issue:', e); }

                // Initialize chatbot FAB only on support page after attempting to (re)load scripts
                if (/\/support\.html$/i.test(location.pathname)) {
                    try { setupChatbotFab(); } catch (e) { console.warn('setupChatbotFab failed:', e); }
                }
            }
        })
        .catch(error => console.error('Error loading footer:', error));

    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => loadFooter());
    } else {
        setTimeout(loadFooter, 150);
    }
});

// Function to initialize authentication elements after header is loaded
function initializeAuthElements() {
    console.log('=== initializeAuthElements called ===');
    
    // Re-get DOM elements after header is loaded
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const userProfile = document.getElementById('user-profile');
    
    console.log('Auth elements found:', { signInBtn, signOutBtn, userProfile });
    
    // Disabled - sign-in button is now a direct link to auth.glitchrealm.ca
    // if (signInBtn) {
    //     console.log('Setting up sign-in modal event listeners...');
    //     
    //     // Remove existing listeners by cloning buttons
    //     const newSignInBtn = signInBtn.cloneNode(true);
    //     signInBtn.parentNode.replaceChild(newSignInBtn, signInBtn);
    //     
    //     // Add event listener to the sign-in button
    //     newSignInBtn.addEventListener('click', function(e) {
    //         e.preventDefault();
    //         console.log('Sign in button clicked!');
    //
    //         // If the centralized header modal exists, open it inline
    //         const authOverlay = document.getElementById('signin-modal');
    //         if (authOverlay) {
    //             console.log('Opening centralized sign-in modal');
    //             authOverlay.style.display = 'flex';
    //             document.body.style.overflow = 'hidden';
    //             return;
    //         }
    //
    //         // Fallback: navigate to the standalone Sign In page with redirect parameter
    //         const currentUrl = window.location.href;
    //         try { sessionStorage.setItem('gr.returnTo', currentUrl); } catch {}
    //         const target = `Sign In/index.html?redirect=${encodeURIComponent(currentUrl)}`;
    //         console.log('Modal not found, redirecting to standalone sign-in:', target);
    //         window.location.href = target;
    //     });
    //     
    //     console.log('Auth event listeners attached');
    // }
        
    // Find and handle close modal button (specific to sign-in modal)
    const closeModal = document.querySelector('#close-modal');
        if (closeModal) {
            const newCloseModal = closeModal.cloneNode(true);
            closeModal.parentNode.replaceChild(newCloseModal, closeModal);
            
            newCloseModal.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Close modal button clicked!');
                
        // Get the sign-in auth overlay explicitly by id to avoid other overlays
        const authOverlay = document.getElementById('signin-modal');
                if (authOverlay) {
                    console.log('Auth overlay found, hiding it');
                    authOverlay.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
        }
        
        // Close modal on backdrop click
    document.addEventListener('click', function(e) {
        const authOverlay = document.getElementById('signin-modal');
        if (authOverlay && e.target === authOverlay) {
                authOverlay.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
        
        console.log('Auth event listeners attached');
        
        // Re-initialize dropdown functionality
        console.log('Calling dropdown initialization functions...');
        initializeDropdownFunctionality();
        
        // Re-initialize profile dropdown functionality
        initializeProfileDropdown();
        
        // Profile picture upload now handled by portal-avatar-integration.js (Supabase)
        // Old initializeProfilePictureUpload() and initializeCropModal() removed
        
        // Re-initialize profile action buttons
        initializeProfileActions();
        
        // Re-initialize auth state check
        if (window.firebaseAuth && window.firebaseAuth.currentUser) {
            const user = window.firebaseAuth.currentUser;
            updateUserProfile(user);
            if (signInBtn) signInBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
        }
}

// Function to initialize dropdown functionality
function initializeDropdownFunctionality() {
    console.log('Initializing dropdown functionality...');
    const dropdown = document.querySelector('.nav-dropdown');
    const trigger = dropdown?.querySelector('.dropdown-trigger');
    const menu = dropdown?.querySelector('.nav-dropdown-menu');
    
    console.log('Dropdown elements found:', { dropdown, trigger, menu });

    if (dropdown && trigger && menu) {
        console.log('Setting up "More" dropdown event listeners...');
        
        // Clear any existing event listeners by removing and re-adding the element
        const newTrigger = trigger.cloneNode(true);
        trigger.parentNode.replaceChild(newTrigger, trigger);
        
        // Toggle dropdown on click
        newTrigger.addEventListener('click', function(e) {
            console.log('More dropdown clicked!');
            e.preventDefault();
            e.stopPropagation();
            
            // Close other dropdowns first
            document.querySelectorAll('.nav-dropdown.open, .profile-dropdown.open').forEach(dd => {
                if (dd !== dropdown) dd.classList.remove('open');
            });
            
            dropdown.classList.toggle('open');
            console.log('Dropdown classes after toggle:', dropdown.className);
        });

        // Global click handler for closing dropdowns
        if (!document.body.dataset.globalDropdownListenerAdded) {
            document.addEventListener('click', function(e) {
                const openDropdowns = document.querySelectorAll('.nav-dropdown.open, .profile-dropdown.open');
                openDropdowns.forEach(dropdown => {
                    if (!dropdown.contains(e.target)) {
                        dropdown.classList.remove('open');
                    }
                });
            });

            // Global escape key handler
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    document.querySelectorAll('.nav-dropdown.open, .profile-dropdown.open').forEach(dd => {
                        dd.classList.remove('open');
                    });
                }
            });
            
            document.body.dataset.globalDropdownListenerAdded = 'true';
        }

        // Handle dropdown links
        const dropdownLinks = dropdown.querySelectorAll('.nav-dropdown-link');
        dropdownLinks.forEach(link => {
            link.addEventListener('click', function() {
                dropdown.classList.remove('open');
            });
        });
        console.log('More dropdown initialized successfully');
    } else {
        console.log('More dropdown elements not found');
    }
}

// Force initialize dropdowns with simplified approach
function forceInitializeDropdowns() {
    console.log('=== Force Initializing Dropdowns ===');
    
    // Initialize navigation dropdown
    const navDropdown = document.querySelector('.nav-dropdown');
    const navTrigger = document.querySelector('.dropdown-trigger');
    
    if (navDropdown && navTrigger) {
        console.log('Setting up nav dropdown...');
        
        // Remove any existing listeners
        const newTrigger = navTrigger.cloneNode(true);
        navTrigger.parentNode.replaceChild(newTrigger, navTrigger);
        
        // Add click listener
        newTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Nav dropdown clicked!');
            
            // Close other dropdowns
            document.querySelectorAll('.profile-dropdown.open').forEach(dd => dd.classList.remove('open'));
            
            // Toggle this dropdown
            navDropdown.classList.toggle('open');
            console.log('Nav dropdown is now:', navDropdown.classList.contains('open') ? 'open' : 'closed');
        });
        
        console.log('Nav dropdown setup complete');
    } else {
        console.log('Nav dropdown elements not found:', { navDropdown, navTrigger });
    }
    
    // Initialize profile dropdown
    const profileDropdown = document.querySelector('.profile-dropdown');
    const profileTrigger = document.querySelector('.profile-trigger');
    
    if (profileDropdown && profileTrigger) {
        console.log('Setting up profile dropdown...');
        
        // Remove any existing listeners
        const newProfileTrigger = profileTrigger.cloneNode(true);
        profileTrigger.parentNode.replaceChild(newProfileTrigger, profileTrigger);
        
        // Add click listener
        newProfileTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Profile dropdown clicked!');
            
            // Close other dropdowns
            document.querySelectorAll('.nav-dropdown.open').forEach(dd => dd.classList.remove('open'));
            
            // Toggle this dropdown
            profileDropdown.classList.toggle('open');
            console.log('Profile dropdown is now:', profileDropdown.classList.contains('open') ? 'open' : 'closed');
        });
        
        console.log('Profile dropdown setup complete');
    } else {
        console.log('Profile dropdown elements not found:', { profileDropdown, profileTrigger });
    }
    
    // Force setup all profile functions
    console.log('Setting up profile actions...');
    initializeProfileActions();
    
    // Add global click handler to close dropdowns
    if (!window.globalDropdownHandlerAdded) {
        document.addEventListener('click', function(e) {
            const navDropdown = document.querySelector('.nav-dropdown');
            const profileDropdown = document.querySelector('.profile-dropdown');
            
            // Close nav dropdown if click is outside
            if (navDropdown && !navDropdown.contains(e.target)) {
                navDropdown.classList.remove('open');
            }
            
            // Close profile dropdown if click is outside
            if (profileDropdown && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('open');
            }
        });
        
        // Add escape key handler
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.nav-dropdown.open, .profile-dropdown.open').forEach(dd => {
                    dd.classList.remove('open');
                });
            }
        });
        
        window.globalDropdownHandlerAdded = true;
        console.log('Global dropdown handlers added');
    }
}

// One-time intro popup for GlitchRealm Portal
function maybeShowPortalIntro() {
    try {
        if (localStorage.getItem('gr.portalIntro.dismissed') === '1') return;
    } catch (e) {
        // Ignore storage errors; continue to show once per session
    }

    // Don't show on the Portal page or portal subdomain
    const onPortal = /(^|\/)user-portal\.html$/i.test(location.pathname) || location.hostname.toLowerCase().startsWith('portal.');
    if (onPortal) return;

    // Avoid duplicate if already injected
    if (document.getElementById('portal-intro-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'portal-intro-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'portal-intro-title');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(0,0,0,0.55)';
    overlay.style.zIndex = '10000';

    const card = document.createElement('div');
    card.style.width = 'min(540px, 92vw)';
    card.style.background = '#0b0e14';
    card.style.border = '1px solid #263043';
    card.style.borderRadius = '12px';
    card.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)';
    card.style.color = '#e6edf3';
    card.style.padding = '20px 20px 16px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.gap = '12px';
    header.style.alignItems = 'center';

    const icon = document.createElement('img');
    icon.src = 'assets/Favicon and Icons/favicon.ico';
    icon.alt = '';
    icon.width = 28;
    icon.height = 28;
    icon.style.borderRadius = '6px';

    const title = document.createElement('h2');
    title.id = 'portal-intro-title';
    title.textContent = 'Introducing GlitchRealm Portal';
    title.style.margin = '0';
    title.style.fontSize = '1.35rem';

    header.appendChild(icon);
    header.appendChild(title);

    const body = document.createElement('div');
    body.style.marginTop = '10px';
    body.style.lineHeight = '1.6';
    body.innerHTML = `
        Manage your account, track playtime across GlitchRealm games, and get support — all in one place.<br/>
        Access it anytime from your profile menu (top-right) under <strong>User Portal</strong>,
        or from <strong>More → User Portal</strong> in the top navigation.
    `;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.justifyContent = 'flex-end';
    actions.style.gap = '10px';
    actions.style.marginTop = '16px';

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.textContent = 'Got it';
    dismissBtn.style.padding = '10px 14px';
    dismissBtn.style.borderRadius = '8px';
    dismissBtn.style.background = 'transparent';
    dismissBtn.style.border = '1px solid #3b475e';
    dismissBtn.style.color = '#e6edf3';

    const openBtn = document.createElement('a');
    openBtn.href = 'user-portal.html';
    openBtn.textContent = 'Open Portal';
    openBtn.style.padding = '10px 14px';
    openBtn.style.borderRadius = '8px';
    openBtn.style.background = '#2d72d2';
    openBtn.style.border = '1px solid #2d72d2';
    openBtn.style.color = '#ffffff';
    openBtn.style.textDecoration = 'none';

    actions.appendChild(dismissBtn);
    actions.appendChild(openBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const dismiss = () => {
        try { localStorage.setItem('gr.portalIntro.dismissed', '1'); } catch (e) {}
        overlay.remove();
    };

    dismissBtn.addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss(); }, { once: true });

    // Focus for accessibility
    setTimeout(() => dismissBtn.focus(), 0);
}

// One-time intro popup for GlitchRealm Bot (appears on Home or User Portal)
function maybeShowBotIntro() {
    // Respect prior dismissal
    try { if (localStorage.getItem('gr.botIntro.dismissed') === '1') return; } catch {}

    // Show only on Home or User Portal
    const onHome = /(^|\/)((index\.html)?$)/i.test(location.pathname) || location.pathname === '/';
    const onPortal = /(^|\/)user-portal\.html$/i.test(location.pathname);
    if (!(onHome || onPortal)) return;

    // If another intro modal is visible, skip to avoid stacking
    if (document.getElementById('portal-intro-modal')) return;
    if (document.getElementById('bot-intro-modal')) return;

    // Build overlay
    const overlay = document.createElement('div');
    overlay.id = 'bot-intro-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'bot-intro-title');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(0,0,0,0.55)';
    overlay.style.zIndex = '10000';

    const card = document.createElement('div');
    card.style.width = 'min(560px, 92vw)';
    card.style.background = '#0b0e14';
    card.style.border = '1px solid #263043';
    card.style.borderRadius = '12px';
    card.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)';
    card.style.color = '#e6edf3';
    card.style.padding = '20px 20px 16px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.gap = '12px';
    header.style.alignItems = 'center';

    const icon = document.createElement('img');
    icon.src = 'assets/Favicon and Icons/favicon.ico';
    icon.alt = '';
    icon.width = 28;
    icon.height = 28;
    icon.style.borderRadius = '6px';

    const title = document.createElement('h2');
    title.id = 'bot-intro-title';
    title.textContent = 'Introducing GlitchRealm Bot';
    title.style.margin = '0';
    title.style.fontSize = '1.35rem';

    header.appendChild(icon);
    header.appendChild(title);

    const body = document.createElement('div');
    body.style.marginTop = '10px';
    body.style.lineHeight = '1.6';
    body.innerHTML = `
        <div style="margin-bottom: 4px; opacity: 0.9;">Our biggest milestone yet — a smart assistant built into GlitchRealm.</div>
        <div>Ask about our games, get playtime tips, account help, roadmap info, and troubleshooting — 24/7.</div>
        <ul style="margin: 10px 0 0 18px; line-height: 1.6;">
            <li>Instant answers about CodeRunner, ByteSurge, Byte Wars, and more</li>
            <li>Account and portal guidance without leaving the page</li>
            <li>Updates, changelogs, and “what’s new” at your fingertips</li>
        </ul>
        <div style="margin-top:10px; opacity:0.85;">Open it anytime from the chat button in the bottom-right.</div>
    `;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.justifyContent = 'flex-end';
    actions.style.gap = '10px';
    actions.style.marginTop = '16px';

    const laterBtn = document.createElement('button');
    laterBtn.type = 'button';
    laterBtn.textContent = 'Maybe later';
    laterBtn.style.padding = '10px 14px';
    laterBtn.style.borderRadius = '8px';
    laterBtn.style.background = 'transparent';
    laterBtn.style.border = '1px solid #3b475e';
    laterBtn.style.color = '#e6edf3';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.textContent = 'Open Chat';
    openBtn.style.padding = '10px 14px';
    openBtn.style.borderRadius = '8px';
    openBtn.style.background = '#2d72d2';
    openBtn.style.border = '1px solid #2d72d2';
    openBtn.style.color = '#ffffff';

    actions.appendChild(laterBtn);
    actions.appendChild(openBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const dismiss = () => {
        try {
            localStorage.setItem('gr.botIntro.dismissed', '1');
            // Also avoid showing the coachmark after intro
            localStorage.setItem('gr.chatCoachmark.dismissed', '1');
        } catch {}
        try { overlay.remove(); } catch {}
    };

    // Minimal open helper (namespaces + launcher click + event broadcast)
    function openChatbotNow() {
        try {
            const g = window;
            const namespaces = [g.DOAIChatbot, g.DoAIChatbot, g.doAIChatbot, g.doaiChatbot, g.DOAI, g.DoAI, g.doAI, g.doai].filter(Boolean);
            const methods = ['open','toggle','show','start','expand','openChat','openWidget','openChatbot'];
            for (const ns of namespaces) {
                if (!ns) continue;
                for (const m of methods) {
                    if (typeof ns[m] === 'function') { ns[m](); return true; }
                }
                if (ns.widget) {
                    for (const m of methods) { if (typeof ns.widget[m] === 'function') { ns.widget[m](); return true; } }
                }
            }
        } catch {}
        try { window.dispatchEvent(new CustomEvent('doai:open')); } catch {}
        try { window.dispatchEvent(new Event('doai-open')); } catch {}
        try { window.postMessage({ type: 'doai:open' }, '*'); } catch {}
        // Try clicking the launcher
        try {
            const selectors = ['[data-doai-launcher]','[class*="doai"][class*="launch"]','.doai-launcher','.doai-widget-launcher','.doai-chatbot-launcher','.doai-floating-button','button[aria-label*="chat" i]','button[title*="chat" i]'];
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) { el.click(); return true; }
            }
        } catch {}
        return false;
    }

    laterBtn.addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss(); }, { once: true });
    openBtn.addEventListener('click', () => {
        dismiss();
        // Give the widget a brief moment if still loading, then try to open
        setTimeout(() => {
            if (!openChatbotNow()) {
                setTimeout(() => openChatbotNow(), 600);
            }
        }, 150);
    });

    // Focus for accessibility
    setTimeout(() => openBtn.focus(), 0);
}

// Test profile functions
window.testProfileFunctions = function() {
    console.log('=== Testing Profile Functions ===');
    
    const refreshBtn = document.getElementById('refresh-profile-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const deleteBtn = document.getElementById('delete-account-btn');
    
    console.log('Profile buttons found:', {
        refresh: !!refreshBtn,
        signOut: !!signOutBtn,
        delete: !!deleteBtn
    });
    
    if (refreshBtn) {
        console.log('Refresh button text:', refreshBtn.textContent.trim());
    }
    if (signOutBtn) {
        console.log('Sign out button text:', signOutBtn.textContent.trim());
    }
    if (deleteBtn) {
        console.log('Delete button text:', deleteBtn.textContent.trim());
    }
    
    // Check if they have click listeners
    console.log('Testing button clicks...');
    if (refreshBtn) {
        console.log('Refresh button click test');
        refreshBtn.click();
    }
    
    setTimeout(() => {
        if (signOutBtn) {
            console.log('Sign out button click test');
            signOutBtn.click();
        }
    }, 1000);
    
    setTimeout(() => {
        if (deleteBtn) {
            console.log('Delete button click test');
            deleteBtn.click();
        }
    }, 2000);
};

// Force setup all profile functions
window.fixProfileFunctions = function() {
    console.log('=== Fixing Profile Functions ===');
    
    // Setup refresh profile
    const refreshBtn = document.getElementById('refresh-profile-btn');
    if (refreshBtn) {
        refreshBtn.onclick = function(e) {
            e.preventDefault();
            console.log('Refresh profile clicked');
            const dropdown = document.querySelector('.profile-dropdown');
            if (dropdown) dropdown.classList.remove('open');
            if (window.refreshUserProfile) window.refreshUserProfile();
        };
        console.log('Refresh profile function setup');
    }
    
    // Setup sign out
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.onclick = function(e) {
            e.preventDefault();
            console.log('Sign out clicked');
            const dropdown = document.querySelector('.profile-dropdown');
            if (dropdown) dropdown.classList.remove('open');
            if (window.firebaseAuth) {
                window.firebaseAuth.signOut().then(() => {
                    console.log('Signed out successfully');
                    location.reload();
                }).catch(error => {
                    console.error('Sign out error:', error);
                });
            }
        };
        console.log('Sign out function setup');
    }
    
    // Setup delete account
    const deleteBtn = document.getElementById('delete-account-btn');
    if (deleteBtn) {
        deleteBtn.onclick = function(e) {
            e.preventDefault();
            console.log('Delete account clicked');
            const dropdown = document.querySelector('.profile-dropdown');
            if (dropdown) dropdown.classList.remove('open');
            
            const modal = document.getElementById('delete-account-modal');
            if (modal) {
                modal.style.display = 'flex';
                console.log('Delete account modal opened');
            } else {
                console.log('Delete account modal not found');
            }
        };
        console.log('Delete account function setup');
    }
    
    // Notification Bell Functionality
    const notificationBell = document.getElementById('notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.shiftKey && typeof window.createTestNotification === 'function') {
                // Hidden dev shortcut: Shift+Click to create a test notification
                window.createTestNotification();
            } else {
                handleNotificationClick();
            }
        });
    }
};

// Notification Bell Functions
function handleNotificationClick() {
    console.log('Notification bell clicked');
    // Clear notification count
    updateNotificationCount(0);
    
    // Here you can add logic to:
    // - Open a notifications dropdown/modal
    // - Navigate to notifications page
    // - Mark notifications as read
    
    // For now, just show an alert as placeholder
    alert('Notifications feature coming soon!');
}

function updateNotificationCount(count) {
    // Update notification count in dropdown menu
    const notificationCountElement = document.getElementById('notification-count');
    if (notificationCountElement) {
    if (count > 0 && GR_SETTINGS.notificationsBadgeEnabled) {
            notificationCountElement.textContent = count > 99 ? '99+' : count.toString();
            notificationCountElement.style.display = 'flex';
        } else {
            notificationCountElement.style.display = 'none';
        }
    }
    
    // Update notification count badge on profile trigger
    const notificationCountBadge = document.getElementById('notification-count-badge');
    if (notificationCountBadge) {
    if (count > 0 && GR_SETTINGS.notificationsBadgeEnabled) {
            notificationCountBadge.textContent = count > 99 ? '99+' : count.toString();
            notificationCountBadge.style.display = 'flex';
        } else {
            notificationCountBadge.style.display = 'none';
        }
    }
}

// Example function to simulate adding notifications (for testing)
function addNotification() {
    const currentCount = parseInt(document.getElementById('notification-count')?.textContent || '0');
    updateNotificationCount(currentCount + 1);
}

// Auto-initialize notification bell when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Debug: Check if notification bell exists
    const notificationBell = document.getElementById('notification-bell');
    console.log('Notification bell found:', !!notificationBell);
    
    // For testing purposes only, you can simulate a notification count.
    // This is disabled by default to avoid overriding real Firestore counts.
    const ENABLE_TEST_BADGE = false;
    if (ENABLE_TEST_BADGE) {
        setTimeout(() => {
            updateNotificationCount(1);
            console.log('Test notification count set to 1');
        }, 1000);
    }
    
    // Start global notifications listener (shared for all users)
    (async () => {
        try {
            await startGlobalNotificationsListener();
            console.log('Global notifications listener active');
        } catch (e) {
            console.warn('Failed to start global notifications listener:', e);
        }
    })();
    
    // You can call updateNotificationCount here with actual notification data
    // For demo purposes, uncomment the line below to show a notification count:
    // updateNotificationCount(3);
    
    // Initialize Mobile Navigation
    initializeMobileNavigation();
});

// Mobile Menu Toggle Functionality
function initializeMobileNavigation() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    let isMenuOpen = false;

    // Debug logging
    console.log('Initializing mobile navigation...');
    console.log('Mobile toggle button:', mobileMenuToggle);
    console.log('Nav links:', navLinks);

    function toggleMobileMenu() {
        isMenuOpen = !isMenuOpen;
        console.log('Toggling mobile menu. Open:', isMenuOpen);
        
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
            console.log('Mobile menu closed');
        }
    }

    function closeAllDropdowns() {
        // Close nav dropdown
        const navDropdown = document.querySelector('.nav-dropdown');
        if (navDropdown) {
            navDropdown.classList.remove('open');
        }
        
        // Close profile dropdown
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.classList.remove('open');
        }
    }

    // Mobile menu toggle click handler
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function(e) {
            console.log('Mobile menu button clicked!');
            e.preventDefault();
            e.stopPropagation();
            toggleMobileMenu();
        });
        
        // Also add touch event for better mobile support
        mobileMenuToggle.addEventListener('touchend', function(e) {
            console.log('Mobile menu button touched!');
            e.preventDefault();
            e.stopPropagation();
            toggleMobileMenu();
        });
        
        console.log('Mobile menu toggle event listeners added');
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

    // Enhanced dropdown handling for mobile
    const dropdownTriggers = document.querySelectorAll('.dropdown-trigger, .profile-trigger');
    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.closest('.nav-dropdown, .user-profile');
            const isOpen = dropdown.classList.contains('open');
            
            // Close all other dropdowns
            dropdownTriggers.forEach(otherTrigger => {
                const otherDropdown = otherTrigger.closest('.nav-dropdown, .user-profile');
                if (otherDropdown !== dropdown) {
                    otherDropdown.classList.remove('open');
                }
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('open', !isOpen);
        });
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
    
    console.log('Mobile navigation initialization complete');
}
