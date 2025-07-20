/**
 * LoadingScreenSystem - Manages the initial loading screen with animations and asset loading
 */

import { GAME_STATES } from '../utils/constants.js';

export class LoadingScreenSystem {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        
        // Loading state
        this.isActive = true;
        this.loadingProgress = 0;
        this.targetProgress = 0;
        this.loadingSpeed = 1.2; // Increase speed to ensure visible progress
        
        // Animation state
        this.startTime = performance.now();
        this.minimumDisplayTime = 6000; // 6 seconds minimum display time for full animation
        this.fadeOutDuration = 1000; // 1 second fade out
        this.fadeOpacity = 1;
        this.fadeInterval = null;
        
        // Game initialization tracking
        this.gameInitialized = false;
        this.canTransition = false;
        this.progressCompleteTime = null;
        this.completionHoldDuration = 1000; // Hold for 1 second after reaching 100%
        
        // Visual elements
        this.particles = [];
        this.maxParticles = 20;
        this.particleSpawnRate = 0.3;
        
        // Loading text animation
        this.loadingText = "INITIALIZING CODERUNNER";
        this.loadingDots = "";
        this.dotCount = 0;
        this.lastDotUpdate = 0;
        this.dotUpdateInterval = 500; // ms
        
        // Assets and components to load
        this.assetsToLoad = [
            'Audio System',
            'Input Manager', 
            'Physics Engine',
            'World Generator',
            'Renderer',
            'Player Systems',
            'UI Components',
            'Game Assets',
            'Save System'
        ];
        this.currentLoadingItem = 0;
        this.itemLoadDelay = 600; // Even longer delay between items for more visible progression
        this.lastItemLoad = 0;
        
        // Progress bar settings
        this.progressBarWidth = 400;
        this.progressBarHeight = 8;
        this.progressBarX = 0;
        this.progressBarY = 0;
        
        // Logo and branding
        this.logoScale = 1;
        this.logoTargetScale = 1; // Remove breathing animation by setting same value
        this.logoScaleDirection = 1;
        this.logoScaleSpeed = 0; // Disable breathing animation
        
        // Logo image
        this.logoImage = null;
        this.logoLoaded = false;
        this.loadLogoImage();
        
        // Digital rain effect
        this.rainDrops = [];
        this.initRainEffect();
        
        console.log('🔄 LoadingScreenSystem initialized');
    }
    
    /**
     * Load the game logo image
     */
    loadLogoImage() {
        this.logoImage = new Image();
        this.logoImage.onload = () => {
            this.logoLoaded = true;
            console.log('🔄 Loading screen logo loaded successfully');
        };
        this.logoImage.onerror = () => {
            console.warn('⚠️ Failed to load loading screen logo, using text fallback');
            this.logoLoaded = false;
        };
        // Try the opening animation game logo first, fallback to opening animation logo
        this.logoImage.src = './assets/opening animation game logo.png';
    }
    
    /**
     * Initialize digital rain effect for background
     */
    initRainEffect() {
        const columns = Math.floor(this.canvas.width / 20);
        for (let i = 0; i < columns; i++) {
            this.rainDrops.push({
                x: i * 20,
                y: Math.random() * this.canvas.height,
                speed: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.1,
                chars: '01'.split('')
            });
        }
    }
    
    /**
     * Update loading progress and animations
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        const currentTime = performance.now();
        const elapsed = currentTime - this.startTime;
        
        // Debug logging
        if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - deltaTime) / 1000)) {
            console.log(`🔄 Loading screen: ${Math.floor(elapsed/1000)}s elapsed, progress: ${Math.floor(this.loadingProgress)}%`);
        }
        
        // Check if game initialization is complete
        this.checkGameInitialization();
        
        // Update loading progress based on actual game state
        this.updateLoadingProgress(currentTime);
        
        // Update animations
        this.updateAnimations(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update digital rain
        this.updateRainEffect(deltaTime);
        
        // Check if progress just reached 100%
        if (this.loadingProgress >= 100 && this.progressCompleteTime === null) {
            this.progressCompleteTime = currentTime;
            console.log('🔄 Progress bar completed, holding before transition');
        }
        
        // Check if we can transition - ONLY based on time and progress, ignore game initialization
        const progressHoldComplete = this.progressCompleteTime && 
                                   (currentTime - this.progressCompleteTime > this.completionHoldDuration);
        
        if (elapsed > this.minimumDisplayTime && 
            this.loadingProgress >= 100 && 
            progressHoldComplete &&
            !this.canTransition) {
            this.canTransition = true;
            this.startFadeOut();
        }
    }
    
    /**
     * Check if game initialization is complete
     */
    checkGameInitialization() {
        // Check if the game initialization has completed
        if (this.game.initializationComplete && !this.gameInitialized) {
            this.gameInitialized = true;
            this.targetProgress = 100;
            console.log('🔄 Game initialization detected as complete');
        }
    }
    
    /**
     * Simulate loading progress
     */
    updateLoadingProgress(currentTime) {
        // Progress based purely on time elapsed, not game initialization
        const elapsed = currentTime - this.startTime;
        const timeProgress = Math.min(100, (elapsed / this.minimumDisplayTime) * 100);
        
        // Load items progressively at a steady pace
        if (this.currentLoadingItem < this.assetsToLoad.length && 
            currentTime - this.lastItemLoad > this.itemLoadDelay) {
            this.currentLoadingItem++;
            this.lastItemLoad = currentTime;
        }
        
        // Set target progress based on time progression
        this.targetProgress = timeProgress;
        
        // Smooth progress bar animation with variable speed
        if (this.loadingProgress < this.targetProgress) {
            // Variable speed based on current progress to make it feel more natural
            let speed = this.loadingSpeed;
            if (this.loadingProgress > 50) {
                speed = this.loadingSpeed * 0.8; // 20% slower after 50%
            }
            if (this.loadingProgress > 75) {
                speed = this.loadingSpeed * 0.6; // 40% slower after 75%
            }
            if (this.loadingProgress > 90) {
                speed = this.loadingSpeed * 0.4; // 60% slower for final 10%
            }
            
            this.loadingProgress = Math.min(
                this.loadingProgress + speed,
                this.targetProgress
            );
        }
        
        // Update loading dots animation
        if (currentTime - this.lastDotUpdate > this.dotUpdateInterval) {
            this.dotCount = (this.dotCount + 1) % 4;
            this.loadingDots = ".".repeat(this.dotCount);
            this.lastDotUpdate = currentTime;
        }
    }
    
    /**
     * Update visual animations
     */
    updateAnimations(deltaTime) {
        // Disable logo breathing animation - keep it static
        // this.logoScale remains constant at 1
        
        // Spawn particles occasionally
        if (Math.random() < this.particleSpawnRate * deltaTime * 0.001) {
            this.spawnParticle();
        }
    }
    
    /**
     * Update particle system
     */
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx * deltaTime * 0.001;
            particle.y += particle.vy * deltaTime * 0.001;
            particle.life -= deltaTime * 0.001;
            particle.opacity = particle.life / particle.maxLife;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Update digital rain effect
     */
    updateRainEffect(deltaTime) {
        this.rainDrops.forEach(drop => {
            drop.y += drop.speed * deltaTime * 0.1;
            
            if (drop.y > this.canvas.height) {
                drop.y = -20;
                drop.speed = Math.random() * 2 + 1;
                drop.opacity = Math.random() * 0.5 + 0.1;
            }
        });
    }
    
    /**
     * Spawn a new particle
     */
    spawnParticle() {
        if (this.particles.length >= this.maxParticles) return;
        
        // Sometimes spawn particles from the logo area for better integration
        const spawnFromLogo = Math.random() < 0.3;
        let spawnX, spawnY;
        
        if (spawnFromLogo) {
            // Spawn from around the logo area
            const logoX = this.canvas.width / 2;
            const logoY = this.canvas.height / 2 - 100;
            spawnX = logoX + (Math.random() - 0.5) * 200;
            spawnY = logoY + (Math.random() - 0.5) * 100;
        } else {
            // Spawn from bottom as before
            spawnX = Math.random() * this.canvas.width;
            spawnY = this.canvas.height + 10;
        }
        
        this.particles.push({
            x: spawnX,
            y: spawnY,
            vx: (Math.random() - 0.5) * 50,
            vy: spawnFromLogo ? -(Math.random() * 30 + 20) : -(Math.random() * 100 + 50),
            life: Math.random() * 3 + 2,
            maxLife: Math.random() * 3 + 2,
            opacity: 1,
            size: Math.random() * 3 + 1,
            color: Math.random() > 0.5 ? '#58a6ff' : '#79c0ff'
        });
    }
    
    /**
     * Start fade out animation
     */
    startFadeOut() {
        if (this.fadeInterval) return; // Prevent multiple fade outs
        
        console.log('🔄 Starting loading screen fade out');
        this.fadeInterval = setInterval(() => {
            this.fadeOpacity -= 0.02;
            if (this.fadeOpacity <= 0) {
                this.fadeOpacity = 0;
                this.isActive = false;
                clearInterval(this.fadeInterval);
                
                // Transition to the pending state if available, otherwise default to HOME
                if (this.game.pendingGameState) {
                    console.log(`🔄 Loading screen completed, transitioning to ${this.game.pendingGameState}`);
                    this.game.setGameState(this.game.pendingGameState);
                    this.game.pendingGameState = null;
                } else if (this.game.initializationComplete) {
                    console.log('🔄 Loading screen completed, defaulting to HOME state');
                    this.game.gameState = GAME_STATES.HOME;
                } else {
                    console.log('🔄 Loading screen completed but game still initializing - waiting...');
                    // Keep checking until game is ready
                    const waitForInit = setInterval(() => {
                        if (this.game.initializationComplete) {
                            clearInterval(waitForInit);
                            this.game.gameState = GAME_STATES.HOME;
                            console.log('🔄 Game initialization now complete, transitioned to HOME');
                        }
                    }, 50);
                }
            }
        }, 16); // ~60fps fade
    }
    
    /**
     * Render the loading screen
     */
    render() {
        if (!this.isActive) return;
        
        // Clear canvas with dark background
        this.ctx.fillStyle = '#0d1117';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply fade opacity
        this.ctx.globalAlpha = this.fadeOpacity;
        
        // Render digital rain background
        this.renderRainEffect();
        
        // Render particles
        this.renderParticles();
        
        // Render main content
        this.renderLogo();
        this.renderLoadingText();
        this.renderProgressBar();
        this.renderCurrentLoadingItem();
        
        // Reset alpha
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Render digital rain background effect
     */
    renderRainEffect() {
        this.ctx.font = '12px monospace';
        this.rainDrops.forEach(drop => {
            // Calculate distance from logo center for visual integration
            const logoX = this.canvas.width / 2;
            const logoY = this.canvas.height / 2 - 100;
            const distanceFromLogo = Math.sqrt(Math.pow(drop.x - logoX, 2) + Math.pow(drop.y - logoY, 2));
            
            // Reduce opacity near the logo for better visual integration
            let effectiveOpacity = drop.opacity * 0.3;
            if (distanceFromLogo < 150) {
                effectiveOpacity *= 0.3; // Much dimmer near logo
            } else if (distanceFromLogo < 250) {
                effectiveOpacity *= 0.6; // Slightly dimmer in logo vicinity
            }
            
            this.ctx.fillStyle = `rgba(88, 166, 255, ${effectiveOpacity})`;
            const char = drop.chars[Math.floor(Math.random() * drop.chars.length)];
            this.ctx.fillText(char, drop.x, drop.y);
        });
    }
    
    /**
     * Render floating particles
     */
    renderParticles() {
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.opacity * this.fadeOpacity;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = this.fadeOpacity;
    }
    
    /**
     * Render the game logo
     */
    renderLogo() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2 - 100;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(this.logoScale, this.logoScale);
        
        if (this.logoLoaded && this.logoImage) {
            // Add a subtle glow background for the logo
            const logoWidth = Math.min(400, this.canvas.width * 0.6);
            const logoHeight = (this.logoImage.height / this.logoImage.width) * logoWidth;
            
            // Create a subtle circular glow behind the logo
            const glowRadius = Math.max(logoWidth, logoHeight) * 0.7;
            const glowGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
            glowGradient.addColorStop(0, 'rgba(88, 166, 255, 0.15)');
            glowGradient.addColorStop(0.5, 'rgba(88, 166, 255, 0.08)');
            glowGradient.addColorStop(1, 'rgba(88, 166, 255, 0)');
            
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add a subtle shadow behind the logo
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowOffsetY = 10;
            
            // Render the logo with enhanced visual effects
            this.ctx.drawImage(
                this.logoImage,
                -logoWidth / 2,
                -logoHeight / 2,
                logoWidth,
                logoHeight
            );
            
            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetY = 0;
            
            // Add a subtle overlay gradient to integrate with the theme
            this.ctx.globalCompositeOperation = 'overlay';
            this.ctx.globalAlpha = 0.1;
            const overlayGradient = this.ctx.createLinearGradient(-logoWidth/2, -logoHeight/2, logoWidth/2, logoHeight/2);
            overlayGradient.addColorStop(0, '#58a6ff');
            overlayGradient.addColorStop(0.5, '#79c0ff');
            overlayGradient.addColorStop(1, '#a5f3fc');
            
            this.ctx.fillStyle = overlayGradient;
            this.ctx.fillRect(-logoWidth/2, -logoHeight/2, logoWidth, logoHeight);
            
            // Reset blend mode and alpha
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = 1;
            
        } else {
            // Enhanced fallback text with better styling
            this.ctx.font = 'bold 48px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Add background glow for text
            const textGlowGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
            textGlowGradient.addColorStop(0, 'rgba(88, 166, 255, 0.2)');
            textGlowGradient.addColorStop(1, 'rgba(88, 166, 255, 0)');
            this.ctx.fillStyle = textGlowGradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 200, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Text shadow
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowOffsetY = 5;
            
            // Gradient text effect
            const gradient = this.ctx.createLinearGradient(0, -30, 0, 30);
            gradient.addColorStop(0, '#58a6ff');
            gradient.addColorStop(0.5, '#79c0ff');
            gradient.addColorStop(1, '#a5f3fc');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillText('CODERUNNER', 0, 0);
            
            // Additional glow effect
            this.ctx.shadowColor = '#58a6ff';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowOffsetY = 0;
            this.ctx.fillText('CODERUNNER', 0, 0);
            
            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetY = 0;
            
            // Subtitle with better integration
            this.ctx.font = '18px "Courier New", monospace';
            this.ctx.fillStyle = '#7d8590';
            this.ctx.fillText('Digital Explorer', 0, 50);
        }
        
        this.ctx.restore();
    }
    
    /**
     * Render loading text with animation
     */
    renderLoadingText() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2 + 50;
        
        this.ctx.font = '16px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#f0f6fc';
        this.ctx.fillText(this.loadingText + this.loadingDots, centerX, centerY);
    }
    
    /**
     * Render progress bar
     */
    renderProgressBar() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2 + 100;
        
        this.progressBarX = centerX - this.progressBarWidth / 2;
        this.progressBarY = centerY;
        
        // Background
        this.ctx.fillStyle = '#21262d';
        this.ctx.fillRect(
            this.progressBarX, 
            this.progressBarY, 
            this.progressBarWidth, 
            this.progressBarHeight
        );
        
        // Progress fill
        const fillWidth = (this.loadingProgress / 100) * this.progressBarWidth;
        const progressGradient = this.ctx.createLinearGradient(
            this.progressBarX, 0, 
            this.progressBarX + this.progressBarWidth, 0
        );
        progressGradient.addColorStop(0, '#58a6ff');
        progressGradient.addColorStop(1, '#79c0ff');
        
        this.ctx.fillStyle = progressGradient;
        this.ctx.fillRect(
            this.progressBarX, 
            this.progressBarY, 
            fillWidth, 
            this.progressBarHeight
        );
        
        // Border
        this.ctx.strokeStyle = '#30363d';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            this.progressBarX, 
            this.progressBarY, 
            this.progressBarWidth, 
            this.progressBarHeight
        );
        
        // Progress percentage
        this.ctx.font = '12px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#7d8590';
        this.ctx.fillText(
            `${Math.floor(this.loadingProgress)}%`, 
            centerX, 
            centerY + 25
        );
    }
    
    /**
     * Render current loading item
     */
    renderCurrentLoadingItem() {
        if (this.currentLoadingItem < this.assetsToLoad.length) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2 + 140;
            
            this.ctx.font = '14px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#58a6ff';
            this.ctx.fillText(
                `Loading: ${this.assetsToLoad[this.currentLoadingItem]}`, 
                centerX, 
                centerY
            );
        }
    }
    
    /**
     * Check if loading screen is still active
     */
    isActiveLoading() {
        return this.isActive;
    }
    
    /**
     * Force complete loading (speeds up but maintains smooth progress)
     */
    forceComplete() {
        // Simulate that minimum time has passed to allow completion
        this.startTime = performance.now() - this.minimumDisplayTime;
        this.targetProgress = 100;
        this.loadingSpeed = 2; // Speed up significantly
        this.gameInitialized = true;
        this.currentLoadingItem = this.assetsToLoad.length;
        console.log('🔄 Loading completion forced - speeding up progress');
    }
}
