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
        autoInit: true, // NEW: Allow disabling auto-init
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

    }

    // ==================== IMAGE COMPRESSION QUALITY ====================
    function adjustImageQuality() {
        const quality = getConnectionQuality();
        
        if (quality === 'low') {
            
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
        let pendingNodes = [];
        let processingScheduled = false;
        
        const processBatch = () => {
            const nodesToProcess = pendingNodes.slice();
            pendingNodes = [];
            processingScheduled = false;
            
            nodesToProcess.forEach(node => {
                if (node.tagName === 'IMG') {
                    processNewImage(node);
                } else if (node.querySelectorAll) {
                    const images = node.querySelectorAll('img');
                    images.forEach(processNewImage);
                }
            });
        };
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        pendingNodes.push(node);
                    }
                });
            });
            
            if (!processingScheduled) {
                processingScheduled = true;
                requestAnimationFrame(processBatch);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

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

        // Check WebP support first
        await checkWebPSupport();

        preloadCriticalImages();
        adjustImageQuality();
        enableAsyncDecode();
        initLazyLoading();
        observeNewImages();
    }

    // Expose API
    window.GlitchRealmPerf = {
        reinit: initAll,
        observeImage: processNewImage,
        getConnectionQuality: getConnectionQuality,
        supportsWebP: () => webpSupport,
        config: config
    };

    // Conditional auto-initialize
    if (config.autoInit) {
        init();
    }

})();
