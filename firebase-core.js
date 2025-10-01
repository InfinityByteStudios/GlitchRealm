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
      const { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } = authMod;
      const auth = getAuth(app);
      try { await setPersistence(auth, browserLocalPersistence); } catch {}
      window.firebaseApp = app;
      window.firebaseAuth = auth;
      // Optional: early listener so other code can react ASAP
      try { onAuthStateChanged(auth, ()=>{}); } catch {}
    } catch(e){ console.warn('firebase-core init failed', e); }
  }

  // If module import is blocked by CSP or offline, we just no-op; pages using
  // their own init will still work.
  init();
})();
