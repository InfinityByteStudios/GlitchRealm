// ByteSurge: Infinite Loop - Corruption System
const CorruptionSystem = {    init: function() {
        this.baseSpawnInterval = 3000;
        this.currentSpawnInterval = 3000;
        this.spawnTimer = 0;
        this.difficultyMultiplier = 1;
        this.zones = [];
        this.maxZonesBase = 3;
        this.currentMaxZones = 3;
        
        // Dynamic zone management
        this.minZones = 3;
        this.maxZones = 7;
        this.zoneLifespan = 60000; // 60 seconds in milliseconds
        
        // Zone progression scaling
        this.speedMultiplier = 1;
        this.sizeMultiplier = 1;
        this.spawnRateMultiplier = 1;
        
        // Warning system
        this.showWarnings = false;
        this.warningRange = 150;
        this.warnings = [];
        
        // Fast corruption system
        this.fastCorruptionChance = 0.15; // 15% chance for fast corruption
        this.fastCorruptionMultiplier = 2.5; // 2.5x faster than normal
        
        return this;
    },    update: function(deltaTime) {
        // Update existing zones
        this.zones.forEach(zone => zone.update(deltaTime));
        
        // Update warnings if detection is enabled
        if (this.showWarnings) {
            this.updateWarnings();
        }
        
        // Check harvester collisions
        this.checkHarvesterCollisions();
          // Remove zones that are off-screen, inactive, or expired
        this.zones = this.zones.filter(zone => {
            if (zone.isActive === false) return false;
            
            // Check lifespan
            const isExpired = performance.now() - zone.spawnTime > this.zoneLifespan;
            
            // Handle splitter behavior when zone expires or is destroyed
            if (isExpired && zone.blobType === 'SPLITTER' && !zone.hasSplit && zone.generation < zone.maxGeneration) {
                this.handleSplitterDestruction(zone);
            }
            
            if (isExpired) {
                return false;
            }
            
            // Check if zone is off screen (with margin)
            const margin = 200;
            if (zone.x < -margin || 
                zone.x > window.GAME_WIDTH + margin || 
                zone.y < -margin || 
                zone.y > window.GAME_HEIGHT + margin) {
                return false;
            }
            
            return true;
        });
        
        // Maintain zone count between minZones and maxZones
        this.spawnTimer += deltaTime;
        const shouldSpawn = this.zones.length < this.minZones || 
                           (this.zones.length < this.maxZones && this.spawnTimer >= this.currentSpawnInterval);
        
        if (shouldSpawn) {
            this.spawnNewZone();
            this.spawnTimer = 0;
            
            // Adjust spawn interval based on current zone count
            const zoneRatio = this.zones.length / this.maxZones;
            this.currentSpawnInterval = Math.max(
                1000, // Minimum 1 second between spawns
                this.baseSpawnInterval * (0.5 + zoneRatio * 0.5) // Slower spawning when more zones exist
            );        }
    },
    
    initializeBlobTypeProperties: function(zone) {
        if (!zone.blobTypeData) return;
        
        switch (zone.blobType) {
            case 'JAMMER':
                zone.jamRadius = zone.blobTypeData.jamRadius;
                zone.jamDuration = zone.blobTypeData.jamDuration;
                zone.jammedHarvesters = new Set();
                zone.jamTimer = 0;
                break;
                
            case 'SPRINTER':
                zone.burstCooldown = zone.blobTypeData.burstCooldown;
                zone.burstDuration = zone.blobTypeData.burstDuration;
                zone.burstTimer = 0;
                zone.burstState = 'idle'; // 'idle', 'charging', 'bursting'
                zone.burstDirection = { x: 0, y: 0 };
                zone.originalSpeed = zone.speed;
                break;
                
            case 'SPLITTER':
                zone.splitCount = zone.blobTypeData.splitCount;
                zone.splitSize = zone.blobTypeData.splitSize;
                zone.generation = zone.generation || 0;
                zone.maxGeneration = 2; // Prevent infinite splitting
                zone.hasSplit = false;
                break;
        }
    },
    
    spawnNewZone: function() {
        // Spawn from the right side of the screen
        const x = window.GAME_WIDTH + 50;
        const y = Math.random() * (window.GAME_HEIGHT - 100) + 50;
        
        const zone = new CorruptionZone(x, y);
          // Select blob type using the blob types system
        if (window.selectRandomBlobType) {
            zone.blobType = window.selectRandomBlobType();
            zone.blobTypeData = window.CorruptionBlobTypes[zone.blobType];
            
            // Apply blob type modifiers
            if (zone.blobTypeData) {
                zone.speed *= zone.blobTypeData.speed;
                zone.huntingSpeed *= zone.blobTypeData.speed;
                zone.baseSize *= zone.blobTypeData.size;
                
                // Initialize type-specific properties
                this.initializeBlobTypeProperties(zone);
            }
        } else {
            // Fallback if blob types not loaded
            zone.blobType = 'HUNTER';
            zone.blobTypeData = { name: 'Hunter', color: '#ff0000', speed: 1.0, size: 1.0 };
        }
        
        // Add varied sizes (0.7x to 1.4x normal size)
        const sizeVariation = 0.7 + Math.random() * 0.7; // Random between 0.7 and 1.4
        zone.baseSize *= sizeVariation;
        zone.sizeVariation = sizeVariation;
        
        // Determine if this should be a fast corruption zone (legacy system - now handled by blob types)
        const isFastCorruption = Math.random() < this.fastCorruptionChance;
        
        if (isFastCorruption && !zone.blobType) {
            zone.isFastCorruption = true;
            zone.speed *= this.fastCorruptionMultiplier;
            zone.huntingSpeed *= this.fastCorruptionMultiplier;
            zone.fastCorruptionMultiplier = this.fastCorruptionMultiplier;
        }
        
        // Apply current difficulty modifiers
        zone.huntingSpeed *= this.speedMultiplier;
        zone.baseSize *= this.sizeMultiplier;
          this.zones.push(zone);
    },
    
    handleSplitterDestruction: function(splitterZone) {
        splitterZone.hasSplit = true;
        
        // Create smaller corruption zones
        for (let i = 0; i < splitterZone.splitCount; i++) {
            const angle = (i / splitterZone.splitCount) * Math.PI * 2;
            const distance = 40 + Math.random() * 20; // 40-60 pixels away
            
            const newX = splitterZone.x + Math.cos(angle) * distance;
            const newY = splitterZone.y + Math.sin(angle) * distance;
            
            // Only spawn if within bounds
            if (newX > 0 && newX < window.GAME_WIDTH && 
                newY > 0 && newY < window.GAME_HEIGHT) {
                
                const splitZone = new CorruptionZone(newX, newY);
                
                // Make it smaller and inherit some properties
                splitZone.baseSize = splitterZone.baseSize * splitterZone.splitSize;
                splitZone.speed = splitterZone.speed * 1.2; // Slightly faster
                splitZone.huntingSpeed = splitZone.speed;
                splitZone.generation = (splitterZone.generation || 0) + 1;
                
                // Smaller splits are hunters, not splitters (to prevent infinite splitting)
                splitZone.blobType = 'HUNTER';
                splitZone.blobTypeData = window.CorruptionBlobTypes['HUNTER'];
                
                this.zones.push(splitZone);
            }
        }
          // Visual feedback for splitting
        if (window.createScreenFlash) {
            window.createScreenFlash('#ff44ff', 0.25, 200);
        }
    },
    
    // Debug function to test specific corruption types
    spawnSpecificType: function(type) {
        const x = window.GAME_WIDTH + 50;
        const y = Math.random() * (window.GAME_HEIGHT - 100) + 50;
        
        const zone = new CorruptionZone(x, y);
        
        if (window.CorruptionBlobTypes[type]) {
            zone.blobType = type;
            zone.blobTypeData = window.CorruptionBlobTypes[type];
            
            // Apply blob type modifiers
            zone.speed *= zone.blobTypeData.speed;
            zone.huntingSpeed *= zone.blobTypeData.speed;
            zone.baseSize *= zone.blobTypeData.size;
            
            // Initialize type-specific properties
            this.initializeBlobTypeProperties(zone);
        }
        
        this.zones.push(zone);
        console.log(`🧪 Debug spawned ${type} corruption at (${x}, ${y})`);
    },

    increaseZoneDifficulty: function(zoneLevel) {
        // Scale various difficulty factors based on zone level
        this.speedMultiplier = 1 + (zoneLevel - 1) * 0.2; // 20% faster per zone
        this.sizeMultiplier = 1 + (zoneLevel - 1) * 0.1; // 10% larger per zone
        this.spawnRateMultiplier = 1 + (zoneLevel - 1) * 0.15; // 15% faster spawning per zone
        
        // Update maximum concurrent zones
        this.currentMaxZones = Math.min(
            this.maxZonesBase + Math.floor((zoneLevel - 1) / 2), // Add 1 max zone every 2 levels
            8 // Hard cap at 8 zones
        );
        
        // Update spawn interval
        this.baseSpawnInterval = Math.max(
            1000, // Minimum 1 second
            3000 * Math.pow(0.9, zoneLevel - 1) // 10% faster per zone
        );
        
        // Update existing zones with new speed
        this.zones.forEach(zone => {
            zone.huntingSpeed = zone.speed * this.speedMultiplier;
        });
    },
      checkCollisions: function(drone) {
        if (!drone) return false;
        
        for (const zone of this.zones) {
            if (zone.checkCollision(drone)) {
                return true;
            }
        }
        
        return false;
    },
    
    checkHarvesterCollisions: function() {
        if (!window.harvesterSystem || !window.harvesterSystem.harvesters) return;
        
        for (const zone of this.zones) {
            const collision = zone.checkHarvesterCollision();
            if (collision) {
                // Destroy the harvester
                const { harvester, index } = collision;
                window.harvesterSystem.harvesters.splice(index, 1);
                
                // Visual feedback for harvester destruction
                if (window.createScreenFlash) {
                    window.createScreenFlash('#ff4400', 0.3, 200);
                }
                
                // Spawn destruction particles at harvester location
                this.spawnDestructionParticles(harvester.x, harvester.y);
                
                // Remove the corruption zone that consumed the harvester (optional balance choice)
                zone.isActive = false;
                
                break; // Only one harvester per frame to avoid mass destruction
            }
        }
    },
    
    spawnDestructionParticles: function(x, y) {
        // Create destruction effect particles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            
            // These particles could be handled by a global particle system
            // For now, we'll use the screen flash as visual feedback
        }    },
    
    updateWarnings: function() {
        if (!window.drone) return;
        
        this.warnings = [];
        
        // Check each corruption zone for proximity warnings
        this.zones.forEach(zone => {
            const dx = zone.x - window.drone.x;
            const dy = zone.y - window.drone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.warningRange && zone.x > window.drone.x) {
                // Calculate warning intensity based on distance and speed
                const intensity = Math.max(0, 1 - (distance / this.warningRange));
                const urgency = zone.isFastCorruption ? 'critical' : distance < this.warningRange * 0.5 ? 'high' : 'medium';
                
                this.warnings.push({
                    x: zone.x,
                    y: zone.y,
                    distance: distance,
                    intensity: intensity,
                    urgency: urgency,
                    isFast: zone.isFastCorruption || false,
                    zone: zone
                });
            }
        });
        
        // Sort warnings by urgency and distance
        this.warnings.sort((a, b) => {
            if (a.urgency === 'critical' && b.urgency !== 'critical') return -1;
            if (b.urgency === 'critical' && a.urgency !== 'critical') return 1;
            return a.distance - b.distance;
        });
    },
    
    renderWarnings: function(ctx) {
        if (!this.showWarnings || !window.drone) return;
        
        this.warnings.forEach(warning => {
            // Draw warning indicator on screen edge
            const screenEdgeX = window.GAME_WIDTH - 30;
            const indicatorY = warning.y;
            
            // Warning colors based on urgency
            let warningColor, warningAlpha;
            switch (warning.urgency) {
                case 'critical':
                    warningColor = '#ff0066';
                    warningAlpha = 0.9;
                    break;
                case 'high':
                    warningColor = '#ff4400';
                    warningAlpha = 0.7;
                    break;
                default:
                    warningColor = '#ffaa00';
                    warningAlpha = 0.5;
            }
            
            // Pulsing effect for critical warnings
            if (warning.urgency === 'critical') {
                const pulse = 0.7 + Math.sin(performance.now() * 0.01) * 0.3;
                warningAlpha *= pulse;
            }
            
            ctx.save();
            ctx.globalAlpha = warningAlpha * warning.intensity;
            
            // Draw warning triangle
            ctx.fillStyle = warningColor;
            ctx.beginPath();
            ctx.moveTo(screenEdgeX, indicatorY - 8);
            ctx.lineTo(screenEdgeX + 12, indicatorY);
            ctx.lineTo(screenEdgeX, indicatorY + 8);
            ctx.closePath();
            ctx.fill();
            
            // Draw warning line to actual threat
            ctx.strokeStyle = warningColor;
            ctx.lineWidth = warning.isFast ? 3 : 2;
            ctx.setLineDash(warning.isFast ? [5, 5] : []);
            ctx.globalAlpha = warningAlpha * 0.3;
            ctx.beginPath();
            ctx.moveTo(screenEdgeX, indicatorY);
            ctx.lineTo(warning.x, warning.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.restore();
        });
    },    render: function(ctx) {
        // Render warnings first (behind corruption zones)
        this.renderWarnings(ctx);
        
        // Render all active corruption zones
        this.zones.forEach(zone => {
            if (zone.isActive) {
                zone.draw(ctx);
            }
        });
        
        // Draw all labels on top to ensure they're always visible
        this.zones.forEach(zone => {
            if (zone.isActive) {
                zone.drawTypeLabel(ctx);
            }
        });
    },
    
    reset: function() {
        this.zones = [];
        this.spawnTimer = 0;
        this.currentSpawnInterval = this.baseSpawnInterval;
        this.speedMultiplier = 1;
        this.sizeMultiplier = 1;
        this.spawnRateMultiplier = 1;
        this.currentMaxZones = this.maxZonesBase;
    }
};

// Initialize the corruption system globally
window.corruptionSystem = Object.create(CorruptionSystem).init();
console.log('🔥 Corruption system initialized with methods:', Object.keys(window.corruptionSystem.__proto__));

// Global function to render corruption zones
function renderCorruptionZones(ctx) {
    if (window.corruptionSystem && window.corruptionSystem.render) {
        window.corruptionSystem.render(ctx);
    }
}

// Global function to reset corruption zones
function resetCorruptionZones() {
    if (window.corruptionSystem && window.corruptionSystem.reset) {
        window.corruptionSystem.reset();
    }
}

// Expose functions to global scope
window.renderCorruptionZones = renderCorruptionZones;
window.resetCorruptionZones = resetCorruptionZones;
