/**
 * GlitchRealm - Accessibility & Keyboard Navigation Module
 * 
 * Features:
 * - Full keyboard navigation for all interactive elements
 * - Focus management for modals and dropdowns
 * - Skip links for screen readers
 * - ARIA live regions for dynamic content
 * - Keyboard shortcuts
 */

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const config = {
        focusVisibleClass: 'focus-visible',
        skipLinkId: 'skip-to-main',
        mainContentId: 'main-content',
        keyboardShortcuts: true
    };

    // ==================== SKIP LINKS ====================
    /**
     * Add skip navigation link for screen readers
     */
    function addSkipLink() {
        if (document.getElementById(config.skipLinkId)) return; // Already exists

        const skipLink = document.createElement('a');
        skipLink.id = config.skipLinkId;
        skipLink.href = `#${config.mainContentId}`;
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        skipLink.setAttribute('tabindex', '0');

        // Add styles inline if not in CSS
        skipLink.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            z-index: 999999;
            padding: 1em;
            background: var(--primary-cyan, #16e1ff);
            color: var(--bg-primary, #0a0e27);
            text-decoration: none;
            font-weight: bold;
            border-radius: 0 0 8px 0;
        `;

        skipLink.addEventListener('focus', () => {
            skipLink.style.left = '0';
        });

        skipLink.addEventListener('blur', () => {
            skipLink.style.left = '-9999px';
        });

        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Ensure main content has proper ID for skip link
     */
    function ensureMainContentId() {
        let mainContent = document.getElementById(config.mainContentId);
        
        if (!mainContent) {
            // Try to find main element or create wrapper
            mainContent = document.querySelector('main') || 
                         document.querySelector('[role="main"]') ||
                         document.querySelector('.container');
            
            if (mainContent) {
                mainContent.id = config.mainContentId;
                if (!mainContent.hasAttribute('role')) {
                    mainContent.setAttribute('role', 'main');
                }
            }
        }
    }

    // ==================== KEYBOARD NAVIGATION ====================
    /**
     * Enhanced navigation menu keyboard controls
     */
    function initNavKeyboardNav() {
        const nav = document.querySelector('.nav');
        if (!nav) return;

        const navLinks = nav.querySelectorAll('.nav-link, .dropdown-trigger');
        const dropdown = nav.querySelector('.nav-dropdown');
        const dropdownTrigger = nav.querySelector('.dropdown-trigger');
        const dropdownMenu = nav.querySelector('.nav-dropdown-menu');

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const navLinksContainer = document.getElementById('nav-links');

        if (mobileToggle) {
            mobileToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    mobileToggle.click();
                }
            });
        }

        // Dropdown keyboard navigation
        if (dropdownTrigger && dropdownMenu) {
            dropdownTrigger.addEventListener('keydown', (e) => {
                const isExpanded = dropdownTrigger.getAttribute('aria-expanded') === 'true';

                switch(e.key) {
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        toggleDropdown(dropdown, dropdownTrigger, dropdownMenu);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        if (!isExpanded) {
                            toggleDropdown(dropdown, dropdownTrigger, dropdownMenu, true);
                        }
                        focusFirstDropdownItem(dropdownMenu);
                        break;
                    case 'Escape':
                        if (isExpanded) {
                            toggleDropdown(dropdown, dropdownTrigger, dropdownMenu, false);
                            dropdownTrigger.focus();
                        }
                        break;
                }
            });

            // Dropdown items keyboard navigation
            const dropdownItems = dropdownMenu.querySelectorAll('.nav-dropdown-link');
            dropdownItems.forEach((item, index) => {
                item.addEventListener('keydown', (e) => {
                    switch(e.key) {
                        case 'ArrowDown':
                            e.preventDefault();
                            focusNextDropdownItem(dropdownItems, index);
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            focusPrevDropdownItem(dropdownItems, index);
                            break;
                        case 'Escape':
                            e.preventDefault();
                            toggleDropdown(dropdown, dropdownTrigger, dropdownMenu, false);
                            dropdownTrigger.focus();
                            break;
                        case 'Tab':
                            if (e.shiftKey && index === 0) {
                                // First item, shift+tab - close dropdown
                                toggleDropdown(dropdown, dropdownTrigger, dropdownMenu, false);
                            } else if (!e.shiftKey && index === dropdownItems.length - 1) {
                                // Last item, tab - close dropdown
                                toggleDropdown(dropdown, dropdownTrigger, dropdownMenu, false);
                            }
                            break;
                    }
                });
            });
        }

    }

    function toggleDropdown(dropdown, trigger, menu, forceState) {
        if (!dropdown || !trigger || !menu) return;

        const shouldOpen = forceState !== undefined ? forceState : !dropdown.classList.contains('active');

        if (shouldOpen) {
            dropdown.classList.add('active');
            trigger.setAttribute('aria-expanded', 'true');
            menu.setAttribute('aria-hidden', 'false');
        } else {
            dropdown.classList.remove('active');
            trigger.setAttribute('aria-expanded', 'false');
            menu.setAttribute('aria-hidden', 'true');
        }
    }

    function focusFirstDropdownItem(menu) {
        const firstItem = menu.querySelector('.nav-dropdown-link');
        if (firstItem) firstItem.focus();
    }

    function focusNextDropdownItem(items, currentIndex) {
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].focus();
    }

    function focusPrevDropdownItem(items, currentIndex) {
        const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        items[prevIndex].focus();
    }

    // ==================== USER PROFILE DROPDOWN ====================
    /**
     * Keyboard navigation for user profile menu
     */
    function initProfileKeyboardNav() {
        const profileTrigger = document.querySelector('.profile-trigger');
        const profileDropdown = document.querySelector('.profile-dropdown');
        const profileMenu = document.querySelector('.profile-menu');

        if (!profileTrigger || !profileMenu) return;

        profileTrigger.addEventListener('keydown', (e) => {
            const isExpanded = profileDropdown?.classList.contains('active');

            switch(e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    profileTrigger.click();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (!isExpanded) {
                        profileTrigger.click();
                    }
                    setTimeout(() => {
                        const firstButton = profileMenu.querySelector('.profile-action-btn:not([style*="display: none"])');
                        if (firstButton) firstButton.focus();
                    }, 100);
                    break;
                case 'Escape':
                    if (isExpanded) {
                        profileTrigger.click();
                        profileTrigger.focus();
                    }
                    break;
            }
        });

        // Profile menu items navigation
        const profileActions = profileMenu.querySelectorAll('.profile-action-btn');
        profileActions.forEach((action, index) => {
            action.addEventListener('keydown', (e) => {
                const visibleActions = Array.from(profileActions).filter(btn => 
                    !btn.style.display || btn.style.display !== 'none'
                );
                const currentVisibleIndex = visibleActions.indexOf(action);

                switch(e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        const nextIndex = (currentVisibleIndex + 1) % visibleActions.length;
                        visibleActions[nextIndex].focus();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        const prevIndex = currentVisibleIndex === 0 ? 
                            visibleActions.length - 1 : currentVisibleIndex - 1;
                        visibleActions[prevIndex].focus();
                        break;
                    case 'Escape':
                        e.preventDefault();
                        profileTrigger.click();
                        profileTrigger.focus();
                        break;
                }
            });
        });

    }

    // ==================== MODAL FOCUS MANAGEMENT ====================
    /**
     * Trap focus within modals for accessibility
     */
    function initModalFocusTrap() {
        const modals = [
            { selector: '#signin-modal', closeBtn: '#close-modal' },
            { selector: '#crop-modal', closeBtn: '#crop-modal-close' }
        ];

        modals.forEach(({ selector, closeBtn, acceptBtn }) => {
            const modal = document.querySelector(selector);
            if (!modal) return;

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
                        const isVisible = modal.style.display !== 'none' && 
                                        !modal.classList.contains('hidden');
                        
                        if (isVisible) {
                            setupFocusTrap(modal);
                            // Focus first focusable element
                            setTimeout(() => {
                                const firstFocusable = modal.querySelector(
                                    'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                                );
                                if (firstFocusable) firstFocusable.focus();
                            }, 100);
                        }
                    }
                });
            });

            observer.observe(modal, { attributes: true });

            // Escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const isVisible = modal.style.display !== 'none' && 
                                    !modal.classList.contains('hidden');
                    if (isVisible) {
                        const closeBtnEl = document.querySelector(closeBtn || acceptBtn);
                        if (closeBtnEl) closeBtnEl.click();
                    }
                }
            });
        });

    }

    function setupFocusTrap(modal) {
        const focusableElements = modal.querySelectorAll(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const trapHandler = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        modal.addEventListener('keydown', trapHandler);
    }

    // ==================== GAME CARDS KEYBOARD NAV ====================
    /**
     * Make game cards keyboard navigable
     */
    function initGameCardsKeyboardNav() {
        const gameCards = document.querySelectorAll('.game-card');
        
        gameCards.forEach(card => {
            // Make card focusable
            if (!card.hasAttribute('tabindex')) {
                card.setAttribute('tabindex', '0');
            }

            // Add keyboard activation
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const link = card.querySelector('a');
                    if (link) link.click();
                }
            });

            // Add ARIA label if not present
            if (!card.hasAttribute('aria-label')) {
                const title = card.querySelector('.game-title, h3, h2');
                if (title) {
                    card.setAttribute('aria-label', `Game: ${title.textContent.trim()}`);
                }
            }
        });

        if (gameCards.length > 0) {
        }
    }

    // ==================== KEYBOARD SHORTCUTS ====================
    /**
     * Global keyboard shortcuts for power users
     */
    function initKeyboardShortcuts() {
        if (!config.keyboardShortcuts) return;

        const shortcuts = {
            'g h': () => window.location.href = '/index.html', // Go home
            'g g': () => window.location.href = '/games.html', // Go to games
            'g c': () => window.location.href = '/community.html', // Go to community
            's': () => { // Focus search (if exists)
                const search = document.querySelector('input[type="search"], input[name="search"]');
                if (search) search.focus();
            },
            '?': () => showKeyboardShortcutsHelp(), // Show shortcuts help
            '/': () => { // Focus first input
                const input = document.querySelector('input:not([type="hidden"])');
                if (input) {
                    input.focus();
                    return false; // Prevent default
                }
            }
        };

        let keyBuffer = '';
        let keyTimeout;

        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.matches('input, textarea, select')) return;

            // Clear buffer after 1 second of inactivity
            clearTimeout(keyTimeout);
            keyTimeout = setTimeout(() => { keyBuffer = ''; }, 1000);

            // Build key buffer
            if (e.key.length === 1) {
                keyBuffer += e.key.toLowerCase();
            }

            // Check for shortcuts
            Object.keys(shortcuts).forEach(shortcut => {
                if (keyBuffer.endsWith(shortcut)) {
                    e.preventDefault();
                    shortcuts[shortcut]();
                    keyBuffer = '';
                }
            });
        });

    }

    function showKeyboardShortcutsHelp() {
        alert(`Keyboard Shortcuts:
        
Navigation:
• g h - Go to Home
• g g - Go to Games
• g c - Go to Community
• / - Focus first input
• ? - Show this help

General:
• Tab - Navigate forward
• Shift+Tab - Navigate backward
• Enter/Space - Activate buttons/links
• Escape - Close modals/dropdowns
• Arrow keys - Navigate menus`);
    }

    // ==================== ARIA LIVE REGIONS ====================
    /**
     * Add ARIA live regions for dynamic content updates
     */
    function initAriaLiveRegions() {
        // Check if auth message container exists
        const authMessage = document.querySelector('.auth-message, .message-container');
        if (authMessage && !authMessage.hasAttribute('role')) {
            authMessage.setAttribute('role', 'status');
            authMessage.setAttribute('aria-live', 'polite');
            authMessage.setAttribute('aria-atomic', 'true');
        }

        // Game cards container
        const gameCardsContainer = document.querySelector('.game-cards, .games-grid');
        if (gameCardsContainer && !gameCardsContainer.hasAttribute('aria-live')) {
            gameCardsContainer.setAttribute('aria-live', 'polite');
            gameCardsContainer.setAttribute('aria-busy', 'false');
        }

    }

    // ==================== FOCUS VISIBLE POLYFILL ====================
    /**
     * Add :focus-visible behavior for browsers that don't support it
     */
    function initFocusVisible() {
        let hadKeyboardEvent = true;
        let hadFocusVisibleRecently = false;
        let hadFocusVisibleRecentlyTimeout = null;

        const inputTypesWhitelist = {
            text: true,
            search: true,
            url: true,
            tel: true,
            email: true,
            password: true,
            number: true,
            date: true,
            month: true,
            week: true,
            time: true,
            datetime: true,
            'datetime-local': true
        };

        function onKeyDown(e) {
            if (e.metaKey || e.altKey || e.ctrlKey) return;
            hadKeyboardEvent = true;
        }

        function onPointerDown() {
            hadKeyboardEvent = false;
        }

        function onFocus(e) {
            if (shouldFocusRingBeVisible(e.target)) {
                e.target.classList.add(config.focusVisibleClass);
                hadFocusVisibleRecently = true;
                clearTimeout(hadFocusVisibleRecentlyTimeout);
                hadFocusVisibleRecentlyTimeout = setTimeout(() => {
                    hadFocusVisibleRecently = false;
                }, 100);
            }
        }

        function onBlur(e) {
            if (e.target.classList.contains(config.focusVisibleClass)) {
                e.target.classList.remove(config.focusVisibleClass);
            }
        }

        function shouldFocusRingBeVisible(el) {
            const { type, readOnly } = el;

            if (el.tagName === 'INPUT' && inputTypesWhitelist[type] && !readOnly) {
                return true;
            }

            if (el.tagName === 'TEXTAREA' && !readOnly) {
                return true;
            }

            if (el.isContentEditable) {
                return true;
            }

            return hadKeyboardEvent;
        }

        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('mousedown', onPointerDown, true);
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('touchstart', onPointerDown, true);
        document.addEventListener('focus', onFocus, true);
        document.addEventListener('blur', onBlur, true);

    }

    // ==================== INITIALIZATION ====================
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initAll();
            });
        } else {
            initAll();
        }
    }

    function initAll() {
        
        addSkipLink();
        ensureMainContentId();
        initNavKeyboardNav();
        initProfileKeyboardNav();
        initModalFocusTrap();
        initGameCardsKeyboardNav();
        initKeyboardShortcuts();
        initAriaLiveRegions();
        initFocusVisible();

    }

    // Auto-initialize
    init();

    // Expose API for manual re-initialization
    window.GlitchRealmA11y = {
        reinit: initAll,
        initGameCards: initGameCardsKeyboardNav,
        showShortcuts: showKeyboardShortcutsHelp
    };

})();
