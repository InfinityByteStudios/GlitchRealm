/**
 * GlitchRealm Game SDK
 * Official SDK for integrating games with the GlitchRealm platform
 * Version: 1.0.0
 * 
 * Features:
 * - Playtime tracking
 * - Achievement system
 * - Event tracking
 * - Purchase/monetization
 * - User authentication
 * - Leaderboards
 */

class GlitchRealmSDK {
    constructor(config = {}) {
        this.gameId = config.gameId || this._detectGameId();
        this.gameName = config.gameName || document.title;
        this.apiVersion = '1.0.0';
        this.debug = config.debug || false;
        
        // State
        this.initialized = false;
        this.user = null;
        this.sessionStartTime = null;
        this.lastActivityTime = null;
        this.isActive = true;
        this.syncInterval = null;
        
        // Event listeners
        this.eventListeners = {};
        
        // Firebase references (will be set after init)
        this.auth = null;
        this.firestore = null;
        
        this._log('SDK initialized with config:', config);
    }
    
    /**
     * Initialize the SDK
     * Must be called before using any other SDK features
     */
    async init() {
        if (this.initialized) {
            this._log('SDK already initialized');
            return;
        }
        
        try {
            // Wait for Firebase to be available
            await this._waitForFirebase();
            
            this.auth = window.firebaseAuth;
            this.firestore = window.firebaseFirestore;
            
            // Listen for auth state changes
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                this._emit('authStateChanged', { user });
                
                if (user) {
                    this._startPlaytimeTracking();
                } else {
                    this._stopPlaytimeTracking();
                }
            });
            
            this.initialized = true;
            this._emit('initialized', { gameId: this.gameId, gameName: this.gameName });
            this._log('SDK initialized successfully');
            
        } catch (error) {
            console.error('[GlitchRealm SDK] Initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * PLAYTIME TRACKING
     */
    
    _startPlaytimeTracking() {
        if (!this.user || this.sessionStartTime) return;
        
        this.sessionStartTime = Date.now();
        this.lastActivityTime = Date.now();
        
        // Sync playtime every 30 seconds
        this.syncInterval = setInterval(() => {
            this._syncPlaytime();
        }, 30000);
        
        // Track window visibility
        document.addEventListener('visibilitychange', () => {
            this.isActive = !document.hidden;
            if (this.isActive) {
                this.lastActivityTime = Date.now();
            }
        });
        
        // Track user activity
        ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivityTime = Date.now();
            }, { passive: true });
        });
        
        // Sync on page unload
        window.addEventListener('beforeunload', () => {
            this._syncPlaytime(true);
        });
        
        this._log('Playtime tracking started');
    }
    
    _stopPlaytimeTracking() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        if (this.sessionStartTime) {
            this._syncPlaytime(true);
            this.sessionStartTime = null;
        }
        
        this._log('Playtime tracking stopped');
    }
    
    async _syncPlaytime(isFinal = false) {
        if (!this.user || !this.sessionStartTime) return;
        
        const now = Date.now();
        const sessionDuration = Math.floor((now - this.sessionStartTime) / 1000);
        
        // Only count as active if user was active in last 2 minutes
        const isCurrentlyActive = (now - this.lastActivityTime) < 120000;
        
        if (!isCurrentlyActive && !isFinal) return;
        
        try {
            const playtimeRef = window.firestoreDoc(
                this.firestore,
                `playtime/${this.user.uid}/games/${this.gameId}`
            );
            
            const increment = window.firestoreIncrement || window.firebaseFirestore.increment;
            
            await window.firestoreSetDoc(playtimeRef, {
                gameId: this.gameId,
                gameName: this.gameName,
                totalSeconds: increment(sessionDuration),
                lastPlayed: window.firestoreServerTimestamp(),
                userId: this.user.uid
            }, { merge: true });
            
            this._emit('playtimeSync', { duration: sessionDuration, isFinal });
            this._log(`Synced ${sessionDuration}s of playtime`);
            
            // Reset session start time
            this.sessionStartTime = now;
            
        } catch (error) {
            console.error('[GlitchRealm SDK] Playtime sync failed:', error);
        }
    }
    
    /**
     * Get user's total playtime for this game
     * @returns {Promise<number>} Total seconds played
     */
    async getPlaytime() {
        if (!this.user) return 0;
        
        try {
            const playtimeRef = window.firestoreDoc(
                this.firestore,
                `playtime/${this.user.uid}/games/${this.gameId}`
            );
            const snapshot = await window.firestoreGetDoc(playtimeRef);
            
            if (snapshot.exists()) {
                return snapshot.data().totalSeconds || 0;
            }
            return 0;
        } catch (error) {
            console.error('[GlitchRealm SDK] Failed to get playtime:', error);
            return 0;
        }
    }
    
    /**
     * ACHIEVEMENTS
     */
    
    /**
     * Unlock an achievement for the current user
     * @param {string} achievementId - Unique achievement identifier
     * @param {Object} metadata - Achievement data (name, description, icon, etc.)
     */
    async unlockAchievement(achievementId, metadata = {}) {
        if (!this.user) {
            this._log('Cannot unlock achievement: User not authenticated');
            return { success: false, error: 'NOT_AUTHENTICATED' };
        }
        
        try {
            const achievementRef = window.firestoreDoc(
                this.firestore,
                `achievements/${this.user.uid}/games/${this.gameId}/unlocked/${achievementId}`
            );
            
            const achievementData = {
                achievementId,
                gameId: this.gameId,
                gameName: this.gameName,
                unlockedAt: window.firestoreServerTimestamp(),
                ...metadata
            };
            
            await window.firestoreSetDoc(achievementRef, achievementData);
            
            this._emit('achievementUnlocked', achievementData);
            this._log('Achievement unlocked:', achievementId);
            
            return { success: true, achievement: achievementData };
            
        } catch (error) {
            console.error('[GlitchRealm SDK] Failed to unlock achievement:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Check if user has unlocked an achievement
     * @param {string} achievementId
     * @returns {Promise<boolean>}
     */
    async hasAchievement(achievementId) {
        if (!this.user) return false;
        
        try {
            const achievementRef = window.firestoreDoc(
                this.firestore,
                `achievements/${this.user.uid}/games/${this.gameId}/unlocked/${achievementId}`
            );
            const snapshot = await window.firestoreGetDoc(achievementRef);
            return snapshot.exists();
        } catch (error) {
            console.error('[GlitchRealm SDK] Failed to check achievement:', error);
            return false;
        }
    }
    
    /**
     * Get all unlocked achievements for current user
     * @returns {Promise<Array>}
     */
    async getAchievements() {
        if (!this.user) return [];
        
        try {
            const achievementsRef = window.firestoreCollection(
                this.firestore,
                `achievements/${this.user.uid}/games/${this.gameId}/unlocked`
            );
            const querySnapshot = await window.firestoreGetDocs(achievementsRef);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('[GlitchRealm SDK] Failed to get achievements:', error);
            return [];
        }
    }
    
    /**
     * EVENT TRACKING
     */
    
    /**
     * Track a custom game event
     * @param {string} eventName - Event identifier
     * @param {Object} eventData - Event payload
     */
    async trackEvent(eventName, eventData = {}) {
        if (!this.user) {
            this._log('Cannot track event: User not authenticated');
            return { success: false, error: 'NOT_AUTHENTICATED' };
        }
        
        try {
            const eventsRef = window.firestoreCollection(
                this.firestore,
                `game_events/${this.gameId}/events`
            );
            
            const event = {
                eventName,
                gameId: this.gameId,
                gameName: this.gameName,
                userId: this.user.uid,
                timestamp: window.firestoreServerTimestamp(),
                data: eventData
            };
            
            await window.firestoreAddDoc(eventsRef, event);
            
            this._emit('eventTracked', event);
            this._log('Event tracked:', eventName, eventData);
            
            return { success: true, event };
            
        } catch (error) {
            console.error('[GlitchRealm SDK] Failed to track event:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * LEADERBOARDS
     */
    
    /**
     * Submit a score to the leaderboard
     * @param {number} score - Numeric score
     * @param {Object} metadata - Additional data (level, character, etc.)
     */
    async submitScore(score, metadata = {}) {
        if (!this.user) {
            this._log('Cannot submit score: User not authenticated');
            return { success: false, error: 'NOT_AUTHENTICATED' };
        }
        
        if (typeof score !== 'number') {
            return { success: false, error: 'INVALID_SCORE' };
        }
        
        try {
            const scoreRef = window.firestoreDoc(
                this.firestore,
                `leaderboards/${this.gameId}/scores/${this.user.uid}`
            );
            
            const currentSnapshot = await window.firestoreGetDoc(scoreRef);
            const currentScore = currentSnapshot.exists() ? currentSnapshot.data().score : 0;
            
            // Only update if new score is higher
            if (score <= currentScore && currentSnapshot.exists()) {
                this._log('Score not submitted: Not a high score');
                return { success: false, error: 'NOT_HIGH_SCORE', currentScore };
            }
            
            const scoreData = {
                userId: this.user.uid,
                displayName: this.user.displayName || 'Anonymous',
                photoURL: this.user.photoURL || null,
                score,
                gameId: this.gameId,
                gameName: this.gameName,
                submittedAt: window.firestoreServerTimestamp(),
                ...metadata
            };
            
            await window.firestoreSetDoc(scoreRef, scoreData);
            
            this._emit('scoreSubmitted', scoreData);
            this._log('Score submitted:', score);
            
            return { success: true, score: scoreData, isNewRecord: true };
            
        } catch (error) {
            console.error('[GlitchRealm SDK] Failed to submit score:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get top scores from leaderboard
     * @param {number} limit - Number of scores to retrieve (default: 10)
     * @returns {Promise<Array>}
     */
    async getLeaderboard(limit = 10) {
        try {
            const scoresRef = window.firestoreCollection(
                this.firestore,
                `leaderboards/${this.gameId}/scores`
            );
            
            const q = window.firestoreQuery(
                scoresRef,
                window.firestoreOrderBy('score', 'desc'),
                window.firestoreLimit(limit)
            );
            
            const querySnapshot = await window.firestoreGetDocs(q);
            
            return querySnapshot.docs.map((doc, index) => ({
                rank: index + 1,
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('[GlitchRealm SDK] Failed to get leaderboard:', error);
            return [];
        }
    }
    
    /**
     * Get current user's rank
     * @returns {Promise<Object>}
     */
    async getUserRank() {
        if (!this.user) return null;
        
        try {
            const scoreRef = window.firestoreDoc(
                this.firestore,
                `leaderboards/${this.gameId}/scores/${this.user.uid}`
            );
            const snapshot = await window.firestoreGetDoc(scoreRef);
            
            if (!snapshot.exists()) return null;
            
            const userScore = snapshot.data().score;
            
            // Count how many scores are higher
            const scoresRef = window.firestoreCollection(
                this.firestore,
                `leaderboards/${this.gameId}/scores`
            );
            const q = window.firestoreQuery(
                scoresRef,
                window.firestoreWhere('score', '>', userScore)
            );
            const higherScores = await window.firestoreGetDocs(q);
            
            return {
                rank: higherScores.size + 1,
                score: userScore,
                ...snapshot.data()
            };
        } catch (error) {
            console.error('[GlitchRealm SDK] Failed to get user rank:', error);
            return null;
        }
    }
    
    /**
     * PURCHASES/MONETIZATION
     */
    
    /**
     * Record an in-game purchase or tip
     * @param {Object} purchaseData - Purchase details
     */
    async recordPurchase(purchaseData) {
        if (!this.user) {
            this._log('Cannot record purchase: User not authenticated');
            return { success: false, error: 'NOT_AUTHENTICATED' };
        }
        
        try {
            const purchasesRef = window.firestoreCollection(
                this.firestore,
                `purchases/${this.user.uid}/games/${this.gameId}/transactions`
            );
            
            const purchase = {
                gameId: this.gameId,
                gameName: this.gameName,
                userId: this.user.uid,
                timestamp: window.firestoreServerTimestamp(),
                ...purchaseData
            };
            
            const docRef = await window.firestoreAddDoc(purchasesRef, purchase);
            
            this._emit('purchaseRecorded', { id: docRef.id, ...purchase });
            this._log('Purchase recorded:', purchaseData);
            
            return { success: true, purchaseId: docRef.id, purchase };
            
        } catch (error) {
            console.error('[GlitchRealm SDK] Failed to record purchase:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * AUTHENTICATION HELPERS
     */
    
    /**
     * Get current user
     * @returns {Object|null}
     */
    getUser() {
        return this.user;
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.user;
    }
    
    /**
     * Redirect to sign in page
     */
    redirectToSignIn() {
        window.location.href = 'https://auth.glitchrealm.ca/signin.html';
    }
    
    /**
     * EVENT SYSTEM
     */
    
    /**
     * Listen for SDK events
     * @param {string} eventName
     * @param {Function} callback
     */
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }
    
    /**
     * Remove event listener
     * @param {string} eventName
     * @param {Function} callback
     */
    off(eventName, callback) {
        if (!this.eventListeners[eventName]) return;
        this.eventListeners[eventName] = this.eventListeners[eventName].filter(
            cb => cb !== callback
        );
    }
    
    /**
     * Emit an event
     * @private
     */
    _emit(eventName, data) {
        if (!this.eventListeners[eventName]) return;
        this.eventListeners[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[GlitchRealm SDK] Event listener error (${eventName}):`, error);
            }
        });
    }
    
    /**
     * UTILITY METHODS
     */
    
    /**
     * Wait for Firebase to be available
     * @private
     */
    async _waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds
            
            const check = () => {
                if (window.firebaseAuth && window.firebaseFirestore) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Firebase not available'));
                } else {
                    attempts++;
                    setTimeout(check, 100);
                }
            };
            
            check();
        });
    }
    
    /**
     * Auto-detect game ID from URL
     * @private
     */
    _detectGameId() {
        const path = window.location.pathname;
        const match = path.match(/\/Games\/([^\/]+)/);
        return match ? match[1].toLowerCase() : 'unknown';
    }
    
    /**
     * Debug logging
     * @private
     */
    _log(...args) {
        if (this.debug) {
            console.log('[GlitchRealm SDK]', ...args);
        }
    }
    
    /**
     * Cleanup and disconnect
     */
    destroy() {
        this._stopPlaytimeTracking();
        this.eventListeners = {};
        this.initialized = false;
        this._log('SDK destroyed');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlitchRealmSDK;
}

// Global export
window.GlitchRealmSDK = GlitchRealmSDK;
