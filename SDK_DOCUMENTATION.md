# GlitchRealm Game SDK Documentation

Complete guide for integrating your game with the GlitchRealm platform.

## Quick Start

### Installation

Add the SDK to your game's HTML file:

```html
<!-- Required: Firebase Core (if not already included) -->
<script type="module" src="https://glitchrealm.ca/firebase-core.js"></script>

<!-- GlitchRealm SDK -->
<script src="https://glitchrealm.ca/glitchrealm-sdk.js"></script>
```

### Basic Setup

```javascript
// Initialize the SDK
const sdk = new GlitchRealmSDK({
    gameId: 'my-game',        // Unique game identifier
    gameName: 'My Game',      // Display name
    debug: true               // Enable console logging (optional)
});

// Initialize (must be called before using SDK features)
await sdk.init();

// Listen for authentication state
sdk.on('authStateChanged', ({ user }) => {
    if (user) {
        console.log('User signed in:', user.displayName);
    } else {
        console.log('User not signed in');
    }
});
```

---

## Features

### 1. Playtime Tracking

Automatically tracks how long users play your game.

#### Automatic Tracking

Playtime tracking starts automatically when a user is signed in. No additional code needed!

```javascript
// The SDK automatically:
// - Starts tracking when user signs in
// - Syncs every 30 seconds
// - Pauses when tab is inactive
// - Saves on page close
```

#### Manual Queries

```javascript
// Get total playtime for current user
const totalSeconds = await sdk.getPlaytime();
console.log(`User has played for ${totalSeconds} seconds`);

// Convert to hours:minutes
const hours = Math.floor(totalSeconds / 3600);
const minutes = Math.floor((totalSeconds % 3600) / 60);
console.log(`${hours}h ${minutes}m`);
```

#### Events

```javascript
sdk.on('playtimeSync', ({ duration, isFinal }) => {
    console.log(`Synced ${duration} seconds of playtime`);
});
```

---

### 2. Achievements

Unlock achievements for players and track their progress.

#### Unlock Achievement

```javascript
const result = await sdk.unlockAchievement('first-win', {
    name: 'First Victory',
    description: 'Win your first match',
    icon: 'https://example.com/trophy.png',
    rarity: 'common'
});

if (result.success) {
    console.log('Achievement unlocked!');
} else {
    console.error('Failed:', result.error);
}
```

#### Check Achievement Status

```javascript
const hasAchievement = await sdk.hasAchievement('first-win');
if (hasAchievement) {
    console.log('User already has this achievement');
}
```

#### Get All Achievements

```javascript
const achievements = await sdk.getAchievements();
achievements.forEach(achievement => {
    console.log(achievement.name, achievement.unlockedAt);
});
```

#### Events

```javascript
sdk.on('achievementUnlocked', (achievement) => {
    // Show notification to user
    showNotification(`Achievement Unlocked: ${achievement.name}`);
});
```

#### Example: Achievement System

```javascript
class AchievementManager {
    constructor(sdk) {
        this.sdk = sdk;
        this.achievements = {
            'first-kill': { name: 'First Blood', threshold: 1 },
            'kill-streak-5': { name: 'Killing Spree', threshold: 5 },
            'kill-streak-10': { name: 'Unstoppable', threshold: 10 }
        };
        this.killCount = 0;
    }
    
    async onKill() {
        this.killCount++;
        
        // Check each achievement
        for (const [id, data] of Object.entries(this.achievements)) {
            if (this.killCount === data.threshold) {
                const hasIt = await this.sdk.hasAchievement(id);
                if (!hasIt) {
                    await this.sdk.unlockAchievement(id, {
                        name: data.name,
                        description: `Get ${data.threshold} kills`,
                        category: 'combat'
                    });
                }
            }
        }
    }
}
```

---

### 3. Event Tracking

Track custom game events for analytics.

#### Track Event

```javascript
// Basic event
await sdk.trackEvent('level-complete', {
    level: 5,
    score: 1000,
    time: 120
});

// Combat event
await sdk.trackEvent('player-death', {
    cause: 'enemy-laser',
    location: { x: 100, y: 200 },
    enemyType: 'boss'
});

// Economy event
await sdk.trackEvent('item-purchased', {
    itemId: 'laser-gun',
    price: 500,
    currency: 'coins'
});
```

#### Events

```javascript
sdk.on('eventTracked', (event) => {
    console.log('Event tracked:', event.eventName);
});
```

#### Best Practices

```javascript
// Track meaningful gameplay moments
await sdk.trackEvent('tutorial-complete');
await sdk.trackEvent('boss-defeated', { bossName: 'Cyber Dragon' });
await sdk.trackEvent('secret-found', { secretId: 'hidden-room-1' });

// Track player progression
await sdk.trackEvent('level-up', { level: 10, class: 'warrior' });

// Track technical issues
await sdk.trackEvent('error-occurred', { 
    errorType: 'asset-load-failed',
    asset: 'laser-sound.mp3'
});
```

---

### 4. Leaderboards

Submit scores and retrieve rankings.

#### Submit Score

```javascript
const result = await sdk.submitScore(1500, {
    level: 10,
    difficulty: 'hard',
    character: 'ninja'
});

if (result.success) {
    if (result.isNewRecord) {
        console.log('New high score!');
    }
} else if (result.error === 'NOT_HIGH_SCORE') {
    console.log('Not your best score');
}
```

#### Get Leaderboard

```javascript
// Get top 10 scores
const topScores = await sdk.getLeaderboard(10);

topScores.forEach(entry => {
    console.log(`${entry.rank}. ${entry.displayName}: ${entry.score}`);
});
```

#### Get User Rank

```javascript
const userRank = await sdk.getUserRank();
if (userRank) {
    console.log(`You are rank #${userRank.rank} with ${userRank.score} points`);
}
```

#### Events

```javascript
sdk.on('scoreSubmitted', (scoreData) => {
    console.log('Score submitted:', scoreData.score);
});
```

#### Example: Leaderboard UI

```javascript
async function displayLeaderboard() {
    const leaderboard = await sdk.getLeaderboard(10);
    const userRank = await sdk.getUserRank();
    
    let html = '<h2>Top Players</h2><ol>';
    
    leaderboard.forEach(entry => {
        const isCurrentUser = entry.userId === sdk.getUser()?.uid;
        html += `
            <li class="${isCurrentUser ? 'current-user' : ''}">
                <span class="rank">#${entry.rank}</span>
                <span class="name">${entry.displayName}</span>
                <span class="score">${entry.score}</span>
            </li>
        `;
    });
    
    html += '</ol>';
    
    if (userRank && userRank.rank > 10) {
        html += `<p>Your rank: #${userRank.rank} (${userRank.score} points)</p>`;
    }
    
    document.getElementById('leaderboard').innerHTML = html;
}
```

---

### 5. Purchases/Monetization

Track in-game purchases and tips.

#### Record Purchase

```javascript
await sdk.recordPurchase({
    type: 'tip',
    amount: 5.00,
    currency: 'USD',
    itemId: null,
    description: 'Player tip'
});

await sdk.recordPurchase({
    type: 'in-game-item',
    amount: 0,
    currency: 'coins',
    itemId: 'power-up-speed',
    quantity: 1,
    description: 'Speed Power-Up'
});
```

#### Events

```javascript
sdk.on('purchaseRecorded', (purchase) => {
    console.log('Purchase recorded:', purchase.purchaseId);
});
```

---

### 6. Authentication

Manage user authentication state.

#### Check Auth State

```javascript
// Check if user is signed in
if (sdk.isAuthenticated()) {
    const user = sdk.getUser();
    console.log('Signed in as:', user.displayName);
} else {
    console.log('Not signed in');
}
```

#### Redirect to Sign In

```javascript
// Redirect to GlitchRealm sign-in page
sdk.redirectToSignIn();
```

#### Auth Events

```javascript
sdk.on('authStateChanged', ({ user }) => {
    if (user) {
        // User signed in - enable online features
        enableMultiplayer();
        loadUserProgress();
    } else {
        // User signed out - disable online features
        disableMultiplayer();
    }
});
```

#### Example: Sign-In Prompt

```javascript
function initGame() {
    if (!sdk.isAuthenticated()) {
        showSignInPrompt();
    } else {
        startGame();
    }
}

function showSignInPrompt() {
    const overlay = document.createElement('div');
    overlay.innerHTML = `
        <div class="sign-in-prompt">
            <h2>Sign in to track progress</h2>
            <p>Save your scores, unlock achievements, and compete on leaderboards!</p>
            <button onclick="signIn()">Sign In</button>
            <button onclick="playAsGuest()">Play as Guest</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

function signIn() {
    sdk.redirectToSignIn();
}

function playAsGuest() {
    startGame();
}
```

---

## Complete Integration Example

Here's a complete example showing all SDK features:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Cyberpunk Game</title>
    <script type="module" src="https://glitchrealm.ca/firebase-core.js"></script>
    <script src="https://glitchrealm.ca/glitchrealm-sdk.js"></script>
</head>
<body>
    <div id="game-container">
        <h1>My Cyberpunk Game</h1>
        <div id="user-info"></div>
        <div id="game-area"></div>
        <div id="leaderboard"></div>
    </div>

    <script>
        let sdk;
        let gameState = {
            score: 0,
            level: 1,
            kills: 0
        };

        // Initialize SDK
        async function initSDK() {
            sdk = new GlitchRealmSDK({
                gameId: 'my-cyberpunk-game',
                gameName: 'My Cyberpunk Game',
                debug: true
            });

            await sdk.init();

            // Setup event listeners
            sdk.on('authStateChanged', handleAuthChange);
            sdk.on('achievementUnlocked', showAchievement);
            sdk.on('scoreSubmitted', onScoreSubmitted);
            sdk.on('playtimeSync', onPlaytimeSync);
        }

        // Handle authentication changes
        function handleAuthChange({ user }) {
            const userInfo = document.getElementById('user-info');
            if (user) {
                userInfo.innerHTML = `
                    <p>Welcome, ${user.displayName}!</p>
                    <button onclick="loadProgress()">Load Progress</button>
                `;
                loadLeaderboard();
            } else {
                userInfo.innerHTML = `
                    <p>Not signed in</p>
                    <button onclick="sdk.redirectToSignIn()">Sign In</button>
                `;
            }
        }

        // Game logic
        function onEnemyKilled() {
            gameState.kills++;
            gameState.score += 100;

            // Track event
            sdk.trackEvent('enemy-killed', {
                enemyType: 'drone',
                level: gameState.level
            });

            // Check achievements
            checkAchievements();

            updateUI();
        }

        async function checkAchievements() {
            if (gameState.kills === 1) {
                await sdk.unlockAchievement('first-blood', {
                    name: 'First Blood',
                    description: 'Defeat your first enemy'
                });
            }
            if (gameState.kills === 100) {
                await sdk.unlockAchievement('centurion', {
                    name: 'Centurion',
                    description: 'Defeat 100 enemies'
                });
            }
        }

        function showAchievement(achievement) {
            // Show toast notification
            const toast = document.createElement('div');
            toast.className = 'achievement-toast';
            toast.innerHTML = `
                <h3>Achievement Unlocked!</h3>
                <p>${achievement.name}</p>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        async function onGameOver() {
            // Submit final score
            const result = await sdk.submitScore(gameState.score, {
                level: gameState.level,
                kills: gameState.kills
            });

            if (result.success && result.isNewRecord) {
                alert('New high score!');
            }

            // Track game over event
            await sdk.trackEvent('game-over', {
                finalScore: gameState.score,
                finalLevel: gameState.level
            });

            // Reload leaderboard
            loadLeaderboard();
        }

        async function loadLeaderboard() {
            const leaderboard = await sdk.getLeaderboard(10);
            const userRank = await sdk.getUserRank();

            let html = '<h2>Leaderboard</h2><ol>';
            leaderboard.forEach(entry => {
                html += `<li>${entry.displayName}: ${entry.score}</li>`;
            });
            html += '</ol>';

            if (userRank) {
                html += `<p>Your rank: #${userRank.rank}</p>`;
            }

            document.getElementById('leaderboard').innerHTML = html;
        }

        async function loadProgress() {
            const playtime = await sdk.getPlaytime();
            const achievements = await sdk.getAchievements();

            console.log(`Total playtime: ${Math.floor(playtime / 60)} minutes`);
            console.log(`Achievements unlocked: ${achievements.length}`);
        }

        function onPlaytimeSync({ duration }) {
            console.log(`Synced ${duration} seconds of playtime`);
        }

        function onScoreSubmitted(score) {
            console.log('Score submitted successfully:', score.score);
        }

        function updateUI() {
            // Update game UI with current state
            console.log(`Score: ${gameState.score}, Level: ${gameState.level}`);
        }

        // Start the game
        initSDK().then(() => {
            console.log('SDK ready! Starting game...');
        });
    </script>
</body>
</html>
```

---

## SDK Events Reference

| Event Name | Description | Data |
|------------|-------------|------|
| `initialized` | SDK initialization complete | `{ gameId, gameName }` |
| `authStateChanged` | User sign-in state changed | `{ user }` |
| `playtimeSync` | Playtime synced to server | `{ duration, isFinal }` |
| `achievementUnlocked` | Achievement unlocked | `{ achievementId, name, ... }` |
| `eventTracked` | Custom event tracked | `{ eventName, data }` |
| `scoreSubmitted` | Score submitted to leaderboard | `{ score, rank, ... }` |
| `purchaseRecorded` | Purchase recorded | `{ purchaseId, ... }` |

---

## Error Handling

```javascript
// All async methods return result objects
const result = await sdk.unlockAchievement('test');

if (result.success) {
    // Success
    console.log('Achievement unlocked!');
} else {
    // Handle error
    switch (result.error) {
        case 'NOT_AUTHENTICATED':
            console.log('User must sign in first');
            break;
        default:
            console.error('Error:', result.error);
    }
}
```

Common error codes:
- `NOT_AUTHENTICATED` - User is not signed in
- `INVALID_SCORE` - Score is not a number
- `NOT_HIGH_SCORE` - Score is not higher than current best

---

## Best Practices

### 1. Initialize Early
```javascript
// Initialize as soon as possible
window.addEventListener('DOMContentLoaded', async () => {
    await sdk.init();
});
```

### 2. Handle Anonymous Users
```javascript
if (!sdk.isAuthenticated()) {
    // Provide local-only functionality
    // Or prompt user to sign in for cloud features
}
```

### 3. Batch Events
```javascript
// Don't track every frame
let lastEventTime = 0;
function onPlayerMove() {
    const now = Date.now();
    if (now - lastEventTime > 5000) { // Every 5 seconds
        sdk.trackEvent('player-moved');
        lastEventTime = now;
    }
}
```

### 4. Graceful Degradation
```javascript
try {
    await sdk.submitScore(score);
} catch (error) {
    console.error('Failed to submit score, but game continues');
}
```

### 5. Clean Up
```javascript
window.addEventListener('beforeunload', () => {
    sdk.destroy();
});
```

---

## Firestore Data Structure

Understanding the data structure helps with advanced queries:

```
/playtime/{userId}/games/{gameId}
    - totalSeconds: number
    - lastPlayed: timestamp
    - gameName: string

/achievements/{userId}/games/{gameId}/unlocked/{achievementId}
    - achievementId: string
    - unlockedAt: timestamp
    - name, description, icon, etc.

/game_events/{gameId}/events/{eventId}
    - eventName: string
    - userId: string
    - timestamp: timestamp
    - data: object

/leaderboards/{gameId}/scores/{userId}
    - score: number
    - displayName: string
    - submittedAt: timestamp

/purchases/{userId}/games/{gameId}/transactions/{transactionId}
    - type: string
    - amount: number
    - timestamp: timestamp
```

---

## Migration from game-playtime-tracker.js

If you're currently using the old `game-playtime-tracker.js`:

```javascript
// Old way
<script src="game-playtime-tracker.js"></script>

// New way
const sdk = new GlitchRealmSDK({ 
    gameId: 'your-game-id'
});
await sdk.init();

// Playtime tracking is automatic!
// Plus you get achievements, events, leaderboards, etc.
```

---

## Support

- **Documentation**: https://glitchrealm.ca/api-docs
- **GitHub**: https://github.com/InfinityByteStudios/GlitchRealm
- **Discord**: Coming soon
- **Email**: support@glitchrealm.ca

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**License**: MIT (code), All Rights Reserved (assets)
