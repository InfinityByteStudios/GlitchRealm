/**
 * Game Navigation an        } else if (newState === GAME_STATES.LOGIN_PROMPT && this.game.loginSystem) {
            console.log('🔑 Starting login system for login prompt');
            console.log('🔑 LoginSystem exists:', !!this.game.loginSystem);
            console.log('🔑 LoginSystem shouldShow():', this.game.loginSystem.shouldShow());
            if (this.game.loginSystem.shouldShow()) {
                console.log('🔑 Calling loginSystem.start()');
                this.game.loginSystem.start();
            } else {
                console.log('🔑 Login system should not show, redirecting to home');
                this.game.gameState = GAME_STATES.HOME;
            }
        } else if (newState === GAME_STATES.PROFILE && this.game.userProfileSystem) {anagement
 */

import { GAME_STATES } from '../utils/constants.js';

export class GameNavigation {
    constructor(game) {
        this.game = game;
        // Navigation history stack to support multi-level back navigation
        this.navigationHistory = [];
        this.maxHistorySize = 10; // Prevent infinite growth
    }

    /**
     * Set game state with transition logic
     */
    setGameState(newState) {
        const oldState = this.game.gameState;
        console.log(`🎮 GameNavigation.setGameState: ${oldState} → ${newState}`);
        this.game.gameState = newState;
        
        // Handle state change logic
        if (newState === GAME_STATES.OPENING_ANIMATION && this.game.openingAnimation) {
            console.log('🎬 Starting opening animation system');
            this.game.openingAnimation.start();
        } else if (newState === GAME_STATES.LOGIN_PROMPT && this.game.loginSystem) {
            console.log('� Starting login system for login prompt');
            if (this.game.loginSystem.shouldShow()) {
                this.game.loginSystem.start();
            } else {
                console.log('🔑 Login system should not show, redirecting to home');
                this.game.gameState = GAME_STATES.HOME;
            }
        } else if (newState === GAME_STATES.PROFILE && this.game.userProfileSystem) {
            console.log('👤 Starting user profile system for profile view');
            this.game.userProfileSystem.start();
        }
        
        console.log(`🎮 Game state changed: ${oldState} → ${newState}`);
    }

    /**
     * Navigate to a new game state and track previous state for back navigation
     */
    navigateToState(newState) {
        // Don't track navigation to/from certain states
        const skipTracking = [
            GAME_STATES.LOGIN_PROMPT,
            GAME_STATES.VIDEO_INTRO,
            GAME_STATES.OPENING_ANIMATION,
            GAME_STATES.POST_ANIMATION_POPUP,
            GAME_STATES.PLAYING
            // Note: PAUSED removed from skipTracking so pause menu navigation works properly
            // Note: GAME_OVER removed from skipTracking so death menu navigation works properly
        ];
        
        // Store previous state in history stack if current state should be tracked
        if (this.game.gameState && !skipTracking.includes(this.game.gameState) && !skipTracking.includes(newState)) {
            // Only add to history if it's different from the last entry (prevent duplicates)
            const lastHistoryState = this.navigationHistory[this.navigationHistory.length - 1];
            if (lastHistoryState !== this.game.gameState) {
                this.navigationHistory.push(this.game.gameState);
                
                // Limit history size to prevent memory issues
                if (this.navigationHistory.length > this.maxHistorySize) {
                    this.navigationHistory.shift(); // Remove oldest entry
                }
            }
            
            // Keep the legacy previousGameState for backward compatibility
            this.game.previousGameState = this.game.gameState;
            console.log(`🔄 Navigation: ${this.game.gameState} → ${newState} (history: [${this.navigationHistory.join(' → ')}])`);
        }
        
        // Handle exiting states
        if (this.game.gameState === GAME_STATES.TUTORIAL && newState !== GAME_STATES.TUTORIAL && this.game.tutorialSystem) {
            // Stop tutorial when leaving tutorial state
            this.game.tutorialSystem.stopTutorial();
            console.log('🎓 Exiting tutorial state - stopping tutorial');
        }
        
        this.game.gameState = newState;
        
        // Manage page scrolling based on game state
        if (newState === GAME_STATES.PLAYING || newState === GAME_STATES.PAUSED) {
            // Prevent scrolling during gameplay
            document.body.classList.add('game-focused');
            console.log('🔒 Preventing page scroll for gameplay state:', newState);
        } else {
            // Allow scrolling for all menu states
            document.body.classList.remove('game-focused');
            console.log('📜 Allowing page scroll for menu state:', newState);
        }
        
        // Start music when entering home screen
        if (newState === GAME_STATES.HOME && this.game.audioSystem) {
            console.log('🎵 Starting music on home screen');
            this.game.audioSystem.playMusic('chill');
        }
        
        // Reset animations for menu systems when entering them
        if (newState === GAME_STATES.OPTIONS && this.game.optionsSystem) {
            this.game.optionsSystem.resetAnimations();
        } else if (newState === GAME_STATES.SETTINGS && this.game.settingsSystem) {
            this.game.settingsSystem.resetAnimations();
        } else if (newState === GAME_STATES.CREDITS && this.game.creditsSystem) {
            this.game.creditsSystem.resetAnimations();
        } else if (newState === GAME_STATES.SHOP && this.game.shopSystem) {
            this.game.shopSystem.resetAnimations();
        } else if (newState === GAME_STATES.ACHIEVEMENTS && this.game.achievementSystem) {
            this.game.achievementSystem.resetAnimations();
            // Reset category filter and scroll when entering achievements
            this.game.achievementCategory = 'all';
            this.game.achievementsScrollOffset = 0;
        } else if (newState === GAME_STATES.CHARACTER_CUSTOMIZATION && this.game.characterCustomizationSystem) {
            this.game.characterCustomizationSystem.resetAnimations();
        } else if (newState === GAME_STATES.TUTORIAL && this.game.tutorialSystem) {
            // Start the tutorial when entering tutorial state
            this.game.tutorialSystem.startTutorial('welcome');
            console.log('🎓 Tutorial state entered - starting tutorial');
        }
    }

    /**
     * Show leaderboard screen
     */
    showLeaderboard() {
        this.navigateToState(GAME_STATES.LEADERBOARD);
    }

    /**
     * Show difficulty selection screen
     */
    showDifficultySelection() {
        this.navigateToState(GAME_STATES.DIFFICULTY_SELECT);
    }

    /**
     * Show profile screen
     */
    showProfile() {
        this.navigateToState(GAME_STATES.PROFILE);
    }

    /**
     * Toggle changelog display
     */
    toggleChangelog() {
        if (this.game.gameState === GAME_STATES.CHANGELOG) {
            // Go back to previous state or home
            const backState = this.game.previousGameState || GAME_STATES.HOME;
            this.navigateToState(backState);
        } else {
            this.navigateToState(GAME_STATES.CHANGELOG);
        }
    }

    /**
     * Handle continue action (resume game or continue to next level)
     */
    handleContinue() {
        switch (this.game.gameState) {
            case GAME_STATES.PAUSED:
                this.game.togglePause();
                break;
                
            case GAME_STATES.GAME_OVER:
                // Restart the game
                this.game.restart();
                break;
                
            case GAME_STATES.TUTORIAL:
                // Exit tutorial and go to game
                this.game.startGame();
                break;
                
            default:
                console.log('Continue action not applicable in current state:', this.game.gameState);
                break;
        }
    }

    /**
     * Handle confirm action (context-dependent)
     */
    handleConfirm() {
        switch (this.game.gameState) {
            case GAME_STATES.DIFFICULTY_SELECT:
                // Start game with current difficulty
                this.game.startGame();
                break;
                
            case GAME_STATES.LEADERBOARD:
                // Upload score if applicable
                this.game.handleUploadScore();
                break;
                
            case GAME_STATES.GAME_OVER:
                // Restart game
                this.game.restart();
                break;
                
            case GAME_STATES.TUTORIAL:
                // Advance tutorial or exit
                if (this.game.tutorialSystem) {
                    this.game.tutorialSystem.handleConfirm();
                }
                break;
                
            default:
                console.log('Confirm action not applicable in current state:', this.game.gameState);
                break;
        }
    }

    /**
     * Handle home key press
     */
    handleHomeKey() {
        // Clear navigation history when going home directly
        this.clearNavigationHistory();
        // Go to home screen from any state
        this.navigateToState(GAME_STATES.HOME);
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.game.gameState === GAME_STATES.PLAYING) {
            this.game.isPaused = true;
            this.game.pauseStartTime = Date.now(); // Set pause start time for fade animation
            this.navigateToState(GAME_STATES.PAUSED);
            
            // Pause audio if available
            if (this.game.audioSystem) {
                this.game.audioSystem.onPause();
            }
            
            console.log('🎮 Game paused');
        } else if (this.game.gameState === GAME_STATES.PAUSED) {
            this.game.isPaused = false;
            this.game.pauseStartTime = null; // Clear pause start time
            this.navigateToState(GAME_STATES.PLAYING);
            
            // Resume audio if available
            if (this.game.audioSystem) {
                this.game.audioSystem.onResume();
            }
            
            console.log('🎮 Game resumed');
        }
    }

    /**
     * Handle tutorial toggle
     */
    handleTutorialToggle() {
        if (this.game.gameState === GAME_STATES.TUTORIAL) {
            // Exit tutorial
            const backState = this.game.previousGameState || GAME_STATES.HOME;
            this.navigateToState(backState);
        } else {
            // Enter tutorial
            this.navigateToState(GAME_STATES.TUTORIAL);
        }
    }

    /**
     * Handle shop toggle
     */
    handleShopToggle() {
        if (this.game.gameState === GAME_STATES.SHOP) {
            // Exit shop
            const backState = this.game.previousGameState || GAME_STATES.HOME;
            this.navigateToState(backState);
        } else {
            // Enter shop
            this.navigateToState(GAME_STATES.SHOP);
        }
    }

    /**
     * Start a new game
     */
    async startGame() {
        console.log(`🎮 Starting game with difficulty: ${this.game.selectedDifficulty}`);
        
        // Initialize game objects
        await this.initializeGameObjects();
        
        // Reset game state
        this.resetGameState();
        
        // Track achievement for game start
        if (this.game.achievementSystem) {
            this.game.achievementSystem.trackEvent('gameStart');
        }
        
        // Start background music
        if (this.game.audioSystem && typeof this.game.audioSystem.playMusic === 'function') {
            this.game.audioSystem.playMusic();
        }
        
        // Transition to playing state
        this.navigateToState(GAME_STATES.PLAYING);
        
        // Focus canvas for input
        this.game.initialization.ensureCanvasFocus();
        
        console.log('🎮 Game started successfully');
    }

    /**
     * Restart the current game
     */
    async restart() {
        console.log('🎮 Restarting game');
        
        // Reset game state
        this.resetGameState();
        
        // Reinitialize game objects
        await this.initializeGameObjects();
        
        // Transition to playing state
        this.navigateToState(GAME_STATES.PLAYING);
        
        // Focus canvas for input
        this.game.initialization.ensureCanvasFocus();
        
        console.log('🎮 Game restarted');
    }

    /**
     * End the current game
     */
    endGame(reason = 'Game Over', message = null) {
        console.log(`🎮 Game ended: ${reason}`);
        
        // Set game over data
        this.game.gameOverReason = reason;
        this.game.gameOverMessage = message;
        this.game.gameOverStartTime = Date.now();
        
        // Track achievement for game end
        if (this.game.achievementSystem && this.game.player) {
            const gameData = {
                distance: this.game.score || 0,
                runTime: (Date.now() - this.game.gameStartTime) || 0
            };
            this.game.achievementSystem.trackEvent('gameEnd', gameData);
        }
        
        // Check for new high score
        this.checkHighScore();
        
        // Trigger cloud save for logged-in users
        if (this.game.cloudSaveSystem && this.game.cloudSaveSystem.isUserLoggedIn()) {
            this.game.cloudSaveSystem.saveAllGameData().catch(error => {
                console.warn('Failed to save game data to cloud after game end:', error);
            });
        }
        
        // Stop background music and play game over sound
        if (this.game.audioSystem) {
            this.game.audioSystem.stopMusic();
            this.game.audioSystem.onGameOver();
        }
        
        // Transition to game over state
        this.navigateToState(GAME_STATES.GAME_OVER);
        
        // Trigger screen shake effect
        if (this.game.gameLoop) {
            this.game.gameLoop.triggerScreenShake(10, 500);
        }
    }

    /**
     * Initialize game objects for a new game
     */
    async initializeGameObjects() {
        try {
            // Dynamic imports for game objects
            const { WorldGenerator } = await import('./WorldGenerator.js');
            const { Player } = await import('./player.js');
            const { PhysicsEngine } = await import('../physics/physicsengine.js');
            
            // Create world generator
            this.game.world = new WorldGenerator(this.game);
            console.log('🌍 World generator created');
            
            // Create player at starting position (0 meters distance)
            this.game.player = new Player(0, 200, this.game); // Start at x=0 for 0 meters distance
            console.log('👤 Player created');
            
            // Force load the selected sprite after player creation to ensure it's applied
            if (this.game.player && this.game.player.loadSelectedSprite) {
                // Small delay to ensure ProfileManager is fully ready
                setTimeout(() => {
                    this.game.player.loadSelectedSprite();
                    console.log('🎭 Forced sprite reload after player creation');
                }, 100);
            }
            
            // Reapply all owned shop upgrades to the new player instance
            if (this.game.shopSystem) {
                const ownedUpgrades = this.game.shopSystem.getOwnedUpgrades();
                
                // Store the current selected sprite before applying upgrades
                let selectedSprite = null;
                if (typeof window !== 'undefined' && window.profileManager) {
                    selectedSprite = window.profileManager.getSelectedSprite();
                }
                
                for (const upgradeId of ownedUpgrades) {
                    const upgrade = this.game.shopSystem.upgradeData[upgradeId];
                    if (upgrade) {
                        this.game.shopSystem.applyUpgradeEffect(upgradeId, upgrade);
                    }
                }
                
                // Restore the user's selected sprite after upgrades are applied
                if (selectedSprite && typeof window !== 'undefined' && window.profileManager) {
                    window.profileManager.profileData.selectedSprite = selectedSprite;
                    window.profileManager.saveProfile();
                    
                    // Apply the selected sprite to the player
                    if (this.game.player && this.game.player.loadSelectedSprite) {
                        this.game.player.loadSelectedSprite();
                    }
                }
                
                console.log(`🔄 Reapplied ${ownedUpgrades.length} shop upgrades to new player`);
            }
            
            // Create physics engine with world
            this.game.physics = new PhysicsEngine(this.game.world);
            console.log('⚡ Physics engine created');
            
            // Reset camera
            this.game.camera = { x: 0, y: 0 };
            
            console.log('✅ Game objects initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize game objects:', error);
            throw error;
        }
    }

    /**
     * Reset game state for a new game
     */
    resetGameState() {
        // Reset score and timing
        this.game.score = 0;
        this.game.bonusScore = 0;
        this.game.startTime = Date.now();
        
        // Reset game over data
        this.game.gameOverReason = null;
        this.game.gameOverMessage = null;
        this.game.gameOverStartTime = null;
        this.game.isNewHighScore = false;
        
        // Reset pause state
        this.game.isPaused = false;
        this.game.wasPlayingBeforeDropdown = false;
        this.game.wasAutoPaused = false;
        
        // Reset adaptive difficulty
        this.game.adaptiveDifficultyMultiplier = 1.0;
        this.game.playerPerformanceHistory = [];
        this.game.lastPerformanceCheck = 0;
        this.game.consecutiveSuccesses = 0;
        this.game.consecutiveFailures = 0;
        
        // Reset speed penalty system
        this.game.speedPenalty = {
            enabled: true,
            segmentDistance: 1000,
            timeLimit: 15000,
            penalty: 100,
            lastCheckpoint: 0,
            segmentStartTime: 0,
            totalPenalties: 0,
            totalPenaltyPoints: 0
        };
        
        // Reset visual effects
        this.game.milestoneEffects = [];
        this.game.speedPenaltyEffects = [];
        
        // Reset screen shake
        this.game.currentShake = { x: 0, y: 0, intensity: 0, duration: 0 };
        
        // Reset PowerUp system - clear all active powerups
        if (this.game.powerUpSystem) {
            this.game.powerUpSystem.reset();
        }
        
        console.log('🔄 Game state reset');
    }

    /**
     * Check if current score is a new high score
     */
    checkHighScore() {
        const currentScore = this.game.score;
        const difficulty = this.game.selectedDifficulty;
        const previousBest = this.game.bestScores[difficulty] || 0;
        
        if (currentScore > previousBest) {
            this.game.bestScores[difficulty] = currentScore;
            this.game.isNewHighScore = true;
            
            // Save best scores
            try {
                localStorage.setItem('coderunner_best_scores', JSON.stringify(this.game.bestScores));
                console.log(`🏆 New high score for ${difficulty}: ${currentScore} (previous: ${previousBest})`);
            } catch (error) {
                console.warn('⚠️ Could not save high score:', error);
            }
            
            // Trigger achievement if available
            if (this.game.achievementSystem) {
                this.game.achievementSystem.checkHighScoreAchievements(currentScore, difficulty);
            }
        } else {
            this.game.isNewHighScore = false;
        }
        
        // ALWAYS attempt to upload score to leaderboard when player dies, regardless of if it's a new high score
        this.uploadScoreToLeaderboard(currentScore, difficulty);
    }
    
    /**
     * Upload score to leaderboard when player dies
     * @param {number} score - The player's final score
     * @param {string} difficulty - The difficulty level
     */
    uploadScoreToLeaderboard(score, difficulty) {
        // Check if leaderboard system is available
        if (!this.game.leaderboardSystem) {
            console.warn('⚠️ Leaderboard system not available, skipping upload');
            return;
        }
        
        try {
            // Prepare score upload - this will handle automatic submission or show name dialog
            const uploadInitiated = this.game.leaderboardSystem.prepareScoreUpload(score, difficulty, this.game.startTime);
            
            if (uploadInitiated) {
                console.log(`📊 Score upload initiated for ${difficulty}: ${score}`);
            } else {
                console.log(`📊 Score upload not initiated (score too low or other reason)`);
            }
        } catch (error) {
            console.error('❌ Error uploading score to leaderboard:', error);
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                // Enter fullscreen
                if (this.game.canvas.requestFullscreen) {
                    this.game.canvas.requestFullscreen();
                } else if (this.game.canvas.webkitRequestFullscreen) {
                    this.game.canvas.webkitRequestFullscreen();
                } else if (this.game.canvas.msRequestFullscreen) {
                    this.game.canvas.msRequestFullscreen();
                }
                console.log('🖥️ Entering fullscreen mode');
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                console.log('🖥️ Exiting fullscreen mode');
            }
        } catch (error) {
            console.warn('⚠️ Could not toggle fullscreen:', error);
        }
    }

    /**
     * Toggle performance display
     */
    togglePerformanceDisplay() {
        this.game.showFpsCounter = !this.game.showFpsCounter;
        console.log(`📊 Performance display ${this.game.showFpsCounter ? 'enabled' : 'disabled'}`);
        
        // Save setting if available
        if (window.generalSettings && typeof window.generalSettings.setShowFpsCounterEnabled === 'function') {
            window.generalSettings.setShowFpsCounterEnabled(this.game.showFpsCounter);
        }
    }

    /**
     * Handle text input for name entry
     */
    handleTextInput(char) {
        // Delegate to leaderboard system if active
        if (this.game.leaderboardSystem && this.game.leaderboardSystem.nameInputActive) {
            this.game.leaderboardSystem.handleTextInput(char);
        }
        
        // Delegate to login system if active
        if (this.game.loginSystem && this.game.loginSystem.hasActiveFocusedField()) {
            this.game.loginSystem.handleTextInput(char);
        }
    }

    /**
     * Handle backspace for name entry
     */
    handleBackspace() {
        // Delegate to leaderboard system if active
        if (this.game.leaderboardSystem && this.game.leaderboardSystem.nameInputActive) {
            this.game.leaderboardSystem.handleBackspace();
        }
        
        // Delegate to login system if active
        if (this.game.loginSystem && this.game.loginSystem.hasActiveFocusedField()) {
            this.game.loginSystem.handleBackspace();
        }
    }

    /**
     * Handle score upload
     */
    handleUploadScore() {
        if (this.game.leaderboardSystem) {
            this.game.leaderboardSystem.handleUploadScore();
        }
    }

    /**
     * Handle delete entry
     */
    handleDeleteEntry() {
        if (this.game.leaderboardSystem) {
            this.game.leaderboardSystem.handleDeleteEntry();
        }
    }

    /**
     * Handle change name
     */
    handleChangeName() {
        if (this.game.leaderboardSystem) {
            this.game.leaderboardSystem.handleChangeName();
        }
    }

    /**
     * Handle shop scrolling
     */
    handleShopScroll(direction) {
        if (this.game.gameState !== GAME_STATES.SHOP || !this.game.shopSystem) {
            return;
        }

        // Update scroll offset with bounds checking
        const maxScrollOffset = this.getShopMaxScrollOffset();
        this.game.shopScrollOffset += direction * 30; // Scale factor for smoother scrolling
        this.game.shopScrollOffset = Math.max(0, Math.min(this.game.shopScrollOffset, maxScrollOffset));
    }

    /**
     * Get maximum scroll offset for shop
     */
    getShopMaxScrollOffset() {
        if (!this.game.shopSystem || !this.game.canvas) {
            return 0;
        }

        // Basic calculation - adjust based on your shop UI layout
        const upgrades = Object.keys(this.game.shopSystem.upgradeData);
        const itemHeight = 80; // Approximate height per shop item
        const visibleHeight = this.game.canvas.height - 200; // Account for UI margins
        const totalContentHeight = upgrades.length * itemHeight;
        
        return Math.max(0, totalContentHeight - visibleHeight);
    }

    /**
     * Handle achievements scrolling
     */
    handleAchievementsScroll(amount) {
        if (this.game.gameState !== GAME_STATES.ACHIEVEMENTS || !this.game.achievementSystem) {
            return;
        }

        // Get current filter from achievement system
        const currentFilter = this.game.achievementSystem.currentCategoryFilter || 'all';
        
        // Calculate max scroll offset based on current filter
        const maxScrollOffset = this.game.achievementSystem.getMaxScrollOffset(
            this.game.canvas.width, 
            this.game.canvas.height, 
            currentFilter
        );

        // Update scroll offset with bounds checking
        this.game.achievementsScrollOffset += amount;
        this.game.achievementsScrollOffset = Math.max(0, Math.min(this.game.achievementsScrollOffset, maxScrollOffset));
    }

    /**
     * Navigate back to the previous screen using navigation history
     * @returns {boolean} True if navigation occurred, false if at end of history
     */
    navigateBack() {
        // If we have history, go back to the previous state
        if (this.navigationHistory.length > 0) {
            const previousState = this.navigationHistory.pop();
            console.log(`🔙 Navigating back to ${previousState} (remaining history: [${this.navigationHistory.join(' → ')}])`);
            
            // Update legacy previousGameState for backward compatibility
            this.game.previousGameState = this.navigationHistory[this.navigationHistory.length - 1] || GAME_STATES.HOME;
            
            // Navigate directly without adding to history (since we're going back)
            this.setGameStateDirectly(previousState);
            return true;
        }
        
        // No history available, default behavior
        console.log('🔙 No navigation history available, going to HOME');
        if (this.game.gameState !== GAME_STATES.HOME) {
            this.setGameStateDirectly(GAME_STATES.HOME);
            return true;
        }
        
        return false; // Already at home, can't go back further
    }

    /**
     * Set game state directly without affecting navigation history
     * Used internally for back navigation
     */
    setGameStateDirectly(newState) {
        // Handle exiting states
        if (this.game.gameState === GAME_STATES.TUTORIAL && newState !== GAME_STATES.TUTORIAL && this.game.tutorialSystem) {
            // Stop tutorial when leaving tutorial state
            this.game.tutorialSystem.stopTutorial();
            console.log('🎓 Exiting tutorial state - stopping tutorial');
        }
        
        this.game.gameState = newState;
        
        // Manage page scrolling based on game state
        if (newState === GAME_STATES.PLAYING || newState === GAME_STATES.PAUSED) {
            // Prevent scrolling during gameplay
            document.body.classList.add('game-focused');
            console.log('🔒 Preventing page scroll for gameplay state:', newState);
        } else {
            // Allow scrolling for all menu states
            document.body.classList.remove('game-focused');
            console.log('📜 Allowing page scroll for menu state:', newState);
        }
        
        // Start music when entering home screen
        if (newState === GAME_STATES.HOME && this.game.audioSystem) {
            console.log('🎵 Starting music on home screen');
            this.game.audioSystem.playMusic('chill');
        }
        
        // Reset animations for menu systems when entering them
        if (newState === GAME_STATES.OPTIONS && this.game.optionsSystem) {
            this.game.optionsSystem.resetAnimations();
        } else if (newState === GAME_STATES.SETTINGS && this.game.settingsSystem) {
            this.game.settingsSystem.resetAnimations();
        } else if (newState === GAME_STATES.CREDITS && this.game.creditsSystem) {
            this.game.creditsSystem.resetAnimations();
        } else if (newState === GAME_STATES.SHOP && this.game.shopSystem) {
            this.game.shopSystem.resetAnimations();
        } else if (newState === GAME_STATES.ACHIEVEMENTS && this.game.achievementSystem) {
            this.game.achievementSystem.resetAnimations();
            // Reset category filter and scroll when entering achievements
            this.game.achievementCategory = 'all';
            this.game.achievementsScrollOffset = 0;
        } else if (newState === GAME_STATES.CHARACTER_CUSTOMIZATION && this.game.characterCustomizationSystem) {
            this.game.characterCustomizationSystem.resetAnimations();
        } else if (newState === GAME_STATES.TUTORIAL && this.game.tutorialSystem) {
            // Start the tutorial when entering tutorial state
            this.game.tutorialSystem.startTutorial('welcome');
            console.log('🎓 Tutorial state entered - starting tutorial');
        }
    }

    /**
     * Clear navigation history
     * Used when starting fresh or when certain navigation flows should reset
     */
    clearNavigationHistory() {
        this.navigationHistory = [];
        console.log('🧹 Navigation history cleared');
    }
}
