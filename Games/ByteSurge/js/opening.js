// ByteSurge: Infinite Loop - Opening Animation System
// Cool animated intro sequence with studio and game logos

// ===== OPENING ANIMATION STATE =====
let openingActive = true;
let openingPhase = 'loading'; // 'loading', 'studio', 'game', 'home', 'instructions', 'options', 'complete'
let openingStartTime = 0;
let studioLogo = null;
let gameLogo = null;
let assetsLoaded = 0;
let totalAssets = 2;

// Home screen menu state
let selectedMenuIndex = 0;
let menuButtons = [];
let hoveredMenuIndex = -1;

// Settings state
let gameSettings = {
    skipOpeningAnimation: false
};

// Options screen state
let optionsMenuIndex = 0;
let optionsButtons = [];

// Animation timing (in milliseconds) - reduced for faster testing
const STUDIO_DURATION = 2000; // Reduced from 3000
const GAME_DURATION = 3000;   // Reduced from 4000
const FADE_DURATION = 800;

// ===== ASSET LOADING =====
function loadOpeningAssets() {
    // Load studio logo
    studioLogo = new Image();
    studioLogo.onload = () => {
        assetsLoaded++;
        checkAssetsComplete();
    };
    studioLogo.onerror = () => {
        assetsLoaded++;
        checkAssetsComplete();
    };
    studioLogo.src = 'assets/opening animation studio logo.png';
    
    // Load game logo
    gameLogo = new Image();
    gameLogo.onload = () => {
        assetsLoaded++;
        checkAssetsComplete();
    };
    gameLogo.onerror = () => {
        assetsLoaded++;
        checkAssetsComplete();
    };
    gameLogo.src = 'assets/opening  animation game logo.png';
}

function checkAssetsComplete() {
    if (assetsLoaded >= totalAssets) {
        startStudioSequence();
    }
}

// Temporary function to skip directly to home screen for testing
function skipToHomeScreen() {
    openingPhase = 'home';
    openingStartTime = performance.now();
    assetsLoaded = totalAssets; // Mark as loaded
}

// ===== ANIMATION SEQUENCES =====
function startStudioSequence() {
    openingPhase = 'studio';
    openingStartTime = performance.now();
}

function startGameSequence() {
    openingPhase = 'game';
    openingStartTime = performance.now();
}

function startHomeScreen() {
    openingPhase = 'home';
    openingStartTime = performance.now();
}

function completeOpening() {
    openingPhase = 'complete';
    openingActive = false;
    
    // Clear the canvas before transitioning to game
    if (window.ctx) {
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        window.ctx.save();
        window.ctx.fillStyle = '#1a1a1a';
        window.ctx.fillRect(0, 0, gameWidth, gameHeight);
        window.ctx.restore();
    }
    
    // Initialize the main game
    if (window.initializeGame) {
        setTimeout(() => {
            window.initializeGame();
        }, 50);
    }
}

// ===== RENDERING FUNCTIONS =====
function renderStudioSequence(ctx, elapsed) {
    const progress = elapsed / STUDIO_DURATION;

if (progress >= 1) {
        
        startGameSequence();
        return;
    }
      // Use fallback dimensions if GAME_WIDTH/HEIGHT not set
    const width = window.GAME_WIDTH || 1200;
    const height = window.GAME_HEIGHT || 800;
    
    // Clear screen with dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    if (!studioLogo) return;
    
    // Calculate fade in/out
    let alpha = 1;
    if (progress < 0.2) {
        // Fade in
        alpha = progress / 0.2;
    } else if (progress > 0.8) {
        // Fade out
        alpha = (1 - progress) / 0.2;
    }
      // Calculate logo size and position
    const logoScale = 0.5 + (Math.sin(progress * Math.PI) * 0.1); // Gentle breathing effect
    const logoWidth = studioLogo.width * logoScale;
    const logoHeight = studioLogo.height * logoScale;
    const logoX = (width - logoWidth) / 2;
    const logoY = (height - logoHeight) / 2;
    
    // Apply alpha and draw logo
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(studioLogo, logoX, logoY, logoWidth, logoHeight);
    ctx.restore();
    
    // Studio text
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('A Studio Production', width / 2, logoY + logoHeight + 40);
    ctx.restore();
}

function renderGameSequence(ctx, elapsed) {
    const progress = elapsed / GAME_DURATION;

if (progress >= 1) {
        
        startHomeScreen();
        return;
    }
    
    // Dark space background with stars
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
    
    // Animated stars
    renderStars(ctx, elapsed);
    
    if (!gameLogo) return;
    
    // Dramatic entrance animation
    let logoAlpha = 1;
    let logoScale = 1;
    let logoY = (window.GAME_HEIGHT - gameLogo.height) / 2;
    
    if (progress < 0.3) {
        // Dramatic zoom-in entrance
        const entranceProgress = progress / 0.3;
        logoScale = 0.2 + (entranceProgress * 0.8);
        logoAlpha = entranceProgress;
        logoY += (1 - entranceProgress) * 200; // Drop from above
    } else if (progress > 0.85) {
        // Fade out
        const fadeProgress = (progress - 0.85) / 0.15;
        logoAlpha = 1 - fadeProgress;
    }
    
    // Energy pulse effect around logo
    if (progress > 0.3 && progress < 0.85) {
        const pulseProgress = (progress - 0.3) / 0.55;
        renderEnergyPulse(ctx, elapsed, pulseProgress);
    }
    
    // Draw main game logo
    const logoWidth = gameLogo.width * logoScale;
    const logoHeight = gameLogo.height * logoScale;
    const logoX = (window.GAME_WIDTH - logoWidth) / 2;
    
    ctx.save();
    ctx.globalAlpha = logoAlpha;
    
    // Glow effect
    if (progress > 0.3) {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
    }
    
    ctx.drawImage(gameLogo, logoX, logoY, logoWidth, logoHeight);
    ctx.restore();
    
    // Game title text with typewriter effect
    if (progress > 0.5) {
        renderTitleText(ctx, elapsed, progress);
    }
    
    // "Press any key" prompt
    if (progress > 0.7) {
        renderPressKeyPrompt(ctx, elapsed);
    }
}

function renderStars(ctx, elapsed) {
    ctx.save();
    
    // Generate consistent star field
    const starCount = 50;
    const time = elapsed * 0.001;
    
    for (let i = 0; i < starCount; i++) {
        // Use deterministic random based on index
        const x = (i * 127 + 43) % window.GAME_WIDTH;
        const y = (i * 211 + 67) % window.GAME_HEIGHT;
        const brightness = 0.2 + ((i * 73) % 100) / 100 * 0.6;
        const twinkle = 0.5 + Math.sin(time * 2 + i) * 0.5;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * twinkle})`;
        ctx.fillRect(x, y, 1, 1);
    }
    
    ctx.restore();
}

function renderHomeScreen(ctx, elapsed) {
    // Dark space background with stars
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
    
    // Animated stars
    renderStars(ctx, elapsed);
    
    // Main title
    ctx.save();
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 24px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fillText('BYTESURGE', window.GAME_WIDTH / 2, 150);
    
    // Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.shadowBlur = 8;
    ctx.fillText('INFINITE LOOP', window.GAME_WIDTH / 2, 180);
    
    // Menu options
    const menuItems = [
        'START GAME',
        'INSTRUCTIONS',
        'OPTIONS'
    ];
    
    // Clear button array and rebuild it
    menuButtons = [];
    
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.shadowBlur = 5;
    
    menuItems.forEach((item, index) => {
        const y = 280 + (index * 40);
        
        // Calculate button bounds for click detection
        ctx.font = '14px "Press Start 2P", monospace';
        const textMetrics = ctx.measureText(item);
        const buttonWidth = textMetrics.width + 40; // Add padding
        const buttonHeight = 30;
        const buttonX = (window.GAME_WIDTH - buttonWidth) / 2;
        const buttonY = y - 20;
        
        // Store button info for click detection
        menuButtons.push({
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            index: index,
            text: item
        });
        
        // Highlight effect for selected option or hover
        if (index === selectedMenuIndex) {
            // Draw button background when selected
            ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
            
            ctx.fillStyle = '#ffff00';
            ctx.shadowColor = '#ffff00';
            
            // Pulsing effect
            const pulse = 0.8 + Math.sin(elapsed * 0.005) * 0.2;
            ctx.globalAlpha = pulse;
        } else {
            ctx.fillStyle = '#888888';
            ctx.shadowColor = '#888888';
            ctx.globalAlpha = 0.7;
        }
        
        ctx.fillText(item, window.GAME_WIDTH / 2, y);
    });
      // Instructions at bottom
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.shadowBlur = 3;
    
    const instructionY = window.GAME_HEIGHT - 100;
    ctx.fillText('USE ARROW KEYS OR CLICK TO NAVIGATE', window.GAME_WIDTH / 2, instructionY);
    ctx.fillText('PRESS ENTER OR CLICK TO SELECT', window.GAME_WIDTH / 2, instructionY + 15);
    ctx.fillText('PRESS ESC TO EXIT', window.GAME_WIDTH / 2, instructionY + 30);
    
    ctx.restore();
}

function renderEnergyPulse(ctx, elapsed, progress) {
    const centerX = window.GAME_WIDTH / 2;
    const centerY = window.GAME_HEIGHT / 2;
    const time = elapsed * 0.005;
    
    ctx.save();
    
    // Multiple energy rings
    for (let ring = 0; ring < 3; ring++) {
        const ringRadius = 100 + (ring * 80) + Math.sin(time + ring) * 20;
        const alpha = (0.3 - ring * 0.1) * progress;
        
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 10]);
        ctx.lineDashOffset = -elapsed * 0.1;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.restore();
}

function renderTitleText(ctx, elapsed, progress) {
    const titleProgress = (progress - 0.5) / 0.5;
    if (titleProgress < 0) return;
    
    const title = "INFINITE LOOP";
    const subtitle = "Escape the Digital Maze";
    
    ctx.save();
    ctx.globalAlpha = Math.min(titleProgress * 2, 1);
    
    // Main title
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText(title, window.GAME_WIDTH / 2, window.GAME_HEIGHT / 2 + 120);
    
    // Subtitle with delay
    if (titleProgress > 0.3) {
        ctx.globalAlpha = Math.min((titleProgress - 0.3) * 2, 1);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.shadowBlur = 5;
        ctx.fillText(subtitle, window.GAME_WIDTH / 2, window.GAME_HEIGHT / 2 + 150);
    }
    
    ctx.restore();
}

function renderPressKeyPrompt(ctx, elapsed) {
    const blinkCycle = Math.sin(elapsed * 0.003);
    const alpha = 0.5 + blinkCycle * 0.5;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffff00';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS ANY KEY TO CONTINUE', window.GAME_WIDTH / 2, window.GAME_HEIGHT - 50);
    ctx.restore();
}

function renderInstructionsScreen(ctx, elapsed) {
    // Dark space background with stars
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
    
    // Animated stars
    renderStars(ctx, elapsed);
    
    ctx.save();
    
    // Title
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fillText('INSTRUCTIONS', window.GAME_WIDTH / 2, 80);
    
    // Instructions content
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.shadowBlur = 5;
    ctx.textAlign = 'left';
    
    const instructions = [
        'OBJECTIVE:',
        '• Navigate through infinite digital loops',
        '• Collect energy nodes to power your systems',
        '• Avoid corruption zones that drain energy',
        '• Deploy harvesters for passive energy generation',
        '',
        'CONTROLS:',
        '• SPACE or LEFT CLICK - Turn drone left',
        '• H or RIGHT CLICK - Deploy harvester',
        '• U - Open upgrade menu',
        '• P - Pause game',
        '• F11 - Toggle fullscreen',
        '',
        'GAMEPLAY:',
        '• Your drone moves forward automatically',
        '• Collect blue energy nodes (+10 energy)',
        '• Avoid red corruption zones (-5 energy)',
        '• Deploy harvesters near energy nodes',
        '• Harvesters generate energy over time',
        '• Use energy to purchase upgrades',
        '• Progress through zones for bonuses',
        '',
        'TIPS:',
        '• Plan your turns carefully',
        '• Place harvesters strategically',
        '• Monitor your energy levels',
        '• Use upgrades to improve efficiency'
    ];
    
    const startY = 130;
    const lineHeight = 16;
    
    instructions.forEach((line, index) => {
        const y = startY + (index * lineHeight);
        
        // Highlight section headers
        if (line.endsWith(':') && line.length > 1) {
            ctx.fillStyle = '#ffff00';
            ctx.shadowColor = '#ffff00';
        } else if (line.startsWith('•')) {
            ctx.fillStyle = '#cccccc';
            ctx.shadowColor = '#cccccc';
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
        }
        
        const x = (window.GAME_WIDTH - 600) / 2; // Center the text block
        ctx.fillText(line, x, y);
    });
    
    // Back button
    ctx.fillStyle = '#888888';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 3;
    
    const backButtonY = window.GAME_HEIGHT - 60;
    ctx.fillText('PRESS ESC OR CLICK HERE TO GO BACK', window.GAME_WIDTH / 2, backButtonY);
    
    // Add pulsing effect to back instruction
    const pulse = 0.6 + Math.sin(elapsed * 0.003) * 0.4;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffff00';
    ctx.fillText('PRESS ESC OR CLICK HERE TO GO BACK', window.GAME_WIDTH / 2, backButtonY);
    
    ctx.restore();
}

function renderOptionsScreen(ctx, elapsed) {
    // Dark space background with stars
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, window.GAME_WIDTH, window.GAME_HEIGHT);
    
    // Animated stars
    renderStars(ctx, elapsed);
    
    ctx.save();
    
    // Title
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fillText('OPTIONS', window.GAME_WIDTH / 2, 120);
    
    // Options menu
    const options = [
        {
            label: 'Skip Opening Animation',
            value: gameSettings.skipOpeningAnimation ? 'ON' : 'OFF',
            key: 'skipOpeningAnimation'
        },
        {
            label: 'Back to Main Menu',
            value: '',
            key: 'back'
        }
    ];
    
    // Clear options buttons array and rebuild it
    optionsButtons = [];
    
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.shadowBlur = 5;
    
    options.forEach((option, index) => {
        const y = 220 + (index * 50);
        
        // Calculate button bounds for click detection
        const labelWidth = ctx.measureText(option.label).width;
        const valueWidth = option.value ? ctx.measureText(option.value).width : 0;
        const totalWidth = labelWidth + (option.value ? valueWidth + 40 : 0) + 40; // Add padding
        const buttonHeight = 35;
        const buttonX = (window.GAME_WIDTH - totalWidth) / 2;
        const buttonY = y - 25;
        
        // Store button info for click detection
        optionsButtons.push({
            x: buttonX,
            y: buttonY,
            width: totalWidth,
            height: buttonHeight,
            index: index,
            option: option
        });
        
        // Highlight effect for selected option
        if (index === optionsMenuIndex) {
            // Draw button background when selected
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.fillRect(buttonX, buttonY, totalWidth, buttonHeight);
            
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#00ffff';
            
            // Pulsing effect
            const pulse = 0.8 + Math.sin(elapsed * 0.005) * 0.2;
            ctx.globalAlpha = pulse;
        } else {
            ctx.fillStyle = '#888888';
            ctx.shadowColor = '#888888';
            ctx.globalAlpha = 0.7;
        }
        
        // Draw option label
        ctx.textAlign = 'left';
        const labelX = buttonX + 20;
        ctx.fillText(option.label, labelX, y);
        
        // Draw option value if it exists
        if (option.value) {
            // Set value color based on state
            if (option.value === 'ON') {
                ctx.fillStyle = '#00ff00'; // Green for ON
            } else {
                ctx.fillStyle = '#ff8800'; // Orange for OFF
            }
            
            ctx.textAlign = 'right';
            const valueX = buttonX + totalWidth - 20;
            ctx.fillText(option.value, valueX, y);
        }
    });
    
    // Instructions at bottom
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 3;
    
    const instructionY = window.GAME_HEIGHT - 100;
    ctx.fillText('USE ARROW KEYS OR CLICK TO NAVIGATE', window.GAME_WIDTH / 2, instructionY);
    ctx.fillText('PRESS ENTER OR CLICK TO SELECT', window.GAME_WIDTH / 2, instructionY + 15);
    ctx.fillText('PRESS ESC TO GO BACK', window.GAME_WIDTH / 2, instructionY + 30);
    
    ctx.restore();
}

// ===== MAIN OPENING FUNCTIONS =====
function updateOpening(deltaTime) {
    if (!openingActive) return;
    
    // Handle phase transitions and updates here if needed
}

function renderOpening(ctx) {
    if (!openingActive) return;
    
    const elapsed = performance.now() - openingStartTime;
    
    switch (openingPhase) {
        case 'loading':
            renderLoadingScreen(ctx);
            break;
        case 'studio':
            renderStudioSequence(ctx, elapsed);
            break;
        case 'game':
            renderGameSequence(ctx, elapsed);
            break;
        case 'home':
            renderHomeScreen(ctx, elapsed);
            break;
        case 'instructions':
            renderInstructionsScreen(ctx, elapsed);
            break;
        case 'options':
            renderOptionsScreen(ctx, elapsed);
            break;
    }
}

function renderLoadingScreen(ctx) {
    // Use fallback dimensions if GAME_WIDTH/HEIGHT not set
    const width = window.GAME_WIDTH || 1200;
    const height = window.GAME_HEIGHT || 800;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', width / 2, height / 2);
    
    // Loading progress
    const progress = assetsLoaded / totalAssets;
    const barWidth = 200;
    const barHeight = 10;
    const barX = (width - barWidth) / 2;
    const barY = height / 2 + 30;
    
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
}

function handleOpeningInput(keyCode, mouseX, mouseY) {
    if (!openingActive) return false;
    
    if (openingPhase === 'home') {
        // Handle mouse clicks
        if (mouseX !== undefined && mouseY !== undefined) {
            return handleHomeScreenClick(mouseX, mouseY);
        }
        
        // Handle keyboard navigation
        if (keyCode === 38) { // Up arrow
            selectedMenuIndex = Math.max(0, selectedMenuIndex - 1);
            return true;
        } else if (keyCode === 40) { // Down arrow
            selectedMenuIndex = Math.min(2, selectedMenuIndex + 1);
            return true;
        } else if (keyCode === 13 || keyCode === 32) { // Enter or Space
            return handleMenuSelection(selectedMenuIndex);        } else if (keyCode === 27) { // Escape
            // Could add exit functionality later
            return true;
        }
    } else if (openingPhase === 'game') {
        // Skip to home screen if in final animation phase
        startHomeScreen();
        return true;
    } else if (openingPhase === 'studio') {
        // Skip to game sequence
        startGameSequence();
        return true;
    } else if (openingPhase === 'instructions') {
        // Handle mouse clicks in instructions
        if (mouseX !== undefined && mouseY !== undefined) {
            return handleInstructionsClick(mouseX, mouseY);
        }
          // Return to home from instructions on any key
        openingPhase = 'home';
        openingStartTime = performance.now();
        return true;
    } else if (openingPhase === 'options') {
        // Handle mouse clicks in options
        if (mouseX !== undefined && mouseY !== undefined) {
            return handleOptionsClick(mouseX, mouseY);
        }
        
        // Handle keyboard navigation in options
        if (keyCode === 38) { // Up arrow
            optionsMenuIndex = Math.max(0, optionsMenuIndex - 1);
            return true;
        } else if (keyCode === 40) { // Down arrow
            optionsMenuIndex = Math.min(1, optionsMenuIndex + 1); // 2 options (0-1)
            return true;
        } else if (keyCode === 13 || keyCode === 32) { // Enter or Space
            return handleOptionSelection(optionsMenuIndex);
        } else if (keyCode === 27) { // Escape
            // Return to home screen
            openingPhase = 'home';
            openingStartTime = performance.now();
            return true;
        }
    }
    
    return false;
}

function handleHomeScreenClick(mouseX, mouseY) {
    // Check if click is on any button
    for (let i = 0; i < menuButtons.length; i++) {
        const button = menuButtons[i];
        if (mouseX >= button.x && mouseX <= button.x + button.width &&
            mouseY >= button.y && mouseY <= button.y + button.height) {
            selectedMenuIndex = button.index;
            return handleMenuSelection(button.index);
        }
    }
    return false;
}

function handleInstructionsClick(mouseX, mouseY) {
    // Any click in instructions screen returns to home
    openingPhase = 'home';
    openingStartTime = performance.now();
    return true;
}

function handleHomeScreenMouseMove(mouseX, mouseY) {
    if (openingPhase === 'home') {
        hoveredMenuIndex = -1;
        
        // Check if mouse is hovering over any button
        for (let i = 0; i < menuButtons.length; i++) {
            const button = menuButtons[i];
            if (mouseX >= button.x && mouseX <= button.x + button.width &&
                mouseY >= button.y && mouseY <= button.y + button.height) {
                hoveredMenuIndex = button.index;
                selectedMenuIndex = button.index; // Update selection on hover
                break;
            }
        }
        
        return hoveredMenuIndex !== -1;
    } else if (openingPhase === 'options') {
        // Handle mouse hover in options screen
        for (let i = 0; i < optionsButtons.length; i++) {
            const button = optionsButtons[i];
            if (mouseX >= button.x && mouseX <= button.x + button.width &&
                mouseY >= button.y && mouseY <= button.y + button.height) {
                optionsMenuIndex = button.index; // Update selection on hover
                break;
            }
        }
        return true;
    }
    
    return false;
}

function handleMenuSelection(index) {
    switch (index) {
        case 0: // START GAME
            completeOpening();
            return true;
        case 1: // INSTRUCTIONS
            showInstructions();
            return true;
        case 2: // OPTIONS
            showOptions();
            return true;
        default:
            return false;
    }
}

function showInstructions() {
    openingPhase = 'instructions';
    openingStartTime = performance.now();
}

function showOptions() {
    openingPhase = 'options';
    openingStartTime = performance.now();
    optionsMenuIndex = 0; // Reset selection
}

function handleOptionsClick(mouseX, mouseY) {
    // Check if click is on any option button
    for (let i = 0; i < optionsButtons.length; i++) {
        const button = optionsButtons[i];
        if (mouseX >= button.x && mouseX <= button.x + button.width &&
            mouseY >= button.y && mouseY <= button.y + button.height) {
            optionsMenuIndex = button.index;
            return handleOptionSelection(button.index);
        }
    }
    return false;
}

function handleOptionSelection(index) {
    const options = [
        { key: 'skipOpeningAnimation' },
        { key: 'back' }
    ];
    
    const selectedOption = options[index];
    
    switch (selectedOption.key) {
        case 'skipOpeningAnimation':
            // Toggle the setting
            gameSettings.skipOpeningAnimation = !gameSettings.skipOpeningAnimation;
            saveSettings();
            return true;
        case 'back':
            // Return to home screen
            openingPhase = 'home';
            openingStartTime = performance.now();
            return true;
        default:
            return false;
    }
}

function saveSettings() {
    // Save settings to localStorage
    try {
        localStorage.setItem('byteSurgeSettings', JSON.stringify(gameSettings));
    } catch (error) {
        // Settings save failed
    }
}

function loadSettings() {
    // Load settings from localStorage
    try {
        const saved = localStorage.getItem('byteSurgeSettings');
        if (saved) {
            gameSettings = { ...gameSettings, ...JSON.parse(saved) };
        }
    } catch (error) {
        // Settings load failed
    }
}

// ===== INITIALIZATION =====
function initializeOpening() {
    // Load settings first
    loadSettings();
    
    // Check if we should skip the opening animation
    if (gameSettings.skipOpeningAnimation) {
        skipToHomeScreen();
        return;
    }
    
    loadOpeningAssets();
}

// ===== EXPORTS =====
window.openingAnimation = {
    active: () => openingActive,
    update: updateOpening,
    render: renderOpening,
    handleInput: handleOpeningInput,
    handleMouseMove: handleHomeScreenMouseMove,
    initialize: initializeOpening
};
