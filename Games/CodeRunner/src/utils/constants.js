/**
 * Game Constants and Configuration
 */

export const GAME_CONFIG = {
    // Canvas settings
    CANVAS_ID: 'gameCanvas',
    
    // World settings
    TILE_SIZE: 32,
    CHUNK_WIDTH: 16,
    CHUNK_HEIGHT: 12,
    WORLD_SPEED: 120,
    
    // Generation settings
    GENERATION_DISTANCE: 3,
    CLEANUP_DISTANCE: 5,    // Physics constants
    GRAVITY: 900,  // Slightly increased for snappier feel
    MAX_FALL_SPEED: 450,  // Slightly faster max fall
    
    // Player settings
    PLAYER_WIDTH: 28,
    PLAYER_HEIGHT: 44,
    MOVE_SPEED: 150,  // Reduced base speed for better control
    JUMP_POWER: -440,  // Slightly higher jump for better feel
    FRICTION: 0.82,  // Improved ground friction for better stopping
    AIR_RESISTANCE: 0.95,  // Better air control    // Enhanced movement constants
    ACCELERATION: 500,   // How fast player accelerates (slightly increased for better feel)
    DECELERATION: 800,   // How fast player decelerates when no input (increased to prevent drift)
    AIR_ACCELERATION: 250,  // Air movement control (slightly increased)
    JUMP_BUFFER_TIME: 150,  // Jump input buffer in ms
    COYOTE_TIME: 120,  // Grace period for jumping after leaving ground
    
    // Health system
    PLAYER_HEALTH: 3,
    MAX_HEALTH: 3,
    INVULNERABILITY_DURATION: 1500,
    
    // Game over
    GAME_OVER_FADE_DURATION: 1500,
    
      // Performance constants
    FPS_COUNTER_UPDATE_INTERVAL: 1000,
    DEFAULT_FRAME_TIME: 16.67,
    CACHE_CLEANUP_INTERVAL: 5000,
    
    // UI constants
    TOAST_DURATION: 3000,
    INVULNERABILITY_FLASH_INTERVAL: 100,
    DAMAGE_TEXT_LIFETIME: 1500,
    HEAL_TEXT_LIFETIME: 1500,
    COLLECTION_EFFECT_LIFETIME: 800,
    
    // Audio constants
    SOUND_EFFECT_VOLUME: 0.7,
    BACKGROUND_MUSIC_VOLUME: 0.5,
    
    // Animation constants
    DASH_INITIAL_SPEED: 800,
    DASH_DURATION: 600,
    DASH_COOLDOWN: 7000,
    DASH_DECELERATION_RATE: 0.92,
    
    // Background particle constants
    BACKGROUND_PARTICLE_COUNT: 30,
    BACKGROUND_PARTICLE_SPEED: 20,
    BACKGROUND_PARTICLE_LIFETIME: 5000,
    
    // Spawn protection
    SPAWN_PROTECTION_TIME: 2000,
    SPAWN_PROTECTION_FRAMES: 60,
    
    // Shop upgrade constants
    SPEED_BOOST_MULTIPLIER: 1.3,
    DATAPACK_MULTIPLIER: 2.0,
    SCORE_MULTIPLIER: 1.25,
    COMBO_BONUS_INCREMENT: 0.5,
    
    // Shop upgrade constants
    SPEED_BOOST_MULTIPLIER: 1.3,
    DATAPACK_MULTIPLIER: 2.0,
    SCORE_MULTIPLIER: 1.25,
    COMBO_BONUS_INCREMENT: 0.5,
    
    // Generation probabilities
    FLOOR_BASE_CHANCE: 70,    GAP_CHANCE: 25,
    SPIKE_CHANCE: 8, // Reduced from 15 to 8 to make room for saws
    GLITCH_CHANCE: 8,
    PLATFORM_CHANCE: 12,
    MIN_FLOOR_STREAK: 2,
    MAX_GAP_SIZE: 5,    SPIKE_MIN_DISTANCE: 5,    // New obstacle types probabilities    SAW_CHANCE: 30, // Increased back to 30% with better spacing logic
    LASER_CHANCE: 3, // Reduced from 6 to make lasers spawn less frequently
    CRUSHER_CHANCE: 12, // Increased from 4 to 12 to make crushers spawn 3x more often// Obstacle parameters
    SAW_ROTATION_SPEED: 1,       // Rotations per second (reduced from 5 for visibility)
    LASER_INTERVAL: 2000,        // Milliseconds between firing
    CRUSHER_CYCLE_TIME: 4000     // Milliseconds for full crusher cycle
};

export const TILE_TYPES = {
    EMPTY: 0,
    FLOOR: 1,
    GAP: 2,
    SPIKE: 3,
    GLITCH: 4,
    PLATFORM: 5,
    DATA_PACKET: 6,
    SAW: 7,
    LASER: 8,
    CRUSHER: 9
};

export const GAME_STATES = {
    LOADING: 'loading',
    INITIALIZING: 'initializing',
    OPENING_ANIMATION: 'openingAnimation',
    POST_ANIMATION_POPUP: 'postAnimationPopup',
    LOGIN_PROMPT: 'loginPrompt',
    TUTORIAL: 'tutorial',
    HOME: 'home',
    PROFILE: 'profile',
    OPTIONS: 'options',
    DIFFICULTY_SELECT: 'difficultySelect',
    CREDITS: 'credits',
    CHANGELOG: 'changelog',
    LEADERBOARD: 'leaderboard',
    ACHIEVEMENTS: 'achievements',
    SETTINGS: 'settings',
    RESET_CONFIRM: 'resetConfirm',
    SHOP: 'shop',
    CHARACTER_CUSTOMIZATION: 'characterCustomization',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

export const DIFFICULTY_LEVELS = {
    EASY: {
        name: 'Easy',
        emoji: '🔹',
        description: 'Frequent life boxes - Perfect for beginners',
        healthRegenInterval: 60000, // 1 minute (deprecated)
        color: '#40d158',
        // Progressive difficulty scaling
        obstacleScaling: 0.15, // Slower obstacle increase
        gapScaling: 0.1, // Smaller gap increases
        difficultyInterval: 1500, // Every 1500m increase difficulty
        maxDifficultyMultiplier: 2.5 // Cap at 2.5x base difficulty
    },    MEDIUM: {
        name: 'Medium',
        emoji: '🔸',
        description: 'Moderate life boxes - Balanced challenge',
        healthRegenInterval: 180000, // 3 minutes (deprecated)
        color: '#ffd700',
        // Progressive difficulty scaling
        obstacleScaling: 0.25, // Moderate obstacle increase
        gapScaling: 0.2, // Moderate gap increases
        difficultyInterval: 1200, // Every 1200m increase difficulty
        maxDifficultyMultiplier: 3.0 // Cap at 3x base difficulty
    },    HARD: {
        name: 'Hard',
        emoji: '🔴',
        description: 'Rare life boxes - For experienced players',
        healthRegenInterval: 420000, // 7 minutes (deprecated)
        color: '#ff6b35',
        // Progressive difficulty scaling
        obstacleScaling: 0.35, // Faster obstacle increase
        gapScaling: 0.3, // Larger gap increases
        difficultyInterval: 1000, // Every 1000m increase difficulty
        maxDifficultyMultiplier: 4.0 // Cap at 4x base difficulty
    },    EXTREME: {
        name: 'Extreme',
        emoji: '❌',
        description: 'No life boxes - Ultimate survival challenge',
        healthRegenInterval: 0, // Never (deprecated)
        color: '#f85149',
        // Progressive difficulty scaling
        obstacleScaling: 0.5, // Aggressive obstacle increase
        gapScaling: 0.4, // Largest gap increases
        difficultyInterval: 800, // Every 800m increase difficulty
        maxDifficultyMultiplier: 5.0 // Cap at 5x base difficulty
    }
};

export const PLAYER_MODES = {
    LIVE: 'live',
    DEBUG: 'debug'
};

export const COLORS = {
    // Floor colors
    FLOOR_MAIN: '#21262d',
    FLOOR_HIGHLIGHT: '#30363d',
    FLOOR_BORDER: '#161b22',
    
    // Platform colors
    PLATFORM_BASE: '#238636',
    PLATFORM_HIGHLIGHT: '#2ea043',
    PLATFORM_DETAILS: '#1f2328',
    PLATFORM_INDICATOR: '#3fb950',
    
    // Spike colors
    SPIKE_BASE: 'rgba(248, 81, 73, {alpha})',
    SPIKE_POINTS: 'rgba(255, 100, 90, {alpha})',
    
    // Glitch colors
    GLITCH_BASE: 'rgba(165, 243, 252, {alpha})',
    GLITCH_PATTERN: 'rgba(103, 232, 249, {alpha})',
    GLITCH_NOISE: 'rgba(8, 145, 178, {alpha})',
      // Player colors
    PLAYER_LIVE: '#58a6ff',
      // New obstacle colors
    SAW_BASE: '#718096',
    SAW_TEETH: '#E2E8F0',
    SAW_CENTER: '#2D3748',    LASER_BEAM: 'rgba(239, 68, 68, {alpha})',
    LASER_SOURCE: '#7F1D1D',
    LASER_WARNING: 'rgba(254, 202, 202, {alpha})',
    
    CRUSHER_BODY: '#64748B',
    CRUSHER_HIGHLIGHT: '#94A3B8',
    CRUSHER_WARNING: '#EF4444'
};
