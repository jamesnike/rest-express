// Service Worker for EventConnect PWA - DEVELOPMENT MODE
console.log('🔧 Service Worker in development mode - clearing all caches');

// Clear all caches immediately
self.addEventListener('install', (event) => {
  console.log('🗑️ Clearing all service worker caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ All caches cleared, service worker ready');
      self.skipWaiting(); // Force activation
    })
  );
});

// Don't cache anything in development - always fetch fresh
self.addEventListener('fetch', (event) => {
  console.log('🌐 Fetching fresh content:', event.request.url);
  event.respondWith(
    fetch(event.request.clone()).catch(() => {
      // Only fall back to cache for non-HTML requests
      if (!event.request.url.includes('.html') && !event.request.url.endsWith('/')) {
        return caches.match(event.request);
      }
      throw new Error('Network failed and no cache for HTML');
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('🚀 Service worker activated');
  event.waitUntil(self.clients.claim());
});