// Auth subdomain sign-in logic
// Uses globals exposed by inline Firebase module in index.html

let firebaseReady = !!window.firebaseAuth;

window.addEventListener('firebaseReady', () => {
  firebaseReady = true;
});

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
      // Only allow glitchrealm.ca domains for security
      if (url.hostname.endsWith('glitchrealm.ca') || url.hostname === 'glitchrealm.ca') {
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
      // Only allow glitchrealm.ca domains
      if (referrerUrl.hostname.endsWith('glitchrealm.ca') || referrerUrl.hostname === 'glitchrealm.ca') {
        return document.referrer;
      }
    } catch (e) {
      console.warn('Invalid referrer URL:', document.referrer);
    }
  }
  
  // Default to main site
  return 'https://glitchrealm.ca/';
}

function redirectHome() {
  const returnUrl = getReturnUrl();
  console.log('[Auth] Redirecting to:', returnUrl);
  window.location.replace(returnUrl);
}

function getBridgeUrl() {
  const returnUrl = getReturnUrl();
  const bridgeOrigin = new URL(returnUrl).origin;
  return `${bridgeOrigin}/auth-bridge.html`;
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
    if (!firebaseReady) return showMessage('Loading auth…', 'info');
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('confirm-password').value;
    if (password !== confirm) return showMessage('Passwords do not match', 'error');
    if (password.length < 6) return showMessage('Password too short', 'error');
    try {
      const cred = await window.firebaseCreateUserWithEmailAndPassword(window.firebaseAuth, email, password);
      showMessage('Account created', 'success');
      // Ensure main site is also signed in with the same credentials
      openBridgeAndPostPassword(email, password);
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'Sign up failed', 'error');
    }
  });

  // Providers
  const googleBtn = document.getElementById('google-signin');
  const githubBtn = document.getElementById('github-signin');

  googleBtn?.addEventListener('click', async () => {
    if (!firebaseReady) return showMessage('Loading auth…', 'info');
    try {
      // Sign in with Google OAuth popup
      const res = await window.firebaseSignInWithPopup(window.firebaseAuth, window.googleProvider);
      
      // Get a fresh ID token from the signed-in user
      const idToken = await res.user.getIdToken();
      
      // Get access token from the credential
      let accessToken = '';
      try {
        const credObj = window.FirebaseGoogleAuthProvider.credentialFromResult(res);
        accessToken = credObj?.accessToken || '';
      } catch {}
      
      // Redirect to bridge with fresh tokens
      const bridgeUrl = new URL(getBridgeUrl());
      bridgeUrl.hash = `provider=google&id_token=${encodeURIComponent(idToken)}&access_token=${encodeURIComponent(accessToken)}`;
      location.replace(bridgeUrl.toString());
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'Google sign-in failed', 'error');
    }
  });

  githubBtn?.addEventListener('click', async () => {
    if (!firebaseReady) return showMessage('Loading auth…', 'info');
    try {
      // Sign in with GitHub OAuth popup
      const res = await window.firebaseSignInWithPopup(window.firebaseAuth, window.githubProvider);
      
      // Get access token from the credential
      let accessToken = '';
      try {
        const credObj = window.FirebaseGithubAuthProvider.credentialFromResult(res);
        accessToken = credObj?.accessToken || '';
      } catch {}
      
      // Redirect to bridge with access token
      const bridgeUrl = new URL(getBridgeUrl());
      bridgeUrl.hash = `provider=github&access_token=${encodeURIComponent(accessToken)}`;
      location.replace(bridgeUrl.toString());
    } catch (err) {
      console.error(err);
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
      if (!firebaseReady) return showMessage('Loading auth…', 'info');
      
      try {
        // Import signInAnonymously
        const { signInAnonymously } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        showMessage('Signing in as guest...', 'info');
        
        // Sign in anonymously on auth subdomain
        await signInAnonymously(window.firebaseAuth);
        
        // For anonymous sign-in, we can't pass tokens
        // The bridge will need to sign in anonymously on the target domain too
        const bridgeUrl = new URL(getBridgeUrl());
        bridgeUrl.hash = 'provider=anonymous';
        location.replace(bridgeUrl.toString());
      } catch (err) {
        console.error(err);
        showMessage(err.message || 'Guest sign-in failed', 'error');
      }
    });
  }
});
