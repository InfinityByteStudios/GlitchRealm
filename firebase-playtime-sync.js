/**
 * Firebase Playtime Sync Utility
 * 
 * This script resolves sync issues between the global playtime document and individual game documents.
 * The problem: Playtime data is stored in two places:
 * 1. A global document in the 'playtime' collection that contains all games
 * 2. Individual game documents in a sub-collection that track specific game playtime
 * 
 * This utility ensures both stay in sync.
 */

// Function to sync playtime data between global document and game sub-documents
function syncPlaytimeData() {
    // Check for Firebase availability
    if (!window.firebaseAuth) {
        console.error('Error: Firebase Auth not available. Make sure you are on the user portal page.');
        return;
    }

    // Check if user is logged in
    const user = window.firebaseAuth.currentUser;
    if (!user) {
        console.error('Error: You must be logged in to sync playtime data');
        return;
    }

    const userId = user.uid;
    const db = window.firebaseFirestore;
    
    console.log('Starting playtime data synchronization...');
    
    // 1. First get the global playtime document
    const globalDocRef = window.firestoreDoc(db, 'playtime', userId);
    
    window.firestoreGetDoc(globalDocRef)
        .then(globalDoc => {
            // Get all individual game documents from sub-collection
            const gamesCollectionRef = window.firestoreCollection(db, 'playtime', userId, 'games');
            return window.firestoreGetDocs(gamesCollectionRef).then(gamesSnapshot => {
                return { globalDoc, gamesSnapshot };
            });
        })
        .then(({ globalDoc, gamesSnapshot }) => {
            const globalData = globalDoc.exists() ? globalDoc.data() : { games: {} };
            const globalGames = globalData.games || {};
            
            // Create a map to store the merged data
            const mergedGames = { ...globalGames };
            const batch = window.firestoreBatch(db);
            let hasChanges = false;
            
            // Process individual game documents
            gamesSnapshot.forEach(gameDoc => {
                const gameData = gameDoc.data();
                const gameId = gameDoc.id;
                
                if (!gameData.gameId) {
                    gameData.gameId = gameId;
                }
                
                // Calculate time in hours
                const gameMinutes = gameData.totalMinutes || 0;
                
                // Check if this game exists in the global document or needs updating
                const globalGameData = globalGames[gameId];
                
                if (!globalGameData || 
                    globalGameData.totalMinutes !== gameMinutes || 
                    globalGameData.sessionCount !== gameData.sessionCount) {
                    
                    // Update the merged data
                    mergedGames[gameId] = {
                        gameId: gameId,
                        gameName: gameData.gameName || (globalGameData ? globalGameData.gameName : gameId),
                        totalMinutes: gameMinutes,
                        sessionCount: gameData.sessionCount || 0,
                        lastPlayed: gameData.lastPlayed || null
                    };
                    
                    hasChanges = true;
                    
                    // Make sure the individual game document is complete
                    batch.set(gameDoc.ref, {
                        ...gameData,
                        gameId: gameId,
                        gameName: gameData.gameName || (globalGameData ? globalGameData.gameName : gameId)
                    }, { merge: true });
                }
            });
            
            // Check for games in global document that aren't in individual documents
            Object.entries(globalGames).forEach(([gameId, gameData]) => {
                if (!gamesSnapshot.docs.some(doc => doc.id === gameId)) {
                    // Create the missing individual game document
                    const gameDocRef = window.firestoreDoc(db, 'playtime', userId, 'games', gameId);
                    batch.set(gameDocRef, {
                        gameId: gameId,
                        gameName: gameData.gameName || gameId,
                        totalMinutes: gameData.totalMinutes || 0,
                        sessionCount: gameData.sessionCount || 0,
                        lastPlayed: gameData.lastPlayed || null
                    });
                    
                    hasChanges = true;
                }
            });
            
            // Update the global document with merged data
            if (hasChanges) {
                batch.set(globalDocRef, {
                    userId: userId,
                    lastUpdated: new Date(),
                    games: mergedGames
                }, { merge: true });
                
                return batch.commit();
            } else {
                console.log('No synchronization needed - all data is already in sync.');
                return null;
            }
        })
        .then(result => {
            if (result !== null) {
                console.log('✅ Playtime data has been synchronized successfully');
                console.log('🔄 Refresh the page to see the updated playtime data');
            }
        })
        .catch(error => {
            console.error('❌ Error synchronizing playtime data:', error);
        });
}

// Function to fix playtime data structure completely
function rebuildPlaytimeData() {
    // Check for Firebase availability
    if (!window.firebaseAuth) {
        console.error('Error: Firebase Auth not available. Make sure you are on the user portal page.');
        return;
    }

    // Check if user is logged in
    const user = window.firebaseAuth.currentUser;
    if (!user) {
        console.error('Error: You must be logged in to rebuild playtime data');
        return;
    }

    const userId = user.uid;
    const db = window.firebaseFirestore;
    
    console.log('Starting complete playtime data rebuild...');
    
    // Get all possible playtime documents
    const promises = [
        // Get the global document
        window.firestoreGetDoc(window.firestoreDoc(db, 'playtime', userId)),
        
        // Get legacy documents that might be in the root collection
        window.firestoreGetDocs(
            window.firestoreQuery(
                window.firestoreCollection(db, 'playtime'),
                window.firestoreWhere('userId', '==', userId)
            )
        ),
        
        // Get individual game documents
        window.firestoreGetDocs(window.firestoreCollection(db, 'playtime', userId, 'games'))
    ];
    
    Promise.all(promises)
        .then(([globalDocSnap, legacyDocsSnap, gameDocsSnap]) => {
            // Collect all game data
            const allGames = new Map();
            
            // Process the global document
            if (globalDocSnap.exists()) {
                const data = globalDocSnap.data();
                if (data.games) {
                    Object.entries(data.games).forEach(([gameId, game]) => {
                        if (!game.gameId) game.gameId = gameId;
                        allGames.set(gameId, { ...game });
                    });
                }
            }
            
            // Process legacy documents
            legacyDocsSnap.forEach(doc => {
                if (doc.id === userId) return; // Skip the global document we already processed
                
                const data = doc.data();
                if (data.games) {
                    Object.entries(data.games).forEach(([gameId, game]) => {
                        if (!game.gameId) game.gameId = gameId;
                        
                        const existingGame = allGames.get(gameId);
                        if (!existingGame || (game.totalMinutes || 0) > (existingGame.totalMinutes || 0)) {
                            allGames.set(gameId, { ...game });
                        }
                    });
                } else if (data.gameId) {
                    const gameId = data.gameId;
                    const existingGame = allGames.get(gameId);
                    if (!existingGame || (data.totalMinutes || 0) > (existingGame.totalMinutes || 0)) {
                        allGames.set(gameId, { ...data });
                    }
                }
            });
            
            // Process individual game documents
            gameDocsSnap.forEach(doc => {
                const gameId = doc.id;
                const data = doc.data();
                if (!data.gameId) data.gameId = gameId;
                
                const existingGame = allGames.get(gameId);
                if (!existingGame || (data.totalMinutes || 0) > (existingGame.totalMinutes || 0)) {
                    allGames.set(gameId, { ...data });
                }
            });
            
            // Create a batch to write the fixed data structure
            const batch = window.firestoreBatch(db);
            
            // Create the global document with all games
            const globalGames = {};
            allGames.forEach((game, gameId) => {
                globalGames[gameId] = {
                    gameId: gameId,
                    gameName: game.gameName || gameId,
                    totalMinutes: game.totalMinutes || 0,
                    sessionCount: game.sessionCount || 0,
                    lastPlayed: game.lastPlayed || null
                };
            });
            
            batch.set(window.firestoreDoc(db, 'playtime', userId), {
                userId: userId,
                lastUpdated: new Date(),
                games: globalGames
            });
            
            // Create/update individual game documents
            allGames.forEach((game, gameId) => {
                batch.set(window.firestoreDoc(db, 'playtime', userId, 'games', gameId), {
                    gameId: gameId,
                    gameName: game.gameName || gameId,
                    totalMinutes: game.totalMinutes || 0,
                    sessionCount: game.sessionCount || 0,
                    lastPlayed: game.lastPlayed || null
                });
            });
            
            // Delete legacy documents
            legacyDocsSnap.forEach(doc => {
                if (doc.id !== userId) {
                    batch.delete(doc.ref);
                }
            });
            
            return batch.commit();
        })
        .then(() => {
            console.log('✅ Playtime data structure has been completely rebuilt');
            console.log('🔄 Refresh the page to see the updated playtime data');
        })
        .catch(error => {
            console.error('❌ Error rebuilding playtime data structure:', error);
        });
}

// Usage instructions
console.log('🔄 Firebase Playtime Sync Utility');
console.log('--------------------------------');
console.log('1. To synchronize playtime data: syncPlaytimeData()');
console.log('   This will update the global document based on individual game documents');
console.log('');
console.log('2. For a complete rebuild: rebuildPlaytimeData()');
console.log('   This will consolidate all playtime data from all possible locations');
console.log('   and ensure the correct data structure is in place');
console.log('--------------------------------');
