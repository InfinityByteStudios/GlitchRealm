// GlitchRealm Playtime Tracking System
// This script tracks the time users spend playing games and saves it to Firestore

class PlaytimeTracker {
    constructor() {
        this.gameId = null;
        this.gameName = null;
        this.startTime = null;
        this.sessionTime = 0;
        this.isTracking = false;
        this.updateInterval = null;
        this.saveInterval = null;
        this.firebaseInitialized = false;
        this.user = null;
        this.DEBUG = false; // Set to true to enable debug logging
    }

    // Initialize the tracker with Firebase and game information
    async init(gameId, gameName, debug = false) {
        this.gameId = gameId;
        this.gameName = gameName;
        this.DEBUG = debug;
        
        this.log(`Initializing playtime tracker for ${gameName} (${gameId})`);
        
        // Check if Firebase is already loaded on the page
        if (typeof firebase !== 'undefined') {
            this.firebaseInitialized = true;
            this.log('Firebase already initialized on page');
            this.setupFirebaseListeners();
        } else {
            this.log('Loading Firebase from CDN');
            // Load Firebase from CDN
            await this.loadFirebaseSDK();
        }
        
        return this;
    }
    
    // Load Firebase SDK if not already present
    async loadFirebaseSDK() {
        return new Promise((resolve, reject) => {
            // Load Firebase App
            const appScript = document.createElement('script');
            appScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
            appScript.type = 'module';
            
            appScript.onload = async () => {
                this.log('Firebase App SDK loaded');
                
                // Load Auth and Firestore
                const authScript = document.createElement('script');
                authScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
                authScript.type = 'module';
                
                const firestoreScript = document.createElement('script');
                firestoreScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
                firestoreScript.type = 'module';
                
                document.head.appendChild(authScript);
                document.head.appendChild(firestoreScript);
                
                // Wait for both to load
                Promise.all([
                    new Promise(r => authScript.onload = r),
                    new Promise(r => firestoreScript.onload = r)
                ]).then(() => {
                    this.log('Firebase Auth and Firestore SDKs loaded');
                    this.initializeFirebase();
                    resolve();
                }).catch(err => {
                    console.error('Error loading Firebase modules:', err);
                    reject(err);
                });
            };
            
            appScript.onerror = (err) => {
                console.error('Error loading Firebase App SDK:', err);
                reject(err);
            };
            
            document.head.appendChild(appScript);
        });
    }
    
    // Initialize Firebase with GlitchRealm config
    initializeFirebase() {
        const firebaseConfig = {
            apiKey: "AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ",
            authDomain: "shared-sign-in.firebaseapp.com",
            projectId: "shared-sign-in",
            storageBucket: "shared-sign-in.firebasestorage.app",
            messagingSenderId: "332039027753",
            appId: "1:332039027753:web:aa7c6877d543bb90363038",
            measurementId: "G-KK5XVVLMVN"
        };
        
        // Initialize Firebase (use modular API)
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js').then(firebaseApp => {
            const { initializeApp } = firebaseApp;
            const app = initializeApp(firebaseConfig);
            
            // Initialize Auth and Firestore
            Promise.all([
                import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'),
                import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
            ]).then(([authModule, firestoreModule]) => {
                const { getAuth, onAuthStateChanged } = authModule;
                const { getFirestore } = firestoreModule;
                
                this.auth = getAuth(app);
                this.firestore = getFirestore(app);
                
                this.firebaseInitialized = true;
                this.log('Firebase initialized successfully');
                
                // Setup auth listener
                this.setupFirebaseListeners();
            });
        });
    }
    
    // Set up authentication state listener
    setupFirebaseListeners() {
        // Use either the global firebase or the imported modules
        if (typeof firebase !== 'undefined') {
            // Global Firebase
            firebase.auth().onAuthStateChanged(user => {
                this.handleAuthStateChange(user);
            });
        } else if (this.auth) {
            // Modular Firebase
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(authModule => {
                const { onAuthStateChanged } = authModule;
                onAuthStateChanged(this.auth, user => {
                    this.handleAuthStateChange(user);
                });
            });
        } else {
            this.log('Firebase Auth not yet initialized');
        }
    }
    
    // Handle auth state changes
    handleAuthStateChange(user) {
        if (user) {
            this.log(`User signed in: ${user.uid}`);
            this.user = user;
            
            // If tracking was already started, save the data for the newly signed-in user
            if (this.isTracking) {
                this.savePlaytimeData();
            }
        } else {
            this.log('User signed out');
            this.user = null;
        }
    }
    
    // Start tracking playtime
    startTracking() {
        if (this.isTracking) {
            this.log('Already tracking playtime');
            return;
        }
        
        this.log('Starting playtime tracking');
        this.isTracking = true;
        this.startTime = new Date();
        this.sessionTime = 0;
        
        // Update session time every second
        this.updateInterval = setInterval(() => {
            const now = new Date();
            this.sessionTime = (now - this.startTime) / 1000 / 60 / 60; // Convert to hours
            this.log(`Session time: ${(this.sessionTime * 60).toFixed(1)} minutes`);
        }, 60000); // Update every minute
        
        // Save data every 5 minutes
        this.saveInterval = setInterval(() => {
            this.savePlaytimeData();
        }, 300000); // Save every 5 minutes
        
        // Also save when the window/tab is closed or hidden
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        return this;
    }
    
    // Stop tracking playtime
    stopTracking() {
        if (!this.isTracking) {
            this.log('Not tracking playtime');
            return;
        }
        
        this.log('Stopping playtime tracking');
        
        // Clear intervals
        clearInterval(this.updateInterval);
        clearInterval(this.saveInterval);
        
        // Calculate final session time
        const now = new Date();
        this.sessionTime = (now - this.startTime) / 1000 / 60 / 60; // Convert to hours
        
        // Save the final data
        this.savePlaytimeData();
        
        // Reset tracking state
        this.isTracking = false;
        this.startTime = null;
        
        // Remove event listeners
        window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        return this;
    }
    
    // Handle tab/window close event
    handleBeforeUnload(event) {
        if (this.isTracking) {
            this.log('Window closing - saving playtime data');
            this.savePlaytimeData();
        }
    }
    
    // Handle tab visibility change
    handleVisibilityChange(event) {
        if (document.hidden && this.isTracking) {
            this.log('Tab hidden - saving playtime data');
            this.savePlaytimeData();
        }
    }
    
    // Save playtime data to Firestore
    async savePlaytimeData() {
        if (!this.user) {
            this.log('No user signed in - playtime data not saved');
            return;
        }
        
        if (this.sessionTime <= 0) {
            this.log('No playtime to save');
            return;
        }
        
        this.log(`Saving playtime data: ${this.sessionTime.toFixed(2)} hours`);
        
        try {
            // Use either global firebase or modular API
            if (typeof firebase !== 'undefined') {
                // Global Firebase
                const db = firebase.firestore();
                const docId = `${this.user.uid}_${this.gameId}`;
                const docRef = db.collection('playtime').doc(docId);
                
                // Get existing document if it exists
                const doc = await docRef.get();
                
                if (doc.exists) {
                    // Update existing playtime
                    const currentData = doc.data();
                    const currentHours = currentData.hours || 0;
                    
                    await docRef.update({
                        hours: currentHours + this.sessionTime,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    this.log(`Updated existing playtime: ${currentHours} + ${this.sessionTime.toFixed(2)} = ${(currentHours + this.sessionTime).toFixed(2)} hours`);
                } else {
                    // Create new playtime document
                    await docRef.set({
                        userId: this.user.uid,
                        gameId: this.gameId,
                        gameName: this.gameName,
                        hours: this.sessionTime,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    this.log(`Created new playtime record: ${this.sessionTime.toFixed(2)} hours`);
                }
            } else if (this.firestore) {
                // Modular Firebase
                const { doc, getDoc, setDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                const docId = `${this.user.uid}_${this.gameId}`;
                const docRef = doc(this.firestore, 'playtime', docId);
                
                // Get existing document if it exists
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    // Update existing playtime
                    const currentData = docSnap.data();
                    const currentHours = currentData.hours || 0;
                    
                    await updateDoc(docRef, {
                        hours: currentHours + this.sessionTime,
                        lastUpdated: serverTimestamp()
                    });
                    
                    this.log(`Updated existing playtime: ${currentHours} + ${this.sessionTime.toFixed(2)} = ${(currentHours + this.sessionTime).toFixed(2)} hours`);
                } else {
                    // Create new playtime document
                    await setDoc(docRef, {
                        userId: this.user.uid,
                        gameId: this.gameId,
                        gameName: this.gameName,
                        hours: this.sessionTime,
                        lastUpdated: serverTimestamp()
                    });
                    
                    this.log(`Created new playtime record: ${this.sessionTime.toFixed(2)} hours`);
                }
            } else {
                console.error('Firebase not initialized');
                return;
            }
            
            // Reset session time after saving
            this.startTime = new Date();
            this.sessionTime = 0;
            
        } catch (error) {
            console.error('Error saving playtime data:', error);
        }
    }
    
    // Utility method for logging
    log(message) {
        if (this.DEBUG) {
            console.log(`[PlaytimeTracker] ${message}`);
        }
    }
}

// Make the tracker available globally
window.PlaytimeTracker = PlaytimeTracker;

// Export for ES modules
export { PlaytimeTracker };
export default PlaytimeTracker;
