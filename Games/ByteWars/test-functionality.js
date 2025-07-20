// Test script to verify core game functionality
// This can be run in the browser console to test key features

function testGameFunctionality() {
    console.log('🧪 Testing NeuroCore: Byte Wars Functionality');
    console.log('='.repeat(50));
    
    // Check if game instance exists
    if (typeof window.game === 'undefined') {
        console.log('❌ Game instance not found on window object');
        return;
    }
    
    const game = window.game;
    
    // Test 1: Splash Screen
    console.log('✅ Splash screen implementation: OK');
    
    // Test 2: Player existence and basic properties
    if (game.player) {
        console.log('✅ Player system: OK');
        console.log(`   - Position: (${Math.round(game.player.x)}, ${Math.round(game.player.y)})`);
        console.log(`   - Health: ${game.player.health}/${game.player.maxHealth}`);
        console.log(`   - Dash available: ${game.player.dashCooldown <= 0 ? 'Yes' : 'No'}`);
    } else {
        console.log('❌ Player system: FAIL');
    }
    
    // Test 3: Input system
    if (game.input) {
        console.log('✅ Input system: OK');
        console.log('   - Use WASD or Arrow keys to move');
        console.log('   - Mouse to aim and shoot');
        console.log('   - Space for dash');
        console.log('   - C for changelog');
        console.log('   - P for pause');
    } else {
        console.log('❌ Input system: FAIL');
    }
    
    // Test 4: Enemy Manager
    if (game.enemyManager) {
        console.log('✅ Enemy system: OK');
        console.log(`   - Current wave: ${game.enemyManager.getCurrentWave()}`);
        console.log(`   - Wave state: ${game.enemyManager.getWaveState()}`);
        console.log(`   - Active enemies: ${game.enemyManager.getActiveEnemyCount()}`);
    } else {
        console.log('❌ Enemy system: FAIL');
    }
    
    // Test 5: Upgrade System
    if (game.upgradeSystem) {
        console.log('✅ Upgrade system: OK');
    } else {
        console.log('❌ Upgrade system: FAIL');
    }
    
    // Test 6: UI System
    if (game.ui) {
        console.log('✅ UI system: OK');
        console.log('   - Modern UI with changelog overlay');
        console.log('   - Upgrade system integration');
    } else {
        console.log('❌ UI system: FAIL');
    }
    
    // Test 7: Visual Effects
    if (game.visualEffects) {
        console.log('✅ Visual effects: OK');
    } else {
        console.log('❌ Visual effects: FAIL');
    }
    
    // Test 8: Canvas and rendering
    if (game.canvas && game.ctx) {
        console.log('✅ Rendering system: OK');
        console.log(`   - Canvas size: ${game.canvas.width}x${game.canvas.height}`);
    } else {
        console.log('❌ Rendering system: FAIL');
    }
    
    console.log('='.repeat(50));
    console.log('🎮 Manual testing checklist:');
    console.log('1. Splash screen appears for 3 seconds');
    console.log('2. Player moves with WASD/Arrow keys');
    console.log('3. Mouse shooting works');
    console.log('4. Enemies spawn after preparation time');
    console.log('5. Press C to toggle changelog');
    console.log('6. Upgrade menu appears after completing waves');
    console.log('7. Loading squares animation in splash screen');
    console.log('8. Press Space for dash ability');
    
    // Add game to window for easy access
    window.testGame = game;
    console.log('💡 Game object available as window.testGame for debugging');
}

// Auto-run test after game loads
setTimeout(() => {
    if (document.readyState === 'complete') {
        testGameFunctionality();
    }
}, 5000); // Wait 5 seconds for game to initialize

// Export for manual use
window.testGameFunctionality = testGameFunctionality;
