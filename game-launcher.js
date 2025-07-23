// GlitchRealm Game Launcher with Playtime Tracking
// This script manages launching games and tracking playtime

class GameLauncher {
    constructor() {
        this.games = {
            'coderunner': {
                id: 'coderunner',
                name: 'CodeRunner',
                path: 'Games/CodeRunner/index.html',
                iconUrl: 'assets/game logos/coderunner logo.png'
            },
            'bytesurge': {
                id: 'bytesurge',
                name: 'ByteSurge',
                path: 'Games/ByteSurge/index.html',
                iconUrl: 'assets/game logos/bytesurge.png'
            },
            'neurocore-byte-wars': {
                id: 'neurocore-byte-wars',
                name: 'NeuroCore: Byte Wars',
                path: 'Games/ByteWars/index.html',
                iconUrl: 'assets/game logos/neurocore byte wars logo.png'
            },
            'shadowlight': {
                id: 'shadowlight',
                name: 'ShadowLight',
                path: 'Games/ShadowLight/index.html',
                iconUrl: 'assets/game logos/shadowlight.png'
            }
        };
        
        // Playtime tracking properties
        this.currentSession = null;
        this.syncInterval = null;
        
        // Initialize when document is loaded
        document.addEventListener('DOMContentLoaded', this.init.bind(this));
    }
    
    
    // Initialize the launcher
    init() {
        console.log('Initializing GlitchRealm Game Launcher');
        
        // Find all game launch buttons
        const launchButtons = document.querySelectorAll('[data-game-launch]');
        
        // Add click handlers
        launchButtons.forEach(button => {
            const gameId = button.getAttribute('data-game-launch');
            if (this.games[gameId]) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.launchGame(gameId);
                });
            }
        });
    }
    
    // Launch a game
    launchGame(gameId) {
        const game = this.games[gameId];
        if (!game) {
            console.error(`Game not found: ${gameId}`);
            return;
        }
        
        console.log(`Launching game: ${game.name}`);
        
        // Check if user is logged in before launching
        const auth = window.firebaseAuth;
        if (auth && auth.currentUser) {
            // User is logged in, proceed with launch
            this.openGameWindow(game);
        } else {
            // Show login prompt
            this.showLoginPrompt(game);
        }
    }
    
    // Open the game in a new window or tab
    openGameWindow(game) {
        // Trigger game start event for playtime tracking
        const gameStartEvent = new CustomEvent('gameStarted', { 
            detail: { gameId: game.id, gameName: game.name }
        });
        window.dispatchEvent(gameStartEvent);
        console.log(`Game start event triggered for ${game.name}`);
        
        // Open the game
        const gameUrl = `${window.location.origin}/${game.path}`;
        const gameWindow = window.open(gameUrl, `_blank`);
        
        // Set up event listener for when the game window closes
        if (gameWindow) {
            // For modern browsers that support this
            gameWindow.addEventListener('beforeunload', () => {
                const gameEndEvent = new CustomEvent('gameEnded', { 
                    detail: { gameId: game.id, gameName: game.name }
                });
                window.dispatchEvent(gameEndEvent);
                console.log(`Game end event triggered for ${game.name}`);
            });
            
            // Alternative approach using focus check
            const checkGameWindow = setInterval(() => {
                if (gameWindow.closed) {
                    clearInterval(checkGameWindow);
                    const gameEndEvent = new CustomEvent('gameEnded', { 
                        detail: { gameId: game.id, gameName: game.name }
                    });
                    window.dispatchEvent(gameEndEvent);
                    console.log(`Game end event triggered for ${game.name} (window closed)`);
                }
            }, 1000);
        }
    }
    
    // Show login prompt if user is not logged in
    showLoginPrompt(game) {
        // Check if we have a modal system available
        if (typeof showModal === 'function') {
            showModal('login-required-modal');
            
            // Store the game to launch after login
            window.pendingGameLaunch = game.id;
        } else {
            // Simple alert fallback
            const proceed = confirm(`Please sign in to track your progress in ${game.name}. Would you like to continue without signing in?`);
            
            if (proceed) {
                this.openGameWindow(game);
            } else {
                // Redirect to sign in page
                window.location.href = 'signin.html';
            }
        }
    }
}

// Create and export the launcher
const gameLauncher = new GameLauncher();
window.GlitchRealmGameLauncher = gameLauncher;
