// GlitchRealm — Seasonal Falling Effects
// Reads site_config/seasonal_effects from Firestore and renders emoji particles
// Particles fall ONCE (not infinite). A toggle on the right lets users replay or hide.
// Respects prefers-reduced-motion.

(function () {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const path = window.location.pathname;
    if (path.startsWith('/admin') || path === '/maintenance.html') return;

    const INTENSITY_MAP = { low: 15, medium: 30, high: 50 };
    let activeEffects = [];
    let container = null;
    let toggleBtn = null;
    let effectsVisible = true;

    async function init() {
        if (window.firebaseReady) await window.firebaseReady;
        const db = window.firebaseFirestore;
        if (!db) return;

        try {
            const { doc, getDoc } = await import(
                'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
            );
            const snap = await getDoc(doc(db, 'site_config', 'seasonal_effects'));
            if (!snap.exists()) return;

            const data = snap.data();
            const now = Date.now();

            if (data.presets) {
                for (const [, cfg] of Object.entries(data.presets)) {
                    if (!cfg.enabled) continue;
                    const s = toMs(cfg.startAt);
                    const e = toMs(cfg.endAt);
                    if (s && e && now >= s && now <= e) activeEffects.push(cfg);
                }
            }
            if (data.custom && Array.isArray(data.custom)) {
                for (const cfg of data.custom) {
                    if (!cfg.enabled) continue;
                    const s = toMs(cfg.startAt);
                    const e = toMs(cfg.endAt);
                    if (s && e && now >= s && now <= e) activeEffects.push(cfg);
                }
            }

            if (activeEffects.length === 0) return;

            injectStyles();
            createToggle();
            runEffects();
        } catch (e) {
            // Non-critical — fail silently
        }
    }

    function toMs(val) {
        if (!val) return null;
        if (val.toDate) return val.toDate().getTime();
        if (val.seconds) return val.seconds * 1000;
        const n = new Date(val).getTime();
        return isNaN(n) ? null : n;
    }

    function injectStyles() {
        if (document.getElementById('gr-fx-style')) return;
        const style = document.createElement('style');
        style.id = 'gr-fx-style';
        style.textContent = `
            @keyframes grFxFall {
                0%   { transform: translateY(-5vh) rotate(0deg);   opacity: 1; }
                85%  { opacity: 1; }
                100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
            }
            .gr-fx-particle {
                position: fixed;
                top: -5vh;
                pointer-events: none;
                z-index: 99998;
                user-select: none;
                will-change: transform, opacity;
                animation-name: grFxFall;
                animation-timing-function: linear;
                animation-fill-mode: forwards;
                animation-iteration-count: 1;
            }
            .gr-fx-toggle {
                position: fixed;
                right: 16px;
                bottom: 80px;
                z-index: 99999;
                padding: 6px 12px;
                border-radius: 20px;
                border: 1px solid rgba(0,255,249,0.35);
                background: rgba(10,10,10,0.88);
                color: #00fff9;
                font-family: 'Rajdhani', sans-serif;
                font-size: 0.8rem;
                font-weight: 700;
                letter-spacing: 0.5px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 5px;
                backdrop-filter: blur(8px);
                transition: border-color 0.2s, color 0.2s, opacity 0.2s;
                opacity: 0.85;
                white-space: nowrap;
            }
            .gr-fx-toggle:hover { opacity: 1; border-color: #00fff9; }
            .gr-fx-toggle.off {
                border-color: rgba(255,71,87,0.35);
                color: rgba(255,255,255,0.4);
                opacity: 0.7;
            }
            .gr-fx-toggle.off:hover {
                border-color: #ff4757;
                color: #fff;
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    function createToggle() {
        toggleBtn = document.createElement('button');
        toggleBtn.className = 'gr-fx-toggle';
        toggleBtn.setAttribute('aria-label', 'Hide seasonal effects');
        setToggleLabel(true);
        document.body.appendChild(toggleBtn);

        toggleBtn.addEventListener('click', () => {
            if (effectsVisible) {
                hideEffects();
            } else {
                runEffects();
            }
        });
    }

    function setToggleLabel(visible) {
        const emoji = activeEffects[0]?.emoji || '✨';
        if (visible) {
            toggleBtn.innerHTML = `${emoji} <span>Hide effects</span>`;
            toggleBtn.setAttribute('aria-label', 'Hide seasonal effects');
        } else {
            toggleBtn.innerHTML = `${emoji} <span>Replay effects</span>`;
            toggleBtn.setAttribute('aria-label', 'Replay seasonal effects');
        }
    }

    function runEffects() {
        // Clear any existing container
        if (container && container.parentNode) container.parentNode.removeChild(container);

        container = document.createElement('div');
        container.className = 'gr-fx-container';
        container.setAttribute('aria-hidden', 'true');
        container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998;overflow:hidden;';
        document.body.appendChild(container);

        effectsVisible = true;
        if (toggleBtn) { toggleBtn.classList.remove('off'); setToggleLabel(true); }

        for (const fx of activeEffects) {
            spawnParticles(fx);
        }
    }

    function spawnParticles(cfg) {
        const count = INTENSITY_MAP[cfg.intensity] || 30;
        const emoji = cfg.emoji || '✨';

        for (let i = 0; i < count; i++) {
            const el = document.createElement('span');
            el.className = 'gr-fx-particle';
            el.textContent = emoji;

            const size = 12 + Math.random() * 16;
            const left = Math.random() * 100;
            const dur = 6 + Math.random() * 10;
            // Stagger start: random delay 0 to 4s so they don't all drop at once
            const delay = Math.random() * 4;

            el.style.cssText += `
                left: ${left}%;
                font-size: ${size}px;
                animation-duration: ${dur}s;
                animation-delay: ${delay}s;
            `;

            // Remove particle from DOM once it finishes falling
            el.addEventListener('animationend', () => {
                el.remove();
            });

            container.appendChild(el);
        }
    }

    function hideEffects() {
        effectsVisible = false;
        if (toggleBtn) { toggleBtn.classList.add('off'); setToggleLabel(false); }
        if (container && container.parentNode) container.parentNode.removeChild(container);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }
})();
