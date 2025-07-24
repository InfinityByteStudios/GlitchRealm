// ByteSurge Game - Playtime Tracking Integration
import GamePlaytimeTracker from '../game-playtime-tracker.js';

// Initialize the playtime tracker when the game starts
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing playtime tracking for ByteSurge');
    
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
            console.log('Game started - beginning playtime tracking');
            tracker.startTracking();
        }
    });
    
    window.addEventListener('gamePaused', () => {
        // Optional: Could pause tracking when game is paused
    });
    
    window.addEventListener('gameEnded', () => {
        if (tracker && tracker.isTracking) {
            console.log('Game ended - saving final playtime');
            tracker.stopTracking(true);
        }
    });
});

// The rest of the event listeners are handled by the GamePlaytimeTracker class itself
