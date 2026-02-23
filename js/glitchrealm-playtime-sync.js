/**
 * GlitchRealm Playtime Sync Utility
 * 
 * This utility reads playtime data from localStorage and syncs it to Firestore
 * It should be included on GlitchRealm pages where Firebase is available
 */

class GlitchRealmPlaytimeSync {
    constructor() {
        this.storageKey = 'glitchrealm_playtime_data';
        this.syncInProgress = false;
        this.autoSyncInterval = 5 * 60 * 1000; // 5 minutes
        this.autoSyncIntervalId = null;
        this.user = null;
        this.db = null;
        this.auth = null;
        
        this.init();
    }
    
    init() {
        
        // Check if Firebase is available
        if (typeof firebase !== 'undefined') {
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Listen for auth state changes
            this.auth.onAuthStateChanged(user => {
                this.user = user;
                if (user) {
                    // Sync immediately when user signs in
                    this.syncPlaytimeData();
                    // Start auto-sync
                    this.startAutoSync();
                } else {
                    this.stopAutoSync();
                }
            });
            
            // Listen for custom playtime update events
            window.addEventListener('playtimeDataUpdated', (event) => {
                // Sync after a short delay to batch updates
                setTimeout(() => this.syncPlaytimeData(), 2000);
            });
            
        } else {
            console.warn('[GlitchRealmPlaytimeSync] Firebase not available');
        }
    }
    
    startAutoSync() {
        if (this.autoSyncIntervalId) return;
        
        this.autoSyncIntervalId = setInterval(() => {
            this.syncPlaytimeData();
        }, this.autoSyncInterval);
    }
    
    stopAutoSync() {
        if (this.autoSyncIntervalId) {
            clearInterval(this.autoSyncIntervalId);
            this.autoSyncIntervalId = null;
        }
    }
    
    getLocalPlaytimeData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[GlitchRealmPlaytimeSync] Error reading localStorage:', error);
            return null;
        }
    }
    
    async syncPlaytimeData() {
        if (!this.user || !this.db || this.syncInProgress) {
            return;
        }
        
        const localData = this.getLocalPlaytimeData();
        if (!localData || !localData.needsSync) {
            return;
        }
        
        // Check if there are any games that need syncing
        const gamesToSync = Object.values(localData.games).filter(game => game.needsSync);
        if (gamesToSync.length === 0) {
            return;
        }
        
        this.syncInProgress = true;
        
        try {
            const userId = this.user.uid;
            const batch = this.db.batch();
            
            // Get the global playtime document
            const globalDocRef = this.db.collection('playtime').doc(userId);
            const globalDoc = await globalDocRef.get();
            
            let globalGames = {};
            if (globalDoc.exists()) {
                const data = globalDoc.data();
                globalGames = data.games || {};
            }
            
            // Process each game that needs syncing
            for (const game of gamesToSync) {
                const gameId = game.gameId;
                const gameDocRef = this.db.collection('playtime').doc(userId)
                                     .collection('games').doc(gameId);
                
                // Get existing game document
                const gameDoc = await gameDocRef.get();
                
                let totalMinutes = game.totalMinutes;
                let sessionCount = game.sessionCount;
                
                if (gameDoc.exists()) {
                    // Add to existing values
                    const existingData = gameDoc.data();
                    totalMinutes += (existingData.totalMinutes || 0);
                    sessionCount += (existingData.sessionCount || 0);
                }
                
                // Update individual game document
                batch.set(gameDocRef, {
                    gameId: gameId,
                    gameName: game.gameName,
                    totalMinutes: totalMinutes,
                    sessionCount: sessionCount,
                    lastPlayed: firebase.firestore.Timestamp.fromDate(new Date(game.lastPlayed))
                }, { merge: true });
                
                // Update global games object
                globalGames[gameId] = {
                    gameId: gameId,
                    gameName: game.gameName,
                    totalMinutes: totalMinutes,
                    sessionCount: sessionCount,
                    lastPlayed: firebase.firestore.Timestamp.fromDate(new Date(game.lastPlayed))
                };
                
            }
            
            // Update global document
            batch.set(globalDocRef, {
                userId: userId,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                games: globalGames
            }, { merge: true });
            
            // Commit the batch
            await batch.commit();
            
            
            // Mark all games as synced in localStorage
            this.markAllAsSynced();
            
            // Dispatch success event
            window.dispatchEvent(new CustomEvent('playtimeSyncComplete', {
                detail: {
                    success: true,
                    gamesSynced: gamesToSync.length
                }
            }));
            
        } catch (error) {
            console.error('[GlitchRealmPlaytimeSync] Error syncing to Firestore:', error);
            
            // Dispatch error event
            window.dispatchEvent(new CustomEvent('playtimeSyncComplete', {
                detail: {
                    success: false,
                    error: error.message
                }
            }));
        } finally {
            this.syncInProgress = false;
        }
    }
    
    markAllAsSynced() {
        try {
            const data = this.getLocalPlaytimeData();
            if (!data) return;
            
            data.needsSync = false;
            Object.values(data.games).forEach(game => {
                game.needsSync = false;
            });
            
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('[GlitchRealmPlaytimeSync] Error marking as synced:', error);
        }
    }
    
    // Manual sync method
    async forceSyncNow() {
        await this.syncPlaytimeData();
    }
    
    // Get sync status
    getSyncStatus() {
        const localData = this.getLocalPlaytimeData();
        if (!localData) {
            return { hasData: false, needsSync: false, gamesCount: 0 };
        }
        
        const gamesToSync = Object.values(localData.games).filter(game => game.needsSync);
        
        return {
            hasData: true,
            needsSync: localData.needsSync || gamesToSync.length > 0,
            gamesCount: Object.keys(localData.games).length,
            gamesToSyncCount: gamesToSync.length,
            lastUpdated: localData.lastUpdated,
            isUserAuthenticated: !!this.user,
            syncInProgress: this.syncInProgress
        };
    }
    
    // Clear all local playtime data (use with caution)
    clearLocalData() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('[GlitchRealmPlaytimeSync] Error clearing local data:', error);
        }
    }
}

// Initialize the sync utility when the script loads
let glitchRealmSync = null;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        glitchRealmSync = new GlitchRealmPlaytimeSync();
    });
} else {
    glitchRealmSync = new GlitchRealmPlaytimeSync();
}

// Make available globally
window.GlitchRealmPlaytimeSync = GlitchRealmPlaytimeSync;
window.glitchRealmSync = glitchRealmSync;

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlitchRealmPlaytimeSync;
}

// Console helpers