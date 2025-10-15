/**
 * Local Storage Playtime Tracker
 * 
 * This tracker saves playtime data to localStorage for offline tracking
 * and provides methods for GlitchRealm to sync this data to Firestore
 */

class LocalPlaytimeTracker {
    constructor(gameId, gameName) {
        this.gameId = gameId;
        this.gameName = gameName;
        this.startTime = null;
        this.activeTime = 0;
        this.isTracking = false;
        this.lastActivityTime = null;
        this.idleThreshold = 3 * 60 * 1000; // 3 minutes
        this.saveInterval = 30 * 1000; // Save every 30 seconds
        this.saveIntervalId = null;
        this.idleCheckIntervalId = null;
        
        // Local storage key
        this.storageKey = 'glitchrealm_playtime_data';
        
        // Bind methods
        this.startTracking = this.startTracking.bind(this);
        this.stopTracking = this.stopTracking.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleActivity = this.handleActivity.bind(this);
        this.checkIdle = this.checkIdle.bind(this);
        this.saveToLocalStorage = this.saveToLocalStorage.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        
        this.init();
    }
    
    init() {
        console.log(`[LocalPlaytimeTracker] Initializing for ${this.gameName}`);
        
        // Add event listeners
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        
        // Activity listeners
        document.addEventListener('mousemove', this.handleActivity);
        document.addEventListener('keydown', this.handleActivity);
        document.addEventListener('click', this.handleActivity);
        document.addEventListener('touchstart', this.handleActivity, { passive: true });
        
        // Start tracking automatically
        this.startTracking();
    }
    
    startTracking() {
        if (this.isTracking) return;
        
        console.log(`[LocalPlaytimeTracker] Starting playtime tracking for ${this.gameName}`);
        
        this.startTime = new Date();
        this.lastActivityTime = new Date();
        this.activeTime = 0;
        this.isTracking = true;
        
        // Set up intervals
        this.saveIntervalId = setInterval(this.saveToLocalStorage, this.saveInterval);
        this.idleCheckIntervalId = setInterval(this.checkIdle, 10000); // Check every 10 seconds
    }
    
    stopTracking() {
        if (!this.isTracking) return;
        
        console.log(`[LocalPlaytimeTracker] Stopping playtime tracking for ${this.gameName}`);
        
        // Calculate final active time
        if (this.startTime) {
            const now = new Date();
            const sessionTime = (now - this.lastActivityTime) / 1000;
            
            // Only add time if user was active recently
            if (now - this.lastActivityTime < this.idleThreshold) {
                this.activeTime += sessionTime;
            }
        }
        
        // Clear intervals
        if (this.saveIntervalId) {
            clearInterval(this.saveIntervalId);
            this.saveIntervalId = null;
        }
        
        if (this.idleCheckIntervalId) {
            clearInterval(this.idleCheckIntervalId);
            this.idleCheckIntervalId = null;
        }
        
        // Save one last time
        this.saveToLocalStorage();
        
        this.isTracking = false;
        this.startTime = null;
    }
    
    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            // User switched away, save now
            this.saveToLocalStorage();
        } else if (document.visibilityState === 'visible') {
            // User came back, update activity
            this.handleActivity();
        }
    }
    
    handleActivity() {
        const now = new Date();
        
        // If user was idle and now active, calculate time while active
        if (this.isTracking && this.lastActivityTime) {
            const idleTime = now - this.lastActivityTime;
            
            if (idleTime > this.idleThreshold) {
                // User was idle, don't count this time
                console.log(`[LocalPlaytimeTracker] User was idle for ${idleTime/1000} seconds`);
                this.startTime = now; // Reset start time
            } else {
                // User was active, add this time
                const activeSeconds = (now - this.lastActivityTime) / 1000;
                this.activeTime += activeSeconds;
            }
        }
        
        this.lastActivityTime = now;
    }
    
    checkIdle() {
        if (!this.isTracking || !this.lastActivityTime) return;
        
        const now = new Date();
        const idleTime = now - this.lastActivityTime;
        
        if (idleTime > this.idleThreshold) {
            // User is idle, save what we have so far
            this.saveToLocalStorage();
        }
    }
    
    saveToLocalStorage() {
        // Calculate current active time
        let totalActiveMinutes = this.activeTime / 60;
        
        // If user is currently active, add current session time
        if (this.isTracking && this.lastActivityTime) {
            const now = new Date();
            const idleTime = now - this.lastActivityTime;
            
            if (idleTime < this.idleThreshold) {
                // User is active, add this session time
                const activeSeconds = (now - this.lastActivityTime) / 1000;
                totalActiveMinutes += activeSeconds / 60;
            }
        }
        
        // Don't save if no time to report
        if (totalActiveMinutes < 0.01) return; // Less than 1 second
        
        console.log(`[LocalPlaytimeTracker] Saving ${totalActiveMinutes.toFixed(2)} minutes to localStorage`);
        
        try {
            // Get existing data
            const existingData = this.getLocalStorageData();
            
            // Update or create game entry
            if (!existingData.games[this.gameId]) {
                existingData.games[this.gameId] = {
                    gameId: this.gameId,
                    gameName: this.gameName,
                    totalMinutes: 0,
                    sessionCount: 0,
                    lastPlayed: null,
                    needsSync: true
                };
            }
            
            const gameData = existingData.games[this.gameId];
            gameData.totalMinutes += totalActiveMinutes;
            gameData.sessionCount += 1;
            gameData.lastPlayed = new Date().toISOString();
            gameData.needsSync = true;
            
            // Update global data
            existingData.lastUpdated = new Date().toISOString();
            existingData.needsSync = true;
            
            // Save to localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(existingData));
            
            // Reset local active time after successful save
            this.activeTime = 0;
            this.startTime = new Date();
            
            // Dispatch custom event to notify GlitchRealm
            window.dispatchEvent(new CustomEvent('playtimeDataUpdated', {
                detail: {
                    gameId: this.gameId,
                    gameName: this.gameName,
                    totalMinutes: gameData.totalMinutes,
                    sessionCount: gameData.sessionCount
                }
            }));
            
        } catch (error) {
            console.error('[LocalPlaytimeTracker] Error saving to localStorage:', error);
        }
    }
    
    getLocalStorageData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('[LocalPlaytimeTracker] Error reading from localStorage:', error);
        }
        
        // Return default structure
        return {
            games: {},
            lastUpdated: new Date().toISOString(),
            needsSync: false
        };
    }
    
    handleBeforeUnload() {
        // Save one last time before the page unloads
        this.saveToLocalStorage();
    }
    
    destroy() {
        this.stopTracking();
        
        // Remove event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        
        document.removeEventListener('mousemove', this.handleActivity);
        document.removeEventListener('keydown', this.handleActivity);
        document.removeEventListener('click', this.handleActivity);
        document.removeEventListener('touchstart', this.handleActivity);
    }
    
    // Static method to get all playtime data from localStorage
    static getAllPlaytimeData() {
        try {
            const data = localStorage.getItem('glitchrealm_playtime_data');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[LocalPlaytimeTracker] Error reading playtime data:', error);
            return null;
        }
    }
    
    // Static method to clear synced data
    static markAsSynced(gameId = null) {
        try {
            const data = localStorage.getItem('glitchrealm_playtime_data');
            if (!data) return;
            
            const playtimeData = JSON.parse(data);
            
            if (gameId) {
                // Mark specific game as synced
                if (playtimeData.games[gameId]) {
                    playtimeData.games[gameId].needsSync = false;
                }
            } else {
                // Mark all as synced
                playtimeData.needsSync = false;
                Object.values(playtimeData.games).forEach(game => {
                    game.needsSync = false;
                });
            }
            
            localStorage.setItem('glitchrealm_playtime_data', JSON.stringify(playtimeData));
        } catch (error) {
            console.error('[LocalPlaytimeTracker] Error marking as synced:', error);
        }
    }
}

// Make available globally
window.LocalPlaytimeTracker = LocalPlaytimeTracker;

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalPlaytimeTracker;
}