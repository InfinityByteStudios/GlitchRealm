/**
 * Enhanced Settings System - Streamlined with only functional settings
 * Provides a modern, beautiful, and functional settings interface
 * 
 * Features:
 * - Modern glassmorphism UI with animated particles
 * - Category-based organization
 * - Live previews and tooltips
 * - Import/export functionality
 * - Only includes settings that are actually implemented in the game
 */

export class SettingsSystem {
    constructor(gameInstance = null) {
        this.gameInstance = gameInstance;
        
        // Animation state
        this.animationTime = 0;
        this.slideInProgress = 0;
        this.sectionsAnimationProgress = 0;
        this.headerAnimationProgress = 0;
        this.lastFrameTime = Date.now();
        
        // UI state
        this.hoveredItem = null;
        this.selectedItem = null;
        this.scrollOffset = 0;
        this.targetScrollOffset = 0; // For smooth scrolling
        this.searchFilter = '';
        this.activeTab = 0;
        this.lastActiveTab = 0; // Track tab changes for scroll reset
        this.showTooltip = null;
        this.tooltipTimer = 0;
        this.isKeyCapturing = false;
        this.keyCaptureSetting = null;
        
        // Dropdown state
        this.expandedDropdown = null;
        this.dropdownAnimation = 0;
        this.dropdownPosition = null; // Store dropdown position info
        this.dropdownScrollOffset = 0;
        
        // Particle system for background effects
        this.particles = [];
        this.initializeParticles();
        
        // Settings categories - based on approved specification
        this.settingsCategories = [
            {
                title: 'Audio',
                icon: '🔊',
                color: '#22c55e',
                description: 'Sound and music settings',
                settings: [
                    { 
                        type: 'slider', 
                        key: 'masterVolume', 
                        label: 'Master Volume', 
                        description: 'Overall game volume (affects all audio)',
                        value: 0.7, 
                        min: 0, 
                        max: 1, 
                        step: 0.01,
                        showPercentage: true,
                        live: true
                    },
                    { 
                        type: 'slider', 
                        key: 'musicVolume', 
                        label: 'Music Volume', 
                        description: 'Background music volume',
                        value: 0.5, 
                        min: 0, 
                        max: 1, 
                        step: 0.01,
                        showPercentage: true,
                        live: true
                    },
                    { 
                        type: 'slider', 
                        key: 'sfxVolume', 
                        label: 'Sound Effects Volume', 
                        description: 'Jump, collect, death sounds volume',
                        value: 0.8, 
                        min: 0, 
                        max: 1, 
                        step: 0.01,
                        showPercentage: true,
                        live: true
                    },
                    { 
                        type: 'slider', 
                        key: 'uiSoundVolume', 
                        label: 'UI Sound Volume', 
                        description: 'Menu clicks and notifications volume',
                        value: 0.8, 
                        min: 0, 
                        max: 1, 
                        step: 0.01,
                        showPercentage: true,
                        live: true
                    },
                    { 
                        type: 'dropdown', 
                        key: 'musicTrack', 
                        label: 'Music Track', 
                        description: 'Select background music track',
                        value: 'chill-synthwave-background-track-341854.mp3',
                        options: [] // Will be populated from AudioSystem
                    },
                    { 
                        type: 'toggle', 
                        key: 'musicShuffle', 
                        label: 'Music Shuffle', 
                        description: 'Randomly change tracks during gameplay',
                        value: false 
                    },
                    { 
                        type: 'slider', 
                        key: 'crossfadeDuration', 
                        label: 'Crossfade Duration', 
                        description: 'Smooth transitions between tracks',
                        value: 1.5, 
                        min: 0.5, 
                        max: 3, 
                        step: 0.1,
                        unit: 's',
                        live: true
                    },
                    { 
                        type: 'toggle', 
                        key: 'muteWhenUnfocused', 
                        label: 'Mute When Unfocused', 
                        description: 'Auto-mute when window loses focus',
                        value: true 
                    },
                    { 
                        type: 'toggle', 
                        key: 'pauseMusicOnGamePause', 
                        label: 'Pause Music on Game Pause', 
                        description: 'Pause background music when game is paused',
                        value: true 
                    }
                ]
            },
            {
                title: 'Gameplay',
                icon: '🎮',
                color: '#8b5cf6',
                description: 'Game behavior and mechanics',
                settings: [
                    { 
                        type: 'toggle', 
                        key: 'autoSave', 
                        label: 'Auto-Save', 
                        description: 'Automatically save progress',
                        value: true 
                    },
                    { 
                        type: 'toggle', 
                        key: 'autoPauseOnFocusLoss', 
                        label: 'Auto-Pause on Focus Loss', 
                        description: 'Automatically pause when window loses focus',
                        value: true 
                    },
                    { 
                        type: 'toggle', 
                        key: 'restartConfirmation', 
                        label: 'Restart Confirmation', 
                        description: 'Show confirmation dialog before restarting',
                        value: true 
                    },
                    { 
                        type: 'dropdown', 
                        key: 'deathAnimationSpeed', 
                        label: 'Death Animation Speed', 
                        description: 'Speed of death animation and transition',
                        value: 'normal',
                        options: [
                            { label: 'Slow', value: 'slow', description: 'Slower, more dramatic' },
                            { label: 'Normal', value: 'normal', description: 'Default speed' },
                            { label: 'Fast', value: 'fast', description: 'Quick transition' }
                        ]
                    },
                    { 
                        type: 'toggle', 
                        key: 'showLoadingScreen', 
                        label: 'Show Loading Screen', 
                        description: 'Display loading screen between game states',
                        value: true 
                    },
                    { 
                        type: 'toggle', 
                        key: 'showOpeningAnimation', 
                        label: 'Show Opening Animation', 
                        description: 'Play opening animation when game starts',
                        value: true 
                    }
                ]
            },
            {
                title: 'Graphics',
                icon: '🖥️',
                color: '#3b82f6',
                description: 'Visual quality and performance',
                settings: [
                    { 
                        type: 'dropdown', 
                        key: 'graphicsQuality', 
                        label: 'Graphics Quality', 
                        description: 'Overall visual quality preset',
                        value: 'medium',
                        options: [
                            { label: 'Low', value: 'low', description: 'Best performance' },
                            { label: 'Medium', value: 'medium', description: 'Balanced quality/performance' },
                            { label: 'High', value: 'high', description: 'Best visuals' },
                            { label: 'Ultra', value: 'ultra', description: 'Maximum quality' }
                        ]
                    },
                    { 
                        type: 'dropdown', 
                        key: 'frameRateLimit', 
                        label: 'Frame Rate Limit', 
                        description: 'Maximum frames per second',
                        value: '60',
                        options: [
                            { label: '30 FPS', value: '30', description: 'Battery saving' },
                            { label: '60 FPS', value: '60', description: 'Standard smooth' },
                            { label: '120 FPS', value: '120', description: 'High refresh rate' },
                            { label: '144 FPS', value: '144', description: 'Gaming monitors' },
                            { label: 'Unlimited', value: 'unlimited', description: 'No limit' }
                        ]
                    },
                    { 
                        type: 'toggle', 
                        key: 'vsync', 
                        label: 'V-Sync', 
                        description: 'Vertical synchronization to prevent screen tearing',
                        value: false 
                    },
                    { 
                        type: 'toggle', 
                        key: 'performanceMode', 
                        label: 'Performance Mode', 
                        description: 'Optimize for lower-end devices',
                        value: false 
                    },
                    { 
                        type: 'toggle', 
                        key: 'showFPSCounter', 
                        label: 'Show FPS Counter', 
                        description: 'Display frames per second counter',
                        value: false 
                    }
                ]
            },
            {
                title: 'Data',
                icon: '💾',
                color: '#f59e0b',
                description: 'Save data and privacy',
                settings: [
                    { 
                        type: 'toggle', 
                        key: 'cloudSave', 
                        label: 'Cloud Save', 
                        description: 'Synchronize progress to cloud',
                        value: true 
                    },
                    { 
                        type: 'toggle', 
                        key: 'localBackup', 
                        label: 'Local Backup', 
                        description: 'Create automatic local backups',
                        value: true 
                    },
                    { 
                        type: 'toggle', 
                        key: 'submitScores', 
                        label: 'Submit Scores', 
                        description: 'Automatically submit scores to leaderboard',
                        value: true 
                    },
                    { 
                        type: 'button', 
                        key: 'exportSaveData', 
                        label: 'Export Save Data', 
                        description: 'Download your save data as a file',
                        buttonText: 'Export',
                        action: 'export'
                    },
                    { 
                        type: 'button', 
                        key: 'importSaveData', 
                        label: 'Import Save Data', 
                        description: 'Load save data from a file',
                        buttonText: 'Import',
                        action: 'import'
                    },
                    { 
                        type: 'button', 
                        key: 'resetAllProgress', 
                        label: 'Reset All Progress', 
                        description: 'Delete all save data and start over',
                        buttonText: 'Reset All',
                        action: 'reset',
                        confirmRequired: true,
                        dangerous: true
                    }
                ]
            }
        ];
        
        // Load music tracks from audio system if available
        this.loadMusicTracksFromAudioSystem();
        
        // Particle system for background effects
        this.particles = [];
        this.initializeParticles();
        
        // Load saved settings (async)
        this.loadSettings().catch(error => {
            console.warn('Failed to load settings during initialization:', error);
        });
    }
    
    /**
     * Load music tracks from the audio system into the dropdown options
     */
    loadMusicTracksFromAudioSystem() {
        if (this.gameInstance?.audioSystem?.getAvailableTracks) {
            const tracks = this.gameInstance.audioSystem.getAvailableTracks();
            const musicTrackSetting = this.settingsCategories[0].settings.find(s => s.key === 'musicTrack');
            if (musicTrackSetting && tracks.length > 0) {
                musicTrackSetting.options = tracks.map(track => ({
                    label: track.name,
                    value: track.filename,
                    description: track.description
                }));
                // Set current track as selected
                if (this.gameInstance.audioSystem.selectedTrack) {
                    musicTrackSetting.value = this.gameInstance.audioSystem.selectedTrack;
                }
            }
        }
    }

    /**
     * Initialize particle system for background effects
     */
    
    /**
     * Initialize particle system for background effects
     */
    initializeParticles() {
        this.particles = [];
        
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * 1920,
                y: Math.random() * 1080,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.3 + 0.1,
                color: ['#22c55e', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'][Math.floor(Math.random() * 5)],
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.02 + 0.01
            });
        }
    }
    
    /**
     * Update particle system
     */
    updateParticles() {
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.pulsePhase += particle.pulseSpeed;
            
            // Wrap around screen
            if (particle.x < -10) particle.x = 1930;
            if (particle.x > 1930) particle.x = -10;
            if (particle.y < -10) particle.y = 1090;
            if (particle.y > 1090) particle.y = -10;
        });
    }
    
    /**
     * Load settings from localStorage and cloud storage
     */
    async loadSettings() {
        try {
            let localSettings = {};
            let cloudSettings = {};
            
            // Load from localStorage first
            const localData = localStorage.getItem('coderunner_settings');
            if (localData) {
                localSettings = JSON.parse(localData);
                console.log('📱 Local settings loaded');
            }
            
            // Try to load from cloud if logged in
            if (this.gameInstance?.userProfileSystem?.isLoggedIn) {
                try {
                    cloudSettings = await this.loadFromCloud();
                    if (cloudSettings && Object.keys(cloudSettings).length > 0) {
                        console.log('☁️ Cloud settings loaded');
                        
                        // Check for discrepancies and log them
                        this.checkSettingsDiscrepancies(localSettings, cloudSettings);
                    }
                } catch (error) {
                    console.warn('☁️ Failed to load cloud settings:', error);
                }
            }
            
            // Merge settings with cloud taking precedence over local
            const mergedSettings = { ...localSettings, ...cloudSettings };
            
            // Apply loaded settings to the settings structure
            this.settingsCategories.forEach(category => {
                category.settings.forEach(setting => {
                    if (mergedSettings.hasOwnProperty(setting.key)) {
                        setting.value = mergedSettings[setting.key];
                    }
                });
            });
            
            // If we loaded cloud settings, save them locally for offline access
            if (Object.keys(cloudSettings).length > 0) {
                localStorage.setItem('coderunner_settings', JSON.stringify(mergedSettings));
                console.log('💾 Cloud settings saved to local storage for offline access');
            }
            
            // Apply settings to game after loading
            setTimeout(() => this.applySettingsToGame(), 100);
            console.log('✅ Settings loaded successfully');
        } catch (e) {
            console.warn('❌ Failed to load settings:', e);
        }
    }

    /**
     * Load settings from cloud storage
     */
    async loadFromCloud() {
        try {
            if (this.gameInstance?.userProfileSystem?.isLoggedIn && this.gameInstance?.userProfileSystem?.currentUser) {
                const userProfileSystem = this.gameInstance.userProfileSystem;
                
                // Get settings from user profile
                if (userProfileSystem.userProfile && userProfileSystem.userProfile.settings) {
                    console.log('☁️ Settings found in user profile');
                    return userProfileSystem.userProfile.settings;
                }
                
                // Fallback: Try to load directly from Firestore
                if (userProfileSystem.firestore) {
                    const profileDoc = await userProfileSystem.firestore
                        .collection('userProfiles')
                        .doc(userProfileSystem.currentUser.uid)
                        .get();
                    
                    if (profileDoc.exists) {
                        const data = profileDoc.data();
                        if (data.settings) {
                            console.log('☁️ Settings loaded directly from Firestore');
                            return data.settings;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('☁️ Failed to load from cloud:', error);
        }
        return {};
    }
    
    /**
     * Save settings to localStorage and cloud storage
     */
    saveSettings() {
        try {
            const settings = {};
            this.settingsCategories.forEach(category => {
                category.settings.forEach(setting => {
                    settings[setting.key] = setting.value;
                });
            });
            
            // Save to localStorage
            localStorage.setItem('coderunner_settings', JSON.stringify(settings));
            console.log('💾 Settings saved to localStorage');
            
            // Save to cloud storage if logged in
            if (this.gameInstance?.userProfileSystem?.isLoggedIn) {
                this.saveToCloud(settings);
                
                // Also trigger comprehensive cloud save
                if (this.gameInstance?.cloudSaveSystem) {
                    this.gameInstance.cloudSaveSystem.saveAllGameData().catch(error => {
                        console.warn('Failed to save settings to cloud:', error);
                    });
                }
            } else {
                console.log('📝 Not logged in - settings saved locally only');
            }
            
            // Create backup if enabled
            if (this.getSettingValue('localBackup')) {
                this.createLocalBackup(settings);
            }
            
            this.showSaveConfirmation();
            console.log('✅ Settings saved successfully');
        } catch (e) {
            console.warn('❌ Failed to save settings:', e);
            this.showSaveError();
        }
    }

    /**
     * Save settings to cloud storage
     */
    async saveToCloud(settings) {
        try {
            if (this.gameInstance?.userProfileSystem?.isLoggedIn && this.gameInstance?.userProfileSystem?.currentUser) {
                const userProfileSystem = this.gameInstance.userProfileSystem;
                
                // Update the user profile with settings
                if (userProfileSystem.userProfile) {
                    userProfileSystem.userProfile.settings = settings;
                    userProfileSystem.userProfile.settingsUpdatedAt = new Date().toISOString();
                    
                    // Save the profile
                    await userProfileSystem.saveUserProfile();
                    console.log('☁️ Settings synced to cloud');
                } else {
                    console.warn('☁️ User profile not available for settings sync');
                }
            }
        } catch (error) {
            console.warn('☁️ Failed to sync settings to cloud:', error);
        }
    }

    /**
     * Create local backup of settings
     */
    createLocalBackup(settings) {
        try {
            const backup = {
                settings: settings,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            // Keep only the last 5 backups
            const backups = JSON.parse(localStorage.getItem('coderunner_settings_backups') || '[]');
            backups.push(backup);
            
            if (backups.length > 5) {
                backups.shift(); // Remove oldest backup
            }
            
            localStorage.setItem('coderunner_settings_backups', JSON.stringify(backups));
            console.log('💾 Local backup created');
        } catch (error) {
            console.warn('💾 Failed to create local backup:', error);
        }
    }

    /**
     * Sync settings to cloud storage
     */
    async syncToCloud() {
        if (!this.getSettingValue('cloudSave')) return;
        
        try {
            const settings = this.getAllSettings();
            await this.saveToCloud(settings);
        } catch (error) {
            console.warn('☁️ Failed to sync to cloud:', error);
        }
    }
    
    /**
     * Show save confirmation animation
     */
    showSaveConfirmation() {
        this.saveConfirmation = true;
        setTimeout(() => {
            this.saveConfirmation = false;
        }, 2000);
    }

    /**
     * Show save error message
     */
    showSaveError() {
        this.saveError = true;
        setTimeout(() => {
            this.saveError = false;
        }, 3000);
    }

    /**
     * Helper method to get setting value by key
     */
    getSettingByKey(key) {
        return this.getSettingValue(key);
    }

    /**
     * Helper method to get UI volume (uses SFX volume as fallback)
     */
    getUIVolumeByKey(key) {
        const value = this.getSettingValue(key);
        return value !== null ? value : this.getSettingValue('sfxVolume') || 0.8;
    }

    /**
     * Helper method to get master volume
     */
    getMasterVolume() {
        return this.getSettingValue('masterVolume') || 0.7;
    }

    /**
     * Helper method to get music volume
     */
    getMusicVolume() {
        return this.getSettingValue('musicVolume') || 0.5;
    }

    /**
     * Helper method to get SFX volume
     */
    getSFXVolume() {
        return this.getSettingValue('sfxVolume') || 0.8;
    }

    /**
     * Helper method to get mute when unfocused setting
     */
    getMuteWhenUnfocused() {
        return this.getSettingValue('muteWhenUnfocused') !== false; // Default to true
    }

    /**
     * Helper method to get current track
     */
    getCurrentTrack() {
        const trackFilename = this.getSettingValue('musicTrack');
        if (this.gameInstance?.audioSystem?.getAvailableTracks) {
            const tracks = this.gameInstance.audioSystem.getAvailableTracks();
            return tracks.find(track => track.filename === trackFilename) || tracks[0];
        }
        return null;
    }
    
    /**
     * Export settings to clipboard
     */
    /**
     * Reset animations for smooth entry
     */
    resetAnimations() {
        this.slideInProgress = 0;
        this.sectionsAnimationProgress = 0;
        this.headerAnimationProgress = 0;
        this.animationTime = 0;
        this.lastFrameTime = Date.now();
    }
    
    /**
     * Apply settings to the game instance
     */
    applySettingsToGame() {
        if (!this.gameInstance) return;
        
        // Apply audio settings
        if (this.gameInstance.audioSystem) {
            const masterVol = this.getSettingValue('masterVolume');
            const musicVol = this.getSettingValue('musicVolume');
            const sfxVol = this.getSettingValue('sfxVolume');
            this.gameInstance.audioSystem.setMasterVolume(masterVol);
            this.gameInstance.audioSystem.setMusicVolume(musicVol);
            this.gameInstance.audioSystem.setSfxVolume(sfxVol);
            this.gameInstance.audioSystem.muteWhenUnfocused = this.getSettingValue('muteWhenUnfocused');
        }

        // Apply graphics settings
        this.gameInstance.graphicsQuality = this.getSettingValue('graphicsQuality');
        this.gameInstance.showParticles = this.getSettingValue('showParticles');
        this.gameInstance.screenShake = this.getSettingValue('screenShake');
        this.gameInstance.showFpsCounter = this.getSettingValue('showFPS');
        this.gameInstance.backgroundParticles = this.getSettingValue('backgroundParticles');

        // Apply gameplay settings
        this.gameInstance.autoSave = this.getSettingValue('autoSave');
        this.gameInstance.pauseOnFocusLoss = this.getSettingValue('pauseOnFocusLoss');
        this.gameInstance.adaptiveDifficulty = this.getSettingValue('adaptiveDifficulty');
        this.gameInstance.skipDeathAnimation = this.getSettingValue('skipDeathAnimation');
        this.gameInstance.showLoadingScreen = this.getSettingValue('showLoadingScreen');
        this.gameInstance.showOpeningAnimation = this.getSettingValue('showOpeningAnimation');

        // Apply graphics quality if supported
        if (this.gameInstance.applyGraphicsQuality) {
            this.gameInstance.applyGraphicsQuality();
        }

        console.log('✅ Settings applied to game instance');
    }
    
    /**
     * Get setting value by key
     */
    getSettingValue(key) {
        for (const category of this.settingsCategories) {
            for (const setting of category.settings) {
                if (setting.key === key) {
                    return setting.value;
                }
            }
        }
        return null;
    }

    /**
     * Get setting by key (alias for getSettingValue)
     */
    getSettingByKey(key) {
        return this.getSettingValue(key);
    }

    /**
     * Get UI volume by key
     */
    getUIVolumeByKey(key) {
        return this.getSettingValue(key) || 0.8;
    }

    /**
     * Get master volume from settings or audio system
     */
    getMasterVolume() {
        const settingValue = this.getSettingValue('masterVolume');
        if (settingValue !== null) return settingValue;
        
        if (this.gameInstance?.audioSystem?.getMasterVolume) {
            return this.gameInstance.audioSystem.getMasterVolume();
        }
        return 0.7; // Default
    }

    /**
     * Get music volume from settings or audio system
     */
    getMusicVolume() {
        const settingValue = this.getSettingValue('musicVolume');
        if (settingValue !== null) return settingValue;
        
        if (this.gameInstance?.audioSystem?.getMusicVolume) {
            return this.gameInstance.audioSystem.getMusicVolume();
        }
        return 0.5; // Default
    }

    /**
     * Get SFX volume from settings or audio system
     */
    getSFXVolume() {
        const settingValue = this.getSettingValue('sfxVolume');
        if (settingValue !== null) return settingValue;
        
        if (this.gameInstance?.audioSystem?.getSfxVolume) {
            return this.gameInstance.audioSystem.getSfxVolume();
        }
        return 0.8; // Default
    }

    /**
     * Get mute when unfocused setting
     */
    getMuteWhenUnfocused() {
        const settingValue = this.getSettingValue('muteWhenUnfocused');
        if (settingValue !== null) return settingValue;
        
        if (this.gameInstance?.audioSystem?.muteWhenUnfocused !== undefined) {
            return this.gameInstance.audioSystem.muteWhenUnfocused;
        }
        return true; // Default
    }

    /**
     * Get current music track
     */
    getCurrentTrack() {
        if (this.gameInstance?.audioSystem?.getCurrentTrack) {
            return this.gameInstance.audioSystem.getCurrentTrack();
        }
        return { name: 'No track selected', filename: '', description: '' };
    }
    
    /**
     * Set setting value by key
     */
    setSettingValue(key, value) {
        for (const category of this.settingsCategories) {
            for (const setting of category.settings) {
                if (setting.key === key) {
                    setting.value = value;
                    
                    // Apply live setting if needed
                    if (setting.live) {
                        this.applyLiveSetting(setting);
                    }
                    
                    this.saveSettings();
                    return;
                }
            }
        }
    }
    
    /**
     * Apply live setting changes for immediate feedback
     */
    applyLiveSetting(setting) {
        if (!this.gameInstance) return;
        
        switch (setting.key) {
            case 'masterVolume':
                if (this.gameInstance.audioSystem) {
                    this.gameInstance.audioSystem.setMasterVolume(setting.value);
                }
                break;
            case 'musicVolume':
                if (this.gameInstance.audioSystem) {
                    this.gameInstance.audioSystem.setMusicVolume(setting.value);
                }
                break;
            case 'sfxVolume':
                if (this.gameInstance.audioSystem) {
                    this.gameInstance.audioSystem.setSfxVolume(setting.value);
                }
                break;
            case 'graphicsQuality':
                // Apply graphics quality changes immediately
                this.gameInstance.graphicsQuality = setting.value;
                this.gameInstance.applyGraphicsQuality();
                console.log('🎨 Graphics quality changed to:', setting.value);
                break;
            case 'showParticles':
                // Apply particle setting changes
                if (this.gameInstance.world) {
                    this.gameInstance.world.particlesEnabled = setting.value;
                }
                break;
            case 'screenShake':
                // Apply screen shake setting
                this.gameInstance.screenShakeEnabled = setting.value;
                break;
            case 'showFPS':
                // Apply FPS counter setting
                this.gameInstance.showFpsCounter = setting.value;
                break;
            case 'backgroundParticles':
                // Apply background particles setting
                if (this.gameInstance.renderer) {
                    this.gameInstance.renderer.setRenderOptimizations({
                        skipBackgroundParticles: !setting.value
                    });
                }
                break;
        }
    }
    
    /**
     * Modern glassmorphism UI rendering (overhauled to match game style)
     */
    render(ctx, canvas, hitAreas = []) {
        const width = canvas.width;
        const height = canvas.height;
        
        // Ensure hitAreas is an array
        if (!Array.isArray(hitAreas)) {
            hitAreas = [];
        }
        
        // Update animations
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        this.animationTime += deltaTime * 0.001;
        this.slideInProgress = Math.min(1, this.slideInProgress + deltaTime * 0.003);
        this.sectionsAnimationProgress = Math.min(1, this.sectionsAnimationProgress + deltaTime * 0.002);
        this.headerAnimationProgress = Math.min(1, this.headerAnimationProgress + deltaTime * 0.004);
        
        // Smooth scrolling interpolation
        const scrollLerpSpeed = 0.15;
        this.scrollOffset += (this.targetScrollOffset - this.scrollOffset) * scrollLerpSpeed;
        
        // Update particles
        this.updateParticles();
        
        // Clear hit areas
        hitAreas.length = 0;
        
        ctx.save();
        
        // Animated gradient background (matches other screens)
        const time = this.animationTime;
        const bgGradient = ctx.createRadialGradient(
            width/2 + Math.sin(time * 0.5) * 60,
            height/2 + Math.cos(time * 0.3) * 40,
            0,
            width/2, height/2, Math.max(width, height) * 0.8
        );
        bgGradient.addColorStop(0, 'rgba(13, 17, 23, 0.97)');
        bgGradient.addColorStop(0.3, 'rgba(30, 41, 59, 0.98)');
        bgGradient.addColorStop(0.7, 'rgba(21, 32, 43, 0.96)');
        bgGradient.addColorStop(1, 'rgba(13, 17, 23, 0.99)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Modern particle effects
        this.drawModernParticles(ctx, width, height, time);
        
        // Glassmorphic header panel
        const headerHeight = 100;
        this.drawGlassmorphicPanel(ctx, 0, 0, width, headerHeight, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.18)');
        
        // Animated glowing title
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 38px Courier New';
        ctx.shadowColor = 'rgba(88,166,255,0.5)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#f0f6fc';
        ctx.fillText('SETTINGS', width/2, 48);
        ctx.shadowColor = 'rgba(168,85,247,0.3)';
        ctx.shadowBlur = 32;
        ctx.fillText('SETTINGS', width/2, 48);
        ctx.shadowBlur = 0;
        ctx.font = '18px Courier New';
        ctx.fillStyle = 'rgba(125,133,144,0.85)';
        ctx.fillText('Configure your game experience', width/2, 75);
        ctx.restore();
        
        // Modern tab system
        this.drawModernTabs(ctx, width, headerHeight + 20, hitAreas);
        
        // Content area based on selected tab
        const contentStartY = headerHeight + 80;
        const contentHeight = height - contentStartY - 80;
        
        // Draw content based on current tab
        this.drawTabContent(ctx, width, contentStartY, contentHeight, hitAreas);
        
        // Modern back button
        this.drawModernBackButton(ctx, width, height, hitAreas);
        
        // Draw expanded dropdowns last (on top of everything)
        this.drawExpandedDropdowns(ctx, width, contentStartY, contentHeight, hitAreas);
        
        ctx.restore();
    }

    /**
     * Draw modern particle effects
     */
    drawModernParticles(ctx, width, height, time) {
        // Primary floating particles
        for (let i = 0; i < 12; i++) {
            const x = (Math.sin(time * 0.5 + i * 1.8) * 0.4 + 0.5) * width;
            const y = (Math.cos(time * 0.4 + i * 0.9) * 0.3 + 0.5) * height;
            const alpha = 0.15 + Math.sin(time * 2 + i) * 0.05;
            const size = 3 + Math.sin(time * 0.7 + i) * 2;
            
            ctx.fillStyle = `rgba(88, 166, 255, ${alpha})`;
            ctx.shadowColor = 'rgba(88, 166, 255, 0.5)';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Secondary particle trail
        for (let i = 0; i < 8; i++) {
            const x = (Math.cos(time * 0.3 + i * 2.2) * 0.6 + 0.5) * width;
            const y = (Math.sin(time * 0.6 + i * 1.1) * 0.4 + 0.5) * height;
            const alpha = 0.08 + Math.cos(time * 1.5 + i) * 0.03;
            const size = 1.5 + Math.cos(time * 0.9 + i) * 1;
            
            ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
            ctx.shadowColor = 'rgba(168, 85, 247, 0.3)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
    }

    /**
     * Draw glassmorphic panel
     */
    drawGlassmorphicPanel(ctx, x, y, w, h, bg, border) {
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = bg;
        this.drawRoundedRect(ctx, x, y, w, h, 14);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = border;
        ctx.lineWidth = 1.5;
        this.drawRoundedRect(ctx, x, y, w, h, 14);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw rounded rectangle
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    /**
     * Draw modern tabs
     */
    drawModernTabs(ctx, width, y, hitAreas) {
        const tabs = [
            { id: 0, name: 'Audio', icon: '🔊', color: '#10b981' },
            { id: 1, name: 'Gameplay', icon: '🎮', color: '#3b82f6' },
            { id: 2, name: 'Graphics', icon: '🖥️', color: '#8b5cf6' },
            { id: 3, name: 'Data', icon: '💾', color: '#f59e0b' }
        ];
        
        const tabWidth = 140;
        const tabHeight = 50;
        const tabSpacing = 15;
        const totalWidth = (tabs.length * tabWidth) + ((tabs.length - 1) * tabSpacing);
        const startX = (width - totalWidth) / 2;
        
        tabs.forEach((tab, index) => {
            const tabX = startX + (index * (tabWidth + tabSpacing));
            const isSelected = this.activeTab === tab.id;
            
            // Tab background with glassmorphic effect
            let bgColor, borderColor;
            if (isSelected) {
                bgColor = `${tab.color}30`;
                borderColor = tab.color;
            } else {
                bgColor = 'rgba(255,255,255,0.05)';
                borderColor = 'rgba(255,255,255,0.2)';
            }
            
            this.drawGlassmorphicPanel(ctx, tabX, y, tabWidth, tabHeight, bgColor, borderColor);
            
            // Tab icon and text with glow effect
            ctx.save();
            if (isSelected) {
                ctx.shadowColor = tab.color;
                ctx.shadowBlur = 10;
            }
            
            // Icon
            ctx.font = '20px Courier New';
            ctx.fillStyle = isSelected ? tab.color : '#8b949e';
            ctx.textAlign = 'left';
            ctx.fillText(tab.icon, tabX + 15, y + 32);
            
            // Text
            ctx.font = isSelected ? 'bold 14px Courier New' : '14px Courier New';
            ctx.fillStyle = isSelected ? '#f0f6fc' : '#8b949e';
            ctx.fillText(tab.name, tabX + 45, y + 32);
            ctx.restore();
            
            // Hit area
            hitAreas.push({
                x: tabX,
                y: y,
                width: tabWidth,
                height: tabHeight,
                action: 'switchTab',
                tabId: tab.id
            });
        });
    }

    /**
     * Draw tab content
     */
    drawTabContent(ctx, width, startY, height, hitAreas) {
        switch (this.activeTab) {
            case 0: // Audio
                this.drawAudioTab(ctx, width, startY, height, hitAreas);
                break;
            case 1: // Gameplay
                this.drawGameplayTab(ctx, width, startY, height, hitAreas);
                break;
            case 2: // Graphics
                this.drawGraphicsTab(ctx, width, startY, height, hitAreas);
                break;
            case 3: // Data
                this.drawDataTab(ctx, width, startY, height, hitAreas);
                break;
        }
    }

    /**
     * Draw audio settings tab
     */
    drawAudioTab(ctx, width, startY, height, hitAreas) {
        const panelWidth = Math.min(800, width - 80);
        const panelX = (width - panelWidth) / 2;
        const panelY = startY + 20;
        const panelHeight = height - 40;
        
        // Main settings panel
        this.drawGlassmorphicPanel(ctx, panelX, panelY, panelWidth, panelHeight, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)');
        
        // Create clipping region for scrollable content
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX, panelY, panelWidth, panelHeight);
        ctx.clip();
        
        // Section title
        ctx.save();
        ctx.font = 'bold 24px Courier New';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.fillText('🔊 Audio', panelX + 30, panelY + 40 - this.scrollOffset);
        ctx.shadowBlur = 0;
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Sound and music settings', panelX + 30, panelY + 65 - this.scrollOffset);
        ctx.restore();
        
        // Audio controls
        this.drawAudioControls(ctx, panelX + 30, panelY + 100 - this.scrollOffset, panelWidth - 60, hitAreas);
        
        // Restore clipping
        ctx.restore();
        
        // Add scroll indicator if needed
        const totalContentHeight = 9 * 80; // Approximate total content height
        const availableHeight = panelHeight - 100;
        const maxScrollOffset = Math.max(0, totalContentHeight - availableHeight);
        
        if (maxScrollOffset > 0) {
            this.renderScrollIndicator(ctx, panelX + panelWidth - 15, panelY + 100, 6, panelHeight - 100, maxScrollOffset);
        }
    }

    /**
     * Draw gameplay settings tab
     */
    drawGameplayTab(ctx, width, startY, height, hitAreas) {
        const panelWidth = Math.min(800, width - 80);
        const panelX = (width - panelWidth) / 2;
        const panelY = startY + 20;
        const panelHeight = height - 40;
        
        // Main settings panel
        this.drawGlassmorphicPanel(ctx, panelX, panelY, panelWidth, panelHeight, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)');
        
        // Create clipping region for scrollable content
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX, panelY, panelWidth, panelHeight);
        ctx.clip();
        
        // Section title
        ctx.save();
        ctx.font = 'bold 24px Courier New';
        ctx.fillStyle = '#3b82f6';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 8;
        ctx.fillText('🎮 Gameplay', panelX + 30, panelY + 40 - this.scrollOffset);
        ctx.shadowBlur = 0;
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Game behavior and controls', panelX + 30, panelY + 65 - this.scrollOffset);
        ctx.restore();
        
        // Gameplay controls
        this.drawGameplayControls(ctx, panelX + 30, panelY + 100 - this.scrollOffset, panelWidth - 60, hitAreas);
        
        // Restore clipping
        ctx.restore();
        
        // Add scroll indicator if needed
        const totalContentHeight = 4 * 80; // Approximate total content height
        const availableHeight = panelHeight - 100;
        const maxScrollOffset = Math.max(0, totalContentHeight - availableHeight);
        
        if (maxScrollOffset > 0) {
            this.renderScrollIndicator(ctx, panelX + panelWidth - 15, panelY + 100, 6, panelHeight - 100, maxScrollOffset);
        }
    }

    /**
     * Draw graphics settings tab
     */
    drawGraphicsTab(ctx, width, startY, height, hitAreas) {
        const panelWidth = Math.min(800, width - 80);
        const panelX = (width - panelWidth) / 2;
        const panelY = startY + 20;
        const panelHeight = height - 40;
        
        // Main settings panel
        this.drawGlassmorphicPanel(ctx, panelX, panelY, panelWidth, panelHeight, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)');
        
        // Create clipping region for scrollable content
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX, panelY, panelWidth, panelHeight);
        ctx.clip();
        
        // Section title
        ctx.save();
        ctx.font = 'bold 24px Courier New';
        ctx.fillStyle = '#8b5cf6';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 8;
        ctx.fillText('🖥️ Graphics', panelX + 30, panelY + 40 - this.scrollOffset);
        ctx.shadowBlur = 0;
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Visual quality and performance', panelX + 30, panelY + 65 - this.scrollOffset);
        ctx.restore();
        
        // Graphics controls
        this.drawGraphicsControls(ctx, panelX + 30, panelY + 100 - this.scrollOffset, panelWidth - 60, hitAreas);
        
        // Restore clipping
        ctx.restore();
        
        // Add scroll indicator if needed
        const totalContentHeight = 5 * 80; // Approximate total content height
        const availableHeight = panelHeight - 100;
        const maxScrollOffset = Math.max(0, totalContentHeight - availableHeight);
        
        if (maxScrollOffset > 0) {
            this.renderScrollIndicator(ctx, panelX + panelWidth - 15, panelY + 100, 6, panelHeight - 100, maxScrollOffset);
        }
    }

    /**
     * Draw modern back button
     */
    drawModernBackButton(ctx, width, height, hitAreas) {
        const buttonWidth = 120;
        const buttonHeight = 45;
        const buttonX = 40;
        const buttonY = height - 60;
        const isHovered = this.hoveredItem?.action === 'back';
        
        // Button background with hover effect
        const bgColor = isHovered ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)';
        const borderColor = isHovered ? '#ef4444' : 'rgba(255,255,255,0.2)';
        
        this.drawGlassmorphicPanel(ctx, buttonX, buttonY, buttonWidth, buttonHeight, bgColor, borderColor);
        
        // Button content with glow on hover
        ctx.save();
        if (isHovered) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
        }
        
        // Icon
        ctx.font = '18px Courier New';
        ctx.fillStyle = isHovered ? '#ef4444' : '#8b949e';
        ctx.textAlign = 'left';
        ctx.fillText('⬅️', buttonX + 15, buttonY + 28);
        
        // Text
        ctx.font = 'bold 14px Courier New';
        ctx.fillStyle = isHovered ? '#f0f6fc' : '#8b949e';
        ctx.fillText('Back', buttonX + 45, buttonY + 28);
        ctx.restore();
        
        // Hit area
        hitAreas.push({
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            action: 'back'
        });
    }

    /**
     * Draw audio controls
     */
    drawAudioControls(ctx, x, y, width, hitAreas) {
        let currentY = y;
        const controlHeight = 60;
        const controlSpacing = 20;
        
        // Master Volume
        this.drawSliderControl(ctx, 'masterVolume', 'Master Volume', this.getMasterVolume(), 0, 1, 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Music Volume
        this.drawSliderControl(ctx, 'musicVolume', 'Music Volume', this.getMusicVolume(), 0, 1, 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Sound Effects Volume
        this.drawSliderControl(ctx, 'sfxVolume', 'Sound Effects', this.getSFXVolume(), 0, 1, 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // UI Sound Volume
        this.drawSliderControl(ctx, 'uiSoundVolume', 'UI Sound Volume', this.getUIVolumeByKey('uiSoundVolume'), 0, 1, 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Music Track Selection
        this.drawMusicTrackSelector(ctx, x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Music Shuffle toggle
        this.drawToggleControl(ctx, 'musicShuffle', 'Music Shuffle', this.getSettingByKey('musicShuffle'), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Crossfade Duration
        this.drawSliderControl(ctx, 'crossfadeDuration', 'Crossfade Duration', this.getSettingByKey('crossfadeDuration'), 0.5, 3, 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Mute when unfocused toggle
        this.drawToggleControl(ctx, 'muteWhenUnfocused', 'Mute When Unfocused', this.getMuteWhenUnfocused(), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Pause Music on Game Pause toggle
        this.drawToggleControl(ctx, 'pauseMusicOnGamePause', 'Pause Music on Game Pause', this.getSettingByKey('pauseMusicOnGamePause'), 
            x, currentY, width, controlHeight, hitAreas);
    }

    /**
     * Draw gameplay controls
     */
    drawGameplayControls(ctx, x, y, width, hitAreas) {
        let currentY = y;
        const controlHeight = 60;
        const controlSpacing = 20;
        
        // Auto-save toggle
        this.drawToggleControl(ctx, 'autoSave', 'Auto Save', this.getSettingByKey('autoSave'), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Auto-pause on focus loss toggle
        this.drawToggleControl(ctx, 'autoPauseOnFocusLoss', 'Auto-Pause on Focus Loss', this.getSettingByKey('autoPauseOnFocusLoss'), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Restart confirmation toggle
        this.drawToggleControl(ctx, 'restartConfirmation', 'Restart Confirmation', this.getSettingByKey('restartConfirmation'), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Death Animation Speed dropdown
        this.drawDropdownControl(ctx, 'deathAnimationSpeed', 'Death Animation Speed', this.getSettingByKey('deathAnimationSpeed'), 
            [
                { label: 'Slow', value: 'slow' },
                { label: 'Normal', value: 'normal' },
                { label: 'Fast', value: 'fast' }
            ], x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Show Loading Screen toggle
        this.drawToggleControl(ctx, 'showLoadingScreen', 'Show Loading Screen', this.getSettingByKey('showLoadingScreen'), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Show Opening Animation toggle
        this.drawToggleControl(ctx, 'showOpeningAnimation', 'Show Opening Animation', this.getSettingByKey('showOpeningAnimation'), 
            x, currentY, width, controlHeight, hitAreas);
    }

    /**
     * Draw graphics controls
     */
    drawGraphicsControls(ctx, x, y, width, hitAreas) {
        let currentY = y;
        const controlHeight = 60;
        const controlSpacing = 20;
        
        // Graphics Quality dropdown
        this.drawDropdownControl(ctx, 'graphicsQuality', 'Graphics Quality', this.getSettingByKey('graphicsQuality'), 
            [
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
                { label: 'Ultra', value: 'ultra' }
            ], x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Frame Rate Limit dropdown
        this.drawDropdownControl(ctx, 'frameRateLimit', 'Frame Rate Limit', this.getSettingByKey('frameRateLimit'), 
            [
                { label: '30 FPS', value: '30' },
                { label: '60 FPS', value: '60' },
                { label: '120 FPS', value: '120' },
                { label: '144 FPS', value: '144' },
                { label: 'Unlimited', value: 'unlimited' }
            ], x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // V-Sync toggle
        this.drawToggleControl(ctx, 'vsync', 'V-Sync', this.getSettingByKey('vsync'), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Performance Mode toggle
        this.drawToggleControl(ctx, 'performanceMode', 'Performance Mode', this.getSettingByKey('performanceMode'), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Show FPS Counter toggle
        this.drawToggleControl(ctx, 'showFPSCounter', 'Show FPS Counter', this.getSettingByKey('showFPSCounter'), 
            x, currentY, width, controlHeight, hitAreas);
    }

    /**
     * Draw data settings tab
     */
    drawDataTab(ctx, width, startY, height, hitAreas) {
        const panelWidth = Math.min(800, width - 80);
        const panelX = (width - panelWidth) / 2;
        const panelY = startY + 20;
        const panelHeight = height - 40;
        
        // Main settings panel
        this.drawGlassmorphicPanel(ctx, panelX, panelY, panelWidth, panelHeight, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)');
        
        // Create clipping region for scrollable content
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX, panelY, panelWidth, panelHeight);
        ctx.clip();
        
        // Section title
        ctx.save();
        ctx.font = 'bold 24px Courier New';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.fillText('💾 Data', panelX + 30, panelY + 40 - this.scrollOffset);
        ctx.shadowBlur = 0;
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('Save data and privacy settings', panelX + 30, panelY + 65 - this.scrollOffset);
        ctx.restore();
        
        // Data controls
        this.drawDataControls(ctx, panelX + 30, panelY + 100 - this.scrollOffset, panelWidth - 60, hitAreas);
        
        // Restore clipping
        ctx.restore();
        
        // Add scroll indicator if needed
        const totalContentHeight = 6 * 80; // Approximate total content height
        const availableHeight = panelHeight - 100;
        const maxScrollOffset = Math.max(0, totalContentHeight - availableHeight);
        
        if (maxScrollOffset > 0) {
            this.renderScrollIndicator(ctx, panelX + panelWidth - 15, panelY + 100, 6, panelHeight - 100, maxScrollOffset);
        }
    }

    /**
     * Draw data controls
     */
    drawDataControls(ctx, x, y, width, hitAreas) {
        let currentY = y;
        const controlHeight = 60;
        const controlSpacing = 20;
        
        // Cloud Save toggle
        this.drawToggleControl(ctx, 'cloudSave', 'Cloud Save', this.getSettingByKey('cloudSave'), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Local Backup toggle
        this.drawToggleControl(ctx, 'localBackup', 'Local Backup', this.getSettingByKey('localBackup'), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Submit Scores toggle
        this.drawToggleControl(ctx, 'submitScores', 'Submit Scores', this.getSettingByKey('submitScores'), 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Export Save Data button
        this.drawButtonControl(ctx, 'exportSaveData', 'Export Save Data', 'Export', 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Import Save Data button
        this.drawButtonControl(ctx, 'importSaveData', 'Import Save Data', 'Import', 
            x, currentY, width, controlHeight, hitAreas);
        currentY += controlHeight + controlSpacing;
        
        // Reset All Progress button (dangerous)
        this.drawButtonControl(ctx, 'resetAllProgress', 'Reset All Progress', 'Reset All', 
            x, currentY, width, controlHeight, hitAreas, true);
    }

    /**
     * Draw slider control
     */
    drawSliderControl(ctx, key, label, value, min, max, x, y, width, height, hitAreas) {
        const isHovered = this.hoveredItem === key;
        const sliderWidth = width - 200;
        const sliderHeight = 8;
        const sliderX = x + 200;
        const sliderY = y + height / 2 - sliderHeight / 2;
        
        // Control background
        const bgColor = isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
        this.drawGlassmorphicPanel(ctx, x, y, width, height, bgColor, 'rgba(255,255,255,0.1)');
        
        // Label
        ctx.save();
        ctx.font = '16px Courier New';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 20, y + height / 2 + 5);
        
        // Value display
        const displayValue = Math.round(value * 100) + '%';
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#8b949e';
        ctx.textAlign = 'right';
        ctx.fillText(displayValue, x + width - 20, y + height / 2 + 5);
        
        // Slider track
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this.drawRoundedRect(ctx, sliderX, sliderY, sliderWidth, sliderHeight, 4);
        ctx.fill();
        
        // Slider fill
        const fillWidth = (value - min) / (max - min) * sliderWidth;
        ctx.fillStyle = '#22c55e';
        this.drawRoundedRect(ctx, sliderX, sliderY, fillWidth, sliderHeight, 4);
        ctx.fill();
        
        // Slider handle
        const handleX = sliderX + fillWidth - 8;
        const handleY = sliderY - 4;
        const handleSize = 16;
        
        ctx.fillStyle = '#f0f6fc';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(handleX + 8, handleY + 8, handleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        
        // Hit area
        hitAreas.push({
            x: sliderX,
            y: y,
            width: sliderWidth,
            height: height,
            action: 'slider',
            key: key,
            min: min,
            max: max
        });
    }

    /**
     * Draw toggle control
     */
    drawToggleControl(ctx, key, label, value, x, y, width, height, hitAreas) {
        const isHovered = this.hoveredItem === key;
        const toggleWidth = 50;
        const toggleHeight = 24;
        const toggleX = x + width - 70;
        const toggleY = y + height / 2 - toggleHeight / 2;
        
        // Control background
        const bgColor = isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
        this.drawGlassmorphicPanel(ctx, x, y, width, height, bgColor, 'rgba(255,255,255,0.1)');
        
        // Label
        ctx.save();
        ctx.font = '16px Courier New';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 20, y + height / 2 + 5);
        
        // Toggle background
        ctx.fillStyle = value ? '#22c55e' : 'rgba(255,255,255,0.2)';
        this.drawRoundedRect(ctx, toggleX, toggleY, toggleWidth, toggleHeight, 12);
        ctx.fill();
        
        // Toggle handle
        const handleSize = 18;
        const handleX = value ? toggleX + toggleWidth - handleSize - 3 : toggleX + 3;
        const handleY = toggleY + 3;
        
        ctx.fillStyle = '#f0f6fc';
        ctx.shadowColor = value ? '#22c55e' : 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(handleX + handleSize / 2, handleY + handleSize / 2, handleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        
        // Hit area
        hitAreas.push({
            x: toggleX,
            y: y,
            width: toggleWidth,
            height: height,
            action: 'toggle',
            key: key
        });
    }

    /**
     * Draw dropdown control
     */
    drawDropdownControl(ctx, key, label, value, options, x, y, width, height, hitAreas) {
        const isHovered = this.hoveredItem === key;
        const isExpanded = this.expandedDropdown === key;
        const dropdownWidth = 200;
        const dropdownHeight = 35;
        const dropdownX = x + width - dropdownWidth - 20;
        const dropdownY = y + height / 2 - dropdownHeight / 2;
        
        // Control background
        const bgColor = isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
        this.drawGlassmorphicPanel(ctx, x, y, width, height, bgColor, 'rgba(255,255,255,0.1)');
        
        // Label
        ctx.save();
        ctx.font = '16px Courier New';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 20, y + height / 2 + 5);
        
        // Dropdown background
        const dropdownBgColor = isExpanded ? 'rgba(88,166,255,0.15)' : 'rgba(255,255,255,0.1)';
        const dropdownBorderColor = isExpanded ? 'rgba(88,166,255,0.5)' : 'rgba(255,255,255,0.2)';
        this.drawGlassmorphicPanel(ctx, dropdownX, dropdownY, dropdownWidth, dropdownHeight, dropdownBgColor, dropdownBorderColor);
        
        // Current value
        const currentOption = options.find(opt => opt.value === value);
        const displayText = currentOption ? currentOption.label : value;
        
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'left';
        ctx.fillText(displayText, dropdownX + 15, dropdownY + dropdownHeight / 2 + 5);
        
        // Dropdown arrow
        ctx.font = '12px Courier New';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(isExpanded ? '▲' : '▼', dropdownX + dropdownWidth - 15, dropdownY + dropdownHeight / 2 + 4);
        
        ctx.restore();
        
        // Hit area
        hitAreas.push({
            x: dropdownX,
            y: dropdownY,
            width: dropdownWidth,
            height: dropdownHeight,
            action: 'dropdown',
            key: key
        });
        
        // Draw expanded options
        if (isExpanded) {
            const optionHeight = 30;
            const expandedHeight = options.length * optionHeight;
            const expandedY = dropdownY + dropdownHeight + 2;
            
            // Expanded dropdown background
            this.drawGlassmorphicPanel(ctx, dropdownX, expandedY, dropdownWidth, expandedHeight, 
                'rgba(30,30,30,0.95)', 'rgba(88,166,255,0.8)');
            
            // Render each option
            options.forEach((option, index) => {
                const optionY = expandedY + (index * optionHeight);
                const isCurrentOption = option.value === value;
                const isHoveredOption = this.hoveredItem === `${key}_option_${index}`;
                
                // Option background
                if (isHoveredOption) {
                    this.drawGlassmorphicPanel(ctx, dropdownX + 2, optionY + 1, dropdownWidth - 4, optionHeight - 2, 
                        'rgba(88,166,255,0.2)', 'rgba(88,166,255,0.4)');
                }
                
                // Option text
                ctx.save();
                ctx.font = isCurrentOption ? 'bold 14px Courier New' : '14px Courier New';
                ctx.fillStyle = isCurrentOption ? '#22c55e' : '#f0f6fc';
                ctx.textAlign = 'left';
                ctx.fillText(option.label, dropdownX + 15, optionY + optionHeight / 2 + 5);
                ctx.restore();
                
                // Option hit area
                hitAreas.push({
                    x: dropdownX,
                    y: optionY,
                    width: dropdownWidth,
                    height: optionHeight,
                    action: 'dropdown-option',
                    key: key,
                    value: option.value
                });
            });
        }
    }

    /**
     * Draw button control
     */
    drawButtonControl(ctx, key, label, buttonText, x, y, width, height, hitAreas, dangerous = false) {
        const isHovered = this.hoveredItem === key;
        const buttonWidth = 120;
        const buttonHeight = 35;
        const buttonX = x + width - buttonWidth - 20;
        const buttonY = y + height / 2 - buttonHeight / 2;
        
        // Control background
        const bgColor = isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
        this.drawGlassmorphicPanel(ctx, x, y, width, height, bgColor, 'rgba(255,255,255,0.1)');
        
        // Label
        ctx.save();
        ctx.font = '16px Courier New';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 20, y + height / 2 + 5);
        
        // Button background
        let buttonBgColor, buttonBorderColor, buttonTextColor;
        if (dangerous) {
            buttonBgColor = isHovered ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.1)';
            buttonBorderColor = isHovered ? '#ef4444' : 'rgba(239,68,68,0.5)';
            buttonTextColor = isHovered ? '#f0f6fc' : '#ef4444';
        } else {
            buttonBgColor = isHovered ? 'rgba(88,166,255,0.3)' : 'rgba(88,166,255,0.1)';
            buttonBorderColor = isHovered ? '#58a6ff' : 'rgba(88,166,255,0.5)';
            buttonTextColor = isHovered ? '#f0f6fc' : '#58a6ff';
        }
        
        this.drawGlassmorphicPanel(ctx, buttonX, buttonY, buttonWidth, buttonHeight, buttonBgColor, buttonBorderColor);
        
        // Button text
        ctx.font = 'bold 14px Courier New';
        ctx.fillStyle = buttonTextColor;
        ctx.textAlign = 'center';
        if (isHovered && dangerous) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
        } else if (isHovered) {
            ctx.shadowColor = '#58a6ff';
            ctx.shadowBlur = 8;
        }
        ctx.fillText(buttonText, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 5);
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Hit area
        hitAreas.push({
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            action: 'button',
            key: key
        });
    }

    /**
     * Initialize particles
     */
    initializeParticles() {
        this.particles = [];
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: Math.random(),
                y: Math.random(),
                vx: (Math.random() - 0.5) * 0.002,
                vy: (Math.random() - 0.5) * 0.002,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.3 + 0.1,
                color: Math.random() > 0.5 ? '#58a6ff' : '#a855f7'
            });
        }
    }

    /**
     * Update particles
     */
    updateParticles() {
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around screen
            if (particle.x < 0) particle.x = 1;
            if (particle.x > 1) particle.x = 0;
            if (particle.y < 0) particle.y = 1;
            if (particle.y > 1) particle.y = 0;
            
            // Pulse opacity
            particle.opacity = 0.1 + Math.sin(this.animationTime * 2 + particle.x * 10) * 0.2;
        });
    }

    // Getter methods for settings values
    getMasterVolume() { 
        return this.gameInstance?.audioSystem?.masterVolume || 0.7; 
    }
    getMusicVolume() { 
        return this.gameInstance?.audioSystem?.musicVolume || 0.5; 
    }
    getSFXVolume() { 
        return this.gameInstance?.audioSystem?.sfxVolume || 0.8; 
    }
    getMuteWhenUnfocused() { 
        return this.gameInstance?.audioSystem?.muteWhenUnfocused || false; 
    }
    getSelectedTrack() {
        return this.gameInstance?.audioSystem?.selectedTrack || '';
    }
    getCurrentTrack() {
        const audioSystem = this.gameInstance?.audioSystem;
        if (!audioSystem) return null;
        
        const tracks = audioSystem.getAvailableTracks?.() || [];
        return tracks.find(track => track.filename === audioSystem.selectedTrack) || tracks[0];
    }
    getAvailableTracks() {
        return this.gameInstance?.audioSystem?.getAvailableTracks?.() || [];
    }
    getShowFPS() { return this.gameInstance?.showFPS || false; }
    getAutoSave() { return this.gameInstance?.autoSave || true; }
    getDifficulty() { return this.gameInstance?.difficulty || 2; }
    getParticleEffects() { return this.gameInstance?.particleEffects || true; }
    getScreenShake() { return this.gameInstance?.screenShake || true; }
    getVisualQuality() { return this.gameInstance?.visualQuality || 2; }

    /**
     * Handle click events for settings
     */
    handleSettingsClick(action, data) {
        switch (action) {
            case 'switchTab':
                this.activeTab = data.tabId;
                break;
            case 'slider':
                this.handleSliderChange(data.key, data.value);
                break;
            case 'toggle':
                this.handleToggleChange(data.key);
                break;
            case 'dropdown':
                this.handleDropdownToggle(data.key);
                break;
            case 'selectTrack':
                this.handleTrackSelection(data.trackFilename);
                break;
            case 'back':
                // Handle back button
                if (this.gameInstance) {
                    this.gameInstance.currentScreen = 'main';
                }
                break;
        }
    }

    /**
     * Handle slider value changes
     */
    handleSliderChange(key, value) {
        console.log('🎛️ Settings slider change:', key, value);
        
        // Update the setting value first
        this.setSettingValue(key, value);
        
        // Apply the setting to the game
        if (this.gameInstance?.audioSystem) {
            switch (key) {
                case 'masterVolume':
                    this.gameInstance.audioSystem.setMasterVolume(value);
                    break;
                case 'musicVolume':
                    this.gameInstance.audioSystem.setMusicVolume(value);
                    break;
                case 'sfxVolume':
                    this.gameInstance.audioSystem.setSfxVolume(value);
                    break;
                case 'uiSoundVolume':
                    // Use SFX volume as UI sound volume since there's no separate method
                    this.gameInstance.audioSystem.setSfxVolume(value);
                    break;
                case 'crossfadeDuration':
                    // Store this setting for use in audio transitions
                    this.gameInstance.audioSystem.crossfadeDuration = value;
                    break;
            }
        }
        
        // Apply graphics settings
        if (this.gameInstance) {
            switch (key) {
                case 'graphicsQuality':
                    this.gameInstance.graphicsQuality = value;
                    if (this.gameInstance.applyGraphicsQuality) {
                        this.gameInstance.applyGraphicsQuality();
                    }
                    break;
                case 'frameRateLimit':
                    this.gameInstance.frameRateLimit = value;
                    break;
                case 'vsync':
                    this.gameInstance.vsync = value;
                    break;
                case 'performanceMode':
                    this.gameInstance.performanceMode = value;
                    break;
            }
        }
        
        console.log('✅ Setting applied:', key, value);
    }

    /**
     * Handle toggle changes
     */
    handleToggleChange(key) {
        console.log('🔄 Settings toggle change:', key);
        
        // Get current value and toggle it
        const currentValue = this.getSettingValue(key);
        const newValue = !currentValue;
        
        // Update the setting value
        this.setSettingValue(key, newValue);
        
        // Apply the setting to the game
        if (this.gameInstance) {
            switch (key) {
                case 'muteWhenUnfocused':
                    if (this.gameInstance.audioSystem) {
                        this.gameInstance.audioSystem.muteWhenUnfocused = newValue;
                        this.gameInstance.audioSystem.saveSettings();
                    }
                    break;
                case 'musicShuffle':
                    if (this.gameInstance.audioSystem) {
                        this.gameInstance.audioSystem.musicShuffle = newValue;
                        this.gameInstance.audioSystem.saveSettings();
                    }
                    break;
                case 'pauseMusicOnGamePause':
                    if (this.gameInstance.audioSystem) {
                        this.gameInstance.audioSystem.pauseMusicOnGamePause = newValue;
                        this.gameInstance.audioSystem.saveSettings();
                    }
                    break;
                case 'autoSave':
                    this.gameInstance.autoSave = newValue;
                    break;
                case 'autoPauseOnFocusLoss':
                    this.gameInstance.autoPauseOnFocusLoss = newValue;
                    break;
                case 'restartConfirmation':
                    this.gameInstance.restartConfirmation = newValue;
                    break;
                case 'showLoadingScreen':
                    this.gameInstance.showLoadingScreen = newValue;
                    break;
                case 'showOpeningAnimation':
                    this.gameInstance.showOpeningAnimation = newValue;
                    break;
                case 'vsync':
                    this.gameInstance.vsync = newValue;
                    break;
                case 'performanceMode':
                    this.gameInstance.performanceMode = newValue;
                    if (this.gameInstance.applyPerformanceMode) {
                        this.gameInstance.applyPerformanceMode();
                    }
                    break;
                case 'showFPSCounter':
                    this.gameInstance.showFpsCounter = newValue;
                    break;
                case 'cloudSave':
                    this.gameInstance.cloudSave = newValue;
                    this.syncToCloud();
                    break;
                case 'localBackup':
                    this.gameInstance.localBackup = newValue;
                    break;
                case 'submitScores':
                    this.gameInstance.submitScores = newValue;
                    break;
                // Legacy support
                case 'particleEffects':
                    this.gameInstance.particleEffects = newValue;
                    break;
                case 'screenShake':
                    this.gameInstance.screenShake = newValue;
                    break;
                case 'showFPS':
                    this.gameInstance.showFPS = newValue;
                    break;
            }
        }
        
        console.log('✅ Toggle setting applied:', key, newValue);
    }

    /**
     * Handle dropdown toggle
     */
    handleDropdownToggle(key) {
        if (this.expandedDropdown === key) {
            this.expandedDropdown = null;
        } else {
            this.expandedDropdown = key;
        }
    }

    /**
     * Handle dropdown value changes
     */
    handleDropdownChange(key, value) {
        console.log('📝 Settings dropdown change:', key, value);
        
        // Update the setting value
        this.setSettingValue(key, value);
        
        // Apply the setting to the game
        if (this.gameInstance) {
            switch (key) {
                case 'musicTrack':
                    if (this.gameInstance.audioSystem && this.gameInstance.audioSystem.switchTrack) {
                        this.gameInstance.audioSystem.switchTrack(value);
                    }
                    break;
                case 'deathAnimationSpeed':
                    this.gameInstance.deathAnimationSpeed = value;
                    break;
                case 'graphicsQuality':
                    this.gameInstance.graphicsQuality = value;
                    if (this.gameInstance.applyGraphicsQuality) {
                        this.gameInstance.applyGraphicsQuality();
                    }
                    break;
                case 'frameRateLimit':
                    this.gameInstance.frameRateLimit = value;
                    if (this.gameInstance.applyFrameRateLimit) {
                        this.gameInstance.applyFrameRateLimit();
                    }
                    break;
            }
        }
        
        console.log('✅ Dropdown setting applied:', key, value);
    }

    /**
     * Handle track selection
     */
    handleTrackSelection(trackFilename) {
        console.log('🎵 Track selected:', trackFilename);
        this.handleDropdownChange('musicTrack', trackFilename);
        this.expandedDropdown = null; // Close dropdown after selection
    }

    /**
     * Handle button actions
     */
    handleButtonAction(key) {
        console.log('🔘 Button action:', key);
        
        switch (key) {
            case 'exportSaveData':
                this.exportSaveData();
                break;
            case 'importSaveData':
                this.importSaveData();
                break;
            case 'resetAllProgress':
                this.resetAllProgress();
                break;
            default:
                console.warn('Unknown button action:', key);
        }
    }

    /**
     * Export save data
     */
    exportSaveData() {
        try {
            const saveData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                settings: this.getAllSettings(),
                gameData: this.gameInstance?.saveSystem?.exportData() || {}
            };
            
            const dataStr = JSON.stringify(saveData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `coderunner_save_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            console.log('✅ Save data exported successfully');
        } catch (error) {
            console.error('❌ Failed to export save data:', error);
        }
    }

    /**
     * Import save data
     */
    importSaveData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const saveData = JSON.parse(e.target.result);
                        
                        // Import settings
                        if (saveData.settings) {
                            this.importSettings(saveData.settings);
                        }
                        
                        // Import game data
                        if (saveData.gameData && this.gameInstance?.saveSystem?.importData) {
                            this.gameInstance.saveSystem.importData(saveData.gameData);
                        }
                        
                        console.log('✅ Save data imported successfully');
                        this.showImportSuccessMessage();
                    } catch (error) {
                        console.error('❌ Failed to import save data:', error);
                        this.showImportErrorMessage();
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    /**
     * Reset all progress
     */
    resetAllProgress() {
        if (confirm('Are you sure you want to reset ALL progress? This action cannot be undone!')) {
            if (confirm('This will delete all your save data, settings, and achievements. Are you absolutely sure?')) {
                try {
                    // Reset settings to defaults
                    this.resetSettingsToDefaults();
                    
                    // Reset game data
                    if (this.gameInstance?.saveSystem?.resetAllData) {
                        this.gameInstance.saveSystem.resetAllData();
                    }
                    
                    // Clear localStorage
                    localStorage.removeItem('coderunner_settings');
                    localStorage.removeItem('coderunner_save');
                    
                    console.log('✅ All progress reset successfully');
                    this.showResetSuccessMessage();
                } catch (error) {
                    console.error('❌ Failed to reset progress:', error);
                }
            }
        }
    }

    /**
     * Get all settings as an object
     */
    getAllSettings() {
        const settings = {};
        this.settingsCategories.forEach(category => {
            category.settings.forEach(setting => {
                // Only include settings that have a value property (exclude buttons)
                if (setting.hasOwnProperty('value') && setting.value !== undefined) {
                    settings[setting.key] = setting.value;
                }
            });
        });
        return settings;
    }

    /**
     * Import settings from an object
     */
    importSettings(settings) {
        this.settingsCategories.forEach(category => {
            category.settings.forEach(setting => {
                // Only import settings that have a value property and the imported value is not undefined
                if (setting.hasOwnProperty('value') && 
                    settings.hasOwnProperty(setting.key) && 
                    settings[setting.key] !== undefined) {
                    setting.value = settings[setting.key];
                }
            });
        });
        this.saveSettings();
        this.applySettingsToGame();
    }

    /**
     * Reset settings to defaults
     */
    resetSettingsToDefaults() {
        this.settingsCategories.forEach(category => {
            category.settings.forEach(setting => {
                // Reset to default value (the initial value in the definition)
                switch (setting.key) {
                    case 'masterVolume':
                        setting.value = 0.7;
                        break;
                    case 'musicVolume':
                        setting.value = 0.5;
                        break;
                    case 'sfxVolume':
                        setting.value = 0.8;
                        break;
                    case 'uiSoundVolume':
                        setting.value = 0.8;
                        break;
                    case 'crossfadeDuration':
                        setting.value = 1.5;
                        break;
                    case 'graphicsQuality':
                        setting.value = 'medium';
                        break;
                    case 'frameRateLimit':
                        setting.value = '60';
                        break;
                    default:
                        // For most settings, use the default value defined in the settings
                        if (setting.hasOwnProperty('defaultValue')) {
                            setting.value = setting.defaultValue;
                        }
                }
            });
        });
        this.saveSettings();
        this.applySettingsToGame();
    }

    /**
     * Show import success message
     */
    showImportSuccessMessage() {
        // You can implement a toast or notification system here
        console.log('📥 Import successful!');
    }

    /**
     * Show import error message
     */
    showImportErrorMessage() {
        // You can implement a toast or notification system here
        console.error('📥 Import failed!');
    }

    /**
     * Show reset success message
     */
    showResetSuccessMessage() {
        // You can implement a toast or notification system here
        console.log('🔄 Reset successful!');
    }

    /**
     * Render settings content for active category
     */
    renderSettingsContent(ctx, x, y, width, height, hitAreas) {
        const category = this.settingsCategories[this.activeTab];
        if (!category) return;
        
        ctx.save();
        
        // Category header
        ctx.fillStyle = category.color;
        ctx.font = 'bold 24px "SF Pro Display", -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${category.icon} ${category.title}`, x, y + 24);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '14px "SF Pro Display", -apple-system, system-ui, sans-serif';
        ctx.fillText(category.description, x, y + 48);
        
        // Settings list
        let currentY = y + 80 - this.scrollOffset;
        const settingHeight = 80;
        const settingSpacing = 20;
        const totalSettings = category.settings.length;
        const totalContentHeight = totalSettings * (settingHeight + settingSpacing) - settingSpacing;
        const availableHeight = height - 80 - 40; // Account for header and scroll hint
        const maxScrollOffset = Math.max(0, totalContentHeight - availableHeight);
        
        // Smooth scroll interpolation
        const scrollSpeed = 0.15; // Lower = smoother, higher = faster
        this.scrollOffset += (this.targetScrollOffset - this.scrollOffset) * scrollSpeed;
        
        // Clamp scroll offset to valid range
        this.targetScrollOffset = Math.max(0, Math.min(this.targetScrollOffset, maxScrollOffset));
        this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScrollOffset));
        
        // Create clipping region for scrollable content
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y + 80, width, height - 80);
        ctx.clip();
        
        category.settings.forEach((setting, index) => {
            const animationProgress = Math.min(1, (this.sectionsAnimationProgress - index * 0.1));
            if (animationProgress <= 0) return;
            
            ctx.globalAlpha = animationProgress;
            
            const settingX = x + (1 - animationProgress) * 30;
            const isHovered = this.hoveredItem === `setting_${this.activeTab}_${index}`;
            
            // Setting background
            ctx.fillStyle = isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)';
            this.roundRect(ctx, settingX, currentY, width - (settingX - x), settingHeight - 10, 12);
            ctx.fill();
            
            // Setting label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "SF Pro Display", -apple-system, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(setting.label, settingX + 20, currentY + 25);
            
            // Setting description
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = '12px "SF Pro Display", -apple-system, system-ui, sans-serif';
            ctx.fillText(setting.description, settingX + 20, currentY + 44);
            
            // Setting control
            this.renderSettingControl(ctx, setting, settingX + width - 250, currentY + 15, 200, 50, hitAreas);
            
            // Add hit area for hover detection (clipped to content area)
            const clippedY = Math.max(currentY, y);
            const clippedBottom = Math.min(currentY + settingHeight - 10, y + height);
            const clippedHeight = Math.max(0, clippedBottom - clippedY);
            
            if (clippedHeight > 0) {
                hitAreas.push({
                    x: settingX,
                    y: clippedY,
                    width: width - (settingX - x),
                    height: clippedHeight,
                    action: 'hover',
                    settingId: `setting_${this.activeTab}_${index}`,
                    setting: setting
                });
            }
            
            currentY += settingHeight + settingSpacing;
        });
        
        // Restore clipping for settings content
        ctx.restore();
        
        // Render scroll indicator if needed
        if (maxScrollOffset > 0) {
            this.renderScrollIndicator(ctx, x + width - 10, y + 80, 6, height - 80, maxScrollOffset);
            
            // Add scroll hint text at the bottom
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '12px "SF Pro Display", -apple-system, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Scroll to see more options', x + width / 2, y + height - 10);
        }
        
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    
    /**
     * Render scroll indicator
     */
    renderScrollIndicator(ctx, x, y, width, height, maxScroll) {
        // Background track
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, x, y, width, height, width / 2);
        ctx.fill();
        
        // Scroll thumb
        const thumbHeight = Math.max(20, height * (height / (height + maxScroll)));
        const thumbProgress = maxScroll > 0 ? this.scrollOffset / maxScroll : 0;
        const thumbY = y + thumbProgress * (height - thumbHeight);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.roundRect(ctx, x, thumbY, width, thumbHeight, width / 2);
        ctx.fill();
    }
    
    /**
     * Render individual setting controls
     */
    renderSettingControl(ctx, setting, x, y, width, height, hitAreas) {
        switch (setting.type) {
            case 'slider':
                this.renderSlider(ctx, setting, x, y, width, height, hitAreas);
                break;
            case 'toggle':
                this.renderToggle(ctx, setting, x + width - 60, y + 10, 50, 30, hitAreas);
                break;
            case 'dropdown':
                this.renderDropdown(ctx, setting, x, y + 10, width, 30, hitAreas);
                break;
            case 'key':
                this.renderKeyCapture(ctx, setting, x, y + 10, width, 30, hitAreas);
                break;
        }
    }
    
    /**
     * Render slider control
     */
    renderSlider(ctx, setting, x, y, width, height, hitAreas) {
        const sliderWidth = width - 80;
        const sliderHeight = 6;
        const sliderY = y + height / 2 - sliderHeight / 2;
        
        // Slider track
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.roundRect(ctx, x, sliderY, sliderWidth, sliderHeight, sliderHeight / 2);
        ctx.fill();
        
        // Slider fill
        const progress = (setting.value - setting.min) / (setting.max - setting.min);
        ctx.fillStyle = this.settingsCategories[this.activeTab].color;
        this.roundRect(ctx, x, sliderY, sliderWidth * progress, sliderHeight, sliderHeight / 2);
        ctx.fill();
        
        // Slider handle
        const handleX = x + sliderWidth * progress - 8;
        const handleY = sliderY - 4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(handleX + 8, handleY + 7, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Value display
        let displayValue = setting.value;
        if (setting.showPercentage) {
            displayValue = Math.round(setting.value * 100) + '%';
        } else if (setting.showMultiplier) {
            displayValue = setting.value.toFixed(2) + 'x';
        } else if (setting.showValue) {
            displayValue = setting.value.toString();
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '12px "SF Pro Display", -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(displayValue, x + sliderWidth + 10, sliderY + 10);
        
        // Add hit area
        hitAreas.push({
            x: x,
            y: sliderY - 10,
            width: sliderWidth,
            height: sliderHeight + 20,
            action: 'slider',
            setting: setting
        });
    }
    
    /**
     * Render toggle control
     */
    renderToggle(ctx, setting, x, y, width, height, hitAreas) {
        const isOn = setting.value;
        
        // Toggle background
        ctx.fillStyle = isOn ? this.settingsCategories[this.activeTab].color : 'rgba(255, 255, 255, 0.2)';
        this.roundRect(ctx, x, y, width, height, height / 2);
        ctx.fill();
        
        // Toggle circle
        const circleRadius = height / 2 - 4;
        const circleX = isOn ? x + width - height / 2 : x + height / 2;
        const circleY = y + height / 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add hit area
        hitAreas.push({
            x: x,
            y: y,
            width: width,
            height: height,
            action: 'toggle',
            setting: setting
        });
    }
    
    /**
     * Render dropdown control
     */
    renderDropdown(ctx, setting, x, y, width, height, hitAreas) {
        const isExpanded = this.expandedDropdown === setting.key;
        
        // Dropdown background
        ctx.fillStyle = isExpanded ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, x, y, width, height, 8);
        ctx.fill();
        
        ctx.strokeStyle = isExpanded ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isExpanded ? 2 : 1;
        ctx.stroke();
        
        // Current value
        const currentOption = setting.options.find(opt => opt.value === setting.value);
        const displayText = currentOption ? currentOption.label : setting.value;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px "SF Pro Display", -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(displayText, x + 12, y + height / 2 + 5);
        
        // Dropdown arrow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        const arrowText = isExpanded ? '▲' : '▼';
        ctx.fillText(arrowText, x + width - 15, y + height / 2 + 4);
        
        ctx.restore();
        
        // Hit area
        hitAreas.push({
            x: x,
            y: y,
            width: width,
            height: height,
            action: 'dropdown',
            setting: setting
        });
        
        // Render expanded options
        if (isExpanded) {
            const optionHeight = 32;
            const expandedHeight = setting.options.length * optionHeight;
            const expandedY = y + height + 2;
            
            // Expanded dropdown background
            ctx.fillStyle = 'rgba(30, 30, 30, 0.95)';
            this.roundRect(ctx, x, expandedY, width, expandedHeight, 8);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Render each option
            setting.options.forEach((option, index) => {
                const optionY = expandedY + (index * optionHeight);
                const isCurrentOption = option.value === setting.value;
                const isHovered = this.hoveredItem === `${setting.key}_option_${index}`;
                
                // Option background
                if (isHovered) {
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
                    this.roundRect(ctx, x + 2, optionY + 2, width - 4, optionHeight - 4, 6);
                    ctx.fill();
                } else if (isCurrentOption) {
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
                    this.roundRect(ctx, x + 2, optionY + 2, width - 4, optionHeight - 4, 6);
                    ctx.fill();
                }
                
                // Option text
                ctx.fillStyle = isCurrentOption ? '#22c55e' : '#ffffff';
                ctx.font = '14px "SF Pro Display", -apple-system, system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(option.label, x + 12, optionY + optionHeight / 2 + 5);
                
                // Checkmark for current option
                if (isCurrentOption) {
                    ctx.fillStyle = '#22c55e';
                    ctx.font = '12px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('✓', x + width - 15, optionY + optionHeight / 2 + 4);
                }
                
                // Add hit area for option
                hitAreas.push({
                    x: x,
                    y: optionY,
                    width: width,
                    height: optionHeight,
                    action: 'dropdown-option',
                    setting: setting,
                    option: option
                });
            });
        }
    }
    
    /**
     * Render key capture control
     */
    renderKeyCapture(ctx, setting, x, y, width, height, hitAreas) {
        const isCapturing = this.keyCaptureSetting === setting;
        
        // Key background
        ctx.fillStyle = isCapturing ? 'rgba(255, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, x, y, width, height, 8);
        ctx.fill();
        
        ctx.strokeStyle = isCapturing ? '#ffff00' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Key text
        const keyText = isCapturing ? 'Press a key...' : setting.value;
        ctx.fillStyle = isCapturing ? '#ffff00' : '#ffffff';
        ctx.font = '14px "SF Pro Display", -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(keyText, x + width / 2, y + height / 2 + 5);
        
        // Add hit area
        hitAreas.push({
            x: x,
            y: y,
            width: width,
            height: height,
            action: 'key',
            setting: setting
        });
    }
    
    /**
     * Render control buttons
     */
    renderControlButtons(ctx, x, y, width, hitAreas) {
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonSpacing = 20;
        const totalButtonWidth = buttonWidth; // Only one button now
        const buttonsStartX = x + width / 2 - totalButtonWidth / 2;
        
        const buttons = [
            { label: 'Back', action: 'back', color: '#6b7280' }
        ];
        
        buttons.forEach((button, index) => {
            const buttonX = buttonsStartX + index * (buttonWidth + buttonSpacing);
            const isHovered = this.hoveredItem === `button_${button.action}`;
            
            // Button background
            ctx.fillStyle = isHovered ? `${button.color}CC` : `${button.color}88`;
            this.roundRect(ctx, buttonX, y, buttonWidth, buttonHeight, 12);
            ctx.fill();
            
            // Button text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px "SF Pro Display", -apple-system, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(button.label, buttonX + buttonWidth / 2, y + buttonHeight / 2 + 5);
            
            // Add hit area - INSERT AT BEGINNING for priority
            hitAreas.unshift({
                x: buttonX,
                y: y,
                width: buttonWidth,
                height: buttonHeight,
                action: button.action
            });
        });
    }
    
    /**
     * Render tooltip
     */
    renderTooltip(ctx, tooltip) {
        const padding = 12;
        const maxWidth = 300;
        
        // Measure text
        ctx.font = '12px "SF Pro Display", -apple-system, system-ui, sans-serif';
        const lines = this.wrapText(ctx, tooltip.description, maxWidth - padding * 2);
        const lineHeight = 16;
        const tooltipHeight = lines.length * lineHeight + padding * 2;
        
        // Position tooltip
        let tooltipX = tooltip.x + tooltip.width + 10;
        let tooltipY = tooltip.y;
        
        // Adjust if tooltip goes off screen
        if (tooltipX + maxWidth > 1920) {
            tooltipX = tooltip.x - maxWidth - 10;
        }
        if (tooltipY + tooltipHeight > 1080) {
            tooltipY = 1080 - tooltipHeight - 10;
        }
        
        // Tooltip background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.roundRect(ctx, tooltipX, tooltipY, maxWidth, tooltipHeight, 8);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Tooltip text
        ctx.fillStyle = '#ffffff';
        lines.forEach((line, index) => {
            ctx.fillText(line, tooltipX + padding, tooltipY + padding + (index + 1) * lineHeight);
        });
    }
    
    /**
     * Render save confirmation
     */
    renderSaveConfirmation(ctx, width, height) {
        const message = 'Settings Saved!';
        const padding = 20;
        
        ctx.font = 'bold 16px "SF Pro Display", -apple-system, system-ui, sans-serif';
        const textWidth = ctx.measureText(message).width;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = 50;
        
        const x = width / 2 - boxWidth / 2;
        const y = height - 100;
        
        // Confirmation background
        ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
        this.roundRect(ctx, x, y, boxWidth, boxHeight, 12);
        ctx.fill();
        
        // Confirmation text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(message, width / 2, y + boxHeight / 2 + 6);
    }
    
    /**
     * Helper function to draw rounded rectangles
     */
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    /**
     * Helper function to wrap text
     */
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];
        
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }
    
    /**
     * Enhanced mouse movement handling with tooltip system
     */
    handleMouseMove(x, y, hitAreas) {
        // Update hover state
        this.hoveredItem = null;
        
        for (const area of hitAreas) {
            if (x >= area.x && x <= area.x + area.width && 
                y >= area.y && y <= area.y + area.height) {
                
                // Set hover state based on action type
                if (area.action === 'back') {
                    this.hoveredItem = { action: 'back' };
                } else if (area.action === 'switchTab') {
                    this.hoveredItem = { action: 'switchTab', tabId: area.tabId };
                } else if (area.key) {
                    this.hoveredItem = area.key;
                }
                
                break;
            }
        }
    }
    
    /**
     * Enhanced click handling with support for all new features
     */
    handleClick(x, y, hitAreas) {
        console.log('🎯 SettingsSystem handleClick called with:', {
            x, y, 
            hitAreasCount: hitAreas.length,
            hitAreas: hitAreas.map(area => ({
                x: area.x,
                y: area.y,
                width: area.width,
                height: area.height,
                action: area.action,
                key: area.key
            }))
        });
        
        for (const area of hitAreas) {
            if (x >= area.x && x <= area.x + area.width && 
                y >= area.y && y <= area.y + area.height) {
                
                console.log('🎯 Hit area found:', area);
                
                if (this.gameInstance?.audioSystem) {
                    this.gameInstance.audioSystem.onMenuClick();
                }
                
                // Handle tab switching
                if (area.action === 'switchTab') {
                    this.activeTab = area.tabId;
                    // Reset scroll when switching tabs
                    this.scrollOffset = 0;
                    this.targetScrollOffset = 0;
                    return null;
                }
                
                // Handle back button
                if (area.action === 'back') {
                    console.log('🔙 Settings back button clicked');
                    return 'back';
                }
                
                // Handle slider interactions
                if (area.action === 'slider') {
                    const sliderWidth = area.width;
                    const progress = Math.max(0, Math.min(1, (x - area.x) / sliderWidth));
                    const newValue = area.min + progress * (area.max - area.min);
                    console.log('🎛️ Slider interaction:', area.key, newValue);
                    this.handleSliderChange(area.key, newValue);
                    return null;
                }
                
                // Handle toggle interactions
                if (area.action === 'toggle') {
                    console.log('🔄 Toggle interaction:', area.key);
                    this.handleToggleChange(area.key);
                    return null;
                }
                
                // Handle dropdown interactions
                if (area.action === 'dropdown') {
                    console.log('▼ Dropdown interaction:', area.key);
                    this.expandedDropdown = this.expandedDropdown === area.key ? null : area.key;
                    return null;
                }
                
                // Handle dropdown option selection
                if (area.action === 'selectTrack') {
                    console.log('✅ Track selected:', area.trackFilename);
                    this.handleTrackSelection(area.trackFilename);
                    return null;
                }
                
                // Handle dropdown option selection (legacy)
                if (area.action === 'dropdown-option') {
                    console.log('✅ Dropdown option selected:', area.key, area.value);
                    this.handleDropdownChange(area.key, area.value);
                    this.expandedDropdown = null; // Close dropdown
                    return null;
                }
                
                // Handle button actions
                if (area.action === 'button') {
                    console.log('🔘 Button clicked:', area.key);
                    this.handleButtonAction(area.key);
                    return null;
                }
                
                break;
            }
        }
        return null;
    }
    
    /**
     * Handle enhanced setting interactions
     */
    handleEnhancedSettingClick(setting, action, relativeX) {
        switch (action) {
            case 'slider':
                const sliderWidth = 200 - 80; // Adjust based on your slider width
                const progress = Math.max(0, Math.min(1, relativeX / sliderWidth));
                const newValue = setting.min + progress * (setting.max - setting.min);
                
                // Round to step
                const steppedValue = Math.round(newValue / setting.step) * setting.step;
                this.setSettingValue(setting.key, steppedValue);
                break;
                
            case 'toggle':
                this.setSettingValue(setting.key, !setting.value);
                break;
                
            case 'dropdown':
                // Toggle dropdown expansion
                if (this.expandedDropdown === setting.key) {
                    this.expandedDropdown = null;
                } else {
                    this.expandedDropdown = setting.key;
                }
                break;
                
            case 'dropdown-option':
                // Handle clicking on a dropdown option
                this.setSettingValue(setting.key, setting.option.value);
                this.expandedDropdown = null; // Close dropdown after selection
                break;
                
            case 'key':
                this.startKeyCapture(setting);
                break;
        }
    }
    
    /**
     * Start key capture for key binding settings
     */
    startKeyCapture(setting) {
        this.isKeyCapturing = true;
        this.keyCaptureSetting = setting;
    }
    
    /**
     * Handle key press during key capture
     */
    handleKeyPress(event) {
        if (this.isKeyCapturing && this.keyCaptureSetting) {
            let keyName = event.key;
            
            // Convert some key names to more readable format
            const keyNameMap = {
                ' ': 'Space',
                'ArrowUp': 'Up',
                'ArrowDown': 'Down',
                'ArrowLeft': 'Left',
                'ArrowRight': 'Right'
            };
            
            if (keyNameMap[keyName]) {
                keyName = keyNameMap[keyName];
            }
            
            this.setSettingValue(this.keyCaptureSetting.key, keyName);
            this.isKeyCapturing = false;
            this.keyCaptureSetting = null;
            
            event.preventDefault();
            return true;
        }
        return false;
    }
    
    /**
     * Handle mouse wheel scrolling in settings
     */
    handleWheel(deltaY) {
        const scrollSpeed = 25; // Pixels per wheel step (reduced for smoother feel)
        this.targetScrollOffset += deltaY * scrollSpeed;
        
        // The scroll bounds will be clamped in the render method
        // This allows for smooth scrolling without needing to calculate bounds here
    }
    
    /**
     * Handle hover effects for settings UI
     */
    handleHover(x, y, hitAreas) {
        this.hoveredItem = null;
        
        for (const area of hitAreas) {
            if (x >= area.x && x <= area.x + area.width && 
                y >= area.y && y <= area.y + area.height) {
                
                if (area.action === 'selectTrack') {
                    // Special hover handling for music track options
                    this.hoveredItem = `musicTrack_${area.trackIndex}`;
                } else if (area.action === 'dropdown') {
                    // Dropdown button hover
                    this.hoveredItem = area.key;
                } else if (area.action === 'switchTab') {
                    // Tab hover
                    this.hoveredItem = `tab_${area.tabId}`;
                } else if (area.action === 'slider') {
                    // Slider hover
                    this.hoveredItem = area.key;
                } else if (area.action === 'toggle') {
                    // Toggle hover
                    this.hoveredItem = area.key;
                } else if (area.action === 'back') {
                    // Back button hover
                    this.hoveredItem = { action: 'back' };
                } else {
                    // Generic hover
                    this.hoveredItem = area.key || area.action;
                }
                break;
            }
        }
    }

    /**
     * Handle mouse wheel scrolling in settings
     */
    handleScroll(deltaY) {
        const scrollAmount = deltaY * 2; // Adjust scroll sensitivity
        
        // Calculate max scroll based on current tab content
        const maxScroll = this.calculateMaxScroll();
        
        // Update target scroll with bounds checking
        this.targetScrollOffset += scrollAmount;
        this.targetScrollOffset = Math.max(0, Math.min(maxScroll, this.targetScrollOffset));
        
        // Reset scroll offset when switching tabs
        if (this.lastActiveTab !== this.activeTab) {
            this.scrollOffset = 0;
            this.targetScrollOffset = 0;
            this.lastActiveTab = this.activeTab;
        }
        
        console.log('📜 Scroll:', { deltaY, scrollAmount, targetOffset: this.targetScrollOffset, maxScroll });
    }

    /**
     * Calculate maximum scroll offset for current tab
     */
    calculateMaxScroll() {
        // Estimate content height based on current tab
        const settingsCount = this.settingsCategories[this.activeTab]?.settings.length || 0;
        const controlHeight = 60;
        const controlSpacing = 20;
        const headerHeight = 100;
        const tabHeight = 80;
        const availableHeight = 600; // Approximate panel height
        
        const totalContentHeight = settingsCount * (controlHeight + controlSpacing) + headerHeight;
        const maxScroll = Math.max(0, totalContentHeight - availableHeight + tabHeight);
        
        return maxScroll;
    }

    /**
     * Draw music track selector
     */
    drawMusicTrackSelector(ctx, x, y, width, height, hitAreas) {
        const isHovered = this.hoveredItem === 'musicTrack';
        const isExpanded = this.expandedDropdown === 'musicTrack';
        
        // Control background with enhanced styling
        const bgColor = isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
        const borderColor = isExpanded ? 'rgba(88,166,255,0.4)' : 'rgba(255,255,255,0.1)';
        this.drawGlassmorphicPanel(ctx, x, y, width, height, bgColor, borderColor);
        
        // Label with icon
        ctx.save();
        ctx.font = '16px Courier New';
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'left';
        ctx.fillText('🎵 Music Track', x + 20, y + height / 2 + 5);
        
        // Get current track info
        const currentTrack = this.getCurrentTrack();
        const displayText = currentTrack ? currentTrack.name : 'No track selected';
        
        // Enhanced dropdown button
        const dropdownWidth = 280;
        const dropdownX = x + width - dropdownWidth - 20;
        const dropdownY = y + 8;
        const dropdownHeight = height - 16;
        
        // Dropdown background with better styling
        let dropdownBgColor, dropdownBorderColor;
        if (isExpanded) {
            dropdownBgColor = 'rgba(88,166,255,0.15)';
            dropdownBorderColor = 'rgba(88,166,255,0.5)';
        } else if (isHovered) {
            dropdownBgColor = 'rgba(255,255,255,0.08)';
            dropdownBorderColor = 'rgba(255,255,255,0.25)';
        } else {
            dropdownBgColor = 'rgba(255,255,255,0.05)';
            dropdownBorderColor = 'rgba(255,255,255,0.15)';
        }
        
        this.drawGlassmorphicPanel(ctx, dropdownX, dropdownY, dropdownWidth, dropdownHeight, 
            dropdownBgColor, dropdownBorderColor);
        
        // Current track indicator
        if (currentTrack) {
            ctx.fillStyle = '#22c55e';
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 6;
            ctx.font = '14px Courier New';
            ctx.textAlign = 'left';
            ctx.fillText('♪', dropdownX + 12, dropdownY + dropdownHeight / 2 + 5);
            ctx.shadowBlur = 0;
        }
        
        // Dropdown text with better styling
        ctx.font = currentTrack ? 'bold 14px Courier New' : '14px Courier New';
        ctx.fillStyle = currentTrack ? '#f0f6fc' : '#8b949e';
        ctx.textAlign = 'left';
        
        // Truncate text if too long
        const maxTextWidth = dropdownWidth - (currentTrack ? 60 : 45);
        const truncatedText = this.truncateText(ctx, displayText, maxTextWidth);
        
        ctx.fillText(truncatedText, dropdownX + (currentTrack ? 30 : 15), dropdownY + dropdownHeight / 2 + 5);
        
        // Enhanced dropdown arrow with animation
        ctx.font = '16px Courier New';
        ctx.fillStyle = isExpanded ? '#58a6ff' : '#8b949e';
        ctx.textAlign = 'right';
        
        if (isExpanded) {
            ctx.shadowColor = '#58a6ff';
            ctx.shadowBlur = 8;
        }
        
        ctx.fillText(isExpanded ? '▲' : '▼', dropdownX + dropdownWidth - 12, dropdownY + dropdownHeight / 2 + 5);
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Hit area for dropdown
        hitAreas.push({
            x: dropdownX,
            y: dropdownY,
            width: dropdownWidth,
            height: dropdownHeight,
            action: 'dropdown',
            key: 'musicTrack'
        });
        
        // Store dropdown position for later use
        this.dropdownPosition = {
            x: dropdownX,
            y: dropdownY + dropdownHeight + 5,
            width: dropdownWidth
        };
    }

    /**
     * Truncate text to fit within specified width
     */
    truncateText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        
        let truncated = text;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        
        return truncated + '...';
    }

    /**
     * Draw music track dropdown options
     */
    drawMusicTrackDropdown(ctx, x, y, width, hitAreas) {
        const tracks = this.getAvailableTracks();
        const itemHeight = 50;
        const maxVisible = 6;
        const totalHeight = Math.min(tracks.length, maxVisible) * itemHeight;
        const padding = 8;
        
        // Enhanced dropdown background with better glassmorphism
        ctx.save();
        
        // Shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 8;
        
        // Main dropdown panel
        this.drawGlassmorphicPanel(ctx, x, y, width, totalHeight, 
            'rgba(13, 17, 23, 0.95)', 'rgba(88, 166, 255, 0.3)');
        
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw track options
        tracks.slice(0, maxVisible).forEach((track, index) => {
            const itemY = y + index * itemHeight;
            const isHovered = this.hoveredItem === `musicTrack_${index}`;
            const isCurrent = this.getCurrentTrack()?.filename === track.filename;
            
            // Enhanced item background with animations
            if (isHovered || isCurrent) {
                const bgColor = isCurrent ? 'rgba(34, 197, 94, 0.15)' : 'rgba(88, 166, 255, 0.12)';
                const borderColor = isCurrent ? 'rgba(34, 197, 94, 0.4)' : 'rgba(88, 166, 255, 0.3)';
                
                this.drawGlassmorphicPanel(ctx, x + padding/2, itemY + padding/2, 
                    width - padding, itemHeight - padding, bgColor, borderColor);
            }
            
            // Current track indicator with glow effect
            if (isCurrent) {
                ctx.fillStyle = '#22c55e';
                ctx.shadowColor = '#22c55e';
                ctx.shadowBlur = 12;
                ctx.font = 'bold 16px Courier New';
                ctx.textAlign = 'left';
                ctx.fillText('♪', x + 15, itemY + itemHeight / 2 + 5);
                ctx.shadowBlur = 0;
            }
            
            // Track name with enhanced styling
            ctx.font = isCurrent ? 'bold 15px Courier New' : '15px Courier New';
            ctx.fillStyle = isCurrent ? '#22c55e' : isHovered ? '#f0f6fc' : '#d0d7de';
            ctx.textAlign = 'left';
            
            // Add subtle glow for hovered items
            if (isHovered && !isCurrent) {
                ctx.shadowColor = '#58a6ff';
                ctx.shadowBlur = 8;
            }
            
            ctx.fillText(track.name, x + (isCurrent ? 35 : 18), itemY + itemHeight / 2 - 2);
            ctx.shadowBlur = 0;
            
            // Track description with better styling
            ctx.font = '12px Courier New';
            ctx.fillStyle = isCurrent ? 'rgba(34, 197, 94, 0.8)' : 'rgba(139, 148, 158, 0.9)';
            ctx.fillText(track.description, x + (isCurrent ? 35 : 18), itemY + itemHeight / 2 + 14);
            
            // Subtle separator line (except for last item)
            if (index < Math.min(tracks.length, maxVisible) - 1) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + 15, itemY + itemHeight - 1);
                ctx.lineTo(x + width - 15, itemY + itemHeight - 1);
                ctx.stroke();
            }
            
            // Hit area
            hitAreas.push({
                x: x,
                y: itemY,
                width: width,
                height: itemHeight,
                action: 'selectTrack',
                trackIndex: index,
                trackFilename: track.filename
            });
        });
        
        // Add scrollbar indicator if there are more tracks
        if (tracks.length > maxVisible) {
            const scrollbarWidth = 4;
            const scrollbarHeight = totalHeight * 0.8;
            const scrollbarX = x + width - scrollbarWidth - 6;
            const scrollbarY = y + (totalHeight - scrollbarHeight) / 2;
            
            ctx.fillStyle = 'rgba(88, 166, 255, 0.3)';
            this.drawRoundedRect(ctx, scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight, 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    /**
     * Draw expanded dropdowns on top of everything
     */
    drawExpandedDropdowns(ctx, width, contentStartY, contentHeight, hitAreas) {
        if (this.expandedDropdown === 'musicTrack' && this.dropdownPosition) {
            // Use stored position from when the music track selector was drawn
            this.drawMusicTrackDropdown(ctx, 
                this.dropdownPosition.x, 
                this.dropdownPosition.y, 
                this.dropdownPosition.width, 
                hitAreas);
        }
    }

    /**
     * Check for discrepancies between local and cloud settings
     */
    checkSettingsDiscrepancies(localSettings, cloudSettings) {
        const discrepancies = [];
        
        // Check for settings that differ between local and cloud
        Object.keys(localSettings).forEach(key => {
            if (cloudSettings.hasOwnProperty(key) && localSettings[key] !== cloudSettings[key]) {
                discrepancies.push({
                    setting: key,
                    local: localSettings[key],
                    cloud: cloudSettings[key]
                });
            }
        });
        
        // Check for settings that exist in cloud but not locally
        Object.keys(cloudSettings).forEach(key => {
            if (!localSettings.hasOwnProperty(key)) {
                discrepancies.push({
                    setting: key,
                    local: 'not set',
                    cloud: cloudSettings[key]
                });
            }
        });
        
        if (discrepancies.length > 0) {
            console.log('⚠️ Settings discrepancies detected (cloud will take precedence):');
            discrepancies.forEach(disc => {
                console.log(`  ${disc.setting}: local="${disc.local}" vs cloud="${disc.cloud}"`);
            });
        } else {
            console.log('✅ Local and cloud settings are in sync');
        }
        
        return discrepancies;
    }
}
