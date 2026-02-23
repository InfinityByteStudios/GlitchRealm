// GlitchRealm Portal - Playtime Tracking Integration
// This script connects the game launcher with the playtime tracking system

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing playtime tracking for GlitchRealm portal');
    
    // Listen for game start events
    window.addEventListener('gameStarted', (event) => {
        console.log('Game started event detected', event.detail);
        
        // If we're on the test page, trigger the test UI
        if (document.getElementById('simulateGameStart')) {
            document.getElementById('simulateGameStart').click();
            console.log('Triggered simulation of game start in test UI');
        }
        
        // You could also directly use the PlaytimeTracker here if needed
        if (window.playtimeTracker) {
            window.playtimeTracker.startTracking();
            console.log('Started playtime tracking via tracker object');
        }
    });
    
    // Listen for game end events
    window.addEventListener('gameEnded', (event) => {
        console.log('Game ended event detected', event.detail);
        
        // If we're on the test page, trigger the test UI
        if (document.getElementById('simulateGameEnd')) {
            document.getElementById('simulateGameEnd').click();
            console.log('Triggered simulation of game end in test UI');
        }
        
        // You could also directly use the PlaytimeTracker here if needed
        if (window.playtimeTracker) {
            window.playtimeTracker.savePlaytimeData();
            console.log('Saved playtime data via tracker object');
        }
    });
    
    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
        console.log('Visibility changed, document hidden:', document.hidden);
        
        // If we're on the test page, trigger the test UI
        if (document.hidden) {
            if (document.getElementById('simulateTabHidden')) {
                document.getElementById('simulateTabHidden').click();
                console.log('Triggered simulation of tab hidden in test UI');
            }
        } else {
            if (document.getElementById('simulateTabVisible')) {
                document.getElementById('simulateTabVisible').click();
                console.log('Triggered simulation of tab visible in test UI');
            }
        }
    });
    
    console.log('Playtime tracking integration initialized for portal');
});
