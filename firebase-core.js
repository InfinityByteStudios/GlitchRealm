// Unified Firebase bootstrap for all pages
// Loads Firebase App/Auth once, ensures local persistence, and exposes globals.
// Include this file before any page-specific scripts that rely on window.firebaseAuth.

(function(){
  if (window.firebaseApp && window.firebaseAuth) {
    // Already initialized on this page
    return;
  }
  const APP_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
  const AUTH_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
  const config = {
    apiKey: "AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ",
    authDomain: "shared-sign-in.firebaseapp.com",
    projectId: "shared-sign-in",
    storageBucket: "shared-sign-in.appspot.com",
    messagingSenderId: "332039027753",
    appId: "1:332039027753:web:aa7c6877d543bb90363038",
    measurementId: "G-KK5XVVLMVN"
  };

  async function init(){
    try{
      const FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
      const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
        import(APP_URL),
        import(AUTH_URL),
        import(FIRESTORE_URL)
      ]);
      const app = initializeApp(config);
      const { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } = authMod;
      const auth = getAuth(app);
      
      // Set persistence to LOCAL to maintain auth state across tabs and refreshes
      try { 
        await setPersistence(auth, browserLocalPersistence); 
        console.log('[Firebase Core] Auth persistence set to LOCAL');
      } catch(e) {
        console.warn('[Firebase Core] Failed to set persistence:', e);
      }
      
      // Initialize Firestore
      const db = firestoreMod.getFirestore(app);
      
      window.firebaseApp = app;
      window.firebaseAuth = auth;
      window.firebaseFirestore = db;
      window.firestoreCollection = firestoreMod.collection;
      window.firestoreQuery = firestoreMod.query;
      window.firestoreDoc = firestoreMod.doc;
      window.firestoreGetDoc = firestoreMod.getDoc;
      window.firestoreGetDocs = firestoreMod.getDocs;
      window.firestoreAddDoc = firestoreMod.addDoc;
      window.firestoreSetDoc = firestoreMod.setDoc;
      window.firestoreUpdateDoc = firestoreMod.updateDoc;
      window.firestoreDeleteDoc = firestoreMod.deleteDoc;
      window.firestoreWhere = firestoreMod.where;
      window.firestoreOrderBy = firestoreMod.orderBy;
      window.firestoreLimit = firestoreMod.limit;
      window.firestoreOnSnapshot = firestoreMod.onSnapshot;
      window.firestoreServerTimestamp = firestoreMod.serverTimestamp;
      
      // Set up early auth state listener to ensure state is available ASAP
      onAuthStateChanged(auth, (user) => {
        if (user) {
          console.log('[Firebase Core] User authenticated:', user.uid);
          // Store current user globally for immediate access
          window.currentFirebaseUser = user;
          
          // Broadcast auth state change to other tabs/windows
          try {
            localStorage.setItem('firebase_auth_state', JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              timestamp: Date.now()
            }));
          } catch(e) {
            console.warn('[Firebase Core] Failed to broadcast auth state:', e);
          }
        } else {
          console.log('[Firebase Core] User signed out');
          window.currentFirebaseUser = null;
          
          // Clear auth state from storage
          try {
            localStorage.removeItem('firebase_auth_state');
          } catch(e) {}
        }
        
        // Trigger custom event that pages can listen for
        window.dispatchEvent(new CustomEvent('firebaseAuthStateChanged', { 
          detail: { user } 
        }));
      });
      
      console.log('[Firebase Core] Initialization complete');
      
      // Initialize Gravatar integration (async, non-blocking)
      import('./gravatar-integration.js')
        .then((gravatarModule) => {
          // Expose Gravatar functions globally for testing/debugging
          window.GravatarAPI = gravatarModule;
          window.testGravatarEnrichment = gravatarModule.testGravatarEnrichment;
          window.getGravatarProfile = gravatarModule.getGravatarProfile;
          window.getGravatarAvatarUrl = gravatarModule.getGravatarAvatarUrl;
          
          // Initialize the integration
          gravatarModule.initGravatarIntegration();
          console.log('[Firebase Core] Gravatar API exposed globally - try window.testGravatarEnrichment()');
        })
        .catch(err => {
          console.warn('[Firebase Core] Gravatar integration failed to load:', err);
        });
      
    } catch(e){ 
      console.warn('[Firebase Core] Init failed:', e); 
    }
  }

  // If module import is blocked by CSP or offline, we just no-op; pages using
  // their own init will still work.
  init();
})();
