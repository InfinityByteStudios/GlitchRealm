/* GlitchRealm Service Worker - Advanced Optimizations */
const CACHE_PREFIX = 'gr-v7'; // Incremented - Supabase image fix
const STATIC_CACHE = `${CACHE_PREFIX}-static`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime`;
const IMAGE_CACHE = `${CACHE_PREFIX}-images`;

const PRECACHE_URLS = [
  '/offline.html',
  '/styles.css',
  '/assets/Favicon and Icons/favicon.svg',
  '/assets/Favicon and Icons/favicon.ico',
  '/assets/Favicon and Icons/web-app-manifest-192x192.png'
];

// External resources we want to cache-fast-path (opaque responses ok)
const BMC_WIDGET_URL = 'https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js';

// Files that should NEVER be cached (always fetch fresh for auth state)
const NEVER_CACHE = [
  '/news/',
  '/news/index.html',
  '/news/publish.html',
  '/news/news-article.html',
  '/index.html',
  '/games.html',
  '/user-portal.html',
  '/firebase-core.js',
  '/news/firebase-core.js',
  '/script.js',
  '/news/script.js',
  'firebase',
  'firebaseapp.com',
  'firestore.googleapis.com'
];

function shouldNeverCache(url) {
  const urlStr = url.toString();
  return NEVER_CACHE.some(pattern => 
    urlStr.includes(pattern) || 
    urlStr.endsWith('.html') ||
    urlStr.includes('firebase')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => !k.startsWith(CACHE_PREFIX)).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
  // Enable navigation preload for faster HTML fetch when supported
  if ('navigationPreload' in self.registration) {
    try { self.registration.navigationPreload.enable(); } catch(e) {}
  }
});

// Strategy helpers
async function staleWhileRevalidate(request, cacheName = RUNTIME_CACHE) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response && response.status === 200 && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  return cached || networkPromise;
}

async function cacheFirst(request, cacheName = RUNTIME_CACHE) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // Accept opaque responses (cross-origin no-cors) as cacheable as well
    const ok = (response && response.status === 200) || (response && response.type === 'opaque');
    if (ok) {
      try { cache.put(request, response.clone()); } catch (e) { /* ignore put errors for opaque */ }
    }
    return response;
  } catch (e) {
    // Network failed: fall back to cached asset if available
    if (cached) return cached;
    // If this was an image (e.g., favicon) try several known fallbacks (handles news subdomain)
    if (request.destination === 'image') {
      const FALLBACK_IMAGES = [
        '/assets/Favicon and Icons/favicon.ico',
        '/news/assets/Favicon and Icons/favicon.ico',
        '/favicon.ico',
        '/assets/Favicon and Icons/favicon.svg'
      ];
      for (const path of FALLBACK_IMAGES) {
        try {
          const f = await caches.match(path);
          if (f) return f;
        } catch (e2) { /* ignore */ }
      }
      // Final fallback: return a minimal inline SVG favicon so the page doesn't error
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#00fff9"/></svg>';
      return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
    }
    // As a last resort, rethrow so caller can handle or browser gets the network error
    throw e;
  }
}

async function networkFirst(request, cacheName = RUNTIME_CACHE, timeout = 3000) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response && response.status === 200) cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass non-GET requests
  if (request.method !== 'GET') return;

  // NEVER cache auth-sensitive or HTML files
  if (shouldNeverCache(url)) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Cache Google Fonts aggressively (cross-origin allowed)
  if (url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.origin === 'https://fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Buy Me a Coffee widget script: cache-first after first fetch to remove repeat lag
  if (request.url === BMC_WIDGET_URL) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Supabase storage: Cache images from Supabase CDN (cross-origin with mode: 'no-cors')
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request, { mode: 'no-cors' });
          // Cache the opaque response
          const cache = await caches.open(IMAGE_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch (e) {
          // Try cached version if network fails
          const cached = await caches.match(request);
          if (cached) return cached;
          throw e;
        }
      })()
    );
    return;
  }

  // Only handle same-origin for the rest
  if (url.origin !== self.location.origin) return;

  // HTML/navigation: Network-first with fallback to offline page (don't cache HTML)
  // Handle both `request.destination === 'document'` and navigation-mode requests
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          // Use navigation preload if available (safe await even if undefined)
          const preload = await (event.preloadResponse || Promise.resolve(null));
          const response = preload || await fetch(request);
          // DO NOT cache HTML responses - always fetch fresh for auth state
          return response;
        } catch (e) {
          // Network failed — serve offline page immediately (don't use cached HTML)
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          // As last resort, return a generic Response
          return new Response('Offline - Cannot reach GlitchRealm servers', { 
            status: 503, 
            statusText: 'Service Unavailable', 
            headers: { 'Content-Type': 'text/plain' } 
          });
        }
      })()
    );
    return;
  }

  // Assets: images via Netlify Image Transformations when possible; fonts/images cache-first; CSS/JS SWR
  if (request.destination === 'image' || url.pathname.startsWith('/assets/')) {
    // Only transform same-origin /assets/ images; skip SVG/ICO/GIF
    const isSameOrigin = url.origin === self.location.origin;
    const underAssets = url.pathname.startsWith('/assets/');
    const ext = url.pathname.split('.').pop().toLowerCase();
    const transformable = ['jpg','jpeg','png','bmp','tiff','webp','avif'].includes(ext);

    if (isSameOrigin && underAssets && transformable) {
      const accept = request.headers.get('Accept') || '';
      const prefersAvif = accept.includes('image/avif');
      const prefersWebp = accept.includes('image/webp');
      const fm = prefersAvif ? 'avif' : (prefersWebp ? 'webp' : null);

      if (fm) {
        const transformURL = new URL('/.netlify/images', self.location.origin);
        transformURL.searchParams.set('url', url.pathname);
        transformURL.searchParams.set('fm', fm);
        transformURL.searchParams.set('q', '80'); // Increased quality to 80
        transformURL.searchParams.set('w', '1200'); // Max width to reduce oversized images

        const transformedRequest = new Request(transformURL.toString(), {
          method: 'GET',
          headers: request.headers,
          credentials: request.credentials,
          mode: 'cors'
        });

        event.respondWith(cacheFirst(transformedRequest, IMAGE_CACHE));
        return;
      }
    }

    // Fallback: standard cache-first for images and /assets
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: SWR
  event.respondWith(staleWhileRevalidate(request));
});
