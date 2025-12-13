// ByteSurge: Infinite Loop - Enhanced Corruption System with Blob Types
// Different types of corruption blobs with unique behaviors

// ===== CORRUPTION BLOB TYPES =====
const CorruptionBlobTypes = {
    HUNTER: {
        name: 'Hunter',
        description: 'Standard corruption blob that hunts players and harvesters',
        color: '#ff4444',
        speed: 1.0,
        size: 1.0,
        spawnWeight: 60, // 60% chance
        icon: '💀'
    },
    JAMMER: {
        name: 'Jammer',
        description: 'Disables harvesters in a large radius',
        color: '#ff8844',
        speed: 0.7,
        size: 1.2,
        spawnWeight: 20, // 20% chance
        icon: '📶',
        jamRadius: 120,
        jamDuration: 5000 // 5 seconds
    },
    SPRINTER: {
        name: 'Sprinter',
        description: 'Fast corruption blob that moves in bursts',
        color: '#ff4488',
        speed: 1.8,
        size: 0.8,
        spawnWeight: 15, // 15% chance
        icon: '⚡',
        burstCooldown: 3000,
        burstDuration: 1500
    },
    SPLITTER: {
        name: 'Splitter',
        description: 'Splits into smaller blobs when destroyed',
        color: '#ff44ff',
        speed: 0.8,
        size: 1.3,
        spawnWeight: 5, // 5% chance
        icon: '💥',
        splitCount: 3,
        splitSize: 0.6
    }
};

// ===== BLOB TYPE SELECTION =====
function selectRandomBlobType() {
    const totalWeight = Object.values(CorruptionBlobTypes).reduce((sum, type) => sum + type.spawnWeight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [key, type] of Object.entries(CorruptionBlobTypes)) {
        random -= type.spawnWeight;
        if (random <= 0) {
            return key;
        }
    }
    
    return 'HUNTER'; // Fallback
}

// ===== ENHANCED CORRUPTION RENDERING =====
function renderCorruptionBlobWithType(ctx, blob) {
    if (!blob.type || !blob.typeData) {
        // Fallback to original rendering
        return renderOriginalCorruption(ctx, blob);
    }
    
    ctx.save();
    
    // Move to corruption blob center
    ctx.translate(blob.x, blob.y);
    ctx.rotate(blob.rotationAngle);
    
    // Type-specific visual effects
    renderTypeSpecificEffects(ctx, blob);
    
    // Main blob rendering with type colors
    renderBlobWithTypeColor(ctx, blob);
    
    // Type-specific overlays
    renderTypeOverlay(ctx, blob);
    
    ctx.restore();
}

function renderTypeSpecificEffects(ctx, blob) {
    switch(blob.type) {
        case 'JAMMER':
            // Render jamming radius indicator
            if (blob.jammedHarvesters && blob.jammedHarvesters.size > 0) {
                ctx.save();
                ctx.globalAlpha = 0.2;
                ctx.strokeStyle = blob.typeData.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 5]);
                ctx.beginPath();
                ctx.arc(0, 0, blob.jamRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            break;
            
        case 'SPRINTER':
            // Render charging/bursting effects
            if (blob.burstState === 'charging') {
                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, blob.currentSize + 10, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else if (blob.burstState === 'bursting') {
                // Add motion blur effect
                ctx.save();
                ctx.globalAlpha = 0.3;
                for (let i = 1; i <= 3; i++) {
                    ctx.fillStyle = blob.typeData.color;
                    ctx.beginPath();
                    ctx.arc(-blob.burstDirection.x * i * 10, -blob.burstDirection.y * i * 10, 
                           blob.currentSize * (1 - i * 0.2), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
            break;
            
        case 'SPLITTER':
            // Render potential split indicators
            if (blob.generation < blob.maxGeneration) {
                const splitCount = blob.typeData.splitCount;
                for (let i = 0; i < splitCount; i++) {
                    const angle = (i / splitCount) * Math.PI * 2;
                    const distance = blob.currentSize * 0.7;
                    const x = Math.cos(angle) * distance;
                    const y = Math.sin(angle) * distance;
                    
                    ctx.save();
                    ctx.globalAlpha = 0.4;
                    ctx.fillStyle = blob.typeData.color;
                    ctx.beginPath();
                    ctx.arc(x, y, blob.currentSize * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
            break;
    }
}

function renderBlobWithTypeColor(ctx, blob) {
    const segments = 12;
    const flickerIntensity = 0.3 + Math.sin(blob.flickerPhase) * 0.2;
    
    // Parse color
    const color = blob.typeData.color;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    // Outer glow with type color
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, blob.currentSize * 1.5);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${flickerIntensity * 0.1})`);
    gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${flickerIntensity * 0.05})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, blob.currentSize * 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Main wavy blob with type color
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const waveOffset = Math.sin(angle * 3 + blob.waveOffset) * 3;
        const radius = blob.currentSize + waveOffset;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    
    // Fill with type-specific gradient
    const mainGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, blob.currentSize);
    mainGradient.addColorStop(0, `rgba(${r + 40}, ${g + 40}, ${b + 40}, ${flickerIntensity * 0.8})`);
    mainGradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${flickerIntensity * 0.6})`);
    mainGradient.addColorStop(1, `rgba(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}, ${flickerIntensity * 0.4})`);
    
    ctx.fillStyle = mainGradient;
    ctx.fill();
}

function renderTypeOverlay(ctx, blob) {
    // Render type icon if close enough to drone
    if (window.drone) {
        const dx = blob.x - window.drone.x;
        const dy = blob.y - window.drone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150 && blob.type !== 'HUNTER') { // Show icon for special types when close
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ffffff';
            ctx.font = `${Math.floor(blob.currentSize * 0.4)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(blob.typeData.icon, 0, 0);
            ctx.restore();
        }
    }
}

function renderOriginalCorruption(ctx, blob) {
    // Fallback rendering function when enhanced rendering is not available
    if (blob.renderOriginal) {
        blob.renderOriginal(ctx);
    } else {
        // Basic fallback rendering
        ctx.save();
        ctx.translate(blob.x, blob.y);
        
        const flickerIntensity = 0.3 + Math.sin(blob.flickerPhase || 0) * 0.2;
        
        // Simple blob with type color if available
        const color = blob.typeData ? blob.typeData.color : '#ff4444';
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${flickerIntensity * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, 0, blob.currentSize || blob.baseSize || 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Export for integration
window.CorruptionBlobTypes = CorruptionBlobTypes;
window.selectRandomBlobType = selectRandomBlobType;
window.renderCorruptionBlobWithType = renderCorruptionBlobWithType;
window.renderOriginalCorruption = renderOriginalCorruption;

