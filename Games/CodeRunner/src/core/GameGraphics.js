/**
 * Game Graphics and Quality Management
 */

export class GameGraphics {
    constructor(game) {
        this.game = game;
    }

    /**
     * Apply graphics quality settings to game systems
     */
    applyGraphicsQuality() {
        console.log('🎨 Applying graphics quality:', this.game.graphicsQuality);
        
        // Apply settings based on quality level
        switch (this.game.graphicsQuality) {
            case 'low':
                this.game.particleQuality = 'low';
                this.game.particleCount = 50;
                this.game.shadowQuality = 'off';
                this.game.lightingQuality = 'basic';
                this.game.tileDetailLevel = 'low';
                this.game.backgroundAnimations = false;
                break;
                
            case 'medium':
                this.game.particleQuality = 'medium';
                this.game.particleCount = 100;
                this.game.shadowQuality = 'low';
                this.game.lightingQuality = 'medium';
                this.game.tileDetailLevel = 'medium';
                this.game.backgroundAnimations = true;
                break;
                
            case 'high':
                this.game.particleQuality = 'high';
                this.game.particleCount = 200;
                this.game.shadowQuality = 'high';
                this.game.lightingQuality = 'high';
                this.game.tileDetailLevel = 'high';
                this.game.backgroundAnimations = true;
                break;
        }
        
        // Apply to existing world if available
        if (this.game.world) {
            this.game.world.particleQuality = this.game.particleQuality;
            this.game.world.particleCount = this.game.particleCount;
            this.game.world.tileDetailLevel = this.game.tileDetailLevel;
            this.game.world.backgroundAnimations = this.game.backgroundAnimations;
        }
        
        // Apply renderer optimizations based on quality
        if (this.game.renderer) {
            this.game.renderer.setRenderOptimizations({
                skipBackgroundParticles: this.game.graphicsQuality === 'low',
                reduceGradientComplexity: this.game.graphicsQuality === 'low',
                cacheGradients: this.game.graphicsQuality !== 'low',
                particleQuality: this.game.particleQuality,
                shadowQuality: this.game.shadowQuality,
                lightingQuality: this.game.lightingQuality
            });
        }
        
        // Apply tile renderer optimizations
        if (this.game.world?.tileRenderer) {
            this.game.world.tileRenderer.setHighPerformanceMode(this.game.graphicsQuality === 'low');
            this.game.world.tileRenderer.setDetailLevel(this.game.tileDetailLevel);
        }
        
        // Apply to particle systems
        if (this.game.player) {
            this.game.player.particleQuality = this.game.particleQuality;
        }
    }

    /**
     * Set graphics quality level
     */
    setGraphicsQuality(quality) {
        if (['low', 'medium', 'high'].includes(quality)) {
            this.game.graphicsQuality = quality;
            this.applyGraphicsQuality();
            console.log('🎨 Graphics quality set to:', quality);
        } else {
            console.warn('⚠️ Invalid graphics quality:', quality);
        }
    }

    /**
     * Get current graphics quality
     */
    getGraphicsQuality() {
        return this.game.graphicsQuality;
    }

    /**
     * Toggle particles on/off
     */
    toggleParticles() {
        this.game.showParticles = !this.game.showParticles;
        console.log(`✨ Particles ${this.game.showParticles ? 'enabled' : 'disabled'}`);
        
        // Apply to world if available
        if (this.game.world) {
            this.game.world.particlesEnabled = this.game.showParticles;
        }
    }

    /**
     * Toggle background particles
     */
    toggleBackgroundParticles() {
        this.game.backgroundParticles = !this.game.backgroundParticles;
        console.log(`🌟 Background particles ${this.game.backgroundParticles ? 'enabled' : 'disabled'}`);
        
        // Apply to world if available
        if (this.game.world) {
            this.game.world.backgroundParticles = this.game.backgroundParticles;
        }
    }

    /**
     * Toggle screen shake
     */
    toggleScreenShake() {
        this.game.screenShake = !this.game.screenShake;
        console.log(`📳 Screen shake ${this.game.screenShake ? 'enabled' : 'disabled'}`);
        
        // Reset current shake if disabled
        if (!this.game.screenShake) {
            this.game.currentShake = { x: 0, y: 0, intensity: 0, duration: 0 };
        }
    }

    /**
     * Set screen shake intensity
     */
    setShakeIntensity(intensity) {
        this.game.shakeIntensity = Math.max(0, Math.min(2, intensity)); // Clamp between 0 and 2
        console.log('📳 Screen shake intensity set to:', this.game.shakeIntensity);
    }

    /**
     * Get render statistics
     */
    getRenderStats() {
        return {
            graphicsQuality: this.game.graphicsQuality,
            particleQuality: this.game.particleQuality,
            particleCount: this.game.particleCount,
            shadowQuality: this.game.shadowQuality,
            lightingQuality: this.game.lightingQuality,
            tileDetailLevel: this.game.tileDetailLevel,
            backgroundAnimations: this.game.backgroundAnimations,
            showParticles: this.game.showParticles,
            backgroundParticles: this.game.backgroundParticles,
            screenShake: this.game.screenShake,
            shakeIntensity: this.game.shakeIntensity
        };
    }

    /**
     * Set render optimization level (0-3, higher = more optimizations)
     */
    setOptimizationLevel(level) {
        level = Math.max(0, Math.min(3, level));
        
        switch (level) {
            case 0:
                // No optimizations - maximum quality
                this.setGraphicsQuality('high');
                this.game.backgroundParticles = true;
                this.game.showParticles = true;
                break;
                
            case 1:
                // Light optimizations
                this.setGraphicsQuality('medium');
                this.game.backgroundParticles = true;
                this.game.showParticles = true;
                break;
                
            case 2:
                // Medium optimizations
                this.setGraphicsQuality('low');
                this.game.backgroundParticles = false;
                this.game.showParticles = true;
                break;
                
            case 3:
                // Heavy optimizations - minimum quality
                this.setGraphicsQuality('low');
                this.game.backgroundParticles = false;
                this.game.showParticles = false;
                break;
        }
        
        console.log('⚡ Optimization level set to:', level);
    }

    /**
     * Auto-adjust graphics based on performance
     */
    autoAdjustGraphics(fps) {
        if (fps < 30) {
            // Very low FPS - apply heavy optimizations
            this.setOptimizationLevel(3);
        } else if (fps < 45) {
            // Low FPS - apply medium optimizations
            this.setOptimizationLevel(2);
        } else if (fps < 55) {
            // Slightly low FPS - apply light optimizations
            this.setOptimizationLevel(1);
        } else if (fps > 58) {
            // Good FPS - restore quality
            this.setOptimizationLevel(0);
        }
        // Between 55-58 FPS: maintain current settings
    }

    /**
     * Apply color theme to the game
     */
    applyColorTheme(theme) {
        const themes = {
            default: {
                primary: '#00ff00',
                secondary: '#ff4444',
                background: '#111111',
                text: '#ffffff',
                accent: '#00aaff'
            },
            dark: {
                primary: '#4CAF50',
                secondary: '#F44336',
                background: '#000000',
                text: '#E0E0E0',
                accent: '#2196F3'
            },
            light: {
                primary: '#2E7D32',
                secondary: '#D32F2F',
                background: '#FAFAFA',
                text: '#212121',
                accent: '#1976D2'
            },
            neon: {
                primary: '#00ffff',
                secondary: '#ff00ff',
                background: '#0a0a0a',
                text: '#ffffff',
                accent: '#ffff00'
            }
        };
        
        if (themes[theme]) {
            this.game.colorTheme = themes[theme];
            console.log('🎨 Color theme applied:', theme);
            
            // Apply to existing systems
            if (this.game.renderer) {
                this.game.renderer.updateColorTheme(this.game.colorTheme);
            }
        } else {
            console.warn('⚠️ Unknown color theme:', theme);
        }
    }

    /**
     * Set custom resolution scale
     */
    setResolutionScale(scale) {
        scale = Math.max(0.5, Math.min(2.0, scale)); // Clamp between 0.5x and 2.0x
        
        this.game.resolutionScale = scale;
        
        // Update canvas size based on scale
        const baseWidth = this.game.canvas.clientWidth;
        const baseHeight = this.game.canvas.clientHeight;
        
        this.game.canvas.width = baseWidth * scale;
        this.game.canvas.height = baseHeight * scale;
        
        // Update context scaling
        this.game.ctx.scale(scale, scale);
        
        console.log('🖥️ Resolution scale set to:', scale);
    }

    /**
     * Enable/disable anti-aliasing
     */
    setAntiAliasing(enabled) {
        this.game.antiAliasing = enabled;
        
        if (this.game.ctx) {
            this.game.ctx.imageSmoothingEnabled = enabled;
            this.game.ctx.webkitImageSmoothingEnabled = enabled;
            this.game.ctx.mozImageSmoothingEnabled = enabled;
            this.game.ctx.msImageSmoothingEnabled = enabled;
        }
        
        console.log(`🎨 Anti-aliasing ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set texture filtering quality
     */
    setTextureFiltering(quality) {
        const qualities = ['nearest', 'linear', 'mipmap'];
        
        if (qualities.includes(quality)) {
            this.game.textureFiltering = quality;
            
            if (this.game.ctx) {
                // Apply texture filtering based on quality
                switch (quality) {
                    case 'nearest':
                        this.game.ctx.imageSmoothingQuality = 'low';
                        break;
                    case 'linear':
                        this.game.ctx.imageSmoothingQuality = 'medium';
                        break;
                    case 'mipmap':
                        this.game.ctx.imageSmoothingQuality = 'high';
                        break;
                }
            }
            
            console.log('🎨 Texture filtering set to:', quality);
        } else {
            console.warn('⚠️ Invalid texture filtering quality:', quality);
        }
    }

    /**
     * Get supported graphics features
     */
    getSupportedFeatures() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        return {
            canvas2d: !!ctx,
            imageSmoothing: 'imageSmoothingEnabled' in ctx,
            webgl: !!canvas.getContext('webgl') || !!canvas.getContext('experimental-webgl'),
            webgl2: !!canvas.getContext('webgl2'),
            offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
            imageData: typeof ImageData !== 'undefined',
            filter: CSS.supports('filter', 'blur(1px)'),
            transforms: CSS.supports('transform', 'scale(1)')
        };
    }

    /**
     * Benchmark graphics performance
     */
    async benchmarkPerformance() {
        console.log('🏃 Starting graphics performance benchmark...');
        
        const startTime = performance.now();
        const iterations = 1000;
        
        // Test basic drawing operations
        for (let i = 0; i < iterations; i++) {
            this.game.ctx.fillStyle = '#ff0000';
            this.game.ctx.fillRect(i % 100, i % 100, 10, 10);
        }
        
        const drawTime = performance.now() - startTime;
        
        // Test particle simulation
        const particleStart = performance.now();
        const particles = [];
        
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * this.game.canvas.width,
                y: Math.random() * this.game.canvas.height,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4
            });
        }
        
        // Simulate 60 frames of particle movement
        for (let frame = 0; frame < 60; frame++) {
            for (const particle of particles) {
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // Bounce off edges
                if (particle.x < 0 || particle.x > this.game.canvas.width) particle.vx *= -1;
                if (particle.y < 0 || particle.y > this.game.canvas.height) particle.vy *= -1;
            }
        }
        
        const particleTime = performance.now() - particleStart;
        
        const results = {
            drawOperationsPerMs: iterations / drawTime,
            particleSimulationMs: particleTime,
            overallScore: Math.round((iterations / drawTime) * (1000 / particleTime))
        };
        
        console.log('📊 Benchmark results:', results);
        return results;
    }
}
