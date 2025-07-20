/**
 * Firebase Configuration
 * Centralized configuration for Firebase services
 */

// Environment-based configuration
const getFirebaseConfig = () => {
    // Check if we're in production, development, or local environment
    const isProduction = window.location.hostname === 'your-production-domain.com';
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Production config
    const productionConfig = {
        apiKey: "AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ",
        authDomain: "shared-sign-in.firebaseapp.com",
        projectId: "shared-sign-in",
        storageBucket: "shared-sign-in.firebasestorage.app",
        messagingSenderId: "332039027753",
        appId: "1:332039027753:web:aa7c6877d543bb90363038",
        measurementId: "G-KK5XVVLMVN"
    };
    
    // Development config (can be same as production or different)
    const developmentConfig = {
        ...productionConfig
        // Override with development-specific settings if needed
    };
    
    // Return appropriate config based on environment
    if (isProduction) {
        return productionConfig;
    } else {
        return developmentConfig;
    }
};

export const firebaseConfig = getFirebaseConfig();

// Firebase service initialization flags
export const firebaseFeatures = {
    auth: true,
    database: true,
    firestore: true,
    analytics: true,
    enablePersistence: true // Enable offline persistence
};

// Error messages
export const firebaseErrors = {
    CONNECTION_FAILED: 'Failed to connect to Firebase services',
    AUTH_FAILED: 'Authentication failed',
    DATABASE_ERROR: 'Database operation failed',
    PERMISSION_DENIED: 'Permission denied'
};

// Make config globally available for backwards compatibility
window.firebaseConfig = firebaseConfig;
