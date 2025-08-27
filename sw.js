/* GlitchRealm Service Worker */
const CACHE_PREFIX = 'gr-v2';
const STATIC_CACHE = `${CACHE_PREFIX}-static`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/games.html',
  '/community.html',
  '/about.html',
  '/contact.html',
  '/user-portal.html',
  '/styles.css',
  '/script.js',
  '/assets/glitch realm favicon image.png'
];

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

  // Cache Google Fonts aggressively (cross-origin allowed)
  if (url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.origin === 'https://fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request));
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
          const cached = await caches.match(request);
          return cached || caches.match('/index.html');
        }
      })()
    );
    return;
  }

  // Assets: cache-first for images/fonts; stale-while-revalidate for CSS/JS
  if (request.destination === 'image' || url.pathname.startsWith('/assets/')) {
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
