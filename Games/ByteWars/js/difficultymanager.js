// Difficulty Manager for NeuroCore: Byte Wars
class DifficultyManager {
    constructor() {
        this.currentDifficulty = 'medium'; // Default difficulty
        
        // Difficulty configurations based on Planning.md specifications
        this.difficulties = {
            easy: {
                name: 'Easy',
                emoji: '🟢',
                playerHealth: 150,
                playerSpeedMultiplier: 1.0,    // 100% normal speed - full control
                enemySpeedMultiplier: 1.0,     // Normal speed
                enemyHealthMultiplier: 0.8,    // 20% less health
                enemyDamageMultiplier: 0.7,    // 30% less damage
                overclockChargeMultiplier: 1.5, // 50% faster charge
                waveSpawnMultiplier: 0.7,      // 30% fewer enemies
                dashCooldownMultiplier: 0.7,   // 30% faster dash recovery
                healingType: 'during_wave',    // Heal during waves
                healingRate: 2,                // HP per second during waves
                upgradeDropMultiplier: 1.3     // 30% more upgrade drops
            },
            medium: {
                name: 'Medium',
                emoji: '🟡',
                playerHealth: 100,
                playerSpeedMultiplier: 0.95,   // 95% speed - slightly reduced mobility
                enemySpeedMultiplier: 1.0,     // Normal speed
                enemyHealthMultiplier: 1.0,    // Normal health
                enemyDamageMultiplier: 1.0,    // Normal damage
                overclockChargeMultiplier: 1.0, // Normal charge rate
                waveSpawnMultiplier: 1.0,      // Normal enemy count
                dashCooldownMultiplier: 1.0,   // Normal dash cooldown
                healingType: 'after_wave',     // Heal after every wave
                healingRate: 0,                // No gradual healing
                upgradeDropMultiplier: 1.0     // Normal upgrade drops
            },
            hard: {
                name: 'Hard',
                emoji: '🔴',
                playerHealth: 100,
                playerSpeedMultiplier: 0.90,   // 90% speed - requires better positioning
                enemySpeedMultiplier: 1.0,     // Normal speed
                enemyHealthMultiplier: 1.2,    // 20% more health
                enemyDamageMultiplier: 1.2,    // 20% more damage
                overclockChargeMultiplier: 0.7, // 30% slower charge
                waveSpawnMultiplier: 1.4,      // 40% more enemies
                dashCooldownMultiplier: 1.0,   // Normal dash cooldown
                healingType: 'every_3_waves',  // Heal only every 3 waves
                healingRate: 0,                // No gradual healing
                upgradeDropMultiplier: 1.0     // Normal upgrade drops
            },
            extreme: {
                name: 'Extreme',
                emoji: '☠️',
                playerHealth: 80,
                playerSpeedMultiplier: 0.80,   // 80% speed - heavy, requires mastery
                enemySpeedMultiplier: 1.0,     // Normal speed
                enemyHealthMultiplier: 1.5,    // 50% more health
                enemyDamageMultiplier: 1.5,    // 50% more damage
                overclockChargeMultiplier: 0.5, // 50% slower charge
                waveSpawnMultiplier: 1.8,      // 80% more enemies
                dashCooldownMultiplier: 1.0,   // Normal dash cooldown
                healingType: 'never',          // No healing ever
                healingRate: 0,                // No gradual healing
                upgradeDropMultiplier: 0.8     // 20% fewer upgrade drops
            }
        };
        
        // Base enemy damage values from Planning.md
        this.baseEnemyDamage = {
            datawisp: 5,
            bitbug: 10,
            memoryleech: 2,    // Per second while latched
            syntaxbreaker: 8,
            corruptedprotocol: 20, // Average of 15-25 range
            theforked: 15,         // Average of 12-18 range
            neurofork: 27          // Average of 20-35 range
        };
        
        console.log('🎮 Difficulty Manager initialized with default difficulty: medium');
    }
    
    // Set difficulty level
    setDifficulty(difficulty) {
        if (this.difficulties[difficulty]) {
            this.currentDifficulty = difficulty;
            console.log(`🎮 Difficulty set to: ${this.difficulties[difficulty].emoji} ${this.difficulties[difficulty].name}`);
            return true;
        }
        console.warn(`⚠️ Invalid difficulty: ${difficulty}`);
        return false;
    }
    
    // Get current difficulty configuration
    getCurrentDifficulty() {
        return this.difficulties[this.currentDifficulty];
    }
    
    // Get current difficulty name
    getCurrentDifficultyName() {
        return this.currentDifficulty;
    }
    
    // Get all available difficulties for UI
    getAllDifficulties() {
        return Object.keys(this.difficulties).map(key => ({
            key: key,
            name: this.difficulties[key].name,
            emoji: this.difficulties[key].emoji,
            description: this.getDifficultyDescription(key)
        }));
    }
    
    // Get difficulty description
    getDifficultyDescription(difficulty) {
        const config = this.difficulties[difficulty];
        if (!config) return '';
        
        switch (difficulty) {
            case 'easy':
                return 'New/casual players. More health, weaker enemies, healing during waves.';
            case 'medium':
                return 'Standard gameplay. Balanced difficulty, heal after waves.';
            case 'hard':
                return 'Skilled players. Faster, tougher enemies. Heal every 3 waves.';
            case 'extreme':
                return 'Hardcore challenge. Very tough enemies, no healing ever.';
            default:
                return '';
        }
    }
    
    // Apply difficulty modifiers to player stats
    applyPlayerModifiers(player) {
        const config = this.getCurrentDifficulty();
        
        // Set player health based on difficulty
        player.maxHealth = config.playerHealth;
        player.health = config.playerHealth;
        
        // Apply overclock charge multiplier
        player.baseOverclockChargePerKill = Math.round(player.baseOverclockChargePerKill * config.overclockChargeMultiplier);
        player.overclockChargePerKill = player.baseOverclockChargePerKill;
        
        // Apply dash cooldown multiplier
        player.baseDashCooldown = player.baseDashCooldown * config.dashCooldownMultiplier;
        player.dashCooldown = player.baseDashCooldown;
        
        // Apply player speed multiplier
        player.setSpeedMultiplier(config.playerSpeedMultiplier);
        
        console.log(`🎮 Applied ${config.name} difficulty modifiers to player:`, {
            health: player.health,
            speed: Math.round(player.speed),
            speedMultiplier: `${Math.round(config.playerSpeedMultiplier * 100)}%`,
            dashCooldown: player.dashCooldown.toFixed(1),
            overclockCharge: player.overclockChargePerKill
        });
    }
    
    // Apply difficulty modifiers to enemy stats
    applyEnemyModifiers(enemy) {
        const config = this.getCurrentDifficulty();
        
        // Apply health multiplier
        enemy.health = Math.round(enemy.health * config.enemyHealthMultiplier);
        enemy.maxHealth = Math.round(enemy.maxHealth * config.enemyHealthMultiplier);
        
        // Store original damage for calculations
        if (!enemy.baseDamage) {
            enemy.baseDamage = this.getEnemyBaseDamage(enemy.type);
        }
        
        return enemy;
    }
    
    // Get enemy damage based on type and difficulty
    getEnemyDamage(enemyType) {
        const config = this.getCurrentDifficulty();
        const baseDamage = this.baseEnemyDamage[enemyType] || 5; // Default to 5 if type not found
        return Math.round(baseDamage * config.enemyDamageMultiplier);
    }
    
    // Get base enemy damage (for reference)
    getEnemyBaseDamage(enemyType) {
        return this.baseEnemyDamage[enemyType] || 5;
    }
    
    // Apply wave spawn multiplier
    getWaveSpawnMultiplier() {
        return this.getCurrentDifficulty().waveSpawnMultiplier;
    }
    
    // Check if player should heal
    shouldHealPlayer(waveNumber, duringWave = false) {
        const config = this.getCurrentDifficulty();
        
        switch (config.healingType) {
            case 'during_wave':
                return duringWave; // Heal during waves only
            case 'after_wave':
                return !duringWave; // Heal after waves only
            case 'every_3_waves':
                return !duringWave && (waveNumber % 3 === 0); // Heal after every 3rd wave
            case 'never':
                return false; // Never heal
            default:
                return false;
        }
    }
    
    // Get healing rate for gradual healing
    getHealingRate() {
        return this.getCurrentDifficulty().healingRate;
    }
    
    // Get upgrade drop multiplier
    getUpgradeDropMultiplier() {
        return this.getCurrentDifficulty().upgradeDropMultiplier;
    }
    
    // Get difficulty statistics for display
    getDifficultyStats() {
        const config = this.getCurrentDifficulty();
        return {
            name: config.name,
            emoji: config.emoji,
            playerHealth: config.playerHealth,
            enemySpeed: `${Math.round(config.enemySpeedMultiplier * 100)}%`,
            enemyHealth: `${Math.round(config.enemyHealthMultiplier * 100)}%`,
            enemyDamage: `${Math.round(config.enemyDamageMultiplier * 100)}%`,
            overclockCharge: `${Math.round(config.overclockChargeMultiplier * 100)}%`,
            waveSize: `${Math.round(config.waveSpawnMultiplier * 100)}%`,
            healingType: config.healingType.replace('_', ' ').toUpperCase()
        };
    }
}
