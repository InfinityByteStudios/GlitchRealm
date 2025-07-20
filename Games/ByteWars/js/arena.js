class Arena {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.borderThickness = 20;
        
        // Arena visual properties
        this.borderColor = '#00ffff';
        this.backgroundColor = '#001122';
        this.gridColor = '#003344';
        this.gridSize = 50;
        
        // Corner decorations
        this.cornerSize = 40;
        this.cornerColor = '#ff6600';
          // Central elements (now smaller safe zone)
        this.centerRingRadius = 80;
        this.centerRingColor = '#004466';
          // Safe spawn zone properties
        this.safeZoneRadius = 80; // Even smaller safe area around spawn
        this.safeZoneColor = '#00ff88';
        this.safeZoneBorderColor = '#00ffaa';
        
        // Safe zone timer system
        this.safeZoneMaxTime = 10.0; // 10 seconds allowed in safe zone
        this.safeZoneCooldown = 60.0; // 1 minute cooldown
        this.safeZoneTimeRemaining = this.safeZoneMaxTime;
        this.safeZoneCooldownRemaining = 0;
        this.playerInSafeZone = false;
        this.safeZoneAvailable = true;
    }
      render(ctx) {
        // Draw background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw grid pattern
        this.drawGrid(ctx);
        
        // Draw safe spawn zone
        this.drawSafeZone(ctx);
        
        // Draw center ring
        this.drawCenterRing(ctx);
        
        // Draw corner decorations
        this.drawCornerDecorations(ctx);
        
        // Draw arena borders
        this.drawBorders(ctx);
        
        // Draw arena info
        this.drawArenaInfo(ctx);    }
    
    // Update safe zone timer system
    update(deltaTime, playerX, playerY) {
        const wasInSafeZone = this.playerInSafeZone;
        this.playerInSafeZone = this.isInSafeZone(playerX, playerY);
        
        // Handle safe zone timer
        if (this.playerInSafeZone && this.safeZoneAvailable) {
            this.safeZoneTimeRemaining -= deltaTime;
            
            if (this.safeZoneTimeRemaining <= 0) {
                // Safe zone time expired
                this.safeZoneAvailable = false;
                this.safeZoneCooldownRemaining = this.safeZoneCooldown;
                this.safeZoneTimeRemaining = 0;
            }
        } else if (!this.playerInSafeZone && !this.safeZoneAvailable) {
            // Player left safe zone, start cooldown
            this.safeZoneCooldownRemaining -= deltaTime;
            
            if (this.safeZoneCooldownRemaining <= 0) {
                // Cooldown complete, restore safe zone
                this.safeZoneAvailable = true;
                this.safeZoneTimeRemaining = this.safeZoneMaxTime;
                this.safeZoneCooldownRemaining = 0;
            }
        } else if (!this.playerInSafeZone && this.safeZoneAvailable) {
            // Player outside safe zone but it's available - slowly regenerate time
            this.safeZoneTimeRemaining = Math.min(this.safeZoneMaxTime, 
                                                  this.safeZoneTimeRemaining + deltaTime * 0.2);
        }
    }
    
    // Check if safe zone protection is active
    isSafeZoneActive() {
        return this.playerInSafeZone && this.safeZoneAvailable && this.safeZoneTimeRemaining > 0;
    }
    
    // Get safe zone status for UI
    getSafeZoneStatus() {
        return {
            available: this.safeZoneAvailable,
            inSafeZone: this.playerInSafeZone,
            timeRemaining: this.safeZoneTimeRemaining,
            cooldownRemaining: this.safeZoneCooldownRemaining
        };
    }
    
    drawGrid(ctx) {
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed lines
        
        // Vertical lines
        for (let x = this.gridSize; x < this.width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = this.gridSize; y < this.height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
        
        ctx.setLineDash([]); // Reset to solid lines
    }
    
    drawCenterRing(ctx) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Outer ring
        ctx.strokeStyle = this.centerRingColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.centerRingRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.centerRingRadius - 15, 0, Math.PI * 2);
        ctx.stroke();
        
        // Center dot
        ctx.fillStyle = this.centerRingColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawCornerDecorations(ctx) {
        const corners = [
            { x: this.cornerSize, y: this.cornerSize }, // Top-left
            { x: this.width - this.cornerSize, y: this.cornerSize }, // Top-right
            { x: this.cornerSize, y: this.height - this.cornerSize }, // Bottom-left
            { x: this.width - this.cornerSize, y: this.height - this.cornerSize } // Bottom-right
        ];
        
        ctx.strokeStyle = this.cornerColor;
        ctx.lineWidth = 2;
        
        corners.forEach(corner => {
            // Draw corner brackets
            const size = 15;
            
            // Top-left bracket part
            ctx.beginPath();
            ctx.moveTo(corner.x - size, corner.y);
            ctx.lineTo(corner.x, corner.y);
            ctx.lineTo(corner.x, corner.y - size);
            ctx.stroke();
            
            // Top-right bracket part
            ctx.beginPath();
            ctx.moveTo(corner.x + size, corner.y);
            ctx.lineTo(corner.x, corner.y);
            ctx.lineTo(corner.x, corner.y + size);
            ctx.stroke();
        });
    }
    
    drawBorders(ctx) {
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderThickness;
        ctx.shadowColor = this.borderColor;
        ctx.shadowBlur = 15;
        
        // Draw border rectangle
        ctx.strokeRect(
            this.borderThickness / 2, 
            this.borderThickness / 2, 
            this.width - this.borderThickness, 
            this.height - this.borderThickness
        );
        
        ctx.shadowBlur = 0;
    }
    
    drawArenaInfo(ctx) {
        // Arena title
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('NEUROCORE TRAINING ARENA', this.width / 2, 35);
        
        // Arena designation
        ctx.font = '10px Courier New';
        ctx.fillStyle = '#666666';
        ctx.fillText('SECTOR 01 - PROTOTYPE TESTING ZONE', this.width / 2, 50);
        
        ctx.textAlign = 'left'; // Reset text alignment
    }
    
    // Check if a point is within the arena bounds (excluding borders)
    isInBounds(x, y, radius = 0) {
        return x - radius >= this.borderThickness && 
               x + radius <= this.width - this.borderThickness &&
               y - radius >= this.borderThickness && 
               y + radius <= this.height - this.borderThickness;    }
      drawSafeZone(ctx) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Determine safe zone colors based on status
        let fillColor = this.safeZoneColor;
        let borderColor = this.safeZoneBorderColor;
        let alpha = 0.15;
        
        if (!this.safeZoneAvailable) {
            // Safe zone on cooldown - red
            fillColor = '#ff4444';
            borderColor = '#ff6666';
            alpha = 0.1;        } else if (this.playerInSafeZone && this.safeZoneTimeRemaining < 3) {
            // Warning - time running out
            fillColor = '#ff6600';
            borderColor = '#ff8844';
            alpha = 0.2;
        }
        
        // Draw safe zone circle (semi-transparent)
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.safeZoneRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Draw safe zone border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.safeZoneRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
        
        // Draw safe zone status text
        ctx.fillStyle = borderColor;
        ctx.font = '12px Courier New';
        ctx.textAlign = 'center';
        
        if (!this.safeZoneAvailable) {
            ctx.fillText('SAFE ZONE COOLDOWN', centerX, centerY + this.safeZoneRadius + 20);
            ctx.fillText(`${Math.ceil(this.safeZoneCooldownRemaining)}s`, centerX, centerY + this.safeZoneRadius + 35);
        } else {
            ctx.fillText('SAFE ZONE', centerX, centerY + this.safeZoneRadius + 20);
            if (this.playerInSafeZone) {
                ctx.fillText(`${Math.ceil(this.safeZoneTimeRemaining)}s`, centerX, centerY + this.safeZoneRadius + 35);
            }
        }
    }
    
    // Check if a point is inside the safe zone
    isInSafeZone(x, y) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const distance = Math.sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY));
        return distance <= this.safeZoneRadius;
    }
    
    // Get center of arena (spawn point)
    getCenter() {
        return {
            x: this.width / 2,
            y: this.height / 2
        };
    }
    
    // Get safe spawn area (avoiding center ring)
    getSafeSpawnArea() {
        const margin = 50;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const safeRadius = this.centerRingRadius + margin;
        
        return {
            minX: this.borderThickness + margin,
            maxX: this.width - this.borderThickness - margin,
            minY: this.borderThickness + margin,
            maxY: this.height - this.borderThickness - margin,
            centerX: centerX,
            centerY: centerY,
            centerExclusionRadius: safeRadius
        };
    }
    
    // Reset safe zone when player dies
    resetSafeZone() {
        this.safeZoneAvailable = true;
        this.safeZoneTimeRemaining = this.safeZoneMaxTime;
        this.safeZoneCooldownRemaining = 0;
        this.playerInSafeZone = false;
        console.log('🛡️ Safe zone reset - full protection restored');
    }
}
