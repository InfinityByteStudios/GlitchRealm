/**
 * Options System for CodeRunner
 * Modern, animated options menu with submenu navigation
 */

export class OptionsSystem {
    constructor(gameInstance = null) {
        this.gameInstance = gameInstance;
        
        // Animation state
        this.animationTime = 0;
        this.slideInProgress = 0;
        this.buttonsAnimationProgress = 0;
        this.lastFrameTime = Date.now();
        
        // UI state
        this.hoveredButton = -1;
        this.selectedButton = -1;
        this.transitionState = 'idle';
        
        // Particle system for subtle background effects
        this.particleSystem = [];
        this.initializeParticleSystem();
        
        // Option menu items
        this.menuOptions = [
            { 
                text: 'Tutorial', 
                action: 'tutorial', 
                icon: '📚', 
                color: '#f59e0b',
                description: 'Learn the game basics and controls'
            },
            { 
                text: 'Achievements', 
                action: 'achievements', 
                icon: '🏆', 
                color: '#8b5cf6',
                description: 'View your progress and unlocks'
            },
            { 
                text: 'Leaderboard', 
                action: 'leaderboard', 
                icon: '🏅', 
                color: '#f97316',
                description: 'View top scores and rankings'
            },
            { 
                text: 'Shop', 
                action: 'shop', 
                icon: '🛒', 
                color: '#10b981',
                description: 'Upgrade your abilities and buy cosmetics'
            },
            { 
                text: 'Character', 
                action: 'character', 
                icon: '👤', 
                color: '#06b6d4',
                description: 'Customize your character appearance'
            },
            { 
                text: 'Settings', 
                action: 'settings', 
                icon: '🔧', 
                color: '#ef4444',
                description: 'Audio, graphics, and controls'
            },
            { 
                text: 'Feedback', 
                action: 'feedback', 
                icon: '📝', 
                color: '#3b82f6',
                description: 'Send feedback and suggestions'
            },
            { 
                text: 'Back to Main Menu', 
                action: 'back', 
                icon: '🏠', 
                color: '#6b7280',
                description: 'Return to the main menu'
            }
        ];
    }
    
    /**
     * Initialize subtle particle system for options background
     */
    initializeParticleSystem() {
        this.particleSystem = [];
        
        // Create floating geometric particles
        for (let i = 0; i < 15; i++) {
            this.particleSystem.push({
                x: Math.random() * 1920,
                y: Math.random() * 1080,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.2 + 0.05,
                shape: Math.floor(Math.random() * 3), // 0: circle, 1: square, 2: triangle
                rotationSpeed: (Math.random() - 0.5) * 0.01,
                rotation: Math.random() * Math.PI * 2,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }
    
    /**
     * Update animation state
     */
    update() {
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Update animation time
        this.animationTime += deltaTime * 0.001;
        
        // Update slide-in animation
        if (this.slideInProgress < 1) {
            this.slideInProgress = Math.min(1, this.slideInProgress + deltaTime * 0.003);
        }
        
        // Update buttons animation with stagger
        if (this.buttonsAnimationProgress < 1) {
            this.buttonsAnimationProgress = Math.min(1, this.buttonsAnimationProgress + deltaTime * 0.002);
        }
        
        // Update particle system
        this.updateParticleSystem();
    }
    
    /**
     * Update particle positions and properties
     */
    updateParticleSystem() {
        this.particleSystem.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.rotationSpeed;
            particle.pulsePhase += 0.02;
            
            // Wrap around screen edges
            if (particle.x < -10) particle.x = 1930;
            if (particle.x > 1930) particle.x = -10;
            if (particle.y < -10) particle.y = 1090;
            if (particle.y > 1090) particle.y = -10;
        });
    }
    
    /**
     * Render the complete options menu
     */
    render(ctx, width, height) {
        this.update();
        
        // Clear canvas with gradient background
        this.drawBackground(ctx, width, height);
        
        // Draw particle system
        this.drawParticleSystem(ctx, width, height);
        
        // Draw animated title
        this.drawAnimatedTitle(ctx, width, height);
        
        // Draw menu buttons with animations
        const hitAreas = this.drawMenuButtons(ctx, width, height);
        
        return hitAreas;
    }
    
    /**
     * Draw sophisticated gradient background
     */
    drawBackground(ctx, width, height) {
        const time = this.animationTime;
        
        // Multiple gradient layers for depth
        const gradient1 = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
        gradient1.addColorStop(0, `rgba(15, 23, 42, ${0.95 + Math.sin(time * 0.5) * 0.05})`);
        gradient1.addColorStop(0.5, `rgba(30, 41, 59, ${0.9 + Math.cos(time * 0.3) * 0.1})`);
        gradient1.addColorStop(1, `rgba(51, 65, 85, ${0.85 + Math.sin(time * 0.2) * 0.15})`);
        
        ctx.fillStyle = gradient1;
        ctx.fillRect(0, 0, width, height);
        
        // Subtle animated overlay
        const overlayGradient = ctx.createLinearGradient(0, 0, width, height);
        overlayGradient.addColorStop(0, `rgba(59, 130, 246, ${0.05 + Math.sin(time * 0.4) * 0.03})`);
        overlayGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.02)');
        overlayGradient.addColorStop(1, `rgba(16, 185, 129, ${0.05 + Math.cos(time * 0.6) * 0.03})`);
        
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, 0, width, height);
    }
    
    /**
     * Draw particle system
     */
    drawParticleSystem(ctx, width, height) {
        this.particleSystem.forEach(particle => {
            ctx.save();
            
            const pulseOpacity = particle.opacity + Math.sin(particle.pulsePhase) * 0.05;
            ctx.globalAlpha = pulseOpacity;
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            
            const size = particle.size * 8;
            
            if (particle.shape === 0) {
                // Circle
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
                ctx.fill();
            } else if (particle.shape === 1) {
                // Square
                ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
                ctx.fillRect(-size/2, -size/2, size, size);
            } else {
                // Triangle
                ctx.beginPath();
                ctx.moveTo(0, -size/2);
                ctx.lineTo(-size/2, size/2);
                ctx.lineTo(size/2, size/2);
                ctx.closePath();
                ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
                ctx.fill();
            }
            
            ctx.restore();
        });
    }
    
    /**
     * Draw animated title
     */
    drawAnimatedTitle(ctx, width, height) {
        const slideProgress = this.slideInProgress;
        const time = this.animationTime;
        
        ctx.save();
        
        // Title position with slide animation - more compact
        const titleY = 60 + (1 - slideProgress) * -50;
        
        ctx.globalAlpha = slideProgress;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Animated shadow
        ctx.shadowColor = `rgba(59, 130, 246, ${0.6 + Math.sin(time * 2) * 0.2})`;
        ctx.shadowBlur = 15 + Math.sin(time * 1.5) * 5;
        ctx.shadowOffsetY = 3;
        
        // Main title (slightly smaller)
        ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Options', width / 2, titleY);
        
        // Subtitle (slightly smaller)
        ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
        ctx.shadowBlur = 8;
        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('Configure your gaming experience', width / 2, titleY + 35);
        
        ctx.restore();
    }
    
    /**
     * Draw animated menu buttons with compact grid layout
     */
    drawMenuButtons(ctx, width, height) {
        const hitAreas = [];
        const buttonsProgress = this.buttonsAnimationProgress;
        
        // Separate buttons into main actions and utility actions
        const mainButtons = this.menuOptions.slice(0, 6); // Tutorial, Achievements, Leaderboard, Shop, Character, Settings
        const utilityButtons = this.menuOptions.slice(6); // Feedback, Back
        
        // Draw main buttons in a 2x3 grid - compact layout
        const buttonWidth = 280;
        const buttonHeight = 70;
        const buttonSpacing = 20;
        const cols = 2;
        const rows = Math.ceil(mainButtons.length / cols);
        
        const gridWidth = cols * buttonWidth + (cols - 1) * buttonSpacing;
        const gridHeight = rows * buttonHeight + (rows - 1) * buttonSpacing;
        const startX = (width - gridWidth) / 2;
        const startY = height / 2 - 120; // Move grid higher up
        
        // Draw main buttons in grid
        mainButtons.forEach((option, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const staggerDelay = index * 0.1;
            const buttonProgress = Math.max(0, Math.min(1, (buttonsProgress - staggerDelay) / (1 - staggerDelay)));
            
            if (buttonProgress <= 0) return;
            
            const buttonX = startX + col * (buttonWidth + buttonSpacing);
            const buttonY = startY + row * (buttonHeight + buttonSpacing);
            
            const slideX = (1 - buttonProgress) * -100;
            const finalX = buttonX + slideX;
            
            const isHovered = this.hoveredButton === index;
            const hoverScale = isHovered ? 1.03 : 1;
            
            ctx.save();
            ctx.globalAlpha = buttonProgress;
            
            // Transform for hover effect
            ctx.translate(buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
            ctx.scale(hoverScale, hoverScale);
            ctx.translate(-(buttonX + buttonWidth / 2), -(buttonY + buttonHeight / 2));
            
            // Button glow effect
            if (isHovered) {
                ctx.shadowColor = option.color;
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
            
            // Button background
            const gradient = ctx.createLinearGradient(finalX, buttonY, finalX, buttonY + buttonHeight);
            gradient.addColorStop(0, isHovered ? 'rgba(71, 85, 105, 0.9)' : 'rgba(51, 65, 85, 0.8)');
            gradient.addColorStop(1, isHovered ? 'rgba(51, 65, 85, 0.9)' : 'rgba(30, 41, 59, 0.8)');
            
            ctx.fillStyle = gradient;
            this.drawRoundedRect(ctx, finalX, buttonY, buttonWidth, buttonHeight, 8);
            
            // Button border
            ctx.strokeStyle = isHovered ? option.color : 'rgba(100, 116, 139, 0.5)';
            ctx.lineWidth = isHovered ? 2 : 1;
            this.strokeRoundedRect(ctx, finalX, buttonY, buttonWidth, buttonHeight, 8);
            
            // Icon (medium size)
            ctx.font = '24px Arial';
            ctx.fillStyle = option.color;
            ctx.textAlign = 'left';
            ctx.fillText(option.icon, finalX + 18, buttonY + 45);
            
            // Button text (medium size)
            ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(option.text, finalX + 55, buttonY + 45);
            
            ctx.restore();
            
            // Add hit area
            hitAreas.push({
                x: finalX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                action: option.action
            });
        });
        
        // Draw utility buttons at the bottom in a single row - compact size
        const utilityButtonWidth = 240;
        const utilityButtonHeight = 60;
        const utilitySpacing = 40;
        const utilityStartX = (width - (utilityButtons.length * utilityButtonWidth + (utilityButtons.length - 1) * utilitySpacing)) / 2;
        const utilityY = startY + gridHeight + 40;
        
        utilityButtons.forEach((option, utilIndex) => {
            const mainIndex = mainButtons.length + utilIndex;
            const staggerDelay = mainIndex * 0.1;
            const buttonProgress = Math.max(0, Math.min(1, (buttonsProgress - staggerDelay) / (1 - staggerDelay)));
            
            if (buttonProgress <= 0) return;
            
            const buttonX = utilityStartX + utilIndex * (utilityButtonWidth + utilitySpacing);
            const slideX = (1 - buttonProgress) * -100;
            const finalX = buttonX + slideX;
            
            const isHovered = this.hoveredButton === mainIndex;
            const hoverScale = isHovered ? 1.03 : 1;
            
            ctx.save();
            ctx.globalAlpha = buttonProgress;
            
            // Transform for hover effect
            ctx.translate(buttonX + utilityButtonWidth / 2, utilityY + utilityButtonHeight / 2);
            ctx.scale(hoverScale, hoverScale);
            ctx.translate(-(buttonX + utilityButtonWidth / 2), -(utilityY + utilityButtonHeight / 2));
            
            // Button glow effect
            if (isHovered) {
                ctx.shadowColor = option.color;
                ctx.shadowBlur = 12;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
            
            // Button background
            const gradient = ctx.createLinearGradient(finalX, utilityY, finalX, utilityY + utilityButtonHeight);
            gradient.addColorStop(0, isHovered ? 'rgba(71, 85, 105, 0.9)' : 'rgba(51, 65, 85, 0.7)');
            gradient.addColorStop(1, isHovered ? 'rgba(51, 65, 85, 0.9)' : 'rgba(30, 41, 59, 0.7)');
            
            ctx.fillStyle = gradient;
            this.drawRoundedRect(ctx, finalX, utilityY, utilityButtonWidth, utilityButtonHeight, 8);
            
            // Button border
            ctx.strokeStyle = isHovered ? option.color : 'rgba(100, 116, 139, 0.4)';
            ctx.lineWidth = isHovered ? 2 : 1;
            this.strokeRoundedRect(ctx, finalX, utilityY, utilityButtonWidth, utilityButtonHeight, 8);
            
            // Icon (proportional to button size)
            ctx.font = '22px Arial';
            ctx.fillStyle = option.color;
            ctx.textAlign = 'left';
            ctx.fillText(option.icon, finalX + 18, utilityY + 38);
            
            // Button text (proportional to button size)
            ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(option.text, finalX + 50, utilityY + 38);
            
            ctx.restore();
            
            // Add hit area
            hitAreas.push({
                x: finalX,
                y: utilityY,
                width: utilityButtonWidth,
                height: utilityButtonHeight,
                action: option.action
            });
        });
        
        return hitAreas;
    }
    
    /**
     * Handle mouse movement for hover effects
     */
    handleMouseMove(x, y, hitAreas) {
        let newHoveredButton = -1;
        
        for (let i = 0; i < hitAreas.length; i++) {
            const area = hitAreas[i];
            if (x >= area.x && x <= area.x + area.width && 
                y >= area.y && y <= area.y + area.height) {
                newHoveredButton = i;
                break;
            }
        }
        
        // Play hover sound if button changed
        if (newHoveredButton !== this.hoveredButton && newHoveredButton !== -1) {
            if (this.gameInstance?.audioSystem) {
                this.gameInstance.audioSystem.onMenuHover();
            }
        }
        
        this.hoveredButton = newHoveredButton;
    }
    
    /**
     * Handle mouse clicks
     */
    handleClick(x, y, hitAreas) {
        for (let i = 0; i < hitAreas.length; i++) {
            const area = hitAreas[i];
            if (x >= area.x && x <= area.x + area.width && 
                y >= area.y && y <= area.y + area.height) {
                
                // Play click sound
                if (this.gameInstance?.audioSystem) {
                    this.gameInstance.audioSystem.onMenuClick();
                }
                
                return area.action;
            }
        }
        return null;
    }
    
    /**
     * Reset animations (for when entering options menu)
     */
    resetAnimations() {
        this.animationTime = 0;
        this.slideInProgress = 0;
        this.buttonsAnimationProgress = 0;
        this.hoveredButton = -1;
        this.selectedButton = -1;
        this.lastFrameTime = Date.now();
    }
    
    /**
     * Helper: Draw rounded rectangle
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
        ctx.fill();
    }
    
    /**
     * Helper: Stroke rounded rectangle
     */
    strokeRoundedRect(ctx, x, y, width, height, radius) {
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
        ctx.stroke();
    }
}
