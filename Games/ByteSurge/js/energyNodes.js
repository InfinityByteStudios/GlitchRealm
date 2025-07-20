// ByteSurge: Infinite Loop - Energy Node System
// Energy collection mechanics and visual effects

// ===== ENERGY NODE SYSTEM =====
window.EnergyNodeSystem = {
    nodes: [],
    spawnTimer: 0,
    spawnInterval: 1000, // Spawn a new node every second
    maxNodes: 30, // Maximum nodes on screen
    
    init() {
        this.nodes = [];
        this.spawnTimer = 0;
        console.log('⚡ Energy node system initialized');
        return this;
    },
    
    update(deltaTime) {
        // Update spawn timer
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval && this.nodes.length < this.maxNodes) {
            this.spawnNode();
            this.spawnTimer = 0;
        }
        
        // Update existing nodes
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            node.update(deltaTime);
            
            // Check for collection by drone
            if (!node.isCollected && window.drone) {
                const dx = node.x - window.drone.x;
                const dy = node.y - window.drone.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < window.drone.size + node.size) {
                    this.collectNode(node);
                }
            }
            
            // Remove fully collected nodes
            if (node.isCollected && node.collectionTime > 300) {
                this.nodes.splice(i, 1);
            }
        }
    },
    
    render(ctx) {
        this.nodes.forEach(node => node.render(ctx));
    },
    
    spawnNode() {
        // Random position within game bounds, keeping away from edges
        const margin = 50;
        const x = margin + Math.random() * (window.GAME_WIDTH - margin * 2);
        const y = margin + Math.random() * (window.GAME_HEIGHT - margin * 2);
        
        // Create node with current zone level
        const node = new EnergyNode(x, y, window.gameState ? window.gameState.currentZone : 1);
        this.nodes.push(node);
    },
      collectNode(node) {
        if (node.isCollected) return;
        
        // Remove all aura bonuses before marking as collected
        node.removeAllAuraBonuses();
        
        node.isCollected = true;
        node.collectionTime = 0;
        
        // Calculate energy value based on zone multiplier
        let energyValue = node.value;
        if (window.zoneSystem && window.gameState) {
            const zoneData = window.zoneSystem.getCurrentZoneData();
            energyValue *= zoneData.energyMultiplier;
        }        // Apply any active bonuses
        if (window.gameState) {
            window.gameState.energy += energyValue;
        }
        
        // Notify tutorial system about energy collection
        if (window.tutorialSystem && window.tutorialSystem.onEnergyCollected) {
            window.tutorialSystem.onEnergyCollected();
        }
        
        // Removed screen flash effect for cleaner gameplay
        // if (window.createScreenFlash) {
        //     window.createScreenFlash(node.color, 0.2, 100);
        // }
        
        // Play collection sound (if we add sound later)
        // playSound('collect');
    }
};

// ===== ENERGY NODE CLASS =====
class EnergyNode {
    constructor(x, y, zoneLevel = 1) {
        this.x = x;
        this.y = y;        this.size = 6;
        this.value = 1; // Base energy value when collected
        this.zoneLevel = zoneLevel;
        
        // Zone-based properties
        this.zoneType = this.getZoneType(zoneLevel);
        this.color = this.getZoneColor(zoneLevel);
        this.glowColor = this.getGlowColor(zoneLevel);
        
        // Aura system for harvester boost
        this.auraRadius = 80 + (zoneLevel * 10); // Larger aura for higher zones
        this.auraBonus = 1 + (zoneLevel * 0.3); // 30% bonus per zone level
        this.affectedHarvesters = new Set(); // Track which harvesters are boosted
        
        // Visual effects
        this.spawnTime = performance.now();
        this.pulsePhase = Math.random() * Math.PI * 2; // Random start phase
        this.blinkPhase = Math.random() * Math.PI * 2; // Random blink timing
        this.floatOffset = 0;
        this.rotationAngle = 0;
        this.auraPhase = Math.random() * Math.PI * 2; // For aura animation
        
        // Collection effects
        this.isCollected = false;
        this.collectionTime = 0;
        this.collectionScale = 1;
        
        // Particle effects
        this.particles = [];
        this.maxParticles = 8;
        
        console.log(`⚡ Zone ${zoneLevel} energy node spawned at (${x.toFixed(1)}, ${y.toFixed(1)})`);
    }
    
    getZoneType(zoneLevel) {
        const types = ['Basic', 'Enhanced', 'Advanced', 'Superior', 'Elite', 'Master', 'Legendary', 'Cosmic'];
        return types[Math.min(zoneLevel - 1, types.length - 1)];
    }
    
    getZoneColor(zoneLevel) {
        const colors = [
            '#ffff00', // Zone 1: Yellow
            '#00ffff', // Zone 2: Cyan
            '#ff4444', // Zone 3: Red
            '#44ff44', // Zone 4: Green
            '#ffaa00', // Zone 5: Orange
            '#aa44ff', // Zone 6: Purple
            '#ff44aa', // Zone 7: Pink
            '#ffffff'  // Zone 8+: White
        ];
        return colors[Math.min(zoneLevel - 1, colors.length - 1)];
    }
    
    getGlowColor(zoneLevel) {
        const glowColors = [
            'rgba(255, 255, 0, 0.4)', // Zone 1: Yellow glow
            'rgba(0, 255, 255, 0.4)',  // Zone 2: Cyan glow
            'rgba(255, 68, 68, 0.4)',  // Zone 3: Red glow
            'rgba(68, 255, 68, 0.4)',  // Zone 4: Green glow
            'rgba(255, 170, 0, 0.4)',  // Zone 5: Orange glow
            'rgba(170, 68, 255, 0.4)', // Zone 6: Purple glow
            'rgba(255, 68, 170, 0.4)', // Zone 7: Pink glow
            'rgba(255, 255, 255, 0.4)' // Zone 8+: White glow
        ];
        return glowColors[Math.min(zoneLevel - 1, glowColors.length - 1)];
    }
      update(deltaTime) {
        const dt = deltaTime / 1000;
        
        // Update visual effects
        this.pulsePhase += deltaTime * 0.005;
        this.blinkPhase += deltaTime * 0.003; // 2-second cycle = ~0.003
        this.rotationAngle += deltaTime * 0.001;
        this.auraPhase += deltaTime * 0.002; // Slow aura animation
        
        // Floating animation
        this.floatOffset = Math.sin(this.pulsePhase * 1.5) * 2;
        
        // Update harvester aura effects (only if not collected)
        if (!this.isCollected) {
            this.updateHarvesterAura();
        }
        
        // Update collection animation
        if (this.isCollected) {
            this.collectionTime += deltaTime;
            this.collectionScale = 1 + (this.collectionTime / 300) * 2; // Scale up over 300ms
            
            // Spawn collection particles
            if (this.particles.length < this.maxParticles) {
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 50 + Math.random() * 100;
                    this.particles.push({
                        x: this.x,
                        y: this.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.8,
                        maxLife: 0.8,
                        size: 2 + Math.random() * 3
                    });
                }
            }
        }
        
        // Update particles
        this.particles.forEach(particle => {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.life -= dt;
            particle.vx *= 0.95; // Air resistance
            particle.vy *= 0.95;
        });
        
        // Remove dead particles
        this.particles = this.particles.filter(particle => particle.life > 0);
    }
      render(ctx) {
        if (this.isCollected && this.collectionTime > 300) {
            return; // Don't render if collection animation is done
        }
        
        ctx.save();
          // Render aura first (behind the energy node) - always show for strategic planning
        if (!this.isCollected) {
            this.renderAura(ctx);
        }
        
        // Move to energy node position with floating
        ctx.translate(this.x, this.y + this.floatOffset);
        ctx.rotate(this.rotationAngle);
        ctx.scale(this.collectionScale, this.collectionScale);
        
        // Blinking effect (every 2 seconds)
        const blinkCycle = Math.sin(this.blinkPhase);
        const isBlinking = blinkCycle > 0.7; // Blink when sin wave is high
        const blinkIntensity = isBlinking ? 0.3 + Math.sin(this.blinkPhase * 10) * 0.7 : 1.0;
          // Outer glow with zone color
        const glowIntensity = 0.4 + Math.sin(this.pulsePhase) * 0.2;
        const glowSize = this.size * 2;
        
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        gradient.addColorStop(0, this.glowColor.replace('0.4', `${glowIntensity * blinkIntensity}`));
        gradient.addColorStop(0.6, this.glowColor.replace('0.4', `${glowIntensity * 0.3 * blinkIntensity}`));
        gradient.addColorStop(1, this.glowColor.replace('0.4', '0'));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2);
          // Main energy square with zone color
        ctx.fillStyle = this.color;
        ctx.globalAlpha = blinkIntensity;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        
        // Inner highlight
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.8 * blinkIntensity;
        ctx.fillRect(-this.size / 4, -this.size / 4, this.size / 2, this.size / 2);
        
        // Reset alpha
        ctx.globalAlpha = 1;
        
        // Energy sparkles
        if (isBlinking) {
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + this.rotationAngle * 2;
                const distance = this.size * 0.8;
                const sparkleX = Math.cos(angle) * distance;
                const sparkleY = Math.sin(angle) * distance;
                
                ctx.beginPath();
                ctx.arc(sparkleX, sparkleY, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
        
        // Render collection particles
        if (this.particles.length > 0) {
            this.renderParticles(ctx);
        }
    }
    
    renderParticles(ctx) {
        ctx.save();
        
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            const size = particle.size * alpha;
            
            ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
    
    getBounds() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            width: this.size,
            height: this.size,
            centerX: this.x,
            centerY: this.y,
            radius: this.size / 2
        };
    }
      collect() {
        if (this.isCollected) return false;
        
        // Remove all aura bonuses before marking as collected
        this.removeAllAuraBonuses();
        
        this.isCollected = true;
        this.collectionTime = 0;
        
        console.log(`⚡ Energy node collected! +${this.value} energy`);
        return this.value;
    }
    
    isReadyForRemoval() {
        return this.isCollected && this.collectionTime > 500 && this.particles.length === 0;
    }
    
    updateHarvesterAura() {
        // Get all harvesters from the system
        let allHarvesters = [];
        
        // Get harvesters from the main system
        if (window.harvesterSystem && window.harvesterSystem.harvesters) {
            allHarvesters = allHarvesters.concat(window.harvesterSystem.harvesters);
        }
        
        // Also check for legacy harvesters array
        if (window.harvesters && Array.isArray(window.harvesters)) {
            allHarvesters = allHarvesters.concat(window.harvesters);
        }
        
        // Track currently affected harvesters
        const currentlyAffected = new Set();
        
        // Check each harvester
        allHarvesters.forEach(harvester => {
            if (!harvester || harvester.isBeingCarried) return;
            
            // Calculate distance to this energy node
            const dx = harvester.x - this.x;
            const dy = harvester.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.auraRadius) {
                // Harvester is within aura range
                currentlyAffected.add(harvester);
                
                // Apply aura bonus if not already applied
                if (!this.affectedHarvesters.has(harvester)) {
                    this.applyAuraBonus(harvester);
                    this.affectedHarvesters.add(harvester);
                }
            }
        });
        
        // Remove aura bonus from harvesters that left the range
        this.affectedHarvesters.forEach(harvester => {
            if (!currentlyAffected.has(harvester)) {
                this.removeAuraBonus(harvester);
                this.affectedHarvesters.delete(harvester);
            }
        });
    }
    
    applyAuraBonus(harvester) {
        // Store original values if not already stored
        if (!harvester.originalGenerationRate) {
            harvester.originalGenerationRate = harvester.energyGenerationRate;
            harvester.originalGenerationInterval = harvester.generationInterval;
        }
        
        // Apply aura bonus (multiplicative)
        harvester.energyGenerationRate = harvester.originalGenerationRate * this.auraBonus;
        harvester.generationInterval = harvester.originalGenerationInterval / this.auraBonus;
        
        // Visual feedback - mark as boosted
        harvester.isAuraBoosted = true;
        harvester.auraBoostLevel = this.zoneLevel;
        
        console.log(`🌟 Harvester boosted by Zone ${this.zoneLevel} energy node! Bonus: +${((this.auraBonus - 1) * 100).toFixed(0)}%`);
    }
    
    removeAuraBonus(harvester) {
        // Restore original values
        if (harvester.originalGenerationRate) {
            harvester.energyGenerationRate = harvester.originalGenerationRate;
            harvester.generationInterval = harvester.originalGenerationInterval;
        }
        
        // Remove visual feedback
        harvester.isAuraBoosted = false;
        harvester.auraBoostLevel = 0;
        
        console.log(`💔 Harvester lost aura bonus`);
    }
    
    // Called when energy node is collected
    removeAllAuraBonuses() {
        this.affectedHarvesters.forEach(harvester => {
            this.removeAuraBonus(harvester);
        });
        this.affectedHarvesters.clear();
        
        console.log(`⚡ Zone ${this.zoneLevel} energy node collected - all aura bonuses removed`);
    }
      renderAura(ctx) {
        ctx.save();
        
        // Determine aura intensity based on whether harvesters are affected
        const hasActiveHarvesters = this.affectedHarvesters.size > 0;
        const baseIntensity = hasActiveHarvesters ? 0.15 : 0.08; // More subtle when no harvesters
        const auraIntensity = baseIntensity + Math.sin(this.auraPhase) * (hasActiveHarvesters ? 0.08 : 0.03);
        const auraRadius = this.auraRadius + Math.sin(this.auraPhase * 1.5) * 5;
        
        // Create radial gradient for aura
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, auraRadius
        );
        
        // Use zone color for aura with different opacity for active vs potential
        const auraColor = this.color;
        const centerOpacity = Math.floor(auraIntensity * 255).toString(16).padStart(2, '0');
        const midOpacity = Math.floor(auraIntensity * 0.6 * 255).toString(16).padStart(2, '0');
        const edgeOpacity = Math.floor(auraIntensity * 0.2 * 255).toString(16).padStart(2, '0');
        
        gradient.addColorStop(0, `${auraColor}00`); // Transparent center
        gradient.addColorStop(0.2, `${auraColor}${centerOpacity}`);
        gradient.addColorStop(0.6, `${auraColor}${midOpacity}`);
        gradient.addColorStop(0.9, `${auraColor}${edgeOpacity}`);
        gradient.addColorStop(1, `${auraColor}00`); // Transparent edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, auraRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add ring effect - solid when active, dashed when potential
        const ringOpacity = Math.floor(auraIntensity * (hasActiveHarvesters ? 200 : 100)).toString(16).padStart(2, '0');
        ctx.strokeStyle = `${auraColor}${ringOpacity}`;
        ctx.lineWidth = hasActiveHarvesters ? 2 : 1;
        
        if (!hasActiveHarvesters) {
            // Dashed line for potential aura
            ctx.setLineDash([5, 5]);
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, auraRadius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        
        if (!hasActiveHarvesters) {
            ctx.setLineDash([]); // Reset line dash
        }
        
        // Show boost information
        ctx.fillStyle = hasActiveHarvesters ? '#ffffff' : '#cccccc';
        ctx.font = hasActiveHarvesters ? '10px monospace' : '9px monospace';
        ctx.textAlign = 'center';
        
        if (hasActiveHarvesters) {
            // Show active boost
            ctx.fillText(
                `+${((this.auraBonus - 1) * 100).toFixed(0)}% ACTIVE`,
                this.x,
                this.y - this.auraRadius - 15
            );
        } else {
            // Show potential boost
            ctx.fillText(
                `+${((this.auraBonus - 1) * 100).toFixed(0)}% boost area`,
                this.x,
                this.y - this.auraRadius - 15
            );
        }
        
        ctx.restore();
    }
}

// ===== ENERGY NODE MANAGEMENT =====
let energyNodes = [];
let lastEnergyNodeSpawn = 0;
let energyNodeSpawnInterval = 2000; // 2 seconds between spawns
let maxEnergyNodes = 15; // Maximum nodes on screen

function spawnEnergyNode() {
    if (energyNodes.length >= maxEnergyNodes) {
        return; // Don't spawn if we have too many
    }
    
    if (!window.drone) return; // Need drone reference
    
    // Spawn ahead of the drone in a random position
    const spawnDistance = 200 + Math.random() * 400; // 200-600 pixels ahead
    const spawnRadius = 150; // Random radius around the forward direction
    
    // Calculate spawn position based on drone's direction
    const directions = [
        { x: 1, y: 0 },   // Right
        { x: 0, y: 1 },   // Down
        { x: -1, y: 0 },  // Left
        { x: 0, y: -1 }   // Up
    ];
    
    const dir = directions[window.drone.direction];
    const baseX = window.drone.x + dir.x * spawnDistance;
    const baseY = window.drone.y + dir.y * spawnDistance;
    
    // Add random offset
    const offsetAngle = Math.random() * Math.PI * 2;
    const offsetDistance = Math.random() * spawnRadius;
    const spawnX = baseX + Math.cos(offsetAngle) * offsetDistance;
    const spawnY = baseY + Math.sin(offsetAngle) * offsetDistance;
      // Keep within reasonable screen bounds (with wrapping)
    const finalX = ((spawnX % window.GAME_WIDTH) + window.GAME_WIDTH) % window.GAME_WIDTH;
    const finalY = ((spawnY % window.GAME_HEIGHT) + window.GAME_HEIGHT) % window.GAME_HEIGHT;
    
    // Get current zone level for the energy node
    const currentZone = window.gameState ? window.gameState.currentZone : 1;
    
    energyNodes.push(new EnergyNode(finalX, finalY, currentZone));
    lastEnergyNodeSpawn = performance.now();
}

function updateEnergyNodes(deltaTime) {
    // Spawn new energy nodes
    const now = performance.now();
    if (now - lastEnergyNodeSpawn > energyNodeSpawnInterval) {
        spawnEnergyNode();
    }
    
    // Update existing energy nodes
    energyNodes.forEach(node => {
        node.update(deltaTime);
    });
    
    // Remove completed energy nodes
    energyNodes = energyNodes.filter(node => !node.isReadyForRemoval());
}

function renderEnergyNodes(ctx) {
    energyNodes.forEach(node => {
        node.render(ctx);
    });
}

function resetEnergyNodes() {
    energyNodes = [];
    lastEnergyNodeSpawn = performance.now();
    console.log('🔄 Energy nodes reset');
}

function checkEnergyCollisions(drone) {
    if (!drone) return 0;
    
    let totalEnergyCollected = 0;
    
    // Check collision between drone and each energy node
    for (let i = energyNodes.length - 1; i >= 0; i--) {
        const node = energyNodes[i];
        
        if (!node.isCollected) {
            const dx = node.x - drone.x;
            const dy = node.y - drone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);            if (distance < node.size + drone.size) {
                totalEnergyCollected += node.value;
                node.isCollected = true;
                
                // Removed visual flash feedback for cleaner gameplay
                // if (window.createScreenFlash) {
                //     window.createScreenFlash(node.color || '#00ff00', 0.15, 100);
                // }
            }
        }
    }
      return totalEnergyCollected;
}

// Expose functions to global scope
window.updateEnergyNodes = updateEnergyNodes;
window.renderEnergyNodes = renderEnergyNodes;
window.resetEnergyNodes = resetEnergyNodes;
window.checkEnergyCollisions = checkEnergyCollisions;
