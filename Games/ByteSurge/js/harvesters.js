// ByteSurge: Infinite Loop - Harvester System
// Deployable energy-generating stations

// ===== HARVESTER SYSTEM =====
let harvesterSystem = {
    harvesters: [],
    globalSpeedMultiplier: 1,
    globalIntervalDivisor: 1,
    
    // Pickup system
    pickedUpHarvester: null,
    mouseX: 0,
    mouseY: 0,
    isInitialized: false,      init() {
        if (this.isInitialized) return;
        // Remove setupMouseEvents() call - input.js handles all clicks now
        this.isInitialized = true;
  
    },
    
    setupMouseEvents() {
        // Deprecated - input.js now handles all mouse events
        // This method is kept for backward compatibility but does nothing
        return;
    },    handleClick(gameX, gameY) {
        if (this.pickedUpHarvester) {
            // Place the carried harvester
            this.placeHarvester(gameX, gameY);
        } else {
            // Try to pick up a harvester
            this.tryPickupHarvester(gameX, gameY);
        }
    },    tryPickupHarvester(gameX, gameY) {
        for (let i = 0; i < this.harvesters.length; i++) {
            const harvester = this.harvesters[i];
            const dx = gameX - harvester.x;
            const dy = gameY - harvester.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= harvester.size * 2) { // Slightly larger click area
                // Pick up this harvester
                this.pickedUpHarvester = harvester;
                this.harvesters.splice(i, 1);
                
                // Visual feedback
                if (window.createScreenFlash) {
                    window.createScreenFlash('#00ffaa', 0.1, 100);
                }
                
                break;
            }
        }
    },
    
    placeHarvester(gameX, gameY) {
        // Ensure placement within bounds
        const margin = this.pickedUpHarvester.size;
        const x = Math.max(margin, Math.min(gameX, window.GAME_WIDTH - margin));
        const y = Math.max(margin, Math.min(gameY, window.GAME_HEIGHT - margin));
        
        this.pickedUpHarvester.x = x;
        this.pickedUpHarvester.y = y;
          // Add back to harvesters array
        this.harvesters.push(this.pickedUpHarvester);
        
        // Visual feedback
        if (window.createScreenFlash) {
            window.createScreenFlash('#00ff00', 0.15, 120);
        }
          this.pickedUpHarvester = null;
    },
    
    applyUpgradesToHarvester(harvester) {
        harvester.energyGenerationRate = harvester.baseEnergyGenerationRate * this.globalSpeedMultiplier;
        harvester.generationInterval = harvester.baseGenerationInterval / this.globalIntervalDivisor;
    },
    
    applyUpgradesToAllHarvesters() {
        this.harvesters.forEach(harvester => {
            this.applyUpgradesToHarvester(harvester);
        });
    }
};

// Legacy array for backward compatibility
let harvesters = [];

// ===== HARVESTER CLASS =====
class Harvester {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 8;
        this.deployTime = performance.now();
        
        // Visual effects
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.rotationAngle = 0;
        this.glowIntensity = 0;
        this.deployAnimation = 1; // Starts at full scale, animates to normal
          // Energy generation
        this.baseEnergyGenerationRate = 1; // Base energy per generation cycle
        this.energyGenerationRate = 1; // Current energy per generation cycle (affected by upgrades)
        this.baseGenerationInterval = 2000; // Base: Generate energy every 2 seconds
        this.generationInterval = 2000; // Current interval (affected by upgrades)
        this.lastEnergyGeneration = performance.now();
        this.totalEnergyGenerated = 0;
          // Particles
        this.particles = [];
        this.maxParticles = 6;
        
        // Pickup system
        this.isBeingCarried = false;
        
        }, ${y.toFixed(1)})`);
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        const now = performance.now();
        
        // Update visual effects
        this.pulsePhase += deltaTime * 0.004;
        this.rotationAngle += deltaTime * 0.001;
        this.glowIntensity = 0.5 + Math.sin(this.pulsePhase) * 0.3;
        
        // Deploy animation (scale down from large to normal size)
        if (this.deployAnimation > 0) {
            this.deployAnimation -= deltaTime * 0.003;
            this.deployAnimation = Math.max(0, this.deployAnimation);
        }
          // Generate energy periodically (unless jammed)
        if (now - this.lastEnergyGeneration >= this.generationInterval) {
            this.generateEnergy();
            this.lastEnergyGeneration = now;
        }
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Spawn energy particles occasionally
        if (Math.random() < 0.1 && this.particles.length < this.maxParticles) {
            this.spawnEnergyParticle();
        }
    }
      generateEnergy() {
        // Don't generate energy if jammed
        if (this.isJammed) {
            return;
        }
        
        // Add energy to game state
        if (window.gameState) {
            window.gameState.energy += this.energyGenerationRate;
            window.gameState.score += this.energyGenerationRate * 5; // 5 points per passive energy
            this.totalEnergyGenerated += this.energyGenerationRate;
            
            // Visual feedback - brief glow
            this.glowIntensity = 1.5;
            
            // Spawn generation particles
            for (let i = 0; i < 3; i++) {
                this.spawnEnergyParticle();
            }
            
            // Create screen flash for harvester generation
            if (window.createScreenFlash) {
                window.createScreenFlash('#00ff00', 0.05, 80);
            }
            
            }
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx * (deltaTime / 1000);
            particle.y += particle.vy * (deltaTime / 1000);
            particle.life -= deltaTime;
            particle.alpha = Math.max(0, particle.life / particle.maxLife);
            particle.size *= 0.999; // Slowly shrink
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    spawnEnergyParticle() {
        const angle = Math.random() * Math.PI * 2;
        const speed = 15 + Math.random() * 25;
        const life = 800 + Math.random() * 1200;
        
        this.particles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 20, // Slight upward bias
            life: life,
            maxLife: life,
            alpha: 1,
            size: 2 + Math.random() * 3
        });
    }    render(ctx) {
        ctx.save();
        
        // Move to harvester center
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);
        
        // Deploy animation scaling
        const scale = 1 + this.deployAnimation * 2;
        ctx.scale(scale, scale);
        
        // Render energy particles first
        this.renderParticles(ctx);
        
        // Render aura boost effect if boosted
        if (this.isAuraBoosted && this.auraBoostLevel) {
            this.renderAuraBoost(ctx);
        }

        // Outer glow effect (dimmed if jammed)
        const glowRadius = this.size * 2 * this.glowIntensity;
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        
        if (this.isJammed) {
            // Red tint when jammed
            glowGradient.addColorStop(0, `rgba(255, 100, 0, ${this.glowIntensity * 0.2})`);
            glowGradient.addColorStop(0.7, `rgba(200, 80, 0, ${this.glowIntensity * 0.05})`);
            glowGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        } else {
            // Normal green glow
            glowGradient.addColorStop(0, `rgba(0, 255, 0, ${this.glowIntensity * 0.3})`);
            glowGradient.addColorStop(0.7, `rgba(0, 200, 0, ${this.glowIntensity * 0.1})`);
            glowGradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        }
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();
          // Check if sprite is available and loaded
        if (window.sprites && window.sprites.harvester && window.sprites.loaded) {
            // Draw the harvester sprite centered - 4x size (2x bigger than previous 2x)
            const spriteSize = this.size * 4; // Scale sprite to be 2x bigger
            ctx.drawImage(window.sprites.harvester, -spriteSize/2, -spriteSize/2, spriteSize, spriteSize);
        } else {
            // Fallback to original primitive rendering
            // Main harvester body (triangle)
            ctx.beginPath();
            const points = 3;
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2 - Math.PI / 2; // Start pointing up
                const x = Math.cos(angle) * this.size;
                const y = Math.sin(angle) * this.size;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            
            // Fill with energy gradient
            const bodyGradient = ctx.createLinearGradient(0, -this.size, 0, this.size);
            bodyGradient.addColorStop(0, `rgba(100, 255, 100, ${0.9 + this.glowIntensity * 0.1})`);
            bodyGradient.addColorStop(0.5, `rgba(50, 220, 50, ${0.8 + this.glowIntensity * 0.2})`);
            bodyGradient.addColorStop(1, `rgba(20, 180, 20, ${0.7 + this.glowIntensity * 0.3})`);
            
            ctx.fillStyle = bodyGradient;
            ctx.fill();
            
            // Add outline
            ctx.strokeStyle = `rgba(0, 255, 0, ${0.8 + this.glowIntensity * 0.2})`;
            ctx.lineWidth = 1;
            ctx.stroke();
              // Add center energy core
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 255, 200, ${this.glowIntensity})`;
            ctx.fill();
        }
          // Draw jammed indicator if harvester is disabled
        if (this.isJammed) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = '#ff4400';
            ctx.lineWidth = 3;
            ctx.setLineDash([4, 4]);
            
            // Draw X over the harvester
            const size = this.size * 1.5;
            ctx.beginPath();
            ctx.moveTo(-size, -size);
            ctx.lineTo(size, size);
            ctx.moveTo(size, -size);
            ctx.lineTo(-size, size);
            ctx.stroke();
            
            ctx.setLineDash([]);
            ctx.restore();
        }
        
        // Draw subtle clickable indicator
        if (!window.harvesterSystem || !window.harvesterSystem.pickedUpHarvester) {
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(performance.now() * 0.005) * 0.1;
            ctx.strokeStyle = '#00ffaa';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    renderParticles(ctx) {
        ctx.save();
        
        this.particles.forEach(particle => {
            ctx.globalAlpha = particle.alpha * 0.8;
            
            // Energy particle gradient
            const particleGradient = ctx.createRadialGradient(
                particle.x - this.x, particle.y - this.y, 0,
                particle.x - this.x, particle.y - this.y, particle.size
            );
            particleGradient.addColorStop(0, '#00ff00');
            particleGradient.addColorStop(0.7, '#00cc00');
            particleGradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
            
            ctx.fillStyle = particleGradient;
            ctx.beginPath();
            ctx.arc(particle.x - this.x, particle.y - this.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
    
    getBounds() {
        return {
            centerX: this.x,
            centerY: this.y,
            radius: this.size
        };
    }
    
    getStats() {
        return {
            totalEnergyGenerated: this.totalEnergyGenerated,
            deployTime: this.deployTime,
            age: performance.now() - this.deployTime
        };
    }
    
    renderAuraBoost(ctx) {
        // Create pulsing aura effect around boosted harvesters
        const boostRadius = this.size * 3;
        const boostIntensity = 0.3 + Math.sin(this.pulsePhase * 2) * 0.2;
        
        // Get zone color based on boost level
        const zoneColors = [
            '#ffff00', // Zone 1: Yellow
            '#00ffff', // Zone 2: Cyan  
            '#ff4444', // Zone 3: Red
            '#44ff44', // Zone 4: Green
            '#ffaa00', // Zone 5: Orange
            '#aa44ff', // Zone 6: Purple
            '#ff44aa', // Zone 7: Pink
            '#ffffff'  // Zone 8+: White
        ];
        
        const boostColor = zoneColors[Math.min(this.auraBoostLevel - 1, zoneColors.length - 1)];
        
        // Create boost aura
        const auraGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, boostRadius);
        auraGradient.addColorStop(0, `${boostColor}00`); // Transparent center
        auraGradient.addColorStop(0.3, `${boostColor}${Math.floor(boostIntensity * 100).toString(16).padStart(2, '0')}`);
        auraGradient.addColorStop(0.8, `${boostColor}${Math.floor(boostIntensity * 50).toString(16).padStart(2, '0')}`);
        auraGradient.addColorStop(1, `${boostColor}00`); // Transparent edge
        
        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(0, 0, boostRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add boost indicator ring
        ctx.strokeStyle = `${boostColor}${Math.floor(boostIntensity * 150).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, boostRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add boost percentage text
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        const boostPercent = ((this.energyGenerationRate / this.originalGenerationRate - 1) * 100).toFixed(0);
        ctx.fillText(`+${boostPercent}%`, 0, -boostRadius - 8);
    }
}

// ===== HARVESTER MANAGEMENT =====
// harvesters array is already declared above with harvesterSystem
let maxHarvesters = 3;

function updateHarvesters(deltaTime) {
    // Update harvesters in the current system
    if (window.harvesterSystem && window.harvesterSystem.harvesters) {
        window.harvesterSystem.harvesters.forEach(harvester => {
            harvester.update(deltaTime);
        });
    }
    
    // Also update any harvesters in the legacy array for backward compatibility
    harvesters.forEach(harvester => {
        harvester.update(deltaTime);
    });
}

function deployHarvester() {
    if (!window.drone) {
        return false;
    }
    
    // Get current max harvesters (affected by upgrades)
    const currentMaxHarvesters = window.gameState ? window.gameState.maxHarvesters : 3;
    
    // Check if we've reached the limit
    if (harvesters.length >= currentMaxHarvesters) {
        // Visual feedback for limit reached
        if (window.createScreenFlash) {
            window.createScreenFlash('#ff0000', 0.2, 150);
        }
        
        // Haptic feedback for failure
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        return false;
    }
    
    // Deploy harvester slightly behind the drone
    const drone = window.drone;
    const deployDistance = 30;
    
    // Calculate position behind drone based on its direction
    const directions = {
        0: { x: 0, y: 1 },   // North -> place south
        1: { x: -1, y: 0 },  // East -> place west  
        2: { x: 0, y: -1 },  // South -> place north
        3: { x: 1, y: 0 }    // West -> place east
    };
    
    const direction = directions[drone.direction] || { x: 0, y: 1 };
    const deployX = drone.x + direction.x * deployDistance;
    const deployY = drone.y + direction.y * deployDistance;
    
    // Make sure harvester is within bounds
    const boundedX = Math.max(20, Math.min(window.GAME_WIDTH - 20, deployX));
    const boundedY = Math.max(20, Math.min(window.GAME_HEIGHT - 20, deployY));
      // Create new harvester
    const harvester = new Harvester(boundedX, boundedY);
    
    // Apply current upgrades to new harvester
    if (window.harvesterSystem) {
        window.harvesterSystem.applyUpgradesToHarvester(harvester);
    }
    
    harvesters.push(harvester);
    harvesterSystem.harvesters.push(harvester);
    
    // Update game state
    if (window.gameState) {
        window.gameState.harvesters = harvesters.length;
    }
      // Visual feedback for successful deployment
    if (window.createScreenFlash) {
        window.createScreenFlash('#00ff00', 0.15, 120);
    }
      // Haptic feedback for success
    if (navigator.vibrate) {
        navigator.vibrate([75, 25, 75]);
    }
    
    return true;
}

function renderHarvesters(ctx) {
    // Initialize harvester system if not done yet
    if (window.harvesterSystem && !window.harvesterSystem.isInitialized) {
        window.harvesterSystem.init();
    }
    
    // Use the harvesterSystem.harvesters array (current system)
    if (window.harvesterSystem && window.harvesterSystem.harvesters) {
        window.harvesterSystem.harvesters.forEach(harvester => {
            harvester.render(ctx);
        });
    }
    
    // Also render any harvesters in the legacy array for backward compatibility
    harvesters.forEach(harvester => {
        harvester.render(ctx);
    });
    
    // Render picked up harvester if there is one
    if (window.harvesterSystem && window.harvesterSystem.pickedUpHarvester) {
        renderPickedUpHarvester(ctx, window.harvesterSystem.pickedUpHarvester);
    }
}

function renderPickedUpHarvester(ctx, harvester) {
    ctx.save();
    
    // Semi-transparent while being carried
    ctx.globalAlpha = 0.7;
    
    // Move to harvester position
    ctx.translate(harvester.x, harvester.y);
    
    // Pulsing scale effect while being carried
    const scale = 1 + Math.sin(performance.now() * 0.01) * 0.1;
    ctx.scale(scale, scale);
    
    // Render energy particles first
    harvester.renderParticles(ctx);
    
    // Outer glow effect (brighter while being carried)
    const glowRadius = harvester.size * 3;
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    glowGradient.addColorStop(0, 'rgba(0, 255, 170, 0.4)');
    glowGradient.addColorStop(0.7, 'rgba(0, 200, 150, 0.2)');
    glowGradient.addColorStop(1, 'rgba(0, 255, 170, 0)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw dashed outline to show it's being moved
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, harvester.size + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Check if sprite is available and loaded
    if (window.sprites && window.sprites.harvester && window.sprites.loaded) {
        // Draw the harvester sprite centered
        const spriteSize = harvester.size * 4;
        ctx.drawImage(window.sprites.harvester, -spriteSize/2, -spriteSize/2, spriteSize, spriteSize);
    } else {
        // Fallback to primitive rendering
        ctx.beginPath();
        const points = 3;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * harvester.size;
            const y = Math.sin(angle) * harvester.size;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        
        ctx.fillStyle = '#00ffaa';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    ctx.restore();
}

function getHarvesterStats() {
    // Get stats from the current system
    const systemStats = window.harvesterSystem && window.harvesterSystem.harvesters ? 
        window.harvesterSystem.harvesters.map(harvester => harvester.getStats()) : [];
    
    // Get stats from legacy array
    const legacyStats = harvesters.map(harvester => harvester.getStats());
    
    // Combine both (avoid duplicates by using the main system)
    return systemStats.length > 0 ? systemStats : legacyStats;
}

function getTotalHarvesterEnergy() {
    // Get energy from the current system
    const systemEnergy = window.harvesterSystem && window.harvesterSystem.harvesters ? 
        window.harvesterSystem.harvesters.reduce((total, harvester) => total + harvester.totalEnergyGenerated, 0) : 0;
    
    // Get energy from legacy array
    const legacyEnergy = harvesters.reduce((total, harvester) => total + harvester.totalEnergyGenerated, 0);
    
    // Return from main system if available, otherwise legacy
    return systemEnergy > 0 ? systemEnergy : legacyEnergy;
}

function resetHarvesters() {
    harvesters = [];
    if (window.harvesterSystem) {
        window.harvesterSystem.harvesters = [];
    }
    if (window.gameState) {
        window.gameState.harvesters = 0;
    }
    }

function applyHarvesterUpgrades() {
    // Get harvester rate upgrade level
    const harvesterRateLevel = window.upgradeSystem ? 
        window.upgradeSystem.upgrades.find(u => u.id === 'harvesterRate')?.currentLevel || 0 : 0;
    
    // Apply upgrades to harvesters in the current system
    if (window.harvesterSystem && window.harvesterSystem.harvesters) {
        window.harvesterSystem.harvesters.forEach(harvester => {
            // Harvester rate upgrade: reduce generation interval
            const rateMultiplier = 1 + (harvesterRateLevel * 0.2); // 20% faster per level
            harvester.generationInterval = harvester.baseGenerationInterval / rateMultiplier;
            harvester.energyGenerationRate = Math.floor(harvester.baseEnergyGenerationRate * (1 + harvesterRateLevel * 0.1)); // 10% more energy per level
        });
    }
    
    // Also apply upgrades to legacy array
    harvesters.forEach(harvester => {
        // Harvester rate upgrade: reduce generation interval
        const rateMultiplier = 1 + (harvesterRateLevel * 0.2); // 20% faster per level
        harvester.generationInterval = harvester.baseGenerationInterval / rateMultiplier;
        harvester.energyGenerationRate = Math.floor(harvester.baseEnergyGenerationRate * (1 + harvesterRateLevel * 0.1)); // 10% more energy per level
    });
}

// Export for global access
window.Harvester = Harvester;
window.harvesterSystem = harvesterSystem;
window.harvesters = harvesters;
window.updateHarvesters = updateHarvesters;
window.deployHarvester = deployHarvester;
window.renderHarvesters = renderHarvesters;
window.getHarvesterStats = getHarvesterStats;
window.getTotalHarvesterEnergy = getTotalHarvesterEnergy;
window.resetHarvesters = resetHarvesters;
window.applyHarvesterUpgrades = applyHarvesterUpgrades;
