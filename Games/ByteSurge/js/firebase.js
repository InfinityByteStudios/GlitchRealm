// ByteSurge: Firebase Integration - Authentication, Cloud Save & Leaderboard
// Firebase configuration and initialization

// Firebase config (for auth and leaderboard - using shared-sign-in for both)
const firebaseConfig = {
  apiKey: "AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ",
  authDomain: "shared-sign-in.firebaseapp.com",
  databaseURL: "https://shared-sign-in-default-rtdb.firebaseio.com/",
  projectId: "shared-sign-in",
    storageBucket: "shared-sign-in.appspot.com",
  messagingSenderId: "332039027753",
  appId: "1:332039027753:web:aa7c6877d543bb90363038",
  measurementId: "G-KK5XVVLMVN"
};

// Using the same config for both auth and leaderboard
const leaderboardFirebaseConfig = firebaseConfig;

// Firebase services
let auth = null;
let db = null;
let app = null;

// Using same app for both auth and leaderboard
let leaderboardApp = null;
let leaderboardDatabase = null;

// Current user state
let currentUser = null;
let isSignedIn = false;

// Firebase System
const firebaseSystem = {
    initialized: false,
    
    async init() {
        if (this.initialized) return true;
        
        try {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase SDK not loaded');
                return false;
            }
              // Initialize main Firebase app (auth, cloud save, and leaderboard)
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            
            // Use same app for leaderboard (now using shared-sign-in for everything)
            leaderboardApp = app; // Same app
            leaderboardDatabase = firebase.database(app);
              
            // Set up auth state listener
            auth.onAuthStateChanged((user) => {
                if (user) {
                    currentUser = user;
                    isSignedIn = true;
                    this.onSignIn(user);
                } else {
                    currentUser = null;
                    isSignedIn = false;
                    this.onSignOut();
                }
            });
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            return false;
        }
    },    // Sign in with Google
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            
            const result = await auth.signInWithPopup(provider);
            
            // Check if this is a new user and store the info
            if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
                // Mark this as a new user for tutorial purposes
                localStorage.setItem('isNewUser', 'true');
                }
            
            return result.user;
        } catch (error) {
            console.error('❌ Google sign-in failed:', error);
            throw error;
        }
    },
      // Sign in with GitHub
    async signInWithGitHub() {
        try {
            const provider = new firebase.auth.GithubAuthProvider();
            provider.addScope('user:email');
            
            const result = await auth.signInWithPopup(provider);
            
            // Check if this is a new user and store the info
            if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
                // Mark this as a new user for tutorial purposes
                localStorage.setItem('isNewUser', 'true');
                }
            
            return result.user;
        } catch (error) {
            console.error('❌ GitHub sign-in failed:', error);
            throw error;
        }
    },
    
    // Sign in with email and password
    async signInWithEmail(email, password) {
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            console.error('❌ Email sign-in failed:', error);
            throw error;
        }
    },
      // Create account with email and password
    async createAccountWithEmail(email, password, displayName = '') {
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            
            // This is always a new user when creating an account
            localStorage.setItem('isNewUser', 'true');
            // Update display name if provided
            if (displayName && result.user) {
                await result.user.updateProfile({
                    displayName: displayName
                });
            }
            
            return result.user;
        } catch (error) {
            console.error('❌ Account creation failed:', error);
            throw error;
        }
    },
    
    // Reset password
    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            return true;
        } catch (error) {
            console.error('❌ Password reset failed:', error);
            throw error;
        }
    },    // Sign in anonymously
    async signInAnonymously() {
        try {
            const result = await auth.signInAnonymously();
            
            // Anonymous users should always see the tutorial since each session is fresh
            // Clear any previous tutorial completion status and mark as new user
            localStorage.removeItem('tutorialCompleted');
            localStorage.setItem('isNewUser', 'true');
            return result.user;
        } catch (error) {
            console.error('❌ Anonymous sign-in failed:', error);
            throw error;
        }
    },
      // Sign out
    async signOut() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('❌ Sign-out failed:', error);
        }
    },    // Update display name
    async updateDisplayName(newDisplayName) {
        try {
            if (!currentUser) {
                throw new Error('No user signed in');
            }

            await currentUser.updateProfile({
                displayName: newDisplayName
            });

            // Force refresh the current user to get updated profile
            await currentUser.reload();
            currentUser = auth.currentUser;
            
            // Update all existing leaderboard entries with the new display name
            await this.updateLeaderboardDisplayName(newDisplayName);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to update display name:', error);
            throw error;
        }
    },    // Update all existing leaderboard entries for the current user
    async updateLeaderboardDisplayName(newDisplayName) {
        try {
            if (!currentUser || !leaderboardDatabase) {
                return;
            }

            // First, try to update the user's personal best score (this should always work)
            try {
                const userBestRef = leaderboardDatabase.ref(`playerData/${currentUser.uid}/bestScore`);
                const bestSnapshot = await userBestRef.once('value');
                if (bestSnapshot.exists()) {
                    await userBestRef.child('displayName').set(newDisplayName);
                    }
            } catch (error) {
                }

            // For the main leaderboard, try to update entries individually
            // This approach works better with restrictive Firebase rules
            try {
                const leaderboardRef = leaderboardDatabase.ref('leaderboard');
                const snapshot = await leaderboardRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
                
                if (!snapshot.exists()) {
                    return;
                }

                let successCount = 0;
                let totalCount = 0;
                const updatePromises = [];

                // Update each entry individually
                snapshot.forEach((childSnapshot) => {
                    totalCount++;
                    const entryKey = childSnapshot.key;
                    const entryData = childSnapshot.val();
                    
                    // Only update if this entry actually belongs to the current user
                    if (entryData.userId === currentUser.uid) {
                        const updatePromise = leaderboardRef.child(entryKey).child('displayName').set(newDisplayName)
                            .then(() => {
                                successCount++;
                            })
                            .catch((error) => {
                                });
                        updatePromises.push(updatePromise);
                    }
                });

                // Wait for all updates to complete
                await Promise.all(updatePromises);
                
                if (successCount > 0) {
                    } else if (totalCount > 0) {
                    }

            } catch (error) {
                }

        } catch (error) {
            console.error('❌ Failed to update leaderboard display names:', error);
            // Don't throw here - we don't want to fail the display name update if leaderboard update fails
        }
    },
    
    // Get current user
    getCurrentUser() {
        return currentUser;
    },
      // Check if signed in
    isSignedIn() {
        return isSignedIn;    },
    
    // Callbacks for auth state changes
    onSignIn(user) {
        // Load user's cloud save data
        if (window.cloudSaveSystem) {
            window.cloudSaveSystem.loadUserData();
        }
        
        // Update UI
        if (window.authUI) {
            window.authUI.updateUI();
        }
          // Check if this is a new user and they haven't seen the tutorial
        const isNewUser = localStorage.getItem('isNewUser') === 'true';
        const hasCompletedTutorial = window.tutorialSystem?.hasBeenCompleted();
          // Only auto-start tutorial for confirmed new users
        if (isNewUser && !hasCompletedTutorial && window.tutorialSystem) {
            // Small delay to ensure the UI and game systems are ready
            setTimeout(() => {
                if (window.tutorialSystem && !window.tutorialSystem.isActive) {
                    window.tutorialSystem.start();
                    // Clear the new user flag after starting tutorial
                    localStorage.removeItem('isNewUser');
                } else {
                    }
            }, 800); // Increased delay to ensure everything is ready
        } else if (isNewUser) {
            // Clear the new user flag if tutorial was already completed
            localStorage.removeItem('isNewUser');
        }
    },
    
    onSignOut() {
        // For anonymous users, clear tutorial completion status since 
        // anonymous sessions don't persist across sign-ins
        const wasAnonymous = currentUser && currentUser.isAnonymous;
        if (wasAnonymous) {
            localStorage.removeItem('tutorialCompleted');
            }
        
        // Clear any cached data
        if (window.cloudSaveSystem) {
            window.cloudSaveSystem.clearLocalCache();
        }
        
        // Update UI
        if (window.authUI) {
            window.authUI.updateUI();
        }
    }
};

// Cloud Save System
const cloudSaveSystem = {
      // Save game data to cloud
    async saveToCloud(gameData) {
        if (!isSignedIn || !currentUser) {
            return false;
        }

        // Check if we're online
        if (!navigator.onLine) {
            return false;
        }

        try {
            const userData = {
                ...gameData,
                lastSaved: firebase.firestore.FieldValue.serverTimestamp(),
                userId: currentUser.uid,
                displayName: currentUser.displayName || 'Anonymous'
            };
            
            await db.collection('playerData').doc(currentUser.uid).set(userData, { merge: true });
            return true;
        } catch (error) {
            // Handle specific Firebase errors
            if (error.code === 'unavailable' || error.code === 'failed-precondition') {
                } else if (error.code === 'permission-denied') {
                } else {
                console.error('❌ Failed to save to cloud:', error.message);
            }
            return false;
        }
    },
      // Load game data from cloud
    async loadFromCloud() {
        if (!isSignedIn || !currentUser) {
            return null;
        }

        // Check if we're online
        if (!navigator.onLine) {
            return null;
        }

        try {
            const doc = await db.collection('playerData').doc(currentUser.uid).get();
            
            if (doc.exists) {
                const data = doc.data();
                return data;
            } else {
                return null;
            }
        } catch (error) {
            // Handle specific Firebase errors
            if (error.code === 'unavailable' || error.code === 'failed-precondition') {
                } else if (error.code === 'permission-denied') {
                } else {
                console.error('❌ Failed to load from cloud:', error.message);
            }
            return null;
        }
    },
      // Load user data and apply to game
    async loadUserData() {
        // Only try to load if we're online and signed in
        if (!isSignedIn || !navigator.onLine) {
            return;
        }

        const cloudData = await this.loadFromCloud();
        if (!cloudData) return;

        try {
            // Apply upgrades
            if (cloudData.upgrades && window.upgradeSystem) {
                window.upgradeSystem.upgrades.forEach(upgrade => {
                    const savedUpgrade = cloudData.upgrades.find(u => u.id === upgrade.id);
                    if (savedUpgrade) {
                        upgrade.currentLevel = savedUpgrade.currentLevel || 0;
                    }
                });
                window.upgradeSystem.applyAllUpgrades();
            }
            
            // Apply game state
            if (cloudData.gameState && window.gameState) {
                window.gameState.energy = cloudData.gameState.energy || 0;                // Don't restore distance/score as those are per-run
            }
            
            } catch (error) {
            console.error('❌ Failed to apply cloud data:', error);
        }
    },
      // Auto-save current game state
    async autoSave() {
        if (!isSignedIn || !navigator.onLine) return;
        
        const gameData = {
            upgrades: window.upgradeSystem ? window.upgradeSystem.upgrades.map(u => ({
                id: u.id,
                currentLevel: u.currentLevel
            })) : [],
            
            gameState: window.gameState ? {
                energy: window.gameState.energy,
                highScore: localStorage.getItem('highScore') || 0
            } : {},
            
            harvesters: window.harvesterSystem ? window.harvesterSystem.harvesters.map(h => ({
                x: h.x,
                y: h.y,
                energyGenerationRate: h.energyGenerationRate,
                generationInterval: h.generationInterval,
                totalEnergyGenerated: h.totalEnergyGenerated
            })) : []
        };
        
        await this.saveToCloud(gameData);
    },
    
    // Clear local cache
    clearLocalCache() {
        // Could clear localStorage items if needed
        }
};

// Leaderboard System (uses Realtime Database)
const leaderboardSystem = {
      // Submit score to leaderboard
    async submitScore(score, distance, zone) {
        if (!isSignedIn || !currentUser) {
            return false;
        }
        
        // Validate score data
        if (typeof score !== 'number' || score < 0) {
            return false;
        }
        
        if (typeof distance !== 'number' || distance < 0) {
            return false;
        }
        
        if (typeof zone !== 'number' || zone < 1) {
            return false;
        }
        
        try {
            const scoreData = {
                score: Math.floor(score), // Ensure integer
                distance: Math.floor(distance), // Ensure integer
                zone: Math.floor(zone), // Ensure integer
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                userId: currentUser.uid,
                displayName: currentUser.displayName || currentUser.email || 'Anonymous',
                photoURL: currentUser.photoURL || null
            };
            
            // Add to leaderboard (using Realtime Database)
            const leaderboardRef = leaderboardDatabase.ref('leaderboard');
            await leaderboardRef.push(scoreData);
              // Update user's best distance in leaderboard database
            const userRef = leaderboardDatabase.ref(`playerData/${currentUser.uid}/bestScore`);
            const userSnapshot = await userRef.once('value');
            const currentBest = userSnapshot.val();
            
            // Compare by distance instead of score
            if (!currentBest || distance > (currentBest.distance || 0)) {
                await userRef.set(scoreData);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to submit score:', error);
            return false;
        }
    },    // Submit score to leaderboard (manual submission - no personal best check)
    async submitScoreManual(score, distance, zone) {
        if (!isSignedIn || !currentUser) {
            return false;
        }
        
        // Validate score data
        if (typeof score !== 'number' || score < 0) {
            return false;
        }
        
        if (typeof distance !== 'number' || distance < 0) {
            return false;
        }
        
        if (typeof zone !== 'number' || zone < 1) {
            return false;
        }
        
        try {
            const scoreData = {
                score: Math.floor(score), // Ensure integer
                distance: Math.floor(distance), // Ensure integer
                zone: Math.floor(zone), // Ensure integer
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                userId: currentUser.uid,
                displayName: currentUser.displayName || currentUser.email || 'Anonymous',
                photoURL: currentUser.photoURL || null,
                manualSubmission: true // Flag to indicate this was manually uploaded
            };
            
            // Add to leaderboard (using Realtime Database)
            const leaderboardRef = leaderboardDatabase.ref('leaderboard');
            await leaderboardRef.push(scoreData);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to manually submit score:', error);
            return false;
        }
    },
      // Get top distances (changed from scores)
    async getTopScores(limit = 10) {
        try {
            const snapshot = await leaderboardDatabase.ref('leaderboard')
                .orderByChild('distance')
                .limitToLast(limit)
                .once('value');
            
            const scores = [];
            snapshot.forEach(child => {
                scores.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            // Reverse to get highest distances first
            return scores.reverse();
        } catch (error) {
            console.error('❌ Failed to fetch leaderboard:', error);
            return [];
        }
    },
      // Get user's rank (based on distance)
    async getUserRank() {
        if (!isSignedIn || !currentUser) return null;
        
        try {
            const userRef = leaderboardDatabase.ref(`playerData/${currentUser.uid}/bestScore`);
            const userSnapshot = await userRef.once('value');
            const userBest = userSnapshot.val();
            
            if (!userBest) return null;
            
            const userDistance = userBest.distance || 0;
            
            // Get all distances higher than user's distance
            const higherDistancesSnapshot = await leaderboardDatabase.ref('leaderboard')
                .orderByChild('distance')
                .startAt(userDistance + 1)
                .once('value');
            
            let higherCount = 0;
            higherDistancesSnapshot.forEach(() => {
                higherCount++;
            });
            
            return higherCount + 1; // +1 because rank is 1-based
        } catch (error) {
            console.error('❌ Failed to get user rank:', error);
            return null;
        }
    },    // Check if distance is user's personal best distance
    async isPersonalHighScore(score, distance) {
        if (!isSignedIn || !currentUser) return false;        
        try {
            const userRef = leaderboardDatabase.ref(`playerData/${currentUser.uid}/bestScore`);
            const userSnapshot = await userRef.once('value');
            const userBest = userSnapshot.val();
            
            if (!userBest) {
                return true; // First score is always a personal best
            }
            
            // Compare by distance instead of score
            return distance > (userBest.distance || 0);
        } catch (error) {
            console.error('❌ Failed to check personal best distance:', error);
            return false;
        }
    }
};

// Initialize auto-save with connection checking
setInterval(() => {
    if (isSignedIn && window.gameRunning && navigator.onLine) {
        cloudSaveSystem.autoSave().catch(error => {
            // Silently handle auto-save failures to avoid spam
            });
    }
}, 60000); // Auto-save every 60 seconds (reduced frequency)

// Export to global scope
window.firebaseSystem = firebaseSystem;
window.cloudSaveSystem = cloudSaveSystem;
window.leaderboardSystem = leaderboardSystem;

// Initialize Firebase when the script loads
document.addEventListener('DOMContentLoaded', () => {
    firebaseSystem.init();
});
