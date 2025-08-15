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
        
        console.log('🎵 AudioManager initialized');
        console.log('📁 Intro Audio: ' + this.introAudio.src);
        console.log('📁 Game Audio: ' + this.gameAudio.src);
    }

    // Test autoplay capability and show prompt if needed
    async testAutoplayAndPrompt() {
        console.log('🎵 Testing audio autoplay capability...');
        
        try {
            await this.introAudio.play();
            console.log('✅ Audio autoplay successful');
            this.audioEnabled = true;
            this.currentTrack = 'intro';
            return { success: true, requiresPrompt: false };
        } catch (error) {
            console.log('🔇 Audio autoplay blocked:', error);
            return { success: false, requiresPrompt: true };
        }
    }

    // Enable audio after user interaction
    async enableAudioAfterInteraction() {
        console.log('🎵 Enabling audio after user interaction...');
        
        try {
            await this.introAudio.play();
            console.log('✅ Intro audio started after user interaction');
            this.audioEnabled = true;
            this.currentTrack = 'intro';
            return true;
        } catch (error) {
            console.log('❌ Intro audio still failed after user interaction:', error);
            return false;
        }
    }

    // Continue without audio
    disableAudio() {
        console.log('🔇 Audio disabled by user choice');
        this.audioEnabled = false;
        this.currentTrack = null;
    }

    // Fade out intro music
    async fadeOutIntroMusic() {
        console.log('🔇 Starting intro music fade-out...');
        
        if (!this.introAudio || this.introAudio.paused) {
            console.log('🔇 Intro music not playing, no fade-out needed');
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
                    console.log('🔇 Intro music fade-out complete');
                    resolve();
                }
            }, 50);
        });
    }

    // Start game music with fade-in
    async startGameMusicWithFadeIn() {
        console.log('🎵 Starting game music with fade-in...');
        
        if (!this.audioEnabled) {
            console.log('🔇 Audio disabled, skipping game music');
            return Promise.resolve();
        }
        
        // Start game music at volume 0 and fade in
        this.gameAudio.volume = 0;
        
        try {
            await this.gameAudio.play();
            console.log('🎵 Game music started, beginning fade-in...');
            this.currentTrack = 'game';
            
            return new Promise((resolve) => {
                const fadeInInterval = setInterval(() => {
                    if (this.gameAudio.volume < 0.59) { // Target volume is 0.6
                        this.gameAudio.volume = Math.min(0.6, this.gameAudio.volume + 0.03);
                    } else {
                        // Fade-in complete
                        this.gameAudio.volume = 0.6; // Ensure exact target volume
                        clearInterval(fadeInInterval);
                        console.log('🎵 Game music fade-in complete');
                        resolve();
                    }
                }, 50);
            });
        } catch (error) {
            console.log('🔇 Game music failed to start during fade-in:', error);
            throw error;
        }
    }

    // Enhanced crossfade method for smooth transitions
    async crossfadeAudio() {
        console.log('🎵 Starting enhanced crossfade transition...');
        
        if (!this.audioEnabled) {
            console.log('🔇 Audio disabled, skipping crossfade');
            return Promise.resolve();
        }

        if (!this.introAudio || this.introAudio.paused) {
            console.log('🎵 No intro music playing, starting game music directly');
            return this.startGameMusicWithFadeIn();
        }

        this.isTransitioning = true;

        // Start game audio at volume 0 (silent) and begin playing
        this.gameAudio.volume = 0;
        
        try {
            await this.gameAudio.play();
            console.log('🎵 Game music started silently, beginning enhanced crossfade...');
            
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
                            console.log('🔇 Intro music crossfade complete');
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
                            console.log('🎵 Game music crossfade complete');
                            gameComplete = true;
                        }
                    }

                    // Both transitions complete
                    if (introComplete && gameComplete) {
                        clearInterval(crossfadeInterval);
                        this.currentTrack = 'game';
                        this.isTransitioning = false;
                        console.log('🎵 Enhanced crossfade transition complete');
                        resolve();
                    }
                }, 40); // Slightly faster interval for smoother transition
            });
        } catch (error) {
            console.log('🔇 Game audio failed to start during crossfade:', error);
            this.isTransitioning = false;
            // Fallback: just fade out intro music
            return this.fadeOutIntroMusic();
        }
    }

    // Stop all audio
    stopAllAudio() {
        console.log('🔇 Stopping all audio...');
        
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
        console.log('🔄 Resetting audio manager...');
        
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
            console.log('⏸️ Paused intro audio');
        } else if (this.currentTrack === 'game' && !this.gameAudio.paused) {
            this.gameAudio.pause();
            console.log('⏸️ Paused game audio');
        }
    }

    // Resume current audio
    resumeCurrentAudio() {
        if (this.currentTrack === 'intro' && this.introAudio.paused) {
            this.introAudio.play().catch(error => {
                console.log('❌ Failed to resume intro audio:', error);
            });
            console.log('▶️ Resumed intro audio');
        } else if (this.currentTrack === 'game' && this.gameAudio.paused) {
            this.gameAudio.play().catch(error => {
                console.log('❌ Failed to resume game audio:', error);
            });
            console.log('▶️ Resumed game audio');
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
            console.log(`🔊 Intro volume set to ${Math.round(volume * 100)}%`);
        } else if (track === 'game' && this.gameAudio) {
            this.gameAudio.volume = volume;
            console.log(`🔊 Game volume set to ${Math.round(volume * 100)}%`);
        }
    }

    // Master volume control
    setMasterVolume(volume) {
        volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        
        const introBaseVolume = 0.8;
        const gameBaseVolume = 0.6;
        
        this.setVolume('intro', introBaseVolume * volume);
        this.setVolume('game', gameBaseVolume * volume);
        
        console.log(`🔊 Master volume set to ${Math.round(volume * 100)}%`);
    }
}
