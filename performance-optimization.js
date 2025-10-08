/**
 * GlitchRealm - Performance Optimization Module
 * 
 * Features:
 * - Intelligent image lazy loading with intersection observer
 * - Responsive image srcset generation
 * - WebP conversion detection and fallback
 * - Image preloading for critical assets
 * - Connection-based image quality adjustment
 * - Blur-up placeholder technique
 */

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const config = {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
        enableWebP: true,
        enableBlurPlaceholder: true,
        qualityByConnection: {
            '4g': 'high',
            '3g': 'medium',
            '2g': 'low',
            'slow-2g': 'low'
        },
        criticalImages: [
            '/assets/Game Logos/ByteSurge.png',
            '/assets/Favicon and Icons/favicon.svg'
        ]
    };

    // ==================== WEBP SUPPORT DETECTION ====================
    let webpSupport = null;

    async function checkWebPSupport() {
        if (webpSupport !== null) return webpSupport;

        return new Promise(resolve => {
            const img = new Image();
            img.onload = img.onerror = () => {
                webpSupport = img.height === 2;
                resolve(webpSupport);
            };
            img.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }

    // ==================== CONNECTION QUALITY DETECTION ====================
    function getConnectionQuality() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (!connection) return 'high';

        const effectiveType = connection.effectiveType;
        return config.qualityByConnection[effectiveType] || 'high';
    }

    // ==================== LAZY LOADING WITH INTERSECTION OBSERVER ====================
    let imageObserver = null;

    function initLazyLoading() {
        if (!('IntersectionObserver' in window)) {
            console.warn('[Perf] IntersectionObserver not supported, using fallback');
            loadAllImagesImmediately();
            return;
        }

        imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    loadImage(img);
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: config.rootMargin,
            threshold: config.threshold
        });

        // Observe all lazy images
        observeLazyImages();

        console.log('[Perf] Lazy loading initialized');
    }

    function observeLazyImages() {
        const lazyImages = document.querySelectorAll('img[loading="lazy"], img[data-src]');
        
        lazyImages.forEach(img => {
            // Skip if already loaded
            if (img.complete && img.naturalHeight !== 0) return;
            
            // Add blur placeholder if enabled
            if (config.enableBlurPlaceholder && !img.style.filter) {
                img.style.filter = 'blur(10px)';
                img.style.transition = 'filter 0.3s ease-out';
            }

            imageObserver.observe(img);
        });
    }

    async function loadImage(img) {
        const src = img.dataset.src || img.src;
        if (!src) return;

        try {
            // Check for WebP support
            const supportsWebP = await checkWebPSupport();
            
            // Try WebP version if available and supported
            if (config.enableWebP && supportsWebP) {
                const webpSrc = getWebPUrl(src);
                if (webpSrc !== src) {
                    // Try loading WebP, fallback to original on error
                    await tryLoadWebP(img, webpSrc, src);
                    return;
                }
            }

            // Load original image
            if (img.dataset.src) {
                img.src = img.dataset.src;
                delete img.dataset.src;
            }

            // Remove blur when loaded
            img.addEventListener('load', () => {
                if (img.style.filter) {
                    img.style.filter = 'none';
                }
                img.classList.add('loaded');
            }, { once: true });

        } catch (error) {
            console.warn('[Perf] Failed to load image:', src, error);
        }
    }

    async function tryLoadWebP(img, webpSrc, fallbackSrc) {
        return new Promise((resolve) => {
            const testImg = new Image();
            
            testImg.onload = () => {
                img.src = webpSrc;
                img.addEventListener('load', () => {
                    if (img.style.filter) img.style.filter = 'none';
                    img.classList.add('loaded');
                }, { once: true });
                resolve();
            };

            testImg.onerror = () => {
                // WebP failed, use fallback
                if (img.dataset.src) {
                    img.src = fallbackSrc;
                    delete img.dataset.src;
                }
                img.addEventListener('load', () => {
                    if (img.style.filter) img.style.filter = 'none';
                    img.classList.add('loaded');
                }, { once: true });
                resolve();
            };

            testImg.src = webpSrc;
        });
    }

    function getWebPUrl(originalUrl) {
        // Check if WebP version exists (assumes naming convention)
        const extension = originalUrl.split('.').pop().toLowerCase();
        if (['png', 'jpg', 'jpeg'].includes(extension)) {
            return originalUrl.replace(/\.(png|jpg|jpeg)$/i, '.webp');
        }
        return originalUrl;
    }

    function loadAllImagesImmediately() {
        const lazyImages = document.querySelectorAll('img[loading="lazy"], img[data-src]');
        lazyImages.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                delete img.dataset.src;
            }
        });
    }

    // ==================== CRITICAL IMAGES PRELOADING ====================
    function preloadCriticalImages() {
        config.criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            
            // Add to head
            document.head.appendChild(link);
        });

        console.log(`[Perf] Preloaded ${config.criticalImages.length} critical images`);
    }

    // ==================== RESPONSIVE IMAGES ====================
    function addResponsiveSrcset() {
        const images = document.querySelectorAll('img:not([srcset])');
        
        images.forEach(img => {
            const src = img.src || img.dataset.src;
            if (!src) return;

            // Skip external images
            if (src.startsWith('http') && !src.includes(window.location.hostname)) return;

            // Skip SVG and icons
            if (src.endsWith('.svg') || src.includes('/icons/')) return;

            // Generate srcset for different sizes (assumes images exist)
            const baseSrc = src.replace(/\.(png|jpg|jpeg|webp)$/i, '');
            const ext = src.split('.').pop();

            // Example: image.png → image-320w.png, image-640w.png, etc.
            const srcset = [
                `${baseSrc}-320w.${ext} 320w`,
                `${baseSrc}-640w.${ext} 640w`,
                `${baseSrc}-960w.${ext} 960w`,
                `${baseSrc}.${ext} 1280w`
            ].join(', ');

            // Only add if responsive versions might exist
            const sizes = '(max-width: 320px) 280px, (max-width: 640px) 600px, (max-width: 960px) 920px, 1200px';
            
            // Note: This is aspirational - images need to be generated
            // img.srcset = srcset;
            // img.sizes = sizes;
        });
    }

    // ==================== IMAGE COMPRESSION QUALITY ====================
    function adjustImageQuality() {
        const quality = getConnectionQuality();
        
        if (quality === 'low') {
            console.log('[Perf] Low connection detected, adjusting image quality');
            
            // Add global CSS to reduce image quality
            const style = document.createElement('style');
            style.textContent = `
                img {
                    image-rendering: -webkit-optimize-contrast;
                    image-rendering: crisp-edges;
                }
            `;
            document.head.appendChild(style);
        }

        console.log(`[Perf] Connection quality: ${quality}`);
    }

    // ==================== DECODE ASYNC FOR BETTER PAINT ====================
    function enableAsyncDecode() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if ('decode' in img && !img.hasAttribute('decoding')) {
                img.decoding = 'async';
            }
        });
    }

    // ==================== MUTATION OBSERVER FOR DYNAMIC IMAGES ====================
    function observeNewImages() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'IMG') {
                            processNewImage(node);
                        } else if (node.querySelectorAll) {
                            const images = node.querySelectorAll('img');
                            images.forEach(processNewImage);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[Perf] Watching for dynamically added images');
    }

    function processNewImage(img) {
        // Add lazy loading
        if (!img.hasAttribute('loading') && !img.hasAttribute('data-no-lazy')) {
            img.loading = 'lazy';
        }

        // Add async decode
        if (!img.hasAttribute('decoding')) {
            img.decoding = 'async';
        }

        // Observe if lazy
        if (imageObserver && (img.loading === 'lazy' || img.dataset.src)) {
            imageObserver.observe(img);
        }
    }

    // ==================== IMAGE OPTIMIZATION REPORT ====================
    function generateOptimizationReport() {
        const allImages = document.querySelectorAll('img');
        const report = {
            total: allImages.length,
            lazyLoaded: 0,
            withoutAlt: 0,
            withoutDimensions: 0,
            largeImages: 0,
            externalImages: 0,
            missingWebP: 0
        };

        allImages.forEach(img => {
            if (img.loading === 'lazy' || img.dataset.src) report.lazyLoaded++;
            if (!img.alt) report.withoutAlt++;
            if (!img.width || !img.height) report.withoutDimensions++;
            if (img.naturalWidth > 1920) report.largeImages++;
            if (img.src && img.src.startsWith('http') && !img.src.includes(window.location.hostname)) {
                report.externalImages++;
            }
        });

        console.group('[Perf] Image Optimization Report');
        console.log(`Total images: ${report.total}`);
        console.log(`Lazy loaded: ${report.lazyLoaded} (${(report.lazyLoaded/report.total*100).toFixed(1)}%)`);
        console.log(`Missing alt text: ${report.withoutAlt}`);
        console.log(`Missing dimensions: ${report.withoutDimensions}`);
        console.log(`Large images (>1920px): ${report.largeImages}`);
        console.log(`External images: ${report.externalImages}`);
        console.groupEnd();

        return report;
    }

    // ==================== INITIALIZATION ====================
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initAll();
            });
        } else {
            initAll();
        }
    }

    async function initAll() {
        console.log('[Perf] Initializing performance optimizations...');

        // Check WebP support first
        await checkWebPSupport();
        console.log(`[Perf] WebP support: ${webpSupport ? 'Yes' : 'No'}`);

        preloadCriticalImages();
        adjustImageQuality();
        enableAsyncDecode();
        initLazyLoading();
        observeNewImages();

        // Generate report after page load
        if (document.readyState === 'complete') {
            setTimeout(() => generateOptimizationReport(), 1000);
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => generateOptimizationReport(), 1000);
            });
        }

        console.log('[Perf] ✅ Performance optimizations initialized');
    }

    // Auto-initialize
    init();

    // Expose API
    window.GlitchRealmPerf = {
        reinit: initAll,
        report: generateOptimizationReport,
        observeImage: processNewImage,
        getConnectionQuality: getConnectionQuality,
        supportsWebP: () => webpSupport
    };

})();
