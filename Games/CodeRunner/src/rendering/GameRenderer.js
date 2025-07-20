/**
 * GameRenderer - Handles all game rendering functionality
 */

import { GAME_STATES, DIFFICULTY_LEVELS, GAME_CONFIG } from '../utils/constants.js';
import { GameDialogs } from './GameDialogs.js';
import { GameUI } from './GameUI.js';

export class GameRenderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        
        // Initialize GameDialogs for dialog rendering
        this.dialogs = new GameDialogs(game);
        
        // Initialize GameUI for UI rendering (including FPS counter)
        this.gameUI = new GameUI(game);
        
        // Performance optimizations
        this.lastRenderState = null; // Cache last render state to avoid redundant operations
        this.backgroundParticleTime = 0; // Separate timing for background particles
        this.particleSkipFrames = 0; // Skip particle updates for performance
        this.renderOptimizations = {
            skipBackgroundParticles: false,
            reduceGradientComplexity: false,
            cacheGradients: true,
            particleQuality: 1.0,
            shadowQuality: 'medium',
            lightingQuality: 'medium'
        };
        
        // Cached gradients for performance
        this.gradientCache = new Map();
        this.maxCacheSize = 50; // Limit cache size to prevent memory issues
        
        // Frame skipping for animations
        this.animationFrameSkip = 0;
        this.maxAnimationFrameSkip = 2; // Skip every 2nd frame for animations when needed
    }

    /**
     * Clear the canvas with gradient background
     */
    clearCanvas() {
        // Create different gradient complexity based on graphics quality
        const quality = this.game.graphicsQuality;
        const gradientKey = `bg_${this.canvas.width}_${this.canvas.height}_${quality}`;
        let gradient = this.gradientCache.get(gradientKey);
        
        if (!gradient && this.renderOptimizations.cacheGradients) {
            gradient = this.createBackgroundGradient(quality);
            
            // Manage cache size to prevent memory issues
            if (this.gradientCache.size >= this.maxCacheSize) {
                const firstKey = this.gradientCache.keys().next().value;
                this.gradientCache.delete(firstKey);
            }
            
            this.gradientCache.set(gradientKey, gradient);
        } else if (!gradient) {
            gradient = this.createBackgroundGradient(quality);
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add additional background effects for higher quality
        if (quality === 'high' && !this.renderOptimizations.skipBackgroundParticles) {
            this.renderAdvancedBackgroundEffects();
        }
        
        // Add background particles during gameplay (optimized)
        if ((this.game.gameState === GAME_STATES.PLAYING || this.game.gameState === GAME_STATES.PAUSED) 
            && !this.renderOptimizations.skipBackgroundParticles
            && this.game.backgroundParticles) {
            this.renderBackgroundParticles();
        }
        
        // Add subtle lighting effects for medium and high quality
        if (quality !== 'low' && this.renderOptimizations.lightingQuality !== 'off') {
            this.renderBackgroundLighting();
        }
    }

    /**
     * Create background gradient based on graphics quality
     */
    createBackgroundGradient(quality) {
        const time = Date.now() * 0.0005;
        
        switch (quality) {
            case 'low':
                // Simple solid color background
                const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                gradient.addColorStop(0, '#0a0e14');
                gradient.addColorStop(1, '#151b26');
                return gradient;
                
            case 'medium':
                // Standard gradient
                const mediumGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                mediumGradient.addColorStop(0, '#0d1117');
                mediumGradient.addColorStop(0.5, '#161b22');
                mediumGradient.addColorStop(1, '#21262d');
                return mediumGradient;
                
            case 'high':
                // Complex animated radial gradient
                const centerX = this.canvas.width / 2 + Math.sin(time) * 100;
                const centerY = this.canvas.height / 2 + Math.cos(time * 0.7) * 80;
                const highGradient = this.ctx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, Math.max(this.canvas.width, this.canvas.height) * 0.8
                );
                highGradient.addColorStop(0, `rgba(16, 24, 40, ${0.9 + Math.sin(time * 2) * 0.1})`);
                highGradient.addColorStop(0.3, `rgba(13, 17, 23, ${0.95 + Math.sin(time * 1.5) * 0.05})`);
                highGradient.addColorStop(0.6, `rgba(21, 26, 45, ${0.8 + Math.cos(time * 1.2) * 0.1})`);
                highGradient.addColorStop(1, `rgba(10, 14, 20, ${0.98 + Math.sin(time * 0.8) * 0.02})`);
                return highGradient;
                
            default:
                return this.createBackgroundGradient('medium');
        }
    }

    /**
     * Render advanced background effects for high quality
     */
    renderAdvancedBackgroundEffects() {
        const time = Date.now() * 0.001;
        this.ctx.save();
        
        // Subtle animated overlay with multiple layers
        for (let i = 0; i < 3; i++) {
            const phase = time * (0.5 + i * 0.2);
            const alpha = 0.02 + Math.sin(phase) * 0.01;
            
            const overlay = this.ctx.createRadialGradient(
                this.canvas.width * (0.3 + i * 0.2), 
                this.canvas.height * (0.4 + Math.sin(phase) * 0.1), 
                0,
                this.canvas.width * 0.5, 
                this.canvas.height * 0.5, 
                Math.max(this.canvas.width, this.canvas.height) * 0.6
            );
            overlay.addColorStop(0, `rgba(0, 150, 200, ${alpha})`);
            overlay.addColorStop(0.5, `rgba(100, 50, 255, ${alpha * 0.5})`);
            overlay.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.fillStyle = overlay;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.ctx.restore();
    }

    /**
     * Render background lighting effects
     */
    renderBackgroundLighting() {
        if (this.game.graphicsQuality === 'low') return;
        
        const time = Date.now() * 0.0008;
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        
        // Number of light sources based on quality
        const lightCount = this.game.graphicsQuality === 'high' ? 4 : 2;
        
        for (let i = 0; i < lightCount; i++) {
            const phase = time + i * Math.PI * 0.5;
            const x = this.canvas.width * (0.2 + Math.sin(phase) * 0.6);
            const y = this.canvas.height * (0.3 + Math.cos(phase * 0.7) * 0.4);
            const radius = 200 + Math.sin(phase * 2) * 50;
            const intensity = 0.01 + Math.sin(phase * 3) * 0.005;
            
            const lightGradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
            lightGradient.addColorStop(0, `rgba(0, 255, 255, ${intensity})`);
            lightGradient.addColorStop(0.5, `rgba(0, 150, 255, ${intensity * 0.5})`);
            lightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.fillStyle = lightGradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.ctx.restore();
    }

    /**
     * Main render method - handles all game state rendering
     */    render() {        
        // Clear canvas for all states
        this.clearCanvas();

        if (this.game.gameState === GAME_STATES.LOADING) {
            if (this.game.loadingScreenSystem) {
                this.game.loadingScreenSystem.render();
            }
            return;
        }

        if (this.game.gameState === GAME_STATES.OPENING_ANIMATION) {
            if (this.game.openingAnimation) {
                this.game.openingAnimation.render();
            }
            return;
        }        if (this.game.gameState === GAME_STATES.LOGIN_PROMPT) {
            if (this.game.loginSystem) {
                this.game.loginSystem.render();
            }
            return;
        }

        if (this.game.gameState === GAME_STATES.TUTORIAL) {
            if (this.game.tutorialSystem) {
                this.game.tutorialSystem.render();
            }
            return;
        }

        if (this.game.gameState === GAME_STATES.TUTORIAL) {
            if (this.game.tutorialSystem) {
                this.game.tutorialSystem.render();
            }
            return;
        }

        if (this.game.gameState === GAME_STATES.POST_ANIMATION_POPUP) {
           
            this.dialogs.drawPostAnimationPopup();
            return;
        }
        
        if (this.game.gameState === GAME_STATES.HOME) {
           
            this.drawHomeScreen();
            return;
        }
        
        if (this.game.gameState === GAME_STATES.PROFILE) {
            this.drawProfileScreen();
            return;
        }
        
        if (this.game.gameState === GAME_STATES.OPTIONS) {
            this.drawOptionsMenu();
            return;
        }
        
        if (this.game.gameState === GAME_STATES.CREDITS) {
            this.drawCreditsScreen();
            return;
        }
        
        
        if (this.game.gameState === GAME_STATES.DIFFICULTY_SELECT) {
           
            this.drawDifficultySelection();
            return;
        }
          
        if (this.game.gameState === GAME_STATES.CHANGELOG) {
         
            this.drawChangelog();
            return;
        }
          if (this.game.gameState === GAME_STATES.LEADERBOARD) {
           
            this.drawLeaderboard();
            return;
        }
        
        if (this.game.gameState === GAME_STATES.ACHIEVEMENTS) {
           
            this.drawAchievements();
            return;
        }
          if (this.game.gameState === GAME_STATES.RESET_CONFIRM) {
         
            this.drawResetConfirmationDialog();
            return;
        }
        
        if (this.game.gameState === GAME_STATES.SHOP) {
         
            this.drawShop();
            return;
        }
        
        if (this.game.gameState === GAME_STATES.SETTINGS) {
            this.drawSettings();
            return;
        }
        
        if (this.game.gameState === GAME_STATES.CHARACTER_CUSTOMIZATION) {
            // Use the CharacterCustomizationSystem's enhanced render method
            if (this.game.characterCustomizationSystem) {
                this.game.characterCustomizationSystem.render(this.ctx, this.canvas, this.game.characterCustomizationHitAreas);
            }
            return;
        }
        
        this.ctx.save();
        
        // Get camera position with screen shake applied
        const cameraPos = this.game.getCameraPosition();
        
        // Render world and entities
        if (this.game.world) {
            this.game.world.draw(this.ctx, cameraPos);
        }
          if (this.game.player) {
            this.game.player.draw(this.ctx, cameraPos);
        }
          // Render powerups
        if (this.game.powerUpSystem) {
            this.game.powerUpSystem.render(this.ctx, cameraPos);
        }
          // Render life boxes
        if (this.game.lifeBoxSystem) {
            this.game.lifeBoxSystem.render(this.ctx);
        }
        
        // Render quantum dash animation effects (always render last for proper layering)
        if (this.game.quantumDashAnimation && this.game.quantumDashAnimation.isActive()) {
            this.game.quantumDashAnimation.render(this.ctx, cameraPos);
        }
        
        this.ctx.restore();// Render UI elements
        this.drawUI();
          // Render GameUI elements (including FPS counter)
        this.gameUI.drawUI();
        
        // Render tutorial quick hints (always visible when active)
        if (this.game.tutorialSystem && this.game.tutorialSystem.quickHint) {
            this.game.tutorialSystem.renderQuickHint();
        }
        
        // Render milestone effects during gameplay
        if (this.game.gameState === GAME_STATES.PLAYING || this.game.gameState === GAME_STATES.PAUSED) {
            this.game.renderMilestoneEffects(this.ctx);
        }
        
        if (this.game.gameState === GAME_STATES.PAUSED) {
            this.drawPauseOverlay();
        } else if (this.game.gameState === GAME_STATES.GAME_OVER) {
            this.drawGameOverOverlay();
        }
    }    /**
     * Draw UI elements specific to GameRenderer (minimal, GameUI handles most UI)
     */
    drawUI() {
        // GameRenderer now handles minimal UI - GameUI handles the main UI elements
        // This method is kept for any renderer-specific UI that shouldn't be in GameUI
        
        // Only handle renderer-specific overlays here if needed
        // Most UI is now handled by GameUI.drawUI()
    }

    /**
     * Draw pause overlay
     */    drawPauseOverlay() {
        // Use the enhanced pause overlay from GameDialogs instead of simple overlay
        if (this.dialogs) {
            this.dialogs.drawPauseOverlay();
        } else {
            // Fallback simple overlay if dialogs not available
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#f0f6fc';
            this.ctx.font = '24px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
            
            this.ctx.font = '14px Courier New';
            this.ctx.fillText('Press [ESC] to resume', this.canvas.width / 2, this.canvas.height / 2 + 30);
            
            this.ctx.textAlign = 'left';
        }
    }

    /**
     * Draw game over overlay
     */
    drawGameOverOverlay() {
        // Calculate fade progress (0 to 1)
        const currentTime = Date.now();
        
        const elapsed = currentTime - this.game.gameOverStartTime;
        let fadeProgress = Math.min(elapsed / GAME_CONFIG.GAME_OVER_FADE_DURATION, 1.0);
        
        // Skip animation if setting is enabled
        if (this.game.skipDeathAnimation) {
            fadeProgress = 1.0;
        }
        
        // Smooth easing function for more natural fade
        const easedProgress = fadeProgress * fadeProgress * (3 - 2 * fadeProgress); // smoothstep
        
        // Dark overlay with fade
        const overlayAlpha = 0.8 * easedProgress;
        this.ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Only show text elements if fade has progressed enough
        if (easedProgress < 0.1) return; // Wait for initial fade before showing text
        
        const textAlpha = Math.max(0, (easedProgress - 0.2) / 0.8); // Text fades in after overlay
          // Game Over title - use random death message
        this.ctx.fillStyle = `rgba(248, 81, 73, ${textAlpha})`;
        this.ctx.font = 'bold 36px Courier New';
        this.ctx.textAlign = 'center';
        const deathMessage = this.game.gameOverMessage || 'GAME OVER';
        this.ctx.fillText(deathMessage, this.canvas.width / 2, this.canvas.height / 2 - 60);
        
        // High Score Celebration Animation
        if (this.game.isNewHighScore && easedProgress > 0.3) {
            this.drawHighScoreCelebration(currentTime, textAlpha);
        }
        
        // Death reason
        if (this.game.gameOverReason) {
            this.ctx.fillStyle = `rgba(240, 246, 252, ${textAlpha})`;
            this.ctx.font = '16px Courier New';
            this.ctx.fillText(`Cause: ${this.game.gameOverReason}`, this.canvas.width / 2, this.canvas.height / 2 - 20);
        }
        
        // Player stats
        if (this.game.player) {
            this.ctx.fillStyle = `rgba(88, 166, 255, ${textAlpha})`;
            this.ctx.fillText(`Final Score: ${this.game.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
            
            // Show survival time - use gameOverStartTime to stop counting after death
            const survivalTime = Math.floor((this.game.gameOverStartTime - this.game.startTime) / 1000);
            this.ctx.fillText(`Survival Time: ${survivalTime}s`, this.canvas.width / 2, this.canvas.height / 2 + 30);            // Show best score
            const difficultyBestScore = this.game.bestScores[this.game.selectedDifficulty] || 0;
            if (difficultyBestScore > 0) {
                this.ctx.fillStyle = `rgba(255, 215, 0, ${textAlpha})`;
                this.ctx.fillText(`Best Score: ${difficultyBestScore}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
            }
        }          // Draw navigation buttons (only show when fade is nearly complete)
        if (easedProgress > 0.7) {
            const buttonAlpha = Math.max(0, (easedProgress - 0.7) / 0.3);
            this.drawGameOverButtons(buttonAlpha);
        }
        
        this.ctx.textAlign = 'left';
    }

    /**
     * Draw navigation buttons for game over screen
     */
    drawGameOverButtons(alpha) {
        // Clear any existing hit areas for game over
        this.game.gameOverHitAreas = [];
        
        const buttonWidth = 180;
        const buttonHeight = 40;
        const buttonSpacing = 10;
        const buttonsPerRow = 3;
        const totalRows = 2;
        
        // Calculate starting position to center the button grid
        const totalWidth = (buttonsPerRow * buttonWidth) + ((buttonsPerRow - 1) * buttonSpacing);
        const totalHeight = (totalRows * buttonHeight) + ((totalRows - 1) * buttonSpacing);
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = this.canvas.height / 2 + 80;
        
        // Button definitions
        const buttons = [
            { text: 'Restart', action: 'restart', color: '#22c55e' },
            { text: 'Difficulty', action: 'difficulty', color: '#3b82f6' },
            { text: 'Main Menu', action: 'home', color: '#8b5cf6' },
            { text: 'Leaderboard', action: 'leaderboard', color: '#f59e0b' },
            { text: 'Shop', action: 'shop', color: '#06b6d4' },
            { text: 'Settings', action: 'settings', color: '#ef4444' }
        ];
          buttons.forEach((button, index) => {
            const row = Math.floor(index / buttonsPerRow);
            const col = index % buttonsPerRow;
            
            const x = startX + (col * (buttonWidth + buttonSpacing));
            const y = startY + (row * (buttonHeight + buttonSpacing));
            
            const isHovered = this.game.hoveredGameOverButton === index;
            
            // Create soft green-to-blue gradient for hovered buttons
            let borderColor, glowColor;
            if (isHovered) {
                // Create gradient from soft green to blue
                const gradient = this.ctx.createLinearGradient(x, y, x + buttonWidth, y + buttonHeight);
                gradient.addColorStop(0, `rgba(34, 197, 94, ${alpha})`); // Soft green
                gradient.addColorStop(1, `rgba(59, 130, 246, ${alpha})`); // Soft blue
                borderColor = gradient;
                glowColor = 'rgba(46, 163, 170, 0.6)'; // Teal blend for glow
            } else {
                // Default solid color with lower opacity
                borderColor = `${button.color}${Math.floor(alpha * 180).toString(16).padStart(2, '0')}`;
            }
            
            // Draw button background
            this.ctx.fillStyle = `rgba(30, 30, 30, ${alpha * 0.9})`;
            this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
            
            // Add soft glow effect for hovered buttons
            if (isHovered) {
                this.ctx.save();
                this.ctx.shadowBlur = 12;
                this.ctx.shadowColor = glowColor;
                this.ctx.strokeStyle = borderColor;
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
                this.ctx.restore();
            } else {
                // Draw normal border
                this.ctx.strokeStyle = borderColor;
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
            }
            
            // Draw button text with slight glow on hover
            if (isHovered) {
                this.ctx.save();
                this.ctx.shadowBlur = 8;
                this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            }
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.font = 'bold 16px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(button.text, x + buttonWidth / 2, y + buttonHeight / 2 + 6);
            
            if (isHovered) {
                this.ctx.restore();
            }
            
            // Store hit area for click detection
            this.game.gameOverHitAreas.push({
                x, y, width: buttonWidth, height: buttonHeight,
                action: button.action
            });
        });
        
        this.ctx.textAlign = 'left';
    }

    /**
     * Draw flashy high score celebration animation
     */
    drawHighScoreCelebration(currentTime, baseAlpha) {
        const animationTime = currentTime - this.game.gameOverStartTime;
        const time = animationTime * 0.001; // Convert to seconds
        
        // Pulsing effect
        const pulse = Math.sin(time * 8) * 0.3 + 0.7;
        const bigPulse = Math.sin(time * 3) * 0.2 + 0.8;
        
        // Rainbow color cycling
        const hue = (time * 60) % 360;
        const rainbowColor = `hsl(${hue}, 100%, 70%)`;
        
        // Bouncing/scaling effect
        const bounce = Math.abs(Math.sin(time * 4)) * 0.3 + 1.0;
        
        this.ctx.save();
        
        // Main celebration text
        const celebrationAlpha = Math.min(baseAlpha * pulse, 1.0);
        this.ctx.fillStyle = rainbowColor.replace('70%', `70%, ${celebrationAlpha})`);
        this.ctx.font = `bold ${28 * bounce}px Courier New`;
        this.ctx.textAlign = 'center';
        
        // Add glow effect
        this.ctx.shadowBlur = 15 * pulse;
        this.ctx.shadowColor = rainbowColor;
        
        this.ctx.fillText('🎉 NEW HIGH SCORE! 🎉', this.canvas.width / 2, this.canvas.height / 2 - 100);
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
        
        // Draw celebration particles
        this.drawCelebrationParticles(currentTime, baseAlpha);
        
        this.ctx.restore();
    }

    /**
     * Draw animated celebration particles
     */
    drawCelebrationParticles(currentTime, alpha) {
        const time = (currentTime - this.game.gameOverStartTime) * 0.001;
        const particleCount = 12;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + time;
            const radius = 80 + Math.sin(time * 3 + i) * 20;
            const x = this.canvas.width / 2 + Math.cos(angle) * radius;
            const y = this.canvas.height / 2 - 100 + Math.sin(angle) * radius * 0.5;
            
            const particleAlpha = alpha * (0.7 + Math.sin(time * 5 + i) * 0.3);
            
            // Different colored particles
            const hue = (time * 30 + i * 30) % 360;
            this.ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${particleAlpha})`;
            
            const size = 4 + Math.sin(time * 4 + i) * 2;
            this.ctx.fillRect(x - size/2, y - size/2, size, size);
        }
    }

    /**
     * Draw firework burst effect
     */
    drawFireworkBurst(centerX, centerY, time, alpha) {
        const sparkCount = 8;
        const burstRadius = 40;
        
        for (let i = 0; i < sparkCount; i++) {
            const angle = (i / sparkCount) * Math.PI * 2;
            const distance = burstRadius * Math.min(time * 2, 1.0);
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            const sparkAlpha = alpha * Math.max(0, 1.0 - time);
            this.ctx.fillStyle = `rgba(255, 215, 0, ${sparkAlpha})`;
            this.ctx.fillRect(x - 2, y - 2, 4, 4);
        }
    }

    /**
     * Render background particles with performance optimizations
     */
    renderBackgroundParticles() {
        const quality = this.game.graphicsQuality;
        const time = Date.now() * 0.001;
        
        // Use frame skipping for better performance
        this.animationFrameSkip++;
        if (this.animationFrameSkip <= this.maxAnimationFrameSkip) {
            return; // Skip this frame
        }
        this.animationFrameSkip = 0;
        
        // Apply particle quality multiplier
        const particleQuality = this.renderOptimizations.particleQuality || 1.0;
        
        switch (quality) {
            case 'low':
                this.renderBasicParticles(time, particleQuality);
                break;
            case 'medium':
                this.renderMediumParticles(time, particleQuality);
                break;
            case 'high':
                this.renderAdvancedParticles(time, particleQuality);
                break;
        }
    }

    /**
     * Render basic particles for low quality
     */
    renderBasicParticles(time, particleQuality = 1.0) {
        // Very minimal particles - just a few static dots
        const particleCount = Math.max(1, Math.floor(3 * particleQuality));
        this.ctx.save();
        
        for (let i = 0; i < particleCount; i++) {
            const x = (i / particleCount) * this.canvas.width + Math.sin(time * 0.5 + i) * 20;
            const y = ((time * 0.02 + i * 0.3) % 1) * this.canvas.height;
            
            this.ctx.fillStyle = `rgba(0, 255, 255, ${0.1 * particleQuality})`;
            this.ctx.fillRect(x, y, 2, 2);
        }
        
        this.ctx.restore();
    }

    /**
     * Render medium quality particles
     */
    renderMediumParticles(time, particleQuality = 1.0) {
        // Standard binary particle effect
        this.particleSkipFrames++;
        if (this.particleSkipFrames % 2 === 0) {
            this.backgroundParticleTime = time;
        }
        
        const particleCount = Math.max(4, Math.floor(8 * particleQuality));
        this.ctx.save();
        
        for (let i = 0; i < particleCount; i++) {
            const x = (Math.sin(time * 0.3 + i * 343.3) * 0.5 + 0.5) * this.canvas.width;
            const y = ((time * 0.02 + i * 0.1) % 1) * this.canvas.height;
            
            const alpha = (0.05 + Math.sin(time + i) * 0.03) * particleQuality;
            this.ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
            this.ctx.font = '12px monospace';
            const digit = Math.floor(Math.sin(time * 2 + i * 10) * 4 + 4);
            this.ctx.fillText(digit === 0 ? '0' : '1', x, y);
        }
        
        this.ctx.restore();
    }

    /**
     * Render advanced particles for high quality
     */
    renderAdvancedParticles(time, particleQuality = 1.0) {
        this.ctx.save();
        
        // Complex multi-layer particle system - adjust based on quality
        if (particleQuality > 0.7) {
            this.renderMatrixRain(time, particleQuality);
            this.renderFloatingCode(time, particleQuality);
        }
        if (particleQuality > 0.5) {
            this.renderGlowParticles(time, particleQuality);
        }
        if (particleQuality > 0.3) {
            this.renderConnectedNodes(time, particleQuality);
        }
        
        this.ctx.restore();
    }

    /**
     * Render matrix-style digital rain
     */
    renderMatrixRain(time) {
        const columns = Math.floor(this.canvas.width / 20);
        
        for (let i = 0; i < columns; i++) {
            const x = i * 20;
            const speed = 0.5 + (i % 3) * 0.3;
            const offset = (time * speed + i * 100) % (this.canvas.height + 100);
            
            // Draw multiple characters in each column
            for (let j = 0; j < 5; j++) {
                const y = offset - j * 20;
                if (y > -20 && y < this.canvas.height + 20) {
                    const alpha = Math.max(0, 0.3 - j * 0.05) * (0.8 + Math.sin(time * 3 + i) * 0.2);
                    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
                    const char = chars[Math.floor(Math.sin(time * 2 + i * 7 + j) * chars.length/2 + chars.length/2)];
                    
                    this.ctx.fillStyle = `rgba(0, 255, 150, ${alpha})`;
                    this.ctx.font = '14px monospace';
                    this.ctx.fillText(char, x, y);
                }
            }
        }
    }

    /**
     * Render floating code snippets
     */
    renderFloatingCode(time) {
        const codeSnippets = [
            'function()', 'console.log', 'return null;', 'if (true)', 'await fetch', 
            'const x =', '=> {', '...args', 'new Promise', 'try { catch'
        ];
        
        for (let i = 0; i < 6; i++) {
            const x = (Math.sin(time * 0.2 + i * 2) * 0.7 + 0.15) * this.canvas.width;
            const y = ((time * 0.03 + i * 0.15) % 1) * this.canvas.height;
            const alpha = 0.03 + Math.sin(time * 2 + i) * 0.02;
            
            this.ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
            this.ctx.font = '10px monospace';
            this.ctx.fillText(codeSnippets[i % codeSnippets.length], x, y);
        }
    }

    /**
     * Render glowing particles
     */
    renderGlowParticles(time) {
        for (let i = 0; i < 12; i++) {
            const x = (Math.sin(time * 0.4 + i * 0.8) * 0.8 + 0.1) * this.canvas.width;
            const y = (Math.cos(time * 0.3 + i * 1.2) * 0.8 + 0.1) * this.canvas.height;
            const size = 3 + Math.sin(time * 3 + i) * 2;
            const alpha = 0.4 + Math.sin(time * 2 + i) * 0.3;
            
            // Create glow effect
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            gradient.addColorStop(0, `rgba(0, 255, 255, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(0, 150, 255, ${alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    /**
     * Render connected nodes network
     */
    renderConnectedNodes(time) {
        const nodes = [];
        const nodeCount = 8;
        
        // Generate node positions
        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: (Math.sin(time * 0.1 + i * 2) * 0.6 + 0.2) * this.canvas.width,
                y: (Math.cos(time * 0.15 + i * 1.5) * 0.6 + 0.2) * this.canvas.height
            });
        }
        
        // Draw connections
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dist = Math.sqrt(
                    Math.pow(nodes[i].x - nodes[j].x, 2) + 
                    Math.pow(nodes[i].y - nodes[j].y, 2)
                );
                
                if (dist < 200) {
                    const alpha = (200 - dist) / 200 * 0.2;
                    this.ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(nodes[i].x, nodes[i].y);
                    this.ctx.lineTo(nodes[j].x, nodes[j].y);
                    this.ctx.stroke();
                }
            }
        }
        
        // Draw nodes
        nodes.forEach((node, i) => {
            const pulse = 0.5 + Math.sin(time * 2 + i) * 0.3;
            this.ctx.fillStyle = `rgba(0, 255, 255, ${pulse})`;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }    /**
     * Draw the difficulty selection screen
     */
    drawDifficultySelection() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.save();
        
        // Clear previous hit areas
        this.game.difficultyHitAreas = [];
        
        // Animated gradient background
        const time = Date.now() * 0.001;
        const gradient = ctx.createRadialGradient(
            width/2 + Math.sin(time * 0.5) * 50, 
            height/2 + Math.cos(time * 0.3) * 30, 
            0, 
            width/2, height/2, 
            Math.max(width, height) * 0.8
        );
        gradient.addColorStop(0, 'rgba(13, 17, 23, 0.95)');
        gradient.addColorStop(0.3, 'rgba(30, 41, 59, 0.98)');
        gradient.addColorStop(0.7, 'rgba(21, 32, 43, 0.96)');
        gradient.addColorStop(1, 'rgba(13, 17, 23, 0.99)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Enhanced animated particles system
        this.drawDifficultyParticles(ctx, width, height, time);
        
        // Game title with glow effect
        this.drawEnhancedTitle(ctx, width, time);
        
        // Subtitle with effects
        this.drawSubtitle(ctx, width, time);
          // Check if there's a saved game and show continue option
        if (this.game.hasSavedGame && this.game.hasSavedGame()) {
            this.drawSavedGameNotice(ctx, width, time);
        }
        
        // Instructions with animated glow
        this.drawInstructions(ctx, width, time);
        
        // Enhanced difficulty options
        this.drawEnhancedDifficultyOptions(ctx, width, height, time);
        
        // Footer with version info
        this.drawFooter(ctx, width, height, time);
        
        ctx.restore();
    }
    
    /**
     * Draw enhanced particle system for difficulty screen
     */
    drawDifficultyParticles(ctx, width, height, time) {
        // Primary floating particles
        for (let i = 0; i < 12; i++) {
            const x = (Math.sin(time * 0.5 + i * 1.8) * 0.4 + 0.5) * width;
            const y = (Math.cos(time * 0.4 + i * 0.9) * 0.3 + 0.5) * height;
            const alpha = 0.15 + Math.sin(time * 2 + i) * 0.05;
            const size = 3 + Math.sin(time * 0.7 + i) * 2;
            
            ctx.fillStyle = `rgba(88, 166, 255, ${alpha})`;
            ctx.shadowColor = 'rgba(88, 166, 255, 0.5)';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Secondary particle trail
        for (let i = 0; i < 8; i++) {
            const x = (Math.cos(time * 0.3 + i * 2.2) * 0.6 + 0.5) * width;
            const y = (Math.sin(time * 0.6 + i * 1.1) * 0.4 + 0.5) * height;
            const alpha = 0.08 + Math.cos(time * 1.5 + i) * 0.03;
            const size = 1.5 + Math.cos(time * 0.9 + i) * 1;
            
            ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
            ctx.shadowColor = 'rgba(168, 85, 247, 0.3)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
    }
    
    /**
     * Draw enhanced title with glow effects
     */
    drawEnhancedTitle(ctx, width, time) {
        // Main title with animated glow
        const titleGlow = 0.3 + Math.sin(time * 2) * 0.1;
        ctx.shadowColor = 'rgba(88, 166, 255, ' + titleGlow + ')';
        ctx.shadowBlur = 20;
        
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 32px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('Code Runner', width / 2, 80);
        
        // Add secondary glow layer
        ctx.shadowColor = 'rgba(168, 85, 247, ' + (titleGlow * 0.5) + ')';
        ctx.shadowBlur = 30;
        ctx.fillText('Code Runner', width / 2, 80);
        
        ctx.shadowBlur = 0;
    }
    
    /**
     * Draw subtitle with effects
     */
    drawSubtitle(ctx, width, time) {
        ctx.font = '18px Courier New';
        ctx.fillStyle = '#7d8590';
        ctx.textAlign = 'center';
        
        // Animated text with subtle glow
        const textAlpha = 0.8 + Math.sin(time * 1.5) * 0.2;
        ctx.fillStyle = `rgba(125, 133, 144, ${textAlpha})`;
        ctx.fillText('Select Difficulty', width / 2, 110);
        
        ctx.font = '14px Courier New';
        ctx.fillStyle = `rgba(125, 133, 144, ${textAlpha * 0.8})`;
        ctx.fillText('Choose your survival challenge level', width / 2, 130);
    }
    
    /**
     * Draw saved game notice
     */
    drawSavedGameNotice(ctx, width, time) {
        const pulseAlpha = 0.7 + Math.sin(time * 3) * 0.3;
        ctx.fillStyle = `rgba(86, 211, 100, ${pulseAlpha})`;
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        
        // Add glow to saved game notice
        ctx.shadowColor = 'rgba(86, 211, 100, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(`💾 Saved Game Available`, width / 2, 155);
        ctx.shadowBlur = 0;
    }
    
    /**
     * Draw instructions with animated effects
     */
    drawInstructions(ctx, width, time) {
        ctx.font = '14px Courier New';
        const instructionAlpha = 0.6 + Math.sin(time * 2.5) * 0.2;
        ctx.fillStyle = `rgba(88, 166, 255, ${instructionAlpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('Click a difficulty to start the game', width / 2, 175);
    }
    
    /**
     * Draw enhanced difficulty options with better visuals
     */
    drawEnhancedDifficultyOptions(ctx, width, height, time) {
        let y = 220;
        const spacing = 110;
          this.game.difficultyKeys.forEach((diffKey, index) => {
            const difficulty = DIFFICULTY_LEVELS[diffKey];
            const isHovered = index === this.game.hoveredDifficulty;
            
            // Create enhanced hit area with wider buttons
            const hitArea = {
                x: width / 2 - 250,
                y: y - 25,
                width: 500,
                height: 95,
                index: index,
                action: 'difficulty',
                difficulty: diffKey
            };
            this.game.difficultyHitAreas.push(hitArea);
            
            // Animated hover effects
            const hoverScale = isHovered ? 1.02 : 1;
            const hoverOffset = isHovered ? Math.sin(time * 4) * 2 : 0;
            
            ctx.save();
            ctx.translate(width / 2, y + 25);
            ctx.scale(hoverScale, hoverScale);
            ctx.translate(-width / 2, -(y + 25));
            
            // Enhanced background with gradient
            if (isHovered) {
                const hoverGradient = ctx.createLinearGradient(hitArea.x, hitArea.y, hitArea.x + hitArea.width, hitArea.y + hitArea.height);
                const rgbColor = this.hexToRgb(difficulty.color);
                hoverGradient.addColorStop(0, `rgba(${rgbColor}, 0.2)`);
                hoverGradient.addColorStop(0.5, `rgba(${rgbColor}, 0.35)`);
                hoverGradient.addColorStop(1, `rgba(${rgbColor}, 0.2)`);
                ctx.fillStyle = hoverGradient;
            } else {
                ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
            }
            
            // Draw enhanced rounded rectangle
            this.drawRoundedRect(ctx, hitArea.x, hitArea.y + hoverOffset, hitArea.width, hitArea.height, 12);
            ctx.fill();
            
            // Enhanced border with glow
            if (isHovered) {
                ctx.shadowColor = difficulty.color;
                ctx.shadowBlur = 15;
                ctx.strokeStyle = difficulty.color;
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = '#30363d';
                ctx.lineWidth = 1;
            }
            
            this.drawRoundedRect(ctx, hitArea.x, hitArea.y + hoverOffset, hitArea.width, hitArea.height, 12);
            ctx.stroke();
            ctx.shadowBlur = 0;
              // Enhanced difficulty icon and name
            ctx.fillStyle = difficulty.color;
            ctx.font = isHovered ? 'bold 22px Courier New' : 'bold 18px Courier New';
            ctx.textAlign = 'left';
            
            // Draw icon with glow
            if (isHovered) {
                ctx.shadowColor = difficulty.color;
                ctx.shadowBlur = 10;
            }
            
            const iconX = width / 2 - 220;
            const nameX = width / 2 - 190;
            ctx.fillText(difficulty.emoji, iconX, y + 15 + hoverOffset);
            ctx.fillText(difficulty.name, nameX, y + 15 + hoverOffset);
            ctx.shadowBlur = 0;            
            // Enhanced description with better formatting and smaller text
            ctx.fillStyle = isHovered ? '#c9d1d9' : '#8b949e';
            ctx.font = isHovered ? 'bold 13px Courier New' : '12px Courier New';
            
            if (difficulty.healthRegenInterval > 0) {
                // Show life box frequency instead of health regeneration
                const lifeBoxFrequency = {
                    EASY: "Frequent life boxes",
                    MEDIUM: "Moderate life boxes", 
                    HARD: "Rare life boxes"
                }[Object.keys(DIFFICULTY_LEVELS)[index]] || "Life boxes available";
                ctx.fillText(`❤️ ${lifeBoxFrequency}`, nameX, y + 40 + hoverOffset);
            } else {
                ctx.fillStyle = isHovered ? '#f85149' : '#da3633';
                ctx.fillText(`💀 No life boxes - Extreme challenge!`, nameX, y + 40 + hoverOffset);
            }
            
            // Add difficulty rating stars
            this.drawDifficultyRating(ctx, nameX, y + 65 + hoverOffset, index + 1, isHovered, difficulty.color);
            
            ctx.restore();
            y += spacing;
        });
        
        // Add back button
        const backButtonY = height - 100;
        const backHitArea = {
            x: 50,
            y: backButtonY - 25,
            width: 120,
            height: 50,
            action: 'back'
        };
        this.game.difficultyHitAreas.push(backHitArea);
        
        // Draw back button
        ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
        this.drawRoundedRect(ctx, backHitArea.x, backHitArea.y, backHitArea.width, backHitArea.height, 8);
        ctx.fill();
        
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, backHitArea.x, backHitArea.y, backHitArea.width, backHitArea.height, 8);
        ctx.stroke();
        
        ctx.fillStyle = '#58a6ff';
        ctx.font = '14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('← Back', backHitArea.x + backHitArea.width / 2, backHitArea.y + backHitArea.height / 2 + 5);
    }
      /**
     * Draw difficulty rating stars
     */
    drawDifficultyRating(ctx, x, y, level, isHovered, color) {
        ctx.font = isHovered ? '14px Courier New' : '12px Courier New';
        ctx.fillStyle = isHovered ? '#f0f6fc' : '#7d8590';
        ctx.fillText('Challenge: ', x, y);
        
        const starX = x + 75;
        for (let i = 0; i < 4; i++) {
            if (i < level) {
                ctx.fillStyle = color;
                if (isHovered) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 5;
                }
            } else {
                ctx.fillStyle = '#30363d';
                ctx.shadowBlur = 0;
            }
            ctx.fillText('★', starX + i * 20, y);
        }
        ctx.shadowBlur = 0;
    }
    
    /**
     * Draw footer with version info
     */
    drawFooter(ctx, width, height, time) {
        ctx.font = '12px Courier New';
        const footerAlpha = 0.4 + Math.sin(time * 1.5) * 0.1;
        ctx.fillStyle = `rgba(125, 133, 144, ${footerAlpha})`;
        ctx.textAlign = 'center';
        ctx.fillText(`Version ${this.game.changelogData.version} | ${this.game.changelogData.lastUpdated}`, width / 2, height - 30);
        ctx.fillText('Click a difficulty to start the game', width / 2, height - 15);
    }
    
    /**
     * Helper function to convert hex to RGB values
     */
    hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse r, g, b values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `${r}, ${g}, ${b}`;
    }

    /**
     * Draw rounded rectangle
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
     * Convert hex color to rgba format with specified alpha
     */
    hexToRgba(hex, alpha) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse r, g, b values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Convert hex color to rgb format
     */    hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse r, g, b values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `${r}, ${g}, ${b}`;
    }    /**
     * Draw the leaderboard screen - delegates to GameDialogs
     */
    drawLeaderboard() {
        if (this.dialogs) {
            this.dialogs.drawLeaderboard(this.game.leaderboardSystem, this.game.tabHitAreas);
        }
    }    /**
     * Draw the achievements screen - delegates to GameDialogs
     */
    drawAchievements() {
        if (this.game.achievementSystem) {
            this.game.achievementSystem.drawAchievementsScreen(
                this.ctx, 
                this.canvas.width, 
                this.canvas.height, 
                this.game.achievementsHitAreas
            );
        }
    }

    /**
        }
    }    /**
     * Draw the shop screen - delegates to GameDialogs
     */
    drawShop() {
        if (this.dialogs) {
            // Initialize hit areas array if not exists
            if (!this.game.shopHitAreas) {
                this.game.shopHitAreas = [];
            }
            this.dialogs.drawShop(this.game.shopHitAreas);
        }
    }/**
     * Draw the reset confirmation dialog - delegates to GameDialogs
     */
    drawResetConfirmationDialog() {
        if (this.dialogs) {
            this.dialogs.drawResetConfirmationDialog();
        }
    }

    /**
     * Draw the home screen using the new HomeScreenSystem
     */
    drawHomeScreen() {
        if (this.game.homeScreenSystem) {
            this.game.homeScreenSystem.render(
                this.ctx, 
                this.canvas.width, 
                this.canvas.height, 
                this.game.homeHitAreas || []
            );
        }
    }

    /**
     * Draw the profile screen using UserProfileSystem
     */
    drawProfileScreen() {
        if (this.game.userProfileSystem) {
            this.game.userProfileSystem.render();
        }
    }

    /**
     * Draw the options menu using OptionsSystem
     */
    drawOptionsMenu() {
        if (this.game.optionsSystem) {
            this.game.optionsHitAreas = this.game.optionsSystem.render(this.ctx, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Draw the credits screen using CreditsSystem
     */
    drawCreditsScreen() {
        if (this.game.creditsSystem) {
            this.game.creditsHitAreas = this.game.creditsSystem.render(this.ctx, this.canvas.width, this.canvas.height);
        }
    }
    
    /**
     * Draw the settings screen using SettingsSystem
     */
    drawSettings() {
        if (this.game.settingsSystem) {
            // Initialize hit areas array if it doesn't exist
            if (!this.game.settingsHitAreas) {
                this.game.settingsHitAreas = [];
            }
            
            // Render the settings system with proper parameters
            this.game.settingsSystem.render(this.ctx, this.canvas, this.game.settingsHitAreas);
        }
    }
    
    /**
     * Set renderer optimization settings
     * @param {Object} options - Optimization options
     * @param {boolean} [options.skipBackgroundParticles] - Whether to skip background particles
     * @param {boolean} [options.reduceGradientComplexity] - Whether to reduce gradient complexity
     * @param {number} [options.particleQuality] - Quality factor for particles (0-1)
     * @param {string} [options.shadowQuality] - Shadow quality (none, low, medium, high)
     * @param {string} [options.lightingQuality] - Lighting quality (none, low, medium, high)
     */
    setRenderOptimizations(options) {
        this.renderOptimizations = {
            ...this.renderOptimizations,
            ...options
        };
        
        console.log('🎮 Render optimizations applied:', this.renderOptimizations);
    }
}
