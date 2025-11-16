// Service Worker for USMC Directives Hub
// Provides offline caching and improved performance

const CACHE_VERSION = 'v1.1.0';
const CACHE_NAME = `usmc-directives-${CACHE_VERSION}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/ai-improvements.css',
  '/image.png',
  '/IMG_2324.jpeg',
  '/lib/fa-checklists.js',
  '/lib/secnav-data.js',
  '/lib/alnav-data.js',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('usmc-directives-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Intercept cross-origin requests for offline functionality
  if (url.origin !== self.location.origin) {
    // List of all API and proxy hosts that should be cached for offline use
    const apiHosts = [
      'onrender.com',         // Custom proxy server
      'marines.mil',          // Marines.mil data
      'navy.mil',             // Navy data
      'igmc.marines.mil',     // IGMC checklists
      'esd.whs.mil',          // DoD forms
      'defense.gov',          // DoD FMR
      'travel.dod.mil',       // JTR
      'corsproxy.io',         // CORS proxy fallback
      'api.allorigins.win',   // CORS proxy fallback
      'cors-anywhere.herokuapp.com',  // CORS proxy fallback
      'api.codetabs.com'      // CORS proxy fallback
    ];

    // Use network-first strategy for all API and proxy requests
    // This ensures offline functionality works with any proxy
    // Use strict hostname matching to prevent malicious domain abuse
    if (apiHosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  // For same-origin requests, use cache-first strategy
  event.respondWith(cacheFirst(request));
});

/**
 * Cache-first strategy: Try cache, fall back to network
 * Best for static assets that don't change often
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[Service Worker] Serving from cache:', request.url);
      return cachedResponse;
    }

    console.log('[Service Worker] Fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);

    // Return offline page if available
    const cachedResponse = await caches.match('/index.html');
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return generic error response
    return new Response('Offline - please check your internet connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

/**
 * Network-first strategy: Try network, fall back to cache
 * Best for API calls and dynamic content
 */
async function networkFirst(request) {
  try {
    console.log('[Service Worker] Network-first fetch:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Clearing cache');
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[Service Worker] Cache cleared');
        return caches.open(CACHE_NAME);
      })
    );
  }
});

console.log('[Service Worker] Loaded successfully');
