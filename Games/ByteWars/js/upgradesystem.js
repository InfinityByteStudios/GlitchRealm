// Upgrade System for NeuroCore: Byte Wars
class UpgradeSystem {
    constructor() {
        this.activeUpgrades = new Map(); // Track which upgrades are active and their levels
        this.upgradeDefinitions = this.initializeUpgradeDefinitions();
        this.showingUpgradeMenu = false;
        this.selectedUpgrades = []; // Currently offered upgrades
    }

    initializeUpgradeDefinitions() {
        return {
            piercingBullets: {
                name: "Piercing Rounds",
                description: "Bullets pierce through enemies",
                icon: "🎯",
                maxLevel: 3,
                rarity: "common",
                effects: {
                    bulletPiercing: [1, 2, 3] // Number of enemies bullets can pierce through
                }
            },
            
            fasterOverclock: {
                name: "Neural Efficiency",
                description: "Faster Overclock charge rate",
                icon: "⚡",
                maxLevel: 5,
                rarity: "common",
                effects: {
                    overclockChargeMultiplier: [1.25, 1.5, 1.75, 2.0, 2.5]
                }
            },
            
            increasedDamage: {
                name: "Amplified Output",
                description: "Increased bullet damage",
                icon: "💥",
                maxLevel: 5,
                rarity: "common",
                effects: {
                    damageMultiplier: [1.2, 1.4, 1.6, 1.8, 2.0]
                }
            },
            
            fasterShooting: {
                name: "Rapid Processing",
                description: "Increased fire rate",
                icon: "🔥",
                maxLevel: 4,
                rarity: "common",
                effects: {
                    fireRateMultiplier: [1.3, 1.6, 1.9, 2.2]
                }
            },
            
            improvedDash: {
                name: "Enhanced Mobility",
                description: "Faster dash cooldown and distance",
                icon: "💨",
                maxLevel: 3,
                rarity: "rare",
                effects: {
                    dashCooldownMultiplier: [0.8, 0.65, 0.5],
                    dashDistanceMultiplier: [1.2, 1.4, 1.6]
                }
            }
        };
    }

    // Generate 3 random upgrades for player choice
    generateUpgradeChoices() {
        const availableUpgrades = [];
        
        // Get all upgrades that haven't reached max level
        for (const [id, definition] of Object.entries(this.upgradeDefinitions)) {
            const currentLevel = this.activeUpgrades.get(id) || 0;
            if (currentLevel < definition.maxLevel) {
                availableUpgrades.push({
                    id,
                    ...definition,
                    currentLevel
                });
            }
        }

        // If we have fewer than 3 available upgrades, duplicate some
        while (availableUpgrades.length < 3 && availableUpgrades.length > 0) {
            availableUpgrades.push(...availableUpgrades.slice(0, 3 - availableUpgrades.length));
        }

        // Randomly select 3 upgrades
        const choices = [];
        const shuffled = [...availableUpgrades].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(3, shuffled.length); i++) {
            choices.push(shuffled[i]);
        }

        this.selectedUpgrades = choices;
        return choices;
    }

    // Apply an upgrade when player selects it
    applyUpgrade(upgradeId) {
        const currentLevel = this.activeUpgrades.get(upgradeId) || 0;
        const newLevel = currentLevel + 1;
        
        this.activeUpgrades.set(upgradeId, newLevel);
        
        console.log(`🔧 Applied upgrade: ${this.upgradeDefinitions[upgradeId].name} (Level ${newLevel})`);
        
        // Return the effects for this upgrade level
        const definition = this.upgradeDefinitions[upgradeId];
        const effects = {};
        
        for (const [effectName, values] of Object.entries(definition.effects)) {
            effects[effectName] = values[newLevel - 1];
        }
        
        return effects;
    }

    // Get all currently active upgrade effects
    getActiveEffects() {
        const allEffects = {
            bulletPiercing: 0,
            overclockChargeMultiplier: 1.0,
            damageMultiplier: 1.0,
            fireRateMultiplier: 1.0,
            dashCooldownMultiplier: 1.0,
            dashDistanceMultiplier: 1.0
        };

        // Combine all active upgrade effects
        for (const [upgradeId, level] of this.activeUpgrades.entries()) {
            const definition = this.upgradeDefinitions[upgradeId];
            
            for (const [effectName, values] of Object.entries(definition.effects)) {
                if (effectName === 'bulletPiercing') {
                    allEffects[effectName] = Math.max(allEffects[effectName], values[level - 1]);
                } else {
                    allEffects[effectName] *= values[level - 1];
                }
            }
        }

        return allEffects;
    }

    // Get list of active upgrades for UI display
    getActiveUpgradesList() {
        const activeList = [];
        
        for (const [upgradeId, level] of this.activeUpgrades.entries()) {
            const definition = this.upgradeDefinitions[upgradeId];
            activeList.push({
                id: upgradeId,
                name: definition.name,
                level: level,
                maxLevel: definition.maxLevel,
                icon: definition.icon
            });
        }
        
        return activeList.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Reset all upgrades (for new game)
    reset() {
        this.activeUpgrades.clear();
        this.showingUpgradeMenu = false;
        this.selectedUpgrades = [];
    }

    // Check if upgrade menu should be shown
    shouldShowUpgradeMenu() {
        return this.showingUpgradeMenu;
    }

    // Show/hide upgrade menu
    setUpgradeMenuVisible(visible) {
        this.showingUpgradeMenu = visible;
    }
}
