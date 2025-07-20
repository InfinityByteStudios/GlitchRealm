export class AudioSystem {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.currentMusic = null;
        this.isMuted = false;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.5;
        this.musicMode = 'chill'; // 'chill' or 'intense'
        this.fadeTimeout = null;
        
        // Focus-based muting settings
        this.muteWhenUnfocused = true; // Setting for auto-muting when window loses focus
        this.wasMutedByFocus = false; // Track if currently muted due to focus loss
        
        // Audio context state
        this.audioInitialized = false;
        this.userInteracted = false;
        
        // Load settings from localStorage
        this.loadSettings();
        
        // Initialize audio context for better compatibility
        this.audioContext = null;
        this.initAudioContext();
        
        // Setup user interaction listeners to enable audio
        this.setupUserInteractionListeners();
        
        // Preload all audio assets
        this.preloadAudio();
    }

    /**
     * Load audio settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('coderunner_audio_settings');
            console.log('🎵 Loading audio settings:', saved);
            
            if (saved) {
                const settings = JSON.parse(saved);
                console.log('🎵 Parsed audio settings:', settings);
                
                // Load volume settings
                if (settings.masterVolume !== undefined) {
                    this.masterVolume = Math.max(0, Math.min(1, settings.masterVolume));
                }
                if (settings.sfxVolume !== undefined) {
                    this.sfxVolume = Math.max(0, Math.min(1, settings.sfxVolume));
                }
                if (settings.musicVolume !== undefined) {
                    this.musicVolume = Math.max(0, Math.min(1, settings.musicVolume));
                }
                
                // NEVER load muted state from localStorage - always start unmuted
                // if (settings.isMuted !== undefined) {
                //     this.isMuted = settings.isMuted;
                // }
                
                if (settings.musicMode !== undefined) {
                    this.musicMode = settings.musicMode;
                }
                if (settings.selectedTrack !== undefined) {
                    this.selectedTrack = settings.selectedTrack;
                }
                
                // Force unmuted state
                this.isMuted = false;
                console.log('🎵 Audio settings loaded - forced unmuted state:', {
                    masterVolume: this.masterVolume,
                    sfxVolume: this.sfxVolume,
                    musicVolume: this.musicVolume,
                    isMuted: this.isMuted
                });
            } else {
                console.log('🎵 No saved audio settings found, using defaults');
                this.isMuted = false; // Ensure default is unmuted
            }
        } catch (error) {
            console.warn('🎵 Failed to load audio settings:', error);
            // Use default values if loading fails - ensure unmuted
            this.isMuted = false;
        }
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🎵 Audio context created successfully');
        } catch (e) {
            console.warn('🎵 Could not create audio context:', e);
        }
    }

    /**
     * Setup user interaction listeners to enable audio
     */
    setupUserInteractionListeners() {
        const enableAudio = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                console.log('🎵 User interaction detected, enabling audio');
                console.log('🎵 Current audio state:', {
                    isMuted: this.isMuted,
                    audioInitialized: this.audioInitialized,
                    musicMode: this.musicMode,
                    hasMusicTrack: !!this.music[this.musicMode]
                });
                
                // Resume audio context if suspended
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        console.log('🎵 Audio context resumed');
                        this.audioInitialized = true;
                        // Start music if not muted
                        if (!this.isMuted && this.music[this.musicMode]) {
                            console.log('🎵 Starting music after audio context resume');
                            this.playMusic(this.musicMode);
                        }
                    }).catch(e => console.warn('🎵 Failed to resume audio context:', e));
                } else {
                    this.audioInitialized = true;
                    // Start music if not muted
                    if (!this.isMuted && this.music[this.musicMode]) {
                        console.log('🎵 Starting music after user interaction');
                        this.playMusic(this.musicMode);
                    } else {
                        console.log('🎵 Music not started:', {
                            muted: this.isMuted,
                            hasMusic: !!this.music[this.musicMode]
                        });
                    }
                }
                
                // Remove listeners after first interaction
                document.removeEventListener('click', enableAudio);
                document.removeEventListener('keydown', enableAudio);
                document.removeEventListener('touchstart', enableAudio);
                document.removeEventListener('mousedown', enableAudio);
            }
        };
        
        // Add multiple event listeners to catch first user interaction
        document.addEventListener('click', enableAudio, { once: true });
        document.addEventListener('keydown', enableAudio, { once: true });
        document.addEventListener('touchstart', enableAudio, { once: true });
        document.addEventListener('mousedown', enableAudio, { once: true });
    }
      preloadAudio() {
        // Sound effects
        const soundEffects = {
            jump: this.createSynthSound('jump'),
            doubleJump: this.createSynthSound('doubleJump'),
            death: this.createSynthSound('death'),
            collect: this.createSynthSound('collect'),
            menuClick: this.createSynthSound('menuClick'),
            menuOpen: this.createSynthSound('menuOpen'),
            menuClose: this.createSynthSound('menuClose'),
            purchase: this.createSynthSound('purchase'),
            damage: this.createSynthSound('damage'),
            powerup: this.createSynthSound('powerup')
        };
          // Load sound effects
        Object.entries(soundEffects).forEach(([name, audioData]) => {
            this.sounds[name] = this.createAudioElement(audioData.dataUrl);
        });
        
        // Available music tracks
        this.availableTracks = [
            { 
                name: 'Arcade Classic', 
                filename: 'that-game-arcade-short-236108.mp3',
                description: 'Classic arcade vibes' 
            },
            { 
                name: 'Chill Synthwave', 
                filename: 'chill-synthwave-background-track-341854.mp3',
                description: 'Relaxing synthwave beats' 
            },
            { 
                name: 'Chipmusic Dancer', 
                filename: 'chipmusic-box-dancer-lofi-retro-retrowave-chiptune-synth-dance-157475.mp3',
                description: 'Energetic chiptune dance' 
            },
            { 
                name: 'Distant Echoes', 
                filename: 'distant-echoes-5339.mp3',
                description: 'Atmospheric ambient' 
            },
            { 
                name: 'Futuristic Action', 
                filename: 'futuristic-action-cinematic-electronic-loop-291807.mp3',
                description: 'High-energy cinematic' 
            },
            { 
                name: 'Lounge Retro Wave', 
                filename: 'lounge-retro-wave-186444.mp3',
                description: 'Smooth retro lounge' 
            },
            { 
                name: 'Nostalgic Synth Pop', 
                filename: 'nostalgic-motivating-retro-synth-wave-pop-250555.mp3',
                description: 'Motivating retro pop' 
            }        ];
        
        // Set default track, then check if we have a saved preference
        this.selectedTrack = this.availableTracks[0].filename;
        
        // Load saved track preference if available
        try {
            const saved = localStorage.getItem('coderunner_audio_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.selectedTrack) {
                    // Verify the saved track exists in available tracks
                    const trackExists = this.availableTracks.some(track => track.filename === settings.selectedTrack);
                    if (trackExists) {
                        this.selectedTrack = settings.selectedTrack;
                    }
                }
            }
        } catch (e) {
           
        }
        
        // Load the selected music track
        this.loadMusicTrack(this.selectedTrack);
        
        // Set initial volumes
        this.updateAllVolumes();
    }
    
    loadMusicTrack(filename) {
        const musicPath = `Music/${filename}`;
        const backgroundMusic = this.createAudioElement(musicPath, true);
        
        // Use the same track for both music modes
        this.music.chill = backgroundMusic;
        this.music.intense = backgroundMusic;
        
        // Update selected track
        this.selectedTrack = filename;
        this.saveSettings();
    }
    
    switchTrack(filename) {
        if (this.selectedTrack === filename) return;
        
        const wasPlaying = this.currentMusic && !this.currentMusic.paused;
        const currentTime = this.currentMusic ? this.currentMusic.currentTime : 0;
        
        // Stop current music
        this.stopMusic();
        
        // Load new track
        this.loadMusicTrack(filename);
        
        // Resume playing if music was playing before
        if (wasPlaying && !this.isMuted) {
            setTimeout(() => {
                this.playMusic(this.musicMode);
                // Don't try to restore time as it's a different track
            }, 100);
        }
    }
    
    getAvailableTracks() {
        return this.availableTracks;
    }
    
    getCurrentTrack() {
        return this.selectedTrack;
    }
    
    createSynthSound(type) {
        if (!this.audioContext) {
            return { dataUrl: '' };
        }
        
        const sampleRate = 44100;
        let duration, frequency, waveType, envelope;
        
        switch (type) {
            case 'jump':
                duration = 0.2;
                frequency = 440;
                waveType = 'sine';
                envelope = { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 };
                break;
            case 'doubleJump':
                duration = 0.25;
                frequency = 660;
                waveType = 'sine';
                envelope = { attack: 0.01, decay: 0.05, sustain: 0.4, release: 0.2 };
                break;
            case 'death':
                duration = 0.8;
                frequency = 220;
                waveType = 'sawtooth';
                envelope = { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 };
                break;
            case 'collect':
                duration = 0.3;
                frequency = 800;
                waveType = 'sine';
                envelope = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 };
                break;
            case 'menuClick':
                duration = 0.1;
                frequency = 600;
                waveType = 'square';
                envelope = { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.05 };
                break;
            case 'menuOpen':
                duration = 0.3;
                frequency = 523;
                waveType = 'sine';
                envelope = { attack: 0.05, decay: 0.1, sustain: 0.4, release: 0.15 };
                break;
            case 'menuClose':
                duration = 0.25;
                frequency = 392;
                waveType = 'sine';
                envelope = { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.14 };
                break;
            case 'purchase':
                duration = 0.5;
                frequency = 880;
                waveType = 'sine';
                envelope = { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3 };
                break;
            case 'damage':
                duration = 0.4;
                frequency = 150;
                waveType = 'sawtooth';
                envelope = { attack: 0.01, decay: 0.15, sustain: 0.4, release: 0.25 };
                break;
            case 'powerup':
                duration = 0.6;
                frequency = 1047;
                waveType = 'sine';
                envelope = { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 };
                break;
            default:
                duration = 0.2;
                frequency = 440;
                waveType = 'sine';
                envelope = { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 };
        }
        
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const progress = t / duration;
            
            // Generate wave
            let sample = 0;
            switch (waveType) {
                case 'sine':
                    sample = Math.sin(2 * Math.PI * frequency * t);
                    break;
                case 'square':
                    sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
                    break;
                case 'sawtooth':
                    sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
                    break;
                case 'triangle':
                    sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
                    break;
            }
            
            // Apply envelope
            let amplitude = 0;
            const attackTime = envelope.attack * duration;
            const decayTime = envelope.decay * duration;
            const releaseTime = envelope.release * duration;
            const sustainTime = duration - attackTime - decayTime - releaseTime;
            
            if (t < attackTime) {
                amplitude = t / attackTime;
            } else if (t < attackTime + decayTime) {
                amplitude = 1 - (1 - envelope.sustain) * (t - attackTime) / decayTime;
            } else if (t < attackTime + decayTime + sustainTime) {
                amplitude = envelope.sustain;
            } else {
                amplitude = envelope.sustain * (1 - (t - attackTime - decayTime - sustainTime) / releaseTime);
            }
            
            data[i] = sample * amplitude * 0.3; // Overall volume adjustment
        }
        
        // Convert buffer to data URL
        const wav = this.bufferToWav(buffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        const dataUrl = URL.createObjectURL(blob);
        
        return { dataUrl };
    }
    
    bufferToWav(buffer) {
        const length = buffer.length;
        const arrayBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Convert samples
        const data = buffer.getChannelData(0);
        let offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }
        
        return arrayBuffer;
    }
      // Note: Removed createBackgroundMusic method as we now use MP3 file instead of procedurally generated music
    
    createAudioElement(src, loop = false) {
        const audio = new Audio();
        audio.loop = loop;
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        
        // Add error handling
        audio.addEventListener('error', (e) => {
            console.warn(`🎵 Failed to load audio: ${src}`, e);
        });
        
        audio.addEventListener('canplaythrough', () => {
            console.log(`🎵 Audio loaded successfully: ${src}`);
        });
        
        // Set source after event listeners
        audio.src = src;
        
        return audio;
    }
      playSound(soundName, volumeOverride = null) {
        if (this.isMuted || !this.sounds[soundName]) {
            console.log(`🎵 Sound not played: ${soundName} (muted: ${this.isMuted}, exists: ${!!this.sounds[soundName]})`);
            return;
        }
        
        const sound = this.sounds[soundName];
        sound.currentTime = 0;
        sound.volume = this.isMuted ? 0 : ((volumeOverride || this.sfxVolume) * this.masterVolume);
        
        console.log(`🎵 Playing sound: ${soundName} at volume ${sound.volume}`);
        
        const playPromise = sound.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log(`🎵 Sound played successfully: ${soundName}`);
            }).catch(error => {
                console.warn(`🎵 Failed to play sound ${soundName}:`, error);
                
                // If this is the first attempt and user hasn't interacted, try again after interaction
                if (!this.userInteracted) {
                    const retrySound = () => {
                        console.log(`🎵 Retrying sound after user interaction: ${soundName}`);
                        sound.play().catch(e => console.warn(`🎵 Retry failed for ${soundName}:`, e));
                    };
                    document.addEventListener('click', retrySound, { once: true });
                }
            });
        }
    }      playMusic(mode = 'chill') {
        if (this.isMuted || !this.music[mode]) {
            console.log(`🎵 Music not played: mode=${mode} (muted: ${this.isMuted}, exists: ${!!this.music[mode]})`);
            return;
        }
        
        console.log(`🎵 Attempting to play music: ${mode}`);
        
        // Stop current music
        this.stopMusic();
        
        this.musicMode = mode;
        this.currentMusic = this.music[mode];
        this.currentMusic.volume = this.isMuted ? 0 : (this.musicVolume * this.masterVolume);
        
        // Set playback rate based on music mode (faster for intense mode)
        this.currentMusic.playbackRate = mode === 'intense' ? 1.1 : 1.0;
        
        console.log(`🎵 Playing music at volume: ${this.currentMusic.volume}`);
        
        const playPromise = this.currentMusic.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log(`🎵 Music started successfully: ${mode}`);
            }).catch(error => {
                console.warn(`🎵 Failed to play music ${mode}:`, error);
                
                // If autoplay fails (common in browsers), try again after user interaction
                if (!this.userInteracted) {
                    console.log('🎵 Music autoplay blocked, will retry after user interaction');
                    const resumeAudio = () => {
                        console.log('🎵 Retrying music after user interaction');
                        this.currentMusic.play().then(() => {
                            console.log('🎵 Music resumed successfully after user interaction');
                        }).catch(e => console.warn('🎵 Music retry failed:', e));
                    };
                    
                    document.addEventListener('click', resumeAudio, { once: true });
                    document.addEventListener('keydown', resumeAudio, { once: true });
                }
            });
        }
    }
    
    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }
      switchMusicMode(newMode) {
        if (newMode === this.musicMode || !this.music[newMode]) return;
        
        const fadeOutDuration = 1000; // 1 second
        const fadeInDuration = 1000;
        
        // Save the current position to continue from the same point
        const currentTime = this.currentMusic ? this.currentMusic.currentTime : 0;
        
        if (this.currentMusic) {
            this.fadeOut(this.currentMusic, fadeOutDuration, () => {
                this.playMusic(newMode);
                
                // Set the playback rate based on music mode
                if (this.currentMusic) {
                    this.currentMusic.playbackRate = newMode === 'intense' ? 1.1 : 1.0;
                    
                    // Try to continue from the same position if possible
                    if (currentTime > 0) {
                        this.currentMusic.currentTime = currentTime;
                    }
                }
                
                this.fadeIn(this.currentMusic, fadeInDuration);
            });
        } else {
            this.playMusic(newMode);
            
            // Set the playback rate based on music mode
            if (this.currentMusic) {
                this.currentMusic.playbackRate = newMode === 'intense' ? 1.1 : 1.0;
            }
        }
    }
    
    fadeOut(audio, duration, callback) {
        const startVolume = audio.volume;
        const fadeStep = startVolume / (duration / 50);
        
        const fade = setInterval(() => {
            if (audio.volume > fadeStep) {
                audio.volume -= fadeStep;
            } else {
                audio.volume = 0;
                audio.pause();
                clearInterval(fade);
                if (callback) callback();
            }
        }, 50);
    }
    
    fadeIn(audio, duration) {
        const targetVolume = this.musicVolume * this.masterVolume;
        const fadeStep = targetVolume / (duration / 50);
        audio.volume = 0;
        
        const fade = setInterval(() => {
            if (audio.volume < targetVolume - fadeStep) {
                audio.volume += fadeStep;
            } else {
                audio.volume = targetVolume;
                clearInterval(fade);
            }
        }, 50);
    }
      setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        this.saveSettings();
    }
    
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        this.saveSettings();
    }
      setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        this.saveSettings();
        console.log(`🎵 Music volume set to: ${this.musicVolume}`);
    }
    
    /**
     * Set UI sound volume (same as SFX volume for now)
     */
    setUiSoundVolume(volume) {
        this.setSfxVolume(volume);
        console.log(`🎵 UI sound volume set to: ${volume}`);
    }
    
    /**
     * Set crossfade duration
     */
    setCrossfadeDuration(duration) {
        this.crossfadeDuration = Math.max(0.5, Math.min(3, duration));
        console.log(`🎵 Crossfade duration set to: ${this.crossfadeDuration}s`);
    }
      updateAllVolumes() {
        // Update SFX volumes
        Object.values(this.sounds).forEach(sound => {
            if (sound.volume !== undefined) {
                sound.volume = this.isMuted ? 0 : (this.sfxVolume * this.masterVolume);
            }
        });
        
        // Update music volume
        if (this.currentMusic) {
            this.currentMusic.volume = this.isMuted ? 0 : (this.musicVolume * this.masterVolume);
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        // Update all volumes immediately to reflect mute state
        this.updateAllVolumes();
        
        if (this.isMuted) {
            // If muting, stop music but keep its reference for unmuting
            if (this.currentMusic) {
                this.currentMusic.pause();
            }
        } else {
            // If unmuting, resume music if it was playing
            if (this.currentMusic) {
                this.currentMusic.play().catch(e => {
                    // If play fails, try to start fresh music
                    this.playMusic(this.musicMode);
                });
            } else {
                // Start music if no music was playing
                this.playMusic(this.musicMode);
            }
        }
          this.saveSettings();
        return this.isMuted;
    }

    /**
     * Set the mute state directly
     * @param {boolean} muted - Whether audio should be muted
     */
    setMuted(muted) {
        if (this.isMuted === muted) return; // No change needed
        
        this.isMuted = muted;
        
        // Update all volumes immediately to reflect mute state
        this.updateAllVolumes();
        
        if (this.isMuted) {
            // If muting, stop music but keep its reference for unmuting
            if (this.currentMusic) {
                this.currentMusic.pause();
            }
        } else {
            // If unmuting, resume music if it was playing
            if (this.currentMusic) {
                this.currentMusic.play().catch(e => {
                    // If play fails, try to start fresh music
                    this.playMusic(this.musicMode);
                });
            } else {
                // Start music if no music was playing
                this.playMusic(this.musicMode);
            }
        }
        
        this.saveSettings();
        return this.isMuted;
    }

    /**
     * Set the music mode directly
     * @param {string} mode - The music mode ('chill' or 'intense')
     */
    setMusicMode(mode) {
        if (this.musicMode === mode) return; // No change needed
        
        this.musicMode = mode;
        
        // Update playback rate for current music
        if (this.currentMusic) {
            this.currentMusic.playbackRate = mode === 'intense' ? 1.1 : 1.0;
        }
        
        this.saveSettings();
    }

    /**
     * Set the selected track directly
     * @param {string} track - The filename of the track to select
     */
    setSelectedTrack(track) {
        const validTrack = this.availableTracks.find(t => t.filename === track);
        if (!validTrack) return; // Invalid track, do nothing
        
        this.selectedTrack = track;
        
        // Load and play the selected track
        this.loadMusicTrack(track);
        this.playMusic(this.musicMode);
        
        this.saveSettings();
    }

    /**
     * Get the list of available tracks for display in the UI
     * @returns {Array} - Array of track objects with name and filename
     */
    getTrackListForUI() {
        return this.availableTracks.map(track => ({
            name: track.name,
            filename: track.filename,
            isSelected: track.filename === this.selectedTrack
        }));
    }

    /**
     * Set the volume levels from a settings object
     * @param {Object} settings - The settings object containing volume levels
     */
    setVolumesFromSettings(settings) {
        if (settings.masterVolume !== undefined) {
            this.setMasterVolume(settings.masterVolume);
        }
        if (settings.sfxVolume !== undefined) {
            this.setSfxVolume(settings.sfxVolume);
        }
        if (settings.musicVolume !== undefined) {
            this.setMusicVolume(settings.musicVolume);
        }
    }

    /**
     * Initialize audio settings to default values
     */
    resetSettings() {
        this.isMuted = false;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.5;
        this.musicMode = 'chill';
        this.selectedTrack = this.availableTracks[0].filename;
        
        this.saveSettings();
        this.updateAllVolumes();
    }

    /**
     * Load settings from a URL query string (for debugging/testing)
     * @param {string} queryString - The query string containing settings
     */
    loadSettingsFromQueryString(queryString) {
        const params = new URLSearchParams(queryString);
        
        if (params.has('muted')) {
            this.setMuted(params.get('muted') === 'true');
        }
        if (params.has('masterVolume')) {
            this.setMasterVolume(parseFloat(params.get('masterVolume')));
        }
        if (params.has('sfxVolume')) {
            this.setSfxVolume(parseFloat(params.get('sfxVolume')));
        }
        if (params.has('musicVolume')) {
            this.setMusicVolume(parseFloat(params.get('musicVolume')));
        }
        if (params.has('musicMode')) {
            this.setMusicMode(params.get('musicMode'));
        }
        if (params.has('selectedTrack')) {
            this.setSelectedTrack(params.get('selectedTrack'));
        }
    }

    /**
     * Debugging function to print the current audio settings
     */
    debugPrintSettings() {
        console.log('🎵 Audio Settings:', {
            isMuted: this.isMuted,
            masterVolume: this.masterVolume,
            sfxVolume: this.sfxVolume,
            musicVolume: this.musicVolume,
            musicMode: this.musicMode,
            selectedTrack: this.selectedTrack
        });
    }

    /**
     * Advanced: Directly set the audio context (for testing)
     * @param {AudioContext} context - The audio context to set
     */
    setAudioContext(context) {
        this.audioContext = context;
    }

    /**
     * Advanced: Get the current audio context (for testing)
     * @returns {AudioContext} - The current audio context
     */
    getAudioContext() {
        return this.audioContext;
    }

    /**
     * Advanced: Bypass audio context and play sound directly (for testing)
     * @param {string} soundName - The name of the sound to play
     */
    testPlaySoundDirectly(soundName) {
        if (this.sounds[soundName]) {
            const sound = this.sounds[soundName];
            sound.currentTime = 0;
            sound.play();
        }
    }

    /**
     * Advanced: Create a new audio buffer source (for testing)
     * @param {Float32Array} data - The audio data to play
     * @param {number} sampleRate - The sample rate of the audio data
     */
    testPlayAudioData(data, sampleRate) {
        if (this.audioContext) {
            const buffer = this.audioContext.createBuffer(1, data.length, sampleRate);
            buffer.copyToChannel(data, 0);
            
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start(0);
        }
    }

    /**
     * Advanced: Set the audio context state (suspended/resumed) for testing
     * @param {boolean} resume - Whether to resume the audio context
     */
    testSetAudioContextState(resume) {
        if (this.audioContext) {
            if (resume) {
                this.audioContext.resume();
            } else {
                this.audioContext.suspend();
            }
        }
    }

    /**
     * Advanced: Connect audio nodes for testing (e.g., analyzer, compressor)
     * @param {AudioNode} node - The audio node to connect
     */
    testConnectAudioNode(node) {
        if (this.audioContext && this.audioContext.destination) {
            node.connect(this.audioContext.destination);
        }
    }

    /**
     * Advanced: Disconnect audio nodes for testing
     * @param {AudioNode} node - The audio node to disconnect
     */
    testDisconnectAudioNode(node) {
        if (this.audioContext && this.audioContext.destination) {
            node.disconnect(this.audioContext.destination);
        }
    }

    /**
     * Advanced: Create and connect an analyzer node for testing
     * @returns {AnalyserNode} - The created analyzer node
     */
    testCreateAnalyzerNode() {
        if (this.audioContext) {
            const analyzer = this.audioContext.createAnalyser();
            analyzer.fftSize = 2048;
            analyzer.connect(this.audioContext.destination);
            return analyzer;
        }
        return null;
    }

    /**
     * Advanced: Get the current time of the audio context (for testing)
     * @returns {number} - The current time in seconds
     */
    testGetAudioContextTime() {
        if (this.audioContext) {
            return this.audioContext.currentTime;
        }
        return 0;
    }

    /**
     * Advanced: Set the current time of the audio context (for testing)
     * @param {number} time - The time in seconds to set
     */
    testSetAudioContextTime(time) {
        if (this.audioContext) {
            this.audioContext.currentTime = time;
        }
    }

    /**
     * Advanced: Get the list of active audio nodes (for testing)
     * @returns {Array} - Array of active audio nodes
     */
    testGetActiveAudioNodes() {
        if (this.audioContext) {
            return Array.from(this.audioContext.destination.channelCount);
        }
        return [];
    }

    /**
     * Advanced: Clear all audio nodes (for testing)
     */
    testClearAllAudioNodes() {
        if (this.audioContext) {
            const nodes = this.testGetActiveAudioNodes();
            nodes.forEach(node => {
                node.disconnect();
            });
        }
    }

    /**
     * Advanced: Connect a media element source (e.g., video) for testing
     * @param {HTMLMediaElement} mediaElement - The media element to connect
     */
    testConnectMediaElement(mediaElement) {
        if (this.audioContext && mediaElement) {
            const source = this.audioContext.createMediaElementSource(mediaElement);
            source.connect(this.audioContext.destination);
            mediaElement.play();
        }
    }

    /**
     * Advanced: Disconnect a media element source (e.g., video) for testing
     * @param {HTMLMediaElement} mediaElement - The media element to disconnect
     */
    testDisconnectMediaElement(mediaElement) {
        if (this.audioContext && mediaElement) {
            const source = this.audioContext.createMediaElementSource(mediaElement);
            source.disconnect(this.audioContext.destination);
            mediaElement.pause();
        }
    }

    /**
     * Advanced: Create and connect a gain node for testing
     * @param {number} gainValue - The gain value (amplification) to set
     * @returns {GainNode} - The created gain node
     */
    testCreateGainNode(gainValue) {
        if (this.audioContext) {
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = gainValue;
            gainNode.connect(this.audioContext.destination);
            return gainNode;
        }
        return null;
    }

    /**
     * Advanced: Set the gain value of a connected gain node (for testing)
     * @param {GainNode} gainNode - The gain node to set
     * @param {number} value - The gain value to set
     */
    testSetGainValue(gainNode, value) {
        if (gainNode) {
            gainNode.gain.value = value;
        }
    }

    /**
     * Advanced: Connect and configure a compressor node for testing
     * @param {number} threshold - The threshold level for compression
     * @param {number} ratio - The compression ratio
     * @param {number} attack - The attack time in seconds
     * @param {number} release - The release time in seconds
     * @returns {DynamicsCompressorNode} - The created compressor node
     */
    testCreateCompressorNode(threshold, ratio, attack, release) {
        if (this.audioContext) {
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(threshold, this.audioContext.currentTime);
            compressor.ratio.setValueAtTime(ratio, this.audioContext.currentTime);
            compressor.attack.setValueAtTime(attack, this.audioContext.currentTime);
            compressor.release.setValueAtTime(release, this.audioContext.currentTime);
            compressor.connect(this.audioContext.destination);
            return compressor;
        }
        return null;
    }

    /**
     * Advanced: Bypass a compressor node (for testing)
     * @param {DynamicsCompressorNode} compressor - The compressor node to bypass
     */
    testBypassCompressorNode(compressor) {
        if (compressor) {
            compressor.disconnect();
        }
    }

    /**
     * Advanced: Connect and configure an equalizer node for testing
     * @param {Array} frequencies - Array of frequency values for the equalizer bands
     * @param {Array} gains - Array of gain values for the equalizer bands
     * @returns {Array} - Array of connected BiquadFilterNode equalizer bands
     */
    testCreateEqualizer(frequencies, gains) {
        const filters = [];
        if (this.audioContext) {
            frequencies.forEach((freq, index) => {
                const filter = this.audioContext.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                filter.gain.setValueAtTime(gains[index], this.audioContext.currentTime);
                filter.connect(this.audioContext.destination);
                filters.push(filter);
            });
        }
        return filters;
    }

    /**
     * Advanced: Connect and configure a stereo panner node for testing
     * @param {number} panValue - The pan value (-1 to 1) to set
     * @returns {StereoPannerNode} - The created stereo panner node
     */
    testCreateStereoPannerNode(panValue) {
        if (this.audioContext) {
            const panner = this.audioContext.createStereoPanner();
            panner.pan.setValueAtTime(panValue, this.audioContext.currentTime);
            panner.connect(this.audioContext.destination);
            return panner;
        }
        return null;
    }

    /**
     * Advanced: Connect and configure a spatializer node for testing (3D audio)
     * @param {Object} options - The spatializer options (e.g., position, orientation)
     * @returns {Object} - The created spatializer node and its associated components
     */
    testCreateSpatializerNode(options) {
        const spatializer = {};
        if (this.audioContext) {
            // Create 3D audio components (e.g., PannerNode, Listener)
            spatializer.panner = this.audioContext.createPanner();
            spatializer.listener = this.audioContext.listener;
            
            // Set initial spatializer options
            this.testSetSpatializerOptions(spatializer, options);
        }
        return spatializer;
    }

    /**
     * Advanced: Set the options of a spatializer node (3D audio)
     * @param {Object} spatializer - The spatializer node and its associated components
     * @param {Object} options - The new options to set
     */
    testSetSpatializerOptions(spatializer, options) {
        if (spatializer.panner) {
            // Set position, orientation, and other properties
            spatializer.panner.setPosition(options.position.x, options.position.y, options.position.z);
            spatializer.panner.setOrientation(options.orientation.x, options.orientation.y, options.orientation.z);
            spatializer.panner.radius = options.radius || 100;
            spatializer.panner.rolloffFactor = options.rolloffFactor || 1;
            spatializer.panner.refDistance = options.refDistance || 1;
            spatializer.panner.maxDistance = options.maxDistance || 10000;
        }
    }

    /**
     * Advanced: Connect and configure a reverb node for testing
     * @param {Object} options - The reverb options (e.g., room size, damping)
     * @returns {ConvolverNode} - The created reverb node
     */
    testCreateReverbNode(options) {
        if (this.audioContext) {
            const reverb = this.audioContext.createConvolver();
            
            // Create an impulse response for the reverb
            const ir = this.audioContext.createBuffer(2, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
            const leftChannel = ir.getChannelData(0);
            const rightChannel = ir.getChannelData(1);
            
            // Fill with white noise
            for (let i = 0; i < ir.length; i++) {
                leftChannel[i] = (Math.random() * 2 - 1) * 0.5;
                rightChannel[i] = (Math.random() * 2 - 1) * 0.5;
            }
            
            // Apply a low-pass filter to simulate damping
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            filter.Q.setValueAtTime(0.5, this.audioContext.currentTime);
            
            // Connect and process
            ir.connect(filter);
            filter.connect(reverb);
            reverb.connect(this.audioContext.destination);
            
            return reverb;
        }
        return null;
    }

    /**
     * Advanced: Set the parameters of a reverb node (for testing)
     * @param {ConvolverNode} reverb - The reverb node to configure
     * @param {Object} options - The reverb parameters to set
     */
    testSetReverbParameters(reverb, options) {
        if (reverb && options) {
            // Example: set room size and damping
            reverb.roomSize = options.roomSize || 0.5;
            reverb.damping = options.damping || 0.5;
        }
    }

    /**
     * Advanced: Connect and configure a delay node for testing
     * @param {Object} options - The delay options (e.g., time, feedback)
     * @returns {DelayNode} - The created delay node
     */
    testCreateDelayNode(options) {
        if (this.audioContext) {
            const delay = this.audioContext.createDelay();
            delay.delayTime.setValueAtTime(options.time || 0.5, this.audioContext.currentTime);
            
            // Connect feedback loop if needed
            if (options.feedback && options.feedback > 0) {
                const feedbackGain = this.audioContext.createGain();
                feedbackGain.gain.setValueAtTime(options.feedback, this.audioContext.currentTime);
                
                delay.connect(feedbackGain);
                feedbackGain.connect(delay);
            }
            
            delay.connect(this.audioContext.destination);
            return delay;
        }
        return null;
    }

    /**
     * Advanced: Set the parameters of a delay node (for testing)
     * @param {DelayNode} delay - The delay node to configure
     * @param {Object} options - The delay parameters to set
     */
    testSetDelayParameters(delay, options) {
        if (delay && options) {
            delay.delayTime.setValueAtTime(options.time || 0.5, this.audioContext.currentTime);
        }
    }

    /**
     * Advanced: Connect and configure a pitch shifter node for testing
     * @param {Object} options - The pitch shifter options (e.g., semitones)
     * @returns {ScriptProcessorNode} - The created pitch shifter node
     */
    testCreatePitchShifterNode(options) {
        if (this.audioContext) {
            const pitchShifter = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            const semitones = options.semitones || 0;
            const pitchFactor = Math.pow(2, semitones / 12);
            
            pitchShifter.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                const output = e.outputBuffer.getChannelData(0);
                
                for (let i = 0; i < input.length; i++) {
                    output[i] = input[i] * pitchFactor;
                }
            };
            
            pitchShifter.connect(this.audioContext.destination);
            return pitchShifter;
        }
        return null;
    }

    /**
     * Advanced: Set the parameters of a pitch shifter node (for testing)
     * @param {ScriptProcessorNode} pitchShifter - The pitch shifter node to configure
     * @param {Object} options - The pitch shifter parameters to set
     */
    testSetPitchShifterParameters(pitchShifter, options) {
        // Currently, no parameters to set for the pitch shifter
    }

    /**
     * Advanced: Connect and configure a stereo widener node for testing
     * @param {Object} options - The stereo widener options (e.g., width)
     * @returns {GainNode} - The created stereo widener node
     */
    testCreateStereoWidenerNode(options) {
        if (this.audioContext) {
            const widener = this.audioContext.createGain();
            const width = options.width !== undefined ? options.width : 1.0;
            
            // Set initial width
            widener.gain.setValueAtTime(width, this.audioContext.currentTime);
            
            // Connect to left and right channels
            const splitter = this.audioContext.createChannelSplitter(2);
            const merger = this.audioContext.createChannelMerger(2);
            
            splitter.connect(merger, 0, 0);
            splitter.connect(merger, 1, 1);
            
            merger.connect(widener);
            widener.connect(this.audioContext.destination);
            
            return widener;
        }
        return null;
    }

    /**
     * Advanced: Set the parameters of a stereo widener node (for testing)
     * @param {GainNode} widener - The stereo widener node to configure
     * @param {Object} options - The widener parameters to set
     */
    testSetStereoWidenerParameters(widener, options) {
        if (widener && options.width !== undefined) {
            widener.gain.setValueAtTime(options.width, this.audioContext.currentTime);
        }
    }

    /**
     * Advanced: Connect and configure a noise gate node for testing
     * @param {Object} options - The noise gate options (e.g., threshold, release)
     * @returns {DynamicsCompressorNode} - The created noise gate node
     */
    testCreateNoiseGateNode(options) {
        if (this.audioContext) {
            const noiseGate = this.audioContext.createDynamicsCompressor();
            
            // Invert the threshold for noise gating
            const threshold = options.threshold !== undefined ? -options.threshold : -50;
            const ratio = options.ratio !== undefined ? options.ratio : 20;
            const attack = options.attack !== undefined ? options.attack : 0.01;
            const release = options.release !== undefined ? options.release : 0.1;
            
            noiseGate.threshold.setValueAtTime(threshold, this.audioContext.currentTime);
            noiseGate.ratio.setValueAtTime(ratio, this.audioContext.currentTime);
            noiseGate.attack.setValueAtTime(attack, this.audioContext.currentTime);
            noiseGate.release.setValueAtTime(release, this.audioContext.currentTime);
            
            noiseGate.connect(this.audioContext.destination);
            return noiseGate;
        }
        return null;
    }

    /**
     * Advanced: Set the parameters of a noise gate node (for testing)
     * @param {DynamicsCompressorNode} noiseGate - The noise gate node to configure
     * @param {Object} options - The noise gate parameters to set
     */
    testSetNoiseGateParameters(noiseGate, options) {
        if (noiseGate && options) {
            // Example: set threshold and release
            noiseGate.threshold.setValueAtTime(options.threshold || -50, this.audioContext.currentTime);
            noiseGate.release.setValueAtTime(options.release || 0.1, this.audioContext.currentTime);
        }
    }

    /**
     * Advanced: Connect and configure a sidechain compressor node for testing
     * @param {Object} options - The sidechain compressor options (e.g., threshold, ratio)
     * @returns {DynamicsCompressorNode} - The created sidechain compressor node
     */
    testCreateSidechainCompressorNode(options) {
        if (this.audioContext) {
            const sidechainCompressor = this.audioContext.createDynamicsCompressor();
            
            // Set up sidechain input (requires a separate audio source)
            // For testing, we can use a dummy oscillator as the sidechain input
            const sidechainOscillator = this.audioContext.createOscillator();
            sidechainOscillator.frequency.setValueAtTime(1, this.audioContext.currentTime); // 1 Hz for testing
            sidechainOscillator.connect(sidechainCompressor);
            sidechainOscillator.start(0);
            
            const threshold = options.threshold !== undefined ? options.threshold : -50;
            const ratio = options.ratio !== undefined ? options.ratio : 4;
            const attack = options.attack !== undefined ? options.attack : 0.01;
            const release = options.release !== undefined ? options.release : 0.1;
            
            sidechainCompressor.threshold.setValueAtTime(threshold, this.audioContext.currentTime);
            sidechainCompressor.ratio.setValueAtTime(ratio, this.audioContext.currentTime);
            sidechainCompressor.attack.setValueAtTime(attack, this.audioContext.currentTime);
            sidechainCompressor.release.setValueAtTime(release, this.audioContext.currentTime);
            
            sidechainCompressor.connect(this.audioContext.destination);
            return sidechainCompressor;
        }
        return null;
    }

    /**
     * Advanced: Set the parameters of a sidechain compressor node (for testing)
     * @param {DynamicsCompressorNode} sidechainCompressor - The sidechain compressor node to configure
     * @param {Object} options - The sidechain compressor parameters to set
     */    testSetSidechainCompressorParameters(sidechainCompressor, options) {
        if (sidechainCompressor && options) {
            sidechainCompressor.threshold.setValueAtTime(options.threshold || -50, this.audioContext.currentTime);
            sidechainCompressor.release.setValueAtTime(options.release || 0.1, this.audioContext.currentTime);
        }
    }

    /**
     * Save audio settings to local storage
     */
    saveSettings() {
        try {
            const settings = {
                isMuted: this.isMuted,
                masterVolume: this.masterVolume,
                sfxVolume: this.sfxVolume,
                musicVolume: this.musicVolume,
                musicMode: this.musicMode,
                selectedTrack: this.selectedTrack,
                timestamp: Date.now()
            };
            
            // Save to dedicated audio settings storage
            localStorage.setItem('coderunner_audio_settings', JSON.stringify(settings));
            
            // Also save to unified game data for backup
            const existingData = localStorage.getItem('coderunner_save_data');
            let unifiedData = existingData ? JSON.parse(existingData) : {};
            unifiedData.audioSettings = settings;
            localStorage.setItem('coderunner_save_data', JSON.stringify(unifiedData));
            
        } catch (error) {
            console.warn('⚠️ Could not save audio settings:', error);
        }
    }

    /**
     * Play menu open sound effect
     */
    onMenuOpen() {
        this.playSound('menuOpen', 0.3);
    }

    /**
     * Play menu close sound effect
     */
    onMenuClose() {
        this.playSound('menuClose', 0.3);
    }

    /**
     * Play menu click sound effect
     */
    onMenuClick() {
        this.playSound('menuClick', 0.5);
    }

    /**
     * Play menu hover sound effect
     */
    onMenuHover() {
        this.playSound('menuClick', 0.2); // Use menu click sound at lower volume for hover
    }

    /**
     * Play jump sound effect
     */
    onJump() {
        this.playSound('jump', 0.6);
    }

    /**
     * Play double jump sound effect
     */
    onDoubleJump() {
        this.playSound('doubleJump', 0.6);
    }

    /**
     * Play collect sound effect
     */
    onCollect() {
        this.playSound('collect', 0.5);
    }

    /**
     * Play collect coin sound effect
     */
    onCollectCoin() {
        this.playSound('collect', 0.5); // Reuse collect sound for coins
    }

    /**
     * Play pause sound effect
     */
    onPause() {
        this.playSound('menuOpen', 0.4); // Use menu sound for pause
    }

    /**
     * Play resume sound effect
     */
    onResume() {
        this.playSound('menuClose', 0.4); // Use menu sound for resume
    }

    /**
     * Play powerup sound effect
     */
    onPowerup() {
        this.playSound('powerup', 0.7);
    }

    /**
     * Play purchase sound effect
     */
    onPurchase() {
        this.playSound('purchase', 0.6);
    }

    /**
     * Play damage sound effect
     */
    onDamage() {
        this.playSound('damage', 0.6);
    }

    /**
     * Play game over sound effect
     */
    onGameOver() {
        this.playSound('death', 0.8);
    }
    
    /**
     * Debug method to check audio system status
     */
    getAudioStatus() {
        return {
            audioInitialized: this.audioInitialized,
            userInteracted: this.userInteracted,
            audioContextState: this.audioContext ? this.audioContext.state : 'none',
            isMuted: this.isMuted,
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            currentMusic: this.currentMusic ? 'playing' : 'none',
            soundsLoaded: Object.keys(this.sounds).length,
            tracksLoaded: Object.keys(this.music).length
        };
    }
    
    /**
     * Force audio initialization (for testing)
     */
    forceInitialize() {
        console.log('🎵 Force initializing audio system...');
        this.userInteracted = true;
        this.audioInitialized = true;
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Try to start music
        if (!this.isMuted && this.music[this.musicMode]) {
            this.playMusic(this.musicMode);
        }
        
        console.log('🎵 Audio status after force init:', this.getAudioStatus());
    }
}