/**
 * Short Playtime Test - For testing very small playtime values
 * Run this in the browser console
 */

// Function to add test data with very short playtimes
function addShortPlaytimeTest() {
    // Check for Firebase availability
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
    const db = window.firebaseFirestore;
    const batch = window.firestoreBatch(db);
    
    // Sample game data with different short playtimes
    const games = {
        coderunner: { 
            gameId: 'coderunner', 
            gameName: 'CodeRunner Quest', 
            totalMinutes: 0.05, // 3 seconds
            lastPlayed: new Date(),
            sessionCount: 1
        },
        bytesurge: { 
            gameId: 'bytesurge', 
            gameName: 'ByteSurge', 
            totalMinutes: 0.5, // 30 seconds
            lastPlayed: new Date(Date.now() - 86400000),
            sessionCount: 1
        },
        'neurocore-byte-wars': { 
            gameId: 'neurocore-byte-wars', 
            gameName: 'NeuroCore: Byte Wars', 
            totalMinutes: 1, // Exactly 1 minute
            lastPlayed: new Date(Date.now() - 172800000),
            sessionCount: 1
        }
    };
    
    // 1. Update the global document
    const globalDocRef = window.firestoreDoc(db, 'playtime', userId);
    batch.set(globalDocRef, {
        userId: userId,
        lastUpdated: new Date(),
        games: games
    }, { merge: true });
    
    // 2. Update individual game documents in the sub-collection
    Object.entries(games).forEach(([gameId, gameData]) => {
        const gameDocRef = window.firestoreDoc(db, 'playtime', userId, 'games', gameId);
        batch.set(gameDocRef, gameData);
    });
    
    // Execute all updates in a single batch
    return batch.commit()
        .then(() => {
            console.log('✅ Short playtime test data added successfully!');
            console.log('🎮 Added playtime for games:');
            Object.entries(games).forEach(([gameId, game]) => {
                const seconds = game.totalMinutes * 60;
                if (seconds < 60) {
                    console.log(`   - ${game.gameName}: ${seconds.toFixed(0)} seconds`);
                } else if (seconds < 3600) {
                    console.log(`   - ${game.gameName}: ${(seconds/60).toFixed(0)} minutes`);
                } else {
                    console.log(`   - ${game.gameName}: ${(seconds/3600).toFixed(1)} hours`);
                }
            });
            console.log('🔄 Refresh the page to see the updated playtime data');
        })
        .catch(error => {
            console.error('❌ Error adding test playtime data:', error);
        });
}

// Usage instructions
console.log('⏱️ Short Playtime Test');
console.log('---------------------');
console.log('To add test playtime data with very short durations: addShortPlaytimeTest()');
console.log('This will add games with playtimes ranging from seconds to minutes');
console.log('---------------------');
