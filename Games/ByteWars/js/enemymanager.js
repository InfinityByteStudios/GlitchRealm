class EnemyManager {    constructor(arena, difficultyManager = null) {
        this.enemies = [];
        this.arena = arena;
        this.difficultyManager = difficultyManager;
        
        // Wave-based spawning system
        this.currentWave = 1;
        this.waveState = 'preparing'; // 'preparing', 'spawning', 'active', 'completed'
        this.waveTimer = 0;
        this.preparationTime = 3.0; // seconds before wave starts
        this.timeBetweenWaves = 5.0; // seconds between waves// Current wave configuration
        this.waveConfig = null;
        this.enemiesToSpawn = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.5; // seconds between spawns (slower for phase 1 to be more manageable)
        
        // Wave progression tracking
        this.totalSpawned = 0;
        this.enemiesSpawnedThisWave = 0;
        
        // Visual effects reference
        this.visualEffects = null;
        
        // Initialize first wave
        this.reset();
        
        console.log('🎯 Enemy Manager initialized with difficulty support');
    }reset() {
        // Clear all enemies
        this.enemies = [];
        
        // Reset wave state
        this.currentWave = 1;
        this.waveState = 'preparing';
        this.waveTimer = 0;
        this.totalSpawned = 0;
        this.enemiesSpawnedThisWave = 0;
        
        // Setup first wave
        this.setupWave(this.currentWave);
        
        console.log('🔄 Enemy Manager reset');
    }update(deltaTime, player) {
        this.waveTimer += deltaTime;
        
        // Handle wave state transitions
        this.updateWaveState(deltaTime, player);
          // Update all enemies
        for (let enemy of this.enemies) {
            if (enemy.active) {
                enemy.update(deltaTime, player, this.arena, this.enemies);
            }
        }
          // Remove inactive enemies
        this.enemies = this.enemies.filter(enemy => enemy.active);
    }
    
    updateWaveState(deltaTime, player) {
        switch (this.waveState) {            case 'preparing':
                // Wait for preparation time, then start spawning
                if (this.waveTimer >= this.preparationTime) {
                    this.waveState = 'spawning';
                    this.waveTimer = 0;
                    this.spawnTimer = 0;
                    console.log(`🚀 Wave ${this.currentWave} starting! Enemies incoming: ${this.enemiesToSpawn.length}`);
                    
                    // Trigger wave start visual effect
                    if (this.visualEffects) {
                        this.visualEffects.onWaveStart(this.currentWave);
                    }
                }
                break;
                
            case 'spawning':
                // Spawn enemies at intervals until all are spawned
                this.spawnTimer += deltaTime;
                
                if (this.spawnTimer >= this.spawnInterval && this.enemiesToSpawn.length > 0) {
                    this.spawnNextEnemy();
                    this.spawnTimer = 0;                }
                
                // Check if all enemies have been spawned
                if (this.enemiesToSpawn.length === 0) {
                    this.waveState = 'active';
                    console.log(`⚔️ Wave ${this.currentWave} fully spawned! Defeat all enemies to continue.`);
                }
                break;
                
            case 'active':
                // Wait for all enemies to be defeated
                const activeEnemies = this.enemies.filter(e => e.active).length;                if (activeEnemies === 0) {
                    this.waveState = 'completed';
                    this.waveTimer = 0;
                    console.log(`✅ Wave ${this.currentWave} completed! Preparing next wave...`);
                    
                    // Trigger wave completion visual effect
                    if (this.visualEffects) {
                        this.visualEffects.onWaveComplete(this.currentWave);
                    }
                }
                break;
                
            case 'completed':
                // Wait between waves, then start next wave
                if (this.waveTimer >= this.timeBetweenWaves) {
                    this.currentWave++;
                    this.setupWave(this.currentWave);
                }
                break;
        }
    }
    
    setupWave(waveNumber) {
        this.waveConfig = this.generateWaveConfig(waveNumber);
        this.enemiesToSpawn = [...this.waveConfig.enemies]; // Copy array
        this.enemiesSpawnedThisWave = 0;
        this.waveState = 'preparing';
        this.waveTimer = 0;
        
        console.log(`🌊 Setting up Wave ${waveNumber}: ${this.enemiesToSpawn.length} enemies (${this.waveConfig.enemies.join(', ')})`);
        console.log(`📊 Wave ${waveNumber} composition:`, this.waveConfig.enemies.reduce((acc, type) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {}));
    }      generateWaveConfig(waveNumber) {
        const config = {
            number: waveNumber,
            enemies: []
        };
        
        // Phase 1: Only basic enemies (datawisp) for first 5 waves
        if (waveNumber <= 5) {
            // Simple progression: 3-8 basic enemies
            let baseEnemyCount = Math.min(3 + waveNumber, 8);
            
            // Apply difficulty multiplier if available
            if (this.difficultyManager) {
                const multiplier = this.difficultyManager.getWaveSpawnMultiplier();
                baseEnemyCount = Math.ceil(baseEnemyCount * multiplier);
            }
            
            // Only spawn datawisp enemies in phase 1
            for (let i = 0; i < baseEnemyCount; i++) {
                config.enemies.push('datawisp');
            }        } else {
            // Original complex wave system for later phases
            let baseEnemyCount = Math.min(5 + Math.floor(waveNumber / 2), 18);
            
            // Apply difficulty multiplier if available
            if (this.difficultyManager) {
                const multiplier = this.difficultyManager.getWaveSpawnMultiplier();
                baseEnemyCount = Math.ceil(baseEnemyCount * multiplier);
            }
            
            // Enemy type distribution changes with wave progression
            const datawispRatio = Math.max(0.6 - (waveNumber * 0.05), 0.2);
            const memoryleechRatio = waveNumber >= 8 ? Math.min(0.15 + (waveNumber * 0.01), 0.3) : 0; // Start appearing at wave 8
            const syntaxbreakerRatio = waveNumber >= 6 ? Math.min(0.10 + (waveNumber * 0.005), 0.15) : 0; // Start appearing at wave 6
            const bitbugRatio = 1 - datawispRatio - memoryleechRatio - syntaxbreakerRatio;
            
            // Generate enemy list
            for (let i = 0; i < baseEnemyCount; i++) {
                const rand = Math.random();
                let enemyType;
                if (rand < datawispRatio) {
                    enemyType = 'datawisp';
                } else if (rand < datawispRatio + memoryleechRatio) {
                    enemyType = 'memoryleech';
                } else if (rand < datawispRatio + memoryleechRatio + syntaxbreakerRatio) {
                    enemyType = 'syntaxbreaker';
                } else {
                    enemyType = 'bitbug';
                }
                config.enemies.push(enemyType);
            }
              // Add bonus enemies for higher waves
            if (waveNumber >= 10) {
                let bonusEnemies = Math.floor(waveNumber / 5);
                
                // Apply difficulty multiplier to bonus enemies too
                if (this.difficultyManager) {
                    const multiplier = this.difficultyManager.getWaveSpawnMultiplier();
                    bonusEnemies = Math.ceil(bonusEnemies * multiplier);
                }
                for (let i = 0; i < bonusEnemies; i++) {
                    // Higher chance of special enemies in bonus enemies for late waves
                    const rand = Math.random();
                    if (waveNumber >= 12 && rand < 0.3) {
                        config.enemies.push('memoryleech');
                    } else if (waveNumber >= 8 && rand < 0.5) {
                        config.enemies.push('syntaxbreaker');
                    } else {
                        config.enemies.push('bitbug');
                    }
                }
            }
        }
        
        // Shuffle the enemy spawn order for variety
        this.shuffleArray(config.enemies);
        
        return config;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
      spawnNextEnemy() {
        if (this.enemiesToSpawn.length === 0) return;
        
        const enemyType = this.enemiesToSpawn.shift(); // Remove first enemy from queue
        const spawnArea = this.arena.getSafeSpawnArea();
        let spawnX, spawnY;
        let attempts = 0;
        const maxAttempts = 20;
          // Try to find a spawn position away from the center ring, and away from safe zone only if player is in it
        do {
            spawnX = spawnArea.minX + Math.random() * (spawnArea.maxX - spawnArea.minX);
            spawnY = spawnArea.minY + Math.random() * (spawnArea.maxY - spawnArea.minY);
            
            // Check distance from center ring (old exclusion)
            const centerDist = Math.sqrt(
                (spawnX - spawnArea.centerX) ** 2 + 
                (spawnY - spawnArea.centerY) ** 2
            );
            
            // Check if position is outside center ring
            const isOutsideCenterRing = centerDist > spawnArea.centerExclusionRadius;
            
            // Only avoid safe zone if player is currently in it
            const safeZoneStatus = this.arena.getSafeZoneStatus();
            const shouldAvoidSafeZone = safeZoneStatus.inSafeZone && safeZoneStatus.available;
            const isOutsideSafeZone = !shouldAvoidSafeZone || !this.arena.isInSafeZone(spawnX, spawnY);
            
            if (isOutsideCenterRing && isOutsideSafeZone) {
                break;
            }
            
            attempts++;
        } while (attempts < maxAttempts);
        
        // If we can't find a good spot, spawn at arena edge
        if (attempts >= maxAttempts) {
            const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
            const margin = 50;
            
            switch (edge) {
                case 0: // top
                    spawnX = margin + Math.random() * (this.arena.width - 2 * margin);
                    spawnY = margin;
                    break;
                case 1: // right
                    spawnX = this.arena.width - margin;
                    spawnY = margin + Math.random() * (this.arena.height - 2 * margin);
                    break;
                case 2: // bottom
                    spawnX = margin + Math.random() * (this.arena.width - 2 * margin);
                    spawnY = this.arena.height - margin;
                    break;
                case 3: // left
                    spawnX = margin;
                    spawnY = margin + Math.random() * (this.arena.height - 2 * margin);
                    break;
            }
        }
          const enemy = new Enemy(spawnX, spawnY, enemyType);
        
        // Apply difficulty modifiers if difficulty manager is available
        if (this.difficultyManager) {
            this.difficultyManager.applyEnemyModifiers(enemy);
        }
        
        this.enemies.push(enemy);
        this.totalSpawned++;
        this.enemiesSpawnedThisWave++;
        
        // Trigger enemy spawn visual effect
        if (this.visualEffects) {
            this.visualEffects.onEnemySpawn(spawnX, spawnY, enemyType);
        }
          console.log(`👾 Spawned ${enemyType} at (${Math.round(spawnX)}, ${Math.round(spawnY)}) - Wave ${this.currentWave} (${this.enemiesSpawnedThisWave}/${this.waveConfig.enemies.length})`);
    }
      // Check bullet collisions and return points scored
    checkBulletCollisions(bullets, visualEffects = null) {
        let pointsScored = 0;
        let killCount = 0;
        let hitData = []; // Store hit information for visual effects
        
        for (let bullet of bullets) {
            if (!bullet.active) continue;
            
            for (let enemy of this.enemies) {
                if (!enemy.active) continue;
                
                // Skip enemies this bullet has already hit
                if (bullet.enemiesHit.includes(enemy)) continue;
                
                if (enemy.checkCollision(bullet.x, bullet.y, bullet.radius)) {
                    // Add this enemy to the bullet's hit list
                    bullet.enemiesHit.push(enemy);
                    
                    const enemyWasAlive = enemy.health > 0;
                    const points = enemy.takeDamage(bullet.damage); // Use bullet's damage value
                    pointsScored += points;
                    
                    // Store hit data for visual effects
                    const hitInfo = {
                        x: enemy.x,
                        y: enemy.y,
                        damage: bullet.damage,
                        enemyType: enemy.type,
                        wasKilled: points > 0
                    };
                    hitData.push(hitInfo);
                    
                    // Trigger visual effects if system is available
                    if (visualEffects) {
                        if (points > 0) {
                            // Enemy was killed
                            visualEffects.onEnemyDestroyed(enemy.x, enemy.y, enemy.type);
                        } else {
                            // Enemy was hit but not killed
                            visualEffects.onEnemyHit(enemy.x, enemy.y, bullet.damage, enemy.type);
                        }
                    }
                    
                    if (points > 0) {
                        killCount++;
                        console.log(`${enemy.type} destroyed! +${points} points`);
                    }
                    
                    // Check if bullet should continue piercing
                    if (bullet.piercing <= 0 || bullet.enemiesHit.length > bullet.piercing) {
                        bullet.active = false;
                        break; // Bullet is done piercing
                    }
                    // If bullet has piercing left, continue to next enemy
                }
            }
        }
        
        return { points: pointsScored, kills: killCount, hits: hitData };
    }
      // Check player collisions
    checkPlayerCollisions(player, arena = null) {
        // If player is protected by safe zone, no collision damage
        if (arena && arena.isSafeZoneActive()) {
            return null;
        }
        
        for (let enemy of this.enemies) {
            if (!enemy.active) continue;
            
            if (enemy.checkPlayerCollision(player)) {
                return enemy; // Return the enemy that hit the player
            }
        }
        return null;
    }
    
    render(ctx) {
        for (let enemy of this.enemies) {
            if (enemy.active) {
                enemy.render(ctx);
            }
        }
    }
    
    getActiveEnemyCount() {
        return this.enemies.filter(e => e.active).length;
    }
    
    getTotalSpawned() {
        return this.totalSpawned;
    }
    
    // Wave information getters
    getCurrentWave() {
        return this.currentWave;
    }
    
    getWaveState() {
        return this.waveState;
    }
    
    getWaveProgress() {
        if (!this.waveConfig) return 0;
        
        if (this.waveState === 'preparing') {
            return 0;
        } else if (this.waveState === 'spawning') {
            const totalEnemies = this.waveConfig.enemies.length + this.enemiesSpawnedThisWave;
            return this.enemiesSpawnedThisWave / totalEnemies;
        } else if (this.waveState === 'active') {
            const activeEnemies = this.enemies.filter(e => e.active).length;
            const totalEnemies = this.waveConfig.enemies.length + this.enemiesSpawnedThisWave;
            return (totalEnemies - activeEnemies) / totalEnemies;
        } else {
            return 1.0;
        }
    }
    
    getTimeUntilNextWave() {
        if (this.waveState === 'preparing') {
            return Math.max(0, this.preparationTime - this.waveTimer);
        } else if (this.waveState === 'completed') {
            return Math.max(0, this.timeBetweenWaves - this.waveTimer);
        }
        return 0;
    }
    
    getRemainingEnemiesInWave() {
        if (this.waveState === 'spawning') {
            return this.enemiesToSpawn.length;
        } else if (this.waveState === 'active') {
            return this.enemies.filter(e => e.active).length;
        }
        return 0;
    }
    
    // Continue to next wave after upgrade selection
    continueAfterUpgrade() {
        // Reset the timer to immediately proceed to next wave
        if (this.waveState === 'completed') {
            this.waveTimer = this.timeBetweenWaves;
        }
    }
}
