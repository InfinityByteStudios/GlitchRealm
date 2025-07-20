/**
 * GameUI - Handles all UI rendering functionality separate from core game logic
 */

import { GAME_STATES, DIFFICULTY_LEVELS } from '../utils/constants.js';

export class GameUI {    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        
        // Store references to DOM UI elements if needed
        this.uiScore = document.getElementById('score');
        this.uiBest = document.getElementById('bestScore');
        this.uiHealth = document.getElementById('health');
        
        // UI state
        this.purchaseEffects = [];
        this.resetDialogHitAreas = [];
        this.tabHitAreas = [];    }

    /**
     * Draw all UI elements for the current game state
     */    drawUI() {
        if (this.game.gameState === GAME_STATES.PLAYING || this.game.gameState === GAME_STATES.PAUSED) {
            // Draw main HUD elements in a cohesive layout
            this.drawMainHUD();
        }

        // Autosave status indicator (top right corner during gameplay)
        if ((this.game.gameState === GAME_STATES.PLAYING || this.game.gameState === GAME_STATES.PAUSED) && 
            this.game.showAutosaveIndicator && this.game.autosaveStatus) {
            this.drawAutosaveIndicator();
        }
            // Performance monitoring display (top right)
        if (this.game.showPerformanceDisplay) {
            this.drawPerformanceDisplay();
        }        // Simple FPS counter (if enabled in settings)
        if (this.game.showFpsCounter) {
            this.drawSimpleFpsCounter();
        }
        
        // NOTE: Achievement notifications are now handled by Game.js render() at the highest z-level
        // This ensures they appear above all other UI including death menu
    }
    
    /**
     * Draw pixelated health hearts
     */
    drawHealthHearts() {
        // This method is now replaced by drawCompactHealthHearts in the main HUD
        // Keeping for backward compatibility if needed
        const player = this.game.player;
        if (!player) return;
        
        const maxHearts = player.maxHealth;
        const currentHealth = player.health;
        const heartSize = 16;
        const spacing = 20;
        const startX = 15;
        const startY = 25;
        
        for (let i = 0; i < maxHearts; i++) {
            const isFilled = i < currentHealth;
            this.drawPixelHeart(startX + i * spacing, startY, heartSize, isFilled);
        }
    }
    
    /**
     * Draw a single pixelated heart
     */
    drawPixelHeart(x, y, size, filled) {
        const ctx = this.ctx;
        const pixelSize = size / 8;
        
        // Heart shape pattern (8x8 grid)
        //  01234567
        // 0 -##-##-
        // 1 ####### 
        // 2 #######
        // 3 #######
        // 4 -#####-
        // 5 --###--
        // 6 ---#---
        // 7 -------
        
        const heartPattern = [
            [0,1,1,0,1,1,0],
            [1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1],
            [0,1,1,1,1,1,0],
            [0,0,1,1,1,0,0],
            [0,0,0,1,0,0,0]
        ];
        
        // Colors for filled and empty hearts
        const fillColor = filled ? '#ff6b6b' : '#6e7681';
        const strokeColor = filled ? '#e54c4c' : '#484f58';
        
        // Draw each pixel of the heart
        for (let row = 0; row < heartPattern.length; row++) {
            for (let col = 0; col < heartPattern[row].length; col++) {
                if (heartPattern[row][col] === 1) {
                    ctx.fillStyle = fillColor;
                    ctx.fillRect(x + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
                    
                    // Add a slight 3D effect with darker edges
                    ctx.fillStyle = strokeColor;
                    ctx.fillRect(x + col * pixelSize + pixelSize - 1, y + row * pixelSize, 1, pixelSize);
                    ctx.fillRect(x + col * pixelSize, y + row * pixelSize + pixelSize - 1, pixelSize, 1);
                }
            }
        }
    }
      /**
     * Draw performance monitoring display
     */
    drawPerformanceDisplay() {
        const metrics = this.game.getPerformanceMetrics();
        const x = this.canvas.width - 180;
        const y = 200; // Moved down to avoid conflicting with right panel
        
        // Compact modern panel
        this.drawModernPanel(x - 10, y - 5, 170, 110, 'rgba(124, 58, 237, 0.3)');
        
        // Title
        this.ctx.fillStyle = '#f0f6fc';
        this.ctx.font = 'bold 10px "SF Mono", "Monaco", monospace';
        this.ctx.fillText('⚡ PERFORMANCE', x, y + 10);
          // FPS with color coding
        const fpsColor = metrics.fps >= 50 ? '#40d158' : metrics.fps >= 30 ? '#d1a01f' : '#f85149';
        this.ctx.fillStyle = fpsColor;
        this.ctx.font = '9px "SF Mono", "Monaco", monospace';
        this.ctx.fillText(`FPS: ${metrics.fps}`, x, y + 25);
        
        // Frame timing
        this.ctx.fillStyle = '#79c0ff';        
        this.ctx.fillText(`Render: ${metrics.renderTime.toFixed(1)}ms`, x, y + 40);
        this.ctx.fillText(`Update: ${metrics.updateTime.toFixed(1)}ms`, x, y + 55);
        
        // World metrics
        this.ctx.fillStyle = '#ffd700';        
        this.ctx.fillText(`Entities: ${metrics.entities}`, x, y + 70);
        this.ctx.fillText(`Chunks: ${metrics.chunks}`, x, y + 85);
        
        // Resolution
        this.ctx.fillStyle = '#7d8590';
        this.ctx.fillText(`${metrics.resolution}`, x, y + 100);
    }    /**
     * Draw simple FPS counter (compact display)
     */
    drawSimpleFpsCounter() {
        const metrics = this.game.getPerformanceMetrics();
        
        // Position in bottom-left corner to avoid all UI conflicts
        const x = 15;
        const y = this.canvas.height - 30; // Bottom of screen, above F3 hints
        
        // Save current context state
        this.ctx.save();
        
        // FPS with color coding (no background rectangle)
        const fpsColor = metrics.fps >= 50 ? '#40d158' : metrics.fps >= 30 ? '#d1a01f' : '#f85149';
          this.ctx.fillStyle = fpsColor;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`FPS: ${metrics.fps}`, x, y);
        
        // Restore context state
        this.ctx.restore();
    }
    
    // Legacy methods - now integrated into main HUD
    // Keeping for potential backward compatibility
    
    /**
     * Update HTML UI elements (if present)
     */updateUI() {
        if (this.uiScore) this.uiScore.textContent = this.game.score;
        if (this.uiBest) {
            const difficultyBestScore = this.game.bestScores[this.game.selectedDifficulty] || 0;
            this.uiBest.textContent = difficultyBestScore;
        }
        if (this.uiHealth && this.game.player) this.uiHealth.textContent = this.game.player.health;
    }

    /**
     * Create a utility method to draw rounded rectangles
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
    }    /**
     * Draw autosave status indicator
     */
    drawAutosaveIndicator() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Position in top-right corner of the screen, outside main panels
        const x = canvas.width - 15;
        const y = 15;
        
        // Set text alignment
        ctx.textAlign = 'right';
        ctx.font = '10px "SF Mono", "Monaco", monospace';        
        // Status-specific styling with modern look
        switch (this.game.autosaveStatus) {
            case 'saving':
                ctx.fillStyle = '#f1c232';
                ctx.fillText(`💾 SAVING`, x, y);
                break;
            case 'saved':
                ctx.fillStyle = '#56d364';
                ctx.fillText(`✓ SAVED`, x, y);
                break;            
            case 'error':
                ctx.fillStyle = '#f85149';
                ctx.fillText(`⚠ ERROR`, x, y);
                break;            
            case 'loaded':
                ctx.fillStyle = '#58a6ff';
                ctx.fillText(`📂 LOADED`, x, y);
                break;
        }
        
        // Reset text alignment
        ctx.textAlign = 'left';
    }

    /**
     * Draw enhanced score panel with detailed information
     */
    drawEnhancedScorePanel() {
        const ctx = this.ctx;
        const panelWidth = 280;
        const panelHeight = 150;
        const panelX = 15;
        const panelY = 15;
        
        // Panel background with modern design
        const gradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
        gradient.addColorStop(0, 'rgba(13, 17, 23, 0.95)');
        gradient.addColorStop(1, 'rgba(21, 32, 43, 0.90)');
        ctx.fillStyle = gradient;
        this.drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 8);
        ctx.fill();
        
        // Panel border with game theme
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.6)';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 8);
        ctx.stroke();
          // Calculate various score metrics
        const currentScore = this.game.score;
        const difficultyBestScore = this.game.bestScores[this.game.selectedDifficulty] || 0;const totalPlayTime = this.game.startTime > 0 ? Math.floor((Date.now() - this.game.startTime) / 1000) : 0;
        const bonuses = this.game.upgradeSystem ? this.game.upgradeSystem.getBonuses() : { jumpHeight: 0, scoreMultiplier: 1.0, powerUpDuration: 0 };
        const dataPackets = this.game.upgradeSystem ? this.game.upgradeSystem.getDataPackets() : 0;
        const difficulty = DIFFICULTY_LEVELS[this.game.selectedDifficulty];        // Panel title
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(`📊 Game Statistics`, panelX + 10, panelY + 20);
        
        let yOffset = panelY + 45;
        const lineHeight = 16;
        const leftCol = panelX + 10;
        const rightCol = panelX + 150;        // Current score with progress indicator
        ctx.font = '13px Courier New';
        ctx.fillStyle = '#58a6ff';
        ctx.fillText(`Score:`, leftCol, yOffset);
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 13px Courier New';
        ctx.fillText(`${currentScore}`, rightCol, yOffset);
        
        // Best score comparison
        yOffset += lineHeight;
        ctx.font = '13px Courier New';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Best:`, leftCol, yOffset);if (difficultyBestScore > 0) {
            const isNewRecord = currentScore > difficultyBestScore;
            ctx.fillStyle = isNewRecord ? '#40d158' : '#ffd700';
            ctx.font = isNewRecord ? 'bold 13px Courier New' : '13px Courier New';
            ctx.fillText(`${difficultyBestScore}${isNewRecord ? ' ⬆️' : ''}`, rightCol, yOffset);        } else {
            ctx.fillStyle = '#8b949e';
            ctx.fillText('No Record', rightCol, yOffset);
        }
          // Play time
        yOffset += lineHeight;
        ctx.font = '13px Courier New';
        ctx.fillStyle = '#7c3aed';
        ctx.fillText(`Time:`, leftCol, yOffset);
        ctx.fillStyle = '#f0f6fc';
        const minutes = Math.floor(totalPlayTime / 60);
        const seconds = totalPlayTime % 60;
        ctx.fillText(`${minutes}m ${seconds}s`, rightCol, yOffset);
          // Speed/pace indicator
        yOffset += lineHeight;
        ctx.fillStyle = '#f97316';
        ctx.fillText(`${this.t('pace')}:`, leftCol, yOffset);
        ctx.fillStyle = '#f0f6fc';        const pace = totalPlayTime > 0 ? (currentScore / totalPlayTime * 60).toFixed(1) : '0.0';
        ctx.fillText(`${pace}/${this.t('min')}`, rightCol, yOffset);
          // Score multiplier from upgrades
        yOffset += lineHeight;
        ctx.fillStyle = '#40d158';
        ctx.fillText(`${this.t('multiplier')}:`, leftCol, yOffset);
        
        // Get score multiplier from player's shop upgrades
        const scoreMultiplier = (this.game.player && this.game.player.shopUpgrades.scoreMultiplier) || 1.0;
        
        ctx.fillStyle = scoreMultiplier > 1 ? '#40d158' : '#f0f6fc';
        ctx.font = scoreMultiplier > 1 ? 'bold 13px Courier New' : '13px Courier New';
        ctx.fillText(`${scoreMultiplier.toFixed(1)}x`, rightCol, yOffset);
        
        // Data packets earned
        yOffset += lineHeight;        ctx.font = '13px Courier New';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`${this.t('packets')}:`, leftCol, yOffset);
        const packetColor = dataPackets >= 100 ? '#ffd700' : dataPackets >= 50 ? '#40d158' : '#58a6ff';
        ctx.fillStyle = packetColor;        ctx.fillText(`${dataPackets} 💾`, rightCol, yOffset);// Progress bar for score to next milestone (changed to 1000 score for data packet milestones)
        yOffset += lineHeight + 5;
        const nextMilestone = Math.ceil(currentScore / 1000) * 1000; // Use 1000 score intervals for data packet milestones
        const progress = nextMilestone > 0 ? (currentScore % 1000) / 1000 : 0;
          ctx.fillStyle = '#8b949e';
        ctx.font = '11px Courier New';
        ctx.fillText(`${this.t('nextDataPacketBonus')}: ${nextMilestone}`, leftCol, yOffset);
          // Show reward amount for next milestone (100 data packets per 1000 score)
        const nextReward = 100;
        
        ctx.fillStyle = '#40d158';
        ctx.font = '11px Courier New';
        ctx.fillText(`+${nextReward} 💾`, rightCol + 20, yOffset);
        
        // Progress bar
        const barWidth = panelWidth - 20;
        const barHeight = 6;
        const barY = yOffset + 5;
        
        // Progress bar background
        ctx.fillStyle = 'rgba(139, 148, 158, 0.3)';
        this.drawRoundedRect(ctx, leftCol, barY, barWidth, barHeight, 3);
        ctx.fill();
        
        // Progress bar fill
        if (progress > 0) {
            const progressGradient = ctx.createLinearGradient(leftCol, barY, leftCol + barWidth * progress, barY);
            progressGradient.addColorStop(0, '#40d158');
            progressGradient.addColorStop(1, '#ffd700');
            ctx.fillStyle = progressGradient;
            this.drawRoundedRect(ctx, leftCol, barY, barWidth * progress, barHeight, 3);
            ctx.fill();
        }    }
      /**
     * Draw the main HUD with a modern cyberpunk design
     */
    drawMainHUD() {
        // Draw health hearts in their original position
        if (this.game.player) {
            this.drawHealthHearts();
        }
        
        // Draw difficulty indicator in top right
        const difficulty = DIFFICULTY_LEVELS[this.game.selectedDifficulty];
        this.ctx.fillStyle = difficulty.color;
        this.ctx.font = 'bold 16px "SF Mono", "Monaco", monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${difficulty.emoji} ${difficulty.name}`, this.canvas.width - 15, 30);
        this.ctx.textAlign = 'left';
        
        // Draw side panels
        this.drawLeftPanel();
        this.drawRightPanel();
    }

    /**
     * Draw left panel with score and distance
     */
    drawLeftPanel() {
        const panelWidth = 180;
        const panelHeight = 120;
        const x = 15;
        const y = 65;
        
        // Modern glass-morphism panel
        this.drawModernPanel(x, y, panelWidth, panelHeight, 'rgba(88, 166, 255, 0.1)');
        
        // Score section
        const meters = this.game.player ? Math.floor(this.game.player.x / 10) : 0;
        const bestScore = this.game.bestScores[this.game.selectedDifficulty] || 0;
        
        // Score label and value
        this.ctx.fillStyle = 'rgba(240, 246, 252, 0.8)';
        this.ctx.font = '12px "SF Mono", "Monaco", monospace';
        this.ctx.fillText('SCORE', x + 15, y + 25);
        
        this.ctx.fillStyle = '#58a6ff';
        this.ctx.font = 'bold 20px "SF Mono", "Monaco", monospace';
        this.ctx.fillText(`${this.game.score}`, x + 15, y + 45);
        
        // Distance
        this.ctx.fillStyle = 'rgba(240, 246, 252, 0.8)';
        this.ctx.font = '12px "SF Mono", "Monaco", monospace';
        this.ctx.fillText('DISTANCE', x + 15, y + 70);
        
        this.ctx.fillStyle = '#40d158';
        this.ctx.font = 'bold 16px "SF Mono", "Monaco", monospace';
        this.ctx.fillText(`${meters}m`, x + 15, y + 90);
        
        // Best score (compact)
        if (bestScore > 0) {
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
            this.ctx.font = '10px "SF Mono", "Monaco", monospace';
            this.ctx.fillText(`BEST: ${bestScore}`, x + 15, y + 110);
        }
    }

    /**
     * Draw right panel with data packets and status
     */
    drawRightPanel() {
        const panelWidth = 200;
        const panelHeight = 120;
        const x = this.canvas.width - panelWidth - 15;
        const y = 65;
        
        // Modern glass-morphism panel
        this.drawModernPanel(x, y, panelWidth, panelHeight, 'rgba(64, 209, 88, 0.1)');
        
        // Data packets
        const dataPackets = this.game.upgradeSystem ? this.game.upgradeSystem.getDataPackets() : 0;
        
        // Data packets icon and label
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '16px "SF Mono", "Monaco", monospace';
        this.ctx.fillText('💾', x + 15, y + 25);
        
        this.ctx.fillStyle = 'rgba(240, 246, 252, 0.8)';
        this.ctx.font = '12px "SF Mono", "Monaco", monospace';
        this.ctx.fillText('DATA PACKETS', x + 40, y + 25);
        
        // Count with color coding
        const countColor = dataPackets >= 100 ? '#ffd700' : dataPackets >= 50 ? '#40d158' : '#79c0ff';
        this.ctx.fillStyle = countColor;
        this.ctx.font = 'bold 20px "SF Mono", "Monaco", monospace';
        this.ctx.fillText(`${dataPackets}`, x + 15, y + 50);
        
        // Progress to next milestone
        const nextMilestone = Math.ceil(this.game.score / 1000) * 1000;
        const progress = nextMilestone > 0 ? (this.game.score % 1000) / 1000 : 0;
        
        if (nextMilestone > this.game.score) {
            this.ctx.fillStyle = 'rgba(240, 246, 252, 0.6)';
            this.ctx.font = '10px "SF Mono", "Monaco", monospace';
            this.ctx.fillText(`NEXT: ${nextMilestone} (+100)`, x + 15, y + 75);
            
            // Progress bar
            const barWidth = panelWidth - 30;
            const barHeight = 4;
            const barY = y + 85;
            
            // Background
            this.ctx.fillStyle = 'rgba(139, 148, 158, 0.2)';
            this.drawRoundedRect(this.ctx, x + 15, barY, barWidth, barHeight, 2);
            this.ctx.fill();
            
            // Progress
            if (progress > 0) {
                this.ctx.fillStyle = '#40d158';
                this.drawRoundedRect(this.ctx, x + 15, barY, barWidth * progress, barHeight, 2);
                this.ctx.fill();
            }
        }
        
        // Dash cooldown indicator (if player has dash)
        if (this.game.player && this.game.player.shopUpgrades.dash) {
            this.drawCompactDashIndicator(x + 15, y + 100);
        }
    }

    /**
     * Draw modern glass-morphism panel
     */
    drawModernPanel(x, y, width, height, accentColor) {
        // Main background with glass effect
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, 'rgba(13, 17, 23, 0.8)');
        gradient.addColorStop(1, 'rgba(21, 32, 43, 0.6)');
        
        this.ctx.fillStyle = gradient;
        this.drawRoundedRect(this.ctx, x, y, width, height, 10);
        this.ctx.fill();
        
        // Subtle border with accent color
        this.ctx.strokeStyle = accentColor;
        this.ctx.lineWidth = 1.5;
        this.drawRoundedRect(this.ctx, x, y, width, height, 10);
        this.ctx.stroke();
        
        // Inner glow effect
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 0.5;
        this.drawRoundedRect(this.ctx, x + 1, y + 1, width - 2, height - 2, 9);
        this.ctx.stroke();
    }

    /**
     * Draw compact dash indicator
     */
    drawCompactDashIndicator(x, y) {
        const player = this.game.player;
        if (!player) return;
        
        const maxCooldown = 2000;
        const currentCooldown = Math.max(0, player.dashState.dashCooldown);
        const isReady = currentCooldown <= 0;
        
        // Dash icon
        this.ctx.fillStyle = isReady ? '#40d158' : '#8b949e';
        this.ctx.font = '12px "SF Mono", "Monaco", monospace';
        this.ctx.fillText('⚡ DASH', x, y);
        
        // Status indicator
        if (isReady) {
            this.ctx.fillStyle = '#40d158';
            this.ctx.fillText('READY', x + 70, y);
        } else {
            const remainingSeconds = Math.ceil(currentCooldown / 1000);
            this.ctx.fillStyle = '#f85149';
            this.ctx.fillText(`${remainingSeconds}s`, x + 70, y);
        }
    }
    
    /**
     * Simple translation helper (can be expanded later)
     */
    t(key) {
        const translations = {
            'pace': 'PACE',
            'min': 'MIN',
            'multiplier': 'MULT',
            'packets': 'PACKETS',
            'nextDataPacketBonus': 'NEXT BONUS',
            'ui.dash': 'DASH',
            'ui.dashReady': 'READY'
        };
        return translations[key] || key;
    }
}
