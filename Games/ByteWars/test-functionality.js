// Test script to verify core game functionality
// This can be run in the browser console to test key features

function testGameFunctionality() {
    );
    
    // Check if game instance exists
    if (typeof window.game === 'undefined') {
        return;
    }
    
    const game = window.game;
    
    // Test 1: Splash Screen
    // Test 2: Player existence and basic properties
    if (game.player) {
        }, ${Math.round(game.player.y)})`);
        } else {
        }
    
    // Test 3: Input system
    if (game.input) {
        } else {
        }
    
    // Test 4: Enemy Manager
    if (game.enemyManager) {
        }`);
        }`);
        }`);
    } else {
        }
    
    // Test 5: Upgrade System
    if (game.upgradeSystem) {
        } else {
        }
    
    // Test 6: UI System
    if (game.ui) {
        } else {
        }
    
    // Test 7: Visual Effects
    if (game.visualEffects) {
        } else {
        }
    
    // Test 8: Canvas and rendering
    if (game.canvas && game.ctx) {
        } else {
        }
    
    );
    // Add game to window for easy access
    window.testGame = game;
    }

// Auto-run test after game loads
setTimeout(() => {
    if (document.readyState === 'complete') {
        testGameFunctionality();
    }
}, 5000); // Wait 5 seconds for game to initialize

// Export for manual use
window.testGameFunctionality = testGameFunctionality;
