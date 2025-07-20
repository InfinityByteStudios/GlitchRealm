/**
 * World Generator - Procedural terrain generation system
 */

import { GAME_CONFIG, TILE_TYPES, DIFFICULTY_LEVELS } from '../utils/constants.js';
import { TileRenderer } from '../rendering/TileRenderer.js';

export class WorldGenerator {
    constructor(game) {
        this.game = game;
        this.chunks = new Map();
        this.lastGeneratedChunk = -2; // Start at -2 so chunk 0 gets generated properly        this.groundLevel = 10;
        this.currentGroundLevel = 10; // Dynamic ground level that changes
        this.difficulty = 1;
        
        // Progressive difficulty variables
        this.obstacleFrequency = 1;
        this.gapSizeMultiplier = 1;
        this.patternFrequency = 1;
        this.currentDistance = 0;
        this.lastSpikeWorldX = -10;
        this.lastPlatformSpikePos = { x: -10, y: -10 }; // Track last platform spike position
        this.tileRenderer = new TileRenderer();
        this.TILE_TYPES = TILE_TYPES; // Make TILE_TYPES accessible to other classes
        this.obstaclePositions = []; // Track all obstacle positions for spacing
        this.sawPositions = []; // Separate tracking for saws to allow closer placement
        this.lastObstaclesCleanup = 0; // Track when we last cleaned up old obstacles
        
        // Add randomization seeds for different terrain features
        this.terrainSeed = Math.random() * 1000;
        this.lastTerrainType = 'normal';
        this.chunkTypeCounter = 0;
        
        // Performance optimizations
        this.visibleChunks = new Set(); // Track currently visible chunks
        this.chunkRenderCache = new Map(); // Cache rendered chunk data
        this.lastCameraX = -1; // Track camera movement for render optimization
        this.chunkPooling = new Map(); // Pool chunks to avoid constant allocation
        this.maxPoolSize = 10; // Limit pool size
        this.lastCleanupTime = 0; // Track when we last cleaned up
        this.chunkGenerationQueue = []; // Queue for async chunk generation
        this.maxChunkCacheSize = 20; // Limit cache size to prevent memory issues
        this.lastChunkCleanup = 0; // Track when we last cleaned up chunks

        // Force generation of spawn chunk immediately
        this.initialize();
    }

    /**
     * Perform periodic cleanup to prevent memory issues
     */
    performPeriodicCleanup(camera) {
        try {
            // Clear old cache entries
            if (this.chunkRenderCache.size > this.maxChunkCacheSize) {
                const cacheKeys = Array.from(this.chunkRenderCache.keys());
                const keysToRemove = cacheKeys.slice(0, cacheKeys.length - this.maxChunkCacheSize);
                keysToRemove.forEach(key => this.chunkRenderCache.delete(key));
            }
            
            // Clear old obstacle positions
            if (this.obstaclePositions.length > 1000) {
                this.obstaclePositions = this.obstaclePositions.slice(-500);
            }
            
            // Clear old saw positions
            if (this.sawPositions.length > 500) {
                this.sawPositions = this.sawPositions.slice(-250);
            }
            
            // Return pooled chunks to pool
            if (this.chunkPooling.size > this.maxPoolSize) {
                const poolKeys = Array.from(this.chunkPooling.keys());
                const keysToRemove = poolKeys.slice(0, poolKeys.length - this.maxPoolSize);
                keysToRemove.forEach(key => this.chunkPooling.delete(key));
            }
            
            console.log('🧹 WorldGenerator cleanup completed');
        } catch (error) {
            console.error('Error during WorldGenerator cleanup:', error);
        }
    }
    
    /**
     * Initialize the world generator
     */
    initialize() {
        // Force generation of spawn chunk immediately
        this.generateChunk(0);
    }
    
    update(deltaTime, camera) {
        // Safety check for camera
        if (!camera || typeof camera.x !== 'number' || typeof camera.y !== 'number') {
            console.warn('WorldGenerator.update: Invalid camera object', camera);
            return;
        }

        // Update the tile renderer animation time
        this.tileRenderer.update(deltaTime);
        
        // Calculate progressive difficulty based on distance and selected difficulty level
        this.updateProgressiveDifficulty(camera.x);
        
        this.generateChunksForCamera(camera);
        this.cleanupOldChunks(camera);
        
        // Periodic cleanup to prevent memory issues
        const currentTime = Date.now();
        if (currentTime - this.lastChunkCleanup > 5000) { // Every 5 seconds
            this.performPeriodicCleanup(camera);
            this.lastChunkCleanup = currentTime;
        }
    }/**
     * Calculate progressive difficulty scaling based on distance and selected difficulty level
     */
    updateProgressiveDifficulty(cameraX) {
        const selectedDifficulty = this.game.selectedDifficulty || 'EASY';
        const difficultyConfig = DIFFICULTY_LEVELS[selectedDifficulty];
        
        // Add a grace period for the first 500m where difficulty doesn't increase
        const adjustedDistance = Math.max(0, cameraX - 500);
        
        // Calculate how many difficulty intervals have passed
        const intervalsCompleted = Math.floor(adjustedDistance / difficultyConfig.difficultyInterval);
        
        // Base difficulty starts at 1, increases based on intervals and scaling factor
        const baseDifficulty = 1 + (intervalsCompleted * difficultyConfig.obstacleScaling);
        
        // Apply adaptive difficulty multiplier if enabled
        let adaptiveMultiplier = 1.0;
        if (this.game.adaptiveDifficulty && this.game.adaptiveDifficultyMultiplier) {
            adaptiveMultiplier = this.game.adaptiveDifficultyMultiplier;
        }
        
        // Apply maximum difficulty cap
        this.difficulty = Math.min(baseDifficulty * adaptiveMultiplier, difficultyConfig.maxDifficultyMultiplier * adaptiveMultiplier);
        
        // Calculate separate scaling factors for different aspects
        this.obstacleFrequency = this.difficulty;
        this.gapSizeMultiplier = 1 + (intervalsCompleted * difficultyConfig.gapScaling);
        this.patternFrequency = Math.min(1 + (intervalsCompleted * 0.1), 2.0); // Pattern frequency caps at 2x
        
        // Store current distance for other methods to use
        this.currentDistance = cameraX;
    }
    
    generateChunksForCamera(camera) {
        const currentChunk = Math.floor(camera.x / (GAME_CONFIG.CHUNK_WIDTH * GAME_CONFIG.TILE_SIZE));
        const minChunk = Math.max(0, currentChunk - 2); // Generate chunks further behind the player
        const maxChunk = currentChunk + GAME_CONFIG.GENERATION_DISTANCE + 2; // Generate chunks further ahead
        
        // Generate chunks from minChunk to maxChunk
        for (let chunkX = minChunk; chunkX <= maxChunk; chunkX++) {
            if (!this.chunks.has(chunkX)) {
                this.generateChunk(chunkX);
            }
        }
        
        this.lastGeneratedChunk = Math.max(this.lastGeneratedChunk, maxChunk);
    }      generateChunk(chunkX) {
        if (this.chunks.has(chunkX)) return;
        
        const chunk = {
            x: chunkX,
            tiles: [],
            generated: true,
            terrainType: this.determineTerrainType(chunkX)
        };
        
        // Initialize empty chunk
        for (let y = 0; y < GAME_CONFIG.CHUNK_HEIGHT; y++) {
            chunk.tiles[y] = [];
            for (let x = 0; x < GAME_CONFIG.CHUNK_WIDTH; x++) {
                chunk.tiles[y][x] = TILE_TYPES.EMPTY;
            }
        }
        
        // Update ground level for variation (except spawn chunk)
        if (chunkX > 0) {
            this.updateGroundLevel(chunkX, chunk.terrainType);
        }
        
        this.generateGroundLevel(chunk, chunkX);
        this.generatePlatforms(chunk, chunkX);
        this.generateSpecialTiles(chunk, chunkX);
          // Don't reset obstacle positions - maintain spacing across chunks
        
        this.generateDynamicObstacles(chunk, chunkX);        // Add pattern-based obstacle combinations (except in spawn chunk)
        // Pattern frequency increases with progressive difficulty
        const patternChance = Math.min(0.2 * this.patternFrequency, 0.6); // Base 20% chance, scales up to 60%
        if (chunkX > 2 && Math.random() < patternChance && chunk.terrainType !== 'spawn') {
            this.generateObstaclePattern(chunk, chunkX);
        }
        
        this.chunks.set(chunkX, chunk);
    }
    
    /**
     * Generate a pattern-based obstacle combination for more interesting challenges
     * @param {Object} chunk - The chunk to add obstacle pattern to
     * @param {number} chunkX - The X coordinate of the chunk
     */
    generateObstaclePattern(chunk, chunkX) {
        const groundLevel = chunkX === 0 ? this.groundLevel : this.currentGroundLevel;
        const clampedGroundLevel = Math.max(0, Math.min(GAME_CONFIG.CHUNK_HEIGHT - 1, groundLevel));
        
        // Choose a pattern based on terrain type and randomness
        const patternType = Math.random();
          // Only apply patterns if there's enough space available
        // Find a section in the chunk with at least 9 consecutive walkable floor tiles (for 4-tile spacing patterns)
        let patternStartX = -1;
        let walkableTiles = 0;
        
        for (let x = 1; x < GAME_CONFIG.CHUNK_WIDTH - 10; x++) {
            const worldX = chunkX * GAME_CONFIG.CHUNK_WIDTH + x;
            
            if (chunk.tiles[clampedGroundLevel][x] === TILE_TYPES.FLOOR) {
                walkableTiles++;
                
                // Check if we have enough consecutive walkable floor tiles
                if (walkableTiles >= 9) {
                    patternStartX = x - 8; // Start 8 tiles back to have enough space
                    
                    // Ensure this position has enough space from all other obstacles
                    let hasSpace = true;
                    for (let checkX = patternStartX; checkX < patternStartX + 9; checkX++) {
                        const worldCheckX = chunkX * GAME_CONFIG.CHUNK_WIDTH + checkX;
                        if (!this.hasEnoughSpace(worldCheckX)) {
                            hasSpace = false;
                            break;
                        }
                    }
                    
                    if (hasSpace) {
                        break; // Found a suitable position
                    }
                }
            } else {
                walkableTiles = 0; // Reset counter if tile is not walkable
            }
        }
        
        // If we didn't find enough space, exit
        if (patternStartX < 0) {
            return;
        }        // Apply the selected pattern
        if (patternType < 0.45) // Changed from 0.65 to 0.45 to favor crusher patterns more
            // Pattern 1: "Saw Gauntlet" - series of saws with platforms above
            this.createSawGauntletPattern(chunk, chunkX, patternStartX, clampedGroundLevel);
         else {
            // Pattern 2: "Crusher Corridor" - series of crushers with timing challenges
            this.createCrusherCorridorPattern(chunk, chunkX, patternStartX, clampedGroundLevel);
        }
    }
    
    /**
     * Create a pattern with saws on ground and platforms above
     */    createSawGauntletPattern(chunk, chunkX, startX, groundLevel) {        // Add 4 saws instead of 3 for more challenge
        for (let i = 0; i < 4; i++) {
            const x = startX + i * 3; // Slightly tighter spacing (3 instead of 4) for more challenge
            const worldX = chunkX * GAME_CONFIG.CHUNK_WIDTH + x;
            
            if (x < GAME_CONFIG.CHUNK_WIDTH && chunk.tiles[groundLevel - 1][x] === TILE_TYPES.EMPTY) {
                chunk.tiles[groundLevel - 1][x] = TILE_TYPES.SAW;
                this.obstaclePositions.push(worldX);
            }
            
            // Add platforms above to give the player options
            if (i % 2 === 0 && groundLevel > 3) {
                const platformY = groundLevel - 3;
                const platformX = x - 1;
                
                if (platformX >= 0 && platformX + 2 < GAME_CONFIG.CHUNK_WIDTH) {
                    for (let px = 0; px < 3; px++) {
                        if (platformX + px >= 0 && platformX + px < GAME_CONFIG.CHUNK_WIDTH) {
                            chunk.tiles[platformY][platformX + px] = TILE_TYPES.PLATFORM;
                        }
                    }
                }
            }
            
            // Occasionally add an extra saw on a platform for extra challenge
            if (i === 1 && groundLevel > 4 && Math.random() < 0.4) {
                const platformSawY = groundLevel - 4;
                const platformSawX = x;
                if (platformSawX >= 0 && platformSawX < GAME_CONFIG.CHUNK_WIDTH &&
                    platformSawY >= 0 && chunk.tiles[platformSawY][platformSawX] === TILE_TYPES.EMPTY) {
                    chunk.tiles[platformSawY][platformSawX] = TILE_TYPES.SAW;
                    this.obstaclePositions.push(chunkX * GAME_CONFIG.CHUNK_WIDTH + platformSawX);
                }
            }
        }
    }
      /**
     * Create a pattern with multiple crushers for timing challenges
     */
    createCrusherCorridorPattern(chunk, chunkX, startX, groundLevel) {
        // Create a ceiling for the crushers
        const ceilingY = groundLevel - 5;
        if (ceilingY < 2) return; // Not enough vertical space
        
        // Add ceiling tiles above the ground
        for (let x = startX; x < startX + 6 && x < GAME_CONFIG.CHUNK_WIDTH; x++) {
            if (ceilingY >= 0) {
                chunk.tiles[ceilingY][x] = TILE_TYPES.PLATFORM;
            }
        }
          // Add crushers attached to the ceiling
        for (let i = 0; i < 2; i++) {
            const x = startX + 1 + i * 4; // Space crushers 4 tiles apart to maintain 2-tile radius
            const worldX = chunkX * GAME_CONFIG.CHUNK_WIDTH + x;
            
            if (x < GAME_CONFIG.CHUNK_WIDTH && ceilingY + 1 < GAME_CONFIG.CHUNK_HEIGHT) {
                chunk.tiles[ceilingY + 1][x] = TILE_TYPES.CRUSHER;
                this.obstaclePositions.push(worldX);
            }
        }
        
        // Add platforms as safe zones between crushers
        const platformY = groundLevel - 2;
        const platformX = startX + 2;
        
        if (platformY > 0 && platformX >= 0 && platformX + 1 < GAME_CONFIG.CHUNK_WIDTH) {
            chunk.tiles[platformY][platformX] = TILE_TYPES.PLATFORM;
        }
    }
    
    /**
     * Create a pattern with multiple hover bots in formation
     */    // createHoverBotSwarmPattern method removed as hover bots are no longer used
      /**
     * Determine what type of terrain this chunk should have
     */
    determineTerrainType(chunkX) {
        // First chunk is always safe spawn
        if (chunkX === 0) return 'spawn';
        
        // Use a mix of randomness and patterns
        const terrainTypes = ['normal', 'platformHeavy', 'hazardous', 'elevated', 'valley', 'chaotic'];
        const weights = [30, 20, 15, 15, 10, 10]; // Percentage weights
        
        // Modify weights based on difficulty
        if (this.difficulty > 2) {
            weights[2] += 10; // More hazardous
            weights[5] += 5;  // More chaotic
        }
        
        // Avoid too many consecutive similar terrains
        let availableTypes = [...terrainTypes];
        if (this.lastTerrainType === 'hazardous' && this.chunkTypeCounter > 2) {
            availableTypes = availableTypes.filter(t => t !== 'hazardous');
        }
        
        const rand = Math.random() * 100;
        let cumulative = 0;
        
        for (let i = 0; i < availableTypes.length; i++) {
            const typeIndex = terrainTypes.indexOf(availableTypes[i]);
            cumulative += weights[typeIndex];
            if (rand < cumulative) {
                const selectedType = availableTypes[i];
                
                if (selectedType === this.lastTerrainType) {
                    this.chunkTypeCounter++;
                } else {
                    this.chunkTypeCounter = 1;
                    this.lastTerrainType = selectedType;
                }
                
                return selectedType;
            }
        }
        
        return 'normal';
    }
    
    /**
     * Update ground level based on terrain type
     */    /**
     * Get terrain-specific generation parameters
     */    getTerrainParameters(terrainType) {
       
        // Base parameters with progressive difficulty scaling applied
        const baseParams = {
            gapChance: GAME_CONFIG.GAP_CHANCE * this.obstacleFrequency,
            maxGapSize: Math.floor(GAME_CONFIG.MAX_GAP_SIZE * this.gapSizeMultiplier),
            minFloorStreak: Math.max(GAME_CONFIG.MIN_FLOOR_STREAK - Math.floor(this.obstacleFrequency - 1), 2),
            spikeChance: GAME_CONFIG.SPIKE_CHANCE * this.obstacleFrequency,
            spikeMinDistance: Math.max(GAME_CONFIG.SPIKE_MIN_DISTANCE - Math.floor(this.obstacleFrequency - 1), 3),
            sawChance: (GAME_CONFIG.SAW_CHANCE || 30) * this.obstacleFrequency,
            laserChance: (GAME_CONFIG.LASER_CHANCE || 6) * this.obstacleFrequency,
            crusherChance: (GAME_CONFIG.CRUSHER_CHANCE || 4) * this.obstacleFrequency
        };
        
        // Ensure gap size doesn't exceed reasonable limits
        baseParams.maxGapSize = Math.min(baseParams.maxGapSize, 6);
        
        // Ensure obstacle chances don't exceed 100%
        baseParams.gapChance = Math.min(baseParams.gapChance, 85);
        baseParams.spikeChance = Math.min(baseParams.spikeChance, 75);
        baseParams.sawChance = Math.min(baseParams.sawChance, 60);
        baseParams.laserChance = Math.min(baseParams.laserChance, 25);
        baseParams.crusherChance = Math.min(baseParams.crusherChance, 20);
        
       

        // Check for extra-lane upgrade - reduces obstacles and increases safety
        const hasExtraLane = this.game && this.game.player && this.game.player.shopUpgrades.extraLane;
        if (hasExtraLane) {
            // Apply extra-lane modifiers for safer, more rewarding terrain
            baseParams.gapChance *= 0.5; // Reduce gaps by half
            baseParams.maxGapSize = Math.max(baseParams.maxGapSize - 1, 2); // Smaller gaps
            baseParams.minFloorStreak += 2; // Longer safe floor sections
            baseParams.spikeChance *= 0.3; // Drastically reduce spike chance
            baseParams.spikeMinDistance += 2; // More spacing between remaining spikes
        }
        
        let resultParams;
        switch (terrainType) {
            case 'spawn':
                resultParams = {
                    ...baseParams,
                    gapChance: 0, // No gaps in spawn
                    spikeChance: 0, // No spikes in spawn
                    sawChance: 0, // No saws in spawn
                    laserChance: 0, // No lasers in spawn
                    crusherChance: 0 // No crushers in spawn
                };
                break;            case 'platformHeavy':
                resultParams = {
                    ...baseParams,
                    gapChance: baseParams.gapChance * 1.5, // More gaps to make platforms useful
                    maxGapSize: Math.min(baseParams.maxGapSize + 1, 4),
                    spikeChance: baseParams.spikeChance * 0.7, // Fewer ground spikes
                    sawChance: (GAME_CONFIG.SAW_CHANCE || 30) * (hasExtraLane ? 0.8 : 1.3), // Add saws to platform-heavy terrain
                    crusherChance: (GAME_CONFIG.CRUSHER_CHANCE || 12) * (hasExtraLane ? 1.0 : 1.8) // Increased crusher chance in platform-heavy terrain
                };
                break;
                
            case 'hazardous':
                resultParams = {
                    ...baseParams,
                    spikeChance: baseParams.spikeChance * (hasExtraLane ? 1.2 : 2), // Reduced spike increase with extra lane
                    spikeMinDistance: Math.max(baseParams.spikeMinDistance, 4), // Ensure minimum 4 tile distance between spikes
                    sawChance: (GAME_CONFIG.SAW_CHANCE || 30) * (hasExtraLane ? 0.8 : 1.5), // Reduced saw chance with extra lane
                    laserChance: (GAME_CONFIG.LASER_CHANCE || 6) * (hasExtraLane ? 0.6 : 1.5), // Reduced laser chance with extra lane
                    crusherChance: (GAME_CONFIG.CRUSHER_CHANCE || 12) * (hasExtraLane ? 0.8 : 2.5) // Significantly increased crusher chance in hazardous terrain
                };
                break;
                  case 'elevated':
                resultParams = {
                    ...baseParams,
                    gapChance: baseParams.gapChance * 1.2,
                    spikeChance: baseParams.spikeChance * 0.8,
                    sawChance: (GAME_CONFIG.SAW_CHANCE || 30) * (hasExtraLane ? 0.7 : 1.2), // Add saws to elevated terrain
                    crusherChance: (GAME_CONFIG.CRUSHER_CHANCE || 12) * (hasExtraLane ? 0.7 : 1.6) // Added crusher chance to elevated terrain
                };
                break;
                  case 'valley':
                resultParams = {
                    ...baseParams,
                    gapChance: baseParams.gapChance * 0.7, // Fewer gaps in valleys
                    maxGapSize: Math.max(baseParams.maxGapSize - 1, 2),
                    minFloorStreak: baseParams.minFloorStreak + 1, // Longer floor sections
                    spikeChance: baseParams.spikeChance * 1.2,
                    sawChance: (GAME_CONFIG.SAW_CHANCE || 30) * (hasExtraLane ? 0.6 : 1.0), // Add saws to valley terrain
                    crusherChance: (GAME_CONFIG.CRUSHER_CHANCE || 12) * (hasExtraLane ? 0.6 : 1.4) // Added crusher chance to valley terrain
                };
                break;
                
            case 'chaotic':
                resultParams = {
                    ...baseParams,
                    gapChance: baseParams.gapChance * (0.5 + Math.random()), // Random gap chance
                    maxGapSize: 2 + Math.floor(Math.random() * 3), // Random max gap
                    minFloorStreak: 1 + Math.floor(Math.random() * 3), // Random floor streak
                    spikeChance: baseParams.spikeChance * (0.5 + Math.random() * 1.5), // Very random spike chance
                    spikeMinDistance: Math.max(baseParams.spikeMinDistance, 4), // Ensure sufficient spacing even in chaotic terrain
                    sawChance: (GAME_CONFIG.SAW_CHANCE || 30) * (hasExtraLane ? 0.5 : 1) * (0.8 + Math.random() * 1.5),
                    laserChance: (GAME_CONFIG.LASER_CHANCE || 6) * (hasExtraLane ? 0.4 : 1) * (0.8 + Math.random() * 1.5),
                    crusherChance: (GAME_CONFIG.CRUSHER_CHANCE || 12) * (hasExtraLane ? 0.5 : 1.8) * (0.8 + Math.random() * 1.5) // Increased crusher chance in chaotic terrain
                };
                break;
                  default: // 'normal'
                resultParams = {
                    ...baseParams,
                    sawChance: (GAME_CONFIG.SAW_CHANCE || 30) * (hasExtraLane ? 0.7 : 1.0), // Add saws to normal terrain
                    crusherChance: (GAME_CONFIG.CRUSHER_CHANCE || 12) * (hasExtraLane ? 0.7 : 1.2) // Added crusher chance to normal terrain
                };
              
                break;
        }
        
       
        return resultParams;
    }

    updateGroundLevel(chunkX, terrainType) {
        const baseGroundLevel = 10;
        const maxVariation = 2;
        
        switch (terrainType) {
            case 'elevated':
                this.currentGroundLevel = Math.max(baseGroundLevel - maxVariation, 
                    baseGroundLevel - 1 - Math.floor(Math.random() * 2));
                break;
            case 'valley':
                this.currentGroundLevel = Math.min(baseGroundLevel + maxVariation, 
                    baseGroundLevel + 1 + Math.floor(Math.random() * 2));
                break;
            case 'chaotic':
                // Random elevation change
                const change = (Math.random() - 0.5) * 4;
                this.currentGroundLevel = Math.max(8, Math.min(12, this.currentGroundLevel + change));
                break;
            default:
                // Gradual return to base level or small random variation
                const targetLevel = baseGroundLevel + (Math.random() - 0.5) * 2;
                this.currentGroundLevel += (targetLevel - this.currentGroundLevel) * 0.3;
                break;
        }
        
        this.currentGroundLevel = Math.round(this.currentGroundLevel);
    }    generateGroundLevel(chunk, chunkX) {
        let consecutiveFloors = 0;
        let consecutiveGaps = 0;
        
        // Ensure groundLevel values are valid numbers
        if (isNaN(this.groundLevel)) this.groundLevel = 10;
        if (isNaN(this.currentGroundLevel)) this.currentGroundLevel = 10;
        
        const groundLevel = chunkX === 0 ? this.groundLevel : this.currentGroundLevel;
        
        // Final safety check - if still NaN, use default
        const safeGroundLevel = isNaN(groundLevel) ? 10 : groundLevel;
        
        // Get terrain-specific generation parameters
        const terrainParams = this.getTerrainParameters(chunk.terrainType);
        
        // Clamp groundLevel to valid range
        const clampedGroundLevel = Math.max(0, Math.min(GAME_CONFIG.CHUNK_HEIGHT - 1, safeGroundLevel));
        
        for (let x = 0; x < GAME_CONFIG.CHUNK_WIDTH; x++) {
            const worldX = chunkX * GAME_CONFIG.CHUNK_WIDTH + x;
            let tileType = TILE_TYPES.FLOOR;
              // Special spawn area: Always create 5 flat floor tiles at the beginning
            if (chunkX === 0 && x < 5) {
                tileType = TILE_TYPES.FLOOR;
                chunk.tiles[clampedGroundLevel][x] = tileType;
                consecutiveFloors++;
                consecutiveGaps = 0;
                continue; // Skip all hazard generation for spawn area
            }
            
            if (consecutiveGaps >= terrainParams.maxGapSize) {
                tileType = TILE_TYPES.FLOOR;
                consecutiveGaps = 0;
                consecutiveFloors = 1;
            } else if (consecutiveFloors < terrainParams.minFloorStreak) {
                tileType = TILE_TYPES.FLOOR;
                consecutiveFloors++;
                consecutiveGaps = 0;
            } else {
                const roll = Math.random() * 100;
                const difficultyModifier = Math.min(this.difficulty * 3, 15);
                
                if (roll < terrainParams.gapChance + difficultyModifier) {
                    tileType = TILE_TYPES.GAP;
                    consecutiveGaps++;
                    consecutiveFloors = 0;
                } else {
                    tileType = TILE_TYPES.FLOOR;
                    consecutiveFloors++;
                    consecutiveGaps = 0;
                }
            }
              if (tileType === TILE_TYPES.FLOOR) {
                chunk.tiles[clampedGroundLevel][x] = tileType;
                  // Skip spikes in the first chunk (spawn area) to ensure safe start
                if (chunkX === 0) {
                    continue; // No spikes in spawn chunk
                }
                  // Add spikes with terrain-specific chances
                const spikeChance = terrainParams.spikeChance + Math.min(this.difficulty * 3, 20);
                const spikeRoll = Math.random() * 100;                // Use our helper method to check spike spacing
                if (spikeRoll < spikeChance && this.canPlaceSpike(worldX, clampedGroundLevel - 1) && clampedGroundLevel > 0) {
                    chunk.tiles[clampedGroundLevel - 1][x] = TILE_TYPES.SPIKE;                    this.lastSpikeWorldX = worldX;
                    this.lastPlatformSpikePos = { x: worldX, y: clampedGroundLevel - 1 };
                   
                    // Add spike to obstacle positions to maintain proper spacing with other obstacles
                    if (!this.obstaclePositions.includes(worldX)) {
                        this.obstaclePositions.push(worldX);
                    }
                }
                  // Add glitches with terrain-specific chances - DISABLED (no longer used)
                // const glitchChance = terrainParams.glitchChance + Math.min(this.difficulty * 2, 10);
                // if (Math.random() * 100 < glitchChance && clampedGroundLevel > 0 && chunk.tiles[clampedGroundLevel - 1][x] !== TILE_TYPES.SPIKE) {
                //     chunk.tiles[clampedGroundLevel - 1][x] = TILE_TYPES.GLITCH;
                // }
            }
        }
    }
    generatePlatforms(chunk, chunkX) {
        const terrainParams = this.getTerrainParameters(chunk.terrainType);
        const groundLevel = chunkX === 0 ? this.groundLevel : this.currentGroundLevel;
        
        // Clamp groundLevel to valid range
        const clampedGroundLevel = Math.max(0, Math.min(GAME_CONFIG.CHUNK_HEIGHT - 1, groundLevel));
        
        // Determine number of platforms based on terrain type
        let platformCount;
        switch (chunk.terrainType) {
            case 'platformHeavy':
                platformCount = 3 + Math.floor(Math.random() * 3); // 3-5 platforms
                break;
            case 'elevated':
                platformCount = 2 + Math.floor(Math.random() * 2); // 2-3 platforms
                break;
            case 'chaotic':
                platformCount = 1 + Math.floor(Math.random() * 4); // 1-4 platforms (very random)
                break;
            case 'spawn':
                platformCount = 1; // Minimal platforms in spawn area
                break;
            default:
                platformCount = Math.random() < 0.7 ? 2 : 3; // Original logic
                break;
        }

        for (let p = 0; p < platformCount; p++) {
            let platformX, platformY, platformLength;
            
            // Terrain-specific platform placement
            switch (chunk.terrainType) {                case 'platformHeavy':
                    platformX = Math.floor(Math.random() * (GAME_CONFIG.CHUNK_WIDTH - 5)) + 1;
                    platformY = clampedGroundLevel - 2 - Math.floor(Math.random() * 4); // Higher variety
                    platformLength = 2 + Math.floor(Math.random() * 4); // 2-5 length
                    break;
                    
                case 'elevated':
                    platformX = Math.floor(Math.random() * (GAME_CONFIG.CHUNK_WIDTH - 4)) + 1;
                    platformY = clampedGroundLevel - 3 - Math.floor(Math.random() * 2); // Higher platforms
                    platformLength = 3 + Math.floor(Math.random() * 3); // 3-5 length
                    break;
                    
                case 'valley':
                    platformX = Math.floor(Math.random() * (GAME_CONFIG.CHUNK_WIDTH - 4)) + 1;
                    platformY = clampedGroundLevel - 1 - Math.floor(Math.random() * 2); // Lower platforms
                    platformLength = 4 + Math.floor(Math.random() * 2); // 4-5 length (longer for easier traversal)
                    break;
                    
                case 'chaotic':
                    platformX = Math.floor(Math.random() * (GAME_CONFIG.CHUNK_WIDTH - 3)) + 1;
                    platformY = clampedGroundLevel - 1 - Math.floor(Math.random() * 5); // Very random heights
                    platformLength = 1 + Math.floor(Math.random() * 4); // 1-4 length (very varied)
                    break;
                    
                case 'hazardous':
                    platformX = Math.floor(Math.random() * (GAME_CONFIG.CHUNK_WIDTH - 4)) + 1;
                    platformY = clampedGroundLevel - 2 - Math.floor(Math.random() * 3);
                    platformLength = 2 + Math.floor(Math.random() * 3); // 2-4 length (shorter for difficulty)
                    break;
                    
                case 'spawn':
                    // Safe, predictable platform in spawn area
                    platformX = 8 + p * 6; // Evenly spaced
                    platformY = clampedGroundLevel - 2;
                    platformLength = 3;
                    break;
                    
                default:
                    platformX = Math.floor(Math.random() * (GAME_CONFIG.CHUNK_WIDTH - 4)) + 1;
                    platformY = clampedGroundLevel - 2 - Math.floor(Math.random() * 3);
                    platformLength = 3 + Math.floor(Math.random() * 3);
                    break;
            }

            // Place the platform tiles
            for (let i = 0; i < platformLength && platformX + i < GAME_CONFIG.CHUNK_WIDTH; i++) {
                if (platformY >= 0 && platformY < GAME_CONFIG.CHUNK_HEIGHT) {
                    chunk.tiles[platformY][platformX + i] = TILE_TYPES.PLATFORM;
                }
            }            // Add platform-specific hazards for some terrain types
            if (chunk.terrainType === 'hazardous' && Math.random() < 0.3) {
                // 30% chance to add spikes on top of platforms in hazardous terrain (not under them)
                const spikeX = platformX + Math.floor(platformLength / 2);
                const worldX = chunkX * GAME_CONFIG.CHUNK_WIDTH + spikeX;
                
                if (platformY > 0 && platformY < GAME_CONFIG.CHUNK_HEIGHT && 
                    chunk.tiles[platformY-1][spikeX] === TILE_TYPES.EMPTY && 
                    this.canPlaceSpike(worldX, platformY-1)) {
                    chunk.tiles[platformY-1][spikeX] = TILE_TYPES.SPIKE;
                    this.lastPlatformSpikePos = { x: worldX, y: platformY-1 };
                    // Add to obstacle positions for proper spacing
                    this.obstaclePositions.push(worldX);
                }
            }
        }
    }    generateSpecialTiles(chunk, chunkX) {
        const terrainParams = this.getTerrainParameters(chunk.terrainType);
        
        // Base chances modified by terrain type - reduced from 3% to 2%
        let dataPacketChance = 0.02; // 2% base chance (reduced from 3%)

        // Check for extra-lane upgrade - increases data packet rewards
        const hasExtraLane = this.game && this.game.player && this.game.player.shopUpgrades.extraLane;
        if (hasExtraLane) {
            dataPacketChance *= 2.0; // Reduced multiplier from 2.5 to 2.0
        }
          switch (chunk.terrainType) {
            case 'spawn':
                dataPacketChance = hasExtraLane ? 0.08 : 0.03; // Reduced from 0.12/0.05 to 0.08/0.03
                break;
                
            case 'hazardous':
                dataPacketChance = hasExtraLane ? 0.05 : 0.015; // Reduced from 0.08/0.02 to 0.05/0.015
                break;
                
            case 'platformHeavy':
                dataPacketChance = hasExtraLane ? 0.07 : 0.025; // Reduced from 0.10/0.04 to 0.07/0.025
                break;
                
            case 'chaotic':
                dataPacketChance = (hasExtraLane ? 0.05 : 0.015) + Math.random() * 0.02; // Reduced base and random component
                break;
                
            case 'elevated':
                dataPacketChance = hasExtraLane ? 0.08 : 0.03; // Reduced from 0.11/0.045 to 0.08/0.03
                break;
                
            case 'valley':
                dataPacketChance = hasExtraLane ? 0.04 : 0.02; // Reduced from 0.06/0.025 to 0.04/0.02
                break;
        }for (let y = 0; y < GAME_CONFIG.CHUNK_HEIGHT - 2; y++) {
            for (let x = 0; x < GAME_CONFIG.CHUNK_WIDTH; x++) {
                if (chunk.tiles[y][x] === TILE_TYPES.EMPTY) {
                    // Get the ground level for this chunk (static spawn chunk or dynamic for others)
                    const currentGroundLevel = chunkX === 0 ? this.groundLevel : this.currentGroundLevel;
                    const clampedGroundLevel = Math.max(0, Math.min(GAME_CONFIG.CHUNK_HEIGHT - 1, currentGroundLevel));
                    
                    // Skip data packet spawning in the 5-block safe spawn zone
                    if (chunkX === 0 && x < 5) {
                        continue; // No data packets in spawn safe zone
                    }
                    
                    // Only spawn data packets ABOVE ground level (not underground)
                    // Allow spawning from 4 tiles above ground up to near the top of the chunk
                    const minSpawnY = Math.max(0, clampedGroundLevel - 6); // 6 tiles above ground maximum
                    const maxSpawnY = clampedGroundLevel - 1; // At least 1 tile above ground
                    
                    if (y >= minSpawnY && y <= maxSpawnY) {
                        const rand = Math.random();
                        if (rand < dataPacketChance) {
                            chunk.tiles[y][x] = TILE_TYPES.DATA_PACKET;
                        }
                    }
                }
            }
        }
        
        // Add terrain-specific special features
        this.addTerrainSpecialFeatures(chunk, chunkX);
    }
      /**
     * Add special features unique to each terrain type
     */
    addTerrainSpecialFeatures(chunk, chunkX) {
        const groundLevel = chunkX === 0 ? this.groundLevel : this.currentGroundLevel;
        
        // Clamp groundLevel to valid range
        const clampedGroundLevel = Math.max(0, Math.min(GAME_CONFIG.CHUNK_HEIGHT - 1, groundLevel));
        
        switch (chunk.terrainType) {            case 'hazardous':
                // Add spikes on platforms (instead of floating in air)
                for (let y = 0; y < GAME_CONFIG.CHUNK_HEIGHT - 1; y++) {
                    for (let x = 0; x < GAME_CONFIG.CHUNK_WIDTH; x++) {
                        // Check if there's a platform or floor at this position
                        const worldX = chunkX * GAME_CONFIG.CHUNK_WIDTH + x;
                          if ((chunk.tiles[y][x] === TILE_TYPES.PLATFORM || chunk.tiles[y][x] === TILE_TYPES.FLOOR) && 
                            y > 0 && chunk.tiles[y-1][x] === TILE_TYPES.EMPTY && 
                            this.canPlaceSpike(worldX, y-1) && Math.random() < 0.15) {
                            // Place spike on top of the platform/floor
                            chunk.tiles[y-1][x] = TILE_TYPES.SPIKE;
                            this.lastPlatformSpikePos = { x: worldX, y: y-1 };
                            // Add to obstacle positions for proper spacing
                            this.obstaclePositions.push(worldX);
                        }
                    }
                }
                break;                  case 'chaotic':
                // Random spike placement only on solid surfaces, never in mid-air
                for (let y = 0; y < GAME_CONFIG.CHUNK_HEIGHT - 1; y++) {
                    for (let x = 0; x < GAME_CONFIG.CHUNK_WIDTH; x++) {
                        // Check if there's a platform or floor at this position
                        const worldX = chunkX * GAME_CONFIG.CHUNK_WIDTH + x;
                          if ((chunk.tiles[y][x] === TILE_TYPES.PLATFORM || chunk.tiles[y][x] === TILE_TYPES.FLOOR) && 
                            y > 0 && chunk.tiles[y-1][x] === TILE_TYPES.EMPTY && 
                            this.canPlaceSpike(worldX, y-1) && Math.random() < 0.2) {
                            // Place spike on top of the platform/floor
                            chunk.tiles[y-1][x] = TILE_TYPES.SPIKE;
                            this.lastPlatformSpikePos = { x: worldX, y: y-1 };
                            // Add to obstacle positions for proper spacing
                            this.obstaclePositions.push(worldX);
                        }
                    }
                }
                break;
                  case 'platformHeavy':
                // Add extra data packets on platforms - reduced spawn rate
                for (let y = 0; y < GAME_CONFIG.CHUNK_HEIGHT; y++) {
                    for (let x = 0; x < GAME_CONFIG.CHUNK_WIDTH; x++) {
                        if (chunk.tiles[y][x] === TILE_TYPES.PLATFORM && Math.random() < 0.08) { // Reduced from 0.15 to 0.08
                            // Add data packet above platform
                            if (y > 0 && chunk.tiles[y - 1][x] === TILE_TYPES.EMPTY) {
                                chunk.tiles[y - 1][x] = TILE_TYPES.DATA_PACKET;
                            }
                        }
                    }
                }
                break;
        }
    }
      cleanupOldChunks(camera) {
        const currentChunk = Math.floor(camera.x / (GAME_CONFIG.CHUNK_WIDTH * GAME_CONFIG.TILE_SIZE));
        const minChunk = currentChunk - GAME_CONFIG.CLEANUP_DISTANCE;
        const minWorldX = minChunk * GAME_CONFIG.CHUNK_WIDTH;
        
        // Clean up old chunks
        for (let [chunkX, chunk] of this.chunks) {
            if (chunkX < minChunk) {
                this.chunks.delete(chunkX);
                this.clearChunkCache(chunkX); // Clear associated cache data
            }
        }
        
        // Clean up old obstacle positions that are no longer relevant
        // Only do this periodically to avoid unnecessary processing
        if (currentChunk > this.lastObstaclesCleanup + 5) {
            this.obstaclePositions = this.obstaclePositions.filter(pos => pos >= minWorldX);
            this.lastObstaclesCleanup = currentChunk;
            
            // If the player has moved far enough, also reset the spike tracking positions
            if (minWorldX > this.lastSpikeWorldX + 100) {
                this.lastSpikeWorldX = minWorldX - 20;
            }
            
            if (minWorldX > this.lastPlatformSpikePos.x + 100) {
                this.lastPlatformSpikePos = { x: minWorldX - 20, y: this.currentGroundLevel - 1 };
            }
        }
    }
      getTileAt(worldX, worldY) {
        const chunkX = Math.floor(worldX / GAME_CONFIG.CHUNK_WIDTH);
        const chunk = this.chunks.get(chunkX);
        
        if (!chunk) return TILE_TYPES.EMPTY;
        
        const tileX = worldX % GAME_CONFIG.CHUNK_WIDTH;
        const tileY = worldY;
        
        if (tileX < 0 || tileX >= GAME_CONFIG.CHUNK_WIDTH || tileY < 0 || tileY >= GAME_CONFIG.CHUNK_HEIGHT) {
            return TILE_TYPES.EMPTY;
        }
        
        return chunk.tiles[tileY][tileX];
    }
    
    setTileAt(worldX, worldY, tileType) {
        const chunkX = Math.floor(worldX / GAME_CONFIG.CHUNK_WIDTH);
        const chunk = this.chunks.get(chunkX);
        
        if (!chunk) return;
        
        const tileX = worldX % GAME_CONFIG.CHUNK_WIDTH;
        const tileY = worldY;
        
        if (tileX < 0 || tileX >= GAME_CONFIG.CHUNK_WIDTH || tileY < 0 || tileY >= GAME_CONFIG.CHUNK_HEIGHT) {
            return;
        }
        
        chunk.tiles[tileY][tileX] = tileType;
    }
    
    getTileAtPixel(pixelX, pixelY) {
        const tileX = Math.floor(pixelX / GAME_CONFIG.TILE_SIZE);
        const tileY = Math.floor(pixelY / GAME_CONFIG.TILE_SIZE);
        return this.getTileAt(tileX, tileY);
    }    draw(ctx, camera) {
        const startChunk = Math.max(0, Math.floor(camera.x / (GAME_CONFIG.CHUNK_WIDTH * GAME_CONFIG.TILE_SIZE)) - 1);
        const endChunk = Math.ceil((camera.x + ctx.canvas.width) / (GAME_CONFIG.CHUNK_WIDTH * GAME_CONFIG.TILE_SIZE)) + 1;
        
        // Always ensure chunk 0 is included when camera is near the start
        const actualStartChunk = camera.x < GAME_CONFIG.CHUNK_WIDTH * GAME_CONFIG.TILE_SIZE ? 0 : startChunk;
        
        // Always update visible chunks on first frame or when camera moved significantly
        if (this.lastCameraX === -1 || Math.abs(camera.x - this.lastCameraX) > GAME_CONFIG.TILE_SIZE) {
            this.updateVisibleChunks(actualStartChunk, endChunk);
            this.lastCameraX = camera.x;
        }
        
        // Draw only visible chunks
        for (const chunkX of this.visibleChunks) {
            this.drawChunk(ctx, camera, chunkX);
        }
    }    drawChunk(ctx, camera, chunkX) {
        // Safety check for camera
        if (!camera || !isFinite(camera.x) || !isFinite(camera.y)) {
            console.warn('WorldGenerator.drawChunk: Invalid camera', camera);
            return;
        }

        const chunk = this.chunks.get(chunkX);
        if (!chunk) return;
        
        const chunkPixelX = chunkX * GAME_CONFIG.CHUNK_WIDTH * GAME_CONFIG.TILE_SIZE;
        
        for (let y = 0; y < GAME_CONFIG.CHUNK_HEIGHT; y++) {
            for (let x = 0; x < GAME_CONFIG.CHUNK_WIDTH; x++) {
                const tileType = chunk.tiles[y][x];
                if (tileType === TILE_TYPES.EMPTY) continue;
                
                const worldX = chunkPixelX + x * GAME_CONFIG.TILE_SIZE;
                const worldY = y * GAME_CONFIG.TILE_SIZE;
                const screenX = worldX - camera.x;
                const screenY = worldY - camera.y;
                
                if (screenX < -GAME_CONFIG.TILE_SIZE || screenX > ctx.canvas.width + GAME_CONFIG.TILE_SIZE) continue;
                
                this.tileRenderer.drawTile(ctx, tileType, screenX, screenY);
            }
        }
    }findSafeSpawnPosition() {
        if (!this.chunks.has(0)) {
            this.generateChunk(0);
        }
          const chunk = this.chunks.get(0);
        const safeDistance = 3;        const spawnGroundLevel = this.groundLevel; // Always use base ground level for spawn        // Debug: Log ground level and check actual ground tiles
          // Find actual ground level by scanning for floor tiles
        let actualGroundLevel = spawnGroundLevel;
        for (let y = 8; y <= 12; y++) {
            if (chunk.tiles[y] && chunk.tiles[y][2] === TILE_TYPES.FLOOR) {
                actualGroundLevel = y;
                break;
            }        }
        
        if (actualGroundLevel !== spawnGroundLevel) {
        }
          for (let x = 1; x < GAME_CONFIG.CHUNK_WIDTH - safeDistance; x++) {
            let isSafe = true;
              for (let checkX = x; checkX < x + safeDistance; checkX++) {
                const groundTile = chunk.tiles[actualGroundLevel][checkX];
                const aboveTile = actualGroundLevel > 0 ? chunk.tiles[actualGroundLevel - 1][checkX] : TILE_TYPES.EMPTY;
                const aboveAboveTile = actualGroundLevel > 1 ? chunk.tiles[actualGroundLevel - 2][checkX] : TILE_TYPES.EMPTY;
                  // Check for solid ground, no spikes above ground, and no spikes at spawn position
                if (groundTile !== TILE_TYPES.FLOOR || 
                    aboveTile === TILE_TYPES.SPIKE || 
                    aboveAboveTile === TILE_TYPES.SPIKE) {
                    isSafe = false;
                    break;
                }
            }            if (isSafe) {                const spawnX = x * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2;
                // Place player so their feet are on top of the ground tiles                // Ground tiles are at actualGroundLevel * TILE_SIZE, so player should be just above
                const spawnY = actualGroundLevel * GAME_CONFIG.TILE_SIZE - GAME_CONFIG.PLAYER_HEIGHT;
                
                return {
                    x: spawnX,
                    y: spawnY
                };
            }
        }const fallbackX = GAME_CONFIG.TILE_SIZE * 2; // More reliable fallback position
        // Place player so their feet are on top of the ground tiles
        const fallbackY = actualGroundLevel * GAME_CONFIG.TILE_SIZE - GAME_CONFIG.PLAYER_HEIGHT;
          
        return {
            x: fallbackX,
            y: fallbackY
        };
    }
      getDebugInfo() {
        return {
            chunksLoaded: this.chunks.size,
            lastGenerated: this.lastGeneratedChunk,
            difficulty: this.difficulty.toFixed(1),
            currentGroundLevel: this.currentGroundLevel,
            lastTerrainType: this.lastTerrainType,
            terrainSeed: this.terrainSeed.toFixed(2)
        };    }    /**
     * Check if a position has enough space for saw placement (2-tile radius)
     * @param {number} worldX - The world X position to check
     * @returns {boolean} - True if the position has enough space for a saw
     */
    canPlaceSaw(worldX) {
        const minDistance = 4; // 2-tile radius = 4 tiles minimum distance
        
        // Check distance from all existing obstacles
        for (const pos of this.obstaclePositions) {
            const distance = Math.abs(worldX - pos);
            if (distance < minDistance) {
               
                return false;
            }
        }
        
       
        return true;
    }

    /**
     * Check if a position has enough space from all other obstacles
     * @param {number} worldX - The world X position to check
     * @param {number} minDistance - Minimum distance required (optional, defaults to 4)
     * @returns {boolean} - True if the position has enough space from other obstacles
     */    hasEnoughSpace(worldX, minDistance = 4) {
        // Reduced debug logging for cleaner console
        for (const pos of this.obstaclePositions) {
            if (Math.abs(worldX - pos) < minDistance) {
                return false;
            }
        }
        return true;
    }
      /**
     * Check if we can place a spike at the given position, based on minimum distance
     * @param {number} worldX - The world X position
     * @param {number} y - The tile Y position
     * @param {number} minDistance - Minimum distance required (optional)
     * @returns {boolean} True if spike can be placed
     */    canPlaceSpike(worldX, y, minDistance = 4) {
        // Always enforce at least 4 tiles gap minimum (2 tile radius)
        minDistance = Math.max(minDistance, 4);
        
        // Check distance from ground spikes
        const groundDist = Math.abs(worldX - this.lastSpikeWorldX);
        if (groundDist < minDistance) {
            return false;
        }
          // Check distance from platform spikes (using Euclidean distance for 2D spacing)
        const xDist = Math.abs(worldX - this.lastPlatformSpikePos.x);
        const yDist = Math.abs(y - this.lastPlatformSpikePos.y);
        const platformDist = Math.sqrt(xDist * xDist + yDist * yDist);
        if (platformDist < minDistance) {
            return false;
        }
          // Check distance from all other obstacles using the general spacing method
        if (!this.hasEnoughSpace(worldX, minDistance)) {
            return false;
        }
        
        return true;
    }/**
     * Place dynamic obstacles across the terrain based on terrain parameters
     * @param {Object} chunk - The chunk to add obstacles to
     * @param {number} chunkX - The X coordinate of the chunk
     */    generateDynamicObstacles(chunk, chunkX) {
      
        
        const terrainParams = this.getTerrainParameters(chunk.terrainType);
        
        // Skip obstacles on spawn chunk
        if (chunk.terrainType === 'spawn') {
         
            return;
        }        // Get dynamic ground level
        const groundLevel = chunkX === 0 ? this.groundLevel : this.currentGroundLevel;
        
       
        
        let sawPlacementAttempts = 0;
        let sawPlacements = 0;
        let validSurfaceCount = 0;
        
        // Place saws on platforms or floor with more dynamic placement
        for (let y = 0; y < GAME_CONFIG.CHUNK_HEIGHT - 1; y++) {
            for (let x = 0; x < GAME_CONFIG.CHUNK_WIDTH; x++) {
                const worldX = chunkX * GAME_CONFIG.CHUNK_WIDTH + x;                // Check if there's a platform or floor at this position
                if ((chunk.tiles[y][x] === TILE_TYPES.PLATFORM || chunk.tiles[y][x] === TILE_TYPES.FLOOR) && 
                    y > 0 && chunk.tiles[y-1][x] === TILE_TYPES.EMPTY) {
                    
                    validSurfaceCount++;
                    sawPlacementAttempts++;
                    
                    // Ensure minimum spacing between all obstacles (2-tile radius)
                    const isFarEnough = this.canPlaceSaw(worldX); // Use 2-tile radius spacing check
                    
                    // Enhanced saw placement based on terrain type
                    let sawChance = terrainParams.sawChance || 30; // Fallback to 30%
                 
                    
                    // Increase saw probability around gaps to create challenging jumps
                    if (x > 0 && x < GAME_CONFIG.CHUNK_WIDTH - 1) {
                        if (y < GAME_CONFIG.CHUNK_HEIGHT - 1 && 
                            (chunk.tiles[y+1][x-1] === TILE_TYPES.GAP || 
                             chunk.tiles[y+1][x+1] === TILE_TYPES.GAP)) {
                            sawChance *= 2.0;
                        }
                    }
                    
                    // Increase saw probability on platforms
                    if (chunk.tiles[y][x] === TILE_TYPES.PLATFORM) {
                        sawChance *= 1.3;
                    }
                    
                    // Extra bonus for hazardous terrain
                    if (chunk.terrainType === 'hazardous') {
                        sawChance *= 1.2;
                    }
                      const randValue = Math.random();
                    const sawProbability = sawChance / 100;
                      // DEBUG: Log each attempt
                    if (sawPlacementAttempts <= 5) { // Only log first 5 attempts to avoid spam
                     
                    }                    // Place saw if conditions are met
                    if (randValue < sawProbability && isFarEnough) {
                        chunk.tiles[y-1][x] = TILE_TYPES.SAW;
                        sawPlacements++;
                      
                          // Only add to obstacle positions if not already present
                        if (!this.obstaclePositions.includes(worldX)) {
                            this.obstaclePositions.push(worldX);
                        }
                    }
                }
            }
        }
        
        
        
        // Place lasers in strategic positions based on terrain type
        let laserPlacementAttempts = 0;
        let successfulLaserPlacements = 0;
        
      
        
        for (let y = groundLevel - 3; y >= 3; y--) {
            for (let x = 0; x < GAME_CONFIG.CHUNK_WIDTH; x++) {
                const worldX = chunkX * GAME_CONFIG.CHUNK_WIDTH + x;
                
                if (chunk.tiles[y][x] === TILE_TYPES.EMPTY) {
                    laserPlacementAttempts++;
                    
                    // We want lasers to have clear space in front for the beam
                    let clearSpace = true;
                    let beamLength = 0;
                    
                    // Calculate how far the beam can travel
                    for (let i = 1; i < 4; i++) {
                        if (x + i < GAME_CONFIG.CHUNK_WIDTH) {
                            if (chunk.tiles[y][x + i] === TILE_TYPES.EMPTY) {
                                beamLength++;
                            } else {
                                break;
                            }
                        }
                    }
                    
                    // We want at least 2 tiles of clear space
                    clearSpace = beamLength >= 2;
                      // Ensure minimum spacing between all obstacles (reduced for lasers)
                    const isFarEnough = this.hasEnoughSpace(worldX, 2); // Only 2-tile spacing for lasers
                    
                    // Adjust laser chance based on terrain and position
                    let laserChance = terrainParams.laserChance || GAME_CONFIG.LASER_CHANCE;
                    
                    // More lasers at challenging heights
                    if (y < groundLevel - 4) {
                        laserChance *= 1.2; // Increase chance at higher elevations
                    }
                    
                    const roll = Math.random() * 100;
                    
                  
                    
                    // Place laser if conditions are met
                    if (clearSpace && roll < laserChance && isFarEnough) {
                        chunk.tiles[y][x] = TILE_TYPES.LASER;
                        this.obstaclePositions.push(worldX);
                        successfulLaserPlacements++;
                      
                    }
                }
            }
        }
        
        // Place crushers with improved placement
        for (let x = 0; x < GAME_CONFIG.CHUNK_WIDTH; x++) {
            const worldX = chunkX * GAME_CONFIG.CHUNK_WIDTH + x;
            
            // Check for ceiling position (find first empty tile from top)
            let ceilingY = -1;
            for (let y = 2; y < groundLevel - 2; y++) {
                if (chunk.tiles[y][x] === TILE_TYPES.EMPTY) {
                    ceilingY = y;
                    break;
                }
            }
            
            // If we found a suitable ceiling position
            if (ceilingY >= 0) {
                // Check if there's enough empty space below for the crusher operation
                let clearBelow = true;
                let crushDistance = 0;
                
                for (let y = ceilingY; y < ceilingY + 5; y++) {
                    if (y < GAME_CONFIG.CHUNK_HEIGHT && chunk.tiles[y][x] === TILE_TYPES.EMPTY) {
                        crushDistance++;
                    } else {
                        break;
                    }
                }
                
                // Need at least 4 tiles of clear space below for crusher
                clearBelow = crushDistance >= 4;
                  // Ensure minimum spacing between all obstacles (reduced for crushers)
                const isFarEnough = this.hasEnoughSpace(worldX, 3); // 3-tile spacing for crushers
                
                // Adjust crusher chance based on terrain and game situation
                let crusherChance = terrainParams.crusherChance || GAME_CONFIG.CRUSHER_CHANCE;
                
                // Place crushers strategically over gaps or narrow passages
                let isOverGap = false;
                let isNarrowPassage = false;
                
                // Check if there's a gap below
                for (let y = ceilingY + 1; y < GAME_CONFIG.CHUNK_HEIGHT; y++) {
                    if (y < GAME_CONFIG.CHUNK_HEIGHT && x < GAME_CONFIG.CHUNK_WIDTH && 
                        chunk.tiles[y][x] === TILE_TYPES.GAP) {
                        isOverGap = true;
                        break;
                    }
                }
                
                // Check if there's a narrow passage (platforms on both sides)
                if (x > 1 && x < GAME_CONFIG.CHUNK_WIDTH - 2) {
                    let leftPlatform = false;
                    let rightPlatform = false;
                    
                    for (let y = ceilingY + 2; y < ceilingY + 6; y++) {
                        if (y < GAME_CONFIG.CHUNK_HEIGHT) {
                            if (chunk.tiles[y][x-1] === TILE_TYPES.PLATFORM || 
                                chunk.tiles[y][x-2] === TILE_TYPES.PLATFORM) {
                                leftPlatform = true;
                            }
                            if (chunk.tiles[y][x+1] === TILE_TYPES.PLATFORM || 
                                chunk.tiles[y][x+2] === TILE_TYPES.PLATFORM) {
                                rightPlatform = true;
                            }
                        }
                    }
                    
                    isNarrowPassage = leftPlatform && rightPlatform;
                }
                  if (isOverGap) {
                    crusherChance *= 2.0; // Increased from 1.5x to 2.0x chance over gaps
                }
                if (isNarrowPassage) {
                    crusherChance *= 1.8; // Increased from 1.4x to 1.8x chance in narrow passages
                }
                  // Place crusher if conditions are met
                if (clearBelow && Math.random() < crusherChance / 100 && isFarEnough) {
                    chunk.tiles[ceilingY][x] = TILE_TYPES.CRUSHER;
                    this.obstaclePositions.push(worldX);
                }
            }
        }
    }

    /**
     * Update the set of visible chunks for optimized rendering
     */
    updateVisibleChunks(startChunk, endChunk) {
        this.visibleChunks.clear();
        for (let chunkX = startChunk; chunkX <= endChunk; chunkX++) {
            if (this.chunks.has(chunkX)) {
                this.visibleChunks.add(chunkX);
            }
        }
    }

    /**
     * Clear chunk render cache when chunks are removed
     */
    clearChunkCache(chunkX) {
        this.chunkRenderCache.delete(chunkX);
        this.visibleChunks.delete(chunkX);
    }    /**
     * Get current difficulty information for UI display
     */
    getDifficultyInfo() {
        const selectedDifficulty = this.game.selectedDifficulty || 'EASY';
        const difficultyConfig = DIFFICULTY_LEVELS[selectedDifficulty];
        const adjustedDistance = Math.max(0, this.currentDistance - 500);
        const intervalsCompleted = Math.floor(adjustedDistance / difficultyConfig.difficultyInterval);
        
        return {
            level: Math.floor(this.difficulty * 10) / 10, // Round to 1 decimal place
            distance: this.currentDistance,
            isInGracePeriod: this.currentDistance < 500,
            nextIncrease: this.currentDistance < 500 ? 
                500 - this.currentDistance : 
                difficultyConfig.difficultyInterval - (adjustedDistance % difficultyConfig.difficultyInterval),
            obstacleMultiplier: Math.floor(this.obstacleFrequency * 10) / 10,
            gapMultiplier: Math.floor(this.gapSizeMultiplier * 10) / 10,
            intervalsCompleted: intervalsCompleted
        };
    }
    
    /**
     * Perform periodic cleanup to prevent memory leaks
     */
    performPeriodicCleanup(camera) {
        const currentChunk = Math.floor(camera.x / (GAME_CONFIG.CHUNK_WIDTH * GAME_CONFIG.TILE_SIZE));
        
        // Clean up render cache that's too far from camera
        const renderCacheEntries = Array.from(this.chunkRenderCache.entries());
        for (const [chunkX, cacheData] of renderCacheEntries) {
            if (Math.abs(chunkX - currentChunk) > 10) {
                this.chunkRenderCache.delete(chunkX);
            }
        }
        
        // Limit render cache size
        if (this.chunkRenderCache.size > this.maxChunkCacheSize) {
            const sortedEntries = renderCacheEntries.sort((a, b) => Math.abs(a[0] - currentChunk) - Math.abs(b[0] - currentChunk));
            const toRemove = sortedEntries.slice(this.maxChunkCacheSize);
            toRemove.forEach(([chunkX]) => this.chunkRenderCache.delete(chunkX));
        }
        
        // Clean up obstacle positions that are too old
        this.obstaclePositions = this.obstaclePositions.filter(pos => 
            Math.abs(pos.x - camera.x) < 2000
        );
        
        this.sawPositions = this.sawPositions.filter(pos => 
            Math.abs(pos.x - camera.x) < 2000
        );
        
        // Clean up pooled chunks
        if (this.chunkPooling.size > this.maxPoolSize) {
            const poolEntries = Array.from(this.chunkPooling.entries());
            const toRemove = poolEntries.slice(0, poolEntries.length - this.maxPoolSize);
            toRemove.forEach(([key]) => this.chunkPooling.delete(key));
        }
    }

    /**
     * Reset world state for new game
     */
    reset() {
        // Clear all chunks and caches
        this.chunks.clear();
        this.chunkRenderCache.clear();
        this.visibleChunks.clear();
        
        // Reset position tracking
        this.obstaclePositions = [];
        this.sawPositions = [];
        this.lastGeneratedChunk = -2;
        
        // Reset difficulty progression
        this.difficulty = 1;
        this.currentDistance = 0;
        this.currentGroundLevel = this.groundLevel;
        
        // Force generation of spawn chunk
        this.generateChunk(0);
    }
}
