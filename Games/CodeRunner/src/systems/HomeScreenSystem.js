/**
 * Home Screen System for CodeRunner
 * Creates a stunning, modern home screen with advanced animations and visual effects
 */

export class HomeScreenSystem {
    constructor(gameInstance = null) {
        this.gameInstance = gameInstance;
        
        // Animation state
        this.animationTime = 0;
        this.titleAnimationProgress = 0;
        this.buttonsAnimationProgress = 0;
        this.particleSystem = [];
        this.lastFrameTime = Date.now();
        
        // UI state
        this.hoveredButton = -1;
        this.selectedButton = -1;
        this.transitionState = 'idle'; // 'idle', 'transitioning_out', 'transitioning_in'
        
        // Initialize particle system
        this.initializeParticleSystem();
        
        // Button configuration - Clean main menu with only essential options
        this.menuButtons = [
            { 
                text: 'Play', 
                action: 'play', 
                icon: '▶️', 
                color: '#22c55e',
                description: 'Start your coding journey'
            },
            { 
                text: 'Profile', 
                action: 'profile', 
                icon: '👤', 
                color: '#8b5cf6',
                description: 'View stats and manage account'
            },
            { 
                text: 'Options', 
                action: 'options', 
                icon: '⚙️', 
                color: '#3b82f6',
                description: 'Game settings and features'
            },
            { 
                text: 'Credits', 
                action: 'credits', 
                icon: '🎬', 
                color: '#06b6d4',
                description: 'Meet the team'
            }
        ];
    }
    
    /**
     * Initialize the particle system for background effects
     */
    initializeParticleSystem() {
        this.particleSystem = [];
        
        // Create floating code particles
        for (let i = 0; i < 25; i++) {
            this.particleSystem.push({
                x: Math.random() * 1920,
                y: Math.random() * 1080,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.3 + 0.1,
                char: this.getRandomCodeChar(),
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                rotation: Math.random() * Math.PI * 2,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }
    
    /**
     * Get a random code character for particles
     */
    getRandomCodeChar() {
        const codeChars = [
            '{', '}', '[', ']', '(', ')', '<', '>',
            '=', '+', '-', '*', '/', '%', '&', '|',
            ';', ':', '.', ',', '!', '?', '@', '#',
            'function', 'class', 'const', 'let', 'var',
            'if', 'else', 'for', 'while', 'return'
        ];
        return codeChars[Math.floor(Math.random() * codeChars.length)];
    }
    
    /**
     * Update animations and particle system
     */
    update(deltaTime) {
        this.animationTime += deltaTime * 0.001; // Convert to seconds
        
        // Update title animation
        this.titleAnimationProgress = Math.min(1, this.titleAnimationProgress + deltaTime * 0.002);
        
        // Update buttons animation (delayed)
        if (this.titleAnimationProgress > 0.5) {
            this.buttonsAnimationProgress = Math.min(1, this.buttonsAnimationProgress + deltaTime * 0.003);
        }
        
        // Update particle system
        this.updateParticles(deltaTime);
    }
    
    /**
     * Update particle system
     */
    updateParticles(deltaTime) {
        this.particleSystem.forEach(particle => {
            // Update position
            particle.x += particle.vx * deltaTime * 0.1;
            particle.y += particle.vy * deltaTime * 0.1;
            
            // Update rotation
            particle.rotation += particle.rotationSpeed * deltaTime * 0.1;
            
            // Wrap around screen
            if (particle.x < -50) particle.x = 1970;
            if (particle.x > 1970) particle.x = -50;
            if (particle.y < -50) particle.y = 1130;
            if (particle.y > 1130) particle.y = -50;
            
            // Update pulse phase
            particle.pulsePhase += deltaTime * 0.001;
        });
    }
    
    /**
     * Render the home screen with stunning visual effects
     */
    render(ctx, width, height, hitAreas = []) {
        // Clear hit areas
        hitAreas.length = 0;
        
        // Update animations
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        this.update(deltaTime);
        
        ctx.save();
        
        // Draw animated background
        this.drawAnimatedBackground(ctx, width, height);
        
        // Draw particle system
        this.drawParticleSystem(ctx, width, height);
        
        // Draw animated title
        this.drawAnimatedTitle(ctx, width, height);
        
        // Draw animated menu buttons
        this.drawAnimatedMenuButtons(ctx, width, height, hitAreas);
        
        // Draw version info
        this.drawVersionInfo(ctx, width, height);
        
        // Draw footer info
        this.drawFooterInfo(ctx, width, height);
        
        ctx.restore();
    }
    
    /**
     * Draw animated background with multiple layers
     */
    drawAnimatedBackground(ctx, width, height) {
        // Deep space gradient background
        const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        bgGradient.addColorStop(0, 'rgba(15, 20, 25, 0.98)');
        bgGradient.addColorStop(0.3, 'rgba(21, 32, 43, 0.96)');
        bgGradient.addColorStop(0.7, 'rgba(13, 17, 23, 0.98)');
        bgGradient.addColorStop(1, 'rgba(8, 12, 16, 0.99)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Animated neural network grid
        const time = this.animationTime;
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const gridSpacing = 100;
        for (let x = 0; x < width; x += gridSpacing) {
            const offsetY = Math.sin(time * 0.5 + x * 0.01) * 20;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y < height; y += gridSpacing) {
            const offsetX = Math.cos(time * 0.3 + y * 0.01) * 15;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Animated energy waves
        for (let i = 0; i < 3; i++) {
            const waveTime = time + i * 2;
            const waveY = height/2 + Math.sin(waveTime * 0.5) * 100;
            
            ctx.strokeStyle = `rgba(88, 166, 255, ${0.05 + Math.sin(waveTime) * 0.03})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let x = 0; x <= width; x += 5) {
                const y = waveY + Math.sin(waveTime + x * 0.01) * 30;
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
    }
    
    /**
     * Draw floating particle system
     */
    drawParticleSystem(ctx, width, height) {
        this.particleSystem.forEach(particle => {
            ctx.save();
            
            // Calculate pulsing opacity
            const pulseOpacity = particle.opacity + Math.sin(particle.pulsePhase) * 0.1;
            
            ctx.globalAlpha = pulseOpacity;
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            
            // Draw particle
            if (particle.char.length === 1) {
                // Single character
                ctx.font = `${particle.size * 12}px "Consolas", "Monaco", monospace`;
                ctx.fillStyle = 'rgba(121, 192, 255, 0.6)';
                ctx.textAlign = 'center';
                ctx.fillText(particle.char, 0, 0);
            } else {
                // Code keyword
                ctx.font = `${particle.size * 8}px "Consolas", "Monaco", monospace`;
                ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
                ctx.textAlign = 'center';
                ctx.fillText(particle.char, 0, 0);
            }
            
            ctx.restore();
        });
    }
    
    /**
     * Draw animated title with spectacular effects
     */
    drawAnimatedTitle(ctx, width, height) {
        const progress = this.titleAnimationProgress;
        const time = this.animationTime;
        
        // Title positioning
        const titleY = 120 + (1 - progress) * 50; // Slide down effect
        
        ctx.save();
        ctx.globalAlpha = progress;
        
        // Main title with multiple shadow layers
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Shadow layers for depth
        const shadowLayers = [
            { offset: 8, blur: 20, color: 'rgba(88, 166, 255, 0.8)' },
            { offset: 4, blur: 10, color: 'rgba(121, 192, 255, 0.6)' },
            { offset: 2, blur: 5, color: 'rgba(165, 243, 252, 0.4)' }
        ];
        
        shadowLayers.forEach(layer => {
            ctx.shadowColor = layer.color;
            ctx.shadowBlur = layer.blur;
            ctx.shadowOffsetX = layer.offset;
            ctx.shadowOffsetY = layer.offset;
            
            ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = 'rgba(240, 246, 252, 0.1)';
            ctx.fillText('CodeRunner', width / 2, titleY);
        });
        
        // Main title text with gradient
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        const titleGradient = ctx.createLinearGradient(width/2 - 200, 0, width/2 + 200, 0);
        titleGradient.addColorStop(0, '#f0f6fc');
        titleGradient.addColorStop(0.3, '#58A6FF');
        titleGradient.addColorStop(0.7, '#79C0FF');
        titleGradient.addColorStop(1, '#f0f6fc');
        
        ctx.fillStyle = titleGradient;
        ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
        ctx.fillText('CodeRunner', width / 2, titleY);
        
        // Animated subtitle
        const subtitleY = titleY + 60;
        const subtitleAlpha = Math.max(0, progress - 0.3) / 0.7;
        
        ctx.globalAlpha = subtitleAlpha;
        ctx.font = '18px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Run, jump, and code your way to victory', width / 2, subtitleY);
        
        // Animated underline
        if (progress > 0.7) {
            const lineProgress = (progress - 0.7) / 0.3;
            const lineWidth = 300 * lineProgress;
            const lineX = width / 2 - lineWidth / 2;
            const lineY = subtitleY + 20;
            
            ctx.globalAlpha = lineProgress;
            ctx.strokeStyle = '#58A6FF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lineX, lineY);
            ctx.lineTo(lineX + lineWidth, lineY);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Draw animated menu buttons with modern design
     */
    drawAnimatedMenuButtons(ctx, width, height, hitAreas) {
        const progress = this.buttonsAnimationProgress;
        const time = this.animationTime;
        
        if (progress === 0) return;
        
        // Button layout parameters
        const buttonWidth = 280;
        const buttonHeight = 60;
        const buttonSpacing = 15;
        const totalHeight = this.menuButtons.length * (buttonHeight + buttonSpacing) - buttonSpacing;
        const startY = (height - totalHeight) / 2 + 50;
        const buttonX = (width - buttonWidth) / 2;
        
        this.menuButtons.forEach((button, index) => {
            const buttonY = startY + index * (buttonHeight + buttonSpacing);
            
            // Staggered animation
            const staggerDelay = index * 0.1;
            const buttonProgress = Math.max(0, Math.min(1, (progress - staggerDelay) / 0.8));
            
            if (buttonProgress === 0) return;
            
            // Animation effects
            const slideOffset = (1 - buttonProgress) * 100;
            const animatedX = buttonX + slideOffset;
            const isHovered = this.hoveredButton === index;
            const hoverScale = isHovered ? 1 + Math.sin(time * 8) * 0.02 : 1;
            
            ctx.save();
            ctx.globalAlpha = buttonProgress;
            
            // Button glow effect for hovered state
            if (isHovered) {
                ctx.shadowColor = button.color + '80';
                ctx.shadowBlur = 20;
                
                // Pulsing outer glow
                const pulseRadius = 15 + Math.sin(time * 4) * 5;
                const glowGradient = ctx.createRadialGradient(
                    animatedX + buttonWidth/2, buttonY + buttonHeight/2, 0,
                    animatedX + buttonWidth/2, buttonY + buttonHeight/2, pulseRadius
                );
                glowGradient.addColorStop(0, button.color + '40');
                glowGradient.addColorStop(1, button.color + '00');
                
                ctx.fillStyle = glowGradient;
                ctx.fillRect(
                    animatedX - pulseRadius, 
                    buttonY - pulseRadius, 
                    buttonWidth + pulseRadius * 2, 
                    buttonHeight + pulseRadius * 2
                );
            }
            
            // Button background with gradient
            const bgGradient = ctx.createLinearGradient(animatedX, buttonY, animatedX, buttonY + buttonHeight);
            if (isHovered) {
                bgGradient.addColorStop(0, 'rgba(33, 38, 45, 0.95)');
                bgGradient.addColorStop(0.5, button.color + '20');
                bgGradient.addColorStop(1, 'rgba(21, 25, 30, 0.95)');
            } else {
                bgGradient.addColorStop(0, 'rgba(33, 38, 45, 0.8)');
                bgGradient.addColorStop(1, 'rgba(21, 25, 30, 0.8)');
            }
            
            ctx.fillStyle = bgGradient;
            this.drawRoundedRect(ctx, animatedX, buttonY, buttonWidth * hoverScale, buttonHeight * hoverScale, 15);
            
            // Button border
            ctx.strokeStyle = isHovered ? button.color : '#30363d';
            ctx.lineWidth = isHovered ? 2 : 1;
            this.strokeRoundedRect(ctx, animatedX, buttonY, buttonWidth * hoverScale, buttonHeight * hoverScale, 15);
            ctx.shadowBlur = 0;
            
            // Button icon
            const iconX = animatedX + 30;
            const iconY = buttonY + buttonHeight / 2;
            const iconScale = isHovered ? 1 + Math.sin(time * 6) * 0.1 : 1;
            
            ctx.font = `${Math.floor(24 * iconScale)}px "Segoe UI Emoji", Arial, sans-serif`;
            ctx.fillStyle = button.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(button.icon, iconX, iconY);
            
            // Button text
            ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = isHovered ? '#ffffff' : '#f0f6fc';
            ctx.textAlign = 'left';
            ctx.fillText(button.text, animatedX + 65, iconY - 8);
            
            // Button description
            ctx.font = '14px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = isHovered ? '#e5e7eb' : '#8b949e';
            ctx.fillText(button.description, animatedX + 65, iconY + 12);
            
            // Add hit area
            hitAreas.push({
                x: animatedX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                action: button.action,
                index: index
            });
            
            ctx.restore();
        });
    }
    
    /**
     * Draw version information
     */
    drawVersionInfo(ctx, width, height) {
        ctx.save();
        
        ctx.font = '12px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = 'rgba(139, 148, 158, 0.6)';
        ctx.textAlign = 'right';
        ctx.fillText('v2.1.2', width - 20, height - 20);
        
        ctx.restore();
    }
    
    /**
     * Draw footer information
     */
    drawFooterInfo(ctx, width, height) {
        ctx.save();
        ctx.font = '12px Courier New';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        
        // Draw footer text
        const footerY = height - 30;
        ctx.fillText('Press ESC to toggle fullscreen', width / 2, footerY);
        
        ctx.restore();
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
                newHoveredButton = area.index;
                break;
            }
        }
        
        // Play hover sound if button changed
        if (newHoveredButton !== this.hoveredButton && newHoveredButton !== -1) {
            if (this.gameInstance?.audioSystem) {
                this.gameInstance.audioSystem.playSound('menuClick', 0.3);
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
     * Reset animations (for when returning to home screen)
     */
    resetAnimations() {
        this.animationTime = 0;
        this.titleAnimationProgress = 0;
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
