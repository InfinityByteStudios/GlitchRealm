// Visual Effects Manager for NeuroCore: Byte Wars
class VisualEffects {
    constructor() {
        // Screen shake system
        this.screenShake = {
            intensity: 0,
            duration: 0,
            timer: 0,
            offsetX: 0,
            offsetY: 0
        };
        
        // Particle systems
        this.hitSparks = [];
        this.damageNumbers = [];
        
        // Effect pools for performance
        this.sparkPool = [];
        this.damagePool = [];
        
        // Settings
        this.maxSparks = 50;
        this.maxDamageNumbers = 20;
        
        console.log('🎯 Visual Effects Manager initialized');
    }
    
    update(deltaTime) {
        this.updateScreenShake(deltaTime);
        this.updateHitSparks(deltaTime);
        this.updateDamageNumbers(deltaTime);
    }
    
    render(ctx) {
        // Reset alpha at start
        ctx.globalAlpha = 1.0;
        
        // Render effects
        this.renderHitSparks(ctx);
        ctx.globalAlpha = 1.0; // Reset between effects
        
        this.renderDamageNumbers(ctx);
        ctx.globalAlpha = 1.0; // Reset after all effects
    }
    
    // Screen Shake System
    addScreenShake(intensity, duration) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
        this.screenShake.duration = Math.max(this.screenShake.duration, duration);
        this.screenShake.timer = this.screenShake.duration;
    }
    
    updateScreenShake(deltaTime) {
        if (this.screenShake.timer <= 0) {
            this.screenShake.offsetX = 0;
            this.screenShake.offsetY = 0;
            return;
        }
        
        this.screenShake.timer -= deltaTime;
        
        // Calculate shake offset with decay
        const progress = this.screenShake.timer / this.screenShake.duration;
        const currentIntensity = this.screenShake.intensity * progress;
        
        // Random shake direction
        const angle = Math.random() * Math.PI * 2;
        this.screenShake.offsetX = Math.cos(angle) * currentIntensity;
        this.screenShake.offsetY = Math.sin(angle) * currentIntensity;
    }
    
    getScreenShakeOffset() {
        return {
            x: this.screenShake.offsetX,
            y: this.screenShake.offsetY
        };
    }
    
    // Hit Sparks System
    createHitSpark(x, y, color = '#ffffff', size = 'normal') {
        // Limit number of sparks for performance
        if (this.hitSparks.length >= this.maxSparks) {
            this.hitSparks.shift(); // Remove oldest spark
        }
        
        const sparkCount = size === 'large' ? 8 : size === 'small' ? 4 : 6;
        const velocityMultiplier = size === 'large' ? 150 : size === 'small' ? 80 : 120;
        
        for (let i = 0; i < sparkCount; i++) {
            const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.5;
            const velocity = 50 + Math.random() * velocityMultiplier;
            
            const spark = {
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 0.5 + Math.random() * 0.3, // 0.5-0.8 seconds
                maxLife: 0.5 + Math.random() * 0.3,
                size: 2 + Math.random() * 2,
                color: color,
                active: true
            };
            
            this.hitSparks.push(spark);
        }
    }
    
    updateHitSparks(deltaTime) {
        for (let i = this.hitSparks.length - 1; i >= 0; i--) {
            const spark = this.hitSparks[i];
            
            // Update position
            spark.x += spark.vx * deltaTime;
            spark.y += spark.vy * deltaTime;
            
            // Apply gravity and friction
            spark.vy += 200 * deltaTime; // Gravity
            spark.vx *= 0.98; // Air friction
            spark.vy *= 0.98;
            
            // Update life
            spark.life -= deltaTime;
            
            if (spark.life <= 0) {
                this.hitSparks.splice(i, 1);
            }
        }
    }
    
    renderHitSparks(ctx) {
        // Reset at start
        ctx.globalAlpha = 1.0;
        
        for (const spark of this.hitSparks) {
            const alpha = spark.life / spark.maxLife;
            const size = spark.size * alpha;
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = spark.color;
            ctx.shadowColor = spark.color;
            ctx.shadowBlur = 4;
            
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Reset after rendering
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }
    
    // Damage Numbers System
    createDamageNumber(x, y, damage, color = '#ffffff') {
        // Limit number of damage numbers for performance
        if (this.damageNumbers.length >= this.maxDamageNumbers) {
            this.damageNumbers.shift(); // Remove oldest
        }
        
        const damageNumber = {
            x: x + (Math.random() - 0.5) * 20, // Random horizontal offset
            y: y,
            damage: Math.round(damage),
            life: 1.5, // 1.5 seconds
            maxLife: 1.5,
            color: color,
            size: damage > 50 ? 16 : damage > 25 ? 14 : 12,
            velocity: -60 - Math.random() * 40, // Upward velocity
            active: true
        };
        
        this.damageNumbers.push(damageNumber);
    }
    
    updateDamageNumbers(deltaTime) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const damageNum = this.damageNumbers[i];
            
            // Update position (float upward, then fade)
            const progress = 1 - (damageNum.life / damageNum.maxLife);
            if (progress < 0.7) {
                damageNum.y += damageNum.velocity * deltaTime;
                damageNum.velocity += 20 * deltaTime; // Deceleration
            }
            
            // Update life
            damageNum.life -= deltaTime;
            
            if (damageNum.life <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }
    }
    
    renderDamageNumbers(ctx) {
        // Reset at start
        ctx.globalAlpha = 1.0;
        
        for (const damageNum of this.damageNumbers) {
            const alpha = Math.min(1, damageNum.life / damageNum.maxLife);
            const progress = 1 - (damageNum.life / damageNum.maxLife);
            
            // Scale effect - start small, grow, then shrink
            let scale = 1;
            if (progress < 0.2) {
                scale = progress / 0.2; // Grow
            } else if (progress > 0.8) {
                scale = 1 - ((progress - 0.8) / 0.2); // Shrink
            }
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = damageNum.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.font = `bold ${damageNum.size * scale}px Courier New`;
            ctx.textAlign = 'center';
            
            // Add glow effect for high damage
            if (damageNum.damage > 30) {
                ctx.shadowColor = damageNum.color;
                ctx.shadowBlur = 6;
            }
            
            // Draw damage number with outline
            ctx.strokeText(damageNum.damage.toString(), damageNum.x, damageNum.y);
            ctx.fillText(damageNum.damage.toString(), damageNum.x, damageNum.y);
        }
        
        // Reset after rendering
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }
    
    // Preset effect combinations
    onEnemyHit(x, y, damage, enemyType) {
        // Different effects based on enemy type and damage
        let sparkColor = '#ffffff';
        let damageColor = '#ffffff';
        let sparkSize = 'normal';
          if (damage > 50) {
            sparkColor = '#00ff00'; // Green for high damage
            damageColor = '#00ff00';
            sparkSize = 'large';
        } else if (damage > 25) {
            sparkColor = '#ff6600'; // Orange for medium damage
            damageColor = '#ff6600';
        }        // Enemy type specific colors
        if (enemyType === 'bitbug') {
            sparkColor = '#ff6600';
            damageColor = '#ff6600';
        } else if (enemyType === 'datawisp') {
            sparkColor = '#ff4444';
            damageColor = '#ff4444';
        } else if (enemyType === 'memoryleech') {
            sparkColor = '#8a2be2';
            damageColor = '#8a2be2';
        } else if (enemyType === 'syntaxbreaker') {
            sparkColor = '#00ff88';
            damageColor = '#00ff88';
        }
        
        this.createHitSpark(x, y, sparkColor, sparkSize);
        this.createDamageNumber(x, y - 10, damage, damageColor);
        
        // Screen shake based on damage (reduced intensity and duration)
        const shakeIntensity = Math.min(4, damage * 0.08);
        this.addScreenShake(shakeIntensity, 0.05);    }

    onPlayerHit(x, y, damage) {
        // Red effects for player damage
        this.createHitSpark(x, y, '#ff0000', 'large');
        this.createDamageNumber(x, y - 15, damage, '#ff0000');
        
        // Reduced screen shake for player damage
        this.addScreenShake(6, 0.15);    }    onEnemyDestroyed(x, y, enemyType) {
        // Explosion-like effect when enemy is destroyed
        let color = '#ffffff';
          if (enemyType === 'bitbug') {
            color = '#ff6600';
        } else if (enemyType === 'datawisp') {
            color = '#ff4444';
        } else if (enemyType === 'memoryleech') {
            color = '#8a2be2';
        } else if (enemyType === 'syntaxbreaker') {
            color = '#00ff88';
        }
        
        // Create multiple spark bursts
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createHitSpark(x + (Math.random() - 0.5) * 10, 
                                  y + (Math.random() - 0.5) * 10, 
                                  color, 'large');
            }, i * 50);
        }
        
        this.addScreenShake(3, 0.08);    }

    // Special effect presets
    onWaveStart(waveNumber) {
        // Screen flash and shake when a new wave starts (reduced)
        this.addScreenShake(2.5, 0.1);
        console.log(`🌊 Wave ${waveNumber} visual effects triggered!`);
    }
    
    onWaveComplete(waveNumber) {
        // Celebration effect when wave is completed (reduced)
        this.addScreenShake(1.5, 0.08);
        console.log(`✅ Wave ${waveNumber} completion effects triggered!`);    }    onEnemySpawn(x, y, enemyType) {
        // Subtle spawn effect
        let color = '#ffffff';
        if (enemyType === 'bitbug') {
            color = '#ff6600';        } else if (enemyType === 'datawisp') {
            color = '#ff4444';        } else if (enemyType === 'memoryleech') {
            color = '#8a2be2';
        } else if (enemyType === 'syntaxbreaker') {
            color = '#00ff88';
        }
        
        this.createHitSpark(x, y, color, 'small');
    }

    onOverclockActivated(x, y) {
        // Special effect when player activates overclock (reduced shake)
        this.createHitSpark(x, y, '#ff00ff', 'large');
        this.addScreenShake(2, 0.1);
    }
    
    onDashUsed(x, y) {
        // Effect when player uses dash (reduced shake)
        this.createHitSpark(x, y, '#00ffff', 'normal');
        this.addScreenShake(1, 0.05);
    }
    
    // Utility methods
    clear() {
        this.hitSparks = [];
        this.damageNumbers = [];
        this.screenShake.timer = 0;
        this.screenShake.offsetX = 0;
        this.screenShake.offsetY = 0;
    }    // Player healing visual effect
    onPlayerHeal(playerX, playerY, healAmount = null) {
        // Add healing number if heal amount is specified (no particles or screen shake)
        if (healAmount !== null) {
            const damageNumber = {
                x: playerX + (Math.random() - 0.5) * 40,
                y: playerY - 20,
                text: `+${healAmount}`,
                life: 1.0,
                maxLife: 2.0,
                color: { r: 0, g: 255, b: 100 }, // Green for healing
                size: 18,
                vx: (Math.random() - 0.5) * 50,
                vy: -80 - Math.random() * 40
            };
            this.damageNumbers.push(damageNumber);
        }
        
        console.log('💚 Player healing visual effect triggered (no particles/shake)');
    }
}
