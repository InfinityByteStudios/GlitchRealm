import { GAME_STATES } from '../utils/constants.js';

/**
 * QuantumDashAnimationSystem handles the cool animation effects for quantum dash
 * Features:
 * - Game pause during animation
 * - Blue lightning burst effects
 * - Distortion ripple effects
 * - Screen shake and flash
 * - Smooth animation transitions
 */
export class QuantumDashAnimationSystem {
    constructor(game) {
        this.game = game;
        this.isAnimating = false;
        this.animationStartTime = 0;
        this.animationDuration = 1200; // 1.2 seconds total
        
        // Animation phases
        this.phases = {
            charge: { start: 0, duration: 300 },      // 0-300ms: Charge up effect
            burst: { start: 300, duration: 200 },     // 300-500ms: Lightning burst
            teleport: { start: 500, duration: 100 },  // 500-600ms: Instant teleport
            ripple: { start: 600, duration: 400 },    // 600-1000ms: Ripple effects
            fade: { start: 1000, duration: 200 }      // 1000-1200ms: Fade out
        };
        
        // Effect states
        this.lightningBolts = [];
        this.ripples = [];
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.flashIntensity = 0;
        this.distortionField = [];
        
        // Player position tracking
        this.startPosition = { x: 0, y: 0 };
        this.endPosition = { x: 0, y: 0 };
        
        // Audio cues
        this.audioPlayed = {
            charge: false,
            burst: false,
            teleport: false
        };
    }

    /**
     * Start the quantum dash animation
     */
    startAnimation(startX, startY, endX, endY) {
        if (this.isAnimating) return; // Prevent multiple animations

      
        
        this.isAnimating = true;
        this.animationStartTime = Date.now();
        
        // Store positions
        this.startPosition = { x: startX, y: startY };
        this.endPosition = { x: endX, y: endY };
        
        // Pause the game
        if (this.game && this.game.gameState === GAME_STATES.PLAYING && !this.game.isPaused) {
            this.game.wasPlayingBeforeDash = true;
            this.game.isPaused = true;
        }
        
        // Reset audio flags
        this.audioPlayed = { charge: false, burst: false, teleport: false };
        
        // Initialize effects
        this.initializeLightningBolts();
        this.initializeDistortionField();
    }

    /**
     * Update the animation
     */
    update(deltaTime) {
        if (!this.isAnimating) return;

        const elapsed = Date.now() - this.animationStartTime;
        const progress = Math.min(elapsed / this.animationDuration, 1.0);
        
        // Update current phase
        this.updateCurrentPhase(elapsed);
        
        // Update effects
        this.updateLightningBolts(deltaTime);
        this.updateRipples(deltaTime);
        this.updateScreenShake(deltaTime);
        this.updateDistortionField(deltaTime);
        
        // Check if animation is complete
        if (progress >= 1.0) {
            this.endAnimation();
        }
    }

    /**
     * Update effects based on current animation phase
     */
    updateCurrentPhase(elapsed) {
        
        // Charge phase
        if (elapsed >= this.phases.charge.start && elapsed < this.phases.charge.start + this.phases.charge.duration) {
           
            this.updateChargePhase(elapsed - this.phases.charge.start);
        }
        
        // Burst phase
        if (elapsed >= this.phases.burst.start && elapsed < this.phases.burst.start + this.phases.burst.duration) {
           
            this.updateBurstPhase(elapsed - this.phases.burst.start);
        }
        
        // Teleport phase
        if (elapsed >= this.phases.teleport.start && elapsed < this.phases.teleport.start + this.phases.teleport.duration) {
           
            this.updateTeleportPhase(elapsed - this.phases.teleport.start);
        }
        
        // Ripple phase
        if (elapsed >= this.phases.ripple.start && elapsed < this.phases.ripple.start + this.phases.ripple.duration) {
            
            this.updateRipplePhase(elapsed - this.phases.ripple.start);
        }
        
        // Fade phase
        if (elapsed >= this.phases.fade.start && elapsed < this.phases.fade.start + this.phases.fade.duration) {
            
            this.updateFadePhase(elapsed - this.phases.fade.start);
        }
    }

    /**
     * Charge phase: Build up energy at start position
     */
    updateChargePhase(phaseTime) {
        const progress = phaseTime / this.phases.charge.duration;
        
       
        
        // Play charge sound once
        if (!this.audioPlayed.charge && this.game.audioSystem) {
            this.game.audioSystem.playSound('powerup');
            this.audioPlayed.charge = true;
        }
        
        // Increase flash intensity
        this.flashIntensity = progress * 0.3;
       
        // Add energy particles at start position
        this.addEnergyParticles(this.startPosition.x, this.startPosition.y, progress);
    }

    /**
     * Burst phase: Lightning explosion at start position
     */
    updateBurstPhase(phaseTime) {
        const progress = phaseTime / this.phases.burst.duration;
        
    
        
        // Play burst sound once
        if (!this.audioPlayed.burst && this.game.audioSystem) {
            this.game.audioSystem.playSound('jump'); // Using jump sound as placeholder
            this.audioPlayed.burst = true;
        }
        
        // Maximum flash
        this.flashIntensity = 0.8 * (1 - progress);
      
        
        // Intense screen shake
        this.screenShake.intensity = 15 * (1 - progress);
        
        // Create lightning bolts
        if (Math.random() < 0.8) {
            this.addLightningBolt(this.startPosition.x, this.startPosition.y);
           
        }
    }

    /**
     * Teleport phase: Instant transition (player position actually changes here)
     */
    updateTeleportPhase(phaseTime) {
        // Play teleport sound once
        if (!this.audioPlayed.teleport && this.game.audioSystem) {
            this.game.audioSystem.playSound('collect'); // Using collect sound as placeholder
            this.audioPlayed.teleport = true;
        }
        
        // Screen flash
        this.flashIntensity = 0.6;
        
        // Medium screen shake
        this.screenShake.intensity = 8;
    }

    /**
     * Ripple phase: Distortion effects at end position
     */
    updateRipplePhase(phaseTime) {
        const progress = phaseTime / this.phases.ripple.duration;
        
        // Fading flash
        this.flashIntensity = 0.4 * (1 - progress);
        
        // Decreasing screen shake
        this.screenShake.intensity = 5 * (1 - progress);
        
        // Create ripple effects
        if (Math.random() < 0.3) {
            this.addRipple(this.endPosition.x, this.endPosition.y);
        }
    }

    /**
     * Fade phase: Final cleanup
     */
    updateFadePhase(phaseTime) {
        const progress = phaseTime / this.phases.fade.duration;
        
        // Fade out all effects
        this.flashIntensity = Math.max(0, 0.2 * (1 - progress));
        this.screenShake.intensity = Math.max(0, 2 * (1 - progress));
    }

    /**
     * Initialize lightning bolt effects
     */
    initializeLightningBolts() {
        this.lightningBolts = [];
    }

    /**
     * Add a lightning bolt effect
     */
    addLightningBolt(centerX, centerY) {
        const bolt = {
            startX: centerX + (Math.random() - 0.5) * 100,
            startY: centerY + (Math.random() - 0.5) * 100,
            endX: centerX + (Math.random() - 0.5) * 200,
            endY: centerY + (Math.random() - 0.5) * 200,
            intensity: 0.8 + Math.random() * 0.2,
            life: 150 + Math.random() * 100, // milliseconds
            maxLife: 150 + Math.random() * 100,
            segments: this.generateLightningSegments(centerX, centerY)
        };
        
        this.lightningBolts.push(bolt);
    }

    /**
     * Generate lightning segments for more realistic lightning
     */
    generateLightningSegments(startX, startY) {
        const segments = [];
        const numSegments = 5 + Math.floor(Math.random() * 8);
        
        for (let i = 0; i < numSegments; i++) {
            segments.push({
                x: startX + (Math.random() - 0.5) * 150,
                y: startY + (Math.random() - 0.5) * 150,
                intensity: Math.random()
            });
        }
        
        return segments;
    }

    /**
     * Update lightning bolts
     */
    updateLightningBolts(deltaTime) {
        for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
            const bolt = this.lightningBolts[i];
            bolt.life -= deltaTime;
            
            if (bolt.life <= 0) {
                this.lightningBolts.splice(i, 1);
            }
        }
    }

    /**
     * Initialize distortion field
     */
    initializeDistortionField() {
        this.distortionField = [];
    }

    /**
     * Add ripple effect
     */
    addRipple(centerX, centerY) {
        const ripple = {
            x: centerX,
            y: centerY,
            radius: 10,
            maxRadius: 150 + Math.random() * 100,
            intensity: 0.6 + Math.random() * 0.3,
            life: 600 + Math.random() * 200,
            maxLife: 600 + Math.random() * 200
        };
        
        this.ripples.push(ripple);
    }

    /**
     * Update ripple effects
     */    updateRipples(deltaTime) {
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];
            
            ripple.life -= deltaTime;
            
            // Ensure life doesn't go below 0 to prevent negative progress
            ripple.life = Math.max(0, ripple.life);
            
            const progress = 1 - (ripple.life / ripple.maxLife);
            ripple.radius = ripple.maxRadius * progress;
            
            // Ensure radius is never negative
            ripple.radius = Math.max(0, ripple.radius);
            
            if (ripple.life <= 0) {
                this.ripples.splice(i, 1);
            }
        }
    }

    /**
     * Update screen shake
     */
    updateScreenShake(deltaTime) {
        if (this.screenShake.intensity > 0) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
        } else {
            this.screenShake.x = 0;
            this.screenShake.y = 0;
        }
    }

    /**
     * Update distortion field
     */
    updateDistortionField(deltaTime) {
        // Simple implementation for now
        // Could be expanded with more complex distortion effects
    }

    /**
     * Add energy particles during charge phase
     */
    addEnergyParticles(x, y, intensity) {
        // Create particle-like effects around the charge position
        // This is a placeholder for more complex particle system
    }

    /**
     * End the animation and resume game
     */
    endAnimation() {
      
        
        this.isAnimating = false;
        
        // Resume the game if it was paused for the dash
        if (this.game && this.game.wasPlayingBeforeDash) {
            this.game.isPaused = false;
            this.game.wasPlayingBeforeDash = false;
        }
        
        // Clear all effects
        this.lightningBolts = [];
        this.ripples = [];
        this.distortionField = [];
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.flashIntensity = 0;
    }

    /**
     * Render all animation effects
     */
    render(ctx, camera) {
        if (!this.isAnimating) return;

      
        
        ctx.save();
        
        // Apply screen shake to the entire canvas
        ctx.translate(this.screenShake.x, this.screenShake.y);
        
        // Draw lightning bolts
        this.renderLightningBolts(ctx, camera);
        
        // Draw ripples
        this.renderRipples(ctx, camera);
        
        // Draw distortion effects
        this.renderDistortionField(ctx, camera);
        
        // Draw screen flash
        this.renderScreenFlash(ctx);
        
        ctx.restore();
    }

    /**
     * Render lightning bolts
     */
    renderLightningBolts(ctx, camera) {
        if (this.lightningBolts.length === 0) return;

      
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Additive blending for lightning
        
        for (const bolt of this.lightningBolts) {
            const alpha = bolt.life / bolt.maxLife;
            
            ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * bolt.intensity})`;
            ctx.lineWidth = 3 + Math.random() * 2;
            ctx.lineCap = 'round';
            
            // Draw main bolt
            ctx.beginPath();
            ctx.moveTo(bolt.startX - camera.x, bolt.startY - camera.y);
            
            // Draw through segments for jagged lightning effect
            for (const segment of bolt.segments) {
                ctx.lineTo(segment.x - camera.x, segment.y - camera.y);
            }
            
            ctx.lineTo(bolt.endX - camera.x, bolt.endY - camera.y);
            ctx.stroke();
            
            // Draw glow effect
            ctx.strokeStyle = `rgba(200, 230, 255, ${alpha * bolt.intensity * 0.3})`;
            ctx.lineWidth = 8;
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Render ripple effects
     */
    renderRipples(ctx, camera) {
        if (this.ripples.length === 0) return;

       
        
        ctx.save();
          for (const ripple of this.ripples) {
            const alpha = ripple.life / ripple.maxLife;
            const screenX = ripple.x - camera.x;
            const screenY = ripple.y - camera.y;
            
            // Ensure radius is never negative
            const outerRadius = Math.max(0, ripple.radius);
            const innerRadius = Math.max(0, ripple.radius * 0.7);
            
            // Skip rendering if radius is too small or zero
            if (outerRadius < 0.1) continue;
            
            // Draw outer ripple
            ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * ripple.intensity * 0.6})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, outerRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw inner ripple
            ctx.strokeStyle = `rgba(150, 220, 255, ${alpha * ripple.intensity * 0.8})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(screenX, screenY, innerRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Render distortion field effects
     */
    renderDistortionField(ctx, camera) {
        // Placeholder for more advanced distortion effects
        // Could implement pixel displacement or shader-like effects
    }

    /**
     * Render screen flash effect
     */
    renderScreenFlash(ctx) {
        if (this.flashIntensity <= 0) return;

      
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(100, 200, 255, ${this.flashIntensity})`;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    /**
     * Check if animation is currently running
     */
    isActive() {
        return this.isAnimating;
    }

    /**
     * Force stop the animation (emergency cleanup)
     */
    forceStop() {
        if (this.isAnimating) {
            this.endAnimation();
        }
    }
}
