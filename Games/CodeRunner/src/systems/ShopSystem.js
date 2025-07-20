/**
 * Shop System - Handles upgrade purchases and management
 */

export class ShopSystem {
    constructor(game) {
        this.game = game;
        this.ownedUpgrades = new Set();
        this.upgradeData = this.initializeUpgradeData();
        this.loadOwnedUpgrades();
    }    initializeUpgradeData() {
        return {
            // Movement Upgrades
            'speed-boost': {
                name: 'Speed Boost',
                price: 25,
                category: 'movement',
                description: 'Makes the player run faster for better navigation and higher scores.',
                effect: { type: 'speedBoost', value: true }
            },
            'double-jump': {
                name: 'Double Jump',
                price: 50,
                category: 'movement',
                description: 'Adds a second jump in mid-air to reach higher platforms and avoid obstacles.',
                effect: { type: 'doubleJump', value: true }
            },
            'air-boost-1': {
                name: 'Air Boost Level 1',
                price: 300,
                category: 'movement',
                description: 'Enhanced double jump with increased height and better control.',
                effect: { type: 'airBoost', value: 1 },
                prerequisites: ['double-jump']
            },            'air-boost-2': {
                name: 'Air Boost Level 2',
                price: 800,
                category: 'movement',
                description: 'Maximum air boost power with extended hang time.',
                effect: { type: 'airBoost', value: 2 },
                prerequisites: ['air-boost-1']
            },            'dash': {
                name: 'Dash',
                price: 40,
                category: 'movement',
                description: 'Lets the player dash forward quickly to avoid obstacles or cross gaps. Press Shift to dash.',
                effect: { type: 'dash', value: true }
            },
            'dash-module-1': {
                name: 'Dash Module Level 1',
                price: 500,
                category: 'movement',
                description: 'Quick horizontal dash ability. Press Shift to dash.',
                effect: { type: 'dashModule', value: 1 }
            },
            'dash-module-2': {
                name: 'Dash Module Level 2',
                price: 1000,
                category: 'movement',
                description: 'Improved dash with longer distance and reduced cooldown.',
                effect: { type: 'dashModule', value: 2 },
                prerequisites: ['dash-module-1']
            },
            'dash-module-3': {
                name: 'Dash Module Level 3',
                price: 1600,
                category: 'movement',
                description: 'Maximum dash power with shortest cooldown and longest range.',
                effect: { type: 'dashModule', value: 3 },
                prerequisites: ['dash-module-2']            },
            'health-upgrade': {
                name: 'Health Upgrade',
                price: 60,
                category: 'movement',
                description: 'Increases maximum health, allowing you to take more hits before game over.',
                effect: { type: 'maxHealth', value: 1 }
            },

            // Cosmetic Unlocks
            'sprite-cosmic': {
                name: 'Bathtub Lover',
                price: 50,
                category: 'cosmetic',
                description: 'A futuristic space explorer with blue and white armor.',
                effect: { type: 'sprite', value: 'buyable cosmetics/sprite_0.png' }
            },
            'sprite-shadow': {
                name: 'Rice Runner',
                price: 100,
                category: 'cosmetic',
                description: 'Yellow and black stealth operative.',
                effect: { type: 'sprite', value: 'buyable cosmetics/sprite_2.png' }
            },
            'sprite-flame': {
                name: 'Mexican Man',
                price: 125,
                category: 'cosmetic',
                description: 'Dark ninja with orange accents.',
                effect: { type: 'sprite', value: 'buyable cosmetics/sprite_3.png' }
            },
            'sprite-ice': {
                name: 'Bomb Runner',
                price: 150,
                category: 'cosmetic',
                description: 'Elite quantum combatant with advanced gear.',
                effect: { type: 'sprite', value: 'buyable cosmetics/sprite_4.png' }
            },
            'sprite-electric': {
                name: 'Robber',
                price: 200,
                category: 'cosmetic',
                description: 'Green and black data realm defender.',
                effect: { type: 'sprite', value: 'buyable cosmetics/sprite_5.png' }            },

            // PowerUp Unlocks (Tier 1 - Basic)
            'quantum-dash': {
                name: 'Quantum Dash',
                price: 500,
                category: 'powerups',
                description: 'Unlocks Quantum Dash powerup. Instantly teleports forward through obstacles during gameplay.',
                effect: { type: 'powerupUnlock', value: 'quantum-dash' }
            },
            'firewall-shield': {
                name: 'Firewall Shield',
                price: 750,
                category: 'powerups',
                description: 'Unlocks Firewall Shield powerup. Absorbs one hit from any obstacle or trap.',
                effect: { type: 'powerupUnlock', value: 'firewall-shield' }
            },
            'coin-magnetizer': {
                name: 'Coin Magnetizer',
                price: 600,
                category: 'powerups',
                description: 'Unlocks Coin Magnetizer powerup. Pulls in nearby coins and collectibles for 6 seconds.',
                effect: { type: 'powerupUnlock', value: 'coin-magnetizer' }
            },

            // Movement Upgrades (continued)
        };
    }    buyUpgrade(upgradeId) {
        const upgrade = this.upgradeData[upgradeId];
        if (!upgrade) {
            console.warn(`❌ Upgrade not found: ${upgradeId}`);
            return false;
        }

        if (this.isOwned(upgradeId)) {
            console.warn(`❌ Upgrade already owned: ${upgradeId}`);
            return false;
        }

        // Prevent purchasing placeholder items
        if (upgradeId === 'coming-soon') {
            console.warn(`❌ Cannot purchase placeholder item: ${upgradeId}`);
            return false;
        }

        // Check prerequisites
        if (upgrade.prerequisites && upgrade.prerequisites.length > 0) {
            for (const prereq of upgrade.prerequisites) {
                if (!this.isOwned(prereq)) {
                    console.warn(`❌ Prerequisites not met for ${upgradeId}: missing ${prereq}`);
                    return false; // Prerequisites not met
                }
            }
        }

        const currentCurrency = this.game.upgradeSystem ? this.game.upgradeSystem.getDataPackets() : 0;
        if (currentCurrency < upgrade.price) {
            console.warn(`❌ Insufficient funds for ${upgradeId}: ${currentCurrency} < ${upgrade.price}`);
            return false;
        }

        // Deduct currency (only if upgradeSystem exists)
        if (this.game.upgradeSystem) {
            this.game.upgradeSystem.spendDataPackets(upgrade.price);
        }

        // Add to owned upgrades
        this.ownedUpgrades.add(upgradeId);
        this.saveOwnedUpgrades();

        // Apply upgrade effect
        this.applyUpgradeEffect(upgradeId, upgrade);
        
        // Trigger autosave after purchase to save updated data packet count
        if (this.game && this.game.triggerManualSave) {
            this.game.triggerManualSave();
        }
        
        console.log(`✅ Successfully purchased upgrade: ${upgradeId} for ${upgrade.price} datapackets`);
        console.log(`📦 Owned upgrades now: [${Array.from(this.ownedUpgrades).join(', ')}]`);
        
        // Track achievement: Style.exe for cosmetic purchases
        if (this.game.achievementSystem && upgrade.category === 'cosmetic') {
            this.game.achievementSystem.trackEvent('cosmeticEquipped', {
                upgradeId: upgradeId
            });
        }
        
        return true;
    }    applyUpgradeEffect(upgradeId, upgrade) {
        const player = this.game.player;
        
        // Handle powerup unlocks
        if (upgrade.effect && upgrade.effect.type === 'powerupUnlock') {
            console.log(`🔓 Powerup unlocked: ${upgrade.effect.value}`);
            
            // Refresh the powerup system's unlocked powerups
            if (this.game.powerUpSystem) {
                this.game.powerUpSystem.refreshUnlockedPowerUps();
            }
        }
        
        // Handle sprite cosmetics
        if (upgrade.effect && upgrade.effect.type === 'sprite') {
            // For sprite cosmetics, just unlock them - don't automatically apply
            // The user should choose which sprite to use via character customization
            console.log(`🔓 Cosmetic sprite unlocked: ${upgrade.effect.value}`);
            
            // Don't change the selected sprite here - let the user choose via character customization
            // if (window.profileManager) {
            //     window.profileManager.profileData.selectedSprite = upgrade.effect.value;
            //     window.profileManager.saveProfile();
            //     if (player) {
            //         player.changeSprite(`./assets/${upgrade.effect.value}`);
            //     }
            //     window.profileManager.refreshSpriteSelector();
            //     console.log(`✨ Applied cosmetic sprite: ${upgrade.effect.value}`);
            // }
            return;
        }
        
        // Convert hyphenated IDs to camelCase for player methods
        const playerUpgradeId = this.convertToPlayerUpgradeId(upgradeId);
          if (player && player.applyShopUpgrade) {
            player.applyShopUpgrade(playerUpgradeId);
        } else {
            // Skip applying upgrade if player not available
        }
    }
    
    /**
     * Convert hyphenated upgrade IDs to camelCase for player compatibility
     */    convertToPlayerUpgradeId(upgradeId) {        const idMap = {
            'speed-boost': 'speedBoost',
            'double-jump': 'doubleJump',
            'air-boost-1': 'airBoost1',
            'air-boost-2': 'airBoost2',
            'dash': 'dash',
            'dash-module-1': 'dashModule1',
            'dash-module-2': 'dashModule2',            'dash-module-3': 'dashModule3',
            'health-upgrade': 'healthUpgrade'
        };
        
        return idMap[upgradeId] || upgradeId;
    }

    isOwned(upgradeId) {
        return this.ownedUpgrades.has(upgradeId);
    }

    /**
     * Get owned upgrades array for saving
     */
    getOwnedUpgrades() {
        return Array.from(this.ownedUpgrades);
    }

    /**
     * Load owned upgrades from array
     */
    loadOwnedUpgrades(upgradesArray) {
        try {
            if (Array.isArray(upgradesArray)) {
                this.ownedUpgrades = new Set(upgradesArray);
                // Also save to the legacy localStorage key for compatibility
                this.saveOwnedUpgrades();
            }
        } catch (error) {
            console.warn('Failed to load owned upgrades from array:', error);
            this.ownedUpgrades = new Set();
        }
    }

    saveOwnedUpgrades() {        try {
            const upgradesArray = Array.from(this.ownedUpgrades);
            localStorage.setItem('coderunner_owned_upgrades', JSON.stringify(upgradesArray));
        } catch (error) {
            // Failed to save owned upgrades
        }    }
    
    loadOwnedUpgrades() {
        try {
            const saved = localStorage.getItem('coderunner_owned_upgrades');
            if (saved) {
                const upgradesArray = JSON.parse(saved);
                this.ownedUpgrades = new Set(upgradesArray);
            }
        } catch (error) {
            // Failed to load owned upgrades
            this.ownedUpgrades = new Set();
        }
    }

    reset() {
        this.ownedUpgrades.clear();
        this.saveOwnedUpgrades();
    }

    getDebugInfo() {
        return {
            ownedCount: this.ownedUpgrades.size,
            totalUpgrades: Object.keys(this.upgradeData).length,
            ownedUpgrades: Array.from(this.ownedUpgrades)
        };
    }
    
    /**
     * Apply all owned upgrades to the current player
     */    applyAllOwnedUpgrades() {
        if (!this.game.player) {
            return;
        }
        
        this.ownedUpgrades.forEach(upgradeId => {
            const upgrade = this.upgradeData[upgradeId];
            if (upgrade) {
                this.applyUpgradeEffect(upgradeId, upgrade);
            }
        });
    }

    // For backward compatibility with old code
    purchaseUpgrade(upgradeId) {
        return this.buyUpgrade(upgradeId);
    }

    /**
     * Get upgrades filtered by category
     */
    getUpgradesByCategory(category) {
        const upgrades = [];
        for (const [id, upgrade] of Object.entries(this.upgradeData)) {
            if (upgrade.category === category) {
                upgrades.push({
                    id: id,
                    name: upgrade.name,
                    price: upgrade.price,
                    category: upgrade.category,
                    description: upgrade.description,
                    effect: upgrade.effect,
                    prerequisites: upgrade.prerequisites || []
                });
            }
        }
        return upgrades;
    }

    /**
     * Reset animations (required by GameNavigation when entering shop state)
     */
    resetAnimations() {
        // ShopSystem doesn't have animation states to reset
        // This method exists for compatibility with the navigation system
        console.log('🛒 Shop animations reset');
    }
}
