// Minimal standalone auth for GlitchRealm Sign In page
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import {
    getAuth, onAuthStateChanged,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    sendPasswordResetEmail,
    GoogleAuthProvider, GithubAuthProvider, signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
    apiKey: "AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ",
    authDomain: "shared-sign-in.firebaseapp.com",
    projectId: "shared-sign-in",
    storageBucket: "shared-sign-in.firebasestorage.app",
    messagingSenderId: "332039027753",
    appId: "1:332039027753:web:aa7c6877d543bb90363038",
    measurementId: "G-KK5XVVLMVN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM elements (match original modal structure)
const tabs = Array.from(document.querySelectorAll('.auth-tab'));
const signinFormContainer = document.getElementById('signin-form'); // container
const signupFormContainer = document.getElementById('signup-form'); // container
const emailSigninForm = document.getElementById('email-signin-form'); // actual form
const emailSignupForm = document.getElementById('email-signup-form'); // actual form
const authMessage = document.getElementById('authMessage');
const googleButtonText = document.getElementById('google-button-text');
const githubButtonText = document.getElementById('github-button-text');

// Tab switching
function showTab(which) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === which));
    signinFormContainer?.classList.toggle('active', which === 'signin');
    signupFormContainer?.classList.toggle('active', which === 'signup');
    if (which === 'signin') {
        if (googleButtonText) googleButtonText.textContent = 'Sign in with Google';
        if (githubButtonText) githubButtonText.textContent = 'Sign in with GitHub';
    } else {
        if (googleButtonText) googleButtonText.textContent = 'Sign up with Google';
        if (githubButtonText) githubButtonText.textContent = 'Sign up with GitHub';
    }
}

tabs.forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tab)));

// Message display
function showMessage(message, type = 'info') {
    if (authMessage) {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
        authMessage.classList.remove('hidden');
        
        setTimeout(() => {
            authMessage.classList.add('hidden');
        }, 5000);
    }
}

// Redirect helpers
function getReturnUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    let returnTo = null;
    
    try {
        returnTo = sessionStorage.getItem('gr.returnTo');
    } catch (e) {}
    
    if (redirectParam) {
        try {
            returnTo = decodeURIComponent(redirectParam);
        } catch {
            returnTo = redirectParam;
        }
    }
    
    if (!returnTo) {
        // Fallback to parent directory
        return '../index.html';
    }
    
    return returnTo;
}

function goBackAfterAuth(delayMs = 600) {
    try {
        sessionStorage.removeItem('gr.returnTo');
    } catch (e) {}
    
    // Clean redirect param from URL
    try {
        const clean = new URL(window.location.href);
        clean.searchParams.delete('redirect');
        window.history.replaceState({}, document.title, clean.toString());
    } catch {}
    
    const returnUrl = getReturnUrl();
    setTimeout(() => {
        window.location.href = returnUrl;
    }, delayMs);
}

// Store redirect param in session storage on load
try {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
        sessionStorage.setItem('gr.returnTo', decodeURIComponent(redirect));
    }
} catch {}

// Sign in form (email)
emailSigninForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signin-email')?.value.trim();
    const password = document.getElementById('signin-password')?.value;
    
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    showMessage('Signing in...', 'info');
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage('ACCESS GRANTED', 'success');
        goBackAfterAuth(600);
    } catch (error) {
        console.error('Sign in error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    }
});

// Sign up form (email)
emailSignupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signup-email')?.value.trim();
    const password = document.getElementById('signup-password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;
    
    if (!email || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('PASSWORDS DO NOT MATCH', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('PASSWORD MUST BE AT LEAST 6 CHARACTERS', 'error');
        return;
    }
    
    showMessage('Creating account...', 'info');
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        showMessage('ACCOUNT CREATED SUCCESSFULLY', 'success');
        goBackAfterAuth(800);
    } catch (error) {
        console.error('Sign up error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    }
});

// Google sign in
document.getElementById('google-signin')?.addEventListener('click', async () => {
    showMessage('Connecting to Google...', 'info');
    
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        showMessage('GOOGLE ACCESS GRANTED', 'success');
        goBackAfterAuth(600);
    } catch (error) {
        console.error('Google sign in error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    }
});

// GitHub sign in
document.getElementById('github-signin')?.addEventListener('click', async () => {
    showMessage('Connecting to GitHub...', 'info');
    
    try {
        const provider = new GithubAuthProvider();
        await signInWithPopup(auth, provider);
        showMessage('GITHUB ACCESS GRANTED', 'success');
        goBackAfterAuth(600);
    } catch (error) {
        console.error('GitHub sign in error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    }
});

// Forgot password (link under sign-in form)
document.querySelector('.forgot-link')?.addEventListener('click', async () => {
    const email = document.getElementById('signin-email')?.value.trim();
    
    if (!email) {
        showMessage('Please enter your email address first', 'error');
        return;
    }
    
    showMessage('Sending reset email...', 'info');
    
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('Password reset email sent', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    }
});

// Continue as guest (anonymous mode button just goes back)
document.getElementById('anonymous-signin')?.addEventListener('click', () => {
    window.location.href = getReturnUrl();
});

// If already signed in, redirect immediately
onAuthStateChanged(auth, (user) => {
    if (user) {
        goBackAfterAuth(100);
    }
});

// Error message mapping
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'USER NOT FOUND',
        'auth/wrong-password': 'INVALID PASSWORD',
        'auth/invalid-credential': 'INVALID CREDENTIALS',
        'auth/email-already-in-use': 'EMAIL ALREADY REGISTERED',
        'auth/weak-password': 'PASSWORD TOO WEAK',
        'auth/invalid-email': 'INVALID EMAIL FORMAT',
        'auth/too-many-requests': 'TOO MANY ATTEMPTS',
        'auth/network-request-failed': 'NETWORK ERROR',
        'auth/popup-closed-by-user': 'POPUP CLOSED',
        'auth/cancelled-popup-request': 'POPUP CANCELLED'
    };
    
    return errorMessages[errorCode] || 'AUTHENTICATION ERROR';
}

// Handle URL parameters for messages
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const messageType = urlParams.get('type');
    
    if (message) {
        showMessage(decodeURIComponent(message), messageType || 'info');
        
        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
});
