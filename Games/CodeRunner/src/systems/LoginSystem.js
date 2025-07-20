/**
 * Login System - Handles user authentication and guest mode
 */

import { GAME_STATES } from '../utils/constants.js';

export class LoginSystem {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        
        // System state
        this.isActive = false;
        this.hasShown = false;
        this.currentUser = null;
        this.isLoggedIn = false;
        this.isGuest = false;
        
        // UI state
        this.currentView = 'main'; // 'main', 'login', 'register'
        this.showPassword = false;
        this.loading = false;
        this.errorMessage = '';
        this.successMessage = '';
        
        // Animation properties
        this.fadeAlpha = 0;
        this.targetAlpha = 1;
        this.slideOffset = 50;
        
        // UI properties
        this.buttons = {
            login: {
                text: "🔑 Login",
                x: 0, y: 0, width: 180, height: 45,
                hovered: false, color: '#58a6ff'
            },
            register: {
                text: "📝 Register", 
                x: 0, y: 0, width: 180, height: 45,
                hovered: false, color: '#7c3aed'
            },
            google: {
                text: "🔗 Sign in with Google",
                x: 0, y: 0, width: 220, height: 45,
                hovered: false, color: '#dc2626'
            },
            github: {
                text: "🐙 Sign in with GitHub",
                x: 0, y: 0, width: 220, height: 45,
                hovered: false, color: '#24292f'
            },
            guest: {
                text: "👤 Play as Guest",
                x: 0, y: 0, width: 180, height: 45,
                hovered: false, color: '#f85149'
            },
            back: {
                text: "← Back",
                x: 0, y: 0, width: 100, height: 35,
                hovered: false, color: '#6b7280'
            },
            submit: {
                text: "Submit",
                x: 0, y: 0, width: 150, height: 45,
                hovered: false, color: '#059669'
            },
            togglePassword: {
                text: "👁️",
                x: 0, y: 0, width: 35, height: 35,
                hovered: false, color: '#6b7280'
            }
        };
        
        // Input fields
        this.inputFields = {
            email: {
                label: 'Email',
                value: '',
                focused: false,
                x: 0, y: 0, width: 300, height: 40,
                type: 'email'
            },
            password: {
                label: 'Password',
                value: '',
                focused: false,
                x: 0, y: 0, width: 300, height: 40,
                type: 'password'
            }
        };
        
        this.initializeFirebaseAuth();
        this.setupEventListeners();
    }
    
    initializeFirebaseAuth() {
        // Initialize Firebase Auth if available - use the separate auth app
        if (window.firebase && window.firebaseAuth) {
            this.auth = window.firebaseAuth;
            console.log('🔑 Firebase Auth available, setting up auth state listener');
            
            // Set up auth state listener
            this.auth.onAuthStateChanged((user) => {
                const wasLoggedIn = this.isLoggedIn;
                console.log('🔑 Firebase Auth state changed:', { user: !!user, email: user?.email, wasLoggedIn });
                  if (user) {this.currentUser = user;                    this.isLoggedIn = true;
                    this.isGuest = false;
                    console.log('🔑 Firebase Auth: User signed in:', user.email);
                    
                    // Update HTML UI
                    if (window.updateLoginStatus) {
                        console.log('🔑 Calling updateLoginStatus after sign in');
                        window.updateLoginStatus();
                    } else {
                        console.warn('🔑 updateLoginStatus not available on window');
                    }
                      // If this is a state change after initialization, update navigation
                    if (!wasLoggedIn && this.game && this.game.gameState === GAME_STATES.LOGIN_PROMPT) {
                        console.log('🔑 Firebase Auth: Auth state changed, proceeding to next state');
                        this.loading = false; // Stop loading indicator
                        this.proceedToNextState(); // Properly transition away from login
                    }
                    
                    // Migrate local data to cloud when user logs in
                    if (!wasLoggedIn && this.game && this.game.cloudSaveSystem) {
                        console.log('☁️ User logged in, checking for data migration...');
                        this.game.cloudSaveSystem.migrateLocalDataToCloud().then((migrated) => {
                            if (migrated) {
                                console.log('☁️ Successfully migrated local data to cloud');
                                // Optionally show a popup about migration
                                // Data synced successfully - log to console instead of showing popup
                                console.log('✅ Data synced to cloud successfully');
                            }
                        }).catch((error) => {
                            console.error('❌ Error migrating data to cloud:', error);
                        });
                    }                } else {
                    this.currentUser = null;
                    this.isLoggedIn = false;
                    
                    // IMPORTANT: Reset guest state when user signs out
                    // This ensures the login screen will appear after sign out + reload
                    this.isGuest = false;
                    
                    console.log('🔑 Firebase Auth: User signed out');
                    console.log('🔑 Current auth state:', { isLoggedIn: this.isLoggedIn, isGuest: this.isGuest });
                    
                    // Update HTML UI
                    if (window.updateLoginStatus) {
                        window.updateLoginStatus();
                    }
                }
            });
        } else {
            console.warn('🔑 Firebase Auth not available - user will need to use guest mode');
            // Ensure we're not in a logged-in state if Firebase isn't available
            this.currentUser = null;
            this.isLoggedIn = false;
        }
    }
    
    setupEventListeners() {
        // Store bound event handlers so we can remove them later
        this.boundKeyDownHandler = (e) => {
            if (this.isActive && this.currentView !== 'main') {
                this.handleKeyDown(e);
            }
        };

        this.boundKeyPressHandler = (e) => {
            if (this.isActive && this.currentView !== 'main') {
                this.handleTextInput(e);
            }
        };
        
        // Also listen to input events on keydown for better compatibility
        this.boundInputHandler = (e) => {
            if (this.isActive && this.currentView !== 'main') {
                this.handleInputFromKeyDown(e);
            }
        };
    }

    addEventListeners() {
        document.addEventListener('keydown', this.boundKeyDownHandler);
        document.addEventListener('keypress', this.boundKeyPressHandler);
        document.addEventListener('keydown', this.boundInputHandler); // Add input handling on keydown
    }

    removeEventListeners() {
        document.removeEventListener('keydown', this.boundKeyDownHandler);
        document.removeEventListener('keypress', this.boundKeyPressHandler);
        document.removeEventListener('keydown', this.boundInputHandler);
    }

    shouldShow() {
        // Check if this is after a sign out (force login popup)
        const forceLoginAfterSignout = sessionStorage.getItem('coderunner_force_login_after_signout');
        if (forceLoginAfterSignout === 'true') {
            return true;
        }
        
        // Default behavior - only show if not shown before
        return !this.hasShown;
    }
    
    start() {
        // Check if this is after a sign out and reset state if needed
        const forceLoginAfterSignout = sessionStorage.getItem('coderunner_force_login_after_signout');
        if (forceLoginAfterSignout === 'true') {
            // Reset authentication state
            this.isLoggedIn = false;
            this.isGuest = false;
            this.currentUser = null;
            this.hasShown = false; // Allow the login screen to show again
            // Clear the flag so it doesn't persist
            sessionStorage.removeItem('coderunner_force_login_after_signout');
        }
        
        this.isActive = true;
        this.hasShown = true;
        this.loading = false; // Ensure we're not stuck in loading state
        this.fadeAlpha = 0;
        this.targetAlpha = 1;
        this.slideOffset = 50;
        this.positionButtons();
        this.addEventListeners();
        
        console.log('🔑 LoginSystem.start() completed - isActive:', this.isActive);
    }

    positionButtons() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        if (this.currentView === 'main') {
            // Main view button positioning - improved layout with GitHub
            this.buttons.login.x = centerX - 190;
            this.buttons.login.y = centerY - 10;
            
            this.buttons.register.x = centerX + 10;
            this.buttons.register.y = centerY - 10;
            
            // OAuth providers side by side
            this.buttons.google.x = centerX - 220;
            this.buttons.google.y = centerY + 50;
            
            this.buttons.github.x = centerX + 0;
            this.buttons.github.y = centerY + 50;
            
            this.buttons.guest.x = centerX - 90;
            this.buttons.guest.y = centerY + 110;
        } else {
            // Form view positioning
            this.buttons.back.x = centerX - 150;
            this.buttons.back.y = centerY - 150;
            
            this.buttons.submit.x = centerX - 75;
            this.buttons.submit.y = centerY + 100;
            
            // Input fields
            this.inputFields.email.x = centerX - 150;
            this.inputFields.email.y = centerY - 50;
            
            this.inputFields.password.x = centerX - 150;
            this.inputFields.password.y = centerY + 10;
            
            // Toggle password button
            this.buttons.togglePassword.x = centerX + 160;
            this.buttons.togglePassword.y = centerY + 15;
        }
    }

    /**
     * Update login system animations
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        // Animate fade-in effect
        if (this.fadeAlpha < this.targetAlpha) {
            this.fadeAlpha = Math.min(this.targetAlpha, this.fadeAlpha + (deltaTime / 500)); // 500ms fade in
        }
        
        // Animate slide effect
        if (this.slideOffset > 0) {
            this.slideOffset = Math.max(0, this.slideOffset - (deltaTime / 300)); // 300ms slide in
        }
    }

    updateButtonHover() {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = this.game.input?.mouseX || 0;
        const mouseY = this.game.input?.mouseY || 0;

        // Check button hover states
        Object.values(this.buttons).forEach(button => {
            button.hovered = this.isPointInButton(mouseX, mouseY, button);
        });
    }

    isPointInButton(x, y, button) {
        return x >= button.x && x <= button.x + button.width &&
               y >= button.y && y <= button.y + button.height;
    }
    
    handleClick(x, y) {
        if (!this.isActive) return false;

        // Handle button clicks based on current view
        if (this.currentView === 'main') {
            if (this.isPointInButton(x, y, this.buttons.login)) {
                this.showLoginForm();
                return true;
            }
            if (this.isPointInButton(x, y, this.buttons.register)) {
                this.showRegisterForm();
                return true;
            }
            if (this.isPointInButton(x, y, this.buttons.google)) {
                this.handleGoogleSignIn();
                return true;
            }
            if (this.isPointInButton(x, y, this.buttons.github)) {
                this.handleGitHubSignIn();
                return true;
            }
            if (this.isPointInButton(x, y, this.buttons.guest)) {
                this.handleGuestChoice();
                return true;
            }
        } else {
            // Form view
            if (this.isPointInButton(x, y, this.buttons.back)) {
                this.showMainView();
                return true;
            }
            if (this.isPointInButton(x, y, this.buttons.submit)) {
                this.handleFormSubmit();
                return true;
            }
            if (this.isPointInButton(x, y, this.buttons.togglePassword)) {
                this.showPassword = !this.showPassword;
                return true;
            }
            
            // Handle input field clicks
            this.handleInputFieldClick(x, y);
        }

        return false;
    }

    async handleLoginChoice() {
        console.log('Login chosen');
        // This method can be used for additional login logic if needed
    }
    
    handleGuestChoice() {
        console.log('Guest mode chosen');
        this.isGuest = true;
        this.isLoggedIn = false;
        this.currentUser = null;
        
        // Update HTML UI
        if (window.updateLoginStatus) {
            window.updateLoginStatus();
        }
        
        this.proceedToNextState();
    }

    enableCloudSaving() {
        if (this.isLoggedIn && this.currentUser) {
            console.log('Cloud saving enabled for:', this.currentUser.email);
            // Implement cloud saving logic here
        }
    }
    
    proceedToNextState() {
        this.isActive = false;
        this.removeEventListeners();
        
        // Check if tutorial should be shown for new users or guests
        if (this.game.tutorialSystem && this.game.tutorialSystem.shouldShowTutorial()) {
            console.log('🎓 Showing tutorial for new user/guest');
            this.game.gameState = GAME_STATES.TUTORIAL;
            this.game.tutorialSystem.startTutorial('welcome');
        } else {
            this.game.gameState = GAME_STATES.HOME;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async logout() {
        if (this.auth) {
            try {
                await this.auth.signOut();
                this.currentUser = null;
                this.isLoggedIn = false;
                this.isGuest = false;
                console.log('User logged out');
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    }
    
    render() {
        if (!this.isActive) return;

        this.ctx.save();
        
        // Apply fade-in effect
        this.ctx.globalAlpha = this.fadeAlpha;
        
        // Draw enhanced background overlay with subtle pattern
        const bgGradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
        );
        bgGradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
        bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply slide animation
        this.ctx.translate(0, -this.slideOffset);
        
        this.drawContainer();
        
        if (this.currentView === 'main') {
            this.drawMainView();
        } else {
            this.drawFormView();
        }
        
        this.drawMessages();
        
        if (this.loading) {
            this.drawLoadingIndicator();
        }
        
        this.ctx.restore();
    }

    drawContainer() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const containerWidth = 560;
        const containerHeight = 380;
        
        // Modern glassmorphism container background
        const gradient = this.ctx.createLinearGradient(
            centerX - containerWidth/2, centerY - containerHeight/2,
            centerX + containerWidth/2, centerY + containerHeight/2
        );
        gradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
        gradient.addColorStop(0.5, 'rgba(30, 41, 59, 0.90)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        this.ctx.shadowBlur = 40;
        this.ctx.shadowOffsetY = 12;
        
        this.roundRect(centerX - containerWidth/2, centerY - containerHeight/2, 
                      containerWidth, containerHeight, 24);
        this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Modern glowing border
        this.ctx.strokeStyle = 'rgba(88, 166, 255, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Inner glow effect
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.roundRect(centerX - containerWidth/2 + 1, centerY - containerHeight/2 + 1, 
                      containerWidth - 2, containerHeight - 2, 23);
        this.ctx.stroke();
    }

    drawTitle(text) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, centerX, centerY - 120);
    }    drawMainDescription() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Welcome text with gradient effect
        const titleGradient = this.ctx.createLinearGradient(centerX - 150, centerY - 110, centerX + 150, centerY - 110);
        titleGradient.addColorStop(0, '#58a6ff');
        titleGradient.addColorStop(0.5, '#ffffff');
        titleGradient.addColorStop(1, '#58a6ff');
        
        this.ctx.fillStyle = titleGradient;
        this.ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Welcome to CodeRunner', centerX, centerY - 110);
        
        // Add text shadow for depth
        this.ctx.shadowColor = 'rgba(88, 166, 255, 0.3)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText('Welcome to CodeRunner', centerX, centerY - 110);
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        
        // Subtitle with better styling
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = '18px "Segoe UI", Arial, sans-serif';
        this.ctx.fillText('Choose how to continue your journey:', centerX, centerY - 70);
        
        // Add small decorative line
        this.ctx.strokeStyle = 'rgba(88, 166, 255, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 100, centerY - 50);
        this.ctx.lineTo(centerX + 100, centerY - 50);
        this.ctx.stroke();
    }

    drawFormView() {
        const title = this.currentView === 'login' ? 'Login' : 'Create Account';
        this.drawTitle(title);
        
        // Draw input fields
        Object.values(this.inputFields).forEach(field => {
            this.drawInputField(field);
        });
        
        // Draw buttons
        this.drawButton(this.buttons.back);
        this.drawButton(this.buttons.submit);
        this.drawButton(this.buttons.togglePassword);
    }

    drawInputField(field) {
        const ctx = this.ctx;
        
        // Label
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '14px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(field.label, field.x, field.y - 8);
        
        // Input box
        const borderColor = field.focused ? '#58a6ff' : '#475569';
        const bgColor = field.focused ? 'rgba(88, 166, 255, 0.1)' : 'rgba(51, 65, 85, 0.8)';
        
        ctx.fillStyle = bgColor;
        this.roundRect(field.x, field.y, field.width, field.height, 8);
        ctx.fill();
        
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = field.focused ? 2 : 1;
        ctx.stroke();
        
        // Input text
        ctx.fillStyle = '#f8fafc';
        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        
        let displayText = field.value;
        if (field.type === 'password' && !this.showPassword && displayText) {
            displayText = '•'.repeat(displayText.length);
        }
        
        ctx.fillText(displayText, field.x + 12, field.y + 26);
        
        // Cursor
        if (field.focused) {
            const textWidth = ctx.measureText(displayText).width;
            ctx.fillStyle = '#58a6ff';
            ctx.fillRect(field.x + 12 + textWidth + 2, field.y + 10, 2, 20);
        }
    }

    drawMessages() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        if (this.errorMessage) {
            this.ctx.fillStyle = '#ef4444';
            this.ctx.font = '14px "Segoe UI", Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.errorMessage, centerX, centerY + 160);
        }
        
        if (this.successMessage) {
            this.ctx.fillStyle = '#10b981';
            this.ctx.font = '14px "Segoe UI", Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.successMessage, centerX, centerY + 160);
        }
    }

    drawLoadingIndicator() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#58a6ff';
        this.ctx.font = '18px "Segoe UI", Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading...', centerX, centerY);
    }    drawMainView() {
        this.drawMainDescription();
        
        // Draw main buttons
        this.drawButton(this.buttons.login);
        this.drawButton(this.buttons.register);
        this.drawButton(this.buttons.google);
        this.drawButton(this.buttons.github);
        this.drawButton(this.buttons.guest);
        
        // Simple note below guest button with better styling
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '13px "Segoe UI", Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Guest progress is saved locally only', centerX, centerY + 170);
        
        // Add small info icon
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '12px "Segoe UI", Arial, sans-serif';
        this.ctx.fillText('ℹ️', centerX - 110, centerY + 170);
    }drawButton(button) {
        const ctx = this.ctx;
        const isHovered = button.hovered;
        
        // Modern button styling with enhanced effects
        let bgColor = button.color;
        if (isHovered) {
            bgColor = this.lightenColor(button.color, 20);
        }
        
        // Enhanced shadow and glow effects
        ctx.save();
        
        if (isHovered) {
            // Glowing effect on hover
            ctx.shadowColor = button.color;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 0;
        } else {
            // Subtle depth shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 4;
        }
        
        // Button gradient background
        const gradient = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.height);
        if (isHovered) {
            gradient.addColorStop(0, this.lightenColor(bgColor, 10));
            gradient.addColorStop(1, this.darkenColor(bgColor, 10));
        } else {
            gradient.addColorStop(0, bgColor);
            gradient.addColorStop(1, this.darkenColor(bgColor, 15));
        }
        
        ctx.fillStyle = gradient;
        this.roundRect(button.x, button.y, button.width, button.height, 12);
        ctx.fill();
        
        ctx.restore();
        
        // Add subtle border highlight
        if (isHovered) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            this.roundRect(button.x, button.y, button.width, button.height, 12);
            ctx.stroke();
        }
        
        // Button text with better typography
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        
        // Add text shadow for depth
        if (!isHovered) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetY = 1;
        }
        
        ctx.fillText(button.text, 
                    button.x + button.width / 2, 
                    button.y + button.height / 2 + 6);
        
        // Reset text shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    lightenColor(color, percent) {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                     (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                     (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
                     (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
                     (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }    reset() {
        this.isActive = false;
        this.hasShown = false;
        this.currentView = 'main';
        this.clearForm();
        this.errorMessage = '';
        this.successMessage = '';
        this.loading = false;
        this.removeEventListeners();
    }

    showMainView() {
        this.currentView = 'main';
        this.clearForm();
        this.positionButtons();
    }

    showLoginForm() {
        this.currentView = 'login';
        this.clearForm();
        this.positionButtons();
    }

    showRegisterForm() {
        this.currentView = 'register';
        this.clearForm();
        this.positionButtons();
    }

    async handleGoogleSignIn() {
        if (!this.auth) {
            this.errorMessage = 'Authentication not available';
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        try {
            const provider = new window.firebase.auth.GoogleAuthProvider();
            const result = await this.auth.signInWithPopup(provider);
            
            this.currentUser = result.user;
            this.isLoggedIn = true;
            this.isGuest = false;
            this.successMessage = 'Successfully signed in with Google!';
            
            setTimeout(() => {
                this.proceedToNextState();
            }, 1500);
            
        } catch (error) {
            console.error('Google sign-in error:', error);
            this.errorMessage = this.getErrorMessage(error.code);
        } finally {
            this.loading = false;
        }
    }

    async handleGitHubSignIn() {
        if (!this.auth) {
            this.errorMessage = 'Authentication not available';
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        try {
            const provider = new window.firebase.auth.GithubAuthProvider();
            provider.addScope('user:email');
            provider.addScope('read:user');
            
            const result = await this.auth.signInWithPopup(provider);
            
            this.currentUser = result.user;
            this.isLoggedIn = true;
            this.isGuest = false;
            this.successMessage = 'Successfully signed in with GitHub!';
            
            console.log('🐙 GitHub sign-in successful:', {
                user: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
            });
            
            setTimeout(() => {
                this.proceedToNextState();
            }, 1500);
            
        } catch (error) {
            console.error('GitHub sign-in error:', error);
            this.errorMessage = this.getErrorMessage(error.code);
        } finally {
            this.loading = false;
        }
    }

    async handleFormSubmit() {
        const email = this.inputFields.email.value.trim();
        const password = this.inputFields.password.value;

        if (!email || !password) {
            this.errorMessage = 'Please fill in all fields';
            return;
        }

        if (!this.isValidEmail(email)) {
            this.errorMessage = 'Please enter a valid email address';
            return;
        }

        if (password.length < 6) {
            this.errorMessage = 'Password must be at least 6 characters';
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        try {
            if (this.currentView === 'login') {
                await this.loginWithEmail(email, password);
            } else {
                await this.registerWithEmail(email, password);
            }
        } finally {
            this.loading = false;
        }
    }

    async loginWithEmail(email, password) {
        if (!this.auth) {
            this.errorMessage = 'Authentication not available';
            return;
        }

        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            this.currentUser = result.user;
            this.isLoggedIn = true;
            this.isGuest = false;
            this.successMessage = 'Successfully logged in!';
            
            setTimeout(() => {
                this.proceedToNextState();
            }, 1500);
            
        } catch (error) {
            console.error('Login error:', error);
            this.errorMessage = this.getErrorMessage(error.code);
        }
    }

    async registerWithEmail(email, password) {
        if (!this.auth) {
            this.errorMessage = 'Authentication not available';
            return;
        }

        try {
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            this.currentUser = result.user;
            this.isLoggedIn = true;
            this.isGuest = false;
            this.successMessage = 'Account created successfully!';
            
            setTimeout(() => {
                this.proceedToNextState();
            }, 1500);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.errorMessage = this.getErrorMessage(error.code);
        }
    }

    handleInputFieldClick(x, y) {
        // Check which input field was clicked
        Object.entries(this.inputFields).forEach(([key, field]) => {
            if (x >= field.x && x <= field.x + field.width &&
                y >= field.y && y <= field.y + field.height) {
                // Focus this field, unfocus others
                Object.values(this.inputFields).forEach(f => f.focused = false);
                field.focused = true;
            }
        });
    }    handleKeyDown(e) {
        // Only handle special keys, let regular typing happen in handleTextInput
        if (e.key === 'Tab') {
            e.preventDefault();
            this.focusNextField();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            this.handleFormSubmit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.showMainView();
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            // Handle backspace
            const focusedField = Object.values(this.inputFields).find(f => f.focused);
            if (focusedField && focusedField.value.length > 0) {
                focusedField.value = focusedField.value.slice(0, -1);
            }
        }
        // Don't prevent default for other keys to allow normal typing
    }    handleTextInput(e) {
        // Only handle if we have a focused field and it's a printable character
        const focusedField = Object.values(this.inputFields).find(f => f.focused);
        if (focusedField && e.key && e.key.length === 1) {
            // Prevent the event from bubbling up to other handlers
            e.preventDefault();
            e.stopPropagation();
            
            // Add the character to the field
            focusedField.value += e.key;
        }
    }    handleInputFromKeyDown(e) {
        // Handle character input from keydown events (better compatibility than keypress)
        const focusedField = Object.values(this.inputFields).find(f => f.focused);
        if (!focusedField) return;
        
        // Handle printable characters (letters, numbers, symbols)
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            
            focusedField.value += e.key;
        }
    }

    focusNextField() {
        const fields = Object.values(this.inputFields);
        const currentIndex = fields.findIndex(f => f.focused);
        
        if (currentIndex !== -1) {
            fields[currentIndex].focused = false;
            const nextIndex = (currentIndex + 1) % fields.length;
            fields[nextIndex].focused = true;
        } else if (fields.length > 0) {
            fields[0].focused = true;
        }
    }

    clearForm() {
        Object.values(this.inputFields).forEach(field => {
            field.value = '';
            field.focused = false;
        });
        this.errorMessage = '';
        this.successMessage = '';
        this.showPassword = false;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getErrorMessage(code) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'An account with this email already exists',
            'auth/weak-password': 'Password is too weak',
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'This account has been disabled',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later',
            'auth/network-request-failed': 'Network error. Please check your connection'
        };
        
        return errorMessages[code] || 'An error occurred. Please try again.';
    }    hasActiveFocusedField() {
        return this.isActive && this.currentView !== 'main' && 
               Object.values(this.inputFields).some(field => field.focused);
    }

    /**
     * Check if user is currently authenticated (including persisted state)
     */    isUserAuthenticated() {
        const isLoggedIn = this.isLoggedIn && this.currentUser;
        const isGuest = this.isGuest;
        const result = isLoggedIn || isGuest;
        
        // Ensure we return a boolean
        return !!result;
    }

    /**
     * Wait for Firebase auth state to be determined (for initial load)
     */
    async waitForAuthState(timeoutMs = 3000) {
        if (!this.auth) {
            return false;
        }
        
        return new Promise((resolve) => {
            // If we already have auth state, resolve immediately
            if (this.auth.currentUser !== undefined) {
                resolve(!!this.auth.currentUser);
                return;
            }
            
            // Set up a timeout
            const timeout = setTimeout(() => {
                console.log('🔑 Firebase auth state timeout');
                unsubscribe();
                resolve(false);
            }, timeoutMs);
            
            // Listen for auth state
            const unsubscribe = this.auth.onAuthStateChanged((user) => {
                clearTimeout(timeout);
                unsubscribe();
                resolve(!!user);
            });
        });
    }
}
