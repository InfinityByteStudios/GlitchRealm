// GlitchRealm Games - Interactive Effects

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
        transition: right 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 10px 30px rgba(0, 255, 88, 0.2), 0 0 20px rgba(0, 255, 88, 0.1);
        backdrop-filter: blur(10px);
        font-family: 'Orbitron', monospace;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; padding: 1rem; gap: 0.75rem;">
            <div style="font-size: 1.5rem; flex-shrink: 0; animation: pulse 2s infinite;">✅</div>
            <div style="flex: 1; color: #00ff58;">
                <strong style="font-size: 0.9rem; display: block; margin-bottom: 0.25rem; text-shadow: 0 0 10px rgba(0, 255, 88, 0.5);">
                    Password Successfully Changed!
                </strong>
                <p style="font-family: 'Rajdhani', sans-serif; font-size: 0.85rem; margin: 0; opacity: 0.9;">
                    Your neural link credentials have been updated.
                </p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none; border: none; color: #00ff58; font-size: 1.2rem; 
                cursor: pointer; padding: 0; width: 20px; height: 20px; 
                display: flex; align-items: center; justify-content: center; 
                border-radius: 50%; transition: all 0.3s ease; flex-shrink: 0;
            " onmouseover="this.style.background='rgba(0, 255, 88, 0.2)'; this.style.transform='scale(1.1)';" 
               onmouseout="this.style.background='none'; this.style.transform='scale(1)';">×</button>
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
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    document.head.appendChild(style);
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
        if (defaultText) defaultText.textContent = 'CREATE NEURAL LINK';
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
    
    // Check for password change success notification
    checkPasswordChangeSuccess();
    
    // Initialize all effects
    initGlitchEffects();
    initCardAnimations();
    initParallaxEffect();
    initConsoleMessage();
    initBadgeAutoHide();
    
    // Initialize modal functionality immediately
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
        
        window.addEventListener('scroll', requestTick);
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
      // Modal controls - basic functionality
    signInBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (signInModal) {
            signInModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Initialize Google button text based on active tab
            initializeGoogleButtonText();
        }
    });

    closeModal?.addEventListener('click', () => {
        if (signInModal) {
            signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetAuthButtonsText();
        }
    });

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
        }        console.log('Initializing Firebase Auth...');        const { signInWithPopup, GoogleAuthProvider, GithubAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged, deleteUser } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    // Expose deleteUser to global scope for account deletion
    window.deleteUser = deleteUser;
    
    const auth = window.firebaseAuth;
    const googleProvider = new GoogleAuthProvider();
    const githubProvider = new GithubAuthProvider();

    // DOM elements (with null checks for dynamic loading)
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const signInModal = document.getElementById('signin-modal');
    const closeModal = document.getElementById('close-modal');
    const userProfile = document.getElementById('user-profile');
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
        try {
            showAuthLoading(googleSignIn, 'CONNECTING...');
            await signInWithPopup(auth, googleProvider);
            signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            showAuthMessage('Neural sync successful!', 'success');
        } catch (error) {
            console.error('Google sign-in error:', error);
            showAuthMessage('Connection failed. Please try again.', 'error');        } finally {
            // Reset to proper default text based on active tab
            const activeTab = document.querySelector('.auth-tab.active');
            const tabType = activeTab ? activeTab.getAttribute('data-tab') : 'signin';
            const defaultText = tabType === 'signup' ? 'Sign up with Google' : 'Sign in with Google';
            hideAuthLoading(googleSignIn, defaultText);
        }    });

    // GitHub sign-in
    githubSignIn?.addEventListener('click', async () => {
        try {
            showAuthLoading(githubSignIn, 'CONNECTING...');
            await signInWithPopup(auth, githubProvider);
            signInModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            showAuthMessage('GitHub sync successful!', 'success');
        } catch (error) {
            console.error('GitHub sign-in error:', error);
            showAuthMessage('GitHub connection failed. Please try again.', 'error');
        } finally {
            // Reset to proper default text based on active tab
            const activeTab = document.querySelector('.auth-tab.active');
            const tabType = activeTab ? activeTab.getAttribute('data-tab') : 'signin';
            const defaultText = tabType === 'signup' ? 'Sign up with GitHub' : 'Sign in with GitHub';
            hideAuthLoading(githubSignIn, defaultText);
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
            showAuthMessage('Initialization failed. Please try again.', 'error');
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
            showAuthMessage('Neural link established!', 'success');
        } catch (error) {
            console.error('Account creation error:', error);
            showAuthMessage('Link creation failed: ' + getErrorMessage(error.code), 'error');
        } finally {
            hideAuthLoading(submitBtn, 'CREATE NEURAL LINK');
        }
    });

    // Sign out
    signOutBtn?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showAuthMessage('Neural link severed.', 'info');
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
                showAuthMessage('Synced with existing neural link.', 'info');
            }
        } else {
            // If no localStorage auth, actively check other games
            console.log('No localStorage auth found, checking other games...');
            window.sharedAuth.checkOtherGamesForAuth().then(foundAuth => {
                if (foundAuth) {
                    showAuthMessage('Connected via cross-game neural link.', 'success');
                } else {
                    console.log('No existing authentication found in other games');
                }
            }).catch(error => {
                console.error('Error checking other games for auth:', error);
            });
        }
    }    // Auth state observer with profile monitoring
    onAuthStateChanged(auth, (user) => {
        const notificationBell = document.getElementById('notification-bell');
        
        if (user) {
            // User is signed in
            updateUserProfile(user);
            if (signInBtn) signInBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
            if (notificationBell) notificationBell.style.display = 'flex';
            
            // Store auth state for SSO
            if (window.sharedAuth) {
                window.sharedAuth.storeAuthState(user);
            }
            
            // Set up profile picture monitoring
            if (!window.profileMonitorInterval) {
                setupProfilePictureMonitoring(auth);
            }

            // Notifications now use a global feed; listener starts on page load.
        } else {
            // User is signed out
            if (signInBtn) signInBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
            if (notificationBell) notificationBell.style.display = 'none';
            
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
        
        // Initialize profile picture upload functionality
        initializeProfilePictureUpload();
    }
    
    // Profile picture upload functionality
    function initializeProfilePictureUpload() {
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
    
    // Upload profile picture function
    async function uploadProfilePicture(file) {
        const user = auth.currentUser;
        if (!user) {
            showAuthMessage('❌ You must be signed in to change your profile picture.', 'error');
            return;
        }
        
        if (!window.firebaseStorage) {
            showAuthMessage('❌ Firebase Storage not available.', 'error');
            return;
        }

        try {
            // Show loading state
            showAuthMessage('📷 Uploading profile picture...', 'info');
            
            // Import Firebase Storage functions
            const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
            
            // Create a storage reference
            const storageRef = ref(window.firebaseStorage, `profile-pictures/${user.uid}/${Date.now()}_${file.name}`);
            
            // Upload the file
            const snapshot = await uploadBytes(storageRef, file);
            
            // Get the download URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            // Update user profile with new photo URL
            const { updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await updateProfile(user, {
                photoURL: downloadURL
            });
            
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
                const { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, addDoc } = firestoreMod;
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
            return 'assets/Icons/anonymous.png';
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
            'https://neurocorebytewars.netlify.app',
            'https://shadowlight.netlify.app'
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
                    showAuthMessage('Synced from existing neural link.', 'info');
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
const style = document.createElement('style');
style.textContent = `
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
document.head.appendChild(style);

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

    // Delete account functionality
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const deleteAccountModal = document.getElementById('delete-account-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const deleteConfirmationInput = document.getElementById('delete-confirmation-input');

    if (deleteAccountBtn && deleteAccountModal) {
        // Open delete account modal
        deleteAccountBtn.addEventListener('click', () => {
            const profileDropdown = document.querySelector('.profile-dropdown');
            if (profileDropdown) {
                profileDropdown.classList.remove('open');
            }
            deleteAccountModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            if (deleteConfirmationInput) {
                deleteConfirmationInput.value = '';
                deleteConfirmationInput.disabled = false;
                deleteConfirmationInput.readOnly = false;
                deleteConfirmationInput.style.pointerEvents = 'auto';
                
                setTimeout(() => {
                    deleteConfirmationInput.focus();
                    deleteConfirmationInput.click();
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
            }
        });

        // Handle confirmation input and delete button
        if (confirmDeleteBtn && deleteConfirmationInput) {
            const updateDeleteButton = () => {
                if (deleteConfirmationInput.value.trim() === 'DELETE MY ACCOUNT') {
                    confirmDeleteBtn.disabled = false;
                } else {
                    confirmDeleteBtn.disabled = true;
                }
            };

            deleteConfirmationInput.addEventListener('input', updateDeleteButton);
            deleteConfirmationInput.addEventListener('keyup', updateDeleteButton);

            confirmDeleteBtn.addEventListener('click', () => {
                if (deleteConfirmationInput.value.trim() === 'DELETE MY ACCOUNT') {
                    deleteUserAccount();
                    deleteAccountModal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
        }
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
                    <span class="glitch-constant" data-text="USER SETTINGS">USER SETTINGS</span>
                </div>
                <button class="auth-close" onclick="closeSettingsModal()">
                    <span class="close-icon">×</span>
                </button>
            </div>
            
            <div class="auth-content">
                <div class="settings-content">
                    <div class="form-title">
                        <span class="glitch-small" data-text="PREFERENCES">PREFERENCES</span>
                    </div>
                    
                    <div class="settings-section">
                        <h4>Game Launch Preference</h4>
                        <div class="setting-item">
                            <label class="setting-label">
                                <input type="radio" name="gamePreference" value="ask" ${!localStorage.getItem('gamePlayPreference') ? 'checked' : ''}>
                                <span class="radio-custom"></span>
                                Always ask (show modal)
                            </label>
                        </div>
                        <div class="setting-item">
                            <label class="setting-label">
                                <input type="radio" name="gamePreference" value="local" ${localStorage.getItem('gamePlayPreference') === 'local' ? 'checked' : ''}>
                                <span class="radio-custom"></span>
                                Always play in GlitchRealm
                            </label>
                        </div>
                        <div class="setting-item">
                            <label class="setting-label">
                                <input type="radio" name="gamePreference" value="external" ${localStorage.getItem('gamePlayPreference') === 'external' ? 'checked' : ''}>
                                <span class="radio-custom"></span>
                                Always open external site
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
        if (selectedPreference.value === 'ask') {
            localStorage.removeItem('gamePlayPreference');
        } else {
            localStorage.setItem('gamePlayPreference', selectedPreference.value);
        }
        
        // Show confirmation
        const message = document.createElement('div');
        message.className = 'settings-saved-message';
        message.textContent = 'Settings saved successfully!';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #00fff9, #ff0080);
            color: #0a0a0a;
            padding: 15px 25px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
            closeSettingsModal();
        }, 2000);
    }
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
                    throw new Error('No active neural link found');
                }

                // Start deletion process
                showAuthMessage('Initiating neural link termination...', 'info');
                
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
                            window.location.href = 'signin.html?message=Please sign in again to delete your account&type=info';
                        }, 2000);
                    } catch (signOutError) {
                        console.error('Sign out error:', signOutError);
                        // Still redirect to sign in page
                        setTimeout(() => {
                            window.location.href = 'signin.html?message=Please sign in again to delete your account&type=info';
                        }, 2000);
                    }
                    return; // Exit early since we're redirecting
                } else if (error.code === 'auth/network-request-failed') {
                    showAuthMessage('Connection interrupted. Check your network connection and try again.', 'error');
                } else if (error.code === 'auth/internal-error') {
                    showAuthMessage('Internal system error. Please try again in a few moments.', 'error');
                } else {
                    showAuthMessage('Neural link termination failed: ' + getErrorMessage(error.code), 'error');
                }
                
                deleteConfirmationInput.disabled = false;
                cancelDeleteBtn.disabled = false;
            } finally {
                hideAuthLoading(confirmDeleteBtn, 'TERMINATE NEURAL LINK');
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
    
    // Show popup to every user unless they have specifically agreed
    if (!hasAgreedToTerms || currentVersion !== termsVersion) {
        termsPopup.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
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
    
    // Load header
    fetch('header.html')
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
                
                // Update active nav link based on current page
                const currentPage = window.location.pathname.split('/').pop() || 'index.html';
                const navLinks = document.querySelectorAll('.nav-link');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === currentPage) {
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
                    } else {
                        console.log('Firebase auth not ready, initializing basic auth elements...');
                        initializeAuthElements();
                    }
                    
                    // Force dropdown initialization after a bit more delay
                    setTimeout(() => {
                        console.log('Force initializing dropdowns...');
                        forceInitializeDropdowns();
                    }, 200);
                }, 100);
            }
        })
        .catch(error => {
            console.error('Error loading header:', error);
        });

    // Also try to initialize dropdowns independently after a delay
    setTimeout(() => {
        console.log('Independent dropdown initialization...');
        forceInitializeDropdowns();
        
        // Also force sign-in button if it exists
        const signInBtn = document.getElementById('sign-in-btn');
        const signInModal = document.getElementById('signin-modal');
        if (signInBtn && signInModal) {
            signInBtn.onclick = function(e) {
                e.preventDefault();
                console.log('Sign in clicked (backup handler)');
                signInModal.style.display = 'flex';
            };
        }
        
        // Force profile functions as backup
        setTimeout(() => {
            console.log('Backup profile function setup...');
            if (window.fixProfileFunctions) {
                window.fixProfileFunctions();
            }
        }, 200);
    }, 500);

    // Load footer
    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            const footerPlaceholder = document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                footerPlaceholder.innerHTML = data;
            }
        })
        .catch(error => console.error('Error loading footer:', error));
});

// Function to initialize authentication elements after header is loaded
function initializeAuthElements() {
    console.log('=== initializeAuthElements called ===');
    
    // Re-get DOM elements after header is loaded
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const userProfile = document.getElementById('user-profile');
    
    console.log('Auth elements found:', { signInBtn, signOutBtn, userProfile });
    
    if (signInBtn) {
        console.log('Setting up sign-in modal event listeners...');
        
        // Remove existing listeners by cloning buttons
        const newSignInBtn = signInBtn.cloneNode(true);
        signInBtn.parentNode.replaceChild(newSignInBtn, signInBtn);
        
        // Add event listener to the sign-in button
        newSignInBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Sign in button clicked!');
            
            // Check if we're on the signin.html page
            if (window.location.pathname.includes('signin.html')) {
                console.log('Already on signin page');
                return;
            }
            
            // Get the auth overlay (could be different IDs on different pages)
            const authOverlay = document.querySelector('.auth-overlay');
            if (authOverlay) {
                console.log('Auth overlay found, displaying it');
                authOverlay.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            } else {
                console.log('Auth overlay not found, redirecting to signin page');
                window.location.href = 'signin.html';
            }
        });
        
        console.log('Auth event listeners attached');
        
        // Find and handle close modal button
        const closeModal = document.querySelector('.close-modal');
        if (closeModal) {
            const newCloseModal = closeModal.cloneNode(true);
            closeModal.parentNode.replaceChild(newCloseModal, closeModal);
            
            newCloseModal.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Close modal button clicked!');
                
                // Get the auth overlay (could be different IDs on different pages)
                const authOverlay = document.querySelector('.auth-overlay');
                if (authOverlay) {
                    console.log('Auth overlay found, hiding it');
                    authOverlay.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
        }
        
        // Close modal on backdrop click
        document.addEventListener('click', function(e) {
            const authOverlay = document.querySelector('.auth-overlay');
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
        
        // Initialize profile picture upload functionality
        initializeProfilePictureUpload();
        
        // Initialize crop modal functionality
        initializeCropModal();
        
        // Re-initialize profile action buttons
        initializeProfileActions();
        
        // Re-initialize auth state check
        if (window.firebaseAuth && window.firebaseAuth.currentUser) {
            const user = window.firebaseAuth.currentUser;
            updateUserProfile(user);
            if (signInBtn) signInBtn.style.display = 'none';
            if (userProfile) userProfile.style.display = 'flex';
        }
    } else {
        console.log('Some auth elements not found, skipping initialization');
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
        if (count > 0) {
            notificationCountElement.textContent = count > 99 ? '99+' : count.toString();
            notificationCountElement.style.display = 'flex';
        } else {
            notificationCountElement.style.display = 'none';
        }
    }
    
    // Update notification count badge on profile trigger
    const notificationCountBadge = document.getElementById('notification-count-badge');
    if (notificationCountBadge) {
        if (count > 0) {
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
});
