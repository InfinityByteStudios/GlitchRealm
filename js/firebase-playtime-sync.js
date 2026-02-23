/**
 * Firebase Playtime Sync Utility
 * 
 * This script resolves sync issues between the global playtime document and individual game documents.
 * The problem: Playtime data is stored in two places:
 * 1. A global document in the 'playtime' collection that contains all games
 * 2. Individual game documents in a sub-collection that track specific game playtime
 * 
 * This utility ensures both stay in sync and also handles localStorage data from the new tracking system.
 */

// Check for localStorage playtime data and sync it
function syncLocalStorageData() {
    try {
        const { user, db } = validateFirebaseEnvironment();
        const userId = user.uid;
        
        // Check for localStorage data
        const localData = localStorage.getItem('glitchrealm_playtime_data');
        if (!localData) {
            console.log('No localStorage playtime data found');
            return Promise.resolve(null);
        }
        
        const playtimeData = JSON.parse(localData);
        if (!playtimeData.needsSync) {
            console.log('LocalStorage data already synced');
            return Promise.resolve(null);
        }
        
        const gamesToSync = Object.values(playtimeData.games).filter(game => game.needsSync);
        if (gamesToSync.length === 0) {
            console.log('No games need syncing from localStorage');
            return Promise.resolve(null);
        }
        
        console.log(`Syncing ${gamesToSync.length} games from localStorage to Firestore`);
        
        const batch = window.firestoreBatch(db);
        const globalDocRef = window.firestoreDoc(db, 'playtime', userId);
        
        return window.firestoreGetDoc(globalDocRef)
            .then(globalDoc => {
                const globalData = globalDoc.exists() ? globalDoc.data() : { games: {} };
                const globalGames = globalData.games || {};
                
                // Process each game from localStorage
                gamesToSync.forEach(game => {
                    const gameId = game.gameId;
                    const gameDocRef = window.firestoreDoc(db, 'playtime', userId, 'games', gameId);
                    
                    // Add to existing totals if game already exists
                    const existingGlobal = globalGames[gameId];
                    const totalMinutes = (existingGlobal?.totalMinutes || 0) + game.totalMinutes;
                    const sessionCount = (existingGlobal?.sessionCount || 0) + game.sessionCount;
                    
                    // Update individual game document
                    batch.set(gameDocRef, {
                        gameId: gameId,
                        gameName: game.gameName,
                        totalMinutes: totalMinutes,
                        sessionCount: sessionCount,
                        lastPlayed: new Date(game.lastPlayed)
                    }, { merge: true });
                    
                    // Update global games object
                    globalGames[gameId] = {
                        gameId: gameId,
                        gameName: game.gameName,
                        totalMinutes: totalMinutes,
                        sessionCount: sessionCount,
                        lastPlayed: new Date(game.lastPlayed)
                    };
                });
                
                // Update global document
                batch.set(globalDocRef, {
                    userId: userId,
                    lastUpdated: new Date(),
                    games: globalGames
                }, { merge: true });
                
                return batch.commit();
            })
            .then(() => {
                console.log('✅ Successfully synced localStorage data to Firestore');
                
                // Mark localStorage data as synced
                playtimeData.needsSync = false;
                Object.values(playtimeData.games).forEach(game => {
                    game.needsSync = false;
                });
                localStorage.setItem('glitchrealm_playtime_data', JSON.stringify(playtimeData));
                
                return true;
            })
            .catch(error => {
                console.error('❌ Error syncing localStorage data:', error);
                throw error;
            });
            
    } catch (error) {
        console.error('Error syncing localStorage data: ' + error.message);
        return Promise.reject(error);
    }
}

// Helper function to validate Firebase environment and user authentication
function validateFirebaseEnvironment() {
    if (!window.firebaseAuth) {
        throw new Error('Firebase Auth not available');
    }

    const user = window.firebaseAuth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }

    const db = window.firebaseFirestore;
    if (!db) {
        throw new Error('Firestore not available');
    }

    return { user, db };
}

// Function to sync playtime data between global document and game sub-documents
function syncPlaytimeData() {
    try {
        const { user, db } = validateFirebaseEnvironment();
        const userId = user.uid;

        console.log('Starting playtime data synchronization...');

        // Batch Firestore reads more efficiently - get both documents in parallel
        const globalDocRef = window.firestoreDoc(db, 'playtime', userId);
        const gamesCollectionRef = window.firestoreCollection(db, 'playtime', userId, 'games');

        return Promise.all([
            window.firestoreGetDoc(globalDocRef),
            window.firestoreGetDocs(gamesCollectionRef)
        ])
            .then(([globalDoc, gamesSnapshot]) => {
                // Early return if no data exists at all
                if (!globalDoc.exists() && gamesSnapshot.empty) {
                    console.log('No playtime data found - nothing to sync.');
                    return null;
                }
                const globalData = globalDoc.exists() ? globalDoc.data() : { games: {} };
                const globalGames = globalData.games || {};

                // Early return if global document exists but has no games and no individual docs
                if (Object.keys(globalGames).length === 0 && gamesSnapshot.empty) {
                    console.log('No game data found - nothing to sync.');
                    return null;
                }

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
                return result;
            })
            .catch(error => {
                console.error('❌ Error synchronizing playtime data:', error);
                // Implement error handling for sync failures
                if (error.code === 'permission-denied') {
                    console.error('Permission denied - check Firestore security rules');
                } else if (error.code === 'unavailable') {
                    console.error('Firestore temporarily unavailable - try again later');
                } else if (error.code === 'deadline-exceeded') {
                    console.error('Operation timed out - try again with smaller batch');
                }
                throw error; // Re-throw for caller to handle
            });
    } catch (error) {
        console.error('Error: ' + error.message);
        return Promise.reject(error);
    }
}

// Function to fix playtime data structure completely
function rebuildPlaytimeData() {
    try {
        const { user, db } = validateFirebaseEnvironment();
        const userId = user.uid;

        console.log('Starting complete playtime data rebuild...');

        // Batch all Firestore reads efficiently - reduce redundant snapshot queries
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

        return Promise.all(promises)
            .then(([globalDocSnap, legacyDocsSnap, gameDocsSnap]) => {
                // Early return if no data exists anywhere
                if (!globalDocSnap.exists() && legacyDocsSnap.empty && gameDocsSnap.empty) {
                    console.log('No playtime data found anywhere - nothing to rebuild.');
                    return null;
                }

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
            .then((result) => {
                if (result !== null) {
                    console.log('✅ Playtime data structure has been completely rebuilt');
                    console.log('🔄 Refresh the page to see the updated playtime data');
                }
                return result;
            })
            .catch(error => {
                console.error('❌ Error rebuilding playtime data structure:', error);
                // Implement error handling for sync failures
                if (error.code === 'permission-denied') {
                    console.error('Permission denied - check Firestore security rules');
                } else if (error.code === 'unavailable') {
                    console.error('Firestore temporarily unavailable - try again later');
                } else if (error.code === 'deadline-exceeded') {
                    console.error('Operation timed out - try again with smaller batch');
                } else if (error.code === 'resource-exhausted') {
                    console.error('Quota exceeded - wait before retrying');
                }
                throw error; // Re-throw for caller to handle
            });
    } catch (error) {
        console.error('Error: ' + error.message);
        return Promise.reject(error);
    }
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
console.log('');
console.log('3. To sync localStorage data: syncLocalStorageData()');
console.log('   This will sync any unsynced data from localStorage to Firestore');
console.log('--------------------------------');
