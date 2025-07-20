// Modern HTML/CSS UI System for NeuroCore: Byte Wars
class ModernUI {    constructor() {
        // Get all UI elements
        this.elements = {
            // Health system
            healthFill: document.getElementById('healthFill'),
            healthText: document.getElementById('healthText'),
            healthWarning: document.getElementById('healthWarning'),
            shieldIndicator: document.getElementById('shieldIndicator'),            // Overclock system - RESTORED
            overclockPanel: document.getElementById('overclockPanel'),
            overclockFill: document.getElementById('overclockFill'),
            overclockText: document.getElementById('overclockText'),
            overclockReady: document.getElementById('overclockReady'),
            overclockEffects: document.getElementById('overclockEffects'),
            
            // Dash system
            dashFill: document.getElementById('dashFill'),
            dashText: document.getElementById('dashText'),
            
            // Safe zone system
            safezonePanel: document.getElementById('safezonePanel'),
            safezoneLabel: document.getElementById('safezoneLabel'),
            safezoneBar: document.getElementById('safezoneBar'),
            safezoneFill: document.getElementById('safezoneFill'),
            safezoneText: document.getElementById('safezoneText'),
            safezoneStatus: document.getElementById('safezoneStatus'),
              // Stats
            scoreDisplay: document.getElementById('scoreDisplay'),
            killsDisplay: document.getElementById('killsDisplay'),
            survivalTimeDisplay: document.getElementById('survivalTimeDisplay'),
            // Wave system
            waveTitle: document.getElementById('waveTitle'),
            waveStatus: document.getElementById('waveStatus'),
            waveProgressFill: document.getElementById('waveProgressFill'),
            waveProgressText: document.getElementById('waveProgressText'),
            waveTimer: document.getElementById('waveTimer'),
            
            // Upgrades system
            upgradesList: document.getElementById('upgradesList'),
            upgradesEmpty: document.getElementById('upgradesEmpty'),
            
            // Mini map
            minimapCanvas: document.getElementById('minimapCanvas'),
              // Game over
            gameOverScreen: document.getElementById('gameOverScreen'),
            finalScore: document.getElementById('finalScore'),
            finalKills: document.getElementById('finalKills'),
            
            // Settings
            settingsButton: document.getElementById('settingsButton'),
            settingsOverlay: document.getElementById('settingsOverlay'),
            settingsClose: document.getElementById('settingsClose'),
            minimapToggle: document.getElementById('minimapToggle'),
            difficultySelect: document.getElementById('difficultySelect'),
              // Pause overlay
            pauseOverlay: document.getElementById('pauseOverlay'),
            
            // Upgrade system
            upgradeOverlay: document.getElementById('upgradeOverlay'),
            upgradeChoices: document.getElementById('upgradeChoices')        };
          // UI state
        this.changelogVisible = false;
        this.settingsVisible = false;
        this.upgradeVisible = false;
        this.helpVisible = false;
        
        // Get changelog element
        this.changelogOverlay = document.getElementById('changelogOverlay');
        
        // Get help element
        this.helpOverlay = document.getElementById('helpOverlay');
        
        // Setup settings event listeners
        this.setupSettingsListeners();
        
        // Initialize minimap context
        this.minimapCtx = this.elements.minimapCanvas.getContext('2d');
        
        // Animation state
        this.scoreFlashTimer = 0;
        this.killFlashTimer = 0;
    }    update(deltaTime, gameData) {
        this.updateFlashTimers(deltaTime);
        this.updateHealth(gameData.player);
        this.updateOverclock(gameData.player);
        this.updateDash(gameData.player);        this.updateSafeZone(gameData.arena);
        this.updateStats(gameData.score, gameData.kills, gameData.survivalTime);        
        this.updateWave(gameData.enemyManager);
        this.updateUpgrades(gameData.upgradeSystem);
        this.updateMiniMap(gameData);
        
        // Sync settings with game state
        this.updateSettingsState(gameData);
          // Update pause overlay
        if (gameData.paused && !this.changelogVisible && !this.settingsVisible && !this.helpVisible) {
            this.showPauseOverlay();
        } else {
            this.hidePauseOverlay();
        }
        
        // Update game over screen
        if (gameData.gameOver) {
            this.showGameOver(gameData.score, gameData.kills);
        } else {
            this.hideGameOver();
        }
    }
    
    updateFlashTimers(deltaTime) {
        if (this.scoreFlashTimer > 0) {
            this.scoreFlashTimer -= deltaTime;
            if (this.scoreFlashTimer <= 0) {
                this.elements.scoreDisplay.classList.remove('flash');
            }
        }
        
        if (this.killFlashTimer > 0) {
            this.killFlashTimer -= deltaTime;
            if (this.killFlashTimer <= 0) {
                this.elements.killsDisplay.classList.remove('flash');
            }
        }
    }
      updateHealth(player) {
        const healthPercent = player.health / player.maxHealth;
        
        // Update health bar fill
        this.elements.healthFill.style.width = `${healthPercent * 100}%`;
        this.elements.healthText.textContent = `${Math.round(player.health)}/${Math.round(player.maxHealth)}`;
        
        // Update health bar color based on health level
        this.elements.healthFill.className = 'health-fill';
        if (healthPercent <= 0.25) {
            this.elements.healthFill.classList.add('critical');
            this.elements.healthWarning.style.display = 'block';
        } else {
            this.elements.healthWarning.style.display = 'none';
            if (healthPercent <= 0.5) {
                this.elements.healthFill.classList.add('low');
            }
        }
        
        // Update shield indicator
        if (player.invulnerable) {
            this.elements.shieldIndicator.style.display = 'block';
        } else {
            this.elements.shieldIndicator.style.display = 'none';
        }
    }    updateOverclock(player) {
        if (!this.elements.overclockPanel || !this.elements.overclockFill || 
            !this.elements.overclockText || !this.elements.overclockReady || 
            !this.elements.overclockEffects) {
            return; // Elements don't exist
        }

        const panel = this.elements.overclockPanel;
        const fill = this.elements.overclockFill;
        const text = this.elements.overclockText;
        const ready = this.elements.overclockReady;
        const effects = this.elements.overclockEffects;

        // Calculate charge percentage
        const chargePercent = (player.overclockCharge / player.overclockMaxCharge) * 100;
        
        // Update charge bar
        fill.style.width = `${chargePercent}%`;
        text.textContent = `CHARGE: ${Math.floor(player.overclockCharge)}/${player.overclockMaxCharge}`;

        // Handle overclock states
        if (player.isOverclocked) {
            // Active state
            panel.style.animation = 'overclockActive 0.5s ease-in-out infinite alternate';
            fill.className = 'overclock-fill';
            fill.style.width = '100%';
            text.textContent = `ACTIVE: ${player.overclockTimer.toFixed(1)}s`;
            ready.style.display = 'none';
            effects.style.display = 'block';
            effects.style.animation = 'overclockActive 0.3s ease-in-out infinite alternate';
        } else if (player.canActivateOverclock()) {
            // Ready state
            panel.style.animation = '';
            fill.className = 'overclock-fill ready';
            ready.style.display = 'block';
            ready.style.animation = 'overclockReadyPulse 1.5s ease-in-out infinite';
            effects.style.display = 'none';
        } else {
            // Charging state
            panel.style.animation = '';
            fill.className = 'overclock-fill';
            ready.style.display = 'none';
            effects.style.display = 'none';
        }
    }
      updateDash(player) {
        const fill = this.elements.dashFill;
        const text = this.elements.dashText;
        
        if (player.isDashing) {
            fill.className = 'dash-fill active';
            text.textContent = 'DASH ACTIVE';
        } else if (player.dashCooldownTimer > 0) {
            const cooldownPercent = 1 - (player.dashCooldownTimer / player.dashCooldown);
            fill.style.width = `${cooldownPercent * 100}%`;
            fill.className = 'dash-fill cooldown';
            text.textContent = `DASH: ${player.dashCooldownTimer.toFixed(1)}s`;
        } else {
            fill.className = 'dash-fill ready';
            text.textContent = 'DASH READY';
        }
    }
    
    updateSafeZone(arena) {
        if (!arena) return;
        
        const status = arena.getSafeZoneStatus();
        const panel = this.elements.safezonePanel;
        const label = this.elements.safezoneLabel;
        const bar = this.elements.safezoneBar;
        const fill = this.elements.safezoneFill;
        const text = this.elements.safezoneText;
        const statusDiv = this.elements.safezoneStatus;
        
        // Reset all classes
        panel.className = 'safezone-panel';
        label.className = 'safezone-label';
        bar.className = 'safezone-bar';
        fill.className = 'safezone-fill';
        
        if (!status.available) {
            // Cooldown state
            panel.classList.add('cooldown');
            label.classList.add('cooldown');
            bar.classList.add('cooldown');
            fill.classList.add('cooldown');
            
            const cooldownPercent = 1 - (status.cooldownRemaining / 60); // 60 is cooldown duration
            fill.style.width = `${cooldownPercent * 100}%`;
            
            label.textContent = '◤ SAFE ZONE COOLDOWN ◥';
            text.textContent = `${Math.ceil(status.cooldownRemaining)}s`;
            statusDiv.textContent = 'Zone unavailable';
            statusDiv.className = 'safezone-status cooldown';
            
        } else if (status.inSafeZone && status.active) {
            // Active protection with warning if time is low
            if (status.timeRemaining < 3) {
                panel.classList.add('warning');
                label.classList.add('warning');
                bar.classList.add('warning');
                fill.classList.add('warning');
            }
            
            const timePercent = status.timeRemaining / status.maxTime;
            fill.style.width = `${timePercent * 100}%`;
            
            label.textContent = '◤ SAFE ZONE ACTIVE ◥';
            text.textContent = `${Math.ceil(status.timeRemaining)}s`;
            statusDiv.textContent = status.timeRemaining < 3 ? 'Warning: Time running out!' : 'Protected from enemies';
            statusDiv.className = status.timeRemaining < 3 ? 'safezone-status warning' : 'safezone-status';
            
        } else {
            // Available state
            const timePercent = status.timeRemaining / status.maxTime;
            fill.style.width = `${timePercent * 100}%`;
            
            label.textContent = '◤ SAFE ZONE ◥';
            text.textContent = 'AVAILABLE';
            
            if (status.inSafeZone) {
                statusDiv.textContent = 'Enter zone for protection';
            } else {
                statusDiv.textContent = `${Math.ceil(status.timeRemaining)}s protection`;
            }
            statusDiv.className = 'safezone-status';
        }
    }      updateStats(score, kills, survivalTime = 0) {
        this.elements.scoreDisplay.textContent = `SCORE: ${score}`;
        this.elements.killsDisplay.textContent = `KILLS: ${kills}`;
        
        // Format survival time as MM:SS
        // Ensure we have a valid number
        const validTime = Number.isFinite(survivalTime) ? survivalTime : 0;
        const minutes = Math.floor(validTime / 60);
        const seconds = Math.floor(validTime % 60);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.elements.survivalTimeDisplay.textContent = `TIME: ${timeString}`;
    }
      updateMiniMap(gameData) {
        const ctx = this.minimapCtx;
        const canvas = this.elements.minimapCanvas;
        const size = 136;
        
        // Clear minimap
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, size, size);
        
        if (!gameData.arena) return;
        
        // Calculate scale
        const scaleX = size / gameData.arena.width;
        const scaleY = size / gameData.arena.height;
        
        // Draw arena border
        ctx.strokeStyle = '#004466';
        ctx.lineWidth = 1;
        ctx.strokeRect(2, 2, size - 4, size - 4);
        
        // Draw player position
        const playerX = gameData.player.x * scaleX;
        const playerY = gameData.player.y * scaleY;
        
        ctx.fillStyle = gameData.player.isOverclocked ? '#ff00ff' : '#00ffff';
        ctx.beginPath();
        ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw enemies if available
        if (gameData.enemies) {
            ctx.fillStyle = '#ff4444';
            for (const enemy of gameData.enemies) {
                if (enemy.active) {
                    const enemyX = enemy.x * scaleX;
                    const enemyY = enemy.y * scaleY;
                    
                    ctx.beginPath();
                    ctx.arc(enemyX, enemyY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
    
    showGameOver(score, kills) {
        this.elements.finalScore.textContent = `Final Score: ${score}`;
        this.elements.finalKills.textContent = `Enemies Eliminated: ${kills}`;
        this.elements.gameOverScreen.style.display = 'flex';
    }
    
    hideGameOver() {
        this.elements.gameOverScreen.style.display = 'none';
    }
      // Changelog functionality
    toggleChangelog() {
        this.changelogVisible = !this.changelogVisible;
        if (this.changelogVisible) {
            this.changelogOverlay.classList.remove('hidden');
        } else {
            this.changelogOverlay.classList.add('hidden');
        }
    }
      hideChangelog() {
        this.changelogVisible = false;
        this.changelogOverlay.classList.add('hidden');
    }
    
    // Help system functionality
    toggleHelp() {
        this.helpVisible = !this.helpVisible;
        if (this.helpVisible) {
            this.helpOverlay.classList.remove('hidden');
        } else {
            this.helpOverlay.classList.add('hidden');
        }
    }
    
    showHelp() {
        this.helpVisible = true;
        this.helpOverlay.classList.remove('hidden');
    }
    
    hideHelp() {
        this.helpVisible = false;
        this.helpOverlay.classList.add('hidden');
    }
    
    // Pause overlay functionality
    showPauseOverlay() {
        this.elements.pauseOverlay.classList.remove('hidden');
    }
    
    hidePauseOverlay() {
        this.elements.pauseOverlay.classList.add('hidden');
    }
    
    flashScore() {
        this.scoreFlashTimer = 0.5;
        this.elements.scoreDisplay.classList.add('flash');
    }
    
    flashKill() {
        this.killFlashTimer = 0.5;        this.elements.killsDisplay.classList.add('flash');
    }
    
    updateWave(enemyManager) {
        if (!enemyManager) return;
        
        const waveNumber = enemyManager.getCurrentWave();
        const waveState = enemyManager.getWaveState();
        const waveProgress = enemyManager.getWaveProgress();
        const timeUntilNext = enemyManager.getTimeUntilNextWave();
        const remainingEnemies = enemyManager.getRemainingEnemiesInWave();
        
        // Update wave title
        this.elements.waveTitle.textContent = `◤ WAVE ${waveNumber} ◥`;
        
        // Update wave status with styling
        const statusElement = this.elements.waveStatus;
        statusElement.className = `wave-status ${waveState}`;
        
        switch (waveState) {
            case 'preparing':
                statusElement.textContent = 'PREPARING...';
                break;
            case 'spawning':
                statusElement.textContent = 'ENEMIES INCOMING!';
                break;
            case 'active':
                statusElement.textContent = 'CLEAR ALL ENEMIES!';
                break;
            case 'completed':
                statusElement.textContent = 'WAVE CLEARED!';
                break;
        }
        
        // Update progress bar
        const progressPercent = Math.round(waveProgress * 100);
        this.elements.waveProgressFill.style.width = `${progressPercent}%`;
        
        // Update progress text based on state
        if (waveState === 'spawning') {
            const totalEnemies = enemyManager.waveConfig ? enemyManager.waveConfig.enemies.length + enemyManager.enemiesSpawnedThisWave : 0;
            const spawnedEnemies = enemyManager.enemiesSpawnedThisWave;
            this.elements.waveProgressText.textContent = `${spawnedEnemies}/${totalEnemies}`;
        } else if (waveState === 'active') {
            const totalEnemies = enemyManager.waveConfig ? enemyManager.waveConfig.enemies.length + enemyManager.enemiesSpawnedThisWave : 0;
            const defeatedEnemies = Math.round(totalEnemies * waveProgress);
            this.elements.waveProgressText.textContent = `${defeatedEnemies}/${totalEnemies}`;
        } else {
            this.elements.waveProgressText.textContent = `${progressPercent}%`;
        }
        
        // Update timer
        if (timeUntilNext > 0) {
            if (waveState === 'preparing') {
                this.elements.waveTimer.textContent = `Starting in: ${Math.ceil(timeUntilNext)}s`;
            } else if (waveState === 'completed') {
                this.elements.waveTimer.textContent = `Next wave in: ${Math.ceil(timeUntilNext)}s`;
            }
        } else if (waveState === 'active' && remainingEnemies > 0) {
            this.elements.waveTimer.textContent = `Enemies remaining: ${remainingEnemies}`;
        } else {
            this.elements.waveTimer.textContent = '';
        }
    }
    
    updateUpgrades(upgradeSystem) {
        if (!upgradeSystem) return;
        
        const activeUpgrades = upgradeSystem.getActiveUpgradesList();
        const upgradesList = this.elements.upgradesList;
        const upgradesEmpty = this.elements.upgradesEmpty;
        
        // Clear existing upgrades display
        upgradesList.innerHTML = '';
        
        if (activeUpgrades.length === 0) {
            // Show empty state
            upgradesEmpty.style.display = 'block';
            upgradesList.style.display = 'none';
        } else {
            // Hide empty state and show upgrades
            upgradesEmpty.style.display = 'none';
            upgradesList.style.display = 'block';
            
            // Add each active upgrade to the display
            activeUpgrades.forEach(upgrade => {
                const upgradeElement = document.createElement('div');
                upgradeElement.className = 'upgrade-item';
                
                // Create upgrade content with icon, name, and level
                upgradeElement.innerHTML = `
                    <span class="upgrade-icon">${upgrade.icon}</span>
                    <span class="upgrade-name">${upgrade.name}</span>
                    <span class="upgrade-level">Lv.${upgrade.level}</span>
                `;
                
                upgradesList.appendChild(upgradeElement);
            });
        }
    }
    
    // Legacy compatibility methods for canvas-based rendering
    render(ctx, gameData) {        // This method is called by the game but we handle everything in update()
        // Keep it for compatibility but move logic to update()
        this.update(1/60, gameData); // Assume 60fps for compatibility
      }
    
    setupSettingsListeners() {
        // Settings button click
        this.elements.settingsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSettings();
        });
        
        // Settings close button
        this.elements.settingsClose.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideSettings();
        });
        
        // Click outside to close
        this.elements.settingsOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsOverlay) {
                this.hideSettings();
            }        });
        
        // Settings controls
        this.elements.minimapToggle.addEventListener('change', (e) => {
            // Toggle minimap visibility
            const minimap = document.querySelector('.minimap-container');
            if (minimap) {
                minimap.style.display = e.target.checked ? 'block' : 'none';
            }
        });
        
        this.elements.difficultySelect.addEventListener('change', (e) => {
            console.log('Difficulty changed to:', e.target.value);
            // This could be used to adjust enemy spawn rates, damage, etc.
        });
    }

    // Settings functionality
    toggleSettings() {
        this.settingsVisible = !this.settingsVisible;
        if (this.settingsVisible) {
            this.showSettings();
        } else {
            this.hideSettings();
        }
    }
    
    showSettings() {
        this.settingsVisible = true;
        this.elements.settingsOverlay.classList.remove('hidden');
    }
    
    hideSettings() {
        this.settingsVisible = false;
        this.elements.settingsOverlay.classList.add('hidden');
    }    updateSettingsState(gameData) {
        // Settings state synchronization (debug functionality removed)
    }
    
    // Upgrade system functionality
    showUpgradeMenu(upgradeChoices) {
        this.upgradeVisible = true;
        this.populateUpgradeChoices(upgradeChoices);
        this.elements.upgradeOverlay.classList.remove('hidden');
    }
    
    hideUpgradeMenu() {
        this.upgradeVisible = false;
        this.elements.upgradeOverlay.classList.add('hidden');
    }
    
    populateUpgradeChoices(choices) {
        const container = this.elements.upgradeChoices;
        container.innerHTML = '';
        
        choices.forEach((upgrade, index) => {
            const choiceElement = document.createElement('div');
            choiceElement.className = 'upgrade-choice';
            choiceElement.dataset.upgradeId = upgrade.id;
            
            const nextLevel = upgrade.currentLevel + 1;
            const levelText = nextLevel > 1 ? `Level ${nextLevel}` : 'New';
            
            choiceElement.innerHTML = `
                <div class="upgrade-icon">${upgrade.icon}</div>
                <div class="upgrade-name">${upgrade.name}</div>
                <div class="upgrade-description">${upgrade.description}</div>
                <div class="upgrade-level">${levelText}</div>
            `;
            
            // Add click event listener
            choiceElement.addEventListener('click', () => {
                this.selectUpgrade(upgrade.id);
            });
            
            container.appendChild(choiceElement);
        });
    }
    
    selectUpgrade(upgradeId) {
        // Dispatch custom event for game to handle
        const event = new CustomEvent('upgradeSelected', {
            detail: { upgradeId: upgradeId }
        });
        document.dispatchEvent(event);
          this.hideUpgradeMenu();
    }
}
