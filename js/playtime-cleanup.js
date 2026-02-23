/**
 * Playtime Cleanup Utility
 * 
 * This script helps clean up duplicate playtime entries in Firestore
 */

// Function to deduplicate playtime data
function cleanupPlaytimeData() {
    // Check for Firebase availability
    if (!window.firebaseAuth) {
        console.error('Error: Firebase Auth not available. Make sure you are on the user portal page.');
        return;
    }

    // Check if user is logged in
    const user = window.firebaseAuth.currentUser;
    if (!user) {
        console.error('Error: You must be logged in to clean up playtime data');
        return;
    }

    const userId = user.uid;
    const db = window.firebaseFirestore;
    
    // Get all playtime documents for this user
    const playtimeRef = window.firestoreCollection(db, 'playtime');
    const q = window.firestoreQuery(playtimeRef, window.firestoreWhere('userId', '==', userId));
    
    window.firestoreGetDocs(q)
        .then(querySnapshot => {
            
            if (querySnapshot.empty) {
                return null;
            }
            
            // Collect all game data
            const gameMap = new Map();
            let mainDocRef = null;
            
            querySnapshot.forEach(doc => {
                const data = doc.data();
                
                // If this is the first document or it has a games object, make it the main document
                if (!mainDocRef || data.games) {
                    mainDocRef = doc.ref;
                }
                
                // Process games object if present
                if (data.games) {
                    Object.values(data.games).forEach(game => {
                        if (!game.gameId) return;
                        
                        // Keep the game with highest playtime if duplicate exists
                        const existingGame = gameMap.get(game.gameId);
                        if (!existingGame || (game.totalMinutes || 0) > (existingGame.totalMinutes || 0)) {
                            gameMap.set(game.gameId, game);
                        }
                    });
                }
                // Process direct game data
                else if (data.gameId) {
                    const existingGame = gameMap.get(data.gameId);
                    if (!existingGame || (data.totalMinutes || 0) > (existingGame.totalMinutes || 0)) {
                        gameMap.set(data.gameId, data);
                    }
                }
            });
            
            if (!mainDocRef) {
                mainDocRef = window.firestoreDoc(db, 'playtime', userId);
            }
            
            // Create a new consolidated document
            const games = {};
            gameMap.forEach((game, gameId) => {
                games[gameId] = {
                    gameId: game.gameId,
                    gameName: game.gameName,
                    totalMinutes: game.totalMinutes || 0,
                    sessionCount: game.sessionCount || 0,
                    lastPlayed: game.lastPlayed || null
                };
            });
            
            // Create a batch to update documents
            const batch = window.firestoreBatch(db);
            
            // Set the main document with consolidated data
            batch.set(mainDocRef, {
                userId: userId,
                lastUpdated: new Date(),
                games: games
            });
            
            // Delete all other documents
            querySnapshot.forEach(doc => {
                if (doc.ref.id !== mainDocRef.id) {
                    batch.delete(doc.ref);
                }
            });
            
            return batch.commit();
        })
        .then(result => {
            if (result === null) return; // No cleanup needed
        })
        .catch(error => {
            console.error('❌ Error cleaning up playtime data:', error);
        });
}

// Usage instructions
