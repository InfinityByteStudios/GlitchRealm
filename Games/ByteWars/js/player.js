class Player {    constructor(x, y) {        this.x = x;
        this.y = y;
        this.radius = 15;
        
        // Speed properties
        this.baseSpeed = 280; // Base speed in pixels per second
        this.speedMultiplier = 1.0; // Adjusted by difficulty
        this.speed = this.baseSpeed; // Current speed (will be modified by difficulty)
        
        // Visual properties
        this.color = '#00ffff';
        this.aimDirection = 0; // angle in radians
        
        // Sprite properties
        this.spriteLoaded = false;
        this.spriteSize = 65; // Size to render the sprite (diameter)
        this.sprite = new Image();

        this.sprite.onload = () => {
            this.spriteLoaded = true;
            console.log('✅ Player sprite loaded successfully');
        };

        this.sprite.onerror = () => {
            console.error('❌ Failed to load player sprite');
            this.spriteLoaded = false;
        };

        // Set the source after setting up event handlers
        this.sprite.src = 'assets/Sprites/sprite_0.png';
        
        // Movement smoothing
        this.velocity = { x: 0, y: 0 };
        this.friction = 0.85;
        
        // Weapon system
        this.weapon = new Weapon();
        this.bullets = [];
        
        // Health system
        this.health = 100;
        this.maxHealth = 100;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.invulnerabilityDuration = 1.0; // seconds
        
        // Visual effects properties
        this.flashTimer = 0;
        this.isFlashing = false;
        this.damageColor = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red for damage          // Dash system
        this.dashSpeed = 840; // pixels per second during dash (increased for even larger arena)
        this.dashDuration = 0.2; // seconds
        this.dashCooldown = 2.0; // seconds between dashes
        this.dashTimer = 0; // current dash time
        this.dashCooldownTimer = 0; // cooldown remaining
        this.isDashing = false;
        this.dashDirection = { x: 0, y: 0 };
        this.dashTrail = []; // For visual trail effect
        
        // Base properties for upgrade calculations
        this.baseDashCooldown = this.dashCooldown;
        this.baseDashSpeed = this.dashSpeed;
        this.baseOverclockChargePerKill = 20; // Base charge gained per kill
        
        // Overclock system
        this.overclockCharge = 0; // Current charge (0-100)
        this.overclockMaxCharge = 100; // Max charge needed
        this.overclockChargePerKill = this.baseOverclockChargePerKill; // Charge gained per kill
        this.overclockDuration = 8.0; // seconds when active
        this.overclockTimer = 0; // remaining overclock time
        this.isOverclocked = false;
        this.overclockMultipliers = {
            fireRate: 2.5, // 2.5x fire rate
            speed: 1.8, // 1.8x movement speed
            damage: 2.0, // 2x damage
            dashCooldown: 0.5 // 50% dash cooldown reduction
        };
        
        // Glitch effect system (for Syntax Breaker enemy)
        this.isGlitched = false;
        this.glitchTimer = 0;
        this.glitchIntensity = 0.5; // How much controls are scrambled (0-1)
        this.glitchVisualTimer = 0;
    }    update(deltaTime, input, arena) {
        // Track old position for continuous collision detection during dash
        const oldX = this.x;
        const oldY = this.y;
        
        // Track action events for visual effects
        const actionEvents = {
            dashActivated: false,
            overclockActivated: false
        };
        
        // Update dash cooldown
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= deltaTime;
        }
          // Handle dash input
        if (input.wasKeyPressed('Space') && this.canDash()) {
            if (this.startDash(input)) {
                actionEvents.dashActivated = true;
            }
        }
        
        // Update dash state
        this.updateDash(deltaTime);
        
        // Update movement with glitch effect
        if (!this.isDashing) {
            // Get movement input (disabled during dash)
            const originalMovement = input.getMovementVector();
            const movement = this.getGlitchedMovement(originalMovement);
            
            // Apply movement with acceleration
            const acceleration = 800; // pixels per second squared
            this.velocity.x += movement.x * acceleration * deltaTime;
            this.velocity.y += movement.y * acceleration * deltaTime;
            
            // Apply friction
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
            
            // Cap velocity (with Overclock bonus)
            const speedMultiplier = this.isOverclocked ? this.overclockMultipliers.speed : 1.0;
            const maxSpeed = this.speed * speedMultiplier;
            const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
            if (currentSpeed > maxSpeed) {
                this.velocity.x = (this.velocity.x / currentSpeed) * maxSpeed;
                this.velocity.y = (this.velocity.y / currentSpeed) * maxSpeed;
            }
        } else {
            // During dash, move in small steps to prevent tunneling through enemies
            const steps = Math.ceil(Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y) * deltaTime / this.radius);
            const stepDelta = deltaTime / steps;
            
            for (let i = 0; i < steps; i++) {
                this.x += this.velocity.x * stepDelta;
                this.y += this.velocity.y * stepDelta;
                this.clampToArena(arena);
            }
        }
        
        // Update position
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        this.clampToArena(arena);
        
        // Update aim direction based on mouse position
        this.aimDirection = Math.atan2(input.mouse.y - this.y, input.mouse.x - this.x);
        
        // Handle shooting
        if (input.mouse.isDown) {
            this.shoot();
        }
          // Update other systems
        this.updateBullets(deltaTime);
        this.updateOverclock(deltaTime, input);
        
        // Update visual effects timers
        if (this.invulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }
        
        if (this.isFlashing) {
            this.flashTimer -= deltaTime;
            if (this.flashTimer <= 0) {
                this.isFlashing = false;
            }
        }
        
        // Update glitch effect
        this.updateGlitchEffect(deltaTime);
        
        return actionEvents;
    }
    
    clampToArena(arena) {
        if (!arena) return;
        
        const margin = this.radius;
        this.x = Math.max(arena.borderThickness + margin, 
                         Math.min(arena.width - arena.borderThickness - margin, this.x));
        this.y = Math.max(arena.borderThickness + margin, 
                         Math.min(arena.height - arena.borderThickness - margin, this.y));
    }
    
    // Dash system methods
    canDash() {
        return !this.isDashing && this.dashCooldownTimer <= 0;
    }
    
    startDash(input) {
        // Get dash direction from current movement input or aim direction
        const movement = input.getMovementVector();
        
        if (movement.x !== 0 || movement.y !== 0) {
            // Dash in movement direction
            this.dashDirection.x = movement.x;
            this.dashDirection.y = movement.y;
        } else {
            // Dash in aim direction if no movement input
            this.dashDirection.x = Math.cos(this.aimDirection);
            this.dashDirection.y = Math.sin(this.aimDirection);
        }
        
        // Normalize dash direction
        const magnitude = Math.sqrt(this.dashDirection.x ** 2 + this.dashDirection.y ** 2);
        if (magnitude > 0) {
            this.dashDirection.x /= magnitude;
            this.dashDirection.y /= magnitude;
        }
        
        // Start dash
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldownTimer = this.dashCooldown;
        
        // Add brief invulnerability during dash
        this.invulnerable = true;
        this.invulnerabilityTimer = this.dashDuration + 0.1; // Add 0.1s buffer after dash
        
        // Set dash velocity
        this.velocity.x = this.dashDirection.x * this.dashSpeed;
        this.velocity.y = this.dashDirection.y * this.dashSpeed;
        
        console.log('Dash activated!');
        return true; // Return true to indicate dash was activated
    }
    
    updateDash(deltaTime) {
        if (!this.isDashing) return;
        
        this.dashTimer -= deltaTime;
        
        if (this.dashTimer <= 0) {
            // End dash
            this.isDashing = false;
            this.dashTimer = 0;
            
            // Reduce velocity after dash
            this.velocity.x *= 0.3;
            this.velocity.y *= 0.3;
        } else {
            // Maintain dash velocity during dash
            this.velocity.x = this.dashDirection.x * this.dashSpeed;
            this.velocity.y = this.dashDirection.y * this.dashSpeed;
        }
    }
    
    updateDashTrail() {
        // Add current position to trail during dash
        if (this.isDashing) {
            this.dashTrail.unshift({ x: this.x, y: this.y, alpha: 1.0 });
            
            // Limit trail length
            if (this.dashTrail.length > 8) {
                this.dashTrail.pop();
            }
        }
        
        // Update trail alpha values
        for (let i = 0; i < this.dashTrail.length; i++) {
            this.dashTrail[i].alpha -= 0.15;
            if (this.dashTrail[i].alpha <= 0) {
                this.dashTrail.splice(i, 1);
                i--;
            }        }
    }
      // Overclock system methods
    updateOverclock(deltaTime, input) {
        // Update Overclock timer
        if (this.isOverclocked) {
            this.overclockTimer -= deltaTime;
            if (this.overclockTimer <= 0) {
                this.deactivateOverclock();
            }
        }
          // Manual activation with Q key (if charged)
        if (input.wasKeyPressed('KeyQ') && this.canActivateOverclock()) {
            return this.activateOverclock(); // Return the activation result
        }
        
        return false; // No activation this frame
    }
    
    addOverclockCharge(amount) {
        this.overclockCharge += amount;
        if (this.overclockCharge >= this.overclockMaxCharge) {
            this.overclockCharge = this.overclockMaxCharge;
        }
        
        console.log(`Overclock charge: ${this.overclockCharge}/${this.overclockMaxCharge}`);
    }
    
    canActivateOverclock() {
        return !this.isOverclocked && this.overclockCharge >= this.overclockMaxCharge;
    }
      activateOverclock() {
        if (!this.canActivateOverclock()) return false;
        
        this.isOverclocked = true;
        this.overclockTimer = this.overclockDuration;
        this.overclockCharge = 0; // Reset charge after use
        
        // Apply Overclock bonuses to weapon
        if (this.weapon) {
            this.weapon.applyOverclock(this.overclockMultipliers);
        }
        
        console.log('OVERCLOCK ACTIVATED! Neural systems enhanced!');
        return true; // Return true to indicate overclock was activated
    }
    
    deactivateOverclock() {
        this.isOverclocked = false;
        this.overclockTimer = 0;
        
        // Remove Overclock bonuses from weapon
        if (this.weapon) {
            this.weapon.removeOverclock();
        }
        
        console.log('Overclock deactivated. Systems returning to normal.');
    }
    
    onKill() {
        // Called when player kills an enemy
        this.addOverclockCharge(this.overclockChargePerKill);
    }
    
    // Apply upgrade effects to player stats
    applyUpgradeEffects(effects) {
        // Apply damage multiplier to weapon
        if (effects.damageMultiplier !== undefined) {
            this.weapon.baseDamage = Math.round(this.weapon.baseDamage * effects.damageMultiplier);
            // Also update current damage if not overclocked
            if (!this.weapon.isOverclocked) {
                this.weapon.damage = this.weapon.baseDamage;
            }
        }
        
        // Apply fire rate multiplier to weapon
        if (effects.fireRateMultiplier !== undefined) {
            this.weapon.baseFireRate = this.weapon.baseFireRate * effects.fireRateMultiplier;
            // Also update current fire rate if not overclocked
            if (!this.weapon.isOverclocked) {
                this.weapon.fireRate = this.weapon.baseFireRate;
            }
        }
        
        // Apply overclock charge multiplier
        if (effects.overclockChargeMultiplier !== undefined) {
            this.overclockChargePerKill = Math.round(this.baseOverclockChargePerKill * effects.overclockChargeMultiplier);
        }
        
        // Apply dash cooldown multiplier
        if (effects.dashCooldownMultiplier !== undefined) {
            this.dashCooldown = this.baseDashCooldown * effects.dashCooldownMultiplier;
        }
        
        // Apply dash distance multiplier (affects dash speed)
        if (effects.dashDistanceMultiplier !== undefined) {
            this.dashSpeed = this.baseDashSpeed * effects.dashDistanceMultiplier;
        }
        
        // Apply bullet piercing to weapon
        if (effects.bulletPiercing !== undefined && effects.bulletPiercing > 0) {
            this.weapon.piercing = effects.bulletPiercing;
        }
        
        console.log(`🔧 Player stats updated:`, {
            damage: this.weapon.damage,
            fireRate: this.weapon.fireRate,
            dashCooldown: this.dashCooldown,
            overclockChargePerKill: this.overclockChargePerKill,
            piercing: this.weapon.piercing || 0
        });
    }
    
    // Reset all player stats to base values
    resetUpgradeEffects() {
        // Reset weapon stats
        this.weapon.damage = this.weapon.baseDamage;
        this.weapon.fireRate = this.weapon.baseFireRate;
        this.weapon.piercing = 0;
        
        // Reset dash stats
        this.dashCooldown = this.baseDashCooldown;
        this.dashSpeed = this.baseDashSpeed;
        
        // Reset overclock stats
        this.overclockChargePerKill = this.baseOverclockChargePerKill;
        
        console.log('🔄 Player stats reset to base values');
    }
    
    shoot() {
        const currentTime = Date.now();
        const bullet = this.weapon.shoot(this.x, this.y, this.aimDirection, currentTime);
        if (bullet) {
            this.bullets.push(bullet);
        }
    }
    
    updateBullets(deltaTime) {
        // Update all bullets
        for (let bullet of this.bullets) {
            bullet.update(deltaTime);
        }
        
        // Remove inactive bullets
        this.bullets = this.bullets.filter(bullet => bullet.active);
    }
    
    takeDamage(damage) {
        if (this.invulnerable) return false;
        
        this.health -= damage;
        this.health = Math.max(0, this.health); // Don't go below 0
        
        // Start invulnerability period
        this.invulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityDuration;
        
        // Start flash effect
        this.isFlashing = true;
        this.flashTimer = 0.2; // Flash for 0.2 seconds
        
        console.log(`Player took ${damage} damage! Health: ${this.health}/${this.maxHealth}`);
        
        return this.health <= 0; // Return true if player died
    }
    
    heal(amount) {
        this.health += amount;
        this.health = Math.min(this.maxHealth, this.health); // Don't exceed max health
    }
    
    isDead() {
        return this.health <= 0;
    }

    // Glitch effect system (for Syntax Breaker enemy)
    updateGlitchEffect(deltaTime) {
        if (this.isGlitched) {
            this.glitchTimer -= deltaTime;
            this.glitchVisualTimer += deltaTime;
            
            if (this.glitchTimer <= 0) {
                this.isGlitched = false;
                this.glitchTimer = 0;
                this.glitchVisualTimer = 0;
                console.log('Player glitch effect ended');
            }
        }
    }

    applyGlitchEffect(duration = 1.0, intensity = 0.5) {
        this.isGlitched = true;
        this.glitchTimer = duration;
        this.glitchIntensity = intensity;
        this.glitchVisualTimer = 0;
        console.log(`Player glitched! Duration: ${duration}s, Intensity: ${intensity}`);
    }

    // Modify movement input when glitched
    getGlitchedMovement(originalMovement) {
        if (!this.isGlitched) return originalMovement;

        // Apply control scrambling based on glitch intensity
        const scrambleChance = this.glitchIntensity;
        const time = this.glitchVisualTimer;
        
        // Random control inversions and scrambling
        let x = originalMovement.x;
        let y = originalMovement.y;

        // Periodic control scrambling
        if (Math.sin(time * 8) > (1 - scrambleChance)) {
            // Invert controls randomly
            if (Math.random() < 0.5) x = -x;
            if (Math.random() < 0.5) y = -y;
        }

        // Random direction swapping
        if (Math.sin(time * 12) > (1 - scrambleChance * 0.8)) {
            [x, y] = [y, x]; // Swap X and Y
        }

        // Add jitter
        const jitterAmount = scrambleChance * 0.3;
        x += (Math.random() - 0.5) * jitterAmount;
        y += (Math.random() - 0.5) * jitterAmount;

        return { x, y };
    }

    render(ctx) {
        // Draw dash trail first (behind player)
        this.renderDashTrail(ctx);
        
        // Draw Overclock effects first (behind player)
        if (this.isOverclocked) {
            this.renderOverclockEffects(ctx);
        }
        
        // Choose color based on state
        let currentColor = this.color;
        let glowColor = '#00ffff';
        let glowIntensity = 0;
        
        // Set different colors and glows based on player state
        if (this.isFlashing) {
            currentColor = this.damageColor;
            glowColor = '#ff0000';
            glowIntensity = 15;
        } else if (this.invulnerable) {
            // Flicker effect during invulnerability with semi-transparency
            const flickerRate = 10; // flickers per second
            const flickerTime = Date.now() / 1000;
            if (Math.floor(flickerTime * flickerRate) % 2 === 0) {
                currentColor = 'rgba(255, 255, 255, 0.3)';
                glowColor = '#ffffff';
                glowIntensity = 10;
            }
        } else if (this.isOverclocked) {
            // Special Overclock color and glow
            currentColor = 'rgba(255, 0, 255, 0.4)'; // Semi-transparent magenta
            glowColor = '#ff00ff';
            glowIntensity = 25;
            
            // Add pulsing effect during Overclock
            const pulseRate = 3; // pulses per second
            const pulseTime = Date.now() / 1000;
            const pulseFactor = 0.5 + 0.5 * Math.sin(pulseTime * Math.PI * 2 * pulseRate);
            glowIntensity = 15 + 15 * pulseFactor;
        } else if (this.isGlitched) {
            // Glitch effect color with erratic flickering
            const glitchColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
            const glitchIndex = Math.floor(this.glitchVisualTimer * 20) % glitchColors.length;
            currentColor = glitchColors[glitchIndex].replace('#', 'rgba(').replace(')', ', 0.4)');
            glowColor = glitchColors[glitchIndex];
            glowIntensity = 15 + Math.random() * 10;
        } else if (this.isDashing) {
            // Special dash color with glow
            currentColor = 'rgba(0, 255, 255, 0.4)'; // Semi-transparent cyan
            glowColor = '#00ffff';
            glowIntensity = 20;
        }

        if (this.spriteLoaded) {
            // Create a temporary canvas to handle the sprite coloring
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.spriteSize;
            tempCanvas.height = this.spriteSize;
            const tempCtx = tempCanvas.getContext('2d');

            // Draw the sprite on the temp canvas
            tempCtx.drawImage(
                this.sprite,
                0,
                0,
                this.spriteSize,
                this.spriteSize
            );

            // If we need to apply a color overlay
            if (currentColor !== this.color) {
                // Use source-in to only color the non-transparent pixels
                tempCtx.globalCompositeOperation = 'source-in';
                tempCtx.fillStyle = currentColor;
                tempCtx.fillRect(0, 0, this.spriteSize, this.spriteSize);
            }

            // Apply glow effect if needed
            if (glowIntensity > 0) {
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = glowIntensity;
            }

            // Save context for rotation
            ctx.save();
            
            // Move to player position and rotate to face aim direction
            ctx.translate(this.x, this.y);
            ctx.rotate(this.aimDirection + Math.PI / 2); // Add PI/2 to align sprite properly

            // Draw the processed sprite
            ctx.drawImage(
                tempCanvas,
                -this.spriteSize / 2,
                -this.spriteSize / 2,
                this.spriteSize,
                this.spriteSize
            );

            // Restore context
            ctx.restore();
        } else {
            // Fallback to circle if sprite isn't loaded
            ctx.fillStyle = currentColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw glitch effects
        if (this.isGlitched) {
            this.renderGlitchEffects(ctx);
        }

        // Reset shadow
        ctx.shadowBlur = 0;

        // Render bullets
        for (let bullet of this.bullets) {
            bullet.render(ctx);
        }
    }
    
    renderOverclockEffects(ctx) {
        // Draw energy rings around player during Overclock
        const time = Date.now() / 1000;
        const ringCount = 3;
        
        for (let i = 0; i < ringCount; i++) {
            const ringRadius = this.radius + 15 + i * 8;
            const rotationSpeed = 2 + i * 0.5; // Different speeds for each ring
            const rotation = time * rotationSpeed * (i % 2 === 0 ? 1 : -1); // Alternating directions
            
            // Draw energy ring segments
            const segmentCount = 8;
            const segmentLength = Math.PI / 6; // Arc length of each segment
            
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 10;
            
            for (let j = 0; j < segmentCount; j++) {
                const segmentAngle = (j / segmentCount) * Math.PI * 2 + rotation;
                const startAngle = segmentAngle - segmentLength / 2;
                const endAngle = segmentAngle + segmentLength / 2;
                
                ctx.beginPath();
                ctx.arc(this.x, this.y, ringRadius, startAngle, endAngle);
                ctx.stroke();
            }
        }
        
        // Draw energy particles
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const particleAngle = (i / particleCount) * Math.PI * 2 + time * 3;
            const particleDistance = this.radius + 25 + 10 * Math.sin(time * 4 + i);
            const particleX = this.x + Math.cos(particleAngle) * particleDistance;
            const particleY = this.y + Math.sin(particleAngle) * particleDistance;
            
            ctx.fillStyle = '#ff00ff';
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
    }
    
    renderDashTrail(ctx) {
        if (this.dashTrail.length === 0) return;
        
        // Draw trail segments
        for (let i = 0; i < this.dashTrail.length; i++) {
            const trail = this.dashTrail[i];
            const size = this.radius * (0.3 + trail.alpha * 0.7); // Shrinking trail
            
            ctx.globalAlpha = trail.alpha * 0.6;
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1.0; // Reset alpha
    }
    
    renderGlitchEffects(ctx) {
        // Draw scrambled lines and data corruption effects
        const time = this.glitchVisualTimer;
        const intensity = this.glitchIntensity;
        
        // Random glitch lines
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 8; i++) {
            if (Math.random() < intensity) {
                const angle = Math.random() * Math.PI * 2;
                const length = 10 + Math.random() * 15;
                const startX = this.x + (Math.random() - 0.5) * this.radius * 2;
                const startY = this.y + (Math.random() - 0.5) * this.radius * 2;
                const endX = startX + Math.cos(angle) * length;
                const endY = startY + Math.sin(angle) * length;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        
        // Digital corruption squares
        ctx.fillStyle = '#ff0000';
        for (let i = 0; i < 6; i++) {
            if (Math.random() < intensity * 0.7) {
                const size = 2 + Math.random() * 4;
                const offsetX = (Math.random() - 0.5) * this.radius * 2.5;
                const offsetY = (Math.random() - 0.5) * this.radius * 2.5;
                
                ctx.fillRect(this.x + offsetX, this.y + offsetY, size, size);
            }
        }
        
        // Distortion effect around player
        const distortionRadius = this.radius + 5;
        const segments = 16;
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < segments; i++) {
            if (Math.random() < intensity * 0.5) {
                const angle = (i / segments) * Math.PI * 2;
                const jitter = (Math.random() - 0.5) * 8;
                const radius = distortionRadius + jitter;
                const x = this.x + Math.cos(angle) * radius;
                const y = this.y + Math.sin(angle) * radius;
                
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
    
    setSpeedMultiplier(multiplier) {
        this.speedMultiplier = multiplier;
        this.speed = this.baseSpeed * this.speedMultiplier;
        console.log(`🏃 Player speed adjusted: ${Math.round(this.speed)} (${Math.round(this.speedMultiplier * 100)}% of base)`);
    }
}
