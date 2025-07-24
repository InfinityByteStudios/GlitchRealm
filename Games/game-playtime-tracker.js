/**
 * GlitchRealm Game Playtime Tracker
 * 
 * This module tracks gameplay time for all GlitchRealm games and saves it to Firebase.
 * It handles:
 * - Starting/stopping playtime tracking
 * - Tracking when games are active vs. hidden/inactive
 * - Periodically saving playtime data to Firebase
 * - Handling session tracking across page reloads
 */

class GamePlaytimeTracker {
    constructor() {
        this.gameId = null;       // Unique ID for the game (e.g., "bytesurge")
        this.gameName = null;     // Display name for the game (e.g., "ByteSurge")
        this.startTime = null;    // When the current tracking session started
        this.totalMinutes = 0;    // Total minutes in current session
        this.isTracking = false;  // Whether tracking is currently active
        this.saveInterval = null; // Interval for periodic saves
        this.db = null;           // Firestore reference
        this.userId = null;       // Current user ID
        this.sessionId = null;    // Unique ID for this play session
        this.DEBUG = false;       // Enable debug logging
    }

    /**
     * Initialize the playtime tracker
     * @param {string} gameId - Unique identifier for the game (lowercase, no spaces)
     * @param {string} gameName - Display name of the game
     * @param {boolean} debug - Enable debug logging
     * @returns {Promise<boolean>} - Success status
     */
    async init(gameId, gameName, debug = false) {
        this.gameId = gameId;
        this.gameName = gameName;
        this.DEBUG = debug;
        this.sessionId = this._generateSessionId();
        
        this.log(`Initializing playtime tracker for ${gameName} (${gameId})`);
        
        // Check for Firebase
        if (typeof firebase === 'undefined') {
            console.error('Firebase not available. Playtime tracking disabled.');
            return false;
        }
        
        // Get Firestore instance
        this.db = firebase.firestore();
        
        // Set up auth listener
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.userId = user.uid;
                this.log(`User authenticated: ${user.email}`);
                
                // If we were tracking before auth, save that data now
                if (this.isTracking) {
                    this._savePlaytimeData();
                }
            } else {
                this.userId = null;
                this.log('User signed out. Playtime tracking will continue but will not be saved.');
            }
        });
        
        // Set up event listeners
        this._setupEventListeners();
        
        return true;
    }
    
    /**
     * Start tracking playtime
     * @returns {boolean} - Whether tracking started successfully
     */
    startTracking() {
        if (this.isTracking) {
            this.log('Already tracking playtime');
            return false;
        }
        
        this.log('Starting playtime tracking');
        this.isTracking = true;
        this.startTime = new Date();
        
        // Save every 5 seconds
        this.saveInterval = setInterval(() => {
            this._updatePlaytime();
            this._savePlaytimeData();
        }, 5000);
        
        // Dispatch event for other systems
        this._dispatchTrackingEvent('trackingStarted');
        
        return true;
    }
    
    /**
     * Stop tracking playtime
     * @param {boolean} save - Whether to save data immediately
     * @returns {number} - Total minutes tracked in this session
     */
    stopTracking(save = true) {
        if (!this.isTracking) {
            this.log('Not currently tracking playtime');
            return 0;
        }
        
        this.log('Stopping playtime tracking');
        
        // Update one last time
        this._updatePlaytime();
        
        // Clear interval
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }
        
        this.isTracking = false;
        
        // Save if requested
        if (save && this.userId) {
            this._savePlaytimeData();
        }
        
        // Dispatch event for other systems
        this._dispatchTrackingEvent('trackingStopped', {
            minutes: this.totalMinutes
        });
        
        return this.totalMinutes;
    }
    
    /**
     * Update the total playtime based on elapsed time
     * @private
     */
    _updatePlaytime() {
        if (!this.isTracking || !this.startTime) return;
        
        const now = new Date();
        const elapsedMinutes = (now - this.startTime) / 1000 / 60;
        
        this.totalMinutes += elapsedMinutes;
        this.startTime = now;
        
        this.log(`Updated playtime: +${elapsedMinutes.toFixed(2)} minutes, total: ${this.totalMinutes.toFixed(2)} minutes`);
    }
    
    /**
     * Save the current playtime data to Firebase
     * @private
     */
    async _savePlaytimeData() {
        if (!this.userId || this.totalMinutes <= 0) {
            return;
        }
        
        try {
            this.log(`Saving playtime data: ${this.totalMinutes.toFixed(2)} minutes`);
            
            // Get references to both document locations
            const globalDocRef = this.db.collection('playtime').doc(this.userId);
            const gameDocRef = this.db.collection('playtime').doc(this.userId)
                              .collection('games').doc(this.gameId);
            
            // Get current data for the game document
            const gameDoc = await gameDocRef.get();
            const gameData = gameDoc.exists ? gameDoc.data() : {
                gameId: this.gameId,
                gameName: this.gameName,
                totalMinutes: 0,
                sessionCount: 0,
                lastPlayed: null
            };
            
            // Update the game document
            const updatedGameData = {
                gameId: this.gameId,
                gameName: this.gameName,
                totalMinutes: (gameData.totalMinutes || 0) + this.totalMinutes,
                sessionCount: (gameData.sessionCount || 0) + 1,
                lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Use a batch to update both documents
            const batch = this.db.batch();
            
            // Update game document
            batch.set(gameDocRef, updatedGameData);
            
            // Update global document with the game info
            batch.set(globalDocRef, {
                userId: this.userId,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                [`games.${this.gameId}`]: updatedGameData
            }, { merge: true });
            
            // Commit the batch
            await batch.commit();
            
            // Reset session time after saving
            this.totalMinutes = 0;
            this.startTime = new Date();
            
            this.log('Playtime data saved successfully');
        } catch (error) {
            console.error('Error saving playtime data:', error);
        }
    }
    
    /**
     * Set up event listeners for visibility and page unload
     * @private
     */
    _setupEventListeners() {
        // Handle tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.isTracking) {
                    this.log('Tab hidden - updating and saving playtime');
                    this._updatePlaytime();
                    this._savePlaytimeData();
                }
            } else {
                if (this.isTracking) {
                    this.log('Tab visible again - resetting start time');
                    this.startTime = new Date();
                }
            }
        });
        
        // Handle page unload/close
        window.addEventListener('beforeunload', () => {
            if (this.isTracking) {
                this.log('Page unloading - saving final playtime');
                this._updatePlaytime();
                this._savePlaytimeData();
            }
        });
        
        // Handle game-specific events if they exist
        window.addEventListener('gameStarted', () => {
            this.log('Game started event detected');
            if (!this.isTracking) {
                this.startTracking();
            }
        });
        
        window.addEventListener('gamePaused', () => {
            this.log('Game paused event detected');
            // Optionally pause tracking here
        });
        
        window.addEventListener('gameEnded', () => {
            this.log('Game ended event detected');
            if (this.isTracking) {
                this.stopTracking(true);
            }
        });
    }
    
    /**
     * Generate a unique session ID
     * @private
     * @returns {string} - Unique session ID
     */
    _generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    /**
     * Dispatch a tracking event
     * @private
     * @param {string} eventName - Name of the event
     * @param {Object} data - Additional data for the event
     */
    _dispatchTrackingEvent(eventName, data = {}) {
        const event = new CustomEvent(`playtime:${eventName}`, {
            detail: {
                gameId: this.gameId,
                gameName: this.gameName,
                sessionId: this.sessionId,
                ...data
            }
        });
        
        window.dispatchEvent(event);
    }
    
    /**
     * Public method to save playtime data
     * This is a convenience method that calls the private _savePlaytimeData method
     */
    savePlaytimeData() {
        // Update the playtime before saving
        this._updatePlaytime();
        // Save the data
        return this._savePlaytimeData();
    }
    
    /**
     * Debug logging
     * @private
     * @param {string} message - Message to log
     */
    log(message) {
        if (this.DEBUG) {
            console.log(`[PlaytimeTracker:${this.gameId}] ${message}`);
        }
    }
}

// Make available globally
window.GamePlaytimeTracker = GamePlaytimeTracker;

// If module system is available, export the class
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GamePlaytimeTracker;
    } else if (typeof exports !== 'undefined') {
        exports.default = GamePlaytimeTracker;
    }
} catch (e) {
    // Not in a module context, which is fine
    console.log("Not running in module context, GamePlaytimeTracker is available globally");
}