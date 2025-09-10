// Core Firebase initialization (Auth + Storage + Analytics)
// Loaded only on pages that don't need Firestore heavy features.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

const firebaseConfig = {
  apiKey: "AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ",
  authDomain: "shared-sign-in.firebaseapp.com",
  projectId: "shared-sign-in",
  storageBucket: "shared-sign-in.appspot.com",
  messagingSenderId: "332039027753",
  appId: "1:332039027753:web:aa7c6877d543bb90363038",
  measurementId: "G-KK5XVVLMVN"
};

// Reuse existing app if already initialized (defensive for multiple imports)
let app;
try {
  if (globalThis.firebaseApp) {
    app = globalThis.firebaseApp;
  } else {
    app = initializeApp(firebaseConfig);
    globalThis.firebaseApp = app;
  }
} catch (e) {
  // Fallback attempt
  try { app = initializeApp(firebaseConfig); } catch {}
}

const auth = getAuth(app);
const storage = getStorage(app, 'gs://shared-sign-in.appspot.com');
let analytics;
try { analytics = getAnalytics(app); } catch { /* analytics optional (e.g. in unsupported envs) */ }

// Expose core handles
window.firebaseConfig = firebaseConfig;
window.firebaseAuth = auth;
window.firebaseStorage = storage;
window.firebaseAnalytics = analytics;
