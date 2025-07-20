/**
 * Firebase-enabled Leaderboard System
 * Implements the submitScore and showLeaderboard functions from LeaderBoard.MD
 */

import { DIFFICULTY_LEVELS } from '../utils/constants.js';

export class LeaderboardSystem {
    constructor(gameInstance = null) {
        this.gameInstance = gameInstance; // Store reference to Game instance
        
        this.leaderboards = {
            EASY: [],
            MEDIUM: [],
            HARD: [],
            EXTREME: []
        };
        
        this.uploadedDifficulties = new Set();
        this.selectedDifficulty = 'EASY';
        this.isUploading = false;
        this.uploadResult = null;
        this.uploadResultTimestamp = 0; // Add timestamp for fade-out
        this.uploadResultDisplayTime = 3000; // Show for 3 seconds
        this.showUploadPrompt = false;
        this.playerName = '';
        this.nameInputActive = false;
        this.playerEntries = new Map();
        this.savedPlayerName = '';
        
        // Firebase configuration
        this.firebaseDatabase = null;
        this.isOnline = false;
        this.currentUpload = null;
        
        // Content moderation system
        this.moderationData = {
            violations: 0,
            lastViolationTime: 0,
            banEndTime: 0,
            warningHistory: []
        };
        
        // List of inappropriate words/phrases (expandable)
        this.inappropriateWords = [
            // Profanity
            'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'crap', 'piss',
            'bastard', 'whore', 'slut', 'fag', 'retard', 'gay', 'homo',
            // Offensive terms
            'nazi', 'hitler', 'terrorist', 'rape', 'murder', 'kill', 'die',
            'suicide', 'cancer', 'aids', 'covid', 'virus', 'disease',
            // Racial slurs and hate speech
            'nigger', 'nigga', 'chink', 'spic', 'kike', 'faggot', 'tranny',
            // Sexual content
            'sex', 'porn', 'nude', 'naked', 'tits', 'boobs', 'penis', 'vagina',
            'cock', 'dick', 'pussy', 'cum', 'orgasm', 'masturbate',
            // Drugs
            'cocaine', 'heroin', 'meth', 'weed', 'marijuana', 'drugs',
            // Generic offensive
            'hate', 'stupid', 'idiot', 'loser', 'noob', 'suck', 'sucks'
        ];
          // Initialize system
        this.initializeSystem();
    }

    /**
     * Set the Game instance reference (for use when LeaderboardSystem is created before Game)
     * @param {Game} gameInstance - The game instance
     */
    setGameInstance(gameInstance) {
        this.gameInstance = gameInstance;
    }

    /**
     * Initialize the leaderboard system (online or offline mode)
     */
    async initializeSystem() {
        // Check if Firebase is available
        await this.checkFirebaseConnection();
        
        // Set up network status listeners
        this.setupNetworkListeners();
        
        if (this.isOnline) {
            console.log('🌐 Connected to Firebase leaderboard');
            await this.loadFirebaseLeaderboards();
        } else {
            console.log('💾 Using offline leaderboard mode');
            this.clearFakeSubmissions();
            this.loadLeaderboards();
        }
        
        // Always load local user preferences
        this.loadUploadHistory();
        this.loadPlayerName();
        this.loadPlayerEntries();
          // Load moderation data        this.loadModerationData();
        
        // Update Game's bestScores with current leaderboard data
        if (this.gameInstance) {
            this.updateGameBestScores(this.gameInstance);
        }
    }/**
     * Check if Firebase is available and network connectivity
     */
    async checkFirebaseConnection() {
        try {
            if (typeof window !== 'undefined' && window.firebaseDatabase) {
                this.firebaseDatabase = window.firebaseDatabase;
                // Check actual network connectivity
                const hasConnection = await this.checkNetworkConnectivity();
                this.isOnline = hasConnection;
                if (hasConnection) {
                    console.log('Firebase database connected with network');
                } else {
                    console.log('Firebase available but no network connection');
                }
            } else {
                this.isOnline = false;
                console.log('Firebase not available, using offline mode');
            }
        } catch (error) {
            this.isOnline = false;
            console.log('Firebase connection error:', error);
        }
    }    /**
     * Check for actual network connectivity
     */
    async checkNetworkConnectivity() {
        // Check browser's online status first
        if (!navigator.onLine) {
            return false;
        }

        try {
            // Try to make a small request to check actual connectivity
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch('https://www.google.com/favicon.ico', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return true;
        } catch (error) {
            console.log('Network connectivity check failed:', error);
            return false;
        }
    }
      /**
     * Firebase submitScore function as specified in LeaderBoard.MD task 3
     */
    async submitScore(name, score, difficulty = this.selectedDifficulty, survivalTime = 0) {
        if (!this.isOnline || !this.firebaseDatabase) {
            console.log('Firebase not available, using offline mode');
            return this.submitScoreOffline(name, score, difficulty, survivalTime);
        }        try {
            const scoresRef = this.firebaseDatabase.ref(`leaderboard/${difficulty}`);
              const newScore = {
                name: name,
                score: score,
                survivalTime: survivalTime,
                timestamp: Date.now()
            };
            
            // Check if player already has an entry for this difficulty in Firebase
            if (this.playerEntries.has(difficulty)) {
                const playerHasEntryInFirebase = await this.checkPlayerEntryInFirebase(difficulty, name);
                
                if (playerHasEntryInFirebase) {
                    // Replace existing entry only if new score is higher
                    const existingScore = await this.getPlayerScoreFromFirebase(difficulty, name);
                    
                    if (existingScore && score <= existingScore) {
                        console.log(`⚠️ Not submitting to Firebase: Existing score (${existingScore}) >= new score (${score})`);
                        return false;
                    }
                    
                    console.log(`🔄 Replacing lower score (${existingScore}) with higher score (${score}) in Firebase`);
                    // For this update, we'll simply push the new score (Firebase doesn't easily support updating)
                }
            }
            
            // Push to Firebase
            await scoresRef.push(newScore);
            
            console.log('✅ Score submitted to Firebase:', newScore);
            
            // Update local tracking
            this.uploadedDifficulties.add(difficulty);
            this.savePlayerName(name);
            this.saveUploadHistory();
              // Refresh local leaderboards
            await this.loadFirebaseLeaderboards();
              // Update Game's bestScores after successful score submission
            if (this.gameInstance) {
                this.updateGameBestScores(this.gameInstance);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Firebase submit error:', error);
            // Fallback to offline
            return this.submitScoreOffline(name, score, difficulty, survivalTime);
        }
    }
    
    /**
     * Load leaderboards from Firebase
     */
    async loadFirebaseLeaderboards() {
        if (!this.firebaseDatabase) return;
        
        try {
            const snapshot = await this.firebaseDatabase.ref('leaderboard').once('value');
            const data = snapshot.val();
            
            if (data) {
                // Convert Firebase data to our format
                Object.keys(this.leaderboards).forEach(difficulty => {
                    if (data[difficulty]) {
                        const scores = [];
                        Object.values(data[difficulty]).forEach(score => {
                            scores.push({
                                id: score.timestamp || Date.now(),
                                name: score.name,
                                score: score.score,
                                survivalTime: score.survivalTime || 0,
                                timestamp: score.timestamp || Date.now()
                            });
                        });
                        
                        // Sort by score descending
                        scores.sort((a, b) => b.score - a.score);
                        this.leaderboards[difficulty] = scores.slice(0, 10); // Keep top 10
                    }                });
            }
        } catch (error) {
            console.warn('Failed to load Firebase leaderboards:', error);
            this.isOnline = false;
        }
          // Update Game's bestScores after loading leaderboards
        if (this.gameInstance) {
            this.updateGameBestScores(this.gameInstance);
        }
    }
      /**
     * Refresh leaderboards (for live updates)
     */
    async refreshLeaderboards() {
        if (this.isOnline) {
            await this.loadFirebaseLeaderboards();
        }
    }
      /**
     * showLeaderboard function as specified in LeaderBoard.MD task 4
     * Shows the live leaderboard in the HTML container
     * Task 5: Uses live updates with .on("value") instead of .once("value")
     */
    showLeaderboard(difficulty = this.selectedDifficulty, enableLiveUpdates = true) {
        if (!this.isOnline || !this.firebaseDatabase) {
            console.log('Firebase not available, showing offline leaderboard');
            this.showOfflineLeaderboard(difficulty);
            return;
        }
        
        const scoresRef = this.firebaseDatabase.ref(`leaderboard/${difficulty}`);
        
        // Task 5: Use .on("value") for live updates instead of .once("value")
        const listener = enableLiveUpdates ? 'on' : 'once';
        
        scoresRef.orderByChild("score").limitToLast(5)[listener]("value", (snapshot) => {
            const data = [];
            snapshot.forEach((childSnapshot) => {
                data.push(childSnapshot.val());
            });

            data.reverse(); // Show highest scores first

            const leaderboardElement = document.getElementById("leaderboard");
            if (!leaderboardElement) {
                console.warn('Leaderboard element not found in DOM');
                return;
            }
            
            leaderboardElement.innerHTML = "";

            if (data.length === 0) {
                const li = document.createElement("li");
                li.style.textAlign = "center";
                li.style.color = "#7d8590";
                li.style.padding = "10px";
                li.textContent = `No scores yet for ${DIFFICULTY_LEVELS[difficulty].name} difficulty`;
                leaderboardElement.appendChild(li);
                return;
            }

            data.forEach((entry, index) => {
                const li = document.createElement("li");
                li.style.display = "flex";
                li.style.justifyContent = "space-between";
                li.style.padding = "8px 0";
                li.style.borderBottom = index < data.length - 1 ? "1px solid #30363d" : "none";
                
                // Add medal for top 3
                let rankDisplay = `${index + 1}.`;
                if (index === 0) rankDisplay = '🥇';
                else if (index === 1) rankDisplay = '🥈';
                else if (index === 2) rankDisplay = '🥉';
                  li.innerHTML = `
                    <span>${rankDisplay} ${entry.name}</span>
                    <span style="color: #ffd700;">${entry.score}</span>
                `;
                leaderboardElement.appendChild(li);
            });
            
            // Show the leaderboard container
            const containerElement = document.getElementById("leaderboard-container");
            if (containerElement) {
                containerElement.style.display = "block";
            }
        });
        
        // Store the listener reference for cleanup
        if (enableLiveUpdates) {
            this.currentLeaderboardListener = {
                ref: scoresRef.orderByChild("score").limitToLast(5),
                difficulty: difficulty
            };
        }
    }
    
    /**
     * Stop live leaderboard updates
     */
    stopLiveLeaderboardUpdates() {
        if (this.currentLeaderboardListener) {
            this.currentLeaderboardListener.ref.off("value");
            this.currentLeaderboardListener = null;
        }
    }
    
    /**
     * Show offline leaderboard fallback
     */
    showOfflineLeaderboard(difficulty = this.selectedDifficulty) {
        const entries = this.getLeaderboard(difficulty).slice(0, 5);
        const leaderboardElement = document.getElementById("leaderboard");
        
        if (!leaderboardElement) {
            console.warn('Leaderboard element not found in DOM');
            return;
        }
        
        leaderboardElement.innerHTML = "";
        
        if (entries.length === 0) {
            const li = document.createElement("li");
            li.style.textAlign = "center";
            li.style.color = "#7d8590";
            li.style.padding = "10px";
            li.textContent = `No offline scores for ${DIFFICULTY_LEVELS[difficulty].name} difficulty`;
            leaderboardElement.appendChild(li);
        } else {
            entries.forEach((entry, index) => {
                const li = document.createElement("li");
                li.style.display = "flex";
                li.style.justifyContent = "space-between";
                li.style.padding = "8px 0";
                li.style.borderBottom = index < entries.length - 1 ? "1px solid #30363d" : "none";
                
                let rankDisplay = `${index + 1}.`;
                if (index === 0) rankDisplay = '🥇';
                else if (index === 1) rankDisplay = '🥈';
                else if (index === 2) rankDisplay = '🥉';
                  li.innerHTML = `
                    <span>${rankDisplay} ${entry.name}</span>
                    <span style="color: #ffd700;">${entry.score}</span>
                `;
                leaderboardElement.appendChild(li);
            });
        }
        
        // Show the leaderboard container
        const containerElement = document.getElementById("leaderboard-container");
        if (containerElement) {
            containerElement.style.display = "block";
        }
    }
      /**
     * Check if player can upload for a specific difficulty
     */
    canUploadForDifficulty(difficulty) {
        // Allow uploads, but will replace existing entry if one exists
        return true;
    }    /**
     * Prepare score upload - called from Game.gameOver()
     * This method calculates survival time and handles automatic submission if profile name exists
     * @param {number} score - The player's final score
     * @param {string} difficulty - The difficulty level
     * @param {number} startTime - Game start timestamp
     */
    prepareScoreUpload(score, difficulty, startTime) {
        if (!score || !difficulty || !startTime) {
            console.warn('Invalid parameters for prepareScoreUpload:', { score, difficulty, startTime });
            return false;
        }

        // Calculate survival time in seconds
        const survivalTime = Math.floor((Date.now() - startTime) / 1000);
        
        console.log(`🎯 Preparing score upload: ${score} in ${difficulty} mode (${survivalTime}s)`);
        
        // Check if we have a valid display name for automatic submission
        const displayName = this.getDisplayName();
        const isAuthenticated = this.isUserAuthenticated();
        
        if (this.hasValidDisplayName()) {
            console.log(`🚀 Auto-submitting score with display name: ${displayName}`);
            return this.autoSubmitScore(score, difficulty, survivalTime, displayName);
        } else if (isAuthenticated && !this.hasValidDisplayName()) {
            console.log(`📝 Authenticated user needs to set display name, showing name selection dialog`);
            return this.showNameSelectionDialog(difficulty, score, survivalTime);
        } else {
            // Check for saved name for guest users
            const savedName = this.getSavedPlayerName();
            if (savedName && savedName.trim() && savedName !== 'Anonymous') {
                console.log(`🚀 Auto-submitting score with saved name: ${savedName}`);
                return this.autoSubmitScore(score, difficulty, survivalTime, savedName);
            } else {
                console.log(`📝 No saved name found, showing name selection dialog`);
                return this.showNameSelectionDialog(difficulty, score, survivalTime);
            }
        }
    }

    /**
     * Automatically submit score with saved player name
     * @param {number} score - The player's score
     * @param {string} difficulty - The difficulty level
     * @param {number} survivalTime - Time survived in seconds
     * @param {string} playerName - The saved player name
     * @returns {Promise<boolean>} - Whether the submission was successful
     */
    async autoSubmitScore(score, difficulty, survivalTime, playerName) {
        if (score < 100) {
            console.log(`❌ Score ${score} too low for leaderboard (minimum 100)`);
            return false;
        }

        // Validate player name for inappropriate content
        const validation = this.validatePlayerName(playerName);
        if (!validation.valid) {
            console.warn(`❌ Saved name "${playerName}" failed validation:`, validation.message);
            // If the saved name is inappropriate, fall back to name selection dialog
            return this.showNameSelectionDialog(difficulty, score, survivalTime);
        }        // Note: Allowing same name across different difficulties
        // Players can use the same name in multiple difficulty levels
        console.log(`✅ Using name "${playerName}" for ${difficulty} mode (same name allowed across difficulties)`);
        

        console.log(`🚀 Auto-submitting score: ${score} for ${playerName} in ${difficulty} mode`);
        
        try {
            this.isUploading = true;
            const success = await this.submitScore(playerName, score, difficulty, survivalTime);
              if (success) {
                this.setUploadResult({
                    success: true,
                    message: `Score ${score} automatically uploaded to ${DIFFICULTY_LEVELS[difficulty].name} leaderboard!`
                });
                console.log(`✅ Auto-submission successful: ${score} for ${playerName}`);
                
                // Automatically show leaderboard after successful high score submission
                this.scheduleLeaderboardDisplay();
            } else {
                this.setUploadResult({
                    success: false,
                    message: 'Auto-upload failed! Score not high enough or other error.'
                });
                console.log(`❌ Auto-submission failed for ${playerName}: ${score}`);
            }
            
            return success;
            
        } catch (error) {
            console.error('Error during auto-submission:', error);
            this.setUploadResult({
                success: false,
                message: 'Auto-upload failed! Please try again later.'
            });
            return false;
        } finally {
            this.isUploading = false;
        }
    }    /**
     * Show name selection dialog when no saved name exists
     * @param {string} difficulty - The difficulty level
     * @param {number} score - The player's score
     * @param {number} survivalTime - Time survived in seconds
     * @returns {boolean} - Always returns true to indicate dialog was shown
     */
    showNameSelectionDialog(difficulty, score, survivalTime) {
        console.log(`📝 Showing name selection dialog for score: ${score} in ${difficulty} mode`);
        
        // Set up the upload context for the manual name entry flow
        this.currentUpload = { difficulty, score, survivalTime };
        this.showUploadPrompt = true;
        this.nameInputActive = true;
        this.playerName = ''; // Clear any existing name to force user input
        
        // Show upload result as guidance
        this.uploadResult = {
            success: false,
            message: `Great score of ${score}! Enter your name to join the ${DIFFICULTY_LEVELS[difficulty].name} leaderboard.`
        };
        
        return true;
    }    /**
     * Schedule automatic leaderboard display after successful high score submission
     * Shows the leaderboard with animation after a brief delay
     */
    scheduleLeaderboardDisplay() {
        if (!this.gameInstance) {
            console.warn('Cannot show leaderboard - no game instance reference');
            return;
        }

        console.log('🏆 Scheduling leaderboard display for new high score...');
        
        // Determine the difficulty to show:
        // 1. If we have a currentUpload context (manual submission), use that difficulty
        // 2. Otherwise, use the game's current difficulty (auto submission)
        const highScoreDifficulty = this.currentUpload ? 
            this.currentUpload.difficulty : 
            this.gameInstance.selectedDifficulty;
        
        // Show leaderboard after a 2-second delay to let player see the success message
        setTimeout(() => {
            try {
                console.log('🏆 Automatically showing leaderboard for new high score');
                
                // Import GAME_STATES at runtime to avoid circular dependencies
                import('../utils/constants.js').then(({ GAME_STATES }) => {
                    if (this.gameInstance && this.gameInstance.gameState === GAME_STATES.GAME_OVER) {
                        // Set the leaderboard to show the difficulty where the high score was achieved
                        this.selectedDifficulty = highScoreDifficulty;
                        
                        // Transition to leaderboard state
                        this.gameInstance.gameState = GAME_STATES.LEADERBOARD;
                        
                        console.log(`✅ Successfully transitioned to leaderboard display for ${highScoreDifficulty} difficulty`);
                    }
                }).catch(error => {
                    console.error('Error importing GAME_STATES:', error);
                });
                
            } catch (error) {
                console.error('Error showing leaderboard:', error);
            }        }, 2000); // 2-second delay
    }

    /**
     * Schedule automatic leaderboard display for a specific difficulty
     * This is used for manual submissions where we capture the difficulty before clearing currentUpload
     * @param {string} difficulty - The difficulty level to show
     */
    scheduleLeaderboardDisplayForDifficulty(difficulty) {
        if (!this.gameInstance) {
            console.warn('Cannot show leaderboard - no game instance reference');
            return;
        }

        console.log(`🏆 Scheduling leaderboard display for ${difficulty} difficulty...`);
        
        // Show leaderboard after a 2-second delay to let player see the success message
        setTimeout(() => {
            try {
                console.log(`🏆 Automatically showing leaderboard for ${difficulty} difficulty`);
                
                // Import GAME_STATES at runtime to avoid circular dependencies
                import('../utils/constants.js').then(({ GAME_STATES }) => {
                    if (this.gameInstance && this.gameInstance.gameState === GAME_STATES.GAME_OVER) {
                        // Set the leaderboard to show the specified difficulty
                        this.selectedDifficulty = difficulty;
                        
                        // Transition to leaderboard state
                        this.gameInstance.gameState = GAME_STATES.LEADERBOARD;
                        
                        console.log(`✅ Successfully transitioned to leaderboard display for ${difficulty} difficulty`);
                    }
                }).catch(error => {
                    console.error('Error importing GAME_STATES:', error);
                });
                
            } catch (error) {
                console.error('Error showing leaderboard:', error);
            }
        }, 2000); // 2-second delay
    }

    /**
     * Check if a player name already exists in other difficulty leaderboards
     * @param {string} playerName - The name to check
     * @param {string} currentDifficulty - The current difficulty (to exclude from check)
     * @returns {Promise<boolean>} - Whether the name exists in other leaderboards
     */
    async checkDuplicateNameAcrossLeaderboards(playerName, currentDifficulty) {
        const difficulties = ['EASY', 'MEDIUM', 'HARD', 'EXTREME'];
        
        for (const difficulty of difficulties) {
            if (difficulty === currentDifficulty) continue;
            
            // Check Firebase first if online
            if (this.isOnline && this.firebaseDatabase) {
                try {
                    const hasEntry = await this.checkPlayerEntryInFirebase(difficulty, playerName);
                    if (hasEntry) {
                        console.log(`🔍 Found duplicate name "${playerName}" in ${difficulty} Firebase leaderboard`);
                        return true;
                    }
                } catch (error) {
                    console.warn(`Error checking Firebase for duplicates in ${difficulty}:`, error);
                }
            }
            
            // Check local leaderboards
            const localEntry = this.leaderboards[difficulty].find(entry => 
                entry.name && entry.name.toLowerCase() === playerName.toLowerCase()
            );
            
            if (localEntry) {
                console.log(`🔍 Found duplicate name "${playerName}" in ${difficulty} local leaderboard`);
                return true;
            }
        }
        
        return false;
    }

    /**
     * Initiate score upload process
     */
    initiateUpload(difficulty, score, survivalTime) {
        if (score < 100) {
            this.uploadResult = {
                success: false,
                message: 'Minimum score of 100m required for leaderboard!'
            };
            return false;
        }

        // Check if player has an existing entry and inform them
        const hasExistingEntry = this.uploadedDifficulties.has(difficulty);
        if (hasExistingEntry) {
            const existingEntryId = this.playerEntries.get(difficulty);
            const existingEntry = this.leaderboards[difficulty].find(entry => entry.id === existingEntryId);
            
            if (existingEntry) {
                // Just inform the user, but allow the submission
                console.log(`Player has existing entry: ${existingEntry.score}, new score: ${score}`);
            }
        }
        
        this.showUploadPrompt = true;
        this.currentUpload = { difficulty, score, survivalTime };
        
        // Use saved player name if available, or get from profileManager
        if (!this.playerName) {
            this.playerName = this.getSavedPlayerName();
        }
        
        this.nameInputActive = true;
        return true;
    }
      /**
     * Submit score to leaderboard (Firebase or offline)
     */
    async submitScoreFromUpload(playerName) {
        if (!this.currentUpload || !playerName.trim()) {
            return false;
        }
        
        // Validate player name for inappropriate content
        const validation = this.validatePlayerName(playerName.trim());
        if (!validation.valid) {
            this.uploadResult = {
                success: false,
                message: validation.message
            };
            
            // If banned, close the upload prompt
            if (validation.banned) {
                this.currentUpload = null;
                this.showUploadPrompt = false;
                this.nameInputActive = false;
            } else {
                // For warnings, clear the name and let them try again
                this.playerName = '';
            }
            
            this.isUploading = false;
            return false;
        }
        
        this.isUploading = true;
        this.nameInputActive = false;
        
        try {
            const { difficulty, score, survivalTime } = this.currentUpload;
            const success = await this.submitScore(playerName.trim(), score, difficulty, survivalTime);
              if (success) {
                this.uploadResult = {
                    success: true,
                    message: `Score uploaded successfully to ${DIFFICULTY_LEVELS[difficulty].name} leaderboard!`
                };
                
                this.currentUpload = null;
                this.showUploadPrompt = false;
                  // Automatically show leaderboard after successful manual submission
                this.scheduleLeaderboardDisplayForDifficulty(difficulty);
            } else {
                this.uploadResult = {
                    success: false,
                    message: 'Upload failed! Please try again later.'
                };
            }
            
            return success;
            
        } catch (error) {
            console.error('Error submitting score:', error);
            this.uploadResult = {
                success: false,
                message: 'Upload failed! Please try again later.'
            };
            return false;
        } finally {
            this.isUploading = false;
        }
    }    /**
     * Submit score offline (fallback method)
     */
    async submitScoreOffline(playerName, score, difficulty, survivalTime) {
        // Simulate API upload delay
        await this.simulateUpload();
        
        // Check if player has an existing entry with a higher or equal score
        const existingEntryId = this.playerEntries.get(difficulty);
        if (existingEntryId) {
            const existingEntry = this.leaderboards[difficulty].find(entry => entry.id === existingEntryId);
            
            // Only submit if new score is higher than existing score
            if (existingEntry && score <= existingEntry.score) {
                console.log(`⚠️ Not submitting offline: Existing score (${existingEntry.score}) >= new score (${score})`);
                return false;
            }
            
            // Remove existing entry (we'll add the new one with higher score)
            this.leaderboards[difficulty] = this.leaderboards[difficulty].filter(entry => entry.id !== existingEntryId);
        }        const entry = {
            name: playerName.trim().substring(0, 20),
            score: score,
            survivalTime: survivalTime,
            timestamp: Date.now(),
            id: this.generateId()
        };
        
        // Add to leaderboard
        this.leaderboards[difficulty].push(entry);
        
        // Sort by score (descending)
        this.leaderboards[difficulty].sort((a, b) => b.score - a.score);
        
        // Keep only top 10
        this.leaderboards[difficulty] = this.leaderboards[difficulty].slice(0, 10);
        
        // Mark this difficulty as uploaded
        this.uploadedDifficulties.add(difficulty);
        
        // Track player's entry for potential deletion
        this.playerEntries.set(difficulty, entry.id);
        
        // Save player name for future use
        this.savePlayerName(playerName.trim());
          // Save data
        this.saveLeaderboards();
        this.saveUploadHistory();
        this.savePlayerEntries();
          // Update Game's bestScores after successful offline score submission
        if (this.gameInstance) {
            this.updateGameBestScores(this.gameInstance);
        }
        
        return true;
    }
    
    /**
     * Simulate upload delay
     */
    async simulateUpload() {
        return new Promise(resolve => {
            setTimeout(resolve, 1000 + Math.random() * 2000);
        });
    }
    
    /**
     * Generate unique ID for leaderboard entry
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * Get leaderboard for specific difficulty
     */
    getLeaderboard(difficulty) {
        return this.leaderboards[difficulty] || [];
    }
    
    /**
     * Navigate between difficulties in leaderboard view
     */
    navigateUp() {
        const difficulties = Object.keys(DIFFICULTY_LEVELS);
        const currentIndex = difficulties.indexOf(this.selectedDifficulty);
        this.selectedDifficulty = difficulties[Math.max(0, currentIndex - 1)];
    }
    
    navigateDown() {
        const difficulties = Object.keys(DIFFICULTY_LEVELS);
        const currentIndex = difficulties.indexOf(this.selectedDifficulty);
        this.selectedDifficulty = difficulties[Math.min(difficulties.length - 1, currentIndex + 1)];
    }
    
    /**
     * Cancel upload process
     */
    cancelUpload() {
        this.showUploadPrompt = false;
        this.nameInputActive = false;
        this.currentUpload = null;
        this.playerName = '';
        console.log('📊 Upload cancelled');
    }
    
    /**
     * Clear upload result message
     */    clearResult() {
        this.uploadResult = null;
    }

    /**
     * Reset input state - clears name input active flag and related state
     */
    resetInputState() {
        this.nameInputActive = false;
        this.showUploadPrompt = false;
        this.currentUpload = null;
        console.log('🔄 LeaderboardSystem input state reset');
    }
    
    /**
     * Save leaderboards to localStorage (offline mode)
     */
    saveLeaderboards() {
        try {
            localStorage.setItem('coderunner_leaderboards', JSON.stringify(this.leaderboards));
        } catch (error) {
            console.warn('Failed to save leaderboards:', error);
        }
    }
    
    /**
     * Load leaderboards from localStorage (offline mode)
     */
    loadLeaderboards() {
        try {
            const saved = localStorage.getItem('coderunner_leaderboards');
            if (saved) {
                const data = JSON.parse(saved);
                Object.keys(this.leaderboards).forEach(difficulty => {
                    if (data[difficulty]) {
                        this.leaderboards[difficulty] = data[difficulty];
                    }
                });
            }        } catch (error) {
            console.warn('Failed to load leaderboards:', error);
        }
          // Update Game's bestScores after loading offline leaderboards
        if (this.gameInstance) {
            this.updateGameBestScores(this.gameInstance);
        }
    }
    
    /**
     * Save upload history to localStorage
     */
    saveUploadHistory() {
        try {
            localStorage.setItem('coderunner_uploads', JSON.stringify([...this.uploadedDifficulties]));
        } catch (error) {
            console.warn('Failed to save upload history:', error);
        }
    }
    
    /**
     * Load upload history from localStorage
     */
    loadUploadHistory() {
        try {
            const saved = localStorage.getItem('coderunner_uploads');
            if (saved) {
                const data = JSON.parse(saved);
                this.uploadedDifficulties = new Set(data);
            }
        } catch (error) {
            console.warn('Failed to load upload history:', error);
        }
    }
    
    /**
     * Clear any fake submissions from localStorage
     */
    clearFakeSubmissions() {
        const noFakeDataFlag = localStorage.getItem('coderunner_no_fake_data');
        
        if (!noFakeDataFlag) {
            try {
                localStorage.removeItem('coderunner_leaderboards');
                localStorage.setItem('coderunner_no_fake_data', 'true');
                console.log('Cleared all leaderboard data to remove fake submissions');
            } catch (error) {
                console.warn('Failed to clear legacy data:', error);
            }
            
            Object.keys(this.leaderboards).forEach(difficulty => {
                this.leaderboards[difficulty] = [];
            });
        }
    }
    
    /**
     * Check if a name contains inappropriate content
     */
    isInappropriateName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const lowerName = name.toLowerCase().trim();
        
        // Check for inappropriate words
        for (const word of this.inappropriateWords) {
            if (lowerName.includes(word)) {
                return true;
            }
        }
        
        // Check for excessive special characters (spam-like behavior)
        const specialCharCount = (lowerName.match(/[^a-z0-9\s]/g) || []).length;
        if (specialCharCount > lowerName.length * 0.5) {
            return true;
        }
        
        // Check for repeated characters (like "aaaaa" or "1111")
        const repeatedPattern = /(.)\1{4,}/;
        if (repeatedPattern.test(lowerName)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if player is currently banned
     */
    isPlayerBanned() {
        return Date.now() < this.moderationData.banEndTime;
    }
    
    /**
     * Get time remaining on ban (in hours)
     */
    getBanTimeRemaining() {
        if (!this.isPlayerBanned()) return 0;
        return Math.ceil((this.moderationData.banEndTime - Date.now()) / (1000 * 60 * 60));
    }
    
    /**
     * Record a violation and apply appropriate punishment
     */
    recordViolation(inappropriateName) {
        this.moderationData.violations++;
        this.moderationData.lastViolationTime = Date.now();
        
        // Add to warning history (keep last 10)
        this.moderationData.warningHistory.unshift({
            name: inappropriateName,
            timestamp: Date.now()
        });
        if (this.moderationData.warningHistory.length > 10) {
            this.moderationData.warningHistory = this.moderationData.warningHistory.slice(0, 10);
        }
        
        // Apply ban after 3 violations
        if (this.moderationData.violations >= 3) {
            // 2 days ban (48 hours)
            this.moderationData.banEndTime = Date.now() + (48 * 60 * 60 * 1000);
            this.saveModerationData();
            return {
                banned: true,
                message: `You have been banned from the leaderboard for 2 days due to repeated inappropriate names. Ban expires in ${this.getBanTimeRemaining()} hours.`
            };
        }
        
        this.saveModerationData();
        
        const warningsLeft = 3 - this.moderationData.violations;
        return {
            banned: false,
            message: `Warning ${this.moderationData.violations}/3: Inappropriate name detected. ${warningsLeft} warning(s) remaining before a 2-day ban.`
        };
    }
    
    /**
     * Validate player name before submission
     */
    validatePlayerName(name) {
        // Check if player is banned
        if (this.isPlayerBanned()) {
            return {
                valid: false,
                message: `You are banned from the leaderboard. Ban expires in ${this.getBanTimeRemaining()} hours.`,
                banned: true
            };
        }
        
        // Check for inappropriate content
        if (this.isInappropriateName(name)) {
            const violation = this.recordViolation(name);
            return {
                valid: false,
                message: violation.message,
                banned: violation.banned
            };
        }
        
        // Name is valid
        return {
            valid: true,
            message: 'Name approved',
            banned: false
        };
    }
    
    /**
     * Save moderation data to localStorage
     */
    saveModerationData() {
        try {
            localStorage.setItem('coderunner_moderation', JSON.stringify(this.moderationData));
        } catch (error) {
            console.warn('Failed to save moderation data:', error);
        }
    }
    
    /**
     * Load moderation data from localStorage
     */
    loadModerationData() {
        try {
            const saved = localStorage.getItem('coderunner_moderation');
            if (saved) {
                const data = JSON.parse(saved);
                this.moderationData = {
                    violations: data.violations || 0,
                    lastViolationTime: data.lastViolationTime || 0,
                    banEndTime: data.banEndTime || 0,
                    warningHistory: data.warningHistory || []
                };
                
                // Reset violations if enough time has passed (30 days)
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                if (this.moderationData.lastViolationTime < thirtyDaysAgo) {
                    this.moderationData.violations = 0;
                    this.moderationData.warningHistory = [];
                    this.saveModerationData();
                }
            }
        } catch (error) {
            console.warn('Failed to load moderation data:', error);
        }
    }
    
    /**
     * Check if player has an entry in current difficulty
     */
    hasPlayerEntryInCurrentDifficulty() {
        return this.playerEntries.has(this.selectedDifficulty);
    }
      /**
     * Update player name (for name change functionality)
     */
    updatePlayerName(newName) {
        if (!newName || !newName.trim()) {
            return false;
        }
        
        // Validate new name for inappropriate content
        const validation = this.validatePlayerName(newName.trim());
        if (!validation.valid) {
            this.uploadResult = {
                success: false,
                message: validation.message
            };
            return false;
        }
        
        this.savePlayerName(newName.trim());
        this.savedPlayerName = newName.trim();
        
        // Update all player entries with the new name (offline only for now)
        if (!this.isOnline) {
            Object.keys(this.leaderboards).forEach(difficulty => {
                const entryId = this.playerEntries.get(difficulty);
                if (entryId) {
                    const entry = this.leaderboards[difficulty].find(e => e.id === entryId);
                    if (entry) {
                        entry.name = newName.trim();
                    }
                }
            });
            
            this.saveLeaderboards();
        }
        
        this.uploadResult = {
            success: true,
            message: `Player name updated to "${newName.trim()}"`
        };
        
        return true;
    }
    
    /**
     * Set up listeners for network status changes
     */
    setupNetworkListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Network connection restored');
            this.handleNetworkStatusChange(true);
        });

        window.addEventListener('offline', () => {
            console.log('Network connection lost');
            this.handleNetworkStatusChange(false);
        });

        // Periodically check connectivity (every 30 seconds when online)
        setInterval(async () => {
            if (this.isOnline && this.firebaseDatabase) {
                const hasConnection = await this.checkNetworkConnectivity();
                if (!hasConnection) {
                    this.handleNetworkStatusChange(false);
                }
            }
        }, 30000);
    }

    /**
     * Handle network status changes
     */
    async handleNetworkStatusChange(isConnected) {
        if (isConnected && this.firebaseDatabase) {
            // Try to verify actual connectivity
            const hasConnection = await this.checkNetworkConnectivity();
            this.isOnline = hasConnection;            if (hasConnection) {
                console.log('🌐 Switched to online mode');
                // Refresh leaderboards when coming back online
                await this.loadFirebaseLeaderboards();
                  // Update Game's bestScores after switching back online
                if (this.gameInstance) {
                    this.updateGameBestScores(this.gameInstance);
                }
            }
        } else {
            this.isOnline = false;
            console.log('💾 Switched to offline mode');
        }
    }
    
    /**
     * Debug function: Test content moderation with a specific name
     * Usage in console: game.leaderboardSystem.testModeration("inappropriate_name")
     */
    testModeration(testName) {
        console.log(`🧪 Testing moderation for name: "${testName}"`);
        const validation = this.validatePlayerName(testName);
        console.log('📋 Validation result:', validation);
        console.log('📊 Current moderation status:', this.getModerationStatus());
        return validation;
    }
    
    /**
     * Debug function: Force add a violation
     * Usage in console: game.leaderboardSystem.forceViolation("test_name")
     */
    forceViolation(testName = "test_inappropriate") {
        console.log(`⚠️ Forcing violation for name: "${testName}"`);
        const result = this.recordViolation(testName);
        console.log('📋 Violation result:', result);
        console.log('📊 Updated moderation status:', this.getModerationStatus());
        return result;
    }
    
    /**
     * Debug function: Show current moderation data
     * Usage in console: game.leaderboardSystem.showModerationData()
     */
    showModerationData() {        console.log('📊 Current Moderation Data:');
        console.log('- Violations:', this.moderationData.violations);
        console.log('- Last Violation:', new Date(this.moderationData.lastViolationTime));
        console.log('- Ban End Time:', new Date(this.moderationData.banEndTime));
        console.log('- Warning History:', this.moderationData.warningHistory);
        console.log('- Is Banned:', this.isPlayerBanned());
        if (this.isPlayerBanned()) {
            console.log('- Hours Remaining:', this.getBanTimeRemaining());
        }
        return this.moderationData;
    }

    /**
     * Save player name to localStorage
     */
    savePlayerName(name) {
        try {
            localStorage.setItem('coderunner_player_name', name);
            this.savedPlayerName = name;
        } catch (error) {
            console.warn('Failed to save player name:', error);
        }
    }
    
    /**
     * Load player name from localStorage
     */
    loadPlayerName() {
        try {
            const saved = localStorage.getItem('coderunner_player_name');
            if (saved) {
                this.savedPlayerName = saved;
            }
        } catch (error) {
            console.warn('Failed to load player name:', error);
        }
    }    /**
     * Get saved player name
     */    getSavedPlayerName() {        // If no saved name exists, try to get from profileManager
        if (!this.savedPlayerName && typeof window !== 'undefined' && window.profileManager && 
            typeof window.profileManager.profileData === 'object') {
            const profileName = window.profileManager.profileData.name || '';
            if (profileName && profileName.trim() && profileName !== 'Anonymous') {
                this.savedPlayerName = profileName.trim();
                this.savePlayerName(this.savedPlayerName);
                return this.savedPlayerName;
            }
        }
        return this.savedPlayerName || '';
    }
    
    /**
     * Check if player has an entry in Firebase for the specified difficulty
     * @param {string} difficulty - The difficulty level
     * @param {string} playerName - The player name
     * @returns {Promise<boolean>} - Whether the player has an entry
     */
    async checkPlayerEntryInFirebase(difficulty, playerName) {
        try {
            if (!this.firebaseDatabase) return false;
            
            const scoresRef = this.firebaseDatabase.ref(`leaderboard/${difficulty}`);
            const snapshot = await scoresRef.orderByChild('name').equalTo(playerName).once('value');
            
            return snapshot.exists();
        } catch (error) {
            console.error('Error checking player entry in Firebase:', error);
            return false;
        }
    }
    
    /**
     * Get player's highest score from Firebase for the specified difficulty
     * @param {string} difficulty - The difficulty level
     * @param {string} playerName - The player name
     * @returns {Promise<number|null>} - The player's highest score, or null if not found
     */
    async getPlayerScoreFromFirebase(difficulty, playerName) {
        try {
            if (!this.firebaseDatabase) return null;
            
            const scoresRef = this.firebaseDatabase.ref(`leaderboard/${difficulty}`);
            const snapshot = await scoresRef.orderByChild('name').equalTo(playerName).once('value');
            
            if (!snapshot.exists()) return null;
            
            let highestScore = 0;
            snapshot.forEach(childSnapshot => {
                const entry = childSnapshot.val();
                if (entry.score > highestScore) {
                    highestScore = entry.score;
                }
            });
            
            return highestScore;
        } catch (error) {
            console.error('Error getting player score from Firebase:', error);
            return null;
        }
    }
    /**
     * Get the best score for a specific difficulty
     * @param {string} difficulty - The difficulty level
     * @returns {number} - The best score for this difficulty
     */
    getBestScore(difficulty) {
        const leaderboard = this.getLeaderboard(difficulty);
        if (leaderboard.length === 0) {
            return 0;
        }
        // Leaderboard is already sorted by highest score first
        return leaderboard[0].score;
    }

    /**
     * Get best scores for all difficulties
     * @returns {Object} - Object with difficulty as key and best score as value
     */
    getAllBestScores() {
        const bestScores = {};
        Object.keys(DIFFICULTY_LEVELS).forEach(difficulty => {
            bestScores[difficulty] = this.getBestScore(difficulty);
        });
        return bestScores;
    }    /**
     * Update the Game instance's bestScores with current leaderboard data
     * @param {Game} gameInstance - The game instance to update
     */
    updateGameBestScores(gameInstance) {
        if (!gameInstance || !gameInstance.bestScores) {
            return;
        }
        
        // DO NOT overwrite the user's personal best scores with global leaderboard scores
        // The game's bestScores should represent the user's personal achievements
        // This method should only be used to compare or display global leaderboard data,
        // but not to replace personal best scores
        
        // Note: Personal best scores are managed by the Game class itself in the gameOver() method
        // and are saved/loaded through the save/load system
    }
    /**
     * Get all difficulty tabs
     */
    getDifficultyTabs() {
        return Object.keys(DIFFICULTY_LEVELS);
    }

    /**
     * Check if a particular tab is the currently selected one
     */
    isTabSelected(difficulty) {
        return this.selectedDifficulty === difficulty;
    }

    /**
     * Select a tab for difficulty
     */
    selectTab(difficulty) {
        if (DIFFICULTY_LEVELS[difficulty]) {
            this.selectedDifficulty = difficulty;
            // Refresh leaderboards when switching tabs (for live updates)
            if (this.isOnline) {
                this.refreshLeaderboards();
            }
        }
    }

    /**
     * Select a tab with smooth animation effect
     */
    selectTabWithAnimation(difficulty) {
        if (DIFFICULTY_LEVELS[difficulty] && this.selectedDifficulty !== difficulty) {
            this.selectedDifficulty = difficulty;
            
            // Add a subtle animation effect
            this.tabSwitchAnimation = {
                startTime: Date.now(),
                duration: 300,
                fromTab: this.selectedDifficulty,
                toTab: difficulty
            };
            
            // Refresh leaderboards when switching tabs (for live updates)
            if (this.isOnline) {
                this.refreshLeaderboards();
            }
            
            console.log(`📊 Switched to ${difficulty} leaderboard`);
        }
    }
    
    /**
     * Handle clicks on leaderboard entries for additional info
     */
    handleLeaderboardEntryClick(x, y) {
        // Get the current leaderboard entries
        const entries = this.getLeaderboard(this.selectedDifficulty);
        const tableWidth = 600;
        const tableX = (this.gameInstance?.canvas?.width || 800) / 2 - tableWidth / 2;
        let tableY = 170 + 30; // Start after header
        
        entries.forEach((entry, index) => {
            const entryY = tableY + (index * 40);
            
            // Check if click is within this entry's row
            if (x >= tableX - 20 && x <= tableX + tableWidth && 
                y >= entryY - 20 && y <= entryY + 20) {
                
                // Show detailed info tooltip for the entry
                this.showEntryTooltip(entry, index, x, y);
                return;
            }
        });
    }
    
    /**
     * Show tooltip with detailed entry information
     */
    showEntryTooltip(entry, rank, x, y) {
        this.entryTooltip = {
            entry: entry,
            rank: rank + 1,
            x: x,
            y: y,
            timestamp: Date.now()
        };
        
        // Auto-hide tooltip after 3 seconds
        setTimeout(() => {
            if (this.entryTooltip && this.entryTooltip.timestamp === Date.now()) {
                this.entryTooltip = null;
            }
        }, 3000);
    }
    
    /**
     * Save player entries to localStorage
     */
    savePlayerEntries() {
        try {
            const entriesObj = Object.fromEntries(this.playerEntries);
            localStorage.setItem('coderunner_player_entries', JSON.stringify(entriesObj));
        } catch (error) {
            console.warn('Failed to save player entries:', error);
        }
    }
    
    /**
     * Load player entries from localStorage
     */
    loadPlayerEntries() {
        try {
            const saved = localStorage.getItem('coderunner_player_entries');
            if (saved) {
                const entriesObj = JSON.parse(saved);
                this.playerEntries = new Map(Object.entries(entriesObj));
            }
        } catch (error) {
            console.warn('Failed to load player entries:', error);
        }
    }

    /**
     * Handle text input for player name
     */
    handleTextInput(character) {
        if (this.nameInputActive && this.playerName.length < 20) {
            this.playerName += character;
        }
    }

    /**
     * Handle backspace for player name
     */
    handleBackspace() {
        if (this.nameInputActive && this.playerName.length > 0) {
            this.playerName = this.playerName.slice(0, -1);
        }
    }
    
    /**
     * Get display name from UserProfileSystem or fall back to saved name
     */
    getDisplayName() {
        // Check if UserProfileSystem is available and user is logged in
        if (this.gameInstance && this.gameInstance.userProfileSystem) {
            const userProfile = this.gameInstance.userProfileSystem;
            if (userProfile.isLoggedIn) {
                const displayName = userProfile.getLeaderboardDisplayName();
                if (displayName && displayName !== 'Guest' && displayName !== 'Anonymous') {
                    return displayName;
                }
            }
        }
        
        // Fall back to saved player name
        const savedName = this.getSavedPlayerName();
        if (savedName) {
            return savedName;
        }
        
        // Final fallback
        return 'Anonymous';
    }
    
    /**
     * Check if user has a valid display name for leaderboard
     */
    hasValidDisplayName() {
        const displayName = this.getDisplayName();
        return displayName && displayName !== 'Anonymous' && displayName !== 'Guest';
    }
    
    /**
     * Get user authentication status
     */
    isUserAuthenticated() {
        if (this.gameInstance && this.gameInstance.userProfileSystem) {
            return this.gameInstance.userProfileSystem.isLoggedIn;
        }
        return false;
    }

    /**
     * Handle click events on the leaderboard with enhanced UI feedback
     */
    handleClick(x, y) {
        console.log('📊 Leaderboard clicked at:', x, y);
        
        // Handle difficulty tab clicks using the game's tab hit areas
        if (this.gameInstance && this.gameInstance.tabHitAreas) {
            const clickedTab = this.gameInstance.tabHitAreas.find(tab => 
                x >= tab.x && x <= tab.x + tab.width && 
                y >= tab.y && y <= tab.y + tab.height
            );
            
            if (clickedTab) {
                this.selectTabWithAnimation(clickedTab.difficulty);
                return;
            }
        }
        
        // Handle name input clicks if active
        if (this.nameInputActive) {
            // Check if clicked outside name input area to deactivate
            const nameInputArea = this.getNameInputArea();
            if (nameInputArea && 
                (x < nameInputArea.x || x > nameInputArea.x + nameInputArea.width ||
                 y < nameInputArea.y || y > nameInputArea.y + nameInputArea.height)) {
                this.nameInputActive = false;
            } else if (nameInputArea &&
                      x >= nameInputArea.x && x <= nameInputArea.x + nameInputArea.width &&
                      y >= nameInputArea.y && y <= nameInputArea.y + nameInputArea.height) {
                // Keep input active if clicked inside
                this.nameInputActive = true;
            }
        }
        
        // Handle upload button clicks
        if (this.showUploadPrompt) {
            const uploadButton = this.getUploadButtonArea();
            if (uploadButton && 
                x >= uploadButton.x && x <= uploadButton.x + uploadButton.width &&
                y >= uploadButton.y && y <= uploadButton.y + uploadButton.height) {
                this.submitScoreFromUpload(this.playerName);
                return;
            }
            
            // Handle cancel button clicks
            const cancelButton = this.getCancelButtonArea();
            if (cancelButton && 
                x >= cancelButton.x && x <= cancelButton.x + cancelButton.width &&
                y >= cancelButton.y && y <= cancelButton.y + cancelButton.height) {
                this.cancelUpload();
                return;
            }
        }
        
        // Handle leaderboard entry clicks for additional info
        this.handleLeaderboardEntryClick(x, y);
    }
    
    /**
     * Get name input area bounds
     */
    getNameInputArea() {
        if (!this.nameInputActive) return null;
        
        // Return approximate bounds for name input area
        return {
            x: 300,
            y: 300,
            width: 200,
            height: 40
        };
    }
    
    /**
     * Get upload button area bounds
     */
    getUploadButtonArea() {
        if (!this.showUploadPrompt) return null;
        
        const canvasWidth = this.gameInstance?.canvas?.width || 800;
        const canvasHeight = this.gameInstance?.canvas?.height || 600;
        
        const dialogWidth = 450;
        const dialogHeight = 350;
        const dialogX = (canvasWidth - dialogWidth) / 2;
        const dialogY = (canvasHeight - dialogHeight) / 2;
        
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonY = dialogY + 260;
        const uploadButtonX = canvasWidth / 2 - buttonWidth - 10;
        
        return {
            x: uploadButtonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }
    
    /**
     * Get cancel button area bounds
     */
    getCancelButtonArea() {
        if (!this.showUploadPrompt) return null;
        
        const canvasWidth = this.gameInstance?.canvas?.width || 800;
        const canvasHeight = this.gameInstance?.canvas?.height || 600;
        
        const dialogWidth = 450;
        const dialogHeight = 350;
        const dialogX = (canvasWidth - dialogWidth) / 2;
        const dialogY = (canvasHeight - dialogHeight) / 2;
        
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonY = dialogY + 260;
        const cancelButtonX = canvasWidth / 2 + 10;
        
        return {
            x: cancelButtonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }
    
    /**
     * Get name input area bounds
     */
    getNameInputArea() {
        if (!this.nameInputActive && !this.showUploadPrompt) return null;
        
        const canvasWidth = this.gameInstance?.canvas?.width || 800;
        const canvasHeight = this.gameInstance?.canvas?.height || 600;
        
        const dialogWidth = 450;
        const dialogHeight = 350;
        const dialogX = (canvasWidth - dialogWidth) / 2;
        const dialogY = (canvasHeight - dialogHeight) / 2;
        
        const inputBoxWidth = 350;
        const inputBoxHeight = 45;
        const inputBoxX = (canvasWidth - inputBoxWidth) / 2;
        const inputBoxY = dialogY + 190;
        
        return {
            x: inputBoxX,
            y: inputBoxY,
            width: inputBoxWidth,
            height: inputBoxHeight
        };
    }
    
    /**
     * Get the opacity of the upload result message (for fade-out effect)
     */
    getUploadResultOpacity() {
        if (!this.uploadResult || !this.uploadResultTimestamp) {
            return 0;
        }
        
        const elapsed = Date.now() - this.uploadResultTimestamp;
        const fadeStartTime = this.uploadResultDisplayTime - 1000; // Start fading 1 second before disappearing
        
        if (elapsed < fadeStartTime) {
            return 1; // Full opacity for first 2 seconds
        } else if (elapsed < this.uploadResultDisplayTime) {
            // Fade out during the last 1 second
            return 1 - (elapsed - fadeStartTime) / 1000;
        } else {
            // Clear the message after fade-out
            this.uploadResult = null;
            this.uploadResultTimestamp = 0;
            return 0;
        }
    }
    
    /**
     * Set upload result with timestamp for fade-out
     */
    setUploadResult(result) {
        this.uploadResult = result;
        this.uploadResultTimestamp = Date.now();
    }
}
