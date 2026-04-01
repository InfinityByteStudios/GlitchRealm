/**
 * GlitchRealm Wishlist Manager
 * Handles game wishlist functionality (save to play later)
 */

import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

class WishlistManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.wishlist = new Map(); // gameId -> { addedAt, gameTitle, coverImageUrl }
        this.listeners = new Set();
        this.unsubscribe = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        // Wait for Firebase to initialize
        await this._waitForFirebase();
        
        this.db = getFirestore(window.firebaseApp);
        this.auth = getAuth(window.firebaseApp);
        
        onAuthStateChanged(this.auth, async (user) => {
            this.currentUser = user;
            if (user) {
                await this._loadWishlist();
                this._subscribeToChanges();
            } else {
                this.wishlist.clear();
                if (this.unsubscribe) {
                    this.unsubscribe();
                    this.unsubscribe = null;
                }
            }
            this._notifyListeners();
        });
        
        this.initialized = true;
    }

    _waitForFirebase() {
        return new Promise((resolve) => {
            if (window.firebaseApp && window.firebaseAuth) {
                resolve();
                return;
            }
            
            const checkInterval = setInterval(() => {
                if (window.firebaseApp && window.firebaseAuth) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });
    }

    async _loadWishlist() {
        if (!this.currentUser) return;
        
        try {
            const wishlistRef = collection(this.db, 'users', this.currentUser.uid, 'wishlist');
            const snapshot = await getDocs(wishlistRef);
            
            this.wishlist.clear();
            snapshot.forEach(doc => {
                this.wishlist.set(doc.id, doc.data());
            });
        } catch (error) {
            console.error('Error loading wishlist:', error);
        }
    }

    _subscribeToChanges() {
        if (!this.currentUser || this.unsubscribe) return;
        
        const wishlistRef = collection(this.db, 'users', this.currentUser.uid, 'wishlist');
        
        this.unsubscribe = onSnapshot(wishlistRef, (snapshot) => {
            this.wishlist.clear();
            snapshot.forEach(doc => {
                this.wishlist.set(doc.id, doc.data());
            });
            this._notifyListeners();
        }, (error) => {
            console.error('Wishlist subscription error:', error);
        });
    }

    /**
     * Add a game to the wishlist
     * @param {string} gameId - The game document ID
     * @param {object} gameData - Optional game metadata to store
     */
    async addToWishlist(gameId, gameData = {}) {
        if (!this.currentUser) {
            throw new Error('Must be signed in to add to wishlist');
        }
        
        const wishlistDoc = doc(this.db, 'users', this.currentUser.uid, 'wishlist', gameId);
        
        await setDoc(wishlistDoc, {
            addedAt: serverTimestamp(),
            gameTitle: gameData.title || null,
            coverImageUrl: gameData.coverImageUrl || null,
            playUrl: gameData.playUrl || null,
        });
        
        // Optimistic update
        this.wishlist.set(gameId, {
            addedAt: new Date(),
            ...gameData,
        });
        
        this._notifyListeners();
    }

    /**
     * Remove a game from the wishlist
     * @param {string} gameId - The game document ID
     */
    async removeFromWishlist(gameId) {
        if (!this.currentUser) {
            throw new Error('Must be signed in to remove from wishlist');
        }
        
        const wishlistDoc = doc(this.db, 'users', this.currentUser.uid, 'wishlist', gameId);
        await deleteDoc(wishlistDoc);
        
        // Optimistic update
        this.wishlist.delete(gameId);
        this._notifyListeners();
    }

    /**
     * Toggle a game in the wishlist
     * @param {string} gameId - The game document ID
     * @param {object} gameData - Optional game metadata to store if adding
     * @returns {boolean} - True if added, false if removed
     */
    async toggleWishlist(gameId, gameData = {}) {
        if (this.isInWishlist(gameId)) {
            await this.removeFromWishlist(gameId);
            return false;
        } else {
            await this.addToWishlist(gameId, gameData);
            return true;
        }
    }

    /**
     * Check if a game is in the wishlist
     * @param {string} gameId - The game document ID
     * @returns {boolean}
     */
    isInWishlist(gameId) {
        return this.wishlist.has(gameId);
    }

    /**
     * Get all wishlist items
     * @returns {Array} Array of { gameId, ...gameData }
     */
    getWishlistItems() {
        return Array.from(this.wishlist.entries()).map(([gameId, data]) => ({
            gameId,
            ...data,
        }));
    }

    /**
     * Get wishlist count
     * @returns {number}
     */
    getWishlistCount() {
        return this.wishlist.size;
    }

    /**
     * Add a listener for wishlist changes
     * @param {Function} callback - Called when wishlist changes
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remove a listener
     * @param {Function} callback
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    _notifyListeners() {
        const items = this.getWishlistItems();
        this.listeners.forEach(callback => {
            try {
                callback(items, this.currentUser);
            } catch (e) {
                console.error('Wishlist listener error:', e);
            }
        });
    }

    /**
     * Check if user is signed in
     * @returns {boolean}
     */
    isSignedIn() {
        return !!this.currentUser;
    }
}

// Create singleton instance
const wishlistManager = new WishlistManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => wishlistManager.init());
} else {
    wishlistManager.init();
}

// Export for ES modules
export { wishlistManager, WishlistManager };

// Also expose globally for non-module scripts
window.GlitchRealmWishlist = wishlistManager;
