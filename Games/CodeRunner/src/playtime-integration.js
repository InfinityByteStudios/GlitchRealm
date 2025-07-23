// CodeRunner Game - Playtime Tracking Integration
let GamePlaytimeTrackerClass;

// Try to import from module first
try {
    // Dynamic import for module
    const module = await import('../game-playtime-tracker.js');
    GamePlaytimeTrackerClass = module.default;
} catch (e) {
    // Fall back to global variable if import fails
    console.log('Falling back to global GamePlaytimeTracker');
    GamePlaytimeTrackerClass = window.GamePlaytimeTracker;
}

// Initialize the playtime tracker when the game starts
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing playtime tracking for CodeRunner');
    
    // Create and initialize the playtime tracker
    const tracker = new GamePlaytimeTrackerClass();
    await tracker.init('coderunner', 'CodeRunner', true);
    
    // Store the tracker instance for debugging
    window.playtimeTracker = tracker;
    
    // Start tracking playtime
    tracker.startTracking();
    
    // Dispatch game started event for other systems that might be listening
    window.dispatchEvent(new CustomEvent('gameStarted'));
    
    // Add event listeners for game state
    window.addEventListener('gameStarted', () => {
        // If the game has a specific "start" event, restart tracking
        if (tracker && !tracker.isTracking) {
            console.log('Game started - beginning playtime tracking');
            tracker.startTracking();
        }
    });
    
    window.addEventListener('gamePaused', () => {
        // Optional: Could pause tracking when game is paused
        // For simplicity, we'll keep tracking even during pauses
    });
    
    window.addEventListener('gameEnded', () => {
        // If the game has a specific "end" event, save the playtime
        if (tracker && tracker.isTracking) {
            console.log('Game ended - saving final playtime');
            tracker.stopTracking(true);
        }
    });
});

// Also handle page visibility changes
document.addEventListener('visibilitychange', () => {
    // When tab becomes hidden, save the current playtime
    if (document.hidden && window.playtimeTracker && window.playtimeTracker.isTracking) {
        console.log('Tab hidden - saving current playtime');
        window.playtimeTracker.savePlaytimeData();
    }
    
    // When tab becomes visible again, make sure tracking is active
    if (!document.hidden && window.playtimeTracker && !window.playtimeTracker.isTracking) {
        console.log('Tab visible again - resuming playtime tracking');
        window.playtimeTracker.startTracking();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.playtimeTracker && window.playtimeTracker.isTracking) {
        console.log('Page unloading - saving final playtime');
        window.playtimeTracker.savePlaytimeData();
    }
});
