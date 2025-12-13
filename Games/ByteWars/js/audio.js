// Audio Manager for NeuroCore: Byte Wars
// Handles all audio functionality including intro music, game music, and smooth transitions

class AudioManager {
    constructor() {
        // Initialize intro audio
        this.introAudio = new Audio('assets/Music/Loading Intro.mp3');
        this.introAudio.volume = 0.8;
        this.introAudio.loop = false; // Don't loop intro music
        this.introAudio.preload = 'auto';
        
        // Initialize in-game background music
        this.gameAudio = new Audio('assets/Music/futuristic-action-cinematic-electronic-loop-291807.mp3');
        this.gameAudio.volume = 0.6; // Slightly lower volume for background music
        this.gameAudio.loop = true; // Loop the background music
        this.gameAudio.preload = 'auto';
        
        // Audio state tracking
        this.audioEnabled = false;
        this.currentTrack = null; // 'intro', 'game', or null
        this.isTransitioning = false;
        
        }

    // Test autoplay capability and show prompt if needed
    async testAutoplayAndPrompt() {
        try {
            await this.introAudio.play();
            this.audioEnabled = true;
            this.currentTrack = 'intro';
            return { success: true, requiresPrompt: false };
        } catch (error) {
            return { success: false, requiresPrompt: true };
        }
    }

    // Enable audio after user interaction
    async enableAudioAfterInteraction() {
        try {
            await this.introAudio.play();
            this.audioEnabled = true;
            this.currentTrack = 'intro';
            return true;
        } catch (error) {
            return false;
        }
    }

    // Continue without audio
    disableAudio() {
        this.audioEnabled = false;
        this.currentTrack = null;
    }

    // Fade out intro music
    async fadeOutIntroMusic() {
        if (!this.introAudio || this.introAudio.paused) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const fadeOutInterval = setInterval(() => {
                if (this.introAudio.volume > 0.01) {
                    this.introAudio.volume = Math.max(0, this.introAudio.volume - 0.05);
                } else {
                    // Fade-out complete
                    this.introAudio.pause();
                    this.introAudio.currentTime = 0;
                    this.introAudio.volume = 0.8; // Reset volume for next time
                    clearInterval(fadeOutInterval);
                    this.currentTrack = null;
                    resolve();
                }
            }, 50);
        });
    }

    // Start game music with fade-in
    async startGameMusicWithFadeIn() {
        if (!this.audioEnabled) {
            return Promise.resolve();
        }
        
        // Start game music at volume 0 and fade in
        this.gameAudio.volume = 0;
        
        try {
            await this.gameAudio.play();
            this.currentTrack = 'game';
            
            return new Promise((resolve) => {
                const fadeInInterval = setInterval(() => {
                    if (this.gameAudio.volume < 0.59) { // Target volume is 0.6
                        this.gameAudio.volume = Math.min(0.6, this.gameAudio.volume + 0.03);
                    } else {
                        // Fade-in complete
                        this.gameAudio.volume = 0.6; // Ensure exact target volume
                        clearInterval(fadeInInterval);
                        resolve();
                    }
                }, 50);
            });
        } catch (error) {
            throw error;
        }
    }

    // Enhanced crossfade method for smooth transitions
    async crossfadeAudio() {
        if (!this.audioEnabled) {
            return Promise.resolve();
        }

        if (!this.introAudio || this.introAudio.paused) {
            return this.startGameMusicWithFadeIn();
        }

        this.isTransitioning = true;

        // Start game audio at volume 0 (silent) and begin playing
        this.gameAudio.volume = 0;
        
        try {
            await this.gameAudio.play();
            return new Promise((resolve) => {
                const crossfadeInterval = setInterval(() => {
                    let introComplete = false;
                    let gameComplete = false;

                    // Fade out intro music
                    if (this.introAudio.volume > 0.01) {
                        this.introAudio.volume = Math.max(0, this.introAudio.volume - 0.025);
                    } else {
                        // Intro music fully faded out
                        if (!introComplete) {
                            this.introAudio.pause();
                            this.introAudio.currentTime = 0;
                            this.introAudio.volume = 0.8; // Reset volume for next time
                            introComplete = true;
                        }
                    }
                    
                    // Fade in game music
                    if (this.gameAudio.volume < 0.59) { // Target volume is 0.6
                        this.gameAudio.volume = Math.min(0.6, this.gameAudio.volume + 0.015);
                    } else {
                        // Game music fully faded in
                        if (!gameComplete) {
                            this.gameAudio.volume = 0.6; // Ensure exact target volume
                            gameComplete = true;
                        }
                    }

                    // Both transitions complete
                    if (introComplete && gameComplete) {
                        clearInterval(crossfadeInterval);
                        this.currentTrack = 'game';
                        this.isTransitioning = false;
                        resolve();
                    }
                }, 40); // Slightly faster interval for smoother transition
            });
        } catch (error) {
            this.isTransitioning = false;
            // Fallback: just fade out intro music
            return this.fadeOutIntroMusic();
        }
    }

    // Stop all audio
    stopAllAudio() {
        if (this.introAudio) {
            this.introAudio.pause();
            this.introAudio.currentTime = 0;
        }
        
        if (this.gameAudio) {
            this.gameAudio.pause();
            this.gameAudio.currentTime = 0;
        }
        
        this.currentTrack = null;
        this.isTransitioning = false;
    }

    // Reset audio to initial state
    reset() {
        this.stopAllAudio();
        
        // Reset volumes to defaults
        if (this.introAudio) {
            this.introAudio.volume = 0.8;
        }
        
        if (this.gameAudio) {
            this.gameAudio.volume = 0.6;
        }
        
        this.currentTrack = null;
        this.isTransitioning = false;
        // Note: Don't reset audioEnabled as user preference should persist
    }

    // Pause current audio
    pauseCurrentAudio() {
        if (this.currentTrack === 'intro' && !this.introAudio.paused) {
            this.introAudio.pause();
            } else if (this.currentTrack === 'game' && !this.gameAudio.paused) {
            this.gameAudio.pause();
            }
    }

    // Resume current audio
    resumeCurrentAudio() {
        if (this.currentTrack === 'intro' && this.introAudio.paused) {
            this.introAudio.play().catch(error => {
                });
            } else if (this.currentTrack === 'game' && this.gameAudio.paused) {
            this.gameAudio.play().catch(error => {
                });
            }
    }

    // Get current audio status
    getAudioStatus() {
        return {
            enabled: this.audioEnabled,
            currentTrack: this.currentTrack,
            isTransitioning: this.isTransitioning,
            introPlaying: this.introAudio && !this.introAudio.paused,
            gamePlaying: this.gameAudio && !this.gameAudio.paused,
            introVolume: this.introAudio ? this.introAudio.volume : 0,
            gameVolume: this.gameAudio ? this.gameAudio.volume : 0
        };
    }

    // Set volume for specific track
    setVolume(track, volume) {
        volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        
        if (track === 'intro' && this.introAudio) {
            this.introAudio.volume = volume;
            }%`);
        } else if (track === 'game' && this.gameAudio) {
            this.gameAudio.volume = volume;
            }%`);
        }
    }

    // Master volume control
    setMasterVolume(volume) {
        volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        
        const introBaseVolume = 0.8;
        const gameBaseVolume = 0.6;
        
        this.setVolume('intro', introBaseVolume * volume);
        this.setVolume('game', gameBaseVolume * volume);
        
        }%`);
    }
}
