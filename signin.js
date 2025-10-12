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

function redirectHome() {
  window.location.replace('https://glitchrealm.ca/');
}

function openBridgeAndPostPassword(email, password) {
  const bridge = window.open('https://glitchrealm.ca/auth-bridge.html', 'gr-auth-bridge', 'width=520,height=640');
  if (!bridge) {
    showMessage('Please allow popups to continue login', 'info');
    return false;
  }
  const targetOrigin = 'https://glitchrealm.ca';

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
      const res = await window.firebaseSignInWithPopup(window.firebaseAuth, window.googleProvider);
      // Extract credential and tokens
      let idToken = '', accessToken = '';
      try {
        const credObj = window.FirebaseGoogleAuthProvider.credentialFromResult(res);
        accessToken = credObj?.accessToken || '';
        idToken = res?._tokenResponse?.idToken || '';
      } catch {}
      const bridgeUrl = new URL('https://glitchrealm.ca/auth-bridge.html');
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
      const res = await window.firebaseSignInWithPopup(window.firebaseAuth, window.githubProvider);
      let accessToken = '';
      try {
        const credObj = window.FirebaseGithubAuthProvider.credentialFromResult(res);
        accessToken = credObj?.accessToken || '';
      } catch {}
      const bridgeUrl = new URL('https://glitchrealm.ca/auth-bridge.html');
      bridgeUrl.hash = `provider=github&access_token=${encodeURIComponent(accessToken)}`;
      location.replace(bridgeUrl.toString());
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'GitHub sign-in failed', 'error');
    }
  });

  // Forgot password: send to main site page
  const forgotBtn = document.querySelector('.forgot-password-btn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', () => {
      window.location.href = 'https://glitchrealm.ca/forgot-password.html';
    });
  }
});
