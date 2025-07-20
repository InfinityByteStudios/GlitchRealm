// ByteSurge: Infinite Loop - Corruption Zone Class
// Individual corruption zone entities that hunt the player

class CorruptionZone {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseSize = 15 + Math.random() * 10; // 15-25px radius
        this.currentSize = this.baseSize;
        this.speed = 20 + Math.random() * 30; // 20-50 px/s
          // Visual effects
        this.spawnTime = performance.now();
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.flickerPhase = Math.random() * Math.PI * 2;
        this.rotationAngle = 0;
        this.waveOffset = Math.random() * Math.PI * 2;
          // Movement behavior
        this.targetX = 0;
        this.targetY = 0;
        this.huntingSpeed = this.speed;
          // Smart targeting behavior
        this.targetType = 'drone'; // 'drone' or 'harvester'
        this.targetHarvester = null;
        this.retargetTimer = 0;
        this.retargetInterval = 2000 + Math.random() * 3000; // 2-5 seconds
        this.harvesterAttractRadius = 200; // Distance within which harvesters attract corruption
        
        // Fast corruption properties
        this.isFastCorruption = false;
        this.fastCorruptionMultiplier = 1;
        
        // Particle effects
        this.particles = [];
        this.maxParticles = 12;
        this.isActive = true;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 1000;
        
        // Update visual effects
        this.pulsePhase += deltaTime * 0.003;
        this.flickerPhase += deltaTime * 0.008; // Fast flicker
        this.rotationAngle += deltaTime * 0.001;
        this.waveOffset += deltaTime * 0.005;
          // Pulsing size animation
        this.currentSize = this.baseSize + Math.sin(this.pulsePhase) * 3;
        
        // Update targeting timer
        this.retargetTimer += deltaTime;
        
        // Smart targeting logic - periodically decide between drone and harvester
        if (this.retargetTimer >= this.retargetInterval) {
            this.chooseTarget();
            this.retargetTimer = 0;
            this.retargetInterval = 2000 + Math.random() * 3000; // Random 2-5 seconds
        }
          // Move toward current target
        this.moveTowardTarget(dt);
        
        // Handle blob type specific behaviors
        this.updateBlobTypeBehavior(dt);
        
        // Update particles
        this.updateParticles(deltaTime);// Spawn corruption particles occasionally (faster for fast corruption)
        const particleSpawnRate = this.isFastCorruption ? 0.08 : 0.05;
        if (Math.random() < particleSpawnRate && this.particles.length < this.maxParticles) {
            this.spawnCorruptionParticle();
        }    }
    
    updateBlobTypeBehavior(deltaTime) {
        if (!this.blobType || !this.blobTypeData) return;
        
        switch (this.blobType) {
            case 'JAMMER':
                this.updateJammerBehavior(deltaTime);
                break;
                
            case 'SPRINTER':
                this.updateSprinterBehavior(deltaTime);
                break;
                
            case 'SPLITTER':
                this.updateSplitterBehavior(deltaTime);
                break;
        }
    }
    
    updateJammerBehavior(deltaTime) {
        // Jammer disables harvesters within radius
        if (window.harvesterSystem && window.harvesterSystem.harvesters) {
            window.harvesterSystem.harvesters.forEach(harvester => {
                const dx = harvester.x - this.x;
                const dy = harvester.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= this.jamRadius) {
                    if (!this.jammedHarvesters.has(harvester)) {
                        this.jammedHarvesters.add(harvester);
                        harvester.isJammed = true;
                        harvester.jammedBy = this;
                    }
                } else if (this.jammedHarvesters.has(harvester)) {
                    this.jammedHarvesters.delete(harvester);
                    harvester.isJammed = false;
                    harvester.jammedBy = null;
                }
            });
        }
    }
    
    updateSprinterBehavior(deltaTime) {
        this.burstTimer += deltaTime;
        
        switch (this.burstState) {
            case 'idle':
                if (this.burstTimer >= this.burstCooldown) {
                    this.burstState = 'charging';
                    this.burstTimer = 0;
                }
                break;
                
            case 'charging':
                if (this.burstTimer >= 500) { // 0.5 second charge
                    this.burstState = 'bursting';
                    this.burstTimer = 0;
                    
                    // Calculate burst direction toward target
                    const dx = this.targetX - this.x;
                    const dy = this.targetY - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        this.burstDirection.x = dx / distance;
                        this.burstDirection.y = dy / distance;
                    }
                    
                    // Increase speed for burst
                    this.speed = this.originalSpeed * 3;
                    this.huntingSpeed = this.speed;
                }
                break;
                
            case 'bursting':
                if (this.burstTimer >= this.burstDuration) {
                    this.burstState = 'idle';
                    this.burstTimer = 0;
                    this.speed = this.originalSpeed;
                    this.huntingSpeed = this.speed;
                }
                break;
        }
    }
    
    updateSplitterBehavior(deltaTime) {
        // Splitter behavior is handled when the zone is destroyed
        // This is just a placeholder for future enhancements
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx * (deltaTime / 1000);
            particle.y += particle.vy * (deltaTime / 1000);
            particle.life -= deltaTime;
            particle.alpha = Math.max(0, particle.life / particle.maxLife);
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    spawnCorruptionParticle() {
        const angle = Math.random() * Math.PI * 2;
        const speed = 10 + Math.random() * 20;
        const life = 1000 + Math.random() * 2000;
        
        this.particles.push({
            x: this.x + Math.cos(angle) * this.currentSize * 0.8,
            y: this.y + Math.sin(angle) * this.currentSize * 0.8,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: life,
            maxLife: life,
            alpha: 1,
            size: 1 + Math.random() * 2
        });    }
    
    chooseTarget() {
        // Get all available harvesters
        const harvesters = window.harvesterSystem ? window.harvesterSystem.harvesters : [];
        
        if (harvesters.length === 0 || !window.drone) {
            // No harvesters available, target drone
            this.targetType = 'drone';
            this.targetHarvester = null;
            return;
        }
        
        // Find closest harvester within attraction radius
        let closestHarvester = null;
        let closestDistance = Infinity;
        
        harvesters.forEach(harvester => {
            const dx = harvester.x - this.x;
            const dy = harvester.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.harvesterAttractRadius && distance < closestDistance) {
                closestHarvester = harvester;
                closestDistance = distance;
            }
        });
        
        // Decision logic: 60% chance to target harvester if one is nearby, otherwise target drone
        if (closestHarvester && Math.random() < 0.6) {
            this.targetType = 'harvester';
            this.targetHarvester = closestHarvester;
        } else {
            this.targetType = 'drone';
            this.targetHarvester = null;
        }
    }
    
    moveTowardTarget(dt) {
        // Determine target position based on current target type
        if (this.targetType === 'harvester' && this.targetHarvester) {
            // Check if harvester still exists
            const harvesters = window.harvesterSystem ? window.harvesterSystem.harvesters : [];
            if (!harvesters.includes(this.targetHarvester)) {
                // Harvester was destroyed/removed, switch to drone
                this.targetType = 'drone';
                this.targetHarvester = null;
            } else {
                this.targetX = this.targetHarvester.x;
                this.targetY = this.targetHarvester.y;
            }
        }
        
        if (this.targetType === 'drone' && window.drone) {
            this.targetX = window.drone.x;
            this.targetY = window.drone.y;
        }
        
        // Move toward target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
            // Normalize direction and apply speed
            // Harvesters are slightly slower targets (80% speed) to give player a chance
            const speedModifier = this.targetType === 'harvester' ? 0.8 : 1.0;
            const moveSpeed = this.huntingSpeed * speedModifier;
            
            this.x += (dx / distance) * moveSpeed * dt;
            this.y += (dy / distance) * moveSpeed * dt;
        }
    }    checkCollision(drone) {
        if (!drone || drone.isInvulnerable) return false;
        
        const dx = this.x - drone.x;
        const dy = this.y - drone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (this.currentSize + drone.size * 0.8);
    }
    
    checkHarvesterCollision() {
        if (!window.harvesterSystem || !window.harvesterSystem.harvesters) return null;
        
        for (let i = 0; i < window.harvesterSystem.harvesters.length; i++) {
            const harvester = window.harvesterSystem.harvesters[i];
            const dx = this.x - harvester.x;
            const dy = this.y - harvester.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (this.currentSize + harvester.size)) {
                return { harvester, index: i };
            }
        }
        
        return null;
    }    draw(ctx) {
        // Use enhanced blob type rendering if available
        if (this.blobType && window.renderCorruptionBlobWithType) {
            // Prepare blob data for enhanced rendering
            const blobData = {
                x: this.x,
                y: this.y,
                currentSize: this.currentSize,
                baseSize: this.baseSize,
                rotationAngle: this.rotationAngle,
                flickerPhase: this.flickerPhase,
                waveOffset: this.waveOffset,
                type: this.blobType,
                typeData: this.blobTypeData,
                jamRadius: this.jamRadius,
                jammedHarvesters: this.jammedHarvesters,
                burstState: this.burstState,
                burstDirection: this.burstDirection,
                generation: this.generation,
                maxGeneration: this.maxGeneration
            };
            
            window.renderCorruptionBlobWithType(ctx, blobData);
            return;
        }
        
        // Fallback to original rendering for non-blob-type zones
        this.drawOriginal(ctx);
    }
      drawTypeLabel(ctx) {
        ctx.save();
        
        // Always draw a label for debugging
        let labelText = '';
        let labelColor = '#ffffff';
        
        if (this.blobType && this.blobTypeData) {
            labelText = this.blobTypeData.name;
            labelColor = this.blobTypeData.color;
        } else if (this.isFastCorruption) {
            labelText = 'Fast';
            labelColor = '#ff0066';
        } else {
            labelText = 'Hunter';
            labelColor = '#ff0000';
        }
        
        // Make text very visible
        ctx.fillStyle = labelColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Position label well above the corruption zone
        const labelY = this.y - this.currentSize - 20;
        
        // Draw text with strong outline
        ctx.strokeText(labelText, this.x, labelY);
        ctx.fillText(labelText, this.x, labelY);
        
        ctx.restore();
    }
    
    drawOriginal(ctx) {
        // Calculate lifespan progress (for visual effects)
        const lifespan = 60000; // 60 seconds
        const age = performance.now() - this.spawnTime;
        const lifespanProgress = Math.min(age / lifespan, 1);
        const isNearExpiry = lifespanProgress > 0.8; // Last 20% of life
        
        // Draw particles first (behind the corruption zone)
        this.particles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.alpha * 0.4;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });        // Calculate visual effects
        const flicker = 0.7 + Math.sin(this.flickerPhase) * 0.3;
        const waveStrength = 3;
        
        // Aging effects - corruption becomes more unstable near expiry
        let baseAlpha = 0.6;
        if (isNearExpiry) {
            // Increase instability as it approaches expiry
            const instability = (lifespanProgress - 0.8) * 5; // 0 to 1 over last 20%
            baseAlpha *= (0.8 + Math.sin(performance.now() * 0.02) * 0.2 * instability);
        }
        
        // Different color tint based on corruption type
        const isTargetingHarvester = this.targetType === 'harvester' && this.targetHarvester;
        let baseColor;
        
        if (this.isFastCorruption) {
            baseColor = '#ff0066'; // Bright magenta for fast corruption
        } else if (isTargetingHarvester) {
            baseColor = '#ff4400'; // Orange when hunting harvesters
        } else {
            baseColor = '#ff0000'; // Standard red
        }
        
        // Aging color shift - corruption becomes more purple/dark as it ages
        if (isNearExpiry) {
            const ageShift = (lifespanProgress - 0.8) * 5;
            if (this.isFastCorruption) {
                baseColor = `rgb(${Math.floor(255 - ageShift * 50)}, 0, ${Math.floor(102 + ageShift * 50)})`;
            } else if (isTargetingHarvester) {
                baseColor = `rgb(${Math.floor(255 - ageShift * 50)}, ${Math.floor(68 - ageShift * 30)}, 0)`;
            } else {
                baseColor = `rgb(${Math.floor(255 - ageShift * 80)}, 0, ${Math.floor(ageShift * 60)})`;
            }
        }
        
        // Enhanced flicker for fast corruption
        const flickerSpeed = this.isFastCorruption ? 0.015 : 0.008;
        this.flickerPhase += flickerSpeed;
        
        // Draw wavy blob
        ctx.save();
        ctx.globalAlpha = baseAlpha * flicker;
        ctx.fillStyle = baseColor;
        
        ctx.beginPath();
        for (let i = 0; i < 360; i += 10) {
            const angle = (i * Math.PI) / 180;
            const wave = Math.sin(angle * 8 + this.waveOffset) * waveStrength;
            const radius = this.currentSize + wave;
            
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();        // Draw glow effect
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.currentSize * 2
        );
        
        if (this.isFastCorruption) {
            gradient.addColorStop(0, 'rgba(255, 0, 102, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 0, 102, 0)');
        } else if (isTargetingHarvester) {
            gradient.addColorStop(0, 'rgba(255, 68, 0, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 68, 0, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        }
          ctx.globalAlpha = 0.3 * flicker;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentSize * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw speed trail for fast corruption
        if (this.isFastCorruption) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = baseColor;
            
            // Draw trailing effect
            for (let i = 1; i <= 3; i++) {
                const trailAlpha = 0.2 / i;
                const trailSize = this.currentSize * (1 - i * 0.15);
                const trailOffset = i * 8;
                
                ctx.globalAlpha = trailAlpha * flicker;
                ctx.beginPath();
                ctx.arc(this.x - trailOffset, this.y, trailSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}

// Make CorruptionZone available globally
window.CorruptionZone = CorruptionZone;
