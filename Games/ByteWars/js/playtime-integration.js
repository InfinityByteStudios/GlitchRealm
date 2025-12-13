// ByteWars Game - Playtime Tracking Integration
import { PlaytimeTracker } from '../../playtime-tracker.js';

// Firebase configuration (same as used in other games)
const firebaseConfig = {
  apiKey: "AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ",
  authDomain: "shared-sign-in.firebaseapp.com",
  databaseURL: "https://shared-sign-in-default-rtdb.firebaseio.com/",
  projectId: "shared-sign-in",
    storageBucket: "shared-sign-in.appspot.com",
  messagingSenderId: "332039027753",
  appId: "1:332039027753:web:aa7c6877d543bb90363038",
  measurementId: "G-KK5XVVLMVN"
};

// Initialize Firebase if not already initialized
if (typeof firebase === 'undefined') {
    } else if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize the playtime tracker when the game starts
document.addEventListener('DOMContentLoaded', async () => {
    // Create and initialize the playtime tracker
    const tracker = new PlaytimeTracker();
    await tracker.init('bytewars', 'NeuroCore: Byte Wars', true);
    
    // Store the tracker instance for debugging
    window.playtimeTracker = tracker;
    
    // Start tracking playtime
    tracker.startTracking();
    
    // Add event listeners for game state if available
    if (window.addEventListener) {
        // If the game has a specific "start" event
        window.addEventListener('gameStarted', () => {
            if (tracker && !tracker.isTracking) {
                tracker.startTracking();
            }
        });
        
        // If the game has a specific "end" event
        window.addEventListener('gameEnded', () => {
            if (tracker && tracker.isTracking) {
                tracker.savePlaytimeData();
            }
        });
    }
});

// Also handle page visibility changes
document.addEventListener('visibilitychange', () => {
    // When tab becomes hidden, save the current playtime
    if (document.hidden && window.playtimeTracker && window.playtimeTracker.isTracking) {
        window.playtimeTracker.savePlaytimeData();
    }
    
    // When tab becomes visible again, make sure tracking is active
    if (!document.hidden && window.playtimeTracker && !window.playtimeTracker.isTracking) {
        window.playtimeTracker.startTracking();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.playtimeTracker && window.playtimeTracker.isTracking) {
        window.playtimeTracker.savePlaytimeData();
    }
});
