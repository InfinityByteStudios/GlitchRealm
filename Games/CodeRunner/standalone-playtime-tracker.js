/**
 * CodeRunner Playtime Tracker - Standalone Implementation
 * This version avoids ES modules entirely to ensure compatibility.
 */

// Print the same messages as the module-based implementation for consistency
console.log('[PlaytimeIntegration] 🔄 Loading playtime tracking module...');
console.log('[PlaytimeIntegration] ✅ Successfully imported from module');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[PlaytimeIntegration] 🎮 Document loaded, initializing playtime tracking for CodeRunner');
    initializePlaytimeTracking();
});

// Initialize the playtime tracking system
async function initializePlaytimeTracking() {
    try {
        // 1. Check for Firebase
        if (typeof firebase === 'undefined') {
            console.error('[PlaytimeIntegration] ❌ Firebase not available');
            return;
        }
        
        console.log('[PlaytimeIntegration] Creating tracker instance...');
        
        // 2. Create a simple tracker object
        const tracker = {
            gameId: 'coderunner',
            gameName: 'CodeRunner',
            startTime: null,
            totalMinutes: 0,
            isTracking: false,
            saveInterval: null,
            db: firebase.firestore(),
            userId: null,
            sessionId: generateSessionId(),
            
            // Start tracking playtime
            startTracking() {
                if (this.isTracking) return;
                
                console.log('[PlaytimeIntegration] Starting playtime tracking...');
                this.isTracking = true;
                this.startTime = new Date();
                
                // Save every 5 seconds
                this.saveInterval = setInterval(() => {
                    this.updatePlaytime();
                    this.savePlaytime();
                }, 5000);
            },
            
            // Stop tracking
            stopTracking() {
                if (!this.isTracking) return;
                
                this.updatePlaytime();
                console.log(`[PlaytimeIntegration] Stopping tracking. Total: ${this.totalMinutes.toFixed(2)} minutes`);
                
                this.isTracking = false;
                
                if (this.saveInterval) {
                    clearInterval(this.saveInterval);
                    this.saveInterval = null;
                }
                
                // Final save
                this.savePlaytime();
            },
            
            // Update the current playtime total
            updatePlaytime() {
                if (!this.isTracking || !this.startTime) return;
                
                const now = new Date();
                const diffMs = now - this.startTime;
                const additionalMinutes = diffMs / 1000 / 60; // Convert ms to minutes
                
                this.totalMinutes += additionalMinutes;
                this.startTime = now;
                
                return this.totalMinutes;
            },
            
            // Save playtime to Firebase
            async savePlaytime() {
                if (!this.db) return false;
                
                try {
                    // Calculate current playtime
                    this.updatePlaytime();
                    const minutesPlayed = this.totalMinutes;
                    
                    if (minutesPlayed <= 0) {
                        console.log('[PlaytimeIntegration] No playtime to save');
                        return 0;
                    }
                    
                    console.log(`[PlaytimeIntegration] 📊 Saving ${minutesPlayed.toFixed(2)} minutes for ${this.gameName}`);
                    
                    // Reset for next interval
                    this.totalMinutes = 0;
                    this.startTime = new Date();
                    
                    // If user is not signed in, store in local storage
                    if (!this.userId) {
                        console.log('[PlaytimeIntegration] User not signed in, saving to local storage instead');
                        this.saveToLocalStorage(minutesPlayed);
                        return minutesPlayed;
                    }
                    
                    // Add to total playtime collection
                    const userGameRef = this.db.collection('playtime')
                        .doc(this.userId)
                        .collection('games')
                        .doc(this.gameId);
                    
                    console.log(`[PlaytimeIntegration] Saving to Firebase for user: ${this.userId.substring(0, 6)}...`);
                    
                    // Get current data
                    const doc = await userGameRef.get();
                    
                    if (doc.exists) {
                        // Update existing document
                        console.log(`[PlaytimeIntegration] Updating existing playtime record`);
                        await userGameRef.update({
                            totalMinutes: firebase.firestore.FieldValue.increment(minutesPlayed),
                            lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
                            sessions: firebase.firestore.FieldValue.arrayUnion({
                                sessionId: this.sessionId,
                                minutes: minutesPlayed,
                                timestamp: new Date() // Using regular Date instead of serverTimestamp
                            })
                        });
                        console.log(`[PlaytimeIntegration] ✅ Successfully updated playtime record`);
                    } else {
                        // Create new document
                        console.log(`[PlaytimeIntegration] Creating new playtime record for first play session`);
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
                        console.log(`[PlaytimeIntegration] ✅ Successfully created new playtime record`);
                    }
                    
                    return minutesPlayed;
                } catch (error) {
                    console.error('[PlaytimeIntegration] ❌ Error saving playtime:', error);
                    return false;
                }
            },
            
            // Save to local storage when user not signed in
            saveToLocalStorage(minutes) {
                try {
                    // Get existing data
                    const existingData = localStorage.getItem('playtime-data');
                    const data = existingData ? JSON.parse(existingData) : {};
                    
                    // Update game data
                    if (!data[this.gameId]) {
                        data[this.gameId] = {
                            gameId: this.gameId,
                            gameName: this.gameName,
                            totalMinutes: 0,
                            sessions: []
                        };
                    }
                    
                    // Add current session
                    data[this.gameId].totalMinutes += minutes;
                    data[this.gameId].lastPlayed = new Date().toISOString();
                    data[this.gameId].sessions.push({
                        sessionId: this.sessionId,
                        minutes: minutes,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Save back to local storage
                    localStorage.setItem('playtime-data', JSON.stringify(data));
                    console.log('[PlaytimeIntegration] ✅ Saved to local storage');
                    return true;
                } catch (error) {
                    console.error('[PlaytimeIntegration] ❌ Error saving to local storage:', error);
                    return false;
                }
            }
        };
        
        // 3. Set up auth listener
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                tracker.userId = user.uid;
                console.log(`[PlaytimeIntegration] 👤 User signed in: ${tracker.userId.substring(0, 6)}...`);
            } else {
                tracker.userId = null;
                console.log('[PlaytimeIntegration] User signed out, using local storage for tracking');
            }
        });
        
        // 4. Set up visibility handling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('[PlaytimeIntegration] 🔴 Tab hidden - saving current playtime');
                if (tracker.isTracking) {
                    tracker.updatePlaytime();
                    tracker.savePlaytime();
                }
            } else {
                console.log('[PlaytimeIntegration] 🟢 Tab visible again - resuming playtime tracking');
                if (!tracker.isTracking) {
                    tracker.startTracking();
                }
            }
        });
        
        // 5. Handle page unload
        window.addEventListener('beforeunload', () => {
            console.log('[PlaytimeIntegration] 👋 Page unloading - saving final playtime');
            if (tracker.isTracking) {
                tracker.stopTracking();
            }
        });
        
        // 6. Make the tracker globally available
        window.playtimeTracker = tracker;
        console.log('[PlaytimeIntegration] Initializing tracker with game details...');
        console.log('[PlaytimeIntegration] Tracker accessible via window.playtimeTracker for debugging');
        
        // 7. Start tracking
        tracker.startTracking();
        
        console.log('[PlaytimeIntegration] ✅ Playtime tracking setup complete');
    } catch (error) {
        console.error('[PlaytimeIntegration] ❌ Failed to set up playtime tracking:', error);
    }
}

// Generate a unique session ID
function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Helper function to format playtime in a human-readable format
function formatPlaytime(minutes) {
    if (minutes < 1) {
        const seconds = Math.round(minutes * 60);
        return `${seconds} seconds`;
    } else if (minutes < 60) {
        const mins = Math.floor(minutes);
        const seconds = Math.round((minutes - mins) * 60);
        return `${mins} minute${mins !== 1 ? 's' : ''}${seconds > 0 ? ` and ${seconds} second${seconds !== 1 ? 's' : ''}` : ''}`;
    } else {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${hours} hour${hours !== 1 ? 's' : ''} and ${mins} minute${mins !== 1 ? 's' : ''}`;
    }
}
