// ByteSurge: Infinite Loop - Game Core
// Main game engine, loop, and coordination

// ===== SPRITE LOADING SYSTEM =====
const sprites = {
    drone: null,
    harvester: null,
    loaded: false,
    toLoad: 2
};

function loadSprites() {
    return new Promise((resolve) => {
        let loadedCount = 0;
        
        function onImageLoad() {
            loadedCount++;
            if (loadedCount === sprites.toLoad) {
                sprites.loaded = true;
                resolve();
            }
        }
        
        // Load drone sprite
        sprites.drone = new Image();
        sprites.drone.onload = onImageLoad;
        sprites.drone.onerror = () => {
            sprites.drone = null;
            onImageLoad();
        };
        sprites.drone.src = 'assets/Drone.png';
        
        // Load harvester sprite
        sprites.harvester = new Image();
        sprites.harvester.onload = onImageLoad;
        sprites.harvester.onerror = () => {
            sprites.harvester = null;
            onImageLoad();
        };
        sprites.harvester.src = 'assets/Harvester.png';
    });
}

// Make sprites globally accessible
window.sprites = sprites;

// ===== CORE GAME VARIABLES =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const loadingText = document.getElementById('loadingText') || null;
const gameStats = document.getElementById('gameStats') || null;

// Make canvas globally accessible
window.canvas = canvas;
window.ctx = ctx;

// ===== OPENING ANIMATION =====
let openingAnimation = null;
let homeScreen = null;
let showingOpeningAnimation = true;
let showingHomeScreen = false;

// ===== GAME STATE MANAGEMENT =====
let gameInitialized = false;
let gameRunning = false;
let gamePaused = false;
let lastTime = 0;
let frameCount = 0;
let fps = 60;
let fpsCounter = 0;
let lastFpsTime = 0;

// ===== PERFORMANCE MONITORING =====
let performanceMetrics = {
    frameTime: 0,
    updateTime: 0,
    renderTime: 0,
    avgFrameTime: 0,
    frameHistory: []
};

// ===== GAME STATISTICS =====
let gameState = {
    distance: 0,
    energy: 0,
    harvesters: 0,
    maxHarvesters: 3,
    zoneLevel: 1,
    score: 0,
    // Phase 2: Zone progression
    currentZone: 1,
    lastZoneDistance: 0,
    zoneDistance: 1000, // Distance required for next zone
    totalZonesBonuses: 0
};

// ===== ZONE SYSTEM =====
let zoneSystem = {
    zoneColors: [
        { bg: '#1a1a1a', accent: '#333', energy: '#ffff00' },      // Zone 1: Dark Gray - Yellow Energy
        { bg: '#1a1a2a', accent: '#4444aa', energy: '#00ffff' },   // Zone 2: Deep Blue - Cyan Energy
        { bg: '#2a1a1a', accent: '#aa4444', energy: '#ff4444' },   // Zone 3: Deep Red - Red Energy
        { bg: '#1a2a1a', accent: '#44aa44', energy: '#44ff44' },   // Zone 4: Deep Green - Green Energy
        { bg: '#2a2a1a', accent: '#aaaa44', energy: '#ffaa00' },   // Zone 5: Deep Yellow - Orange Energy
        { bg: '#2a1a2a', accent: '#aa44aa', energy: '#ff00ff' },   // Zone 6: Deep Purple - Magenta Energy
        { bg: '#1a2a2a', accent: '#44aaaa', energy: '#00ffaa' },   // Zone 7: Deep Cyan - Teal Energy
        { bg: '#2a2a2a', accent: '#888888', energy: '#ffffff' }    // Zone 8+: Dark Gray - White Energy
    ],
    
    // Energy value multipliers and bonus scaling per zone
    energyMultipliers: [1, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0],
    zoneBonusBase: 10, // Base bonus energy for reaching a new zone
    zoneBonusMultiplier: 1.5, // Each zone's bonus is multiplied by this
    
    // Background scroll effect
    backgroundOffset: 0,
    scrollSpeed: 0.5,
    
    // Transition effects
    transitionData: null,
    transitionParticles: [],
    
    getCurrentZoneData() {
        const zoneIndex = Math.min(gameState.currentZone - 1, this.zoneColors.length - 1);
        return {
            colors: this.zoneColors[zoneIndex],
            energyMultiplier: this.energyMultipliers[Math.min(gameState.currentZone - 1, this.energyMultipliers.length - 1)]
        };
    },
    
    checkZoneProgression() {
        const newZone = Math.floor(gameState.distance / gameState.zoneDistance) + 1;
        
        if (newZone > gameState.currentZone) {
            // Zone progression!
            const oldZone = gameState.currentZone;
            gameState.currentZone = newZone;
            gameState.zoneLevel = newZone;
            
            // Calculate scaled zone bonus
            const zoneBonus = Math.floor(
                this.zoneBonusBase * Math.pow(this.zoneBonusMultiplier, newZone - 1)
            );
            
            // Apply bonuses
            gameState.energy += zoneBonus;
            gameState.score += zoneBonus * 5;
            gameState.totalZonesBonuses += zoneBonus;
            
            // Visual feedback
            this.triggerZoneTransition(oldZone, newZone, zoneBonus);
            
            // Increase difficulty
            if (window.corruptionSystem) {
                window.corruptionSystem.increaseZoneDifficulty(newZone);
            }
            
            return true;
        }
        
        return false;
    },
    
    update(deltaTime) {
        // Update background scroll
        this.backgroundOffset += this.scrollSpeed * deltaTime;
        if (this.backgroundOffset >= window.GAME_WIDTH) {
            this.backgroundOffset = 0;
        }
    },
    
    renderBackground(ctx) {
        const zoneData = this.getCurrentZoneData();
        const { bg, accent } = zoneData.colors;
        
        // Main background
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
        
        // Scrolling accent lines
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        
        const lineSpacing = 100;
        for (let x = -lineSpacing + this.backgroundOffset; x < window.GAME_WIDTH; x += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + window.GAME_WIDTH * 0.1, window.GAME_HEIGHT);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
    },
      triggerZoneTransition(oldZone, newZone, bonus) {
        // Enhanced screen flash sequence with zone color
        if (window.createScreenFlash) {
            const newZoneColor = this.zoneColors[Math.min(newZone - 1, this.zoneColors.length - 1)].energy;
            
            // Initial bright flash
            window.createScreenFlash(newZoneColor, 0.6, 300);
            
            // Secondary flash with zone background color for depth
            setTimeout(() => {
                const bgColor = this.zoneColors[Math.min(newZone - 1, this.zoneColors.length - 1)].bg;
                window.createScreenFlash(bgColor, 0.4, 400);
            }, 200);
            
            // Final accent flash
            setTimeout(() => {
                window.createScreenFlash(newZoneColor, 0.3, 600);
            }, 500);
        }
        
        // Enhanced haptic feedback pattern that scales with zone level
        if (navigator.vibrate) {
            // Create a crescendo pattern
            const basePattern = [50, 50, 100, 50, 150, 100];
            const enhancedPattern = [];
            for (let i = 0; i < Math.min(newZone, 5); i++) {
                enhancedPattern.push(...basePattern.map(v => v + (i * 20)));
            }
            navigator.vibrate(enhancedPattern);
        }
        
        // Store transition data for rendering with enhanced effects
        this.showZoneTransition(oldZone, newZone, bonus);
        
        // Create particle burst effect
        this.createZoneTransitionParticles(newZone);
        
        // Play zone transition sound if available
        if (window.audio && window.audio.playSound) {
            window.audio.playSound('zoneTransition');
        }
    },
      showZoneTransition(oldZone, newZone, bonus) {
        // Store transition data for rendering with enhanced animation curves
        this.transitionData = {
            startTime: performance.now(),
            duration: 4000, // Extended to 4 seconds for better pacing
            oldZone,
            newZone,
            bonus,
            alpha: 1,
            scale: 0.1, // Start small for dramatic entrance
            phase: 'entering' // entering -> displaying -> exiting
        };
    },
    
    createZoneTransitionParticles(zoneLevel) {
        // Create particle burst effect for zone transition
        const particleCount = Math.min(20 + (zoneLevel * 5), 60);
        const zoneColor = this.zoneColors[Math.min(zoneLevel - 1, this.zoneColors.length - 1)].energy;
        
        this.transitionParticles = [];
        
        for (let i = 0; i < particleCount; i++) {
            this.transitionParticles.push({
                x: window.GAME_WIDTH / 2,
                y: window.GAME_HEIGHT / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                decay: 0.02 + Math.random() * 0.01,
                size: 2 + Math.random() * 4,
                color: zoneColor,
                pulse: Math.random() * Math.PI * 2
            });
        }
        
        // Clear particles after animation
        setTimeout(() => {
            this.transitionParticles = [];
        }, 3000);
    },
      renderZoneTransition(ctx) {
        if (!this.transitionData) return;
        
        const elapsed = performance.now() - this.transitionData.startTime;
        const progress = elapsed / this.transitionData.duration;
        
        if (progress >= 1) {
            this.transitionData = null;
            return;
        }
        
        // Enhanced animation phases with easing
        let alpha, scale, textOffset;
        
        if (progress < 0.3) {
            // Entrance phase - dramatic scale up
            const phaseProgress = progress / 0.3;
            scale = this.easeOutElastic(phaseProgress);
            alpha = phaseProgress;
            textOffset = 0;
        } else if (progress < 0.7) {
            // Display phase - stable with subtle pulse
            const phaseProgress = (progress - 0.3) / 0.4;
            scale = 1 + Math.sin(phaseProgress * Math.PI * 4) * 0.05;
            alpha = 1;
            textOffset = Math.sin(phaseProgress * Math.PI * 2) * 3;
        } else {
            // Exit phase - fade out with slight scale down
            const phaseProgress = (progress - 0.7) / 0.3;
            scale = 1 - phaseProgress * 0.2;
            alpha = 1 - (phaseProgress * phaseProgress);
            textOffset = -phaseProgress * 20;
        }
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Enhanced background overlay with gradient
        const gradient = ctx.createRadialGradient(
            window.GAME_WIDTH / 2, window.GAME_HEIGHT / 2, 0,
            window.GAME_WIDTH / 2, window.GAME_HEIGHT / 2, window.GAME_WIDTH
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
        
        // Get zone colors for enhanced styling
        const zoneColor = this.zoneColors[Math.min(this.transitionData.newZone - 1, this.zoneColors.length - 1)].energy;
        
        const centerX = window.GAME_WIDTH / 2;
        const centerY = window.GAME_HEIGHT / 2 + textOffset;
        
        // Scale and center text
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);
        
        // Main zone transition text with glow effect
        ctx.shadowColor = zoneColor;
        ctx.shadowBlur = 20;
        ctx.fillStyle = zoneColor;
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(`ENTERING ZONE ${this.transitionData.newZone}`, centerX, centerY - 50);
        
        // Energy bonus with enhanced styling
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`+${this.transitionData.bonus} ENERGY BONUS!`, centerX, centerY + 10);
        
        // Zone type indicator with dynamic coloring
        const zoneTypes = ['BASIC', 'ENHANCED', 'ADVANCED', 'SUPERIOR', 'ELITE', 'MASTER', 'LEGENDARY', 'COSMIC'];
        const zoneType = zoneTypes[Math.min(this.transitionData.newZone - 1, zoneTypes.length - 1)];
        
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`${zoneType} ENERGY ZONE`, centerX, centerY + 45);
        
        // Zone progress bar
        const barWidth = 200;
        const barHeight = 8;
        const barX = centerX - barWidth / 2;
        const barY = centerY + 75;
        
        // Background bar
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Progress bar
        const progressWidth = (this.transitionData.newZone / Math.max(this.transitionData.newZone + 5, 10)) * barWidth;
        ctx.fillStyle = zoneColor;
        ctx.fillRect(barX, barY, progressWidth, barHeight);
        
        ctx.restore();
        
        // Render transition particles
        this.renderTransitionParticles(ctx);
    },
    
    renderTransitionParticles(ctx) {
        if (!this.transitionParticles) return;
        
        ctx.save();
        
        for (let i = this.transitionParticles.length - 1; i >= 0; i--) {
            const particle = this.transitionParticles[i];
            
            // Update particle
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            particle.pulse += 0.2;
            
            if (particle.life <= 0) {
                this.transitionParticles.splice(i, 1);
                continue;
            }
            
            // Apply slight gravity and friction
            particle.vy += 0.1;
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            // Render particle with pulsing effect
            const pulseSize = particle.size * (1 + Math.sin(particle.pulse) * 0.3);
            const alpha = particle.life * (0.6 + Math.sin(particle.pulse * 2) * 0.4);
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = pulseSize * 2;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, pulseSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    },
    
    // Easing function for dramatic entrance effect
    easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
};

// ===== VIEWPORT MANAGEMENT =====
let viewportManager = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    
    updateScale() {
        const containerRect = canvas.getBoundingClientRect();
        const scaleX = containerRect.width / window.GAME_WIDTH;
        const scaleY = containerRect.height / window.GAME_HEIGHT;
        this.scale = Math.min(scaleX, scaleY);
        
        this.offsetX = (containerRect.width - window.GAME_WIDTH * this.scale) / 2;
        this.offsetY = (containerRect.height - window.GAME_HEIGHT * this.scale) / 2;
    },
    
    screenToGame(screenX, screenY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (screenX - rect.left - this.offsetX) / this.scale,
            y: (screenY - rect.top - this.offsetY) / this.scale
        };
    },
    
    gameToScreen(gameX, gameY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: rect.left + this.offsetX + gameX * this.scale,
            y: rect.top + this.offsetY + gameY * this.scale
        };
    }
};

// ===== GAME ENTITIES =====
let drone = null;

// ===== CANVAS SETUP =====
function setupCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
      // Base dimensions (expanded for better gameplay experience)
    const baseWidth = 1200;
    const baseHeight = 800;
    
    // Set actual canvas size with device pixel ratio for crisp rendering
    canvas.width = baseWidth * dpr;
    canvas.height = baseHeight * dpr;
    
    // Set display size (CSS pixels)
    canvas.style.width = baseWidth + 'px';
    canvas.style.height = baseHeight + 'px';
    
    // Scale the drawing context to match the device pixel ratio
    ctx.scale(dpr, dpr);
    
    // Configure rendering settings for pixel-perfect 2D graphics
    ctx.imageSmoothingEnabled = false; // Sharp pixel art
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    
    // Store canvas dimensions for game logic
    window.GAME_WIDTH = baseWidth;
    window.GAME_HEIGHT = baseHeight;
    window.CANVAS_DPR = dpr;

}

// ===== GAME CONTROLS =====
function togglePause() {
    gamePaused = !gamePaused;
    
    // Handle music pause/resume
    if (gamePaused) {
        if (window.pauseBackgroundMusic) {
            window.pauseBackgroundMusic();
        }
    } else {
        if (window.resumeBackgroundMusic) {
            window.resumeBackgroundMusic();
        }
    }
}

function resetGame(goToHomeScreen = false) {
    // Stop the game immediately to prevent rendering conflicts
    gameRunning = false;
    
    // Clear any death screen states
    isDeathScreenShowing = false;
    isDeathTransitioning = false;
    
    // Save harvester data before resetting (for offline progress)
    if (window.offlineProgressSystem) {
        window.offlineProgressSystem.saveHarvesterData();
    }
    
    // Reset game state
    gameState.distance = 0;
    gameState.energy = 0;
    gameState.harvesters = 0;
    gameState.zoneLevel = 1;
    gameState.score = 0;
    
    // Reset zone progression
    gameState.currentZone = 1;
    gameState.lastZoneDistance = 0;
    gameState.totalZonesBonuses = 0;
    
    // Reset drone
    if (drone) {
        drone.reset();
    }
      // Reset energy nodes
    if (window.resetEnergyNodes) {
        window.resetEnergyNodes();
    }
      // Reset corruption zones
    if (window.resetCorruptionZones) {
        window.resetCorruptionZones();
    }
    
    // Reset harvesters
    if (window.resetHarvesters) {
        window.resetHarvesters();
    }
    
    // Check if we should return to home screen
    if (goToHomeScreen) {
        returnToHomeScreen();
        return;
    }
    
    // Reset harvesters
    if (window.resetHarvesters) {
        window.resetHarvesters();
    }
    
    if (goToHomeScreen) {
        returnToHomeScreen();
    } else {
        // Visual feedback
        if (window.createScreenFlash) {
            window.createScreenFlash('#ffffff', 0.3, 200);
        }
    }
}

function returnToHomeScreen() {
    // Stop the game
    gameRunning = false;
    gamePaused = false;
    
    // Stop background music
    if (window.stopBackgroundMusic) {
        window.stopBackgroundMusic();
    }
    
    // Hide game stats
    if (gameStats) {
        gameStats.style.display = 'none';
    }
    
    // Reset game state
    resetGame();
      // Show home screen
    showingHomeScreen = true;
      // Re-initialize home screen if needed
    if (!homeScreen && window.HomeScreen) {
        homeScreen = new window.HomeScreen(canvas, ctx);
    }
    
    // Initialize tutorial system if not already done
    if (!window.tutorialSystem && window.TutorialSystem) {
        window.tutorialSystem = new window.TutorialSystem(canvas, ctx);
        }

}

let isDeathScreenShowing = false; // Add state tracking
let isDeathTransitioning = false; // Track death transition state

function handleGameOver() {
    // Prevent multiple death screens
    if (isDeathScreenShowing || isDeathTransitioning) {
        return;
    }
    
    // Start smooth death transition instead of red flash
    startDeathTransition();
}

// Smooth death transition with drone zoom-in
function startDeathTransition() {
    if (isDeathScreenShowing || isDeathTransitioning) {
        return;
    }
    
    // Clean up any existing death screens before starting transition
    const existingOverlays = document.querySelectorAll('#death-screen-overlay');
    existingOverlays.forEach(overlay => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            }
    });
    
    // Set transition flag
    isDeathTransitioning = true;
    gameRunning = false; // Stop game logic but don't set gamePaused
    
    // Store drone position for zoom effect
    const droneX = drone ? drone.x : window.GAME_WIDTH / 2;
    const droneY = drone ? drone.y : window.GAME_HEIGHT / 2;
    
    // Death transition state
    const transition = {
        duration: 1500, // 1.5 seconds
        startTime: performance.now(),
        startZoom: 1,
        endZoom: 3,
        startAlpha: 1,
        endAlpha: 0,
        centerX: droneX,
        centerY: droneY
    };
    
    // Transition animation function
    function animateDeathTransition(currentTime) {
        const elapsed = currentTime - transition.startTime;
        const progress = Math.min(elapsed / transition.duration, 1);
        
        // Smooth easing (ease-in-out)
        const easeProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
        
        // Calculate current zoom and alpha
        const currentZoom = transition.startZoom + (transition.endZoom - transition.startZoom) * easeProgress;
        const currentAlpha = transition.startAlpha - (transition.startAlpha - transition.endAlpha) * easeProgress;
        
        // Clear canvas
        ctx.clearRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
        
        // Apply zoom transformation
        ctx.save();
        ctx.globalAlpha = currentAlpha;
        
        // Zoom in on drone position
        ctx.translate(transition.centerX, transition.centerY);
        ctx.scale(currentZoom, currentZoom);
        ctx.translate(-transition.centerX, -transition.centerY);
          // Render the game world one last time
        if (window.zoneSystem) {
            window.zoneSystem.renderBackground(ctx);
        }
        
        // Render drone (if it exists)
        if (drone) {
            drone.render(ctx);
        }
        
        // Render energy nodes
        if (window.renderEnergyNodes) {
            window.renderEnergyNodes(ctx);
        }
        
        // Render harvesters
        if (window.renderHarvesters) {
            window.renderHarvesters(ctx);
        }
        
        ctx.restore();
        
        // Add dark overlay that fades in
        ctx.fillStyle = `rgba(0, 0, 0, ${easeProgress * 0.7})`;
        ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
          // Continue animation or show death screen
        if (progress < 1) {
            requestAnimationFrame(animateDeathTransition);
        } else {
            // Transition complete, clear transition flag and show death screen
            isDeathTransitioning = false;
            showDeathScreen();
        }
    }
    
    // Start the transition animation
    requestAnimationFrame(animateDeathTransition);
}

function showDeathScreen() {
    // NUCLEAR CLEANUP - Remove ALL possible death-related elements
    document.querySelectorAll('[id*="death"], [class*="death"], #death-screen-overlay').forEach(el => {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
            }
    });
    
    // Prevent multiple death screens
    if (isDeathScreenShowing) {
        return;
    }
    
    // Clear canvas completely and reset transformations
    if (window.ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation matrix
        ctx.clearRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
        ctx.globalAlpha = 1; // Reset alpha
        ctx.restore();
    }
    
    // Force reset all death-related states
    isDeathScreenShowing = true;
    isDeathTransitioning = false;
    
    // Pause the game
    gameRunning = false;
    gamePaused = true;
    
    // Funny death messages
    const deathMessages = [
        "SYSTEM FAILURE: Your drone forgot how to exist.",
        "Oops... your code just threw a NullPointerException.",
        "You zigged. You should've zagged.",
        "404: Drone not found.",
        "The corruption says thanks for the snack.",
        "You've been logged off... permanently.",
        "Whoops! That wasn't a power-up.",
        "Byte me! (you got byte'd)",
        "Next time try dodging with style.",
        "Data loss detected. Restore from backup? Just kidding.",
        "Your drone just subscribed to the crash course.",
        "The void called. You answered.",
        "Error 1337: You got outplayed.",
        "You just got decompiled.",
        "Drone.exe has stopped responding... forever.",
        "This was not the debug mode you were looking for.",
        "Achievement unlocked: Fastest Self-Destruction!",
        "That looked cooler in your head.",
        "AI: 1 — You: 0",
        "You've been corrupted... spiritually and literally."
    ];
    
    // Pick a random death message
    const randomMessage = deathMessages[Math.floor(Math.random() * deathMessages.length)];
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'death-screen-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(145deg, rgba(20, 0, 0, 0.95), rgba(40, 0, 20, 0.95));
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'Courier New', monospace;
        animation: deathFadeIn 0.5s ease-out;
    `;

    // Create death screen content
    const deathScreen = document.createElement('div');
    deathScreen.style.cssText = `
        background: linear-gradient(145deg, #2a0a0a, #1a0a1a);
        border: 3px solid #ff3333;
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 0 40px rgba(255, 51, 51, 0.6);
        animation: deathSlideIn 0.6s ease-out;
    `;

    // Add death screen animations if not already added
    if (!document.querySelector('#death-screen-styles')) {
        const style = document.createElement('style');
        style.id = 'death-screen-styles';
        style.textContent = `
            @keyframes deathFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes deathSlideIn {
                from { transform: scale(0.5) translateY(-100px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
            }
            @keyframes deathGlow {
                0%, 100% { text-shadow: 0 0 15px #ff3333; }
                50% { text-shadow: 0 0 25px #ff3333, 0 0 35px #ff6666; }
            }
            .death-title { animation: deathGlow 2s infinite; }
            .death-button {
                transition: all 0.3s ease;
                transform: scale(1);
            }
            .death-button:hover {
                transform: scale(1.05);
                box-shadow: 0 0 20px rgba(255, 51, 51, 0.4);
            }
        `;
        document.head.appendChild(style);
    }

    // Calculate final stats
    const distance = Math.floor(window.gameState ? window.gameState.distance : 0);
    const energy = Math.floor(window.gameState ? window.gameState.energy : 0);
    const score = Math.floor(window.gameState ? window.gameState.score : 0);
    const zone = window.gameState ? window.gameState.currentZone : 1;

    deathScreen.innerHTML = `
        <h1 style="color: #ff3333; margin: 0 0 20px 0; font-size: 28px; font-weight: bold;" class="death-title">
            GAME OVER
        </h1>
        
        <div style="color: #ffaaaa; font-size: 16px; margin-bottom: 25px; line-height: 1.4;">
            ${randomMessage}
        </div>
        
        <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #ff6666; margin: 0 0 15px 0; font-size: 18px;">Final Stats</h3>
            <div style="color: #ffffff; font-size: 14px; line-height: 1.6;">
                <div>Distance: <span style="color: #ffff00;">${distance}m</span></div>
                <div>Energy: <span style="color: #00ff00;">${energy}</span></div>
                <div>Score: <span style="color: #00aaff;">${score}</span></div>
                <div>Zone Reached: <span style="color: #ff9900;">${zone}</span></div>
            </div>
        </div>        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 30px;">
            <button id="death-restart" class="death-button" style="
                background: linear-gradient(145deg, #aa2222, #ff3333);
                border: none;
                color: #ffffff;
                padding: 15px 30px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 10px;
                cursor: pointer;
                font-family: inherit;
                pointer-events: auto;
                z-index: 10001;
                position: relative;
            ">🔄 RESTART GAME</button>
            
            <button id="death-upgrades" class="death-button" style="
                background: linear-gradient(145deg, #2222aa, #3333ff);
                border: none;
                color: #ffffff;
                padding: 15px 30px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 10px;
                cursor: pointer;
                font-family: inherit;
                pointer-events: auto;
                z-index: 10001;
                position: relative;
            ">⚡ UPGRADES</button>
              <button id="death-leaderboard" class="death-button" style="
                background: linear-gradient(145deg, #228822, #33aa33);
                border: none;
                color: #ffffff;
                padding: 15px 30px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 10px;
                cursor: pointer;
                font-family: inherit;
                pointer-events: auto;
                z-index: 10001;
                position: relative;
            ">🏆 LEADERBOARD</button>
              <button id="death-upload-score" class="death-button" style="
                background: linear-gradient(145deg, #aa6622, #ff9933);
                border: none;
                color: #ffffff;
                padding: 15px 30px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 10px;
                cursor: pointer;
                font-family: inherit;
                pointer-events: auto;
                z-index: 10001;
                position: relative;
                display: block;
            ">📤 UPLOAD SCORE</button>
            
            <button id="death-home" class="death-button" style="
                background: linear-gradient(145deg, #555555, #777777);
                border: none;
                color: #ffffff;
                padding: 15px 30px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 10px;
                cursor: pointer;
                font-family: inherit;
                pointer-events: auto;                z-index: 10001;
                position: relative;
            ">🏠 MAIN MENU</button>
        </div>
    `;
    
    overlay.appendChild(deathScreen);
    document.body.appendChild(overlay);
    
    // Prevent overlay clicks from bubbling
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
      // Handle button clicks
    const restartBtn = document.getElementById('death-restart');
    const upgradesBtn = document.getElementById('death-upgrades');
    const leaderboardBtn = document.getElementById('death-leaderboard');
    const uploadScoreBtn = document.getElementById('death-upload-score');
    const homeBtn = document.getElementById('death-home');
    
    if (restartBtn) {
        restartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Show loading screen immediately
            showLoadingScreen();
            
            // Use setTimeout to allow loading screen to render, then reload and auto-start
            setTimeout(() => {
                // Store a flag that we want to auto-start after reload
                localStorage.setItem('autoStartGame', 'true');
                
                // Reload the page
                window.location.reload();
            }, 500); // Show loading for 500ms before reload
        });
    }
    
    if (upgradesBtn) {
        upgradesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Temporarily enable game systems so upgrade menu can render
            const wasGameRunning = gameRunning;
            gameRunning = true; // Enable rendering systems
            gamePaused = true;  // But keep game paused
            
            // Hide death screen temporarily so upgrade menu can show on top
            const deathScreenOverlay = document.getElementById('death-screen-overlay');
            if (deathScreenOverlay) {
                deathScreenOverlay.style.display = 'none';
            }
            
            // Open upgrade menu
            if (window.upgradeMenuUI && window.upgradeMenuUI.openMenu) {
                window.upgradeMenuUI.openMenu();
                
                // Store state to restore when upgrade menu closes
                window.upgradeMenuUI.deathScreenActive = true;
                window.upgradeMenuUI.wasGameRunning = wasGameRunning;
                window.upgradeMenuUI.deathScreenOverlay = deathScreenOverlay;            } else {
                if (window.upgradeSystem) {
                    window.upgradeSystem.isMenuOpen = true;
                }
            }
        });
    }    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Show leaderboard without closing death screen
            if (window.authUI && window.authUI.showLeaderboard) {
                window.authUI.showLeaderboard();
            } else {
                // Fallback: show sign-in prompt
                if (window.authUI && window.authUI.showSignInMenu) {
                    window.authUI.showSignInMenu();
                }
            }
        });
    }

    if (uploadScoreBtn) {
        uploadScoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Manually upload current score to leaderboard
            if (window.leaderboardSystem && window.firebaseSystem && window.firebaseSystem.isSignedIn()) {
                uploadScoreBtn.disabled = true;
                uploadScoreBtn.textContent = '⏳ Uploading...';
                  window.leaderboardSystem.submitScoreManual(
                    window.gameState.score,
                    Math.floor(window.gameState.distance),
                    window.gameState.currentZone || 1
                ).then((success) => {
                    if (success) {
                        uploadScoreBtn.textContent = '✅ Uploaded!';
                        uploadScoreBtn.style.background = 'linear-gradient(145deg, #228822, #33aa33)';
                        
                        // Show success message
                        const successMsg = document.createElement('div');
                        successMsg.style.cssText = `
                            color: #00ff00;
                            font-size: 12px;
                            margin-top: 5px;
                            text-align: center;
                            animation: deathGlow 2s infinite;
                        `;
                        successMsg.textContent = '🎉 Score successfully uploaded to leaderboard!';
                        uploadScoreBtn.parentElement.insertBefore(successMsg, uploadScoreBtn.nextSibling);
                        
                        // Hide button after success
                        setTimeout(() => {
                            uploadScoreBtn.style.display = 'none';
                        }, 3000);
                    } else {
                        uploadScoreBtn.textContent = '❌ Failed';
                        uploadScoreBtn.disabled = false;
                        setTimeout(() => {
                            uploadScoreBtn.textContent = '📤 UPLOAD SCORE';
                        }, 2000);
                    }
                }).catch((error) => {
                    console.error('Upload failed:', error);
                    uploadScoreBtn.textContent = '❌ Error';
                    uploadScoreBtn.disabled = false;
                    setTimeout(() => {
                        uploadScoreBtn.textContent = '📤 UPLOAD SCORE';
                    }, 2000);
                });
            } else {
                // User not signed in - show sign in prompt
                if (window.authUI && window.authUI.showSignInMenu) {
                    window.authUI.showSignInMenu();
                }
            }
        });
    }

    if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();            closeDeathScreen();
            resetGame(true); // Go to main menu
        });
    }
      // Save final score if it's a high score
    if (window.gameState && window.gameState.score > 0) {
        const savedHighScore = localStorage.getItem('highScore');
        const currentHighScore = savedHighScore ? parseInt(savedHighScore) : 0;
        const isNewHighScore = window.gameState.score > currentHighScore;
        
        if (isNewHighScore) {
            localStorage.setItem('highScore', window.gameState.score.toString());
            
            // Add high score indicator
            const highScoreIndicator = document.createElement('div');
            highScoreIndicator.style.cssText = `
                color: #ffff00;
                font-size: 14px;
                font-weight: bold;
                margin-top: 10px;
                animation: deathGlow 1.5s infinite;
            `;
            highScoreIndicator.textContent = '🏆 NEW HIGH SCORE! 🏆';            deathScreen.insertBefore(highScoreIndicator, deathScreen.querySelector('.death-button').parentElement);
        }
          // Always show upload button for all users
        const uploadBtn = deathScreen.querySelector('#death-upload-score');
        if (uploadBtn) {
            uploadBtn.style.display = 'block';
            uploadBtn.style.visibility = 'visible';
            } else {
            console.error('❌ Upload button not found in death screen!');
        }
          // Handle leaderboard submission and manual upload option
        if (window.leaderboardSystem && window.firebaseSystem) {            if (window.firebaseSystem.isSignedIn()) {                // Check if distance should be automatically uploaded (personal best distance)
                window.leaderboardSystem.isPersonalHighScore(
                    window.gameState.score, 
                    Math.floor(window.gameState.distance)
                ).then(isPersonalBest => {
                    if (isPersonalBest || isNewHighScore) {
                        // Auto-upload the score
                        window.leaderboardSystem.submitScore(
                            window.gameState.score,
                            Math.floor(window.gameState.distance),
                            window.gameState.currentZone || 1                        ).then(() => {
                            // Keep manual upload button visible (don't hide it)
                            // Users can still manually upload scores even if auto-uploaded
                            
                            // Add submission confirmation
                            const submissionIndicator = document.createElement('div');
                            submissionIndicator.style.cssText = `
                                color: #00ff00;
                                font-size: 12px;
                                margin-top: 5px;
                                animation: deathGlow 2s infinite;
                            `;
                            submissionIndicator.textContent = '✅ Score auto-uploaded to leaderboard!';
                            deathScreen.querySelector('.death-button').parentElement.insertBefore(
                                submissionIndicator, 
                                deathScreen.querySelector('.death-button')
                            );
                        }).catch(error => {
                            console.error('Failed to submit score:', error);
                            // Keep upload button visible if auto-upload failed
                        });
                    }
                    // If not personal best or high score, upload button remains visible for manual upload
                });
            } else if (isNewHighScore) {
                // User not signed in but got a new high score - encourage sign in
                const signInEncouragement = document.createElement('div');
                signInEncouragement.style.cssText = `
                    color: #ffaa00;
                    font-size: 12px;
                    margin-top: 10px;
                    text-align: center;
                    animation: deathGlow 2s infinite;
                `;
                signInEncouragement.textContent = '💾 Sign in to save your high score to the global leaderboard!';
                deathScreen.insertBefore(signInEncouragement, deathScreen.querySelector('.death-button').parentElement);
            }
        } else if (isNewHighScore) {
            // Firebase not available but new high score - encourage enabling Firebase
            const signInEncouragement = document.createElement('div');
            signInEncouragement.style.cssText = `
                color: #ffaa00;
                font-size: 12px;
                margin-top: 10px;
                text-align: center;
                animation: deathGlow 2s infinite;
            `;
            signInEncouragement.textContent = '💾 Enable Firebase to save your score to the global leaderboard!';
            deathScreen.insertBefore(signInEncouragement, deathScreen.querySelector('.death-button').parentElement);
        }
    }
}

function closeDeathScreen() {
    // Remove all death screen overlays (in case there are duplicates)
    const overlays = document.querySelectorAll('#death-screen-overlay');
    overlays.forEach(overlay => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            }
    });
    
    // Reset death screen state
    isDeathScreenShowing = false;
    isDeathTransitioning = false;
    
    // Ensure game is properly unpaused for restart scenarios
    gamePaused = false;
    
    }

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
           
        });
    } else {
        document.exitFullscreen();
    }
}

function startGame() {
    // Ensure no death screen remnants exist
    const existingOverlays = document.querySelectorAll('#death-screen-overlay');
    existingOverlays.forEach(overlay => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            }
    });
    
    // Reset all death-related states
    isDeathScreenShowing = false;
    isDeathTransitioning = false;
    
    showingHomeScreen = false;
    gameRunning = true;
    
    // Start background music
    if (window.startBackgroundMusic) {
        window.startBackgroundMusic();
    }
    
    // Initialize game systems
    if (window.upgradeMenuUI && !window.upgradeMenuUI.initialized) {
        window.upgradeMenuUI.init();
    }
    if (window.upgradeSystem) {
        window.upgradeSystem.loadUpgrades();
    }
    
    // Initialize energy node system
    if (window.EnergyNodeSystem) {
        window.energyNodes = window.EnergyNodeSystem.init();
    }      // Initialize drone at center of screen
    if (window.Drone) {
        const centerX = window.GAME_WIDTH / 2;
        const centerY = window.GAME_HEIGHT / 2;
        drone = new window.Drone(centerX, centerY);
        window.drone = drone; // Make drone globally accessible
    }    // Tutorial is now handled automatically by Firebase auth callback for new users
    // No need to check here since it will be triggered on sign-in
    
    // Check for offline progress after a brief delay
    setTimeout(() => {
        if (window.offlineProgressSystem && gameRunning) {
            window.offlineProgressSystem.awardOfflineProgress();
        }
    }, 2000); // Wait 2 seconds after game starts to show offline progress
}

// ===== GAME LOOP =====
function gameLoop(currentTime) {
    if (!gameInitialized) return;
    
    const frameStartTime = performance.now();
    
    // Handle opening animation
    if (showingOpeningAnimation && openingAnimation) {
        const animationComplete = openingAnimation.update(currentTime);
        openingAnimation.render();        if (animationComplete) {
            showingOpeningAnimation = false;
            showingHomeScreen = true;
            
            // Initialize home screen
            if (window.HomeScreen) {
                homeScreen = new window.HomeScreen(canvas, ctx);
            } else {
                // Fallback: start game directly
                showingHomeScreen = false;
                startGame();
            }
            
            // Initialize tutorial system
            if (window.TutorialSystem) {
                window.tutorialSystem = new window.TutorialSystem(canvas, ctx);
            }
        }
        
        requestAnimationFrame(gameLoop);
        return;
    }
      // Handle home screen
    if (showingHomeScreen && homeScreen) {
        homeScreen.update(currentTime - lastTime);
        homeScreen.render();
        
        requestAnimationFrame(gameLoop);
        return;
    }
      // Don't run normal game loop during death transition
    if (isDeathTransitioning || (isDeathScreenShowing && !gameRunning)) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Calculate delta time with safety clamping
    const rawDeltaTime = currentTime - lastTime;
    const deltaTime = Math.min(rawDeltaTime, 33.33); // Cap at ~30fps minimum
    lastTime = currentTime;
      // Update performance metrics
    updatePerformanceMetrics(frameStartTime, deltaTime);
    
    // === CLEAR PHASE ===
    clearCanvas();
    
    // === UPDATE PHASE ===
    const updateStartTime = performance.now();
      // Update gamepad input
    if (window.updateGamepadInput) {
        window.updateGamepadInput();
    }
    
    // Update game logic (skip if paused or menus are open, but still render UI)
    const isUpgradeMenuOpen = window.isUpgradeMenuOpen && window.isUpgradeMenuOpen();
    const isSettingsMenuOpen = window.isSettingsMenuOpen && window.isSettingsMenuOpen();
      // Always update menu animations
    if (window.upgradeMenuUI && window.upgradeMenuUI.update) {
        window.upgradeMenuUI.update(deltaTime);
    }
    if (window.settingsMenuUI && window.settingsMenuUI.update) {
        window.settingsMenuUI.update(deltaTime);
    }
      // Update tutorial system
    if (window.tutorialSystem && window.tutorialSystem.update) {
        window.tutorialSystem.update(deltaTime);
    } else if (!window.tutorialSystem && window.TutorialSystem && showingHomeScreen) {
        // Initialize tutorial system if it's missing and we're on home screen
        window.tutorialSystem = new window.TutorialSystem(canvas, ctx);
        }
    
    // Update game if not paused and no menus are open
    if (!gamePaused && !isUpgradeMenuOpen && !isSettingsMenuOpen) {
        updateGame(deltaTime);
    }
    
    // Clean up old input buffer entries
    if (window.cleanupInputBuffer) {
        window.cleanupInputBuffer();
    }
    
    performanceMetrics.updateTime = performance.now() - updateStartTime;
      // === RENDER PHASE ===
    const renderStartTime = performance.now();
      // Render game objects (skip if paused or upgrade menu is open)
    if (!gamePaused && !isUpgradeMenuOpen && !isSettingsMenuOpen) {
        renderGame();
    }
    
    // Always render UI overlays (including upgrade menu)
    renderUI();
    
    // Render debug information (if enabled)
    if (window.DEBUG_MODE) {
        renderDebugInfo();
    }
    
    performanceMetrics.renderTime = performance.now() - renderStartTime;
    
    // === FRAME COMPLETE ===
    performanceMetrics.frameTime = performance.now() - frameStartTime;
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// ===== PERFORMANCE MONITORING =====
function updatePerformanceMetrics(frameStartTime, deltaTime) {
    frameCount++;
    fpsCounter++;
    
    // Calculate FPS every second
    if (frameStartTime - lastFpsTime >= 1000) {
        fps = Math.round(fpsCounter * 1000 / (frameStartTime - lastFpsTime));
        fpsCounter = 0;
        lastFpsTime = frameStartTime;
    }
    
    // Track frame time history for smoothing
    performanceMetrics.frameHistory.push(performanceMetrics.frameTime);
    if (performanceMetrics.frameHistory.length > 60) {
        performanceMetrics.frameHistory.shift();
    }
    
    // Calculate average frame time
    performanceMetrics.avgFrameTime = performanceMetrics.frameHistory.reduce((a, b) => a + b, 0) / performanceMetrics.frameHistory.length;
}

// ===== RENDERING SYSTEM =====
function clearCanvas() {
    // Get current zone data for dynamic background
    const zoneData = zoneSystem.getCurrentZoneData();
    
    // Zone-based background color
    ctx.fillStyle = zoneData.colors.bg;
    ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
    
    // Subtle animated background pattern with zone accent color
    const time = performance.now() * 0.001;
    ctx.save();
    ctx.globalAlpha = 0.03;
    
    // Moving grid pattern with zone accent
    ctx.strokeStyle = zoneData.colors.accent;
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    const offsetX = (time * 20) % gridSize;
    const offsetY = (time * 10) % gridSize;
    
    for (let x = -offsetX; x < window.GAME_WIDTH + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, window.GAME_HEIGHT);
        ctx.stroke();
    }
    
    for (let y = -offsetY; y < window.GAME_HEIGHT + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(window.GAME_WIDTH, y);
        ctx.stroke();
    }
    
    ctx.restore();
}

function updateGame(deltaTime) {
    // Update core game systems
    if (window.energyNodes) {
        window.energyNodes.update(deltaTime);
    }
    
    // Update drone and other systems
    if (!gameRunning || gamePaused) return;
    
    // Update game state first
    if (window.drone) {
        // Handle drone updates
        window.drone.update(deltaTime);
          // Update distance based on drone movement (slower accumulation)
        // Reduced by factor of 3.33 to make zones take longer to reach
        gameState.distance += (window.drone.speed || 120) * (deltaTime / 1000) * 0.3;
    }
    
    // Update corruption system
    if (window.corruptionSystem) {
        window.corruptionSystem.update(deltaTime);
    }
      // Update energy nodes
    if (window.updateEnergyNodes) {
        window.updateEnergyNodes(deltaTime);
    }
    
    // Check for energy node collisions
    if (window.checkEnergyCollisions && window.drone) {
        const energyCollected = window.checkEnergyCollisions(window.drone);
        if (energyCollected > 0 && gameState) {
            gameState.energy += energyCollected;
        }
    }
    
    // Update harvesters
    if (window.harvesterSystem) {
        window.harvesterSystem.harvesters.forEach(harvester => harvester.update(deltaTime));
    }
    
    // Check for zone progression
    if (gameState && zoneSystem) {
        zoneSystem.checkZoneProgression();
    }
    
    // Check for collisions with corruption
    if (window.corruptionSystem && window.drone && !window.drone.isInvulnerable) {
        if (window.corruptionSystem.checkCollisions(window.drone)) {
            handleGameOver();
        }
    }
    
    // Update UI elements
    updateUI();
}

function renderGame() {
    if (!gameRunning) return;
    
    // Render drone
    if (drone) {
        drone.render(ctx);
    }
      // Render energy nodes
    if (window.renderEnergyNodes) {
        window.renderEnergyNodes(ctx);
    }
      // Render corruption zones
    if (window.renderCorruptionZones) {
        window.renderCorruptionZones(ctx);
    }
      // Render harvesters
    if (window.renderHarvesters) {
        window.renderHarvesters(ctx);
    }
    
    // TODO: Render harvesters
    // TODO: Render particle effects
}

function updateUI() {
    // All game stats are now rendered directly in canvas
    // See renderUI() for the canvas-based UI implementation
}

function renderUI() {
    if (!gameRunning || !gameState) return;

    ctx.save();
    
    // Background for stats
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 200, 100, 5);
    ctx.fill();
    
    // Set up text style
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Stats positioning
    let y = 20;
    const lineHeight = 20;
    
    // Distance with fancy formatting
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`DIST: ${Math.floor(gameState.distance).toString().padStart(6, '0')}m`, 20, y);
    y += lineHeight;
    
    // Energy with glowing effect
    const energyGlow = Math.sin(performance.now() * 0.003) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 255, 0, ${energyGlow})`;
    ctx.fillText(`ENGY: ${Math.floor(gameState.energy).toString().padStart(4, '0')}`, 20, y);
    y += lineHeight;
    
    // Harvesters with color coding
    const harvesterColor = gameState.harvesters >= gameState.maxHarvesters ? '#ff4444' : '#44ff44';
    ctx.fillStyle = harvesterColor;
    ctx.fillText(`HVST: ${gameState.harvesters}/${gameState.maxHarvesters}`, 20, y);
    y += lineHeight;
    
    // Zone level with dynamic color
    const zoneColors = [
        '#ffffff', // Zone 1
        '#00ffff', // Zone 2
        '#ff4444', // Zone 3
        '#44ff44', // Zone 4
        '#ffaa00', // Zone 5
        '#aa44ff', // Zone 6
        '#ff44aa', // Zone 7
        '#ffffff'  // Zone 8+
    ];
    const zoneColor = zoneColors[Math.min(gameState.zoneLevel - 1, zoneColors.length - 1)];
    ctx.fillStyle = zoneColor;
    ctx.fillText(`ZONE: ${gameState.zoneLevel}`, 20, y);
    
    // High score display
    const highScore = localStorage.getItem('highScore');
    if (highScore) {
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#888888';
        ctx.fillText(`BEST: ${highScore}m`, 20, y + lineHeight);
    }
    
    ctx.restore();

    // Render zone transition overlay
    if (window.zoneSystem) {
        window.zoneSystem.renderZoneTransition(ctx);
    }    // Render pause menu if needed (but not during death screen)
    if (gamePaused && !window.isUpgradeMenuOpen() && !isDeathScreenShowing) {
        renderPauseMenu();
    }
    
    // Render upgrade menu if open
    if (window.upgradeMenuUI && window.isUpgradeMenuOpen && window.isUpgradeMenuOpen()) {
        window.upgradeMenuUI.renderMenu(ctx);
    }
      // Render settings menu if open
    if (window.settingsMenuUI && window.isSettingsMenuOpen && window.isSettingsMenuOpen()) {
        window.settingsMenuUI.renderMenu(ctx);
    }
    
    // Render tutorial system overlay
    if (window.tutorialSystem && window.tutorialSystem.render) {
        window.tutorialSystem.render();
    }
    
    // Render control hints
    if (!gamePaused) {
        renderControlHints();
    }
    
    // Render input indicators
    renderInputIndicators();
}

function renderControlHints() {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    
    // Position in bottom-right corner
    let y = window.GAME_HEIGHT - 10;
    const lineHeight = 15;
    
    // Control hints with icons
    ctx.fillText('SPACE/CLICK → Turn', window.GAME_WIDTH - 10, y);
    y -= lineHeight;
    ctx.fillText('H → Drop Harvester', window.GAME_WIDTH - 10, y);
    y -= lineHeight;
    ctx.fillText('P → Pause', window.GAME_WIDTH - 10, y);
    y -= lineHeight;
    ctx.fillText('ESC → Settings', window.GAME_WIDTH - 10, y);
    
    ctx.restore();
}

function renderPauseMenu() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
    
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', window.GAME_WIDTH / 2, window.GAME_HEIGHT / 2);
    
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Press P to Resume', window.GAME_WIDTH / 2, window.GAME_HEIGHT / 2 + 40);
    
    ctx.restore();
}

function renderInputIndicators() {
    if (!window.inputState || !window.inputState.inputBuffer) return;

    const now = performance.now();
    const fadeTime = 300; // How long indicators stay visible
    
    ctx.save();
    
    // Show recent inputs as visual indicators
    window.inputState.inputBuffer.forEach((input, index) => {
        const age = now - input.timestamp;
        if (age < fadeTime) {
            const alpha = 1 - (age / fadeTime);
            let color = '#00ffff';
            let text = '';
            let x = 20;
            let y = window.GAME_HEIGHT - 30;
            
            // Configure appearance based on input type
            if (input.type === 'keydown') {
                switch (input.code) {
                    case 'Space':
                        color = '#00ffff';
                        text = '↺ TURN';
                        break;
                    case 'KeyH':
                        color = '#00ff00';
                        text = '⬡ HARVEST';
                        break;
                    case 'KeyP':
                        color = '#ffff00';
                        text = '❚❚ PAUSE';
                        break;
                    case 'KeyU':
                        color = '#ff00ff';
                        text = '⬆ UPGRADE';
                        break;
                    case 'Escape':
                        color = '#888888';
                        text = '⚙ SETTINGS';
                        break;
                }
            } else if (input.type === 'click') {
                color = '#00ffff';
                text = '↺ TURN';
            }
            
            if (text) {
                // Draw indicator with fade effect
                ctx.globalAlpha = alpha;
                ctx.fillStyle = color;
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                
                // Position indicators in a row
                const indicatorSpacing = 100;
                x += index * indicatorSpacing;
                
                // Draw background pill
                const padding = 8;
                const textWidth = ctx.measureText(text).width;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.roundRect(x - padding, y - 10, textWidth + padding * 2, 20, 10);
                ctx.fill();
                
                // Draw text
                ctx.fillStyle = color;
                ctx.fillText(text, x, y);
            }
        }
    });
    
    ctx.restore();
}

// ===== WINDOW MANAGEMENT =====
let resizeTimeout;
window.addEventListener('resize', () => {
    if (!gameInitialized) return;
    
    // Debounce resize events
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        setupCanvas();
        viewportManager.updateScale();
        
    }, 100);
});

// Handle orientation changes on mobile
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (gameInitialized) {
            setupCanvas();
            viewportManager.updateScale();
           
        }
    }, 300);
});

// ===== GAME INITIALIZATION =====
async function initializeGame() {
   
      // Enable debug mode if running locally
    window.DEBUG_MODE = false; // Disabled for clean UI
    
    // Setup canvas with enhanced scaling
    setupCanvas();
      // Load sprites
    try {
        await loadSprites();
    } catch (error) {
        }
    
    // Initialize audio system
    if (window.initializeAudio) {
        window.initializeAudio();
    }// Initialize opening animation (check settings first)
    if (window.OpeningAnimation && !window.shouldSkipOpeningAnimation()) {
        openingAnimation = new window.OpeningAnimation(canvas, ctx);
        // Hide game UI elements during opening animation
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.classList.add('opening-animation');
        }
    } else {
        // Skip opening animation - go directly to home screen
        showingOpeningAnimation = false;
        showingHomeScreen = true;
        
        // Show game UI elements immediately
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.classList.remove('opening-animation');
        }
          // Initialize home screen immediately
        if (window.HomeScreen) {
            homeScreen = new window.HomeScreen(canvas, ctx);
        } else {
            console.error('❌ HomeScreen class not available, starting game directly');
            showingHomeScreen = false;
            startGame();
        }
        
        // Initialize tutorial system
        if (window.TutorialSystem) {
            window.tutorialSystem = new window.TutorialSystem(canvas, ctx);
        }
        
        }
    
    // Initialize viewport management
    viewportManager.updateScale();
    
    // Setup advanced input handlers
    if (window.setupInputHandlers) {
        window.setupInputHandlers();
    }

    // Add mouse move handler for menu hover effects
    canvas.addEventListener('mousemove', (e) => {        // Handle upgrade menu hover
        if (window.upgradeMenuUI && window.isUpgradeMenuOpen && window.isUpgradeMenuOpen()) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (window.GAME_WIDTH / rect.width);
            const y = (e.clientY - rect.top) * (window.GAME_HEIGHT / rect.height);
            window.upgradeMenuUI.handleMouseMove(x, y);
        }
        // Handle settings menu hover
        else if (window.settingsMenuUI && window.isSettingsMenuOpen && window.isSettingsMenuOpen()) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (window.GAME_WIDTH / rect.width);
            const y = (e.clientY - rect.top) * (window.GAME_HEIGHT / rect.height);
            window.settingsMenuUI.updateMousePosition(x, y);
        }
    });

    // Add skip animation input
    const skipAnimation = () => {
        if (showingOpeningAnimation && openingAnimation) {
            openingAnimation.skipAnimation();
        }
    };    canvas.addEventListener('click', (e) => {
        if (showingOpeningAnimation && openingAnimation) {
            skipAnimation();        } else if (window.tutorialSystem && window.tutorialSystem.isActive && window.tutorialSystem.handleInput) {
            // Handle tutorial clicks first
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (window.GAME_WIDTH / rect.width);
            const y = (e.clientY - rect.top) * (window.GAME_HEIGHT / rect.height);
            const clickEvent = { 
                type: 'click', 
                clientX: e.clientX, 
                clientY: e.clientY 
            };
            const handled = window.tutorialSystem.handleInput(clickEvent);
            if (handled) {
                return;
            }
        } else if (showingHomeScreen && homeScreen) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (window.GAME_WIDTH / rect.width);
            const y = (e.clientY - rect.top) * (window.GAME_HEIGHT / rect.height);
              const result = homeScreen.handleClick(x, y);
            if (result === 'start_game') {
                startGame();
            }
        } else {
            // Handle upgrade menu clicks during gameplay
            if (window.upgradeMenuUI && window.isUpgradeMenuOpen && window.isUpgradeMenuOpen()) {
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) * (window.GAME_WIDTH / rect.width);
                const y = (e.clientY - rect.top) * (window.GAME_HEIGHT / rect.height);
                
                window.upgradeMenuUI.handleMouseClick(x, y);
            }
            // Handle settings menu clicks during gameplay
            else if (window.settingsMenuUI && window.isSettingsMenuOpen && window.isSettingsMenuOpen()) {
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) * (window.GAME_WIDTH / rect.width);
                const y = (e.clientY - rect.top) * (window.GAME_HEIGHT / rect.height);
                
                window.settingsMenuUI.handleMouseClick(x, y, 0); // Left click
            }
        }
    });canvas.addEventListener('mousemove', (e) => {
        if (showingHomeScreen && homeScreen) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (window.GAME_WIDTH / rect.width);
            const y = (e.clientY - rect.top) * (window.GAME_HEIGHT / rect.height);
            
            homeScreen.updateMousePosition(x, y);
              // Update cursor style based on hover
            if (homeScreen.hoveredMenuItem >= 0) {
                canvas.style.cursor = 'pointer';
            } else {
                canvas.style.cursor = 'default';
            }
        } else {
            // Handle upgrade menu hover during gameplay
            if (window.upgradeMenuUI && window.isUpgradeMenuOpen && window.isUpgradeMenuOpen()) {
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) * (window.GAME_WIDTH / rect.width);
                const y = (e.clientY - rect.top) * (window.GAME_HEIGHT / rect.height);
                
                window.upgradeMenuUI.updateMousePosition(x, y);
                
                // Update cursor style based on hover
                if (window.upgradeMenuUI.hoveredUpgrade >= 0) {
                    canvas.style.cursor = 'pointer';
                } else {
                    canvas.style.cursor = 'default';
                }
            }
            // Handle settings menu hover during gameplay
            else if (window.settingsMenuUI && window.isSettingsMenuOpen && window.isSettingsMenuOpen()) {
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) * (window.GAME_WIDTH / rect.width);
                const y = (e.clientY - rect.top) * (window.GAME_HEIGHT / rect.height);
                
                window.settingsMenuUI.updateMousePosition(x, y);
                
                // Update cursor style based on hover
                if (window.settingsMenuUI.hoveredCategory >= 0 || window.settingsMenuUI.hoveredSetting >= 0) {
                    canvas.style.cursor = 'pointer';
                } else {
                    canvas.style.cursor = 'default';
                }
            }
        }
    });    window.addEventListener('keydown', (e) => {
        // Check if user is typing in an input field (use the same function as input.js)
        const activeElement = document.activeElement;
        if (activeElement) {
            const inputTypes = ['input', 'textarea'];
            const editableTypes = ['text', 'email', 'password', 'search', 'url'];
            
            if (inputTypes.includes(activeElement.tagName.toLowerCase())) {
                if (activeElement.tagName.toLowerCase() === 'input') {
                    const inputType = activeElement.type.toLowerCase();
                    if (editableTypes.includes(inputType)) {
                        return; // Don't process game controls when typing
                    }
                } else {
                    return; // textarea is always editable
                }
            }
            
            if (activeElement.contentEditable === 'true') {
                return; // Don't process game controls when typing
            }
        }
        
        if (showingOpeningAnimation) {
            if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
                e.preventDefault();
                skipAnimation();
            }
        } else if (window.tutorialSystem && window.tutorialSystem.isActive && window.tutorialSystem.handleInput) {
            // Handle tutorial input first
            const handled = window.tutorialSystem.handleInput(e);
            if (handled) {
                e.preventDefault();
                return;
            }
        } else if (window.settingsMenuUI && window.isSettingsMenuOpen && window.isSettingsMenuOpen()) {
            // Handle settings menu input (including custom dialog)
            e.preventDefault();
            window.settingsMenuUI.handleInput(e.key);
        } else if (showingHomeScreen && homeScreen) {
            e.preventDefault();
            const result = homeScreen.handleKeyDown(e);
            if (result === 'start_game') {
                startGame();
            }
        }
    });
    
    // Initialize performance monitoring
    lastTime = performance.now();
    lastFpsTime = performance.now();    // Create drone at center of screen
    if (window.Drone) {
        drone = new window.Drone(window.GAME_WIDTH / 2, window.GAME_HEIGHT / 2);
        window.drone = drone; // Update global reference
    } else {
       
    }
    
    // Initialize and apply upgrades
    if (window.upgradeSystem) {
        window.upgradeSystem.loadUpgrades();
        window.upgradeSystem.applyAllUpgrades();
      
    }
    
    // Hide loading text and keep stats hidden until animation completes
    if (loadingText) {
        loadingText.style.display = 'none';
    }
    if (gameStats) {
        gameStats.style.display = 'none';
    }
      gameInitialized = true;
    gameRunning = false; // Will be set to true after opening animation
    gamePaused = false;
    
    // Check if we should auto-start the game (after restart)
    const shouldAutoStart = localStorage.getItem('autoStartGame') === 'true';
    if (shouldAutoStart) {
        localStorage.removeItem('autoStartGame'); // Clear the flag
        // Skip animations and go straight to game
        setTimeout(() => {
            showingOpeningAnimation = false;
            showingHomeScreen = false;
            startGame();
        }, 100);
    }
    
    // Start the game loop (will show opening animation first)
    requestAnimationFrame(gameLoop);
}

// Show loading screen for restart
function showLoadingScreen() {
    // Remove any existing loading screens
    const existingLoading = document.getElementById('restart-loading-overlay');
    if (existingLoading) {
        existingLoading.remove();
    }
    
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'restart-loading-overlay';
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        font-family: 'Courier New', monospace;
        color: #00ff00;
    `;
    
    // Loading content
    const loadingContent = document.createElement('div');
    loadingContent.style.cssText = `
        text-align: center;
        animation: pulse 1.5s infinite;
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'RESTARTING GAME';
    title.style.cssText = `
        font-size: 24px;
        margin-bottom: 20px;
        text-shadow: 0 0 10px #00ff00;
        letter-spacing: 2px;
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 40px;
        height: 40px;
        border: 3px solid rgba(0, 255, 0, 0.3);
        border-top: 3px solid #00ff00;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px auto;
    `;
    
    const message = document.createElement('p');
    message.textContent = 'Initializing new session...';
    message.style.cssText = `
        font-size: 14px;
        color: #88ff88;
        margin: 0;
    `;
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Assemble loading screen
    loadingContent.appendChild(title);
    loadingContent.appendChild(spinner);
    loadingContent.appendChild(message);
    loadingOverlay.appendChild(loadingContent);
    
    // Add to page
    document.body.appendChild(loadingOverlay);
}

// Make important game objects globally accessible
window.GAME_WIDTH = canvas.width;
window.GAME_HEIGHT = canvas.height;
window.gameState = gameState;
window.zoneSystem = zoneSystem;

// ===== STARTUP =====
window.addEventListener('load', initializeGame);

// Export globals for module access
window.gameState = gameState;
window.getGameRunning = () => gameRunning;
window.getGamePaused = () => gamePaused;
window.drone = null; // Will be set during initialization
window.viewportManager = viewportManager;
window.togglePause = togglePause;
window.resetGame = resetGame;
window.returnToHomeScreen = returnToHomeScreen;
window.startGame = startGame;
window.toggleFullscreen = toggleFullscreen;
window.handleGameOver = handleGameOver;
window.showDeathScreen = showDeathScreen;
window.closeDeathScreen = closeDeathScreen;

// ===== CONSOLE BRANDING =====
