// ByteSurge: Infinite Loop - Drone System
// Advanced drone movement, animation, and effects

// ===== DRONE SYSTEM =====
class Drone {
    constructor(x, y) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
          // Direction system (0=right, 1=down, 2=left, 3=up)
        this.direction = 0;
        this.baseSpeed = 120; // Base pixels per second
        this.speed = 120; // Current pixels per second (affected by upgrades)
        this.turnCooldown = 0;
        this.minTurnDelay = 100; // ms between turns
        this.turnSmoothness = 1; // Affected by auto-turn assist upgrade
        
        // Visual properties
        this.size = 10;
        this.glowRadius = 20;
        this.pulsePhase = 0;
        
        // Trail system
        this.trail = [];
        this.maxTrailLength = 20;
        this.trailSpacing = 8;
        this.lastTrailPos = { x: x, y: y };
        
        // Animation and effects
        this.spawnTime = performance.now();
        this.bobOffset = 0;
        this.rotationAngle = 0;
        
        // Engine particles
        this.engineParticles = [];
        this.maxEngineParticles = 15;
        
        // Status effects
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0;
        this.isBoostActive = false;
        this.boostTime = 0;
        
        console.log(`🚁 Drone spawned at center: (${x}, ${y})`);
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds
        
        // Update cooldowns
        this.turnCooldown = Math.max(0, this.turnCooldown - deltaTime);
        this.invulnerabilityTime = Math.max(0, this.invulnerabilityTime - deltaTime);
        this.boostTime = Math.max(0, this.boostTime - deltaTime);
        
        // Update status effects
        this.isInvulnerable = this.invulnerabilityTime > 0;
        this.isBoostActive = this.boostTime > 0;
        
        // Calculate movement speed (with boost)
        const currentSpeed = this.isBoostActive ? this.speed * 1.5 : this.speed;
        
        // Move in current direction
        const directions = [
            { x: 1, y: 0 },   // Right
            { x: 0, y: 1 },   // Down
            { x: -1, y: 0 },  // Left
            { x: 0, y: -1 }   // Up
        ];
        
        const dir = directions[this.direction];
        this.x += dir.x * currentSpeed * dt;
        this.y += dir.y * currentSpeed * dt;
        
        // Handle screen wrapping
        this.handleScreenWrap();
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update trail
        this.updateTrail();
        
        // Update engine particles
        this.updateEngineParticles(deltaTime);
        
        // Update distance traveled
        if (window.gameState) {
            window.gameState.distance += currentSpeed * dt * 0.01; // Convert to game units
        }
    }
    
    handleScreenWrap() {
        const margin = this.size;
        const halfSize = this.size / 2;
        
        // Check collision with edges and handle based on direction
        if (this.x - halfSize <= 0 && (this.direction === 2)) {
            // Hit left edge while moving left
            this.onEdgeCollision('left');
            this.x = halfSize; // Prevent passing through
        } else if (this.x + halfSize >= window.GAME_WIDTH && (this.direction === 0)) {
            // Hit right edge while moving right
            this.onEdgeCollision('right');
            this.x = window.GAME_WIDTH - halfSize; // Prevent passing through
        }
        
        if (this.y - halfSize <= 0 && (this.direction === 3)) {
            // Hit top edge while moving up
            this.onEdgeCollision('top');
            this.y = halfSize; // Prevent passing through
        } else if (this.y + halfSize >= window.GAME_HEIGHT && (this.direction === 1)) {
            // Hit bottom edge while moving down
            this.onEdgeCollision('bottom');
            this.y = window.GAME_HEIGHT - halfSize; // Prevent passing through
        }
    }
    
    onEdgeCollision(edge) {
        // Visual feedback
        this.createCollisionParticles(edge);
        
        // Gameplay impact
        if (window.gameState) {
            // Reduce energy as penalty
            const penalty = 5;
            window.gameState.energy = Math.max(0, window.gameState.energy - penalty);
            
            // Add some screen shake
            if (window.addScreenShake) {
                window.addScreenShake(5, 100); // Light shake effect
            }
        }
        
        // Make drone briefly invulnerable
        this.isInvulnerable = true;
        this.invulnerabilityTime = 500; // 0.5 seconds of invulnerability
    }
    
    createCollisionParticles(edge) {
        const particleCount = 8;
        const particleSpeed = 2;
        const particleLife = 500; // milliseconds
        
        for (let i = 0; i < particleCount; i++) {
            let angle;
            let position = { x: this.x, y: this.y };
            
            // Determine particle direction based on collision edge
            switch(edge) {
                case 'left':
                    angle = -Math.PI / 2 + (Math.random() - 0.5);
                    position.x = this.size;
                    break;
                case 'right':
                    angle = Math.PI / 2 + (Math.random() - 0.5);
                    position.x = window.GAME_WIDTH - this.size;
                    break;
                case 'top':
                    angle = Math.PI + (Math.random() - 0.5);
                    position.y = this.size;
                    break;
                case 'bottom':
                    angle = 0 + (Math.random() - 0.5);
                    position.y = window.GAME_HEIGHT - this.size;
                    break;
            }
            
            if (window.particleSystem) {
                window.particleSystem.addParticle({
                    x: position.x,
                    y: position.y,
                    velocity: {
                        x: Math.cos(angle) * particleSpeed * (1 + Math.random()),
                        y: Math.sin(angle) * particleSpeed * (1 + Math.random())
                    },
                    life: particleLife * (0.8 + Math.random() * 0.4),
                    color: '#ff4444',
                    size: 2 + Math.random() * 2
                });
            }
        }
    }
    
    updateVisualEffects(deltaTime) {
        // Pulse animation
        this.pulsePhase += deltaTime * 0.003;
        
        // Subtle bobbing motion
        this.bobOffset = Math.sin(this.pulsePhase * 2) * 1.5;
        
        // Rotation based on direction
        const targetRotation = this.direction * Math.PI / 2;
        this.rotationAngle = this.rotationAngle + (targetRotation - this.rotationAngle) * 0.1;
    }
      updateTrail() {
        const distSq = (this.x - this.lastTrailPos.x) ** 2 + (this.y - this.lastTrailPos.y) ** 2;
        
        // Adjusted spacing for smoother trail
        const adaptiveSpacing = Math.max(4, this.trailSpacing * (this.speed / this.baseSpeed));
        
        if (distSq > adaptiveSpacing ** 2) {
            // Add interpolated points for ultra-smooth trail
            const steps = Math.max(1, Math.floor(Math.sqrt(distSq) / adaptiveSpacing));
            
            for (let step = 1; step <= steps; step++) {
                const t = step / steps;
                const interpX = this.lastTrailPos.x + (this.x - this.lastTrailPos.x) * t;
                const interpY = this.lastTrailPos.y + (this.y - this.lastTrailPos.y) * t;
                
                this.trail.push({
                    x: interpX,
                    y: interpY,
                    time: performance.now(),
                    alpha: 1.0,
                    velocity: { x: this.x - this.lastTrailPos.x, y: this.y - this.lastTrailPos.y }
                });
            }
            
            this.lastTrailPos = { x: this.x, y: this.y };
            
            // Limit trail length with smoother removal
            while (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }
        
        // Enhanced trail alpha with smooth fade and wave effect
        const now = performance.now();
        this.trail.forEach((point, index) => {
            const age = now - point.time;
            const baseFade = Math.max(0, 1 - age / 1800); // Slightly longer fade time
            
            // Add subtle wave effect for more dynamic appearance
            const wavePhase = (now * 0.003) + (index * 0.2);
            const waveIntensity = 0.15;
            const wave = 1 + Math.sin(wavePhase) * waveIntensity;
            
            point.alpha = baseFade * wave;
        });
        
        // Remove expired trail points
        this.trail = this.trail.filter(point => point.alpha > 0.05);
    }
    
    updateEngineParticles(deltaTime) {
        // Spawn new particles
        if (this.engineParticles.length < this.maxEngineParticles) {
            const directions = [
                { x: 1, y: 0 },   // Right
                { x: 0, y: 1 },   // Down
                { x: -1, y: 0 },  // Left
                { x: 0, y: -1 }   // Up
            ];
            
            const oppositeDir = directions[(this.direction + 2) % 4];
            
            this.engineParticles.push({
                x: this.x + oppositeDir.x * (this.size / 2),
                y: this.y + oppositeDir.y * (this.size / 2),
                vx: oppositeDir.x * (20 + Math.random() * 30) + (Math.random() - 0.5) * 20,
                vy: oppositeDir.y * (20 + Math.random() * 30) + (Math.random() - 0.5) * 20,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 0.5 + Math.random() * 0.5,
                size: 2 + Math.random() * 3
            });
        }
        
        // Update existing particles
        const dt = deltaTime / 1000;
        this.engineParticles.forEach(particle => {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.life -= dt;
            particle.vx *= 0.95; // Air resistance
            particle.vy *= 0.95;
        });
        
        // Remove dead particles
        this.engineParticles = this.engineParticles.filter(particle => particle.life > 0);
    }
    
    turn() {
        if (this.turnCooldown > 0) {
            return false;
        }
        
        // Turn left (90 degrees counterclockwise)
        this.direction = (this.direction + 3) % 4; // +3 is same as -1 in mod 4
        this.turnCooldown = this.minTurnDelay;
        
        // Visual feedback for turn
        this.spawnTurnEffect();
        
        return true;
    }
    
    spawnTurnEffect() {
        // Create turn particle burst
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.engineParticles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 50,
                vy: Math.sin(angle) * 50,
                life: 0.3,
                maxLife: 0.3,
                size: 3,
                isTurnEffect: true
            });
        }
    }
    
    activateBoost(duration = 2000) {
        this.isBoostActive = true;
        this.boostTime = duration;
    }
    
    makeInvulnerable(duration = 1000) {
        this.isInvulnerable = true;
        this.invulnerabilityTime = duration;
    }
      render(ctx) {
        ctx.save();
        
        // Render trail first (behind drone)
        this.renderTrail(ctx);
        
        // Render engine particles
        this.renderEngineParticles(ctx);
        
        // Render main drone
        ctx.translate(this.x, this.y + this.bobOffset);
        ctx.rotate(this.rotationAngle);
        
        // Check if sprite is available and loaded
        if (window.sprites && window.sprites.drone && window.sprites.loaded) {
            // Render sprite with glow effect
            const glowIntensity = 0.3 + Math.sin(this.pulsePhase) * 0.1;
            const glowSize = this.glowRadius + Math.sin(this.pulsePhase * 1.5) * 3;
            
            // Outer glow effect
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
            gradient.addColorStop(0, `rgba(0, 255, 255, ${glowIntensity})`);
            gradient.addColorStop(0.7, `rgba(0, 128, 255, ${glowIntensity * 0.3})`);
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2);
            
            // Apply invulnerability effect
            if (this.isInvulnerable) {
                ctx.globalAlpha = 0.7 + Math.sin(performance.now() * 0.02) * 0.3;
            }
            
            // Draw the sprite centered
            const spriteSize = this.size * 2; // Scale sprite to be appropriate size
            ctx.drawImage(window.sprites.drone, -spriteSize/2, -spriteSize/2, spriteSize, spriteSize);
            
            // Reset alpha
            ctx.globalAlpha = 1.0;
        } else {
            // Fallback to original primitive rendering
            // Outer glow effect
            const glowIntensity = 0.3 + Math.sin(this.pulsePhase) * 0.1;
            const glowSize = this.glowRadius + Math.sin(this.pulsePhase * 1.5) * 3;
            
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
            gradient.addColorStop(0, `rgba(0, 255, 255, ${glowIntensity})`);
            gradient.addColorStop(0.7, `rgba(0, 128, 255, ${glowIntensity * 0.3})`);
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2);
            
            // Main drone body
            ctx.fillStyle = this.isInvulnerable ? '#ffffff' : '#f0f0f0';
            if (this.isInvulnerable) {
                ctx.globalAlpha = 0.7 + Math.sin(performance.now() * 0.02) * 0.3;
            }
            
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner core
            ctx.fillStyle = this.isBoostActive ? '#ffff00' : '#00ffff';
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Direction indicator
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(this.size / 3, -1, this.size / 4, 2);
        }
        
        ctx.restore();
        
        // Render status effects
        this.renderStatusEffects(ctx);
    }
      renderTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Enhanced smooth trail using quadratic curves
        if (this.trail.length >= 3) {
            // Render smooth curved trail
            for (let i = 0; i < this.trail.length - 2; i++) {
                const p0 = this.trail[i];
                const p1 = this.trail[i + 1];
                const p2 = this.trail[i + 2];
                
                // Calculate control point for smooth curve
                const controlX = p1.x;
                const controlY = p1.y;
                const endX = (p1.x + p2.x) / 2;
                const endY = (p1.y + p2.y) / 2;
                
                const alpha = p1.alpha * 0.9;
                const progress = (i + 1) / this.trail.length;
                const width = progress * 8 + 2; // Thicker, more dynamic width
                
                // Create gradient for trail segment
                const gradient = ctx.createLinearGradient(p0.x, p0.y, endX, endY);
                gradient.addColorStop(0, `rgba(0, 150, 255, ${alpha * 0.3})`);
                gradient.addColorStop(0.5, `rgba(0, 200, 255, ${alpha * 0.7})`);
                gradient.addColorStop(1, `rgba(100, 220, 255, ${alpha})`);
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = width;
                
                ctx.beginPath();
                if (i === 0) {
                    ctx.moveTo(p0.x, p0.y);
                }
                ctx.quadraticCurveTo(controlX, controlY, endX, endY);
                ctx.stroke();
                
                // Add inner glow effect
                ctx.strokeStyle = `rgba(200, 240, 255, ${alpha * 0.6})`;
                ctx.lineWidth = width * 0.4;
                ctx.beginPath();
                if (i === 0) {
                    ctx.moveTo(p0.x, p0.y);
                }
                ctx.quadraticCurveTo(controlX, controlY, endX, endY);
                ctx.stroke();
            }
            
            // Connect to drone with final smooth segment
            if (this.trail.length > 0) {
                const lastPoint = this.trail[this.trail.length - 1];
                const alpha = 1.0;
                const width = 6;
                
                // Smooth connection to current drone position
                const midX = (lastPoint.x + this.x) / 2;
                const midY = (lastPoint.y + this.y) / 2;
                
                const gradient = ctx.createLinearGradient(lastPoint.x, lastPoint.y, this.x, this.y);
                gradient.addColorStop(0, `rgba(100, 220, 255, ${alpha * 0.8})`);
                gradient.addColorStop(1, `rgba(150, 240, 255, ${alpha})`);
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = width;
                
                ctx.beginPath();
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.quadraticCurveTo(midX, midY, this.x, this.y);
                ctx.stroke();
                
                // Inner glow for connection
                ctx.strokeStyle = `rgba(220, 250, 255, ${alpha * 0.8})`;
                ctx.lineWidth = width * 0.5;
                ctx.beginPath();
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.quadraticCurveTo(midX, midY, this.x, this.y);
                ctx.stroke();
            }
        } else {
            // Fallback for simple trail with < 3 points
            for (let i = 1; i < this.trail.length; i++) {
                const prev = this.trail[i - 1];
                const curr = this.trail[i];
                
                const alpha = curr.alpha * 0.8;
                const width = (i / this.trail.length) * 6;
                
                ctx.strokeStyle = `rgba(0, 128, 255, ${alpha})`;
                ctx.lineWidth = width;
                
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(curr.x, curr.y);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
    
    renderEngineParticles(ctx) {
        ctx.save();
        
        this.engineParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            const size = particle.size * alpha;
            
            if (particle.isTurnEffect) {
                ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            } else {
                ctx.fillStyle = `rgba(0, 255, 255, ${alpha * 0.8})`;
            }
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
    
    renderStatusEffects(ctx) {
        // Boost indicator
        if (this.isBoostActive) {
            ctx.save();
            ctx.translate(this.x, this.y - this.size - 10);
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('BOOST', 0, 0);
            ctx.restore();
        }
        
        // Invulnerability indicator
        if (this.isInvulnerable) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
    
    getBounds() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            width: this.size,
            height: this.size,
            centerX: this.x,
            centerY: this.y,
            radius: this.size / 2
        };
    }
    
    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.direction = 0;
        this.trail = [];
        this.engineParticles = [];
        this.turnCooldown = 0;
        this.isInvulnerable = false;
        this.isBoostActive = false;
        this.invulnerabilityTime = 0;
        this.boostTime = 0;        this.spawnTime = performance.now();
    }
}

// Export for global access
window.Drone = Drone;
