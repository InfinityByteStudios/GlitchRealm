// ByteSurge: Infinite Loop - Upgrade System
// Advanced upgrade menu with visual polish and smooth animations

// Helper function to check if upgrade menu is open
window.isUpgradeMenuOpen = function() {
    return window.upgradeSystem && window.upgradeSystem.isMenuOpen;
};

// ===== UPGRADE SYSTEM DATA =====
window.upgradeSystem = {
    isMenuOpen: false,
    selectedUpgrade: 0,
    maxUpgrades: 5,
    animationState: {
        menuScale: 0,
        backgroundAlpha: 0,
        targetScale: 1,
        targetAlpha: 0.8,
        animationSpeed: 0.15
    },
    
    // Upgrade definitions with costs and effects
    upgrades: [
        {
            id: 'droneSpeed',
            name: 'Drone Speed',
            description: 'Increases drone movement speed',
            maxLevel: 10,
            currentLevel: 0,
            baseCost: 25,
            costMultiplier: 1.5,
            effect: 'speed',
            icon: '⚡',
            color: '#00ffff'
        },
        {
            id: 'harvesterRate',
            name: 'Harvester Rate',
            description: 'Harvesters collect energy faster',
            maxLevel: 10,
            currentLevel: 0,
            baseCost: 30,
            costMultiplier: 1.6,
            effect: 'harvesterSpeed',
            icon: '🏭',
            color: '#00ff00'
        },
        {
            id: 'harvesterLimit',
            name: 'Harvester Limit',
            description: 'Deploy more harvesters at once',
            maxLevel: 5,
            currentLevel: 0,
            baseCost: 100,
            costMultiplier: 2.0,
            effect: 'maxHarvesters',
            icon: '📈',
            color: '#ffaa00'
        },
        {
            id: 'autoTurnAssist',
            name: 'Auto-Turn Assist',
            description: 'Smoother drone movement control',
            maxLevel: 3,
            currentLevel: 0,
            baseCost: 75,
            costMultiplier: 1.8,
            effect: 'turning',
            icon: '🎯',
            color: '#aa44ff'
        },
        {
            id: 'zoneDetection',
            name: 'Zone Detection',
            description: 'Mini-map shows upcoming hazards',
            maxLevel: 3,
            currentLevel: 0,
            baseCost: 150,
            costMultiplier: 2.2,
            effect: 'detection',
            icon: '📡',
            color: '#ff4444'
        }
    ],
    
    // Calculate upgrade cost
    getUpgradeCost(upgradeIndex) {
        const upgrade = this.upgrades[upgradeIndex];
        if (!upgrade || upgrade.currentLevel >= upgrade.maxLevel) return null;
        
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.currentLevel));
    },
    
    // Check if upgrade is affordable
    canAffordUpgrade(upgradeIndex) {
        const cost = this.getUpgradeCost(upgradeIndex);
        return cost !== null && window.gameState && window.gameState.energy >= cost;
    },
    
    // Purchase upgrade
    purchaseUpgrade(upgradeIndex) {
        if (!this.canAffordUpgrade(upgradeIndex)) return false;
        
        const upgrade = this.upgrades[upgradeIndex];
        const cost = this.getUpgradeCost(upgradeIndex);
        
        // Deduct energy
        if (window.gameState) {
            window.gameState.energy -= cost;
        }
        
        // Level up the upgrade
        upgrade.currentLevel++;
        
        // Apply upgrade effects immediately
        this.applyUpgradeEffect(upgrade);
        
        // Visual feedback
        if (window.createScreenFlash) {
            window.createScreenFlash(upgrade.color, 0.2, 150);
        }
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 200]);
        }
        
        // Save upgrades to localStorage
        this.saveUpgrades();
        
        return true;
    },      // Apply upgrade effects to game systems
    applyUpgradeEffect(upgrade) {
        switch (upgrade.effect) {
            case 'speed':
                if (window.drone) {
                    // Level 0-10: 15% speed increase per level (max 150% faster)
                    const speedMultiplier = 1 + Math.min(upgrade.currentLevel, upgrade.maxLevel) * 0.15;
                    window.drone.speed = window.drone.baseSpeed * speedMultiplier;
                }
                break;
                
            case 'harvesterSpeed':
                // Apply to all existing harvesters and set global multiplier
                const harvesterSpeedMultiplier = 1 + Math.min(upgrade.currentLevel, upgrade.maxLevel) * 0.2; // 20% faster per level
                const harvesterIntervalDivisor = 1 + Math.min(upgrade.currentLevel, upgrade.maxLevel) * 0.15; // 15% shorter interval per level
                
                if (window.harvesterSystem && window.harvesterSystem.harvesters) {
                    window.harvesterSystem.harvesters.forEach(harvester => {
                        harvester.energyGenerationRate = harvester.baseEnergyGenerationRate * harvesterSpeedMultiplier;
                        harvester.generationInterval = harvester.baseGenerationInterval / harvesterIntervalDivisor;
                    });
                }
                
                // Store global multipliers for new harvesters
                if (window.harvesterSystem) {
                    window.harvesterSystem.globalSpeedMultiplier = harvesterSpeedMultiplier;
                    window.harvesterSystem.globalIntervalDivisor = harvesterIntervalDivisor;
                }
                break;
                
            case 'maxHarvesters':
                if (window.gameState) {
                    // Level 0-5: +1 harvester per level (max 8 total)
                    window.gameState.maxHarvesters = 3 + Math.min(upgrade.currentLevel, upgrade.maxLevel);
                }
                break;
                
            case 'turning':
                if (window.drone) {
                    // Level 0-3: Better turn response and smoothness
                    const turnLevel = Math.min(upgrade.currentLevel, upgrade.maxLevel);
                    window.drone.turnSmoothness = 1 + turnLevel * 0.3;
                    window.drone.minTurnDelay = Math.max(30, 100 - turnLevel * 20); // Minimum 30ms delay
                }
                break;
                
            case 'detection':
                // Zone detection upgrade - shows corruption warnings and energy node hints
                const detectionLevel = Math.min(upgrade.currentLevel, upgrade.maxLevel);
                if (window.gameState) {
                    window.gameState.detectionLevel = detectionLevel;
                    window.gameState.hasDetection = detectionLevel > 0;
                    window.gameState.detectionRange = 100 + detectionLevel * 50; // Range in pixels
                }
                
                // Enable corruption warning system
                if (window.corruptionSystem && detectionLevel > 0) {
                    window.corruptionSystem.showWarnings = true;
                    window.corruptionSystem.warningRange = 100 + detectionLevel * 50;
                }
                break;
        }
    },
      // Apply all upgrades (called on game start)
    applyAllUpgrades() {
        this.upgrades.forEach(upgrade => {
            if (upgrade.currentLevel > 0) {
                // Apply each level of the upgrade
                for (let i = 0; i < upgrade.currentLevel; i++) {
                    this.applyUpgradeEffect(upgrade);
                }
            }
        });
    },
    
    // Save upgrades to localStorage
    saveUpgrades() {
        const upgradeData = {};
        this.upgrades.forEach(upgrade => {
            upgradeData[upgrade.id] = upgrade.currentLevel;
        });
        
        try {
            localStorage.setItem('bytesurge_upgrades', JSON.stringify(upgradeData));
        } catch (e) {
          
        }
    },
    
    // Load upgrades from localStorage
    loadUpgrades() {
        try {
            const upgradeData = localStorage.getItem('bytesurge_upgrades');
            if (upgradeData) {
                const parsed = JSON.parse(upgradeData);
                
                this.upgrades.forEach(upgrade => {
                    if (parsed[upgrade.id] !== undefined) {
                        upgrade.currentLevel = Math.min(parsed[upgrade.id], upgrade.maxLevel);
                    }
                });
                
                // Apply loaded upgrades
                this.applyAllUpgrades();
            }
        } catch (e) {

}
    }
};

// ===== UPGRADE MENU UI =====
window.upgradeMenuUI = {
    mousePos: { x: 0, y: 0 },
    hoveredUpgrade: -1,
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    upgradeBounds: [],
    initialized: false,
    
    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.calculateBounds();
        },

    // Open upgrade menu
    openMenu() {
        if (upgradeSystem.isMenuOpen) return;
        
        upgradeSystem.isMenuOpen = true;
        upgradeSystem.selectedUpgrade = 0;
        upgradeSystem.animationState.menuScale = 1; // Start fully visible for debugging
        upgradeSystem.animationState.backgroundAlpha = 1;
        this.hoveredUpgrade = -1;
        
        // Calculate panel and upgrade bounds
        this.calculateBounds();
    },      // Close upgrade menu
    closeMenu() {
        if (!upgradeSystem.isMenuOpen) return;
        
        upgradeSystem.isMenuOpen = false;
        this.hoveredUpgrade = -1;
        
        // Check if upgrade menu was opened from death screen
        if (this.deathScreenActive) {
            // Restore death screen visibility
            if (this.deathScreenOverlay) {
                this.deathScreenOverlay.style.display = 'flex';
            }
            
            // Restore game state to what it was before opening upgrade menu
            window.gameRunning = this.wasGameRunning || false;
            window.gamePaused = true; // Keep paused since we're on death screen
            
            // Clear death screen flags
            this.deathScreenActive = false;
            this.wasGameRunning = false;
            this.deathScreenOverlay = null;
        } else {
            // Normal close behavior - resume game if it was running
            if (window.togglePause && window.getGameRunning && window.getGamePaused()) {
                window.togglePause();
            }
        }
    },

    // Calculate bounds for mouse interaction
    calculateBounds() {
        const panelWidth = 600;
        const panelHeight = 500;
        const panelX = (window.GAME_WIDTH - panelWidth) / 2;
        const panelY = (window.GAME_HEIGHT - panelHeight) / 2;
        
        this.panelBounds = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };
        
        // Calculate upgrade item bounds
        this.upgradeBounds = [];
        const startY = panelY + 100;
        const itemHeight = 70;
        
        for (let i = 0; i < upgradeSystem.maxUpgrades; i++) {
            const y = startY + i * itemHeight;
            this.upgradeBounds.push({
                x: panelX + 10,
                y: y - 25,
                width: panelWidth - 20,
                height: itemHeight - 10,
                index: i
            });
        }
    },

    // Update mouse position and hover state
    updateMousePosition(x, y) {
        if (!upgradeSystem.isMenuOpen) return;
        
        this.mousePos = { x, y };
        this.hoveredUpgrade = -1;
        
        // Check for hover over upgrade items
        for (const bounds of this.upgradeBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                this.hoveredUpgrade = bounds.index;
                break;
            }
        }
    },
    
    // Update menu state and animations
    update(deltaTime) {
        if (!upgradeSystem.isMenuOpen) {
            // Update menu closing animation
            upgradeSystem.animationState.menuScale = Math.max(0, 
                upgradeSystem.animationState.menuScale - upgradeSystem.animationState.animationSpeed * (deltaTime / 16));
            upgradeSystem.animationState.backgroundAlpha = Math.max(0, 
                upgradeSystem.animationState.backgroundAlpha - upgradeSystem.animationState.animationSpeed * (deltaTime / 16));
            return;
        }

        // Update menu opening animation
        upgradeSystem.animationState.menuScale = Math.min(upgradeSystem.animationState.targetScale, 
            upgradeSystem.animationState.menuScale + upgradeSystem.animationState.animationSpeed * (deltaTime / 16));
        upgradeSystem.animationState.backgroundAlpha = Math.min(upgradeSystem.animationState.targetAlpha, 
            upgradeSystem.animationState.backgroundAlpha + upgradeSystem.animationState.animationSpeed * (deltaTime / 16));
        
        // Recalculate bounds for proper mouse interaction
        this.calculateBounds();
    },
    
    // Render upgrade menu
    renderMenu(ctx) {
        if (!upgradeSystem.isMenuOpen) return;
          // Draw semi-transparent background overlay
        ctx.fillStyle = `rgba(0, 0, 0, ${upgradeSystem.animationState.backgroundAlpha * 0.8})`;
        ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
        
        // Draw menu panel background
        const panelX = this.panelBounds.x;
        const panelY = this.panelBounds.y;
        const panelWidth = this.panelBounds.width;
        const panelHeight = this.panelBounds.height;
        
        // Panel background with gradient
        const gradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f0f1a');
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 2;
        
        // Draw rounded rectangle for panel
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 10);
        ctx.fill();
        ctx.stroke();
        
        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('UPGRADES', panelX + panelWidth/2, panelY + 50);
        
        // Draw available energy
        ctx.font = '20px Arial';
        ctx.fillStyle = '#00ffaa';
        ctx.fillText(`Available Energy: ${Math.floor(window.gameState.energy)}`, panelX + panelWidth/2, panelY + 80);
        
        // Draw upgrade items
        upgradeSystem.upgrades.forEach((upgrade, index) => {
            const bounds = this.upgradeBounds[index];
            const isHovered = this.hoveredUpgrade === index;
            const isSelected = upgradeSystem.selectedUpgrade === index;
            
            // Background for the upgrade item
            ctx.fillStyle = isHovered || isSelected ? '#2a2a4a' : '#1a1a3a';
            ctx.beginPath();
            ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 5);
            ctx.fill();
            
            // Highlight border if selected
            if (isSelected) {
                ctx.strokeStyle = upgrade.color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Icon
            ctx.font = '24px Arial';
            ctx.fillStyle = upgrade.color;
            ctx.textAlign = 'left';
            ctx.fillText(upgrade.icon, bounds.x + 20, bounds.y + 35);
            
            // Name and level
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(`${upgrade.name} - Level ${upgrade.currentLevel}/${upgrade.maxLevel}`, bounds.x + 60, bounds.y + 30);
            
            // Description
            ctx.font = '14px Arial';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(upgrade.description, bounds.x + 60, bounds.y + 50);
            
            // Cost or max level reached
            if (upgrade.currentLevel < upgrade.maxLevel) {
                const cost = upgradeSystem.getUpgradeCost(index);
                const canAfford = upgradeSystem.canAffordUpgrade(index);
                ctx.fillStyle = canAfford ? '#00ff00' : '#ff0000';
                ctx.textAlign = 'right';
                ctx.fillText(`Cost: ${cost} Energy`, bounds.x + bounds.width - 20, bounds.y + 35);
            } else {
                ctx.fillStyle = '#ffaa00';
                ctx.textAlign = 'right';
                ctx.fillText('MAX LEVEL', bounds.x + bounds.width - 20, bounds.y + 35);
            }
        });
        
        // Draw controls hint at the bottom
        ctx.fillStyle = '#888888';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('↑↓: Select  |  ENTER: Purchase  |  ESC/U: Close', panelX + panelWidth/2, panelY + panelHeight - 20);
    },
    
    // Mouse interaction handlers
    handleMouseClick(x, y) {
        if (!upgradeSystem.isMenuOpen) return false;
        
        // Check if click is inside upgrade items
        for (const bounds of this.upgradeBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                
                // Select and try to purchase the upgrade
                upgradeSystem.selectedUpgrade = bounds.index;
                if (upgradeSystem.canAffordUpgrade(bounds.index)) {
                    upgradeSystem.purchaseUpgrade(bounds.index);
                }
                return true;
            }
        }
        
        // Check if click is outside the panel (close menu)
        if (x < this.panelBounds.x || x > this.panelBounds.x + this.panelBounds.width ||
            y < this.panelBounds.y || y > this.panelBounds.y + this.panelBounds.height) {
            this.closeMenu();
            return true;
        }
        
        return false;
    },
    
    handleMouseMove(x, y) {
        if (!upgradeSystem.isMenuOpen) return;
        
        this.mousePos = { x, y };
        this.hoveredUpgrade = -1;
        
        // Check for hover over upgrade items
        for (const bounds of this.upgradeBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                this.hoveredUpgrade = bounds.index;
                upgradeSystem.selectedUpgrade = bounds.index; // Update selection on hover
                break;
            }
        }
    },
    
    //...existing code...
};

// ===== GLOBAL FUNCTIONS =====
function openUpgradeMenu() {
    upgradeMenuUI.openMenu();
}

function closeUpgradeMenu() {
    upgradeMenuUI.closeMenu();
}

function isUpgradeMenuOpen() {
    return upgradeSystem.isMenuOpen;
}

// Function to reinitialize upgrades when game objects are ready
function reinitializeUpgrades() {
    if (window.upgradeSystem) {
        window.upgradeSystem.applyAllUpgrades();
        
        // Ensure harvester system is updated
        if (window.harvesterSystem && window.harvesterSystem.harvesters) {
            window.harvesterSystem.applyUpgradesToAllHarvesters();
        }
    }
}

// Initialize upgrade system
upgradeSystem.loadUpgrades();

// Export for global access
window.upgradeSystem = upgradeSystem;
window.upgradeMenuUI = upgradeMenuUI;
window.openUpgradeMenu = openUpgradeMenu;
window.closeUpgradeMenu = closeUpgradeMenu;
window.isUpgradeMenuOpen = isUpgradeMenuOpen;
window.reinitializeUpgrades = reinitializeUpgrades;
