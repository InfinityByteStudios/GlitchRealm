// CodeRunner Game - Playtime Tracking Integration
let GamePlaytimeTrackerClass;

// Helper function to format playtime in a human-readable format
function formatPlaytime(minutes) {
    if (minutes < 1) {
        const seconds = Math.round(minutes * 60);
        return `${seconds} seconds`;
    } else if (minutes < 60) {
        const mins = Math.floor(minutes);
        const seconds = Math.round((minutes - mins) * 60);
        return `${mins} minute${mins !== 1 ? 's' : ''}${seconds > 0 ? ` and ${seconds} second${seconds !== 1 ? 's' : ''}` : ''}`;
    } else {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${hours} hour${hours !== 1 ? 's' : ''} and ${mins} minute${mins !== 1 ? 's' : ''}`;
    }
}

// Try to import from module first
try {
    // Dynamic import for module
    const module = await import('../game-playtime-tracker.js');
    GamePlaytimeTrackerClass = module.default;
    } catch (e) {
    // Fall back to global variable if import fails
    GamePlaytimeTrackerClass = window.GamePlaytimeTracker;
    if (!GamePlaytimeTrackerClass) {
        console.error('[PlaytimeIntegration] ❌ Failed to load playtime tracker - not available as module or global variable');
    }
}

// Initialize the playtime tracker when the game starts
document.addEventListener('DOMContentLoaded', async () => {
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
            tracker.stopTracking(true);
        }
    });
    
    });

// Also handle page visibility changes
document.addEventListener('visibilitychange', () => {
    // When tab becomes hidden, save the current playtime
    if (document.hidden && window.playtimeTracker && window.playtimeTracker.isTracking) {
        // Get the current playtime before saving
        const currentMinutes = window.playtimeTracker.getTotalMinutes();
        const formattedTime = formatPlaytime(currentMinutes);
        
        // Use savePlaytimeData which is the public method for saving
        if (typeof window.playtimeTracker.savePlaytimeData === 'function') {
            window.playtimeTracker.savePlaytimeData().then(result => {
                }).catch(err => {
                console.error('[PlaytimeIntegration] Error saving playtime:', err);
            });
        }
    }
    
    // When tab becomes visible again, make sure tracking is active
    if (!document.hidden && window.playtimeTracker && !window.playtimeTracker.isTracking) {
        // Get current total playtime
        const totalMinutes = window.playtimeTracker.totalMinutes || 0;
        const formattedTime = formatPlaytime(totalMinutes);
        
        window.playtimeTracker.startTracking();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.playtimeTracker && window.playtimeTracker.isTracking) {
        // Get the current playtime before saving
        const currentMinutes = window.playtimeTracker.getTotalMinutes();
        const formattedTime = formatPlaytime(currentMinutes);
        
        // Use savePlaytimeData which is the public method for saving
        window.playtimeTracker.savePlaytimeData();
    }
});
