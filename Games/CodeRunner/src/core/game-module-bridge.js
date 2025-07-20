/**
 * Game Module Bridge - Contains helper functions to integrate rendering modules
 */

/**
 * Connect Game class with separate rendering modules
 */
export function connectRenderingModules(game) {
    // Store original methods for potential fallback
    const originalMethods = {
        drawDifficultySelection: game.drawDifficultySelection,
        drawChangelog: game.drawChangelog,
        drawLeaderboard: game.drawLeaderboard,
        drawResetConfirmationDialog: game.drawResetConfirmationDialog,
        drawHealthHearts: game.drawHealthHearts,
        drawUI: game.drawUI,
        drawPauseOverlay: game.drawPauseOverlay,
        drawGameOverOverlay: game.drawGameOverOverlay,
        drawPerformanceDisplay: game.drawPerformanceDisplay,
        drawDataPacketsDisplay: game.drawDataPacketsDisplay,
        clearCanvas: game.clearCanvas
    };
    
    // Create a safe delegate method that falls back to original if module method fails
    game.delegateToRenderer = function(methodName, ...args) {
        try {
            if (game.renderer && typeof game.renderer[methodName] === 'function') {
                return game.renderer[methodName](...args);
            }
        } catch (error) {
            console.error(`Error delegating to renderer.${methodName}:`, error);
        }
        
        // Fall back to original method
        if (originalMethods[methodName]) {
            return originalMethods[methodName].apply(game, args);
        }
    };
    
    game.delegateToUI = function(methodName, ...args) {
        try {
            if (game.ui && typeof game.ui[methodName] === 'function') {
                return game.ui[methodName](...args);
            }
        } catch (error) {
            console.error(`Error delegating to ui.${methodName}:`, error);
        }
        
        // Fall back to original method
        if (originalMethods[methodName]) {
            return originalMethods[methodName].apply(game, args);
        }
    };
    
    game.delegateToDialogs = function(methodName, ...args) {
        try {
            if (game.dialogs && typeof game.dialogs[methodName] === 'function') {
                return game.dialogs[methodName](...args);
            }
        } catch (error) {
            console.error(`Error delegating to dialogs.${methodName}:`, error);
        }
        
        // Fall back to original method
        if (originalMethods[methodName]) {
            return originalMethods[methodName].apply(game, args);
        }
    };
    
    // Override specific methods to use the delegate pattern
    // This allows for graceful degradation if the modules aren't available
    
    // For example:
    // game.clearCanvas = function() {
    //     return game.delegateToRenderer('clearCanvas');
    // };
    
    return game;
}
