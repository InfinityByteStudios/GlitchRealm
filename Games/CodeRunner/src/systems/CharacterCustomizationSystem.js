/**
 * Character Customization System - Handles sprite selection and character appearance
 */

export class CharacterCustomizationSystem {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        
        // Available character sprites
        this.availableSprites = [
            {
                id: 'player-sprite.png',
                name: 'Classic Player',
                path: './assets/player-sprite.png',
                category: 'default',
                unlocked: true,
                description: 'The original player sprite'
            },
            {
                id: 'Untitled design (1).png',
                name: 'Yellow Runner',
                path: './assets/Untitled design (1).png',
                category: 'free',
                unlocked: true,
                description: 'Cool aqua-themed runner'
            },
            {
                id: 'Untitled design (2).png',
                name: 'Red Runner',
                path: './assets/Untitled design (2).png',
                category: 'free',
                unlocked: true,
                description: 'Fiery red defender'
            },
            {
                id: 'Untitled design (3).png',
                name: 'Blue Runner',
                path: './assets/Untitled design (3).png',
                category: 'free',
                unlocked: true,
                description: 'Nature-inspired stealth runner'
            },
            {
                id: 'Untitled design (4).png',
                name: 'Green Runner',
                path: './assets/Untitled design (4).png',
                category: 'free',
                unlocked: true,
                description: 'Gleaming golden speedster'
            },
            {
                id: 'Untitled design (14).png',
                name: 'King Runner',
                path: './assets/Main Sprite/Untitled design (14).png',
                category: 'achievement',
                unlocked: false,
                description: 'Ultimate champion - unlocked by getting 100% achievements'
            },
            {
                id: 'sprite_0.png',
                name: 'Bathtub Lover',
                path: './assets/buyable cosmetics/sprite_0.png',
                category: 'premium',
                unlocked: false,
                description: 'A futuristic space explorer with blue and white armor'
            },
            {
                id: 'sprite_2.png',
                name: 'Rice Runner',
                path: './assets/buyable cosmetics/sprite_2.png',
                category: 'premium',
                unlocked: false,
                description: 'Yellow and black stealth operative'
            },
            {
                id: 'sprite_3.png',
                name: 'Mexican Man',
                path: './assets/buyable cosmetics/sprite_3.png',
                category: 'premium',
                unlocked: false,
                description: 'Dark ninja with orange accents'
            },
            {
                id: 'sprite_4.png',
                name: 'Bomb Runner',
                path: './assets/buyable cosmetics/sprite_4.png',
                category: 'premium',
                unlocked: false,
                description: 'Elite quantum combatant with advanced gear'
            },
            {
                id: 'sprite_5.png',
                name: 'Robber',
                path: './assets/buyable cosmetics/sprite_5.png',
                category: 'premium',
                unlocked: false,
                description: 'Green and black data realm defender'
            }
        ];
        
        // UI state
        this.selectedSpriteIndex = 0;
        this.scrollOffset = 0;
        this.previewSprites = new Map(); // Cache for sprite previews
        this.animationTime = 0;
        
        // Load current selection
        this.loadCurrentSelection();
        
        // Preload sprite images
        this.preloadSprites();
    }
    
    /**
     * Get available sprites array
     */
    getAvailableSprites() {
        return this.availableSprites;
    }

    /**
     * Load current sprite selection from profile manager
     */
    loadCurrentSelection() {
        let currentSprite = null;
        
        // Try ProfileManager first
        if (typeof window !== 'undefined' && window.profileManager) {
            currentSprite = window.profileManager.getSelectedSprite();
        } else {
            // Fallback: try localStorage
            try {
                currentSprite = localStorage.getItem('coderunner_selected_sprite');
            } catch (error) {
                console.warn('⚠️ Failed to load sprite selection from localStorage:', error);
            }
        }
        
        // Find the sprite in available sprites and select it
        if (currentSprite) {
            const index = this.availableSprites.findIndex(sprite => sprite.id === currentSprite);
            if (index !== -1) {
                this.selectedSpriteIndex = index;
                console.log(`🎭 Loaded current sprite selection: ${currentSprite} (index: ${index})`);
            }
        }
        
        // Load unlocked sprites from shop system and achievements
        if (this.game.shopSystem) {
            const ownedUpgrades = this.game.shopSystem.getOwnedUpgrades();
            this.availableSprites.forEach(sprite => {
                if (sprite.category === 'premium') {
                    // Map sprite IDs to shop upgrade IDs
                    const spriteToUpgradeMap = {
                        'sprite_0.png': 'sprite-cosmic',
                        'sprite_1.png': 'sprite-neon',
                        'sprite_2.png': 'sprite-shadow',
                        'sprite_3.png': 'sprite-flame',
                        'sprite_4.png': 'sprite-ice',
                        'sprite_5.png': 'sprite-electric'
                    };
                    
                    const upgradeId = spriteToUpgradeMap[sprite.id];
                    if (upgradeId) {
                        sprite.unlocked = ownedUpgrades.includes(upgradeId);
                    }
                } else if (sprite.category === 'achievement') {
                    // Check if all achievements are unlocked for achievement-based sprites
                    if (this.game.achievementSystem) {
                        const totalAchievements = Object.keys(this.game.achievementSystem.achievements).length;
                        const unlockedAchievements = this.game.achievementSystem.unlockedAchievements.size;
                        sprite.unlocked = (unlockedAchievements >= totalAchievements);
                        
                        console.log(`🏆 King Runner unlock check: ${unlockedAchievements}/${totalAchievements} achievements`);
                    }
                }
                // Free and default sprites are always unlocked
            });
        }
    }
    
    /**
     * Preload sprite images for smooth preview
     */
    preloadSprites() {
        this.availableSprites.forEach(spriteData => {
            if (!this.previewSprites.has(spriteData.id)) {
                const img = new Image();
                img.src = spriteData.path;
                this.previewSprites.set(spriteData.id, img);
            }
        });
    }
    
    /**
     * Update animation time
     */
    update(deltaTime) {
        this.animationTime += deltaTime;
    }
    
    /**
     * Render the character customization screen
     */
    render(ctx, canvas, hitAreas) {
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear hit areas
        hitAreas.length = 0;
        
        ctx.save();
        
        // Draw background
        this.drawBackground(ctx, width, height);
        
        // Draw title
        this.drawTitle(ctx, width);
        
        // Draw sprite grid
        this.drawSpriteGrid(ctx, width, height, hitAreas);
        
        // Draw controls
        this.drawControls(ctx, width, height, hitAreas);
        
        ctx.restore();
    }
    
    /**
     * Draw background with advanced visual effects
     */
    drawBackground(ctx, width, height) {
        const time = this.animationTime * 0.001;
        
        // Deep space gradient background
        const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        bgGradient.addColorStop(0, 'rgba(15, 20, 25, 0.98)');
        bgGradient.addColorStop(0.4, 'rgba(21, 32, 43, 0.96)');
        bgGradient.addColorStop(0.8, 'rgba(13, 17, 23, 0.98)');
        bgGradient.addColorStop(1, 'rgba(8, 12, 16, 0.99)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Animated neural network background pattern
        for (let i = 0; i < 15; i++) {
            const angle = time * 0.1 + i * 0.4;
            const x = width/2 + Math.cos(angle) * (120 + i * 12);
            const y = height/2 + Math.sin(angle * 0.7) * (80 + i * 8);
            const alpha = 0.02 + Math.sin(time * 2 + i) * 0.01;
            const size = 1 + Math.sin(time * 0.8 + i) * 0.3;
            
            ctx.fillStyle = `rgba(88, 166, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Connect nearby particles
            for (let j = i + 1; j < Math.min(i + 2, 15); j++) {
                const angle2 = time * 0.1 + j * 0.4;
                const x2 = width/2 + Math.cos(angle2) * (120 + j * 12);
                const y2 = height/2 + Math.sin(angle2 * 0.7) * (80 + j * 8);
                const distance = Math.sqrt((x2 - x) ** 2 + (y2 - y) ** 2);
                
                if (distance < 60) {
                    ctx.strokeStyle = `rgba(88, 166, 255, ${alpha * 0.3})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        }
        
        // Floating code symbols for theme
        const codeSymbols = ['{ }', '< >', '[ ]', '( )', '=', ';', '++', '--'];
        for (let i = 0; i < 8; i++) {
            const x = 50 + (i * (width - 100) / 7) + Math.sin(time + i) * 15;
            const y = 30 + Math.cos(time * 0.5 + i * 0.8) * 10;
            const alpha = 0.05 + Math.sin(time * 1.5 + i) * 0.02;
            
            ctx.fillStyle = `rgba(121, 192, 255, ${alpha})`;
            ctx.font = '12px "Consolas", "Monaco", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(codeSymbols[i % codeSymbols.length], x, y);
        }
    }
    
    /**
     * Draw enhanced title with effects
     */
    drawTitle(ctx, width) {
        const time = this.animationTime * 0.001;
        
        // Advanced header with multiple effects
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        
        // Text shadow/glow effect with multiple layers
        ctx.shadowColor = 'rgba(88, 166, 255, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(88, 166, 255, 0.3)';
        ctx.fillText('🎭 CHARACTER CUSTOMIZATION', width / 2, 60);
        
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(121, 192, 255, 0.7)';
        ctx.fillText('🎭 CHARACTER CUSTOMIZATION', width / 2, 60);
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f0f6fc';
        ctx.fillText('🎭 CHARACTER CUSTOMIZATION', width / 2, 60);
        
        // Subtitle with pulsing effect
        const pulseAlpha = 0.6 + Math.sin(time * 2) * 0.3;
        ctx.font = '16px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = `rgba(139, 148, 158, ${pulseAlpha})`;
        ctx.fillText('Choose your digital persona', width / 2, 85);
        
        // Decorative line under title
        const lineWidth = 300 + Math.sin(time * 1.5) * 20;
        const lineX = (width - lineWidth) / 2;
        const lineY = 95;
        
        const lineGradient = ctx.createLinearGradient(lineX, lineY, lineX + lineWidth, lineY);
        lineGradient.addColorStop(0, 'rgba(88, 166, 255, 0)');
        lineGradient.addColorStop(0.5, 'rgba(88, 166, 255, 0.8)');
        lineGradient.addColorStop(1, 'rgba(88, 166, 255, 0)');
        
        ctx.fillStyle = lineGradient;
        ctx.fillRect(lineX, lineY, lineWidth, 2);
    }
    
    /**
     * Draw modern sprite selection grid with card-based design
     */
    drawSpriteGrid(ctx, width, height, hitAreas) {
        const time = this.animationTime * 0.001;
        
        // Grid layout parameters
        const itemsPerRow = 3;
        const cardWidth = 200;
        const cardHeight = 180;
        const padding = 25;
        const startX = (width - (itemsPerRow * cardWidth + (itemsPerRow - 1) * padding)) / 2;
        const startY = 120;
        
        // Set up clipping area to prevent overlap with title and buttons
        ctx.save();
        const clipTop = startY - 10;
        const clipBottom = height - 140; // Increased to 140 to give more space for buttons
        ctx.beginPath();
        ctx.rect(0, clipTop, width, clipBottom - clipTop);
        ctx.clip();
        
        // Calculate visible range
        const scrollOffset = this.scrollOffset;
        const rows = Math.ceil(this.availableSprites.length / itemsPerRow);
        const maxVisibleRows = Math.ceil((clipBottom - clipTop) / (cardHeight + padding)); // Use clipped area
        const startRow = Math.floor(scrollOffset / (cardHeight + padding));
        const endRow = Math.min(startRow + maxVisibleRows + 1, rows);
        
        // Draw sprite cards
        for (let row = startRow; row < endRow; row++) {
            for (let col = 0; col < itemsPerRow; col++) {
                const index = row * itemsPerRow + col;
                if (index >= this.availableSprites.length) break;
                
                const sprite = this.availableSprites[index];
                const x = startX + col * (cardWidth + padding);
                const y = startY + row * (cardHeight + padding) - scrollOffset;
                
                // Skip if not visible within clipped area
                if (y + cardHeight < clipTop || y > clipBottom) continue;
                
                const isSelected = index === this.selectedSpriteIndex;
                const isUnlocked = sprite.unlocked;
                
                // Create enhanced hit area - but only if it's within the visible sprite area
                if (y >= startY && y + cardHeight <= clipBottom) {
                    const hitArea = {
                        x: x,
                        y: y,
                        width: cardWidth,
                        height: cardHeight,
                        action: 'selectSprite',
                        spriteIndex: index
                    };
                    hitAreas.push(hitArea);
                }
                
                // Card hover/animation effect
                const hoverOffset = Math.sin(time * 3 + index) * 1;
                const animatedY = y + (isSelected ? -3 : 0) + hoverOffset;
                
                // Enhanced card background with gradient and glow
                ctx.save();
                
                if (isSelected) {
                    // Selected card glow
                    ctx.shadowColor = 'rgba(88, 166, 255, 0.6)';
                    ctx.shadowBlur = 20;
                }
                
                // Card background gradient
                const cardGradient = ctx.createLinearGradient(x, animatedY, x, animatedY + cardHeight);
                if (isUnlocked) {
                    if (isSelected) {
                        cardGradient.addColorStop(0, 'rgba(88, 166, 255, 0.2)');
                        cardGradient.addColorStop(0.5, 'rgba(33, 38, 45, 0.9)');
                        cardGradient.addColorStop(1, 'rgba(21, 25, 30, 0.95)');
                    } else {
                        cardGradient.addColorStop(0, 'rgba(33, 38, 45, 0.8)');
                        cardGradient.addColorStop(1, 'rgba(21, 25, 30, 0.9)');
                    }
                } else {
                    cardGradient.addColorStop(0, 'rgba(33, 38, 45, 0.4)');
                    cardGradient.addColorStop(1, 'rgba(21, 25, 30, 0.6)');
                }
                
                ctx.fillStyle = cardGradient;
                this.drawRoundedRect(ctx, x, animatedY, cardWidth, cardHeight, 16);
                ctx.fill();
                
                // Enhanced card border
                ctx.shadowBlur = 0;
                ctx.strokeStyle = isSelected ? '#58A6FF' : (isUnlocked ? '#30363d' : '#21262d');
                ctx.lineWidth = isSelected ? 3 : 1.5;
                this.drawRoundedRect(ctx, x, animatedY, cardWidth, cardHeight, 16);
                ctx.stroke();
                
                // Sprite preview with enhanced styling
                const spriteImg = this.previewSprites.get(sprite.id);
                if (spriteImg && spriteImg.complete) {
                    const spriteSize = 80;
                    const spriteX = x + (cardWidth - spriteSize) / 2;
                    const spriteY = animatedY + 20;
                    
                    // Sprite background circle with glow
                    const circleRadius = spriteSize / 2 + 10;
                    const circleX = spriteX + spriteSize / 2;
                    const circleY = spriteY + spriteSize / 2;
                    
                    if (isUnlocked) {
                        ctx.fillStyle = isSelected ? 'rgba(88, 166, 255, 0.15)' : 'rgba(139, 148, 158, 0.1)';
                    } else {
                        ctx.fillStyle = 'rgba(139, 148, 158, 0.05)';
                    }
                    
                    ctx.beginPath();
                    ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw sprite with effects
                    if (!isUnlocked) {
                        ctx.globalAlpha = 0.3;
                    } else if (isSelected) {
                        // Add subtle scaling animation for selected sprite
                        const scale = 1 + Math.sin(time * 4 + index) * 0.05;
                        const scaledSize = spriteSize * scale;
                        const offsetX = (spriteSize - scaledSize) / 2;
                        const offsetY = (spriteSize - scaledSize) / 2;
                        ctx.drawImage(spriteImg, spriteX + offsetX, spriteY + offsetY, scaledSize, scaledSize);
                    } else {
                        ctx.drawImage(spriteImg, spriteX, spriteY, spriteSize, spriteSize);
                    }
                    ctx.globalAlpha = 1;
                }
                
                // Enhanced sprite name with modern typography
                const nameY = animatedY + 120;
                ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
                ctx.fillStyle = isUnlocked ? '#f0f6fc' : '#6e7681';
                ctx.textAlign = 'center';
                ctx.fillText(sprite.name, x + cardWidth / 2, nameY);
                
                // Enhanced category badge with color coding
                const categoryY = nameY + 20;
                ctx.font = '12px "Segoe UI", Arial, sans-serif';
                
                // Color-code categories
                let categoryColor = '#8b949e';
                let categoryText = sprite.category.toUpperCase();
                
                if (sprite.category === 'free') {
                    categoryColor = isUnlocked ? '#22c55e' : '#16a34a'; // Green for free
                    categoryText = '✨ FREE';
                } else if (sprite.category === 'default') {
                    categoryColor = isUnlocked ? '#3b82f6' : '#2563eb'; // Blue for default
                    categoryText = '🏠 DEFAULT';
                } else if (sprite.category === 'premium') {
                    categoryColor = isUnlocked ? '#f59e0b' : '#d97706'; // Amber for premium
                    categoryText = '💎 PREMIUM';
                } else if (sprite.category === 'achievement') {
                    categoryColor = isUnlocked ? '#8b5cf6' : '#7c3aed'; // Purple for achievement
                    categoryText = '🏆 ACHIEVEMENT';
                }
                
                ctx.fillStyle = categoryColor;
                ctx.fillText(categoryText, x + cardWidth / 2, categoryY);
                
                // Status indicators and effects
                if (!isUnlocked) {
                    // Lock overlay with enhanced styling
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    this.drawRoundedRect(ctx, x, animatedY, cardWidth, cardHeight, 16);
                    ctx.fill();
                    
                    // Lock icon with glow
                    ctx.shadowColor = 'rgba(248, 81, 73, 0.6)';
                    ctx.shadowBlur = 10;
                    ctx.font = '32px "Segoe UI Emoji", Arial, sans-serif';
                    ctx.fillStyle = '#f85149';
                    ctx.textAlign = 'center';
                    ctx.fillText('🔒', x + cardWidth / 2, animatedY + cardHeight / 2 + 10);
                    ctx.shadowBlur = 0;
                    
                    // "Locked" text
                    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
                    ctx.fillStyle = '#f85149';
                    ctx.fillText('LOCKED', x + cardWidth / 2, animatedY + cardHeight / 2 + 35);
                } else if (isSelected) {
                    // Selected indicator with animation
                    const checkSize = 24;
                    const checkX = x + cardWidth - checkSize - 10;
                    const checkY = animatedY + 10;
                    
                    // Check background with pulse
                    const pulseScale = 1 + Math.sin(time * 6) * 0.1;
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
                    ctx.beginPath();
                    ctx.arc(checkX + checkSize/2, checkY + checkSize/2, (checkSize/2) * pulseScale, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Check mark
                    ctx.font = `${14 * pulseScale}px "Segoe UI", Arial, sans-serif`;
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.fillText('✓', checkX + checkSize/2, checkY + checkSize/2 + 5);
                }
                
                ctx.restore();
            }
        }
        
        // Enhanced scroll indicators
        this.drawScrollIndicators(ctx, width, height, startY);
        
        // Restore clipping
        ctx.restore();
    }
    
    /**
     * Draw selected sprite preview
     */
    drawSpritePreview(ctx, width, height) {
        const previewArea = {
            x: width * 0.7,
            y: 120,
            width: width * 0.25,
            height: 200
        };
        
        // Draw preview background
        ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
        this.drawRoundedRect(ctx, previewArea.x, previewArea.y, previewArea.width, previewArea.height, 12);
        ctx.fill();
        
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, previewArea.x, previewArea.y, previewArea.width, previewArea.height, 12);
        ctx.stroke();
        
        // Draw preview label
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('Preview', previewArea.x + previewArea.width / 2, previewArea.y + 30);
        
        // Draw selected sprite
        const selectedSprite = this.availableSprites[this.selectedSpriteIndex];
        if (selectedSprite) {
            const spriteImg = this.previewSprites.get(selectedSprite.id);
            if (spriteImg && spriteImg.complete) {
                const spriteSize = 80;
                const spriteX = previewArea.x + (previewArea.width - spriteSize) / 2;
                const spriteY = previewArea.y + 60;
                
                // Add floating animation
                const floatOffset = Math.sin(this.animationTime * 0.003) * 5;
                
                if (!selectedSprite.unlocked) {
                    ctx.globalAlpha = 0.5;
                }
                
                ctx.drawImage(spriteImg, spriteX, spriteY + floatOffset, spriteSize, spriteSize);
                ctx.globalAlpha = 1;
            }
            
            // Draw sprite name
            ctx.fillStyle = selectedSprite.unlocked ? '#58a6ff' : '#6e7681';
            ctx.font = 'bold 14px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(selectedSprite.name, previewArea.x + previewArea.width / 2, previewArea.y + 170);
        }
    }
    
    /**
     * Draw control buttons
     */
    /**
     * Draw enhanced control buttons with modern styling
     */
    drawControls(ctx, width, height, hitAreas) {
        const time = this.animationTime * 0.001;
        const buttonY = height - 90;
        const buttonWidth = 160;
        const buttonHeight = 50;
        const buttonSpacing = 30;
        
        // Calculate button positions for center alignment
        const totalWidth = (buttonWidth * 2) + buttonSpacing;
        const startX = (width - totalWidth) / 2;
        
        // Get selected sprite info
        const selectedSprite = this.availableSprites[this.selectedSpriteIndex];
        const canApply = selectedSprite && selectedSprite.unlocked;
        
        // Apply button with enhanced styling
        const applyButton = {
            x: startX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            action: 'apply',
            enabled: canApply
        };
        hitAreas.push(applyButton);
        
        // Apply button animation and glow
        const applyHover = canApply ? Math.sin(time * 2) * 0.02 + 1 : 1;
        const applyY = buttonY - (canApply ? Math.sin(time * 4) * 1 : 0);
        
        ctx.save();
        
        if (canApply) {
            // Glow effect for enabled apply button
            ctx.shadowColor = 'rgba(34, 197, 94, 0.6)';
            ctx.shadowBlur = 15;
        }
        
        // Apply button background gradient
        const applyGradient = ctx.createLinearGradient(applyButton.x, applyY, applyButton.x, applyY + buttonHeight);
        if (canApply) {
            applyGradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)');
            applyGradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.8)');
            applyGradient.addColorStop(1, 'rgba(21, 128, 61, 0.9)');
        } else {
            applyGradient.addColorStop(0, 'rgba(75, 85, 99, 0.6)');
            applyGradient.addColorStop(1, 'rgba(55, 65, 81, 0.8)');
        }
        
        ctx.fillStyle = applyGradient;
        this.drawRoundedRect(ctx, applyButton.x, applyY, buttonWidth * applyHover, buttonHeight, 12);
        ctx.fill();
        
        // Apply button border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = canApply ? '#22c55e' : '#6b7280';
        ctx.lineWidth = canApply ? 2.5 : 1.5;
        this.drawRoundedRect(ctx, applyButton.x, applyY, buttonWidth * applyHover, buttonHeight, 12);
        ctx.stroke();
        
        // Apply button icon and text
        ctx.font = '18px "Segoe UI Emoji", Arial, sans-serif';
        ctx.fillStyle = canApply ? '#ffffff' : '#9ca3af';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', applyButton.x + 30, applyY + buttonHeight / 2);
        
        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.fillText('APPLY', applyButton.x + buttonWidth / 2 + 15, applyY + buttonHeight / 2);
        
        ctx.restore();
        
        // Back button with enhanced styling
        const backButton = {
            x: startX + buttonWidth + buttonSpacing,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight,
            action: 'back'
        };
        hitAreas.push(backButton);
        
        // Back button animation
        const backHover = 1 + Math.sin(time * 2.5) * 0.015;
        const backY = buttonY + Math.sin(time * 3) * 0.5;
        
        ctx.save();
        
        // Back button glow
        ctx.shadowColor = 'rgba(88, 166, 255, 0.4)';
        ctx.shadowBlur = 12;
        
        // Back button background gradient
        const backGradient = ctx.createLinearGradient(backButton.x, backY, backButton.x, backY + buttonHeight);
        backGradient.addColorStop(0, 'rgba(88, 166, 255, 0.15)');
        backGradient.addColorStop(0.5, 'rgba(33, 38, 45, 0.9)');
        backGradient.addColorStop(1, 'rgba(21, 25, 30, 0.95)');
        
        ctx.fillStyle = backGradient;
        this.drawRoundedRect(ctx, backButton.x, backY, buttonWidth * backHover, buttonHeight, 12);
        ctx.fill();
        
        // Back button border with animation
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#58A6FF';
        ctx.lineWidth = 2 + Math.sin(time * 4) * 0.5;
        this.drawRoundedRect(ctx, backButton.x, backY, buttonWidth * backHover, buttonHeight, 12);
        ctx.stroke();
        
        // Back button icon and text
        ctx.font = '16px "Segoe UI Emoji", Arial, sans-serif';
        ctx.fillStyle = '#58A6FF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('←', backButton.x + 25, backY + buttonHeight / 2);
        
        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.fillText('BACK', backButton.x + buttonWidth / 2 + 10, backY + buttonHeight / 2);
        
        ctx.restore();
        
        // Status text with enhanced styling
        if (selectedSprite) {
            const statusY = buttonY - 25;
            ctx.font = '14px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            
            if (selectedSprite.unlocked) {
                const pulseAlpha = 0.8 + Math.sin(time * 3) * 0.2;
                ctx.fillStyle = `rgba(34, 197, 94, ${pulseAlpha})`;
                ctx.fillText(`Selected: ${selectedSprite.name}`, width / 2, statusY);
            } else {
                const pulseAlpha = 0.6 + Math.sin(time * 2) * 0.2;
                ctx.fillStyle = `rgba(248, 81, 73, ${pulseAlpha})`;
                ctx.fillText(`🔒 "${selectedSprite.name}" is locked`, width / 2, statusY);
            }
        }
    }
    
    /**
     * Handle mouse clicks with updated card layout
     */
    handleClick(x, y) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // CHECK BUTTONS FIRST (before sprites to prevent overlap issues)
        const buttonY = height - 90;
        const buttonWidth = 160;
        const buttonHeight = 50;
        const buttonSpacing = 30;
        const totalWidth = (buttonWidth * 2) + buttonSpacing;
        const startButtonX = (width - totalWidth) / 2;
        
        const applyButton = {
            x: startButtonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // Check Apply button FIRST
        if (x >= applyButton.x && x <= applyButton.x + applyButton.width && 
            y >= applyButton.y && y <= applyButton.y + applyButton.height) {
            const selectedSprite = this.availableSprites[this.selectedSpriteIndex];
            
            if (selectedSprite && selectedSprite.unlocked) {
                return this.applySelectedSprite();
            }
            return 'apply_attempted';
        }
        
        // Check Back button
        const backButton = {
            x: startButtonX + buttonWidth + buttonSpacing,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        if (x >= backButton.x && x <= backButton.x + backButton.width && 
            y >= backButton.y && y <= backButton.y + backButton.height) {
            console.log('Back button clicked in character customization');
            // Navigate back to previous state
            if (this.game) {
                const backState = this.game.previousGameState || 'home';
                this.game.navigateToState(backState);
            }
            return 'back';
        }
        
        // Only check sprites if click is NOT in button area
        if (y < buttonY - 10) { // 10px buffer above buttons
            console.log('🎮 Checking sprite selection...');
            return this.handleSpriteClick(x, y, width, height);
        } else {
            console.log('🚫 Click missed Apply button but was in button area');
            return null;
        }
    }
    
    /**
     * Handle sprite selection clicks (separated for clarity)
     */
    handleSpriteClick(x, y, width, height) {
        
        // Recreate hit areas for sprite grid with new card layout
        const itemsPerRow = 3;
        const cardWidth = 200;
        const cardHeight = 180;
        const padding = 25;
        const startX = (width - (itemsPerRow * cardWidth + (itemsPerRow - 1) * padding)) / 2;
        const startY = 120;
        const scrollOffset = this.scrollOffset;
        
        // Check sprite selection clicks
        const rows = Math.ceil(this.availableSprites.length / itemsPerRow);
        const clipBottom = height - 140; // Same as drawing clip
        const maxVisibleRows = Math.ceil((clipBottom - 120) / (cardHeight + padding));
        const startRow = Math.floor(scrollOffset / (cardHeight + padding));
        const endRow = Math.min(startRow + maxVisibleRows + 1, rows);
        
        for (let row = startRow; row < endRow; row++) {
            for (let col = 0; col < itemsPerRow; col++) {
                const index = row * itemsPerRow + col;
                if (index >= this.availableSprites.length) break;
                
                const spriteX = startX + col * (cardWidth + padding);
                const spriteY = startY + row * (cardHeight + padding) - scrollOffset;
                
                // Skip if not visible within the sprite area (not overlapping with buttons)
                if (spriteY + cardHeight < startY || spriteY > clipBottom) continue;
                
                // Check if click is within this sprite's card area
                if (x >= spriteX && x <= spriteX + cardWidth && 
                    y >= spriteY && y <= spriteY + cardHeight && 
                    y <= clipBottom) { // Extra check to ensure we're not in button area
                    
                    const sprite = this.availableSprites[index];
                    if (sprite && sprite.unlocked) {
                        this.selectedSpriteIndex = index;
                        console.log(`Selected sprite: ${sprite.name}`);
                        return 'spriteSelected';
                    } else if (sprite) {
                        console.log(`Sprite "${sprite.name}" is locked`);
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Apply the selected sprite
     */
    applySelectedSprite() {
        const selectedSprite = this.availableSprites[this.selectedSpriteIndex];
        
        if (selectedSprite && selectedSprite.unlocked) {
            console.log(`🎭 Applying sprite: ${selectedSprite.name} (${selectedSprite.id})`);
            
            // Update profile manager if available
            if (typeof window !== 'undefined' && window.profileManager) {
                // Use the new setSelectedSprite method which handles cloud saving
                window.profileManager.setSelectedSprite(selectedSprite.id);
                
                // Refresh the sprite selector if available
                if (typeof window.profileManager.refreshSpriteSelector === 'function') {
                    window.profileManager.refreshSpriteSelector();
                }
                
                console.log(`✨ Applied character sprite via ProfileManager: ${selectedSprite.name}`);
            } else {
                // Fallback: save directly to localStorage
                try {
                    localStorage.setItem('coderunner_selected_sprite', selectedSprite.id);
                    console.log(`✨ Applied character sprite via localStorage: ${selectedSprite.name}`);
                } catch (error) {
                    console.warn('⚠️ Failed to save sprite selection:', error);
                }
            }
            
            // Update player sprite immediately if available
            if (this.game.player && this.game.player.loadSelectedSprite) {
                this.game.player.loadSelectedSprite();
                console.log('🎮 Player sprite updated immediately');
            }
            
            // Also update any future game instances by forcing a global refresh
            if (typeof window !== 'undefined' && window.game && window.game.player) {
                console.log('🔄 Force updating current game player sprite');
                window.game.player.loadSelectedSprite();
            }
            
            // Force trigger a visual update by changing the sprite directly
            if (this.game.player && this.game.player.changeSprite) {
                // Handle different sprite paths based on the sprite name
                let spritePath;
                if (selectedSprite.id.startsWith('original-run-sprite') || 
                    selectedSprite.id.startsWith('Untitled design (13)') || 
                    selectedSprite.id.startsWith('Untitled design (14)')) {
                    spritePath = `./assets/Main Sprite/${selectedSprite.id}`;
                } else if (selectedSprite.id.startsWith('sprite_')) {
                    spritePath = `./assets/buyable cosmetics/${selectedSprite.id}`;
                } else {
                    spritePath = `./assets/${selectedSprite.id}`;
                }
                
                console.log(`🎭 Force changing sprite to: ${spritePath}`);
                this.game.player.changeSprite(spritePath);
            }
            
            // Visual feedback
            if (this.game.audioSystem) {
                this.game.audioSystem.playSound('confirm', 0.3);
            }
            
            return 'applied';
        } else {
            console.log('❌ Cannot apply sprite - not selected or not unlocked');
            if (selectedSprite) {
                console.log(`Sprite details: ${selectedSprite.name}, unlocked: ${selectedSprite.unlocked}`);
            }
        }
        return null;
    }
    
    /**
     * Handle mouse wheel scrolling
     */
    handleWheel(deltaY) {
        // Calculate scroll limits based on new card layout
        const canvasHeight = this.canvas ? this.canvas.height : 800;
        const maxScrollOffset = this.getMaxScrollOffset(canvasHeight);
        
        // Apply scroll with smooth scrolling
        const scrollSpeed = 0.8; // Adjust this value to change scroll sensitivity
        this.scrollOffset = Math.max(0, Math.min(this.scrollOffset + deltaY * scrollSpeed, maxScrollOffset));
        
        console.log(`🎭 Scroll offset: ${this.scrollOffset.toFixed(0)}/${maxScrollOffset.toFixed(0)}`);
    }
    
    /**
     * Draw rounded rectangle helper
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
     * Reset animations when entering the screen
     */
    resetAnimations() {
        this.animationTime = 0;
        this.scrollOffset = 0;
        // Refresh unlock status when entering the character customization screen
        this.updateUnlockStatus();
    }
    
    /**
     * Get unlock status for sprites
     */
    updateUnlockStatus() {
        this.loadCurrentSelection();
    }
    
    /**
     * Draw enhanced scroll indicators
     */
    drawScrollIndicators(ctx, width, height, startY) {
        const time = this.animationTime * 0.001;
        const maxScrollOffset = this.getMaxScrollOffset(height);
        
        if (maxScrollOffset > 0) {
            const indicatorX = width - 35;
            const indicatorY = startY + 20;
            const indicatorHeight = height - startY - 180;
            
            // Animated scroll track with glow
            ctx.shadowColor = 'rgba(88, 166, 255, 0.3)';
            ctx.shadowBlur = 6;
            ctx.fillStyle = 'rgba(139, 148, 158, 0.25)';
            this.drawRoundedRect(ctx, indicatorX, indicatorY, 6, indicatorHeight, 3);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Animated scroll thumb
            const thumbHeight = Math.max(40, (indicatorHeight * 0.3));
            const thumbY = indicatorY + (this.scrollOffset / maxScrollOffset) * (indicatorHeight - thumbHeight);
            
            // Thumb with pulsing animation
            const thumbPulse = 1 + Math.sin(time * 3) * 0.1;
            ctx.shadowColor = 'rgba(88, 166, 255, 0.6)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(88, 166, 255, 0.8)';
            this.drawRoundedRect(ctx, indicatorX, thumbY, 6 * thumbPulse, thumbHeight, 3);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Enhanced scroll hints with animations
            if (this.scrollOffset > 0) {
                const arrowBounce = Math.sin(time * 4) * 2;
                ctx.font = '12px "Segoe UI", Arial, sans-serif';
                ctx.fillStyle = `rgba(139, 148, 158, ${0.8 + Math.sin(time * 2) * 0.2})`;
                ctx.textAlign = 'center';
                ctx.fillText('▲ More above', width / 2, startY + arrowBounce);
            }
            
            if (this.scrollOffset < maxScrollOffset) {
                const arrowBounce = -Math.sin(time * 4) * 2;
                ctx.font = '12px "Segoe UI", Arial, sans-serif';
                ctx.fillStyle = `rgba(139, 148, 158, ${0.8 + Math.sin(time * 2) * 0.2})`;
                ctx.textAlign = 'center';
                ctx.fillText('▼ More below', width / 2, height - 140 + arrowBounce);
            }
        }
    }

    /**
     * Calculate maximum scroll offset
     */
    getMaxScrollOffset(height) {
        const itemsPerRow = 3;
        const cardHeight = 180;
        const padding = 25;
        const startY = 120;
        
        const rows = Math.ceil(this.availableSprites.length / itemsPerRow);
        const totalContentHeight = rows * (cardHeight + padding);
        const visibleAreaHeight = height - startY - 130;
        
        return Math.max(0, totalContentHeight - visibleAreaHeight);
    }
    
    /**
     * Debug function to check King Runner unlock status
     */
    debugKingRunnerStatus() {
        if (!this.game.achievementSystem) {
            console.log('❌ Achievement system not available');
            return;
        }
        
        const totalAchievements = Object.keys(this.game.achievementSystem.achievements).length;
        const unlockedAchievements = this.game.achievementSystem.unlockedAchievements.size;
        const percentage = Math.round((unlockedAchievements / totalAchievements) * 100);
        
        const kingRunner = this.availableSprites.find(sprite => sprite.id === 'Untitled design (14).png');
        
        console.log('👑 KING RUNNER STATUS:');
        console.log(`🏆 Achievements: ${unlockedAchievements}/${totalAchievements} (${percentage}%)`);
        console.log(`🔓 King Runner Unlocked: ${kingRunner ? kingRunner.unlocked : 'NOT FOUND'}`);
        console.log(`📊 Required: 100% achievements (${totalAchievements}/${totalAchievements})`);
        
        if (unlockedAchievements >= totalAchievements) {
            console.log('🎉 KING RUNNER SHOULD BE UNLOCKED!');
        } else {
            const remaining = totalAchievements - unlockedAchievements;
            console.log(`⏳ Need ${remaining} more achievement${remaining !== 1 ? 's' : ''} to unlock King Runner`);
        }
        
        return {
            totalAchievements,
            unlockedAchievements,
            percentage,
            kingRunnerUnlocked: kingRunner ? kingRunner.unlocked : false,
            achievementsNeeded: Math.max(0, totalAchievements - unlockedAchievements)
        };
    }
}
