/**
 * Service Worker: Offline Application Shell
 * 
 * STRICT DATA PRIVACY & FRESHNESS GUARANTEE:
 * - ONLY caches static application shell assets (HTML shell, CSS, JS bundles, fonts, icons).
 * - NEVER caches '/api/*' routes or student marks responses under any circumstance.
 * - Student academic data is strictly retrieved directly from the authorized backend.
 */

const CACHE_NAME = 'marks-analytics-shell-v3.0';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. STRICT PRIVACY RULE: All /api/ calls bypass CacheStorage completely.
  // Student marks, identities, and analytics are always live from Google Sheets.
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        return new Response(
          JSON.stringify({
            error: 'Network Offline',
            message: 'Live academic data cannot be retrieved while offline. Please connect to the internet to fetch fresh Google Spreadsheet marks.'
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate'
            }
          }
        );
      })
    );
    return;
  }

  // 2. Navigation requests: return cached index.html shell so SPA routing works offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 3. Static assets: Cache-First, fallback to Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Only cache valid GET responses for static files (scripts, stylesheets, fonts, images)
        if (
          event.request.method === 'GET' &&
          networkResponse.status === 200 &&
          (url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.woff2') ||
           url.pathname.endsWith('.svg') ||
           url.pathname.endsWith('.png') ||
           url.pathname.endsWith('.webmanifest') ||
           url.pathname.endsWith('.json'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
