/**
 * Test Playtime - Utility script to add test playtime data
 * Run this in the browser console to add test playtime data
 */

// Function to add test playtime data
function addTestPlaytimeData() {
    // Check for Firebase availability in the window
    if (!window.firebaseAuth) {
        console.error('Error: Firebase Auth not available. Make sure you are on the user portal page.');
        return;
    }

    // Check if user is logged in
    const user = window.firebaseAuth.currentUser;
    if (!user) {
        console.error('Error: You must be logged in to add test playtime data');
        return;
    }

    const userId = user.uid;
    
    // Sample game data with different playtimes
    const games = {
        coderunner: { 
            gameId: 'coderunner', 
            gameName: 'CodeRunner Quest', 
            totalMinutes: 150,
            lastPlayed: new Date(),
            sessionCount: 5
        },
        bytesurge: { 
            gameId: 'bytesurge', 
            gameName: 'ByteSurge', 
            totalMinutes: 72,
            lastPlayed: new Date(Date.now() - 86400000), // yesterday
            sessionCount: 3
        },
        'neurocore-byte-wars': { 
            gameId: 'neurocore-byte-wars', 
            gameName: 'NeuroCore: Byte Wars', 
            totalMinutes: 30,
            lastPlayed: new Date(Date.now() - 172800000), // 2 days ago
            sessionCount: 1
        },
        shadowlight: { 
            gameId: 'shadowlight', 
            gameName: 'ShadowLight', 
            totalMinutes: 0,
            lastPlayed: null,
            sessionCount: 0
        }
    };

    const db = window.firebaseFirestore;
    const batch = window.firestoreBatch(db);
    
    // 1. Create/update the global document
    const globalDocRef = window.firestoreDoc(db, 'playtime', userId);
    
    // Create the user's playtime document with a games field
    batch.set(globalDocRef, {
        userId: userId,
        lastUpdated: new Date(),
        games: games
    }, { merge: true });
    
    // 2. Create/update individual game documents in the sub-collection
    Object.entries(games).forEach(([gameId, gameData]) => {
        const gameDocRef = window.firestoreDoc(db, 'playtime', userId, 'games', gameId);
        batch.set(gameDocRef, gameData);
    });
    
    // Execute all updates in a single batch
    return batch.commit()
        .then(() => {
            Object.values(games).forEach(game => {
                const hours = (game.totalMinutes / 60).toFixed(1);
            });
        })
    .catch(error => {
        console.error('❌ Error adding test playtime data:', error);
    });
}

// Function to reset all playtime data
function resetPlaytimeData() {
    // Check for Firebase availability in the window
    if (!window.firebaseAuth) {
        console.error('Error: Firebase Auth not available. Make sure you are on the user portal page.');
        return;
    }

    // Check if user is logged in
    const user = window.firebaseAuth.currentUser;
    if (!user) {
        console.error('Error: You must be logged in to reset playtime data');
        return;
    }

    const userId = user.uid;
    const db = window.firebaseFirestore;
    
    // First get all game documents in the sub-collection
    window.firestoreGetDocs(window.firestoreCollection(db, 'playtime', userId, 'games'))
        .then(gameDocsSnap => {
            const batch = window.firestoreBatch(db);
            
            // Delete the main global document
            batch.delete(window.firestoreDoc(db, 'playtime', userId));
            
            // Delete all individual game documents
            gameDocsSnap.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Commit all deletions
            return batch.commit();
        })
        .then(() => {
            
            // Also delete any legacy format documents
            const playtimeRef = window.firestoreCollection(db, 'playtime');
            const q = window.firestoreQuery(playtimeRef, window.firestoreWhere('userId', '==', userId));
            
            return window.firestoreGetDocs(q);
        })
        })
        .then(querySnapshot => {
            if (querySnapshot.size > 0) {
                const legacyBatch = window.firestoreBatch(db);
                querySnapshot.forEach(doc => {
                    if (doc.id !== userId) { // Skip the main document we already deleted
                        legacyBatch.delete(doc.ref);
                    }
                });
                return legacyBatch.commit();
            }
        })
        .then(() => {
        })
        .catch(error => {
            console.error('❌ Error resetting playtime data:', error);
        });
}

// Alternative manual add for console testing
function addPlaytimeManually() {
    const user = window.firebaseAuth.currentUser;
    if (!user) {
        console.error('You must be logged in');
        return;
    }
    
    // This uses the global firebase variables that should be available
    // in the user-portal page
    const userId = user.uid;
    
    // Try with window.firebase first
    if (window.firebase && window.firebase.firestore) {
        const firestore = window.firebase.firestore();
        
        // Create a batch for all operations
        const batch = firestore.batch();
        
        // 1. Set the global document
        const globalRef = firestore.collection('playtime').doc(userId);
        batch.set(globalRef, {
            userId: userId,
            lastUpdated: window.firebase.firestore.FieldValue.serverTimestamp(),
            games: {
                coderunner: {
                    gameId: 'coderunner',
                    gameName: 'CodeRunner Quest',
                    totalMinutes: 150,
                    sessionCount: 5,
                    lastPlayed: window.firebase.firestore.FieldValue.serverTimestamp()
                },
                bytesurge: {
                    gameId: 'bytesurge',
                    gameName: 'ByteSurge',
                    totalMinutes: 72,
                    sessionCount: 3,
                    lastPlayed: new Date(Date.now() - 86400000)
                }
            }
        }, { merge: true });
        
        // 2. Set individual game documents in the sub-collection
        const coderunnerRef = firestore.collection('playtime').doc(userId).collection('games').doc('coderunner');
        batch.set(coderunnerRef, {
            gameId: 'coderunner',
            gameName: 'CodeRunner Quest',
            totalMinutes: 150,
            sessionCount: 5,
            lastPlayed: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const bytesurgeRef = firestore.collection('playtime').doc(userId).collection('games').doc('bytesurge');
        batch.set(bytesurgeRef, {
            gameId: 'bytesurge',
            gameName: 'ByteSurge',
            totalMinutes: 72,
            sessionCount: 3,
            lastPlayed: new Date(Date.now() - 86400000)
        });
        
        // Commit all changes
        batch.commit()
            .then(() => {})
            .catch(err => console.error('Error adding manual data:', err));
    } else {
        console.error('Firebase firestore not available globally. Try using addTestPlaytimeData() instead.');
    }
}

// Usage instructions
