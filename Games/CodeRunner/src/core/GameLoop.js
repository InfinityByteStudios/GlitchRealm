/**
 * Game Loop and Update Logic - Main game loop, performance, and gameplay updates
 */

import { GAME_STATES, DIFFICULTY_LEVELS } from '../utils/constants.js';

export class GameLoop {
    constructor(game) {
        this.game = game;
    }

    /**
     * Main game loop - handles updating and rendering
     */
    gameLoop(timestamp) {
        try {
            const frameStartTime = performance.now();
            
            // Calculate delta time with frame limiting
            const currentTime = timestamp || performance.now();
            this.game.deltaTime = Math.min(currentTime - this.game.lastTime, 16.67); // Cap at ~60fps
            this.game.lastTime = currentTime;
            
            // Track frame timing for performance metrics
            const updateStartTime = performance.now();
            
            // Update FPS counter
            this.updateFPS(currentTime);
            
            // Update game state
            this.update();
            
            // Track update time
            this.game.performanceMetrics.updateTime = performance.now() - updateStartTime;
            
            // Track render start time
            const renderStartTime = performance.now();
            
            // Render everything
            this.game.render();
            
            // Track render time
            this.game.performanceMetrics.renderTime = performance.now() - renderStartTime;
            
            // Track total frame time
            this.game.performanceMetrics.frameTime = performance.now() - frameStartTime;
            
            // Adaptive performance optimization
            this.checkAndApplyAdaptiveOptimizations();
            
            // Continue the game loop
            requestAnimationFrame((ts) => this.gameLoop(ts));
        } catch (error) {
            console.error('🎮 Game loop error:', error);
            // Continue the loop even if there's an error to prevent the game from completely freezing
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }

    /**
     * Update FPS counter and performance metrics
     */
    updateFPS(currentTime) {
        this.game.frameCount++;
        
        if (currentTime - this.game.lastFpsUpdate >= 1000) {
            this.game.fps = Math.round((this.game.frameCount - this.game.lastFrameCount) * 1000 / (currentTime - this.game.lastFpsUpdate));
            this.game.lastFrameCount = this.game.frameCount;
            this.game.lastFpsUpdate = currentTime;
            
            // Store FPS history for performance monitoring
            if (this.game.performanceMetrics) {
                this.game.performanceMetrics.fpsHistory.push(this.game.fps);
                if (this.game.performanceMetrics.fpsHistory.length > 60) {
                    this.game.performanceMetrics.fpsHistory.shift();
                }
            }
        }
    }

    /**
     * Get performance metrics for UI display
     */
    getPerformanceMetrics() {
        return {
            fps: this.game.fps || 0,
            frameTime: this.game.performanceMetrics.frameTime || 0,
            updateTime: this.game.performanceMetrics.updateTime || 0,
            renderTime: this.game.performanceMetrics.renderTime || 0,
            fpsHistory: this.game.performanceMetrics.fpsHistory || []
        };
    }

    /**
     * Update game logic
     */
    update() {
        // Input manager uses event listeners, no update needed
        
        // Update systems based on game state
        switch (this.game.gameState) {
            case GAME_STATES.LOADING:
                if (this.game.loadingScreenSystem) {
                    this.game.loadingScreenSystem.update(this.game.deltaTime);
                }
                break;
                
            case GAME_STATES.PLAYING:
                this.updateGameplay();
                break;
                
            case GAME_STATES.OPENING_ANIMATION:
                if (this.game.openingAnimation) {
                    this.game.openingAnimation.update(this.game.deltaTime);
                }
                break;
                
            case GAME_STATES.TUTORIAL:
                if (this.game.tutorialSystem) {
                    this.game.tutorialSystem.update(this.game.deltaTime);
                }
                break;
                
            case GAME_STATES.PROFILE:
                if (this.game.userProfileSystem) {
                    // Auto-start the profile system if not active
                    if (!this.game.userProfileSystem.isActive) {
                        this.game.userProfileSystem.start();
                    }
                    this.game.userProfileSystem.update(this.game.deltaTime);
                }
                break;
                
            case GAME_STATES.LOGIN_PROMPT:
                if (this.game.loginSystem) {
                    this.game.loginSystem.update(this.game.deltaTime);
                }
                break;
                
            default:
                // Update background systems that should always run
                if (this.game.popupSystem) {
                    this.game.popupSystem.update(this.game.deltaTime);
                }
                break;
        }
        
        // Audio system doesn't need per-frame updates (event-driven)
    }

    /**
     * Update gameplay logic when in playing state
     */
    updateGameplay() {
        if (!this.game.player || !this.game.world) return;
        
        // Always update quantum dash animation (even when paused, since it controls the pause)
        if (this.game.quantumDashAnimation) {
            this.game.quantumDashAnimation.update(this.game.deltaTime);
        }
        
        // Skip other updates if paused
        if (this.game.isPaused) return;
        
        // Get input keys from input manager
        const inputKeys = this.game.inputManager ? this.game.inputManager.getKeys() : {};
        
        // Update player with all required parameters
        this.game.player.update(this.game.deltaTime, inputKeys, this.game.world, this.game.physics);
        
        // Update world
        this.game.world.update(this.game.deltaTime, this.game.camera);
        
        // Update physics
        if (this.game.physics) {
            this.game.physics.update(this.game.deltaTime);
        }
        
        // Update game systems
        if (this.game.powerUpSystem) {
            this.game.powerUpSystem.update(this.game.deltaTime);
        }
        
        if (this.game.lifeBoxSystem) {
            this.game.lifeBoxSystem.update(this.game.deltaTime);
        }
        
        // Update camera
        this.updateCamera();
        
        // Update screen shake
        this.updateScreenShake(this.game.deltaTime);
        
        // Update adaptive difficulty
        this.updateAdaptiveDifficulty();
        
        // Update score
        this.updateScore();
    }

    /**
     * Update camera position to follow player
     */
    updateCamera() {
        if (this.game.player) {
            this.game.camera.x = this.game.player.x - this.game.canvas.width / 2;
            this.game.camera.y = this.game.player.y - this.game.canvas.height / 2;
            
            // Prevent camera from showing empty space to the left of the world
            // Keep camera.x at minimum 0 so the left edge of the world is always at screen edge
            this.game.camera.x = Math.max(0, this.game.camera.x);
        }
    }

    /**
     * Update game score
     */
    updateScore() {
        if (this.game.player && this.game.gameState === GAME_STATES.PLAYING) {
            // Update score based on distance traveled
            const distanceScore = Math.floor(this.game.player.x / 10);
            this.game.score = distanceScore + this.game.bonusScore;
        }
    }

    /**
     * Update screen shake effect
     */
    updateScreenShake(deltaTime) {
        if (this.game.currentShake.duration > 0) {
            this.game.currentShake.duration -= deltaTime;
            
            if (this.game.currentShake.duration <= 0) {
                // Shake finished
                this.game.currentShake.x = 0;
                this.game.currentShake.y = 0;
                this.game.currentShake.intensity = 0;
            } else {
                // Continue shaking
                const shakeAmount = this.game.currentShake.intensity * this.game.shakeIntensity;
                this.game.currentShake.x = (Math.random() - 0.5) * shakeAmount;
                this.game.currentShake.y = (Math.random() - 0.5) * shakeAmount;
            }
        }
    }

    /**
     * Update adaptive difficulty based on player performance
     */
    updateAdaptiveDifficulty() {
        if (!this.game.adaptiveDifficulty || !this.game.player) return;
        
        const currentTime = Date.now();
        if (currentTime - this.game.lastPerformanceCheck < 5000) return; // Check every 5 seconds
        
        this.game.lastPerformanceCheck = currentTime;
        
        // Analyze player performance
        const survivalTime = (currentTime - this.game.startTime) / 1000;
        const currentScore = this.game.score;
        const recentDamage = this.game.player.lastDamageTime && (currentTime - this.game.player.lastDamageTime) < 10000;
        
        // Performance metrics
        const scoreRate = survivalTime > 0 ? currentScore / survivalTime : 0;
        const expectedScoreRate = this.getExpectedScoreRate();
        const performanceRatio = scoreRate / expectedScoreRate;
        
        // Record performance
        this.game.playerPerformanceHistory.push(performanceRatio);
        if (this.game.playerPerformanceHistory.length > 10) {
            this.game.playerPerformanceHistory.shift(); // Keep only last 10 entries
        }
        
        // Calculate average performance
        const avgPerformance = this.game.playerPerformanceHistory.reduce((a, b) => a + b, 0) / this.game.playerPerformanceHistory.length;
        
        // Adjust difficulty based on performance
        if (avgPerformance > 1.2) { // Player performing well
            this.game.consecutiveSuccesses++;
            this.game.consecutiveFailures = 0;
            if (this.game.consecutiveSuccesses >= 3) {
                this.game.adaptiveDifficultyMultiplier = Math.min(1.5, this.game.adaptiveDifficultyMultiplier + 0.1);
                this.game.consecutiveSuccesses = 0;
                console.log(`🎮 Adaptive difficulty increased: ${this.game.adaptiveDifficultyMultiplier.toFixed(2)}x`);
            }
        } else if (avgPerformance < 0.8 || recentDamage) { // Player struggling
            this.game.consecutiveFailures++;
            this.game.consecutiveSuccesses = 0;
            if (this.game.consecutiveFailures >= 2) {
                this.game.adaptiveDifficultyMultiplier = Math.max(0.7, this.game.adaptiveDifficultyMultiplier - 0.1);
                this.game.consecutiveFailures = 0;
                console.log(`🎮 Adaptive difficulty decreased: ${this.game.adaptiveDifficultyMultiplier.toFixed(2)}x`);
            }
        }
    }

    /**
     * Get expected score rate for current difficulty
     */
    getExpectedScoreRate() {
        const difficultyConfig = DIFFICULTY_LEVELS[this.game.selectedDifficulty];
        if (!difficultyConfig) return 100; // Default expected rate
        
        // Base expected score rate varies by difficulty
        const baseRates = {
            'EASY': 150,
            'MEDIUM': 120,
            'HARD': 100,
            'EXTREME': 80,
            'IMPOSSIBLE': 60
        };
        
        return baseRates[this.game.selectedDifficulty] || 100;
    }

    /**
     * Check and apply adaptive performance optimizations
     */
    checkAndApplyAdaptiveOptimizations() {
        const currentTime = performance.now();
        
        // Only check every 2 seconds
        if (currentTime - this.game.performanceMetrics.lastOptimizationCheck < 2000) return;
        this.game.performanceMetrics.lastOptimizationCheck = currentTime;
        
        // Calculate average FPS over last few frames
        const recentFps = this.game.performanceMetrics.fpsHistory.slice(-10);
        if (recentFps.length === 0) return;
        
        const avgFps = recentFps.reduce((a, b) => a + b, 0) / recentFps.length;
        
        // Detect low FPS
        if (avgFps < 50) {
            this.game.performanceMetrics.lowFpsCounter++;
            
            // If we've had low FPS for several checks, apply optimizations
            if (this.game.performanceMetrics.lowFpsCounter >= 3) {
                this.applyPerformanceOptimizations();
                this.game.performanceMetrics.lowFpsCounter = 0; // Reset counter
            }
        } else {
            // Reset low FPS counter if performance is good
            this.game.performanceMetrics.lowFpsCounter = 0;
            
            // Potentially restore quality if performance has been good for a while
            if (avgFps > 55 && this.game.performanceMetrics.adaptiveOptimizationLevel > 0) {
                this.restorePerformanceOptimizations();
            }
        }
    }

    /**
     * Apply performance optimizations to maintain FPS
     */
    applyPerformanceOptimizations() {
        if (this.game.performanceMetrics.adaptiveOptimizationLevel >= 3) return; // Max optimizations already applied
        
        this.game.performanceMetrics.adaptiveOptimizationLevel++;
        
        console.log(`⚡ Applying performance optimization level ${this.game.performanceMetrics.adaptiveOptimizationLevel}`);
        
        switch (this.game.performanceMetrics.adaptiveOptimizationLevel) {
            case 1:
                // Level 1: Reduce particle count
                if (this.game.world) {
                    this.game.world.particleCount *= 0.7;
                }
                break;
                
            case 2:
                // Level 2: Disable background particles
                this.game.backgroundParticles = false;
                break;
                
            case 3:
                // Level 3: Reduce graphics quality
                this.game.graphicsQuality = 'low';
                this.game.applyGraphicsQuality();
                break;
        }
    }

    /**
     * Restore performance optimizations when FPS is good
     */
    restorePerformanceOptimizations() {
        if (this.game.performanceMetrics.adaptiveOptimizationLevel <= 0) return; // No optimizations to restore
        
        console.log(`⚡ Restoring performance optimization level ${this.game.performanceMetrics.adaptiveOptimizationLevel}`);
        
        switch (this.game.performanceMetrics.adaptiveOptimizationLevel) {
            case 1:
                // Restore particle count
                if (this.game.world) {
                    this.game.world.particleCount /= 0.7;
                }
                break;
                
            case 2:
                // Restore background particles
                this.game.backgroundParticles = true;
                break;
                
            case 3:
                // Restore graphics quality
                if (window.generalSettings) {
                    this.game.graphicsQuality = window.generalSettings.getGraphicsQuality();
                } else {
                    this.game.graphicsQuality = 'medium';
                }
                this.game.applyGraphicsQuality();
                break;
        }
        
        this.game.performanceMetrics.adaptiveOptimizationLevel--;
    }

    /**
     * Trigger screen shake effect
     */
    triggerScreenShake(intensity, duration) {
        if (!this.game.screenShake) return;
        
        this.game.currentShake.intensity = intensity;
        this.game.currentShake.duration = duration;
    }

    /**
     * Update visual effects
     */
    updateVisualEffects(deltaTime) {
        // Update milestone effects
        for (let i = this.game.milestoneEffects.length - 1; i >= 0; i--) {
            const effect = this.game.milestoneEffects[i];
            effect.life -= deltaTime;
            
            if (effect.life <= 0) {
                // Return effect to pool
                if (this.game.effectPool.milestone.length < this.game.maxPoolSize) {
                    this.game.effectPool.milestone.push(effect);
                }
                this.game.milestoneEffects.splice(i, 1);
            } else {
                // Update effect
                effect.y -= effect.speed * deltaTime;
                effect.alpha = effect.life / effect.maxLife;
            }
        }
        
        // Update speed penalty effects
        for (let i = this.game.speedPenaltyEffects.length - 1; i >= 0; i--) {
            const effect = this.game.speedPenaltyEffects[i];
            effect.life -= deltaTime;
            
            if (effect.life <= 0) {
                // Return effect to pool
                if (this.game.effectPool.speedPenalty.length < this.game.maxPoolSize) {
                    this.game.effectPool.speedPenalty.push(effect);
                }
                this.game.speedPenaltyEffects.splice(i, 1);
            } else {
                // Update effect
                effect.y -= effect.speed * deltaTime;
                effect.alpha = effect.life / effect.maxLife;
            }
        }
    }

    /**
     * Create milestone effect
     */
    createMilestoneEffect(x, y, text) {
        let effect = null;
        
        // Try to get from pool first
        if (this.game.effectPool.milestone.length > 0) {
            effect = this.game.effectPool.milestone.pop();
        } else {
            effect = {};
        }
        
        // Configure effect
        effect.x = x;
        effect.y = y;
        effect.text = text;
        effect.life = 2000; // 2 seconds
        effect.maxLife = 2000;
        effect.speed = 50; // pixels per second
        effect.alpha = 1.0;
        effect.color = '#00ff00';
        
        this.game.milestoneEffects.push(effect);
    }

    /**
     * Create speed penalty effect
     */
    createSpeedPenaltyEffect(x, y, penalty) {
        let effect = null;
        
        // Try to get from pool first
        if (this.game.effectPool.speedPenalty.length > 0) {
            effect = this.game.effectPool.speedPenalty.pop();
        } else {
            effect = {};
        }
        
        // Configure effect
        effect.x = x;
        effect.y = y;
        effect.text = `-${penalty}`;
        effect.life = 1500; // 1.5 seconds
        effect.maxLife = 1500;
        effect.speed = 60; // pixels per second
        effect.alpha = 1.0;
        effect.color = '#ff4444';
        
        this.game.speedPenaltyEffects.push(effect);
    }
}
