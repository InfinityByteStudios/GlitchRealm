/**
 * Helper class for testing movement upgrades
 */
export class UpgradeTestHelper {
    constructor(game) {
        this.game = game;
        this.testResults = {};
    }

    /**
     * Add debug upgrade commands to window for easy testing
     */
    addDebugCommands() {
        // Expose test commands to window for easy browser console access
        window.testUpgrades = {            // Give player data packets for testing
            giveDataPackets: (amount = 10000) => {
                this.game.player.score += amount;
                
            },

            // Buy specific upgrades
            buyUpgrade: (upgradeId) => {
                const success = this.game.shopSystem.purchaseUpgrade(upgradeId, this.game.player);
                
                this.showPlayerUpgrades();
            },

            // Buy all movement upgrades for testing
            buyAllMovement: () => {
                const movementUpgrades = [
                    'speed-boost',
                    'double-jump', 
                    'air-boost-1',
                    'air-boost-2',
                    'dash',                    'dash-module-1',
                    'dash-module-2', 
                    'dash-module-3',
                    'extra-lane'
                ];                // Give data packets first
                this.game.upgradeSystem.addDataPackets(50000);
                
                movementUpgrades.forEach(upgrade => {
                    const success = this.game.shopSystem.purchaseUpgrade(upgrade, this.game.player);
                    
                });
                
                this.showPlayerUpgrades();
            },

            // Show current player upgrades
            showUpgrades: () => {
                this.showPlayerUpgrades();
            },

            // Test specific movement functions
            testSpeed: () => {
                
                const hasSpeedBoost = this.game.player.shopUpgrades.speedBoost;
                const speedMultiplier = hasSpeedBoost ? 1.2 : 1.0;
              
            },

            testJump: () => {
                
                const player = this.game.player;
               
            },

            testDash: () => {
                
                const player = this.game.player;
                
            },

            testHover: () => {
               
                const player = this.game.player;
               
            },

            testExtraLane: () => {
                
                const player = this.game.player;
             
                // Force regenerate a chunk to see if extra lane effects are applied
                if (this.game.world && this.game.world.worldGenerator) {
                    
                    // This would be visible in terrain generation
                }
            },

            // Run all tests
            runAllTests: () => {
                
                window.testUpgrades.testSpeed();
                window.testUpgrades.testJump();
                window.testUpgrades.testDash();
                window.testUpgrades.testHover();
                window.testUpgrades.testExtraLane();
            },

            // Saw testing functions
            testSaws: () => {
                console.log('🪚 Testing Saw Spawning...');
                if (this.game.world && this.game.world.worldGenerator) {
                    const generator = this.game.world.worldGenerator;
                   
                } else {
                    
                }
            },

            forceSawChunk: () => {
                
                if (this.game.world && this.game.world.worldGenerator) {
                    // Override terrain parameters temporarily for next chunk
                    const originalGetTerrainParams = this.game.world.worldGenerator.getTerrainParameters;
                    this.game.world.worldGenerator.getTerrainParameters = function(terrainType) {
                        const params = originalGetTerrainParams.call(this, terrainType);
                        params.sawChance = 50; // 50% chance for testing
                        return params;
                    };
                    
                    
                    
                    // Restore original function after 5 seconds
                    setTimeout(() => {
                        this.game.world.worldGenerator.getTerrainParameters = originalGetTerrainParams;
                        
                    }, 5000);
                } else {
                    
                }
            },

            spawnSawPattern: () => {
                
                if (this.game.world && this.game.world.worldGenerator) {
                    // Force the next obstacle pattern to be a saw gauntlet
                    const generator = this.game.world.worldGenerator;
                    const originalGenerateObstaclePattern = generator.generateObstaclePattern;
                    
                    generator.generateObstaclePattern = function(chunk, chunkX) {
                        const groundLevel = chunkX === 0 ? this.groundLevel : this.currentGroundLevel;
                        const clampedGroundLevel = Math.max(0, Math.min(16, groundLevel)); // Use constant instead of this.GAME_CONFIG
                        
                        
                        this.createSawGauntletPattern(chunk, chunkX, 2, clampedGroundLevel);
                    };
                    
                    
                    
                    // Restore original function after one use
                    setTimeout(() => {
                        generator.generateObstaclePattern = originalGenerateObstaclePattern;
                        
                    }, 3000);
                } else {
                    
                }
            }
        };

        
    }

    /**
     * Show current player upgrades in console
     */
    showPlayerUpgrades() {
        const upgrades = this.game.player.shopUpgrades;
        
    }

    /**
     * Monitor player state for debugging
     */
    startMonitoring() {
        this.monitorInterval = setInterval(() => {
            const player = this.game.player;
            
            // Only log when player is moving or performing actions
            if (Math.abs(player.vx) > 1 || player.dashState.isDashing || !player.onGround) {
                
            }
        }, 500); // Check every 500ms
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            
        }
    }
}
