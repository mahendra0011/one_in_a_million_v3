// Service Worker for Bun in a Million
// Handles: push notifications, offline caching, PWA install

const CACHE_NAME = 'bim-cache-v1';
const API_CACHE = 'bim-api-v1';

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Network-first strategy for API calls
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ ok: false, offline: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || '',
      icon: '/pwa-192x192.svg',
      badge: '/pwa-192x192.svg',
      data: data.data || {},
      vibrate: [200, 100, 200],
      actions: data.actions || [],
      tag: data.tag || 'default',
      renotify: true,
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'Bun in a Million', options)
    );
  } catch {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || event.notification.data?.orderId
    ? `/delivery/orders/${event.notification.data.orderId}`
    : '/delivery';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const matching = windowClients.find(c => c.url.includes('/delivery'));
      if (matching) { matching.focus(); return; }
      clients.openWindow(url);
    })
  );
});
