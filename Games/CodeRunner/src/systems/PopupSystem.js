/**
 * PopupSystem - Handle modal dialogs and popups for the game
 */

export class PopupSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Popup state
        this.activePopup = null;
        this.popupQueue = [];
        
        // Animation properties
        this.animationProgress = 0;
        this.animationDuration = 300; // milliseconds
        this.isAnimating = false;
        this.animationStartTime = 0;
        
        // Button state for interactions
        this.buttonHovered = false;
        this.buttonClickArea = null;
    }
    
    /**
     * Show a loading popup
     * @param {string} message - The loading message to display
     */
    showLoadingPopup(message = "Loading...") {
        const popup = {
            type: 'loading',
            title: 'Loading',
            message: message,
            icon: '💾',
            buttons: [],
            canClose: false,
            timestamp: Date.now()
        };
        
        this.showPopup(popup);
    }
    
    /**
     * Show a confirmation popup with OK button
     * @param {string} title - The popup title
     * @param {string} message - The confirmation message
     * @param {Function} onOk - Callback when OK is clicked
     */
    showConfirmationPopup(title, message, onOk = null) {
        const popup = {
            type: 'confirmation',
            title: title,
            message: message,
            icon: '✓',
            buttons: [
                {
                    text: 'OK',
                    action: onOk || (() => this.closePopup()),
                    color: '#56d364',
                    hoverColor: '#46c358'
                }
            ],
            canClose: true,
            timestamp: Date.now()
        };
        
        this.showPopup(popup);
    }
    
    /**
     * Show an error popup
     * @param {string} title - The popup title
     * @param {string} message - The error message
     * @param {Function} onOk - Callback when OK is clicked
     */
    showErrorPopup(title, message, onOk = null) {
        const popup = {
            type: 'error',
            title: title,
            message: message,
            icon: '⚠',
            buttons: [
                {
                    text: 'OK',
                    action: onOk || (() => this.closePopup()),
                    color: '#f85149',
                    hoverColor: '#e74c3c'
                }
            ],
            canClose: true,
            timestamp: Date.now()
        };
        
        this.showPopup(popup);
    }
      /**
     * Show a popup with custom configuration
     * @param {Object} popup - Popup configuration object
     */
    showPopup(popup) {
        // If there's already an active popup, queue this one
        if (this.activePopup) {
            this.popupQueue.push(popup);
            return;
        }
        
        this.activePopup = popup;
        this.startAnimation(true); // Show animation
        
        // Play menu open sound if the game instance is available
        if (window.gameInstance && window.gameInstance.audioSystem) {
            window.gameInstance.audioSystem.onMenuOpen();
        }
    }
      /**
     * Close the current popup
     */
    closePopup() {
        if (!this.activePopup) return;
        
        // Play menu close sound if the game instance is available
        if (window.gameInstance && window.gameInstance.audioSystem) {
            window.gameInstance.audioSystem.onMenuClose();
        }
        
        // Start hide animation
        this.startAnimation(false);
        
        // After animation, clear popup and show next in queue
        setTimeout(() => {
            this.activePopup = null;
            this.buttonHovered = false;
            this.buttonClickArea = null;
            
            // Show next popup in queue if any
            if (this.popupQueue.length > 0) {
                const nextPopup = this.popupQueue.shift();
                this.showPopup(nextPopup);
            }
        }, this.animationDuration);
    }
    
    /**
     * Update the popup (for loading messages, etc.)
     * @param {string} newMessage - New message to display
     */
    updatePopupMessage(newMessage) {
        if (this.activePopup) {
            this.activePopup.message = newMessage;
        }
    }
    
    /**
     * Start popup animation
     * @param {boolean} isShowing - True for show animation, false for hide
     */
    startAnimation(isShowing) {
        this.isAnimating = true;
        this.animationStartTime = Date.now();
        this.animatingIn = isShowing;
    }
    
    /**
     * Update animation progress
     */
    updateAnimation(currentTime) {
        if (!this.isAnimating) return;
        
        const elapsed = currentTime - this.animationStartTime;
        const progress = Math.min(elapsed / this.animationDuration, 1);
        
        // Ease-out animation
        this.animationProgress = this.animatingIn ? 
            1 - Math.pow(1 - progress, 3) : 
            Math.pow(1 - progress, 3);
        
        if (progress >= 1) {
            this.isAnimating = false;
            this.animationProgress = this.animatingIn ? 1 : 0;
        }
    }
    
    /**
     * Handle mouse movement for button hover effects
     * @param {number} x - Mouse X coordinate
     * @param {number} y - Mouse Y coordinate
     */
    handleMouseMove(x, y) {
        if (!this.activePopup || !this.activePopup.buttons.length) {
            this.buttonHovered = false;
            return;
        }
        
        // Check if mouse is over any button
        this.buttonHovered = false;
        if (this.buttonClickArea) {
            for (const area of this.buttonClickArea) {
                if (x >= area.x && x <= area.x + area.width &&
                    y >= area.y && y <= area.y + area.height) {
                    this.buttonHovered = true;
                    this.hoveredButton = area.buttonIndex;
                    break;
                }
            }
        }
    }
      /**
     * Handle mouse clicks on popup buttons
     * @param {number} x - Click X coordinate
     * @param {number} y - Click Y coordinate
     * @returns {boolean} True if click was handled
     */
    handleClick(x, y) {
        if (!this.activePopup || !this.activePopup.buttons.length || !this.buttonClickArea) {
            return false;
        }
        
        // Check if click is on any button
        for (const area of this.buttonClickArea) {
            if (x >= area.x && x <= area.x + area.width &&
                y >= area.y && y <= area.y + area.height) {
                
                // Play click sound
                if (window.gameInstance && window.gameInstance.audioSystem) {
                    window.gameInstance.audioSystem.onMenuClick();
                }
                
                const button = this.activePopup.buttons[area.buttonIndex];
                if (button && button.action) {
                    button.action();
                }
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Render the active popup
     * @param {number} currentTime - Current timestamp for animations
     */
    render(currentTime) {
        if (!this.activePopup) return;
        
        // Update animation
        this.updateAnimation(currentTime);
        
        if (this.animationProgress <= 0) return;
        
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Save context state
        ctx.save();
        
        // Apply animation transform
        const scale = 0.8 + (0.2 * this.animationProgress);
        const alpha = this.animationProgress;
        
        // Draw backdrop
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate popup dimensions
        const popupWidth = 400;
        const popupHeight = 200;
        const popupX = (canvas.width - popupWidth) / 2;
        const popupY = (canvas.height - popupHeight) / 2;
        
        // Apply scale transform
        ctx.globalAlpha = alpha;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        
        // Draw popup background
        ctx.fillStyle = '#1c2128';
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 2;
        
        // Rounded rectangle
        this.drawRoundedRect(ctx, popupX, popupY, popupWidth, popupHeight, 8);
        ctx.fill();
        ctx.stroke();
        
        // Draw title bar
        ctx.fillStyle = '#21262d';
        this.drawRoundedRect(ctx, popupX, popupY, popupWidth, 50, 8, true, false);
        ctx.fill();
        
        // Draw title
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'left';
        
        // Title with icon
        const titleText = `${this.activePopup.icon} ${this.activePopup.title}`;
        ctx.fillText(titleText, popupX + 20, popupY + 32);
        
        // Draw message
        ctx.fillStyle = '#8b949e';
        ctx.font = '14px Courier New';
        
        // Word wrap the message
        const maxWidth = popupWidth - 40;
        const lines = this.wrapText(ctx, this.activePopup.message, maxWidth);
        const lineHeight = 20;
        const messageStartY = popupY + 80;
        
        lines.forEach((line, index) => {
            ctx.fillText(line, popupX + 20, messageStartY + (index * lineHeight));
        });
        
        // Draw buttons
        if (this.activePopup.buttons.length > 0) {
            this.drawButtons(ctx, popupX, popupY, popupWidth, popupHeight);
        }
        
        // Draw loading spinner for loading popups
        if (this.activePopup.type === 'loading') {
            this.drawLoadingSpinner(ctx, popupX + popupWidth - 60, popupY + 25, currentTime);
        }
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Draw buttons on the popup
     */
    drawButtons(ctx, popupX, popupY, popupWidth, popupHeight) {
        const buttons = this.activePopup.buttons;
        const buttonHeight = 35;
        const buttonSpacing = 10;
        const totalButtonWidth = buttons.length * 80 + (buttons.length - 1) * buttonSpacing;
        const buttonStartX = popupX + (popupWidth - totalButtonWidth) / 2;
        const buttonY = popupY + popupHeight - 50;
        
        // Reset button click areas
        this.buttonClickArea = [];
        
        buttons.forEach((button, index) => {
            const buttonX = buttonStartX + index * (80 + buttonSpacing);
            const buttonWidth = 80;
            
            // Store click area
            this.buttonClickArea.push({
                x: buttonX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                buttonIndex: index
            });
            
            // Button styling
            const isHovered = this.buttonHovered && this.hoveredButton === index;
            ctx.fillStyle = isHovered ? button.hoverColor : button.color;
            ctx.strokeStyle = button.color;
            ctx.lineWidth = 2;
            
            // Draw button
            this.drawRoundedRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 4);
            if (isHovered) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            
            // Button text
            ctx.fillStyle = isHovered ? '#ffffff' : button.color;
            ctx.font = 'bold 14px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(button.text, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 5);
        });
    }
    
    /**
     * Draw a loading spinner
     */
    drawLoadingSpinner(ctx, x, y, currentTime) {
        const radius = 12;
        const rotation = (currentTime * 0.005) % (Math.PI * 2);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        // Draw spinner segments
        for (let i = 0; i < 8; i++) {
            const alpha = (i + 1) / 8;
            const angle = (i * Math.PI * 2) / 8;
            
            ctx.strokeStyle = `rgba(88, 166, 255, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(radius * 0.6 * Math.cos(angle), radius * 0.6 * Math.sin(angle));
            ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Draw a rounded rectangle
     */
    drawRoundedRect(ctx, x, y, width, height, radius, topOnly = false, bottomOnly = false) {
        ctx.beginPath();
        
        if (topOnly) {
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
        } else if (bottomOnly) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + width, y);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y);
        } else {
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
        }
        
        ctx.closePath();
    }
    
    /**
     * Wrap text to fit within a given width
     */
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
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
     * Check if a popup is currently active
     */
    hasActivePopup() {
        return this.activePopup !== null;
    }
    
    /**
     * Get the current popup type
     */
    getActivePopupType() {
        return this.activePopup ? this.activePopup.type : null;
    }
      /**
     * Clear all popups
     */
    clearAllPopups() {
        this.activePopup = null;
        this.popupQueue = [];
        this.buttonHovered = false;
        this.buttonClickArea = null;
    }
    
    /**
     * Create a popup with simplified interface
     * @param {Object} config - Popup configuration
     */
    createPopup(config) {
        const popup = {
            type: config.type || 'info',
            title: config.title || 'Info',
            message: config.message || '',
            icon: this.getIconForType(config.type),
            buttons: config.buttons || [],
            canClose: config.showCloseButton !== false,
            timestamp: Date.now(),
            tag: config.tag || null,
            duration: config.duration || null
        };
        
        // Auto-close popup after duration if specified
        if (popup.duration) {
            setTimeout(() => {
                if (this.getActivePopupByTag(popup.tag)) {
                    this.closePopup();
                }
            }, popup.duration);
        }
        
        this.showPopup(popup);
    }
    
    /**
     * Get icon for popup type
     */
    getIconForType(type) {
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'loading': '💾'
        };
        return icons[type] || 'ℹ️';
    }
    
    /**
     * Find active popup by tag
     */
    getActivePopupByTag(tag) {
        if (!tag || !this.activePopup) return null;
        return this.activePopup.tag === tag ? this.activePopup : null;
    }
    
    /**
     * Update method to handle auto-closing popups
     */
    update() {
        // This method can be extended for future auto-closing logic
        // Currently the duration is handled by setTimeout in createPopup
    }
}
