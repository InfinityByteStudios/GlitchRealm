/**
 * Asset Loader - Handles preloading of game assets
 */

export class AssetLoader {
    constructor() {
        this.loadedAssets = new Map();
        this.loadingPromises = new Map();
        this.loadedCount = 0;
        this.totalCount = 0;
    }

    /**
     * Preload an image asset
     */
    async loadImage(path, key = null) {
        const assetKey = key || path;
        
        // Return cached asset if already loaded
        if (this.loadedAssets.has(assetKey)) {
            return this.loadedAssets.get(assetKey);
        }
        
        // Return existing promise if already loading
        if (this.loadingPromises.has(assetKey)) {
            return this.loadingPromises.get(assetKey);
        }
        
        // Create new loading promise
        const loadingPromise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.loadedAssets.set(assetKey, img);
                this.loadingPromises.delete(assetKey);
                this.loadedCount++;
                resolve(img);
            };
            
            img.onerror = (error) => {
                this.loadingPromises.delete(assetKey);
                console.error(`Failed to load image: ${path}`, error);
                reject(error);
            };
            
            img.src = path;
        });
        
        this.loadingPromises.set(assetKey, loadingPromise);
        this.totalCount++;
        
        return loadingPromise;
    }

    /**
     * Preload multiple images
     */
    async loadImages(imageList) {
        const promises = imageList.map(item => {
            if (typeof item === 'string') {
                return this.loadImage(item);
            } else if (typeof item === 'object' && item.path) {
                return this.loadImage(item.path, item.key);
            }
        });
        
        return Promise.all(promises);
    }

    /**
     * Get a loaded asset
     */
    getAsset(key) {
        return this.loadedAssets.get(key);
    }

    /**
     * Check if an asset is loaded
     */
    isLoaded(key) {
        return this.loadedAssets.has(key);
    }

    /**
     * Get loading progress (0-1)
     */
    getProgress() {
        return this.totalCount > 0 ? this.loadedCount / this.totalCount : 0;
    }

    /**
     * Clear all loaded assets
     */
    clear() {
        this.loadedAssets.clear();
        this.loadingPromises.clear();
        this.loadedCount = 0;
        this.totalCount = 0;
    }
}

// Create global asset loader instance
export const assetLoader = new AssetLoader();
