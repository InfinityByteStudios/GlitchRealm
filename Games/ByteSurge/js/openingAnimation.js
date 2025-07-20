// ByteSurge: Opening Animation System
// Handles studio logo -> game logo -> game start sequence

class OpeningAnimation {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.phase = 'loading'; // 'loading', 'studio', 'game', 'complete'
        this.startTime = 0;
        this.studioLogo = null;
        this.gameLogo = null;
        this.imagesLoaded = 0;
        this.totalImages = 2;
        this.fadeAlpha = 0;
        this.logoScale = 0.8;
        this.pulseOffset = 0;
        
        // Animation timings (in milliseconds)
        this.timings = {
            studioLogoFadeIn: 800,
            studioLogoHold: 2000,
            studioLogoFadeOut: 600,
            transition: 400,
            gameLogoFadeIn: 1000,
            gameLogoHold: 2500,
            gameLogoFadeOut: 800
        };
        
        this.loadAssets();
    }
      loadAssets() {
        // Load studio logo
        this.studioLogo = new Image();
        this.studioLogo.loaded = false;
        this.studioLogo.onload = () => {
            this.studioLogo.loaded = true;
            this.imagesLoaded++;
            this.checkAllLoaded();
        };
        this.studioLogo.onerror = () => {
            console.error('Failed to load studio logo: assets/opening animation studio logo.png');
            this.studioLogo.loaded = false;
            this.imagesLoaded++;
            this.checkAllLoaded();
        };
        this.studioLogo.src = 'assets/opening animation studio logo.png';
        
        // Load game logo
        this.gameLogo = new Image();
        this.gameLogo.loaded = false;
        this.gameLogo.onload = () => {
            this.gameLogo.loaded = true;
            this.imagesLoaded++;
            this.checkAllLoaded();
        };
        this.gameLogo.onerror = () => {
            console.error('Failed to load game logo: assets/opening animation game logo.png');
            this.gameLogo.loaded = false;
            this.imagesLoaded++;
            this.checkAllLoaded();
        };
        this.gameLogo.src = 'assets/opening  animation game logo.png';
    }
    
    checkAllLoaded() {
        if (this.imagesLoaded >= this.totalImages) {
            this.phase = 'studio';
            this.startTime = performance.now();
        }
    }
    
    update(currentTime) {
        if (this.phase === 'loading') return false;
        if (this.phase === 'complete') return true;
        
        const elapsed = currentTime - this.startTime;
        this.pulseOffset += 0.05;
        
        switch (this.phase) {
            case 'studio':
                this.updateStudioPhase(elapsed);
                break;
            case 'game':
                this.updateGamePhase(elapsed);
                break;
        }
        
        return this.phase === 'complete';
    }
    
    updateStudioPhase(elapsed) {
        const { studioLogoFadeIn, studioLogoHold, studioLogoFadeOut } = this.timings;
        const totalStudioTime = studioLogoFadeIn + studioLogoHold + studioLogoFadeOut;
        
        if (elapsed < studioLogoFadeIn) {
            // Fade in studio logo
            this.fadeAlpha = elapsed / studioLogoFadeIn;
            this.logoScale = 0.8 + (0.2 * this.fadeAlpha);
        } else if (elapsed < studioLogoFadeIn + studioLogoHold) {
            // Hold studio logo
            this.fadeAlpha = 1;
            this.logoScale = 1 + Math.sin(this.pulseOffset) * 0.02;
        } else if (elapsed < totalStudioTime) {
            // Fade out studio logo
            const fadeOutProgress = (elapsed - studioLogoFadeIn - studioLogoHold) / studioLogoFadeOut;
            this.fadeAlpha = 1 - fadeOutProgress;
            this.logoScale = 1 - (fadeOutProgress * 0.1);
        } else {
            // Transition to game logo
            this.phase = 'game';
            this.startTime = performance.now();
            this.fadeAlpha = 0;
            this.logoScale = 0.8;
        }
    }
    
    updateGamePhase(elapsed) {
        const { gameLogoFadeIn, gameLogoHold, gameLogoFadeOut } = this.timings;
        const totalGameTime = gameLogoFadeIn + gameLogoHold + gameLogoFadeOut;
        
        if (elapsed < gameLogoFadeIn) {
            // Fade in game logo with glitch effect
            this.fadeAlpha = elapsed / gameLogoFadeIn;
            this.logoScale = 0.8 + (0.2 * this.fadeAlpha);
        } else if (elapsed < gameLogoFadeIn + gameLogoHold) {
            // Hold game logo with energy pulse
            this.fadeAlpha = 1;
            this.logoScale = 1 + Math.sin(this.pulseOffset * 1.5) * 0.03;
        } else if (elapsed < totalGameTime) {
            // Fade out game logo
            const fadeOutProgress = (elapsed - gameLogoFadeIn - gameLogoHold) / gameLogoFadeOut;
            this.fadeAlpha = 1 - fadeOutProgress;
            this.logoScale = 1 + (fadeOutProgress * 0.2);
        } else {
            // Animation complete
            this.phase = 'complete';
            this.fadeAlpha = 0;
        }
    }
    
    render() {
        // Clear screen with dark background
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.phase === 'loading') {
            this.renderLoadingScreen();
            return;
        }
        
        if (this.phase === 'complete') return;
        
        // Add subtle background particles for atmosphere
        this.renderBackgroundParticles();
          // Render current logo
        const currentLogo = this.phase === 'studio' ? this.studioLogo : this.gameLogo;
        if (currentLogo && currentLogo.complete && currentLogo.loaded) {
            this.renderLogo(currentLogo);
        }
        
        // Add scan lines effect for retro feel
        this.renderScanLines();
    }      renderLoadingScreen() {
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        
        this.ctx.fillStyle = '#00ff88';
        this.ctx.font = '20px monospace'; // Increased from 16px for larger canvas
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LOADING ASSETS...', gameWidth / 2, gameHeight / 2);
        
        // Animated loading dots
        const dots = '.'.repeat((Math.floor(performance.now() / 500) % 4));
        this.ctx.fillText(dots, gameWidth / 2, gameHeight / 2 + 40); // Adjusted spacing
    }renderLogo(logo) {
        // Check if logo is actually valid before rendering
        if (!logo || !logo.complete || !logo.loaded || logo.naturalWidth === 0) {
            return;
        }
        
        this.ctx.save();        // Use game dimensions instead of scaled canvas dimensions for proper centering
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        
        // Calculate centered position with much larger scaling to fill most of the screen
        const maxWidth = gameWidth * 0.95;   // Fill 95% of screen width
        const maxHeight = gameHeight * 0.85;  // Fill 85% of screen height
        const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height) * this.logoScale;
        
        const scaledWidth = logo.width * scale;
        const scaledHeight = logo.height * scale;
        
        // Ensure perfect centering using game dimensions
        const x = Math.floor((gameWidth - scaledWidth) / 2);
        const y = Math.floor((gameHeight - scaledHeight) / 2);
        
        // Apply fade and glow effects
        this.ctx.globalAlpha = this.fadeAlpha;
        
        // Add glow effect for game logo - reset shadow offset to ensure centering
        if (this.phase === 'game') {
            this.ctx.shadowColor = '#00ff88';
            this.ctx.shadowBlur = 30 + Math.sin(this.pulseOffset * 2) * 15;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }
        
        // Draw logo
        try {
            this.ctx.drawImage(logo, x, y, scaledWidth, scaledHeight);
        } catch (error) {
            console.error('Error drawing logo:', error);
        }
        
        this.ctx.restore();
        
        // Add subtitle for game logo
        if (this.phase === 'game') {
            this.renderGameSubtitle();
        }
    }    renderGameSubtitle() {
        this.ctx.save();
        this.ctx.globalAlpha = this.fadeAlpha * 0.8;
        this.ctx.fillStyle = '#00ff88';
        this.ctx.font = '18px monospace'; // Increased from 14px for larger canvas
        this.ctx.textAlign = 'center';
        
        // Use game dimensions for consistent positioning
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        
        this.ctx.fillText('INFINITE LOOP PROTOCOL', gameWidth / 2, gameHeight / 2 + 140); // Adjusted position
        
        // Blinking cursor effect
        if (Math.sin(this.pulseOffset * 3) > 0) {
            this.ctx.fillText('_', gameWidth / 2 + 140, gameHeight / 2 + 140); // Adjusted position
        }
        
        // Skip hint
        this.ctx.globalAlpha = this.fadeAlpha * 0.6;
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px monospace'; // Increased from 10px
        this.ctx.fillText('PRESS SPACE OR CLICK TO SKIP', gameWidth / 2, gameHeight - 40); // Adjusted position
        
        this.ctx.restore();
    }
      renderBackgroundParticles() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        
        // Increased particle count for larger canvas
        for (let i = 0; i < 35; i++) {
            const x = (i * 47 + performance.now() * 0.01) % this.canvas.width;
            const y = (i * 31 + Math.sin(performance.now() * 0.001 + i)) % this.canvas.height;
            const alpha = Math.sin(performance.now() * 0.003 + i) * 0.5 + 0.5;
            
            this.ctx.globalAlpha = alpha * 0.2;
            this.ctx.fillStyle = this.phase === 'game' ? '#00ff88' : '#4444aa';
            // Larger particles for better visibility
            this.ctx.fillRect(x, y, 2, 2);
        }
        
        this.ctx.restore();
    }
    
    renderScanLines() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = '#ffffff';
        
        for (let y = 0; y < this.canvas.height; y += 4) {
            this.ctx.fillRect(0, y, this.canvas.width, 1);
        }
        
        this.ctx.restore();
    }
    
    skipAnimation() {
        this.phase = 'complete';
        this.fadeAlpha = 0;
    }
}

// Export for global access
window.OpeningAnimation = OpeningAnimation;
