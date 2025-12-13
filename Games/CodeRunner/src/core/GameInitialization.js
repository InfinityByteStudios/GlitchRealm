/**
 * Game Initialization - Setup and initialization methods
 */

import { GAME_CONFIG, GAME_STATES } from '../utils/constants.js';
import { InputManager } from '../systems/inputmanager.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { LeaderboardSystem } from '../systems/LeaderboardSystem.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { OpeningAnimationSystem } from '../systems/OpeningAnimationSystem.js';
import { PopupSystem } from '../systems/PopupSystem.js';
import { CloudSaveSystem } from '../systems/CloudSaveSystem.js';
import { PowerUpSystem } from '../systems/PowerUpSystem.js';
import { LifeBoxSystem } from '../systems/LifeBoxSystem.js';
import { QuantumDashAnimationSystem } from '../systems/QuantumDashAnimationSystem.js';
import { TutorialSystem } from '../systems/TutorialSystem.js';
import { HomeScreenSystem } from '../systems/HomeScreenSystem.js';
import { OptionsSystem } from '../systems/OptionsSystem.js';
import { SettingsSystem } from '../systems/SettingsSystem.js';
import { CreditsSystem } from '../systems/CreditsSystem.js';
import { LoadingScreenSystem } from '../systems/LoadingScreenSystem.js';
import { CharacterCustomizationSystem } from '../systems/CharacterCustomizationSystem.js';
import { LoginSystem } from '../systems/LoginSystem.js';
import { UserProfileSystem } from '../systems/UserProfileSystem.js';
import { GameEventHandlers } from './GameEventHandlers.js';
import { WorldGenerator } from './WorldGenerator.js';
import { Player } from './player.js';
import { PhysicsEngine } from '../physics/physicsengine.js';
import { GameRenderer } from '../rendering/GameRenderer.js';
import { GameUI } from '../rendering/GameUI.js';
import { GameDialogs } from '../rendering/GameDialogs.js';

// Debug helper
import { UpgradeTestHelper } from '../debug/UpgradeTestHelper.js';

// Module integration helper
import { connectRenderingModules } from './game-module-bridge.js';

export class GameInitialization {
    constructor(game) {
        this.game = game;
    }

    /**
     * Check if loading screen should be shown based on settings
     */
    getShouldShowLoadingScreen() {
        try {
            // Check SettingsSystem first
            if (this.game.settingsSystem) {
                const showLoadingScreen = this.game.settingsSystem.getSettingValue('showLoadingScreen');
                if (showLoadingScreen !== undefined) {
                    return showLoadingScreen;
                }
            }
            
            // Fallback to window.generalSettings
            if (window.generalSettings && typeof window.generalSettings.isShowLoadingScreenEnabled === 'function') {
                return window.generalSettings.isShowLoadingScreenEnabled();
            }
            
            // Check localStorage for settings
            const settings = JSON.parse(localStorage.getItem('coderunner_settings') || '{}');
            if (settings.showLoadingScreen !== undefined) {
                return settings.showLoadingScreen;
            }
            
            // Default to showing loading screen
            return true;
        } catch (error) {
            return true; // Default to showing loading screen
        }
    }

    /**
     * Check if opening animation should be shown based on settings
     */
    getShouldShowOpeningAnimation() {
        try {
            // Force opening animation after sign out
            const forceLoginAfterSignout = sessionStorage.getItem('coderunner_force_login_after_signout');
            if (forceLoginAfterSignout === 'true') {
                return true;
            }
            
            // Check SettingsSystem first
            if (this.game.settingsSystem) {
                const showOpeningAnimation = this.game.settingsSystem.getSettingValue('showOpeningAnimation');
                if (showOpeningAnimation !== undefined) {
                    return showOpeningAnimation;
                }
            }
            
            // Fallback to window.generalSettings
            if (window.generalSettings && typeof window.generalSettings.isShowOpeningAnimationEnabled === 'function') {
                return window.generalSettings.isShowOpeningAnimationEnabled();
            }
            
            // Check localStorage for settings
            const settings = JSON.parse(localStorage.getItem('coderunner_settings') || '{}');
            if (settings.showOpeningAnimation !== undefined) {
                return settings.showOpeningAnimation;
            }
            
            // Default to showing opening animation
            return true;
        } catch (error) {
            return true; // Default to showing opening animation
        }
    }

    async initAsync() {
        try {
            started');
            
            // Initialize basic systems first so we can load settings
            this.createSystems();
            
            // Load settings before making any navigation decisions
            if (this.game.settingsSystem) {
                await this.game.settingsSystem.loadSettings();
                }
            
            // Determine what state to show after initialization
            const shouldShowLoadingScreen = this.getShouldShowLoadingScreen();
            const shouldShowOpeningAnimation = this.getShouldShowOpeningAnimation();
            
            if (this.game.settingsSystem) {
                const loadingScreenSetting = this.game.settingsSystem.getSettingValue('showLoadingScreen');
                const openingAnimationSetting = this.game.settingsSystem.getSettingValue('showOpeningAnimation');
                }
            
            // Determine the target state after loading/initialization
            let targetState = GAME_STATES.HOME;
            if (shouldShowOpeningAnimation) {
                targetState = GAME_STATES.OPENING_ANIMATION;
            }
            
            if (shouldShowLoadingScreen) {
                this.game.gameState = GAME_STATES.LOADING;
                this.game.pendingGameState = targetState;
                } else {
                // Use navigation system to properly handle state transitions
                if (this.game.navigation) {
                    this.game.navigation.setGameState(targetState);
                } else {
                    this.game.gameState = targetState;
                }
            }
            
            // Complete the initialization
            await this.init();
            
            this.game.initializationComplete = true;
            } catch (error) {
            console.error('❌ Game initialization failed:', error);
            this.game.gameState = GAME_STATES.HOME; // Fallback to home screen
        }
    }

    async init() {
        started');
        
        // Make game instance available globally for HTML UI
        window.gameInstance = this.game;
        
        // Systems are already created in initAsync, just setup the rest
        this.setupInputCallbacks();
        
        // Initialize graphics quality from settings
        this.initializeGraphicsSettings();
        
        // Add debug commands for testing upgrades (after systems are created)
        this.addDebugCommands();
        
        // Load saved best scores
        this.loadBestScores();
        
        // Load saved game data (excluding settings which are already loaded)
        about to call loadGameData()');
        await this.loadGameData();
        finished loadGameData()');
        
        // Start continuous autosave system (runs regardless of game state)
        this.startAutosave();
        
        // Connect rendering modules (after systems are created)
        connectRenderingModules(this.game);
        
        // Check authentication state and determine initial navigation
        await this.determineInitialNavigation();
        
        // Update HTML UI with initial login status
        if (window.updateLoginStatus) {
            window.updateLoginStatus();
        }
        
        // Ensure proper scroll behavior for initial state
        this.ensureProperScrollBehavior();
        
        }

    createSystems() {
        this.game.inputManager = new InputManager();
        this.game.shopSystem = new ShopSystem(this.game);
        this.game.upgradeSystem = new UpgradeSystem(this.game);
        this.game.leaderboardSystem = new LeaderboardSystem(this.game);
        this.game.achievementSystem = new AchievementSystem(this.game);
        this.game.audioSystem = new AudioSystem();
        
        // Make audio system globally available for HTML UI
        window.audioSystem = this.game.audioSystem;
        
        this.game.popupSystem = new PopupSystem(this.game.canvas, this.game.ctx);
        this.game.cloudSaveSystem = new CloudSaveSystem(this.game);
        this.game.homeScreenSystem = new HomeScreenSystem(this.game);
        this.game.optionsSystem = new OptionsSystem(this.game);
        this.game.settingsSystem = new SettingsSystem(this.game);
        this.game.creditsSystem = new CreditsSystem(this.game);
        this.game.characterCustomizationSystem = new CharacterCustomizationSystem(this.game);
        // this.game.audioVideoPrompt = new AudioVideoPromptSystem(this.game); // Removed - going directly to login
        this.game.loginSystem = new LoginSystem(this.game);
        this.game.userProfileSystem = new UserProfileSystem(this.game); // User profile and authentication management
        
        // Make UserProfileSystem globally available for cross-system communication
        if (typeof window !== 'undefined') {
            window.userProfileSystem = this.game.userProfileSystem;
        }
        this.game.openingAnimation = new OpeningAnimationSystem(this.game); // Create after loginSystem
        
        try {
            this.game.powerUpSystem = new PowerUpSystem(this.game);
            } catch (error) {
            console.error('❌ PowerUpSystem initialization failed:', error);
            this.game.powerUpSystem = null;
        }
        
        this.game.lifeBoxSystem = new LifeBoxSystem(this.game);
        this.game.quantumDashAnimation = new QuantumDashAnimationSystem(this.game);
        this.game.tutorialSystem = new TutorialSystem(this.game);
        
        this.game.renderer = new GameRenderer(this.game);
        this.game.gameDialogs = new GameDialogs(this.game);
        this.game.eventHandlers = new GameEventHandlers(this.game);
        
        // Set up name input checker for InputManager
        this.game.inputManager.setNameInputChecker(() => {
            // Check if leaderboard name input is active
            const leaderboardInputActive = this.game.leaderboardSystem && this.game.leaderboardSystem.nameInputActive;
            
            // Check if login system has focused input fields
            const loginInputActive = this.game.loginSystem && this.game.loginSystem.hasActiveFocusedField();
            
            // Check if user profile system has focused input fields (TODO: Re-enable when UserProfileSystem is implemented)
            // const profileInputActive = this.game.userProfileSystem && this.game.userProfileSystem.isActive && 
            //                          Object.values(this.game.userProfileSystem.inputFields || {}).some(field => field.focused);
            
            return leaderboardInputActive || loginInputActive; // || profileInputActive;
        });

        // Add mouse click listener for leaderboard tabs and menus
        this.game.tabHitAreas = [];
        this.game.difficultyHitAreas = [];
        this.game.shopHitAreas = [];
        this.game.homeHitAreas = [];
        this.game.optionsHitAreas = [];
        this.game.creditsHitAreas = [];
        
        // Mouse state tracking
        this.game.mousePos = { x: 0, y: 0 };
        this.game.hoveredDifficulty = -1;
        this.game.hoveredHomeButton = -1;
        
        this.setupCanvasEventListeners();
        this.setupWindowEventListeners();
    }

    setupCanvasEventListeners() {
        this.game.canvas.addEventListener('click', (e) => this.game.eventHandlers.handleCanvasClick(e));
        this.game.canvas.addEventListener('mousemove', (e) => this.game.eventHandlers.handleMouseMove(e));
        this.game.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.game.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.game.canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e), { passive: true });
        
        // Add focus/blur listeners to manage scrolling prevention
        this.game.canvas.addEventListener('focus', () => {
            // Only prevent scrolling during gameplay, not on menus
            if (this.game.gameState === GAME_STATES.PLAYING || this.game.gameState === GAME_STATES.PAUSED) {
                document.body.classList.add('game-focused');
                } else {
                }
        });
        
        this.game.canvas.addEventListener('blur', () => {
            document.body.classList.remove('game-focused');
            });
    }

    setupWindowEventListeners() {
        // Add window focus/blur listeners for settings functionality
        window.addEventListener('focus', () => {
            this.handleWindowFocus();
        });
        
        window.addEventListener('blur', () => {
            this.handleWindowBlur();
        });
    }

    /**
     * Ensure the canvas has focus for keyboard input
     */
    ensureCanvasFocus() {
        try {
            // Make sure canvas is focusable
            if (!this.game.canvas.hasAttribute('tabindex')) {
                this.game.canvas.setAttribute('tabindex', '-1');
            }
            
            // Only prevent scrolling during gameplay, not on menus
            if (this.game.gameState === GAME_STATES.PLAYING || this.game.gameState === GAME_STATES.PAUSED) {
                document.body.classList.add('game-focused');
                } else {
                // Remove the class to allow scrolling in menus
                document.body.classList.remove('game-focused');
                }
            
            // Focus the canvas to ensure keyboard events are captured
            this.game.canvas.focus({ preventScroll: true });
            
            } catch (error) {
            }
    }

    /**
     * Resize canvas to fill the window while maintaining aspect ratio
     */
    resizeCanvas() {
        // Get the display size (CSS pixels)
        const displayWidth = this.game.canvas.clientWidth;
        const displayHeight = this.game.canvas.clientHeight;
        
        // Check if the canvas is not the same size
        if (this.game.canvas.width !== displayWidth || this.game.canvas.height !== displayHeight) {
            // Make the canvas the same size
            this.game.canvas.width = displayWidth;
            this.game.canvas.height = displayHeight;
        }
    }

    setupInputCallbacks() {
        // Core game controls
        this.game.inputManager.setCallback('pause', () => this.game.togglePause());
        this.game.inputManager.setCallback('restart', () => this.game.restart());
        this.game.inputManager.setCallback('confirm', () => this.game.handleConfirm());
        this.game.inputManager.setCallback('skip', () => this.game.eventHandlers.handleEscape());
        
        // Screen navigation
        this.game.inputManager.setCallback('changelog', () => this.game.toggleChangelog());
        this.game.inputManager.setCallback('difficultySelect', () => this.game.showDifficultySelection());
        this.game.inputManager.setCallback('leaderboard', () => this.game.showLeaderboard());
        this.game.inputManager.setCallback('continue', () => this.game.handleContinue());
        this.game.inputManager.setCallback('profile', () => this.game.showProfile());
        
        // Leaderboard functionality
        this.game.inputManager.setCallback('uploadScore', () => this.game.handleUploadScore());
        this.game.inputManager.setCallback('textInput', (char) => this.game.handleTextInput(char));
        this.game.inputManager.setCallback('backspace', () => this.game.handleBackspace());
        this.game.inputManager.setCallback('deleteEntry', () => this.game.handleDeleteEntry());
        this.game.inputManager.setCallback('changeName', () => this.game.handleChangeName());
        
        // Shop functionality
        this.game.inputManager.setCallback('shop', () => this.game.handleShopToggle());
        this.game.inputManager.setCallback('shopScrollUp', () => this.game.handleShopScroll(-1)); // Up arrow = scroll up (decrease offset)
        this.game.inputManager.setCallback('shopScrollDown', () => this.game.handleShopScroll(1)); // Down arrow = scroll down (increase offset)
        
        // Achievements scrolling functionality
        this.game.inputManager.setCallback('achievementsScrollUp', () => this.game.handleAchievementsScroll(-30)); // Up arrow = scroll up
        this.game.inputManager.setCallback('achievementsScrollDown', () => this.game.handleAchievementsScroll(30)); // Down arrow = scroll down
        
        // System controls
        this.game.inputManager.setCallback('togglePerformance', () => this.game.togglePerformanceDisplay());
        this.game.inputManager.setCallback('tutorial', () => this.game.handleTutorialToggle());
        this.game.inputManager.setCallback('fullscreen', () => this.game.toggleFullscreen());
        this.game.inputManager.setCallback('home', () => this.game.handleHomeKey());
    }

    /**
     * Initialize graphics settings from general settings
     */
    initializeGraphicsSettings() {
        if (window.generalSettings) {
            this.game.graphicsQuality = window.generalSettings.getGraphicsQuality();
            this.game.showFpsCounter = window.generalSettings.isShowFpsCounterEnabled();
            this.game.applyGraphicsQuality();
        } else {
            // Default values if settings not available yet
            this.game.graphicsQuality = 'medium';
            this.game.showFpsCounter = false;
            }
    }

    // Placeholder methods for event handlers that would need to be implemented
    handleMouseDown(e) {
        // Handle mouse down events if needed
        }

    handleMouseUp(e) {
        // Handle mouse up events if needed
        }

    handleMouseWheel(e) {
        // Handle mouse wheel events for scrolling
        if (this.game.gameState === GAME_STATES.SHOP) {
            // Handle shop scrolling
            const scrollDirection = e.deltaY > 0 ? 1 : -1;
            this.game.handleShopScroll(scrollDirection);
        } else if (this.game.gameState === GAME_STATES.ACHIEVEMENTS) {
            // Handle achievements scrolling
            const scrollAmount = e.deltaY > 0 ? 30 : -30;
            this.game.handleAchievementsScroll(scrollAmount);
        } else if (this.game.gameState === GAME_STATES.CHARACTER_CUSTOMIZATION) {
            // Handle character customization scrolling
            if (this.game.characterCustomizationSystem && this.game.characterCustomizationSystem.handleWheel) {
                this.game.characterCustomizationSystem.handleWheel(e.deltaY);
                }
        } else if (this.game.gameState === GAME_STATES.SETTINGS) {
            // Handle settings scrolling
            if (this.game.settingsSystem && this.game.settingsSystem.handleScroll) {
                this.game.settingsSystem.handleScroll(e.deltaY);
                }
        }
    }

    handleWindowFocus() {
        // Handle window focus
        if (this.game.pauseOnFocusLoss && this.game.wasAutoPaused) {
            // Resume game if it was auto-paused due to focus loss
            this.game.wasAutoPaused = false;
            this.game.isPaused = false;
            }
    }

    handleWindowBlur() {
        // Handle window blur
        if (this.game.pauseOnFocusLoss && this.game.gameState === GAME_STATES.PLAYING && !this.game.isPaused) {
            // Auto-pause the game when window loses focus
            this.game.wasAutoPaused = true;
            this.game.isPaused = true;
            }
    }

    /**
     * Create the loading screen system
     */
    createLoadingScreenSystem() {
        return new LoadingScreenSystem(this.game);
    }

    /**
     * Ensure proper scroll behavior based on current game state
     */
    ensureProperScrollBehavior() {
        if (this.game.gameState === GAME_STATES.PLAYING || this.game.gameState === GAME_STATES.PAUSED) {
            document.body.classList.add('game-focused');
            } else {
            document.body.classList.remove('game-focused');
            }
    }

    // Placeholder methods that would be implemented in the main Game class
    addDebugCommands() {
        // Add debug commands to window for testing
        if (typeof window !== 'undefined') {
            window.gameDebug = {
                upgradeTest: () => {
                    if (this.game.upgradeSystem && window.UpgradeTestHelper) {
                        window.UpgradeTestHelper.runUpgradeTests(this.game.upgradeSystem);
                    }
                },
                toggleAudio: () => {
                    if (this.game.audioSystem) {
                        this.game.audioSystem.toggleMute();
                        );
                    }
                },
                setVolume: (volume) => {
                    if (this.game.audioSystem) {
                        this.game.audioSystem.setMasterVolume(volume);
                        }
                }
            };
            }
        
        // Debug helper methods for fixing character selection
        window.debugCharacterSelection = {
            getCurrentSprite: () => {
                if (window.profileManager) {
                    const current = window.profileManager.getSelectedSprite();
                    return current;
                }
            },
            setSprite: (spriteId) => {
                if (window.profileManager) {
                    window.profileManager.setSelectedSprite(spriteId);
                    // Force update player sprite
                    if (window.game && window.game.player) {
                        window.game.player.loadSelectedSprite();
                    }
                }
            },
            forceSaveToCloud: () => {
                if (window.profileManager) {
                    window.profileManager.forceSaveToCloud();
                }
            },
            getCurrentPlayerSprite: () => {
                if (window.game && window.game.player && window.game.player.sprite) {
                    return window.game.player.sprite.src;
                }
            },
            checkKingRunner: () => {
                if (this.game.characterCustomizationSystem) {
                    return this.game.characterCustomizationSystem.debugKingRunnerStatus();
                } else {
                    }
            }
        };
    }

    loadBestScores() {
        // Load saved best scores from storage
        try {
            const savedScores = localStorage.getItem('coderunner_best_scores');
            if (savedScores) {
                this.game.bestScores = JSON.parse(savedScores);
                }
        } catch (error) {
            }
    }

    async loadGameData() {
        // Load saved game data
        try {
            // This would load data packets, upgrade states, etc.
            // Load upgrade system data
            if (this.game.upgradeSystem) {
                await this.game.upgradeSystem.loadUpgradeData();
            }
            
            // Achievement system loads data in constructor
            // Shop system loads data in constructor
            
            } catch (error) {
            console.error('❌ Could not load game data:', error);
        }
    }

    startAutosave() {
        // Start continuous autosave system
        if (this.game.autoSave) {
            setInterval(() => {
                this.saveGameData();
            }, 30000); // Autosave every 30 seconds
            }
    }

    saveGameData() {
        // Save game data
        try {
            // Save best scores
            localStorage.setItem('coderunner_best_scores', JSON.stringify(this.game.bestScores));
            
            // Save system data
            if (this.game.upgradeSystem) {
                this.game.upgradeSystem.saveUpgradeData();
            }
            
            if (this.game.shopSystem) {
                this.game.shopSystem.saveOwnedUpgrades();
            }
            
            if (this.game.achievementSystem) {
                this.game.achievementSystem.saveAchievementData();
            }
            
            // Trigger comprehensive cloud save if user is logged in
            if (this.game.cloudSaveSystem && this.game.cloudSaveSystem.isUserLoggedIn()) {
                this.game.cloudSaveSystem.saveAllGameData().catch(error => {
                    });
            }
        } catch (error) {
            }
    }

    async determineInitialNavigation() {
        // Check authentication state and determine initial navigation
        try {
            // This would check if user is logged in and navigate accordingly
            // Only set default navigation if not already set
            if (this.game.gameState === GAME_STATES.LOADING) {
                // Only override pendingGameState if it's not already set
                if (!this.game.pendingGameState) {
                    this.game.pendingGameState = GAME_STATES.HOME;
                } else {
                    }
            } else {
                this.game.gameState = GAME_STATES.HOME;
            }
        } catch (error) {
            console.error('❌ Could not determine initial navigation:', error);
            this.game.gameState = GAME_STATES.HOME;
        }
    }
}
