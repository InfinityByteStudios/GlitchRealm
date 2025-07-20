/**
 * Performance Monitor - Tracks and reports performance metrics
 */

export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            frameTime: [],
            updateTime: [],
            renderTime: [],
            memoryUsage: [],
            fps: [],
            lastGC: performance.now()
        };
        
        this.thresholds = {
            lowFPS: 30,
            highFrameTime: 33.33, // 30fps
            memoryWarning: 100 * 1024 * 1024, // 100MB
            maxHistorySize: 100
        };
        
        this.warnings = {
            lowFPSCount: 0,
            highFrameTimeCount: 0,
            memoryWarningCount: 0
        };
    }

    /**
     * Record frame performance metrics
     */
    recordFrame(frameTime, updateTime, renderTime, fps) {
        try {
            this.metrics.frameTime.push(frameTime);
            this.metrics.updateTime.push(updateTime);
            this.metrics.renderTime.push(renderTime);
            this.metrics.fps.push(fps);

            // Limit history size to prevent memory issues
            this.limitHistorySize();

            // Check for performance issues
            this.checkPerformanceThresholds(frameTime, fps);

            // Record memory usage if available
            if (performance.memory) {
                this.metrics.memoryUsage.push(performance.memory.usedJSHeapSize);
                this.checkMemoryUsage();
            }
        } catch (error) {
            console.error('Error recording performance metrics:', error);
        }
    }

    /**
     * Limit history size to prevent memory issues
     */
    limitHistorySize() {
        const maxSize = this.thresholds.maxHistorySize;
        
        if (this.metrics.frameTime.length > maxSize) {
            this.metrics.frameTime = this.metrics.frameTime.slice(-maxSize);
            this.metrics.updateTime = this.metrics.updateTime.slice(-maxSize);
            this.metrics.renderTime = this.metrics.renderTime.slice(-maxSize);
            this.metrics.fps = this.metrics.fps.slice(-maxSize);
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-maxSize);
        }
    }

    /**
     * Check performance thresholds and issue warnings
     */
    checkPerformanceThresholds(frameTime, fps) {
        if (fps < this.thresholds.lowFPS) {
            this.warnings.lowFPSCount++;
            if (this.warnings.lowFPSCount >= 30) { // 30 consecutive low FPS frames
                console.warn('Performance Warning: Low FPS detected', fps);
                this.warnings.lowFPSCount = 0; // Reset counter
            }
        } else {
            this.warnings.lowFPSCount = 0;
        }

        if (frameTime > this.thresholds.highFrameTime) {
            this.warnings.highFrameTimeCount++;
            if (this.warnings.highFrameTimeCount >= 30) { // 30 consecutive high frame times
                console.warn('Performance Warning: High frame time detected', frameTime);
                this.warnings.highFrameTimeCount = 0; // Reset counter
            }
        } else {
            this.warnings.highFrameTimeCount = 0;
        }
    }

    /**
     * Check memory usage and issue warnings
     */
    checkMemoryUsage() {
        if (performance.memory && performance.memory.usedJSHeapSize > this.thresholds.memoryWarning) {
            this.warnings.memoryWarningCount++;
            if (this.warnings.memoryWarningCount >= 10) { // Every 10 frames when memory is high
                console.warn('Memory Warning: High memory usage detected', 
                    Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)) + 'MB');
                this.warnings.memoryWarningCount = 0; // Reset counter
            }
        } else {
            this.warnings.memoryWarningCount = 0;
        }
    }

    /**
     * Get current performance statistics
     */
    getStats() {
        if (this.metrics.frameTime.length === 0) {
            return null;
        }

        const recent = 60; // Last 60 frames
        const frameTime = this.metrics.frameTime.slice(-recent);
        const updateTime = this.metrics.updateTime.slice(-recent);
        const renderTime = this.metrics.renderTime.slice(-recent);
        const fps = this.metrics.fps.slice(-recent);

        return {
            avgFrameTime: this.average(frameTime),
            avgUpdateTime: this.average(updateTime),
            avgRenderTime: this.average(renderTime),
            avgFPS: this.average(fps),
            minFPS: Math.min(...fps),
            maxFPS: Math.max(...fps),
            memoryUsage: performance.memory ? 
                Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)) : 0,
            frameCount: this.metrics.frameTime.length
        };
    }

    /**
     * Calculate average of an array
     */
    average(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * Get performance recommendations
     */
    getRecommendations() {
        const stats = this.getStats();
        if (!stats) return [];

        const recommendations = [];

        if (stats.avgFPS < 30) {
            recommendations.push({
                type: 'fps',
                message: 'Low FPS detected. Consider reducing graphics quality.',
                severity: 'high'
            });
        }

        if (stats.avgFrameTime > 33.33) {
            recommendations.push({
                type: 'frameTime',
                message: 'High frame time detected. Optimize rendering performance.',
                severity: 'medium'
            });
        }

        if (stats.memoryUsage > 100) {
            recommendations.push({
                type: 'memory',
                message: 'High memory usage detected. Consider reducing cached assets.',
                severity: 'high'
            });
        }

        return recommendations;
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            frameTime: [],
            updateTime: [],
            renderTime: [],
            memoryUsage: [],
            fps: [],
            lastGC: performance.now()
        };
        
        this.warnings = {
            lowFPSCount: 0,
            highFrameTimeCount: 0,
            memoryWarningCount: 0
        };
    }

    /**
     * Export performance data for analysis
     */
    exportData() {
        return {
            metrics: this.metrics,
            stats: this.getStats(),
            recommendations: this.getRecommendations(),
            timestamp: new Date().toISOString()
        };
    }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
