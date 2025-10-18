/**
 * Game Analytics Tracker for GlitchRealm
 * 
 * This script tracks game plays, user interactions, and other analytics
 * for the developer dashboard and site analytics.
 */

class GameAnalyticsTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = new Date();
        this.events = [];
        this.isTracking = false;
        
        // Batch events to reduce Firestore writes
        this.eventBatch = [];
        this.batchTimeout = null;
        this.batchSize = 10;
        this.batchDelay = 5000; // 5 seconds
        
        this.init();
    }
    
    init() {
        // Wait for Firebase to be available
        if (window.firebaseFirestore && window.firebaseAuth) {
            this.setupTracking();
        } else {
            setTimeout(() => this.init(), 1000);
        }
    }
    
    setupTracking() {
        console.log('[Analytics] Game analytics tracker initialized');
        
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.flushEvents();
            }
        });
        
        // Track before page unload
        window.addEventListener('beforeunload', () => {
            this.flushEvents();
        });
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Track when a user starts playing a game
    async trackGamePlay(gameId, gameName, gameUrl = null) {
        if (!window.firebaseAuth?.currentUser) {
            console.log('[Analytics] No authenticated user, skipping play tracking');
            return;
        }
        
        const playData = {
            gameId: gameId,
            gameName: gameName,
            gameUrl: gameUrl,
            userId: window.firebaseAuth.currentUser.uid,
            sessionId: this.sessionId,
            startTime: new Date(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            timestamp: new Date()
        };
        
        try {
            // Create play session document
            const { collection, addDoc, doc, updateDoc, increment, getDoc, setDoc } = 
                await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Add play session
            await addDoc(collection(window.firebaseFirestore, 'play_sessions'), playData);
            
            // Update game analytics
            await this.updateGameAnalytics(gameId, 'play');
            
            console.log('[Analytics] Game play tracked:', gameId);
            
            // Track analytics event
            this.trackEvent('game_play_start', {
                gameId: gameId,
                gameName: gameName,
                sessionId: this.sessionId
            });
            
        } catch (error) {
            console.error('[Analytics] Error tracking game play:', error);
        }
    }
    
    // Update game analytics counters
    async updateGameAnalytics(gameId, eventType) {
        try {
            const { doc, updateDoc, increment, getDoc, setDoc } = 
                await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const analyticsRef = doc(window.firebaseFirestore, 'game_analytics', gameId);
            const analyticsDoc = await getDoc(analyticsRef);
            
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const thisWeek = this.getWeekString(new Date());
            
            if (analyticsDoc.exists()) {
                // Update existing analytics
                const updates = {};
                
                if (eventType === 'play') {
                    updates.totalPlays = increment(1);
                    updates[`dailyPlays.${today}`] = increment(1);
                    updates[`weeklyPlays.${thisWeek}`] = increment(1);
                    updates.lastPlayed = new Date();
                }
                
                await updateDoc(analyticsRef, updates);
            } else {
                // Create new analytics document
                const initialData = {
                    gameId: gameId,
                    totalPlays: eventType === 'play' ? 1 : 0,
                    totalReviews: 0,
                    averageRating: 0,
                    dailyPlays: { [today]: eventType === 'play' ? 1 : 0 },
                    weeklyPlays: { [thisWeek]: eventType === 'play' ? 1 : 0 },
                    createdAt: new Date(),
                    lastPlayed: eventType === 'play' ? new Date() : null
                };
                
                await setDoc(analyticsRef, initialData);
            }
            
        } catch (error) {
            console.error('[Analytics] Error updating game analytics:', error);
        }
    }
    
    // Track custom events
    trackEvent(eventName, eventData = {}) {
        const event = {
            eventName: eventName,
            eventData: eventData,
            userId: window.firebaseAuth?.currentUser?.uid || 'anonymous',
            sessionId: this.sessionId,
            timestamp: new Date(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        this.eventBatch.push(event);
        
        // Flush batch if it's full
        if (this.eventBatch.length >= this.batchSize) {
            this.flushEvents();
        } else {
            // Set timeout to flush batch
            if (this.batchTimeout) {
                clearTimeout(this.batchTimeout);
            }
            this.batchTimeout = setTimeout(() => this.flushEvents(), this.batchDelay);
        }
    }
    
    // Flush events to Firestore
    async flushEvents() {
        if (this.eventBatch.length === 0) return;
        
        try {
            const { collection, addDoc } = 
                await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const eventsToFlush = [...this.eventBatch];
            this.eventBatch = [];
            
            // Clear timeout
            if (this.batchTimeout) {
                clearTimeout(this.batchTimeout);
                this.batchTimeout = null;
            }
            
            // Send events in batch
            const promises = eventsToFlush.map(event => 
                addDoc(collection(window.firebaseFirestore, 'analytics_events'), event)
            );
            
            await Promise.all(promises);
            console.log(`[Analytics] Flushed ${eventsToFlush.length} events`);
            
        } catch (error) {
            console.error('[Analytics] Error flushing events:', error);
            // Put events back in batch to retry later
            this.eventBatch.unshift(...eventsToFlush);
        }
    }
    
    // Track game rating
    async trackGameRating(gameId, rating, reviewId = null) {
        try {
            await this.updateGameRating(gameId, rating);
            
            this.trackEvent('game_rating', {
                gameId: gameId,
                rating: rating,
                reviewId: reviewId
            });
            
        } catch (error) {
            console.error('[Analytics] Error tracking game rating:', error);
        }
    }
    
    // Update game rating analytics
    async updateGameRating(gameId, newRating) {
        try {
            const { doc, updateDoc, getDoc, setDoc } = 
                await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const analyticsRef = doc(window.firebaseFirestore, 'game_analytics', gameId);
            const analyticsDoc = await getDoc(analyticsRef);
            
            if (analyticsDoc.exists()) {
                const data = analyticsDoc.data();
                const currentTotal = (data.averageRating || 0) * (data.totalReviews || 0);
                const newTotal = currentTotal + newRating;
                const newCount = (data.totalReviews || 0) + 1;
                const newAverage = newTotal / newCount;
                
                await updateDoc(analyticsRef, {
                    averageRating: newAverage,
                    totalReviews: newCount,
                    lastReviewed: new Date()
                });
            } else {
                // Create new analytics with first rating
                await setDoc(analyticsRef, {
                    gameId: gameId,
                    totalPlays: 0,
                    totalReviews: 1,
                    averageRating: newRating,
                    dailyPlays: {},
                    weeklyPlays: {},
                    createdAt: new Date(),
                    lastReviewed: new Date()
                });
            }
            
        } catch (error) {
            console.error('[Analytics] Error updating game rating:', error);
        }
    }
    
    // Get week string (YYYY-WW format)
    getWeekString(date) {
        const year = date.getFullYear();
        const week = this.getWeekNumber(date);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    }
    
    // Get week number of the year
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    
    // Get analytics for a specific game (for developers)
    async getGameAnalytics(gameId) {
        try {
            const { doc, getDoc, collection, query, where, orderBy, limit, getDocs } = 
                await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Get main analytics
            const analyticsRef = doc(window.firebaseFirestore, 'game_analytics', gameId);
            const analyticsDoc = await getDoc(analyticsRef);
            
            if (!analyticsDoc.exists()) {
                return {
                    totalPlays: 0,
                    totalReviews: 0,
                    averageRating: 0,
                    dailyPlays: {},
                    weeklyPlays: {},
                    recentSessions: []
                };
            }
            
            const analytics = analyticsDoc.data();
            
            // Get recent play sessions
            const sessionsQuery = query(
                collection(window.firebaseFirestore, 'play_sessions'),
                where('gameId', '==', gameId),
                orderBy('startTime', 'desc'),
                limit(10)
            );
            
            const sessionsSnapshot = await getDocs(sessionsQuery);
            const recentSessions = sessionsSnapshot.docs.map(doc => doc.data());
            
            return {
                ...analytics,
                recentSessions: recentSessions
            };
            
        } catch (error) {
            console.error('[Analytics] Error getting game analytics:', error);
            return null;
        }
    }
}

// Initialize global analytics tracker
let gameAnalyticsTracker = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        gameAnalyticsTracker = new GameAnalyticsTracker();
    });
} else {
    gameAnalyticsTracker = new GameAnalyticsTracker();
}

// Make available globally
window.gameAnalyticsTracker = gameAnalyticsTracker;
window.GameAnalyticsTracker = GameAnalyticsTracker;

// Helper function to track game plays (for easy integration)
window.trackGamePlay = function(gameId, gameName, gameUrl = null) {
    if (window.gameAnalyticsTracker) {
        window.gameAnalyticsTracker.trackGamePlay(gameId, gameName, gameUrl);
    }
};

// Helper function to track events
window.trackAnalyticsEvent = function(eventName, eventData = {}) {
    if (window.gameAnalyticsTracker) {
        window.gameAnalyticsTracker.trackEvent(eventName, eventData);
    }
};

console.log('[Analytics] Game analytics tracker loaded');