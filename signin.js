// Auth subdomain sign-in logic

const FIREBASE_CDN = 'https://www.gstatic.com/firebasejs/10.7.1/';
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ',
  authDomain: 'shared-sign-in.firebaseapp.com',
  projectId: 'shared-sign-in',
  storageBucket: 'shared-sign-in.appspot.com',
  messagingSenderId: '332039027753',
  appId: '1:332039027753:web:aa7c6877d543bb90363038'
};

// Initialize Firebase on-demand (avoids depending on the inline module timing)
async function getFirebaseAuth() {
  // Reuse if already initialized by the inline module
  if (window.firebaseAuth) return window.firebaseAuth;
  try {
    const [{ initializeApp, getApps }, { getAuth, setPersistence, browserLocalPersistence }] = await Promise.all([
      import(FIREBASE_CDN + 'firebase-app.js'),
      import(FIREBASE_CDN + 'firebase-auth.js')
    ]);
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence).catch(() => {});
    window.firebaseAuth = auth;
    return auth;
  } catch (err) {
    console.error('[Auth] Firebase load error:', err);
    showMessage('Failed to load authentication. Check your connection and try again.', 'error');
    return null;
  }
}

function showMessage(msg, type = 'info') {
  const el = document.getElementById('authMessage');
  if (!el) return;
  el.textContent = msg;
  el.className = `auth-message ${type}`;
  el.classList.remove('hidden');
}

// Detect which site the user came from and return there after sign-in
function getReturnUrl() {
  // Check URL parameter first (e.g., ?return=https://news.glitchrealm.ca)
  const params = new URLSearchParams(window.location.search);
  const returnParam = params.get('return') || params.get('redirect');
  if (returnParam) {
    try {
      const url = new URL(returnParam);
      // Allow glitchrealm.ca domains OR localhost for development
      const isProduction = url.hostname.endsWith('glitchrealm.ca') || url.hostname === 'glitchrealm.ca';
      const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.startsWith('192.168.');
      if (isProduction || isLocalhost) {
        return returnParam;
      }
    } catch (e) {
      console.warn('Invalid return URL parameter:', returnParam);
    }
  }
  
  // Check referrer (where user came from)
  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      // Allow glitchrealm.ca domains OR localhost for development
      const isProduction = referrerUrl.hostname.endsWith('glitchrealm.ca') || referrerUrl.hostname === 'glitchrealm.ca';
      const isLocalhost = referrerUrl.hostname === 'localhost' || referrerUrl.hostname === '127.0.0.1' || referrerUrl.hostname.startsWith('192.168.');
      if (isProduction || isLocalhost) {
        return document.referrer;
      }
    } catch (e) {
      console.warn('Invalid referrer URL:', document.referrer);
    }
  }
  
  // Default based on current environment
  const currentHostname = window.location.hostname;
  const isDev = currentHostname === 'localhost' || currentHostname === '127.0.0.1' || currentHostname.startsWith('192.168.');
  
  if (isDev) {
    // For localhost, try to determine the port from referrer or use default
    const port = window.location.port || '5500'; // Default to Live Server port
    return `http://${currentHostname}:${port}/`;
  }
  
  // Default to main site
  return 'https://glitchrealm.ca/';
}

function redirectHome() {
  const returnUrl = getReturnUrl();
  window.location.replace(returnUrl);
}

function getBridgeUrl() {
  const returnUrl = getReturnUrl();
  const bridgeOrigin = new URL(returnUrl).origin;
  // Add cache-busting version parameter to force reload of updated auth-bridge
  return `${bridgeOrigin}/auth-bridge.html?v=${Date.now()}`;
}

function openBridgeAndPostPassword(email, password) {
  const bridgeUrl = getBridgeUrl();
  const returnUrl = getReturnUrl();
  const targetOrigin = new URL(returnUrl).origin;
  
  // Return URL already saved to sessionStorage by auth page on load
  // No need to save again here
  
  const bridge = window.open(bridgeUrl, 'gr-auth-bridge', 'width=520,height=640');
  if (!bridge) {
    showMessage('Please allow popups to continue login', 'info');
    return false;
  }

  let acknowledged = false;
  const handleMessage = (event) => {
    if (event.origin !== targetOrigin) return;
    const data = event.data || {};
    if (data.type === 'signedIn') {
      acknowledged = true;
      window.removeEventListener('message', handleMessage);
      try { bridge.close(); } catch {}
      redirectHome();
    } else if (data.type === 'error') {
      acknowledged = true;
      window.removeEventListener('message', handleMessage);
      try { bridge.close(); } catch {}
      showMessage(data.message || 'Sign in failed on main site', 'error');
    }
  };
  window.addEventListener('message', handleMessage);

  // Retry posting a few times until the bridge is ready
  const payload = { type: 'passwordSignIn', email, password };
  let attempts = 0;
  const iv = setInterval(() => {
    attempts++;
    try { bridge.postMessage(payload, targetOrigin); } catch {}
    if (acknowledged || attempts > 25) { // ~5s @ 200ms
      clearInterval(iv);
      if (!acknowledged) showMessage('Timeout contacting main site. Please try again.', 'error');
    }
  }, 200);

  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  // Tabs
  const signinTab = document.getElementById('signin-tab');
  const signupTab = document.getElementById('signup-tab');
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');

  signinTab.addEventListener('click', () => {
    signinTab.classList.add('active');
    signupTab.classList.remove('active');
    signinForm.classList.add('active');
    signupForm.classList.remove('active');
    const googleText = document.getElementById('google-button-text');
    const githubText = document.getElementById('github-button-text');
    if (googleText) googleText.textContent = 'Sign in with Google';
    if (githubText) githubText.textContent = 'Sign in with GitHub';
  });

  signupTab.addEventListener('click', () => {
    signupTab.classList.add('active');
    signinTab.classList.remove('active');
    signupForm.classList.add('active');
    signinForm.classList.remove('active');
    const googleText = document.getElementById('google-button-text');
    const githubText = document.getElementById('github-button-text');
    if (googleText) googleText.textContent = 'Sign up with Google';
    if (githubText) githubText.textContent = 'Sign up with GitHub';
  });

  // Email/password sign in – perform on main domain via bridge
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    openBridgeAndPostPassword(email, password);
  });

  // Email/password sign up – create on auth subdomain then sign in on main domain
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const auth = await getFirebaseAuth();
    if (!auth) return;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('confirm-password').value;
    if (password !== confirm) return showMessage('Passwords do not match', 'error');
    if (password.length < 6) return showMessage('Password too short', 'error');
    try {
      const { createUserWithEmailAndPassword } = await import(FIREBASE_CDN + 'firebase-auth.js');
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      showMessage('Account created! Redirecting...', 'success');
      
      // Get the user's ID token (same approach as Google/GitHub)
      const idToken = await cred.user.getIdToken();
      
      if (!idToken) {
        console.error('[Auth] Could not get Firebase ID token after account creation');
        showMessage('Authentication error. Please try signing in.', 'error');
        return;
      }
      
      
      // Get the return URL from sessionStorage (saved when page loaded)
      const returnTo = sessionStorage.getItem('gr.returnTo') || '/';
      
      // Pass the Firebase ID token to bridge (same as Google/GitHub flow)
      const bridgeUrl = new URL(getBridgeUrl());
      bridgeUrl.hash = `provider=google_firebase&token=${encodeURIComponent(idToken)}&return=${encodeURIComponent(returnTo)}`;
      
      location.replace(bridgeUrl.toString());
    } catch (err) {
      console.error('[Auth] Sign up error:', err);
      showMessage(err.message || 'Sign up failed', 'error');
    }
  });

  // Providers
  const googleBtn = document.getElementById('google-signin');
  const githubBtn = document.getElementById('github-signin');

  googleBtn?.addEventListener('click', async () => {
    // No Firebase needed — just redirect to bridge which handles OAuth popup
    try {
      showMessage('Redirecting to Google sign-in…', 'info');
      const returnTo = sessionStorage.getItem('gr.returnTo') || getReturnUrl();
      const bridgeUrl = new URL(getBridgeUrl());
      bridgeUrl.hash = `provider=google_oauth_popup&return=${encodeURIComponent(returnTo)}`;
      location.replace(bridgeUrl.toString());
    } catch (err) {
      console.error('[Auth] Google sign-in error:', err);
      showMessage(err.message || 'Google sign-in failed', 'error');
    }
  });

  githubBtn?.addEventListener('click', async () => {
    // No Firebase needed — just redirect to bridge which handles OAuth popup
    try {
      showMessage('Redirecting to GitHub sign-in…', 'info');
      const returnTo = sessionStorage.getItem('gr.returnTo') || getReturnUrl();
      const bridgeUrl = new URL(getBridgeUrl());
      bridgeUrl.hash = `provider=github_oauth_popup&return=${encodeURIComponent(returnTo)}`;
      location.replace(bridgeUrl.toString());
    } catch (err) {
      console.error('[Auth] GitHub sign-in error:', err);
      showMessage(err.message || 'GitHub sign-in failed', 'error');
    }
  });

  // Forgot password: send to origin site's forgot password page
  const forgotBtn = document.querySelector('.forgot-password-btn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', () => {
      const returnUrl = getReturnUrl();
      const origin = new URL(returnUrl).origin;
      window.location.href = `${origin}/forgot-password.html`;
    });
  }

  // Guest/Anonymous sign-in
  const guestBtn = document.getElementById('continueAsGuestBtn');
  if (guestBtn) {
    guestBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        showMessage('Signing in as guest…', 'info');
        const auth = await getFirebaseAuth();
        if (!auth) return;
        const { signInAnonymously } = await import(FIREBASE_CDN + 'firebase-auth.js');
        await signInAnonymously(auth);
        
        // Get the return URL from sessionStorage (saved when page loaded)
        const returnTo = sessionStorage.getItem('gr.returnTo') || '/';
        
        // For anonymous sign-in, pass the return URL
        const bridgeUrl = new URL(getBridgeUrl());
        bridgeUrl.hash = `provider=anonymous&return=${encodeURIComponent(returnTo)}`;
        location.replace(bridgeUrl.toString());
      } catch (err) {
        console.error(err);
        showMessage(err.message || 'Guest sign-in failed', 'error');
      }
    });
  }
});
