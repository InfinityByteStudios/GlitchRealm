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
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.userId = user.uid;
                this.log(`User signed in: ${this.userId}`);
                
                // If we're already tracking, save current session
                if (this.isTracking) {
                    this._savePlaytime();
                }
            } else {
                this.userId = null;
                this.log('User signed out');
            }
        });
        
        // Set up page visibility listeners
        document.addEventListener('visibilitychange', this._handleVisibilityChange.bind(this));
        window.addEventListener('blur', this._handleWindowBlur.bind(this));
        window.addEventListener('focus', this._handleWindowFocus.bind(this));
        
        // Set up interval for periodic saves
        this.saveInterval = setInterval(this._savePlaytime.bind(this), 5000); // Save every 5 seconds
        
        // Set up beforeunload handler to save on exit
        window.addEventListener('beforeunload', this._handleBeforeUnload.bind(this));
        
        return true;
    }
    
    /**
     * Start tracking playtime
     * @returns {boolean} - Success status
     */
    startTracking() {
        if (this.isTracking) {
            this.log('Playtime tracking already active');
            return false;
        }
        
        this.startTime = new Date();
        this.isTracking = true;
        this.totalMinutes = 0;
        
        this.log(`Started playtime tracking at ${this.startTime.toISOString()}`);
        return true;
    }
    
    /**
     * Stop tracking playtime
     * @param {boolean} save - Whether to save the current session
     * @returns {number} - Minutes tracked in this session
     */
    stopTracking(save = true) {
        if (!this.isTracking) {
            this.log('Playtime tracking not active');
            return 0;
        }
        
        const endTime = new Date();
        const durationMinutes = this._calculateMinutes(this.startTime, endTime);
        this.totalMinutes += durationMinutes;
        
        this.log(`Stopped playtime tracking. Session duration: ${durationMinutes.toFixed(2)} minutes`);
        
        if (save) {
            this._savePlaytime();
        }
        
        this.isTracking = false;
        return durationMinutes;
    }
    
    /**
     * Get the total minutes tracked in the current session
     * @returns {number} - Total minutes
     */
    getTotalMinutes() {
        if (!this.isTracking) {
            return this.totalMinutes;
        }
        
        // Calculate current duration and add to total
        const now = new Date();
        const currentDuration = this._calculateMinutes(this.startTime, now);
        return this.totalMinutes + currentDuration;
    }
    
    /**
     * Calculate minutes between two dates
     * @private
     * @param {Date} start - Start time
     * @param {Date} end - End time
     * @returns {number} - Minutes between dates
     */
    _calculateMinutes(start, end) {
        const diffMs = end - start;
        return diffMs / (1000 * 60); // Convert ms to minutes
    }
    
    /**
     * Generate a unique session ID
     * @private
     * @returns {string} - Session ID
     */
    _generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    /**
     * Save playtime to Firebase
     * @private
     * @returns {Promise<boolean>} - Success status
     */
    async _savePlaytime() {
        if (!this.db || !this.gameId) {
            return false;
        }
        
        try {
            // Calculate current playtime
            const minutesPlayed = this.getTotalMinutes();
            if (minutesPlayed <= 0) {
                this.log('No playtime to save');
                return false;
            }
            
            this.log(`Saving playtime: ${minutesPlayed.toFixed(2)} minutes`);
            
            // Reset tracking but keep active
            if (this.isTracking) {
                this.totalMinutes = 0;
                this.startTime = new Date();
            }
            
            // If user is not signed in, store in local storage
            if (!this.userId) {
                this._saveLocalPlaytime(minutesPlayed);
                return true;
            }
            
            // Add to total playtime collection
            const userGameRef = this.db.collection('playtime')
                .doc(this.userId)
                .collection('games')
                .doc(this.gameId);
            
            // Get current data
            const doc = await userGameRef.get();
            
            if (doc.exists) {
                // Update existing document
                await userGameRef.update({
                    totalMinutes: firebase.firestore.FieldValue.increment(minutesPlayed),
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                    sessions: firebase.firestore.FieldValue.arrayUnion({
                        sessionId: this.sessionId,
                        minutes: minutesPlayed,
                        timestamp: new Date() // Using regular Date instead of serverTimestamp
                    })
                });
            } else {
                // Create new document
                await userGameRef.set({
                    gameId: this.gameId,
                    gameName: this.gameName,
                    totalMinutes: minutesPlayed,
                    firstPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                    lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                    sessions: [{
                        sessionId: this.sessionId,
                        minutes: minutesPlayed,
                        timestamp: new Date() // Using regular Date instead of serverTimestamp
                    }]
                });
            }
            
            return true;
        } catch (error) {
            console.error('Error saving playtime:', error);
            return false;
        }
    }
    
    /**
     * Save playtime to local storage (for non-authenticated users)
     * @private
     * @param {number} minutes - Minutes to save
     */
    _saveLocalPlaytime(minutes) {
        try {
            const storageKey = `playtime_${this.gameId}`;
            const storedData = localStorage.getItem(storageKey);
            
            let playtimeData = storedData ? JSON.parse(storedData) : {
                gameId: this.gameId,
                gameName: this.gameName,
                totalMinutes: 0,
                firstPlayed: new Date().toISOString(),
                sessions: []
            };
            
            // Update data
            playtimeData.totalMinutes += minutes;
            playtimeData.lastPlayed = new Date().toISOString();
            playtimeData.sessions.push({
                sessionId: this.sessionId,
                minutes: minutes,
                timestamp: new Date().toISOString()
            });
            
            // Limit the number of sessions stored to prevent storage issues
            if (playtimeData.sessions.length > 10) {
                playtimeData.sessions = playtimeData.sessions.slice(-10);
            }
            
            localStorage.setItem(storageKey, JSON.stringify(playtimeData));
            this.log(`Saved ${minutes.toFixed(2)} minutes to local storage`);
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    }
    
    /**
     * Handle visibility change events
     * @private
     * @param {Event} event - Visibility change event
     */
    _handleVisibilityChange(event) {
        if (document.hidden) {
            this.log('Page hidden, pausing tracking');
            this._pauseTracking();
        } else {
            this.log('Page visible, resuming tracking');
            this._resumeTracking();
        }
    }
    
    /**
     * Handle window blur events
     * @private
     * @param {Event} event - Blur event
     */
    _handleWindowBlur(event) {
        this.log('Window lost focus, pausing tracking');
        this._pauseTracking();
    }
    
    /**
     * Handle window focus events
     * @private
     * @param {Event} event - Focus event
     */
    _handleWindowFocus(event) {
        this.log('Window gained focus, resuming tracking');
        this._resumeTracking();
    }
    
    /**
     * Handle beforeunload events
     * @private
     * @param {Event} event - Beforeunload event
     */
    _handleBeforeUnload(event) {
        this.log('Page unloading, saving final playtime');
        this.stopTracking(true);
    }
    
    /**
     * Pause tracking without stopping completely
     * @private
     */
    _pauseTracking() {
        if (!this.isTracking) return;
        
        // Calculate current session time and add to total
        const now = new Date();
        const currentDuration = this._calculateMinutes(this.startTime, now);
        this.totalMinutes += currentDuration;
        
        // Stop tracking but don't save yet
        this.isTracking = false;
    }
    
    /**
     * Resume tracking after pause
     * @private
     */
    _resumeTracking() {
        if (this.isTracking) return;
        
        // Start a new tracking period
        this.startTime = new Date();
        this.isTracking = true;
    }
    
    /**
     * Log message if debug is enabled
     * @private
     * @param {string} message - Message to log
     */
    log(message) {
        if (this.DEBUG) {
            console.log(`[PlaytimeTracker] ${message}`);
        }
    }
}

// Make available in browser global scope
window.GamePlaytimeTracker = GamePlaytimeTracker;

// Also export as default for ES modules
export default GamePlaytimeTracker;
