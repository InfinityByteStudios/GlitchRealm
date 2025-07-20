/**
 * Cache Manager - Centralized cache management with automatic cleanup
 */

export class CacheManager {
    constructor(maxSize = 100, ttl = 300000) { // 5 minutes default TTL
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map();
        this.accessTimes = new Map();
        this.lastCleanup = Date.now();
        this.cleanupInterval = 60000; // Cleanup every minute
    }

    /**
     * Set a value in the cache
     */
    set(key, value, customTTL = null) {
        try {
            const now = Date.now();
            const ttl = customTTL || this.ttl;
            
            this.cache.set(key, {
                value: value,
                timestamp: now,
                ttl: ttl,
                accessCount: 1
            });
            
            this.accessTimes.set(key, now);
            
            // Cleanup if needed
            if (now - this.lastCleanup > this.cleanupInterval) {
                this.cleanup();
            }
            
            // Enforce size limit
            if (this.cache.size > this.maxSize) {
                this.evictLeastRecent();
            }
            
        } catch (error) {
            console.error('Error setting cache value:', error);
        }
    }

    /**
     * Get a value from the cache
     */
    get(key) {
        try {
            const item = this.cache.get(key);
            if (!item) {
                return null;
            }
            
            const now = Date.now();
            
            // Check if item has expired
            if (now - item.timestamp > item.ttl) {
                this.delete(key);
                return null;
            }
            
            // Update access time and count
            item.accessCount++;
            this.accessTimes.set(key, now);
            
            return item.value;
        } catch (error) {
            console.error('Error getting cache value:', error);
            return null;
        }
    }

    /**
     * Check if a key exists in the cache
     */
    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;
        
        const now = Date.now();
        if (now - item.timestamp > item.ttl) {
            this.delete(key);
            return false;
        }
        
        return true;
    }

    /**
     * Delete a key from the cache
     */
    delete(key) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.accessTimes.clear();
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        try {
            const now = Date.now();
            const expiredKeys = [];
            
            for (const [key, item] of this.cache.entries()) {
                if (now - item.timestamp > item.ttl) {
                    expiredKeys.push(key);
                }
            }
            
            expiredKeys.forEach(key => this.delete(key));
            
            this.lastCleanup = now;
            
            if (expiredKeys.length > 0) {
                console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
            }
        } catch (error) {
            console.error('Error during cache cleanup:', error);
        }
    }

    /**
     * Evict least recently used entries
     */
    evictLeastRecent() {
        try {
            const sortedByAccess = Array.from(this.accessTimes.entries())
                .sort((a, b) => a[1] - b[1]);
            
            const toEvict = sortedByAccess.slice(0, Math.ceil(this.maxSize * 0.2)); // Remove 20%
            
            toEvict.forEach(([key]) => this.delete(key));
            
            console.log(`Cache eviction: removed ${toEvict.length} least recent entries`);
        } catch (error) {
            console.error('Error during cache eviction:', error);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        let expiredCount = 0;
        let totalAccessCount = 0;
        
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                expiredCount++;
            }
            totalAccessCount += item.accessCount;
        }
        
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            expiredCount: expiredCount,
            totalAccessCount: totalAccessCount,
            averageAccessCount: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
            lastCleanup: this.lastCleanup,
            ttl: this.ttl
        };
    }

    /**
     * Get or set with a factory function
     */
    getOrSet(key, factory, customTTL = null) {
        let value = this.get(key);
        
        if (value === null) {
            try {
                value = factory();
                this.set(key, value, customTTL);
            } catch (error) {
                console.error('Error in cache factory function:', error);
                return null;
            }
        }
        
        return value;
    }

    /**
     * Memoize a function with caching
     */
    memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
        return (...args) => {
            const key = keyGenerator(...args);
            return this.getOrSet(key, () => fn(...args));
        };
    }
}

// Create specialized cache instances for different use cases
export const imageCache = new CacheManager(50, 600000); // 10 minutes for images
export const collisionCache = new CacheManager(200, 30000); // 30 seconds for collision data
export const renderCache = new CacheManager(100, 120000); // 2 minutes for render data
export const generalCache = new CacheManager(100, 300000); // 5 minutes for general data
