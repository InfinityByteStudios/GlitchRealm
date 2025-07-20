/**
 * CloudSaveSystem - Handles saving game data to the cloud (Firestore) when logged in,
 * and falls back to localStorage for guest users
 */

export class CloudSaveSystem {
    constructor(game) {
        this.game = game;
        this.firestore = null;
        this.auth = null;
        this.isInitialized = false;
        
        // Initialize Firebase references
        this.initializeFirebase();
    }
      initializeFirebase() {
        try {
            if (window.firebaseAuth) {
                this.auth = window.firebaseAuth;
               
                
                // Only initialize Firestore if it's available and working
                if (window.firebaseFirestore) {
                    this.firestore = window.firebaseFirestore;
                    this.isInitialized = true;
                   
                    
                    // Test Firestore connectivity on a delay to avoid blocking initialization
                    setTimeout(() => this.testFirestoreConnectivity(), 2000);
                } else {
                   
                }
            } else {
               
            }
        } catch (error) {
           
            this.isInitialized = false;
        }
    }
    
    /**
     * Test Firestore connectivity and disable if problematic
     */
    async testFirestoreConnectivity() {
        if (!this.firestore || !this.isInitialized) return;
        
        try {
            // Simple test that shouldn't require authentication
            const testRef = this.firestore.collection('_test').doc('connectivity');
            await Promise.race([
                testRef.get(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]);
           
        } catch (error) {
           
            this.isInitialized = false; // Disable Firestore operations
        }
    }
      /**
     * Check if user is currently logged in
     */
    isUserLoggedIn() {
        return this.auth && this.auth.currentUser !== null;
    }
    
    /**
     * Get current user ID
     */
    getCurrentUserId() {
        if (this.isUserLoggedIn()) {
            return this.auth.currentUser.uid;
        }
        return null;
    }    /**
     * Check if we can connect to Firebase (online check)
     */
    async isOnline() {
        if (!this.isInitialized || !this.isUserLoggedIn()) {
            return false;
        }
        
        try {
            // Use a simple document read with a short timeout
            const testPromise = this.firestore.collection('_connection_test').doc('test').get();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 2000)
            );
            
            await Promise.race([testPromise, timeoutPromise]);
            return true;
        } catch (error) {
          
            
            // If we get specific offline errors, disable Firestore temporarily
            if (error.message.includes('offline') || 
                error.message.includes('unavailable') ||
                error.code === 'unavailable') {
                
                this.isInitialized = false;
            }
            
            return false;
        }
    }    /**
     * Save game data to cloud or localStorage
     */
    async saveGameData(saveData) {
        try {
            // Sanitize data before saving
            const sanitizedData = this.sanitizeData(saveData);
            
            if (this.isUserLoggedIn() && this.isInitialized) {
                try {
                    // Try cloud save with timeout
                    const cloudSavePromise = this.saveToCloud(sanitizedData);
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Cloud save timeout')), 5000)
                    );
                    
                    const success = await Promise.race([cloudSavePromise, timeoutPromise]);
                    if (success) {
                       
                        // Also save to localStorage as backup
                        this.saveToLocalStorage(sanitizedData);
                        return true;
                    }
                } catch (cloudError) {
                  
                    // Disable Firestore if we get connectivity errors
                    if (cloudError.message.includes('offline') || 
                        cloudError.message.includes('unavailable') ||
                        cloudError.code === 'unavailable') {
                        this.isInitialized = false;
                    }
                }
            }
            
            // Fall back to localStorage
          
            return this.saveToLocalStorage(sanitizedData);
            
        } catch (error) {
           
            // Always fall back to localStorage on any error
            return this.saveToLocalStorage(saveData);
        }
    }
      /**
     * Load game data from cloud or localStorage
     */
    async loadGameData() {
        try {
            if (this.isUserLoggedIn() && this.isInitialized) {
                // Try to load from Firestore first, but with a timeout
                try {
                    const cloudData = await Promise.race([
                        this.loadFromCloud(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Cloud load timeout')), 3000)
                        )
                    ]);
                    
                    if (cloudData) {
                       
                        return cloudData;
                    }
                } catch (cloudError) {
                  
                    // Disable Firestore if we get connectivity errors
                    if (cloudError.message.includes('offline') || 
                        cloudError.message.includes('unavailable') ||
                        cloudError.code === 'unavailable') {
                        this.isInitialized = false;
                    }
                }
            }
            
            // Fall back to localStorage
          
            return this.loadFromLocalStorage();
            
        } catch (error) {
          
            // Always fall back to localStorage on any error
            return this.loadFromLocalStorage();
        }
    }/**
     * Save data to Firestore
     */
    async saveToCloud(saveData) {
        if (!this.isUserLoggedIn() || !this.isInitialized) {
            throw new Error('User not logged in or Firebase not initialized');
        }
        
        const userId = this.getCurrentUserId();
        const docRef = this.firestore.collection('user_saves').doc(userId);
        
        // Sanitize data to remove undefined values
        const sanitizedData = this.sanitizeData(saveData);
        
        // Prepare cloud save data with proper timestamp
        const cloudSaveData = {
            ...sanitizedData,
            version: sanitizedData.version || '1.4.0',
            timestamp: Date.now() // Use simple timestamp for compatibility
        };
        
        // Add server timestamp if available
        try {
            if (this.firestore.FieldValue && this.firestore.FieldValue.serverTimestamp) {
                cloudSaveData.lastUpdated = this.firestore.FieldValue.serverTimestamp();
            } else if (firebase.firestore && firebase.firestore.FieldValue) {
                cloudSaveData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
            }
        } catch (timestampError) {
           
        }
          try {
            await docRef.set(cloudSaveData);
           
            return true;        } catch (error) {
            // Handle permission errors gracefully
            if (error.code === 'permission-denied' || 
                error.message.includes('Missing or insufficient permissions')) {
              
                this.isInitialized = false; // Disable cloud saves going forward
                return this.saveToLocalStorage(sanitizedData);
            }
            
            // Handle offline errors gracefully
            if (error.code === 'unavailable' || error.message.includes('offline')) {
               
                // Fall back to localStorage for now
                return this.saveToLocalStorage(sanitizedData);
            }
            
         
            return this.saveToLocalStorage(sanitizedData);
        }
    }
    
    /**
     * Sanitize data to prevent undefined values from being saved to Firestore
     */
    sanitizeData(data) {
        if (data === undefined || data === null) {
            return null;
        }
        
        if (typeof data !== 'object') {
            return data;
        }
        
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeData(item)).filter(item => item !== undefined && item !== null);
        }
        
        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== null) {
                if (typeof value === 'object') {
                    const sanitizedValue = this.sanitizeData(value);
                    // Only include objects/arrays that have content
                    if (Array.isArray(sanitizedValue) ? sanitizedValue.length > 0 : Object.keys(sanitizedValue).length > 0) {
                        sanitized[key] = sanitizedValue;
                    }
                } else {
                    sanitized[key] = value;
                }
            }
        }
        
        return sanitized;
    }
    
    /**
     * Load data from Firestore
     */
    async loadFromCloud() {
        if (!this.isUserLoggedIn() || !this.isInitialized) {
            return null;
        }
        
        const userId = this.getCurrentUserId();
        const docRef = this.firestore.collection('user_saves').doc(userId);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
        
            return data;
        } else {
           
            return null;
        }
    }
    
    /**
     * Save data to localStorage (fallback)
     */
    saveToLocalStorage(saveData) {
        try {
            localStorage.setItem('coderunner_save_data', JSON.stringify(saveData));
         
            return true;
        } catch (error) {
          
            return false;
        }
    }
    
    /**
     * Load data from localStorage (fallback)
     */
    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('coderunner_save_data');
            if (savedData) {
               
                return JSON.parse(savedData);
            }
            return null;
        } catch (error) {
           
            return null;
        }
    }
    
    /**
     * Check if there's saved game data available
     */
    async hasSavedData() {
        try {
            if (this.isUserLoggedIn() && this.isInitialized) {
                // Check cloud save
                const userId = this.getCurrentUserId();
                const docRef = this.firestore.collection('user_saves').doc(userId);
                const doc = await docRef.get();
                if (doc.exists) {
                    return true;
                }
            }
            
            // Check localStorage
            return localStorage.getItem('coderunner_save_data') !== null;
        } catch (error) {
           
            // Fall back to localStorage check
            return localStorage.getItem('coderunner_save_data') !== null;
        }
    }    /**
     * Migrate localStorage data to cloud when user logs in
     */
    async migrateLocalDataToCloud() {
        if (!this.isUserLoggedIn() || !this.isInitialized) {
           
            return false;
        }
        
        try {
            // Check if there's local data to migrate
            const localData = this.loadFromLocalStorage();
            if (!localData) {
               
                return false;
            }
            
            // Try migration with a timeout
            const migrationPromise = this.performMigration(localData);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Migration timeout')), 10000)
            );
            
            return await Promise.race([migrationPromise, timeoutPromise]);
              } catch (error) {
          
        
            
            // Disable Firestore if we get permissions or connectivity errors
            if (error.message.includes('offline') || 
                error.message.includes('unavailable') ||
                error.message.includes('permissions') ||
                error.message.includes('Missing or insufficient permissions') ||
                error.code === 'unavailable' ||
                error.code === 'permission-denied') {
                this.isInitialized = false;
             
            }
            
            return false;
        }
    }
      /**
     * Perform the actual migration logic
     */
    async performMigration(localData) {
        try {
            // Check if user is authenticated before attempting cloud operations
            if (!this.auth || !this.auth.currentUser) {
                throw new Error('User not authenticated for cloud migration');
            }
            
            // Check if cloud data already exists
            const cloudData = await this.loadFromCloud();
            if (cloudData) {
                // Cloud data exists, merge with local data
              
                return await this.mergeLocalAndCloudData(localData, cloudData);
            } else {
                // No cloud data, upload local data
               
                const sanitizedData = this.sanitizeData(localData);
                return await this.saveToCloud(sanitizedData);
            }
        } catch (error) {
            // Check for authentication/permission errors
            if (error.message.includes('permissions') || 
                error.message.includes('Missing or insufficient permissions') ||
                error.code === 'permission-denied' ||
                error.message.includes('User not authenticated')) {
              
                // Return local data unchanged instead of throwing
                return localData;
            }
            throw error; // Re-throw other errors to be handled by the timeout wrapper
        }
    }
    
    /**
     * Merge local and cloud data, taking the best of both
     */
    async mergeLocalAndCloudData(localData, cloudData) {
        try {
            const mergedData = {
                // Take the higher data packets
                dataPackets: Math.max(localData.dataPackets || 0, cloudData.dataPackets || 0),
                
                // Merge best scores (take highest for each difficulty)
                bestScores: this.mergeBestScores(localData.bestScores || {}, cloudData.bestScores || {}),
                
                // Merge owned upgrades (union of both sets)
                ownedUpgrades: this.mergeOwnedUpgrades(localData.ownedUpgrades || [], cloudData.ownedUpgrades || []),
                
                // Take the more recent profile data
                profileData: this.selectMoreRecentData(localData.profileData, cloudData.profileData, localData.timestamp, cloudData.timestamp),
                
                // Take the more recent audio settings
                audioSettings: this.selectMoreRecentData(localData.audioSettings, cloudData.audioSettings, localData.timestamp, cloudData.timestamp),
                
                // Merge leaderboard data
                leaderboardData: this.selectMoreRecentData(localData.leaderboardData, cloudData.leaderboardData, localData.timestamp, cloudData.timestamp),
                
                // Use current timestamp and version
                timestamp: Date.now(),
                version: localData.version || cloudData.version || '1.4.0'
            };
            
            // Save merged data to cloud
            await this.saveToCloud(mergedData);
          
            return true;
        } catch (error) {
          
            return false;
        }
    }
    
    mergeBestScores(local, cloud) {
        const merged = { ...local };
        Object.keys(cloud).forEach(difficulty => {
            merged[difficulty] = Math.max(merged[difficulty] || 0, cloud[difficulty] || 0);
        });
        return merged;
    }
    
    mergeOwnedUpgrades(local, cloud) {
        const combined = new Set([...local, ...cloud]);
        return Array.from(combined);
    }
    
    selectMoreRecentData(localData, cloudData, localTimestamp, cloudTimestamp) {
        if (!localData) return cloudData;
        if (!cloudData) return localData;
        
        // If we have timestamps, use the more recent one
        if (localTimestamp && cloudTimestamp) {
            return localTimestamp > cloudTimestamp ? localData : cloudData;
        }
        
        // Default to cloud data if no timestamps
        return cloudData;
    }

    /**
     * Attempt to re-enable Firestore if it was disabled due to connectivity issues
     */
    async attemptFirestoreReconnection() {
        if (this.firestore && !this.isInitialized && this.isUserLoggedIn()) {
           
            try {
                // Test connectivity with a very short timeout
                const testPromise = this.firestore.collection('_test').doc('reconnect').get();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Reconnection timeout')), 2000)
                );
                
                await Promise.race([testPromise, timeoutPromise]);
                
                // If we get here, connection is working
                this.isInitialized = true;
              
                return true;
            } catch (error) {
                
                return false;
            }
        }
        return false;
    }

    /**
     * Check if should attempt reconnection (call this periodically)
     */
    shouldAttemptReconnection() {
        return this.firestore && !this.isInitialized && this.isUserLoggedIn();
    }

    /**
     * Save user profile data to cloud
     */
    async saveUserProfile(profileData) {
        if (!this.isUserLoggedIn() || !this.isInitialized) {
            console.log('☁️ User not logged in or Firebase not initialized - saving profile locally');
            return this.saveProfileToLocalStorage(profileData);
        }
        
        try {
            const userId = this.getCurrentUserId();
            const docRef = this.firestore.collection('user_profiles').doc(userId);
            
            const sanitizedData = this.sanitizeData(profileData);
            
            // Add timestamp information
            const cloudProfileData = {
                ...sanitizedData,
                updatedAt: Date.now(),
                version: '1.0.0'
            };
            
            // Add server timestamp if available
            try {
                if (this.firestore.FieldValue && this.firestore.FieldValue.serverTimestamp) {
                    cloudProfileData.lastUpdated = this.firestore.FieldValue.serverTimestamp();
                } else if (firebase.firestore && firebase.firestore.FieldValue) {
                    cloudProfileData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
                }
            } catch (timestampError) {
                console.log('⚠️ Server timestamp not available, using local timestamp');
            }
            
            await docRef.set(cloudProfileData, { merge: true });
            console.log('☁️ User profile saved to cloud successfully');
            
            // Also save to localStorage as backup
            this.saveProfileToLocalStorage(profileData);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error saving user profile to cloud:', error);
            
            // Fall back to localStorage
            return this.saveProfileToLocalStorage(profileData);
        }
    }
    
    /**
     * Load user profile data from cloud
     */
    async loadUserProfile() {
        if (!this.isUserLoggedIn() || !this.isInitialized) {
            console.log('☁️ User not logged in or Firebase not initialized - loading profile locally');
            return this.loadProfileFromLocalStorage();
        }
        
        try {
            const userId = this.getCurrentUserId();
            const docRef = this.firestore.collection('user_profiles').doc(userId);
            
            const doc = await Promise.race([
                docRef.get(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Profile load timeout')), 3000)
                )
            ]);
            
            if (doc.exists) {
                const data = doc.data();
                console.log('☁️ User profile loaded from cloud successfully');
                
                // Update localStorage with cloud data
                this.saveProfileToLocalStorage(data);
                
                return data;
            } else {
                console.log('☁️ No cloud profile found, checking local storage');
                return this.loadProfileFromLocalStorage();
            }
            
        } catch (error) {
            console.error('❌ Error loading user profile from cloud:', error);
            
            // Fall back to localStorage
            return this.loadProfileFromLocalStorage();
        }
    }
    
    /**
     * Save profile data to localStorage
     */
    saveProfileToLocalStorage(profileData) {
        try {
            localStorage.setItem('coderunner_user_profile', JSON.stringify(profileData));
            console.log('💾 User profile saved to localStorage');
            return true;
        } catch (error) {
            console.error('❌ Error saving profile to localStorage:', error);
            return false;
        }
    }
    
    /**
     * Load profile data from localStorage
     */
    loadProfileFromLocalStorage() {
        try {
            const saved = localStorage.getItem('coderunner_user_profile');
            if (saved) {
                const data = JSON.parse(saved);
                console.log('💾 User profile loaded from localStorage');
                return data;
            }
            return null;
        } catch (error) {
            console.error('❌ Error loading profile from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Sync user statistics with cloud
     */
    async syncUserStats(userStats) {
        if (!this.isUserLoggedIn() || !this.isInitialized) {
            return this.saveStatsToLocalStorage(userStats);
        }
        
        try {
            const userId = this.getCurrentUserId();
            const docRef = this.firestore.collection('user_stats').doc(userId);
            
            const sanitizedStats = this.sanitizeData(userStats);
            
            // Add timestamp information
            const cloudStatsData = {
                ...sanitizedStats,
                updatedAt: Date.now(),
                userId: userId
            };
            
            await docRef.set(cloudStatsData, { merge: true });
            console.log('📊 User stats synced to cloud successfully');
            
            // Also save to localStorage as backup
            this.saveStatsToLocalStorage(userStats);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error syncing user stats to cloud:', error);
            
            // Fall back to localStorage
            return this.saveStatsToLocalStorage(userStats);
        }
    }
    
    /**
     * Load user statistics from cloud
     */
    async loadUserStats() {
        if (!this.isUserLoggedIn() || !this.isInitialized) {
            return this.loadStatsFromLocalStorage();
        }
        
        try {
            const userId = this.getCurrentUserId();
            const docRef = this.firestore.collection('user_stats').doc(userId);
            
            const doc = await Promise.race([
                docRef.get(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Stats load timeout')), 3000)
                )
            ]);
            
            if (doc.exists) {
                const data = doc.data();
                console.log('📊 User stats loaded from cloud successfully');
                
                // Update localStorage with cloud data
                this.saveStatsToLocalStorage(data);
                
                return data;
            } else {
                console.log('📊 No cloud stats found, checking local storage');
                return this.loadStatsFromLocalStorage();
            }
            
        } catch (error) {
            console.error('❌ Error loading user stats from cloud:', error);
            
            // Fall back to localStorage
            return this.loadStatsFromLocalStorage();
        }
    }
    
    /**
     * Save stats data to localStorage
     */
    saveStatsToLocalStorage(statsData) {
        try {
            localStorage.setItem('coderunner_user_stats', JSON.stringify(statsData));
            console.log('💾 User stats saved to localStorage');
            return true;
        } catch (error) {
            console.error('❌ Error saving stats to localStorage:', error);
            return false;
        }
    }
    
    /**
     * Load stats data from localStorage
     */
    loadStatsFromLocalStorage() {
        try {
            const saved = localStorage.getItem('coderunner_user_stats');
            if (saved) {
                const data = JSON.parse(saved);
                console.log('💾 User stats loaded from localStorage');
                return data;
            }
            return null;
        } catch (error) {
            console.error('❌ Error loading stats from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Collect all game data from various systems
     */
    collectGameData() {
        const gameData = {
            timestamp: Date.now(),
            version: '1.5.0',
            
            // Core game progress
            bestScores: this.game.bestScores || {},
            totalRuns: this.game.totalRuns || 0,
            
            // Upgrade system data
            dataPackets: 0,
            
            // Achievement system data
            achievementData: null,
            
            // Settings data
            settingsData: null,
            
            // Profile/customization data
            profileData: null,
            
            // Leaderboard data
            leaderboardData: null,
            
            // Audio settings
            audioSettings: null,
            
            // Any additional user stats
            userStats: {}
        };
        
        // Collect data from UpgradeSystem
        if (this.game.upgradeSystem) {
            gameData.dataPackets = this.game.upgradeSystem.dataPackets || 0;
        }
        
        // Collect data from ShopSystem
        if (this.game.shopSystem) {
            gameData.ownedUpgrades = this.game.shopSystem.getOwnedUpgrades();
        }
        
        // Collect data from AchievementSystem
        if (this.game.achievementSystem) {
            gameData.achievementData = this.game.achievementSystem.getSaveData();
        }
        
        // Collect data from SettingsSystem
        if (this.game.settingsSystem) {
            gameData.settingsData = this.game.settingsSystem.getAllSettings();
        }
        
        // Collect data from ProfileManager
        if (typeof window !== 'undefined' && window.profileManager) {
            gameData.profileData = {
                selectedSprite: window.profileManager.getSelectedSprite(),
                ...window.profileManager.profileData
            };
        }
        
        // Collect data from AudioSystem
        if (this.game.audioSystem) {
            gameData.audioSettings = {
                isMuted: this.game.audioSystem.isMuted,
                masterVolume: this.game.audioSystem.masterVolume,
                sfxVolume: this.game.audioSystem.sfxVolume,
                musicVolume: this.game.audioSystem.musicVolume,
                musicMode: this.game.audioSystem.musicMode,
                selectedTrack: this.game.audioSystem.selectedTrack
            };
        }
        
        // Collect data from LeaderboardSystem (offline entries)
        if (this.game.leaderboardSystem) {
            gameData.leaderboardData = {
                playerName: this.game.leaderboardSystem.savedPlayerName || '',
                uploadedDifficulties: Array.from(this.game.leaderboardSystem.uploadedDifficulties || [])
            };
        }
        
        // Collect user stats from UserProfileSystem
        if (this.game.userProfileSystem && this.game.userProfileSystem.userStats) {
            gameData.userStats = this.game.userProfileSystem.userStats;
        }
        
        return gameData;
    }
    
    /**
     * Apply loaded game data to all systems
     */
    applyGameData(gameData) {
        if (!gameData || typeof gameData !== 'object') {
            console.warn('❌ Invalid game data provided to applyGameData');
            return false;
        }
        
        try {
            // Apply best scores
            if (gameData.bestScores) {
                this.game.bestScores = { ...this.game.bestScores, ...gameData.bestScores };
                console.log('✅ Best scores applied from cloud save');
            }
            
            // Apply upgrade data
            if (gameData.dataPackets !== undefined && this.game.upgradeSystem) {
                this.game.upgradeSystem.loadSavedData({ dataPackets: gameData.dataPackets });
                console.log(`✅ Data packets applied from cloud save: ${gameData.dataPackets}`);
            }
            
            // Apply shop upgrade data
            if (gameData.ownedUpgrades && this.game.shopSystem) {
                this.game.shopSystem.loadOwnedUpgrades(gameData.ownedUpgrades);
                console.log(`✅ Shop upgrades applied from cloud save: ${gameData.ownedUpgrades.length} upgrades`);
            }
            
            // Apply achievement data
            if (gameData.achievementData && this.game.achievementSystem) {
                this.game.achievementSystem.loadSavedData(gameData.achievementData);
                console.log('✅ Achievement data applied from cloud save');
            }
            
            // Apply settings data
            if (gameData.settingsData && this.game.settingsSystem) {
                this.game.settingsSystem.importSettings(gameData.settingsData);
                console.log('✅ Settings applied from cloud save');
            }
            
            // Apply profile data
            if (gameData.profileData && typeof window !== 'undefined' && window.profileManager) {
                window.profileManager.loadFromCloud(gameData.profileData);
                console.log('✅ Profile data applied from cloud save');
            }
            
            // Apply audio settings
            if (gameData.audioSettings && this.game.audioSystem) {
                Object.assign(this.game.audioSystem, gameData.audioSettings);
                this.game.audioSystem.saveSettings();
                console.log('✅ Audio settings applied from cloud save');
            }
            
            // Apply leaderboard data
            if (gameData.leaderboardData && this.game.leaderboardSystem) {
                if (gameData.leaderboardData.playerName) {
                    this.game.leaderboardSystem.savedPlayerName = gameData.leaderboardData.playerName;
                    this.game.leaderboardSystem.savePlayerName(gameData.leaderboardData.playerName);
                }
                if (gameData.leaderboardData.uploadedDifficulties) {
                    this.game.leaderboardSystem.uploadedDifficulties = new Set(gameData.leaderboardData.uploadedDifficulties);
                }
                console.log('✅ Leaderboard data applied from cloud save');
            }
            
            // Apply user stats
            if (gameData.userStats && this.game.userProfileSystem) {
                this.game.userProfileSystem.userStats = { 
                    ...this.game.userProfileSystem.userStats, 
                    ...gameData.userStats 
                };
                console.log('✅ User stats applied from cloud save');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error applying game data:', error);
            return false;
        }
    }
    
    /**
     * Perform a full save of all game data to cloud
     */
    async saveAllGameData() {
        try {
            console.log('💾 Starting comprehensive cloud save...');
            
            const gameData = this.collectGameData();
            const success = await this.saveGameData(gameData);
            
            if (success) {
                console.log('✅ Comprehensive cloud save completed successfully');
                
                // Also update the user profile with latest data
                if (this.game.userProfileSystem && this.game.userProfileSystem.isLoggedIn) {
                    await this.game.userProfileSystem.saveUserProfile();
                }
                
                return true;
            } else {
                console.warn('⚠️ Cloud save failed, data saved locally only');
                return false;
            }
        } catch (error) {
            console.error('❌ Error during comprehensive cloud save:', error);
            return false;
        }
    }
    
    /**
     * Perform a full load of all game data from cloud
     */
    async loadAllGameData() {
        try {
            console.log('📥 Starting comprehensive cloud load...');
            
            const gameData = await this.loadGameData();
            
            if (gameData) {
                const success = this.applyGameData(gameData);
                
                if (success) {
                    console.log('✅ Comprehensive cloud load completed successfully');
                    return true;
                } else {
                    console.warn('⚠️ Error applying loaded game data');
                    return false;
                }
            } else {
                console.log('ℹ️ No cloud save data found');
                return false;
            }
        } catch (error) {
            console.error('❌ Error during comprehensive cloud load:', error);
            return false;
        }
    }
    
    /**
     * Auto-save timer to periodically save data for logged-in users
     */
    startAutoSave() {
        // Only start auto-save for logged-in users
        if (!this.isUserLoggedIn()) {
            console.log('ℹ️ Auto-save not started - user not logged in');
            return;
        }
        
        // Clear any existing auto-save interval
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        // Auto-save every 2 minutes for logged-in users
        this.autoSaveInterval = setInterval(async () => {
            if (this.isUserLoggedIn()) {
                console.log('⏰ Auto-saving game data...');
                await this.saveAllGameData();
            } else {
                // Stop auto-save if user logs out
                this.stopAutoSave();
            }
        }, 120000); // 2 minutes
        
        console.log('✅ Auto-save started (every 2 minutes)');
    }
    
    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('⏹️ Auto-save stopped');
        }
    }
    
    /**
     * Manually trigger a sync (save and load)
     */
    async syncWithCloud() {
        if (!this.isUserLoggedIn()) {
            console.warn('⚠️ Cannot sync with cloud - user not logged in');
            return false;
        }
        
        try {
            console.log('🔄 Syncing with cloud...');
            
            // First save current data
            await this.saveAllGameData();
            
            // Then load any newer data from cloud
            await this.loadAllGameData();
            
            console.log('✅ Cloud sync completed');
            return true;
        } catch (error) {
            console.error('❌ Error during cloud sync:', error);
            return false;
        }
    }
}
