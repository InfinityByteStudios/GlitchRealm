/**
 * Auth Redirect Handler for GlitchRealm
 * 
 * This script improves the auth flow to properly handle redirects from games page
 * and other pages back to the original location after sign-in.
 */

class AuthRedirectHandler {
    constructor() {
        this.storageKey = 'gr.returnTo';
        this.init();
    }

    init() {
        // Store return URL when navigating to auth pages
        this.storeReturnUrl();

        // Handle auth state changes
        if (window.firebaseAuth) {
            window.firebaseAuth.onAuthStateChanged(user => {
                if (user) {
                    this.handleSuccessfulAuth();
                }
            });
        }
    }

    // Store the current URL as return destination
    storeReturnUrl() {
        const currentUrl = window.location.href;

        // Don't store auth-related URLs as return destinations
        if (this.isAuthUrl(currentUrl)) {
            return;
        }

        try {
            sessionStorage.setItem(this.storageKey, currentUrl);
            localStorage.setItem(this.storageKey, currentUrl); // Backup
        } catch (e) {
            console.warn('[AuthRedirect] Could not store return URL:', e);
        }
    }

    // Check if URL is auth-related
    isAuthUrl(url) {
        const authPaths = [
            '/Sign In/',
            '/auth-bridge.html',
            'auth.glitchrealm.ca',
            'shared-sign-in.firebaseapp.com'
        ];

        return authPaths.some(path => url.includes(path));
    }

    // Get the stored return URL
    getReturnUrl() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');
        if (redirectParam) {
            try {
                return decodeURIComponent(redirectParam);
            } catch (e) {
                return redirectParam;
            }
        }

        // Check hash parameters (for auth bridge)
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const returnParam = hashParams.get('return');
        if (returnParam) {
            try {
                return decodeURIComponent(returnParam);
            } catch (e) {
                return returnParam;
            }
        }

        // Check sessionStorage
        try {
            const stored = sessionStorage.getItem(this.storageKey);
            if (stored && !this.isAuthUrl(stored)) {
                return stored;
            }
        } catch (e) { }

        // Check localStorage as fallback
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored && !this.isAuthUrl(stored)) {
                return stored;
            }
        } catch (e) { }

        // Default to home page
        return '/';
    }

    // Handle successful authentication
    handleSuccessfulAuth() {
        const returnUrl = this.getReturnUrl();

        // Clean up stored URLs
        try {
            sessionStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.storageKey);
        } catch (e) { }


        // Small delay to ensure auth state is synced
        setTimeout(() => {
            window.location.href = returnUrl;
        }, 500);
    }

    // Redirect to sign in with proper return URL
    redirectToSignIn(returnUrl = null) {
        const targetUrl = returnUrl || window.location.href;

        // Store return URL
        try {
            sessionStorage.setItem(this.storageKey, targetUrl);
            localStorage.setItem(this.storageKey, targetUrl);
        } catch (e) { }

        // Redirect to sign in page with return parameter
        const signInUrl = `/Sign In/index.html?redirect=${encodeURIComponent(targetUrl)}`;
        window.location.href = signInUrl;
    }

    // Enhanced OAuth redirect for auth subdomain
    redirectToOAuth(provider, returnUrl = null) {
        const targetUrl = returnUrl || window.location.href;

        // Store return URL in multiple places for reliability
        try {
            sessionStorage.setItem(this.storageKey, targetUrl);
            localStorage.setItem(this.storageKey, targetUrl);
        } catch (e) { }

        // Determine if we're in development or production
        const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');

        // Construct auth URL based on environment
        let authBaseUrl;
        if (isDev) {
            // Development: use local auth folder
            authBaseUrl = `${window.location.protocol}//${window.location.host}/auth`;
        } else {
            // Production: use auth subdomain
            authBaseUrl = 'https://auth.glitchrealm.ca';
        }

        const returnParam = encodeURIComponent(targetUrl);

        let authUrl;
        switch (provider) {
            case 'google':
                authUrl = `${authBaseUrl}/google?return=${returnParam}`;
                break;
            case 'github':
                authUrl = `${authBaseUrl}/github?return=${returnParam}`;
                break;
            case 'anonymous':
                authUrl = `${authBaseUrl}/anonymous?return=${returnParam}`;
                break;
            default:
                console.error('[AuthRedirect] Unknown provider:', provider);
                return;
        }

        window.location.href = authUrl;
    }
}

// Initialize the auth redirect handler
const authRedirectHandler = new AuthRedirectHandler();

// Make it globally available
window.authRedirectHandler = authRedirectHandler;

// Enhanced sign-in trigger function for games page
window.triggerSignInWithRedirect = function (event, provider = null) {
    if (event) {
        event.preventDefault();
    }

    const currentUrl = window.location.href;

    if (provider) {
        // Use OAuth redirect
        authRedirectHandler.redirectToOAuth(provider, currentUrl);
    } else {
        // Use regular sign-in page
        authRedirectHandler.redirectToSignIn(currentUrl);
    }
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthRedirectHandler;
}
