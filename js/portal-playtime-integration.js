// GlitchRealm Portal - Playtime Tracking Integration
// This script connects the game launcher with the playtime tracking system

document.addEventListener('DOMContentLoaded', () => {
    
    // Listen for game start events
    window.addEventListener('gameStarted', (event) => {
        
        // If we're on the test page, trigger the test UI
        if (document.getElementById('simulateGameStart')) {
            document.getElementById('simulateGameStart').click();
        }
        
        // You could also directly use the PlaytimeTracker here if needed
        if (window.playtimeTracker) {
            window.playtimeTracker.startTracking();
        }
    });
    
    // Listen for game end events
    window.addEventListener('gameEnded', (event) => {
        
        // If we're on the test page, trigger the test UI
        if (document.getElementById('simulateGameEnd')) {
            document.getElementById('simulateGameEnd').click();
        }
        
        // You could also directly use the PlaytimeTracker here if needed
        if (window.playtimeTracker) {
            window.playtimeTracker.savePlaytimeData();
        }
    });
    
    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
        
        // If we're on the test page, trigger the test UI
        if (document.hidden) {
            if (document.getElementById('simulateTabHidden')) {
                document.getElementById('simulateTabHidden').click();
            }
        } else {
            if (document.getElementById('simulateTabVisible')) {
                document.getElementById('simulateTabVisible').click();
            }
        }
    });
    
});
