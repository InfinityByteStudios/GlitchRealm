/**
 * GameDialogs - Handles all dialog screens and menus
 */

import { GAME_STATES, DIFFICULTY_LEVELS } from '../utils/constants.js';

export class GameDialogs {    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        this.difficultyHitAreas = [];
        this.tabHitAreas = [];
        this.resetDialogHitAreas = [];
        this.shopHitAreas = [];
        
        // Initialize settings tab state
        this.currentSettingsTab = 'general';
        
        // Initialize slider dragging state
        this.draggingSlider = null;
    }

    /**
     * Draw the difficulty selection screen
     */
    drawDifficultySelection(difficultyHitAreas, hoveredDifficulty, difficultyKeys) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.save();
        
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
        
        // Subtitle with typewriter effect
        this.drawSubtitle(ctx, width, time);
        
        // Check if there's a saved game and show continue option
        if (this.game.hasSavedGame()) {
            this.drawSavedGameNotice(ctx, width, time);
        }
        
        // Instructions with animated glow
        this.drawInstructions(ctx, width, time);
        
        // Enhanced difficulty options
        this.drawEnhancedDifficultyOptions(ctx, width, height, difficultyHitAreas, hoveredDifficulty, difficultyKeys, time);
        
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
        ctx.fillText('SELECT DIFFICULTY', width / 2, 80);
        
        // Add secondary glow layer
        ctx.shadowColor = 'rgba(168, 85, 247, ' + (titleGlow * 0.5) + ')';
        ctx.shadowBlur = 30;
        ctx.fillText('SELECT DIFFICULTY', width / 2, 80);
        
        ctx.shadowBlur = 0;
    }
    
    /**
     * Draw subtitle with effects
     */
    drawSubtitle(ctx, width, time) {
        ctx.font = '16px Courier New';
        ctx.fillStyle = '#7d8590';
        ctx.textAlign = 'center';
        
        // Animated text with subtle glow
        const textAlpha = 0.8 + Math.sin(time * 1.5) * 0.2;
        ctx.fillStyle = `rgba(125, 133, 144, ${textAlpha})`;
        ctx.fillText('Choose your survival challenge level', width / 2, 110);
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
        ctx.fillText(`💾 Saved Game Available`, width / 2, 135);
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
        ctx.fillText('Hover and click to select difficulty', width / 2, 155);
    }
    
    /**
     * Draw enhanced difficulty options with better visuals
     */
    drawEnhancedDifficultyOptions(ctx, width, height, difficultyHitAreas, hoveredDifficulty, difficultyKeys, time) {
        let y = 200;
        const spacing = 110;
        
        // Reset difficulty hit areas
        difficultyHitAreas.length = 0;
        
        difficultyKeys.forEach((diffKey, index) => {
            const difficulty = DIFFICULTY_LEVELS[diffKey];
            const isHovered = index === hoveredDifficulty;
            
            // Create enhanced hit area
            const hitArea = {
                x: width / 2 - 200,
                y: y - 25,
                width: 400,
                height: 95,
                index: index
            };
            difficultyHitAreas.push(hitArea);
            
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
            ctx.font = isHovered ? 'bold 24px Courier New' : 'bold 20px Courier New';
            ctx.textAlign = 'left';
            
            // Draw icon with glow
            if (isHovered) {
                ctx.shadowColor = difficulty.color;
                ctx.shadowBlur = 10;
            }
            
            const iconX = width / 2 - 170;
            const nameX = width / 2 - 140;
            ctx.fillText(difficulty.emoji, iconX, y + 15 + hoverOffset);
            ctx.fillText(difficulty.name, nameX, y + 15 + hoverOffset);
            ctx.shadowBlur = 0;
              // Enhanced description with better formatting
            ctx.fillStyle = isHovered ? '#c9d1d9' : '#8b949e';
            ctx.font = isHovered ? 'bold 15px Courier New' : '14px Courier New';
            
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
    }
    
    /**
     * Draw difficulty rating stars
     */
    drawDifficultyRating(ctx, x, y, level, isHovered, color) {
        ctx.font = isHovered ? '16px Courier New' : '14px Courier New';
        ctx.fillStyle = isHovered ? '#f0f6fc' : '#7d8590';
        ctx.fillText('Challenge: ', x, y);
        
        const starX = x + 85;
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
        ctx.fillText('Version v2.1.0 | June 2025', width / 2, height - 30);
        ctx.fillText('Click a difficulty to start the game', width / 2, height - 15);
    }
    
    /**
     * Draw the changelog with game updates and improvements
     */
    drawChangelog() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.save();
        
        // Animated background with gradient
        const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        gradient.addColorStop(0, 'rgba(13, 17, 23, 0.98)');
        gradient.addColorStop(0.6, 'rgba(21, 32, 43, 0.95)');
        gradient.addColorStop(1, 'rgba(13, 17, 23, 0.99)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
          // Animated particles background
        const time = Date.now() * 0.001;
        
        // Floating particles
        for (let i = 0; i < 10; i++) {
            const x = (Math.sin(time * 0.2 + i * 1.8) * 0.5 + 0.5) * width;
            const y = (Math.cos(time * 0.3 + i * 0.9) * 0.5 + 0.5) * height;
            const alpha = 0.05 + Math.sin(time + i) * 0.02;
            const size = 1 + Math.sin(time * 0.7 + i) * 1;
            
            ctx.fillStyle = `rgba(88, 166, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
          // Title
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 24px Courier New';        ctx.textAlign = 'center';
        ctx.fillText('CHANGELOG', width / 2, 60);
        
        // Version info
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#79c0ff';
        ctx.fillText(`Current Version: ${this.game.changelogData.version} - ${this.game.changelogData.lastUpdated}`, width / 2, 85);
        
        // Instructions
        ctx.font = '12px Courier New';
        ctx.fillStyle = '#7d8590';
        ctx.fillText('Press [C] or [Esc] to Return', width / 2, 110);
        
        // Changelog entries
        let y = 150;
        const maxHeight = height - 180;
        const lineHeight = 18;
        
        for (let entryIndex = 0; entryIndex < this.game.changelogData.entries.length && y < maxHeight; entryIndex++) {
            const entry = this.game.changelogData.entries[entryIndex];
            
            // Entry header
            ctx.fillStyle = '#f0f6fc';
            ctx.font = 'bold 18px Courier New';
            ctx.textAlign = 'left';
            ctx.fillText(`${entry.version} - ${entry.date}`, 40, y);
            
            // Entry title
            ctx.fillStyle = '#79c0ff';
            ctx.font = '16px Courier New';
            ctx.fillText(entry.title, 40, y + 25);
            
            y += 45;
            
            // Entry changes
            ctx.fillStyle = '#8b949e';
            ctx.font = '14px Courier New';
            
            for (let i = 0; i < entry.changes.length && y < maxHeight; i++) {
                const change = entry.changes[i];
                ctx.fillText(change, 60, y);
                y += lineHeight;
            }
            
            y += 20; // Space between entries
        }
        
        ctx.restore();
    }
      /**
     * Draw the leaderboard with smooth animations and enhanced visual effects
     */
    drawLeaderboard(leaderboardSystem, tabHitAreas) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.save();
        
        // Enhanced animated background with multiple layers and depth
        const time = Date.now() * 0.001;
        
        // Base gradient with animated center point
        const centerX = width/2 + Math.sin(time * 0.5) * 30;
        const centerY = height/2 + Math.cos(time * 0.3) * 20;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.8);
        gradient.addColorStop(0, 'rgba(13, 17, 23, 0.98)');
        gradient.addColorStop(0.2, 'rgba(30, 41, 59, 0.96)');
        gradient.addColorStop(0.5, 'rgba(21, 32, 43, 0.95)');
        gradient.addColorStop(0.8, 'rgba(15, 23, 42, 0.97)');
        gradient.addColorStop(1, 'rgba(13, 17, 23, 0.99)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Simplified background effects for less clutter
        
        // Layer 1: Reduced floating orbs
        for (let i = 0; i < 8; i++) {
            const orbitRadius = 120 + i * 40;
            const angle = time * 0.1 + i * 1.0;
            const x = width/2 + Math.cos(angle) * orbitRadius;
            const y = height/2 + Math.sin(angle) * orbitRadius * 0.6;
            const alpha = 0.02 + Math.sin(time * 1.5 + i) * 0.01;
            const size = 2 + Math.sin(time * 1.2 + i) * 1;
            
            // Create subtle glowing orb
            const orbGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
            const colors = ['#58a6ff', '#40d158', '#ffd700'];
            const color = colors[i % colors.length];
            orbGradient.addColorStop(0, color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
            orbGradient.addColorStop(0.7, color + '10');
            orbGradient.addColorStop(1, color + '00');
            
            ctx.fillStyle = orbGradient;
            ctx.beginPath();
            ctx.arc(x, y, size * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Layer 2: Subtle grid pattern (no animation)
        const gridSize = 60;
        ctx.strokeStyle = 'rgba(48, 54, 61, 0.08)';
        ctx.lineWidth = 0.5;
        
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }        // Enhanced title with advanced effects
        const titleY = 60;
        const titleText = '🏆 LEADERBOARD';
        
        // Title background glow
        const titleGradient = ctx.createRadialGradient(width/2, titleY, 0, width/2, titleY, 200);
        titleGradient.addColorStop(0, 'rgba(88, 166, 255, 0.15)');
        titleGradient.addColorStop(0.5, 'rgba(88, 166, 255, 0.05)');
        titleGradient.addColorStop(1, 'rgba(88, 166, 255, 0)');
        ctx.fillStyle = titleGradient;
        this.drawRoundedRect(ctx, width/2 - 200, titleY - 30, 400, 60, 15);
        ctx.fill();
        
        // Main title with multiple glow layers
        ctx.textAlign = 'center';
        ctx.font = 'bold 32px Courier New';
        
        // Outer glow (largest)
        ctx.shadowColor = '#58a6ff';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = 'rgba(88, 166, 255, 0.3)';
        ctx.fillText(titleText, width / 2, titleY);
        
        // Middle glow
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(88, 166, 255, 0.6)';
        ctx.fillText(titleText, width / 2, titleY);
        
        // Inner glow
        ctx.shadowBlur = 6;
        ctx.fillStyle = 'rgba(88, 166, 255, 0.9)';
        ctx.fillText(titleText, width / 2, titleY);
        
        // Core text
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(titleText, width / 2, titleY);
        
        // Animated subtitle with typewriter effect
        ctx.font = '16px Courier New';
        const subtitleFullText = 'Challenge the best players worldwide';
        const subtitleProgress = (time * 2) % (subtitleFullText.length + 20);
        const subtitleText = subtitleFullText.substring(0, Math.floor(subtitleProgress));
        const subtitleAlpha = 0.7 + Math.sin(time * 3) * 0.2;
        
        // Subtitle glow
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(168, 85, 247, ${subtitleAlpha})`;
        ctx.fillText(subtitleText, width / 2, titleY + 30);
        
        // Blinking cursor for typewriter effect
        if (Math.floor(subtitleProgress) < subtitleFullText.length && Math.sin(time * 8) > 0) {
            const cursorX = width/2 + ctx.measureText(subtitleText).width/2 + 3;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cursorX, titleY + 18, 2, 18);
        }
        
        ctx.shadowBlur = 0;        // Draw difficulty tabs with enhanced styling
        if (!tabHitAreas) {
            tabHitAreas = [];
        }
        this.drawDifficultyTabs(ctx, width, tabHitAreas);
        
        // Enhanced online/offline status indicator with modern design
        const statusText = this.game.leaderboardSystem.isOnline ? `🌐 ONLINE` : `💾 OFFLINE`;
        const statusColor = this.game.leaderboardSystem.isOnline ? '#40d158' : '#f85149';
        const statusBgColor = this.game.leaderboardSystem.isOnline ? 'rgba(64, 209, 88, 0.15)' : 'rgba(248, 81, 73, 0.15)';
        
        // Status background panel
        const statusWidth = 120;
        const statusHeight = 35;
        const statusX = width - statusWidth - 20;
        const statusY = 20;
        
        const statusGradient = ctx.createLinearGradient(statusX, statusY, statusX, statusY + statusHeight);
        statusGradient.addColorStop(0, statusBgColor);
        statusGradient.addColorStop(1, 'rgba(13, 17, 23, 0.8)');
        ctx.fillStyle = statusGradient;
        this.drawRoundedRect(ctx, statusX, statusY, statusWidth, statusHeight, 8);
        ctx.fill();
        
        // Status border with animation
        const statusBorderAlpha = this.game.leaderboardSystem.isOnline ? 
            (0.6 + Math.sin(time * 4) * 0.4) : 0.6;
        ctx.strokeStyle = statusColor + Math.floor(statusBorderAlpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, statusX, statusY, statusWidth, statusHeight, 8);
        ctx.stroke();
        
        // Status text with enhanced effects
        ctx.font = 'bold 14px Courier New';
        ctx.fillStyle = statusColor;
        ctx.textAlign = 'center';
        
        // Add pulsing glow effect for online status
        if (this.game.leaderboardSystem.isOnline) {
            const pulse = 0.8 + Math.sin(time * 4) * 0.2;
            ctx.shadowColor = statusColor;
            ctx.shadowBlur = 6 * pulse;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        ctx.fillText(statusText, statusX + statusWidth/2, statusY + 23);
        ctx.shadowBlur = 0;
        
        // Enhanced instructions with better visibility and animations
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#a5b3c1';
        ctx.textAlign = 'center';
        let instructionText = `ESC: Return to menu • E: Upload score`;
        
        // Add additional instructions if player has options available
        if (this.game.leaderboardSystem.hasPlayerEntryInCurrentDifficulty()) {
            instructionText += ` • DEL: Delete entry`;
        }
        if (this.game.leaderboardSystem.getSavedPlayerName()) {
            instructionText += ` • N: Change name`;
        }
        
        // Animated instruction background
        const instructionY = 155;
        const instructionWidth = ctx.measureText(instructionText).width;
        const instructionBgGradient = ctx.createLinearGradient(
            width/2 - instructionWidth/2 - 15, instructionY - 20,
            width/2 - instructionWidth/2 - 15, instructionY + 5
        );
        instructionBgGradient.addColorStop(0, 'rgba(33, 38, 45, 0.8)');
        instructionBgGradient.addColorStop(1, 'rgba(22, 27, 34, 0.6)');
        
        ctx.fillStyle = instructionBgGradient;
        this.drawRoundedRect(ctx, width/2 - instructionWidth/2 - 15, instructionY - 20, instructionWidth + 30, 28, 8);
        ctx.fill();
        
        // Instruction border with subtle glow
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.3)';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, width/2 - instructionWidth/2 - 15, instructionY - 20, instructionWidth + 30, 28, 8);
        ctx.stroke();
        
        // Instructions text with subtle animation
        const instructionAlpha = 0.8 + Math.sin(time * 2) * 0.2;
        ctx.fillStyle = `rgba(165, 179, 193, ${instructionAlpha})`;
        ctx.fillText(instructionText, width / 2, instructionY);
        
        // Display the leaderboard entries
        const entries = this.game.leaderboardSystem.getLeaderboard(this.game.leaderboardSystem.selectedDifficulty);
        const tableWidth = 650; // Slightly increased width for better spacing
        const tableX = (width - tableWidth) / 2;
        
        // Enhanced table header with modern design
        const headerY = 195;
        const headerHeight = 40;
        
        // Multi-layer header background with curved edges
        const headerRadius = 15; // Curved corner radius for header
        const headerMainGradient = ctx.createLinearGradient(tableX - 25, headerY - 18, tableX - 25, headerY + headerHeight - 18);
        headerMainGradient.addColorStop(0, 'rgba(88, 166, 255, 0.15)');
        headerMainGradient.addColorStop(0.5, 'rgba(33, 38, 45, 0.9)');
        headerMainGradient.addColorStop(1, 'rgba(22, 27, 34, 0.8)');
        ctx.fillStyle = headerMainGradient;
        this.drawRoundedRect(ctx, tableX - 25, headerY - 18, tableWidth + 50, headerHeight, headerRadius);
        ctx.fill();
        
        // Header accent border with curves
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, tableX - 25, headerY - 18, tableWidth + 50, headerHeight, headerRadius);
        ctx.stroke();
        
        // Inner header glow with curves
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, tableX - 23, headerY - 16, tableWidth + 46, headerHeight - 4, headerRadius - 2);
        ctx.stroke();
        
        // Header text with enhanced styling and icons
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.font = 'bold 17px Courier New';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Animated header glow
        const headerGlow = Math.sin(time * 1.5) * 0.3 + 0.7;
        ctx.shadowColor = `rgba(88, 166, 255, ${headerGlow})`;
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.fillText('🏆 RANK', tableX, headerY);
        ctx.fillText('👤 PLAYER', tableX + 120, headerY);
        ctx.fillText('📊 SCORE', tableX + 380, headerY);
        ctx.fillText('⏱️ TIME', tableX + 520, headerY);
        
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        let tableY = headerY + 35;
          
        // Enhanced table rows with advanced visual effects
        entries.forEach((entry, index) => {
            const entryY = tableY + (index * 45); // Increased row height for better spacing
            
            // Advanced row animations and effects
            const rowTime = time * 1.5 + index * 0.2;
            const hoverEffect = 0.95 + Math.sin(rowTime) * 0.05;
            const slideInProgress = Math.min(1, (time * 2 - index * 0.1));
            const rowAlpha = slideInProgress * hoverEffect;
            
            // Multi-layer row background
            if (index % 2 === 0) {
                // Even rows - darker base
                const evenGradient = ctx.createLinearGradient(tableX - 25, entryY - 22, tableX - 25, entryY + 23);
                evenGradient.addColorStop(0, `rgba(30, 35, 42, ${0.8 * rowAlpha})`);
                evenGradient.addColorStop(0.5, `rgba(22, 27, 34, ${0.9 * rowAlpha})`);
                evenGradient.addColorStop(1, `rgba(18, 23, 30, ${0.8 * rowAlpha})`);
                ctx.fillStyle = evenGradient;
            } else {
                // Odd rows - lighter base
                const oddGradient = ctx.createLinearGradient(tableX - 25, entryY - 22, tableX - 25, entryY + 23);
                oddGradient.addColorStop(0, `rgba(33, 38, 45, ${0.7 * rowAlpha})`);
                oddGradient.addColorStop(0.5, `rgba(26, 31, 38, ${0.8 * rowAlpha})`);
                oddGradient.addColorStop(1, `rgba(21, 26, 33, ${0.7 * rowAlpha})`);
                ctx.fillStyle = oddGradient;
            }
            
            // Special highlighting for user's entry
            if (this.game.leaderboardSystem.uploadResult && 
                this.game.leaderboardSystem.uploadResult.success &&
                entry.id === this.game.leaderboardSystem.uploadResult.entryId) {
                const userGradient = ctx.createLinearGradient(tableX - 25, entryY - 22, tableX - 25, entryY + 23);
                userGradient.addColorStop(0, 'rgba(64, 209, 88, 0.3)');
                userGradient.addColorStop(0.5, 'rgba(40, 167, 69, 0.4)');
                userGradient.addColorStop(1, 'rgba(64, 209, 88, 0.3)');
                ctx.fillStyle = userGradient;
                
                // User entry border glow
                ctx.shadowColor = '#40d158';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
            
            // Enhanced glow for top 3 entries
            if (index < 3) {
                const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
                ctx.shadowColor = medalColors[index];
                ctx.shadowBlur = 12;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
            
            // Draw row background with curved edges
            const rowRadius = 12; // Curved corner radius for rows
            this.drawRoundedRect(ctx, tableX - 25, entryY - 22, tableWidth + 50, 45, rowRadius);
            ctx.fill();
            
            // Row border effects with curved edges
            if (index < 3) {
                // Special border for top 3 with curves
                const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
                ctx.strokeStyle = medalColors[index] + '80';
                ctx.lineWidth = 2;
                this.drawRoundedRect(ctx, tableX - 25, entryY - 22, tableWidth + 50, 45, rowRadius);
                ctx.stroke();
            } else if (this.game.leaderboardSystem.uploadResult && 
                      this.game.leaderboardSystem.uploadResult.success &&
                      entry.id === this.game.leaderboardSystem.uploadResult.entryId) {
                // Special border for user entry with curves
                ctx.strokeStyle = '#40d158';
                ctx.lineWidth = 2;
                this.drawRoundedRect(ctx, tableX - 25, entryY - 22, tableWidth + 50, 45, rowRadius);
                ctx.stroke();
            }
            
            // Reset shadow
            ctx.shadowBlur = 0;
            
            // Enhanced rank display with medals and animations
            ctx.textAlign = 'left';
            let rankDisplay = `${index + 1}.`;
            let rankColor = '#f0f6fc';
            let rankFont = '16px Courier New';
            
            if (index === 0) {
                rankDisplay = '🥇';
                rankColor = '#ffd700';
                rankFont = 'bold 24px Courier New';
                
                // Gold medal glow animation
                const goldPulse = 0.8 + Math.sin(time * 4) * 0.2;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 8 * goldPulse;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            } else if (index === 1) {
                rankDisplay = '🥈';
                rankColor = '#c0c0c0';
                rankFont = 'bold 22px Courier New';
                
                ctx.shadowColor = '#c0c0c0';
                ctx.shadowBlur = 6;
            } else if (index === 2) {
                rankDisplay = '🥉';
                rankColor = '#cd7f32';
                rankFont = 'bold 20px Courier New';
                
                ctx.shadowColor = '#cd7f32';
                ctx.shadowBlur = 4;
            } else {
                rankDisplay = `#${index + 1}`;
                rankFont = 'bold 16px Courier New';
            }
            
            ctx.fillStyle = rankColor;
            ctx.font = rankFont;
            ctx.fillText(rankDisplay, tableX, entryY);
            
            // Reset shadow for other elements
            ctx.shadowBlur = 0;
            
            // Enhanced name display with better truncation and styling
            ctx.fillStyle = '#f0f6fc';
            ctx.font = '16px Courier New';
            let displayName = entry.name;
            
            // Smart truncation with ellipsis
            const maxNameWidth = 200;
            let nameWidth = ctx.measureText(displayName).width;
            if (nameWidth > maxNameWidth) {
                while (nameWidth > maxNameWidth - 20 && displayName.length > 3) {
                    displayName = displayName.slice(0, -1);
                    nameWidth = ctx.measureText(displayName + '…').width;
                }
                displayName += '…';
            }
            
            // Special styling for user's own entry
            if (this.game.leaderboardSystem.uploadResult && 
                this.game.leaderboardSystem.uploadResult.success &&
                entry.id === this.game.leaderboardSystem.uploadResult.entryId) {
                ctx.shadowColor = '#40d158';
                ctx.shadowBlur = 4;
                ctx.fillStyle = '#40d158';
                ctx.font = 'bold 16px Courier New';
            }
            
            ctx.fillText(displayName, tableX + 120, entryY);
            ctx.shadowBlur = 0;
            
            // Enhanced score display with number formatting and animations
            ctx.font = index < 3 ? 'bold 18px Courier New' : 'bold 16px Courier New';
            ctx.fillStyle = index < 3 ? '#ffd700' : '#58a6ff';
            
            if (index < 3) {
                const scorePulse = 0.9 + Math.sin(time * 3 + index) * 0.1;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 4 * scorePulse;
            }
            
            // Format score with commas for better readability
            const formattedScore = entry.score.toLocaleString();
            ctx.fillText(formattedScore, tableX + 380, entryY);
            ctx.shadowBlur = 0;
            
            // Enhanced time display with color coding and better formatting
            ctx.font = '16px Courier New';
            const minutes = Math.floor(entry.survivalTime / 60);
            const seconds = Math.floor(entry.survivalTime % 60);
            const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Enhanced color coding for time performance
            let timeColor = '#f0f6fc';
            if (entry.survivalTime > 600) { // 10+ minutes - legendary
                timeColor = '#a855f7';
                ctx.shadowColor = '#a855f7';
                ctx.shadowBlur = 3;
            } else if (entry.survivalTime > 300) { // 5+ minutes - excellent
                timeColor = '#40d158';
            } else if (entry.survivalTime > 180) { // 3+ minutes - good
                timeColor = '#f59e0b';
            } else if (entry.survivalTime > 60) { // 1+ minute - okay
                timeColor = '#06b6d4';
            }
            
            ctx.fillStyle = timeColor;
            ctx.fillText(timeFormatted, tableX + 520, entryY);
            ctx.shadowBlur = 0;
            
            // Interactive indicator with animation for clickable entries
            if (index < 10) { // Top 10 are interactive
                const indicatorPulse = 0.5 + Math.sin(time * 6 + index * 0.5) * 0.5;
                ctx.fillStyle = `rgba(88, 166, 255, ${0.3 * indicatorPulse})`;
                ctx.fillRect(tableX + tableWidth + 15, entryY - 18, 8, 36);
                
                // Indicator glow
                ctx.shadowColor = '#58a6ff';
                ctx.shadowBlur = 4;
                ctx.fillStyle = `rgba(88, 166, 255, ${0.6 * indicatorPulse})`;
                ctx.fillRect(tableX + tableWidth + 17, entryY - 16, 4, 32);
                ctx.shadowBlur = 0;
            }
        });
        
        // Update tableY for elements that come after the table
        tableY = tableY + (entries.length * 45);
          
        // Enhanced "no scores" display with animations
        if (entries.length === 0) {
            const noScoresTime = time * 2;
            
            // Animated container
            const containerWidth = 400;
            const containerHeight = 150;
            const containerX = width/2 - containerWidth/2;
            const containerY = 280;
            
            // Container background with gradient
            const noScoresGradient = ctx.createRadialGradient(
                width/2, containerY + containerHeight/2, 0,
                width/2, containerY + containerHeight/2, containerWidth/2
            );
            noScoresGradient.addColorStop(0, 'rgba(88, 166, 255, 0.1)');
            noScoresGradient.addColorStop(0.7, 'rgba(33, 38, 45, 0.8)');
            noScoresGradient.addColorStop(1, 'rgba(13, 17, 23, 0.9)');
            
            ctx.fillStyle = noScoresGradient;
            this.drawRoundedRect(ctx, containerX, containerY, containerWidth, containerHeight, 12);
            ctx.fill();
            
            // Container border with glow
            ctx.strokeStyle = '#58a6ff';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#58a6ff';
            ctx.shadowBlur = 8;
            ctx.strokeRect(containerX, containerY, containerWidth, containerHeight);
            ctx.shadowBlur = 0;
            
            // Animated trophy icon
            const trophyScale = 1 + Math.sin(noScoresTime) * 0.1;
            const trophyY = containerY + 50;
            
            ctx.save();
            ctx.translate(width/2, trophyY);
            ctx.scale(trophyScale, trophyScale);
            
            ctx.fillStyle = '#ffd700';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 12;
            ctx.fillText('🏆', 0, 0);
            ctx.shadowBlur = 0;
            
            ctx.restore();
            
            // Main message with typewriter effect
            const message1 = 'No scores yet';
            const message2 = 'Be the first!';
            
            ctx.fillStyle = '#f0f6fc';
            ctx.textAlign = 'center';
            ctx.font = 'bold 24px Courier New';
            ctx.shadowColor = 'rgba(240, 246, 252, 0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(message1, width/2, containerY + 100);
            
            ctx.fillStyle = '#40d158';
            ctx.font = 'bold 20px Courier New';
            ctx.shadowColor = '#40d158';
            ctx.shadowBlur = 6;
            ctx.fillText(message2, width/2, containerY + 130);
            ctx.shadowBlur = 0;
            
            // Floating particles around the container
            for (let p = 0; p < 8; p++) {
                const particleAngle = noScoresTime + p * Math.PI / 4;
                const particleRadius = 80 + Math.sin(noScoresTime * 2 + p) * 20;
                const px = width/2 + Math.cos(particleAngle) * particleRadius;
                const py = containerY + containerHeight/2 + Math.sin(particleAngle) * particleRadius * 0.5;
                const particleAlpha = 0.3 + Math.sin(noScoresTime * 3 + p) * 0.2;
                
                ctx.fillStyle = `rgba(255, 215, 0, ${particleAlpha})`;
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Handle upload prompt display (name input)
        if (this.game.leaderboardSystem.showUploadPrompt) {
            this.drawUploadPrompt();
        }
        
        // Enhanced upload result message display with fade-out
        const result = this.game.leaderboardSystem.uploadResult;
        const resultOpacity = this.game.leaderboardSystem.getUploadResultOpacity();
        
        if (result && !this.game.leaderboardSystem.showUploadPrompt && resultOpacity > 0) {
            const messageColor = result.success ? '#40d158' : '#f85149';
            const messageBgColor = result.success ? 'rgba(64, 209, 88, 0.15)' : 'rgba(248, 81, 73, 0.15)';
            const messageY = entries.length > 0 ? tableY + 30 : 380;
            
            // Message background with gradient and fade-out
            const messageWidth = 400;
            const messageHeight = 45;
            const messageX = (width - messageWidth) / 2;
            
            const msgGradient = ctx.createLinearGradient(messageX, messageY - 22, messageX, messageY + 23);
            msgGradient.addColorStop(0, messageBgColor.replace(/[\d\.]+\)$/g, `${0.15 * resultOpacity})`));
            msgGradient.addColorStop(0.5, `rgba(33, 38, 45, ${0.8 * resultOpacity})`);
            msgGradient.addColorStop(1, messageBgColor.replace(/[\d\.]+\)$/g, `${0.15 * resultOpacity})`));
            ctx.fillStyle = msgGradient;
            this.drawRoundedRect(ctx, messageX, messageY - 22, messageWidth, messageHeight, 10);
            ctx.fill();
            
            // Message border with glow and fade-out
            ctx.strokeStyle = messageColor + Math.floor(resultOpacity * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = 2;
            ctx.shadowColor = messageColor;
            ctx.shadowBlur = 8 * resultOpacity;
            ctx.strokeRect(messageX, messageY - 22, messageWidth, messageHeight);
            ctx.shadowBlur = 0;
            
            // Message text with animation and fade-out
            const messageAlpha = (0.9 + Math.sin(time * 3) * 0.1) * resultOpacity;
            ctx.fillStyle = messageColor + Math.floor(messageAlpha * 255).toString(16).padStart(2, '0');
            ctx.textAlign = 'center';
            ctx.font = 'bold 18px Courier New';
            ctx.shadowColor = messageColor;
            ctx.shadowBlur = 4 * resultOpacity;
            ctx.fillText(result.message, width/2, messageY);
            ctx.shadowBlur = 0;
        }
        
        // Draw entry tooltip if active
        if (this.game.leaderboardSystem.entryTooltip) {
            this.drawEntryTooltip();
        }
        
        ctx.restore();
    }
      /**
     * Draw difficulty tabs for leaderboard with enhanced animations
     */
    drawDifficultyTabs(ctx, width, tabHitAreas) {
        const tabs = this.game.leaderboardSystem.getDifficultyTabs();
        const tabWidth = 130;
        const tabHeight = 35;
        const tabsStartX = width / 2 - ((tabWidth * tabs.length) / 2);
        const tabY = 100;
        
        // Clear previous hit areas - ensure array is initialized
        if (!tabHitAreas) {
            tabHitAreas = [];
        } else {
            tabHitAreas.length = 0;
        }
        
        // Animation time for smooth transitions
        const time = Date.now() * 0.003;
        
        // Draw background bar for tabs
        const barGradient = ctx.createLinearGradient(tabsStartX - 10, tabY, tabsStartX - 10, tabY + tabHeight);
        barGradient.addColorStop(0, 'rgba(21, 32, 43, 0.6)');
        barGradient.addColorStop(1, 'rgba(13, 17, 23, 0.8)');
        ctx.fillStyle = barGradient;
        ctx.fillRect(tabsStartX - 10, tabY, tabWidth * tabs.length + 20, tabHeight);
        
        // Draw subtle border
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tabsStartX - 10, tabY, tabWidth * tabs.length + 20, tabHeight);
        
        // Draw tabs with enhanced animations
        tabs.forEach((difficulty, index) => {
            const tabX = tabsStartX + (index * tabWidth);
            const difficultyInfo = DIFFICULTY_LEVELS[difficulty];
            const isSelected = this.game.leaderboardSystem.isTabSelected(difficulty);
            
            // Enhanced animation effects
            const floatOffset = Math.sin(time * 2 + index * 0.5) * 2;
            const currentTabY = tabY + (isSelected ? -3 + floatOffset : 0);
            const hoverIntensity = 0.1 + Math.sin(time * 3 + index) * 0.05;
            const scaleEffect = isSelected ? 1.05 : 1.0;
            
            ctx.save();
            ctx.translate(tabX + tabWidth/2, currentTabY + tabHeight/2);
            ctx.scale(scaleEffect, scaleEffect);
            ctx.translate(-tabWidth/2, -tabHeight/2);
            
            // Tab background with enhanced gradients
            if (isSelected) {
                // Selected tab gets an elaborate glow effect
                const selectedGradient = ctx.createLinearGradient(0, 0, 0, tabHeight);
                selectedGradient.addColorStop(0, `${difficultyInfo.color}40`);
                selectedGradient.addColorStop(0.3, `${difficultyInfo.color}30`);
                selectedGradient.addColorStop(0.7, `${difficultyInfo.color}20`);
                selectedGradient.addColorStop(1, `${difficultyInfo.color}35`);
                ctx.fillStyle = selectedGradient;
                
                // Outer glow for selected tab
                ctx.shadowColor = difficultyInfo.color;
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            } else {
                // Non-selected tabs get a subtle gradient with animation
                const normalGradient = ctx.createLinearGradient(0, 0, 0, tabHeight);
                normalGradient.addColorStop(0, `rgba(33, 38, 45, ${0.6 + hoverIntensity})`);
                normalGradient.addColorStop(0.5, `rgba(21, 32, 43, ${0.4 + hoverIntensity})`);
                normalGradient.addColorStop(1, `rgba(13, 17, 23, ${0.5 + hoverIntensity})`);
                ctx.fillStyle = normalGradient;
            }
            
            // Draw tab shape with enhanced corners
            const cornerRadius = 8;
            ctx.beginPath();
            ctx.moveTo(0, tabHeight);
            ctx.lineTo(0, cornerRadius);
            ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
            ctx.lineTo(tabWidth - cornerRadius, 0);
            ctx.quadraticCurveTo(tabWidth, 0, tabWidth, cornerRadius);
            ctx.lineTo(tabWidth, tabHeight);
            ctx.fill();
            
            // Enhanced border with animation
            ctx.strokeStyle = isSelected ? difficultyInfo.color : `rgba(48, 54, 61, ${0.8 + hoverIntensity})`;
            ctx.lineWidth = isSelected ? 2.5 : 1;
            ctx.stroke();
            
            // Reset shadow
            ctx.shadowBlur = 0;
            
            // Inner highlight for selected tab
            if (isSelected) {
                const highlightGradient = ctx.createLinearGradient(0, 0, 0, tabHeight);
                highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
                highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
                ctx.fillStyle = highlightGradient;
                
                ctx.beginPath();
                ctx.moveTo(2, tabHeight - 2);
                ctx.lineTo(2, cornerRadius);
                ctx.quadraticCurveTo(2, 2, cornerRadius, 2);
                ctx.lineTo(tabWidth - cornerRadius, 2);
                ctx.quadraticCurveTo(tabWidth - 2, 2, tabWidth - 2, cornerRadius);
                ctx.lineTo(tabWidth - 2, tabHeight - 2);
                ctx.fill();
            }
            
            // Tab text with enhanced effects
            const textColor = isSelected ? '#ffffff' : '#a5b3c1';
            const textShadowAlpha = isSelected ? 0.8 : 0.3;
            
            ctx.fillStyle = textColor;
            ctx.font = isSelected ? 'bold 15px Courier New' : '14px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Text shadow for depth
            ctx.shadowColor = 'rgba(0, 0, 0, ' + textShadowAlpha + ')';
            ctx.shadowBlur = isSelected ? 3 : 1;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            // Animated text glow for selected tab
            if (isSelected) {
                ctx.shadowColor = difficultyInfo.color;
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
            
            const tabText = `${difficultyInfo.emoji} ${difficultyInfo.name}`;
            ctx.fillText(tabText, tabWidth / 2, tabHeight / 2);
            
            // Reset all effects
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // Particle effect for selected tab
            if (isSelected) {
                for (let p = 0; p < 3; p++) {
                    const particleTime = time * 4 + p * 2;
                    const px = tabWidth/2 + Math.sin(particleTime) * 40;
                    const py = tabHeight/2 + Math.cos(particleTime * 1.3) * 15;
                    const particleAlpha = 0.3 + Math.sin(particleTime * 2) * 0.2;
                    
                    ctx.fillStyle = difficultyInfo.color + Math.floor(particleAlpha * 100).toString(16);
                    ctx.beginPath();
                    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            ctx.restore();
            
            // Store tab hit area for mouse interaction (use original positions for hit detection)
            tabHitAreas.push({
                x: tabX,
                y: tabY,
                width: tabWidth,
                height: tabHeight,
                difficulty
            });
        });
    }
    
    /**
     * Draw the score upload prompt dialog with enhanced UI and animations
     */
    drawUploadPrompt() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const time = Date.now() * 0.001;
        
        // Enhanced animated overlay
        const overlayGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        overlayGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.9)');
        overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Dialog box dimensions with animation
        const dialogWidth = 480;
        const dialogHeight = 380;
        const dialogX = (width - dialogWidth) / 2;
        const dialogY = (height - dialogHeight) / 2 + Math.sin(time * 2) * 3;
        
        // Multi-layer dialog background
        const mainGradient = ctx.createLinearGradient(dialogX, dialogY, dialogX, dialogY + dialogHeight);
        mainGradient.addColorStop(0, 'rgba(30, 35, 42, 0.95)');
        mainGradient.addColorStop(0.3, 'rgba(22, 27, 34, 0.98)');
        mainGradient.addColorStop(0.7, 'rgba(18, 23, 30, 0.98)');
        mainGradient.addColorStop(1, 'rgba(13, 17, 23, 0.95)');
        ctx.fillStyle = mainGradient;
        this.drawRoundedRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 15);
        ctx.fill();
        
        // Animated border with multiple layers
        const borderPulse = 0.7 + Math.sin(time * 3) * 0.3;
        
        // Outer glow
        ctx.shadowColor = '#58a6ff';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = `rgba(88, 166, 255, ${borderPulse * 0.8})`;
        ctx.lineWidth = 3;
        this.drawRoundedRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 15);
        ctx.stroke();
        
        // Inner border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, dialogX + 2, dialogY + 2, dialogWidth - 4, dialogHeight - 4, 13);
        ctx.stroke();
        
        // Enhanced title with multiple glow layers
        ctx.textAlign = 'center';
        ctx.font = 'bold 26px Courier New';
        
        // Title glow effects
        ctx.shadowColor = '#58a6ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(88, 166, 255, 0.4)';
        ctx.fillText('🏆 UPLOAD SCORE', width / 2, dialogY + 50);
        
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(88, 166, 255, 0.8)';
        ctx.fillText('🏆 UPLOAD SCORE', width / 2, dialogY + 50);
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🏆 UPLOAD SCORE', width / 2, dialogY + 50);
        
        // Animated subtitle
        ctx.fillStyle = '#a855f7';
        ctx.font = '16px Courier New';
        const subtitleAlpha = 0.8 + Math.sin(time * 2.5) * 0.2;
        ctx.fillStyle = `rgba(168, 85, 247, ${subtitleAlpha})`;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 6;
        ctx.fillText('Share your achievement with the world!', width / 2, dialogY + 80);
        ctx.shadowBlur = 0;
        
        // Enhanced score info display
        const { score, difficulty, survivalTime } = this.game.leaderboardSystem.currentUpload;
        const difficultyInfo = DIFFICULTY_LEVELS[difficulty];
        
        // Format survival time properly
        const minutes = Math.floor(survivalTime / 60);
        const seconds = Math.floor(survivalTime % 60);
        const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Animated score display container
        const scoreBoxY = dialogY + 100;
        const scoreBoxHeight = 80;
        const scoreBoxWidth = dialogWidth - 60;
        const scoreBoxX = dialogX + 30;
        
        // Score box background with animated gradient
        const scoreGradient = ctx.createLinearGradient(scoreBoxX, scoreBoxY, scoreBoxX, scoreBoxY + scoreBoxHeight);
        scoreGradient.addColorStop(0, `${difficultyInfo.color}20`);
        scoreGradient.addColorStop(0.5, 'rgba(13, 17, 23, 0.9)');
        scoreGradient.addColorStop(1, `${difficultyInfo.color}15`);
        ctx.fillStyle = scoreGradient;
        this.drawRoundedRect(ctx, scoreBoxX, scoreBoxY, scoreBoxWidth, scoreBoxHeight, 12);
        ctx.fill();
        
        // Animated score box border
        const scoreBorderPulse = 0.6 + Math.sin(time * 4) * 0.4;
        ctx.strokeStyle = difficultyInfo.color + Math.floor(scoreBorderPulse * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 2;
        ctx.shadowColor = difficultyInfo.color;
        ctx.shadowBlur = 8;
        this.drawRoundedRect(ctx, scoreBoxX, scoreBoxY, scoreBoxWidth, scoreBoxHeight, 12);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Score details with enhanced styling
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Courier New';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 3;
        ctx.fillText(`SCORE: ${score.toLocaleString()}`, width / 2, scoreBoxY + 35);
        ctx.shadowBlur = 0;
        
        // Difficulty and time with enhanced effects
        ctx.fillStyle = difficultyInfo.color;
        ctx.font = 'bold 16px Courier New';
        ctx.shadowColor = difficultyInfo.color;
        ctx.shadowBlur = 4;
        ctx.fillText(`${difficultyInfo.emoji} ${difficultyInfo.name} • ${timeFormatted}`, width / 2, scoreBoxY + 60);
        ctx.shadowBlur = 0;
        
        // Enhanced name input section
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('Player Name:', dialogX + 40, dialogY + 220);
        
        // Name input box with advanced styling
        const inputBoxWidth = 380;
        const inputBoxHeight = 50;
        const inputBoxX = (width - inputBoxWidth) / 2;
        const inputBoxY = dialogY + 230;
        
        // Multi-layer input background
        const inputMainGradient = ctx.createLinearGradient(inputBoxX, inputBoxY, inputBoxX, inputBoxY + inputBoxHeight);
        inputMainGradient.addColorStop(0, 'rgba(30, 35, 42, 0.9)');
        inputMainGradient.addColorStop(1, 'rgba(18, 23, 30, 0.9)');
        ctx.fillStyle = inputMainGradient;
        this.drawRoundedRect(ctx, inputBoxX, inputBoxY, inputBoxWidth, inputBoxHeight, 8);
        ctx.fill();
        
        // Animated input border
        const isInputActive = this.game.leaderboardSystem.nameInputActive;
        if (isInputActive) {
            const inputPulse = 0.7 + Math.sin(time * 6) * 0.3;
            ctx.shadowColor = '#58a6ff';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = `rgba(88, 166, 255, ${inputPulse})`;
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = 'rgba(72, 77, 85, 0.8)';
            ctx.lineWidth = 2;
        }
        this.drawRoundedRect(ctx, inputBoxX, inputBoxY, inputBoxWidth, inputBoxHeight, 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Inner input highlight
        if (isInputActive) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            this.drawRoundedRect(ctx, inputBoxX + 2, inputBoxY + 2, inputBoxWidth - 4, inputBoxHeight - 4, 6);
            ctx.stroke();
        }
        
        // Player name text with better styling
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.font = 'bold 20px Courier New';
        
        const playerName = this.game.leaderboardSystem.playerName;
        const displayName = playerName.length > 0 ? playerName : 'Anonymous';
        ctx.fillText(displayName, inputBoxX + 20, inputBoxY + 33);
        
        // Enhanced input cursor with animation
        if (isInputActive) {
            const cursorX = inputBoxX + 20 + ctx.measureText(displayName).width + 3;
            const cursorAlpha = 0.5 + Math.sin(time * 8) * 0.5;
            ctx.fillStyle = `rgba(88, 166, 255, ${cursorAlpha})`;
            ctx.fillRect(cursorX, inputBoxY + 12, 3, 26);
        }
        
        // Enhanced buttons with modern design and animations
        const buttonWidth = 140;
        const buttonHeight = 50;
        const buttonY = dialogY + 300;
        const uploadButtonX = width / 2 - buttonWidth - 15;
        const cancelButtonX = width / 2 + 15;
        
        // Upload button with animated effects
        const uploadHoverEffect = 1 + Math.sin(time * 4) * 0.05;
        
        // Upload button background with gradient
        const uploadGradient = ctx.createLinearGradient(uploadButtonX, buttonY, uploadButtonX, buttonY + buttonHeight);
        uploadGradient.addColorStop(0, '#40d158');
        uploadGradient.addColorStop(0.5, '#238636');
        uploadGradient.addColorStop(1, '#1a6e2b');
        ctx.fillStyle = uploadGradient;
        
        ctx.save();
        ctx.scale(uploadHoverEffect, uploadHoverEffect);
        ctx.translate(uploadButtonX + buttonWidth/2, buttonY + buttonHeight/2);
        ctx.translate(-buttonWidth/2, -buttonHeight/2);
        
        this.drawRoundedRect(ctx, 0, 0, buttonWidth, buttonHeight, 10);
        ctx.fill();
        
        // Upload button glow
        ctx.shadowColor = '#40d158';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#40d158';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, 0, 0, buttonWidth, buttonHeight, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Upload button text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.fillText('🚀 UPLOAD', buttonWidth / 2, buttonHeight / 2 + 6);
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Cancel button with subtle animations
        const cancelHoverEffect = 1 + Math.sin(time * 3 + 1) * 0.03;
        
        // Cancel button background
        const cancelGradient = ctx.createLinearGradient(cancelButtonX, buttonY, cancelButtonX, buttonY + buttonHeight);
        cancelGradient.addColorStop(0, 'rgba(110, 118, 129, 0.8)');
        cancelGradient.addColorStop(0.5, 'rgba(72, 79, 88, 0.9)');
        cancelGradient.addColorStop(1, 'rgba(56, 63, 72, 0.8)');
        ctx.fillStyle = cancelGradient;
        
        ctx.save();
        ctx.scale(cancelHoverEffect, cancelHoverEffect);
        ctx.translate(cancelButtonX + buttonWidth/2, buttonY + buttonHeight/2);
        ctx.translate(-buttonWidth/2, -buttonHeight/2);
        
        this.drawRoundedRect(ctx, 0, 0, buttonWidth, buttonHeight, 10);
        ctx.fill();
        
        // Cancel button border
        ctx.strokeStyle = 'rgba(139, 148, 158, 0.6)';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, 0, 0, buttonWidth, buttonHeight, 10);
        ctx.stroke();
        
        // Cancel button text
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 1;
        ctx.fillText('❌ CANCEL', buttonWidth / 2, buttonHeight / 2 + 6);
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Enhanced instructions with animation
        const instructionAlpha = 0.7 + Math.sin(time * 2) * 0.2;
        ctx.fillStyle = `rgba(125, 133, 144, ${instructionAlpha})`;
        ctx.font = '14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('Click to type your name, then click Upload to share your score', width / 2, dialogY + 320);
    }
    
    /**
     * Draw entry tooltip with detailed information
     */
    drawEntryTooltip() {
        const tooltip = this.game.leaderboardSystem.entryTooltip;
        if (!tooltip) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Tooltip dimensions
        const tooltipWidth = 300;
        const tooltipHeight = 150;
        let tooltipX = tooltip.x + 20;
        let tooltipY = tooltip.y - tooltipHeight - 20;
        
        // Keep tooltip within screen bounds
        if (tooltipX + tooltipWidth > width) tooltipX = width - tooltipWidth - 10;
        if (tooltipY < 10) tooltipY = tooltip.y + 20;
        
        // Tooltip background with gradient
        const gradient = ctx.createLinearGradient(tooltipX, tooltipY, tooltipX, tooltipY + tooltipHeight);
        gradient.addColorStop(0, 'rgba(33, 38, 45, 0.95)');
        gradient.addColorStop(1, 'rgba(22, 27, 34, 0.95)');
        ctx.fillStyle = gradient;
        this.drawRoundedRect(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
        ctx.stroke();
        
        // Content
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'left';
        
        const entry = tooltip.entry;
        const rank = tooltip.rank;
        
        // Rank and name
        ctx.fillText(`Rank #${rank}: ${entry.name}`, tooltipX + 15, tooltipY + 25);
        
        // Score
        ctx.fillStyle = '#ffd700';
        ctx.font = '18px Courier New';
        ctx.fillText(`Score: ${entry.score}`, tooltipX + 15, tooltipY + 50);
        
        // Time
        ctx.fillStyle = '#8b949e';
        ctx.font = '14px Courier New';
        const minutes = Math.floor(entry.survivalTime / 60);
        const seconds = Math.floor(entry.survivalTime % 60);
        ctx.fillText(`Survival Time: ${minutes}m ${seconds}s`, tooltipX + 15, tooltipY + 75);
        
        // Timestamp
        if (entry.timestamp) {
            const date = new Date(entry.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Date: ${dateStr}`, tooltipX + 15, tooltipY + 95);
        }
        
        // Additional info
        ctx.fillStyle = '#7d8590';
        ctx.font = '12px Courier New';
        ctx.fillText('Click elsewhere to close', tooltipX + 15, tooltipY + 125);
    }

    /**
     * Draw the reset confirmation dialog
     */
    drawResetConfirmationDialog() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
        ctx.fillRect(0, 0, width, height);
        
        // Dialog box dimensions
        const dialogWidth = 500;
        const dialogHeight = 350;
        const dialogX = (width - dialogWidth) / 2;
        const dialogY = (height - dialogHeight) / 2;
        
        // Dialog background
        ctx.fillStyle = '#161b22';
        this.drawRoundedRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 8);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = '#f85149';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, dialogX, dialogY, dialogWidth, dialogHeight, 8);
        ctx.stroke();
          // Title
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Courier New';
        ctx.fillText('RESET PROGRESS', width / 2, dialogY + 50);
        
        // Warning subtitle
        ctx.fillStyle = '#f85149';
        ctx.font = '18px Courier New';
        ctx.fillText('⚠️  WARNING: This will permanently delete:', width / 2, dialogY + 85);
        
        // List of items that will be deleted
        ctx.fillStyle = '#7d8590';
        ctx.font = '14px Courier New';
        ctx.textAlign = 'left';
        const itemsX = dialogX + 100;
        let itemY = dialogY + 115;        const items = [
            'Your current save game',
            'All upgrade progress',
            'All achievements',
            'Game statistics',
            'High scores'
        ];
        
        items.forEach(item => {
            ctx.fillText(item, itemsX, itemY);
            itemY += 25;
        });
        
        // Warning message
        ctx.fillStyle = '#f85149';
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px Courier New';
        ctx.fillText('Type "RESET" to confirm or [Esc] to cancel', width / 2, dialogY + 230);
        
        // Buttons
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonSpacing = 40;
        const buttonY = dialogY + 280;
        
        // Cancel button
        const cancelX = width / 2 - buttonWidth - buttonSpacing / 2;
        
        ctx.fillStyle = '#21262d';
        this.drawRoundedRect(ctx, cancelX, buttonY, buttonWidth, buttonHeight, 4);
        ctx.fill();
        
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, cancelX, buttonY, buttonWidth, buttonHeight, 4);
        ctx.stroke();
          ctx.fillStyle = '#8b949e';
        ctx.font = '16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('CANCEL', cancelX + buttonWidth / 2, buttonY + 25);
        
        // Confirm button
        const confirmX = width / 2 + buttonSpacing / 2;
          ctx.fillStyle = 'rgba(218, 54, 51, 0.3)';
        this.drawRoundedRect(ctx, confirmX, buttonY, buttonWidth, buttonHeight, 4);
        ctx.fill();
        
        ctx.strokeStyle = '#f85149';
        this.drawRoundedRect(ctx, confirmX, buttonY, buttonWidth, buttonHeight, 4);
        ctx.stroke();
        
        ctx.fillStyle = '#f85149';
        ctx.font = 'bold 16px Courier New';
        ctx.fillText('RESET', confirmX + buttonWidth / 2, buttonY + 25);// Store button hit areas for click handling
        // Ensure the game has resetDialogHitAreas initialized
        if (!this.game.resetDialogHitAreas) {
            this.game.resetDialogHitAreas = [];
        }
        
        this.game.resetDialogHitAreas.length = 0; // Clear existing hit areas
        this.game.resetDialogHitAreas.push(
            {
                x: cancelX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                action: 'cancel'
            },
            {
                x: confirmX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                action: 'confirm'
            }
        );
    }
      /**
     * Draw pause screen overlay with fade in animation and navigation buttons
     */
    drawPauseOverlay() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        const time = Date.now();
        const fadeStart = this.game.pauseStartTime || time;
        const fadeProgress = Math.min(1, (time - fadeStart) / 1000); // 1 second fade in
        
        // Ease-in-cubic for smoother animation
        const easedProgress = fadeProgress < 0.5 ? 4 * fadeProgress * fadeProgress * fadeProgress : 1 - Math.pow(-2 * fadeProgress + 2, 3) / 2;
        
        // Modern glassmorphism overlay with gradient for pause
        const overlayGradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 2
        );
        overlayGradient.addColorStop(0, `rgba(13, 17, 23, ${0.8 * easedProgress})`);
        overlayGradient.addColorStop(1, `rgba(0, 0, 0, ${0.7 * easedProgress})`);
        
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Pause title with modern styling
        const textAlpha = easedProgress;
        
        ctx.save();
        // Create gradient for title
        const titleGradient = ctx.createLinearGradient(0, height / 2 - 70, 0, height / 2 - 30);
        titleGradient.addColorStop(0, `rgba(88,166,255,${textAlpha})`);
        titleGradient.addColorStop(1, `rgba(59,130,246,${textAlpha})`);
        
        ctx.fillStyle = titleGradient;
        ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        
        // Add shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;
        
        ctx.fillText('GAME PAUSED', width / 2, height / 2 - 50);
        ctx.restore();
        
        // Current game stats with modern styling
        if (this.game.player) {
            ctx.fillStyle = `rgba(88, 166, 255, ${textAlpha})`;
            ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
            ctx.fillText(`Current Score: ${this.game.score.toLocaleString()}`, width / 2, height / 2 + 10);
            
            // Show current survival time
            const currentTime = this.game.pauseStartTime || Date.now();
            const survivalTime = Math.floor((currentTime - this.game.startTime) / 1000);
            ctx.font = '16px "Segoe UI", Arial, sans-serif';
            ctx.fillText(`Survival Time: ${survivalTime}s`, width / 2, height / 2 + 35);
            
            // Show best score for comparison
            const difficultyBestScore = this.game.bestScores[this.game.selectedDifficulty] || 0;
            if (difficultyBestScore > 0) {
                ctx.fillStyle = `rgba(255, 215, 0, ${textAlpha})`;
                ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
                ctx.fillText(`Best Score: ${difficultyBestScore.toLocaleString()}`, width / 2, height / 2 + 60);
            }
        }
        
        // Draw navigation buttons (only show when fade is nearly complete)
        if (easedProgress > 0.7) {
            this.drawPauseButtons(textAlpha);
        }
    }

    /**
     * Draw modern navigation buttons for pause screen
     */
    drawPauseButtons(alpha) {
        // Clear any existing hit areas for pause menu
        this.game.pauseHitAreas = this.game.pauseHitAreas || [];
        this.game.pauseHitAreas.length = 0;
        
        const ctx = this.ctx;
        const buttonWidth = 190;
        const buttonHeight = 45;
        const buttonSpacing = 12;
        const buttonsPerRow = 3;
        const totalRows = 3; // Updated for 7 buttons
        
        // Calculate starting position to center the button grid
        const totalWidth = (buttonsPerRow * buttonWidth) + ((buttonsPerRow - 1) * buttonSpacing);
        const totalHeight = (totalRows * buttonHeight) + ((totalRows - 1) * buttonSpacing);
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = this.canvas.height / 2 + 60; // Moved up slightly to fit 3 rows
        
        // Modern button definitions with icons
        const buttons = [
            { text: 'Resume', action: 'resume', color: '#22c55e', icon: '▶️' },
            { text: 'Restart', action: 'restart', color: '#3b82f6', icon: '🔄' },
            { text: 'Difficulty', action: 'difficulty', color: '#8b5cf6', icon: '⚙️' },
            { text: 'Main Menu', action: 'home', color: '#f59e0b', icon: '🏠' },
            { text: 'Shop', action: 'shop', color: '#10b981', icon: '🛒' },
            { text: 'Leaderboard', action: 'leaderboard', color: '#06b6d4', icon: '🏆' },
            { text: 'Settings', action: 'settings', color: '#ef4444', icon: '⚙️' }
        ];
        
        buttons.forEach((button, index) => {
            const row = Math.floor(index / buttonsPerRow);
            const col = index % buttonsPerRow;
            
            let x, y;
            
            // Special handling for the last button (7th button) to center it in row 3
            if (index === 6) {
                // Center the 7th button in the third row
                x = startX + buttonWidth + buttonSpacing; // Center position
                y = startY + (row * (buttonHeight + buttonSpacing));
            } else {
                x = startX + (col * (buttonWidth + buttonSpacing));
                y = startY + (row * (buttonHeight + buttonSpacing));
            }
            
            const isHovered = this.game.hoveredPauseButton === index;
            
            // Scale effect on hover
            const scale = isHovered ? 1.02 : 1;
            const scaledWidth = buttonWidth * scale;
            const scaledHeight = buttonHeight * scale;
            const scaledX = x - (scaledWidth - buttonWidth) / 2;
            const scaledY = y - (scaledHeight - buttonHeight) / 2;
            
            // Modern glassmorphism button background
            ctx.save();
            
            // Main button background with gradient
            const gradient = ctx.createLinearGradient(scaledX, scaledY, scaledX, scaledY + scaledHeight);
            if (isHovered) {
                gradient.addColorStop(0, `${button.color}40`);
                gradient.addColorStop(1, `${button.color}60`);
            } else {
                gradient.addColorStop(0, `${button.color}20`);
                gradient.addColorStop(1, `${button.color}30`);
            }
            
            ctx.fillStyle = gradient;
            this.roundRect(ctx, scaledX, scaledY, scaledWidth, scaledHeight, 10);
            ctx.fill();
            
            // Border with glow effect on hover
            if (isHovered) {
                ctx.shadowColor = button.color;
                ctx.shadowBlur = 15;
                ctx.strokeStyle = button.color;
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = `${button.color}80`;
                ctx.lineWidth = 1;
            }
            ctx.stroke();
            
            ctx.restore();
            
            // Button content
            ctx.save();
            
            // Add subtle glow to text on hover
            if (isHovered) {
                ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                ctx.shadowBlur = 8;
            }
            
            // Button icon
            ctx.font = '18px Arial';
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.textAlign = 'center';
            ctx.fillText(button.icon, scaledX + 25, scaledY + scaledHeight / 2 + 6);
            
            // Button text
            ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillText(button.text, scaledX + scaledWidth / 2 + 12, scaledY + scaledHeight / 2 + 5);
            
            ctx.restore();
            
            // Store hit area for click detection
            this.game.pauseHitAreas.push({
                x, y, width: buttonWidth, height: buttonHeight,
                action: button.action
            });
        });
        
        ctx.textAlign = 'left';
    }
    
    /**
     * Draw game over overlay with score and restart instructions
     */
    drawGameOverOverlay() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        const time = Date.now();
        const fadeStart = this.game.gameOverStartTime || time;
        const fadeProgress = Math.min(1, (time - fadeStart) / 1000); // 1 second fade in
        
        // Ease-in-cubic for smoother animation
        const easedProgress = fadeProgress < 0.5 ? 4 * fadeProgress * fadeProgress * fadeProgress : 1 - Math.pow(-2 * fadeProgress + 2, 3) / 2;
        
        // Modern glassmorphism overlay with gradient
        const overlayGradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 2
        );
        overlayGradient.addColorStop(0, `rgba(13, 17, 23, ${0.85 * easedProgress})`);
        overlayGradient.addColorStop(1, `rgba(0, 0, 0, ${0.75 * easedProgress})`);
        
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, 0, width, height);
          // Game over text with modern styling and gradient
        const textAlpha = easedProgress;
        
        // Create gradient for title
        const titleGradient = ctx.createLinearGradient(0, height / 2 - 70, 0, height / 2 - 30);
        titleGradient.addColorStop(0, `rgba(248, 81, 73, ${textAlpha})`);
        titleGradient.addColorStop(1, `rgba(220, 38, 38, ${textAlpha})`);
        
        ctx.save();
        ctx.fillStyle = titleGradient;
        ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        
        // Add shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        
        const deathMessage = this.game.gameOverMessage || 'GAME OVER';
        ctx.fillText(deathMessage, width / 2, height / 2 - 50);
        
        ctx.restore();
        
        // Death reason if available
        if (this.game.gameOverReason) {
            ctx.fillStyle = `rgba(240, 246, 252, ${textAlpha * 0.9})`;
            ctx.font = '16px "Segoe UI", Arial, sans-serif';
            ctx.fillText(`Cause: ${this.game.gameOverReason}`, width / 2, height / 2 - 15);
        }
        
        // Player stats with modern styling
        if (this.game.player) {
            // Final Score
            ctx.fillStyle = `rgba(88, 166, 255, ${textAlpha})`;
            ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
            ctx.fillText(`Final Score: ${this.game.score.toLocaleString()}`, width / 2, height / 2 + 15);
            
            // Show survival time - use gameOverStartTime to stop counting after death
            const survivalTime = Math.floor((this.game.gameOverStartTime - this.game.startTime) / 1000);
            ctx.font = '16px "Segoe UI", Arial, sans-serif';
            ctx.fillText(`Survival Time: ${survivalTime}s`, width / 2, height / 2 + 40);
            
            // Show best score with better formatting
            const difficultyBestScore = this.game.bestScores[this.game.selectedDifficulty] || 0;
            if (difficultyBestScore > 0) {
                ctx.fillStyle = `rgba(255, 215, 0, ${textAlpha})`;
                ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
                ctx.fillText(`Best Score: ${difficultyBestScore.toLocaleString()}`, width / 2, height / 2 + 65);
            }
        }
        
        // Draw navigation buttons (only show when fade is nearly complete)
        if (easedProgress > 0.7) {
            this.drawGameOverButtons(textAlpha);
        }
        
        // High score celebration
        if (this.game.isNewHighScore) {
            this.drawHighScoreCelebration(time, easedProgress);
        }
    }
    
    /**
     * Draw modern game over menu buttons
     */
    drawGameOverButtons(alpha) {
        // Clear any existing hit areas for game over menu
        this.game.gameOverHitAreas = this.game.gameOverHitAreas || [];
        this.game.gameOverHitAreas.length = 0;
        
        const ctx = this.ctx;
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonSpacing = 15;
        const buttonsPerRow = 3;
        const totalRows = 2;
        
        // Calculate starting position to center the button grid
        const totalWidth = (buttonsPerRow * buttonWidth) + ((buttonsPerRow - 1) * buttonSpacing);
        const totalHeight = (totalRows * buttonHeight) + ((totalRows - 1) * buttonSpacing);
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = this.canvas.height / 2 + 90;
        
        // Modern button definitions with better styling
        const buttons = [
            { text: 'Restart', action: 'restart', color: '#22c55e', icon: '🔄' },
            { text: 'Difficulty', action: 'difficulty', color: '#3b82f6', icon: '⚙️' },
            { text: 'Main Menu', action: 'home', color: '#8b5cf6', icon: '🏠' },
            { text: 'Leaderboard', action: 'leaderboard', color: '#f59e0b', icon: '🏆' },
            { text: 'Shop', action: 'shop', color: '#06b6d4', icon: '🛒' },
            { text: 'Settings', action: 'settings', color: '#ef4444', icon: '⚙️' }
        ];
        
        buttons.forEach((button, index) => {
            const row = Math.floor(index / buttonsPerRow);
            const col = index % buttonsPerRow;
            
            const x = startX + (col * (buttonWidth + buttonSpacing));
            const y = startY + (row * (buttonHeight + buttonSpacing));
            
            const isHovered = this.game.hoveredGameOverButton === index;
            
            // Scale effect on hover
            const scale = isHovered ? 1.02 : 1;
            const scaledWidth = buttonWidth * scale;
            const scaledHeight = buttonHeight * scale;
            const scaledX = x - (scaledWidth - buttonWidth) / 2;
            const scaledY = y - (scaledHeight - buttonHeight) / 2;
            
            // Modern glassmorphism button background
            ctx.save();
            
            // Main button background with gradient
            const gradient = ctx.createLinearGradient(scaledX, scaledY, scaledX, scaledY + scaledHeight);
            if (isHovered) {
                gradient.addColorStop(0, `${button.color}40`); // More transparent at top
                gradient.addColorStop(1, `${button.color}60`); // Less transparent at bottom
            } else {
                gradient.addColorStop(0, `${button.color}20`);
                gradient.addColorStop(1, `${button.color}30`);
            }
            
            ctx.fillStyle = gradient;
            this.roundRect(ctx, scaledX, scaledY, scaledWidth, scaledHeight, 12);
            ctx.fill();
            
            // Border with glow effect on hover
            if (isHovered) {
                ctx.shadowColor = button.color;
                ctx.shadowBlur = 20;
                ctx.strokeStyle = button.color;
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = `${button.color}80`;
                ctx.lineWidth = 1;
            }
            ctx.stroke();
            
            ctx.restore();
            
            // Button content
            ctx.save();
            
            // Add subtle glow to text on hover
            if (isHovered) {
                ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                ctx.shadowBlur = 10;
            }
            
            // Button icon
            ctx.font = '20px Arial';
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.textAlign = 'center';
            ctx.fillText(button.icon, scaledX + 30, scaledY + scaledHeight / 2 + 7);
            
            // Button text
            ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillText(button.text, scaledX + scaledWidth / 2 + 15, scaledY + scaledHeight / 2 + 6);
            
            ctx.restore();
            
            // Store hit area for click detection
            this.game.gameOverHitAreas.push({
                x, y, width: buttonWidth, height: buttonHeight,
                action: button.action
            });
        });
        
        // Add subtle instruction text below buttons
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.font = '14px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Choose an option above to continue', this.canvas.width / 2, startY + totalHeight + 40);
        
        ctx.textAlign = 'left';
    }

    /**
     * Helper function to draw rounded rectangles
     */
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    /**
     * Draw hexagon shape for animated background
     */
    drawHexagon(ctx, x, y, size, rotation, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = size * Math.cos(angle);
            const py = size * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Draw the completely overhauled modern shop interface (polished)
     */
    drawShop(shopHitAreas = []) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.save();
        shopHitAreas.length = 0;
        const scrollOffset = this.game.shopScrollOffset || 0;
        // Animated gradient background (matches other screens)
        const time = Date.now() * 0.001;
        const bgGradient = ctx.createRadialGradient(
            width/2 + Math.sin(time * 0.5) * 60,
            height/2 + Math.cos(time * 0.3) * 40,
            0,
            width/2, height/2, Math.max(width, height) * 0.8
        );
        bgGradient.addColorStop(0, 'rgba(13, 17, 23, 0.97)');
        bgGradient.addColorStop(0.3, 'rgba(30, 41, 59, 0.98)');
        bgGradient.addColorStop(0.7, 'rgba(21, 32, 43, 0.96)');
        bgGradient.addColorStop(1, 'rgba(13, 17, 23, 0.99)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        // Animated particles overlay
        this.drawDifficultyParticles(ctx, width, height, time);
        // Glassmorphic header panel
        const headerHeight = 100;
        this.drawGlassmorphicPanel(ctx, 0, 0, width, headerHeight, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.18)');
        // Animated glowing title
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 38px Courier New';
        ctx.shadowColor = 'rgba(88,166,255,0.5)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#f0f6fc';
        ctx.fillText('UPGRADE SHOP', width/2, 48);
        ctx.shadowColor = 'rgba(168,85,247,0.3)';
        ctx.shadowBlur = 32;
        ctx.fillText('UPGRADE SHOP', width/2, 48);
        ctx.shadowBlur = 0;
        ctx.font = '18px Courier New';
        ctx.fillStyle = 'rgba(125,133,144,0.85)';
        ctx.fillText('Spend Data Packets to unlock upgrades & power-ups', width/2, 75);
        ctx.restore();
        // Currency display (top right)
        const currentCurrency = this.game.upgradeSystem ? this.game.upgradeSystem.getDataPackets() : 0;
        this.drawCurrencyDisplay(ctx, width - 30, 35, currentCurrency);
        // Shop system
        const shopSystem = this.game.shopSystem;
        if (!shopSystem) {
            ctx.fillStyle = '#f85149';
            ctx.font = '20px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('Shop system not available', width/2, height/2);
            ctx.restore();
            return;
        }
        // Categories (with glassmorphic headers)
        const categories = {
            movement: { name: 'Movement Control', color: '#40d158', emoji: '🏃', bgColor: 'rgba(64,209,88,0.08)' },
            score: { name: 'Score Collection', color: '#58a6ff', emoji: '📊', bgColor: 'rgba(88,166,255,0.08)' },
            powerups: { name: 'Power-Up Unlocks', color: '#ff9500', emoji: '⚡', bgColor: 'rgba(255,149,0,0.08)' },
            revive: { name: 'Survival & Revival', color: '#a5a5a5', emoji: '💚', bgColor: 'rgba(165,165,165,0.08)' },
            cosmetic: { name: 'Cosmetic Effects', color: '#d2a8ff', emoji: '✨', bgColor: 'rgba(210,168,255,0.08)' }
        };
        const contentStartY = headerHeight + 20;
        const availableHeight = height - contentStartY - 60;
        const footerY = height - 50;
        const contentWidth = Math.min(1000, width - 40);
        const leftMargin = (width - contentWidth) / 2;
        // Scrollable area
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, contentStartY, width, availableHeight);
        ctx.clip();
        const itemsPerRow = Math.floor(contentWidth / 320);
        const itemWidth = 300;
        const itemHeight = 120;
        const itemSpacing = 20;
        let currentY = contentStartY - scrollOffset;
        let totalContentHeight = 0;
        Object.entries(categories).forEach(([categoryKey, categoryInfo]) => {
            const categoryUpgrades = shopSystem.getUpgradesByCategory(categoryKey);
            if (categoryUpgrades.length === 0) return;
            // Category header height
            totalContentHeight += 50;
            // Calculate rows needed for this category
            const rowsNeeded = Math.ceil(categoryUpgrades.length / itemsPerRow);
            totalContentHeight += rowsNeeded * (itemHeight + itemSpacing) - itemSpacing; // Remove last row spacing
            // Small spacing between categories
            totalContentHeight += 20;
        });
        // Minimal bottom padding
        totalContentHeight += 10;
        Object.entries(categories).forEach(([categoryKey, categoryInfo]) => {
            const categoryUpgrades = shopSystem.getUpgradesByCategory(categoryKey);
            if (categoryUpgrades.length === 0) return;
            // Glassmorphic category header
            this.drawGlassmorphicPanel(ctx, leftMargin, currentY, contentWidth, 40, categoryInfo.bgColor, 'rgba(255,255,255,0.10)');
            ctx.save();
            ctx.font = 'bold 18px Courier New';
            ctx.textAlign = 'left';
            ctx.shadowColor = categoryInfo.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = categoryInfo.color;
            ctx.fillText(`${categoryInfo.emoji} ${categoryInfo.name}`, leftMargin + 15, currentY + 25);
            ctx.shadowBlur = 0;
            ctx.font = '14px Courier New';
            ctx.fillStyle = '#8b949e';
            ctx.textAlign = 'right';
            const ownedCount = categoryUpgrades.filter(upg => shopSystem.isOwned(upg.id)).length;
            ctx.fillText(`Owned: ${ownedCount}/${categoryUpgrades.length}`, leftMargin + contentWidth - 15, currentY + 25);
            ctx.restore();
            currentY += 50;
            let currentX = leftMargin;
            let itemsInCurrentRow = 0;
            categoryUpgrades.forEach((upgrade, index) => {
                const isOwned = shopSystem.isOwned(upgrade.id);
                const canAfford = currentCurrency >= upgrade.price;
                const prereqsMet = this.arePrerequisitesMet(upgrade, shopSystem);
                const isLocked = !prereqsMet;
                const isHovered = false; // TODO: implement hover
                if (itemsInCurrentRow >= itemsPerRow) {
                    currentY += itemHeight + itemSpacing;
                    currentX = leftMargin;
                    itemsInCurrentRow = 0;
                }
                const itemVisible = currentY + itemHeight >= contentStartY && currentY <= contentStartY + availableHeight;
                if (itemVisible) {
                    // Card background
                    let bgColor, borderColor;
                    if (isLocked) {
                        bgColor = 'rgba(60,60,60,0.8)'; // Dark gray for locked
                        borderColor = '#6e7681';
                    } else if (isOwned) {
                        bgColor = 'rgba(64,209,88,0.13)';
                        borderColor = '#40d158';
                    } else if (canAfford) {
                        bgColor = 'rgba(33,38,45,0.93)';
                        borderColor = categoryInfo.color;
                    } else {
                        bgColor = 'rgba(248,81,73,0.15)'; // More noticeable red background
                        borderColor = '#f85149'; // Red border
                    }
                    ctx.save();
                    
                    // Apply blur effect for locked items
                    if (isLocked) {
                        ctx.filter = 'blur(2px)';
                        ctx.globalAlpha = 0.6;
                    }
                    
                    this.drawGlassmorphicPanel(ctx, currentX, currentY, itemWidth, itemHeight, bgColor, 'rgba(255,255,255,0.10)');
                    
                    // Reset filter for non-blurred elements
                    if (isLocked) {
                        ctx.filter = 'none';
                        ctx.globalAlpha = 1.0;
                    }
                    
                    // Card border with animated glow for affordable
                    if (canAfford && !isOwned && !isLocked) {
                        ctx.shadowColor = categoryInfo.color;
                        ctx.shadowBlur = 12 + Math.sin(time * 4 + index) * 4;
                    } else {
                        ctx.shadowBlur = 0;
                    }
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = isOwned ? 3 : canAfford ? 2 : 1;
                    this.drawRoundedRect(ctx, currentX, currentY, itemWidth, itemHeight, 12);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    // Status icon
                    const iconSize = 20;
                    const iconX = currentX + itemWidth - iconSize - 10;
                    const iconY = currentY + 10;
                    if (isLocked) {
                        ctx.fillStyle = '#6e7681';
                        ctx.font = '18px Courier New';
                        ctx.textAlign = 'center';
                        ctx.fillText('🔒', iconX + iconSize/2, iconY + iconSize/2 + 5);
                    } else if (isOwned) {
                        ctx.fillStyle = '#40d158';
                        ctx.font = '16px Courier New';
                        ctx.textAlign = 'center';
                        ctx.fillText('✓', iconX + iconSize/2, iconY + iconSize/2 + 5);
                    } else if (!canAfford) {
                        ctx.fillStyle = '#f85149';
                        ctx.font = '16px Courier New';
                        ctx.textAlign = 'center';
                        ctx.fillText('🔒', iconX + iconSize/2, iconY + iconSize/2 + 5);
                    }
                    
                    // Apply blur to text content for locked items
                    if (isLocked) {
                        ctx.filter = 'blur(1px)';
                        ctx.globalAlpha = 0.6;
                    }
                    
                    // Upgrade name
                    ctx.font = isHovered ? 'bold 24px Courier New' : 'bold 20px Courier New';
                    ctx.fillStyle = isLocked ? '#6e7681' : (isHovered ? '#ffffff' : '#f0f6fc');
                    ctx.textAlign = 'left';
                    ctx.fillText(upgrade.name, currentX + 15, currentY + 30);
                    // Price display
                    ctx.font = '14px Courier New';
                    if (isLocked) {
                        ctx.fillStyle = '#6e7681';
                        ctx.textAlign = 'right';
                        ctx.fillText('LOCKED', currentX + itemWidth - 35, currentY + 30);
                    } else if (isOwned) {
                        ctx.fillStyle = '#40d158';
                        ctx.textAlign = 'right';
                        ctx.fillText('OWNED', currentX + itemWidth - 35, currentY + 30);
                    } else {
                        ctx.fillStyle = canAfford ? '#ffd700' : '#f85149'; // Red price for unaffordable
                        ctx.textAlign = 'right';
                        ctx.fillText(`${upgrade.price} 📦`, currentX + itemWidth - 35, currentY + 30);
                        
                        // Add "NEED MORE DATA PACKETS" text for unaffordable items
                        if (!canAfford) {
                            ctx.font = 'bold 11px Courier New';
                            ctx.fillStyle = '#f85149';
                            ctx.textAlign = 'center';
                            ctx.fillText('NEED MORE DATA PACKETS', currentX + itemWidth/2, currentY + 105);
                        }
                    }
                    // Description (wrap)
                    ctx.font = '12px Courier New';
                    ctx.fillStyle = isLocked ? '#6e7681' : (isOwned ? '#7d8590' : canAfford ? '#c9d1d9' : '#6e7681');
                    ctx.textAlign = 'left';
                    const maxWidth = itemWidth - 30;
                    
                    let description;
                    if (isLocked && upgrade.prerequisites && upgrade.prerequisites.length > 0) {
                        // Show prerequisite requirements for locked items
                        const missingPrereqs = upgrade.prerequisites.filter(prereqId => !shopSystem.isOwned(prereqId));
                        const prereqNames = missingPrereqs.map(prereqId => {
                            const prereqUpgrade = shopSystem.upgradeData[prereqId];
                            return prereqUpgrade ? prereqUpgrade.name : prereqId;
                        });
                        description = `Requires: ${prereqNames.join(', ')}`;
                    } else {
                        description = upgrade.description || 'No description available';
                    }
                    
                    const words = description.split(' ');
                    let line = '';
                    let yOffset = currentY + 55;
                    const lineHeight = 14;
                    let linesDrawn = 0;
                    const maxLines = 3;
                    for (let i = 0; i < words.length && linesDrawn < maxLines; i++) {
                        const testLine = line + words[i] + ' ';
                        const metrics = ctx.measureText(testLine);
                        if (metrics.width > maxWidth && i > 0) {
                            ctx.fillText(line.trim(), currentX + 15, yOffset);
                            line = words[i] + ' ';
                            yOffset += lineHeight;
                            linesDrawn++;
                        } else {
                            line = testLine;
                        }
                    }
                    if (linesDrawn < maxLines && line.trim()) {
                        const finalLine = line.trim();
                        if (ctx.measureText(finalLine).width > maxWidth) {
                            let truncated = finalLine;
                            while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
                                truncated = truncated.slice(0, -1);
                            }
                            ctx.fillText(truncated + '...', currentX + 15, yOffset);
                        } else {
                            ctx.fillText(finalLine, currentX + 15, yOffset);
                        }
                    }
                    
                    // Reset filter for locked items
                    if (isLocked) {
                        ctx.filter = 'none';
                        ctx.globalAlpha = 1.0;
                    }
                    
                    ctx.restore();
                }
                if (!isOwned && !isLocked) {
                    shopHitAreas.push({
                        x: currentX,
                        y: currentY,
                        width: itemWidth,
                        height: itemHeight,
                        upgradeId: upgrade.id,
                        action: canAfford ? 'buy' : 'insufficient_funds',
                        canAfford: canAfford
                    });
                } else if (isLocked) {
                    // Add hit area for locked items to show prerequisite info
                    shopHitAreas.push({
                        x: currentX,
                        y: currentY,
                        width: itemWidth,
                        height: itemHeight,
                        upgradeId: upgrade.id,
                        action: 'locked',
                        canAfford: false
                    });
                }
                currentX += itemWidth + itemSpacing;
                itemsInCurrentRow++;
            });
            if (itemsInCurrentRow > 0) {
                currentY += itemHeight + itemSpacing;
            }
            currentY += 20; // Smaller spacing between categories
        });
        ctx.restore(); // remove scroll clip
        // Calculate proper max scroll - only scroll if content is larger than available space
        const actualContentHeight = totalContentHeight;
        const maxScroll = Math.max(0, actualContentHeight - availableHeight);
        this.game.shopMaxScroll = maxScroll;
        
        // Only show scrollbar if scrolling is needed
        if (maxScroll > 0) {
            const indicatorWidth = 4;
            const indicatorHeight = availableHeight;
            const indicatorX = width - 20;
            const indicatorY = contentStartY;
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = 'rgba(139,148,158,0.3)';
            ctx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
            const thumbHeight = Math.max(20, (availableHeight / actualContentHeight) * indicatorHeight);
            const thumbY = indicatorY + (scrollOffset / maxScroll) * (indicatorHeight - thumbHeight);
            ctx.fillStyle = 'rgba(88,166,255,0.8)';
            ctx.fillRect(indicatorX, thumbY, indicatorWidth, thumbHeight);
            ctx.restore();
        }
        // Footer instructions (centered, consistent)
        ctx.save();
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#7d8590';
        ctx.textAlign = 'center';
        ctx.fillText('[Enter] to Purchase   •   [Tab] to Change Category   •   [S] or [Esc] to Exit', width/2, height - 18);
        ctx.restore();
        ctx.restore();
    }

    /**
     * Draw a glassmorphic panel (used for header/category/shop cards)
     */
    drawGlassmorphicPanel(ctx, x, y, w, h, bg, border) {
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = bg;
        this.drawRoundedRect(ctx, x, y, w, h, 14);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = border;
        ctx.lineWidth = 1.5;
        this.drawRoundedRect(ctx, x, y, w, h, 14);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw modern currency display for shop
     */
    drawCurrencyDisplay(ctx, x, y, amount) {
        ctx.save();
        
        // Currency panel background
        const panelWidth = 180;
        const panelHeight = 40;
        const panelX = x - panelWidth;
        const panelY = y - panelHeight / 2;
        
        // Glassmorphic background
        this.drawGlassmorphicPanel(ctx, panelX, panelY, panelWidth, panelHeight, 'rgba(255,215,0,0.1)', 'rgba(255,215,0,0.3)');
        
        // Currency icon
        ctx.font = '18px Courier New';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'left';
        ctx.fillText('📦', panelX + 10, panelY + 25);
        
        // Currency amount
        ctx.font = 'bold 16px Courier New';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'right';
        ctx.fillText(amount.toLocaleString(), panelX + panelWidth - 10, panelY + 25);
        
        // Currency label
        ctx.font = '12px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.textAlign = 'left';
        ctx.fillText('Data Packets', panelX + 35, panelY + 15);
        
        ctx.restore();
    }

    /**
     * Draw hexagon shape for animated background
     */
    drawHexagon(ctx, x, y, size, rotation, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = size * Math.cos(angle);
            const py = size * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Draw rounded rectangle helper method
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    /**
     * Initialize the game dialogs system
     */
    init() {
        // Any initialization logic for game dialogs
    }

    /**
     * Update method for game dialogs (to be called every frame)
     */
    update() {
        // Update logic for dialogs, if needed
    }

    /**
     * Show the difficulty selection screen
     */
    showDifficultySelection() {
        this.game.gameState = GAME_STATES.DIFFICULTY_SELECTION;
    }

    /**
     * Show the changelog screen
     */
    showChangelog() {
        this.game.gameState = GAME_STATES.CHANGELOG;
    }
    
    /**
     * Show the leaderboard screen
     */
    showLeaderboard() {
        this.game.gameState = GAME_STATES.LEADERBOARD;
    }
    
    /**
     * Show the shop screen
     */
    showShop() {
        this.game.gameState = GAME_STATES.SHOP;
    }
    
    /**
     * Show the settings screen
     */
    showSettings() {
        this.game.gameState = GAME_STATES.SETTINGS;
    }

    /**
     * Show the options menu
     */
    showOptions() {
        this.game.gameState = GAME_STATES.OPTIONS;
    }

    /**
     * Show the credits screen
     */
    showCredits() {
        this.game.gameState = GAME_STATES.CREDITS;
    }

    /**
     * Handle mouse click events for dialogs
     */
    handleClick(x, y) {
        // Delegate click handling to the active dialog based on game state
        switch (this.game.gameState) {
            case GAME_STATES.DIFFICULTY_SELECTION:
                this.handleDifficultySelectionClick(x, y);
                break;
            case GAME_STATES.CHANGELOG:
                this.handleChangelogClick(x, y);
                break;
            case GAME_STATES.LEADERBOARD:
                this.handleLeaderboardClick(x, y);
                break;
            case GAME_STATES.SHOP:
                this.handleShopClick(x, y);
                break;
            case GAME_STATES.SETTINGS:
                this.handleSettingsClick(x, y);
                break;
            case GAME_STATES.OPTIONS:
                this.handleOptionsClick(x, y);
                break;
            case GAME_STATES.CREDITS:
                this.handleCreditsClick(x, y);
                break;
            case GAME_STATES.PAUSED:
                this.handlePauseClick(x, y);
                break;
            case GAME_STATES.GAME_OVER:
                this.handleGameOverClick(x, y);
                break;
            default:
                break;
        }
    }

    /**
     * Handle mouse move events for dialogs
     */
    handleMouseMove(x, y) {
        // Delegate mouse move handling to the active dialog based on game state
        switch (this.game.gameState) {
            case GAME_STATES.DIFFICULTY_SELECTION:
                this.handleDifficultySelectionMouseMove(x, y);
                break;
            case GAME_STATES.CHANGELOG:
                this.handleChangelogMouseMove(x, y);
                break;
            case GAME_STATES.LEADERBOARD:
                this.handleLeaderboardMouseMove(x, y);
                break;
            case GAME_STATES.SHOP:
                this.handleShopMouseMove(x, y);
                break;
            case GAME_STATES.SETTINGS:
                this.handleSettingsMouseMove(x, y);
                break;
            case GAME_STATES.OPTIONS:
                this.handleOptionsMouseMove(x, y);
                break;
            case GAME_STATES.CREDITS:
                this.handleCreditsMouseMove(x, y);
                break;
            case GAME_STATES.PAUSED:
                this.handlePauseMouseMove(x, y);
                break;
            case GAME_STATES.GAME_OVER:
                this.handleGameOverMouseMove(x, y);
                break;
            default:
                break;
        }
    }

    /**
     * Handle difficulty selection clicks
     */
    handleDifficultySelectionClick(x, y) {
        const { difficultyHitAreas } = this;
        
        for (const area of difficultyHitAreas) {
            if (x >= area.x && x <= area.x + area.width &&
                y >= area.y && y <= area.y + area.height) {
                
                // Set the selected difficulty and start the game
                this.game.selectedDifficulty = Object.keys(DIFFICULTY_LEVELS)[area.index];
                this.game.startGame();
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Handle changelog clicks
     */
    handleChangelogClick(x, y) {
        // Close changelog on click
        this.game.gameState = GAME_STATES.HOME;
    }
    
    /**
     * Handle leaderboard clicks
     */
    handleLeaderboardClick(x, y) {
        // No specific action on click, just show the leaderboard
        this.showLeaderboard();
    }
    
    /**
     * Check if upgrade prerequisites are met
     */
    arePrerequisitesMet(upgrade, shopSystem) {
        if (!upgrade.prerequisites || upgrade.prerequisites.length === 0) {
            return true;
        }
        
        return upgrade.prerequisites.every(prereqId => shopSystem.isOwned(prereqId));
    }
    
    /**
     * Handle shop clicks
     */
    handleShopClick(x, y) {
        const shopHitAreas = this.game.shopHitAreas || [];
        console.log(`🛒 GameDialogs.handleShopClick called with ${shopHitAreas ? shopHitAreas.length : 0} hit areas`);
        
        for (const area of shopHitAreas) {
            console.log(`🛒 Checking area: ${area.upgradeId} at (${area.x}, ${area.y}) size ${area.width}x${area.height}`);
            if (x >= area.x && x <= area.x + area.width &&
                y >= area.y && y <= area.y + area.height) {
                
                console.log(`🛒 Hit detected for ${area.upgradeId} with action: ${area.action}`);
                
                // Purchase upgrade if click is on a purchasable item
                if (area.action === 'buy') {
                    const success = this.game.shopSystem.purchaseUpgrade(area.upgradeId);
                    if (success && this.game.popupSystem) {
                        const upgrade = this.game.shopSystem.upgradeData[area.upgradeId];
                        this.game.popupSystem.showConfirmationPopup(
                            'Purchase Successful', 
                            `✅ Successfully purchased: ${upgrade.name}`
                        );
                    }
                } else if (area.action === 'insufficient_funds') {
                    // Show insufficient funds message
                    if (this.game.popupSystem) {
                        const upgrade = this.game.shopSystem.upgradeData[area.upgradeId];
                        const currentCurrency = this.game.upgradeSystem ? this.game.upgradeSystem.getDataPackets() : 0;
                        const needed = upgrade.price - currentCurrency;
                        this.game.popupSystem.showErrorPopup(
                            'Insufficient Data Packets', 
                            `❌ You need ${needed} more data packets to purchase "${upgrade.name}"\n\nCurrent: ${currentCurrency} 📦\nRequired: ${upgrade.price} 📦`
                        );
                    }
                } else if (area.action === 'locked') {
                    // Show prerequisites message for locked items
                    if (this.game.popupSystem) {
                        const upgrade = this.game.shopSystem.upgradeData[area.upgradeId];
                        const missingPrereqs = upgrade.prerequisites.filter(prereqId => !this.game.shopSystem.isOwned(prereqId));
                        const prereqNames = missingPrereqs.map(prereqId => {
                            const prereqUpgrade = this.game.shopSystem.upgradeData[prereqId];
                            return prereqUpgrade ? prereqUpgrade.name : prereqId;
                        });
                        this.game.popupSystem.showErrorPopup(
                            'Prerequisites Required', 
                            `🔒 "${upgrade.name}" is locked!\n\nYou must first purchase:\n${prereqNames.map(name => `• ${name}`).join('\n')}`
                        );
                    }
                }
                
                return true;
            }
        }
        
        console.log('🛒 No hit areas matched the click');
        return false;
    }
    
    /**
     * Handle settings clicks
     */
    handleSettingsClick(x, y) {
        const settingsHitAreas = this.game.settingsHitAreas || [];
        
        for (const area of settingsHitAreas) {
            if (x >= area.x && x <= area.x + area.width &&
                y >= area.y && y <= area.y + area.height) {
                
                if (area.action === 'toggleMute') {
                    // Toggle mute state
                    if (this.game.audioSystem) {
                        const currentMute = this.game.audioSystem.getIsMuted?.() ?? false;
                        this.game.audioSystem.setMuted(!currentMute);
                    }
                    return true;
                } else if (area.action === 'back') {
                    // Go back to previous state
                    this.game.gameState = this.game.previousGameState || GAME_STATES.HOME;
                    return true;
                } else if (area.action === 'slider') {
                    // Start dragging slider
                    this.draggingSlider = {
                        setting: area.setting,
                        x: area.x,
                        y: area.y,
                        width: area.width,
                        height: area.height
                    };
                    
                    // Update slider value immediately
                    this.updateSliderValue(x);
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Handle options menu clicks
     */
    handleOptionsClick(x, y) {
        const optionsHitAreas = this.game.optionsHitAreas || [];
        
        for (const area of optionsHitAreas) {
            if (x >= area.x && x <= area.x + area.width &&
                y >= area.y && y <= area.y + area.height) {
                
                if (area.action === 'back') {
                    // Go back to previous state
                    this.game.gameState = this.game.previousGameState || GAME_STATES.HOME;
                    return true;
                } else {
                    // Handle other options menu actions
                    // (e.g., tutorial, achievements, settings, credits)
                    this.game.gameState = area.action;
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Handle credits screen clicks
     */
    handleCreditsClick(x, y) {
        const creditsHitAreas = this.game.creditsHitAreas || [];
        
        for (const area of creditsHitAreas) {
            if (x >= area.x && x <= area.x + area.width &&
                y >= area.y && y <= area.y + area.height) {
                
                if (area.action === 'back') {
                    // Go back to previous state
                    this.game.gameState = this.game.previousGameState || GAME_STATES.HOME;
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Handle pause menu clicks
     */
    handlePauseClick(x, y) {
        // Check if any pause menu buttons were clicked
        if (this.game.pauseHitAreas) {
            for (const area of this.game.pauseHitAreas) {
                if (x >= area.x && x <= area.x + area.width && 
                    y >= area.y && y <= area.y + area.height) {
                    
                    // Handle button action
                    switch (area.action) {
                        case 'resume':
                            this.game.togglePause();
                            break;
                        case 'restart':
                            this.game.restart();
                            break;
                        case 'difficulty':
                            this.game.navigateToState(GAME_STATES.DIFFICULTY_SELECT);
                            break;
                        case 'home':
                            this.game.navigateToState(GAME_STATES.HOME);
                            break;
                        case 'shop':
                            this.game.navigateToState(GAME_STATES.SHOP);
                            break;
                        case 'leaderboard':
                            this.game.navigateToState(GAME_STATES.LEADERBOARD);
                            break;
                        case 'settings':
                            this.game.navigateToState(GAME_STATES.SETTINGS);
                            break;
                    }
                    
                    // Play click sound
                    if (this.game.audioSystem) {
                        this.game.audioSystem.onMenuClick();
                    }
                    
                    return; // Exit after handling the click
                }
            }
        }
        
        // If no button was clicked, do nothing (don't resume on random clicks)
    }

    /**
     * Handle game over clicks
     */
    handleGameOverClick(x, y) {
        // Restart game on click (anywhere on the screen)
        this.game.restartGame();
    }

    /**
     * Draw the high score celebration effects
     */
    drawHighScoreCelebration(time, alpha) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Confetti effect
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 3 + 2;
            const hue = Math.random() * 360;
            
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Celebration text
        ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('NEW HIGH SCORE!', width / 2, height / 2 - 20);
        
        // Subtle pulsing effect
        const pulseScale = 1 + Math.sin(time * 0.005) * 0.05;
        ctx.scale(pulseScale, pulseScale);
        ctx.fillText('NEW HIGH SCORE!', width / 2, height / 2 - 20);
        ctx.scale(1 / pulseScale, 1 / pulseScale);
    }

    /**
     * Convert hex color to RGB values
     */
    hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse RGB values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `${r}, ${g}, ${b}`;
    }

    /**
     * Get general setting value
     */
    getGeneralSetting(key, defaultValue) {
        if (window.generalSettings) {
            switch (key) {
                case 'graphicsQuality':
                    return window.generalSettings.getGraphicsQuality();
                case 'showFpsCounter':
                    return window.generalSettings.isShowFpsCounterEnabled();
                case 'enableOpeningAnimation':
                    return window.generalSettings.isOpeningAnimationEnabled();
            }
        }
        return defaultValue;
    }    /**
     * Get audio setting value
     */
    getAudioSetting(key, defaultValue = 0) {
        if (this.game && this.game.audioSystem) {
            switch (key) {
                case 'masterVolume':
                    return this.game.audioSystem.getMasterVolume?.() ?? defaultValue;
                case 'musicVolume':
                    return this.game.audioSystem.getMusicVolume?.() ?? defaultValue;
                case 'sfxVolume':
                    return this.game.audioSystem.getSfxVolume?.() ?? defaultValue;
                case 'isMuted':
                    return this.game.audioSystem.getIsMuted?.() ?? defaultValue;
                default:
                    // Use getSettings method for other audio settings
                    const settings = this.game.audioSystem.getSettings?.() || {};
                    return settings[key] ?? defaultValue;
            }
        }
        return defaultValue;
    }

    /**
     * Handle mouse down events for slider dragging
     */
    handleMouseDown(x, y) {
        // Only handle slider interactions in audio settings tab
        if (this.currentSettingsTab !== 'audio') {
            return;
        }

        // Check if mouse is over any slider
        const sliders = [
            { setting: 'masterVolume', x: this.canvas.width / 2 + 20, y: 210, width: 200, height: 20 },
            { setting: 'musicVolume', x: this.canvas.width / 2 + 20, y: 270, width: 200, height: 20 },
            { setting: 'sfxVolume', x: this.canvas.width / 2 + 20, y: 330, width: 200, height: 20 }
        ];

        for (const slider of sliders) {
            if (x >= slider.x && x <= slider.x + slider.width &&
                y >= slider.y && y <= slider.y + slider.height) {
                
                this.draggingSlider = {
                    setting: slider.setting,
                    ...slider
                };
                
                // Update slider value immediately
                this.updateSliderValue(x);
                return;
            }
        }
    }

    /**
     * Handle mouse up events for slider dragging
     */
    handleMouseUp(x, y) {
        if (this.draggingSlider) {
            // Final update when releasing
            this.updateSliderValue(x);
            this.draggingSlider = null;
        }
    }

    /**
     * Handle mouse move events for slider dragging
     */
    handleMouseMove(x, y) {
        if (this.draggingSlider) {
            this.updateSliderValue(x);
        }
    }

    /**
     * Update slider value based on mouse position
     */
    updateSliderValue(mouseX) {
        if (!this.draggingSlider) return;

        const slider = this.draggingSlider;
        const relativeX = mouseX - slider.x;
        const value = Math.max(0, Math.min(1, relativeX / slider.width));

        // Update the audio system
        switch (slider.setting) {
            case 'masterVolume':
                this.game.audioSystem.setMasterVolume(value);
                break;
            case 'musicVolume':
                this.game.audioSystem.setMusicVolume(value);
                break;
            case 'sfxVolume':
                this.game.audioSystem.setSfxVolume(value);
                break;
        }
    }

    /**
     * Draw the completely overhauled modern settings screen
     */
    drawSettingsScreen(settingsHitAreas, hoveredSettingsButton) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear the hit areas array
        if (settingsHitAreas) {
            settingsHitAreas.length = 0;
        }
        
        ctx.save();
        
        // Animated gradient background (matches other screens)
        const time = Date.now() * 0.001;
        const bgGradient = ctx.createRadialGradient(
            width/2 + Math.sin(time * 0.5) * 60,
            height/2 + Math.cos(time * 0.3) * 40,
            0,
            width/2, height/2, Math.max(width, height) * 0.8
        );
        bgGradient.addColorStop(0, 'rgba(13, 17, 23, 0.97)');
        bgGradient.addColorStop(0.3, 'rgba(30, 41, 59, 0.98)');
        bgGradient.addColorStop(0.7, 'rgba(21, 32, 43, 0.96)');
        bgGradient.addColorStop(1, 'rgba(13, 17, 23, 0.99)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Animated particles overlay
        this.drawDifficultyParticles(ctx, width, height, time);
        
        // Glassmorphic header panel
        const headerHeight = 100;
        this.drawGlassmorphicPanel(ctx, 0, 0, width, headerHeight, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.18)');
        
        // Animated glowing title
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 38px Courier New';
        ctx.shadowColor = 'rgba(88,166,255,0.5)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#f0f6fc';
        ctx.fillText('SETTINGS', width/2, 48);
        ctx.shadowColor = 'rgba(168,85,247,0.3)';
        ctx.shadowBlur = 32;
        ctx.fillText('SETTINGS', width/2, 48);
        ctx.shadowBlur = 0;
        ctx.font = '18px Courier New';
        ctx.fillStyle = 'rgba(125,133,144,0.85)';
        ctx.fillText('Configure your game experience', width/2, 75);
        ctx.restore();
        
        // Modern tab system
        this.drawSettingsTabs(ctx, width, headerHeight + 20, settingsHitAreas);
        
        // Content area based on selected tab
        const contentStartY = headerHeight + 80;
        const contentHeight = height - contentStartY - 80;
        
        // Draw content based on current tab
        switch (this.currentSettingsTab) {
            case 'audio':
                this.drawAudioSettings(ctx, width, contentStartY, contentHeight, settingsHitAreas);
                break;
            case 'gameplay':
                this.drawGameplaySettings(ctx, width, contentStartY, contentHeight, settingsHitAreas);
                break;
            case 'graphics':
                this.drawGraphicsSettings(ctx, width, contentStartY, contentHeight, settingsHitAreas);
                break;
        }
        
        // Modern back button
        this.drawModernBackButton(ctx, width, height, settingsHitAreas, hoveredSettingsButton);
        
        ctx.restore();
    }

    /**
     * Draw modern settings tabs
     */
    drawSettingsTabs(ctx, width, y, settingsHitAreas) {
        const tabs = [
            { id: 'audio', name: 'Audio', icon: '🔊', color: '#10b981' },
            { id: 'gameplay', name: 'Gameplay', icon: '🎮', color: '#3b82f6' },
            { id: 'graphics', name: 'Graphics', icon: '🖥️', color: '#8b5cf6' }
        ];
        
        const tabWidth = 180;
        const tabHeight = 50;
        const tabSpacing = 20;
        const totalWidth = (tabs.length * tabWidth) + ((tabs.length - 1) * tabSpacing);
        const startX = (width - totalWidth) / 2;
        
        tabs.forEach((tab, index) => {
            const tabX = startX + (index * (tabWidth + tabSpacing));
            const isSelected = this.currentSettingsTab === tab.id;
            
            // Tab background with glassmorphic effect
            let bgColor, borderColor;
            if (isSelected) {
                bgColor = `${tab.color}30`;
                borderColor = tab.color;
            } else {
                bgColor = 'rgba(255,255,255,0.05)';
                borderColor = 'rgba(255,255,255,0.2)';
            }
            
            this.drawGlassmorphicPanel(ctx, tabX, y, tabWidth, tabHeight, bgColor, borderColor);
            
            // Tab icon and text with glow effect
            ctx.save();
            if (isSelected) {
                ctx.shadowColor = tab.color;
                ctx.shadowBlur = 10;
            }
            
            // Icon
            ctx.font = '20px Courier New';
            ctx.fillStyle = isSelected ? tab.color : '#8b949e';
            ctx.textAlign = 'left';
            ctx.fillText(tab.icon, tabX + 15, y + 32);
            
            // Text
            ctx.font = isSelected ? 'bold 16px Courier New' : '16px Courier New';
            ctx.fillStyle = isSelected ? '#f0f6fc' : '#8b949e';
            ctx.fillText(tab.name, tabX + 50, y + 32);
            ctx.restore();
            
            // Hit area
            settingsHitAreas.push({
                x: tabX,
                y: y,
                width: tabWidth,
                height: tabHeight,
                action: 'switchTab',
                tabId: tab.id
            });
        });
    }

    /**
     * Draw modern audio settings panel
     */
    drawAudioSettings(ctx, width, startY, height, settingsHitAreas) {
        const panelWidth = Math.min(800, width - 80);
        const panelX = (width - panelWidth) / 2;
        const panelY = startY + 20;
        const panelHeight = height - 40;
        
        // Main settings panel
        this.drawGlassmorphicPanel(ctx, panelX, panelY, panelWidth, panelHeight, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)');
        
        // Section title
        ctx.save();
        ctx.font = 'bold 24px Courier New';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.fillText('🔊 Audio Settings', panelX + 30, panelY + 40);
        ctx.shadowBlur = 0;
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Sound and music settings', panelX + 30, panelY + 65);
        ctx.restore();
        
        // Audio sliders
        const sliders = [
            { label: 'Master Volume', setting: 'masterVolume', y: panelY + 100, description: 'Overall game volume' },
            { label: 'Music Volume', setting: 'musicVolume', y: panelY + 180, description: 'Background music volume' },
            { label: 'Sound Effects', setting: 'sfxVolume', y: panelY + 260, description: 'Sound effects volume' }
        ];
        
        sliders.forEach(slider => {
            this.drawModernSlider(ctx, panelX + 30, slider.y, panelWidth - 60, slider, settingsHitAreas);
        });
        
        // Mute toggle
        const toggleY = panelY + 340;
        this.drawModernToggle(ctx, panelX + 30, toggleY, panelWidth - 60, {
            label: 'Mute When Unfocused',
            description: 'Automatically mute when window loses focus',
            setting: 'muteWhenUnfocused',
            getValue: () => this.getAudioSetting('muteWhenUnfocused', true)
        }, settingsHitAreas);
    }

    /**
     * Draw modern slider control
     */
    drawModernSlider(ctx, x, y, width, slider, settingsHitAreas) {
        const sliderHeight = 60;
        const trackHeight = 8;
        const trackY = y + 35;
        const trackWidth = width - 200;
        const trackX = x + 160;
        
        // Slider background panel
        this.drawGlassmorphicPanel(ctx, x, y, width, sliderHeight, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)');
        
        // Label and description
        ctx.save();
        ctx.font = 'bold 16px Courier New';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'left';
        ctx.fillText(slider.label, x + 15, y + 25);
        ctx.font = '12px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.fillText(slider.description, x + 15, y + 45);
        
        // Track background
        ctx.fillStyle = 'rgba(139,148,158,0.3)';
        this.drawRoundedRect(ctx, trackX, trackY, trackWidth, trackHeight, 4);
        ctx.fill();
        
        // Track fill
        const value = this.getAudioSetting(slider.setting, 0.7);
        const fillWidth = value * trackWidth;
        ctx.fillStyle = '#10b981';
        this.drawRoundedRect(ctx, trackX, trackY, fillWidth, trackHeight, 4);
        ctx.fill();
        
        // Slider handle with glow
        const handleX = trackX + fillWidth - 8;
        const handleY = trackY - 4;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#f0f6fc';
        ctx.beginPath();
        ctx.arc(handleX + 8, handleY + 8, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Value display
        ctx.font = 'bold 14px Courier New';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(value * 100)}%`, x + width - 15, y + 32);
        ctx.restore();
        
        // Hit area
        settingsHitAreas.push({
            x: trackX,
            y: trackY - 10,
            width: trackWidth,
            height: trackHeight + 20,
            action: 'slider',
            setting: slider.setting
        });
    }

    /**
     * Draw modern toggle control
     */
    drawModernToggle(ctx, x, y, width, toggle, settingsHitAreas) {
        const toggleHeight = 60;
        const switchWidth = 60;
        const switchHeight = 30;
        const switchX = x + width - switchWidth - 15;
        const switchY = y + 15;
        
        // Toggle background panel
        this.drawGlassmorphicPanel(ctx, x, y, width, toggleHeight, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)');
        
        // Label and description
        ctx.save();
        ctx.font = 'bold 16px Courier New';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'left';
        ctx.fillText(toggle.label, x + 15, y + 25);
        ctx.font = '12px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.fillText(toggle.description, x + 15, y + 45);
        
        // Toggle switch
        const isOn = toggle.getValue();
        const switchColor = isOn ? '#10b981' : '#6e7681';
        const handleOffset = isOn ? switchWidth - 25 : 5;
        
        // Switch track
        ctx.fillStyle = switchColor;
        this.drawRoundedRect(ctx, switchX, switchY, switchWidth, switchHeight, 15);
        ctx.fill();
        
        // Switch handle with glow
        if (isOn) {
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 8;
        }
        ctx.fillStyle = '#f0f6fc';
        ctx.beginPath();
        ctx.arc(switchX + handleOffset + 10, switchY + 15, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        
        // Hit area
        settingsHitAreas.push({
            x: switchX,
            y: switchY,
            width: switchWidth,
            height: switchHeight,
            action: 'toggle',
            setting: toggle.setting
        });
    }

    /**
     * Draw gameplay settings panel
     */
    drawGameplaySettings(ctx, width, startY, height, settingsHitAreas) {
        const panelWidth = Math.min(800, width - 80);
        const panelX = (width - panelWidth) / 2;
        const panelY = startY + 20;
        const panelHeight = height - 40;
        
        // Main settings panel
        this.drawGlassmorphicPanel(ctx, panelX, panelY, panelWidth, panelHeight, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)');
        
        // Section title
        ctx.save();
        ctx.font = 'bold 24px Courier New';
        ctx.fillStyle = '#3b82f6';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 8;
        ctx.fillText('🎮 Gameplay Settings', panelX + 30, panelY + 40);
        ctx.shadowBlur = 0;
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Game behavior and difficulty settings', panelX + 30, panelY + 65);
        ctx.restore();
        
        // Gameplay toggles
        const toggles = [
            {
                label: 'Show FPS Counter',
                description: 'Display frames per second in corner',
                setting: 'showFpsCounter',
                getValue: () => this.getGeneralSetting('showFpsCounter', false)
            },
            {
                label: 'Auto-Pause on Focus Loss',
                description: 'Automatically pause when window loses focus',
                setting: 'autoPauseOnFocusLoss',
                getValue: () => this.getGeneralSetting('autoPauseOnFocusLoss', true)
            },
            {
                label: 'Enable Opening Animation',
                description: 'Show animated intro when starting game',
                setting: 'enableOpeningAnimation',
                getValue: () => this.getGeneralSetting('enableOpeningAnimation', true)
            }
        ];
        
        toggles.forEach((toggle, index) => {
            const toggleY = panelY + 100 + (index * 80);
            this.drawModernToggle(ctx, panelX + 30, toggleY, panelWidth - 60, toggle, settingsHitAreas);
        });
    }

    /**
     * Draw graphics settings panel
     */
    drawGraphicsSettings(ctx, width, startY, height, settingsHitAreas) {
        const panelWidth = Math.min(800, width - 80);
        const panelX = (width - panelWidth) / 2;
        const panelY = startY + 20;
        const panelHeight = height - 40;
        
        // Main settings panel
        this.drawGlassmorphicPanel(ctx, panelX, panelY, panelWidth, panelHeight, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)');
        
        // Section title
        ctx.save();
        ctx.font = 'bold 24px Courier New';
        ctx.fillStyle = '#8b5cf6';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 8;
        ctx.fillText('🖥️ Graphics Settings', panelX + 30, panelY + 40);
        ctx.shadowBlur = 0;
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Visual quality and performance settings', panelX + 30, panelY + 65);
        ctx.restore();
        
        // Graphics quality selector
        this.drawQualitySelector(ctx, panelX + 30, panelY + 100, panelWidth - 60, settingsHitAreas);
        
        // Graphics toggles
        const toggles = [
            {
                label: 'Enable Particle Effects',
                description: 'Show animated background particles',
                setting: 'enableParticles',
                getValue: () => this.getGeneralSetting('enableParticles', true)
            },
            {
                label: 'Enable Screen Shake',
                description: 'Screen shake effects on impacts',
                setting: 'enableScreenShake',
                getValue: () => this.getGeneralSetting('enableScreenShake', true)
            }
        ];
        
        toggles.forEach((toggle, index) => {
            const toggleY = panelY + 220 + (index * 80);
            this.drawModernToggle(ctx, panelX + 30, toggleY, panelWidth - 60, toggle, settingsHitAreas);
        });
    }

    /**
     * Draw graphics quality selector
     */
    drawQualitySelector(ctx, x, y, width, settingsHitAreas) {
        const selectorHeight = 80;
        
        // Background panel
        this.drawGlassmorphicPanel(ctx, x, y, width, selectorHeight, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)');
        
        // Label
        ctx.save();
        ctx.font = 'bold 16px Courier New';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'left';
        ctx.fillText('Graphics Quality', x + 15, y + 25);
        ctx.font = '12px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Higher quality may impact performance', x + 15, y + 45);
        
        // Quality options
        const qualities = ['Low', 'Medium', 'High', 'Ultra'];
        const currentQuality = this.getGeneralSetting('graphicsQuality', 'Medium');
        const optionWidth = 80;
        const optionHeight = 30;
        const optionSpacing = 10;
        const optionsStartX = x + width - (qualities.length * optionWidth) - ((qualities.length - 1) * optionSpacing) - 15;
        
        qualities.forEach((quality, index) => {
            const optionX = optionsStartX + (index * (optionWidth + optionSpacing));
            const optionY = y + 25;
            const isSelected = currentQuality === quality;
            
            // Option background
            const bgColor = isSelected ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)';
            const borderColor = isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.2)';
            
            this.drawGlassmorphicPanel(ctx, optionX, optionY, optionWidth, optionHeight, bgColor, borderColor);
            
            // Option text
            ctx.font = isSelected ? 'bold 14px Courier New' : '14px Courier New';
            ctx.fillStyle = isSelected ? '#8b5cf6' : '#8b949e';
            ctx.textAlign = 'center';
            ctx.fillText(quality, optionX + optionWidth/2, optionY + 20);
            
            // Hit area
            settingsHitAreas.push({
                x: optionX,
                y: optionY,
                width: optionWidth,
                height: optionHeight,
                action: 'setQuality',
                quality: quality
            });
        });
        ctx.restore();
    }

    /**
     * Draw modern back button
     */
    drawModernBackButton(ctx, width, height, settingsHitAreas, hoveredSettingsButton) {
        const buttonWidth = 120;
        const buttonHeight = 45;
        const buttonX = 40;
        const buttonY = height - 60;
        const isHovered = hoveredSettingsButton?.action === 'back';
        
        // Button background with hover effect
        const bgColor = isHovered ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)';
        const borderColor = isHovered ? '#ef4444' : 'rgba(255,255,255,0.2)';
        
        this.drawGlassmorphicPanel(ctx, buttonX, buttonY, buttonWidth, buttonHeight, bgColor, borderColor);
        
        // Button content with glow on hover
        ctx.save();
        if (isHovered) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
        }
        
        // Icon
        ctx.font = '18px Courier New';
        ctx.fillStyle = isHovered ? '#ef4444' : '#8b949e';
        ctx.textAlign = 'left';
        ctx.fillText('⬅️', buttonX + 15, buttonY + 28);
        
        // Text
        ctx.font = 'bold 14px Courier New';
        ctx.fillStyle = isHovered ? '#f0f6fc' : '#8b949e';
        ctx.fillText('Back', buttonX + 45, buttonY + 28);
        ctx.restore();
        
        // Hit area
        settingsHitAreas.push({
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            action: 'back'
        });
    }

    /**
     * Handle clicks in settings screen
     */
    handleSettingsClick(x, y) {
        const settingsHitAreas = this.game.settingsHitAreas || [];
        
        for (const area of settingsHitAreas) {
            if (x >= area.x && x <= area.x + area.width &&
                y >= area.y && y <= area.y + area.height) {
                
                if (area.action === 'switchTab') {
                    // Switch to different settings tab
                    this.currentSettingsTab = area.tabId;
                    return true;
                } else if (area.action === 'toggleMute') {
                    // Toggle mute state
                    if (this.game.audioSystem) {
                        const currentMute = this.game.audioSystem.getIsMuted?.() ?? false;
                        this.game.audioSystem.setMuted(!currentMute);
                    }
                    return true;
                } else if (area.action === 'toggle') {
                    // Handle toggle switches (e.g., mute when unfocused, show FPS, etc.)
                    this.handleToggleSetting(area.setting);
                    return true;
                } else if (area.action === 'setQuality') {
                    // Set graphics quality
                    if (window.generalSettings) {
                        window.generalSettings.setGraphicsQuality(area.quality);
                    }
                    return true;
                } else if (area.action === 'back') {
                    // Go back to previous state
                    this.game.gameState = this.game.previousGameState || GAME_STATES.HOME;
                    return true;
                } else if (area.action === 'slider') {
                    // Start dragging slider
                    this.draggingSlider = {
                        setting: area.setting,
                        x: area.x,
                        y: area.y,
                        width: area.width,
                        height: area.height
                    };
                    
                    // Update slider value immediately
                    this.updateSliderValue(x);
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Handle toggle setting changes
     */
    handleToggleSetting(setting) {
        switch (setting) {
            case 'muteWhenUnfocused':
                if (this.game.audioSystem) {
                    const current = this.game.audioSystem.getMuteWhenUnfocused?.() ?? true;
                    this.game.audioSystem.setMuteWhenUnfocused?.(!current);
                }
                break;
            case 'showFpsCounter':
                if (window.generalSettings) {
                    const current = window.generalSettings.isShowFpsCounterEnabled();
                    window.generalSettings.setShowFpsCounter(!current);
                }
                break;
            case 'autoPauseOnFocusLoss':
                if (window.generalSettings) {
                    const current = window.generalSettings.getAutoPauseOnFocusLoss?.() ?? true;
                    window.generalSettings.setAutoPauseOnFocusLoss?.(!current);
                }
                break;
            case 'enableOpeningAnimation':
                if (window.generalSettings) {
                    const current = window.generalSettings.isOpeningAnimationEnabled();
                    window.generalSettings.setOpeningAnimation(!current);
                }
                break;
            case 'enableParticles':
                if (window.generalSettings) {
                    const current = window.generalSettings.getEnableParticles?.() ?? true;
                    window.generalSettings.setEnableParticles?.(!current);
                }
                break;
            case 'enableScreenShake':
                if (window.generalSettings) {
                    const current = window.generalSettings.getEnableScreenShake?.() ?? true;
                    window.generalSettings.setEnableScreenShake?.(!current);
                }
                break;
        }
    }



    /**
     * Draw the options menu
     */
    drawOptionsMenu(optionsHitAreas, hoveredOptionsButton) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear the hit areas array
        if (optionsHitAreas) {
            optionsHitAreas.length = 0;
        }
        
        ctx.save();
        
        // Background
        ctx.fillStyle = 'rgba(13, 17, 23, 0.95)';
        ctx.fillRect(0, 0, width, height);
        
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Options', width / 2, 60);
        
        // Menu buttons
        const buttons = [
            { text: 'Tutorial', action: 'tutorial', y: 150 },
            { text: 'Achievements', action: 'achievements', y: 210 },
            { text: 'Settings', action: 'settings', y: 270 },
            { text: 'Credits', action: 'credits', y: 330 },
            { text: 'Back', action: 'back', y: 390 }
        ];
        
        buttons.forEach((button, index) => {
            const buttonWidth = 200;
            const buttonHeight = 40;
            const buttonX = width / 2 - buttonWidth / 2;
            const isHovered = hoveredOptionsButton === index;
            
            // Button background
            ctx.fillStyle = isHovered ? '#555555' : '#333333';
            ctx.fillRect(buttonX, button.y, buttonWidth, buttonHeight);
            
            // Button text
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(button.text, width / 2, button.y + 25);
            
            // Add hit area
            if (optionsHitAreas) {
                optionsHitAreas.push({
                    x: buttonX,
                    y: button.y,
                    width: buttonWidth,
                    height: buttonHeight,
                    action: button.action
                });
            }
        });
        
        ctx.restore();
    }

    /**
     * Draw the credits screen
     */
    drawCreditsScreen(creditsHitAreas) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear the hit areas array
        if (creditsHitAreas) {
            creditsHitAreas.length = 0;
        }
        
        ctx.save();
        
        // Background
        ctx.fillStyle = 'rgba(13, 17, 23, 0.95)';
        ctx.fillRect(0, 0, width, height);
        
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Credits', width / 2, 60);
        
        // Credits content
        ctx.fillStyle = '#cccccc';
        ctx.font = '18px Arial';
        ctx.fillText('CodeRunner Game', width / 2, 150);
        ctx.fillText('Developed with JavaScript and HTML5 Canvas', width / 2, 180);
        ctx.fillText('Audio system powered by Web Audio API', width / 2, 210);
        
        // Back button
        const backButtonX = 50;
        const backButtonY = height - 80;
        const backButtonWidth = 100;
        const backButtonHeight = 40;
        
        ctx.fillStyle = '#333333';
        ctx.fillRect(backButtonX, backButtonY, backButtonWidth, backButtonHeight);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Back', backButtonX + backButtonWidth / 2, backButtonY + 25);
        
        // Add hit area for back button
        if (creditsHitAreas) {
            creditsHitAreas.push({
                x: backButtonX,
                y: backButtonY,
                width: backButtonWidth,
                height: backButtonHeight,
                action: 'back'
            });
        }
        
        ctx.restore();
    }

    // Achievement screen rendering is now handled by AchievementSystem.js
    // Legacy drawAchievementsScreen method removed - see AchievementSystem.drawAchievementsScreen()

    /**
     * Draw post animation popup
     */
    drawPostAnimationPopup() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        ctx.save();
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
        ctx.fillRect(0, 0, width, height);
        
        // Popup content
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Welcome to CodeRunner!', width / 2, height / 2 - 50);
        
        ctx.fillStyle = '#cccccc';
        ctx.font = '18px Arial';
        ctx.fillText('Click anywhere to continue', width / 2, height / 2 + 50);
        
        ctx.restore();
    }
    
    /**
     * Helper method to draw hexagon shapes for background pattern
     */
    drawHexagon(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hexX = x + size * Math.cos(angle);
            const hexY = y + size * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(hexX, hexY);
            } else {
                ctx.lineTo(hexX, hexY);
            }
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    // Legacy drawAchievementsList method removed - achievement rendering now handled by AchievementSystem.js
}
