/**
 * Upgrade System - Manages temporary upgrades for each game session
 */

import { GAME_CONFIG } from '../utils/constants.js';

export class UpgradeSystem {    constructor(game) {
        this.game = game; // Store game reference for save system access
        this.dataPackets = 0; // Currency for upgrades
        
        // Upgrade levels (reset each game)
        this.jumpHeightLevel = 0;
        this.scoreMultiplierLevel = 0;
        this.powerUpDurationLevel = 0;
        
        // Current upgrade values
        this.jumpHeightBonus = 0;
        this.scoreMultiplierBonus = 0;
        this.powerUpDurationBonus = 0;
          this.selectedUpgrade = 0; // For menu navigation
        this.maxUpgrades = 3;
        
        // Flag to prevent duplicate loading during cloud save restore
        this.isInitializing = true;
        this.hasLoadedData = false;
        
        // Only load data immediately if user is not logged in
        // If user is logged in, wait for cloud save system to apply data
        this.initializeData().catch(error => {
            console.warn('Failed to initialize upgrade data:', error);
        });
    }
    
    /**
     * Initialize data with proper timing
     */
    async initializeData() {
        // Small delay to allow cloud save system to initialize if user is logged in
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if user is logged in and cloud save system will handle the data
        const isLoggedIn = this.game && this.game.cloudSaveSystem && this.game.cloudSaveSystem.isUserLoggedIn();
        
        if (!isLoggedIn) {
            // User not logged in, load from localStorage immediately
            await this.loadUpgradeData();
        } else {
            // User is logged in, mark as initialized but don't load data yet
            // Cloud save system will call loadSavedData() with the cloud data
            console.log('💾 UpgradeSystem waiting for cloud data...');
        }
        
        this.isInitializing = false;
    }
      /**
     * Add data packets from game collection
     */    addDataPackets(amount) {
        const previousAmount = this.dataPackets;
        this.dataPackets += amount;
        
        // Debug logging for datapackets changes
        if (window.debugMode) {
            console.log(`💾 DataPackets added: ${previousAmount} + ${amount} = ${this.dataPackets}`);
        }
        
        // Save immediately when data packets are added
        this.saveUpgradeData();
    }
      /**
     * Spend data packets (for shop purchases)
     */    spendDataPackets(amount) {
        if (this.dataPackets >= amount) {
            const previousAmount = this.dataPackets;
            this.dataPackets -= amount;
            
            // Debug logging for datapackets changes
            if (window.debugMode) {
                console.log(`💰 DataPackets spent: ${previousAmount} - ${amount} = ${this.dataPackets}`);
            }
            
            // Save immediately when data packets are spent
            this.saveUpgradeData();
            
            return true;
        }
        return false;
    }
    
    /**
     * Get current data packet count
     */
    getDataPackets() {
        return this.dataPackets;
    }
    
    /**
     * Get upgrade information for display
     */
    getUpgradeInfo() {
        return [
            {
                name: "Jump Height",
                description: "Increase jump power",
                cost: GAME_CONFIG.UPGRADE_COSTS.JUMP_HEIGHT + (this.jumpHeightLevel * 25),
                level: this.jumpHeightLevel,
                maxLevel: 5,
                currentBonus: this.jumpHeightBonus,
                canAfford: this.dataPackets >= (GAME_CONFIG.UPGRADE_COSTS.JUMP_HEIGHT + (this.jumpHeightLevel * 25))
            },
            {
                name: "Score Multiplier",
                description: "Increase points earned",
                cost: GAME_CONFIG.UPGRADE_COSTS.SCORE_MULTIPLIER + (this.scoreMultiplierLevel * 50),
                level: this.scoreMultiplierLevel,
                maxLevel: 5,
                currentBonus: this.scoreMultiplierBonus,
                canAfford: this.dataPackets >= (GAME_CONFIG.UPGRADE_COSTS.SCORE_MULTIPLIER + (this.scoreMultiplierLevel * 50))
            },
            {
                name: "Power-Up Duration",
                description: "Extend power-up time",
                cost: GAME_CONFIG.UPGRADE_COSTS.POWER_UP_DURATION + (this.powerUpDurationLevel * 30),
                level: this.powerUpDurationLevel,
                maxLevel: 5,
                currentBonus: this.powerUpDurationBonus / 1000, // Convert to seconds for display
                canAfford: this.dataPackets >= (GAME_CONFIG.UPGRADE_COSTS.POWER_UP_DURATION + (this.powerUpDurationLevel * 30))
            }
        ];
    }
      /**
     * Purchase an upgrade
     */    purchaseUpgrade(upgradeIndex) {
        const upgrades = this.getUpgradeInfo();
        const upgrade = upgrades[upgradeIndex];
        
        if (!upgrade) {
            return false;
        }
        
        if (!upgrade.canAfford) {
            return false;
        }
          if (upgrade.level >= upgrade.maxLevel) {
            return false;
        }
        
        // Deduct cost
        this.dataPackets -= upgrade.cost;
          // Apply upgrade
        switch (upgradeIndex) {
            case 0: // Jump Height
                this.jumpHeightLevel++;
                this.jumpHeightBonus += GAME_CONFIG.UPGRADE_VALUES.JUMP_HEIGHT_INCREASE;
                break;
                
            case 1: // Score Multiplier
                this.scoreMultiplierLevel++;
                this.scoreMultiplierBonus += GAME_CONFIG.UPGRADE_VALUES.SCORE_MULTIPLIER_INCREASE;
                break;
                
            case 2: // Power-Up Duration
                this.powerUpDurationLevel++;
                this.powerUpDurationBonus += GAME_CONFIG.UPGRADE_VALUES.POWER_UP_DURATION_INCREASE;
                break;
        }        return true;
    }
    
    getSelectedUpgrade() {
        return this.selectedUpgrade;
    }
    
    setSelectedUpgrade(index) {
        if (index >= 0 && index < this.maxUpgrades) {
            this.selectedUpgrade = index;
        }
    }
    
    purchaseSelectedUpgrade() {
        return this.purchaseUpgrade(this.selectedUpgrade);
    }
      /**
     * Reset upgrades for new game (upgrades don't persist)
     */
    resetUpgrades() {
        // Reset upgrade levels but keep data packets
        this.jumpHeightLevel = 0;
        this.scoreMultiplierLevel = 0;
        this.powerUpDurationLevel = 0;
        
        this.jumpHeightBonus = 0;
        this.scoreMultiplierBonus = 0;
        this.powerUpDurationBonus = 0;
        
        // Keep data packets - they persist between games
        // this.dataPackets = 0;
        
        this.selectedUpgrade = 0;
    }
    
    /**
     * Get bonuses to apply to game systems
     */
    getBonuses() {
        return {
            jumpHeight: this.jumpHeightBonus,
            scoreMultiplier: 1.0 + this.scoreMultiplierBonus,
            powerUpDuration: this.powerUpDurationBonus
        };
    }
    
    /**
     * Save upgrade data to localStorage and cloud
     */
    saveUpgradeData() {
        try {
            const upgradeData = {
                dataPackets: this.dataPackets,
                timestamp: Date.now()
            };
            
            // Save to localStorage immediately
            localStorage.setItem('coderunner_upgrade_data', JSON.stringify(upgradeData));
            
            // Trigger comprehensive cloud save if user is logged in
            if (this.game && this.game.cloudSaveSystem && this.game.cloudSaveSystem.isUserLoggedIn()) {
                this.game.cloudSaveSystem.saveAllGameData().catch(error => {
                    console.warn('Failed to save upgrade data to cloud:', error);
                });
            }
            
            console.log(`💾 Upgrade data saved - Data Packets: ${this.dataPackets}`);
        } catch (error) {
            console.warn('⚠️ Failed to save upgrade data:', error);
        }
    }
    
    /**
     * Load upgrade data from localStorage (only when not logged in)
     */
    async loadUpgradeData() {
        if (this.hasLoadedData) {
            console.log('⚠️ UpgradeSystem data already loaded, ignoring duplicate call');
            return;
        }
        
        try {
            // Fall back to localStorage
            const saved = localStorage.getItem('coderunner_upgrade_data');
            if (saved) {
                const upgradeData = JSON.parse(saved);
                if (upgradeData.dataPackets !== undefined) {
                    this.dataPackets = upgradeData.dataPackets;
                    console.log(`💾 Loaded data packets from localStorage: ${this.dataPackets}`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to load upgrade data:', error);
            // Keep default values on error
        }
        
        this.hasLoadedData = true;
    }
    
    /**
     * Get save data for unified save system
     */
    getSaveData() {
        return {
            dataPackets: this.dataPackets,
            timestamp: Date.now()
        };
    }
    
    /**
     * Load from unified save system (called by CloudSaveSystem)
     */
    loadSavedData(upgradeData) {
        if (this.hasLoadedData) {
            console.log('⚠️ UpgradeSystem data already loaded, ignoring duplicate call');
            return;
        }
        
        try {
            if (upgradeData && upgradeData.dataPackets !== undefined) {
                this.dataPackets = upgradeData.dataPackets;
                console.log(`💾 Loaded data packets from unified save: ${this.dataPackets}`);
            }
        } catch (error) {
            console.warn('Failed to load upgrade data from unified save:', error);
        }
        
        this.hasLoadedData = true;
    }
}
