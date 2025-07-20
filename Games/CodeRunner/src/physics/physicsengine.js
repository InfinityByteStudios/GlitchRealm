/**
 * Physics Engine - Handles collision detection and physics calculations
 */

import { GAME_CONFIG, TILE_TYPES } from '../utils/constants.js';

export class PhysicsEngine {
    constructor(world) {
        this.world = world;
        
        // Performance optimizations
        this.collisionCache = new Map();
        this.lastCacheClean = 0;
        this.maxCacheSize = 100;
        this.cacheHitCount = 0;
        this.cacheMissCount = 0;
    }
    
    /**
     * Check collision for a rectangular area
     */
    checkCollision(x, y, width, height, direction = 0, playerDropping = false) {
        try {
            // Validate inputs - prevent NaN from undefined dimensions
            if (width === undefined || width === null || isNaN(width)) {
                console.warn('Invalid width in checkCollision:', width);
                width = 28; // GAME_CONFIG.PLAYER_WIDTH fallback
            }
            if (height === undefined || height === null || isNaN(height)) {
                console.warn('Invalid height in checkCollision:', height);
                height = 44; // GAME_CONFIG.PLAYER_HEIGHT fallback
            }
            if (isNaN(x) || isNaN(y)) {
                console.warn('Invalid position in checkCollision:', x, y);
                return { collision: false };
            }
        
        // Create cache key for collision check
        const cacheKey = `${Math.floor(x)}_${Math.floor(y)}_${width}_${height}_${direction}_${playerDropping}`;
        
        // Check cache first
        if (this.collisionCache.has(cacheKey)) {
            this.cacheHitCount++;
            return this.collisionCache.get(cacheKey);
        }
        
        this.cacheMissCount++;
        
        const left = Math.floor(x / GAME_CONFIG.TILE_SIZE);
        const right = Math.floor((x + width - 1) / GAME_CONFIG.TILE_SIZE);
        const top = Math.floor(y / GAME_CONFIG.TILE_SIZE);
        const bottom = Math.floor((y + height - 1) / GAME_CONFIG.TILE_SIZE);
        
        const collisions = [];
        
        for (let tileY = top; tileY <= bottom; tileY++) {
            for (let tileX = left; tileX <= right; tileX++) {
                const tile = this.world.getTileAt(tileX, tileY);
                
                if (this.isTileSolid(tile, direction, playerDropping)) {
                    collisions.push({
                        collision: true,
                        tileType: tile,
                        tileX: tileX,
                        tileY: tileY
                    });
                }
            }
        }
        
        let result;
        if (collisions.length === 0) {
            result = { collision: false };
        } else {
            // Return the most appropriate collision based on movement direction
            result = this.getMostRelevantCollision(collisions, x, y, width, height, direction);
        }
        
        // Cache the result
        if (this.collisionCache.size >= this.maxCacheSize) {
            // Remove oldest entry to prevent memory issues
            const firstKey = this.collisionCache.keys().next().value;
            this.collisionCache.delete(firstKey);
        }
        this.collisionCache.set(cacheKey, result);
        
        return result;
        
        } catch (error) {
            console.error('Error in checkCollision:', error);
            return { collision: false };
        }
    }
    
    /**
     * Get the most relevant collision based on movement direction and proximity
     */
    getMostRelevantCollision(collisions, playerX, playerY, playerWidth, playerHeight, direction) {
        if (collisions.length === 1) {
            return collisions[0];
        }
        
        // For vertical movement (falling down), choose the topmost collision that's actually below the player
        if (direction === 1) { // Moving down
            const playerBottom = playerY + playerHeight;
            const validCollisions = collisions.filter(collision => {
                const tileTop = collision.tileY * GAME_CONFIG.TILE_SIZE;
                return tileTop >= playerBottom - 10; // Allow small overlap for precision
            });
            
            if (validCollisions.length === 0) {
                return this.getClosestCollision(collisions, playerX, playerY, playerWidth, playerHeight);
            }
            
            let topmost = validCollisions[0];
            for (const collision of validCollisions) {
                if (collision.tileY < topmost.tileY) {
                    topmost = collision;
                }
            }
            return topmost;
        }
        
        // For vertical movement (jumping up), choose the bottommost collision that's actually above the player
        if (direction === -1) { // Moving up
            const playerTop = playerY;
            const validCollisions = collisions.filter(collision => {
                const tileBottom = (collision.tileY + 1) * GAME_CONFIG.TILE_SIZE;
                return tileBottom <= playerTop + 10; // Allow small overlap for precision
            });
            
            if (validCollisions.length === 0) {
                return this.getClosestCollision(collisions, playerX, playerY, playerWidth, playerHeight);
            }
            
            let bottommost = validCollisions[0];
            for (const collision of validCollisions) {
                if (collision.tileY > bottommost.tileY) {
                    bottommost = collision;
                }
            }
            return bottommost;
        }
        
        // For horizontal movement, prioritize collision in the direction of movement
        if (direction === 0) { // Horizontal movement
            const playerCenterX = playerX + playerWidth / 2;
            
            // Sort by proximity to player center horizontally
            let closest = collisions[0];
            let minDistance = Math.abs((closest.tileX + 0.5) * GAME_CONFIG.TILE_SIZE - playerCenterX);
            
            for (const collision of collisions) {
                const distance = Math.abs((collision.tileX + 0.5) * GAME_CONFIG.TILE_SIZE - playerCenterX);
                if (distance < minDistance) {
                    minDistance = distance;
                    closest = collision;
                }
            }
            return closest;
        }
        
        // For horizontal movement or no direction, choose the closest collision
        return this.getClosestCollision(collisions, playerX, playerY, playerWidth, playerHeight);
    }
    
    /**
     * Get the closest collision by distance
     */
    getClosestCollision(collisions, playerX, playerY, playerWidth, playerHeight) {
        const playerCenterX = playerX + playerWidth / 2;
        const playerCenterY = playerY + playerHeight / 2;
        
        let closest = collisions[0];
        let minDistance = this.getDistanceToTile(playerCenterX, playerCenterY, closest.tileX, closest.tileY);
        
        for (const collision of collisions) {
            const distance = this.getDistanceToTile(playerCenterX, playerCenterY, collision.tileX, collision.tileY);
            if (distance < minDistance) {
                minDistance = distance;
                closest = collision;
            }
        }
        
        return closest;
    }
    
    /**
     * Calculate distance from player center to tile center
     */
    getDistanceToTile(playerCenterX, playerCenterY, tileX, tileY) {
        const tileCenterX = (tileX + 0.5) * GAME_CONFIG.TILE_SIZE;
        const tileCenterY = (tileY + 0.5) * GAME_CONFIG.TILE_SIZE;
        
        const dx = playerCenterX - tileCenterX;
        const dy = playerCenterY - tileCenterY;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Check if a tile is solid based on game rules
     */
    isTileSolid(tileType, direction, playerDropping) {
        const currentTime = Date.now();
        
        switch (tileType) {
            case TILE_TYPES.FLOOR:
                return true;
            case TILE_TYPES.PLATFORM:
                return direction === 1 && !playerDropping;
            case TILE_TYPES.SPIKE:
                return false;
            case TILE_TYPES.GLITCH:
                return false; // Glitches are no longer solid in single mode
            case TILE_TYPES.SAW:
                return false; // Saws damage but don't block
            case TILE_TYPES.LASER:
                // Laser source tiles act like platforms - solid when landing from above
                return direction === 1 && !playerDropping;
            case TILE_TYPES.CRUSHER:
                // Crushers are solid only when extended
                const crusherCycle = GAME_CONFIG.CRUSHER_CYCLE_TIME;
                const crushPos = (currentTime % crusherCycle) / crusherCycle;
                return crushPos >= 0.5 && crushPos < 0.7; // Solid when extended
            default:
                return false;
        }
    }
    
    /**
     * Handle horizontal movement with collision
     */
    handleHorizontalMovement(entity, deltaSeconds) {
        if (!this.world) {
            entity.x += entity.vx * deltaSeconds;
            return;
        }
        
        const originalX = entity.x;
        const deltaX = entity.vx * deltaSeconds;
        const newX = originalX + deltaX;
        
        // Check if the new position would cause a collision
        const collision = this.checkCollision(newX, entity.y, entity.width, entity.height, 0);
        
        if (collision.collision) {
            const movingRight = entity.vx > 0;
            
            if (movingRight) {
                // Moving right - stop just before the collision tile
                const tileLeft = collision.tileX * GAME_CONFIG.TILE_SIZE;
                const stopPosition = tileLeft - entity.width - 1;
                
                // Only stop if we're actually moving into the tile
                if (newX + entity.width > tileLeft && originalX + entity.width <= tileLeft + 2) {
                    entity.x = Math.max(originalX, stopPosition);
                    entity.vx = 0;
                } else {
                    entity.x = newX;
                }
            } else {
                // Moving left - stop just after the collision tile
                const tileRight = (collision.tileX + 1) * GAME_CONFIG.TILE_SIZE;
                const stopPosition = tileRight + 1;
                
                // Only stop if we're actually moving into the tile
                if (newX < tileRight && originalX >= tileRight - 2) {
                    entity.x = Math.min(originalX, stopPosition);
                    entity.vx = 0;
                } else {
                    entity.x = newX;
                }
            }
        } else {
            // No collision - move freely
            entity.x = newX;
        }
        
        // Prevent going off the left edge of the world
        if (entity.x < 0) {
            entity.x = 0;
            entity.vx = 0;
        }
    }
    
    /**
     * Handle vertical movement with collision
     */
    handleVerticalMovement(entity, deltaSeconds) {
        if (!this.world) {
            entity.y += entity.vy * deltaSeconds;
            if (entity.y + entity.height >= entity.FLOOR_Y) {
                entity.y = entity.FLOOR_Y - entity.height;
                entity.vy = 0;
                entity.onGround = true;
                entity.isJumping = false;
            } else {
                entity.onGround = false;
            }
            return;
        }

        const oldY = entity.y;
        const newY = entity.y + entity.vy * deltaSeconds;
        const direction = entity.vy > 0 ? 1 : (entity.vy < 0 ? -1 : 0);
        const isDropping = entity.isPressingDown;

        const collision = this.checkCollision(entity.x, newY, entity.width, entity.height, direction, isDropping);
        
        if (collision.collision) {
            // Calculate the tile's world position
            const tileWorldY = collision.tileY * GAME_CONFIG.TILE_SIZE;
            
            if (entity.vy > 0) {
                // Landing on ground - validate this makes sense
                const proposedY = tileWorldY - entity.height - 0.1;
                
                // Safety check: Don't allow teleporting upward when falling
                if (proposedY < oldY - 5) { // Allow small correction (5px) but not major teleportation
                    entity.y = newY; // Continue falling instead
                    entity.onGround = false;
                } else {
                    entity.y = proposedY;
                    entity.vy = 0;
                    entity.onGround = true;
                    entity.isJumping = false;
                    
                    // Reset double jump when landing
                    if (entity.resetDoubleJump) {
                        entity.resetDoubleJump();
                    }
                }
            } else if (entity.vy < 0) {
                // Hitting ceiling - validate this makes sense
                const proposedY = tileWorldY + GAME_CONFIG.TILE_SIZE + 0.1;
                
                // Safety check: Don't allow teleporting downward when jumping
                if (proposedY > oldY + 5) {
                    entity.y = newY; // Continue moving instead
                } else {
                    entity.y = proposedY;
                    entity.vy = 0;
                }
            }
        } else {
            entity.y = newY;
            // When there's no collision, the player is in the air
            entity.onGround = false;
        }
    }
    
    /**
     * Check for hazards at entity position
     */
    checkHazards(entity, gameTime = null) {
        const left = Math.floor(entity.x / GAME_CONFIG.TILE_SIZE);
        const right = Math.floor((entity.x + entity.width - 1) / GAME_CONFIG.TILE_SIZE);
        const top = Math.floor(entity.y / GAME_CONFIG.TILE_SIZE);
        const bottom = Math.floor((entity.y + entity.height - 1) / GAME_CONFIG.TILE_SIZE);
        
        // Use consistent time source - prefer game time over Date.now()
        const currentTime = gameTime !== null ? (gameTime * 1000) : Date.now();
        
        // Check all tiles that the player's hitbox overlaps
        for (let tileY = top; tileY <= bottom; tileY++) {
            for (let tileX = left; tileX <= right; tileX++) {
                const tile = this.world.getTileAt(tileX, tileY);
                
                // Static hazards
                if (tile === TILE_TYPES.SPIKE) {
                    return { hazard: true, type: 'spike' };
                }
                
                // Dynamic saw blade - always hazardous
                if (tile === TILE_TYPES.SAW) {
                    return { hazard: true, type: 'saw' };
                }
                
                // Fire laser - laser source itself is not hazardous
                // Only the actual laser beams are hazardous (handled by checkForLaserBeams)
                if (tile === TILE_TYPES.LASER) {
                    // Laser source tile itself is safe to touch
                    // Damage only comes from the laser beams, not the source block
                }
                
                // Check for visible laser beams from adjacent lasers
                if (this.checkForLaserBeams(entity, tileX, tileY, currentTime)) {
                    return { hazard: true, type: 'laser' };
                }
                
                // Crusher - check for collision with the moving crusher block
                if (tile === TILE_TYPES.CRUSHER) {
                    const cycleTime = GAME_CONFIG.CRUSHER_CYCLE_TIME;
                    const cycle = (currentTime % cycleTime) / cycleTime;
                    
                    // Calculate crusher position based on animation cycle
                    let crusherPosition = 0;
                    if (cycle < 0.4) {
                        // Top position (waiting)
                        crusherPosition = 0;
                    } else if (cycle < 0.5) {
                        // Coming down fast
                        crusherPosition = (cycle - 0.4) * 10 * (GAME_CONFIG.TILE_SIZE * 1.5);
                    } else if (cycle < 0.7) {
                        // Bottom position (crushing)
                        crusherPosition = GAME_CONFIG.TILE_SIZE * 1.5;
                    } else {
                        // Moving back up slowly
                        crusherPosition = (GAME_CONFIG.TILE_SIZE * 1.5) * (1 - (cycle - 0.7) / 0.3);
                    }
                    
                    // Calculate the actual position of the crusher block
                    const crusherTileY = tileY * GAME_CONFIG.TILE_SIZE;
                    const crusherBlockTop = crusherTileY + crusherPosition;
                    const crusherBlockBottom = crusherBlockTop + (GAME_CONFIG.TILE_SIZE * 0.4); // Crusher height
                    
                    // Check if player collides with the crusher block
                    const playerTop = entity.y;
                    const playerBottom = entity.y + entity.height;
                    const playerLeft = entity.x;
                    const playerRight = entity.x + entity.width;
                    
                    // Check for overlap in both X and Y dimensions
                    const crusherLeft = tileX * GAME_CONFIG.TILE_SIZE + (GAME_CONFIG.TILE_SIZE * 0.1); // Crusher is 80% width
                    const crusherRight = crusherLeft + (GAME_CONFIG.TILE_SIZE * 0.8);
                    
                    // Collision detection: check if rectangles overlap
                    if (playerRight > crusherLeft && playerLeft < crusherRight &&
                        playerBottom > crusherBlockTop && playerTop < crusherBlockBottom) {
                        return { hazard: true, type: 'crusher' };
                    }
                    
                    // Also check for extended crushers below this position (original logic)
                    if (this.checkForCrusherExtension(entity, tileX, tileY, currentTime)) {
                        return { hazard: true, type: 'crusher' };
                    }
                }
  
            }
        }
        
        // Check for deadly falls (below the ground level with buffer)
        // Ground level is at y = 10, so ground tiles are at y = 10 * 32 = 320
        // Add a generous buffer below the ground level for fall detection
        const groundLevelY = 10 * GAME_CONFIG.TILE_SIZE; // 320
        const fallThreshold = groundLevelY + 200; // 520 - well below ground level
        
        if (entity.y > fallThreshold) {
            return { hazard: true, type: 'fall' };
        }
        
        // Check for going off the left side of the world
        if (entity.x < -100) {
            return { hazard: true, type: 'outOfBounds' };
        }
        
        return { hazard: false };
    }
    
    /**
     * Check for collectible items and handle collection
     */
    checkCollectibles(x, y, width, height, game) {
        const left = Math.floor(x / GAME_CONFIG.TILE_SIZE);
        const right = Math.floor((x + width - 1) / GAME_CONFIG.TILE_SIZE);
        const top = Math.floor(y / GAME_CONFIG.TILE_SIZE);
        const bottom = Math.floor((y + height - 1) / GAME_CONFIG.TILE_SIZE);
        
        const collected = [];
        
        for (let tileY = top; tileY <= bottom; tileY++) {
            for (let tileX = left; tileX <= right; tileX++) {
                const tile = this.world.getTileAt(tileX, tileY);
                
                if (tile === TILE_TYPES.DATA_PACKET) {
                    // Collect the data packet
                    this.world.setTileAt(tileX, tileY, TILE_TYPES.EMPTY);
                    
                    // Award points based on difficulty level
                    let basePoints = 1;
                    if (game && game.selectedDifficulty) {
                        switch (game.selectedDifficulty) {
                            case 'EASY':
                                basePoints = 1;
                                break;
                            case 'MEDIUM':
                                basePoints = 3;
                                break;
                            case 'HARD':
                                basePoints = 5;
                                break;
                            case 'EXTREME':
                                basePoints = 7;
                                break;
                            default:
                                basePoints = 1;
                        }
                    }
                    
                    // Apply datapack multiplier from shop upgrades if available
                    let finalPoints = basePoints;
                    if (game && game.player && game.player.shopUpgrades.datapackMultiplier > 1.0) {
                        finalPoints = Math.floor(basePoints * game.player.shopUpgrades.datapackMultiplier);
                    }
                    
                    collected.push({
                        type: 'dataPacket',
                        tileX: tileX,
                        tileY: tileY,
                        points: finalPoints,
                        basePoints: basePoints,
                        worldX: tileX * GAME_CONFIG.TILE_SIZE,
                        worldY: tileY * GAME_CONFIG.TILE_SIZE
                    });
                    
                    // Add to upgrade system currency
                    if (game && game.upgradeSystem) {
                        game.upgradeSystem.addDataPackets(finalPoints);
                        
                        // Show first-time data packet hint
                        if (game.tutorialSystem) {
                            game.tutorialSystem.showDataPacketHint();
                        }
                        
                        // Trigger manual save after collecting datapackets to ensure they're saved
                        if (game.triggerManualSave) {
                            game.triggerManualSave();
                        }
                    }
                    
                    // Add 10 points to game bonus score for data packet collection
                    if (game) {
                        let scoreBonus = 10;
                        
                        // Apply score multiplier from shop upgrades if available
                        if (game.player && game.player.shopUpgrades.scoreMultiplier > 1.0) {
                            scoreBonus = Math.floor(scoreBonus * game.player.shopUpgrades.scoreMultiplier);
                        }
                        
                        // Initialize bonus score if it doesn't exist
                        if (game.bonusScore === undefined) {
                            game.bonusScore = 0;
                        }
                        
                        game.bonusScore += scoreBonus;
                        
                        // Track achievement: Data packet collection
                        if (game.achievementSystem) {
                            game.achievementSystem.trackEvent('dataPacketCollected', {
                                points: scoreBonus
                            });
                        }
                    }
                }
            }
        }
        
        return collected;
    }
    
    /**
     * Check if the entity is in the path of any active laser beams
     * @param {Object} entity - The entity (usually player) to check
     * @param {number} tileX - Current tile X position
     * @param {number} tileY - Current tile Y position
     * @param {number} currentTime - Current time for animation cycles
     * @returns {boolean} - True if entity is hit by a visible laser beam
     */
    checkForLaserBeams(entity, tileX, tileY, currentTime) {
        const laserInterval = GAME_CONFIG.LASER_INTERVAL;
        const laserDuration = 1000; // 1 second beam duration
        const cycleTime = currentTime % laserInterval;
        const isLaserActive = cycleTime < laserDuration;
        
        // Only check when lasers are active
        if (!isLaserActive) return false;
        
        // Entity's hitbox
        const entityLeft = entity.x;
        const entityRight = entity.x + entity.width;
        const entityTop = entity.y;
        const entityBottom = entity.y + entity.height;
        const entityCenterY = entityTop + entity.height / 2;
        
        // Get beam length from game config or use default
        const beamLength = GAME_CONFIG.TILE_SIZE * 3; // Default beam length (3 tiles)
        
        // Check for lasers to the left of the player
        for (let checkX = Math.max(0, tileX - 5); checkX < tileX; checkX++) {
            // Check if the tile is a laser
            const tile = this.world.getTileAt(checkX, tileY);
            if (tile === TILE_TYPES.LASER) {
                const laserWorldX = checkX * GAME_CONFIG.TILE_SIZE;
                const laserCenterY = tileY * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
                
                // Check if player is within the vertical range of the beam
                if (Math.abs(entityCenterY - laserCenterY) < 8) { // Slightly larger vertical hitbox
                    // Laser beam starts at the right edge of the laser tile
                    const beamStartX = laserWorldX + GAME_CONFIG.TILE_SIZE;
                    // Beam ends at this distance or at the first obstacle
                    let beamEndX = beamStartX + beamLength;
                    
                    // Check for obstacles in the beam path
                    let isBeamPathBlocked = false;
                    for (let obstacleX = checkX + 1; obstacleX < tileX + 4; obstacleX++) {
                        // Stop at the player's current position or a bit further
                        if (obstacleX > tileX) break;
                        
                        const obstacleTile = this.world.getTileAt(obstacleX, tileY);
                        if (obstacleTile !== TILE_TYPES.EMPTY && 
                            obstacleTile !== TILE_TYPES.DATA_PACKET) {
                            // Found an obstacle, beam stops here
                            beamEndX = obstacleX * GAME_CONFIG.TILE_SIZE;
                            isBeamPathBlocked = true;
                            break;
                        }
                    }
                    
                    // Only damage player if they're within the beam's path
                    if (entityRight > beamStartX && entityLeft < beamEndX) {
                        return true; // Player is hit by laser
                    }
                }
            }
        }
        
        // Note: Lasers only shoot to the right, so we only need to check lasers to the left
        // The second loop for "lasers to the right" was creating invisible beams shooting left
        
        return false;
    }
    
    /**
     * Check if the entity is in the path of any extended crushers
     * @param {Object} entity - The entity (usually player) to check
     * @param {number} tileX - Current tile X position
     * @param {number} tileY - Current tile Y position
     * @param {number} currentTime - Current time for animation cycles
     * @returns {boolean} - True if entity is hit by a crusher
     */
    checkForCrusherExtension(entity, tileX, tileY, currentTime) {
        const cycleTime = GAME_CONFIG.CRUSHER_CYCLE_TIME;
        
        // Check for crushers above the current position
        for (let checkY = 0; checkY < tileY; checkY++) {
            const tile = this.world.getTileAt(tileX, checkY);
            
            if (tile === TILE_TYPES.CRUSHER) {
                // Calculate crusher extension using the same animation logic as the renderer
                const cycle = (currentTime % cycleTime) / cycleTime;
                
                let crusherPosition = 0;
                if (cycle < 0.4) {
                    // Top position (waiting) - no extension
                    crusherPosition = 0;
                } else if (cycle < 0.5) {
                    // Coming down fast
                    crusherPosition = (cycle - 0.4) * 10 * (GAME_CONFIG.TILE_SIZE * 1.5);
                } else if (cycle < 0.7) {
                    // Bottom position (crushing) - full extension
                    crusherPosition = GAME_CONFIG.TILE_SIZE * 1.5;
                } else {
                    // Moving back up slowly
                    crusherPosition = (GAME_CONFIG.TILE_SIZE * 1.5) * (1 - (cycle - 0.7) / 0.3);
                }
                
                // Only check collision if crusher is moving or extended
                if (crusherPosition > 0) {
                    const crusherTileY = checkY * GAME_CONFIG.TILE_SIZE;
                    const crusherBlockTop = crusherTileY + crusherPosition;
                    const crusherBlockBottom = crusherBlockTop + (GAME_CONFIG.TILE_SIZE * 0.4); // Crusher height
                    
                    // Check if player overlaps with the extended crusher
                    const playerTop = entity.y;
                    const playerBottom = entity.y + entity.height;
                    const playerLeft = entity.x;
                    const playerRight = entity.x + entity.width;
                    
                    const crusherLeft = tileX * GAME_CONFIG.TILE_SIZE + (GAME_CONFIG.TILE_SIZE * 0.1);
                    const crusherRight = crusherLeft + (GAME_CONFIG.TILE_SIZE * 0.8);
                    
                    // Check if rectangles overlap
                    if (playerRight > crusherLeft && playerLeft < crusherRight &&
                        playerBottom > crusherBlockTop && playerTop < crusherBlockBottom) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * Update method for PhysicsEngine - no-op implementation
     * This method is called by the game loop but the PhysicsEngine
     * doesn't need to perform any frame-based updates since it's
     * a stateless collision detection system.
     */
    update(deltaTime) {
        // No-op: PhysicsEngine is stateless and doesn't need frame updates
        // All physics calculations are done on-demand in movement methods
    }
}
