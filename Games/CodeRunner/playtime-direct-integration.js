// CodeRunner Game - Direct Playtime Tracking Integration
console.log('[PlaytimeDirectIntegration] 🔄 Setting up direct playtime tracking for CodeRunner');

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

// Initialize the playtime tracker when the document is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[PlaytimeDirectIntegration] 🎮 Document loaded, initializing playtime tracking for CodeRunner');
    
    try {
        // Directly create tracker from global variable
        console.log('[PlaytimeDirectIntegration] Creating tracker instance from global GamePlaytimeTracker');
        const tracker = new GamePlaytimeTracker();
        
        console.log('[PlaytimeDirectIntegration] Initializing tracker with game details...');
        await tracker.init('coderunner', 'CodeRunner', true);
        
        // Store the tracker instance for debugging and access
        window.playtimeTracker = tracker;
        console.log('[PlaytimeDirectIntegration] Tracker accessible via window.playtimeTracker');
        
        // Start tracking playtime
        console.log('[PlaytimeDirectIntegration] Starting playtime tracking...');
        tracker.startTracking();
        
        // Also handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            // When tab becomes hidden, save the current playtime
            if (document.hidden && window.playtimeTracker && window.playtimeTracker.isTracking) {
                // Get the current playtime before saving
                const currentMinutes = window.playtimeTracker.getTotalMinutes();
                const formattedTime = formatPlaytime(currentMinutes);
                
                console.log(`[PlaytimeDirectIntegration] 🔴 Tab hidden - Updated playtime to ${formattedTime}`);
                
                // Save playtime data
                window.playtimeTracker.savePlaytimeData().then(() => {
                    console.log(`[PlaytimeDirectIntegration] 💾 Saved playtime data to your profile`);
                }).catch(err => {
                    console.error('[PlaytimeDirectIntegration] Error saving playtime:', err);
                });
            }
            
            // When tab becomes visible again, make sure tracking is active
            if (!document.hidden && window.playtimeTracker && !window.playtimeTracker.isTracking) {
                // Get current total playtime
                const totalMinutes = window.playtimeTracker.totalMinutes || 0;
                const formattedTime = formatPlaytime(totalMinutes);
                
                console.log(`[PlaytimeDirectIntegration] 🟢 Tab visible again - Current total playtime: ${formattedTime}`);
                window.playtimeTracker.startTracking();
            }
        });
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (window.playtimeTracker && window.playtimeTracker.isTracking) {
                // Get the current playtime before saving
                const currentMinutes = window.playtimeTracker.getTotalMinutes();
                const formattedTime = formatPlaytime(currentMinutes);
                
                console.log(`[PlaytimeDirectIntegration] 👋 Page unloading - Total playtime: ${formattedTime}`);
                
                // Save playtime data
                window.playtimeTracker.savePlaytimeData();
            }
        });
        
        console.log('[PlaytimeDirectIntegration] ✅ Playtime tracking setup complete');
    } catch (error) {
        console.error('[PlaytimeDirectIntegration] ❌ Error setting up playtime tracking:', error);
    }
});
