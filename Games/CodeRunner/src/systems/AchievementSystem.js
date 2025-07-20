
/**
 * Achievement System for CodeRunner
 * Tracks and unlocks achievements based on player progress
 */

export class AchievementSystem {
    constructor(gameInstance = null) {
        this.gameInstance = gameInstance;
        
        // Achievement storage
        this.unlockedAchievements = new Set();
        this.achievementProgress = new Map();
        
        // Track statistics across all runs
        this.stats = {
            totalRuns: 0,
            totalDataPacketsCollected: 0,
            bestDistance: 0,
            bestTime: 0,
            totalDeaths: 0,
            deathsUnder100m: 0,
            runsOver500m: 0,
            runsOver2000m: 0,
            customizationsUsed: new Set(), // Tracks which customizations have been used
            profileNameSet: false
        };
          // Visual notification system
        this.activeNotifications = [];
        this.notificationTimer = 0;
        
        // Prevent double-loading
        this.hasLoadedData = false;
        
        // Initialize achievement definitions FIRST
        this.achievements = this.initializeAchievements();
        console.log('🏆 Achievements initialized:', Object.keys(this.achievements).length, 'achievements');
        console.log('🏆 Sample achievement:', Object.values(this.achievements)[0]);
        
        // Load saved achievement data on initialization
        this.loadAchievementData();
        console.log(`🏆 AchievementSystem constructor: loaded ${this.unlockedAchievements.size} achievements, totalRuns: ${this.stats.totalRuns}`);
    }
    
    /**
     * Initialize all achievement definitions
     */
    initializeAchievements() {
        return {
            // 🏆 Core Progress Achievements
            'booted-up': {
                id: 'booted-up',
                name: 'Booted Up',
                description: 'Make your first run.',
                icon: '🚀',
                category: 'progress',
                unlocked: false,
                condition: () => this.stats.totalRuns >= 1
            },
            
            'packet-runner': {
                id: 'packet-runner',
                name: 'Packet Runner',
                description: 'Reach 500m in a single run.',
                icon: '📦',
                category: 'progress',
                unlocked: false,
                condition: () => this.stats.bestDistance >= 500
            },
            
            'mainframe-breaker': {
                id: 'mainframe-breaker',
                name: 'Mainframe Breaker',
                description: 'Reach 2000m in one run.',
                icon: '💻',
                category: 'progress',
                unlocked: false,
                condition: () => this.stats.bestDistance >= 2000
            },
            
            // 💀 Death-Based Achievements
            '404-skill-not-found': {
                id: '404-skill-not-found',
                name: '404 – Skill Not Found',
                description: 'Die within the first 100m.',
                icon: '💀',
                category: 'death',
                unlocked: false,
                condition: () => this.stats.deathsUnder100m >= 1
            },
            
            // 🧠 Meta Achievements
            'collector-glitch': {
                id: 'collector-glitch',
                name: 'Collector Glitch',
                description: 'Collect 10,000 datapack total across all runs.',
                icon: '💾',
                category: 'meta',
                unlocked: false,
                condition: () => this.stats.totalDataPacketsCollected >= 10000
            },
            
            'data-godspeed': {
                id: 'data-godspeed',
                name: 'Data Godspeed',
                description: 'Reach 1000m in under 2 minutes.',
                icon: '⚡',
                category: 'meta',
                unlocked: false,
                condition: () => this.stats.bestTime > 0 && this.stats.bestTime <= 120 && this.stats.bestDistance >= 1000
            }
        };
    }
    
    /**
     * Initialize the achievement system
     */
    async initializeSystem() {
        console.log('🏆 Initializing Achievement System...');
        
        // Load saved achievement data
        this.loadAchievementData();
        
        console.log(`🏆 Achievement System initialized. ${this.unlockedAchievements.size} achievements unlocked.`);
    }
    
    /**
     * Set the Game instance reference
     */
    setGameInstance(gameInstance) {
        this.gameInstance = gameInstance;
    }
      /**
     * Track when a new game starts
     */
    onGameStart() {
        console.log(`🚀 onGameStart called - current totalRuns: ${this.stats.totalRuns}`);
        this.stats.totalRuns++;
        console.log(`🚀 after increment - totalRuns: ${this.stats.totalRuns}`);
        this.checkAchievements();
        this.saveAchievementData();
    }
    
    /**
     * Track when a game ends
     */
    onGameEnd(finalScore, survivalTime, startTime) {
        const distance = finalScore;
        const timeInSeconds = survivalTime;
        
        // Update best distance
        if (distance > this.stats.bestDistance) {
            this.stats.bestDistance = distance;
        }
        
        // Update best time for 1000m+ runs
        if (distance >= 1000) {
            if (this.stats.bestTime === 0 || timeInSeconds < this.stats.bestTime) {
                this.stats.bestTime = timeInSeconds;
            }
        }
        
        // Track death statistics
        this.stats.totalDeaths++;
        if (distance < 100) {
            this.stats.deathsUnder100m++;
        }
        
        // Track milestone runs
        if (distance >= 500) {
            this.stats.runsOver500m++;
        }
        if (distance >= 2000) {
            this.stats.runsOver2000m++;
        }
        
        // Check for newly unlocked achievements
        this.checkAchievements();
        this.saveAchievementData();
    }
    
    /**
     * Track data packet collection
     */
    onDataPacketCollected(points) {
        this.stats.totalDataPacketsCollected += points;
        this.checkAchievements();
        this.saveAchievementData();
    }
    
    /**
     * Track cosmetic equipping
     */
    onCosmeticEquipped(upgradeId) {
        this.stats.customizationsUsed.add(upgradeId);
        this.checkAchievements();
        this.saveAchievementData();
    }
    
    /**
     * Track profile name setting
     */
    onProfileNameSet(name) {
        if (name && name.trim().length > 0) {
            this.stats.profileNameSet = true;
            this.checkAchievements();
            this.saveAchievementData();
        }
    }
    
    /**
     * Track custom profile picture creation
     */
    onCustomProfilePicture() {
        this.stats.customizationsUsed.add('custom-profile-picture');
        this.checkAchievements();
        this.saveAchievementData();
    }
    
    /**
     * Check all achievements and unlock any that meet conditions
     */
    checkAchievements() {
        const newlyUnlocked = [];
        
        for (const [id, achievement] of Object.entries(this.achievements)) {
            if (!this.unlockedAchievements.has(id) && achievement.condition()) {
                this.unlockAchievement(id);
                newlyUnlocked.push(achievement);
            }
        }
        
        // Show notifications for newly unlocked achievements
        newlyUnlocked.forEach(achievement => {
            this.showAchievementNotification(achievement);
        });
        
        return newlyUnlocked;
    }
      /**
     * Unlock a specific achievement
     */
    unlockAchievement(achievementId) {
        console.log(`🔓 unlockAchievement called for: ${achievementId}, already unlocked: ${this.unlockedAchievements.has(achievementId)}`);
        
        if (this.unlockedAchievements.has(achievementId)) {
            return false; // Already unlocked
        }
        
        this.unlockedAchievements.add(achievementId);
        this.achievements[achievementId].unlocked = true;
          console.log(`🏆 Achievement unlocked: ${this.achievements[achievementId].name}`);
        
        // Show achievement hint for first-time unlock
        if (this.gameInstance && this.gameInstance.tutorialSystem) {
            this.gameInstance.tutorialSystem.showAchievementHint();
        }
        
        // Play achievement sound if available
        if (this.gameInstance && this.gameInstance.audioSystem) {
            this.gameInstance.audioSystem.onPowerup(); // Reuse powerup sound for achievements
        }
        
        // Check if all achievements are now unlocked and notify character customization
        const totalAchievements = Object.keys(this.achievements).length;
        const unlockedCount = this.unlockedAchievements.size;
        
        if (this.gameInstance && this.gameInstance.characterCustomizationSystem) {
            this.gameInstance.characterCustomizationSystem.updateUnlockStatus();
            
            // Special notification for 100% completion
            if (unlockedCount >= totalAchievements) {
                console.log('🎉 100% ACHIEVEMENTS UNLOCKED! King Runner is now available!');
            }
        }
        
        return true;
    }
      /**
     * Show achievement notification
     */
    showAchievementNotification(achievement) {
        console.log(`🎉 Showing achievement notification for: ${achievement.name}`);
        
        const notification = {
            achievement: achievement,
            timer: 0,
            maxTimer: 5000, // Show for 5 seconds
            alpha: 1.0,
            y: 100,
            slideIn: true
        };
        
        this.activeNotifications.push(notification);
        
        // Limit to 3 notifications on screen
        if (this.activeNotifications.length > 3) {
            this.activeNotifications.shift();
        }
    }
    
    /**
     * Update achievement notifications
     */
    updateNotifications(deltaTime) {
        for (let i = this.activeNotifications.length - 1; i >= 0; i--) {
            const notification = this.activeNotifications[i];
            notification.timer += deltaTime;
            
            // Handle slide-in animation
            if (notification.slideIn && notification.timer < 500) {
                // Slide in from right
                notification.x = 300 - (notification.timer / 500) * 300;
            } else {
                notification.slideIn = false;
                notification.x = 0;
            }
            
            // Handle fade-out
            if (notification.timer > notification.maxTimer - 1000) {
                notification.alpha = Math.max(0, 1 - (notification.timer - (notification.maxTimer - 1000)) / 1000);
            }
            
            // Remove expired notifications
            if (notification.timer >= notification.maxTimer) {
                this.activeNotifications.splice(i, 1);
            }
        }
    }
    
    /**
     * Render achievement notifications
     */
    renderNotifications(ctx, canvasWidth) {
        if (!this.activeNotifications.length) return;
        
        ctx.save();
        
        this.activeNotifications.forEach((notification, index) => {
            const achievement = notification.achievement;
            const x = canvasWidth - 320 + (notification.x || 0);
            const y = 50 + (index * 80);
            
            // Background
            ctx.fillStyle = `rgba(0, 20, 40, ${0.9 * notification.alpha})`;
            ctx.fillRect(x, y, 300, 70);
            
            // Border
            ctx.strokeStyle = `rgba(0, 150, 255, ${notification.alpha})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, 300, 70);
            
            // Achievement icon
            ctx.font = '24px Arial';
            ctx.fillStyle = `rgba(255, 255, 255, ${notification.alpha})`;
            ctx.fillText(achievement.icon, x + 10, y + 35);
            
            // Achievement unlocked text
            ctx.font = 'bold 12px Courier New';
            ctx.fillStyle = `rgba(255, 215, 0, ${notification.alpha})`;
            ctx.fillText('ACHIEVEMENT UNLOCKED!', x + 50, y + 20);
            
            // Achievement name
            ctx.font = 'bold 14px Courier New';
            ctx.fillStyle = `rgba(255, 255, 255, ${notification.alpha})`;
            ctx.fillText(achievement.name, x + 50, y + 40);
            
            // Achievement description with text wrapping
            ctx.font = '11px Courier New';
            ctx.fillStyle = `rgba(200, 200, 200, ${notification.alpha})`;
            
            // Use text wrapping for long descriptions
            const maxDescWidth = 200; // Limit description width
            const descLines = this.wrapText(ctx, achievement.description, maxDescWidth);
            
            descLines.forEach((line, index) => {
                ctx.fillText(line, x + 50, y + 55 + (index * 12));
            });
        });
        
        ctx.restore();
    }
    
    /**
     * Wrap text to fit within a specified width
     */
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    /**
     * Get achievement statistics for display
     */
    getStats() {
        const total = Object.keys(this.achievements).length;
        const unlocked = this.unlockedAchievements.size;
        const progress = Math.round((unlocked / total) * 100);
        
        return {
            total,
            unlocked,
            progress,
            stats: { ...this.stats }
        };
    }
    
    /**
     * Get all achievements with their unlock status
     */
    getAllAchievements() {
        return Object.values(this.achievements).map(achievement => ({
            ...achievement,
            unlocked: this.unlockedAchievements.has(achievement.id)
        }));
    }
    
    /**
     * Get achievements by category
     */
    getAchievementsByCategory(category) {
        return this.getAllAchievements().filter(achievement => achievement.category === category);
    }
    
    /**
     * Check if a specific achievement is unlocked
     */
    isAchievementUnlocked(achievementId) {
        return this.unlockedAchievements.has(achievementId);
    }
    
    /**
     * Save achievement data to localStorage
     */
    saveAchievementData() {
        try {
            const data = {
                unlockedAchievements: Array.from(this.unlockedAchievements),
                stats: {
                    ...this.stats,
                    customizationsUsed: Array.from(this.stats.customizationsUsed)
                },
                timestamp: Date.now()
            };
            
            localStorage.setItem('coderunner_achievements', JSON.stringify(data));
            
            // Trigger comprehensive cloud save if user is logged in
            if (this.gameInstance && this.gameInstance.cloudSaveSystem && this.gameInstance.cloudSaveSystem.isUserLoggedIn()) {
                this.gameInstance.cloudSaveSystem.saveAllGameData().catch(error => {
                    console.warn('Failed to save achievement data to cloud:', error);
                });
            }
        } catch (error) {
            console.warn('Failed to save achievement data:', error);
        }
    }
      /**
     * Load achievement data from localStorage
     */
    loadAchievementData() {
        if (this.hasLoadedData) {
            console.log('🏆 loadAchievementData: already loaded, skipping');
            return;
        }
        
        try {
            const saved = localStorage.getItem('coderunner_achievements');
            if (saved) {
                const data = JSON.parse(saved);
                
                // Load unlocked achievements
                if (Array.isArray(data.unlockedAchievements)) {
                    this.unlockedAchievements = new Set(data.unlockedAchievements);
                    
                    // Update achievement objects
                    data.unlockedAchievements.forEach(id => {
                        if (this.achievements[id]) {
                            this.achievements[id].unlocked = true;
                        }
                    });
                }
                
                // Load stats
                if (data.stats) {
                    this.stats = {
                        ...this.stats,
                        ...data.stats,
                        customizationsUsed: new Set(data.stats.customizationsUsed || [])
                    };
                }
                
                console.log(`🏆 Loaded ${this.unlockedAchievements.size} unlocked achievements from localStorage`);
            } else {
                console.log('🏆 No saved achievement data found in localStorage');
            }
            
            this.hasLoadedData = true;
        } catch (error) {
            console.warn('Failed to load achievement data:', error);
        }
    }
      /**
     * Load saved data from unified save system
     */
    loadSavedData(achievementData) {
        console.log('🏆 loadSavedData called, hasLoadedData:', this.hasLoadedData);
        
        try {
            if (achievementData && typeof achievementData === 'object') {
                console.log('🏆 Loading achievements from unified save:', achievementData);
                
                // Load unlocked achievements
                if (Array.isArray(achievementData.unlockedAchievements)) {
                    this.unlockedAchievements = new Set(achievementData.unlockedAchievements);
                    
                    // Update achievement objects
                    achievementData.unlockedAchievements.forEach(id => {
                        if (this.achievements[id]) {
                            this.achievements[id].unlocked = true;
                        }
                    });
                }
                
                // Load stats
                if (achievementData.stats) {
                    this.stats = {
                        ...this.stats,
                        ...achievementData.stats,
                        customizationsUsed: new Set(achievementData.stats.customizationsUsed || [])
                    };
                }
                
                // Also save to individual localStorage for compatibility
                this.saveAchievementData();
                this.hasLoadedData = true;
                
                console.log(`🏆 Loaded ${this.unlockedAchievements.size} achievements from unified save, totalRuns: ${this.stats.totalRuns}`);
            }
        } catch (error) {
            console.warn('Failed to load achievement data from unified save:', error);
        }
    }
    
    /**
     * Get achievement data for unified save system
     */
    getSaveData() {
        return {
            unlockedAchievements: Array.from(this.unlockedAchievements),
            stats: {
                ...this.stats,
                customizationsUsed: Array.from(this.stats.customizationsUsed)
            }
        };
    }
    
    /**
     * Debug function: Force unlock an achievement
     */
    debugUnlockAchievement(achievementId) {
        if (this.achievements[achievementId]) {
            this.unlockAchievement(achievementId);
            this.showAchievementNotification(this.achievements[achievementId]);
            this.saveAchievementData();
            console.log(`🧪 Debug: Unlocked achievement ${achievementId}`);
            return true;
        }
        console.warn(`🧪 Debug: Achievement ${achievementId} not found`);
        return false;
    }
    
    /**
     * Debug function: Reset all achievements
     */
    debugResetAchievements() {
        this.unlockedAchievements.clear();
        this.stats = {
            totalRuns: 0,
            totalDataPacketsCollected: 0,
            bestDistance: 0,
            bestTime: 0,
            totalDeaths: 0,
            deathsUnder100m: 0,
            runsOver500m: 0,
            runsOver2000m: 0,
            customizationsUsed: new Set(),
            profileNameSet: false
        };
        
        Object.values(this.achievements).forEach(achievement => {
            achievement.unlocked = false;
        });
        
        this.saveAchievementData();
        console.log('🧪 Debug: All achievements reset');
    }
    
    /**
     * Track events and update achievement progress
     */
    trackEvent(eventType, data = {}) {
        switch (eventType) {
            case 'gameStart':
                this.onGameStart();
                break;
                
            case 'gameEnd':
                if (data.distance && data.runTime) {
                    this.onGameEnd(data.distance, data.runTime / 1000, 0);
                }
                break;
                
            case 'dataPacketCollected':
                if (data.points) {
                    this.onDataPacketCollected(data.points);
                }
                break;
                
            case 'cosmeticEquipped':
                if (data.upgradeId) {
                    this.onCosmeticEquipped(data.upgradeId);
                }
                break;
                
            case 'profileNameSet':
                if (data.name) {
                    this.onProfileNameSet(data.name);
                }
                break;
                
            case 'customProfilePicture':
                this.onCustomProfilePicture();
                break;
        }
    }
    
    /**
     * Update method called from game loop
     */
    update(deltaTime) {
        this.updateNotifications(deltaTime);
    }
      /**
     * Draw the achievements screen with modern, beautiful design
     */
    drawAchievementsScreen(ctx, width, height, hitAreas = []) {
        // Clear hit areas
        hitAreas.length = 0;
        
        ctx.save();
        
        // Advanced animated background with multiple layers
        const time = Date.now() * 0.001;
        
        // Deep space gradient background
        const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        bgGradient.addColorStop(0, 'rgba(15, 20, 25, 0.98)');
        bgGradient.addColorStop(0.4, 'rgba(21, 32, 43, 0.96)');
        bgGradient.addColorStop(0.8, 'rgba(13, 17, 23, 0.98)');
        bgGradient.addColorStop(1, 'rgba(8, 12, 16, 0.99)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Animated neural network background pattern
        for (let i = 0; i < 20; i++) {
            const angle = time * 0.1 + i * 0.3;
            const x = width/2 + Math.cos(angle) * (150 + i * 15);
            const y = height/2 + Math.sin(angle * 0.7) * (100 + i * 10);
            const alpha = 0.02 + Math.sin(time * 2 + i) * 0.01;
            const size = 1 + Math.sin(time * 0.8 + i) * 0.5;
            
            ctx.fillStyle = `rgba(88, 166, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Connect nearby particles
            for (let j = i + 1; j < Math.min(i + 3, 20); j++) {
                const angle2 = time * 0.1 + j * 0.3;
                const x2 = width/2 + Math.cos(angle2) * (150 + j * 15);
                const y2 = height/2 + Math.sin(angle2 * 0.7) * (100 + j * 10);
                const distance = Math.sqrt((x2 - x) ** 2 + (y2 - y) ** 2);
                
                if (distance < 80) {
                    ctx.strokeStyle = `rgba(88, 166, 255, ${alpha * 0.3})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        }
        
        // Floating code symbols for theme
        const codeSymbols = ['{ }', '< >', '[ ]', '( )', '=', ';', '++', '--', '&&', '||'];
        for (let i = 0; i < 12; i++) {
            const x = 50 + (i * (width - 100) / 11) + Math.sin(time + i) * 20;
            const y = 30 + Math.cos(time * 0.5 + i * 0.8) * 15;
            const alpha = 0.05 + Math.sin(time * 1.5 + i) * 0.03;
            
            ctx.fillStyle = `rgba(121, 192, 255, ${alpha})`;
            ctx.font = '14px "Consolas", "Monaco", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(codeSymbols[i % codeSymbols.length], x, y);
        }
        
        // Advanced header with multiple effects
        ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        
        // Text shadow/glow effect with multiple layers
        ctx.shadowColor = 'rgba(88, 166, 255, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(88, 166, 255, 0.3)';
        ctx.fillText('🏆 ACHIEVEMENTS', width / 2, 60);
        
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(121, 192, 255, 0.7)';
        ctx.fillText('🏆 ACHIEVEMENTS', width / 2, 60);
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f0f6fc';
        ctx.fillText('🏆 ACHIEVEMENTS', width / 2, 60);
        
        // Subtitle with pulsing effect
        const pulseAlpha = 0.6 + Math.sin(time * 2) * 0.3;
        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = `rgba(139, 148, 158, ${pulseAlpha})`;
        ctx.fillText('Track your coding journey milestones', width / 2, 85);
        
        // Progress statistics with enhanced design
        const totalAchievements = Object.keys(this.achievements).length;
        const unlockedCount = this.unlockedAchievements.size;
        const progressPercent = totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0;
        
        // Advanced progress bar with animated elements
        const progressBarWidth = 400;
        const progressBarHeight = 16;
        const progressBarX = (width - progressBarWidth) / 2;
        const progressBarY = 105;
        
        // Progress bar outer glow
        ctx.shadowColor = 'rgba(88, 166, 255, 0.3)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(33, 38, 45, 0.8)';
        this.drawRoundedRect(ctx, progressBarX - 2, progressBarY - 2, progressBarWidth + 4, progressBarHeight + 4, 10);
        ctx.shadowBlur = 0;
        
        // Progress bar background with inner shadow effect
        ctx.fillStyle = 'rgba(139, 148, 158, 0.15)';
        this.drawRoundedRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, 8);
        
        // Progress bar fill with advanced gradient and animation
        if (progressPercent > 0) {
            const fillWidth = (progressPercent / 100) * progressBarWidth;
            const progressGradient = ctx.createLinearGradient(progressBarX, 0, progressBarX + fillWidth, 0);
            
            // Animated gradient with time-based color shifts
            const hue1 = 210 + Math.sin(time * 0.5) * 10;
            const hue2 = 200 + Math.cos(time * 0.7) * 15;
            progressGradient.addColorStop(0, `hsl(${hue1}, 88%, 65%)`);
            progressGradient.addColorStop(0.5, `hsl(${hue2}, 85%, 75%)`);
            progressGradient.addColorStop(1, `hsl(${hue1 + 10}, 90%, 85%)`);
            
            ctx.fillStyle = progressGradient;
            this.drawRoundedRect(ctx, progressBarX, progressBarY, fillWidth, progressBarHeight, 8);
            
            // Animated progress bar shimmer effect
            const shimmerX = progressBarX + (Math.sin(time * 2) * 0.5 + 0.5) * fillWidth;
            const shimmerGradient = ctx.createLinearGradient(shimmerX - 20, 0, shimmerX + 20, 0);
            shimmerGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            shimmerGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
            shimmerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = shimmerGradient;
            this.drawRoundedRect(ctx, progressBarX, progressBarY, fillWidth, progressBarHeight, 8);
        }
        
        // Enhanced progress text with dynamic coloring
        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        const textColor = progressPercent > 80 ? '#22c55e' : progressPercent > 50 ? '#58A6FF' : '#7d8590';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(`${unlockedCount}/${totalAchievements} Unlocked (${progressPercent.toFixed(1)}%)`, width / 2, 138);
        
        // Category filter buttons with enhanced design
        this.drawCategoryFilters(ctx, width, hitAreas, time);
        
        // Draw achievements grid with time parameter for animations
        this.drawAchievementsGrid(ctx, width, height, hitAreas, time);
        
        // Enhanced back button and scroll indicators
        this.drawBackButton(ctx, width, height, hitAreas, time);
        this.drawScrollIndicators(ctx, width, height, time);
        
        ctx.restore();
    }

    /**
     * Draw category filter buttons with enhanced animations
     */
    drawCategoryFilters(ctx, width, hitAreas, time = 0) {
        const categories = [
            { id: 'all', name: 'All', icon: '🌟' },
            { id: 'progress', name: 'Progress', icon: '🚀' },
            { id: 'death', name: 'Death', icon: '💀' },
            { id: 'customization', name: 'Style', icon: '🎨' },
            { id: 'meta', name: 'Meta', icon: '🧠' }
        ];
        
        const currentCategory = this.gameInstance?.achievementCategory || this.currentCategoryFilter || 'all';
        const buttonWidth = 120;
        const buttonHeight = 38;
        const buttonSpacing = 10;
        const totalButtonsWidth = categories.length * buttonWidth + (categories.length - 1) * buttonSpacing;
        const startX = (width - totalButtonsWidth) / 2;
        const startY = 155;
        
        categories.forEach((category, index) => {
            const buttonX = startX + index * (buttonWidth + buttonSpacing);
            const buttonY = startY;
            const isActive = currentCategory === category.id;
            
            // Button hover/animation effect
            const hoverOffset = Math.sin(time * 3 + index) * 1;
            const animatedY = buttonY + (isActive ? -2 : 0) + hoverOffset;
            
            // Enhanced button background with gradient and glow
            if (isActive) {
                // Active button glow
                ctx.shadowColor = 'rgba(88, 166, 255, 0.6)';
                ctx.shadowBlur = 15;
                
                const gradient = ctx.createLinearGradient(buttonX, animatedY, buttonX, animatedY + buttonHeight);
                gradient.addColorStop(0, 'rgba(88, 166, 255, 0.9)');
                gradient.addColorStop(0.5, 'rgba(88, 166, 255, 0.8)');
                gradient.addColorStop(1, 'rgba(88, 166, 255, 0.7)');
                ctx.fillStyle = gradient;
            } else {
                ctx.shadowBlur = 0;
                const gradient = ctx.createLinearGradient(buttonX, animatedY, buttonX, animatedY + buttonHeight);
                gradient.addColorStop(0, 'rgba(33, 38, 45, 0.9)');
                gradient.addColorStop(1, 'rgba(21, 25, 30, 0.8)');
                ctx.fillStyle = gradient;
            }
            
            this.drawRoundedRect(ctx, buttonX, animatedY, buttonWidth, buttonHeight, 10);
            ctx.shadowBlur = 0;
            
            // Enhanced button border with animation
            ctx.strokeStyle = isActive ? '#58A6FF' : '#30363d';
            ctx.lineWidth = isActive ? 2.5 : 1;
            this.strokeRoundedRect(ctx, buttonX, animatedY, buttonWidth, buttonHeight, 10);
            
            // Animated icon with pulse effect
            const iconScale = isActive ? 1 + Math.sin(time * 4) * 0.1 : 1;
            ctx.font = `${Math.floor(18 * iconScale)}px "Segoe UI Emoji", Arial, sans-serif`;
            ctx.fillStyle = isActive ? '#ffffff' : '#7d8590';
            ctx.textAlign = 'center';
            ctx.fillText(category.icon, buttonX + 25, animatedY + 25);
            
            // Button text with subtle animation
            ctx.font = `${isActive ? 'bold ' : ''}13px "Segoe UI", Arial, sans-serif`;
            ctx.fillStyle = isActive ? '#ffffff' : '#7d8590';
            ctx.fillText(category.name, buttonX + buttonWidth - 35, animatedY + 25);
            
            // Active indicator line
            if (isActive) {
                const lineWidth = 30 + Math.sin(time * 2) * 5;
                const lineX = buttonX + (buttonWidth - lineWidth) / 2;
                const lineY = animatedY + buttonHeight + 5;
                
                ctx.fillStyle = '#58A6FF';
                this.drawRoundedRect(ctx, lineX, lineY, lineWidth, 2, 1);
            }
            
            // Add hit area
            hitAreas.push({
                x: buttonX,
                y: animatedY,
                width: buttonWidth,
                height: buttonHeight,
                action: 'filter',
                category: category.id
            });
        });
    }

    /**
     * Draw the achievements grid with enhanced animations and modern card design
     */
    drawAchievementsGrid(ctx, width, height, hitAreas, time = 0) {
        const currentCategory = this.gameInstance?.achievementCategory || this.currentCategoryFilter || 'all';
        const achievementList = Object.values(this.achievements);
        
        // Filter achievements by category
        const filteredAchievements = currentCategory === 'all' ? 
            achievementList : 
            achievementList.filter(achievement => achievement.category === currentCategory);
        
        // Sort achievements (unlocked first, then by rarity)
        const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
        filteredAchievements.sort((a, b) => {
            const aUnlocked = this.unlockedAchievements.has(a.id);
            const bUnlocked = this.unlockedAchievements.has(b.id);
            
            if (aUnlocked !== bUnlocked) {
                return bUnlocked - aUnlocked; // Unlocked first
            }
            return rarityOrder[b.rarity || 'common'] - rarityOrder[a.rarity || 'common']; // Then by rarity
        });
        
        // Grid layout parameters with better spacing
        const cardWidth = 340;
        const cardHeight = 110;
        const padding = 20;
        const cols = Math.floor((width - padding * 2) / (cardWidth + padding));
        const actualCols = Math.max(1, Math.min(cols, 3)); // Limit to max 3 columns for better layout
        const startX = (width - (actualCols * cardWidth + (actualCols - 1) * padding)) / 2;
        const startY = 215;
        
        // Scroll offset
        const scrollOffset = this.gameInstance?.achievementsScrollOffset || 0;
        
        // Draw achievement cards with staggered animations
        filteredAchievements.forEach((achievement, index) => {
            const row = Math.floor(index / actualCols);
            const col = index % actualCols;
            const x = startX + col * (cardWidth + padding);
            const y = startY + row * (cardHeight + padding) - scrollOffset;
            
            // Skip if not visible
            if (y + cardHeight < 0 || y > height) return;
            
            // Staggered entrance animation effect
            const animationDelay = index * 0.1;
            const cardTime = time + animationDelay;
            
            this.drawEnhancedAchievementCard(ctx, achievement, x, y, cardWidth, cardHeight, cardTime, index);
            
            // Add hit area for clickable achievements
            hitAreas.push({
                x: x,
                y: y,
                width: cardWidth,
                height: cardHeight,
                action: 'achievement',
                achievementId: achievement.id
            });
        });
    }

    /**
     * Draw enhanced achievement card with advanced animations and stunning visual effects
     */
    drawEnhancedAchievementCard(ctx, achievement, x, y, width, height, time = 0, index = 0) {
        const isUnlocked = this.unlockedAchievements.has(achievement.id);
        const rarity = achievement.rarity || 'common';
        
        // Enhanced rarity colors with more vibrant schemes and animations
        const rarityColors = {
            common: { 
                bg: 'rgba(139, 148, 158, 0.15)', 
                border: '#8B949E', 
                glow: 'rgba(139, 148, 158, 0.4)',
                accent: '#8B949E',
                particle: 'rgba(139, 148, 158, 0.6)'
            },
            rare: { 
                bg: 'rgba(88, 166, 255, 0.15)', 
                border: '#58A6FF', 
                glow: 'rgba(88, 166, 255, 0.5)',
                accent: '#58A6FF',
                particle: 'rgba(88, 166, 255, 0.8)'
            },
            epic: { 
                bg: 'rgba(168, 85, 247, 0.15)', 
                border: '#A855F7', 
                glow: 'rgba(168, 85, 247, 0.5)',
                accent: '#A855F7',
                particle: 'rgba(168, 85, 247, 0.8)'
            },
            legendary: { 
                bg: 'rgba(255, 215, 0, 0.15)', 
                border: '#FFD700', 
                glow: 'rgba(255, 215, 0, 0.6)',
                accent: '#FFD700',
                particle: 'rgba(255, 215, 0, 0.9)'
            }
        };
        
        const colors = rarityColors[rarity] || rarityColors.common;
        
        ctx.save();
        
        // Floating animation for unlocked achievements
        const floatOffset = isUnlocked ? Math.sin(time + index * 0.5) * 2 : 0;
        const animatedY = y + floatOffset;
        
        // Legendary achievement particle effects
        if (isUnlocked && rarity === 'legendary') {
            for (let i = 0; i < 8; i++) {
                const angle = time * 2 + i * (Math.PI * 2 / 8);
                const radius = 20 + Math.sin(time * 3 + i) * 5;
                const particleX = x + width/2 + Math.cos(angle) * radius;
                const particleY = animatedY + height/2 + Math.sin(angle) * radius;
                const alpha = 0.3 + Math.sin(time * 4 + i) * 0.2;
                
                ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Enhanced card background with multilayer gradients
        const gradient = ctx.createLinearGradient(x, animatedY, x, animatedY + height);
        if (isUnlocked) {
            gradient.addColorStop(0, colors.bg);
            gradient.addColorStop(0.3, 'rgba(33, 38, 45, 0.9)');
            gradient.addColorStop(0.7, 'rgba(33, 38, 45, 0.8)');
            gradient.addColorStop(1, 'rgba(21, 25, 30, 0.9)');
        } else {
            gradient.addColorStop(0, 'rgba(33, 38, 45, 0.3)');
            gradient.addColorStop(0.5, 'rgba(21, 25, 30, 0.5)');
            gradient.addColorStop(1, 'rgba(13, 17, 23, 0.7)');
        }
        ctx.fillStyle = gradient;
        this.drawRoundedRect(ctx, x, animatedY, width, height, 14);
        
        // Advanced glow and border effects
        if (isUnlocked) {
            // Dynamic glow intensity based on rarity
            const glowIntensity = rarity === 'legendary' ? 20 + Math.sin(time * 2) * 5 : 
                                 rarity === 'epic' ? 15 : 
                                 rarity === 'rare' ? 12 : 8;
            
            ctx.shadowColor = colors.glow;
            ctx.shadowBlur = glowIntensity;
            
            // Animated border for high rarity achievements
            if (rarity !== 'common') {
                const borderOffset = Math.sin(time * 3) * 0.5;
                ctx.lineWidth = 2.5 + borderOffset;
            } else {
                ctx.lineWidth = 2;
            }
        } else {
            ctx.shadowBlur = 0;
            ctx.lineWidth = 1;
        }
        
        ctx.strokeStyle = isUnlocked ? colors.border : '#30363d';
        this.strokeRoundedRect(ctx, x, animatedY, width, height, 14);
        ctx.shadowBlur = 0;
        
        // Enhanced achievement icon with animated background circle
        const iconSize = 48;
        const iconX = x + 28;
        const iconY = animatedY + height / 2;
        
        // Animated icon background circle with pulsing effect
        const pulseRadius = (iconSize / 2) + (isUnlocked ? Math.sin(time * 2) * 1.5 : 0);
        ctx.fillStyle = isUnlocked ? colors.accent + '25' : 'rgba(139, 148, 158, 0.1)';
        ctx.beginPath();
        ctx.arc(iconX, iconY, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Icon with scaling animation for unlocked achievements
        const iconScale = isUnlocked ? 1 + Math.sin(time * 3 + index) * 0.04 : 1;
        ctx.font = `${Math.floor(28 * iconScale)}px "Segoe UI Emoji", Arial, sans-serif`;
        ctx.fillStyle = isUnlocked ? colors.accent : '#656d76';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayIcon = isUnlocked ? achievement.icon : '🔒';
        ctx.fillText(displayIcon, iconX, iconY);
        
        // Enhanced achievement title with proper spacing
        ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = isUnlocked ? '#f0f6fc' : '#7d8590';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const displayName = achievement.name || achievement.id || 'Unknown Achievement';
        
        // Calculate text area to avoid overlap with badge
        const titleMaxWidth = width - 170; // Leave space for icon and badge
        const wrappedTitle = this.wrapText(ctx, displayName, titleMaxWidth);
        const titleText = wrappedTitle[0] || displayName; // Use first line only for title
        ctx.fillText(titleText, x + 75, animatedY + 15);
        
        // Enhanced unlock status badge with proper positioning
        const badgeWidth = 95;
        const badgeHeight = 22;
        const badgeX = x + width - badgeWidth - 15;
        const badgeY = animatedY + 12;
        
        if (isUnlocked) {
            // Animated success badge
            const successPulse = 0.8 + Math.sin(time * 4) * 0.2;
            ctx.fillStyle = `rgba(34, 197, 94, ${successPulse * 0.3})`;
            this.drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 11);
            
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓ UNLOCKED', badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
        } else {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            this.drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 11);
            
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✗ LOCKED', badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
        }
        
        // Enhanced achievement description with proper spacing and no overlap
        ctx.font = '14px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = isUnlocked ? '#a5a5a5' : '#656d76';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const description = isUnlocked ? (achievement.description || 'No description') : '???';
        
        // Proper text area calculation to avoid overlap with rarity badge and progress bar
        const descMaxWidth = width - 90; // Leave proper margins
        const descLines = this.wrapText(ctx, description, descMaxWidth);
        
        // Draw description with proper line spacing and positioning
        const descStartY = animatedY + 40;
        const lineHeight = 16;
        descLines.slice(0, 2).forEach((line, lineIndex) => { // Limit to 2 lines
            const descY = descStartY + (lineIndex * lineHeight);
            // Make sure description doesn't overlap with rarity badge
            if (descY < animatedY + height - 35) {
                ctx.fillText(line, x + 75, descY);
            }
        });
        
        // Enhanced rarity indicator with proper positioning to avoid overlap
        if (rarity !== 'common') {
            const rarityBadgeX = x + 12;
            const rarityBadgeY = animatedY + height - 25;
            const rarityBadgeWidth = 65;
            const rarityBadgeHeight = 16;
            
            // Rarity badge glow for unlocked achievements
            if (isUnlocked) {
                ctx.shadowColor = colors.accent + '60';
                ctx.shadowBlur = 8;
            }
            
            ctx.fillStyle = colors.accent + '35';
            this.drawRoundedRect(ctx, rarityBadgeX, rarityBadgeY, rarityBadgeWidth, rarityBadgeHeight, 8);
            ctx.shadowBlur = 0;
            
            ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = colors.accent;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(rarity.toUpperCase(), rarityBadgeX + rarityBadgeWidth / 2, rarityBadgeY + rarityBadgeHeight / 2);
        }
        
        // Progress indicator for partially completed achievements - positioned to avoid overlap
        if (!isUnlocked && achievement.progress !== undefined && achievement.target !== undefined) {
            const progressBarWidth = 90;
            const progressBarHeight = 4;
            const progressBarX = x + width - progressBarWidth - 15;
            const progressBarY = animatedY + height - 12;
            
            // Progress background
            ctx.fillStyle = 'rgba(139, 148, 158, 0.3)';
            this.drawRoundedRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, 2);
            
            // Progress fill
            const progressPercent = Math.min(achievement.progress / achievement.target, 1);
            ctx.fillStyle = colors.accent;
            this.drawRoundedRect(ctx, progressBarX, progressBarY, progressBarWidth * progressPercent, progressBarHeight, 2);
            
            // Progress text positioned above the bar to avoid overlap
            ctx.font = '10px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#7d8590';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${achievement.progress}/${achievement.target}`, progressBarX + progressBarWidth, progressBarY - 2);
        }
        
        ctx.restore();
    }

    /**
     * Draw enhanced back button with modern styling and animations
     */
    drawBackButton(ctx, width, height, hitAreas, time = 0) {
        const backButtonX = 35;
        const backButtonY = height - 75;
        const backButtonWidth = 110;
        const backButtonHeight = 45;
        
        // Button hover animation
        const hoverScale = 1 + Math.sin(time * 2) * 0.02;
        const animatedWidth = backButtonWidth * hoverScale;
        const animatedHeight = backButtonHeight * hoverScale;
        const animatedX = backButtonX - (animatedWidth - backButtonWidth) / 2;
        const animatedY = backButtonY - (animatedHeight - backButtonHeight) / 2;
        
        // Button glow effect
        ctx.shadowColor = 'rgba(88, 166, 255, 0.4)';
        ctx.shadowBlur = 12;
        
        // Enhanced button background with gradient
        const gradient = ctx.createLinearGradient(animatedX, animatedY, animatedX, animatedY + animatedHeight);
        gradient.addColorStop(0, 'rgba(33, 38, 45, 0.95)');
        gradient.addColorStop(0.5, 'rgba(21, 25, 30, 0.9)');
        gradient.addColorStop(1, 'rgba(13, 17, 23, 0.95)');
        ctx.fillStyle = gradient;
        this.drawRoundedRect(ctx, animatedX, animatedY, animatedWidth, animatedHeight, 12);
        
        // Animated button border
        ctx.strokeStyle = '#58A6FF';
        ctx.lineWidth = 1.5 + Math.sin(time * 3) * 0.5;
        this.strokeRoundedRect(ctx, animatedX, animatedY, animatedWidth, animatedHeight, 12);
        ctx.shadowBlur = 0;
        
        // Button icon with animation
        const iconScale = 1 + Math.sin(time * 4) * 0.1;
        ctx.font = `${Math.floor(16 * iconScale)}px "Segoe UI Emoji", Arial, sans-serif`;
        ctx.fillStyle = '#f0f6fc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('←', animatedX + 25, animatedY + animatedHeight / 2);
        
        // Button text
        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#f0f6fc';
        ctx.fillText('Back', animatedX + animatedWidth - 35, animatedY + animatedHeight / 2);
        
        hitAreas.push({
            x: animatedX,
            y: animatedY,
            width: animatedWidth,
            height: animatedHeight,
            action: 'back'
        });
    }

    /**
     * Draw enhanced scroll indicators with animations
     */
    drawScrollIndicators(ctx, width, height, time = 0) {
        const currentCategory = this.gameInstance?.achievementCategory || this.currentCategoryFilter || 'all';
        const maxScrollOffset = this.getMaxScrollOffset(width, height, currentCategory);
        const scrollOffset = this.gameInstance?.achievementsScrollOffset || 0;
        
        if (maxScrollOffset > 0) {
            const indicatorX = width - 35;
            const indicatorY = 220;
            const indicatorHeight = height - 320;
            
            // Animated scroll track with glow
            ctx.shadowColor = 'rgba(88, 166, 255, 0.3)';
            ctx.shadowBlur = 6;
            ctx.fillStyle = 'rgba(139, 148, 158, 0.25)';
            this.drawRoundedRect(ctx, indicatorX, indicatorY, 6, indicatorHeight, 3);
            ctx.shadowBlur = 0;
            
            // Animated scroll thumb
            const thumbHeight = Math.max(40, (indicatorHeight * 0.3));
            const thumbY = indicatorY + (scrollOffset / maxScrollOffset) * (indicatorHeight - thumbHeight);
            
            // Thumb with pulsing animation
            const thumbPulse = 1 + Math.sin(time * 3) * 0.1;
            ctx.shadowColor = 'rgba(88, 166, 255, 0.6)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(88, 166, 255, 0.8)';
            this.drawRoundedRect(ctx, indicatorX, thumbY, 6 * thumbPulse, thumbHeight, 3);
            ctx.shadowBlur = 0;
            
            // Enhanced scroll hints with animations
            if (scrollOffset > 0) {
                const arrowBounce = Math.sin(time * 4) * 3;
                ctx.font = '14px "Segoe UI", Arial, sans-serif';
                ctx.fillStyle = `rgba(139, 148, 158, ${0.8 + Math.sin(time * 2) * 0.2})`;
                ctx.textAlign = 'center';
                ctx.fillText('▲ More above', width / 2, 200 + arrowBounce);
            }
            
            if (scrollOffset < maxScrollOffset) {
                const arrowBounce = -Math.sin(time * 4) * 3;
                ctx.font = '14px "Segoe UI", Arial, sans-serif';
                ctx.fillStyle = `rgba(139, 148, 158, ${0.8 + Math.sin(time * 2) * 0.2})`;
                ctx.textAlign = 'center';
                ctx.fillText('▼ More below', width / 2, height - 100 + arrowBounce);
            }
        }
    }

    /**
     * Helper: Draw rounded rectangle
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Helper: Stroke rounded rectangle
     */
    strokeRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.stroke();
    }
    
    /**
     * Calculate the maximum scroll offset for the achievements screen
     */
    getMaxScrollOffset(width, height, categoryFilter = 'all') {
        const achievementList = Object.values(this.achievements);
        
        // Filter achievements by category
        const filteredAchievements = categoryFilter === 'all' ? 
            achievementList : 
            achievementList.filter(achievement => achievement.category === categoryFilter);
        
        // Grid layout parameters (matching drawAchievementsGrid)
        const cardWidth = 340;
        const cardHeight = 110;
        const padding = 20;
        const cols = Math.floor((width - padding * 2) / (cardWidth + padding));
        const actualCols = Math.max(1, Math.min(cols, 3)); // Limit to max 3 columns
        const startY = 215; // Header and controls area
        
        // Calculate total content height
        const rows = Math.ceil(filteredAchievements.length / actualCols);
        const totalContentHeight = rows * (cardHeight + padding);
        const visibleAreaHeight = height - startY - 80; // Account for back button and footer
        
        // Return maximum scroll offset (0 if content fits on screen)
        return Math.max(0, totalContentHeight - visibleAreaHeight);
    }

    /**
     * Reset animations (required by GameNavigation when entering achievements state)
     */
    resetAnimations() {
        // Since AchievementSystem uses time-based animations, 
        // we don't need to reset specific animation states
        // This method exists for compatibility with the navigation system
        console.log('🏆 Achievements animations reset');
    }

    /**
     * Handle clicks in the achievements screen
     */
    handleClick(x, y) {
        console.log('🏆 Achievement click at:', x, y);
        
        // Get canvas dimensions from game instance
        const canvasWidth = this.gameInstance?.canvas?.width || 1200;
        const canvasHeight = this.gameInstance?.canvas?.height || 800;
        
        // Check back button hit area first
        const backButtonX = 35;
        const backButtonY = canvasHeight - 75;
        const backButtonWidth = 110;
        const backButtonHeight = 45;
        
        if (x >= backButtonX && x <= backButtonX + backButtonWidth && 
            y >= backButtonY && y <= backButtonY + backButtonHeight) {
            console.log('🏆 Back button clicked');
            
            // Navigate back to previous state or home
            if (this.gameInstance) {
                const backState = this.gameInstance.previousGameState || 'home';
                this.gameInstance.navigateToState(backState);
            }
            return { action: 'back' };
        }
        
        // Category filter buttons hit detection
        const categories = [
            { id: 'all', name: 'All', icon: '🌟' },
            { id: 'progress', name: 'Progress', icon: '🚀' },
            { id: 'death', name: 'Death', icon: '💀' },
            { id: 'customization', name: 'Style', icon: '🎨' },
            { id: 'meta', name: 'Meta', icon: '🧠' }
        ];
        
        const buttonWidth = 120;
        const buttonHeight = 38;
        const buttonSpacing = 10;
        const totalButtonsWidth = categories.length * buttonWidth + (categories.length - 1) * buttonSpacing;
        const startX = (canvasWidth - totalButtonsWidth) / 2;
        const startY = 155;
        
        // Check if click is within category buttons area
        if (y >= startY && y <= startY + buttonHeight) {
            for (let index = 0; index < categories.length; index++) {
                const category = categories[index];
                const buttonX = startX + index * (buttonWidth + buttonSpacing);
                
                if (x >= buttonX && x <= buttonX + buttonWidth) {
                    console.log(`🏆 Category tab clicked: ${category.id}`);
                    
                    // Update the category filter
                    if (this.gameInstance) {
                        this.gameInstance.achievementCategory = category.id;
                        // Reset scroll when changing categories
                        this.gameInstance.achievementsScrollOffset = 0;
                        console.log(`🏆 Achievement category changed to: ${category.id}`);
                    }
                    
                    return { action: 'filter', category: category.id };
                }
            }
        }
        
        return null;
    }
}
