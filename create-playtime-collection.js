// Console script to create Firestore playtime collection and index
// Run this in your browser's developer console when on your GlitchRealm site

// Initialize sample playtime data
const createPlaytimeCollectionAndIndex = async () => {
  try {
    // Reference the Firebase objects from the window
    const firebaseAuth = window.firebaseAuth;
    const firestore = window.firebaseFirestore;
    const firestoreDoc = window.firestoreDoc;
    const firestoreCollection = window.firestoreCollection;
    const firestoreWhere = window.firestoreWhere;
    const firestoreGetDocs = window.firestoreGetDocs;
    // Check if needed Firebase modules are available
    if (!firestore || !firebaseAuth) {
      console.error('Firebase is not initialized on this page or is not available in the window object');
      return;
    }
    
    console.log('Connected to Firestore');
    
    // Get current user
    const currentUser = firebaseAuth.currentUser;
    
    if (!currentUser) {
      console.error('No user is signed in. Please sign in first.');
      return;
    }
    
    const userId = currentUser.uid;
    console.log(`Creating playtime data for user: ${userId}`);
    
    // Sample game data
    const games = [
      { 
        gameId: 'coderunner', 
        gameName: 'CodeRunner', 
        hours: 0,
        iconUrl: 'assets/game logos/coderunner logo.png'
      },
      { 
        gameId: 'bytesurge', 
        gameName: 'ByteSurge', 
        hours: 0,
        iconUrl: 'assets/game logos/bytesurge.png'
      },
      { 
        gameId: 'neurocore-byte-wars', 
        gameName: 'NeuroCore: Byte Wars', 
        hours: 0,
        iconUrl: 'assets/game logos/neurocore byte wars logo.png'
      }
    ];
    
    // Create playtime collection
    console.log('Creating playtime collection...');
    
    for (const game of games) {
      const docRef = firestoreDoc(firestore, 'playtime', `${userId}_${game.gameId}`);
      try {
        await window.firestoreSetDoc(docRef, {
          userId: userId,
          gameId: game.gameId,
          gameName: game.gameName,
          hours: game.hours,
          iconUrl: game.iconUrl,
          lastUpdated: new Date()
        });
        console.log(`Created playtime record for ${game.gameName}`);
      } catch (error) {
        console.error(`Error creating playtime for ${game.gameName}:`, error);
      }
    }
    
    console.log('✅ Playtime collection created successfully!');
    
    // Create an index by performing a simpler query - we'll just look for 
    // all playtime entries for the current user which should trigger
    // the index creation if needed
    console.log('Querying playtime data...');
    
    try {
      const playtimeRef = firestoreCollection(firestore, 'playtime');
      const q = window.firestoreQuery(playtimeRef, firestoreWhere('userId', '==', userId));
      const playtimeSnapshot = await firestoreGetDocs(q);
      
      const docs = [];
      playtimeSnapshot.forEach(doc => {
        docs.push(doc.data());
      });
      
      if (docs.length > 0) {
        console.log(`Found ${docs.length} playtime records for user`);
        docs.forEach(doc => {
          console.log(`Game: ${doc.gameName}, Hours: ${doc.hours}`);
        });
      } else {
        console.log('No playtime records found. Something went wrong.');
      }
    } catch (error) {
      console.error('Error querying playtime data:', error);
    }
    
    // Instructions for manually creating the index
    console.log('\n--- INDEX CREATION INSTRUCTIONS ---');
    console.log('To create the composite index in Firebase console:');
    console.log('1. Go to Firebase console → Firestore Database → Indexes tab');
    console.log('2. Click "Add Index"');
    console.log('3. Collection ID: playtime');
    console.log('4. Fields to index:');
    console.log('   - userId (Ascending)');
    console.log('   - hours (Descending)');
    console.log('5. Query scope: Collection');
    console.log('6. Click "Create Index"');
    console.log('-------------------------------');
    
  } catch (error) {
    console.error('Error creating playtime collection and index:', error);
  }
};

// Run the function
createPlaytimeCollectionAndIndex().then(() => {
  console.log('Operation completed');
}).catch(err => {
  console.error('Operation failed:', err);
});
