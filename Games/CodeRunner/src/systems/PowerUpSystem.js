/**
 * PowerUp System - Handles powerup spawning, collection, and effects during gameplay
 */

import { GAME_CONFIG, TILE_TYPES } from '../utils/constants.js';

export class PowerUpSystem {
    constructor(game) {
        this.game = game;        this.activePowerUps = new Map(); // Track active powerup effects
        this.spawnedPowerUps = []; // Powerups currently on screen
        this.unlockedPowerUps = new Set(); // Powerups unlocked in shop
        this.lastSpawnDistance = 0; // Track last milestone for spawning
        this.lastActualSpawnDistance = 0; // Track when we actually spawned a powerup
        this.lastGuaranteedSpawnDistance = 0; // Track when we last spawned a guaranteed powerup
        this.hadRandomSpawnSinceLastGuaranteed = false; // Track if we've had a random spawn since last guaranteed        this.lastSpawnedPowerUpId = null; // Track last spawned powerup for variety
        this.lastLoggedMeter = -1; // For debug logging
        this.spawnInterval = 50; // Check every 50m instead of 30m (less frequent)
        this.baseSpawnChance = 0.15; // Reduced from 25% to 15% base chance
        this.guaranteedSpawnInterval = 400; // Guaranteed spawn every 400m (changed from 750m)
          // UI notification system
        this.powerUpNotifications = []; // Active notifications
        this.maxNotifications = 3; // Maximum simultaneous notifications
        
        // Floating collectibles for smooth magnetizer effect
        this.floatingCollectibles = [];
        
        // Load unlocked powerups from shop
        this.loadUnlockedPowerUps();
        
        // Initialize powerup definitions (starting with just 3 basic ones)
        this.powerUpDefinitions = this.initializePowerUpDefinitions();
    }

    initializePowerUpDefinitions() {
        return {
            'quantum-dash': {
                id: 'quantum-dash',
                name: 'Quantum Dash',
                rarity: 0.20, // Reduced from 30% to 20%
                duration: 0, // Instant use
                effect: 'quantumDash',
                visual: {
                    color: '#00ffff',
                    glow: true,
                    particles: 'blue-lightning'
                }
            },            'firewall-shield': {
                id: 'firewall-shield',
                name: 'Firewall Shield',
                rarity: 0.30, // Increased from 12% to 30% spawn chance when unlocked
                duration: 30000, // 30 seconds duration
                effect: 'firewallShield',
                visual: {
                    color: '#ff6600',
                    glow: true,
                    particles: 'orange-hexagon'
                }
            },
            'coin-magnetizer': {
                id: 'coin-magnetizer',
                name: 'Coin Magnetizer',
                rarity: 0.30, // Same as quantum dash - 30% spawn chance when unlocked
                duration: 6000, // 6 seconds
                effect: 'coinMagnetizer',
                visual: {
                    color: '#ffff00',
                    glow: true,
                    particles: 'gold-sparkle'
                }
            }
        };
    }

    loadUnlockedPowerUps() {
        // Initialize unlockedPowerUps if it doesn't exist
        if (!this.unlockedPowerUps) {
            this.unlockedPowerUps = new Set();
        }
        
        // Check with shop system which powerups are unlocked
        if (this.game.shopSystem) {
            const ownedUpgrades = this.game.shopSystem.ownedUpgrades;
            
            // Clear and reload unlocked powerups
            this.unlockedPowerUps.clear();
            
            // 🧪 TESTING: Always unlock quantum dash for testing - NO CONDITIONS!
            this.unlockedPowerUps.add('quantum-dash');
            console.log('🧪 DEBUG: Quantum Dash powerup force-unlocked for testing');
            
            // Map shop upgrade IDs to powerup IDs
            if (ownedUpgrades.has('quantum-dash')) {
                this.unlockedPowerUps.add('quantum-dash');
                console.log('✨ Quantum Dash powerup unlocked for spawning');
            }
            if (ownedUpgrades.has('firewall-shield')) {
                this.unlockedPowerUps.add('firewall-shield');
                console.log('🛡️ Firewall Shield powerup unlocked for spawning');
            }
            if (ownedUpgrades.has('coin-magnetizer')) {
                this.unlockedPowerUps.add('coin-magnetizer');
                console.log('🧲 Coin Magnetizer powerup unlocked for spawning');
            }
        } else {
            console.log('⚠️ Shop system not available yet');
        }
    }

    // Method to refresh unlocked powerups (call this when player buys new powerups)
    refreshUnlockedPowerUps() {
        this.loadUnlockedPowerUps();
    }    update(deltaTime) {
        // Debug log every few seconds to confirm update is being called (reduced frequency)
        if (!this.lastUpdateLog) this.lastUpdateLog = 0;
        if (Date.now() - this.lastUpdateLog > 10000) { // Log every 10 seconds instead of 3
            console.log(`🔄 PowerUpSystem.update() - spawned: ${this.spawnedPowerUps.length}, active: ${this.activePowerUps.size}`);
            this.lastUpdateLog = Date.now();
        }
        
        this.updateActivePowerUps(deltaTime);
        this.updateSpawnedPowerUps(deltaTime);
        this.updateNotifications(deltaTime);
        
        // Update quantum dash effects
        this.updateQuantumDashEffects(deltaTime);          // Apply coin magnetizer effect to collectibles in the world
        if (this.activePowerUps.has('coinMagnetizer')) {
            this.applyCoinMagnetizerToWorld();
        }
        
        // Check for new spawns
        this.checkForNewSpawns();
    }

    updateNotifications(deltaTime) {
        for (let i = this.powerUpNotifications.length - 1; i >= 0; i--) {
            const notification = this.powerUpNotifications[i];
            notification.duration -= deltaTime;
            
            if (notification.duration <= 0) {
                this.powerUpNotifications.splice(i, 1);
            }
        }
    }

    updateActivePowerUps(deltaTime) {
        for (const [effectType, powerUp] of this.activePowerUps) {
            if (powerUp.duration > 0) {
                powerUp.duration -= deltaTime;
                
                if (powerUp.duration <= 0) {
                    this.deactivatePowerUp(effectType);
                }
            }
        }
    }

    updateSpawnedPowerUps(deltaTime) {
        for (let i = this.spawnedPowerUps.length - 1; i >= 0; i--) {
            const powerUp = this.spawnedPowerUps[i];
            
            // Store previous position for debugging
            const oldX = powerUp.x;
            
            // DON'T move powerup with the world - let them stay in world coordinates
            // The camera system will handle the relative positioning
            // powerUp.x -= this.game.gameSpeed * deltaTime / 1000;
            
            // Instead, remove based on distance from player, not screen position
            const playerX = this.game.player ? this.game.player.x : 0;
            const distanceFromPlayer = powerUp.x - playerX;
            
            // Debug: log powerup position relative to player
            if (this.spawnedPowerUps.length > 0 && i === 0) { // Only log for first powerup to avoid spam
              
            }
            
            // Remove if powerup is too far behind the player (they missed it)
            if (distanceFromPlayer < -300) {
               
                this.spawnedPowerUps.splice(i, 1);
                continue;
            }
            
            // Check collision with player
            if (this.checkCollisionWithPlayer(powerUp)) {
                this.collectPowerUp(powerUp);
                this.spawnedPowerUps.splice(i, 1);
            }
        }
    }

    checkForNewSpawns() {
        // Use player distance instead of internal distance tracking
        const currentDistance = this.game.player ? this.game.player.x : 0;
        const currentMeter = Math.floor(currentDistance / 10); // Convert pixels to meters (assuming 10 pixels = 1 meter)
          // Don't spawn any powerups until after 50m
        if (currentMeter < 50) {
            // Log when approaching the 50m threshold
            if (currentMeter % 10 === 0 && currentMeter !== this.lastLoggedMeter && currentMeter >= 30) {
                console.log(`🚫 ${currentMeter}m - Powerups disabled until 50m (${50 - currentMeter}m remaining)`);
                this.lastLoggedMeter = currentMeter;
            }
            return;
        }
        
        // Log when powerups become available for the first time
        if (currentMeter === 50 && this.lastLoggedMeter < 50) {
            console.log(`🎉 50m reached! Powerups are now available for spawning!`);
        }
        
        // Check for guaranteed spawn every 400m (only if no random spawn occurred)
        const distanceSinceLastGuaranteed = currentMeter - this.lastGuaranteedSpawnDistance;
        if (distanceSinceLastGuaranteed >= this.guaranteedSpawnInterval) {
            if (!this.hadRandomSpawnSinceLastGuaranteed) {
                console.log(`🎯 Guaranteed spawn triggered at ${currentMeter}m (400m since last guaranteed, no random spawns)`);
                this.spawnGuaranteedPowerUp();
                this.lastGuaranteedSpawnDistance = currentMeter;
                this.lastActualSpawnDistance = currentMeter;
                this.hadRandomSpawnSinceLastGuaranteed = false;
                return; // Skip random spawn check this frame
            } else {
                console.log(`✅ 400m reached but skipping guaranteed spawn - had random spawn since last guaranteed`);
                // Reset for next 400m cycle
                this.lastGuaranteedSpawnDistance = currentMeter;
                this.hadRandomSpawnSinceLastGuaranteed = false;
            }
        }
        
        // Check if we've reached a 50m milestone (less frequent checks)
        const currentMilestone = Math.floor(currentMeter / this.spawnInterval);
        const lastMilestone = Math.floor(this.lastSpawnDistance / this.spawnInterval);          // Debug logging every 50m
        if (currentMeter % this.spawnInterval === 0 && currentMeter !== this.lastLoggedMeter) {
            const distanceSinceLastSpawn = currentMeter - this.lastActualSpawnDistance;
            const distanceToNextGuaranteed = this.guaranteedSpawnInterval - distanceSinceLastGuaranteed;
            console.log(`🏃 Current distance: ${currentMeter}m - Distance since last spawn: ${distanceSinceLastSpawn}m`);
            console.log(`🔓 Unlocked powerups: ${Array.from(this.unlockedPowerUps).join(', ')}`);
            console.log(`⏰ Next guaranteed spawn in: ${distanceToNextGuaranteed}m (random spawn since last: ${this.hadRandomSpawnSinceLastGuaranteed})`);
            
            this.lastLoggedMeter = currentMeter;
        }

        if (currentMilestone > lastMilestone) {
            this.lastSpawnDistance = currentMeter;
            
            // Calculate progressive spawn chance based on distance since last spawn
            const distanceSinceLastSpawn = currentMeter - this.lastActualSpawnDistance;
            let spawnChance = this.baseSpawnChance;
              // Increase spawn chance progressively (less aggressive than before)
            if (distanceSinceLastSpawn > 150) {
                spawnChance = 0.20; // 20% after 150m
            }
            if (distanceSinceLastSpawn > 250) {
                spawnChance = 0.30; // 30% after 250m
            }
            if (distanceSinceLastSpawn > 350) {
                spawnChance = 0.50; // 50% after 350m (close to guaranteed threshold)
            }
            
            console.log(`🎯 Reached ${currentMeter}m milestone - ${distanceSinceLastSpawn}m since last spawn`);
            console.log(`🎲 Random spawn chance: ${(spawnChance * 100).toFixed(0)}%`);
            
            // Roll for random powerup spawn
            if (Math.random() < spawnChance) {
                console.log(`✅ Random powerup spawn chance succeeded!`);
                this.lastActualSpawnDistance = currentMeter; // Update last spawn distance
                this.hadRandomSpawnSinceLastGuaranteed = true; // Mark that we had a random spawn
                this.spawnRandomPowerUp();
            } else {
                console.log(`❌ Random powerup spawn chance failed, trying again in ${this.spawnInterval}m`);
            }
        }
    }

    spawnGuaranteedPowerUp() {
        console.log(`🔎 spawnGuaranteedPowerUp() called - guaranteed spawn every 400m`);
          // Enforce 50m minimum distance rule even for guaranteed spawns
        const currentDistance = this.game.player ? this.game.player.x : 0;
        const currentMeter = Math.floor(currentDistance / 10);
        
        if (currentMeter < 50) {
            console.log(`🚫 spawnGuaranteedPowerUp blocked: Only ${currentMeter}m traveled, need 50m minimum`);
            console.log(`💡 ${50 - currentMeter}m remaining until powerups are available`);
            return;
        }
        
        console.log(`🔍 Attempting guaranteed powerup spawn - Unlocked count: ${this.unlockedPowerUps.size}`);
        console.log(`🔍 Unlocked powerups: [${Array.from(this.unlockedPowerUps).join(', ')}]`);
        
        if (this.unlockedPowerUps.size === 0) {
            console.log('❌ No powerups unlocked - cannot spawn');
            console.log('💡 Buy powerups in the shop first!');
            return;
        }
          // Get available powerups (all unlocked ones for guaranteed spawn)
        const availablePowerUps = Array.from(this.unlockedPowerUps)
            .map(id => this.powerUpDefinitions[id])
            .filter(def => def); // Make sure definition exists
        
        console.log(`🔍 Available powerup definitions: ${availablePowerUps.length}`);
        console.log(`🔍 Available powerup names:`, availablePowerUps.map(p => p.name));
        
        if (availablePowerUps.length === 0) {
            console.log('❌ No valid powerup definitions found');
            console.log('🔍 PowerUp definitions loaded:', Object.keys(this.powerUpDefinitions));
            return;
        }          // Pick random powerup with anti-repetition logic
        let chosenPowerUp;
        
        // If we have more than one powerup available, try to avoid spawning the same one repeatedly
        if (availablePowerUps.length > 1 && this.lastSpawnedPowerUpId) {
            // Filter out the last spawned powerup to encourage variety
            const varietyPowerUps = availablePowerUps.filter(p => p.id !== this.lastSpawnedPowerUpId);
            
            if (varietyPowerUps.length > 0) {
                const randomIndex = Math.floor(Math.random() * varietyPowerUps.length);
                chosenPowerUp = varietyPowerUps[randomIndex];
                console.log(`🔄 Variety selection: avoiding ${this.lastSpawnedPowerUpId}, chose ${chosenPowerUp.name}`);
            } else {
                // Fallback to normal selection if all powerups are filtered out
                const randomIndex = Math.floor(Math.random() * availablePowerUps.length);
                chosenPowerUp = availablePowerUps[randomIndex];
                console.log(`🎯 Normal selection: ${chosenPowerUp.name}`);
            }
        } else {
            // Normal random selection
            const randomIndex = Math.floor(Math.random() * availablePowerUps.length);
            chosenPowerUp = availablePowerUps[randomIndex];
            console.log(`🎯 Random selection: index ${randomIndex} of ${availablePowerUps.length} = ${chosenPowerUp.name}`);
        }
        
        // Remember this powerup for next time
        this.lastSpawnedPowerUpId = chosenPowerUp.id;
        
        console.log(`🎯 Chosen powerup for guaranteed spawn:`, chosenPowerUp);
        console.log(`🚀 About to call spawnPowerUp with:`, chosenPowerUp.name);
        
        this.spawnPowerUp(chosenPowerUp);
        
        console.log(`✨ Guaranteed powerup spawned at 400m milestone: ${chosenPowerUp.name}`);
        console.log(`📍 Spawned powerups on screen: ${this.spawnedPowerUps.length}`);
    }

    spawnRandomPowerUp() {
        console.log(`🎲 spawnRandomPowerUp() called - rolling individual spawn chances`);
        
        if (this.unlockedPowerUps.size === 0) {
            console.log('❌ No unlocked powerups available for spawning');
            return;
        }
        
        console.log(`🎲 Rolling individual powerup spawn chances...`);
        
        // Get available powerups that can spawn based on their individual rarity
        const availablePowerUps = Array.from(this.unlockedPowerUps)
            .map(id => this.powerUpDefinitions[id])
            .filter(def => {
                const spawns = Math.random() < def.rarity;
                console.log(`   ${def.name}: ${(def.rarity * 100).toFixed(1)}% chance - ${spawns ? '✅ SUCCESS' : '❌ failed'}`);
                return spawns;
            });
        
        if (availablePowerUps.length === 0) {
            console.log('❌ No powerups passed their individual spawn chances');
            return;
        }
        
        // Pick random powerup from available ones
        const chosenPowerUp = availablePowerUps[Math.floor(Math.random() * availablePowerUps.length)];
        console.log(`🎯 Random spawn: ${chosenPowerUp.name}`);
        this.spawnPowerUp(chosenPowerUp);
    }

    guaranteedSpawnPowerUp() {
        // Legacy method - redirect to new guaranteed spawn logic
        console.log(`� Legacy guaranteedSpawnPowerUp() called - redirecting to spawnGuaranteedPowerUp()`);
        this.spawnGuaranteedPowerUp();
    }

    trySpawnPowerUp() {
        if (this.unlockedPowerUps.size === 0) {
            console.log('❌ No unlocked powerups available for spawning');
            return;
        }
        
        console.log(`🎲 Rolling individual powerup spawn chances...`);
        
        // Get available powerups that can spawn
        const availablePowerUps = Array.from(this.unlockedPowerUps)
            .map(id => this.powerUpDefinitions[id])
            .filter(def => {
                const spawns = Math.random() < def.rarity;
                console.log(`   ${def.name}: ${(def.rarity * 100).toFixed(1)}% chance - ${spawns ? '✅ SUCCESS' : '❌ failed'}`);
                return spawns;
            });
        
        if (availablePowerUps.length === 0) {
            console.log('❌ No powerups passed their individual spawn chances');
            return;
        }
        
        // Pick random powerup from available ones
        const chosenPowerUp = availablePowerUps[Math.floor(Math.random() * availablePowerUps.length)];
        console.log(`🎯 Spawning: ${chosenPowerUp.name}`);
        this.spawnPowerUp(chosenPowerUp);
    }

    spawnPowerUp(definition) {
        console.log(`🚀 spawnPowerUp called with definition:`, definition);
          // CRITICAL: Enforce 50m minimum distance rule for ALL spawns
        const currentDistance = this.game.player ? this.game.player.x : 0;
        const currentMeter = Math.floor(currentDistance / 10);
        
        if (currentMeter < 50) {
            console.log(`🚫 spawnPowerUp BLOCKED: Only ${currentMeter}m traveled, need 50m minimum`);
            console.log(`💡 ${50 - currentMeter}m remaining until powerups are available`);
            console.log(`🔍 This powerup spawn was attempted by: ${definition.name}`);
            return;
        }
        
        // Check if player exists and has valid position
        if (!this.game.player) {
            console.warn('🚫 Cannot spawn powerup: no player object');
            return;
        }
        
        if (typeof this.game.player.x !== 'number') {
            console.warn('🚫 Cannot spawn powerup: player.x is not a number:', this.game.player.x);
            return;
        }
        
        if (isNaN(this.game.player.x)) {
            console.warn('🚫 Cannot spawn powerup: player.x is NaN');
            return;
        }
        
        console.log(`✅ Player validation passed: x=${this.game.player.x}`);
          // Calculate spawn position based on finding actual ground level
        const spawnX = this.game.player.x + 800; // Spawn much further ahead of player
        console.log(`🎯 Calculating spawn position: spawnX=${spawnX}`);
        
        const spawnY = this.findGroundLevel(spawnX);
        console.log(`🎯 Ground level found: spawnY=${spawnY}`);
        
        console.log(`🔍 Spawn position debug: spawnX=${spawnX}, spawnY=${spawnY} (found ground level)`);
        
        // Validate spawn position
        if (isNaN(spawnY)) {
            console.warn('🚫 Cannot spawn powerup: spawnY is NaN');
            return;
        }
        
        if (spawnY < 0) {
            console.warn('🚫 Cannot spawn powerup: spawnY is negative:', spawnY);
            return;
        }        console.log(`✅ Spawn position validation passed`);
        
        const powerUp = {
            id: definition.id,
            x: spawnX,
            y: spawnY - 40, // Spawn above the ground surface
            width: 40, // Made smaller for better gameplay
            height: 40,
            definition: definition,
            animationTime: 0
        };
        
        console.log(`🎨 Created powerup object:`, powerUp);
          this.spawnedPowerUps.push(powerUp);
        console.log(`✨ Spawned powerup: ${definition.name} at position (${spawnX}, ${powerUp.y})`);
        console.log(`📊 Total powerups on screen: ${this.spawnedPowerUps.length}`);
        console.log(`📋 All spawned powerups:`, this.spawnedPowerUps.map(p => `${p.definition.name}@(${p.x},${p.y})`));
    }
      /**
     * Find the ground level at a specific world X position
     * @param {number} worldX - The world X coordinate to check
     * @returns {number} - The Y coordinate of the ground surface
     */
    findGroundLevel(worldX) {
        if (!this.game.world) {
            console.warn('🚫 findGroundLevel: No world available');
            return this.game.canvas.height * 0.6;
        }
        
        const tileX = Math.floor(worldX / GAME_CONFIG.TILE_SIZE);
        console.log(`🔍 findGroundLevel: worldX=${worldX}, tileX=${tileX}`);
        
        // Search from bottom up to find the first solid tile
        for (let tileY = GAME_CONFIG.CHUNK_HEIGHT - 1; tileY >= 0; tileY--) {
            const tile = this.game.world.getTileAt(tileX, tileY);
            
            // Check if this is a solid tile that can support powerups
            const isSolidTile = (
                tile === TILE_TYPES.FLOOR || 
                tile === TILE_TYPES.PLATFORM ||
                tile === TILE_TYPES.STONE ||
                tile === TILE_TYPES.METAL ||
                tile === TILE_TYPES.BRICK
            );
            
            if (isSolidTile) {
                const groundY = tileY * GAME_CONFIG.TILE_SIZE;
                console.log(`✅ findGroundLevel: Found solid tile ${tile} at tileY=${tileY}, groundY=${groundY}`);
                return groundY;
            }
        }
        
        // If no solid ground found, try to find the nearest platform within a reasonable range
        for (let searchRadius = 1; searchRadius <= 3; searchRadius++) {
            // Check tiles to the left and right
            for (let offsetX = -searchRadius; offsetX <= searchRadius; offsetX++) {
                const checkTileX = tileX + offsetX;
                
                for (let tileY = GAME_CONFIG.CHUNK_HEIGHT - 1; tileY >= 0; tileY--) {
                    const tile = this.game.world.getTileAt(checkTileX, tileY);
                    
                    const isSolidTile = (
                        tile === TILE_TYPES.FLOOR || 
                        tile === TILE_TYPES.PLATFORM ||
                        tile === TILE_TYPES.STONE ||
                        tile === TILE_TYPES.METAL ||
                        tile === TILE_TYPES.BRICK
                    );
                    
                    if (isSolidTile) {
                        const groundY = tileY * GAME_CONFIG.TILE_SIZE;
                        console.log(`✅ findGroundLevel: Found nearby solid tile ${tile} at offset ${offsetX}, groundY=${groundY}`);
                        return groundY;
                    }
                }
            }
        }
        
        // Fallback: return a reasonable ground level based on typical ground height
        const fallbackY = 10 * GAME_CONFIG.TILE_SIZE; // Ground level 10 (typical spawn level)
        console.warn(`⚠️ findGroundLevel: No ground found anywhere, using fallback=${fallbackY}`);
        return fallbackY;
    }

    checkCollisionWithPlayer(powerUp) {
        if (!this.game.player) return false;
        
        const player = this.game.player;
        const playerBounds = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        return (powerUp.x < playerBounds.x + playerBounds.width &&
                powerUp.x + powerUp.width > playerBounds.x &&
                powerUp.y < playerBounds.y + playerBounds.height &&
                powerUp.y + powerUp.height > playerBounds.y);
    }

    collectPowerUp(powerUp) {
        console.log(`🔥 Collected powerup: ${powerUp.definition.name}`);
        
        // Update spawn tracking - reset the "last actual spawn distance" to current position
        const currentDistance = this.game.player ? this.game.player.x : 0;
        const currentMeter = Math.floor(currentDistance / 10);
        this.lastActualSpawnDistance = currentMeter;
        
        // Clear the last spawned powerup tracking to reset variety system
        this.lastSpawnedPowerUpId = null;
        
        console.log(`📍 Spawn tracking reset - next powerup guaranteed within ${this.guaranteedSpawnInterval}m`);
        
        // Play sound effect
        if (this.game.audioSystem) {
            this.game.audioSystem.onPowerup();
        }
        
        // Create notification
        this.createPowerUpNotification(powerUp.definition);
        
        // Apply the powerup effect
        this.activatePowerUp(powerUp.definition);
        
        // Visual feedback (particles, score popup, etc.)
        this.showCollectionEffect(powerUp);
    }

    createPowerUpNotification(definition) {
        // Remove oldest notification if at max
        if (this.powerUpNotifications.length >= this.maxNotifications) {
            this.powerUpNotifications.shift();
        }
          // Add new notification
        const notification = {
            name: definition.name,
            effect: definition.effect,
            duration: 2000, // 2 seconds (reduced from 3)
            maxDuration: 2000,
            color: definition.visual.color,
            powerUpDuration: definition.duration,
            startTime: Date.now()
        };
        
        this.powerUpNotifications.push(notification);
    }

    activatePowerUp(definition) {
        const effectType = definition.effect;
        
        switch (effectType) {
            case 'quantumDash':
                this.activateQuantumDash();
                break;
                
            case 'firewallShield':
                this.activateFirewallShield(definition);
                break;
                
            case 'coinMagnetizer':
                this.activateCoinMagnetizer(definition);
                break;
                
            default:
                console.warn(`Unknown powerup effect: ${effectType}`);
        }
    }

    activateQuantumDash() {
        if (!this.game.player) return;
        
        const teleportDistance = 200; // Increased distance for more impact
        const dashDuration = 800; // Duration of invulnerability and effects
        
        // Store original position for animation
        const startX = this.game.player.x;
        const startY = this.game.player.y;
        
        // Calculate new position
        const newX = this.game.player.x + teleportDistance;
        const groundLevel = this.findGroundLevel(newX);
        const newY = this.game.player.y > groundLevel - 50 ? groundLevel - 50 : this.game.player.y;
        
        // Make player invulnerable during quantum dash
        this.game.player.quantumDashTime = dashDuration;
        this.game.player.quantumDashActive = true;
        
        // Start the cool animation with game pause
        if (this.game.quantumDashAnimation) {
            this.game.quantumDashAnimation.startAnimation(startX, startY, newX, newY);
        }
        
        // Teleport player after a short delay (during animation)
        setTimeout(() => {
            if (this.game.player) {
                this.game.player.x = newX;
                this.game.player.y = newY;
            }
        }, 500); // Teleport during the animation
        
        // Remove quantum dash state after duration
        setTimeout(() => {
            if (this.game.player) {
                this.game.player.quantumDashActive = false;
            }
        }, dashDuration);
        
        console.log('⚡ Quantum Dash activated - teleported forward with invulnerability and cool animation!');
    }    activateFirewallShield(definition) {
        // Add shield that absorbs one hit and lasts 30 seconds
        this.activePowerUps.set('firewallShield', {
            duration: definition.duration || 30000, // 30 seconds
            charges: 1,
            startTime: Date.now()
        });
        
        console.log('🛡️ Firewall Shield activated - 1 hit protection for 30s!');
    }

    activateCoinMagnetizer(definition) {
        // Activate coin magnetizing effect
        this.activePowerUps.set('coinMagnetizer', {
            duration: definition.duration,
            magnetRange: 100,
            startTime: Date.now(),
            // Visual aura properties
            auraAlpha: 0.3,
            auraColor: '#00ff00', // Green aura
            pulseSpeed: 0.05,
            pulseOffset: 0
        });
        
        console.log('🧲 Coin Magnetizer activated - attracting coins!');
        console.log('🔍 Magnetizer data:', this.activePowerUps.get('coinMagnetizer'));
    }

    deactivatePowerUp(effectType) {
        this.activePowerUps.delete(effectType);
        console.log(`⏰ Powerup expired: ${effectType}`);
    }

    createQuantumDashEffect() {
        // Legacy method - keeping for compatibility
        this.createQuantumDashStartEffect(this.game.player.x, this.game.player.y);
    }
    
    createQuantumDashStartEffect(x, y) {
        // Create dramatic departure effect with multiple particle types
        if (this.game.effectSystem) {
            // Lightning burst at departure point
            this.game.effectSystem.createParticleEffect({
                x: x,
                y: y,
                type: 'quantum-dash-start',
                duration: 600
            });
        }
        
        // Store effect data for manual rendering if no effect system
        this.quantumDashEffects = this.quantumDashEffects || [];
        this.quantumDashEffects.push({
            type: 'departure',
            x: x,
            y: y,
            startTime: Date.now(),
            duration: 600,
            particles: this.generateQuantumParticles(x, y, 'departure')
        });
    }
    
    createQuantumDashArrivalEffect(x, y) {
        // Create dramatic arrival effect
        if (this.game.effectSystem) {
            this.game.effectSystem.createParticleEffect({
                x: x,
                y: y,
                type: 'quantum-dash-arrival',
                duration: 400
            });
        }
        
        // Store effect data for manual rendering
        this.quantumDashEffects = this.quantumDashEffects || [];
        this.quantumDashEffects.push({
            type: 'arrival',
            x: x,
            y: y,
            startTime: Date.now(),
            duration: 400,
            particles: this.generateQuantumParticles(x, y, 'arrival')
        });
    }
    
    generateQuantumParticles(centerX, centerY, effectType) {
        const particles = [];
        const particleCount = effectType === 'departure' ? 20 : 15;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = effectType === 'departure' ? 30 + Math.random() * 40 : 20 + Math.random() * 30;
            
            particles.push({
                x: centerX + Math.cos(angle) * (Math.random() * 20),
                y: centerY + Math.sin(angle) * (Math.random() * 20),
                vx: Math.cos(angle) * (effectType === 'departure' ? 2 : -1.5),
                vy: Math.sin(angle) * (effectType === 'departure' ? 2 : -1.5),
                life: 1.0,
                decay: effectType === 'departure' ? 0.003 : 0.005,
                color: effectType === 'departure' ? '#00ffff' : '#ff00ff',
                size: 3 + Math.random() * 4
            });
        }
        
        return particles;
    }

    showCollectionEffect(powerUp) {
        // Create collection effect (glow, particles, etc.)
        if (this.game.effectSystem) {
            this.game.effectSystem.createParticleEffect({
                x: powerUp.x + powerUp.width / 2,
                y: powerUp.y + powerUp.height / 2,
                type: 'powerup-collect',
                color: powerUp.definition.visual.color,
                duration: 300
            });
        }
    }

    // Check if player has specific powerup active
    hasPowerUp(effectType) {
        return this.activePowerUps.has(effectType);
    }

    // Get powerup data for UI display
    getActivePowerUps() {
        const result = [];
        for (const [effectType, powerUp] of this.activePowerUps) {
            result.push({
                type: effectType,
                duration: powerUp.duration,
                maxDuration: this.powerUpDefinitions[effectType]?.duration || 0
            });
        }        return result;
    }

    // Handle player taking damage (for shield powerup)
    onPlayerDamage() {
        if (this.activePowerUps.has('firewallShield')) {
            const shield = this.activePowerUps.get('firewallShield');
            
            // Prevent multiple damage calls within same frame/short time window
            const now = Date.now();
            if (shield.lastDamageTime && (now - shield.lastDamageTime) < 100) {
                console.log('🔄 Shield blocked duplicate damage call');
                return { absorbed: true, grantInvulnerability: false }; // Still block damage during cooldown, but don't grant more i-frames
            }
            
            shield.lastDamageTime = now;
            shield.charges--;
            
            if (shield.charges <= 0) {
                console.log('🛡️ Shield depleted after blocking damage');
                this.deactivatePowerUp('firewallShield');
            } else {
                console.log('🛡️ Shield absorbed damage, charges remaining:', shield.charges);
            }
            
            return { absorbed: true, grantInvulnerability: true }; // Damage was absorbed, grant invulnerability frames
        }
        return { absorbed: false, grantInvulnerability: false }; // No shield active
    }

    // Apply coin magnetizer effect to nearby coins
    applyCoinMagnetizer(collectibles) {
        if (!this.activePowerUps.has('coinMagnetizer') || !this.game.player) {
            return;
        }
        
        const magnetizer = this.activePowerUps.get('coinMagnetizer');
        const magnetRange = magnetizer.magnetRange || 100;
        const playerCenterX = this.game.player.x + this.game.player.width / 2;
        const playerCenterY = this.game.player.y + this.game.player.height / 2;
        
        // Attract nearby collectibles towards the player
        collectibles.forEach(collectible => {
            const collectibleCenterX = collectible.x + collectible.width / 2;
            const collectibleCenterY = collectible.y + collectible.height / 2;
            
            const dx = playerCenterX - collectibleCenterX;
            const dy = playerCenterY - collectibleCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Only affect collectibles within range
            if (distance < magnetRange && distance > 0) {
                // Calculate attraction force (stronger when closer)
                const force = Math.min(1, (magnetRange - distance) / magnetRange);
                const attractionSpeed = 5 * force; // Base attraction speed
                
                // Normalize direction and apply attraction
                const moveX = (dx / distance) * attractionSpeed;
                const moveY = (dy / distance) * attractionSpeed;
                
                // Move collectible towards player
                collectible.x += moveX;
                collectible.y += moveY;
            }
        });
    }    applyCoinMagnetizerToWorld() {
        if (!this.game.world || !this.game.player) {
            return;
        }
        const magnetizer = this.activePowerUps.get('coinMagnetizer');
        const magnetRange = magnetizer.magnetRange || 100;
        const player = this.game.player;
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const playerTileX = Math.floor(playerCenterX / GAME_CONFIG.TILE_SIZE);
        const playerTileY = Math.floor(playerCenterY / GAME_CONFIG.TILE_SIZE);
        const searchRange = Math.ceil(magnetRange / GAME_CONFIG.TILE_SIZE) + 2;

        // 1. Find and convert data packets in range to floating collectibles
        for (let y = playerTileY - searchRange; y <= playerTileY + searchRange; y++) {
            for (let x = playerTileX - searchRange; x <= playerTileX + searchRange; x++) {
                const tile = this.game.world.getTileAt(x, y);
                if (tile === TILE_TYPES.DATA_PACKET) {
                    const tileWorldX = x * GAME_CONFIG.TILE_SIZE;
                    const tileWorldY = y * GAME_CONFIG.TILE_SIZE;
                    const tileCenterX = tileWorldX + GAME_CONFIG.TILE_SIZE / 2;
                    const tileCenterY = tileWorldY + GAME_CONFIG.TILE_SIZE / 2;
                    const dx = playerCenterX - tileCenterX;
                    const dy = playerCenterY - tileCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < magnetRange && distance > 0) {
                        // Remove from world and add to floating collectibles
                        this.game.world.setTileAt(x, y, TILE_TYPES.EMPTY);
                        this.floatingCollectibles.push({
                            x: tileCenterX,
                            y: tileCenterY,
                            points: this.getDataPacketPoints(),
                            collected: false
                        });
                    }
                }
            }
        }

        // 2. Move floating collectibles toward player and collect if close
        for (let i = this.floatingCollectibles.length - 1; i >= 0; i--) {
            const fc = this.floatingCollectibles[i];
            if (fc.collected) continue;
            const dx = playerCenterX - fc.x;
            const dy = playerCenterY - fc.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Move smoothly toward player
            const speed = Math.max(6, 18 * (1 - distance / magnetRange));
            if (distance < 30) {
                // Collect
                fc.collected = true;
                if (this.game.upgradeSystem) {
                    this.game.upgradeSystem.addDataPackets(fc.points);
                }
                if (this.game.player) {
                    this.game.player.handleCollectibles([
                        { type: 'dataPacket', points: fc.points, worldX: fc.x, worldY: fc.y }
                    ]);
                }
                this.floatingCollectibles.splice(i, 1);
            } else {
                // Move toward player
                fc.x += (dx / distance) * speed;
                fc.y += (dy / distance) * speed;
            }
        }
    }
    
    // Helper method to get data packet points based on difficulty
    getDataPacketPoints() {
        if (!this.game.selectedDifficulty) return 1;
        
        switch (this.game.selectedDifficulty) {
            case 'EASY': return 1;
            case 'MEDIUM': return 3;
            case 'HARD': return 5;
            case 'EXTREME': return 7;
            default: return 1;
        }
    }

    render(ctx, camera) {
        // Render spawned powerups
        this.spawnedPowerUps.forEach(powerUp => {
            this.renderPowerUp(ctx, powerUp, camera);
        });
        
        // Render active powerup effects on player
        this.renderActivePowerUpEffects(ctx, camera);
        this.renderFloatingCollectibles(ctx, camera);
          // Render powerup notifications
        this.renderNotifications(ctx);
        
        // Render quantum dash effects
        this.renderQuantumDashEffects(ctx, camera);
        
        // Render active powerup UI
        this.renderActivePowerUpUI(ctx);
          // Debug: show count of spawned powerups (reduced frequency)
        if (this.spawnedPowerUps.length > 0 && this.debugVerbose) {
            // Only log occasionally, not every frame
            if (!this.lastPowerupCountLog) this.lastPowerupCountLog = 0;
            if (Date.now() - this.lastPowerupCountLog > 10000) { // Reduced to every 10 seconds
                console.log(`🎯 Powerups on screen: ${this.spawnedPowerUps.length}`);
                this.lastPowerupCountLog = Date.now();
            }
        }
    }    renderNotifications(ctx) {
        ctx.save();
        
        this.powerUpNotifications.forEach((notification, index) => {
            // Move notifications to top-right to avoid any left-side UI conflicts
            const x = ctx.canvas.width - 200;
            const y = 15 + (index * 30); // Top-right corner
            const width = 180;
            const height = 25;
            
            // Fade out animation
            const fadeProgress = notification.duration / notification.maxDuration;
            ctx.globalAlpha = Math.min(1, fadeProgress * 2); // Fade out in last half
            
            // Background with rounded corners effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y, width, height);
            
            // Subtle border with powerup color
            ctx.strokeStyle = notification.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, width, height);
            
            // Icon (smaller)
            ctx.fillStyle = notification.color;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let symbol = '?';
            switch (notification.effect) {
                case 'quantumDash': symbol = '⚡'; break;
                case 'firewallShield': symbol = '🛡️'; break;
                case 'coinMagnetizer': symbol = '🧲'; break;
            }
            
            ctx.fillText(symbol, x + 15, y + 15);
            
            // Simplified text - just the powerup name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(notification.name, x + 30, y + 12);
            
            // Status indicator (much more compact)
            if (notification.powerUpDuration > 0) {
                ctx.fillStyle = '#aaaaaa';
                ctx.font = '9px Arial';
                ctx.fillText(`${(notification.powerUpDuration / 1000).toFixed(1)}s`, x + 30, y + 22);
            } else if (notification.powerUpDuration === 0) {
                ctx.fillStyle = '#aaaaaa';
                ctx.font = '9px Arial';
                ctx.fillText('Activated', x + 30, y + 22);
            }
        });
        
        ctx.restore();
    }    renderActivePowerUpUI(ctx) {
        ctx.save();
        
        const activePowerUps = Array.from(this.activePowerUps.entries());
        if (activePowerUps.length === 0) {
            ctx.restore();
            return;
        }
        
        // Move active powerups display to bottom-right to avoid overlap
        let yOffset = ctx.canvas.height - 120; // Start from bottom
        
        activePowerUps.forEach(([effectType, powerUp]) => {
            const definition = Object.values(this.powerUpDefinitions).find(def => def.effect === effectType);
            if (!definition) return;
            
            const x = ctx.canvas.width - 180; // Move further left
            const y = yOffset;
            const width = 160;
            const height = 30; // Slightly larger for better readability
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x, y, width, height);
            
            // Subtle border
            ctx.strokeStyle = definition.visual.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, width, height);
              // Icon (larger for better visibility)
            ctx.fillStyle = definition.visual.color;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let symbol = '?';
            switch (effectType) {
                case 'quantumDash': symbol = '⚡'; break;
                case 'firewallShield': symbol = '🛡️'; break;
                case 'coinMagnetizer': symbol = '🧲'; break;
            }
            
            ctx.fillText(symbol, x + 15, y + 15);
            
            // Compact name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(definition.name, x + 30, y + 12);
            
            // Duration/status (more compact)
            if (powerUp.duration > 0) {
                const timeLeft = (powerUp.duration / 1000).toFixed(1);
                ctx.fillStyle = '#cccccc';
                ctx.font = '9px Arial';
                ctx.fillText(`${timeLeft}s`, x + 30, y + 22);
                
                // Mini progress bar
                const progress = powerUp.duration / definition.duration;
                const barWidth = 80; // Wider progress bar
                const barHeight = 3; // Slightly taller
                const barX = x + 70;
                const barY = y + 20;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                
                ctx.fillStyle = definition.visual.color;
                ctx.fillRect(barX, barY, barWidth * progress, barHeight);
            } else if (powerUp.charges !== undefined) {
                ctx.fillStyle = '#cccccc';
                ctx.font = '9px Arial';
                ctx.fillText(`${powerUp.charges} charges`, x + 30, y + 22);
            } else {
                ctx.fillStyle = '#cccccc';
                ctx.font = '9px Arial';
                ctx.fillText('Active', x + 30, y + 22);
            }
              yOffset -= 35; // Move up for next powerup (negative since we're going bottom-up)
        });
          // Add powerup spawn progress indicator
        if (this.game.player && this.unlockedPowerUps.size > 0) {
            const currentDistance = this.game.player.x;
            const currentMeter = Math.floor(currentDistance / 10);
            const distanceSinceLastGuaranteed = currentMeter - this.lastGuaranteedSpawnDistance;
            const distanceSinceLastSpawn = currentMeter - this.lastActualSpawnDistance;
            
            // Only show progress after first 50m and when we haven't spawned in a while
            if (currentMeter > 50 && distanceSinceLastSpawn > 150) {
                const x = 20;
                const y = 60; // Move below data packets counter (which is around y=10-40)
                const width = 220; // Slightly wider for new info
                const height = 40; // Taller for extra info
                
                // Background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(x, y, width, height);
                
                // Border (changes color as we get closer to guaranteed spawn)
                let borderColor = '#888888';
                if (distanceSinceLastGuaranteed > 200) borderColor = '#ffff00'; // Yellow at 200m
                if (distanceSinceLastGuaranteed > 300) borderColor = '#ff6600'; // Orange at 300m
                if (distanceSinceLastGuaranteed >= this.guaranteedSpawnInterval) borderColor = '#ff0000'; // Red when guaranteed
                
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                
                // Title
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                
                // Show different text based on whether we've had a random spawn
                if (this.hadRandomSpawnSinceLastGuaranteed) {
                    ctx.fillText('Next Guaranteed: (Random spawn occurred)', x + 5, y + 3);
                } else {
                    ctx.fillText('Next Guaranteed:', x + 5, y + 3);
                }
                
                // Progress bar for guaranteed spawn (400m cycle)
                const progressBarWidth = 140;
                const progressBarHeight = 6;
                const progressBarX = x + 5;
                const progressBarY = y + 15;
                
                const guaranteedProgress = Math.min(1, distanceSinceLastGuaranteed / this.guaranteedSpawnInterval);
                
                // Background bar
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
                
                // Progress fill (updated thresholds for 400m max)
                let fillColor = '#00ff00'; // Green
                if (guaranteedProgress > 0.5) fillColor = '#ffff00'; // Yellow at 200m
                if (guaranteedProgress > 0.75) fillColor = '#ff6600'; // Orange at 300m
                if (guaranteedProgress >= 1.0) fillColor = '#ff0000'; // Red when guaranteed
                
                ctx.fillStyle = fillColor;
                ctx.fillRect(progressBarX, progressBarY, progressBarWidth * guaranteedProgress, progressBarHeight);
                
                // Distance text
                const remainingToGuaranteed = Math.max(0, this.guaranteedSpawnInterval - distanceSinceLastGuaranteed);
                ctx.fillStyle = '#cccccc';
                ctx.font = '8px Arial';
                if (remainingToGuaranteed > 0) {
                    ctx.fillText(`${remainingToGuaranteed}m`, progressBarX + progressBarWidth + 5, progressBarY + 4);
                } else {
                    ctx.fillStyle = '#ff0000';
                    if (this.hadRandomSpawnSinceLastGuaranteed) {
                        ctx.fillText('SKIP', progressBarX + progressBarWidth + 5, progressBarY + 4);
                    } else {
                        ctx.fillText('NOW!', progressBarX + progressBarWidth + 5, progressBarY + 4);
                    }
                }
                
                // Additional info line
                ctx.fillStyle = '#aaaaaa';
                ctx.font = '7px Arial';
                if (this.hadRandomSpawnSinceLastGuaranteed) {
                    ctx.fillText(`Random spawn: YES (${distanceSinceLastSpawn}m ago)`, x + 5, y + 28);
                } else {
                    ctx.fillText(`Random spawn: NO (next guaranteed in ${remainingToGuaranteed}m)`, x + 5, y + 28);
                }
            }
        }
        
        ctx.restore();
    }

    renderPowerUp(ctx, powerUp, camera) {
        ctx.save();
        
        // Apply camera offset (use passed camera or fallback to game camera)
        const cameraToUse = camera || this.game.camera || { x: 0, y: 0 };
        
        // Animate powerup (floating effect)
        powerUp.animationTime += 16; // Roughly 60fps
        const floatOffset = Math.sin(powerUp.animationTime * 0.005) * 8;
        const pulseScale = 1 + Math.sin(powerUp.animationTime * 0.008) * 0.1;        // Apply camera transform
        const centerX = powerUp.x - cameraToUse.x + powerUp.width / 2;
        const centerY = powerUp.y - cameraToUse.y + powerUp.height / 2 + floatOffset;
        
        // Skip rendering if off-screen
        if (centerX < -100 || centerX > ctx.canvas.width + 100) {
            ctx.restore();
            return;
        }
        
        // Outer glow effect
        ctx.shadowColor = powerUp.definition.visual.color;
        ctx.shadowBlur = 20;
        
        // Draw outer glow ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, 25 * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = powerUp.definition.visual.color + '40'; // Semi-transparent
        ctx.fill();
        
        // Draw main orb
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 18 * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = powerUp.definition.visual.color;
        ctx.fill();
        
        // Draw inner core
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 10 * pulseScale, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Draw powerup symbol/icon in center
        ctx.shadowBlur = 0;
        ctx.fillStyle = powerUp.definition.visual.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let symbol = '?';
        switch (powerUp.definition.effect) {
            case 'quantumDash': symbol = '⚡'; break;
            case 'firewallShield': symbol = '🛡️'; break;
            case 'coinMagnetizer': symbol = '🧲'; break;
        }
        
        ctx.fillText(symbol, centerX, centerY);
        
        // Draw name label below orb
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        
        // Background for text
        const textY = centerY + 35;
        const textWidth = ctx.measureText(powerUp.definition.name).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(centerX - textWidth/2 - 5, textY - 8, textWidth + 10, 16);
        
        // Text with outline
        ctx.strokeText(powerUp.definition.name, centerX, textY);
        ctx.fillStyle = powerUp.definition.visual.color;
        ctx.fillText(powerUp.definition.name, centerX, textY);
        
        ctx.restore();
    }

    renderActivePowerUpEffects(ctx, camera) {
        if (!this.game.player || !camera) return;
        
        // Calculate player screen position
        const playerScreenX = this.game.player.x - camera.x;
        const playerScreenY = this.game.player.y - camera.y;
          // Shield effect
        if (this.activePowerUps.has('firewallShield')) {
            ctx.save();
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 10;
            
            ctx.strokeRect(
                playerScreenX - 5,
                playerScreenY - 5,
                this.game.player.width + 10,
                this.game.player.height + 10
            );
            ctx.restore();
        }          // Magnetizer effect with subtle animated aura
        if (this.activePowerUps.has('coinMagnetizer')) {
            const magnetizer = this.activePowerUps.get('coinMagnetizer');
            const playerCenterScreenX = playerScreenX + this.game.player.width / 2;
            const playerCenterScreenY = playerScreenY + this.game.player.height / 2;
            
            // Update pulse animation (more subtle)
            magnetizer.pulseOffset += magnetizer.pulseSpeed;
            const pulseIntensity = 0.15 + Math.sin(magnetizer.pulseOffset) * 0.1; // 0.05 to 0.25 (reduced)
            
            ctx.save();
            
            // Single subtle aura ring
            ctx.globalAlpha = pulseIntensity;
            ctx.strokeStyle = magnetizer.auraColor;
            ctx.lineWidth = 2; // Thinner line
            ctx.setLineDash([]);
            ctx.shadowColor = magnetizer.auraColor;
            ctx.shadowBlur = 8; // Less blur
            
            ctx.beginPath();
            ctx.arc(playerCenterScreenX, playerCenterScreenY, magnetizer.magnetRange, 0, Math.PI * 2);
            ctx.stroke();
            
            // Very subtle core effect around player
            ctx.globalAlpha = 0.4; // More transparent
            ctx.strokeStyle = '#00ffff'; // Cyan core
            ctx.lineWidth = 1; // Thinner
            ctx.setLineDash([2, 4]); // Longer dashes
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 3; // Less blur
            
            ctx.strokeRect(
                playerScreenX - 3,
                playerScreenY - 3,
                this.game.player.width + 6,
                this.game.player.height + 6
            );
            
            ctx.restore();
        }
    }
    
    updateQuantumDashEffects(deltaTime) {
        if (!this.quantumDashEffects) return;
        
        for (let i = this.quantumDashEffects.length - 1; i >= 0; i--) {
            const effect = this.quantumDashEffects[i];
            const elapsed = Date.now() - effect.startTime;
            
            // Remove expired effects
            if (elapsed > effect.duration) {
                this.quantumDashEffects.splice(i, 1);
                continue;
            }
            
            // Update particles
            for (let j = effect.particles.length - 1; j >= 0; j--) {
                const particle = effect.particles[j];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life -= particle.decay;
                
                if (particle.life <= 0) {
                    effect.particles.splice(j, 1);
                }
            }
        }
    }

    renderQuantumDashEffects(ctx, camera) {
        if (!this.quantumDashEffects) return;
        
        const cameraToUse = camera || this.game.camera || { x: 0, y: 0 };
        
        ctx.save();
        
        for (const effect of this.quantumDashEffects) {
            const elapsed = Date.now() - effect.startTime;
            const progress = elapsed / effect.duration;
            
            // Render central energy core
            const screenX = effect.x - cameraToUse.x;
            const screenY = effect.y - cameraToUse.y;
            
            if (screenX > -100 && screenX < ctx.canvas.width + 100) {
                // Energy core
                const coreSize = effect.type === 'departure' ? 
                    30 * (1 - progress) : 20 * progress;
                
                ctx.shadowBlur = 20;
                ctx.shadowColor = effect.type === 'departure' ? '#00ffff' : '#ff00ff';
                
                const gradient = ctx.createRadialGradient(
                    screenX, screenY, 0,
                    screenX, screenY, coreSize
                );
                gradient.addColorStop(0, effect.type === 'departure' ? 
                    `rgba(0, 255, 255, ${1 - progress})` : 
                    `rgba(255, 0, 255, ${progress})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(
                    screenX - coreSize, screenY - coreSize,
                    coreSize * 2, coreSize * 2
                );
                
                // Lightning bolts for departure effect
                if (effect.type === 'departure') {
                    ctx.strokeStyle = `rgba(0, 255, 255, ${1 - progress})`;
                    ctx.lineWidth = 2;
                    
                    for (let i = 0; i < 8; i++) {
                        const angle = (Math.PI * 2 * i) / 8 + elapsed * 0.01;
                        const length = 40 * (1 - progress);
                        
                        ctx.beginPath();
                        ctx.moveTo(screenX, screenY);
                        ctx.lineTo(
                            screenX + Math.cos(angle) * length,
                            screenY + Math.sin(angle) * length
                        );
                        ctx.stroke();
                    }
                }
                  // Render particles
                ctx.shadowBlur = 0;
                for (const particle of effect.particles) {
                    const particleScreenX = particle.x - cameraToUse.x;
                    const particleScreenY = particle.y - cameraToUse.y;
                    
                    if (particleScreenX > -50 && particleScreenX < ctx.canvas.width + 50) {
                        ctx.fillStyle = particle.color + Math.floor(particle.life * 255).toString(16).padStart(2, '0');
                        ctx.fillRect(
                            particleScreenX - particle.size / 2,
                            particleScreenY - particle.size / 2,
                            particle.size,
                            particle.size
                        );
                    }
                }
            }
        }
        
        ctx.restore();
    }

    spawnTestPowerup() {
        // Enforce 50m minimum distance rule even for debug spawns
        const currentDistance = this.game.player ? this.game.player.x : 0;
        const currentMeter = Math.floor(currentDistance / 10);
        
        if (currentMeter < 50) {
            console.log(`🚫 spawnTestPowerup blocked: Only ${currentMeter}m traveled, need 50m minimum`);
            console.log(`💡 ${50 - currentMeter}m remaining until powerups are available`);
            return;
        }
        
        // Spawn a powerup very close to the player for testing
        const spawnX = this.game.player.x + 200; // Just ahead of player
        const spawnY = this.game.player.y - 50; // Above player level
        
        const testDefinition = Array.from(this.unlockedPowerUps)[0];
        const definition = this.powerUpDefinitions[testDefinition];
        
        const powerUp = {
            id: definition.id,
            x: spawnX,
            y: spawnY,
            width: 40,
            height: 40,
            definition: definition,
            animationTime: 0
        };
        
        this.spawnedPowerUps.push(powerUp);
        console.log(`🚨 DEBUG: Test powerup spawned at (${spawnX}, ${spawnY})`);
        console.log(`🚨 DEBUG: Player position: (${this.game.player.x}, ${this.game.player.y})`);
        console.log(`🚨 DEBUG: Total powerups: ${this.spawnedPowerUps.length}`);
    }
    
    renderFloatingCollectibles(ctx, camera) {
        if (!this.floatingCollectibles || this.floatingCollectibles.length === 0) return;
        for (const fc of this.floatingCollectibles) {
            // Draw as a yellow circle (or use your data packet sprite here)
            const screenX = fc.x - camera.x;
            const screenY = fc.y - camera.y;
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#ffe066';
            ctx.shadowColor = '#ffe066';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.restore();        }    }

    /**
     * Reset the PowerUp system for a new game
     * Clears all active powerups and resets spawn tracking
     */
    reset() {
        console.log('🔄 Resetting PowerUpSystem for new game...');
        
        // Clear all active powerup effects
        this.activePowerUps.clear();
        
        // Clear spawned powerups on screen
        this.spawnedPowerUps = [];
        
        // Reset spawn tracking
        this.lastSpawnDistance = 0;
        this.lastActualSpawnDistance = 0;
        this.lastGuaranteedSpawnDistance = 0;
        this.hadRandomSpawnSinceLastGuaranteed = false;
        this.lastSpawnedPowerUpId = null;
        
        // Clear notifications
        this.powerUpNotifications = [];
        
        // Clear floating collectibles (for magnetizer effect)
        this.floatingCollectibles = [];
        
        console.log('✅ PowerUpSystem reset complete - all active effects cleared');
    }
}
