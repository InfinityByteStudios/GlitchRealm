// ByteSurge: Infinite Loop - Settings System
// Comprehensive settings management with localStorage persistence

// ===== SETTINGS DATA =====
let gameSettings = {
    // Display Settings
    skipOpeningAnimation: false,
    fullscreenOnStart: false,
    showFPS: false,
    showDebugInfo: false,
    
    // Audio Settings (for future implementation)
    masterVolume: 1.0,
    musicVolume: 0.8,
    sfxVolume: 1.0,
    muteAll: false,
    
    // Gameplay Settings
    autoTurnAssist: false,
    vibrationEnabled: true,
    screenFlashEnabled: true,
    
    // Control Settings
    invertMouseY: false,
    mouseSensitivity: 1.0,
    keyRepeatDelay: 100,
    
    // Performance Settings
    targetFPS: 60,
    vSync: true,
    reducedParticles: false,
    
    // Accessibility Settings
    highContrast: false,
    largeText: false,
    colorBlindMode: 'none', // 'none', 'protanopia', 'deuteranopia', 'tritanopia'
    
    // System Settings
    dataCollection: true,
    autoSave: true,
    confirmReset: true
};

// ===== SETTINGS SYSTEM =====
let settingsSystem = {
    isMenuOpen: false,
    
    categories: [
        {
            name: 'Display',
            icon: '🖥️',
            settings: [
                { key: 'skipOpeningAnimation', name: 'Skip Opening Animation', type: 'boolean', description: 'Skip the studio/game intro animation' },
                { key: 'fullscreenOnStart', name: 'Fullscreen on Start', type: 'boolean', description: 'Start game in fullscreen mode' },
                { key: 'showFPS', name: 'Show FPS Counter', type: 'boolean', description: 'Display frame rate in corner' },
                { key: 'showDebugInfo', name: 'Show Debug Info', type: 'boolean', description: 'Display technical information' }
            ]
        },
        {
            name: 'Audio',
            icon: '🔊',
            settings: [
                { key: 'masterVolume', name: 'Master Volume', type: 'slider', min: 0, max: 1, step: 0.1, description: 'Overall audio volume' },
                { key: 'musicVolume', name: 'Music Volume', type: 'slider', min: 0, max: 1, step: 0.1, description: 'Background music volume' },
                { key: 'sfxVolume', name: 'SFX Volume', type: 'slider', min: 0, max: 1, step: 0.1, description: 'Sound effects volume' },
                { key: 'muteAll', name: 'Mute All Audio', type: 'boolean', description: 'Disable all audio' }
            ]
        },
        {
            name: 'Gameplay',
            icon: '🎮',
            settings: [
                { key: 'autoTurnAssist', name: 'Auto-Turn Assist', type: 'boolean', description: 'Smoother drone turning' },
                { key: 'vibrationEnabled', name: 'Vibration Feedback', type: 'boolean', description: 'Controller/phone vibration' },
                { key: 'screenFlashEnabled', name: 'Screen Flash Effects', type: 'boolean', description: 'Visual feedback flashes' }
            ]
        },
        {
            name: 'Controls',
            icon: '⌨️',
            settings: [
                { key: 'invertMouseY', name: 'Invert Mouse Y', type: 'boolean', description: 'Reverse vertical mouse movement' },
                { key: 'mouseSensitivity', name: 'Mouse Sensitivity', type: 'slider', min: 0.1, max: 3.0, step: 0.1, description: 'Mouse movement sensitivity' },
                { key: 'keyRepeatDelay', name: 'Key Repeat Delay', type: 'slider', min: 50, max: 500, step: 50, description: 'Delay before key repeats (ms)' }
            ]
        },
        {
            name: 'Performance',
            icon: '⚡',
            settings: [
                { key: 'targetFPS', name: 'Target FPS', type: 'select', options: [30, 60, 120, 144], description: 'Preferred frame rate' },
                { key: 'vSync', name: 'V-Sync', type: 'boolean', description: 'Synchronize with display refresh' },
                { key: 'reducedParticles', name: 'Reduced Particles', type: 'boolean', description: 'Lower particle count for performance' }
            ]
        },
        {
            name: 'Accessibility',
            icon: '♿',
            settings: [
                { key: 'highContrast', name: 'High Contrast', type: 'boolean', description: 'Increase color contrast' },
                { key: 'largeText', name: 'Large Text', type: 'boolean', description: 'Increase text size' },
                { key: 'colorBlindMode', name: 'Color Blind Mode', type: 'select', options: ['none', 'protanopia', 'deuteranopia', 'tritanopia'], description: 'Adjust colors for color blindness' }
            ]
        }
    ],
    
    // Get setting value
    getSetting(key) {
        return gameSettings[key];
    },
    
    // Set setting value and apply immediately
    setSetting(key, value) {
        gameSettings[key] = value;
        this.applySetting(key, value);
        this.saveSettings();
    },
    
    // Apply a setting immediately
    applySetting(key, value) {
        switch (key) {
            case 'skipOpeningAnimation':
                // This will be checked during game initialization
                break;
                
            case 'fullscreenOnStart':
                if (value && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                }
                break;
                
            case 'showFPS':
                // Will be checked during debug rendering
                break;
                
            case 'showDebugInfo':
                window.DEBUG_MODE = value;
                break;
                
            case 'vibrationEnabled':
                // Will be checked before vibration calls
                break;
                
            case 'screenFlashEnabled':
                // Will be checked before screen flash calls
                break;
                
            case 'highContrast':
                if (value) {
                    document.body.classList.add('high-contrast');
                } else {
                    document.body.classList.remove('high-contrast');
                }
                break;
                
            case 'largeText':
                if (value) {
                    document.body.classList.add('large-text');
                } else {
                    document.body.classList.remove('large-text');
                }
                break;
        }
    },
    
    // Apply all settings
    applyAllSettings() {
        Object.keys(gameSettings).forEach(key => {
            this.applySetting(key, gameSettings[key]);
        });
    },
    
    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('bytesurge_settings', JSON.stringify(gameSettings));
            console.log('⚙️ Settings saved');
        } catch (e) {
            console.error('❌ Failed to save settings:', e);
        }
    },
    
    // Load settings from localStorage
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('bytesurge_settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                
                // Merge saved settings with defaults
                Object.keys(parsed).forEach(key => {
                    if (gameSettings.hasOwnProperty(key)) {
                        gameSettings[key] = parsed[key];
                    }
                });
                
                console.log('⚙️ Settings loaded');
                this.applyAllSettings();
            }
        } catch (e) {
            console.error('❌ Failed to load settings:', e);
        }
    },
    
    // Reset settings to defaults
    resetSettings() {
        const defaultSettings = {
            skipOpeningAnimation: false,
            fullscreenOnStart: false,
            showFPS: false,
            showDebugInfo: false,
            masterVolume: 1.0,
            musicVolume: 0.8,
            sfxVolume: 1.0,
            muteAll: false,
            autoTurnAssist: false,
            vibrationEnabled: true,
            screenFlashEnabled: true,
            invertMouseY: false,
            mouseSensitivity: 1.0,
            keyRepeatDelay: 100,
            targetFPS: 60,
            vSync: true,
            reducedParticles: false,
            highContrast: false,
            largeText: false,
            colorBlindMode: 'none',
            dataCollection: true,
            autoSave: true,
            confirmReset: true
        };
        
        Object.assign(gameSettings, defaultSettings);
        this.applyAllSettings();
        this.saveSettings();
    }
};

// ===== SETTINGS MENU UI =====
let settingsMenuUI = {
    mousePos: { x: 0, y: 0 },
    hoveredCategory: -1,
    hoveredSetting: -1,    selectedCategory: 0, // Only for determining which settings to show
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    categoryBounds: [],
    settingBounds: [],
    
    // Open settings menu
    openMenu() {
        if (settingsSystem.isMenuOpen) return;
        
        settingsSystem.isMenuOpen = true;
        this.selectedCategory = 0;
        this.hoveredCategory = -1;
        this.hoveredSetting = -1;
        
        this.calculateBounds();
    },
      // Close settings menu
    closeMenu() {
        if (!settingsSystem.isMenuOpen) return;
        
        settingsSystem.isMenuOpen = false;
        this.hoveredCategory = -1;
        this.hoveredSetting = -1;
    },
      // Calculate bounds for mouse interaction
    calculateBounds() {
        const panelWidth = 800;
        const panelHeight = 600;
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        const panelX = (gameWidth - panelWidth) / 2;
        const panelY = (gameHeight - panelHeight) / 2;
        
        this.panelBounds = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };
        
        console.log('⚙️ Calculating bounds with game dimensions:', gameWidth, 'x', gameHeight, 'Panel:', this.panelBounds);
        
        // Calculate category bounds (left side)
        this.categoryBounds = [];
        const categoryStartY = panelY + 80;
        const categoryHeight = 40;
        
        settingsSystem.categories.forEach((category, index) => {
            this.categoryBounds.push({
                x: panelX + 20,
                y: categoryStartY + index * categoryHeight,
                width: 200,
                height: categoryHeight - 5,
                index: index
            });
        });
          // Calculate setting bounds (right side)
        this.settingBounds = [];
        const settingStartY = panelY + 80;
        const settingHeight = 35;
        
        if (settingsSystem.categories[this.selectedCategory]) {
            settingsSystem.categories[this.selectedCategory].settings.forEach((setting, index) => {
                this.settingBounds.push({
                    x: panelX + 240,
                    y: settingStartY + index * settingHeight,
                    width: panelWidth - 260,
                    height: settingHeight - 5,
                    index: index
                });
            });
        }
    },
      // Update mouse position and hover state
    updateMousePosition(x, y) {
        if (!settingsSystem.isMenuOpen) return;
        
        this.mousePos = { x, y };
        this.hoveredCategory = -1;
        this.hoveredSetting = -1;
        
        // Check category hover
        for (let bounds of this.categoryBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                this.hoveredCategory = bounds.index;
                break;
            }
        }
        
        // Check setting hover
        for (let bounds of this.settingBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                this.hoveredSetting = bounds.index;
                break;
            }
        }
    },
      // Handle mouse click
    handleMouseClick(x, y, button) {
        if (!settingsSystem.isMenuOpen || button !== 0) return false;
        
        console.log('⚙️ Settings menu click at:', x, y, 'Panel bounds:', this.panelBounds);
        
        // Check if click is outside panel
        if (x < this.panelBounds.x || x > this.panelBounds.x + this.panelBounds.width ||
            y < this.panelBounds.y || y > this.panelBounds.y + this.panelBounds.height) {
            console.log('⚙️ Click outside panel, closing menu');
            this.closeMenu();
            return true;
        }
          // Check category clicks
        for (let bounds of this.categoryBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                console.log('⚙️ Category clicked:', bounds.index);
                settingsSystem.selectedCategory = bounds.index;
                this.calculateBounds(); // Recalculate setting bounds
                return true;
            }
        }
        
        // Check setting clicks
        for (let bounds of this.settingBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                console.log('⚙️ Setting clicked:', bounds.index);
                this.toggleSetting(bounds.index);
                return true;
            }
        }
        
        console.log('⚙️ Click inside panel but no hit');
        return false;
    },
      // Toggle or modify a setting
    toggleSetting(settingIndex) {
        const category = settingsSystem.categories[settingsSystem.selectedCategory];
        if (!category || !category.settings[settingIndex]) return;
        
        const setting = category.settings[settingIndex];
        const currentValue = settingsSystem.getSetting(setting.key);
        
        console.log('⚙️ Toggling setting:', setting.name, 'from', currentValue);
        
        switch (setting.type) {
            case 'boolean':
                settingsSystem.setSetting(setting.key, !currentValue);
                break;
                
            case 'select':
                const options = setting.options;
                const currentIndex = options.indexOf(currentValue);
                const nextIndex = (currentIndex + 1) % options.length;
                settingsSystem.setSetting(setting.key, options[nextIndex]);
                break;
                
            case 'slider':
                // For now, just increment by step (could add drag support later)
                let newValue = currentValue + setting.step;
                if (newValue > setting.max) {
                    newValue = setting.min; // Wrap around
                }
                settingsSystem.setSetting(setting.key, newValue);
                break;
        }
        
        console.log('⚙️ Setting changed to:', settingsSystem.getSetting(setting.key));
        
        // Visual feedback
        if (window.createScreenFlash && settingsSystem.getSetting('screenFlashEnabled')) {
            window.createScreenFlash('#00ffff', 0.1, 100);
        }
    },
      // Handle keyboard input (only ESC for closing)
    handleInput(keyCode) {
        if (!settingsSystem.isMenuOpen) return false;
        
        switch (keyCode) {
            case 'Escape':
                this.closeMenu();
                return true;
        }
        
        return false;
    },
      // Update animations
    update(deltaTime) {
        if (!settingsSystem.isMenuOpen) return;
        
        // Recalculate bounds if needed
        if (this.panelBounds.width === 0) {
            this.calculateBounds();
        }
    },
    
    // Render settings menu
    render(ctx) {
        if (!settingsSystem.isMenuOpen) return;
        
        ctx.save();
        
        // Use fallback dimensions if game dimensions not available
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        
        // Background overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        
        // Main panel
        const panelWidth = 800;
        const panelHeight = 600;
        const panelX = (gameWidth - panelWidth) / 2;
        const panelY = (gameHeight - panelHeight) / 2;
        
        // Panel background
        ctx.fillStyle = 'rgba(10, 20, 30, 0.95)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel border
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Title
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SETTINGS', panelX + panelWidth / 2, panelY + 40);
          // Render categories (left side)
        ctx.textAlign = 'left';
        settingsSystem.categories.forEach((category, index) => {
            const y = panelY + 80 + index * 40;
            const isSelected = index === settingsSystem.selectedCategory;
            const isHovered = index === this.hoveredCategory;
            
            // Calculate text dimensions for centered glow
            const font = isSelected ? 'bold 16px monospace' : '14px monospace';
            ctx.font = font;
            const text = `${category.icon} ${category.name}`;
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            
            // Centered highlight with glow
            if (isSelected || isHovered) {
                const glowAlpha = isSelected ? 0.3 : 0.15;
                const glowSize = isHovered ? 8 : 4;
                
                // Outer glow
                if (isHovered) {
                    ctx.shadowColor = '#00ffff';
                    ctx.shadowBlur = glowSize;
                    ctx.fillStyle = `rgba(0, 255, 255, ${glowAlpha})`;
                    ctx.fillRect(panelX + 25, y + 2, textWidth + 10, 26);
                    ctx.shadowBlur = 0;
                }
                
                // Main highlight
                ctx.fillStyle = isSelected ? 'rgba(0, 255, 255, 0.2)' : 'rgba(0, 255, 255, 0.1)';
                ctx.fillRect(panelX + 25, y + 2, textWidth + 10, 26);
                
                if (isSelected) {
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(panelX + 25, y + 2, textWidth + 10, 26);
                }
            }
            
            // Category name with enhanced glow
            ctx.fillStyle = isSelected ? '#ffffff' : (isHovered ? '#cccccc' : '#888888');
            ctx.font = font;
            
            if (isHovered || isSelected) {
                ctx.shadowColor = isSelected ? '#ffffff' : '#00ffff';
                ctx.shadowBlur = isSelected ? 8 : 6;
            }
            
            ctx.fillText(text, panelX + 30, y + 20);
            ctx.shadowBlur = 0;
        });
        
        // Render settings (right side)        if (settingsSystem.categories[settingsSystem.selectedCategory]) {
            const category = settingsSystem.categories[settingsSystem.selectedCategory];
            
            category.settings.forEach((setting, index) => {
                const y = panelY + 80 + index * 35;
                const isHovered = index === this.hoveredSetting;
                const currentValue = settingsSystem.getSetting(setting.key);
                
                // Calculate text dimensions for centered glow
                const font = '12px monospace';
                ctx.font = font;
                const textMetrics = ctx.measureText(setting.name);
                const textWidth = textMetrics.width;
                const fontSize = 12;
                
                // Centered highlight with glow (only on hover)
                if (isHovered) {
                    const glowAlpha = 0.15;
                    const glowSize = 8;
                    
                    // Calculate glow box centered exactly on the text
                    const glowBoxWidth = textWidth + 20;
                    const glowBoxHeight = fontSize + 12;
                    const glowBoxX = panelX + 250 - 10; // Start from text position with padding
                    const glowBoxY = y + 18 - fontSize + 2;
                    
                    // Outer glow centered on text
                    ctx.shadowColor = '#00ffff';
                    ctx.shadowBlur = glowSize;
                    ctx.fillStyle = `rgba(0, 255, 255, ${glowAlpha})`;
                    ctx.fillRect(glowBoxX, glowBoxY, glowBoxWidth, glowBoxHeight);
                    ctx.shadowBlur = 0;
                    
                    // Main highlight rectangle centered on text
                    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                    ctx.fillRect(glowBoxX, glowBoxY, glowBoxWidth, glowBoxHeight);
                }
                
                // Setting name with enhanced glow
                ctx.fillStyle = isHovered ? '#cccccc' : '#aaaaaa';
                ctx.font = font;
                
                if (isHovered) {
                    ctx.shadowColor = '#00ffff';
                    ctx.shadowBlur = 6;
                }
                
                ctx.fillText(setting.name, panelX + 250, y + 18);
                ctx.shadowBlur = 0;
                
                // Setting value
                ctx.textAlign = 'right';
                ctx.fillStyle = '#ffff00';
                  let valueText = '';
                switch (setting.type) {
                    case 'boolean':
                        valueText = currentValue ? 'ON' : 'OFF';
                        ctx.fillStyle = currentValue ? '#00ff00' : '#ff4444';
                        break;
                    case 'slider':
                        valueText = currentValue.toString();
                        break;
                    case 'select':
                        valueText = currentValue.toString();
                        break;
                }                ctx.fillText(valueText, panelX + panelWidth - 30, y + 18);
                ctx.textAlign = 'left';
            });
        } // Close the if statement for category selection
          // Instructions
        ctx.fillStyle = '#888888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Click to Toggle Settings  |  ESC to Close', panelX + panelWidth / 2, panelY + panelHeight - 20);
        
        ctx.restore();
    }
};

// ===== GLOBAL FUNCTIONS =====
function openSettingsMenu() {
    settingsMenuUI.openMenu();
}

function closeSettingsMenu() {
    settingsMenuUI.closeMenu();
}

function isSettingsMenuOpen() {
    return settingsSystem.isMenuOpen;
}

// Helper function to check if opening animation should be skipped
function shouldSkipOpeningAnimation() {
    return settingsSystem.getSetting('skipOpeningAnimation');
}

// Initialize settings system
console.log('⚙️ Initializing settings system...');
settingsSystem.loadSettings();
console.log('⚙️ Settings system initialized');

// Export for global access
window.gameSettings = gameSettings;
window.settingsSystem = settingsSystem;
window.settingsMenuUI = settingsMenuUI;
window.openSettingsMenu = openSettingsMenu;
window.closeSettingsMenu = closeSettingsMenu;
window.isSettingsMenuOpen = isSettingsMenuOpen;
window.shouldSkipOpeningAnimation = shouldSkipOpeningAnimation;
