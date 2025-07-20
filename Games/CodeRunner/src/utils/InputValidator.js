/**
 * Input Validator - Utility functions for validating input parameters
 */

export class InputValidator {
    /**
     * Validate if a value is a valid number
     */
    static isValidNumber(value, allowZero = true) {
        if (value === null || value === undefined) return false;
        if (typeof value !== 'number') return false;
        if (isNaN(value)) return false;
        if (!allowZero && value === 0) return false;
        return true;
    }

    /**
     * Validate if a value is a valid positive number
     */
    static isValidPositiveNumber(value) {
        return this.isValidNumber(value, false) && value > 0;
    }

    /**
     * Validate if a value is a valid string
     */
    static isValidString(value, minLength = 0) {
        if (value === null || value === undefined) return false;
        if (typeof value !== 'string') return false;
        if (value.length < minLength) return false;
        return true;
    }

    /**
     * Validate if a value is a valid object
     */
    static isValidObject(value, allowNull = false) {
        if (!allowNull && (value === null || value === undefined)) return false;
        if (allowNull && (value === null || value === undefined)) return true;
        return typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * Validate if a value is a valid array
     */
    static isValidArray(value, minLength = 0) {
        if (value === null || value === undefined) return false;
        if (!Array.isArray(value)) return false;
        if (value.length < minLength) return false;
        return true;
    }

    /**
     * Validate position coordinates
     */
    static validatePosition(x, y, defaultX = 0, defaultY = 0) {
        return {
            x: this.isValidNumber(x) ? x : defaultX,
            y: this.isValidNumber(y) ? y : defaultY
        };
    }

    /**
     * Validate dimensions
     */
    static validateDimensions(width, height, defaultWidth = 32, defaultHeight = 32) {
        return {
            width: this.isValidPositiveNumber(width) ? width : defaultWidth,
            height: this.isValidPositiveNumber(height) ? height : defaultHeight
        };
    }

    /**
     * Validate delta time
     */
    static validateDeltaTime(deltaTime, defaultDeltaTime = 16.67) {
        if (!this.isValidPositiveNumber(deltaTime)) {
            return defaultDeltaTime;
        }
        // Cap delta time to prevent large jumps
        return Math.min(deltaTime, 100);
    }

    /**
     * Validate input keys object
     */
    static validateInputKeys(inputKeys) {
        if (!this.isValidObject(inputKeys)) {
            return {
                left: false,
                right: false,
                up: false,
                down: false,
                space: false,
                shift: false,
                escape: false
            };
        }
        return inputKeys;
    }

    /**
     * Validate sprite ID
     */
    static validateSpriteId(spriteId, defaultSprite = 'player-sprite.png') {
        if (!this.isValidString(spriteId, 1)) {
            return defaultSprite;
        }
        // Check if sprite ID has valid extension
        if (!spriteId.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
            return defaultSprite;
        }
        return spriteId;
    }

    /**
     * Validate game state
     */
    static validateGameState(gameState, validStates, defaultState) {
        if (!this.isValidString(gameState)) {
            return defaultState;
        }
        if (!validStates.includes(gameState)) {
            return defaultState;
        }
        return gameState;
    }

    /**
     * Sanitize player name
     */
    static sanitizePlayerName(name, maxLength = 20) {
        if (!this.isValidString(name)) {
            return '';
        }
        // Remove HTML tags and trim
        const sanitized = name.replace(/<[^>]*>/g, '').trim();
        // Limit length
        return sanitized.substring(0, maxLength);
    }

    /**
     * Validate color string
     */
    static validateColor(color, defaultColor = '#ffffff') {
        if (!this.isValidString(color)) {
            return defaultColor;
        }
        // Check if it's a valid hex color
        if (color.match(/^#[0-9A-F]{6}$/i)) {
            return color;
        }
        // Check if it's a valid CSS color name or rgb/rgba
        if (color.match(/^(rgb|rgba|hsl|hsla)\(|^[a-zA-Z]+$/)) {
            return color;
        }
        return defaultColor;
    }
}
