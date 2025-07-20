class UI {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
          // UI colors - enhanced cyberpunk theme
        this.primaryColor = '#00ffff';
        this.secondaryColor = '#ffffff';
        this.accentColor = '#ff6600';
        this.healthColor = '#00ff00';
        this.healthLowColor = '#00ff00';
        this.healthCriticalColor = '#ff0000';
        this.backgroundColor = '#000000';
        this.borderColor = '#004466';
        this.panelColor = 'rgba(0, 68, 102, 0.3)';
        
        // Animation properties
        this.scoreFlashTimer = 0;
        this.killFlashTimer = 0;
    }    render(ctx, gameData) {
        // Legacy canvas UI completely disabled - using ModernUI HTML system instead
        // All canvas-based UI rendering has been moved to the HTML/CSS system
        // This prevents any green bars or other legacy UI elements from appearing
        
        // Only render game over screen if needed (ModernUI handles this too)
        if (gameData.gameOver) {
            this.drawGameOverScreen(ctx, gameData.score, gameData.kills);
        }
    }
    
    updateFlashTimers(gameData) {
        // Update flash timers for visual feedback
        if (this.scoreFlashTimer > 0) this.scoreFlashTimer -= 0.016; // Assuming 60fps
        if (this.killFlashTimer > 0) this.killFlashTimer -= 0.016;
    }
    
    drawHealthBar(ctx, player) {
        const barWidth = 250;
        const barHeight = 24;
        const barX = 20;
        const barY = 20;
        
        // Health panel background with glow
        ctx.fillStyle = this.panelColor;
        ctx.fillRect(barX - 8, barY - 8, barWidth + 16, barHeight + 24);
        
        // Health bar border with cyberpunk glow
        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = this.primaryColor;
        ctx.shadowBlur = 8;
        ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        ctx.shadowBlur = 0;
        
        // Health bar background (inner)
        ctx.fillStyle = '#111111';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health bar fill with gradient
        const healthPercent = player.health / player.maxHealth;
        let healthColor = this.healthColor;
        
        if (healthPercent <= 0.25) {
            healthColor = this.healthCriticalColor;
        } else if (healthPercent <= 0.5) {
            healthColor = this.healthLowColor;
        }
        
        const healthWidth = barWidth * healthPercent;
        
        // Create gradient for health bar
        const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
        gradient.addColorStop(0, healthColor);
        gradient.addColorStop(1, this.darkenColor(healthColor, 0.3));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, healthWidth, barHeight);
        
        // Health text with better positioning
        ctx.fillStyle = this.secondaryColor;
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`${player.health}/${player.maxHealth}`, barX + barWidth/2, barY + barHeight/2 + 5);
        
        // Health label with cyberpunk styling
        ctx.fillStyle = this.primaryColor;
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('◤ NEURAL INTEGRITY ◥', barX, barY - 12);
        
        // Critical health warning
        if (healthPercent <= 0.25) {
            ctx.fillStyle = this.healthCriticalColor;
            ctx.font = 'bold 10px Courier New';
            const warningY = barY + barHeight + 15;
            ctx.fillText('⚠ CRITICAL DAMAGE ⚠', barX, warningY);
        }
        
        // Invulnerability indicator with improved styling
        if (player.invulnerable) {
            ctx.fillStyle = this.accentColor;
            ctx.font = 'bold 11px Courier New';
            ctx.fillText('◦ SHIELD ACTIVE ◦', barX + barWidth + 15, barY + 15);
        }
    }
      // drawOverclockBar method completely removed - using ModernUI HTML system instead
    // This prevents any potential green bar rendering from legacy canvas UI
    
    drawDashIndicator(ctx, player) {
        const indicatorX = 20;
        const indicatorY = 85; // Moved down to make room for Overclock bar
        const indicatorWidth = 150;
        const indicatorHeight = 15;
        
        // Dash indicator background
        ctx.fillStyle = this.panelColor;
        ctx.fillRect(indicatorX - 4, indicatorY - 4, indicatorWidth + 8, indicatorHeight + 8);
        
        // Border
        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(indicatorX - 4, indicatorY - 4, indicatorWidth + 8, indicatorHeight + 8);
        
        // Background bar
        ctx.fillStyle = '#111111';
        ctx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
        
        // Dash status
        if (player.isDashing) {
            // Show dash active
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
            
            ctx.fillStyle = this.primaryColor;
            ctx.font = 'bold 10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('DASH ACTIVE', indicatorX + indicatorWidth/2, indicatorY + indicatorHeight/2 + 3);
        } else if (player.dashCooldownTimer > 0) {
            // Show cooldown progress
            const cooldownPercent = 1 - (player.dashCooldownTimer / player.dashCooldown);
            const progressWidth = indicatorWidth * cooldownPercent;
            
            ctx.fillStyle = this.accentColor;
            ctx.fillRect(indicatorX, indicatorY, progressWidth, indicatorHeight);
            
            ctx.fillStyle = this.secondaryColor;
            ctx.font = '10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(`DASH: ${player.dashCooldownTimer.toFixed(1)}s`, indicatorX + indicatorWidth/2, indicatorY + indicatorHeight/2 + 3);        } else {
            // Dash ready - using accent color instead of green health color
            ctx.fillStyle = this.accentColor;
            ctx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
            
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('DASH READY', indicatorX + indicatorWidth/2, indicatorY + indicatorHeight/2 + 3);
        }
        
        // Dash label
        ctx.fillStyle = this.primaryColor;
        ctx.font = 'bold 9px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('◤ NEURAL DASH ◥', indicatorX, indicatorY - 8);
    }
    
    drawStatsPanel(ctx, score, kills) {
        const panelX = this.width - 200;
        const panelY = 20;
        const panelWidth = 180;
        const panelHeight = 80;
        
        // Panel background with enhanced glow
        ctx.fillStyle = this.panelColor;
        ctx.fillRect(panelX - 5, panelY - 5, panelWidth + 10, panelHeight + 10);
        
        // Panel border with cyberpunk styling
        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = this.primaryColor;
        ctx.shadowBlur = 6;
        ctx.strokeRect(panelX - 2, panelY - 2, panelWidth + 4, panelHeight + 4);
        ctx.shadowBlur = 0;
        
        // Panel title
        ctx.fillStyle = this.primaryColor;
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('◤ COMBAT STATUS ◥', panelX + 10, panelY + 18);
        
        // Score with flash effect
        const scoreColor = this.scoreFlashTimer > 0 ? this.accentColor : this.secondaryColor;
        ctx.fillStyle = scoreColor;
        ctx.font = 'bold 14px Courier New';
        ctx.fillText(`SCORE: ${score}`, panelX + 10, panelY + 40);
        
        // Kills with flash effect
        const killColor = this.killFlashTimer > 0 ? this.accentColor : this.secondaryColor;
        ctx.fillStyle = killColor;
        ctx.font = 'bold 14px Courier New';
        ctx.fillText(`KILLS: ${kills}`, panelX + 10, panelY + 60);
    }    drawGameInfo(ctx, gameData) {
        // Additional game information display
    }
    
    drawMiniMap(ctx, gameData) {
        const miniMapSize = 120;
        const miniMapX = this.width - miniMapSize - 20;
        const miniMapY = this.height - miniMapSize - 20;
        
        // Mini-map background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(miniMapX, miniMapY, miniMapSize, miniMapSize);
        
        // Mini-map border
        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(miniMapX, miniMapY, miniMapSize, miniMapSize);
        
        // Arena representation
        if (gameData.arena) {
            const scaleX = miniMapSize / gameData.arena.width;
            const scaleY = miniMapSize / gameData.arena.height;
            
            // Arena border
            ctx.strokeStyle = this.borderColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(miniMapX + 5, miniMapY + 5, miniMapSize - 10, miniMapSize - 10);
            
            // Player position
            const playerX = miniMapX + (gameData.player.x * scaleX);
            const playerY = miniMapY + (gameData.player.y * scaleY);
            
            ctx.fillStyle = this.primaryColor;
            ctx.beginPath();
            ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Enemy positions (red dots)
            if (gameData.enemies) {
                ctx.fillStyle = this.healthCriticalColor;
                for (const enemy of gameData.enemies) {
                    const enemyX = miniMapX + (enemy.x * scaleX);
                    const enemyY = miniMapY + (enemy.y * scaleY);
                    
                    ctx.beginPath();
                    ctx.arc(enemyX, enemyY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Mini-map label
        ctx.fillStyle = this.primaryColor;
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('TACTICAL MAP', miniMapX + miniMapSize/2, miniMapY - 8);
    }
    
    // Flash effects for score/kill updates
    flashScore() {
        this.scoreFlashTimer = 0.5; // Flash for 0.5 seconds
    }
    
    flashKill() {
        this.killFlashTimer = 0.5; // Flash for 0.5 seconds
    }
    
    // Utility function to darken colors
    darkenColor(color, factor) {
        // Simple color darkening - convert hex to darker shade
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            
            const newR = Math.floor(r * (1 - factor));
            const newG = Math.floor(g * (1 - factor));
            const newB = Math.floor(b * (1 - factor));
            
            return `rgb(${newR}, ${newG}, ${newB})`;
        }
        return color;
    }
    
    // Game over screen
    drawGameOverScreen(ctx, score, kills) {
        // Overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Game Over title
        ctx.fillStyle = this.healthCriticalColor;
        ctx.font = 'bold 48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('SYSTEM FAILURE', this.width/2, this.height/2 - 60);
        
        // Final stats
        ctx.fillStyle = this.secondaryColor;
        ctx.font = 'bold 24px Courier New';
        ctx.fillText(`Final Score: ${score}`, this.width/2, this.height/2);
        ctx.fillText(`Enemies Eliminated: ${kills}`, this.width/2, this.height/2 + 40);
        
        // Restart instruction
        ctx.fillStyle = this.primaryColor;
        ctx.font = 'bold 18px Courier New';
        ctx.fillText('Press R to restart neural systems', this.width/2, this.height/2 + 100);
    }
}
