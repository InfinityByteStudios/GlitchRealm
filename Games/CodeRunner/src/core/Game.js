/**
 * Game Engine - Main game coordination (Compact Version)
 * 
 * This is a refactored, compact version of Game.js that delegates functionality
 * to specialized modules while maintaining all original functionality.
 */

import { GAME_CONFIG, GAME_STATES, DIFFICULTY_LEVELS } from '../utils/constants.js';
import { GameEventHandlers } from './GameEventHandlers.js';
import { GameInitialization } from './GameInitialization.js';
import { GameLoop } from './GameLoop.js';
import { GameNavigation } from './GameNavigation.js';
import { GameGraphics } from './GameGraphics.js';

// Creative death messages for game over screen
const DEATH_MESSAGES = [
    "Disconnected from reality.",
    "NullPointerException: Skill not found.",
    "You ran into a bug. The bug won.",
    "Next time, try dodging... just a thought.",
    "404: Survival not found.",
    "Too slow for the code flow.",
    "You glitched so hard, even the error log gave up.",
    "Firewall 1, You 0.",
    "Oops. You tried to divide by zero.",
    "Memory overflow. Game crashed. You included.",
    "Timeline corrupted. Reboot necessary.",
    "You have been soft-deleted.",
    "Speed: fast. Reflexes: not so much.",
    "Nice try. Still trash though.",
    "That trap had your IP address.",
    "That's not a bug... you're just bad.",
    "Sent to the recycle bin."
];

export class Game {
    constructor() {
        // Canvas and context
        this.canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);        
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize core properties
        this.initializeCoreProperties();
        
        // Create module handlers
        this.createModuleHandlers();
        
        // Set canvas size and event listeners
        this.setupCanvas();
        
        // Determine initial state
        this.determineInitialState();
    }

    /**
     * Initialize core game properties
     */
    initializeCoreProperties() {
        // Performance metrics
        this.performanceMetrics = {
            frameTime: 0, updateTime: 0, renderTime: 0, fpsHistory: [],
            lowFpsCounter: 0, adaptiveOptimizationLevel: 0, lastOptimizationCheck: 0
        };

        // Visual effects
        this.milestoneEffects = [];
        this.speedPenaltyEffects = [];
        this.effectPool = { milestone: [], speedPenalty: [] };
        this.maxPoolSize = 10;

        // Changelog data
        this.changelogData = {
            version: "v2.1.0", lastUpdated: "June 2025",
            entries: [{
                version: "v2.1.0", date: "June 2025", title: "Bug Fixes & Performance",
                changes: ["🐛 FIXES:", "• Fixed player movement not working", "• Fixed input handling system", 
                         "• Fixed game initialization errors", "• Improved performance metrics", "",
                         "⚡ IMPROVEMENTS:", "• Better error handling", "• Fallback key bindings", "• More stable game loop"]
            }]
        };

        // Game state and timing
        this.gameState = GAME_STATES.LOADING;
        this.previousGameState = null;
        this.pendingGameState = null;
        this.initializationComplete = false;
        this.isPaused = false;
        this.wasPlayingBeforeDropdown = false;
        this.wasAutoPaused = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFrameCount = 0;
        this.lastFpsUpdate = 0;

        // Game objects
        this.player = null;
        this.world = null;
        this.physics = null;
        this.camera = { x: 0, y: 0 };

        // Screen shake system
        this.screenShake = true;
        this.shakeIntensity = 1.0;
        this.currentShake = { x: 0, y: 0, intensity: 0, duration: 0 };

        // Graphics settings
        this.graphicsQuality = 'medium';
        this.showParticles = true;
        this.screenShake = true;
        this.showFpsCounter = false;
        this.backgroundParticles = true;

        // Gameplay settings
        this.autoSave = true;
        this.pauseOnFocusLoss = true;
        this.skipDeathAnimation = false;
        this.showLoadingScreen = true;
        this.showOpeningAnimation = true;

        // Difficulty settings
        this.selectedDifficulty = 'EASY';
        this.difficultyKeys = Object.keys(DIFFICULTY_LEVELS);
        this.adaptiveDifficulty = false;
        this.adaptiveDifficultyMultiplier = 1.0;
        this.playerPerformanceHistory = [];
        this.lastPerformanceCheck = 0;
        this.consecutiveSuccesses = 0;
        this.consecutiveFailures = 0;

        // Score and game state
        this.score = 0;
        this.bonusScore = 0;
        this.bestScores = { EASY: 0, MEDIUM: 0, HARD: 0, EXTREME: 0, IMPOSSIBLE: 0 };
        this.startTime = 0;
        this.gameOverReason = null;
        this.gameOverMessage = null;
        this.gameOverStartTime = null;
        this.isNewHighScore = false;

        // Speed penalty system
        this.speedPenalty = {
            enabled: true, segmentDistance: 1000, timeLimit: 15000, penalty: 100,
            lastCheckpoint: 0, segmentStartTime: 0, totalPenalties: 0, totalPenaltyPoints: 0
        };

        // UI state
        this.tabHitAreas = [];
        this.difficultyHitAreas = [];
        this.shopHitAreas = [];
        this.homeHitAreas = [];
        this.optionsHitAreas = [];
        this.creditsHitAreas = [];
        this.achievementsHitAreas = [];
        this.gameOverHitAreas = [];
        this.pauseHitAreas = [];
        this.settingsHitAreas = [];
        this.characterCustomizationHitAreas = [];
        this.mousePos = { x: 0, y: 0 };
        this.hoveredDifficulty = -1;
        this.hoveredHomeButton = -1;
        this.hoveredOptionsButton = -1;
        this.hoveredGameOverButton = -1;
        this.hoveredPauseButton = -1;
        this.hoveredSettingsButton = null;
        this.achievementsScrollOffset = 0;
        this.achievementCategory = 'all'; // Category filter for achievements screen
        this.shopScrollOffset = 0;

        // Slider drag state
        this.isDraggingSlider = false;
        this.dragSliderData = null;

        // Navigation history
        this.navigationHistory = [];
        this.previousGameState = null;
    }

    /**
     * Create module handlers for different aspects of the game
     */
    createModuleHandlers() {
        this.eventHandlers = new GameEventHandlers(this);
        this.initialization = new GameInitialization(this);
        this.gameLoop = new GameLoop(this);
        this.navigation = new GameNavigation(this);
        this.graphics = new GameGraphics(this);
    }

    /**
     * Setup canvas size and basic event listeners
     */
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Determine initial game state based on settings
     */
    determineInitialState() {
        // This is a fallback method that sets default states
        // The actual navigation logic happens in initAsync after settings are loaded
        console.log('🔄 Game.determineInitialState() - setting temporary LOADING state');
        this.gameState = GAME_STATES.LOADING;
        // Don't set pendingGameState here - it will be determined after settings load
    }

    // ===========================================
    // Delegated Methods - Forward to modules
    // ===========================================

    // Initialization methods
    async initAsync() { return this.initialization.initAsync(); }
    async init() { return this.initialization.init(); }
    getShouldShowLoadingScreen() { return this.initialization.getShouldShowLoadingScreen(); }
    getShouldShowOpeningAnimation() { return this.initialization.getShouldShowOpeningAnimation(); }
    ensureCanvasFocus() { return this.initialization.ensureCanvasFocus(); }
    setupInputCallbacks() { return this.initialization.setupInputCallbacks(); }
    initializeGraphicsSettings() { return this.initialization.initializeGraphicsSettings(); }

    // Event handling methods
    handleMouseMove(e) { return this.eventHandlers.handleMouseMove(e); }
    handleCanvasClick(e) { return this.eventHandlers.handleCanvasClick(e); }
    handleEscape() { return this.eventHandlers.handleEscape(); }

    // Game loop methods
    update() { return this.gameLoop.update(); }
    updateGameplay() { return this.gameLoop.updateGameplay(); }
    updateCamera() { return this.gameLoop.updateCamera(); }
    updateScore() { return this.gameLoop.updateScore(); }
    updateAdaptiveDifficulty() { return this.gameLoop.updateAdaptiveDifficulty(); }
    updateFPS(currentTime) { return this.gameLoop.updateFPS(currentTime); }
    getPerformanceMetrics() { return this.gameLoop.getPerformanceMetrics(); }
    getExpectedScoreRate() { return this.gameLoop.getExpectedScoreRate(); }

    // Navigation methods
    setGameState(newState) { return this.navigation.setGameState(newState); }
    navigateToState(newState) { return this.navigation.navigateToState(newState); }
    navigateBack() { return this.navigation.navigateBack(); }
    clearNavigationHistory() { return this.navigation.clearNavigationHistory(); }
    showLeaderboard() { return this.navigation.showLeaderboard(); }
    showDifficultySelection() { return this.navigation.showDifficultySelection(); }
    showProfile() { return this.navigation.showProfile(); }
    toggleChangelog() { return this.navigation.toggleChangelog(); }
    handleContinue() { return this.navigation.handleContinue(); }
    handleConfirm() { return this.navigation.handleConfirm(); }
    handleHomeKey() { return this.navigation.handleHomeKey(); }
    togglePause() { return this.navigation.togglePause(); }
    handleTutorialToggle() { return this.navigation.handleTutorialToggle(); }
    handleShopToggle() { return this.navigation.handleShopToggle(); }
    async startGame() { return this.navigation.startGame(); }
    async restart() { return this.navigation.restart(); }
    endGame(reason, message) { return this.navigation.endGame(reason, message); }
    gameOver(reason) { return this.navigation.endGame(reason, this.getRandomDeathMessage()); }
    toggleFullscreen() { return this.navigation.toggleFullscreen(); }
    togglePerformanceDisplay() { return this.navigation.togglePerformanceDisplay(); }
    handleTextInput(char) { return this.navigation.handleTextInput(char); }
    handleBackspace() { return this.navigation.handleBackspace(); }
    handleUploadScore() { return this.navigation.handleUploadScore(); }
    handleDeleteEntry() { return this.navigation.handleDeleteEntry(); }
    handleChangeName() { return this.navigation.handleChangeName(); }
    handleShopScroll(direction) { return this.navigation.handleShopScroll(direction); }
    handleAchievementsScroll(amount) { return this.navigation.handleAchievementsScroll(amount); }

    // Graphics methods
    applyGraphicsQuality() { return this.graphics.applyGraphicsQuality(); }
    setGraphicsQuality(quality) { return this.graphics.setGraphicsQuality(quality); }
    getGraphicsQuality() { return this.graphics.getGraphicsQuality(); }
    toggleParticles() { return this.graphics.toggleParticles(); }
    toggleBackgroundParticles() { return this.graphics.toggleBackgroundParticles(); }
    toggleScreenShake() { return this.graphics.toggleScreenShake(); }
    setShakeIntensity(intensity) { return this.graphics.setShakeIntensity(intensity); }

    // ===========================================
    // Core Game Methods (Kept in main class)
    // ===========================================

    /**
     * Resize canvas to fill the window
     */
    resizeCanvas() {
        try {
            const displayWidth = this.canvas.clientWidth;
            const displayHeight = this.canvas.clientHeight;
            
            if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
                this.canvas.width = displayWidth;
                this.canvas.height = displayHeight;
            }
        } catch (error) {
            console.error('Error resizing canvas:', error);
        }
    }

    /**
     * Start the game loop
     */
    start() {
        try {
            console.log('🎮 Starting game loop...');
            
            // Check if loading screen should be shown and initialize accordingly
            const shouldShowLoadingScreen = this.initialization.getShouldShowLoadingScreen();
            
            if (shouldShowLoadingScreen) {
                // Initialize loading screen system immediately if needed
                if (!this.loadingScreenSystem) {
                    this.loadingScreenSystem = this.initialization.createLoadingScreenSystem();
                }
                
                // Start the game loop immediately to show loading screen
                requestAnimationFrame((ts) => this.gameLoop.gameLoop(ts));
                
                // Initialize the game asynchronously after a brief delay to show loading screen
                setTimeout(() => this.initAsync(), 100);
            } else {
                // Skip loading screen and go directly to initialization
                this.gameState = GAME_STATES.INITIALIZING;
                
                // Start game loop for normal game states
                requestAnimationFrame((ts) => this.gameLoop.gameLoop(ts));
                
                // Start initialization immediately
                this.initAsync();
            }
            
            console.log('✅ Game loop started successfully');
        } catch (error) {
            console.error('Failed to start game:', error);
            // Show error state instead of crashing
            this.gameState = GAME_STATES.HOME;
        }
    }

    /**
     * Render the game (delegated to renderer)
     */
    render() {
        if (this.renderer) {
            this.renderer.render();
        }
    }

    /**
     * Render milestone effects (placeholder for future visual effects)
     */
    renderMilestoneEffects(ctx) {
        // Placeholder for milestone visual effects
        // This could include particle effects, screen flashes, or other visual feedback
        // when the player reaches certain score milestones
        
        // For now, this is a stub to prevent runtime errors
        // TODO: Implement milestone visual effects if needed
    }

    /**
     * Get camera position with screen shake applied
     */
    getCameraPosition() {
        return {
            x: this.camera.x + this.currentShake.x,
            y: this.camera.y + this.currentShake.y
        };
    }

    /**
     * Get a random death message
     */
    getRandomDeathMessage() {
        return DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
    }

    /**
     * Cleanup resources when game is destroyed
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', () => this.resizeCanvas());
        
        // Cleanup systems
        if (this.audioSystem) {
            this.audioSystem.cleanup();
        }
        
        // Clear intervals/timeouts
        // (Autosave interval would be cleared here if implemented)
        
        console.log('🎮 Game destroyed and resources cleaned up');
    }

    /**
     * Get current game statistics
     */
    getGameStats() {
        return {
            highScore: Math.max(...Object.values(this.bestScores || {}), 0),
            lastScore: this.score || 0,
            lastDistance: this.distance || 0,
            lastTime: this.totalTime || 0,
            lastDatapackets: this.dataPacketsCollected || 0,
            lastObstaclesHit: this.obstaclesHit || 0,
            lastPowerups: this.powerupsCollected || 0,
            lastJumps: this.jumpCount || 0,
            actualGameCompleted: this.gameCompleted || false
        };
    }

    // ===========================================
    // System Getters (for backward compatibility)
    // ===========================================

    get inputManager() { return this._inputManager; }
    set inputManager(value) { this._inputManager = value; }

    get shopSystem() { return this._shopSystem; }
    set shopSystem(value) { this._shopSystem = value; }

    get upgradeSystem() { return this._upgradeSystem; }
    set upgradeSystem(value) { this._upgradeSystem = value; }

    get leaderboardSystem() { return this._leaderboardSystem; }
    set leaderboardSystem(value) { this._leaderboardSystem = value; }

    get achievementSystem() { return this._achievementSystem; }
    set achievementSystem(value) { this._achievementSystem = value; }

    get audioSystem() { return this._audioSystem; }
    set audioSystem(value) { this._audioSystem = value; }

    get popupSystem() { return this._popupSystem; }
    set popupSystem(value) { this._popupSystem = value; }

    get cloudSaveSystem() { return this._cloudSaveSystem; }
    set cloudSaveSystem(value) { this._cloudSaveSystem = value; }

    get homeScreenSystem() { return this._homeScreenSystem; }
    set homeScreenSystem(value) { this._homeScreenSystem = value; }

    get optionsSystem() { return this._optionsSystem; }
    set optionsSystem(value) { this._optionsSystem = value; }

    get settingsSystem() { return this._settingsSystem; }
    set settingsSystem(value) { this._settingsSystem = value; }

    get creditsSystem() { return this._creditsSystem; }
    set creditsSystem(value) { this._creditsSystem = value; }

    get characterCustomizationSystem() { return this._characterCustomizationSystem; }
    set characterCustomizationSystem(value) { this._characterCustomizationSystem = value; }

    get loginSystem() { return this._loginSystem; }
    set loginSystem(value) { this._loginSystem = value; }

    get openingAnimation() { return this._openingAnimation; }
    set openingAnimation(value) { this._openingAnimation = value; }

    get powerUpSystem() { return this._powerUpSystem; }
    set powerUpSystem(value) { this._powerUpSystem = value; }

    get lifeBoxSystem() { return this._lifeBoxSystem; }
    set lifeBoxSystem(value) { this._lifeBoxSystem = value; }

    get quantumDashAnimation() { return this._quantumDashAnimation; }
    set quantumDashAnimation(value) { this._quantumDashAnimation = value; }

    get tutorialSystem() { return this._tutorialSystem; }
    set tutorialSystem(value) { this._tutorialSystem = value; }

    get renderer() { return this._renderer; }
    set renderer(value) { this._renderer = value; }

    get gameDialogs() { return this._gameDialogs; }
    set gameDialogs(value) { this._gameDialogs = value; }
}
