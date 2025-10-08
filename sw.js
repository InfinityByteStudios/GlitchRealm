/* GlitchRealm Service Worker */
const CACHE_PREFIX = 'gr-v4'; // Incremented to bust old caches
const STATIC_CACHE = `${CACHE_PREFIX}-static`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime`;

const PRECACHE_URLS = [
  '/offline.html',
  '/styles.css',
  '/assets/Favicon and Icons/favicon.ico'
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
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response && response.status === 200 && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  return cached || networkPromise;
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200) cache.put(request, response.clone());
  return response;
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

  // Only handle same-origin for the rest
  if (url.origin !== self.location.origin) return;

  // HTML: Network-first with fallback to cache for offline
  if (request.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          // Use navigation preload if available
          const preload = event.preloadResponse ? await event.preloadResponse : null;
          const response = preload || await fetch(request);
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        } catch (e) {
          // Try to serve from cache first
          const cached = await caches.match(request);
          if (cached) return cached;
          
          // If not in cache, serve offline page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;
          
          // Ultimate fallback to index
          return caches.match('/index.html');
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
        transformURL.searchParams.set('q', '75');
        // Optionally set width based on device pixel ratio? Keep default to avoid over-processing.

        const transformedRequest = new Request(transformURL.toString(), {
          method: 'GET',
          headers: request.headers,
          credentials: request.credentials,
          mode: 'cors'
        });

        event.respondWith(cacheFirst(transformedRequest));
        return;
      }
    }

    // Fallback: standard cache-first for images and /assets
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: SWR
  event.respondWith(staleWhileRevalidate(request));
});
