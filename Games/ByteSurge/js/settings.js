// ByteSurge: Infinite Loop - Settings System
// Comprehensive settings management with localStorage persistence (Mouse-only navigation)

// ===== SETTINGS DATA =====
let gameSettings = {
    // Display Settings
    skipOpeningAnimation: false,
    fullscreenOnStart: false,
    showFPS: false,
    showDebugInfo: false,
      // Audio Settings
    masterVolume: 70,
    musicVolume: 50,
    sfxVolume: 100,
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
        },        {
            name: 'Audio',
            icon: '🔊',
            settings: [
                { key: 'masterVolume', name: 'Master Volume', type: 'number', min: 0, max: 100, step: 1, description: 'Overall audio volume (0-100)' },
                { key: 'musicVolume', name: 'Music Volume', type: 'number', min: 0, max: 100, step: 1, description: 'Background music volume (0-100)' },
                { key: 'sfxVolume', name: 'SFX Volume', type: 'number', min: 0, max: 100, step: 1, description: 'Sound effects volume (0-100)' },
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
        const oldValue = gameSettings[key];
        console.log('⚙️ setSetting called:', key, 'old:', oldValue, 'new:', value);
        
        gameSettings[key] = value;
        console.log('⚙️ gameSettings updated:', key, '=', gameSettings[key]);
        
        this.applySetting(key, value);
        this.saveSettings();
        
        // Verify the value stuck
        setTimeout(() => {
            const currentValue = gameSettings[key];
            console.log('⚙️ Setting verification after save:', key, '=', currentValue);
            if (currentValue !== value) {
                console.error('❌ Setting was reverted!', key, 'expected:', value, 'actual:', currentValue);
            }
        }, 100);
    },
    
    // Apply a setting immediately
    applySetting(key, value) {        switch (key) {
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
                
            case 'masterVolume':
            case 'musicVolume':
            case 'sfxVolume':
            case 'muteAll':
                // Update audio system when audio settings change
                if (window.updateAudioSettings) {
                    window.updateAudioSettings();
                }
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
            const settingsString = JSON.stringify(gameSettings);
            console.log('⚙️ Saving settings to localStorage:', settingsString.substring(0, 100) + '...');
            localStorage.setItem('bytesurge_settings', settingsString);
            console.log('⚙️ Settings saved successfully');
            
            // Verify save worked
            const saved = localStorage.getItem('bytesurge_settings');
            if (saved) {
                console.log('⚙️ Verified localStorage save');
            } else {
                console.error('❌ localStorage save failed!');
            }
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
                        let value = parsed[key];
                        
                        // Migrate old volume scale (0-1) to new scale (0-100)
                        if ((key === 'masterVolume' || key === 'musicVolume' || key === 'sfxVolume') && 
                            typeof value === 'number' && value <= 1.0) {
                            value = Math.round(value * 100);
                            console.log('⚙️ Migrated', key, 'from', parsed[key], 'to', value);
                        }
                        
                        gameSettings[key] = value;
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
            masterVolume: 70,
            musicVolume: 50,
            sfxVolume: 100,
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
    hoveredSetting: -1,
    selectedCategory: 1, // Start with Audio category (index 1) to show volume settings
    panelBounds: { x: 0, y: 0, width: 0, height: 0 },
    categoryBounds: [],
    settingBounds: [],
    valueBounds: [], // New: bounds for value areas that can be clicked
    lastClickTime: 0, // Add debounce protection
    editingValue: null, // Track which value is being edited
    editingInput: '', // Current input text
    editingBlinkTime: 0, // For cursor blinking
      // Open settings menu
    openMenu() {
        if (settingsSystem.isMenuOpen) return;
        
        settingsSystem.isMenuOpen = true;
        this.selectedCategory = 1; // Start with Audio category
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
        this.stopInlineEdit(false); // Cancel any inline editing
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
        });        // Calculate setting bounds (right side)
        this.settingBounds = [];
        this.valueBounds = [];
        const settingStartY = panelY + 80;
        const settingHeight = 35;        console.log('⚙️ Selected category:', this.selectedCategory, 'Total categories:', settingsSystem.categories.length);
        
        if (settingsSystem.categories[this.selectedCategory]) {
            const selectedCategory = settingsSystem.categories[this.selectedCategory];
            console.log('⚙️ Category found:', selectedCategory.name, 'with', selectedCategory.settings.length, 'settings');
            
            selectedCategory.settings.forEach((setting, index) => {
                console.log('⚙️ Processing setting', index, ':', setting.name, 'type:', setting.type);
                
                // For number types, make setting bounds smaller to leave room for value area
                const settingWidth = setting.type === 'number' ? 
                    panelWidth - 360 : // Leave 100px for value area
                    panelWidth - 260;   // Full width for other types
                
                this.settingBounds.push({
                    x: panelX + 240,
                    y: settingStartY + index * settingHeight,
                    width: settingWidth,
                    height: settingHeight - 5,
                    index: index
                });
                
                // Add value bounds for number types (clickable area on the right)
                if (setting.type === 'number') {
                    const valueBounds = {
                        x: panelX + panelWidth - 100,
                        y: settingStartY + index * settingHeight,
                        width: 70,
                        height: settingHeight - 5,
                        index: index,
                        setting: setting
                    };
                    this.valueBounds.push(valueBounds);
                    console.log('⚙️ Added value bounds for', setting.name, ':', valueBounds);
                }
            });
        } else {
            console.log('❌ No category found at index:', this.selectedCategory);
        }
        
        console.log('⚙️ Final value bounds count:', this.valueBounds.length);
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
    },      // Handle mouse click
    handleMouseClick(x, y, button) {
        if (!settingsSystem.isMenuOpen || button !== 0) return false;
        
        // Check if custom dialog should handle the click
        if (customInputDialog.isOpen) {
            return customInputDialog.handleClick(x, y);
        }
        
        // Debounce rapid clicks
        const now = Date.now();
        if (now - this.lastClickTime < 200) {
            console.log('⚙️ Click debounced');
            return true;
        }
        this.lastClickTime = now;
        
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
                y >= bounds.y && y <= bounds.y + bounds.height) {                console.log('⚙️ Category clicked:', bounds.index);
                this.selectedCategory = bounds.index;
                this.calculateBounds(); // Recalculate setting bounds
                return true;
            }        }
        
        // Check value area clicks (for inline editing) - check this FIRST
        console.log('⚙️ Checking value bounds:', this.valueBounds.length, 'value areas');
        for (let bounds of this.valueBounds) {
            console.log('⚙️ Value bounds check:', bounds.index, 'x:', x, 'in', bounds.x, '-', bounds.x + bounds.width, 'y:', y, 'in', bounds.y, '-', bounds.y + bounds.height);
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                console.log('⚙️ Value clicked for editing:', bounds.index, 'setting:', bounds.setting.name);
                this.startInlineEdit(bounds.index, bounds.setting);
                return true;
            }
        }
        
        // Check setting clicks (for non-number types)
        for (let bounds of this.settingBounds) {
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                console.log('⚙️ Setting clicked:', bounds.index, 'at bounds:', bounds);
                this.toggleSetting(bounds.index);
                return true;
            }
        }
        
        console.log('⚙️ Click inside panel but no hit');
        return false;
    },
    
    // Start inline editing for a number value
    startInlineEdit(settingIndex, setting) {
        const currentValue = settingsSystem.getSetting(setting.key);
        this.editingValue = {
            settingIndex: settingIndex,
            setting: setting,
            originalValue: currentValue
        };
        this.editingInput = currentValue.toString();
        this.editingBlinkTime = 0;
        console.log('⚙️ Started inline edit for:', setting.name, 'current value:', currentValue);
    },
    
    // Stop inline editing
    stopInlineEdit(save = false) {
        if (!this.editingValue) return;
        
        if (save) {
            const numValue = parseInt(this.editingInput, 10);
            const setting = this.editingValue.setting;
            
            if (!isNaN(numValue) && numValue >= setting.min && numValue <= setting.max) {
                console.log('⚙️ Saving inline edit:', setting.name, 'new value:', numValue);
                settingsSystem.setSetting(setting.key, numValue);
                
                // Visual feedback
                if (window.createScreenFlash && settingsSystem.getSetting('screenFlashEnabled')) {
                    window.createScreenFlash('#00ffff', 0.1, 100);
                }
            } else {
                console.log('❌ Invalid inline edit value:', this.editingInput, 'range:', setting.min, '-', setting.max);
            }
        }
        
        this.editingValue = null;
        this.editingInput = '';
    },      // Toggle or modify a setting
    toggleSetting(settingIndex) {
        const category = settingsSystem.categories[this.selectedCategory];
        if (!category || !category.settings[settingIndex]) {
            console.log('❌ Invalid setting index:', settingIndex);
            return;
        }
        
        const setting = category.settings[settingIndex];
        const currentValue = settingsSystem.getSetting(setting.key);
        
        console.log('⚙️ Toggling setting:', setting.name, 'from', currentValue, 'key:', setting.key);
        
        let newValue;
        switch (setting.type) {
            case 'boolean':
                newValue = !currentValue;
                console.log('⚙️ Boolean toggle:', currentValue, '->', newValue);
                break;
                
            case 'select':
                const options = setting.options;
                const currentIndex = options.indexOf(currentValue);
                const nextIndex = (currentIndex + 1) % options.length;
                newValue = options[nextIndex];
                console.log('⚙️ Select change:', currentValue, '->', newValue, 'options:', options);
                break;
                  case 'slider':
                // For now, just increment by step (could add drag support later)
                newValue = currentValue + setting.step;
                if (newValue > setting.max) {
                    newValue = setting.min; // Wrap around
                }
                console.log('⚙️ Slider change:', currentValue, '->', newValue, 'range:', setting.min, '-', setting.max);
                break;
                
            case 'number':
                // Number types are handled by inline editing, not toggle
                console.log('⚙️ Number type clicked - should use inline editing instead');
                return;
                
            default:
                console.log('❌ Unknown setting type:', setting.type);
                return;
        }
        
        // Set the new value
        settingsSystem.setSetting(setting.key, newValue);
        
        // Verify the change was applied
        const verifyValue = settingsSystem.getSetting(setting.key);
        console.log('⚙️ Setting verification:', setting.key, 'set to:', newValue, 'current value:', verifyValue);
        
        if (verifyValue !== newValue) {
            console.error('❌ Setting change failed! Expected:', newValue, 'Got:', verifyValue);
        }
        
        // Visual feedback
        if (window.createScreenFlash && settingsSystem.getSetting('screenFlashEnabled')) {
            window.createScreenFlash('#00ffff', 0.1, 100);
        }
    },    // Handle keyboard input (ESC for closing, and delegate to custom dialog or inline editing)
    handleInput(keyCode) {
        if (!settingsSystem.isMenuOpen) return false;
        
        // Check if custom dialog should handle the input
        if (customInputDialog.isOpen) {
            return customInputDialog.handleInput(keyCode);
        }
        
        // Check if we're doing inline editing
        if (this.editingValue) {
            if (keyCode === 'Escape') {
                this.stopInlineEdit(false); // Cancel editing
                return true;
            }
            
            if (keyCode === 'Enter') {
                this.stopInlineEdit(true); // Save editing
                return true;
            }
            
            if (keyCode === 'Backspace') {
                this.editingInput = this.editingInput.slice(0, -1);
                return true;
            }
            
            // Handle number input
            if (keyCode >= '0' && keyCode <= '9') {
                const newValue = this.editingInput + keyCode;
                const numValue = parseInt(newValue, 10);
                if (!isNaN(numValue) && numValue <= this.editingValue.setting.max) {
                    this.editingInput = newValue;
                }
                return true;
            }
            
            return true; // Consume all other keys during editing
        }
        
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
            const isSelected = index === this.selectedCategory;
            const isHovered = index === this.hoveredCategory;
            
            // Calculate text dimensions for centered glow
            const font = isSelected ? 'bold 16px monospace' : '14px monospace';
            ctx.font = font;
            const text = `${category.icon} ${category.name}`;
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;            // Centered highlight with glow
            if (isSelected || isHovered) {
                const glowAlpha = isSelected ? 0.3 : 0.15;
                const glowSize = isHovered ? 8 : 4;
                  // Calculate centered glow box position
                const glowBoxWidth = textWidth + 20;
                const glowBoxHeight = 26;
                const textStartX = panelX + 30; // Where the text actually starts
                const textCenterX = textStartX + (textWidth / 2); // Calculate text center
                const glowBoxX = textCenterX - (glowBoxWidth / 2); // Center glow box on text center
                const glowBoxY = y + 8; // Move glow down to align with text baseline
                
                // Outer glow
                if (isHovered) {
                    ctx.shadowColor = '#00ffff';
                    ctx.shadowBlur = glowSize;
                    ctx.fillStyle = `rgba(0, 255, 255, ${glowAlpha})`;
                    ctx.fillRect(glowBoxX, glowBoxY, glowBoxWidth, glowBoxHeight);
                    ctx.shadowBlur = 0;
                }
                
                // Main highlight
                ctx.fillStyle = isSelected ? 'rgba(0, 255, 255, 0.2)' : 'rgba(0, 255, 255, 0.1)';
                ctx.fillRect(glowBoxX, glowBoxY, glowBoxWidth, glowBoxHeight);
                
                if (isSelected) {
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(glowBoxX, glowBoxY, glowBoxWidth, glowBoxHeight);
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
          // Render settings (right side)
        if (settingsSystem.categories[this.selectedCategory]) {
            const category = settingsSystem.categories[this.selectedCategory];
            
            category.settings.forEach((setting, index) => {
                const y = panelY + 80 + index * 35;
                const isHovered = index === this.hoveredSetting;
                const currentValue = settingsSystem.getSetting(setting.key);
                
                // Calculate text dimensions for centered glow
                const font = '12px monospace';
                ctx.font = font;
                const textMetrics = ctx.measureText(setting.name);
                const textWidth = textMetrics.width;
                const fontSize = 12;                // Centered highlight with glow (only on hover)
                if (isHovered) {
                    const glowAlpha = 0.15;
                    const glowSize = 8;
                      // Calculate glow box centered exactly on the text
                    const glowBoxWidth = textWidth + 20;
                    const glowBoxHeight = fontSize + 12;
                    const textStartX = panelX + 250; // Where the text actually starts
                    const textCenterX = textStartX + (textWidth / 2); // Calculate text center
                    const glowBoxX = textCenterX - (glowBoxWidth / 2); // Center glow box on text center
                    const glowBoxY = y + 8; // Move glow down to align with text baseline
                    
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
                ctx.shadowBlur = 0;                // Setting value
                ctx.textAlign = 'right';
                
                let valueText = '';
                let isEditing = this.editingValue && this.editingValue.settingIndex === index;
                
                switch (setting.type) {
                    case 'boolean':
                        valueText = currentValue ? 'ON' : 'OFF';
                        ctx.fillStyle = currentValue ? '#00ff00' : '#ff4444';
                        break;
                    case 'slider':
                        valueText = currentValue.toString();
                        ctx.fillStyle = '#ffff00';
                        break;
                    case 'select':
                        valueText = currentValue.toString();
                        ctx.fillStyle = '#ffff00';
                        break;
                    case 'number':                        if (isEditing) {
                            // Show editing input
                            valueText = this.editingInput;
                            ctx.fillStyle = '#ffffff';
                            
                            // Get the actual bounds for this value area
                            let valueBounds = null;
                            for (let bounds of this.valueBounds) {
                                if (bounds.index === index) {
                                    valueBounds = bounds;
                                    break;
                                }
                            }
                            
                            if (valueBounds) {
                                // Draw input background using the same coordinates
                                ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
                                ctx.fillRect(valueBounds.x, valueBounds.y, valueBounds.width, valueBounds.height);
                                ctx.strokeStyle = '#00ffff';
                                ctx.lineWidth = 1;
                                ctx.strokeRect(valueBounds.x, valueBounds.y, valueBounds.width, valueBounds.height);
                                  // Show blinking cursor
                                this.editingBlinkTime += 16; // Assume ~60fps
                                if (Math.floor(this.editingBlinkTime / 500) % 2) {
                                    const textWidth = ctx.measureText(valueText).width;
                                    const centerX = valueBounds.x + valueBounds.width / 2;
                                    const cursorX = centerX + textWidth / 2 + 2;
                                    const cursorY = valueBounds.y + valueBounds.height / 2 - 6;
                                    ctx.fillStyle = '#ffffff';
                                    ctx.fillRect(cursorX, cursorY, 1, 12);
                                }
                            }
                            
                            ctx.fillStyle = '#ffffff';} else {
                            // Show normal value with clickable highlight
                            valueText = currentValue.toString();
                            
                            // Get the actual bounds for this value area
                            let valueBounds = null;
                            for (let bounds of this.valueBounds) {
                                if (bounds.index === index) {
                                    valueBounds = bounds;
                                    break;
                                }
                            }
                            
                            if (valueBounds) {
                                // Use the exact same coordinates as the click detection
                                const valueX = valueBounds.x;
                                const valueY = valueBounds.y;
                                const valueWidth = valueBounds.width;
                                const valueHeight = valueBounds.height;
                                
                                // Check if mouse is over this value area
                                const valueHovered = (this.mousePos.x >= valueX && this.mousePos.x <= valueX + valueWidth &&
                                                    this.mousePos.y >= valueY && this.mousePos.y <= valueY + valueHeight);
                                
                                if (valueHovered) {
                                    // Draw bright hover background
                                    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
                                    ctx.fillRect(valueX, valueY, valueWidth, valueHeight);
                                    ctx.strokeStyle = '#00ffff';
                                    ctx.lineWidth = 2;
                                    ctx.strokeRect(valueX, valueY, valueWidth, valueHeight);
                                    
                                    ctx.fillStyle = '#ffffff';
                                } else {
                                    // Draw subtle border to show it's clickable
                                    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                                    ctx.lineWidth = 1;
                                    ctx.strokeRect(valueX, valueY, valueWidth, valueHeight);
                                    
                                    ctx.fillStyle = '#ffff00';
                                }
                            } else {
                                ctx.fillStyle = '#ffff00';
                            }
                        }
                        break;                }
                
                // Center the text within the value area for number types
                if (setting.type === 'number') {
                    // Get the bounds for this value area
                    let valueBounds = null;
                    for (let bounds of this.valueBounds) {
                        if (bounds.index === index) {
                            valueBounds = bounds;
                            break;
                        }
                    }
                    
                    if (valueBounds) {
                        ctx.textAlign = 'center';
                        const centerX = valueBounds.x + valueBounds.width / 2;
                        const centerY = valueBounds.y + valueBounds.height / 2 + 4; // +4 for vertical centering
                        ctx.fillText(valueText, centerX, centerY);
                    } else {
                        // Fallback to right alignment
                        ctx.textAlign = 'right';
                        ctx.fillText(valueText, panelX + panelWidth - 30, y + 18);
                    }
                } else {
                    ctx.textAlign = 'right';
                    ctx.fillText(valueText, panelX + panelWidth - 30, y + 18);
                }
                ctx.textAlign = 'left';
            });
        }        // Instructions
        ctx.fillStyle = '#888888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Click to Toggle/Change Settings  |  ESC to Close', panelX + panelWidth / 2, panelY + panelHeight - 20);
        
        ctx.restore();
        
        // Render custom input dialog on top
        customInputDialog.render(ctx);
    }
};

// ===== CUSTOM INPUT DIALOG =====
let customInputDialog = {
    isOpen: false,
    title: '',
    currentValue: '',
    minValue: 0,
    maxValue: 100,
    inputValue: '',
    callback: null,
    bounds: { x: 0, y: 0, width: 400, height: 200 },
    
    // Open the input dialog
    open(title, currentValue, minValue, maxValue, callback) {
        this.isOpen = true;
        this.title = title;
        this.currentValue = currentValue.toString();
        this.inputValue = currentValue.toString();
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.callback = callback;
        
        // Calculate dialog position (centered)
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        this.bounds.x = (gameWidth - this.bounds.width) / 2;
        this.bounds.y = (gameHeight - this.bounds.height) / 2;
        
        console.log('🔢 Custom input dialog opened:', title);
    },
    
    // Close the dialog
    close() {
        this.isOpen = false;
        this.callback = null;
        this.inputValue = '';
        console.log('🔢 Custom input dialog closed');
    },
    
    // Handle key input for the dialog
    handleInput(key) {
        if (!this.isOpen) return false;
        
        if (key === 'Escape') {
            this.close();
            return true;
        }
        
        if (key === 'Enter') {
            this.submit();
            return true;
        }
        
        if (key === 'Backspace') {
            this.inputValue = this.inputValue.slice(0, -1);
            return true;
        }
        
        // Handle number input
        if (key >= '0' && key <= '9') {
            const newValue = this.inputValue + key;
            const numValue = parseInt(newValue, 10);
            if (!isNaN(numValue) && numValue <= this.maxValue) {
                this.inputValue = newValue;
            }
            return true;
        }
        
        return false;
    },
    
    // Handle mouse clicks
    handleClick(x, y) {
        if (!this.isOpen) return false;
        
        // Check if click is outside dialog
        if (x < this.bounds.x || x > this.bounds.x + this.bounds.width ||
            y < this.bounds.y || y > this.bounds.y + this.bounds.height) {
            this.close();
            return true;
        }
        
        // Check OK button (right side of dialog)
        const buttonY = this.bounds.y + this.bounds.height - 50;
        const okButtonX = this.bounds.x + this.bounds.width - 120;
        if (x >= okButtonX && x <= okButtonX + 50 &&
            y >= buttonY && y <= buttonY + 30) {
            this.submit();
            return true;
        }
        
        // Check Cancel button
        const cancelButtonX = this.bounds.x + this.bounds.width - 60;
        if (x >= cancelButtonX && x <= cancelButtonX + 50 &&
            y >= buttonY && y <= buttonY + 30) {
            this.close();
            return true;
        }
        
        return true; // Consume click to prevent interaction with settings behind
    },
    
    // Submit the input value
    submit() {
        const numValue = parseInt(this.inputValue, 10);
        if (!isNaN(numValue) && numValue >= this.minValue && numValue <= this.maxValue) {
            if (this.callback) {
                this.callback(numValue);
            }
            this.close();
        } else {
            console.log('❌ Invalid input value:', this.inputValue);
            // Could add visual feedback here
        }
    },
    
    // Render the dialog
    render(ctx) {
        if (!this.isOpen) return;
        
        ctx.save();
        
        // Dialog background with shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, window.GAME_WIDTH || 1200, window.GAME_HEIGHT || 800);
        
        // Dialog panel
        ctx.fillStyle = 'rgba(10, 20, 30, 0.95)';
        ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
        
        // Dialog border
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
        
        // Title
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.title, this.bounds.x + this.bounds.width / 2, this.bounds.y + 30);
        
        // Current value info
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '12px monospace';
        ctx.fillText(`Current: ${this.currentValue}`, this.bounds.x + this.bounds.width / 2, this.bounds.y + 55);
        ctx.fillText(`Range: ${this.minValue}-${this.maxValue}`, this.bounds.x + this.bounds.width / 2, this.bounds.y + 75);
        
        // Input field
        const inputX = this.bounds.x + 50;
        const inputY = this.bounds.y + 100;
        const inputWidth = this.bounds.width - 100;
        const inputHeight = 30;
        
        // Input background
        ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
        ctx.fillRect(inputX, inputY, inputWidth, inputHeight);
        
        // Input border
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1;
        ctx.strokeRect(inputX, inputY, inputWidth, inputHeight);
        
        // Input text
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.inputValue || '', inputX + 10, inputY + 20);
        
        // Cursor
        if (Math.floor(Date.now() / 500) % 2) {
            const textWidth = ctx.measureText(this.inputValue || '').width;
            ctx.fillRect(inputX + 10 + textWidth, inputY + 5, 2, 20);
        }
        
        // Buttons
        const buttonY = this.bounds.y + this.bounds.height - 50;
        
        // OK Button
        const okButtonX = this.bounds.x + this.bounds.width - 120;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.fillRect(okButtonX, buttonY, 50, 30);
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(okButtonX, buttonY, 50, 30);
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OK', okButtonX + 25, buttonY + 20);
        
        // Cancel Button
        const cancelButtonX = this.bounds.x + this.bounds.width - 60;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(cancelButtonX, buttonY, 50, 30);
        ctx.strokeStyle = '#ff4444';
        ctx.strokeRect(cancelButtonX, buttonY, 50, 30);
        ctx.fillStyle = '#ff4444';
        ctx.fillText('Cancel', cancelButtonX + 25, buttonY + 20);
        
        // Instructions
        ctx.fillStyle = '#888888';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Type numbers | Enter to confirm | Escape to cancel', this.bounds.x + this.bounds.width / 2, this.bounds.y + this.bounds.height - 15);
        
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
window.customInputDialog = customInputDialog;
window.openSettingsMenu = openSettingsMenu;
window.closeSettingsMenu = closeSettingsMenu;
window.isSettingsMenuOpen = isSettingsMenuOpen;
window.shouldSkipOpeningAnimation = shouldSkipOpeningAnimation;
