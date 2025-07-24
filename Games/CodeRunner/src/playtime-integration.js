// CodeRunner Game - Playtime Tracking Integration
let GamePlaytimeTrackerClass;

console.log('[PlaytimeIntegration] 🔄 Loading playtime tracking module...');

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
    console.log('[PlaytimeIntegration] Attempting to import from module...');
    const module = await import('../game-playtime-tracker.js');
    GamePlaytimeTrackerClass = module.default;
    console.log('[PlaytimeIntegration] ✅ Successfully imported from module');
} catch (e) {
    // Fall back to global variable if import fails
    console.log('[PlaytimeIntegration] ⚠️ Module import failed, falling back to global variable', e);
    GamePlaytimeTrackerClass = window.GamePlaytimeTracker;
    if (!GamePlaytimeTrackerClass) {
        console.error('[PlaytimeIntegration] ❌ Failed to load playtime tracker - not available as module or global variable');
    }
}

// Initialize the playtime tracker when the game starts
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[PlaytimeIntegration] 🎮 Document loaded, initializing playtime tracking for CodeRunner');
    
    // Create and initialize the playtime tracker
    console.log('[PlaytimeIntegration] Creating tracker instance...');
    const tracker = new GamePlaytimeTrackerClass();
    console.log('[PlaytimeIntegration] Initializing tracker with game details...');
    await tracker.init('coderunner', 'CodeRunner', true);
    
    // Store the tracker instance for debugging
    window.playtimeTracker = tracker;
    console.log('[PlaytimeIntegration] Tracker accessible via window.playtimeTracker for debugging');
    
    // Start tracking playtime
    console.log('[PlaytimeIntegration] Starting playtime tracking...');
    tracker.startTracking();
    
    // Dispatch game started event for other systems that might be listening
    console.log('[PlaytimeIntegration] Dispatching gameStarted event');
    window.dispatchEvent(new CustomEvent('gameStarted'));
    
    // Add event listeners for game state
    window.addEventListener('gameStarted', () => {
        // If the game has a specific "start" event, restart tracking
        if (tracker && !tracker.isTracking) {
            console.log('[PlaytimeIntegration] 🎲 Game started event - beginning playtime tracking');
            tracker.startTracking();
        }
    });
    
    window.addEventListener('gamePaused', () => {
        console.log('[PlaytimeIntegration] ⏸️ Game paused event received');
        // Optional: Could pause tracking when game is paused
        // For simplicity, we'll keep tracking even during pauses
    });
    
    window.addEventListener('gameEnded', () => {
        // If the game has a specific "end" event, save the playtime
        if (tracker && tracker.isTracking) {
            console.log('[PlaytimeIntegration] 🏁 Game ended event - saving final playtime');
            tracker.stopTracking(true);
        }
    });
    
    console.log('[PlaytimeIntegration] ✅ Playtime tracking setup complete');
});

// Also handle page visibility changes
document.addEventListener('visibilitychange', () => {
    // When tab becomes hidden, save the current playtime
    if (document.hidden && window.playtimeTracker && window.playtimeTracker.isTracking) {
        // Get the current playtime before saving
        const currentMinutes = window.playtimeTracker.getTotalMinutes();
        const formattedTime = formatPlaytime(currentMinutes);
        
        console.log(`[PlaytimeIntegration] 🔴 Tab hidden - Updated playtime to ${formattedTime}`);
        
        // Use savePlaytimeData which is the public method for saving
        if (typeof window.playtimeTracker.savePlaytimeData === 'function') {
            window.playtimeTracker.savePlaytimeData().then(result => {
                console.log(`[PlaytimeIntegration] 💾 Saved playtime data to your profile`);
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
        
        console.log(`[PlaytimeIntegration] 🟢 Tab visible again - Current total playtime: ${formattedTime}`);
        window.playtimeTracker.startTracking();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.playtimeTracker && window.playtimeTracker.isTracking) {
        // Get the current playtime before saving
        const currentMinutes = window.playtimeTracker.getTotalMinutes();
        const formattedTime = formatPlaytime(currentMinutes);
        
        console.log(`[PlaytimeIntegration] 👋 Page unloading - Total playtime: ${formattedTime}`);
        
        // Use savePlaytimeData which is the public method for saving
        window.playtimeTracker.savePlaytimeData();
    }
});
