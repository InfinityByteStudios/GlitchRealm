// ByteSurge Game - Playtime Tracking Integration
import GamePlaytimeTracker from '../../game-playtime-tracker.js';

// Initialize the playtime tracker when the game starts
document.addEventListener('DOMContentLoaded', async () => {
    // Create and initialize the playtime tracker
    const tracker = new GamePlaytimeTracker();
    await tracker.init('bytesurge', 'ByteSurge', true);
    
    // Store the tracker instance for debugging
    window.playtimeTracker = tracker;
    
    // Start tracking playtime
    tracker.startTracking();
    
    // Dispatch game started event for other systems that might be listening
    window.dispatchEvent(new CustomEvent('gameStarted'));
    
    // Add event listeners for game state if available
    window.addEventListener('gameStarted', () => {
        if (tracker && !tracker.isTracking) {
            tracker.startTracking();
        }
    });
    
    window.addEventListener('gamePaused', () => {
        // Optional: Could pause tracking when game is paused
    });
    
    window.addEventListener('gameEnded', () => {
        if (tracker && tracker.isTracking) {
            tracker.stopTracking(true);
        }
    });
});

// The rest of the event listeners are now handled by the GamePlaytimeTracker class
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
