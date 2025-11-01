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
      const [{ initializeApp }, authMod] = await Promise.all([
        import(APP_URL),
        import(AUTH_URL)
      ]);
      const app = initializeApp(config);
      // Initialize Performance Monitoring (optional). This is the modular, tree-shakeable API.
      try {
        const perfModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-performance.js');
        try {
          const { getPerformance } = perfModule;
          const perf = getPerformance(app);
          // Expose for diagnostic use elsewhere in the site
          window.firebasePerf = perf;
          console.log('[Firebase Core] Performance Monitoring initialized');
        } catch (perfErr) {
          console.warn('[Firebase Core] Failed to init Performance Monitoring:', perfErr);
        }

        // Optional: attempt to load First Input Delay polyfill (recommended by Firebase
        // to measure the FID metric on older browsers). This is best added explicitly
        // during your build or via a local vendor file; here we attempt a best-effort
        // dynamic load from unpkg and silently ignore failures.
        try {
          const fidScript = document.createElement('script');
          fidScript.src = 'https://unpkg.com/first-input-delay@latest/dist/first-input-delay.iife.js';
          fidScript.async = true;
          fidScript.onload = () => console.log('[Firebase Core] FID polyfill loaded');
          fidScript.onerror = () => console.warn('[Firebase Core] Failed to load FID polyfill (optional)');
          document.head.appendChild(fidScript);
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // If module import is blocked, don't break initialization — performance is optional
        console.warn('[Firebase Core] Performance module load failed:', e);
      }
      const { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } = authMod;
      const auth = getAuth(app);
      
      // Set persistence to LOCAL to maintain auth state across tabs and refreshes
      try { 
        await setPersistence(auth, browserLocalPersistence); 
        console.log('[Firebase Core] Auth persistence set to LOCAL');
      } catch(e) {
        console.warn('[Firebase Core] Failed to set persistence:', e);
      }
      
      window.firebaseApp = app;
      window.firebaseAuth = auth;
      
      // Set up early auth state listener to ensure state is available ASAP
      onAuthStateChanged(auth, (user) => {
        if (user) {
          console.log('[Firebase Core] User authenticated:', user.uid);
          // Store current user globally for immediate access
          window.currentFirebaseUser = user;
          
          // Immediately update UI elements if they exist
          setTimeout(() => {
            const signInBtn = document.getElementById('sign-in-btn');
            const userProfile = document.getElementById('user-profile');
            const userName = document.getElementById('user-name');
            
            if (signInBtn && userProfile) {
              signInBtn.style.display = 'none';
              userProfile.style.display = 'flex';
              
              if (userName && !userName.textContent) {
                userName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
              }
              
              // Update avatars (always update if photoURL exists)
              const userAvatar = document.getElementById('user-avatar');
              const userAvatarLarge = document.getElementById('user-avatar-large');
              if (user.photoURL) {
                if (userAvatar) userAvatar.src = user.photoURL;
                if (userAvatarLarge) userAvatarLarge.src = user.photoURL;
              }
            }
          }, 100);
          
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
      
    } catch(e){ 
      console.warn('[Firebase Core] Init failed:', e); 
    }
  }

  // If module import is blocked by CSP or offline, we just no-op; pages using
  // their own init will still work.
  init();
})();
