/**
 * Game Event Handlers - Mouse and input event handling
 */

import { GAME_STATES } from '../utils/constants.js';

export class GameEventHandlers {
    constructor(game) {
        this.game = game;
    }

    /**
     * Handle mouse movement for UI interactions
     */
    handleMouseMove(e) {
        // Get mouse position relative to canvas
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // Update mouse position
        this.game.mousePos.x = x;
        this.game.mousePos.y = y;

        // Handle different game states
        switch (this.game.gameState) {
            case GAME_STATES.VIDEO_INTRO:
                // Video intro system removed - skipping video intro state
                break;
                  
            case GAME_STATES.HOME:
                this.handleHomeHover(x, y);
                break;
                
            case GAME_STATES.PROFILE:
                this.handleProfileHover(x, y);
                break;
                
            case GAME_STATES.OPTIONS:
                this.handleOptionsHover(x, y);
                break;
                
            case GAME_STATES.CREDITS:
                this.handleCreditsHover(x, y);
                break;
                  
            case GAME_STATES.DIFFICULTY_SELECT:
                this.handleDifficultyHover(x, y);
                break;
                  
            case GAME_STATES.LEADERBOARD:
                // Pass through to leaderboard system if needed
                break;
                
            case GAME_STATES.SHOP:
                // Handle shop hover effects if needed
                break;
                  
            case GAME_STATES.GAME_OVER:
                this.handleGameOverHover(x, y);
                break;
                
            case GAME_STATES.SETTINGS:
                this.handleSettingsHover(x, y);
                break;
                  
            case GAME_STATES.PAUSED:
                this.handlePauseHover(x, y);
                break;
                  
            default:
                // Reset hover states for other game states
                this.game.hoveredDifficulty = -1;
                this.game.hoveredHomeButton = -1;
                this.game.hoveredOptionsButton = -1;
                this.game.hoveredGameOverButton = -1;
                this.game.hoveredPauseButton = -1;
                break;
        }
        
        // Handle slider dragging in settings
        if (this.game.gameState === GAME_STATES.SETTINGS && this.game.gameDialogs) {
            this.game.gameDialogs.handleMouseMove(x, y);
        }
        
        // Handle slider dragging (legacy - may be removed)
        if (this.game.isDraggingSlider && this.game.dragSliderData) {
            this.updateSliderValue(this.game.dragSliderData, x);
        }
        
        // Handle popup system mouse movement if popup is active
        if (this.game.popupSystem && this.game.popupSystem.activePopup) {
            this.game.popupSystem.handleMouseMove(x, y);
        }
    }

    /**
     * Handle canvas mouse clicks for UI interactions
     */
    handleCanvasClick(e) {
        // Get click position relative to canvas
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        console.log(`🖱️ Canvas click: (${Math.round(x)}, ${Math.round(y)}) in state: ${this.game.gameState}`);

        // Check for popup clicks first (popups should work in any state)
        if (this.game.popupSystem && this.game.popupSystem.activePopup) {
            const handled = this.game.popupSystem.handleClick(x, y);
            if (handled) {
                return; // Popup handled the click, don't process other handlers
            }
        }

        // Handle different game states
        switch (this.game.gameState) {
            case GAME_STATES.VIDEO_INTRO:
                // Video intro system removed - skipping video intro state
                break;
                
            case GAME_STATES.LOGIN_PROMPT:
                // Handle login prompt clicks (delegate to login system)
                if (this.game.loginSystem) {
                    this.game.loginSystem.handleClick(x, y);
                }
                break;

            case GAME_STATES.TUTORIAL:
                // Handle tutorial clicks (delegate to tutorial system)
                if (this.game.tutorialSystem) {
                    this.game.tutorialSystem.handleClick({ clientX: e.clientX, clientY: e.clientY });
                }
                break;
                  
            case GAME_STATES.PROFILE:
                // Handle profile system clicks (delegate to profile system)
                // TODO: Re-enable when UserProfileSystem is implemented
                // if (this.game.userProfileSystem) {
                //     this.game.userProfileSystem.handleClick(x, y);
                // }
                break;
                
            case GAME_STATES.POST_ANIMATION_POPUP:
                this.handlePostAnimationPopupClick(x, y);
                break;
                  
            case GAME_STATES.HOME:
                this.handleHomeClick(x, y);
                break;
                
            case GAME_STATES.PROFILE:
                this.handleProfileClick(x, y);
                break;
                
            case GAME_STATES.OPTIONS:
                this.handleOptionsClick(x, y);
                break;
                
            case GAME_STATES.CREDITS:
                this.handleCreditsClick(x, y);
                break;
                
            case GAME_STATES.DIFFICULTY_SELECT:
                this.handleDifficultyClick(x, y);
                break;
                  
            case GAME_STATES.LEADERBOARD:
                this.handleLeaderboardClick(x, y);
                break;
                
            case GAME_STATES.ACHIEVEMENTS:
                this.handleAchievementsClick(x, y);
                break;
                
            case GAME_STATES.SHOP:
                this.handleShopClick(x, y);
                break;
                
            case GAME_STATES.SETTINGS:
                this.handleSettingsClick(x, y);
                break;
                  
            case GAME_STATES.RESET_CONFIRM:
                this.handleResetConfirmClick(x, y);
                break;
                  
            case GAME_STATES.GAME_OVER:
                this.handleGameOverClick(x, y);
                break;
                
            case GAME_STATES.PAUSED:
                this.handlePauseClick(x, y);
                break;
                
            case GAME_STATES.CHARACTER_CUSTOMIZATION:
                this.handleCharacterCustomizationClick(x, y);
                break;
                
            default:
                // No specific handling for this state
                break;
        }
    }

    /**
     * Handle escape key presses to go back to previous screen
     */
    handleEscape() {
        // Play menu click sound
        if (this.game.audioSystem) {
            this.game.audioSystem.onMenuClick();
        }

        // Navigate back based on current state
        switch (this.game.gameState) {
            case GAME_STATES.PLAYING:
                // Pause the game
                this.game.togglePause();
                break;
                
            case GAME_STATES.SETTINGS:
            case GAME_STATES.OPTIONS:
            case GAME_STATES.CREDITS:
            case GAME_STATES.ACHIEVEMENTS:
            case GAME_STATES.LEADERBOARD:
            case GAME_STATES.SHOP:
            case GAME_STATES.DIFFICULTY_SELECT:
            case GAME_STATES.CHARACTER_CUSTOMIZATION:
            case GAME_STATES.CHANGELOG:
            case GAME_STATES.TUTORIAL:
                // Use the new navigation history system
                const didNavigateBack = this.game.navigation.navigateBack();
                if (!didNavigateBack) {
                    // Fallback to home if navigation back failed
                    console.log(`🔙 Navigation back failed, going to HOME`);
                    this.game.navigateToState(GAME_STATES.HOME);
                }
                break;
                
            case GAME_STATES.PAUSED:
                // Resume game
                this.game.togglePause();
                break;
                
            case GAME_STATES.GAME_OVER:
                // Go to home screen
                this.game.navigateToState(GAME_STATES.HOME);
                break;
                
            case GAME_STATES.POST_ANIMATION_POPUP:
                // Close popup and go to home
                this.game.gameState = GAME_STATES.HOME;
                break;
                
            case GAME_STATES.HOME:
                // Don't do anything when already at home screen
                console.log(`🏠 Already at home screen, ignoring escape`);
                break;
                
            case GAME_STATES.PROFILE:
                // Go back to home from profile
                this.game.navigateToState(GAME_STATES.HOME);
                break;
                
            default:
                // For other states, try to go to home
                if (this.game.gameState !== GAME_STATES.HOME && this.game.gameState !== GAME_STATES.PLAYING) {
                    this.game.navigateToState(GAME_STATES.HOME);
                }
                break;
        }
    }

    // ===========================================
    // Hover Handlers
    // ===========================================

    handleHomeHover(x, y) {
        if (this.game.homeScreenSystem && this.game.homeHitAreas) {
            this.game.homeScreenSystem.handleMouseMove(x, y, this.game.homeHitAreas);
        }
    }

    handleOptionsHover(x, y) {
        if (this.game.optionsSystem && this.game.optionsHitAreas) {
            this.game.optionsSystem.handleMouseMove(x, y, this.game.optionsHitAreas);
        }
    }

    handleCreditsHover(x, y) {
        if (this.game.creditsSystem && this.game.creditsHitAreas) {
            this.game.creditsSystem.handleMouseMove(x, y, this.game.creditsHitAreas);
        }
    }

    handleDifficultyHover(x, y) {
        this.game.hoveredDifficulty = -1;
        for (let i = 0; i < this.game.difficultyHitAreas.length; i++) {
            const area = this.game.difficultyHitAreas[i];
            if (x >= area.x && x <= area.x + area.width && 
                y >= area.y && y <= area.y + area.height) {
                this.game.hoveredDifficulty = i;
                break;
            }
        }
    }

    handleGameOverHover(x, y) {
        this.game.hoveredGameOverButton = -1;
        
        // Check if there are game over hit areas to hover over
        if (this.game.gameOverHitAreas) {
            for (let i = 0; i < this.game.gameOverHitAreas.length; i++) {
                const area = this.game.gameOverHitAreas[i];
                if (x >= area.x && x <= area.x + area.width && 
                    y >= area.y && y <= area.y + area.height) {
                    this.game.hoveredGameOverButton = i;
                    break;
                }
            }
        }
    }

    handlePauseHover(x, y) {
        this.game.hoveredPauseButton = -1;
        
        // Check if there are pause hit areas to hover over
        if (this.game.pauseHitAreas) {
            for (let i = 0; i < this.game.pauseHitAreas.length; i++) {
                const area = this.game.pauseHitAreas[i];
                if (x >= area.x && x <= area.x + area.width && 
                    y >= area.y && y <= area.y + area.height) {
                    this.game.hoveredPauseButton = i;
                    break;
                }
            }
        }
    }

    handleSettingsHover(x, y) {
        if (this.game.settingsSystem && this.game.settingsHitAreas) {
            this.game.settingsSystem.handleMouseMove(x, y, this.game.settingsHitAreas);
        }
    }

    // ===========================================
    // Click Handlers
    // ===========================================

    handlePostAnimationPopupClick(x, y) {
        // For the popup, any click anywhere should close it and go to home
        // Play menu click sound
        if (this.game.audioSystem) {
            this.game.audioSystem.onMenuClick();
        }
        
        // Transition to home screen
        this.game.gameState = GAME_STATES.HOME;
    }

    handleHomeClick(x, y) {
        if (!this.game.homeHitAreas) return;
        
        // Check if any home button was clicked
        for (let i = 0; i < this.game.homeHitAreas.length; i++) {
            const area = this.game.homeHitAreas[i];
            if (x >= area.x && x <= area.x + area.width && 
                y >= area.y && y <= area.y + area.height) {
                
                // Play menu click sound
                if (this.game.audioSystem) {
                    this.game.audioSystem.onMenuClick();
                }
                
                // Handle different button actions
                if (area.action === 'play') {
                    this.game.showDifficultySelection();
                } else if (area.action === 'profile') {
                    this.game.navigateToState(GAME_STATES.PROFILE);
                } else if (area.action === 'leaderboard') {
                    this.game.showLeaderboard();
                } else if (area.action === 'options') {
                    this.game.navigateToState(GAME_STATES.OPTIONS);
                } else if (area.action === 'credits') {
                    this.game.navigateToState(GAME_STATES.CREDITS);
                } else if (area.action === 'shop') {
                    this.game.navigateToState(GAME_STATES.SHOP);
                } else if (area.action === 'achievements') {
                    this.game.navigateToState(GAME_STATES.ACHIEVEMENTS);
                } else if (area.action === 'character-customization') {
                    this.game.navigateToState(GAME_STATES.CHARACTER_CUSTOMIZATION);
                }
                
                break;
            }
        }
    }

    handleOptionsClick(x, y) {
        if (this.game.optionsSystem && this.game.optionsHitAreas) {
            const action = this.game.optionsSystem.handleClick(x, y, this.game.optionsHitAreas);
            
            if (action) {
                if (action === 'tutorial') {
                    this.game.navigateToState(GAME_STATES.TUTORIAL);
                } else if (action === 'achievements') {
                    this.game.navigateToState(GAME_STATES.ACHIEVEMENTS);
                } else if (action === 'leaderboard') {
                    this.game.navigateToState(GAME_STATES.LEADERBOARD);
                } else if (action === 'shop') {
                    this.game.navigateToState(GAME_STATES.SHOP);
                } else if (action === 'character') {
                    this.game.navigateToState(GAME_STATES.CHARACTER_CUSTOMIZATION);
                } else if (action === 'settings') {
                    this.game.navigateToState(GAME_STATES.SETTINGS);
                } else if (action === 'feedback') {
                    // Open feedback form in new tab
                    window.open('https://forms.office.com/r/mr8ienGv77', '_blank');
                } else if (action === 'back') {
                    this.game.navigateToState(GAME_STATES.HOME);
                }
            }
        }
    }

    handleCreditsClick(x, y) {
        if (this.game.creditsSystem && this.game.creditsHitAreas) {
            const action = this.game.creditsSystem.handleClick(x, y, this.game.creditsHitAreas);
            
            if (action === 'back') {
                this.game.navigateToState(GAME_STATES.HOME);
            }
        }
    }

    handleDifficultyClick(x, y) {
        console.log('🎯 Difficulty click at:', x, y);
        console.log('🎯 Hit areas:', this.game.difficultyHitAreas);
        
        if (!this.game.difficultyHitAreas) return;
        
        // Check if any difficulty button was clicked
        for (let i = 0; i < this.game.difficultyHitAreas.length; i++) {
            const area = this.game.difficultyHitAreas[i];
            console.log(`🎯 Checking area ${i}:`, area);
            
            if (x >= area.x && x <= area.x + area.width && 
                y >= area.y && y <= area.y + area.height) {
                
                console.log(`✅ Hit detected on area ${i}:`, area);
                
                // Play menu click sound
                if (this.game.audioSystem) {
                    this.game.audioSystem.onMenuClick();
                }

                // Handle different button actions
                if (area.action === 'back') {
                    console.log('🔙 Back button clicked');
                    this.game.navigateToState(GAME_STATES.HOME);
                } else if (area.action === 'difficulty') {
                    console.log(`🎮 Difficulty selected: ${area.difficulty}`);
                    this.game.selectedDifficulty = area.difficulty;
                    this.game.startGame(); // This will handle async
                } else if (area.action === 'adaptive-toggle') {
                    console.log('🔄 Adaptive difficulty toggled');
                    this.game.adaptiveDifficulty = !this.game.adaptiveDifficulty;
                }
                
                break;
            }
        }
    }

    handleGameOverClick(x, y) {
        if (!this.game.gameOverHitAreas) return;
        
        // Check if any game over button was clicked
        for (let i = 0; i < this.game.gameOverHitAreas.length; i++) {
            const area = this.game.gameOverHitAreas[i];
            if (x >= area.x && x <= area.x + area.width && 
                y >= area.y && y <= area.y + area.height) {
                
                // Play menu click sound
                if (this.game.audioSystem) {
                    this.game.audioSystem.onMenuClick();
                }
                
                // Handle different button actions
                switch (area.action) {
                    case 'restart':
                        this.game.restart();
                        break;
                        
                    case 'difficulty':
                        this.game.showDifficultySelection();
                        break;
                        
                    case 'home':
                        this.game.navigateToState(GAME_STATES.HOME);
                        break;
                        
                    case 'leaderboard':
                        this.game.showLeaderboard();
                        break;
                        
                    case 'shop':
                        this.game.navigateToState(GAME_STATES.SHOP);
                        break;
                        
                    case 'settings':
                        this.game.navigateToState(GAME_STATES.SETTINGS);
                        break;
                        
                    default:
                        console.warn(`Unknown game over action: ${area.action}`);
                        break;
                }
                
                break; // Stop checking other areas once we find a match
            }
        }
    }

    handleSettingsClick(x, y) {
        console.log('🎯 Settings click at:', x, y);
        if (this.game.settingsSystem && this.game.settingsHitAreas) {
            const action = this.game.settingsSystem.handleClick(x, y, this.game.settingsHitAreas);
            console.log('⚡ Settings action:', action);
            
            if (action === 'back') {
                console.log('🏠 Navigating back to OPTIONS');
                this.game.navigateToState(GAME_STATES.OPTIONS);
            }
        }
        
        // Close any expanded dropdowns if clicking outside them
        if (this.game.settingsSystem && this.game.settingsSystem.expandedDropdown) {
            let clickedOnDropdown = false;
            
            // Check if the click was on a dropdown or its options
            for (const area of this.game.settingsHitAreas || []) {
                if (x >= area.x && x <= area.x + area.width && 
                    y >= area.y && y <= area.y + area.height) {
                    if (area.action === 'dropdown' || area.action === 'dropdown-option') {
                        clickedOnDropdown = true;
                        break;
                    }
                }
            }
            
            // Close dropdown if not clicked on dropdown
            if (!clickedOnDropdown) {
                this.game.settingsSystem.expandedDropdown = null;
            }
        }
    }

    // Placeholder methods for handlers that would be delegated to other systems
    handleLeaderboardClick(x, y) {
        // This would be handled by the leaderboard system
        if (this.game.leaderboardSystem) {
            this.game.leaderboardSystem.handleClick(x, y);
        }
    }

    handleAchievementsClick(x, y) {
        // This would be handled by the achievements system
        if (this.game.achievementSystem) {
            this.game.achievementSystem.handleClick(x, y);
        }
    }

    handleShopClick(x, y) {
        console.log(`🛒 Shop click handler called: (${Math.round(x)}, ${Math.round(y)})`);
        // This would be handled by the game dialogs system
        if (this.game.gameDialogs) {
            console.log('🛒 Calling gameDialogs.handleShopClick');
            const result = this.game.gameDialogs.handleShopClick(x, y);
            console.log('🛒 Shop click result:', result);
        } else {
            console.log('❌ gameDialogs not available');
        }
    }

    handlePauseClick(x, y) {
        // This would be handled by the pause system or game dialogs
        if (this.game.gameDialogs) {
            this.game.gameDialogs.handlePauseClick(x, y);
        }
    }

    handleResetConfirmClick(x, y) {
        // This would be handled by the reset confirmation dialog
        if (this.game.gameDialogs) {
            this.game.gameDialogs.handleResetConfirmClick(x, y);
        }
    }

    handleCharacterCustomizationClick(x, y) {
        console.log('🖱️ Character customization click:', x, y);
        // This would be handled by the character customization system
        if (this.game.characterCustomizationSystem) {
            console.log('📞 Calling characterCustomizationSystem.handleClick');
            const result = this.game.characterCustomizationSystem.handleClick(x, y);
            console.log('🔄 handleClick result:', result);
            return result;
        } else {
            console.log('❌ characterCustomizationSystem not found');
        }
    }

    /**
     * Handle profile screen hover events
     */
    handleProfileHover(x, y) {
        if (this.game.userProfileSystem) {
            // Create a mock event object for the profile system
            const mockEvent = {
                clientX: x + this.game.canvas.getBoundingClientRect().left,
                clientY: y + this.game.canvas.getBoundingClientRect().top
            };
            this.game.userProfileSystem.handleMouseMove(mockEvent);
        }
    }

    /**
     * Handle profile screen click events
     */
    handleProfileClick(x, y) {
        if (this.game.userProfileSystem) {
            // Create a mock event object for the profile system
            const mockEvent = {
                clientX: x + this.game.canvas.getBoundingClientRect().left,
                clientY: y + this.game.canvas.getBoundingClientRect().top
            };
            this.game.userProfileSystem.handleClick(mockEvent);
        }
    }
}
