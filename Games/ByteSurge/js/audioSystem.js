// ByteSurge: Infinite Loop - Audio System
// Background music and sound effects management

// ===== AUDIO SYSTEM =====
let audioSystem = {
    bgMusic: null,
    musicLoaded: false,
    isPlaying: false,
    
    // Initialize audio system
    init() {
        console.log('🎵 Initializing audio system...');
        
        // Create background music audio element
        this.bgMusic = new Audio();
        this.bgMusic.src = 'assets/Music/jiglr-cyberpunk.mp3';
        this.bgMusic.loop = true;
        this.bgMusic.preload = 'auto';
        
        // Set up event listeners
        this.bgMusic.addEventListener('canplaythrough', () => {
            this.musicLoaded = true;
            console.log('🎵 Background music loaded successfully');
            this.updateVolume();
        });
        
        this.bgMusic.addEventListener('error', (e) => {
            console.warn('❌ Failed to load background music:', e);
            this.musicLoaded = false;
        });
        
        this.bgMusic.addEventListener('ended', () => {
            // This shouldn't happen with loop=true, but just in case
            if (this.isPlaying) {
                this.bgMusic.play().catch(e => console.warn('Music restart failed:', e));
            }
        });
        
        // Apply current settings
        this.updateVolume();
    },
      // Update volume based on settings
    updateVolume() {
        if (!this.bgMusic) return;
        
        const masterVol = window.settingsSystem?.getSetting('masterVolume') ?? 70;
        const musicVol = window.settingsSystem?.getSetting('musicVolume') ?? 50;
        const muteAll = window.settingsSystem?.getSetting('muteAll') ?? false;
        
        if (muteAll) {
            this.bgMusic.volume = 0;
        } else {
            // Convert 0-100 scale to 0-1 scale for HTML5 Audio API
            const masterVolNormalized = masterVol / 100;
            const musicVolNormalized = musicVol / 100;
            this.bgMusic.volume = masterVolNormalized * musicVolNormalized;
        }
        
        console.log(`🎵 Volume updated: Master=${masterVol}%, Music=${musicVol}%, Mute=${muteAll}, Final=${this.bgMusic.volume}`);
    },
    
    // Start playing background music
    playMusic() {
        if (!this.bgMusic || !this.musicLoaded) {
            console.warn('🎵 Cannot play music - not loaded yet');
            return;
        }
        
        if (this.isPlaying) {
            console.log('🎵 Music already playing');
            return;
        }
        
        // Update volume before playing
        this.updateVolume();
        
        // Attempt to play
        const playPromise = this.bgMusic.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                console.log('🎵 Background music started playing');
            }).catch(error => {
                console.warn('🎵 Auto-play prevented by browser:', error);
                // This is normal - browsers prevent auto-play until user interaction
            });
        }
    },
    
    // Stop playing background music
    stopMusic() {
        if (!this.bgMusic || !this.isPlaying) return;
        
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
        this.isPlaying = false;
        console.log('🎵 Background music stopped');
    },
    
    // Pause/resume music
    pauseMusic() {
        if (!this.bgMusic) return;
        
        if (this.isPlaying) {
            this.bgMusic.pause();
            this.isPlaying = false;
            console.log('🎵 Background music paused');
        }
    },
    
    resumeMusic() {
        if (!this.bgMusic || this.isPlaying) return;
        
        this.updateVolume();
        const playPromise = this.bgMusic.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                console.log('🎵 Background music resumed');
            }).catch(error => {
                console.warn('🎵 Failed to resume music:', error);
            });
        }
    },
    
    // Handle user interaction (required for auto-play)
    handleUserInteraction() {
        if (!this.isPlaying && this.musicLoaded) {
            this.playMusic();
        }
    },
    
    // Get current music state
    getState() {
        return {
            loaded: this.musicLoaded,
            playing: this.isPlaying,
            volume: this.bgMusic?.volume ?? 0
        };
    }
};

// ===== GLOBAL FUNCTIONS =====
function initializeAudio() {
    audioSystem.init();
}

function updateAudioSettings() {
    audioSystem.updateVolume();
}

function startBackgroundMusic() {
    audioSystem.playMusic();
}

function stopBackgroundMusic() {
    audioSystem.stopMusic();
}

function pauseBackgroundMusic() {
    audioSystem.pauseMusic();
}

function resumeBackgroundMusic() {
    audioSystem.resumeMusic();
}

// Export for global access
window.audioSystem = audioSystem;
window.initializeAudio = initializeAudio;
window.updateAudioSettings = updateAudioSettings;
window.startBackgroundMusic = startBackgroundMusic;
window.stopBackgroundMusic = stopBackgroundMusic;
window.pauseBackgroundMusic = pauseBackgroundMusic;
window.resumeBackgroundMusic = resumeBackgroundMusic;

console.log('🎵 Audio system module loaded');
