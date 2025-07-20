/**
 * User Profile System - Complete user profile management with authentication, stats, and cloud sync
 * 
 * Features:
 * - User authentication (email/password + GitHub)
 * - Profile management (username, display name, avatar)
 * - Stats tracking and display
 * - Cloud data synchronization
 * - Account settings (password change, etc.)
 * - Leaderboard display name management
 */

import { GAME_STATES } from '../utils/constants.js';

export class UserProfileSystem {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        
        // System state
        this.isActive = false;
        this.currentView = 'main'; // 'main', 'stats', 'settings', 'login', 'register'
        this.isLoggedIn = false;
        this.currentUser = null;
        this.userProfile = null;
        
        // Authentication providers
        this.auth = null;
        this.firestore = null;
        this.githubProvider = null;
        
        // UI state
        this.animationTime = 0;
        this.fadeAlpha = 0;
        this.targetAlpha = 1;
        this.slideOffset = 50;
        this.scrollOffset = 0;
        this.hoveredButton = null;
        this.loading = false;
        this.errorMessage = '';
        this.successMessage = '';
        this.messageTimer = 0;
        
        // Cloud sync message state
        this.syncMessage = '';
        this.syncMessageType = '';
        this.syncMessageTimer = 0;
        
        // Form state
        this.inputFields = {};
        this.focusedField = null;
        this.showPassword = false;
        
        // User stats and data
        this.userStats = {
            totalScore: 0,
            highScore: 0,
            gamesPlayed: 0,
            totalDistance: 0,
            totalTime: 0,
            dataPacketsCollected: 0,
            obstaclesHit: 0,
            powerupsCollected: 0,
            achievements: [],
            joinDate: null,
            lastPlayed: null,
            averageScore: 0,
            bestStreak: 0,
            totalJumps: 0,
            perfectRuns: 0
        };
        
        // UI Layout
        this.buttons = {};
        this.menuItems = [];
        this.showSignOutConfirmation = false;
        
        // Game settings (default to off)
        this.gameSettings = {
            showLoadingScreen: false,
            showOpeningAnimation: false
        };
        
        this.initializeSystem();
    }

    /**
     * Initialize the user profile system
     */
    initializeSystem() {
        this.setupFirebase();
        this.setupUI();
        this.setupEventListeners();
        this.loadUserData();
        this.loadGameSettings();
        this.initializeRealStats();
        
        console.log('👤 UserProfileSystem initialized');
    }

    /**
     * Setup Firebase authentication and providers
     */
    setupFirebase() {
        try {
            if (window.firebaseAuth && window.firebaseFirestore) {
                this.auth = window.firebaseAuth;
                this.firestore = window.firebaseFirestore;
                
                // Setup GitHub provider
                this.githubProvider = new firebase.auth.GithubAuthProvider();
                this.githubProvider.addScope('user:email');
                this.githubProvider.addScope('read:user');
                
                // Setup Google provider
                this.googleProvider = new firebase.auth.GoogleAuthProvider();
                this.googleProvider.addScope('profile');
                this.googleProvider.addScope('email');
                
                // Setup auth state listener
                this.auth.onAuthStateChanged((user) => {
                    this.handleAuthStateChange(user);
                });
                
                console.log('🔑 Firebase authentication configured with GitHub and Google support');
            } else {
                console.warn('⚠️ Firebase not available - limited functionality');
            }
        } catch (error) {
            console.error('❌ Error setting up Firebase:', error);
        }
    }

    /**
     * Handle authentication state changes
     */
    async handleAuthStateChange(user) {
        const wasLoggedIn = this.isLoggedIn;
        
        if (user) {
            this.currentUser = user;
            this.isLoggedIn = true;
            
            // Load user profile from Firestore
            await this.loadUserProfile();
            
            // Load game settings from cloud
            await this.loadGameSettingsFromCloud();
            
            // Load all game data from cloud
            if (this.game && this.game.cloudSaveSystem) {
                await this.game.cloudSaveSystem.loadAllGameData();
                this.game.cloudSaveSystem.startAutoSave();
            }
            
            // Update stats if we have game data
            if (this.game) {
                this.updateUserStats();
            }
            
            console.log('👤 User authenticated:', user.email || user.displayName);
            console.log('☁️ Cloud save system activated');
        } else {
            // Save current progress before signing out
            if (this.isLoggedIn && this.game && this.game.cloudSaveSystem) {
                await this.game.cloudSaveSystem.saveAllGameData();
                this.game.cloudSaveSystem.stopAutoSave();
            }
            
            this.currentUser = null;
            this.isLoggedIn = false;
            this.userProfile = null;
            this.resetUserStats();
            
            console.log('👤 User signed out');
            console.log('☁️ Cloud save system deactivated');
        }
        
        // Notify game of auth state change
        if (this.game && this.game.loginSystem) {
            this.game.loginSystem.currentUser = this.currentUser;
            this.game.loginSystem.isLoggedIn = this.isLoggedIn;
        }
        
        // Update UI if open
        if (this.isActive) {
            this.currentView = this.isLoggedIn ? 'main' : 'login';
        }
    }

    /**
     * Setup UI components
     */
    setupUI() {
        // Define menu items for different views
        this.menuItems = {
            main: [
                { id: 'stats', label: '📊 View Stats', description: 'See your game statistics' },
                { id: 'syncCloud', label: '☁️ Sync with Cloud', description: 'Manually sync your data with cloud' },
                { id: 'settings', label: '⚙️ Account Settings', description: 'Manage your account' },
                { id: 'logout', label: '🚪 Sign Out', description: 'Sign out of your account' }
            ],
            guest: [
                { id: 'login', label: '🔑 Sign In', description: 'Sign in to save your progress' },
                { id: 'register', label: '📝 Create Account', description: 'Create a new account' },
                { id: 'playAsGuest', label: '🎮 Play as Guest', description: 'Play without saving progress' }
            ]
        };
        
        // Initialize input fields
        this.inputFields = {
            email: { label: 'Email', value: '', type: 'email', placeholder: 'Enter your email' },
            password: { label: 'Password', value: '', type: 'password', placeholder: 'Enter your password' },
            confirmPassword: { label: 'Confirm Password', value: '', type: 'password', placeholder: 'Confirm your password' },
            displayName: { label: 'Display Name', value: '', type: 'text', placeholder: 'Name shown on leaderboard' },
            newPassword: { label: 'New Password', value: '', type: 'password', placeholder: 'Enter new password' },
            currentPassword: { label: 'Current Password', value: '', type: 'password', placeholder: 'Enter current password' }
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.boundKeyHandler = (e) => this.handleKeyPress(e);
        this.boundClickHandler = (e) => this.handleClick(e);
        this.boundMouseMoveHandler = (e) => this.handleMouseMove(e);
        
        // Add beforeunload listener for emergency cloud save
        this.boundBeforeUnloadHandler = async (e) => {
            if (this.isLoggedIn && this.game && this.game.cloudSaveSystem) {
                try {
                    // Try to save data before page unload
                    // Use keepalive or sendBeacon for better reliability
                    const gameData = this.game.cloudSaveSystem.collectGameData();
                    
                    // Save to localStorage immediately as fallback
                    localStorage.setItem('coderunner_save_data', JSON.stringify(gameData));
                    
                    // Try async save but don't wait for it
                    this.game.cloudSaveSystem.saveAllGameData().catch(error => {
                        console.warn('⚠️ Failed to save data on page unload:', error);
                    });
                    
                } catch (error) {
                    console.warn('⚠️ Failed to save data on page unload:', error);
                }
            }
        };
        
        // Add the beforeunload listener immediately
        window.addEventListener('beforeunload', this.boundBeforeUnloadHandler);
    }

    /**
     * Start the user profile system
     */
    start() {
        this.isActive = true;
        this.fadeAlpha = 0;
        this.targetAlpha = 1;
        this.slideOffset = 50;
        
        // Determine the appropriate view based on context
        if (this.isLoggedIn) {
            this.currentView = 'main';
        } else {
            // Check if this is being opened from the opening animation (LOGIN_PROMPT state)
            if (this.game && this.game.gameState === 'loginPrompt') {
                this.currentView = 'login';
            } else {
                this.currentView = 'guest';
            }
        }
        
        this.positionElements();
        this.addEventListeners();
        
        console.log('👤 User profile system started with view:', this.currentView);
    }

    /**
     * Stop the user profile system
     */
    stop() {
        this.isActive = false;
        this.removeEventListeners();
        console.log('👤 User profile system stopped');
    }

    /**
     * Add event listeners
     */
    addEventListeners() {
        document.addEventListener('keydown', this.boundKeyHandler);
        this.canvas.addEventListener('click', this.boundClickHandler);
        this.canvas.addEventListener('mousemove', this.boundMouseMoveHandler);
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        document.removeEventListener('keydown', this.boundKeyHandler);
        this.canvas.removeEventListener('click', this.boundClickHandler);
        this.canvas.removeEventListener('mousemove', this.boundMouseMoveHandler);
        window.removeEventListener('beforeunload', this.boundBeforeUnloadHandler);
    }

    /**
     * Load user profile data from Firestore
     */
    async loadUserProfile() {
        if (!this.firestore || !this.currentUser) return;
        
        try {
            const profileDoc = await this.firestore
                .collection('userProfiles')
                .doc(this.currentUser.uid)
                .get();
            
            if (profileDoc.exists) {
                this.userProfile = profileDoc.data();
                this.userStats = { ...this.userStats, ...this.userProfile.stats };
                
                // Load selected sprite from cloud profile if available
                if (this.userProfile.selectedSprite && typeof window !== 'undefined' && window.profileManager) {
                    window.profileManager.loadFromCloud(this.userProfile);
                }
            } else {
                // Create new profile with default sprite from ProfileManager
                let selectedSprite = 'player-sprite.png';
                if (typeof window !== 'undefined' && window.profileManager) {
                    selectedSprite = window.profileManager.getSelectedSprite();
                }
                
                this.userProfile = {
                    uid: this.currentUser.uid,
                    email: this.currentUser.email,
                    displayName: this.currentUser.displayName || '',
                    photoURL: this.currentUser.photoURL || '',
                    provider: this.getAuthProvider(),
                    createdAt: new Date().toISOString(),
                    selectedSprite: selectedSprite,
                    stats: this.userStats
                };
                
                await this.saveUserProfile();
            }
            
            // Update input fields with profile data
            if (this.userProfile.displayName) {
                this.inputFields.displayName.value = this.userProfile.displayName;
            }
            
            console.log('👤 User profile loaded successfully');
        } catch (error) {
            console.error('❌ Error loading user profile:', error);
            this.showError('Failed to load profile data');
        }
    }

    /**
     * Save user profile data to Firestore
     */
    async saveUserProfile() {
        if (!this.firestore || !this.currentUser || !this.userProfile) return;
        
        try {
            this.userProfile.updatedAt = new Date().toISOString();
            this.userProfile.stats = this.userStats;
            
            // Include selected sprite from ProfileManager if available
            if (typeof window !== 'undefined' && window.profileManager) {
                let selectedSprite = window.profileManager.getSelectedSprite();
                // Ensure we store only the sprite ID/filename, not the full path
                if (selectedSprite && selectedSprite.includes('/')) {
                    selectedSprite = selectedSprite.split('/').pop();
                }
                this.userProfile.selectedSprite = selectedSprite;
            }
            
            // Sanitize the profile data to remove undefined values
            const sanitizedProfile = this.sanitizeProfileData(this.userProfile);
            
            await this.firestore
                .collection('userProfiles')
                .doc(this.currentUser.uid)
                .set(sanitizedProfile, { merge: true });
            
            console.log('👤 User profile saved successfully with selected sprite:', this.userProfile.selectedSprite);
        } catch (error) {
            console.error('❌ Error saving user profile:', error);
            this.showError('Failed to save profile data');
        }
    }
    
    /**
     * Sanitize profile data to remove undefined values for Firestore
     */
    sanitizeProfileData(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeProfileData(item)).filter(item => item !== undefined);
        }
        
        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== null) {
                if (typeof value === 'object') {
                    const sanitizedValue = this.sanitizeProfileData(value);
                    // Only include objects that have at least one property
                    if (Array.isArray(sanitizedValue) || Object.keys(sanitizedValue).length > 0) {
                        sanitized[key] = sanitizedValue;
                    }
                } else {
                    sanitized[key] = value;
                }
            }
        }
        
        return sanitized;
    }

    /**
     * Get authentication provider name
     */
    getAuthProvider() {
        if (!this.currentUser) return 'unknown';
        
        const providerData = this.currentUser.providerData;
        if (providerData && providerData.length > 0) {
            const providerId = providerData[0].providerId;
            return providerId === 'github.com' ? 'github' : 
                   providerId === 'google.com' ? 'google' : 
                   'email';
        }
        return 'email';
    }

    /**
     * Update user statistics
     */
    updateUserStats() {
        if (!this.game) return;
        
        // Get current game stats
        const gameStats = this.game.getGameStats ? this.game.getGameStats() : {};
        
        // Only increment games played if this was an actual game completion
        // (not just opening the page or refreshing)
        const actualGamePlayed = gameStats.actualGameCompleted || false;
        
        // Update stats
        this.userStats = {
            ...this.userStats,
            highScore: Math.max(this.userStats.highScore, gameStats.highScore || 0),
            totalScore: this.userStats.totalScore + (gameStats.lastScore || 0),
            gamesPlayed: actualGamePlayed ? this.userStats.gamesPlayed + 1 : this.userStats.gamesPlayed,
            totalDistance: this.userStats.totalDistance + (gameStats.lastDistance || 0),
            totalTime: this.userStats.totalTime + (gameStats.lastTime || 0),
            dataPacketsCollected: this.userStats.dataPacketsCollected + (gameStats.lastDatapackets || 0),
            obstaclesHit: this.userStats.obstaclesHit + (gameStats.lastObstaclesHit || 0),
            powerupsCollected: this.userStats.powerupsCollected + (gameStats.lastPowerups || 0),
            totalJumps: this.userStats.totalJumps + (gameStats.lastJumps || 0),
            lastPlayed: new Date().toISOString()
        };
        
        // Calculate derived stats
        this.userStats.averageScore = this.userStats.gamesPlayed > 0 ? 
            Math.round(this.userStats.totalScore / this.userStats.gamesPlayed) : 0;
        
        // Save to cloud if logged in
        if (this.isLoggedIn) {
            this.saveUserProfile();
        }
    }

    /**
     * Reset user statistics
     */
    resetUserStats() {
        this.userStats = {
            totalScore: 0,
            highScore: 0,
            gamesPlayed: 0,
            totalDistance: 0,
            totalTime: 0,
            datapacketsCollected: 0,
            obstaclesHit: 0,
            powerupsCollected: 0,
            achievements: [],
            joinDate: null,
            lastPlayed: null,
            averageScore: 0,
            bestStreak: 0,
            totalJumps: 0,
            perfectRuns: 0
        };
    }

    /**
     * Load user data from local storage or cloud
     */
    loadUserData() {
        try {
            const localData = localStorage.getItem('coderunner_user_stats');
            if (localData) {
                const parsed = JSON.parse(localData);
                this.userStats = { ...this.userStats, ...parsed };
            }
        } catch (error) {
            console.warn('⚠️ Failed to load local user data:', error);
        }
    }

    /**
     * Save user data to local storage
     */
    saveUserData() {
        try {
            localStorage.setItem('coderunner_user_stats', JSON.stringify(this.userStats));
        } catch (error) {
            console.warn('⚠️ Failed to save local user data:', error);
        }
    }

    /**
     * Authentication methods
     */
    
    /**
     * Sign in with email and password
     */
    async signInWithEmail(email, password) {
        if (!this.auth) {
            this.showError('Authentication not available');
            return;
        }
        
        this.loading = true;
        
        try {
            await this.auth.signInWithEmailAndPassword(email, password);
            this.showSuccess('Successfully signed in!');
            this.clearInputs();
        } catch (error) {
            console.error('❌ Sign in error:', error);
            this.showError(this.getAuthErrorMessage(error));
        } finally {
            this.loading = false;
        }
    }

    /**
     * Sign up with email and password
     */
    async signUpWithEmail(email, password, displayName) {
        if (!this.auth) {
            this.showError('Authentication not available');
            return;
        }
        
        this.loading = true;
        
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            
            // Update display name if provided
            if (displayName) {
                await userCredential.user.updateProfile({
                    displayName: displayName
                });
            }
            
            this.showSuccess('Account created successfully!');
            this.clearInputs();
        } catch (error) {
            console.error('❌ Sign up error:', error);
            this.showError(this.getAuthErrorMessage(error));
        } finally {
            this.loading = false;
        }
    }

    /**
     * Sign in with GitHub
     */
    async signInWithGitHub() {
        if (!this.auth || !this.githubProvider) {
            this.showError('GitHub authentication not available');
            return;
        }
        
        this.loading = true;
        
        try {
            await this.auth.signInWithPopup(this.githubProvider);
            this.showSuccess('Successfully signed in with GitHub!');
        } catch (error) {
            console.error('❌ GitHub sign in error:', error);
            this.showError(this.getAuthErrorMessage(error));
        } finally {
            this.loading = false;
        }
    }

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        if (!this.auth || !this.googleProvider) {
            this.showError('Google authentication not available');
            return;
        }
        
        this.loading = true;
        try {
            await this.auth.signInWithPopup(this.googleProvider);
            this.showSuccess('Successfully signed in with Google!');
            // User state will be handled by onAuthStateChanged
        } catch (error) {
            console.error('Google sign-in error:', error);
            this.showError('Failed to sign in with Google: ' + error.message);
        } finally {
            this.loading = false;
        }
    }
    
    /**
     * Sign out
     */
    async signOut() {
        if (!this.auth) return;
        
        this.loading = true;
        
        try {
            // CRITICAL FIX: Save all data to cloud BEFORE signing out!
            console.log('💾 Saving all progress to cloud before signing out...');
            
            // Save all game data to cloud first
            if (this.game && this.game.cloudSaveSystem) {
                try {
                    await this.game.cloudSaveSystem.saveAllGameData();
                    console.log('✅ All data saved to cloud successfully before sign out');
                } catch (saveError) {
                    console.error('❌ Failed to save data to cloud before sign out:', saveError);
                    // Continue with sign out even if save fails
                }
            }
            
            // Save user profile data to cloud
            try {
                await this.saveUserProfile();
                console.log('✅ User profile saved to cloud before sign out');
            } catch (profileSaveError) {
                console.error('❌ Failed to save profile to cloud before sign out:', profileSaveError);
                // Continue with sign out even if profile save fails
            }
            
            // Small delay to ensure cloud saves complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Now proceed with sign out
            await this.auth.signOut();
            console.log('🔄 User signed out successfully, reloading page...');
            
            // Clear all localStorage data to ensure clean state
            localStorage.clear();
            
            // Set a flag to force login popup after opening animation
            sessionStorage.setItem('coderunner_force_login_after_signout', 'true');
            
            // Reload the page to reset everything to system defaults
            window.location.reload();
            
        } catch (error) {
            console.error('❌ Sign out error:', error);
            this.showError('Failed to sign out');
            this.loading = false;
        }
    }

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        if (!this.auth || !this.currentUser) {
            this.showError('Authentication required');
            return;
        }
        
        this.loading = true;
        
        try {
            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                currentPassword
            );
            await this.currentUser.reauthenticateWithCredential(credential);
            
            // Update password
            await this.currentUser.updatePassword(newPassword);
            
            this.showSuccess('Password changed successfully!');
            this.clearInputs();
        } catch (error) {
            console.error('❌ Password change error:', error);
            this.showError(this.getAuthErrorMessage(error));
        } finally {
            this.loading = false;
        }
    }

    /**
     * Update display name
     */
    async updateDisplayName(displayName) {
        if (!this.auth || !this.currentUser) {
            this.showError('Authentication required');
            return;
        }
        
        this.loading = true;
        
        try {
            await this.currentUser.updateProfile({ displayName });
            
            // Update local profile
            if (this.userProfile) {
                this.userProfile.displayName = displayName;
                await this.saveUserProfile();
            }
            
            this.showSuccess('Display name updated successfully!');
        } catch (error) {
            console.error('❌ Display name update error:', error);
            this.showError('Failed to update display name');
        } finally {
            this.loading = false;
        }
    }

    /**
     * Get user-friendly error message
     */
    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No account found with this email';
            case 'auth/wrong-password':
                return 'Incorrect password';
            case 'auth/email-already-in-use':
                return 'Email already in use';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/requires-recent-login':
                return 'Please sign in again to change password';
            case 'auth/popup-closed-by-user':
                return 'Sign in was cancelled';
            default:
                return error.message || 'An error occurred';
        }
    }

    /**
     * Clear input fields
     */
    clearInputs() {
        Object.keys(this.inputFields).forEach(key => {
            this.inputFields[key].value = '';
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        this.errorMessage = message;
        this.successMessage = '';
        this.messageTimer = Date.now();
        console.error('👤 Error:', message);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.successMessage = message;
        this.errorMessage = '';
        this.messageTimer = Date.now();
        console.log('👤 Success:', message);
    }

    /**
     * Position UI elements
     */
    positionElements() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Position buttons based on current view
        this.buttons = {};
        
        if (this.currentView === 'main' || this.currentView === 'guest' || this.currentView === 'guestWelcome') {
            let items;
            if (this.currentView === 'guestWelcome') {
                items = this.menuItems.guestWelcome;
            } else {
                items = this.menuItems[this.isLoggedIn ? 'main' : 'guest'];
            }
            items.forEach((item, index) => {
                this.buttons[item.id] = {
                    x: centerX - 150,
                    y: centerY - 100 + (index * 60),
                    width: 300,
                    height: 45,
                    label: item.label,
                    description: item.description,
                    hovered: false
                };
            });
            
            // Add back button for main profile view
            if (this.currentView === 'main') {
                this.buttons['back'] = {
                    x: centerX - 100,
                    y: centerY + 150,
                    width: 200,
                    height: 40,
                    label: '⬅️ Back to Home',
                    description: 'Return to main menu',
                    hovered: false
                };
            }
        } else if (this.currentView === 'login') {
            // Login form buttons
            this.buttons['signIn'] = {
                x: centerX - 75,
                y: centerY + 20,
                width: 150,
                height: 40,
                label: 'Sign In',
                hovered: false
            };
            this.buttons['github'] = {
                x: centerX - 100,
                y: centerY + 80,
                width: 200,
                height: 40,
                label: '🐙 Sign in with GitHub',
                hovered: false
            };
            this.buttons['google'] = {
                x: centerX - 100,
                y: centerY + 140,
                width: 200,
                height: 40,
                label: '🔍 Sign in with Google',
                hovered: false
            };
            this.buttons['playAsGuest'] = {
                x: centerX - 100,
                y: centerY + 200,
                width: 200,
                height: 40,
                label: '🎮 Play as Guest',
                hovered: false
            };
        } else if (this.currentView === 'register') {
            // Register form buttons
            this.buttons['submitRegister'] = {
                x: centerX - 75,
                y: centerY + 80,
                width: 150,
                height: 40,
                label: 'Register',
                hovered: false
            };
            this.buttons['github'] = {
                x: centerX - 100,
                y: centerY + 140,
                width: 200,
                height: 40,
                label: '🐙 Sign in with GitHub',
                hovered: false
            };
            this.buttons['google'] = {
                x: centerX - 100,
                y: centerY + 200,
                width: 200,
                height: 40,
                label: '🔍 Sign in with Google',
                hovered: false
            };
        } else if (this.currentView === 'settings') {
            // Settings form buttons
            this.buttons['updateProfile'] = {
                x: centerX - 75,
                y: centerY + 80,
                width: 150,
                height: 40,
                label: 'Update Profile',
                hovered: false
            };
            this.buttons['changePassword'] = {
                x: centerX - 100,
                y: centerY + 140,
                width: 200,
                height: 40,
                label: 'Change Password',
                hovered: false
            };
        }
        
        // Position input fields
        let fieldY = centerY - 100;
        Object.keys(this.inputFields).forEach((key, index) => {
            const field = this.inputFields[key];
            field.x = centerX - 150;
            field.y = fieldY + (index * 60);
            field.width = 300;
            field.height = 40;
        });
    }

    /**
     * Handle key press events
     */
    handleKeyPress(e) {
        if (!this.isActive) return;
        
        if (e.key === 'Escape') {
            if (this.currentView === 'main' || this.currentView === 'guest') {
                this.stop();
                this.game.setGameState(GAME_STATES.MENU);
            } else {
                this.currentView = this.isLoggedIn ? 'main' : 'guest';
                this.positionElements();
            }
            return;
        }
        
        // Handle text input for focused fields
        if (this.focusedField) {
            this.handleTextInput(e);
        }
    }

    /**
     * Handle text input for form fields
     */
    handleTextInput(e) {
        if (!this.focusedField) return;
        
        const field = this.inputFields[this.focusedField];
        if (!field) return;
        
        if (e.key === 'Enter') {
            this.handleFormSubmit();
        } else if (e.key === 'Backspace') {
            field.value = field.value.slice(0, -1);
        } else if (e.key.length === 1) {
            field.value += e.key;
        }
    }

    /**
     * Handle form submission
     */
    handleFormSubmit() {
        if (this.loading) return;
        
        switch (this.currentView) {
            case 'login':
                this.handleLogin();
                break;
            case 'register':
                this.handleRegister();
                break;
            case 'settings':
                this.handleSettingsUpdate();
                break;
        }
    }

    /**
     * Handle login form submission
     */
    handleLogin() {
        const email = this.inputFields.email.value;
        const password = this.inputFields.password.value;
        
        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }
        
        this.signInWithEmail(email, password);
    }

    /**
     * Handle register form submission
     */
    handleRegister() {
        const email = this.inputFields.email.value;
        const password = this.inputFields.password.value;
        const confirmPassword = this.inputFields.confirmPassword.value;
        const displayName = this.inputFields.displayName.value;
        
        if (!email || !password || !confirmPassword) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return;
        }
        
        this.signUpWithEmail(email, password, displayName);
    }

    /**
     * Handle settings update
     */
    handleSettingsUpdate() {
        const displayName = this.inputFields.displayName.value;
        const currentPassword = this.inputFields.currentPassword.value;
        const newPassword = this.inputFields.newPassword.value;
        
        if (displayName !== this.userProfile?.displayName) {
            this.updateDisplayName(displayName);
        }
        
        if (currentPassword && newPassword) {
            this.changePassword(currentPassword, newPassword);
        }
    }

    /**
     * Handle mouse click events
     */
    handleClick(e) {
        if (!this.isActive) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check button clicks
        if (this.buttons && Object.keys(this.buttons).length > 0) {
            Object.keys(this.buttons).forEach(buttonId => {
                const button = this.buttons[buttonId];
                if (button && button.x !== undefined && button.y !== undefined &&
                    x >= button.x && x <= button.x + button.width &&
                    y >= button.y && y <= button.y + button.height) {
                    this.handleButtonClick(buttonId);
                }
            });
        }
        
        // Check input field clicks
        Object.keys(this.inputFields).forEach(fieldId => {
            const field = this.inputFields[fieldId];
            if (x >= field.x && x <= field.x + field.width &&
                y >= field.y && y <= field.y + field.height) {
                this.focusedField = fieldId;
            }
        });
    }

    /**
     * Handle button click
     */
    handleButtonClick(buttonId) {
        if (this.loading) return;
        
        switch (buttonId) {
            case 'login':
                this.currentView = 'login';
                this.positionElements();
                break;
            case 'register':
                this.currentView = 'register';
                this.positionElements();
                break;
            case 'playAsGuest':
                this.playAsGuest();
                break;
            case 'stats':
                this.currentView = 'stats';
                break;
            case 'syncCloud':
                this.handleCloudSync();
                break;
            case 'settings':
                this.currentView = 'settings';
                this.positionElements();
                break;
            case 'logout':
                this.showSignOutConfirm();
                break;
            case 'signIn':
                this.handleLogin();
                break;
            case 'github':
                this.signInWithGitHub();
                break;
            case 'google':
                this.signInWithGoogle();
                break;
            case 'submitRegister':
                this.handleRegister();
                break;
            case 'updateProfile':
                this.handleSettingsUpdate();
                break;
            case 'changePassword':
                this.handlePasswordChange();
                break;
            case 'saveSettings':
                this.saveAllSettings();
                break;
            case 'back':
                if (this.currentView === 'main') {
                    // Go back to home screen from main profile view
                    this.stop();
                    if (this.game && this.game.setGameState) {
                        this.game.setGameState('home');
                    }
                } else {
                    // Go back to main view from sub-views
                    this.currentView = 'main';
                    this.positionElements();
                }
                break;
            case 'confirmSignOut':
                this.confirmSignOut();
                break;
            case 'cancelSignOut':
                this.showSignOutConfirmation = false;
                break;
        }
    }

    /**
     * Handle mouse move events
     */
    handleMouseMove(e) {
        if (!this.isActive) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Update button hover states
        if (this.buttons && Object.keys(this.buttons).length > 0) {
            Object.keys(this.buttons).forEach(buttonId => {
                const button = this.buttons[buttonId];
                if (button && button.x !== undefined && button.y !== undefined) {
                    button.hovered = (x >= button.x && x <= button.x + button.width &&
                                    y >= button.y && y <= button.y + button.height);
                }
            });
        }
        
        // Update cursor
        this.canvas.style.cursor = (this.buttons && Object.values(this.buttons).some(b => b && b.hovered)) ? 'pointer' : 'default';
    }

    /**
     * Get display name for leaderboard
     */
    getLeaderboardDisplayName() {
        if (this.isLoggedIn && this.userProfile) {
            return this.userProfile.displayName || 
                   this.currentUser.displayName || 
                   this.currentUser.email?.split('@')[0] || 
                   'Anonymous';
        }
        return 'Guest';
    }

    /**
     * Get user avatar URL
     */
    getUserAvatarUrl() {
        if (this.isLoggedIn && this.currentUser) {
            return this.currentUser.photoURL || null;
        }
        return null;
    }

    /**
     * Load game settings from localStorage
     */
    loadGameSettings() {
        try {
            const saved = localStorage.getItem('gameSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.gameSettings = { ...this.gameSettings, ...settings };
            }
        } catch (error) {
            console.error('Error loading game settings:', error);
        }
    }
    
    /**
     * Save game settings to localStorage
     */
    saveGameSettings() {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(this.gameSettings));
        } catch (error) {
            console.error('Error saving game settings:', error);
        }
    }
    
    /**
     * Toggle game setting
     */
    toggleGameSetting(setting) {
        if (this.gameSettings.hasOwnProperty(setting)) {
            this.gameSettings[setting] = !this.gameSettings[setting];
            this.saveGameSettings();
            console.log(`${setting} toggled to:`, this.gameSettings[setting]);
        }
    }
    
    /**
     * Get game setting value
     */
    getGameSetting(setting) {
        return this.gameSettings[setting];
    }
    
    /**
     * Check if loading screen should be shown
     */
    shouldShowLoadingScreen() {
        return this.getGameSetting('showLoadingScreen');
    }
    
    /**
     * Check if opening animation should be shown
     */
    shouldShowOpeningAnimation() {
        return this.getGameSetting('showOpeningAnimation');
    }
    
    /**
     * Update animation
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        this.animationTime += deltaTime;
        
        // Update fade animation
        if (this.fadeAlpha < this.targetAlpha) {
            this.fadeAlpha = Math.min(this.targetAlpha, this.fadeAlpha + deltaTime * 3);
        }
        
        // Update slide animation
        if (this.slideOffset > 0) {
            this.slideOffset = Math.max(0, this.slideOffset - deltaTime * 150);
        }
        
        // Update message timer
        if (this.messageTimer > 0 && Date.now() - this.messageTimer > 3000) {
            this.errorMessage = '';
            this.successMessage = '';
            this.messageTimer = 0;
        }
    }

    /**
     * Render the user profile system
     */
    render() {
        if (!this.isActive) return;
        
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Save context
        ctx.save();
        
        // Apply fade effect
        ctx.globalAlpha = this.fadeAlpha;
        
        // Draw background
        this.drawBackground();
        
        // Draw content based on current view
        switch (this.currentView) {
            case 'main':
                this.drawMainMenu();
                break;
            case 'guest':
                this.drawGuestMenu();
                break;
            case 'login':
                this.drawLoginForm();
                break;
            case 'register':
                this.drawRegisterForm();
                break;
            case 'stats':
                this.drawStatsView();
                break;
            case 'settings':
                this.drawSettingsView();
                break;
        }
        
        // Draw messages
        this.drawMessages();
        
        // Draw loading indicator
        if (this.loading) {
            this.drawLoadingIndicator();
        }
        
        // Draw sign out confirmation dialog
        if (this.showSignOutConfirmation) {
            this.drawSignOutConfirmation();
        }
        
        // Restore context
        ctx.restore();
    }

    /**
     * Draw background
     */
    drawBackground() {
        const ctx = this.ctx;
        
        // Dark overlay with subtle animation
        const pulseAlpha = 0.8 + Math.sin(this.animationTime * 0.002) * 0.1;
        ctx.fillStyle = `rgba(0, 0, 0, ${pulseAlpha})`;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Animated gradient background
        const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        const hue1 = (this.animationTime * 0.0005) % 360;
        const hue2 = (hue1 + 60) % 360;
        gradient.addColorStop(0, `hsla(${hue1}, 70%, 20%, 0.2)`);
        gradient.addColorStop(0.5, `hsla(${hue2}, 60%, 25%, 0.15)`);
        gradient.addColorStop(1, `hsla(${hue1}, 70%, 20%, 0.2)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add floating particles
        this.drawFloatingParticles();
        
        // Add subtle grid pattern
        this.drawGridPattern();
    }
    
    /**
     * Draw floating particles for visual enhancement
     */
    drawFloatingParticles() {
        const ctx = this.ctx;
        
        // Initialize particles if not done
        if (!this.particles) {
            this.particles = [];
            for (let i = 0; i < 30; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 3 + 1,
                    opacity: Math.random() * 0.3 + 0.1,
                    hue: Math.random() * 360
                });
            }
        }
        
        // Update and draw particles
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
            
            // Draw particle
            ctx.save();
            ctx.globalAlpha = particle.opacity;
            ctx.fillStyle = `hsl(${particle.hue}, 70%, 60%)`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    
    /**
     * Draw subtle grid pattern
     */
    drawGridPattern() {
        const ctx = this.ctx;
        const gridSize = 50;
        
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Draw main menu (logged in)
     */
    drawMainMenu() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Title
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('👤 Profile', centerX, centerY - 180);
        
        // User info
        if (this.currentUser) {
            ctx.font = '18px Arial';
            ctx.fillStyle = '#a0a0a0';
            const userText = this.currentUser.displayName || this.currentUser.email;
            ctx.fillText(userText, centerX, centerY - 140);
        }
        
        // Menu buttons
        if (this.buttons && Object.keys(this.buttons).length > 0) {
            Object.keys(this.buttons).forEach(buttonId => {
                const button = this.buttons[buttonId];
                if (button) {
                    this.drawButton(button, button.hovered);
                }
            });
        }
    }

    /**
     * Draw guest menu (not logged in)
     */
    drawGuestMenu() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Title
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('👤 Account', centerX, centerY - 180);
        
        // Description
        ctx.font = '16px Arial';
        ctx.fillStyle = '#a0a0a0';
        ctx.fillText('Sign in to save your progress and compete on leaderboards', centerX, centerY - 140);
        
        // Menu buttons
        if (this.buttons && Object.keys(this.buttons).length > 0) {
            Object.keys(this.buttons).forEach(buttonId => {
                const button = this.buttons[buttonId];
                if (button) {
                    this.drawButton(button, button.hovered);
                }
            });
        }
    }

    /**
     * Draw login form
     */
    drawLoginForm() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Title
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('🔑 Sign In', centerX, centerY - 180);
        
        // Form fields
        this.drawInputField('email', 'Email');
        this.drawInputField('password', 'Password');
        
        // Draw buttons from this.buttons object
        if (this.buttons) {
            Object.keys(this.buttons).forEach(buttonId => {
                const button = this.buttons[buttonId];
                if (button) {
                    this.drawButton(button, button.hovered);
                }
            });
        }
        
        // Register link
        ctx.font = '14px Arial';
        ctx.fillStyle = '#3b82f6';
        ctx.textAlign = 'center';
        ctx.fillText('Don\'t have an account? Register here', centerX, centerY + 260);
        
        // Play as Guest link
        ctx.font = '14px Arial';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.fillText('Or play as guest without saving progress', centerX, centerY + 280);
    }

    /**
     * Draw register form
     */
    drawRegisterForm() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Title
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('📝 Create Account', centerX, centerY - 200);
        
        // Form fields
        this.drawInputField('email', 'Email');
        this.drawInputField('password', 'Password');
        this.drawInputField('confirmPassword', 'Confirm Password');
        this.drawInputField('displayName', 'Display Name (Optional)');
        
        // Draw buttons from this.buttons object
        if (this.buttons) {
            Object.keys(this.buttons).forEach(buttonId => {
                const button = this.buttons[buttonId];
                if (button) {
                    this.drawButton(button, button.hovered);
                }
            });
        }
        
        // Login link
        ctx.font = '14px Arial';
        ctx.fillStyle = '#3b82f6';
        ctx.textAlign = 'center';
        ctx.fillText('Already have an account? Sign in here', centerX, centerY + 260);
    }

    /**
     * Draw stats view
     */
    drawStatsView() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Title
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#58a6ff';
        ctx.textAlign = 'center';
        ctx.fillText('📊 Your Stats', centerX, centerY - 200);
        
        // Stats grid with enhanced styling
        const stats = [
            { label: 'High Score', value: this.userStats.highScore.toLocaleString(), color: '#ffd700' },
            { label: 'Games Played', value: this.userStats.gamesPlayed.toLocaleString(), color: '#40d158' },
            { label: 'Average Score', value: this.userStats.averageScore.toLocaleString(), color: '#58a6ff' },
            { label: 'Total Distance', value: `${Math.round(this.userStats.totalDistance)}m`, color: '#ff6b35' },
            { label: 'Datapackets Collected', value: this.userStats.dataPacketsCollected.toLocaleString(), color: '#ffd700' },
            { label: 'Total Jumps', value: this.userStats.totalJumps.toLocaleString(), color: '#a855f7' },
            { label: 'Power-ups Used', value: this.userStats.powerupsCollected.toLocaleString(), color: '#f59e0b' },
            { label: 'Play Time', value: this.formatTime(this.userStats.totalTime), color: '#06b6d4' }
        ];
        
        // Draw stats in a modern card-style grid
        const cols = 2;
        const cardWidth = 240;
        const cardHeight = 70;
        const spacing = 20;
        const totalWidth = (cols * cardWidth) + ((cols - 1) * spacing);
        const startX = centerX - (totalWidth / 2);
        const startY = centerY - 120;
        
        stats.forEach((stat, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + (col * (cardWidth + spacing));
            const y = startY + (row * (cardHeight + spacing));
            
            // Card background with gradient
            const gradient = ctx.createLinearGradient(x, y, x, y + cardHeight);
            gradient.addColorStop(0, 'rgba(33, 38, 45, 0.9)');
            gradient.addColorStop(1, 'rgba(21, 32, 43, 0.8)');
            ctx.fillStyle = gradient;
            this.drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 8);
            ctx.fill();
            
            // Card border
            ctx.strokeStyle = '#30363d';
            ctx.lineWidth = 1;
            this.drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 8);
            ctx.stroke();
            
            // Stat label
            ctx.font = '14px Arial';
            ctx.fillStyle = '#8b949e';
            ctx.textAlign = 'left';
            ctx.fillText(stat.label, x + 15, y + 25);
            
            // Stat value with color
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = stat.color;
            ctx.fillText(stat.value, x + 15, y + 50);
        });
        
        // Back button
        this.buttons = {
            back: {
                x: centerX - 100,
                y: centerY + 180,
                width: 200,
                height: 40,
                hovered: false
            }
        };
        
        const backButton = this.buttons.back;
        
        // Button background
        const buttonGradient = ctx.createLinearGradient(backButton.x, backButton.y, backButton.x, backButton.y + backButton.height);
        buttonGradient.addColorStop(0, backButton.hovered ? '#1f6feb' : '#21262d');
        buttonGradient.addColorStop(1, backButton.hovered ? '#0d47a1' : '#161b22');
        ctx.fillStyle = buttonGradient;
        this.drawRoundedRect(ctx, backButton.x, backButton.y, backButton.width, backButton.height, 8);
        ctx.fill();
        
        // Button border
        ctx.strokeStyle = backButton.hovered ? '#58a6ff' : '#30363d';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, backButton.x, backButton.y, backButton.width, backButton.height, 8);
        ctx.stroke();
        
        // Button text
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⬅️ Back', backButton.x + backButton.width / 2, backButton.y + 26);
    }

    /**
     * Draw settings view
     */
    drawSettingsView() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Title
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#58a6ff';
        ctx.textAlign = 'center';
        ctx.fillText('⚙️ Account Settings', centerX, centerY - 250);
        
        // Current account info
        if (this.currentUser) {
            ctx.font = '16px Arial';
            ctx.fillStyle = '#8b949e';
            ctx.fillText(`Account: ${this.currentUser.email}`, centerX, centerY - 210);
            ctx.fillText(`Provider: ${this.getAuthProvider().toUpperCase()}`, centerX, centerY - 190);
        }
        
        // Account section
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'left';
        ctx.fillText('Account Information', centerX - 250, centerY - 150);
        
        // Form fields
        this.drawInputField('displayName', 'Display Name');
        
        // Only show password fields for email accounts
        if (this.getAuthProvider() === 'email') {
            this.drawInputField('currentPassword', 'Current Password');
            this.drawInputField('newPassword', 'New Password');
        }
        
        // Initialize buttons object for this view
        this.buttons = {};
        
        // Save button
        this.buttons['saveSettings'] = {
            x: centerX - 100,
            y: centerY + 200,
            width: 100,
            height: 40,
            hovered: false
        };
        
        const saveButton = this.buttons.saveSettings;
        const saveGradient = ctx.createLinearGradient(saveButton.x, saveButton.y, saveButton.x, saveButton.y + saveButton.height);
        saveGradient.addColorStop(0, saveButton.hovered ? '#238636' : '#21262d');
        saveGradient.addColorStop(1, saveButton.hovered ? '#1a6b2e' : '#161b22');
        ctx.fillStyle = saveGradient;
        this.drawRoundedRect(ctx, saveButton.x, saveButton.y, saveButton.width, saveButton.height, 8);
        ctx.fill();
        
        ctx.strokeStyle = saveButton.hovered ? '#40d158' : '#30363d';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, saveButton.x, saveButton.y, saveButton.width, saveButton.height, 8);
        ctx.stroke();
        
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💾 Save', saveButton.x + saveButton.width / 2, saveButton.y + 26);
        
        // Back button
        this.buttons['back'] = {
            x: centerX + 20,
            y: centerY + 200,
            width: 100,
            height: 40,
            hovered: false
        };
        
        const backButton = this.buttons.back;
        const backGradient = ctx.createLinearGradient(backButton.x, backButton.y, backButton.x, backButton.y + backButton.height);
        backGradient.addColorStop(0, backButton.hovered ? '#1f6feb' : '#21262d');
        backGradient.addColorStop(1, backButton.hovered ? '#0d47a1' : '#161b22');
        ctx.fillStyle = backGradient;
        this.drawRoundedRect(ctx, backButton.x, backButton.y, backButton.width, backButton.height, 8);
        ctx.fill();
        
        ctx.strokeStyle = backButton.hovered ? '#58a6ff' : '#30363d';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, backButton.x, backButton.y, backButton.width, backButton.height, 8);
        ctx.stroke();
        
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⬅️ Back', backButton.x + backButton.width / 2, backButton.y + 26);
    }

    /**
     * Draw input field with enhanced styling
     */
    drawInputField(fieldId, label) {
        const field = this.inputFields[fieldId];
        if (!field) return;
        
        const ctx = this.ctx;
        const focused = this.focusedField === fieldId;
        
        // Field container with glow effect
        ctx.save();
        
        if (focused) {
            ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
            ctx.shadowBlur = 20;
        }
        
        // Field background with gradient
        const gradient = ctx.createLinearGradient(field.x, field.y, field.x, field.y + field.height);
        if (focused) {
            gradient.addColorStop(0, 'rgba(30, 41, 59, 0.9)');
            gradient.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
        } else {
            gradient.addColorStop(0, 'rgba(30, 41, 59, 0.7)');
            gradient.addColorStop(1, 'rgba(15, 23, 42, 0.7)');
        }
        ctx.fillStyle = gradient;
        
        // Rounded field background
        this.drawRoundedRect(ctx, field.x, field.y, field.width, field.height, 8);
        ctx.fill();
        
        // Field border
        ctx.strokeStyle = focused ? 'rgba(59, 130, 246, 0.8)' : 'rgba(100, 116, 139, 0.5)';
        ctx.lineWidth = focused ? 3 : 2;
        ctx.stroke();
        
        // Inner border highlight
        if (focused) {
            ctx.strokeStyle = 'rgba(147, 197, 253, 0.3)';
            ctx.lineWidth = 1;
            this.drawRoundedRect(ctx, field.x + 1, field.y + 1, field.width - 2, field.height - 2, 7);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Label with enhanced typography
        ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = focused ? '#60a5fa' : '#cbd5e1';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, field.x, field.y - 8);
        
        // Value text with better spacing
        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        
        let displayValue = field.value;
        if (field.type === 'password' && displayValue) {
            displayValue = '•'.repeat(displayValue.length);
        }
        
        // Add placeholder text if empty
        if (!displayValue && field.placeholder) {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
            displayValue = field.placeholder;
        }
        
        ctx.fillText(displayValue, field.x + 15, field.y + field.height / 2);
        
        // Animated cursor
        if (focused) {
            const textWidth = ctx.measureText(field.value).width;
            const cursorAlpha = (Math.sin(this.animationTime * 0.008) + 1) / 2;
            ctx.fillStyle = `rgba(59, 130, 246, ${cursorAlpha})`;
            ctx.fillRect(field.x + 15 + textWidth, field.y + 8, 2, field.height - 16);
        }
    }

    /**
     * Draw button with enhanced visual effects
     */
    drawButton(button, hovered) {
        const ctx = this.ctx;
        
        // Button animation
        const scale = hovered ? 1.05 : 1.0;
        const alpha = hovered ? 1.0 : 0.9;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Transform for scale effect
        ctx.translate(button.x + button.width / 2, button.y + button.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-button.width / 2, -button.height / 2);
        
        // Button shadow
        if (hovered) {
            ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;
        }
        
        // Button background with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, button.height);
        if (hovered) {
            gradient.addColorStop(0, 'rgba(79, 172, 254, 0.9)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.9)');
        } else {
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.7)');
            gradient.addColorStop(1, 'rgba(37, 99, 235, 0.7)');
        }
        ctx.fillStyle = gradient;
        
        // Rounded rectangle
        this.drawRoundedRect(ctx, 0, 0, button.width, button.height, 12);
        ctx.fill();
        
        // Button border
        ctx.strokeStyle = hovered ? 'rgba(147, 197, 253, 0.8)' : 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, 0, 0, button.width, button.height, 12);
        ctx.stroke();
        
        // Inner highlight
        ctx.strokeStyle = hovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, 1, 1, button.width - 2, button.height - 2, 11);
        ctx.stroke();
        
        // Button text with glow effect
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = hovered ? 8 : 4;
        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.label, button.width / 2, button.height / 2);
        
        ctx.restore();
    }
    
    /**
     * Draw rounded rectangle helper method
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Draw messages
     */
    drawMessages() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const messageY = 100;
        
        if (this.errorMessage) {
            // Error message background
            const gradient = ctx.createLinearGradient(centerX - 200, messageY - 20, centerX + 200, messageY + 20);
            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
            gradient.addColorStop(1, 'rgba(220, 38, 38, 0.9)');
            ctx.fillStyle = gradient;
            this.drawRoundedRect(ctx, centerX - 200, messageY - 20, 400, 40, 8);
            ctx.fill();
            
            // Error message text
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.errorMessage, centerX, messageY);
        }
        
        if (this.successMessage) {
            // Success message background
            const gradient = ctx.createLinearGradient(centerX - 200, messageY - 20, centerX + 200, messageY + 20);
            gradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)');
            gradient.addColorStop(1, 'rgba(22, 163, 74, 0.9)');
            ctx.fillStyle = gradient;
            this.drawRoundedRect(ctx, centerX - 200, messageY - 20, 400, 40, 8);
            ctx.fill();
            
            // Success message text
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.successMessage, centerX, messageY);
        }
        
        // Cloud sync message
        if (this.syncMessage && this.syncMessageTimer && Date.now() - this.syncMessageTimer < 3000) {
            const syncMessageY = messageY + 50;
            let bgColor, textColor;
            
            switch (this.syncMessageType) {
                case 'success':
                    bgColor = 'rgba(34, 197, 94, 0.9)';
                    textColor = '#ffffff';
                    break;
                case 'error':
                    bgColor = 'rgba(239, 68, 68, 0.9)';
                    textColor = '#ffffff';
                    break;
                case 'warning':
                    bgColor = 'rgba(245, 158, 11, 0.9)';
                    textColor = '#ffffff';
                    break;
                default:
                    bgColor = 'rgba(59, 130, 246, 0.9)';
                    textColor = '#ffffff';
            }
            
            // Sync message background
            ctx.fillStyle = bgColor;
            this.drawRoundedRect(ctx, centerX - 200, syncMessageY - 20, 400, 40, 8);
            ctx.fill();
            
            // Sync message text
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.syncMessage, centerX, syncMessageY);
        }
    }

    /**
     * Draw loading indicator
     */
    drawLoadingIndicator() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Loading background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Loading spinner
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.animationTime * 0.005);
        
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 1.5);
        ctx.stroke();
        
        ctx.restore();
        
        // Loading text
        ctx.font = '16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', centerX, centerY + 60);
    }

    /**
     * Format time in seconds to readable format
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Track game completion (only called when player actually finishes a game)
     */
    trackGameCompletion() {
        // Mark this as an actual game completion
        this.actualGameCompleted = true;
        
        // Update stats with real game data only
        if (this.game && this.game.bestScores) {
            this.userStats.highScore = Math.max(...Object.values(this.game.bestScores));
        }
        
        // Set join date if it's the first time
        if (!this.userStats.joinDate) {
            this.userStats.joinDate = new Date().toISOString();
        }
    }

    /**
     * Show message (used for both error and success)
     */
    showMessage(message, type = 'info') {
        if (type === 'error') {
            this.showError(message);
        } else {
            this.showSuccess(message);
        }
    }

    /**
     * Save all settings including game settings
     */
    saveAllSettings() {
        this.saveGameSettings();
        if (this.isLoggedIn) {
            this.saveGameSettingsToCloud();
        }
    }

    /**
     * Save game settings to cloud storage
     */
    async saveGameSettingsToCloud() {
        if (!this.isLoggedIn || !this.currentUser || !this.firestore) return;
        
        try {
            const userRef = this.firestore.collection('users').doc(this.currentUser.uid);
            await userRef.update({
                gameSettings: this.gameSettings,
                lastUpdated: new Date().toISOString()
            });
            console.log('✅ Game settings saved to cloud');
        } catch (error) {
            console.error('❌ Error saving game settings to cloud:', error);
            throw error;
        }
    }

    /**
     * Load game settings from cloud storage
     */
    async loadGameSettingsFromCloud() {
        if (!this.isLoggedIn || !this.currentUser || !this.firestore) return;
        
        try {
            const userRef = this.firestore.collection('users').doc(this.currentUser.uid);
            const doc = await userRef.get();
            
            if (doc.exists) {
                const data = doc.data();
                if (data.gameSettings) {
                    this.gameSettings = { ...this.gameSettings, ...data.gameSettings };
                    console.log('✅ Game settings loaded from cloud');
                }
            }
        } catch (error) {
            console.error('❌ Error loading game settings from cloud:', error);
        }
    }
    
    /**
     * Show sign out confirmation dialog
     */
    showSignOutConfirm() {
        this.showSignOutConfirmation = true;
    }
     
    /**
     * Confirm sign out
     */
    async confirmSignOut() {
        await this.signOut();
        this.showSignOutConfirmation = false;
    }
    
    /**
     * Draw sign out confirmation dialog
     */
    drawSignOutConfirmation() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dialog box
        const dialogWidth = 400;
        const dialogHeight = 200;
        const dialogX = centerX - dialogWidth / 2;
        const dialogY = centerY - dialogHeight / 2;
        
        // Dialog background
        const gradient = ctx.createLinearGradient(dialogX, dialogY, dialogX, dialogY + dialogHeight);
        gradient.addColorStop(0, 'rgba(33, 38, 45, 0.95)');
        gradient.addColorStop(1, 'rgba(21, 32, 43, 0.95)');
        ctx.fillStyle = gradient;
        this.drawRoundedRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 12);
        ctx.fill();
        
        // Dialog border
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 12);
        ctx.stroke();
        
        // Title
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🚪 Sign Out', centerX, dialogY + 50);
        
        // Message
        ctx.fillStyle = '#8b949e';
        ctx.font = '16px Arial';
        ctx.fillText('Are you sure you want to sign out?', centerX, dialogY + 90);
        
        // Buttons
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonY = dialogY + 130;
        
        // Confirm button
        const confirmX = centerX - buttonWidth - 10;
        ctx.fillStyle = '#dc2626';
        this.drawRoundedRect(ctx, confirmX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, confirmX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('✓ Yes, Sign Out', confirmX + buttonWidth / 2, buttonY + 26);
        
        // Cancel button
        const cancelX = centerX + 10;
        ctx.fillStyle = '#374151';
        this.drawRoundedRect(ctx, cancelX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, cancelX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('✕ Cancel', cancelX + buttonWidth / 2, buttonY + 26);
        
        // Store button areas for clicking
        this.buttons = {
            confirmSignOut: {
                x: confirmX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                hovered: false
            },
            cancelSignOut: {
                x: cancelX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                hovered: false
            }
        };
    }

    /**
     * Handle password change from settings
     */
    async handlePasswordChange() {
        const currentPassword = this.inputFields.currentPassword?.value;
        const newPassword = this.inputFields.newPassword?.value;
        
        if (!currentPassword || !newPassword) {
            this.showError('Please fill in both password fields');
            return;
        }
        
        if (newPassword.length < 6) {
            this.showError('New password must be at least 6 characters');
            return;
        }
        
        await this.changePassword(currentPassword, newPassword);
    }

    /**
     * Play as guest without authentication
     */
    playAsGuest() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.userProfile = null;
        this.currentView = 'guest';
        
        // Initialize guest profile
        this.initializeGuestProfile();
        
        // Close profile system and start game
        this.stop();
        this.game.setGameState(GAME_STATES.PLAYING);
        
        this.showSuccess('Playing as guest!');
        console.log('👤 Playing as guest');
    }

    /**
     * Initialize guest profile with default values
     */
    initializeGuestProfile() {
        this.userProfile = {
            uid: 'guest',
            email: 'guest@local',
            displayName: 'Guest Player',
            provider: 'guest',
            joinDate: new Date().toISOString(),
            avatar: null
        };
        
        // Initialize guest stats
        this.userStats = {
            gamesPlayed: 0,
            dataPacketsCollected: 0,
            highScore: 0,
            totalPlayTime: 0,
            joinDate: new Date().toISOString(),
            level: 1,
            achievements: []
        };
    }

    /**
     * Initialize stats with real game data only
     */
    initializeRealStats() {
        // Update stats with real game data if available
        if (this.game && this.game.bestScores) {
            this.userStats.highScore = Math.max(...Object.values(this.game.bestScores));
        }
        
        // Set join date if it's the first time
        if (!this.userStats.joinDate) {
            this.userStats.joinDate = new Date().toISOString();
        }
        
        // Initialize actualGameCompleted flag
        this.actualGameCompleted = false;
        
        console.log('📊 Real stats initialized');
    }
    
    /**
     * Handle manual cloud sync
     */
    async handleCloudSync() {
        if (!this.isLoggedIn || !this.game || !this.game.cloudSaveSystem) {
            this.showMessage('❌ Cloud sync not available', 'error');
            return;
        }
        
        this.loading = true;
        this.showMessage('🔄 Syncing with cloud...', 'info');
        
        try {
            const success = await this.game.cloudSaveSystem.syncWithCloud();
            
            if (success) {
                this.showMessage('✅ Successfully synced with cloud!', 'success');
                console.log('☁️ Manual cloud sync completed successfully');
            } else {
                this.showMessage('⚠️ Cloud sync completed with warnings', 'warning');
                console.log('☁️ Manual cloud sync completed with issues');
            }
        } catch (error) {
            console.error('❌ Manual cloud sync failed:', error);
            this.showMessage('❌ Failed to sync with cloud', 'error');
        } finally {
            this.loading = false;
        }
    }
    
    /**
     * Show a temporary message to the user
     */
    showMessage(message, type = 'info') {
        this.syncMessage = message;
        this.syncMessageType = type;
        this.syncMessageTimer = Date.now();
        
        // Clear message after 3 seconds
        setTimeout(() => {
            if (this.syncMessageTimer && Date.now() - this.syncMessageTimer >= 3000) {
                this.syncMessage = '';
                this.syncMessageType = '';
                this.syncMessageTimer = 0;
            }
        }, 3000);
    }
}
