/**
 * LifeBoxSystem - Handles spawning and management of life boxes (health pickups)
 * Life boxes spawn periodically based on difficulty level
 * Easy: More frequent, Hard: Less frequent, Extreme: None
 */

import { DIFFICULTY_LEVELS, GAME_CONFIG, TILE_TYPES } from '../utils/constants.js';

export class LifeBoxSystem {
    constructor(game) {
        this.game = game;
        this.spawnedLifeBoxes = [];
        this.lastSpawnDistance = 0;
          // Life box spawn intervals by difficulty (in meters)
        this.spawnIntervals = {
            EASY: 100,    // Every 100m (for debugging)
            MEDIUM: 1200, // Every 1200m  
            HARD: 1800,   // Every 1800m
            EXTREME: 0    // Never
        };
        
        // Life box visual properties
        this.lifeBoxSize = 35;
        this.pulseSpeed = 0.01;
        this.floatSpeed = 0.005;
        this.floatAmount = 10;
    }
    
    update(deltaTime) {
        this.updateSpawnedLifeBoxes(deltaTime);
        this.checkForNewSpawns();
    }
    
    updateSpawnedLifeBoxes(deltaTime) {
        for (let i = this.spawnedLifeBoxes.length - 1; i >= 0; i--) {
            const lifeBox = this.spawnedLifeBoxes[i];
            
            // Update animation time
            lifeBox.animationTime += deltaTime;
            
            // Remove if far behind player
            if (this.game.player && lifeBox.x < this.game.player.x - 300) {
                this.spawnedLifeBoxes.splice(i, 1);
                continue;
            }
            
            // Check collision with player
            if (this.checkCollisionWithPlayer(lifeBox)) {
                this.collectLifeBox(lifeBox);
                this.spawnedLifeBoxes.splice(i, 1);
            }
        }
    }
    
    checkForNewSpawns() {
        if (!this.game.player) return;
        
        const currentDistance = Math.floor(this.game.player.x / 10); // Convert to meters
        const difficulty = this.game.selectedDifficulty;
        const spawnInterval = this.spawnIntervals[difficulty];
        
        // No life boxes on extreme difficulty
        if (spawnInterval === 0) return;
        
        // Check if we should spawn a new life box
        const distanceSinceLastSpawn = currentDistance - this.lastSpawnDistance;
        
        if (distanceSinceLastSpawn >= spawnInterval) {
            this.spawnLifeBox();
            this.lastSpawnDistance = currentDistance;
            console.log(`❤️ Life box spawned at ${currentDistance}m (next at ${currentDistance + spawnInterval}m)`);
        }
    }
      spawnLifeBox() {
        if (!this.game.player) return;
        
        // Calculate spawn position based on finding actual ground level
        const spawnX = this.game.player.x + 500; // Spawn ahead of player
        const spawnY = this.findGroundLevel(spawnX);
        
        // Only spawn if we found a valid ground level
        if (spawnY === this.game.canvas.height * 0.6) {
            console.warn('❤️ Could not find valid ground level, skipping lifebox spawn');
            return;
        }
        
        const lifeBox = {
            x: spawnX,
            y: spawnY - 35, // Spawn above the ground surface
            width: this.lifeBoxSize,
            height: this.lifeBoxSize,
            animationTime: 0,
            baseY: spawnY - 35 // Store original Y for floating animation
        };
        
        this.spawnedLifeBoxes.push(lifeBox);
        console.log(`❤️ Spawned life box at position (${spawnX}, ${spawnY - 35}) on ground level ${spawnY}`);
    }
      /**
     * Find the ground level at a specific world X position
     * @param {number} worldX - The world X coordinate to check
     * @returns {number} - The Y coordinate of the ground surface
     */    findGroundLevel(worldX) {
        if (!this.game.world) {
            // Fallback if world is not available
            return this.game.canvas.height * 0.6;
        }
        
        const tileX = Math.floor(worldX / GAME_CONFIG.TILE_SIZE);
        
        // Search from bottom up to find the first solid tile (floor or platform)
        for (let tileY = GAME_CONFIG.CHUNK_HEIGHT - 1; tileY >= 0; tileY--) {
            const tile = this.game.world.getTileAt(tileX, tileY);
            
            // Check if this is a solid tile (floor or platform)
            if (tile === TILE_TYPES.FLOOR || tile === TILE_TYPES.PLATFORM) {
                return tileY * GAME_CONFIG.TILE_SIZE; // Convert tile coordinate to pixel coordinate
            }
        }
        
        // Try nearby tiles if current position has no ground
        for (let offset = 1; offset <= 3; offset++) {
            // Check tiles to the left and right
            for (let direction of [-1, 1]) {
                const checkX = tileX + (direction * offset);
                if (checkX >= 0) {
                    for (let tileY = GAME_CONFIG.CHUNK_HEIGHT - 1; tileY >= 0; tileY--) {
                        const tile = this.game.world.getTileAt(checkX, tileY);
                        
                        // Check if this is a solid tile (floor or platform)
                        if (tile === TILE_TYPES.FLOOR || tile === TILE_TYPES.PLATFORM) {
                            const groundY = tileY * GAME_CONFIG.TILE_SIZE;
                            console.log(`❤️ Found ground at nearby tile offset ${direction * offset}: groundY=${groundY}`);
                            return groundY;
                        }
                    }
                }
            }
        }
        
        // Fallback: return a reasonable ground level
        return this.game.canvas.height * 0.6;
    }
    
    checkCollisionWithPlayer(lifeBox) {
        if (!this.game.player) return false;
        
        const player = this.game.player;
        const playerBounds = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        return (lifeBox.x < playerBounds.x + playerBounds.width &&
                lifeBox.x + lifeBox.width > playerBounds.x &&
                lifeBox.y < playerBounds.y + playerBounds.height &&
                lifeBox.y + lifeBox.height > playerBounds.y);
    }
    
    collectLifeBox(lifeBox) {
        if (!this.game.player) return;
        
        // Heal the player by 1 heart
        if (this.game.player.health < this.game.player.maxHealth) {
            this.game.player.health = Math.min(this.game.player.health + 1, this.game.player.maxHealth);
            console.log(`❤️ Life box collected! Health: ${this.game.player.health}/${this.game.player.maxHealth}`);
            
            // Play sound effect if available
            if (this.game.audioSystem) {
                this.game.audioSystem.onCollectCoin(); // Reuse coin collection sound
            }
            
            // Add visual feedback
            this.createCollectionEffect(lifeBox);
        } else {
            console.log(`❤️ Life box collected but health is already full!`);
        }
    }
    
    createCollectionEffect(lifeBox) {
        // Add floating +1 health text effect
        if (this.game.player && this.game.player.damageTexts) {
            this.game.player.damageTexts.push({
                x: lifeBox.x + lifeBox.width / 2,
                y: lifeBox.y,
                text: '+1 ❤️',
                color: '#ff6b9d',
                opacity: 1,
                lifetime: 2000,
                maxLifetime: 2000
            });
        }
    }
    
    render(ctx) {
        ctx.save();
        
        this.spawnedLifeBoxes.forEach(lifeBox => {
            this.renderLifeBox(ctx, lifeBox);
        });
        
        ctx.restore();
    }
    
    renderLifeBox(ctx, lifeBox) {
        const camera = this.game.camera || { x: 0, y: 0 };
        
        // Calculate floating animation
        const floatOffset = Math.sin(lifeBox.animationTime * this.floatSpeed) * this.floatAmount;
        const pulseScale = 1 + Math.sin(lifeBox.animationTime * this.pulseSpeed) * 0.15;
        
        // Apply camera transform
        const screenX = lifeBox.x - camera.x;
        const screenY = lifeBox.baseY - camera.y + floatOffset;
        
        // Skip if off-screen
        if (screenX < -100 || screenX > ctx.canvas.width + 100) {
            return;
        }
        
        const centerX = screenX + lifeBox.width / 2;
        const centerY = screenY + lifeBox.height / 2;
        
        ctx.save();
        
        // Apply scaling from center
        ctx.translate(centerX, centerY);
        ctx.scale(pulseScale, pulseScale);
        ctx.translate(-lifeBox.width / 2, -lifeBox.height / 2);
        
        // Outer glow
        ctx.shadowColor = '#ff6b9d';
        ctx.shadowBlur = 15;
        
        // Main life box (heart shape using rectangles)
        ctx.fillStyle = '#ff6b9d';
        
        // Draw a simple cross/plus shape for health
        const crossSize = lifeBox.width * 0.6;
        const thickness = crossSize * 0.3;
        
        // Horizontal bar
        ctx.fillRect(
            lifeBox.width / 2 - crossSize / 2,
            lifeBox.height / 2 - thickness / 2,
            crossSize,
            thickness
        );
        
        // Vertical bar
        ctx.fillRect(
            lifeBox.width / 2 - thickness / 2,
            lifeBox.height / 2 - crossSize / 2,
            thickness,
            crossSize
        );
        
        // Add white highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        
        // Smaller cross on top for highlight
        const highlightSize = crossSize * 0.4;
        const highlightThickness = thickness * 0.4;
        
        // Horizontal highlight
        ctx.fillRect(
            lifeBox.width / 2 - highlightSize / 2,
            lifeBox.height / 2 - highlightThickness / 2,
            highlightSize,
            highlightThickness
        );
        
        // Vertical highlight
        ctx.fillRect(
            lifeBox.width / 2 - highlightThickness / 2,
            lifeBox.height / 2 - highlightSize / 2,
            highlightThickness,
            highlightSize
        );
        
        ctx.restore();
    }
    
    // Debug method to manually spawn a life box for testing
    debugSpawnLifeBox() {
        this.spawnLifeBox();
        console.log('🔧 Debug: Life box manually spawned');
    }
    
    // Get count of life boxes on screen
    getLifeBoxCount() {
        return this.spawnedLifeBoxes.length;
    }
    
    // Reset system (called when game restarts)
    reset() {
        this.spawnedLifeBoxes = [];
        this.lastSpawnDistance = 0;
        console.log('🔄 LifeBoxSystem reset');
    }
}
