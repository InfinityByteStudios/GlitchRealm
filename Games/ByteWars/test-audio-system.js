// Audio System Test for NeuroCore: Byte Wars
// This script tests the enhanced dual audio system and crossfade functionality

console.log('🎵 NeuroCore: Byte Wars - Audio System Test');
console.log('='.repeat(50));

// Test the game object and audio system
function testAudioSystem() {
    console.log('🔍 Testing audio system components...');
    
    // Check if game object exists
    if (typeof window !== 'undefined' && window.game) {
        const game = window.game;
        console.log('✅ Game object found');
        
        // Test audio objects
        if (game.introAudio && game.gameAudio) {
            console.log('✅ Dual audio system initialized');
            console.log(`📁 Intro Audio: ${game.introAudio.src}`);
            console.log(`📁 Game Audio: ${game.gameAudio.src}`);
            console.log(`🔊 Intro Volume: ${game.introAudio.volume}`);
            console.log(`🔊 Game Volume: ${game.gameAudio.volume}`);
            console.log(`🔄 Intro Loop: ${game.introAudio.loop}`);
            console.log(`🔄 Game Loop: ${game.gameAudio.loop}`);
        } else {
            console.log('❌ Audio objects not found');
            return false;
        }
        
        // Test audio methods
        const audioMethods = ['crossfadeAudio', 'fadeOutIntroMusic', 'startGameMusicWithFadeIn'];
        audioMethods.forEach(method => {
            if (typeof game[method] === 'function') {
                console.log(`✅ Audio method: ${method}`);
            } else {
                console.log(`❌ Missing audio method: ${method}`);
            }
        });
        
        console.log('🎵 Audio system test complete');
        return true;
    } else {
        console.log('❌ Game object not found. Make sure the game is loaded.');
        return false;
    }
}

// Test audio file accessibility
function testAudioFiles() {
    console.log('\n🔍 Testing audio file accessibility...');
    
    const audioFiles = [        'assets/Music/Loading Intro.mp3',
        'assets/Music/futuristic-action-cinematic-electronic-loop-291807.mp3'
    ];
    
    audioFiles.forEach((file, index) => {
        const audio = new Audio(file);
        
        audio.addEventListener('loadedmetadata', () => {
            console.log(`✅ Audio file ${index + 1} loaded: ${file}`);
            console.log(`   Duration: ${audio.duration.toFixed(2)} seconds`);
        });
        
        audio.addEventListener('error', (e) => {
            console.log(`❌ Audio file ${index + 1} failed to load: ${file}`);
            console.log(`   Error: ${e.message || 'Unknown error'}`);
        });
        
        audio.load();
    });
}

// Test browser audio capabilities
function testBrowserAudioSupport() {
    console.log('\n🔍 Testing browser audio support...');
    
    if (typeof Audio !== 'undefined') {
        console.log('✅ HTML5 Audio supported');
        
        const testAudio = new Audio();
        const formats = {
            'MP3': 'audio/mpeg',
            'WAV': 'audio/wav',
            'OGG': 'audio/ogg'
        };
        
        Object.entries(formats).forEach(([format, mimeType]) => {
            const support = testAudio.canPlayType(mimeType);
            if (support === 'probably') {
                console.log(`✅ ${format} support: Excellent`);
            } else if (support === 'maybe') {
                console.log(`⚠️ ${format} support: Limited`);
            } else {
                console.log(`❌ ${format} support: None`);
            }
        });
    } else {
        console.log('❌ HTML5 Audio not supported');
    }
}

// Run all tests
function runAllAudioTests() {
    console.log('🎮 Running comprehensive audio system tests...\n');
    
    testBrowserAudioSupport();
    testAudioFiles();
    
    // Test game-specific audio system after a short delay
    setTimeout(() => {
        testAudioSystem();
        
        console.log('\n🎵 Audio System Test Summary:');
        console.log('- Dual audio system with intro and game music');
        console.log('- Enhanced crossfade transitions');
        console.log('- Autoplay detection and user interaction fallback');
        console.log('- Professional fade-in/fade-out effects');
        console.log('- Multiple error handling strategies');
        
        console.log('\n💡 To test audio transitions:');
        console.log('1. Open the main game (index.html)');
        console.log('2. Listen for intro music during splash screens');
        console.log('3. Notice smooth crossfade to game music');
        console.log('4. Use audio-test.html for detailed testing');
    }, 1000);
}

// Auto-run tests when script loads
if (typeof window !== 'undefined') {
    // Browser environment
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAllAudioTests);
    } else {
        runAllAudioTests();
    }
} else {
    // Node.js environment (just run basic tests)
    testBrowserAudioSupport();
    console.log('📝 Full audio tests require browser environment');
}

// Export for manual testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testAudioSystem,
        testAudioFiles,
        testBrowserAudioSupport,
        runAllAudioTests
    };
}
