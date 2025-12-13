// CodeRunner Game - Direct Playtime Tracking Integration
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
    try {
        // Directly create tracker from global variable
        const tracker = new GamePlaytimeTracker();
        
        await tracker.init('coderunner', 'CodeRunner', true);
        
        // Store the tracker instance for debugging and access
        window.playtimeTracker = tracker;
        // Start tracking playtime
        tracker.startTracking();
        
        // Also handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            // When tab becomes hidden, save the current playtime
            if (document.hidden && window.playtimeTracker && window.playtimeTracker.isTracking) {
                // Get the current playtime before saving
                const currentMinutes = window.playtimeTracker.getTotalMinutes();
                const formattedTime = formatPlaytime(currentMinutes);
                
                // Save playtime data
                window.playtimeTracker.savePlaytimeData().then(() => {
                    }).catch(err => {
                    console.error('[PlaytimeDirectIntegration] Error saving playtime:', err);
                });
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
                
                // Save playtime data
                window.playtimeTracker.savePlaytimeData();
            }
        });
        
        } catch (error) {
        console.error('[PlaytimeDirectIntegration] ❌ Error setting up playtime tracking:', error);
    }
});
