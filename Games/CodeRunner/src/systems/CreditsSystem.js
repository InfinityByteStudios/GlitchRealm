/**
 * Credits System for CodeRunner
 * Modern, animated credits screen with scrolling text and visual effects
 */

export class CreditsSystem {
    constructor(gameInstance = null) {
        this.gameInstance = gameInstance;
        
        // Animation state
        this.animationTime = 0;
        this.scrollPosition = 0;
        this.fadeInProgress = 0;
        this.lastFrameTime = Date.now();
        
        // Particle system for background effects
        this.stars = [];
        this.initializeStars();
        
        // Credits content
        this.creditsData = [
            {
                type: 'title',
                text: 'CodeRunner',
                subtitle: 'A Modern Programming Adventure',
                delay: 0
            },
            {
                type: 'section',
                title: 'Development Team',
                delay: 1000,
                entries: [
                    { role: 'Lead Developer', name: 'NanoShade', description: 'Game architecture and core systems' },
                    { role: 'Lead Artist', name: 'PixelPunk', description: 'Interface design and user experience' }
                ]
            },
            {
                type: 'section',
                title: 'Special Thanks',
                delay: 2000,
                entries: [
                    { role: 'Beta Testers', name: 'GhostPixel, SpriteSinner', description: 'Testing and feedback' },
                    { role: 'Music', name: 'Pixabay online music', description: 'Background music and sound effects' },
                    
                ]
            },
            {
                type: 'section',
                title: 'Technology Stack',
                delay: 3000,
                entries: [
                    { role: 'Engine', name: 'HTML5 Canvas', description: 'Graphics and rendering' },
                    { role: 'Language', name: 'JavaScript ES6+', description: 'Core game logic' },
                    { role: 'Storage', name: 'LocalStorage & Firebase', description: 'Save data and leaderboards' },
                    { role: 'Tools', name: 'VS Code & GitHub', description: 'Development environment' }
                ]
            },
            {
                type: 'message',
                text: 'Thank you for playing CodeRunner!',
                subtitle: 'Keep coding, keep learning, keep growing.',
                delay: 4000
            },
            {
                type: 'footer',
                text: '© 2025 CodeRunner Game',
                subtitle: 'Made with ❤️ for the programming community',
                delay: 5000
            }
        ];
        
        this.autoScroll = true;
        this.scrollSpeed = 50; // pixels per second
    }
    
    /**
     * Initialize star field background
     */
    initializeStars() {
        this.stars = [];
        
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * 1920,
                y: Math.random() * 1080,
                z: Math.random() * 1000,
                size: Math.random() * 2 + 0.5,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: Math.random() * 0.02 + 0.01
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
        
        // Update fade in
        if (this.fadeInProgress < 1) {
            this.fadeInProgress = Math.min(1, this.fadeInProgress + deltaTime * 0.002);
        }
        
        // Auto scroll
        if (this.autoScroll) {
            this.scrollPosition += this.scrollSpeed * (deltaTime * 0.001);
        }
        
        // Update star twinkle
        this.stars.forEach(star => {
            star.twinklePhase += star.twinkleSpeed;
        });
    }
    
    /**
     * Render the complete credits screen
     */
    render(ctx, width, height) {
        this.update();
        
        // Draw background
        this.drawBackground(ctx, width, height);
        
        // Draw stars
        this.drawStarField(ctx, width, height);
        
        // Draw credits content
        const hitAreas = this.drawCreditsContent(ctx, width, height);
        
        // Draw back button
        hitAreas.push(this.drawBackButton(ctx, width, height));
        
        return hitAreas;
    }
    
    /**
     * Draw animated background
     */
    drawBackground(ctx, width, height) {
        const time = this.animationTime;
        
        // Base gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, `rgba(6, 18, 36, ${0.95 + Math.sin(time * 0.5) * 0.05})`);
        gradient.addColorStop(0.4, `rgba(15, 23, 42, ${0.9 + Math.cos(time * 0.3) * 0.1})`);
        gradient.addColorStop(0.8, `rgba(30, 41, 59, ${0.85 + Math.sin(time * 0.4) * 0.15})`);
        gradient.addColorStop(1, `rgba(51, 65, 85, ${0.8 + Math.cos(time * 0.6) * 0.2})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Subtle animated overlay
        const overlayGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height) / 2);
        overlayGradient.addColorStop(0, `rgba(99, 102, 241, ${0.1 + Math.sin(time * 0.8) * 0.05})`);
        overlayGradient.addColorStop(0.6, `rgba(168, 85, 247, ${0.05 + Math.cos(time * 0.6) * 0.03})`);
        overlayGradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
        
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, 0, width, height);
    }
    
    /**
     * Draw twinkling star field
     */
    drawStarField(ctx, width, height) {
        this.stars.forEach(star => {
            const perspective = 1000 / (1000 - star.z);
            const x = (star.x - width / 2) * perspective + width / 2;
            const y = (star.y - height / 2) * perspective + height / 2;
            
            if (x >= 0 && x <= width && y >= 0 && y <= height) {
                const size = star.size * perspective;
                const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
                const alpha = Math.min(1, perspective * 0.8) * twinkle;
                
                ctx.save();
                ctx.globalAlpha = alpha;
                
                // Draw star
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add glow effect for larger stars
                if (size > 1.5) {
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = size * 2;
                    ctx.beginPath();
                    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.restore();
            }
        });
    }
    
    /**
     * Draw scrolling credits content
     */
    drawCreditsContent(ctx, width, height) {
        const hitAreas = [];
        const centerX = width / 2;
        let currentY = height - this.scrollPosition;
        
        ctx.save();
        ctx.globalAlpha = this.fadeInProgress;
        
        this.creditsData.forEach((section, index) => {
            const sectionDelay = section.delay || 0;
            const timeSinceStart = this.animationTime * 1000;
            
            if (timeSinceStart < sectionDelay) return;
            
            const sectionAlpha = Math.min(1, (timeSinceStart - sectionDelay) / 1000);
            
            ctx.save();
            ctx.globalAlpha = this.fadeInProgress * sectionAlpha;
            
            switch (section.type) {
                case 'title':
                    currentY = this.drawTitleSection(ctx, section, centerX, currentY);
                    break;
                    
                case 'section':
                    currentY = this.drawSection(ctx, section, centerX, currentY, width);
                    break;
                    
                case 'message':
                    currentY = this.drawMessage(ctx, section, centerX, currentY);
                    break;
                    
                case 'footer':
                    currentY = this.drawFooter(ctx, section, centerX, currentY);
                    break;
            }
            
            ctx.restore();
        });
        
        ctx.restore();
        
        return hitAreas;
    }
    
    /**
     * Draw title section
     */
    drawTitleSection(ctx, section, centerX, y) {
        ctx.textAlign = 'center';
        
        // Main title
        ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(99, 102, 241, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillText(section.text, centerX, y);
        
        // Subtitle
        ctx.font = '24px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
        ctx.shadowBlur = 10;
        ctx.fillText(section.subtitle, centerX, y + 50);
        
        return y + 150;
    }
    
    /**
     * Draw credits section
     */
    drawSection(ctx, section, centerX, y, width) {
        // Section title
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
        ctx.shadowBlur = 15;
        ctx.fillText(section.title, centerX, y);
        
        let entryY = y + 60;
        
        // Section entries
        section.entries.forEach(entry => {
            // Role
            ctx.textAlign = 'left';
            ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.shadowBlur = 5;
            ctx.fillText(entry.role + ':', centerX - 250, entryY);
            
            // Name
            ctx.font = '20px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(entry.name, centerX - 50, entryY);
            
            // Description
            ctx.font = '16px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(entry.description, centerX - 250, entryY + 25);
            
            entryY += 60;
        });
        
        return entryY + 40;
    }
    
    /**
     * Draw message section
     */
    drawMessage(ctx, section, centerX, y) {
        ctx.textAlign = 'center';
        
        // Main message
        ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillText(section.text, centerX, y);
        
        // Subtitle
        ctx.font = '20px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
        ctx.shadowBlur = 10;
        ctx.fillText(section.subtitle, centerX, y + 40);
        
        return y + 120;
    }
    
    /**
     * Draw footer section
     */
    drawFooter(ctx, section, centerX, y) {
        ctx.textAlign = 'center';
        
        // Copyright
        ctx.font = '18px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 5;
        ctx.fillText(section.text, centerX, y);
        
        // Made with love
        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(section.subtitle, centerX, y + 30);
        
        return y + 200;
    }
    
    /**
     * Draw back button
     */
    drawBackButton(ctx, width, height) {
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonX = 50;
        const buttonY = height - 80;
        
        // Semi-transparent background
        ctx.save();
        ctx.globalAlpha = 0.8;
        
        // Background
        ctx.fillStyle = 'rgba(100, 116, 139, 0.8)';
        ctx.beginPath();
        ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        
        // Text
        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('← Back', buttonX + buttonWidth / 2, buttonY + 26);
        
        ctx.restore();
        
        return {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            action: 'back'
        };
    }
    
    /**
     * Handle mouse movement
     */
    handleMouseMove(x, y, hitAreas) {
        // Credits don't typically need hover effects, but we'll implement for consistency
    }
    
    /**
     * Handle mouse clicks
     */
    handleClick(x, y, hitAreas) {
        for (const area of hitAreas) {
            if (x >= area.x && x <= area.x + area.width && 
                y >= area.y && y <= area.y + area.height) {
                
                if (this.gameInstance?.audioSystem) {
                    this.gameInstance.audioSystem.onMenuClick();
                }
                
                return area.action;
            }
        }
        return null;
    }
    
    /**
     * Handle scroll for manual scrolling
     */
    handleScroll(deltaY) {
        this.autoScroll = false;
        this.scrollPosition = Math.max(0, this.scrollPosition + deltaY);
    }
    
    /**
     * Reset animations
     */
    resetAnimations() {
        this.animationTime = 0;
        this.scrollPosition = 0;
        this.fadeInProgress = 0;
        this.autoScroll = true;
        this.lastFrameTime = Date.now();
    }
}
