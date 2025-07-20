/**
 * Tutorial System - Interactive tutorial system for new users and guest accounts
 * Shows step-by-step tutorials with visual overlays and interactive elements
 */

import { GAME_STATES } from '../utils/constants.js';

export class TutorialSystem {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        
        // System state
        this.isActive = false;
        this.currentTutorial = null;
        this.currentStep = 0;
        this.tutorialProgress = {};
        
        // Animation properties
        this.fadeAlpha = 0;
        this.targetAlpha = 1;
        this.pulseAnimation = 0;
        this.overlayAlpha = 0.7;
        this.highlightRadius = 60;
        
        // Tutorial completion tracking
        this.hasShownWelcome = false;
        this.hasShownGameplay = false;
        this.hasShownUpgrades = false;
        this.hasShownSettings = false;
        
        // Define all tutorial sequences
        this.tutorials = {
            welcome: this.createWelcomeTutorial(),
            gameplay: this.createGameplayTutorial(),
            upgrades: this.createUpgradesTutorial(),
            settings: this.createSettingsTutorial(),
            controls: this.createControlsTutorial()
        };
        
        // Button state for navigation
        this.buttons = {
            next: {
                text: "Next →",
                x: 0, y: 0, width: 120, height: 40,
                hovered: false, color: '#40d158'
            },
            previous: {
                text: "← Previous",
                x: 0, y: 0, width: 120, height: 40,
                hovered: false, color: '#58a6ff'
            },
            skip: {
                text: "Skip Tutorial",
                x: 0, y: 0, width: 130, height: 35,
                hovered: false, color: '#f85149'
            },
            complete: {
                text: "Let's Play! 🚀",
                x: 0, y: 0, width: 150, height: 45,
                hovered: false, color: '#40d158'
            }
        };
        
        this.loadTutorialProgress();
        this.setupEventListeners();
    }
    
    /**
     * Load tutorial progress from local storage
     */
    loadTutorialProgress() {
        try {
            const saved = localStorage.getItem('coderunner_tutorial_progress');
            if (saved) {
                this.tutorialProgress = JSON.parse(saved);
                this.hasShownWelcome = this.tutorialProgress.welcome || false;
                this.hasShownGameplay = this.tutorialProgress.gameplay || false;
                this.hasShownUpgrades = this.tutorialProgress.upgrades || false;
                this.hasShownSettings = this.tutorialProgress.settings || false;
            }
        } catch (error) {
            console.warn('🎓 Failed to load tutorial progress:', error);
            this.tutorialProgress = {};
        }
    }
    
    /**
     * Save tutorial progress to local storage
     */
    saveTutorialProgress() {
        try {
            localStorage.setItem('coderunner_tutorial_progress', JSON.stringify(this.tutorialProgress));
        } catch (error) {
            console.warn('🎓 Failed to save tutorial progress:', error);
        }
    }
    
    /**
     * Check if tutorial should be shown for new users or guests
     */
    shouldShowTutorial() {
        // Always show welcome tutorial for guests and new users
        if (this.game.loginSystem.isGuest || !this.hasShownWelcome) {
            return true;
        }
        
        // Show specific tutorials based on context
        return false;
    }
    
    /**
     * Start the appropriate tutorial based on context
     */
    startTutorial(tutorialType = 'welcome') {
        if (!this.tutorials[tutorialType]) {
            console.warn('🎓 Unknown tutorial type:', tutorialType);
            return;
        }
        
        this.isActive = true;
        this.currentTutorial = tutorialType;
        this.currentStep = 0;
        this.fadeAlpha = 0;
        this.targetAlpha = 1;
        this.pulseAnimation = 0;
        
        console.log('🎓 Starting tutorial:', tutorialType);
        this.addEventListeners();
    }
    
    /**
     * Create welcome tutorial for new users
     */
    createWelcomeTutorial() {
        return {
            title: "Welcome to CodeRunner! 🎮",
            steps: [
                {
                    title: "Welcome, Runner! 👋",
                    content: [
                        "Welcome to CodeRunner - the ultimate coding-themed endless runner!",
                        "",
                        "You're about to embark on an exciting journey through",
                        "a digital world filled with obstacles, upgrades, and challenges.",
                        "",
                        "This quick tutorial will get you started in no time!"
                    ],
                    highlight: null,
                    interactive: false
                },
                {
                    title: "Your Mission 🎯",
                    content: [
                        "Your goal is simple: RUN as far as you can!",
                        "",
                        "• Avoid deadly obstacles like spikes, saws, and lasers",
                        "• Collect data packets (📦) to earn upgrade points",
                        "• Survive as long as possible to set high scores",
                        "• Unlock achievements and climb the leaderboard",
                        "",
                        "The world gets progressively harder - stay sharp!"
                    ],
                    highlight: null,
                    interactive: false
                },
                {
                    title: "Basic Controls 🎮",
                    content: [
                        "Master these essential controls:",
                        "",
                        "MOVEMENT:",
                        "• ← → Arrow Keys or A/D: Move left/right",
                        "• ↑ Arrow Key, W, or Spacebar: Jump",
                        "",
                        "GAME CONTROLS:",
                        "• Q: Open upgrade shop",
                        "• P: Pause game",
                        
                    ],
                    highlight: null,
                    interactive: false
                },
                {
                    title: "Health & Survival ❤️",
                    content: [
                        "Stay alive with the health system:",
                        "",
                        "• You start with 3 hearts (health points)",
                        "• Hitting obstacles removes 1 heart",
                        "• Collect life boxes for instant healing",
                    ],
                    highlight: { type: 'hearts', x: 50, y: 40 },
                    interactive: false
                },
                {
                    title: "Ready to Start? 🚀",
                    content: [
                        "You're all set to begin your CodeRunner adventure!",
                        "",
                        "Choose your difficulty and start running:",
                        "",
                        "🔹 Easy: Frequent life boxes, gentler difficulty curve",
                        "🔸 Medium: Balanced challenge with moderate healing",
                        "🔴 Hard: Rare life boxes, steep difficulty increases",
                        "❌ Extreme: No life boxes, ultimate survival challenge",
                        "",
                        "Good luck, Runner! 🏃‍♂️💨"
                    ],
                    highlight: null,
                    interactive: false
                }
            ]
        };
    }
    
    /**
     * Create gameplay tutorial for first-time players
     */
    createGameplayTutorial() {
        return {
            title: "Gameplay Tutorial 🎮",
            steps: [
                {
                    title: "Movement Basics 🏃‍♂️",
                    content: [
                        "Let's practice movement:",
                        "",
                        "• Use ARROW KEYS or WASD to move",
                        "• Press UP/W/SPACE to jump",
                        "• You can move in mid-air for better control",
                        "",
                        "Try moving around and jumping!"
                    ],
                    highlight: { type: 'player' },
                    interactive: true,
                    requirement: 'movement'
                },
                {
                    title: "Obstacle Awareness ⚠️",
                    content: [
                        "Watch out for these dangerous obstacles:",
                        "",
                        "🔺 Spikes: Touch and you lose health",
                        "⚙️ Saws: Rotating death traps",
                        "🔴 Lasers: Instant damage beams",
                        "🟫 Crushers: Moving death blocks",
                        "",
                        "Learn their patterns and time your moves!"
                    ],
                    highlight: null,
                    interactive: false
                },
                {
                    title: "Collecting Data Packets 📦",
                    content: [
                        "Data packets are your currency:",
                        "",
                        "• Appear as glowing blue boxes",
                        "• Run into them to collect",
                        "• Earn upgrade points for the shop",
                        "• More valuable at higher distances",
                        "",
                        "Collect as many as you can!"
                    ],
                    highlight: { type: 'dataPacket' },
                    interactive: false
                }
            ]
        };
    }
    
    /**
     * Create upgrades tutorial
     */
    createUpgradesTutorial() {
        return {
            title: "Upgrade System Tutorial 🛒",
            steps: [
                {
                    title: "The Upgrade Shop 🛒",
                    content: [
                        "Spend your data packets on powerful upgrades:",
                        "",
                        "• Press Q anytime to open the shop",
                        "• Available even during gameplay!",
                        "• Upgrades persist between runs",
                        "• Strategic spending = better performance",
                        "",
                        "Let's explore the shop categories..."
                    ],
                    highlight: { type: 'shopButton' },
                    interactive: false
                },
                {
                    title: "Movement Upgrades 🏃‍♂️",
                    content: [
                        "Enhance your runner's abilities:",
                        "",
                        "• Extra Speed: Run faster, escape danger",
                        "• Jump Boost: Higher jumps, reach platforms",
                        "• Health Boost: More hearts = more survivability",
                        "• Quantum Dash: Teleport through obstacles!",
                        "",
                        "Movement upgrades are essential for progression."
                    ],
                    highlight: null,
                    interactive: false
                },
                {
                    title: "Economic Upgrades 💰",
                    content: [
                        "Boost your earning potential:",
                        "",
                        "• Data Packet Value: More points per packet",
                        "• Collection Radius: Collect from further away",
                        "• Bonus Multiplier: Multiply your earnings",
                        "",
                        "Economic upgrades help you afford better gear faster!"
                    ],
                    highlight: null,
                    interactive: false
                }
            ]
        };
    }
    
    /**
     * Create settings tutorial
     */
    createSettingsTutorial() {
        return {
            title: "Settings & Customization ⚙️",
            steps: [
                {
                    title: "Game Settings ⚙️",
                    content: [
                        "Customize your experience:",
                        "",
                        "AUDIO:",
                        "• Master volume control",
                        "• Music and sound effect toggles",
                        "",
                        "GRAPHICS:",
                        "• Performance monitoring",
                        "• FPS counter display",
                        "",
                        "Access settings from the main menu anytime!"
                    ],
                    highlight: null,
                    interactive: false
                },
                {
                    title: "Control Customization 🎮",
                    content: [
                        "Make the controls work for you:",
                        "",
                        "• Remap movement keys",
                        "• Change jump controls",
                        "• Adjust action buttons",
                        "",
                        "Find what feels comfortable and stick with it!"
                    ],
                    highlight: null,
                    interactive: false
                }
            ]
        };
    }
    
    /**
     * Create controls tutorial
     */
    createControlsTutorial() {
        return {
            title: "Advanced Controls 🎮",
            steps: [
                {
                    title: "Pro Movement Tips 🏃‍♂️",
                    content: [
                        "Master these advanced techniques:",
                        "",
                        "• Edge jumping: Jump at the last second",
                        "• Air control: Adjust mid-air movement",
                        "• Quick direction changes: Rapid left-right",
                        "• Jump canceling: Release jump for shorter hops",
                        "",
                        "Practice makes perfect!"
                    ],
                    highlight: null,
                    interactive: false
                },
                {
                    title: "Game Management 📋",
                    content: [
                        "Essential game controls:",
                        "",
                        "• ESC: Pause/unpause game",
                        "• Q: Quick shop access",
                        "• F3: Performance monitor",
                        "• C: View changelog",
                        "• Click anywhere: Pause during gameplay",
                        "",
                        "Master these for smooth gameplay!"
                    ],
                    highlight: null,
                    interactive: false
                }
            ]
        };
    }
    
    /**
     * Setup event listeners for tutorial interaction
     */
    setupEventListeners() {
        this.boundClickHandler = (e) => {
            if (this.isActive) {
                this.handleClick(e);
            }
        };
        
        this.boundKeyHandler = (e) => {
            if (this.isActive) {
                this.handleKeyPress(e);
            }
        };
        
        this.boundMouseMoveHandler = (e) => {
            if (this.isActive) {
                this.handleMouseMove(e);
            }
        };
    }
    
    addEventListeners() {
        this.canvas.addEventListener('click', this.boundClickHandler);
        document.addEventListener('keydown', this.boundKeyHandler);
        this.canvas.addEventListener('mousemove', this.boundMouseMoveHandler);
    }
    
    removeEventListeners() {
        this.canvas.removeEventListener('click', this.boundClickHandler);
        document.removeEventListener('keydown', this.boundKeyHandler);
        this.canvas.removeEventListener('mousemove', this.boundMouseMoveHandler);
    }
      /**
     * Handle mouse clicks on tutorial elements
     */
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Get current step info to determine which buttons are visible
        const tutorial = this.tutorials[this.currentTutorial];
        const isFirstStep = this.currentStep === 0;
        const isLastStep = this.currentStep === tutorial.steps.length - 1;
        
        // Define visible buttons based on current step
        const visibleButtons = ['skip']; // Skip is always visible
        
        if (isLastStep) {
            visibleButtons.push('complete');
        } else if (isFirstStep) {
            visibleButtons.push('next');
        } else {
            visibleButtons.push('previous', 'next');
        }
        
        // Check button clicks for visible buttons only
        for (const buttonKey of visibleButtons) {
            const button = this.buttons[buttonKey];
            if (button && this.isPointInButton(x, y, button)) {
                this.handleButtonClick(buttonKey);
                return;
            }
        }
    }
    
    /**
     * Handle keyboard input during tutorial
     */
    handleKeyPress(event) {
        switch (event.key) {
            case 'Enter':
            case ' ':
            case 'ArrowRight':
                this.nextStep();
                break;
            case 'ArrowLeft':
                this.previousStep();
                break;
            case 'Escape':
                this.skipTutorial();
                break;
        }
    }
      /**
     * Handle mouse movement for button hover effects
     */
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Reset all button hover states
        for (const button of Object.values(this.buttons)) {
            button.hovered = false;
        }
        
        // Get current step info to determine which buttons are visible
        const tutorial = this.tutorials[this.currentTutorial];
        const isFirstStep = this.currentStep === 0;
        const isLastStep = this.currentStep === tutorial.steps.length - 1;
        
        // Check hover for visible buttons only
        const visibleButtons = ['skip']; // Skip is always visible
        
        if (isLastStep) {
            visibleButtons.push('complete');
        } else if (isFirstStep) {
            visibleButtons.push('next');
        } else {
            visibleButtons.push('previous', 'next');
        }
        
        // Update hover states for visible buttons
        for (const buttonKey of visibleButtons) {
            const button = this.buttons[buttonKey];
            if (button && this.isPointInButton(x, y, button)) {
                button.hovered = true;
                break;
            }
        }
    }
    
    /**
     * Check if point is within button bounds
     */
    isPointInButton(x, y, button) {
        return x >= button.x && x <= button.x + button.width &&
               y >= button.y && y <= button.y + button.height;
    }
    
    /**
     * Handle button clicks
     */
    handleButtonClick(buttonKey) {
        switch (buttonKey) {
            case 'next':
                this.nextStep();
                break;
            case 'previous':
                this.previousStep();
                break;
            case 'skip':
                this.skipTutorial();
                break;
            case 'complete':
                this.completeTutorial();
                break;
        }
    }
    
    /**
     * Move to next tutorial step
     */
    nextStep() {
        if (!this.currentTutorial) return;
        
        const tutorial = this.tutorials[this.currentTutorial];
        if (this.currentStep < tutorial.steps.length - 1) {
            this.currentStep++;
        } else {
            this.completeTutorial();
        }
    }
    
    /**
     * Move to previous tutorial step
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
        }
    }
    
    /**
     * Skip the current tutorial
     */
    skipTutorial() {
        this.completeTutorial();
    }
    
    /**
     * Complete the current tutorial
     */
    completeTutorial() {
        if (this.currentTutorial) {
            this.tutorialProgress[this.currentTutorial] = true;
            this.saveTutorialProgress();
            
            // Update shown flags
            if (this.currentTutorial === 'welcome') {
                this.hasShownWelcome = true;
            }
        }
        
        this.isActive = false;
        this.currentTutorial = null;
        this.currentStep = 0;
        this.removeEventListeners();
        
        // Return to appropriate game state
        if (this.game.gameState === GAME_STATES.HOME) {
            // Stay on home screen
        } else {
            this.game.gameState = GAME_STATES.HOME;
        }
        
        console.log('🎓 Tutorial completed');
    }
      /**
     * Stop the tutorial without completing it (for state transitions)
     */
    stopTutorial() {
        this.isActive = false;
        this.currentTutorial = null;
        this.currentStep = 0;
        this.removeEventListeners();
        console.log('🎓 Tutorial stopped');
    }
    /**
     * Update tutorial system (animations, etc.)
     */
    update(deltaTime) {
        // Update quick hints even when not in tutorial mode
        if (this.quickHint) {
            const elapsed = Date.now() - this.quickHint.startTime;
            if (elapsed > this.quickHint.duration + 500) {
                this.quickHint = null;
            }
        }
        
        if (!this.isActive) return;
        
        // Update fade animation
        const fadeSpeed = 3;
        if (this.fadeAlpha < this.targetAlpha) {
            this.fadeAlpha = Math.min(this.targetAlpha, this.fadeAlpha + fadeSpeed * deltaTime);
        }
        
        // Update pulse animation for highlights
        this.pulseAnimation += deltaTime * 2;
        
        // Position buttons
        this.positionButtons();
    }    /**
     * Position tutorial navigation buttons
     */
    positionButtons() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Skip button (top right, smaller and more subtle)
        this.buttons.skip.width = 100;
        this.buttons.skip.height = 32;
        this.buttons.skip.x = width - this.buttons.skip.width - 30;
        this.buttons.skip.y = 30;
        
        // Navigation buttons positioning
        const bottomMargin = 60;
        const buttonSpacing = 30;
        const tutorial = this.tutorials[this.currentTutorial];
        const isFirstStep = this.currentStep === 0;
        const isLastStep = this.currentStep === tutorial.steps.length - 1;
        
        if (isLastStep) {
            // Complete button only - center it
            this.buttons.complete.width = 180;
            this.buttons.complete.height = 48;
            this.buttons.complete.x = (width - this.buttons.complete.width) / 2;
            this.buttons.complete.y = height - bottomMargin;
        } else if (isFirstStep) {
            // Next button only - center it
            this.buttons.next.width = 140;
            this.buttons.next.height = 44;
            this.buttons.next.x = (width - this.buttons.next.width) / 2;
            this.buttons.next.y = height - bottomMargin;
        } else {
            // Both previous and next buttons - space them out
            this.buttons.previous.width = 120;
            this.buttons.previous.height = 44;
            this.buttons.next.width = 120;
            this.buttons.next.height = 44;
            
            const totalButtonWidth = this.buttons.previous.width + this.buttons.next.width + buttonSpacing;
            const startX = (width - totalButtonWidth) / 2;
            
            this.buttons.previous.x = startX;
            this.buttons.previous.y = height - bottomMargin;
            
            this.buttons.next.x = startX + this.buttons.previous.width + buttonSpacing;
            this.buttons.next.y = height - bottomMargin;
        }
    }/**
     * Render the tutorial overlay
     */
    render() {
        // Render quick hints even when not in full tutorial mode
        if (this.quickHint) {
            this.renderQuickHint();
        }
        
        if (!this.isActive || !this.currentTutorial) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const tutorial = this.tutorials[this.currentTutorial];
        const step = tutorial.steps[this.currentStep];
        
        ctx.save();
        
        // Apply fade effect
        ctx.globalAlpha = this.fadeAlpha;
        
        // Clean, professional backdrop
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, width, height);
        
        // Highlight area if specified
        if (step.highlight) {
            this.drawHighlight(step.highlight);
        }
        
        // Main tutorial panel
        this.drawTutorialPanel(tutorial, step);
        
        // Navigation buttons
        this.drawNavigationButtons();
        
        ctx.restore();
    }
      /**
     * Render quick hint overlay
     */
    renderQuickHint() {
        if (!this.quickHint) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const hint = this.quickHint;
        
        // Update hint alpha with smooth transitions
        const elapsed = Date.now() - hint.startTime;
        const fadeInTime = 400;
        const fadeOutTime = 600;
        
        if (elapsed < fadeInTime) {
            hint.alpha = (elapsed / fadeInTime) * hint.targetAlpha;
        } else if (hint.targetAlpha === 0 && elapsed > hint.duration - fadeOutTime) {
            const fadeProgress = (elapsed - (hint.duration - fadeOutTime)) / fadeOutTime;
            hint.alpha = hint.targetAlpha * (1 - fadeProgress);
        } else {
            hint.alpha = hint.targetAlpha;
        }
        
        ctx.save();
        ctx.globalAlpha = hint.alpha;
        
        // Modern hint container
        const maxHintWidth = Math.min(450, width * 0.9);
        const padding = 24;
        const borderRadius = 12;
        
        // Measure text to determine actual width needed
        ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
        const textMetrics = ctx.measureText(hint.message);
        const hintWidth = Math.min(maxHintWidth, textMetrics.width + padding * 2);
        const hintHeight = 64;
        
        const hintX = (width - hintWidth) / 2;
        const hintY = height - 140;
        
        // Clean background with subtle shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        
        const gradient = ctx.createLinearGradient(hintX, hintY, hintX, hintY + hintHeight);
        gradient.addColorStop(0, 'rgba(22, 27, 34, 0.98)');
        gradient.addColorStop(1, 'rgba(13, 17, 23, 0.98)');
        ctx.fillStyle = gradient;
        this.drawRoundedRect(ctx, hintX, hintY, hintWidth, hintHeight, borderRadius);
        ctx.fill();
        
        // Subtle border
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, hintX, hintY, hintWidth, hintHeight, borderRadius);
        ctx.stroke();
        
        // Clean, readable text
        ctx.fillStyle = '#e6edf3';
        ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(hint.message, width / 2, hintY + hintHeight / 2 + 5);
        
        ctx.restore();
    }
      /**
     * Draw highlight around specific game elements
     */
    drawHighlight(highlight) {
        const ctx = this.ctx;
        const time = this.pulseAnimation;
        
        // Calculate highlight position based on type
        let x, y;
        switch (highlight.type) {
            case 'hearts':
                x = 50;
                y = 40;
                break;
            case 'player':
                x = this.canvas.width / 2;
                y = this.canvas.height - 200;
                break;
            case 'dataPacket':
                x = this.canvas.width - 100;
                y = 100;
                break;
            case 'shopButton':
                x = 50;
                y = 100;
                break;
            default:
                x = highlight.x || this.canvas.width / 2;
                y = highlight.y || this.canvas.height / 2;
        }
        
        // Subtle pulsing highlight
        const baseRadius = this.highlightRadius;
        const pulseRadius = baseRadius + Math.sin(time) * 6;
        const pulseOpacity = 0.6 + Math.sin(time) * 0.2;
        
        // Soft outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius + 15);
        gradient.addColorStop(0, `rgba(64, 209, 88, ${pulseOpacity * 0.3})`);
        gradient.addColorStop(0.6, `rgba(64, 209, 88, ${pulseOpacity * 0.1})`);
        gradient.addColorStop(1, 'rgba(64, 209, 88, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius + 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Clean highlight ring
        ctx.strokeStyle = `rgba(64, 209, 88, ${pulseOpacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Subtle pointer arrow
        this.drawCleanPointerArrow(x, y + pulseRadius + 25, time);
    }
    
    /**
     * Draw clean, subtle pointer arrow
     */
    drawCleanPointerArrow(x, y, time) {
        const ctx = this.ctx;
        const bounce = Math.sin(time * 1.5) * 3;
        const opacity = 0.8 + Math.sin(time * 2) * 0.2;
        
        ctx.fillStyle = `rgba(64, 209, 88, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(x, y + bounce);
        ctx.lineTo(x - 8, y - 12 + bounce);
        ctx.lineTo(x + 8, y - 12 + bounce);
        ctx.closePath();
        ctx.fill();
    }
      /**
     * Draw the main tutorial panel
     */
    drawTutorialPanel(tutorial, step) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Panel dimensions - cleaner, more focused
        const panelWidth = Math.min(700, width * 0.85);
        const panelHeight = Math.min(450, height * 0.7);
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;
        
        // Clean modern background with subtle gradient
        const gradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
        gradient.addColorStop(0, 'rgba(13, 17, 23, 0.98)');
        gradient.addColorStop(1, 'rgba(22, 27, 34, 0.98)');
        ctx.fillStyle = gradient;
        this.drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 16);
        ctx.fill();
        
        // Subtle border with glow effect
        ctx.shadowColor = '#58a6ff';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 16);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Header section with clean typography
        const headerHeight = 80;
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(step.title, width / 2, panelY + 40);
        
        // Subtle divider line
        ctx.strokeStyle = '#21262d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 40, panelY + headerHeight - 20);
        ctx.lineTo(panelX + panelWidth - 40, panelY + headerHeight - 20);
        ctx.stroke();
        
        // Content area with better spacing
        ctx.fillStyle = '#e6edf3';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'left';
        
        const contentY = panelY + headerHeight + 20;
        const lineHeight = 28;
        const maxContentWidth = panelWidth - 80;
        let currentY = contentY;
        
        // Render content with proper text wrapping
        step.content.forEach(line => {
            if (line === '') {
                currentY += lineHeight * 0.5; // Smaller gap for empty lines
                return;
            }
            
            // Handle bullet points with better formatting
            if (line.startsWith('•')) {
                ctx.fillStyle = '#40d158';
                ctx.fillText('●', panelX + 50, currentY);
                ctx.fillStyle = '#e6edf3';
                
                // Wrap the bullet text
                const bulletText = line.substring(1).trim();
                const wrappedLines = this.wrapText(ctx, bulletText, maxContentWidth - 30);
                wrappedLines.forEach((wrappedLine, index) => {
                    ctx.fillText(wrappedLine, panelX + 70, currentY + (index * lineHeight));
                });
                currentY += wrappedLines.length * lineHeight;
            } else {
                // Regular text with wrapping
                const wrappedLines = this.wrapText(ctx, line, maxContentWidth);
                wrappedLines.forEach((wrappedLine, index) => {
                    ctx.fillText(wrappedLine, panelX + 40, currentY + (index * lineHeight));
                });
                currentY += wrappedLines.length * lineHeight;
            }
        });
        
        // Clean progress indicator at bottom
        this.drawModernProgressIndicator(tutorial, panelX, panelY, panelWidth, panelHeight);
    }
    
    /**
     * Wrap text to fit within specified width
     */
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
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
     * Draw modern, clean progress indicator
     */
    drawModernProgressIndicator(tutorial, panelX, panelY, panelWidth, panelHeight) {
        const ctx = this.ctx;
        const totalSteps = tutorial.steps.length;
        const currentStep = this.currentStep + 1;
        
        // Position at bottom of panel
        const progressY = panelY + panelHeight - 50;
        const progressWidth = panelWidth - 80;
        const progressX = panelX + 40;
        
        // Step counter with modern typography
        ctx.fillStyle = '#7d8590';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${currentStep} of ${totalSteps}`, panelX + panelWidth / 2, progressY + 25);
        
        // Modern progress dots
        const dotSpacing = progressWidth / (totalSteps - 1);
        const dotRadius = 4;
        
        for (let i = 0; i < totalSteps; i++) {
            const dotX = progressX + (i * dotSpacing);
            const dotY = progressY;
            const isActive = i === this.currentStep;
            const isCompleted = i < this.currentStep;
            
            // Dot background
            ctx.fillStyle = isCompleted || isActive ? '#40d158' : '#21262d';
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Active dot glow
            if (isActive) {
                ctx.shadowColor = '#40d158';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#40d158';
                ctx.beginPath();
                ctx.arc(dotX, dotY, dotRadius + 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            
            // Connection lines between dots
            if (i < totalSteps - 1) {
                const nextDotX = progressX + ((i + 1) * dotSpacing);
                ctx.strokeStyle = i < this.currentStep ? '#40d158' : '#21262d';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(dotX + dotRadius, dotY);
                ctx.lineTo(nextDotX - dotRadius, dotY);
                ctx.stroke();
            }
        }
    }

    /**
     * Draw tutorial progress indicator
     */
    drawProgressIndicator(tutorial, panelX, panelY, panelWidth) {
        const ctx = this.ctx;
        const totalSteps = tutorial.steps.length;
        const progressWidth = panelWidth - 80;
        const progressHeight = 6;
        const progressX = panelX + 40;
        const progressY = panelY + 320;
        
        // Progress bar background
        ctx.fillStyle = '#21262d';
        this.drawRoundedRect(ctx, progressX, progressY, progressWidth, progressHeight, 3);
        ctx.fill();
        
        // Progress bar fill
        const fillWidth = (this.currentStep + 1) / totalSteps * progressWidth;
        ctx.fillStyle = '#40d158';
        this.drawRoundedRect(ctx, progressX, progressY, fillWidth, progressHeight, 3);
        ctx.fill();
        
        // Step indicators
        for (let i = 0; i < totalSteps; i++) {
            const stepX = progressX + (i / (totalSteps - 1)) * progressWidth;
            const isCompleted = i <= this.currentStep;
            
            ctx.fillStyle = isCompleted ? '#40d158' : '#6b7280';
            ctx.beginPath();
            ctx.arc(stepX, progressY + progressHeight / 2, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Progress text
        ctx.fillStyle = '#7d8590';
        ctx.font = '14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(
            `Step ${this.currentStep + 1} of ${totalSteps}`,
            progressX + progressWidth / 2,
            progressY + 25
        );
    }    /**
     * Draw navigation buttons
     */
    drawNavigationButtons() {
        const tutorial = this.tutorials[this.currentTutorial];
        const isFirstStep = this.currentStep === 0;
        const isLastStep = this.currentStep === tutorial.steps.length - 1;
        
        // Always show skip button (top right, minimal style)
        this.drawMinimalButton(this.buttons.skip, '#6b7280');
        
        // Show appropriate navigation buttons based on step
        if (isLastStep) {
            // Final step - only show complete button
            this.drawModernButton(this.buttons.complete, 'primary');
        } else if (isFirstStep) {
            // First step - only show next button
            this.drawModernButton(this.buttons.next, 'primary');
        } else {
            // Middle steps - show both previous and next
            this.drawModernButton(this.buttons.previous, 'secondary');
            this.drawModernButton(this.buttons.next, 'primary');
        }
    }
    
    /**
     * Draw a modern button with proper styling
     */
    drawModernButton(button, style = 'primary') {
        const ctx = this.ctx;
        const isHovered = button.hovered;
        
        ctx.save();
        
        // Button colors based on style
        const styles = {
            primary: {
                bg: '#40d158',
                bgHover: '#2ea043',
                text: '#ffffff',
                shadow: '#40d158'
            },
            secondary: {
                bg: '#21262d',
                bgHover: '#30363d',
                text: '#f0f6fc',
                shadow: '#58a6ff'
            }
        };
        
        const buttonStyle = styles[style];
        const bgColor = isHovered ? buttonStyle.bgHover : buttonStyle.bg;
        
        // Button background with subtle elevation
        if (isHovered) {
            ctx.shadowColor = buttonStyle.shadow;
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;
        }
        
        ctx.fillStyle = bgColor;
        this.drawRoundedRect(ctx, button.x, button.y, button.width, button.height, 8);
        ctx.fill();
        
        // Button border for secondary style
        if (style === 'secondary') {
            ctx.strokeStyle = isHovered ? '#58a6ff' : '#30363d';
            ctx.lineWidth = 1;
            this.drawRoundedRect(ctx, button.x, button.y, button.width, button.height, 8);
            ctx.stroke();
        }
        
        // Button text with modern typography
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = buttonStyle.text;
        ctx.font = `${isHovered ? 'bold' : '500'} 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
            button.text,
            button.x + button.width / 2,
            button.y + button.height / 2 + 6
        );
        
        ctx.restore();
    }
    
    /**
     * Draw minimal button for skip action
     */
    drawMinimalButton(button, color) {
        const ctx = this.ctx;
        const isHovered = button.hovered;
        const alpha = isHovered ? 0.8 : 0.6;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Minimal background
        ctx.fillStyle = `rgba(107, 114, 128, ${isHovered ? 0.2 : 0.1})`;
        this.drawRoundedRect(ctx, button.x, button.y, button.width, button.height, 6);
        ctx.fill();
        
        // Text
        ctx.fillStyle = color;
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            button.text,
            button.x + button.width / 2,
            button.y + button.height / 2 + 5
        );
        
        ctx.restore();
    }
    
    /**
     * Helper method to draw rounded rectangles
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
    }
    
    /**
     * Check if tutorial should be triggered for new users
     */
    checkAndShowWelcomeTutorial() {
        if (this.shouldShowTutorial() && !this.isActive) {
            // Small delay to ensure game is fully loaded
            setTimeout(() => {
                this.startTutorial('welcome');
            }, 1000);
        }
    }
    
    /**
     * Trigger specific tutorial from external systems
     */
    triggerTutorial(tutorialType) {
        if (this.tutorials[tutorialType] && !this.isActive) {
            this.startTutorial(tutorialType);
        }
    }
    
    /**
     * Reset all tutorial progress (for testing/debugging)
     */
    resetTutorialProgress() {
        this.tutorialProgress = {};
        this.hasShownWelcome = false;
        this.hasShownGameplay = false;
        this.hasShownUpgrades = false;
        this.hasShownSettings = false;
        this.saveTutorialProgress();
        console.log('🎓 Tutorial progress reset');
    }
    
    /**
     * Show a quick tooltip hint (non-blocking tutorial)
     */
    showQuickHint(message, duration = 3000) {
        if (!this.isActive) {
            // Create a simple overlay hint
            const hint = {
                message,
                startTime: Date.now(),
                duration,
                alpha: 0,
                targetAlpha: 0.9
            };
            
            this.quickHint = hint;
            
            // Auto-hide the hint
            setTimeout(() => {
                if (this.quickHint === hint) {
                    this.quickHint.targetAlpha = 0;
                    setTimeout(() => {
                        if (this.quickHint === hint) {
                            this.quickHint = null;
                        }
                    }, 500);
                }
            }, duration);
        }
    }
    
    /**
     * Show first-time data packet collection hint
     */
    showDataPacketHint() {
        if (!this.tutorialProgress.dataPacketHint) {
            this.showQuickHint("💡 Data Packets earned! Press Q to open the upgrade shop.");
            this.tutorialProgress.dataPacketHint = true;
            this.saveTutorialProgress();
        }
    }
    
    /**
     * Show first-time low health hint
     */
    showLowHealthHint() {
        if (!this.tutorialProgress.lowHealthHint) {
            this.showQuickHint("❤️ Low health! Look for life boxes or upgrade your health regeneration.");
            this.tutorialProgress.lowHealthHint = true;
            this.saveTutorialProgress();
        }
    }
    
    /**
     * Show first-time achievement unlock hint
     */
    showAchievementHint() {
        if (!this.tutorialProgress.achievementHint) {
            this.showQuickHint("🏆 Achievement unlocked! Check the achievements menu from the home screen.");
            this.tutorialProgress.achievementHint = true;
            this.saveTutorialProgress();
        }
    }
}
