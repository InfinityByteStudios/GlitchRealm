/**
 * Firebase-enabled Leaderboard System
 * Implements the submitScore and showLeaderboard functions from LeaderBoard.MD
 */

import { DIFFICULTY_LEVELS } from '../utils/constants.js';

export class LeaderboardSystem {
    constructor() {
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
     * Initialize the leaderboard system (online or offline mode)
     */
    async initializeSystem() {
        // Check if Firebase is available
        await this.checkFirebaseConnection();
        
        // Set up network status listeners
        this.setupNetworkListeners();
          if (this.isOnline) {
            await this.loadFirebaseLeaderboards();
        } else {
            this.clearFakeSubmissions();
            this.loadLeaderboards();
        }
        
        // Always load local user preferences
        this.loadUploadHistory();
        this.loadPlayerName();
        this.loadPlayerEntries();
        
        // Load moderation data
        this.loadModerationData();
    }
    
    /**
     * Check if Firebase is available and network connectivity
     */
    async checkFirebaseConnection() {
        try {
            if (typeof window !== 'undefined' && window.firebaseDatabase) {
                this.firebaseDatabase = window.firebaseDatabase;                // Check actual network connectivity
                const hasConnection = await this.checkNetworkConnectivity();
                this.isOnline = hasConnection;
            } else {
                this.isOnline = false;
            }        } catch (error) {
            this.isOnline = false;
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
            return true;        } catch (error) {
            return false;
        }
    }
    
    /**
     * Firebase submitScore function as specified in LeaderBoard.MD task 3
     */    async submitScore(name, score, difficulty = this.selectedDifficulty, survivalTime = 0) {
        if (!this.isOnline || !this.firebaseDatabase) {
            return this.submitScoreOffline(name, score, difficulty, survivalTime);
        }        try {
            const scoresRef = this.firebaseDatabase.ref(`leaderboard/${difficulty}`);
            
            const newScore = {
                name: name,
                score: score,
                survivalTime: survivalTime,
                timestamp: Date.now()
            };
            
            // Push to Firebaseawait scoresRef.push(newScore);
            
            // Update local tracking
            this.uploadedDifficulties.add(difficulty);
            this.savePlayerName(name);
            this.saveUploadHistory();
            
            // Refresh local leaderboards
            await this.loadFirebaseLeaderboards();
            
            return true;        } catch (error) {
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
                    }
                });
            }        } catch (error) {
            this.isOnline = false;
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
     * Check if player can upload for a specific difficulty
     */
    canUploadForDifficulty(difficulty) {
        return !this.uploadedDifficulties.has(difficulty);
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
            } else {
                this.uploadResult = {
                    success: false,
                    message: 'Upload failed! Please try again later.'
                };
            }
            
            return success;
              } catch (error) {
            this.uploadResult = {
                success: false,
                message: 'Upload failed! Please try again later.'
            };
            return false;
        } finally {
            this.isUploading = false;
        }
    }
      /**
     * Submit score offline (fallback method)
     */
    async submitScoreOffline(playerName, score, difficulty, survivalTime) {
        // Simulate API upload delay        await this.simulateUpload();
        
        const entry = {
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
        this.currentUpload = null;
        this.playerName = '';
        this.nameInputActive = false;
        this.uploadResult = null;
    }
    
    /**
     * Clear upload result message
     */
    clearResult() {
        this.uploadResult = null;
    }
    
    /**
     * Save leaderboards to localStorage (offline mode)
     */
    saveLeaderboards() {        try {
            localStorage.setItem('coderunner_leaderboards', JSON.stringify(this.leaderboards));
        } catch (error) {
            // Failed to save leaderboards
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
            // Failed to load leaderboards
        }
    }
    
    /**
     * Save upload history to localStorage
     */
    saveUploadHistory() {
        try {
            localStorage.setItem('coderunner_uploads', JSON.stringify([...this.uploadedDifficulties]));        } catch (error) {
            // Failed to save upload history
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
            }        } catch (error) {
            // Failed to load upload history
        }
    }
    
    /**
     * Clear any fake submissions from localStorage
     */
    clearFakeSubmissions() {
        const noFakeDataFlag = localStorage.getItem('coderunner_no_fake_data');
        
        if (!noFakeDataFlag) {
            try {
                localStorage.removeItem('coderunner_leaderboards');                localStorage.setItem('coderunner_no_fake_data', 'true');
            } catch (error) {
                // Failed to clear legacy data
            }
            
            Object.keys(this.leaderboards).forEach(difficulty => {
                this.leaderboards[difficulty] = [];
            });
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
     * Check if a particular tab is the currently selected one
     */
    isTabSelected(difficulty) {
        return this.selectedDifficulty === difficulty;
    }
    
    /**
     * Select a tab for difficulty
     */    selectTab(difficulty) {
        if (DIFFICULTY_LEVELS[difficulty]) {
            this.selectedDifficulty = difficulty;
            // Refresh leaderboards when switching tabs (for live updates)
            if (this.isOnline) {
                this.refreshLeaderboards();
            }
        }
    }
    
    /**
     * Get all difficulty tabs
     */
    getDifficultyTabs() {
        return Object.keys(DIFFICULTY_LEVELS);
    }
    
    /**
     * Save player name to localStorage
     */
    savePlayerName(name) {
        try {
            localStorage.setItem('coderunner_player_name', name);
            this.savedPlayerName = name;        } catch (error) {
            // Failed to save player name
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
            }        } catch (error) {
            // Failed to load player name
        }
    }
      /**
     * Get saved player name
     */
    getSavedPlayerName() {        // If no saved name exists, try to get from profileManager
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
     * Save player entries to localStorage
     */
    savePlayerEntries() {
        try {
            const entriesObj = Object.fromEntries(this.playerEntries);
            localStorage.setItem('coderunner_player_entries', JSON.stringify(entriesObj));        } catch (error) {
            // Failed to save player entries
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
            }        } catch (error) {
            // Failed to load player entries
        }
    }
    
    /**
     * Delete player's entry from current difficulty
     */
    async deletePlayerEntry() {
        const difficulty = this.selectedDifficulty;
        const entryId = this.playerEntries.get(difficulty);
        
        if (!entryId) {
            return false;
        }
        
        // For now, only support offline deletion
        return this.deletePlayerEntryOffline(difficulty, entryId);
    }
    
    /**
     * Delete player entry offline
     */
    deletePlayerEntryOffline(difficulty, entryId) {
        // Remove from leaderboard
        this.leaderboards[difficulty] = this.leaderboards[difficulty].filter(entry => entry.id !== entryId);
        
        // Remove from player entries
        this.playerEntries.delete(difficulty);
        
        // Remove from uploaded difficulties (allow re-upload)
        this.uploadedDifficulties.delete(difficulty);
        
        // Save changes
        this.saveLeaderboards();
        this.saveUploadHistory();
        this.savePlayerEntries();
        
        this.uploadResult = {
            success: true,
            message: `Your ${DIFFICULTY_LEVELS[difficulty].name} entry has been deleted.`
        };
        
        return true;
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
            // Network connection restored
            this.handleNetworkStatusChange(true);
        });

        window.addEventListener('offline', () => {
            // Network connection lost
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
            this.isOnline = hasConnection;
            if (hasConnection) {
                // Switched to online mode
                // Refresh leaderboards when coming back online
                await this.loadFirebaseLeaderboards();
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
    showModerationData() {
        console.log('📊 Current Moderation Data:');
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
}
