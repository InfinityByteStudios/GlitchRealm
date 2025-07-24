// Sign-in page functionality for GlitchRealm
let firebaseReady = false;

// Wait for Firebase to be ready
window.addEventListener('firebaseReady', function() {
    firebaseReady = true;
    console.log('Firebase is ready');
});

// Glitch text effects
function initGlitchEffects() {
    const glitchElements = document.querySelectorAll('.glitch-large');
    
    glitchElements.forEach(element => {
        // Random glitch effect
        setInterval(() => {
            if (Math.random() > 0.92) {
                element.style.animation = 'none';
                element.offsetHeight; // Trigger reflow
                element.style.animation = 'glitch-1 0.3s ease-in-out, glitch-2 0.3s ease-in-out';
                
                setTimeout(() => {
                    element.style.animation = '';
                }, 300);
            }
        }, 2000);
        
        // Hover effect
        element.addEventListener('mouseenter', () => {
            element.style.animation = 'none';
            element.offsetHeight; // Trigger reflow
            element.style.animation = 'glitch-1 0.2s ease-in-out, glitch-2 0.2s ease-in-out';
        });
        
        element.addEventListener('mouseleave', () => {
            setTimeout(() => {
                element.style.animation = '';
            }, 200);
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize glitch effects
    initGlitchEffects();
    
    // Check for URL parameters and show messages
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const messageType = urlParams.get('type');
    
    if (message) {
        // Show the message using the auth message system
        showAuthMessage(decodeURIComponent(message), messageType || 'info');
        
        // Clean up the URL after showing the message
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
      // Tab switching functionality
    const signinTab = document.getElementById('signin-tab');
    const signupTab = document.getElementById('signup-tab');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');    signinTab.addEventListener('click', function() {
        signinTab.classList.add('active');
        signupTab.classList.remove('active');
        signinForm.classList.add('active');
        signupForm.classList.remove('active');
          // Update Google button text for sign-in
        const googleButtonText = document.getElementById('google-button-text');
        const githubButtonText = document.getElementById('github-button-text');
        if (googleButtonText) {
            googleButtonText.textContent = 'Sign in with Google';
        }
        if (githubButtonText) {
            githubButtonText.textContent = 'Sign in with GitHub';
        }
    });

    signupTab.addEventListener('click', function() {
        signupTab.classList.add('active');
        signinTab.classList.remove('active');
        signupForm.classList.add('active');
        signinForm.classList.remove('active');
          // Update Google button text for sign-up
        const googleButtonText = document.getElementById('google-button-text');
        const githubButtonText = document.getElementById('github-button-text');
        if (googleButtonText) {
            googleButtonText.textContent = 'Sign up with Google';
        }
        if (githubButtonText) {
            githubButtonText.textContent = 'Sign up with GitHub';
        }
    });

    // Sign in form submission
    signinForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Sign in form submitted');
        
        if (!firebaseReady) {
            console.log('Firebase not ready');
            showMessage('FIREBASE LOADING...', 'info');
            return;
        }
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        console.log('Attempting to sign in with:', email);
        
        try {
            const userCredential = await window.firebaseSignInWithEmailAndPassword(window.firebaseAuth, email, password);
            console.log('User signed in:', userCredential.user);
                  // Show success message with glitch effect
            showMessage('ACCESS GRANTED', 'success');
        
            // Redirect to main page after delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            console.error('Sign in error:', error);
            showMessage('ACCESS DENIED: ' + getErrorMessage(error.code), 'error');
        }
    });

    // Sign up form submission
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('Create account form submitted'); // Debug log
        
        if (!firebaseReady) {
            showMessage('FIREBASE LOADING...', 'info');
            return;
        }
        
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        console.log('Form values:', { email, password: password ? 'set' : 'empty', confirmPassword: confirmPassword ? 'set' : 'empty' }); // Debug log
        
        if (password !== confirmPassword) {
            showMessage('PASSWORDS DO NOT MATCH', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('PASSWORD MUST BE AT LEAST 6 CHARACTERS', 'error');
            return;
        }
        
        try {
            console.log('Attempting to create user...'); // Debug log
            const userCredential = await window.firebaseCreateUserWithEmailAndPassword(window.firebaseAuth, email, password);
            console.log('User created:', userCredential.user);
            
            showMessage('ACCOUNT CREATED SUCCESSFULLY', 'success');
            
            // Redirect to main page after delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            console.error('Sign up error:', error);
            showMessage('CREATION FAILED: ' + getErrorMessage(error.code), 'error');
        }
    });    // Google and GitHub sign in
    document.getElementById('google-signin').addEventListener('click', () => handleGoogleSignIn());
    document.getElementById('github-signin')?.addEventListener('click', () => handleGitHubSignIn());
    // Remove duplicate Google signup listener since we only have one Google button now
    
    // Add guest continue button functionality
    const continueAsGuestBtn = document.getElementById('continueAsGuestBtn');
    if (continueAsGuestBtn) {
        continueAsGuestBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }async function handleGoogleSignIn() {
        if (!firebaseReady) {
            showMessage('FIREBASE LOADING...', 'info');
            return;
        }
        
        try {
            const result = await window.firebaseSignInWithPopup(window.firebaseAuth, window.googleProvider);
            console.log('Google sign in successful:', result.user);
            
            showMessage('GOOGLE ACCESS GRANTED', 'success');
            
            // Redirect to main page after delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            console.error('Google sign in error:', error);
            showMessage('GOOGLE ACCESS DENIED: ' + getErrorMessage(error.code), 'error');
        }
    }    async function handleGitHubSignIn() {
        if (!firebaseReady) {
            showMessage('FIREBASE LOADING...', 'info');
            return;
        }
        
        try {
            const result = await window.firebaseSignInWithPopup(window.firebaseAuth, window.githubProvider);
            console.log('GitHub sign in successful:', result.user);
            
            showMessage('GITHUB ACCESS GRANTED', 'success');
            
            // Redirect to main page after delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            console.error('GitHub sign in error:', error);
            showMessage('GITHUB ACCESS DENIED: ' + getErrorMessage(error.code), 'error');
        }
    }

    // Forgot password functionality
    document.querySelector('.forgot-password-btn').addEventListener('click', function() {
        window.location.href = 'forgot-password.html';
    });    // Message display function
    function showMessage(message, type) {
        // Get the auth message element
        const authMessage = document.getElementById('authMessage');
        if (!authMessage) {
            console.error('Auth message element not found');
            return;
        }

        // Set message and show it
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
        authMessage.classList.remove('hidden');
        
        // Add glitch effect to the message
        authMessage.classList.add('glitch-message');
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            authMessage.classList.add('hidden');
        }, 5000);
    }

    // Auth message display function (same as in script.js)
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

    // Error message mapping
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

    // Add input validation effects
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
            if (this.value) {
                this.parentElement.classList.add('filled');
            } else {
                this.parentElement.classList.remove('filled');
            }
        });
    });

    // Add button click effects
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.classList.add('clicked');
            setTimeout(() => {
                this.classList.remove('clicked');
            }, 200);
        });
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Clear any messages
            const message = document.querySelector('.auth-message');
            if (message) {
                message.remove();
            }
        }
    });
});

// Add styles for auth messages
const style = document.createElement('style');
style.textContent = `
    .auth-message {
        padding: 15px;
        margin-bottom: 20px;
        border-radius: 8px;
        font-family: 'Courier New', monospace;
        font-weight: 700;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-size: 0.9rem;
        animation: slideDown 0.3s ease-out;
    }
    
    .auth-message.success {
        background: rgba(0, 255, 65, 0.2);
        border: 2px solid var(--success);
        color: var(--success);
        box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
    }
    
    .auth-message.error {
        background: rgba(255, 7, 58, 0.2);
        border: 2px solid var(--danger);
        color: var(--danger);
        box-shadow: 0 0 20px rgba(255, 7, 58, 0.3);
    }
    
    .auth-message.info {
        background: rgba(255, 184, 0, 0.2);
        border: 2px solid var(--warning);
        color: var(--warning);
        box-shadow: 0 0 20px rgba(255, 184, 0, 0.3);
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .form-group.focused input {
        border-color: #00ffff;
        box-shadow: 0 0 15px rgba(0, 255, 249, 0.3);
    }
    
    .form-group.filled input {
        background: rgba(30, 58, 138, 0.5);
    }
    
    button.clicked {
        transform: scale(0.98);
    }
`;
document.head.appendChild(style);
