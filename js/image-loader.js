// Optimized Image Loader - Progressive WebP with fallback
// Automatically serves WebP to supporting browsers, lazy-loads images

(function() {
  'use strict';
  
  // Check WebP support
  const supportsWebP = (function() {
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  })();
  
  // Replace img with picture element for WebP support
  function createPictureElement(img) {
    const src = img.getAttribute('data-src') || img.src;
    if (!src) return null;
    
    const picture = document.createElement('picture');
    
    // Add WebP source if supported
    const ext = src.split('.').pop();
    const webpSrc = src.replace(new RegExp(`\\.${ext}$`), '.webp');
    
    const sourceWebP = document.createElement('source');
    sourceWebP.srcset = webpSrc;
    sourceWebP.type = 'image/webp';
    
    const sourceFallback = document.createElement('source');
    sourceFallback.srcset = src;
    sourceFallback.type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    
    const newImg = img.cloneNode();
    newImg.src = src;
    newImg.removeAttribute('data-src');
    
    picture.appendChild(sourceWebP);
    picture.appendChild(sourceFallback);
    picture.appendChild(newImg);
    
    return picture;
  }
  
  // Intersection Observer for lazy loading
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        
        if (src) {
          // If WebP is supported and available, use it
          if (supportsWebP) {
            const ext = src.split('.').pop();
            const webpSrc = src.replace(new RegExp(`\\.${ext}$`), '.webp');
            
            // Try WebP first, fallback to original
            const webpImg = new Image();
            webpImg.onload = () => {
              img.src = webpSrc;
              img.classList.add('loaded');
            };
            webpImg.onerror = () => {
              img.src = src;
              img.classList.add('loaded');
            };
            webpImg.src = webpSrc;
          } else {
            img.src = src;
            img.classList.add('loaded');
          }
          
          img.removeAttribute('data-src');
        }
        
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px' // Start loading 50px before visible
  });
  
  // Initialize on DOM ready
  function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoading);
  } else {
    initLazyLoading();
  }
  
  // Expose for manual use
  window.lazyLoadImage = function(img) {
    imageObserver.observe(img);
  };
  
})();
