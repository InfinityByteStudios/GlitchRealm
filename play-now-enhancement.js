/**
 * GlitchRealm - Enhanced Play Now Button Interactions
 * 
 * Adds dynamic micro-interactions:
 * - Ripple effect on click
 * - Shine animation overlay
 * - Particle burst on hover
 * - Sound effects (optional)
 */

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const config = {
        rippleEnabled: true,
        shineEnabled: true,
        particlesEnabled: true,
        soundEnabled: false, // Set to true if you want sound effects
        hapticEnabled: true   // Vibration on mobile
    };

    // ==================== RIPPLE EFFECT ====================
    function createRipple(event, button) {
        if (!config.rippleEnabled) return;

        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        button.appendChild(ripple);

        // Remove ripple after animation
        setTimeout(() => {
            ripple.remove();
        }, 800);
    }

    // ==================== SHINE EFFECT ====================
    function addShineOverlay(button) {
        if (!config.shineEnabled) return;

        // Check if shine already exists
        if (button.querySelector('.shine')) return;

        const shine = document.createElement('span');
        shine.classList.add('shine');
        button.appendChild(shine);
    }

    // ==================== PARTICLE BURST (ENHANCED) ====================
    function createParticleBurst(button) {
        if (!config.particlesEnabled) return;

        const particles = 8;
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < particles; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle-burst';
            particle.style.cssText = `
                position: fixed;
                width: 6px;
                height: 6px;
                background: radial-gradient(circle, 
                    rgba(22, 225, 255, 1) 0%, 
                    rgba(0, 255, 195, 0.8) 50%, 
                    transparent 100%
                );
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                left: ${centerX}px;
                top: ${centerY}px;
                box-shadow: 0 0 10px rgba(22, 225, 255, 0.8);
            `;

            document.body.appendChild(particle);

            const angle = (Math.PI * 2 * i) / particles;
            const velocity = 100 + Math.random() * 50;
            const duration = 600 + Math.random() * 200;

            particle.animate([
                {
                    transform: 'translate(0, 0) scale(1)',
                    opacity: 1
                },
                {
                    transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0, 0.5, 0.5, 1)'
            }).onfinish = () => particle.remove();
        }
    }

    // ==================== HAPTIC FEEDBACK ====================
    function triggerHaptic() {
        if (!config.hapticEnabled) return;
        
        if ('vibrate' in navigator) {
            navigator.vibrate(10); // Short vibration on mobile
        }
    }

    // ==================== SOUND EFFECTS (OPTIONAL) ====================
    function playSound(type) {
        if (!config.soundEnabled) return;

        // You can add sound files here
        // const audio = new Audio(`/sounds/${type}.mp3`);
        // audio.volume = 0.3;
        // audio.play().catch(e => console.log('Sound play failed:', e));
    }

    // ==================== ENHANCED HOVER TRACKING ====================
    function addEnhancedHover(button) {
        let mouseX = 0;
        let mouseY = 0;

        button.addEventListener('mousemove', (e) => {
            const rect = button.getBoundingClientRect();
            mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

            // Subtle 3D tilt based on mouse position
            const rotateX = mouseY * -5; // Max 5 degrees
            const rotateY = mouseX * 5;

            button.style.transform = `
                translateY(-4px) 
                scale(1.05) 
                perspective(1000px) 
                rotateX(${rotateX}deg) 
                rotateY(${rotateY}deg)
            `;
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = '';
        });
    }

    // ==================== INITIALIZATION ====================
    function initPlayNowButton() {
        // Find the Play Now button
        const playNowBtn = document.querySelector('.hero-buttons .btn-primary.glitch-btn');
        
        if (!playNowBtn) {
            console.log('[PlayNow] Button not found, skipping enhancement');
            return;
        }

        console.log('[PlayNow] Enhancing button with micro-interactions...');

        // Add shine overlay
        addShineOverlay(playNowBtn);

        // Add click ripple effect
        playNowBtn.addEventListener('click', (e) => {
            createRipple(e, playNowBtn);
            triggerHaptic();
            playSound('click');
        });

        // Add hover particle burst (throttled)
        let hoverTimeout;
        let isHovering = false;

        playNowBtn.addEventListener('mouseenter', () => {
            isHovering = true;
            playSound('hover');
            
            // Create particle burst after slight delay
            hoverTimeout = setTimeout(() => {
                if (isHovering) {
                    createParticleBurst(playNowBtn);
                }
            }, 200);
        });

        playNowBtn.addEventListener('mouseleave', () => {
            isHovering = false;
            clearTimeout(hoverTimeout);
        });

        // Add enhanced 3D hover effect
        addEnhancedHover(playNowBtn);

        // Keyboard interaction
        playNowBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const rect = playNowBtn.getBoundingClientRect();
                const fakeEvent = {
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2
                };
                createRipple(fakeEvent, playNowBtn);
                triggerHaptic();
                playSound('click');
                
                // Navigate after animation
                setTimeout(() => {
                    window.location.href = playNowBtn.href;
                }, 200);
            }
        });

        console.log('[PlayNow] ✅ Button enhancement complete');
    }

    // ==================== AUTO-INITIALIZE ====================
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initPlayNowButton);
        } else {
            initPlayNowButton();
        }
    }

    init();

    // ==================== PUBLIC API ====================
    window.GlitchRealmPlayNow = {
        reinit: initPlayNowButton,
        config: config,
        enableRipple: (enabled) => { config.rippleEnabled = enabled; },
        enableShine: (enabled) => { config.shineEnabled = enabled; },
        enableParticles: (enabled) => { config.particlesEnabled = enabled; },
        enableSound: (enabled) => { config.soundEnabled = enabled; },
        enableHaptic: (enabled) => { config.hapticEnabled = enabled; }
    };

})();
