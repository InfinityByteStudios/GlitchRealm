/**
 * PlaytimeTracker - A module for tracking gameplay time in GlitchRealm games
 * 
 * This tracks active gameplay time and syncs with Firebase periodically and when the user leaves.
 * To use in a game, include this file and initialize with the game ID.
 */

class PlaytimeTracker {
    constructor(gameId, gameName) {
        this.gameId = gameId;
        this.gameName = gameName;
        this.startTime = null;
        this.activeTime = 0;
        this.isTracking = false;
        this.lastActivityTime = null;
        this.idleThreshold = 3 * 60 * 1000; // 3 minutes
        this.syncIntervalId = null;
        this.syncInterval = 60 * 1000; // 1 minute
        this.initialized = false;
        
        // Firebase references
        this.db = null;
        this.auth = null;
        this.userId = null;
        
        // Bind methods to maintain context
        this.startTracking = this.startTracking.bind(this);
        this.stopTracking = this.stopTracking.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleActivity = this.handleActivity.bind(this);
        this.checkIdle = this.checkIdle.bind(this);
        this.syncPlaytime = this.syncPlaytime.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    }
    
    // Initialize tracker with Firebase instances
    init() {
        if (this.initialized) return;
        
        console.log(`[PlaytimeTracker] Initializing for ${this.gameName}`);
        
        // Check if Firebase is available
        if (typeof firebase !== 'undefined') {
            // Initialize Firebase if available globally
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Get user ID if logged in
            if (this.auth.currentUser) {
                this.userId = this.auth.currentUser.uid;
            }
            
            // Listen for auth changes
            this.auth.onAuthStateChanged(user => {
                this.userId = user ? user.uid : null;
                
                if (user && this.isTracking) {
                    // User logged in during tracking, sync now
                    this.syncPlaytime();
                }
            });
            
            // Add event listeners
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
            window.addEventListener('beforeunload', this.handleBeforeUnload);
            
            // Activity listeners
            document.addEventListener('mousemove', this.handleActivity);
            document.addEventListener('keydown', this.handleActivity);
            document.addEventListener('click', this.handleActivity);
            document.addEventListener('touchstart', this.handleActivity, { passive: true });
            
            this.initialized = true;
            
            // Start tracking automatically
            this.startTracking();
        } else {
            console.warn('[PlaytimeTracker] Firebase not available, tracking disabled');
        }
    }
    
    // Start tracking playtime
    startTracking() {
        if (!this.initialized) {
            this.init();
            return;
        }
        
        if (this.isTracking) return;
        
        console.log(`[PlaytimeTracker] Starting playtime tracking for ${this.gameName}`);
        
        this.startTime = new Date();
        this.lastActivityTime = new Date();
        this.activeTime = 0;
        this.isTracking = true;
        
        // Set up interval for periodic syncing
        this.syncIntervalId = setInterval(this.syncPlaytime, this.syncInterval);
        
        // Set up interval for idle checking
        this.idleCheckIntervalId = setInterval(this.checkIdle, 10000); // Check every 10 seconds
    }
    
    // Stop tracking playtime
    stopTracking() {
        if (!this.isTracking) return;
        
        console.log(`[PlaytimeTracker] Stopping playtime tracking for ${this.gameName}`);
        
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
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
        
        if (this.idleCheckIntervalId) {
            clearInterval(this.idleCheckIntervalId);
            this.idleCheckIntervalId = null;
        }
        
        // Sync one last time
        this.syncPlaytime();
        
        this.isTracking = false;
        this.startTime = null;
    }
    
    // Handle tab visibility changes
    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            // User switched away, sync now
            this.syncPlaytime();
        } else if (document.visibilityState === 'visible') {
            // User came back, update activity
            this.handleActivity();
        }
    }
    
    // Handle user activity
    handleActivity() {
        const now = new Date();
        
        // If user was idle and now active, calculate time while active
        if (this.isTracking && this.lastActivityTime) {
            const idleTime = now - this.lastActivityTime;
            
            if (idleTime > this.idleThreshold) {
                // User was idle, don't count this time
                console.log(`[PlaytimeTracker] User was idle for ${idleTime/1000} seconds`);
                this.startTime = now; // Reset start time
            } else {
                // User was active, add this time
                const activeSeconds = (now - this.lastActivityTime) / 1000;
                this.activeTime += activeSeconds;
            }
        }
        
        this.lastActivityTime = now;
    }
    
    // Check if user is idle
    checkIdle() {
        if (!this.isTracking || !this.lastActivityTime) return;
        
        const now = new Date();
        const idleTime = now - this.lastActivityTime;
        
        if (idleTime > this.idleThreshold) {
            // User is idle, sync what we have so far
            this.syncPlaytime();
        }
    }
    
    // Sync playtime data with Firebase
    syncPlaytime() {
        if (!this.userId || !this.db) return;
        
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
        
        // Don't sync if no time to report
        if (totalActiveMinutes < 0.01) return; // Less than 1 second
        
        console.log(`[PlaytimeTracker] Syncing ${totalActiveMinutes.toFixed(2)} minutes for ${this.gameName}`);
        
        // Update both the global document and the game-specific document
        try {
            // 1. Get current playtime document
            const globalDocRef = this.db.collection('playtime').doc(this.userId);
            const gameDocRef = this.db.collection('playtime').doc(this.userId)
                                 .collection('games').doc(this.gameId);
            
            // Use a transaction to ensure atomic updates
            this.db.runTransaction(async (transaction) => {
                // Get the current game document
                const gameDoc = await transaction.get(gameDocRef);
                const globalDoc = await transaction.get(globalDocRef);
                
                // Calculate new values
                let totalMinutes = totalActiveMinutes;
                let sessionCount = 1;
                
                // Add to existing values if document exists
                if (gameDoc.exists) {
                    const data = gameDoc.data();
                    totalMinutes += (data.totalMinutes || 0);
                    sessionCount += (data.sessionCount || 0);
                }
                
                // Update game document
                transaction.set(gameDocRef, {
                    gameId: this.gameId,
                    gameName: this.gameName,
                    totalMinutes: totalMinutes,
                    sessionCount: sessionCount,
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                
                // Update global document
                const games = {};
                games[this.gameId] = {
                    gameId: this.gameId,
                    gameName: this.gameName,
                    totalMinutes: totalMinutes,
                    sessionCount: sessionCount,
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                transaction.set(globalDocRef, {
                    userId: this.userId,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                    games: games
                }, { merge: true });
                
                // Reset local active time after successful sync
                this.activeTime = 0;
                this.startTime = new Date();
                
                return Promise.resolve();
            }).catch(error => {
                console.error('[PlaytimeTracker] Error syncing playtime:', error);
            });
        } catch (error) {
            console.error('[PlaytimeTracker] Error syncing playtime:', error);
        }
    }
    
    // Handle page unload
    handleBeforeUnload(event) {
        // Sync one last time before the page unloads
        this.syncPlaytime();
    }
    
    // Clean up resources
    destroy() {
        this.stopTracking();
        
        // Remove event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        
        document.removeEventListener('mousemove', this.handleActivity);
        document.removeEventListener('keydown', this.handleActivity);
        document.removeEventListener('click', this.handleActivity);
        document.removeEventListener('touchstart', this.handleActivity);
        
        this.initialized = false;
    }
}

// Export the tracker if module exports are available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaytimeTracker;
} else {
    // Otherwise make it globally available
    window.PlaytimeTracker = PlaytimeTracker;
}
