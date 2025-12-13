// Audio System Test for NeuroCore: Byte Wars
// This script tests the enhanced dual audio system and crossfade functionality

);

// Test the game object and audio system
function testAudioSystem() {
    // Check if game object exists
    if (typeof window !== 'undefined' && window.game) {
        const game = window.game;
        // Test audio objects
        if (game.introAudio && game.gameAudio) {
            } else {
            return false;
        }
        
        // Test audio methods
        const audioMethods = ['crossfadeAudio', 'fadeOutIntroMusic', 'startGameMusicWithFadeIn'];
        audioMethods.forEach(method => {
            if (typeof game[method] === 'function') {
                } else {
                }
        });
        
        return true;
    } else {
        return false;
    }
}

// Test audio file accessibility
function testAudioFiles() {
    const audioFiles = [        'assets/Music/Loading Intro.mp3',
        'assets/Music/futuristic-action-cinematic-electronic-loop-291807.mp3'
    ];
    
    audioFiles.forEach((file, index) => {
        const audio = new Audio(file);
        
        audio.addEventListener('loadedmetadata', () => {
            } seconds`);
        });
        
        audio.addEventListener('error', (e) => {
            });
        
        audio.load();
    });
}

// Test browser audio capabilities
function testBrowserAudioSupport() {
    if (typeof Audio !== 'undefined') {
        const testAudio = new Audio();
        const formats = {
            'MP3': 'audio/mpeg',
            'WAV': 'audio/wav',
            'OGG': 'audio/ogg'
        };
        
        Object.entries(formats).forEach(([format, mimeType]) => {
            const support = testAudio.canPlayType(mimeType);
            if (support === 'probably') {
                } else if (support === 'maybe') {
                } else {
                }
        });
    } else {
        }
}

// Run all tests
function runAllAudioTests() {
    testBrowserAudioSupport();
    testAudioFiles();
    
    // Test game-specific audio system after a short delay
    setTimeout(() => {
        testAudioSystem();
        
        ');
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
