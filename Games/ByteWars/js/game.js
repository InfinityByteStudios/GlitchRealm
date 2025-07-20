class Game {    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize audio manager
        this.audioManager = new AudioManager();
        
        // Set up dynamic canvas resizing
        this.setupCanvasResize();
          // Initialize game systems
        this.arena = new Arena(this.canvas.width, this.canvas.height);
        this.input = new InputManager();
        this.difficultyManager = new DifficultyManager(); // Add difficulty system
          this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        
        // Apply difficulty modifiers to player
        this.difficultyManager.applyPlayerModifiers(this.player);
        
        this.enemyManager = new EnemyManager(this.arena, this.difficultyManager);
        this.upgradeSystem = new UpgradeSystem(); // Add upgrade system
        this.visualEffects = new VisualEffects(); // Visual effects system
        this.ui = new ModernUI(); // Use the new modern UI system        // Game state
        this.score = 0;
        this.kills = 0;
        this.gameOver = false;
        this.paused = true; // Start paused during splash screen
        
        // Survival time tracking
        this.gameStartTime = null;
        this.survivalTime = 0;
          // Game timing
        this.lastTime = 0;
        this.running = true;
        this.gameStarted = false; // Track if game has started
          // Set up upgrade system event listener
        this.setupUpgradeEventListener();
        
        // Set up auto-pause when user switches tabs
        this.setupAutoFocusPause();
        
        this.showSplashScreen();
    }    showSplashScreen() {
        // Try to start intro music immediately when game loads
        console.log('🎵 Attempting to start Loading Intro music...');
        this.audioManager.testAutoplayAndPrompt().then(result => {
            if (result.success) {
                console.log('✅ Audio autoplay successful');
                // If autoplay works, proceed normally
                this.proceedWithSplashSequence();
            } else if (result.requiresPrompt) {
                console.log('🔇 Audio autoplay blocked, showing prompt');
                // If autoplay is blocked, show audio prompt
                this.showAudioPrompt();
            }
        });
    }

    proceedWithSplashSequence() {
        // Show studio splash screen for 3 seconds, then transition to game logo
        setTimeout(() => {
            this.showGameLogo();
        }, 3000);
    }    showAudioPrompt() {
        const audioPrompt = document.getElementById('audioPrompt');
        const enableAudioBtn = document.getElementById('enableAudioBtn');
        const continueWithoutAudioBtn = document.getElementById('continueWithoutAudioBtn');
        
        if (audioPrompt && enableAudioBtn && continueWithoutAudioBtn) {
            // Show the audio prompt overlay
            audioPrompt.classList.remove('hidden');
            
            // Set up event listeners for the buttons
            const enableAudioHandler = () => {
                console.log('🎵 User enabled audio');
                this.audioManager.enableAudioAfterInteraction().then(success => {
                    if (success) {
                        console.log('✅ Audio enabled after user interaction');
                    } else {
                        console.log('❌ Audio still failed after user interaction');
                    }
                });
                this.hideAudioPromptAndProceed();
                enableAudioBtn.removeEventListener('click', enableAudioHandler);
                continueWithoutAudioBtn.removeEventListener('click', continueWithoutAudioHandler);
            };
            
            const continueWithoutAudioHandler = () => {
                console.log('🔇 User chose to continue without audio');
                this.audioManager.disableAudio();
                this.hideAudioPromptAndProceed();
                enableAudioBtn.removeEventListener('click', enableAudioHandler);
                continueWithoutAudioBtn.removeEventListener('click', continueWithoutAudioHandler);
            };
            
            enableAudioBtn.addEventListener('click', enableAudioHandler);
            continueWithoutAudioBtn.addEventListener('click', continueWithoutAudioHandler);
        } else {
            console.warn('Audio prompt elements not found, proceeding without audio prompt');
            this.proceedWithSplashSequence();
        }
    }

    hideAudioPromptAndProceed() {
        const audioPrompt = document.getElementById('audioPrompt');
        if (audioPrompt) {
            audioPrompt.classList.add('hidden');
        }
        this.proceedWithSplashSequence();
    }showGameLogo() {
        const studioSplash = document.getElementById('studioSplash');
        const gameSplash = document.getElementById('gameSplash');
        
        if (studioSplash && gameSplash) {
            // Start fading out studio splash
            studioSplash.classList.remove('active');
            studioSplash.classList.add('fade-out');
            
            // Start fading in game logo slightly before studio splash finishes
            setTimeout(() => {
                gameSplash.classList.add('fade-in');
            }, 300);
            
            // Clean up studio splash after it's fully faded
            setTimeout(() => {
                studioSplash.style.display = 'none';
                studioSplash.classList.remove('fade-out');                // Show game logo for 2.0 seconds, then start audio crossfade and visual transition
                setTimeout(() => {
                    // Start audio crossfade 500ms before visual transition for seamless experience
                    this.audioManager.crossfadeAudio().catch(error => {
                        console.log('🔇 Enhanced crossfade failed, attempting fallback audio start:', error);
                    });
                    
                    // Start visual transition after brief delay
                    setTimeout(() => {
                        this.startGameFromLogo();
                    }, 500);
                }, 2000);
            }, 1000);
        } else {
            this.hideSplashScreen();
        }
    }    startGameFromLogo() {
        const gameSplash = document.getElementById('gameSplash');
        const gameContainer = document.getElementById('gameContainer');
        
        // Audio crossfade is handled earlier in showGameLogo() for perfect timing
        console.log('🎬 Starting visual transition to game...');
        
        if (gameSplash) {
            // Start fading out game logo
            gameSplash.classList.remove('fade-in');
            gameSplash.classList.add('fade-out');
            
            // Start showing game container with fade slightly before logo finishes
            setTimeout(() => {
                if (gameContainer) {
                    gameContainer.style.opacity = '0';
                    gameContainer.style.display = 'block';
                    gameContainer.style.transition = 'opacity 1s ease-in-out';
                    
                    // Fade in game container
                    setTimeout(() => {
                        gameContainer.style.opacity = '1';
                    }, 50);
                }
            }, 300);
            
            // Clean up game splash after fade completes
            setTimeout(() => {
                gameSplash.style.display = 'none';
                gameSplash.classList.remove('fade-out');
                this.showDifficultySelection();
            }, 1000);
        } else {
            this.showDifficultySelection();
        }
    }    hideSplashScreen() {
        // This method is now only used as a fallback if splash elements are missing
        const studioSplash = document.getElementById('studioSplash');
        const gameSplash = document.getElementById('gameSplash');
        
        if (studioSplash) studioSplash.style.display = 'none';
        if (gameSplash) gameSplash.style.display = 'none';
        this.start();
    }

    showDifficultySelection() {
        // Only show difficulty selection if game hasn't started or is over
        if (this.gameStarted && !this.gameOver) {
            console.log('Cannot show difficulty selection during active gameplay');
            return;
        }
        
        // Reset game state
        this.gameStarted = false;
        this.paused = true;
        
        // Show the difficulty selection screen
        const difficultyScreen = document.getElementById('difficultyScreen');
        if (difficultyScreen) {
            difficultyScreen.style.display = 'flex';
            
            // Create difficulty options if they don't exist
            if (!difficultyScreen.querySelector('.difficulty-option')) {
                this.createDifficultyOptions();
            }
        }
        
        // Set up event listeners for difficulty selection
        this.setupDifficultyEventListeners();
    }

    setupDifficultyEventListeners() {
        const difficultyOptions = document.querySelectorAll('.difficulty-option');
        
        difficultyOptions.forEach(option => {
            option.addEventListener('click', (event) => {
                const difficulty = event.currentTarget.getAttribute('data-difficulty');
                this.selectDifficulty(difficulty);
            });
        });
    }

    selectDifficulty(difficulty) {
        // Ignore difficulty selection if game is already in progress
        if (this.gameStarted && !this.gameOver) {
            console.log('Cannot change difficulty during active gameplay');
            return;
        }
        
        console.log(`🎮 Player selected difficulty: ${difficulty}`);
        
        // Reset game state
        this.score = 0;
        this.kills = 0;
        this.gameOver = false;
        this.paused = false;
        this.gameStartTime = 0;
        this.survivalTime = 0;
        
        // Reset player to center
        if (this.player) {
            this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        }
        
        // Set the difficulty in the difficulty manager
        if (this.difficultyManager.setDifficulty(difficulty)) {
            // Re-apply difficulty modifiers to player
            this.difficultyManager.applyPlayerModifiers(this.player);
            
            // Update enemy manager with new difficulty
            this.enemyManager = new EnemyManager(this.arena, this.difficultyManager);
            
            // Reset arena
            this.arena.resetSafeZone();
            
            // Hide difficulty selection screen
            const difficultyScreen = document.getElementById('difficultyScreen');
            if (difficultyScreen) {
                difficultyScreen.style.display = 'none';
            }
            
            // Start the game
            this.start();
        } else {
            console.error(`Failed to set difficulty: ${difficulty}`);
        }
    }

    changeDifficultyOnGameOver() {
        console.log('🎮 Player requested difficulty change from game over screen');
        
        // Hide game over screen
        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) {
            gameOverScreen.style.display = 'none';
        }
        
        // Reset to pre-game state
        this.gameOver = false;
        this.gameStarted = false;
        
        // Show difficulty selection
        this.showDifficultySelection();
    }start() {
        this.gameStarted = true;
        this.paused = false; // Unpause the game when it starts
        
        // Show the game container if it's not already visible
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer && gameContainer.style.display === 'none') {
            gameContainer.style.display = 'block';
        }
        
        // Ensure canvas is properly sized
        this.setupCanvasResize();
          // Give canvas focus for input
        this.canvas.focus();
        
        // Start the game loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
      setupCanvasResize() {
        // Function to resize canvas to fill viewport
        const resizeCanvas = () => {
            const canvas = this.canvas;
            const container = canvas.parentElement;
            
            // Get actual viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Set canvas internal resolution
            canvas.width = viewportWidth;
            canvas.height = viewportHeight;
            
            // Optimize canvas context for performance
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Update arena dimensions if it exists
            if (this.arena) {
                this.arena.width = viewportWidth;
                this.arena.height = viewportHeight;
            }
            
            // Reposition player to center if it exists
            if (this.player) {
                this.player.x = viewportWidth / 2;
                this.player.y = viewportHeight / 2;            }
        };
        
        // Initial resize
        resizeCanvas();
        
        // Resize on window resize
        window.addEventListener('resize', resizeCanvas);
        
        // Also handle orientation change on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(resizeCanvas, 100); // Small delay to ensure proper dimensions
        });
    }    gameLoop(currentTime) {
        if (!this.running) return;
        
        // Initialize lastTime on first frame
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
            requestAnimationFrame((time) => this.gameLoop(time));
            return;
        }
        
        // Calculate delta time in seconds
        var deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Cap delta time both minimum and maximum to prevent physics issues
        var cappedDeltaTime = Math.min(Math.max(deltaTime, 0.001), 0.033); // Cap between 1ms and ~33ms

        // Update survival time if game has started and not paused or game over
        if (this.gameStarted && !this.paused && !this.gameOver) {
            if (!this.gameStartTime) {
                this.gameStartTime = currentTime;
            }
            this.survivalTime = Math.max(0, (currentTime - this.gameStartTime) / 1000);
        }

        // Always handle input even when paused (for pause/unpause controls)
        this.handleGameInput();
        
        // Only update game systems if not paused
        if (!this.paused) {
            this.update(cappedDeltaTime);
        }
        
        this.render();

        // Update UI with current game data
        const gameData = {
            player: this.player,
            score: this.score,
            kills: this.kills,
            survivalTime: this.survivalTime,
            enemyCount: this.enemyManager.getActiveEnemyCount(),
            enemyManager: this.enemyManager,
            upgradeSystem: this.upgradeSystem,
            gameOver: this.gameOver,
            paused: this.paused,
            arena: this.arena,
            enemies: this.enemyManager.enemies
        };
        
        this.ui.update(deltaTime, gameData);
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }    update(deltaTime) {
        // Don't update game if game over
        if (this.gameOver) return;

        // Update player and capture action events for visual effects
        const playerActionEvents = this.player.update(deltaTime, this.input, this.arena);
        
        // Update arena (safe zone timer)
        this.arena.update(deltaTime, this.player.x, this.player.y);
        
        // Trigger visual effects for player actions
        if (playerActionEvents && playerActionEvents.dashActivated) {
            this.visualEffects.onDashUsed(this.player.x, this.player.y);
        }
        if (playerActionEvents && playerActionEvents.overclockActivated) {
            this.visualEffects.onOverclockActivated(this.player.x, this.player.y);
        }
        
        // Update enemies
        this.enemyManager.update(deltaTime, this.player);
          // Update visual effects
        this.visualEffects.update(deltaTime);
        
        // Handle difficulty-based healing
        this.handleDifficultyHealing(deltaTime);
        
        // Check bullet-enemy collisions
        const collisionResult = this.enemyManager.checkBulletCollisions(this.player.bullets, this.visualEffects);
        if (collisionResult.points > 0) {
            this.score += collisionResult.points;
            this.kills += collisionResult.kills;
            
            // Call player onKill method for each kill (to charge Overclock)
            for (let i = 0; i < collisionResult.kills; i++) {
                this.player.onKill();
            }
            
            // Trigger UI flash effects for visual feedback
            this.ui.flashScore();
            this.ui.flashKill();
        }        // Check player-enemy collisions
        const hitEnemy = this.enemyManager.checkPlayerCollisions(this.player, this.arena);
        if (hitEnemy) {
            // Get enemy-specific damage from difficulty manager
            const damage = this.difficultyManager.getEnemyDamage(hitEnemy.type);
            const playerDied = this.player.takeDamage(damage);
            
            // Trigger visual effects for player damage
            this.visualEffects.onPlayerHit(this.player.x, this.player.y, damage);if (playerDied) {
                // Reset safe zone when player dies
                this.arena.resetSafeZone();
                this.gameOver = true;
                console.log('Game Over!');
            }
        }
        
        // Check for wave completion to show upgrade menu
        this.checkForWaveCompletion();
    }render() {
        // Reset all canvas settings at the start
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
        
        // Apply screen shake offset
        const shakeOffset = this.visualEffects.getScreenShakeOffset();
        this.ctx.save();
        this.ctx.translate(shakeOffset.x, shakeOffset.y);
        
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(-shakeOffset.x, -shakeOffset.y, this.canvas.width, this.canvas.height);
        
        // Apply Overclock screen effects
        if (this.player.isOverclocked) {
            this.renderOverclockScreenEffects();
        }
        
        // Render arena
        this.arena.render(this.ctx);
        
        // Reset alpha between major renders
        this.ctx.globalAlpha = 1.0;
        
        // Render enemies
        this.enemyManager.render(this.ctx);
        
        // Reset alpha between major renders
        this.ctx.globalAlpha = 1.0;
        
        // Render player
        this.player.render(this.ctx);
        
        // Reset alpha between major renders
        this.ctx.globalAlpha = 1.0;
        
        // Render visual effects (sparks, damage numbers, etc.)
        this.visualEffects.render(this.ctx);
        
        // Reset alpha between major renders
        this.ctx.globalAlpha = 1.0;
        
        // Apply final Overclock overlay effects
        if (this.player.isOverclocked) {
            this.renderOverclockOverlay();
        }
        
        // Restore canvas transform and ensure alpha is reset
        this.ctx.restore();
        this.ctx.globalAlpha = 1.0;
    }    handleGameInput() {
        // Don't handle input if game hasn't started yet
        if (!this.gameStarted) {
            return;
        }
  
        
        // Close settings with ESC key
        if (this.input.wasKeyPressed('Escape')) {
            if (this.ui.settingsVisible) {
                this.ui.hideSettings();
            }
        }        // Toggle help display (pauses game)
        if (this.input.wasKeyPressed('KeyH')) {
            if (this.ui.helpVisible) {
                // Hide help and unpause
                this.ui.hideHelp();
                this.paused = false;
                this.wasManuallyPaused = false; // Clear manual pause flag
            } else {
                // Show help and pause
                this.ui.toggleHelp();
                this.paused = true;
                this.wasManuallyPaused = true; // Mark as manual pause
            }
        }

        // Toggle changelog display (pauses game)
        if (this.input.wasKeyPressed('KeyC')) {
            if (this.ui.changelogVisible) {
                // Hide changelog and unpause
                this.ui.hideChangelog();
                this.paused = false;
                this.wasManuallyPaused = false; // Clear manual pause flag
            } else {
                // Show changelog and pause
                this.ui.toggleChangelog();
                this.paused = true;
                this.wasManuallyPaused = true; // Mark as manual pause
            }
        }
          // Toggle general pause
        if (this.input.wasKeyPressed('KeyP')) {
            if (this.ui.changelogVisible) {
                // If changelog is open, close it first
                this.ui.hideChangelog();
            }
            if (this.ui.helpVisible) {
                // If help is open, close it first
                this.ui.hideHelp();
            }
            this.paused = !this.paused;
            this.wasManuallyPaused = this.paused; // Track manual pause state
        }          // Restart game (only when game over or paused)
        if (this.input.wasKeyPressed('KeyR') && (this.gameOver || this.paused)) {
            if (this.paused && !this.gameOver) {
                // Show confirmation for restart during pause
                if (confirm('Are you sure you want to restart? Current progress will be lost.')) {
                    this.restartGame();
                } else {
                    return; // Don't restart if user cancels
                }
            } else {
                // Direct restart when game is over
                this.restartGame();
            }
        }
          // Change difficulty when game over (press B)
        if (this.gameOver && this.input.wasKeyPressed('KeyB')) {
            this.changeDifficultyOnGameOver();
        }
    }    restartGame() {
        // Reset audio using AudioManager
        this.audioManager.reset();
        
        // Reset player
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        
        // Reset enemy manager
        this.enemyManager = new EnemyManager(this.arena, this.difficultyManager);
        
        // Reset safe zone
        this.arena.resetSafeZone();
        
        // Clear visual effects
        this.visualEffects.clear();
        
        // Reset upgrade system
        this.upgradeSystem.reset();
          // Reset game state
        this.score = 0;
        this.kills = 0;
        this.gameOver = false;
        this.gameStarted = false; // Reset game started flag
          // Reset survival time tracking
        this.gameStartTime = null;
        this.survivalTime = 0;
        
        // Show difficulty selection again
        this.showDifficultySelection();    }

    renderOverclockScreenEffects() {
        // Background color shift during Overclock
        const time = Date.now() / 1000;
        const intensity = 0.1 + 0.05 * Math.sin(time * 6); // Pulsing intensity
        
        // Apply magenta tint to background
        this.ctx.fillStyle = `rgba(255, 0, 255, ${intensity})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add scanning lines effect
        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
        this.ctx.lineWidth = 1;
        const lineSpacing = 4;
        const offset = (time * 200) % lineSpacing; // Moving lines
        
        for (let y = -offset; y < this.canvas.height + lineSpacing; y += lineSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    renderOverclockOverlay() {
        // Screen edge glow during Overclock
        const time = Date.now() / 1000;
        const glowIntensity = 0.3 + 0.2 * Math.sin(time * 4);
        
        // Create radial gradient from edges
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
        
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, maxRadius * 0.6,
            centerX, centerY, maxRadius
        );
        
        gradient.addColorStop(0, 'rgba(255, 0, 255, 0)');
        gradient.addColorStop(1, `rgba(255, 0, 255, ${glowIntensity})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Corner energy flashes
        const corners = [
            { x: 20, y: 20 },
            { x: this.canvas.width - 20, y: 20 },
            { x: 20, y: this.canvas.height - 20 },
            { x: this.canvas.width - 20, y: this.canvas.height - 20 }
        ];
        
        corners.forEach((corner, index) => {
            const flashTime = time * 3 + index * Math.PI / 2;
            const flashIntensity = Math.max(0, Math.sin(flashTime));
            
            if (flashIntensity > 0.7) {
                this.ctx.fillStyle = `rgba(255, 0, 255, ${flashIntensity})`;
                this.ctx.beginPath();
                this.ctx.arc(corner.x, corner.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
            }        });
    }
    
    setupUpgradeEventListener() {
        document.addEventListener('upgradeSelected', (event) => {
            this.handleUpgradeSelected(event.detail.upgradeId);
        });
    }
      handleUpgradeSelected(upgradeId) {
        console.log(`🔧 Player selected upgrade: ${upgradeId}`);
        
        // Apply the upgrade
        const effects = this.upgradeSystem.applyUpgrade(upgradeId);
        
        // Apply effects to player
        this.applyUpgradeEffectsToPlayer(effects);
        
        // Resume the game
        this.paused = false;
        this.wasManuallyPaused = false; // Clear manual pause flag when resuming
        
        // Continue with next wave
        this.enemyManager.continueAfterUpgrade();
    }
      applyUpgradeEffectsToPlayer(effects) {
        // Apply individual upgrade effects to player
        this.player.applyUpgradeEffects(effects);
        
        console.log(`🎯 Applied upgrade effects:`, effects);
    }
    
    checkForWaveCompletion() {
        const waveState = this.enemyManager.getWaveState();
        
        // Check if wave just completed and we haven't shown upgrade menu yet
        if (waveState === 'completed' && !this.upgradeSystem.shouldShowUpgradeMenu() && !this.paused) {
            const currentWave = this.enemyManager.getCurrentWave();
            
            // Handle wave completion healing before showing upgrade menu
            this.handleWaveCompletionHealing(currentWave);
            
            // Show upgrade menu at wave 2, wave 5, and then every 5 waves
            if (currentWave === 2 || (currentWave >= 5 && (currentWave - 5) % 5 === 0)) {
                this.showUpgradeMenu();
            }
        }
    }    showUpgradeMenu() {
        console.log('🎮 Showing upgrade menu...');
        
        // Generate upgrade choices
        const choices = this.upgradeSystem.generateUpgradeChoices();
        
        if (choices.length > 0) {
            // Mark that we're showing the upgrade menu
            this.upgradeSystem.setUpgradeMenuVisible(true);
            
            // Pause the game
            this.paused = true;
            this.wasManuallyPaused = true; // Upgrade menu pause is considered manual
            
            // Show the upgrade menu in UI
            this.ui.showUpgradeMenu(choices);
        }
    }
    
    setupAutoFocusPause() {
        // Track if the game was manually paused before losing focus
        this.wasManuallyPaused = false;
        
        // Pause game when window loses focus (user switches tabs)
        window.addEventListener('blur', () => {
            // Only auto-pause if the game has started and is currently running
            if (this.gameStarted && !this.gameOver && !this.paused) {
                this.wasManuallyPaused = false; // This is an auto-pause
                this.paused = true;
                console.log('🔄 Game auto-paused (focus lost)');
            } else if (this.gameStarted && !this.gameOver && this.paused) {
                // Game was already paused, remember it was manual
                this.wasManuallyPaused = true;
            }
        });
          // Resume game when window regains focus (user returns to tab)
        window.addEventListener('focus', () => {
            // Only auto-resume if the game has started, is not game over, 
            // is currently paused, and was not manually paused
            if (this.gameStarted && !this.gameOver && this.paused && !this.wasManuallyPaused) {
                this.paused = false;
                console.log('▶️ Game auto-resumed (focus regained)');
            }
        });
    }

    // Difficulty-based healing system methods
    handleDifficultyHealing(deltaTime) {
        // Only heal during waves if difficulty allows
        if (this.difficultyManager.shouldHealPlayer(this.enemyManager.getCurrentWave(), true)) {
            const healingRate = this.difficultyManager.getHealingRate();
            if (healingRate > 0 && this.player.health < this.player.maxHealth) {
                const oldHealth = this.player.health;
                this.player.heal(healingRate * deltaTime);
                
                // Trigger healing visual effect if health actually increased
                if (this.player.health > oldHealth) {
                    this.visualEffects.onPlayerHeal(this.player.x, this.player.y);
                }
            }
        }
    }

    handleWaveCompletionHealing(currentWave) {
        // Check if player should heal after wave completion
        if (this.difficultyManager.shouldHealPlayer(currentWave, false)) {
            const oldHealth = this.player.health;
            
            // Different healing amounts based on difficulty
            const config = this.difficultyManager.getCurrentDifficulty();
            let healAmount = 0;
            
            switch (config.healingType) {
                case 'after_wave':
                    healAmount = Math.ceil(this.player.maxHealth * 0.25); // 25% of max health
                    break;
                case 'every_3_waves':
                    healAmount = Math.ceil(this.player.maxHealth * 0.5); // 50% of max health for every 3rd wave
                    break;
                default:
                    healAmount = 0;
            }
            
            if (healAmount > 0 && this.player.health < this.player.maxHealth) {
                this.player.heal(healAmount);
                
                // Trigger healing visual effect with heal amount
                this.visualEffects.onPlayerHeal(this.player.x, this.player.y, healAmount);
                
                console.log(`💚 Wave ${currentWave} healing: +${healAmount} HP (${config.healingType})`);
            }
        }
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
