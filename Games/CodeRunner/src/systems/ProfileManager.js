/**
 * ProfileManager - Handles user profile data including selected sprites and other preferences
 */

export class ProfileManager {
    constructor() {
        this.profileData = {
            name: '',
            selectedSprite: 'player-sprite.png', // Default sprite
            preferences: {}
        };
        
        // Load saved profile data
        this.loadProfile();
        
        console.log('🎭 ProfileManager initialized');
    }

    /**
     * Load profile data from localStorage
     */
    loadProfile() {
        try {
            const saved = localStorage.getItem('coderunner_profile');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Validate parsed data structure
                if (typeof parsed === 'object' && parsed !== null) {
                    this.profileData = { ...this.profileData, ...parsed };
                    console.log('📄 Profile loaded from localStorage', this.profileData);
                } else {
                    console.warn('⚠️ Invalid profile data format, using defaults');
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to load profile data:', error);
            // Reset to defaults if localStorage is corrupted
            this.profileData = {
                name: '',
                selectedSprite: 'player-sprite.png',
                preferences: {}
            };
        }
    }

    /**
     * Save profile data to localStorage
     */
    saveProfile() {
        try {
            localStorage.setItem('coderunner_profile', JSON.stringify(this.profileData));
            console.log('💾 Profile saved to localStorage', this.profileData);
        } catch (error) {
            console.warn('⚠️ Failed to save profile data:', error);
        }
    }

    /**
     * Get the currently selected sprite
     */
    getSelectedSprite() {
        return this.profileData.selectedSprite || 'player-sprite.png';
    }

    /**
     * Set the selected sprite
     */
    setSelectedSprite(spriteId) {
        try {
            // Validate sprite ID
            if (!spriteId || typeof spriteId !== 'string') {
                console.warn('⚠️ Invalid sprite ID provided:', spriteId);
                return;
            }
            
            this.profileData.selectedSprite = spriteId;
            this.saveProfile();
            
            // Also save to cloud if user is logged in
            this.saveToCloud();
            
            console.log(`🎮 Selected sprite updated: ${spriteId}`);
        } catch (error) {
            console.error('Failed to set selected sprite:', error);
        }
    }

    /**
     * Get player name
     */
    getPlayerName() {
        return this.profileData.name || '';
    }

    /**
     * Set player name
     */
    setPlayerName(name) {
        this.profileData.name = name;
        this.saveProfile();
        console.log(`👤 Player name updated: ${name}`);
    }

    /**
     * Refresh sprite selector (compatibility method for existing code)
     */
    refreshSpriteSelector() {
        // This method is called by other systems for compatibility
        // In a more complex system, this would update UI elements
        console.log('🔄 Sprite selector refreshed');
    }

    /**
     * Reset profile to defaults
     */
    resetProfile() {
        this.profileData = {
            name: '',
            selectedSprite: 'player-sprite.png',
            preferences: {}
        };
        this.saveProfile();
        console.log('🔄 Profile reset to defaults');
    }

    /**
     * Save profile data to cloud if user is logged in
     */
    saveToCloud() {
        // Check if UserProfileSystem is available and user is logged in
        if (typeof window !== 'undefined' && 
            window.userProfileSystem && 
            window.userProfileSystem.isLoggedIn) {
            
            // Trigger cloud save through UserProfileSystem
            window.userProfileSystem.saveUserProfile();
            console.log('☁️ Profile data saved to cloud');
        }
    }

    /**
     * Load profile data from cloud (called when user logs in)
     */
    loadFromCloud(cloudData) {
        if (cloudData && cloudData.selectedSprite) {
            // Normalize the sprite path - extract just the filename
            let spriteId = cloudData.selectedSprite;
            if (spriteId.includes('/')) {
                spriteId = spriteId.split('/').pop(); // Get just the filename
            }
            
            this.profileData.selectedSprite = spriteId;
            this.saveProfile(); // Save to localStorage for offline access
            console.log('☁️ Profile data loaded from cloud:', cloudData.selectedSprite, '-> normalized to:', spriteId);
            
            // Update player sprite immediately if game is running
            if (typeof window !== 'undefined' && window.game && window.game.player) {
                window.game.player.loadSelectedSprite();
            }
        }
    }

    /**
     * Force save current profile to cloud (for debugging/fixing cloud data)
     */
    forceSaveToCloud() {
        console.log('🔧 Force saving current profile to cloud:', this.profileData.selectedSprite);
        this.saveToCloud();
    }
}

// Auto-initialize ProfileManager and make it globally available
if (typeof window !== 'undefined') {
    window.profileManager = new ProfileManager();
    console.log('🌐 ProfileManager available globally as window.profileManager');
}
