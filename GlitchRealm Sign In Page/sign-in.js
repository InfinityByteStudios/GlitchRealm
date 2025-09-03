// Handle sign in/up, providers, and tab switching
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const sectionTitle = document.getElementById('sectionTitle');
const tabSignIn = document.getElementById('tabSignIn');
const tabSignUp = document.getElementById('tabSignUp');
const errorMessage = document.getElementById('error-message');
const forgotBtn = document.getElementById('forgotPassword');
const phoneCodeContainer = document.getElementById('phoneCodeContainer');
const verifySignInCodeBtn = document.getElementById('verifySignInCode');
const suPhoneCodeContainer = document.getElementById('suPhoneCodeContainer');
const verifySignUpCodeBtn = document.getElementById('verifySignUpCode');
const emailInput = document.getElementById('email');
const emailHint = document.getElementById('emailHint');
const suEmailInput = document.getElementById('su-email');
const suEmailHint = document.getElementById('suEmailHint');
// Modal elements for phone verification
const codeModal = document.getElementById('codeModal');
const codeModalInput = document.getElementById('codeModalInput');
const codeModalVerify = document.getElementById('codeModalVerify');
const codeModalCancel = document.getElementById('codeModalCancel');
const codeModalClose = document.getElementById('codeModalClose');
const codeModalHint = document.getElementById('codeModalHint');

let recaptchaVerifier;
let pendingConfirmationResult = null;
let pendingSignUpData = null; // store { phoneNumber, email?, password? }
let recaptchaWidgetId = null;
// Using only invisible reCAPTCHA

// --- Redirect helpers ---
function getReturnUrl() {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    let target = null;
    if (redirectParam) {
        try { target = decodeURIComponent(redirectParam); } catch { target = redirectParam; }
    }
    if (!target) {
        try { target = sessionStorage.getItem('gr.returnTo') || ''; } catch {}
    }
    if (!target) {
        // Reasonable fallback to site root
        target = (window.location.origin || '') + '/';
    }
    return target;
}

function goBackAfterAuth(delayMs = 600) {
    // Clean up param and session key
    try { sessionStorage.removeItem('gr.returnTo'); } catch {}
    try {
        const clean = new URL(window.location.href);
        clean.searchParams.delete('redirect');
        window.history.replaceState({}, document.title, clean.toString());
    } catch {}
    const url = getReturnUrl();
    setTimeout(() => { window.location.href = url; }, delayMs);
}

// On load, persist redirect param into session for redundancy
try {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect) {
        sessionStorage.setItem('gr.returnTo', decodeURIComponent(redirect));
    }
} catch {}

function isLikelyPhone(value) {
    // Accepts numbers with optional + and spaces/dashes/parentheses; require at least 10 digits
    const digits = (value || '').replace(/\D/g, '');
    return digits.length >= 10;
}

function normalizePhone(value) {
    let v = (value || '').trim();
    // If no leading +, assume North America and prefix +1; adjust as needed
    if (!v.startsWith('+')) {
        const digits = v.replace(/\D/g, '');
        if (digits.length === 10) return `+1${digits}`;
        return `+${digits}`; // fallback
    }
    return v;
}

function updatePhoneHint(inputEl, hintEl) {
    const raw = inputEl.value || '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 5) {
        // Basic guidance: prefer E.164 or North America example
        hintEl.textContent = 'Phone format: +1 555-555-1234 (E.164: +15555551234)';
        hintEl.classList.remove('hidden');
    } else {
        hintEl.classList.add('hidden');
        hintEl.textContent = '';
    }
}

emailInput.addEventListener('input', () => updatePhoneHint(emailInput, emailHint));
suEmailInput.addEventListener('input', () => updatePhoneHint(suEmailInput, suEmailHint));

function ensureRecaptcha() {
    if (!recaptchaVerifier) {
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            size: 'invisible',
            callback: () => {},
            'expired-callback': () => {}
        });
        recaptchaVerifier.render().then((id) => { recaptchaWidgetId = id; });
    }
    return recaptchaVerifier;
}

function resetRecaptcha() {
    try {
        if (window.grecaptcha) {
            if (recaptchaWidgetId !== null) {
                window.grecaptcha.reset(recaptchaWidgetId);
            }
        }
    } catch (_) {}
}

function setActiveTab(tab) {
    if (tab === 'signin') {
        tabSignIn.classList.add('active');
        tabSignUp.classList.remove('active');
        signInForm.classList.remove('hidden');
        signUpForm.classList.add('hidden');
        sectionTitle.textContent = 'AUTHENTICATE';
    } else {
        tabSignUp.classList.add('active');
        tabSignIn.classList.remove('active');
        signUpForm.classList.remove('hidden');
        signInForm.classList.add('hidden');
        sectionTitle.textContent = 'CREATE ACCESS';
    }
    errorMessage.textContent = '';
}

tabSignIn.addEventListener('click', (e) => { e.preventDefault(); setActiveTab('signin'); });
tabSignUp.addEventListener('click', (e) => { e.preventDefault(); setActiveTab('signup'); });

// Clear phone code UI/state when switching tabs
function clearPhoneState() {
    pendingConfirmationResult = null;
    pendingSignUpData = null;
    const code1 = document.getElementById('phoneCode');
    const code2 = document.getElementById('su-phoneCode');
    if (code1) code1.value = '';
    if (code2) code2.value = '';
    phoneCodeContainer.classList.add('hidden');
    suPhoneCodeContainer.classList.add('hidden');
    if (codeModal) {
        codeModalInput.value = '';
        codeModal.classList.add('hidden');
        codeModal.setAttribute('aria-hidden', 'true');
    }
}
// Modal helpers
function openCodeModal(phoneNumber) {
    if (!codeModal) return;
    if (codeModalHint) codeModalHint.textContent = phoneNumber ? `Code sent to ${phoneNumber}` : '';
    codeModal.classList.remove('hidden');
    codeModal.setAttribute('aria-hidden', 'false');
    if (codeModalInput) codeModalInput.focus();
}
function closeCodeModal() {
    if (!codeModal) return;
    codeModal.classList.add('hidden');
    codeModal.setAttribute('aria-hidden', 'true');
}
if (codeModalCancel) codeModalCancel.addEventListener('click', closeCodeModal);
if (codeModalClose) codeModalClose.addEventListener('click', closeCodeModal);
if (codeModal) codeModal.addEventListener('click', (e) => { if (e.target === codeModal) closeCodeModal(); });
if (codeModalCancel) codeModalCancel.addEventListener('click', closeCodeModal);
if (codeModalClose) codeModalClose.addEventListener('click', closeCodeModal);
if (codeModal) codeModal.addEventListener('click', (e) => { if (e.target === codeModal) closeCodeModal(); });
tabSignIn.addEventListener('click', clearPhoneState);
tabSignUp.addEventListener('click', clearPhoneState);

signInForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const identifier = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorMessage.textContent = '';

    if (isLikelyPhone(identifier)) {
        // Start phone sign-in: send SMS
        const phoneNumber = normalizePhone(identifier);
        ensureRecaptcha();
        firebase.auth().signInWithPhoneNumber(phoneNumber, recaptchaVerifier)
            .then((confirmationResult) => {
                pendingConfirmationResult = confirmationResult;
                openCodeModal(phoneNumber);
            })
            .catch((error) => {
                errorMessage.textContent = `${error.code || 'auth/error'}: ${error.message}`;
                resetRecaptcha();
                // Keep only invisible reCAPTCHA (no visible fallback)
            });
        return;
    }

    // Email/password
    firebase.auth().signInWithEmailAndPassword(identifier, password)
        .then(() => { goBackAfterAuth(400); })
        .catch((error) => {
            errorMessage.textContent = `${error.code || 'auth/error'}: ${error.message}`;
        });
});

// Modal: verify code
if (codeModalVerify) codeModalVerify.addEventListener('click', function() {
    if (!pendingConfirmationResult) {
        errorMessage.textContent = 'No pending verification. Enter your phone and try again.';
        return;
    }
    const code = (codeModalInput && codeModalInput.value ? codeModalInput.value : '').trim();
    if (code.length < 4) {
        errorMessage.textContent = 'Enter the code sent to your phone.';
        return;
    }
    pendingConfirmationResult.confirm(code)
        .then(() => { goBackAfterAuth(400); })
        .catch((error) => { errorMessage.textContent = `${error.code || 'auth/error'}: ${error.message}`; });
});

// Forgot password - send reset email
forgotBtn.addEventListener('click', function() {
    const email = document.getElementById('email').value;
    errorMessage.textContent = '';
    if (!email || isLikelyPhone(email)) {
        errorMessage.textContent = 'Enter a valid email above to receive a reset link.';
        return;
    }
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            errorMessage.style.color = '#00ffa6';
            errorMessage.textContent = 'Reset email sent. Check your inbox.';
            setTimeout(() => { errorMessage.style.color = '#ff00ea'; }, 3000);
        })
            .catch((error) => {
                errorMessage.textContent = `${error.code || 'auth/error'}: ${error.message}`;
        });
});

// Handle sign up submission
signUpForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const identifier = document.getElementById('su-email').value;
    const password = document.getElementById('su-password').value;
    const confirm = document.getElementById('su-confirm').value;
    errorMessage.textContent = '';
    if (password !== confirm) {
        errorMessage.textContent = 'Passwords do not match.';
        return;
    }
    if (isLikelyPhone(identifier)) {
        // Phone sign-up: verify number first, then link password as custom flow (Firebase doesn't have phone+password natively).
        const phoneNumber = normalizePhone(identifier);
        ensureRecaptcha();
        firebase.auth().signInWithPhoneNumber(phoneNumber, recaptchaVerifier)
            .then((confirmationResult) => {
                pendingConfirmationResult = confirmationResult;
                pendingSignUpData = { phoneNumber, password };
                openCodeModal(phoneNumber);
            })
        .catch((error) => {
            errorMessage.textContent = `${error.code || 'auth/error'}: ${error.message}`;
            resetRecaptcha();
            // Keep only invisible reCAPTCHA (no visible fallback)
        });
        return;
    }

    // Email sign-up
    firebase.auth().createUserWithEmailAndPassword(identifier, password)
        .then(() => { goBackAfterAuth(600); })
    .catch((error) => { errorMessage.textContent = `${error.code || 'auth/error'}: ${error.message}`; });
});

// Verify phone code for sign-up
verifySignUpCodeBtn.addEventListener('click', function() {
    const code = document.getElementById('su-phoneCode').value;
    if (!pendingConfirmationResult || !pendingSignUpData) {
        errorMessage.textContent = 'No pending verification. Enter your phone and try again.';
        return;
    }
    pendingConfirmationResult.confirm(code)
        .then(() => {
            // At this point, the user is signed in with phone credential.
            // Optionally, you can update profile or save password separately if you maintain a custom backend.
            goBackAfterAuth(600);
        })
    .catch((error) => { errorMessage.textContent = `${error.code || 'auth/error'}: ${error.message}`; });
});

// Google sign in
document.getElementById('googleSignIn').addEventListener('click', function(e) {
    e.preventDefault();
    errorMessage.textContent = '';
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => { goBackAfterAuth(400); })
        .catch((error) => {
            errorMessage.textContent = error.message;
        });
});

// GitHub sign in
document.getElementById('githubSignIn').addEventListener('click', function(e) {
    e.preventDefault();
    errorMessage.textContent = '';
    const provider = new firebase.auth.GithubAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => { goBackAfterAuth(400); })
        .catch((error) => {
            errorMessage.textContent = error.message;
        });
});
