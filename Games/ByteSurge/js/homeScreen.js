// ByteSurge: Home Screen System
// Main menu after opening animation

class HomeScreen {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.hoveredMenuItem = -1;
        this.mouseX = 0;
        this.mouseY = 0;        this.menuItems = [
            { text: 'START GAME', action: 'start', glow: 0 },
            { text: 'LEADERBOARD', action: 'leaderboard', glow: 0 },
            { text: 'OPTIONS', action: 'options', glow: 0 },
            { text: 'CREDITS', action: 'credits', glow: 0 },
            { text: 'ABOUT', action: 'about', glow: 0 }
        ];        this.showingSubMenu = null;
        this.hoveredOptionIndex = -1;
        this.optionBounds = [];
        this.pulseOffset = 0;
        this.particleOffset = 0;
        
        // Animation effects
        this.titlePulse = 0;
        this.backgroundParticles = [];
        this.initBackgroundParticles();
        
        }
      initBackgroundParticles() {
        this.backgroundParticles = [];
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        
        for (let i = 0; i < 50; i++) {
            this.backgroundParticles.push({
                x: Math.random() * gameWidth,
                y: Math.random() * gameHeight,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                alpha: Math.random() * 0.5 + 0.2,
                size: Math.random() * 2 + 1,
                phase: Math.random() * Math.PI * 2
            });
        }
    }
      update(deltaTime) {
        this.pulseOffset += deltaTime * 0.003;
        this.titlePulse += deltaTime * 0.002;
        this.particleOffset += deltaTime * 0.001;
        
        // Update menu item glow effects based on hover
        this.menuItems.forEach((item, index) => {
            const targetGlow = index === this.hoveredMenuItem ? 1 : 0;
            const glowSpeed = 8; // Speed of glow transition
            
            if (item.glow < targetGlow) {
                item.glow = Math.min(targetGlow, item.glow + (deltaTime / 1000) * glowSpeed);
            } else if (item.glow > targetGlow) {
                item.glow = Math.max(targetGlow, item.glow - (deltaTime / 1000) * glowSpeed);
            }
        });
          // Update background particles
        this.backgroundParticles.forEach(particle => {
            particle.x += particle.vx * (deltaTime / 1000);
            particle.y += particle.vy * (deltaTime / 1000);
            particle.phase += deltaTime * 0.002;
            
            // Wrap particles around screen
            const gameWidth = window.GAME_WIDTH || 1200;
            const gameHeight = window.GAME_HEIGHT || 800;
            if (particle.x < 0) particle.x = gameWidth;
            if (particle.x > gameWidth) particle.x = 0;
            if (particle.y < 0) particle.y = gameHeight;
            if (particle.y > gameHeight) particle.y = 0;
        });
        
        // Update settings menu if open
        if (window.settingsMenuUI && window.isSettingsMenuOpen && window.isSettingsMenuOpen()) {
            window.settingsMenuUI.update(deltaTime);
        }
    }
    
    render() {
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        
        // Clear screen with dark gradient background
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, gameWidth, gameHeight);
        
        // Add animated background gradient
        const gradient = this.ctx.createRadialGradient(
            gameWidth / 2, gameHeight / 2, 0,
            gameWidth / 2, gameHeight / 2, Math.max(gameWidth, gameHeight)
        );
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0a0a0a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, gameWidth, gameHeight);
        
        // Render background particles
        this.renderBackgroundParticles();
        
        // Render scan lines effect
        this.renderScanLines();
          if (this.showingSubMenu) {
            this.renderSubMenu();
        } else {
            this.renderMainMenu();
        }
        
        // Render settings menu if open (render last so it's on top)
        if (window.settingsMenuUI && window.isSettingsMenuOpen && window.isSettingsMenuOpen()) {
            window.settingsMenuUI.render(this.ctx);
        }
    }
    
    renderMainMenu() {
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        
        this.ctx.save();
        
        // Main title
        const titleGlow = 0.8 + Math.sin(this.titlePulse) * 0.2;
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20 * titleGlow;
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 48px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('BYTESURGE', gameWidth / 2, gameHeight * 0.25);
        
        // Subtitle
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#888';
        this.ctx.font = '18px monospace';
        this.ctx.fillText('INFINITE LOOP PROTOCOL', gameWidth / 2, gameHeight * 0.32);
        
        // Menu items
        const menuStartY = gameHeight * 0.5;
        const menuSpacing = 60;        this.menuItems.forEach((item, index) => {
            const y = menuStartY + (index * menuSpacing);
            const isHovered = index === this.hoveredMenuItem;
            
            // Set font first to get accurate measurements
            const fontSize = isHovered ? 28 : 24;
            this.ctx.font = isHovered ? 'bold 28px monospace' : '24px monospace';
            
            // Measure actual text width
            const textMetrics = this.ctx.measureText(item.text);
            const textWidth = textMetrics.width;
            const textX = gameWidth / 2;
            const textY = y + 5;
            
            // Hover highlight with perfectly centered glow
            if (isHovered || item.glow > 0) {
                const glowAlpha = 0.2 + (item.glow * 0.3);
                const glowSize = 10 + (item.glow * 20);
                
                // Calculate glow box centered exactly on the text
                const glowBoxWidth = textWidth + 40;
                const glowBoxHeight = fontSize + 20;
                const glowBoxX = textX - (glowBoxWidth / 2);
                const glowBoxY = textY - fontSize + 5;
                
                // Outer glow perfectly centered on text
                this.ctx.shadowColor = '#00ffff';
                this.ctx.shadowBlur = glowSize;
                this.ctx.fillStyle = `rgba(0, 255, 255, ${glowAlpha})`;
                this.ctx.fillRect(glowBoxX, glowBoxY, glowBoxWidth, glowBoxHeight);
                this.ctx.shadowBlur = 0;
            }
            
            // Menu item text with enhanced glow when hovered
            const textGlowIntensity = 5 + (item.glow * 20);
            this.ctx.shadowColor = isHovered ? '#ffffff' : '#00ff88';
            this.ctx.shadowBlur = textGlowIntensity;
            this.ctx.fillStyle = isHovered ? '#ffffff' : '#00ff88';
            this.ctx.fillText(item.text, textX, textY);        });// Clear any shadow effects before rendering bottom text
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
        
        // Version info
        this.ctx.fillStyle = '#444';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('v1.0.0', gameWidth - 20, gameHeight - 20);
        
        this.ctx.restore();
    }
    
    renderSubMenu() {
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        
        this.ctx.save();
        
        // Dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, gameWidth, gameHeight);
        
        // Sub-menu content box
        const boxWidth = gameWidth * 0.7;
        const boxHeight = gameHeight * 0.6;
        const boxX = (gameWidth - boxWidth) / 2;
        const boxY = (gameHeight - boxHeight) / 2;
        
        // Box background
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // Content based on sub-menu type
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px monospace';
        this.ctx.textAlign = 'center';        if (this.showingSubMenu === 'options') {
            this.renderOptionsMenu(boxX, boxY, boxWidth, boxHeight);
        } else if (this.showingSubMenu === 'controls') {
            this.renderControlsMenu(boxX, boxY, boxWidth, boxHeight);
        } else if (this.showingSubMenu === 'credits') {
            this.renderCreditsMenu(boxX, boxY, boxWidth, boxHeight);
        } else if (this.showingSubMenu === 'about') {
            this.renderAboutMenu(boxX, boxY, boxWidth, boxHeight);
        }
        
        // Close instruction
        this.ctx.fillStyle = '#888';
        this.ctx.font = '16px monospace';
        this.ctx.fillText('Press ESC to return', gameWidth / 2, boxY + boxHeight + 30);
        
        this.ctx.restore();
    }
    
    renderControlsMenu(boxX, boxY, boxWidth, boxHeight) {
        const centerX = boxX + boxWidth / 2;
        let y = boxY + 50;
        
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 28px monospace';
        this.ctx.fillText('CONTROLS', centerX, y);
        
        y += 60;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '18px monospace';
        this.ctx.textAlign = 'left';
        
        const controls = [
            'SPACE / ARROW KEYS - Turn Drone',
            'H - Deploy Harvester',
            'P - Pause Game',
            'F - Toggle Fullscreen',
            'R - Reset Game',
            '',
            'OBJECTIVE:',
            '• Collect energy nodes',
            '• Deploy harvesters for passive energy',
            '• Avoid corruption zones',
            '• Survive as long as possible!'
        ];
        
        controls.forEach((control, index) => {
            if (control === '') {
                y += 20;
                return;
            }
            
            if (control.startsWith('OBJECTIVE:')) {
                this.ctx.fillStyle = '#00ff88';
                this.ctx.font = 'bold 18px monospace';
            } else if (control.startsWith('•')) {
                this.ctx.fillStyle = '#cccccc';
                this.ctx.font = '16px monospace';
            } else {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '18px monospace';
            }
            
            this.ctx.fillText(control, boxX + 40, y);
            y += 25;
        });
    }
    
    renderAboutMenu(boxX, boxY, boxWidth, boxHeight) {
        const centerX = boxX + boxWidth / 2;
        let y = boxY + 50;
        
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 28px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ABOUT', centerX, y);
        
        y += 60;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '18px monospace';
        
        const aboutText = [
            'ByteSurge: Infinite Loop Protocol',
            '',
            'A retro-style endless runner where you pilot',
            'a drone through an infinite digital landscape.',
            '',
            'Navigate through energy zones, collect power,',
            'deploy harvesters, and survive the corruption',
            'that threatens the digital realm.',
            '',
            'Developed by NanoShade Studios',
            '',
            'Built with HTML5 Canvas and JavaScript'
        ];
        
        aboutText.forEach(line => {
            if (line === '') {
                y += 20;
                return;
            }
            
            if (line.includes('ByteSurge') || line.includes('NanoShade Studios')) {
                this.ctx.fillStyle = '#00ff88';
                this.ctx.font = 'bold 18px monospace';
            } else {
                this.ctx.fillStyle = '#cccccc';
                this.ctx.font = '16px monospace';
            }
            
            this.ctx.fillText(line, centerX, y);
            y += 25;
        });
    }
      renderCreditsMenu(boxX, boxY, boxWidth, boxHeight) {
        const centerX = boxX + boxWidth / 2;
        let y = boxY + 50;
        
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 28px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('CREDITS', centerX, y);
        
        y += 60;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px monospace';
        this.ctx.fillText('Game Development', centerX, y);
        
        y += 40;
        
        // NanoShade credit
        this.ctx.fillStyle = '#00ff88';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.fillText('NanoShade', centerX, y);
        
        y += 30;
        
        // PixelPunk credit
        this.ctx.fillStyle = '#ff88ff';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.fillText('PixelPunk', centerX, y);
        
        y += 50;
        
        // Music section
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px monospace';
        this.ctx.fillText('Music', centerX, y);
        
        y += 40;
        
        // Music credits
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('Cyberpunk by jiglr', centerX, y);
        
        y += 20;
        this.ctx.fillStyle = '#cccccc';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('https://soundcloud.com/jiglrmusic', centerX, y);
        
        y += 25;
        this.ctx.fillText('Music promoted by https://www.free-stock-music.com', centerX, y);
        
        y += 20;
        this.ctx.fillText('Creative Commons / Attribution 3.0 Unported License (CC BY 3.0)', centerX, y);
        
        y += 20;
        this.ctx.fillText('https://creativecommons.org/licenses/by/3.0/deed.en_US', centerX, y);
        
        y += 40;
          // Thank you message
        this.ctx.fillStyle = '#cccccc';
        this.ctx.font = '16px monospace';
        this.ctx.fillText('Thank you for playing!', centerX, y);
    }

    renderOptionsMenu(boxX, boxY, boxWidth, boxHeight) {
        const centerX = boxX + boxWidth / 2;
        let y = boxY + 50;
        
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 28px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('OPTIONS', centerX, y);
        
        y += 80;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px monospace';
        
        // Create clickable option buttons
        const options = [
            { text: 'HELP & TUTORIAL', action: 'help' },
            { text: 'GAME SETTINGS', action: 'settings' },
            { text: 'CONTROLS', action: 'controls' },
            { text: 'FEEDBACK', action: 'feedback' }
        ];
        
        options.forEach((option, index) => {
            const isHovered = index === this.hoveredOptionIndex;
            
            // Button background
            if (isHovered) {
                this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
                this.ctx.fillRect(centerX - 150, y - 25, 300, 40);
                this.ctx.strokeStyle = '#00ffff';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(centerX - 150, y - 25, 300, 40);
            }
            
            // Button text
            this.ctx.fillStyle = isHovered ? '#00ffff' : '#ffffff';
            this.ctx.font = isHovered ? 'bold 20px monospace' : '20px monospace';
            
            if (isHovered) {
                this.ctx.shadowColor = '#00ffff';
                this.ctx.shadowBlur = 10;
            }
            
            this.ctx.fillText(option.text, centerX, y);
            this.ctx.shadowBlur = 0;
            
            y += 60;
        });
        
        // Store option bounds for click detection
        this.optionBounds = [];
        for (let i = 0; i < options.length; i++) {
            this.optionBounds.push({
                x: centerX - 150,
                y: boxY + 130 + (i * 60) - 25,
                width: 300,
                height: 40,
                action: options[i].action
            });
        }
    }

renderBackgroundParticles() {
        this.ctx.save();
        
        this.backgroundParticles.forEach(particle => {
            const alpha = particle.alpha * (0.5 + Math.sin(particle.phase) * 0.3);
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#00ffff';
            this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        });
        
        this.ctx.restore();
    }
    
    renderScanLines() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.05;
        this.ctx.fillStyle = '#ffffff';
        
        for (let y = 0; y < window.GAME_HEIGHT; y += 4) {
            this.ctx.fillRect(0, y, window.GAME_WIDTH, 1);
        }
        
        this.ctx.restore();    }
    
    getMenuItemBounds(index) {
        const gameWidth = window.GAME_WIDTH || 1200;
        const gameHeight = window.GAME_HEIGHT || 800;
        const menuStartY = gameHeight * 0.5;
        const menuSpacing = 60;
        const y = menuStartY + (index * menuSpacing);
        
        // Estimate text width (approximate)
        const text = this.menuItems[index].text;
        const fontSize = index === this.hoveredMenuItem ? 28 : 24;
        const charWidth = fontSize * 0.6; // Approximate character width for monospace
        const textWidth = text.length * charWidth;
        
        return {
            x: (gameWidth - textWidth) / 2,
            y: y - 20,
            width: textWidth,
            height: 40
        };
    }
      updateMousePosition(x, y) {
        this.mouseX = x;
        this.mouseY = y;
        
        // Handle settings menu mouse movement first if it's open
        if (window.settingsMenuUI && window.isSettingsMenuOpen && window.isSettingsMenuOpen()) {
            window.settingsMenuUI.updateMousePosition(x, y);
            return;
        }
          // Check which menu item is being hovered
        this.hoveredMenuItem = -1;
        this.hoveredOptionIndex = -1;
        
        if (!this.showingSubMenu) {
            for (let i = 0; i < this.menuItems.length; i++) {
                const bounds = this.getMenuItemBounds(i);
                if (x >= bounds.x && x <= bounds.x + bounds.width &&
                    y >= bounds.y && y <= bounds.y + bounds.height) {
                    this.hoveredMenuItem = i;
                    break;
                }
            }
        } else if (this.showingSubMenu === 'options' && this.optionBounds) {
            // Check which option is being hovered in options menu
            for (let i = 0; i < this.optionBounds.length; i++) {
                const bounds = this.optionBounds[i];
                if (x >= bounds.x && x <= bounds.x + bounds.width &&
                    y >= bounds.y && y <= bounds.y + bounds.height) {
                    this.hoveredOptionIndex = i;
                    break;
                }
            }
        }
    }    handleKeyDown(event) {
        // Handle settings menu input first if it's open
        if (window.settingsMenuUI && window.isSettingsMenuOpen && window.isSettingsMenuOpen()) {
            return window.settingsMenuUI.handleInput(event.code);
        }
        
        if (this.showingSubMenu) {
            if (event.code === 'Escape') {
                this.showingSubMenu = null;
                return true;
            }
            return true; // Consume input in sub-menu
        }
        
        switch (event.code) {
            case 'Escape':
                // Could add exit confirmation here
                return true;
        }
        
        return false;
    }    handleClick(x, y) {
        // Handle user interaction for audio (browsers require user interaction to play audio)
        if (window.audioSystem) {
            window.audioSystem.handleUserInteraction();
        }
        
        // Handle settings menu clicks first if it's open
        if (window.settingsMenuUI && window.isSettingsMenuOpen && window.isSettingsMenuOpen()) {
            return window.settingsMenuUI.handleMouseClick(x, y, 0); // Left click
        }
          if (this.showingSubMenu) {
            // Handle clicks in options submenu
            if (this.showingSubMenu === 'options' && this.optionBounds) {
                for (let i = 0; i < this.optionBounds.length; i++) {
                    const bounds = this.optionBounds[i];
                    if (x >= bounds.x && x <= bounds.x + bounds.width &&
                        y >= bounds.y && y <= bounds.y + bounds.height) {
                        this.handleOptionClick(bounds.action);
                        return true;
                    }
                }
            }
            // Close submenu if clicked outside
            this.showingSubMenu = null;
            return true;
        }
        
        // Check if click is on a menu item
        for (let i = 0; i < this.menuItems.length; i++) {
            const bounds = this.getMenuItemBounds(i);
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                return this.selectMenuItem(i);
            }
        }
        
        return false;
    }selectMenuItem(index = this.hoveredMenuItem) {
        if (index < 0 || index >= this.menuItems.length) return false;
        
        const selectedItem = this.menuItems[index];        switch (selectedItem.action) {
            case 'start':
                return 'start_game'; // Signal to start the game
                
            case 'leaderboard':
                // Show leaderboard
                if (window.authUI && window.authUI.showLeaderboard) {
                    window.authUI.showLeaderboard();
                } else if (window.authUI && window.authUI.showSignInMenu) {
                    // If not signed in, show sign-in prompt
                    window.authUI.showSignInMenu();
                }
                return true;
                
            case 'options':
                // Show options submenu
                this.showingSubMenu = 'options';
                return true;
                
            case 'credits':
                this.showingSubMenu = 'credits';
                return true;
                
            case 'about':
                this.showingSubMenu = 'about';
                return true;
        }        
        return true;
    }

    handleOptionClick(action) {
        switch (action) {
            case 'help':
                // Start tutorial
                if (window.tutorialSystem) {
                    window.tutorialSystem.start();
                }
                this.showingSubMenu = null; // Close options menu
                break;
                
            case 'settings':
                if (window.openSettingsMenu) {
                    window.openSettingsMenu();
                }
                this.showingSubMenu = null; // Close options menu
                break;
                
            case 'controls':
                // Switch to controls submenu
                this.showingSubMenu = 'controls';
                break;
                
            case 'feedback':
                // Open feedback form in a new tab/window
                window.open('https://forms.office.com/r/Gz5eXJSvJx', '_blank');
                this.showingSubMenu = null; // Close options menu
                break;
        }
    }
}

// Export for global access
window.HomeScreen = HomeScreen;
