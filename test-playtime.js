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
    // Use Firebase references from window object
    const db = window.firebaseFirestore;
    
    // Sample game data with different playtimes
    const games = [
        { 
            gameId: 'coderunner', 
            gameName: 'CodeRunner Quest', 
            hours: 2.5,
            totalMinutes: 150,
            lastPlayed: new Date(),
            sessionCount: 5
        },
        { 
            gameId: 'bytesurge', 
            gameName: 'ByteSurge', 
            hours: 1.2,
            totalMinutes: 72,
            lastPlayed: new Date(Date.now() - 86400000), // yesterday
            sessionCount: 3
        },
        { 
            gameId: 'neurocore-byte-wars', 
            gameName: 'NeuroCore: Byte Wars', 
            hours: 0.5,
            totalMinutes: 30,
            lastPlayed: new Date(Date.now() - 172800000), // 2 days ago
            sessionCount: 1
        },
        { 
            gameId: 'shadowlight', 
            gameName: 'ShadowLight', 
            hours: 0,
            totalMinutes: 0,
            lastPlayed: null,
            sessionCount: 0
        }
    ];

    // Add each game to the user's playtime collection
    const batch = db.batch();
    
    games.forEach(game => {
        const gameRef = db.collection('playtime')
            .doc(userId)
            .collection('games')
            .doc(game.gameId);
            
        batch.set(gameRef, {
            gameId: game.gameId,
            gameName: game.gameName,
            totalMinutes: game.totalMinutes,
            sessionCount: game.sessionCount,
            lastPlayed: game.lastPlayed
        });
    });

    // Commit the batch
    return batch.commit()
        .then(() => {
            console.log('✅ Test playtime data added successfully!');
            console.log('🎮 Added playtime for games:');
            games.forEach(game => {
                console.log(`   - ${game.gameName}: ${game.hours} hours`);
            });
            console.log('🔄 Refresh the page to see the updated playtime data');
        })
        .catch(error => {
            console.error('❌ Error adding test playtime data:', error);
        });
}

// Function to reset all playtime data
function resetPlaytimeData() {
    // Check if firebase auth is available in window
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
    const db = window.firestore;
    
    // Get all games in the user's playtime collection
    return db.collection('playtime')
        .doc(userId)
        .collection('games')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No playtime data to reset');
                return;
            }
            
            // Delete each game document
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            return batch.commit();
        })
        .then(() => {
            console.log('✅ All playtime data has been reset');
            console.log('🔄 Refresh the page to see the updated playtime data');
        })
        .catch(error => {
            console.error('❌ Error resetting playtime data:', error);
        });
}

// Usage instructions
console.log('📊 Test Playtime Utility');
console.log('------------------------');
console.log('To add test playtime data: addTestPlaytimeData()');
console.log('To reset all playtime data: resetPlaytimeData()');
console.log('Make sure you run this in the user portal page where Firebase is initialized');
console.log('------------------------');
