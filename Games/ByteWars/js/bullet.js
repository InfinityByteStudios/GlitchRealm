class Bullet {
    constructor(x, y, direction, speed = 400) {        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = speed;
        this.radius = 3;
        this.color = '#00ff00';
        this.lifetime = 2.0; // seconds
        this.age = 0;
        this.active = true;
        this.damage = 10; // Default damage, will be set by weapon
        
        // Piercing system
        this.piercing = 0; // Number of enemies this bullet can pierce through
        this.enemiesHit = []; // Track which enemies this bullet has already hit
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        // Move bullet
        this.x += Math.cos(this.direction) * this.speed * deltaTime;
        this.y += Math.sin(this.direction) * this.speed * deltaTime;
        
        // Update age
        this.age += deltaTime;
        
        // Check bounds and lifetime
        const canvas = document.getElementById('gameCanvas');
        if (this.x < 0 || this.x > canvas.width || 
            this.y < 0 || this.y > canvas.height || 
            this.age >= this.lifetime) {
            this.active = false;
        }
    }
      render(ctx, isOverclocked = false) {
        if (!this.active) return;
        
        // Enhanced visuals during Overclock
        if (isOverclocked) {
            // Larger, more intense bullets during Overclock
            const overclockRadius = this.radius * 1.5;
            const overclockColor = '#ff00ff';
            
            // Draw outer glow
            ctx.shadowColor = overclockColor;
            ctx.shadowBlur = 15;
            ctx.fillStyle = overclockColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, overclockRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw inner bright core
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw energy trail behind bullet
            const trailLength = 15;
            const trailX = this.x - Math.cos(this.direction) * trailLength;
            const trailY = this.y - Math.sin(this.direction) * trailLength;
            
            ctx.strokeStyle = overclockColor;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(trailX, trailY);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
              } else {
            // Normal bullet rendering with piercing visual feedback
            if (this.piercing > 0) {
                // Piercing bullet visual - different color and effect
                const piercingColor = '#00ffff'; // Cyan for piercing bullets
                
                // Draw outer ring
                ctx.strokeStyle = piercingColor;
                ctx.lineWidth = 2;
                ctx.shadowColor = piercingColor;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 1.3, 0, Math.PI * 2);
                ctx.stroke();
                
                // Draw inner core
                ctx.fillStyle = piercingColor;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Add spinning energy effect
                const time = Date.now() / 1000;
                const spinSpeed = 5;
                for (let i = 0; i < 3; i++) {
                    const angle = (time * spinSpeed + i * (Math.PI * 2 / 3)) % (Math.PI * 2);
                    const sparkX = this.x + Math.cos(angle) * this.radius * 1.5;
                    const sparkY = this.y + Math.sin(angle) * this.radius * 1.5;
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 4;
                    ctx.beginPath();
                    ctx.arc(sparkX, sparkY, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Standard bullet rendering
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Add glow effect
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
                ctx.fill();
            }
        }
        
        ctx.shadowBlur = 0;
    }
}
