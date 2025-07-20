class Weapon {    constructor() {        this.fireRate = 5; // bullets per second
        this.lastShotTime = 0;
        this.bulletSpeed = 560; // increased for even larger arena
        this.damage = 10;
        this.name = "Basic Blaster";
        
        // Overclock system
        this.baseFireRate = this.fireRate;
        this.baseDamage = this.damage;
        this.isOverclocked = false;
        
        // Upgrade system
        this.piercing = 0; // Number of enemies bullets can pierce through
    }
    
    canShoot(currentTime) {
        const timeSinceLastShot = currentTime - this.lastShotTime;
        return timeSinceLastShot >= (1000 / this.fireRate); // convert to milliseconds
    }    shoot(x, y, direction, currentTime) {
        if (!this.canShoot(currentTime)) {
            return null;
        }
        
        this.lastShotTime = currentTime;
        
        // Create bullet slightly in front of player to avoid collision
        const offsetDistance = 20;
        const bulletX = x + Math.cos(direction) * offsetDistance;
        const bulletY = y + Math.sin(direction) * offsetDistance;
        
        const bullet = new Bullet(bulletX, bulletY, direction, this.bulletSpeed);
        bullet.damage = this.damage; // Set bullet damage from weapon
        bullet.piercing = this.piercing; // Set bullet piercing from weapon
        return bullet;
    }
    
    // Overclock system methods
    applyOverclock(multipliers) {
        if (this.isOverclocked) return; // Already overclocked
        
        this.isOverclocked = true;
        this.fireRate = this.baseFireRate * multipliers.fireRate;
        this.damage = this.baseDamage * multipliers.damage;
        
        console.log(`Weapon overclocked! Fire rate: ${this.fireRate}, Damage: ${this.damage}`);
    }
    
    removeOverclock() {
        if (!this.isOverclocked) return; // Not overclocked
        
        this.isOverclocked = false;
        this.fireRate = this.baseFireRate;
        this.damage = this.baseDamage;
        
        console.log('Weapon overclock removed. Stats returned to normal.');
    }
    
    getDamage() {
        return this.damage;
    }
}
