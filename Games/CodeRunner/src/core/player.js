/**
 * Player - Digital Explorer character
 */

import { GAME_CONFIG, COLORS, TILE_TYPES } from '../utils/constants.js';

// Creative death messages for game over screen
const DEATH_MESSAGES = [
    "Disconnected from reality.",
    "Packet lost... forever.",
    "NullPointerException: Skill not found.",
    "You ran into a bug. The bug won.",
    "Next time, try dodging... just a thought.",
    "404: Survival not found.",
    "Too slow for the code flow.",
    "You glitched so hard, even the error log gave up.",
    "Firewall 1, You 0.",
    "Oops. You tried to divide by zero.",
    "Memory overflow. Game crashed. You included.",
    "Timeline corrupted. Reboot necessary.",
    "You have been soft-deleted.",
    "Speed: fast. Reflexes: not so much.",
    "Nice try. Still trash though.",
    "That trap had your IP address.",
    "You got out-coded.",
    "You're not a bug... you're just bad.",
    "Sent to the recycle bin."
];

export class Player {
    constructor(x, y, game = null, upgrades = null) {
        // Validate and sanitize input parameters
        if (isNaN(x) || x === null || x === undefined) {
            console.warn('Invalid x position provided to Player constructor:', x);
            x = 0;
        }
        if (isNaN(y) || y === null || y === undefined) {
            console.warn('Invalid y position provided to Player constructor:', y);
            y = 256;
        }
        if (game && typeof game !== 'object') {
            console.warn('Invalid game object provided to Player constructor:', game);
            game = null;
        }
        if (upgrades && typeof upgrades !== 'object') {
            console.warn('Invalid upgrades object provided to Player constructor:', upgrades);
            upgrades = null;
        }
        
        this.x = x;
        this.y = y;
        this.startX = x; // Store initial starting position for distance calculation
        this.game = game; // Add reference to game for score updates and upgrade system
          // Ensure width and height are properly set with fallbacks
        // Make hitbox slightly smaller than sprite for better gameplay
        this.width = (GAME_CONFIG.PLAYER_WIDTH || 28) - 4; // Reduce width by 4px (28 -> 24)
        this.height = (GAME_CONFIG.PLAYER_HEIGHT || 44) - 6; // Reduce height by 6px (44 -> 38)
          // Validate dimensions
        if (!this.width || !this.height) {
            this.width = 24; // Smaller default width
            this.height = 38; // Smaller default height
        }
        
        // Apply upgrade bonuses
        this.upgrades = upgrades || { jumpHeight: 0, scoreMultiplier: 1.0, powerUpDuration: 0 };
        this.baseJumpPower = GAME_CONFIG.JUMP_POWER;
        this.jumpPower = this.baseJumpPower + this.upgrades.jumpHeight; // More positive = higher jump (fixed)        // Shop upgrade properties
        this.shopUpgrades = {
            // Movement upgrades
            speedBoost: false,
            doubleJump: false,            airBoostLevel: 0,       // 0 = none, 1 = level 1, 2 = level 2
            dash: true,             // Basic dash ability enabled by default
            dashModuleLevel: 0,     // 0 = none, 1-3 = dash levels
            extraHealth: 0,
            
            // Score & Data Pack upgrades
            datapackMultiplier: 1.0,
            scoreMultiplier: 1.0,
            comboBonus: 1.0,
            streakSaver: false,
            
            // Game-changing mechanics
            allyDrone: false,
            extraLane: false,
            
            // Revive/Retry upgrades
            secondChance: false,            rewind: false
        };        // Dash system properties
        this.dashState = {
            isDashing: false,
            dashCooldown: 0,
            dashDuration: 0,
            dashDirection: 0,
            dashSpeed: 0,
            initialDashSpeed: 0,
            dashDecelerationRate: 0.92 // How fast the dash decelerates (0.92 = 8% reduction per frame)
        };

        // Dash visual effects system
        this.dashEffects = {
            particles: [],
            trailPositions: [],
            maxTrailLength: 8,
            effectIntensity: 1.0,
            glowIntensity: 0
        };
        
        this.vx = 0;
        this.vy = 0;
        this.onGround = true; // Start on ground to prevent immediate falling
        this.isJumping = false;
        this.isPressingDown = false;        // Optimized jump state tracking
        this.jumpState = {
            wasPressed: false,        // Previous frame jump key state
            justPressed: false,       // Jump key pressed this frame
            doubleJumpAvailable: true, // Can perform double jump
            airTime: 0,              // Time spent in air (for coyote time)
            lastJumpTime: 0,         // Last time jump was performed
            inputBuffer: 0           // Input buffer for responsive controls
        };
        
        this.health = GAME_CONFIG.PLAYER_HEALTH + this.shopUpgrades.extraHealth;
        this.maxHealth = this.health;
        this.isInvulnerable = true; // Start invulnerable to prevent spawn deaths
        this.invulnerabilityTime = 2000; // 2 second spawn protection
        
        this.lastHitTime = 0;
        this.spawnProtectionFrames = 60; // Additional frame-based protection (1 second at 60fps)
        
        this.facingDirection = 1; // 1 = right, -1 = left
        this.damageTexts = [];

        // Initialize single sprite image object
        this.sprite = new Image();
        // Set up image load event
        this.sprite.onload = () => {
            this.spriteLoaded = true;
        };
        this.sprite.onerror = (error) => {
            this.spriteLoaded = false;
        };
        
        // Load a single running sprite instead of animations
        this.loadSingleSprite();
    }
    
    /**
     * Load a single running sprite for the main character
     */
    loadSingleSprite() {
        // Load the selected sprite from profile manager (if available) or use default
        this.loadSelectedSprite();
    }
    
    update(deltaTime, inputKeys, world, physicsEngine) {
        try {
            // Validate input parameters
            if (!deltaTime || isNaN(deltaTime) || deltaTime <= 0) {
                console.warn('Invalid deltaTime provided to Player.update:', deltaTime);
                deltaTime = 16.67; // Default to 60fps frame time
            }
            if (!inputKeys || typeof inputKeys !== 'object') {
                console.warn('Invalid inputKeys provided to Player.update:', inputKeys);
                inputKeys = {}; // Default to empty object
            }
            
            const deltaSeconds = deltaTime / 1000;
        
        this.updateHealthSystem(deltaTime);
        this.updateDamageTexts(deltaTime);
        
        // Decrement spawn protection frames
        if (this.spawnProtectionFrames > 0) {
            this.spawnProtectionFrames--;
        }
        
        // CRITICAL FIX: Update physics FIRST to ensure ground state is correct before processing jump input
        // This prevents the race condition where double jump reset happens after input processing
        this.updateMovement(deltaSeconds, inputKeys);
        this.updatePhysics(deltaSeconds, physicsEngine);
        
        // Process jump input AFTER physics update to ensure correct ground state
        this.updateJumping(inputKeys, deltaTime);
          // Update dash system
        this.updateDash(deltaTime);
        
        // Update dash visual effects
        this.updateDashEffects(deltaTime);          this.isPressingDown = inputKeys.down;

        // Disable drop-through platforms during quantum dash
        if (this.isPressingDown && this.onGround && world && !this.quantumDashActive) {
            const collision = physicsEngine.checkCollision(this.x, this.y + 1, this.width, this.height, 1, false);
            if (collision.collision && collision.tileType === TILE_TYPES.PLATFORM) {
                this.vy = 50;
                this.onGround = false;
            }
        }// Check for collectibles
        if (physicsEngine && this.game) {
            const collected = physicsEngine.checkCollectibles(this.x, this.y, this.width, this.height, this.game);
            if (collected.length > 0) {
            this.handleCollectibles(collected);
            }
        }
          if (physicsEngine) {
            // Calculate game time in seconds for consistent laser timing
            const gameTime = this.game && this.game.startTime ? 
                (Date.now() - this.game.startTime) / 1000 : 
                this.animationTime / 1000;
                
            const hazard = physicsEngine.checkHazards(this, gameTime);
            
            if (hazard.hazard) {
                if (this.spawnProtectionFrames > 0) {
                    // Spawn protection active - ignore hazard
                } else {
                    this.handleHazard(hazard);
                }
            }
        }
        
        } catch (error) {
            console.error('Error in Player.update:', error);
            // Reset player to safe state if update fails
            this.x = Math.max(0, this.x || 64);
            this.y = Math.max(0, this.y || 276);
            this.vx = 0;
            this.vy = 0;
        }
    }
    
    updateMovement(deltaSeconds, inputKeys) {
        // Disable movement during quantum dash or regular dash
        if (this.quantumDashActive || this.dashState.isDashing) {
            // Stop the player completely during quantum dash, but allow dash movement during regular dash
            if (this.quantumDashActive) {
                this.vx = 0;
            }
            return;
        }
        
        let moveInput = 0;
        
        if (inputKeys.left) moveInput -= 1;
        if (inputKeys.right) moveInput += 1;
        
        // Apply movement speed with speed boost multiplier
        const speedMultiplier = this.shopUpgrades.speedBoost ? 1.3 : 1.0; // Increased speed boost effect
        const maxSpeed = GAME_CONFIG.MOVE_SPEED * speedMultiplier;
          if (moveInput !== 0) {
            // Update facing direction based on movement
            if (moveInput > 0) {
                this.facingDirection = 1;  // Facing right
            } else if (moveInput < 0) {
                this.facingDirection = -1; // Facing left
            }            
            // Frame-rate independent smooth movement for 60fps feel
            const targetVelocity = moveInput * maxSpeed;
            const velocityDiff = targetVelocity - this.vx;
            
            // Use faster acceleration for more responsive movement
            const accelerationFactor = this.onGround ? GAME_CONFIG.ACCELERATION : GAME_CONFIG.AIR_ACCELERATION;
            const maxChange = accelerationFactor * deltaSeconds;
            
            if (Math.abs(velocityDiff) <= maxChange) {
                this.vx = targetVelocity;
            } else {
                this.vx += Math.sign(velocityDiff) * maxChange;
            }
        } else {
            // Apply instant deceleration when no input (no sliding)
            this.vx = 0;
        }
        
        // Ensure velocity doesn't exceed maximum
        this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));
    }
    
    updateJumping(inputKeys, deltaTime) {
        // Disable jumping and dash during quantum dash
        if (this.quantumDashActive) {
            return;
        }
        
        const jumpPressed = inputKeys.space || inputKeys.up;
        
        // Handle simple dash - triggered by Shift key when basic dash upgrade is available
        if (this.shopUpgrades.dash && inputKeys.shift && this.dashState.dashCooldown <= 0 && !this.dashState.isDashing) {
            this.performSimpleDash();
        }
        
        // Handle dash module - triggered by Shift key
        if (this.shopUpgrades.dashModuleLevel > 0 && inputKeys.shift && 
            this.dashState.dashCooldown <= 0 && !this.dashState.isDashing) {
            this.handleDashInput(deltaTime);
            return; // Don't process jump when dash is triggered
        }        // Update jump state efficiently
        this.jumpState.justPressed = jumpPressed && !this.jumpState.wasPressed;
        this.jumpState.wasPressed = jumpPressed;
        
        // Add input to buffer when jump is pressed (for both ground and air)
        if (this.jumpState.justPressed) {
            this.jumpState.inputBuffer = 150; // 150ms buffer for responsive controls
            console.debug(`Jump input detected - onGround: ${this.onGround}, airTime: ${this.jumpState.airTime}ms`);
        }
        
        // Update input buffer countdown
        if (this.jumpState.inputBuffer > 0) {
            this.jumpState.inputBuffer -= deltaTime;
        }
        
        // Process buffered jumps
        const hasBufferedJump = this.jumpState.inputBuffer > 0;
        
        if (hasBufferedJump && this.onGround) {
            // Ground jump - immediate execution when on ground
            this.performJump();
            this.jumpState.inputBuffer = 0; // Consume the buffered input
        } else if (hasBufferedJump && !this.onGround) {
            // Check for double jump availability (either basic double jump or air boost)
            const hasDoubleJump = this.shopUpgrades.doubleJump || this.shopUpgrades.airBoostLevel > 0;
            
            if (hasDoubleJump && this.jumpState.doubleJumpAvailable) {
                // Double jump - only if available this air session
                const success = this.performDoubleJump();
                if (success) {
                    this.jumpState.inputBuffer = 0; // Only consume input if jump was successful
                }
            } else if (this.jumpState.airTime < 100) {
                // Coyote time - 100ms grace period for late jumps
                this.performJump();
                this.jumpState.inputBuffer = 0; // Consume the buffered input
            }
        }
          // Track air time for coyote time using actual frame time
        if (!this.onGround) {            this.jumpState.airTime += deltaTime;
        } else {
            // Reset air time immediately when landing
            this.jumpState.airTime = 0;
        }
    }
    
    /**
     * Perform regular jump with consistent mechanics
     */
    performJump() {
        // Play jump sound
        if (this.game && this.game.audioSystem) {
            this.game.audioSystem.onJump();
        }
        
        this.vy = this.jumpPower;
        this.onGround = false;
        this.isJumping = true;
        this.jumpState.airTime = 0;
        
        return true;
    }
    
    updatePhysics(deltaSeconds, physicsEngine) {
        if (!this.onGround) {
            // Normal gravity
            this.vy += GAME_CONFIG.GRAVITY * deltaSeconds;
            
            if (this.vy > GAME_CONFIG.MAX_FALL_SPEED) {
                this.vy = GAME_CONFIG.MAX_FALL_SPEED;
            }
        }
        
        if (physicsEngine) {
            physicsEngine.handleHorizontalMovement(this, deltaSeconds);
            physicsEngine.handleVerticalMovement(this, deltaSeconds);
        }
        
        // Check for NaN values and reset if detected
        if (isNaN(this.x) || isNaN(this.y) || isNaN(this.vx) || isNaN(this.vy)) {
            // Reset position to proper spawn position (not hardcoded 300)
            this.x = isNaN(this.x) ? 64 : this.x; // Safe spawn x
            this.y = isNaN(this.y) ? 276 : this.y; // Proper spawn y (320 - 44)
            this.vx = isNaN(this.vx) ? 0 : this.vx;
            this.vy = isNaN(this.vy) ? 0 : this.vy;
        }
    }
    
    updateHealthSystem(deltaTime) {
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
            if (this.invulnerabilityTime < 0) {
                this.invulnerabilityTime = 0;
            }
        }
    }
    
    updateDamageTexts(deltaTime) {
        for (let i = this.damageTexts.length - 1; i >= 0; i--) {
            const text = this.damageTexts[i];
            text.lifetime -= deltaTime;
            text.y -= 50 * (deltaTime / 1000);
            text.opacity = Math.max(0, text.lifetime / text.maxLifetime);
            
            if (text.lifetime <= 0) {
                this.damageTexts.splice(i, 1);
            }
        }
    }

    handleHazard(hazard) {
        switch (hazard.type) {
            case 'spike':
                this.takeDamage(1, "spikes");
                break;
            case 'saw':
                this.takeDamage(1, "saw blade");
                break;            case 'laser':
                this.takeDamage(1, "laser beam");
                break;
            case 'crusher':
                this.takeDamage(2, "crusher"); // Crushers do more damage
                break;            case 'fall':
                this.takeDamage(this.health, "fell into the digital void");
                break;
            case 'outOfBounds':
                this.takeDamage(this.health, "lost in the data stream");
                break;
        }
    }
    
    takeDamage(amount, source) {
        console.log(`💥 takeDamage called: amount=${amount}, source=${source}`);
        console.log(`🔍 Current health: ${this.health}`);
        console.log(`🔍 Invulnerability time: ${this.invulnerabilityTime}`);
        
        if (this.invulnerabilityTime > 0) {
            console.log(`🛡️ Damage blocked by invulnerability frames`);
            return;
        }
        
        // Check if player is in quantum dash (invulnerable)
        if (this.quantumDashActive) {
            console.log('⚡ Damage blocked by Quantum Dash invulnerability!');
            return;
        }
        
        // Check if player has shield powerup active
        if (this.game && this.game.powerUpSystem) {
            const shieldResult = this.game.powerUpSystem.onPlayerDamage();
            if (shieldResult.absorbed) {
                console.log('🛡️ Shield absorbed damage in takeDamage - returning early');
                
                // Grant invulnerability frames if the shield requests it
                if (shieldResult.grantInvulnerability) {
                    console.log('🛡️ Granting invulnerability frames after shield absorption');
                    this.invulnerabilityTime = GAME_CONFIG.INVULNERABILITY_DURATION;
                    this.lastDamageTime = Date.now();
                }
                
                return;
            }
        }
        
        console.log(`💔 No protection active - applying ${amount} damage`);
        this.health -= amount;
        console.log(`💔 Health after damage: ${this.health}`);
        this.invulnerabilityTime = GAME_CONFIG.INVULNERABILITY_DURATION;
        this.lastDamageTime = Date.now();
        
        // Trigger screen shake on damage
        if (this.game && this.game.triggerScreenShake) {
            this.game.triggerScreenShake(0.5, 200); // Medium shake for damage
        }
        
        this.damageTexts.push({
            text: `-${amount}`,
            x: this.x + this.width / 2,
            y: this.y,
            lifetime: 1500,
            maxLifetime: 1500,
            opacity: 1,
            color: '#ff4444'
        });
          if (this.health <= 0) {
            console.log(`💀 Health <= 0, calling die(${source})`);
            this.die(source);
        } else if (this.health === 1 && this.game && this.game.tutorialSystem) {
            // Show low health hint when player has only 1 health left
            this.game.tutorialSystem.showLowHealthHint();
        }
    }

    die(reason) {
        // Trigger strong screen shake on death
        if (this.game && this.game.triggerScreenShake) {
            this.game.triggerScreenShake(1.5, 500); // Strong shake for death
        }
        
        if (this.game) {
            this.game.gameOver(reason);
        }
    }

    /**
     * Create a floating heal text indicator
     */
    createHealText(amount) {
        this.damageTexts.push({
            text: `+${amount} ❤️`,
            x: this.x + this.width / 2,
            y: this.y,
            lifetime: 1500,
            maxLifetime: 1500,
            opacity: 1,
            color: 'heal'
        });
    }
    
    /**
     * Handle collected items (data packets, etc.)
     */
    handleCollectibles(collected) {
        for (const item of collected) {
            if (item.type === 'dataPacket') {
                // Play collection sound
                if (this.game && this.game.audioSystem) {
                    this.game.audioSystem.onCollect();
                }
                
                // Add score when collecting data packet
                if (this.game) {
                    this.game.score += 10;
                    console.log(`📦 Data packet collected! +10 score (Total: ${this.game.score})`);
                }
                
                // Create collection effect
                this.createCollectionEffect(item.worldX, item.worldY, item.points);
                
                // Create floating text showing data packets gained
                this.createDataPacketText(item.points, item.worldX, item.worldY);
            }
        }
    }
      /**
     * Create visual effect for item collection
     */
    createCollectionEffect(worldX, worldY, points) {
        // Create sparkle effect using damage text system
        this.damageTexts.push({
            text: '✨',
            x: worldX + 16,
            y: worldY + 16,
            lifetime: 800,
            maxLifetime: 800,
            opacity: 1,
            color: points > 1 ? '#9333ea' : '#10b981' // Purple for corrupted, green for normal
        });
    }
      /**
     * Create floating score text
     */
    createScoreText(scoreGain, worldX, worldY) {
        this.damageTexts.push({
            x: worldX + 16,
            y: worldY,
            vx: 0,
            vy: -30,
            text: `+${scoreGain}`,
            color: '#10b981',
            lifetime: 1500,
            maxLifetime: 1500,
            size: 14
        });
    }

    /**
     * Create floating data packet text
     */
    createDataPacketText(dataPackets, worldX, worldY) {
        this.damageTexts.push({
            x: worldX + 16,
            y: worldY,
            vx: 0,
            vy: -30,
            text: `+${dataPackets} 💾`,
            color: '#58a6ff',
            lifetime: 1500,
            maxLifetime: 1500,
            size: 14
        });
    }
    
    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Get graphics quality from game
        const graphicsQuality = this.game?.graphicsQuality || 'medium';
        
        // Draw dash effects behind the player with quality-based enhancements
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        this.drawDashEffects(ctx, graphicsQuality);
        ctx.restore();
        
        // Draw main player body with quality-based effects
        this.drawPlayerBody(ctx, screenX, screenY, graphicsQuality);
        
        // Draw additional visual effects based on quality
        if (graphicsQuality === 'high') {
            this.drawHighQualityEffects(ctx, screenX, screenY, camera);
        }
        
        // Draw damage text
        this.drawDamageTexts(ctx, camera);
    }
    
    drawPlayerBody(ctx, screenX, screenY, graphicsQuality = 'medium') {
        // Check if player is invulnerable and should flash
        const isFlashing = this.invulnerabilityTime > 0 && Math.floor(Date.now() / 100) % 2 === 0;
        
        // Check for quantum dash special effects
        const isQuantumDashing = this.quantumDashActive || false;
        
        // Add subtle animation bob when moving (enhanced for high quality)
        const isRunning = this.onGround && Math.abs(this.vx) > 10;
        const bobIntensity = graphicsQuality === 'high' ? 2 : graphicsQuality === 'medium' ? 1 : 0.5;
        const bob = isRunning ? Math.sin(Date.now() * 0.01) * bobIntensity : 0;
        const finalY = screenY + bob;
        
        // Apply quantum dash visual effects with quality scaling
        if (isQuantumDashing) {
            ctx.save();
            
            switch (graphicsQuality) {
                case 'low':
                    ctx.globalAlpha = 0.9;
                    break;
                case 'medium':
                    ctx.globalAlpha = 0.8;
                    ctx.shadowColor = '#64c8ff';
                    ctx.shadowBlur = 8;
                    break;
                case 'high':
                    ctx.globalAlpha = 0.8;
                    ctx.shadowColor = '#64c8ff';
                    ctx.shadowBlur = 15;
                    ctx.filter = 'drop-shadow(0 0 10px #64c8ff) hue-rotate(200deg)';
                    break;
            }
        }
        
        // Add ambient glow for medium and high quality
        if ((graphicsQuality === 'medium' || graphicsQuality === 'high') && !isQuantumDashing) {
            ctx.save();
            ctx.shadowColor = 'rgba(100, 200, 255, 0.3)';
            ctx.shadowBlur = graphicsQuality === 'high' ? 6 : 3;
        }
        
        // Use sprite if loaded, otherwise fallback to pixel art
        if (this.spriteLoaded && this.sprite && this.sprite.src) {
            // Use the single sprite image
            this.drawSpriteImage(ctx, screenX, finalY, isFlashing);        
        } else {
            // Fallback to original pixel art
            this.drawPixelArtFallback(ctx, screenX, finalY, isFlashing);
        }
        
        // Restore context if effects were applied
        if (isQuantumDashing || (graphicsQuality !== 'low' && !isQuantumDashing)) {
            ctx.restore();
        }
    }/**
     * Draw the player using main character animated sprites
         /**
     * Draw the player using main character animated sprites
     */
    drawMainCharacterSprite(ctx, x, y, isFlashing) {
        // Method simplified - just use the single sprite now
        this.drawSpriteImage(ctx, x, y, isFlashing);
    }

    /**
     * Draw the player using the loaded sprite image
     */
    drawSpriteImage(ctx, x, y, isFlashing) {
        // Get actual sprite dimensions
        const spriteWidth = this.sprite.width;
        const spriteHeight = this.sprite.height;
          // Scale the sprite to match the player's hitbox size while maintaining aspect ratio
        const aspectRatio = spriteWidth / spriteHeight;
        let drawWidth, drawHeight;
        
        if (aspectRatio > 1) {
            // Sprite is wider than tall
            drawWidth = this.width; // Match hitbox width
            drawHeight = this.width / aspectRatio;
        } else {
            // Sprite is taller than wide or square
            drawHeight = this.height; // Match hitbox height  
            drawWidth = this.height * aspectRatio;
        }
          // Position the sprite - center horizontally, align bottom with collision box
        const drawX = x - (drawWidth - this.width) / 2;
        const drawY = y + this.height - drawHeight; // Align bottom of sprite with bottom of collision box
        
        // Apply invulnerability flashing effect
        if (isFlashing) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.filter = 'hue-rotate(180deg) saturate(2)'; // Red tint effect
        }
        
        // Flip sprite based on facing direction
        if (this.facingDirection === -1) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(
                this.sprite,
                -drawX - drawWidth, drawY, drawWidth, drawHeight
            );
            ctx.restore();
        } else {
            ctx.drawImage(
                this.sprite,
                drawX, drawY, drawWidth, drawHeight
            );
        }
        
        if (isFlashing) {
            ctx.restore();
        }
        
        // Debug: Draw sprite bounds (remove this in production)
        if (false) { // Set to true for debugging
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 1;
            ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
        }
    }
      /**
     * Draw the player using simple pixel art (final fallback when no sprites are available)
     */
    drawPixelArtFallback(ctx, x, y, isFlashing) {
        // Apply invulnerability flashing effect
        if (isFlashing) {
            ctx.save();
            ctx.globalAlpha = 0.5;
        }
        
        // Position the pixel art player to match hitbox
        const drawX = x;
        const drawY = y;
        const drawWidth = this.width;
        const drawHeight = this.height;
        
        // Main body (dark blue/gray)
        ctx.fillStyle = '#21262d';
        ctx.fillRect(drawX + 2, drawY + 8, drawWidth - 4, drawHeight - 12);
        
        // Head (slightly lighter)
        ctx.fillStyle = '#30363d';
        ctx.fillRect(drawX + 4, drawY + 2, drawWidth - 8, 10);
        
        // Simple eyes
        ctx.fillStyle = '#58a6ff';
        ctx.fillRect(drawX + 6, drawY + 4, 2, 2);
        ctx.fillRect(drawX + drawWidth - 8, drawY + 4, 2, 2);
        
        // Body highlight
        ctx.fillStyle = '#484f58';
        ctx.fillRect(drawX + 4, drawY + 10, drawWidth - 8, 2);
        
        // Simple legs (no animation, just static)
        ctx.fillStyle = '#21262d';
        // Left leg
        ctx.fillRect(drawX + 4, drawY + drawHeight - 8, 4, 8);
        // Right leg  
        ctx.fillRect(drawX + drawWidth - 8, drawY + drawHeight - 8, 4, 8);
        
        // Simple arms
        ctx.fillStyle = '#30363d';
        ctx.fillRect(drawX + 1, drawY + 12, 3, 8);
        ctx.fillRect(drawX + drawWidth - 4, drawY + 12, 3, 8);
        
        // Border outline for definition
        ctx.strokeStyle = '#6e7681';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX + 2, drawY + 2, drawWidth - 4, drawHeight - 4);
        
        if (isFlashing) {
            ctx.restore();
        }
    }

    drawDamageTexts(ctx, camera) {
        ctx.save();
        ctx.font = 'bold 14px "SF Mono", "Monaco", "Inconsolata", "Fira Code", "Droid Sans Mono", monospace';
        ctx.textAlign = 'center';
        
        for (const damageText of this.damageTexts) {
            const screenX = damageText.x - camera.x;
            const screenY = damageText.y - camera.y;
            
            // Skip if off-screen
            if (screenX < -50 || screenX > ctx.canvas.width + 50) {
                continue;
            }
              // Set color based on type
            if (damageText.color === 'heal') {
                ctx.fillStyle = `rgba(64, 209, 88, ${damageText.opacity})`;
            } else if (typeof damageText.color === 'string' && damageText.color.startsWith('#')) {
                // Use the hex color provided
                const r = parseInt(damageText.color.slice(1, 3), 16);
                const g = parseInt(damageText.color.slice(3, 5), 16);
                const b = parseInt(damageText.color.slice(5, 7), 16);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${damageText.opacity})`;
            } else {
                // Default to red for damage
                ctx.fillStyle = `rgba(248, 81, 73, ${damageText.opacity})`;
            }
            ctx.strokeStyle = `rgba(33, 38, 45, ${damageText.opacity})`;
            ctx.lineWidth = 2;
            
            // Draw text with outline
            ctx.strokeText(damageText.text, screenX, screenY);
            ctx.fillText(damageText.text, screenX, screenY);
        }
        
        ctx.restore();
    }
    
    /**
     * Apply shop upgrade effects to player
     */
    applyShopUpgrade(upgradeId) {        // Apply shop upgrade by ID
          switch (upgradeId) {
            case 'speedBoost':
                this.shopUpgrades.speedBoost = true;
                break;            case 'doubleJump':
                this.shopUpgrades.doubleJump = true;
                break;
            case 'dash':
                this.shopUpgrades.dash = true;
                break;
            case 'healthUpgrade':
                this.shopUpgrades.extraHealth += 1;
                this.maxHealth += 1;
                this.health = Math.min(this.health + 1, this.maxHealth);
                break;            case 'datapackMultiplier':
                this.shopUpgrades.datapackMultiplier = 2.0; // Double datapack collection
                break;
            case 'scoreMultiplier':
                this.shopUpgrades.scoreMultiplier = 1.25; // +25% score gain
                break;
            case 'comboBonus':
                this.shopUpgrades.comboBonus += 0.5;
                break;
            case 'streakSaver':
                this.shopUpgrades.streakSaver = true;
                break;
            case 'allyDrone':
                this.shopUpgrades.allyDrone = true;
                break;
            case 'extraLane':
                this.shopUpgrades.extraLane = true;
                break;
            case 'secondChance':
                this.shopUpgrades.secondChance = true;
                break;
            case 'rewind':
                this.shopUpgrades.rewind = true;
                break;
            case 'airBoost1':
                this.shopUpgrades.airBoostLevel = 1;
                break;
            case 'airBoost2':
                this.shopUpgrades.airBoostLevel = 2;
                break;
            case 'dashModule1':
                this.shopUpgrades.dashModuleLevel = 1;
                break;
            case 'dashModule2':
                this.shopUpgrades.dashModuleLevel = 2;
                break;
            case 'dashModule3':
                this.shopUpgrades.dashModuleLevel = 3;
                break;
        }}    /**
     * Perform double jump with smooth animation and particle effects
     */
    performDoubleJump() {
        const hasDoubleJump = this.shopUpgrades.doubleJump || this.shopUpgrades.airBoostLevel > 0;
        
        // Multiple validation checks for double jump availability
        if (!hasDoubleJump) {
            console.debug('Double jump failed: No upgrade available');
            return false;
        }
        
        if (this.onGround) {
            console.debug('Double jump failed: Player is on ground');
            return false;
        }
        
        // Check if player has already used their double jump for this air session
        if (!this.jumpState.doubleJumpAvailable) {
            console.debug('Double jump failed: Already used this air session');
            return false;
        }
        
        // Additional safety check: ensure we're actually in the air for some minimum time
        if (this.jumpState.airTime < 50) {
            console.debug('Double jump failed: Not enough air time (possible ground state race condition)');
            return false;
        }
        
        // Play double jump sound
        if (this.game && this.game.audioSystem) {
            this.game.audioSystem.onDoubleJump();
        }
        
        // Calculate jump power based on Air Boost level
        let doubleJumpPower = this.jumpPower * 0.85; // Base double jump power
        
        if (this.shopUpgrades.airBoostLevel === 1) {
            // Level 1: 15% stronger double jump
            doubleJumpPower = this.jumpPower * 1.0;
        } else if (this.shopUpgrades.airBoostLevel === 2) {
            // Level 2: 25% stronger double jump
            doubleJumpPower = this.jumpPower * 1.1;
        }

        this.vy = doubleJumpPower;
          // Mark double jump as used for this air session
        this.jumpState.doubleJumpAvailable = false;
        
        return true;
    }    /**
     * Reset jump state when landing - optimized for performance
     */
    resetDoubleJump() {
        const wasDoubleJumpAvailable = this.jumpState.doubleJumpAvailable;
        
        this.jumpState.airTime = 0;
        this.jumpState.doubleJumpAvailable = true; // Reset double jump availability when landing
          // DO NOT clear input buffer when landing - this was causing the "jump cooldown" feeling
        // Players should be able to buffer jumps even when landing for responsive controls
        // this.jumpState.inputBuffer = 0;
        
        // Debug logging for double jump reset
        if (!wasDoubleJumpAvailable && this.jumpState.doubleJumpAvailable) {
            console.debug('Double jump reset: Now available for next air session');
        }
    }
      /**
     * Load the selected sprite from profile manager
     */
    loadSelectedSprite() {
        let selectedSprite = 'player-sprite.png'; // Default sprite
        
        console.log('🎭 Loading selected sprite...');
        console.log('🎭 ProfileManager available:', !!(typeof window !== 'undefined' && window.profileManager));
        
        // Try to get selected sprite from profile manager
        if (typeof window !== 'undefined' && window.profileManager) {
            selectedSprite = window.profileManager.getSelectedSprite();
            console.log('🎭 Sprite from ProfileManager:', selectedSprite);
          
            // Ensure we're getting a valid sprite name
            if (!selectedSprite || typeof selectedSprite !== 'string') {
                selectedSprite = 'player-sprite.png';
                console.log('🎭 Invalid sprite from ProfileManager, using default');
            }
        } else {
            // Fallback: try to get from localStorage directly
            try {
                const savedSprite = localStorage.getItem('coderunner_selected_sprite');
                if (savedSprite && typeof savedSprite === 'string') {
                    selectedSprite = savedSprite;
                    console.log('🎭 Sprite from localStorage:', selectedSprite);
                }
            } catch (error) {
                console.warn('⚠️ Failed to load sprite from localStorage:', error);
            }
            
            // If profile manager isn't ready yet, retry after a short delay
            if (typeof window !== 'undefined' && !window.profileManager) {
                console.log('🎭 ProfileManager not ready, retrying in 200ms...');
                setTimeout(() => this.loadSelectedSprite(), 200);
                return;
            }
        }
        
        // Handle different sprite paths based on the sprite name
        let spritePath;
        if (selectedSprite.startsWith('original-run-sprite') || selectedSprite.startsWith('Untitled design (13)') || selectedSprite.startsWith('Untitled design (14)')) {
            // Main Sprite folder
            spritePath = `./assets/Main Sprite/${selectedSprite}`;
        } else if (selectedSprite.startsWith('sprite_')) {
            // Buyable cosmetics folder
            spritePath = `./assets/buyable cosmetics/${selectedSprite}`;
        } else {
            // Root assets folder
            spritePath = `./assets/${selectedSprite}`;
        }
        
        console.log(`🎮 Loading sprite: ${selectedSprite} from ${spritePath}`);
        console.log(`🎮 Current sprite src: ${this.sprite.src}`);
        console.log(`🎮 Target sprite path: ${spritePath}`);
        
        // Use changeSprite to properly handle sprite loading state
        this.changeSprite(spritePath);
    }/**
     * Refresh sprite from profile manager (called when profile manager becomes available)
     */
    refreshSpriteFromProfile() {
        if (typeof window !== 'undefined' && window.profileManager) {
            const selectedSprite = window.profileManager.getSelectedSprite();
            
            if (selectedSprite && typeof selectedSprite === 'string') {
                this.changeSprite(`./assets/${selectedSprite}`);
            }
        } else {
            
        }
    }    /**
     * Change the player sprite dynamically
     */
    changeSprite(spritePath) {
       
        
        // Normalize paths for comparison (extract just the filename)
        const currentFilename = this.sprite.src ? this.sprite.src.split('/').pop() : '';
        const newFilename = spritePath ? spritePath.split('/').pop() : '';
        
        console.log(`🎮 changeSprite called with: ${spritePath}`);
        console.log(`🎮 Current sprite file: ${currentFilename}`);
        console.log(`🎮 New sprite file: ${newFilename}`);
        console.log(`🎮 Sprite already loaded: ${this.spriteLoaded}`);
        
        // Don't reload if it's the same sprite file and it's already loaded
        if (currentFilename === newFilename && this.spriteLoaded) {
            console.log(`🎮 Same sprite already loaded, skipping: ${newFilename}`);
            return;
        }
        
        const previousSrc = this.sprite.src;
        this.spriteLoaded = false;
        
        console.log(`🎮 Starting sprite load: ${spritePath}`);
          
        // Set up new load handlers
        this.sprite.onload = () => {
            this.spriteLoaded = true;
            console.log(`✅ Sprite loaded successfully: ${spritePath}`);
        };
          
        this.sprite.onerror = (error) => {
            console.error(`❌ Failed to load sprite: ${spritePath}`, error);
            this.spriteLoaded = false;
            // Try the default instead
            if (!previousSrc.endsWith('player-sprite.png')) {
                console.log(`🔄 Trying default sprite: ./assets/player-sprite.png`);
                this.sprite.src = './assets/player-sprite.png';
            }
        };
        
        console.log(`🔄 Setting sprite.src to: ${spritePath}`);
        this.sprite.src = spritePath;
    }

    /**
     * Handle dash input and initiate dash if conditions are met
     */
    handleDashInput(deltaTime) {
        // Update dash cooldown
        if (this.dashState.dashCooldown > 0) {
            this.dashState.dashCooldown -= deltaTime;
        }

        // Check if dash can be activated
        if (this.dashState.dashCooldown <= 0 && !this.dashState.isDashing) {
            this.startDash();
        }
    }

    /**
     * Start a dash with properties based on dash module level
     */
    startDash() {
        const level = this.shopUpgrades.dashModuleLevel;
        if (level === 0) return;

        // Start smooth dash with initial speed
        this.dashState.isDashing = true;
        this.dashState.dashDirection = 1; // Forward direction
        this.dashState.initialDashSpeed = 800; // Initial dash speed (pixels per second)
        this.dashState.dashSpeed = this.dashState.initialDashSpeed;
        this.dashState.dashDuration = 600; // Dash lasts 600ms max

        // Set dash cooldown based on level
        const dashProperties = {
            1: { cooldown: 7000 },  // Level 1 - 7 seconds
            2: { cooldown: 7000 },  // Level 2 - 7 seconds
            3: { cooldown: 7000 }   // Level 3 - 7 seconds
        };

        const props = dashProperties[level];
        this.dashState.dashCooldown = props.cooldown;

        // Create dash visual effects
        this.createDashParticles();

        // Play dash sound
        if (this.game && this.game.audioSystem) {
            this.game.audioSystem.onJump(); // Reuse jump sound for now
        }

        console.log(`🏃‍♂️ Started smooth dash (module level ${level})`);
    }    /**
     * Update dash state and apply dash movement
     */
    updateDash(deltaTime) {
        // Update cooldown for dash
        if (this.dashState.dashCooldown > 0) {
            this.dashState.dashCooldown -= deltaTime;
        }
        
        // Handle active dash
        if (this.dashState.isDashing) {
            // Create continuous dash particles
            this.createContinuousDashParticles();
            
            // Apply dash movement with collision checking
            const dashMovement = this.dashState.dashSpeed * (deltaTime / 1000);
            
            // Check for collision before moving
            if (this.game && this.game.physicsEngine) {
                const newX = this.x + dashMovement;
                const collision = this.game.physicsEngine.checkCollision(
                    newX, this.y, this.width, this.height, 1, false
                );
                
                if (!collision.collision) {
                    this.x = newX;
                } else {
                    // Stop dash if we hit something
                    this.dashState.isDashing = false;
                    this.dashState.dashSpeed = 0;
                }
            } else {
                // Fallback without collision checking
                this.x += dashMovement;
            }
            
            // Apply deceleration
            this.dashState.dashSpeed *= this.dashState.dashDecelerationRate;
            
            // Reduce dash duration
            this.dashState.dashDuration -= deltaTime;
            
            // End dash when speed is too low or duration expires
            if (this.dashState.dashSpeed < 50 || this.dashState.dashDuration <= 0) {
                this.dashState.isDashing = false;
                this.dashState.dashSpeed = 0;
            }
        }
    }

    /**
     * Perform simple dash (basic dash upgrade)
     */
    performSimpleDash() {
        if (!this.shopUpgrades.dash || this.dashState.dashCooldown > 0) return;

        // Start smooth dash with initial speed
        this.dashState.isDashing = true;
        this.dashState.dashDirection = 1; // Forward direction
        this.dashState.initialDashSpeed = 600; // Slower initial speed for basic dash
        this.dashState.dashSpeed = this.dashState.initialDashSpeed;
        this.dashState.dashDuration = 500; // Shorter duration for basic dash

        // Set cooldown for simple dash
        this.dashState.dashCooldown = 7000; // 7 second cooldown
        
        // Create dash visual effects
        this.createDashParticles();
        
        // Play dash sound
        if (this.game && this.game.audioSystem) {
            this.game.audioSystem.onJump(); // Reuse dash sound for now
        }

        console.log(`🏃‍♂️ Started simple smooth dash`);
    }

    /**
     * Create dash particles when dash starts
     */
    createDashParticles() {
        const particleCount = this.shopUpgrades.dashModuleLevel > 0 ? 
            8 + (this.shopUpgrades.dashModuleLevel * 4) : 6; // More particles for higher levels
        
        for (let i = 0; i < particleCount; i++) {
            this.dashEffects.particles.push({
                x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                y: this.y + this.height / 2 + (Math.random() - 0.5) * this.height,
                vx: (Math.random() - 0.5) * 200 - this.dashState.dashDirection * 100,
                vy: (Math.random() - 0.5) * 150,
                life: 1.0,
                maxLife: 300 + Math.random() * 200, // 300-500ms lifetime
                size: 2 + Math.random() * 3,
                color: this.getDashParticleColor(),
                type: Math.random() > 0.7 ? 'spark' : 'trail' // 30% sparks, 70% trail
            });
        }
        
        // Initialize trail positions
        this.dashEffects.trailPositions = [];
        this.dashEffects.glowIntensity = 1.0;
    }
    /**
     * Create continuous dash particles during dash movement
     */
    createContinuousDashParticles() {
        // Only create particles during active dash
        if (!this.dashState.isDashing) return;
        
        // Create fewer particles continuously
        const particleCount = 2 + (this.shopUpgrades.dashModuleLevel || 0);
        
        for (let i = 0; i < particleCount; i++) {
            this.dashEffects.particles.push({
                x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                y: this.y + this.height / 2 + (Math.random() - 0.5) * this.height,
                vx: (Math.random() - 0.5) * 150 - this.dashState.dashDirection * 80,
                vy: (Math.random() - 0.5) * 100,
                life: 1.0,
                maxLife: 200 + Math.random() * 100, // Shorter lifetime for continuous particles
                size: 1 + Math.random() * 2,
                color: this.getDashParticleColor(),
                type: 'trail'
            });
        }
    }

    /**
     * Get dash particle color based on upgrade level  
     */
    getDashParticleColor() {
        if (this.shopUpgrades.dashModuleLevel === 3) {
            return ['#ff6b35', '#ffd700', '#fff']; // Orange/gold/white for level 3
        } else if (this.shopUpgrades.dashModuleLevel === 2) {
            return ['#58a6ff', '#79c0ff', '#b6e3ff']; // Blue variants for level 2
        } else if (this.shopUpgrades.dashModuleLevel === 1) {
            return ['#40d158', '#7ee068', '#a5f3a5']; // Green variants for level 1
        } else {
            return ['#8b949e', '#c9d1d9', '#f0f6fc']; // Gray/white for basic dash
        }
    }

    /**
     * Update dash particles and trail effects
     */
    updateDashEffects(deltaTime) {
        // Update existing particles
        for (let i = this.dashEffects.particles.length - 1; i >= 0; i--) {
            const particle = this.dashEffects.particles[i];
            
            // Update particle position and properties
            particle.x += particle.vx * (deltaTime / 1000);
            particle.y += particle.vy * (deltaTime / 1000);
            particle.maxLife -= deltaTime;
            particle.life = Math.max(0, particle.maxLife / (300 + Math.random() * 200));
            
            // Apply gravity to particles
            particle.vy += 200 * (deltaTime / 1000);
            
            // Apply air resistance
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.dashEffects.particles.splice(i, 1);
            }
        }
        
        // Update trail positions during dash
        if (this.dashState.isDashing) {
            this.dashEffects.trailPositions.unshift({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                time: Date.now()
            });
            
            // Limit trail length
            if (this.dashEffects.trailPositions.length > this.dashEffects.maxTrailLength) {
                this.dashEffects.trailPositions.pop();
            }
            
            // Create continuous particles during dash
            if (Math.random() < 0.8) { // 80% chance per frame
                this.dashEffects.particles.push({
                    x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                    y: this.y + this.height / 2 + (Math.random() - 0.5) * this.height,
                    vx: -this.dashState.dashDirection * (50 + Math.random() * 100),
                    vy: (Math.random() - 0.5) * 50,
                    life: 1.0,
                    maxLife: 200 + Math.random() * 100,
                    size: 1 + Math.random() * 2,
                    color: this.getDashParticleColor(),
                    type: 'trail'
                });
            }
        } else {
            // Fade out trail when not dashing
            this.dashEffects.trailPositions = this.dashEffects.trailPositions.filter(pos => 
                Date.now() - pos.time < 200 // Keep trail visible for 200ms after dash
            );
        }
        
        // Update glow intensity
        if (this.dashState.isDashing) {
            this.dashEffects.glowIntensity = Math.min(1.0, this.dashEffects.glowIntensity + deltaTime / 100);
        } else {
            this.dashEffects.glowIntensity = Math.max(0, this.dashEffects.glowIntensity - deltaTime / 150);
        }
    }

    /**
     * Draw dash visual effects
     */
    drawDashEffects(ctx) {
        // Draw trail effect
        if (this.dashEffects.trailPositions.length > 1) {
            ctx.save();
            
            const gradient = ctx.createLinearGradient(
                this.dashEffects.trailPositions[0].x, this.dashEffects.trailPositions[0].y,
                this.dashEffects.trailPositions[this.dashEffects.trailPositions.length - 1].x,
                this.dashEffects.trailPositions[this.dashEffects.trailPositions.length - 1].y
            );
            
            // Create gradient based on dash level
            const colors = this.getDashParticleColor();
            gradient.addColorStop(0, `rgba(${this.hexToRgb(colors[0])}, 0.8)`);
            gradient.addColorStop(0.5, `rgba(${this.hexToRgb(colors[1])}, 0.6)`);
            gradient.addColorStop(1, `rgba(${this.hexToRgb(colors[2] || colors[1])}, 0.2)`);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 4 + (this.shopUpgrades.dashModuleLevel * 2);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            ctx.moveTo(this.dashEffects.trailPositions[0].x, this.dashEffects.trailPositions[0].y);
            
            for (let i = 1; i < this.dashEffects.trailPositions.length; i++) {
                const pos = this.dashEffects.trailPositions[i];
                ctx.lineTo(pos.x, pos.y);
            }
            
            ctx.stroke();
            ctx.restore();
        }
        
        // Draw glow effect around player during dash
        if (this.dashEffects.glowIntensity > 0) {
            ctx.save();
            const glowSize = 20 + (this.shopUpgrades.dashModuleLevel * 10);
            const colors = this.getDashParticleColor();
            
            // Create radial gradient for glow
            const gradient = ctx.createRadialGradient(
                this.x + this.width / 2, this.y + this.height / 2, 0,
                this.x + this.width / 2, this.y + this.height / 2, glowSize
            );
            
            gradient.addColorStop(0, `rgba(${this.hexToRgb(colors[0])}, ${0.3 * this.dashEffects.glowIntensity})`);
            gradient.addColorStop(0.7, `rgba(${this.hexToRgb(colors[1])}, ${0.15 * this.dashEffects.glowIntensity})`);
            gradient.addColorStop(1, `rgba(${this.hexToRgb(colors[2] || colors[1])}, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(
                this.x + this.width / 2 - glowSize, 
                this.y + this.height / 2 - glowSize,
                glowSize * 2, 
                glowSize * 2
            );
            ctx.restore();
        }
        
        // Draw particles
        ctx.save();
        for (const particle of this.dashEffects.particles) {
            const alpha = particle.life;
            const colors = particle.color;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            ctx.fillStyle = `rgba(${this.hexToRgb(color)}, ${alpha})`;
            
            if (particle.type === 'spark') {
                // Draw diamond-shaped sparks
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(Math.random() * Math.PI * 2);
                ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
                ctx.restore();
            } else {
                // Draw circular trail particles
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    /**
     * Helper function to convert hex color to RGB values
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
            '255, 255, 255';
    }
}
