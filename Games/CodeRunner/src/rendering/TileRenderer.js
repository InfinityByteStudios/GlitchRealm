/**
 /**
 * Tile Renderer - Handles rendering of different tile types
 */

import { GAME_CONFIG, TILE_TYPES, COLORS } from '../utils/constants.js';

export class TileRenderer {
    constructor() {
        // Performance tracking
        this.lastUpdate = 0;
        this.frameCount = 0;
        
        // Animation caching for expensive operations
        this.animationCache = new Map();
        this.lastCacheClean = 0;
        
        // Pre-computed values for performance
        this.precomputedValues = {
            sawTeethCount: 8, // Reduced from 12
            particleCount: 4, // Reduced from 8
            maxCacheSize: 50
        };
        
        this.animationTime = 0;
        
        // Performance optimizations
        this.renderSkipFrames = 0; // Skip animation updates for non-critical tiles
        this.highPerformanceMode = false; // Enable for low-end devices
        this.tileTypeFrequency = new Map(); // Track frequency of tile types for optimization
        
        // Detail level settings
        this.detailLevel = 'medium'; // Default detail level
        this.enableShadows = true;
        this.enableGlow = true;
        this.enableTextures = true;
    }

    update(deltaTime) {
        this.frameCount++;
        this.lastUpdate = Date.now();
        
        // Clean animation cache every 5 seconds to prevent memory leaks
        if (this.lastUpdate - this.lastCacheClean > 5000) {
            this.cleanAnimationCache();
            this.lastCacheClean = this.lastUpdate;
        }
        
        this.animationTime += deltaTime;
    }/**
     * Draw a tile based on its type
     */    drawTile(ctx, tileType, screenX, screenY) {
        // Safety check for invalid coordinates
        if (!isFinite(screenX) || !isFinite(screenY)) {
            console.warn('TileRenderer.drawTile: Invalid screen coordinates', { screenX, screenY, tileType });
            return;
        }

        // Skip rendering if tile is completely off-screen
        if (screenX < -GAME_CONFIG.TILE_SIZE || screenX > ctx.canvas.width + GAME_CONFIG.TILE_SIZE ||
            screenY < -GAME_CONFIG.TILE_SIZE || screenY > ctx.canvas.height + GAME_CONFIG.TILE_SIZE) {
            return;
        }
        
        // Track tile type frequency for optimization
        this.tileTypeFrequency.set(tileType, (this.tileTypeFrequency.get(tileType) || 0) + 1);
        
        const time = this.animationTime * 0.001;
        
        switch (tileType) {
            case TILE_TYPES.FLOOR:
                this.drawFloorTile(ctx, screenX, screenY);
                break;
            case TILE_TYPES.PLATFORM:
                this.drawPlatformTile(ctx, screenX, screenY);
                break;
            case TILE_TYPES.SPIKE:
                this.drawSpikeTile(ctx, screenX, screenY, time);
                break;
            case TILE_TYPES.GLITCH:
                this.drawGlitchTile(ctx, screenX, screenY, time);
                break;
            case TILE_TYPES.DATA_PACKET:
                this.drawDataPacket(ctx, screenX, screenY, time);
                break;
            case TILE_TYPES.SAW:
                this.drawSawTile(ctx, screenX, screenY, time);
                break;
            case TILE_TYPES.LASER:
                this.drawLaserTile(ctx, screenX, screenY, time);
                break;
            case TILE_TYPES.CRUSHER:
                this.drawCrusherTile(ctx, screenX, screenY, time);
                break;
        }
    }
    
    /**
     * Draw floor tile
     */
    drawFloorTile(ctx, x, y) {
        // Main floor
        ctx.fillStyle = COLORS.FLOOR_MAIN;
        ctx.fillRect(x, y, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
        
        // Highlight
        ctx.fillStyle = COLORS.FLOOR_HIGHLIGHT;
        ctx.fillRect(x + 2, y + 2, GAME_CONFIG.TILE_SIZE - 4, 4);
        
        // Grid lines
        ctx.strokeStyle = COLORS.FLOOR_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
    }
    
    /**
     * Draw platform tile
     */
    drawPlatformTile(ctx, x, y) {
        // Platform base
        ctx.fillStyle = COLORS.PLATFORM_BASE;
        ctx.fillRect(x, y, GAME_CONFIG.TILE_SIZE, 6);
        
        // Platform highlight
        ctx.fillStyle = COLORS.PLATFORM_HIGHLIGHT;
        ctx.fillRect(x + 2, y + 2, GAME_CONFIG.TILE_SIZE - 4, 2);
        
        // Platform details - small rivets
        ctx.fillStyle = COLORS.PLATFORM_DETAILS;
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(x + 4 + i * 8, y + 4, 2, 2);
        }
        
        // Visual indicator for jump-through platform
        ctx.fillStyle = COLORS.PLATFORM_INDICATOR;
        ctx.fillRect(x + 2, y + 6, 2, 2);
        ctx.fillRect(x + GAME_CONFIG.TILE_SIZE - 4, y + 6, 2, 2);
    }    /**
     * Draw spike tile - optimized design
     */    drawSpikeTile(ctx, x, y, time) {
        // Safety check for invalid coordinates
        if (!isFinite(x) || !isFinite(y) || !isFinite(time)) {
            console.warn('TileRenderer.drawSpikeTile: Invalid coordinates', { x, y, time });
            return;
        }

        // Render differently based on detail level
        switch (this.detailLevel) {
            case 'low':
                this.drawBasicSpike(ctx, x, y);
                break;
            case 'medium':
                this.drawMediumSpike(ctx, x, y, time);
                break;
            case 'high':
                this.drawDetailedSpike(ctx, x, y, time);
                break;
        }
    }

    /**
     * Draw basic spike for low quality
     */
    drawBasicSpike(ctx, x, y) {
        // Simple red triangles
        ctx.fillStyle = '#ff0000';
        
        for (let i = 0; i < 3; i++) {
            const spikeX = x + 4 + i * 8;
            const spikeHeight = 16;
            const spikeTop = y + GAME_CONFIG.TILE_SIZE - 8 - spikeHeight;
            
            ctx.beginPath();
            ctx.moveTo(spikeX + 4, spikeTop);
            ctx.lineTo(spikeX + 8, y + GAME_CONFIG.TILE_SIZE - 8);
            ctx.lineTo(spikeX, y + GAME_CONFIG.TILE_SIZE - 8);
            ctx.closePath();
            ctx.fill();
        }
        
        // Simple base
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y + GAME_CONFIG.TILE_SIZE - 8, GAME_CONFIG.TILE_SIZE, 8);
    }

    /**
     * Draw medium quality spike
     */
    drawMediumSpike(ctx, x, y, time) {
        const fastTime = time * 0.1;
        const pulse = 0.7 + Math.sin(fastTime * 6) * 0.3;
        
        // Base platform with warning stripes
        ctx.fillStyle = `rgba(60, 60, 60, ${pulse})`;
        ctx.fillRect(x, y + GAME_CONFIG.TILE_SIZE - 8, GAME_CONFIG.TILE_SIZE, 8);
        
        // Warning stripes
        ctx.fillStyle = `rgba(255, 193, 7, ${pulse})`;
        for (let i = 0; i < 2; i++) {
            const stripeX = x + 8 + i * 12;
            ctx.fillRect(stripeX, y + GAME_CONFIG.TILE_SIZE - 6, 6, 2);
        }
        
        // Spikes with simple glow
        if (this.enableGlow) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
        }
        
        for (let i = 0; i < 4; i++) {
            const spikeX = x + 3 + i * 6;
            const spikeHeight = 18 + Math.sin(fastTime * 4 + i) * 3;
            const spikeTop = y + GAME_CONFIG.TILE_SIZE - 8 - spikeHeight;
            
            const gradient = ctx.createLinearGradient(spikeX, spikeTop, spikeX, y + GAME_CONFIG.TILE_SIZE - 8);
            gradient.addColorStop(0, `rgba(255, 50, 50, ${pulse})`);
            gradient.addColorStop(1, `rgba(150, 0, 0, ${pulse})`);
            ctx.fillStyle = gradient;
            
            ctx.beginPath();
            ctx.moveTo(spikeX + 3, spikeTop);
            ctx.lineTo(spikeX + 6, y + GAME_CONFIG.TILE_SIZE - 8);
            ctx.lineTo(spikeX, y + GAME_CONFIG.TILE_SIZE - 8);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
    }

    /**
     * Draw detailed spike for high quality
     */
    drawDetailedSpike(ctx, x, y, time) {
        const fastTime = time * 0.1;
        const pulse = 0.7 + Math.sin(fastTime * 6) * 0.3;
        const dangerGlow = 0.6 + Math.sin(fastTime * 8) * 0.4;
        
        // Enhanced base platform with depth
        if (this.enableShadows) {
            // Drop shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x + 2, y + GAME_CONFIG.TILE_SIZE - 6, GAME_CONFIG.TILE_SIZE - 2, 8);
        }
        
        // Main base platform
        const baseGradient = ctx.createLinearGradient(x, y + GAME_CONFIG.TILE_SIZE - 8, x, y + GAME_CONFIG.TILE_SIZE);
        baseGradient.addColorStop(0, `rgba(80, 80, 90, ${pulse})`);
        baseGradient.addColorStop(1, `rgba(40, 40, 50, ${pulse})`);
        ctx.fillStyle = baseGradient;
        ctx.fillRect(x, y + GAME_CONFIG.TILE_SIZE - 8, GAME_CONFIG.TILE_SIZE, 8);
        
        // Detailed warning patterns
        ctx.fillStyle = `rgba(255, 193, 7, ${pulse})`;
        for (let i = 0; i < 4; i++) {
            const stripeX = x + 2 + i * 7;
            ctx.fillRect(stripeX, y + GAME_CONFIG.TILE_SIZE - 7, 4, 1);
            ctx.fillRect(stripeX + 2, y + GAME_CONFIG.TILE_SIZE - 5, 2, 1);
        }
        
        // Rivets and details
        ctx.fillStyle = `rgba(200, 200, 200, ${pulse})`;
        for (let i = 0; i < 3; i++) {
            const rivetX = x + 6 + i * 10;
            ctx.beginPath();
            ctx.arc(rivetX, y + GAME_CONFIG.TILE_SIZE - 4, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Complex spike array with individual characteristics
        const spikeConfigs = [
            { x: 2, height: 18, width: 5, style: 'sharp' },
            { x: 8, height: 22, width: 6, style: 'serrated' },
            { x: 15, height: 20, width: 5, style: 'twisted' },
            { x: 21, height: 19, width: 5, style: 'sharp' },
            { x: 27, height: 16, width: 4, style: 'needle' }
        ];
        
        spikeConfigs.forEach((spike, index) => {
            const spikeX = x + spike.x;
            const heightVariation = Math.sin(fastTime * 4 + index * 2) * 3;
            const spikeHeight = spike.height + heightVariation;
            const spikeTop = y + GAME_CONFIG.TILE_SIZE - 8 - spikeHeight;
            
            // Enhanced glow effect
            if (this.enableGlow) {
                ctx.shadowBlur = 6 + Math.sin(fastTime * 8 + index) * 3;
                ctx.shadowColor = `rgba(255, ${50 + index * 20}, 0, ${dangerGlow})`;
            }
            
            // Detailed spike gradient
            const spikeGradient = ctx.createLinearGradient(spikeX, spikeTop, spikeX, y + GAME_CONFIG.TILE_SIZE - 8);
            spikeGradient.addColorStop(0, `rgba(255, 255, 255, ${pulse})`);
            spikeGradient.addColorStop(0.2, `rgba(255, 100, 100, ${pulse})`);
            spikeGradient.addColorStop(0.7, `rgba(200, 0, 0, ${pulse})`);
            spikeGradient.addColorStop(1, `rgba(100, 0, 0, ${pulse})`);
            ctx.fillStyle = spikeGradient;
            
            // Draw spike based on style
            ctx.beginPath();
            switch (spike.style) {
                case 'serrated':
                    // Jagged edges
                    ctx.moveTo(spikeX + spike.width / 2, spikeTop);
                    for (let j = 0; j < 4; j++) {
                        const edgeY = spikeTop + (spikeHeight / 4) * (j + 1);
                        const offset = (j % 2) * 2 - 1;
                        ctx.lineTo(spikeX + spike.width / 2 + offset, edgeY);
                    }
                    ctx.lineTo(spikeX, y + GAME_CONFIG.TILE_SIZE - 8);
                    ctx.closePath();
                    break;
                    
                case 'twisted':
                    // Spiral effect
                    for (let t = 0; t <= 1; t += 0.1) {
                        const twist = Math.sin(t * Math.PI * 3 + fastTime * 6) * 2;
                        const currentY = spikeTop + t * spikeHeight;
                        const currentX = spikeX + spike.width / 2 + twist;
                        if (t === 0) ctx.moveTo(currentX, currentY);
                        else ctx.lineTo(currentX, currentY);
                    }
                    ctx.lineTo(spikeX, y + GAME_CONFIG.TILE_SIZE - 8);
                    ctx.closePath();
                    break;
                    
                case 'needle':
                    // Ultra sharp thin spike
                    ctx.moveTo(spikeX + spike.width / 2, spikeTop);
                    ctx.lineTo(spikeX + spike.width, y + GAME_CONFIG.TILE_SIZE - 8);
                    ctx.lineTo(spikeX, y + GAME_CONFIG.TILE_SIZE - 8);
                    ctx.closePath();
                    break;
                    
                default: // sharp
                    ctx.moveTo(spikeX + spike.width / 2, spikeTop);
                    ctx.lineTo(spikeX + spike.width, y + GAME_CONFIG.TILE_SIZE - 8);
                    ctx.lineTo(spikeX, y + GAME_CONFIG.TILE_SIZE - 8);
                    ctx.closePath();
                    break;
            }
            ctx.fill();
            
            // Metallic highlights
            ctx.strokeStyle = `rgba(255, 255, 255, ${dangerGlow * 0.8})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(spikeX, y + GAME_CONFIG.TILE_SIZE - 8);
            ctx.lineTo(spikeX + spike.width / 2, spikeTop);
            ctx.stroke();
            
            // Deadly tip glow
            ctx.fillStyle = `rgba(255, 255, 255, ${dangerGlow})`;
            ctx.beginPath();
            ctx.arc(spikeX + spike.width / 2, spikeTop, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Blood effect for extra detail
            if (Math.sin(fastTime * 3 + index * 2) > 0.5) {
                ctx.fillStyle = `rgba(139, 0, 0, ${pulse * 0.6})`;
                const bloodY = spikeTop + spikeHeight * 0.7 + Math.sin(fastTime * 6 + index) * 2;
                ctx.beginPath();
                ctx.arc(spikeX + spike.width / 2, bloodY, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Complex danger zone with animated warning field
        if (this.enableGlow) {
            ctx.shadowBlur = 12 * dangerGlow;
            ctx.shadowColor = `rgba(255, 0, 0, ${dangerGlow})`;
            
            // Pulsing danger field
            ctx.strokeStyle = `rgba(255, 0, 0, ${dangerGlow * 0.4})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.lineDashOffset = fastTime * 20;
            ctx.strokeRect(x - 2, y + GAME_CONFIG.TILE_SIZE - 30, GAME_CONFIG.TILE_SIZE + 4, 30);
            ctx.setLineDash([]);
        }
        
        // Reset effects
        ctx.shadowBlur = 0;
    }
      /**
     * Draw glitch tile
     */
    drawGlitchTile(ctx, x, y, time) {
        // Use faster linear approximation for glitch effect
        const glitch = 0.7 + (((time * 0.8) % 1) - 0.5) * 0.6;
        
        // Glitch block
        ctx.fillStyle = COLORS.GLITCH_BASE.replace('{alpha}', glitch);
        ctx.fillRect(x, y, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
        
        // Glitch pattern
        ctx.fillStyle = COLORS.GLITCH_PATTERN.replace('{alpha}', glitch);
        const offset = Math.floor(time * 10) % 4;
        for (let i = 0; i < 4; i++) {
            const lineY = y + 4 + i * 6 + offset;
            ctx.fillRect(x + 2, lineY, GAME_CONFIG.TILE_SIZE - 4, 2);
        }
          // Digital noise
        if (Math.random() < 0.1) {
            ctx.fillStyle = COLORS.GLITCH_NOISE.replace('{alpha}', glitch);
            ctx.fillRect(
                x + Math.random() * GAME_CONFIG.TILE_SIZE, 
                y + Math.random() * GAME_CONFIG.TILE_SIZE, 
                4, 4
            );
        }
    }

    /**
     * Draw data packet collectible
     */    drawDataPacket(ctx, x, y, time) {
        const centerX = x + GAME_CONFIG.TILE_SIZE / 2;
        const centerY = y + GAME_CONFIG.TILE_SIZE / 2;
        // Use simpler floating animation
        const floatOffset = ((time * 0.3) % 1 - 0.5) * 6;
        const currentY = centerY + floatOffset;
        
        // Normal data packet - green/cyan
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 6;
        
        // Draw main packet (diamond shape)
        ctx.save();
        ctx.translate(centerX, currentY);
        ctx.rotate(time * 2);
        
        // Use simpler size pulsing
        const size = 8 + ((time * 0.4) % 1 - 0.5) * 4;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.closePath();
        ctx.fill();
        
        // Inner glow
        ctx.fillStyle = '#34d399';
        const innerSize = size * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -innerSize);
        ctx.lineTo(innerSize, 0);
        ctx.lineTo(0, innerSize);
        ctx.lineTo(-innerSize, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        ctx.shadowBlur = 0;
    }    /**
     * Draw a rotating saw blade with enhanced cyberpunk industrial design
     */    drawSawTile(ctx, x, y, time) {
        // DEBUG: Log saw rendering details periodically
        if (Math.floor(time) !== Math.floor(time - 0.016)) { // Log roughly once per second
           
        }
        
        const centerX = x + GAME_CONFIG.TILE_SIZE / 2;
        const centerY = y + GAME_CONFIG.TILE_SIZE / 2;
        const radius = GAME_CONFIG.TILE_SIZE * 0.4;
        const rotationSpeed = GAME_CONFIG.SAW_ROTATION_SPEED;
        const rotation = time * rotationSpeed * Math.PI * 2;
          // DEBUG: Log rotation calculation periodically
        if (Math.floor(time) !== Math.floor(time - 0.016)) {
            const degrees = (rotation * 180 / Math.PI) % 360;
            
        }
        
        
        
        // Enhanced danger warning glow with pulsing effect
        const pulseIntensity = Math.sin(time * 6) * 0.3 + 0.7;
        ctx.shadowColor = `rgba(239, 68, 68, ${pulseIntensity * 0.8})`;
        ctx.shadowBlur = 15 * pulseIntensity;
        
        // Draw outer warning ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulseIntensity * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw main saw disc with metallic gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, '#4a5568'); // Darker center
        gradient.addColorStop(0.7, '#2d3748'); // Main body
        gradient.addColorStop(1, '#1a202c'); // Darker edges
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add circular cutting lines for industrial look
        for (let i = 0; i < 3; i++) {
            const lineRadius = radius * (0.3 + i * 0.2);
            ctx.beginPath();
            ctx.arc(centerX, centerY, lineRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(226, 232, 240, ${0.3 - i * 0.1})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        
        // Draw enhanced saw teeth with more menacing design
        const teethCount = this.precomputedValues.sawTeethCount; // More teeth for a more dangerous look
        for (let i = 0; i < teethCount; i++) {
            const angle = (i / teethCount) * Math.PI * 2;
            
            ctx.save();
            ctx.rotate(angle);
            
            // Main tooth body
            ctx.beginPath();
            ctx.moveTo(radius - 3, 0);
            ctx.lineTo(radius + 8, -3);
            ctx.lineTo(radius + 10, 0); // Sharp tip
            ctx.lineTo(radius + 8, 3);
            ctx.closePath();
            
            // Tooth gradient for metallic effect
            const toothGradient = ctx.createLinearGradient(radius - 3, -3, radius + 10, 3);
            toothGradient.addColorStop(0, '#e2e8f0');
            toothGradient.addColorStop(0.5, '#cbd5e0');
            toothGradient.addColorStop(1, '#a0aec0');
            
            ctx.fillStyle = toothGradient;
            ctx.fill();
            
            // Add sharp edge highlight
            ctx.beginPath();
            ctx.moveTo(radius + 8, -1);
            ctx.lineTo(radius + 10, 0);
            ctx.lineTo(radius + 8, 1);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Blood-red danger tip
            ctx.beginPath();
            ctx.arc(radius + 9, 0, 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(239, 68, 68, ${pulseIntensity})`;
            ctx.fill();
            
            ctx.restore();
        }
        
        ctx.restore();
        
        // Draw center hub with bolts
        const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.3);
        centerGradient.addColorStop(0, '#4a5568');
        centerGradient.addColorStop(1, '#2d3748');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = centerGradient;
        ctx.fill();
        
        // Add bolts around center hub
        for (let i = 0; i < 6; i++) {
            const boltAngle = (i / 6) * Math.PI * 2;
            const boltX = centerX + Math.cos(boltAngle) * radius * 0.2;
            const boltY = centerY + Math.sin(boltAngle) * radius * 0.2;
            
            ctx.beginPath();
            ctx.arc(boltX, boltY, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#718096';
            ctx.fill();
            
            // Bolt highlight
            ctx.beginPath();
            ctx.arc(boltX - 0.5, boltY - 0.5, 0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(226, 232, 240, 0.6)';
            ctx.fill();
        }
        
        // Central mounting point
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#1a202c';
        ctx.fill();
        
        // Central highlight
        ctx.beginPath();
        ctx.arc(centerX - 1, centerY - 1, 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(226, 232, 240, 0.4)';
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
    }
    
    /**
     * Draw a laser beam that fires periodically
     */
    drawLaserTile(ctx, x, y, time) {
        
        
        const centerX = x + GAME_CONFIG.TILE_SIZE / 2;
        const centerY = y + GAME_CONFIG.TILE_SIZE / 2;
        const laserInterval = GAME_CONFIG.LASER_INTERVAL;
        const laserDuration = 1000; // 1 second beam duration
        
        // Calculate laser state
        const cycleTime = time * 1000 % laserInterval;
        const isActive = cycleTime < laserDuration;
        const warningPhase = !isActive && cycleTime > laserInterval - 1000;
        
        
        
        // Draw laser source
        ctx.beginPath();
        ctx.arc(centerX, centerY, GAME_CONFIG.TILE_SIZE * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.LASER_SOURCE;
        ctx.fill();
        
        // Draw warning indicator
        if (warningPhase) {
            const warningPulse = Math.sin((time * 1000 % 500) / 500 * Math.PI) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, GAME_CONFIG.TILE_SIZE * 0.3, 0, Math.PI * 2);
            ctx.strokeStyle = COLORS.LASER_WARNING.replace('{alpha}', warningPulse);
            ctx.lineWidth = 3;
            ctx.stroke();
            
        }
          // Draw active laser beam - With direction detection
        if (isActive) {
            
            this.drawLaserBeamInDirection(ctx, x, y, centerX, centerY, time, 'right');        }
    }
    
    /**
     * Draw a crushing hazard that moves up and down
     */
    drawCrusherTile(ctx, x, y, time) {
        const centerX = x + GAME_CONFIG.TILE_SIZE / 2;
        const cycleTime = GAME_CONFIG.CRUSHER_CYCLE_TIME;
        const crushDistance = GAME_CONFIG.TILE_SIZE * 1.5;
        
        // Calculate crusher position in its cycle
        const cycle = (time * 1000) % cycleTime;
        const normalizedCycle = cycle / cycleTime;
        
        // Position adjustment for smooth movement with pause at top
        let position;
        if (normalizedCycle < 0.4) {
            // Top position (waiting)
            position = 0;
        } else if (normalizedCycle < 0.5) {
            // Coming down fast
            position = (normalizedCycle - 0.4) * 10 * crushDistance;
        } else if (normalizedCycle < 0.7) {
            // Bottom position (crushing)
            position = crushDistance;
        } else {
            // Moving back up slowly
            position = crushDistance * (1 - (normalizedCycle - 0.7) / 0.3);
        }
        
        // Warning stripes on ceiling
        ctx.fillStyle = COLORS.CRUSHER_WARNING;
        for (let i = 0; i < 4; i++) {
            if (i % 2 === 0) {
                ctx.fillRect(x + i * 8, y, 8, 4);
            }
        }
        
        // Draw chain
        ctx.beginPath();
        ctx.rect(centerX - 1, y + 4, 2, position - 4);
        ctx.fillStyle = '#8B8682';
        ctx.fill();
        
        // Draw crusher body
        const crusherWidth = GAME_CONFIG.TILE_SIZE * 0.8;
        const crusherHeight = GAME_CONFIG.TILE_SIZE * 0.4;
        
        ctx.beginPath();
        ctx.rect(
            centerX - crusherWidth / 2,
            y + position,
            crusherWidth,
            crusherHeight
        );
        ctx.fillStyle = COLORS.CRUSHER_BODY;
        ctx.fill();
        
        // Draw crusher details
        ctx.beginPath();
        ctx.rect(
            centerX - crusherWidth / 2 + 2,
            y + position + 2,
            crusherWidth - 4,
            4
        );
        ctx.fillStyle = COLORS.CRUSHER_HIGHLIGHT;
        ctx.fill();
        
        // Add spikes at the bottom
        const spikeCount = 4;
        const spikeWidth = crusherWidth / spikeCount;
        
        for (let i = 0; i < spikeCount; i++) {
            ctx.beginPath();
            ctx.moveTo(centerX - crusherWidth / 2 + i * spikeWidth, y + position + crusherHeight);
            ctx.lineTo(centerX - crusherWidth / 2 + (i + 0.5) * spikeWidth, y + position + crusherHeight + 6);
            ctx.lineTo(centerX - crusherWidth / 2 + (i + 1) * spikeWidth, y + position + crusherHeight);
            ctx.fillStyle = COLORS.CRUSHER_WARNING;
            ctx.fill();
        }
        
        // Draw warning light when about to crush
        if (normalizedCycle > 0.3 && normalizedCycle < 0.5) {
            const warningIntensity = Math.sin(time * 20) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(centerX, y + position + crusherHeight / 2, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 0, ${warningIntensity})`;
            ctx.fill();
        }
    }
  
    /**
     * Draw a laser beam in the specified direction
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position of the laser source
     * @param {number} y - Y position of the laser source
     * @param {number} centerX - Center X of the laser source
     * @param {number} centerY - Center Y of the laser source
     * @param {number} time - Animation time
     * @param {string} direction - Direction of the beam: 'left' or 'right'
     */
    drawLaserBeamInDirection(ctx, x, y, centerX, centerY, time, direction = 'right') {
        // Calculate beam properties
        const intensity = Math.sin(time * 10) * 0.2 + 0.8;
        const beamLength = GAME_CONFIG.TILE_SIZE * 3; // Default beam length (3 tiles)
        
        // Set beam dimensions and position based on direction
        let beamX, beamWidth;
        
        if (direction === 'left') {
            // Beam extends to the left
            beamX = x - beamLength;
            beamWidth = beamLength;
        } else {
            // Beam extends to the right (default)
            beamX = x + GAME_CONFIG.TILE_SIZE; // Start from the right edge of the laser tile
            beamWidth = beamLength;
        }
        
        // Draw the main beam
        ctx.beginPath();
        ctx.rect(beamX, centerY - 2, beamWidth, 4);
        ctx.fillStyle = COLORS.LASER_BEAM.replace('{alpha}', intensity);
        ctx.fill();
        
        // Add laser glow effect
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.rect(beamX, centerY - 1, beamWidth, 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw beam impact particles at end of beam for visual effect
        const particleX = direction === 'left' ? beamX : beamX + beamWidth;
        this.drawLaserImpactParticles(ctx, particleX, centerY, time);
    }
    
    /**
     * Draw particles at laser beam impact point
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position of impact
     * @param {number} y - Y position of impact
     * @param {number} time - Animation time
     */
    drawLaserImpactParticles(ctx, x, y, time) {
        const particleCount = this.precomputedValues.particleCount; // Reduced particle count for performance
        const maxRadius = 3;
        
        ctx.save();
        for (let i = 0; i < particleCount; i++) {
            const angle = (time * 5 + i * Math.PI * 2 / particleCount) % (Math.PI * 2);
            const distance = Math.sin(time * 8 + i) * 2 + 2;
            const radius = Math.sin(time * 6 + i * 2) * 1 + 1;
            
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(particleX, particleY, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
        }
        ctx.restore();
    }
    
    /**
     * Clean old animation cache entries
     */
    cleanAnimationCache() {
        if (this.animationCache.size > this.precomputedValues.maxCacheSize) {
            // Remove oldest entries
            const entries = Array.from(this.animationCache.entries());
            const toRemove = entries.slice(0, entries.length - this.precomputedValues.maxCacheSize);
            toRemove.forEach(([key]) => this.animationCache.delete(key));
        }
    }

    /**
     * Get cached animation value or compute and cache it
     */
    getCachedAnimation(key, computeFn) {
        if (!this.animationCache.has(key)) {
            this.animationCache.set(key, computeFn());
        }
        return this.animationCache.get(key);
    }

    /**
     * Enable high performance mode for low-end devices
     */
    setHighPerformanceMode(enabled) {
        this.highPerformanceMode = enabled;
        if (enabled) {
            this.precomputedValues.sawTeethCount = 6; // Further reduce detail
            this.precomputedValues.particleCount = 2; // Minimal particles
            this.precomputedValues.maxCacheSize = 30; // Smaller cache
        } else {
            this.precomputedValues.sawTeethCount = 8;
            this.precomputedValues.particleCount = 4;
            this.precomputedValues.maxCacheSize = 50;
        }
    }

    /**
     * Set detail level for tile rendering
     */
    setDetailLevel(level) {
        this.detailLevel = level;
        
        // Adjust rendering parameters based on detail level
        switch (level) {
            case 'low':
                this.precomputedValues.sawTeethCount = 4;
                this.precomputedValues.particleCount = 1;
                this.enableShadows = false;
                this.enableGlow = false;
                this.enableTextures = false;
                break;
            case 'medium':
                this.precomputedValues.sawTeethCount = 8;
                this.precomputedValues.particleCount = 4;
                this.enableShadows = false;
                this.enableGlow = true;
                this.enableTextures = false;
                break;
            case 'high':
                this.precomputedValues.sawTeethCount = 12;
                this.precomputedValues.particleCount = 8;
                this.enableShadows = true;
                this.enableGlow = true;
                this.enableTextures = true;
                break;
        }
    }

    /**
     * Get performance statistics for monitoring
     */
    getPerformanceStats() {
        return {
            cacheSize: this.animationCache.size,
            frameCount: this.frameCount,
            highPerformanceMode: this.highPerformanceMode,
            tileTypeFrequency: Object.fromEntries(this.tileTypeFrequency)
        };
    }
}
