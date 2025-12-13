// ByteSurge: Tutorial System
// Simple text-based tutorial that users can click through

class TutorialSystem {    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isActive = false;
        this.currentStep = 0;
        this.tutorialCompleted = false;
        this.transitioning = false; // Flag to prevent double-clicks during transitions
        
        // Tutorial steps - simple text that users click through
        this.steps = [
            {
                title: "Welcome to ByteSurge!",
                text: [
                    "You are a data-harvesting drone in the digital realm.",
                    "Your mission: collect energy and expand your operations.",
                    "",
                    "Navigate through corruption zones while building",
                    "an automated energy harvesting network."
                ]
            },
            {
                title: "Basic Controls",
                text: [
                    "🎮 MOVEMENT:",
                    "• Use WASD or Arrow Keys to turn your drone",
                    "• SPACE BAR also turns your drone",
                    "",
                    "⚡ ENERGY COLLECTION:",
                    "• Move over blue energy nodes to collect them",
                    "• Energy is used to deploy harvesters and buy upgrades"
                ]
            },
            {
                title: "Harvesters",
                text: [
                    "🏭 AUTOMATED HARVESTERS:",
                    "• Press H to deploy a harvester at your location",
                    "• Harvesters automatically collect nearby energy",
                    "• They continue working even when you're away!",
                    "",
                    "💡 TIP: Place harvesters in energy-rich areas"
                ]
            },
            {
                title: "Corruption Zones",
                text: [
                    "☠️ DANGER ZONES:",
                    "• Red corruption zones will damage your drone",
                    "• Avoid these areas or move through them quickly",
                    "• Corruption spreads and evolves over time",
                    "",
                    "⚠️ WARNING: Touching corruption ends the game!"
                ]
            },
            {
                title: "Game Features",
                text: [
                    "🎯 OBJECTIVE:",
                    "• Survive as long as possible",
                    "• Collect energy and deploy harvesters",
                    "• Travel the maximum distance",
                    "",
                    "📊 ADDITIONAL FEATURES:",
                    "• Press P to pause the game",
                    "• Press U for upgrades menu",
                    "• Your progress is automatically saved"
                ]
            },
            {
                title: "Ready to Play!",
                text: [
                    "🚀 You're all set!",
                    "",
                    "Remember:",
                    "• Collect energy nodes (blue)",
                    "• Deploy harvesters (press H)",
                    "• Avoid corruption zones (red)",
                    "• Survive and explore as far as possible!",
                    "",
                    "Good luck, and enjoy ByteSurge!"
                ]
            }
        ];
        
        }

    start() {
        // Remove any existing tutorial modal first
        const existingModal = document.getElementById('tutorial-modal-overlay');
        if (existingModal) {
            existingModal.remove();
            }
        
        this.isActive = true;
        this.currentStep = 0;
        this.showTutorialModal();
        }

    showTutorialModal() {
        if (this.currentStep >= this.steps.length) {
            this.complete();
            return;
        }

        const step = this.steps[this.currentStep];
        const isLastStep = this.currentStep === this.steps.length - 1;
        
        // Remove any existing modal first
        const existingModal = document.getElementById('tutorial-modal-overlay');
        if (existingModal) {
            existingModal.remove();
            }

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Courier New', monospace;
        `;        // Prevent clicks on the overlay from propagating to the game
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        
        // Also prevent other events from propagating
        overlay.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        
        overlay.addEventListener('mouseup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        });

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(145deg, #1a1a2e, #16213e);
            border: 2px solid #00ff00;
            border-radius: 12px;
            padding: 30px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
            position: relative;
        `;        // Prevent clicks on the modal content from closing the modal
        modal.addEventListener('click', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        
        // Also prevent other mouse events from propagating
        modal.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        });
        
        modal.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        });

        // Step counter
        const stepCounter = document.createElement('div');
        stepCounter.style.cssText = `
            position: absolute;
            top: 15px;
            right: 20px;
            color: #00ff00;
            font-size: 12px;
            font-weight: bold;
        `;
        stepCounter.textContent = `${this.currentStep + 1} / ${this.steps.length}`;

        // Title
        const title = document.createElement('h2');
        title.style.cssText = `
            color: #00ff00;
            margin: 0 0 20px 0;
            font-size: 24px;
            text-align: center;
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        `;
        title.textContent = step.title;

        // Content
        const content = document.createElement('div');
        content.style.cssText = `
            color: #ffffff;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
            white-space: pre-line;
        `;
        content.textContent = step.text.join('\n');

        // Buttons container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 15px;
        `;

        // Previous button (only show if not first step)
        if (this.currentStep > 0) {
            const prevButton = document.createElement('button');
            prevButton.style.cssText = `
                background: linear-gradient(145deg, #555555, #777777);
                border: none;
                color: #ffffff;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: bold;
                border-radius: 6px;
                cursor: pointer;
                font-family: inherit;
                transition: all 0.3s ease;
            `;
            prevButton.textContent = '← Previous';            prevButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.previousStep();
            });
            buttonContainer.appendChild(prevButton);
        } else {
            // Empty div to maintain spacing
            buttonContainer.appendChild(document.createElement('div'));
        }

        // Next/Finish button
        const nextButton = document.createElement('button');
        nextButton.style.cssText = `
            background: linear-gradient(145deg, #00aa00, #00ff00);
            border: none;
            color: #000000;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.3s ease;
        `;
        nextButton.textContent = isLastStep ? 'Start Playing!' : 'Next →';        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.nextStep();
        });

        // Skip button
        const skipButton = document.createElement('button');
        skipButton.style.cssText = `
            background: transparent;
            border: 1px solid #666666;
            color: #aaaaaa;
            padding: 8px 16px;
            font-size: 12px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            margin-left: 10px;
        `;
        skipButton.textContent = 'Skip Tutorial';        skipButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.complete();
        });        // Assemble modal
        modal.appendChild(stepCounter);
        modal.appendChild(title);
        modal.appendChild(content);
        
        buttonContainer.appendChild(nextButton);
        buttonContainer.appendChild(skipButton);
        modal.appendChild(buttonContainer);
          overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Force visibility and bring to front
        overlay.style.display = 'flex';
        overlay.style.zIndex = '99999';
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        
        // Add keyboard navigation
        const handleKeyPress = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.nextStep();
            } else if (e.key === 'ArrowLeft' && this.currentStep > 0) {
                e.preventDefault();
                this.previousStep();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.complete();
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        
        // Store the handler to remove it later
        overlay.tutorialKeyHandler = handleKeyPress;

        // Focus the modal for keyboard navigation
        nextButton.focus();
    }    nextStep() {
        // Prevent double-clicks during transition
        if (this.transitioning) {
            return;
        }
        this.transitioning = true;
        
        this.closeTutorialModal();
        this.currentStep++;
        
        // Show next modal immediately without delay
        this.showTutorialModal();
        this.transitioning = false;
    }

    previousStep() {
        // Prevent double-clicks during transition
        if (this.transitioning) {
            return;
        }
        this.transitioning = true;
        
        this.closeTutorialModal();
        this.currentStep--;
        
        // Show previous modal immediately without delay
        this.showTutorialModal();
        this.transitioning = false;
    }

    closeTutorialModal() {
        const overlay = document.getElementById('tutorial-modal-overlay');
        if (overlay) {
            // Remove keyboard handler
            if (overlay.tutorialKeyHandler) {
                document.removeEventListener('keydown', overlay.tutorialKeyHandler);
            }
            document.body.removeChild(overlay);
        }
    }

    complete() {
        this.closeTutorialModal();
        this.isActive = false;
        this.tutorialCompleted = true;
        
        // Mark tutorial as completed in localStorage
        localStorage.setItem('tutorialCompleted', 'true');
        
        // Show completion message
        if (window.authUI && window.authUI.showToast) {
            window.authUI.showToast('Tutorial completed! Good luck playing ByteSurge!', '#00ff00');
        }
    }

    // Check if tutorial has been completed before
    hasBeenCompleted() {
        return localStorage.getItem('tutorialCompleted') === 'true';
    }

    // Reset tutorial completion status
    reset() {
        localStorage.removeItem('tutorialCompleted');
        this.tutorialCompleted = false;
        this.currentStep = 0;
    }    // Handle input - block all input when tutorial modal is active
    handleInput(event) {
        // If the tutorial modal is active or transitioning, block all game input
        if (this.isActive || this.transitioning) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return true; // Return true when tutorial is active to block input propagation
        }
        return false;
    }

    // Update method (kept for compatibility, but not used in text-based tutorial)
    update(deltaTime) {
        // No updates needed for text-based tutorial
    }

    // Render method (kept for compatibility, but not used in text-based tutorial)
    render(ctx) {
        // No rendering needed for text-based tutorial
    }
}

// Initialize tutorial system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined') {
        window.tutorialSystem = new TutorialSystem();
    }
});

// Export for global access
if (typeof window !== 'undefined') {
    window.TutorialSystem = TutorialSystem;
}
