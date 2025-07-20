/**
 * Opening Animation System - Handles the game's startup animation sequence
 * Shows: logo → game logo → login (if needed) → homescreen
 */

import { GAME_STATES } from '../utils/constants.js';

export class OpeningAnimationSystem {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        
        // Animation state
        this.isActive = false;
        this.hasPlayed = false;
        this.currentPhase = 'logo'; // 'logo', 'game_logo', 'login', 'homescreen', 'complete'
        this.startTime = 0;
        this.phaseStartTime = 0;
        this.loginSystemStarted = false; // Track if login system has been started
        
        // Logo images
        this.logoImage = null;
        this.logoImageLoaded = false;
        this.gameLogoImage = null;
        this.gameLogoImageLoaded = false;
        
        // Animation effects
        this.fadeAlpha = 0;
        this.glowIntensity = 0;
        
        // Audio played flag
        this.audioPlayed = false;
        
        this.loadLogoImages();
    }
    
    /**
     * Load both logo images
     */
    loadLogoImages() {
        // Load main logo
        this.logoImage = new Image();
        this.logoImage.onload = () => {
            this.logoImageLoaded = true;
            console.log('🎮 Main logo loaded successfully');
        };
        this.logoImage.onerror = () => {
            console.warn('❌ Failed to load main logo');
            this.logoImageLoaded = false;
        };
        this.logoImage.src = './assets/opening animation logo.png';
        
        // Load game logo
        this.gameLogoImage = new Image();
        this.gameLogoImage.onload = () => {
            this.gameLogoImageLoaded = true;
            console.log('🎮 Game logo loaded successfully');
        };
        this.gameLogoImage.onerror = () => {
            console.warn('❌ Failed to load game logo');
            this.gameLogoImageLoaded = false;
        };
        this.gameLogoImage.src = './assets/opening animation game logo.png';
    }
    
    /**
     * Check if animation should play
     */
    shouldPlay() {
        // Check SettingsSystem first
        try {
            if (this.game && this.game.settingsSystem) {
                const shouldShow = this.game.settingsSystem.getSettingValue('showOpeningAnimation');
                console.log('🎬 Opening animation setting from SettingsSystem:', shouldShow);
                if (shouldShow === false) {
                    return false;
                }
            }
        } catch (error) {
            console.warn('🎬 Could not check SettingsSystem opening animation setting:', error);
        }
        
        // Check if opening animation is enabled in UserProfileSystem settings
        try {
            if (this.game && this.game.userProfileSystem) {
                const shouldShow = this.game.userProfileSystem.shouldShowOpeningAnimation();
                console.log('🎬 Opening animation setting from UserProfileSystem:', shouldShow);
                if (!shouldShow) {
                    return false;
                }
            }
        } catch (error) {
            console.warn('🎬 Could not check UserProfileSystem opening animation setting:', error);
        }
        
        // Fallback to localStorage check
        try {
            const settings = JSON.parse(localStorage.getItem('coderunner_settings') || '{}');
            if (settings.showOpeningAnimation === false) {
                console.log('🎬 Opening animation disabled in localStorage settings');
                return false;
            }
            
            // Also check the old settings location
            const gameSettings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
            if (gameSettings.showOpeningAnimation === false) {
                console.log('🎬 Opening animation disabled in old localStorage settings');
                return false;
            }
        } catch (error) {
            console.warn('🎬 Could not check localStorage opening animation setting:', error);
        }
        
        return !this.hasPlayed;
    }
    
    /**
     * Start the opening animation
     */
    start() {
        console.log('🎬 OpeningAnimationSystem.start() called');
        console.log('🎬 hasPlayed:', this.hasPlayed);
        console.log('🎬 shouldPlay():', this.shouldPlay());
        
        if (this.hasPlayed) {
            console.log('🎬 Animation already played, skipping');
            return;
        }
        
        this.isActive = true;
        this.hasPlayed = true;
        this.currentPhase = 'logo';
        this.startTime = performance.now();
        this.phaseStartTime = this.startTime;
        this.fadeAlpha = 0;
        this.glowIntensity = 0;
        this.audioPlayed = false;
        
        console.log('🎬 Starting opening animation sequence');
        console.log('🎬 Logo image loaded:', this.logoImageLoaded);
        console.log('🎬 Game logo image loaded:', this.gameLogoImageLoaded);
    }
    
    /**
     * Update animation logic
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        const currentTime = performance.now();
        const phaseElapsed = currentTime - this.phaseStartTime;
        
        switch (this.currentPhase) {
            case 'logo':
                this.updateLogoPhase(phaseElapsed);
                // Transition after 3 seconds
                if (phaseElapsed > 3000) {
                    this.transitionToPhase('game_logo');
                }
                break;
                
            case 'game_logo':
                this.updateGameLogoPhase(phaseElapsed);
                // Transition after 3 seconds
                if (phaseElapsed > 3000) {
                    // Check if user needs to log in
                    if (this.shouldShowLogin()) {
                        this.transitionToPhase('login');
                    } else {
                        this.transitionToPhase('homescreen');
                    }
                }
                break;
                
            case 'login':
                this.updateLoginPhase(phaseElapsed);
                
                // Check authentication state with detailed logging
                const userIsAuthenticated = this.isUserLoggedIn();
                const hasChosenAuth = this.hasUserChosenAuthentication();
                const loginSystem = this.game?.loginSystem;
                
                console.log(`🎬 Login phase check - elapsed: ${phaseElapsed}ms`);
                console.log(`🎬 - userIsAuthenticated: ${userIsAuthenticated}`);
                console.log(`🎬 - hasChosenAuth: ${hasChosenAuth}`);
                if (loginSystem) {
                    console.log(`🎬 - loginSystem.isLoggedIn: ${loginSystem.isLoggedIn}`);
                    console.log(`🎬 - loginSystem.isGuest: ${loginSystem.isGuest}`);
                    console.log(`🎬 - loginSystem.hasShown: ${loginSystem.hasShown}`);
                }
                
                // Only transition away if:
                // 1. User has explicitly chosen authentication AND time has passed
                // 2. OR maximum timeout has been reached
                const shouldTransition = (phaseElapsed > 2000 && userIsAuthenticated && hasChosenAuth) || phaseElapsed > 15000;
                
                console.log(`🎬 - shouldTransition: ${shouldTransition}`);
                console.log(`🎬 - condition1: ${phaseElapsed > 2000 && userIsAuthenticated && hasChosenAuth}`);
                console.log(`🎬 - condition2: ${phaseElapsed > 15000}`);
                
                if (shouldTransition) {
                    console.log('🎬 Login phase complete, transitioning to homescreen');
                    this.transitionToPhase('homescreen');
                }
                break;
                
            case 'homescreen':
                this.updateHomescreenPhase(phaseElapsed);
                // Complete after 2 seconds
                if (phaseElapsed > 2000) {
                    this.transitionToPhase('complete');
                }
                break;
                
            case 'complete':
                // End animation
                this.isActive = false;
                this.onComplete();
                break;
        }
    }
    
    /**
     * Transition to a new phase
     */
    transitionToPhase(newPhase) {
        console.log(`🎬 Animation transitioning from ${this.currentPhase} to ${newPhase}`);
        this.currentPhase = newPhase;
        this.phaseStartTime = performance.now();
        this.fadeAlpha = 0;
        this.glowIntensity = 0;
        
        // Reset login system started flag when entering login phase
        if (newPhase === 'login') {
            this.loginSystemStarted = false;
        }
        
        // Play sound effect on transitions
        if (!this.audioPlayed && this.game.audioSystem) {
            this.game.audioSystem.onMenuOpen();
            this.audioPlayed = true;
        }
    }
    
    /**
     * Update logo phase
     */
    updateLogoPhase(elapsed) {
        // Fade in effect
        if (elapsed < 1000) {
            this.fadeAlpha = elapsed / 1000;
        } else if (elapsed > 2000) {
            // Fade out
            this.fadeAlpha = 1 - ((elapsed - 2000) / 1000);
        } else {
            this.fadeAlpha = 1;
        }
        
        // Glow effect
        this.glowIntensity = Math.sin(elapsed * 0.003) * 0.5 + 0.5;
    }
    
    /**
     * Update game logo phase
     */
    updateGameLogoPhase(elapsed) {
        // Fade in effect
        if (elapsed < 1000) {
            this.fadeAlpha = elapsed / 1000;
        } else if (elapsed > 2000) {
            // Fade out
            this.fadeAlpha = 1 - ((elapsed - 2000) / 1000);
        } else {
            this.fadeAlpha = 1;
        }
        
        // Glow effect
        this.glowIntensity = Math.sin(elapsed * 0.004) * 0.3 + 0.7;
    }
    
    /**
     * Update login phase
     */    updateLoginPhase(elapsed) {
        // Keep visible
        this.fadeAlpha = 1;
        this.glowIntensity = 0.5;
        
        // On first frame of login phase, start the login system and update UI
        if (elapsed < 50 && !this.loginSystemStarted) { // Within first 50ms and not already started
            console.log('🎬 Login phase started, initiating login system');
            this.loginSystemStarted = true;
            
            // Set game state to login prompt - let GameNavigation handle starting the appropriate system
            this.game.setGameState(GAME_STATES.LOGIN_PROMPT);
            
            // Don't manually start systems here - let GameNavigation handle it
            console.log('🎬 Game state set to LOGIN_PROMPT, GameNavigation will handle system startup');
            
            // Update HTML UI to show login state
            if (window.updateLoginStatus) {
                console.log('🎬 Updating login status during login phase');
                window.updateLoginStatus();
            }
        }
    }
    
    /**
     * Update homescreen phase
     */
    updateHomescreenPhase(elapsed) {
        // Fade in
        this.fadeAlpha = Math.min(elapsed / 1000, 1);
        this.glowIntensity = 0.3;
    }    /**
     * Check if user should see login screen
     */
    shouldShowLogin() {
        // First check if this is after a sign out (force login popup)
        const forceLoginAfterSignout = sessionStorage.getItem('coderunner_force_login_after_signout');
        if (forceLoginAfterSignout === 'true') {
            console.log('🎬 Login check - forcing login after sign out');
            // NOTE: Don't clear the flag here - let LoginSystem handle it
            return true;
        }
        
        // Check if user is already logged in via UserProfileSystem
        if (this.game && this.game.userProfileSystem) {
            const isAuthenticated = this.game.userProfileSystem.isLoggedIn;
            console.log('🎬 Login check - UserProfileSystem isLoggedIn:', isAuthenticated);
            return !isAuthenticated;
        }
        
        // Fallback check for legacy login system
        if (this.game && this.game.loginSystem) {
            const isAuthenticated = this.game.loginSystem.isUserAuthenticated();
            console.log('🎬 Login check - LoginSystem isAuthenticated:', isAuthenticated);
            return !isAuthenticated;
        }
        
        console.log('🎬 Login check - no authentication system, showing login');
        return true; // Default to showing login if system not ready
    }
    
    /**
     * Check if user is logged in
     */    isUserLoggedIn() {
        if (window.gameInstance && window.gameInstance.loginSystem) {
            return window.gameInstance.loginSystem.isUserAuthenticated();
        }
        return false;
    }
    
    /**
     * Check if user has made an authentication choice (not just default state)
     */
    hasUserChosenAuthentication() {
        if (!window.gameInstance || !window.gameInstance.loginSystem) {
            console.log('🎬 hasUserChosenAuthentication: no login system');
            return false;
        }
        
        const loginSystem = window.gameInstance.loginSystem;
        
        // Check if user is logged in with an actual account (not guest)
        if (loginSystem.isLoggedIn && loginSystem.currentUser) {
            console.log('🎬 User has authenticated with account:', loginSystem.currentUser.email);
            return true;
        }
        
        // Check if user explicitly chose guest mode (not default state)
        if (loginSystem.isGuest && loginSystem.hasShown) {
            console.log('🎬 User has explicitly chosen guest mode');
            return true;
        }
        
        console.log('🎬 User has not made authentication choice yet - isLoggedIn:', loginSystem.isLoggedIn, 'isGuest:', loginSystem.isGuest, 'hasShown:', loginSystem.hasShown);
        return false;
    }

    /**
     * Render the animation
     */
    render() {
        if (!this.isActive) {
            console.log('🎬 render() called but animation not active');
            return;
        }
        
        console.log('🎬 render() called - phase:', this.currentPhase, 'fadeAlpha:', this.fadeAlpha);
        
        // Clear canvas with dark background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        switch (this.currentPhase) {
            case 'logo':
                this.renderLogo();
                break;
            case 'game_logo':
                this.renderGameLogo();
                break;
            case 'login':
                this.renderLoginScreen();
                break;
            case 'homescreen':
                this.renderHomescreen();
                break;
        }
    }
    
    /**
     * Render main logo
     */
    renderLogo() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        if (this.logoImageLoaded && this.logoImage) {
            // Calculate large size (60% of screen)
            const maxSize = Math.min(this.canvas.width, this.canvas.height) * 0.6;
            const aspectRatio = this.logoImage.width / this.logoImage.height;
            let drawWidth = maxSize;
            let drawHeight = maxSize / aspectRatio;
            
            if (drawHeight > maxSize) {
                drawHeight = maxSize;
                drawWidth = maxSize * aspectRatio;
            }
            
            const logoX = centerX - drawWidth / 2;
            const logoY = centerY - drawHeight / 2;
            
            // Apply glow effect
            if (this.glowIntensity > 0) {
                this.ctx.shadowColor = '#8855ff';
                this.ctx.shadowBlur = 30 * this.glowIntensity;
            }
            
            // Apply fade
            this.ctx.globalAlpha = this.fadeAlpha;
            
            // Draw logo
            this.ctx.drawImage(this.logoImage, logoX, logoY, drawWidth, drawHeight);
            
            // Reset effects
            this.ctx.shadowBlur = 0;
            this.ctx.globalAlpha = 1;
        } else {
            // Fallback text
            this.ctx.fillStyle = `rgba(136, 85, 255, ${this.fadeAlpha})`;
            this.ctx.font = 'bold 72px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('LOGO', centerX, centerY);
        }
    }
    
    /**
     * Render game logo
     */
    renderGameLogo() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        if (this.gameLogoImageLoaded && this.gameLogoImage) {
            // Calculate large size (70% of screen)
            const maxSize = Math.min(this.canvas.width, this.canvas.height) * 0.7;
            const aspectRatio = this.gameLogoImage.width / this.gameLogoImage.height;
            let drawWidth = maxSize;
            let drawHeight = maxSize / aspectRatio;
            
            if (drawHeight > maxSize) {
                drawHeight = maxSize;
                drawWidth = maxSize * aspectRatio;
            }
            
            const logoX = centerX - drawWidth / 2;
            const logoY = centerY - drawHeight / 2;
            
            // Apply glow effect
            if (this.glowIntensity > 0) {
                this.ctx.shadowColor = '#00ff88';
                this.ctx.shadowBlur = 25 * this.glowIntensity;
            }
            
            // Apply fade
            this.ctx.globalAlpha = this.fadeAlpha;
            
            // Draw logo
            this.ctx.drawImage(this.gameLogoImage, logoX, logoY, drawWidth, drawHeight);
            
            // Reset effects
            this.ctx.shadowBlur = 0;
            this.ctx.globalAlpha = 1;
        } else {
            // Fallback text
            this.ctx.fillStyle = `rgba(0, 255, 136, ${this.fadeAlpha})`;
            this.ctx.font = 'bold 64px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CodeRunner', centerX, centerY);
        }
    }
    
    /**
     * Render login screen
     */
    renderLoginScreen() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Background
        this.ctx.fillStyle = 'rgba(13, 17, 23, 0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Login prompt
        this.ctx.fillStyle = '#f0f6fc';
        this.ctx.font = 'bold 48px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Welcome to CodeRunner', centerX, centerY - 60);
        
        this.ctx.font = '24px Courier New';
        this.ctx.fillText('Please log in to continue', centerX, centerY);
        
        this.ctx.font = '16px Courier New';
        this.ctx.fillStyle = '#7d8590';
        this.ctx.fillText('(Opening menu to continue...)', centerX, centerY + 40);
    }
    
    /**
     * Render homescreen transition
     */
    renderHomescreen() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Background
        this.ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Welcome message
        this.ctx.fillStyle = `rgba(240, 246, 252, ${this.fadeAlpha})`;
        this.ctx.font = 'bold 36px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading Game...', centerX, centerY);
        
        // Subtitle
        this.ctx.font = '18px Courier New';
        this.ctx.fillStyle = `rgba(125, 133, 144, ${this.fadeAlpha})`;
        this.ctx.fillText('Phase 1: Core Systems Demo', centerX, centerY + 40);
    }
    
    /**
     * Reset the animation to allow it to play again
     */
    reset() {
        this.hasPlayed = false;
        this.isActive = false;
        this.currentPhase = 'logo';
        this.startTime = 0;
        this.phaseStartTime = 0;
        this.fadeAlpha = 0;
        this.showContent = false;
        console.log('🎬 Opening animation reset');
    }    /**
     * Animation complete callback
     */
    onComplete() {
        console.log('🎬 Opening animation sequence completed');
        
        // Check if user needs to login after animation
        if (this.shouldShowLogin()) {
            console.log('🎬 → Transitioning to login after animation');
            this.game.setGameState(GAME_STATES.LOGIN_PROMPT);
            
            // Start UserProfileSystem if available
            if (this.game.userProfileSystem) {
                this.game.userProfileSystem.start();
            } else if (this.game.loginSystem && this.game.loginSystem.shouldShow()) {
                // Fallback to legacy login system
                this.game.loginSystem.start();
            }
        } else {
            // User is logged in or doesn't need login, go to home
            console.log('🎬 → Transitioning to home after animation');
            this.game.setGameState(GAME_STATES.HOME);
        }
    }
}
