// Service Worker for Background Geolocation
// This runs even when the app is closed/backgrounded

const CACHE_NAME = 'delivery-tracking-v1';
const API_BASE = '/api';

let trackingInterval = null;
let currentDeliveryBoyId = null;
let currentOrderId = null;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'START_TRACKING') {
    currentDeliveryBoyId = event.data.deliveryBoyId;
    currentOrderId = event.data.orderId;
    startLocationTracking();
  } else if (event.data.type === 'STOP_TRACKING') {
    stopLocationTracking();
  }
});

function startLocationTracking() {
  if (trackingInterval) return;
  
  // Get location every 30 seconds
  trackingInterval = setInterval(async () => {
    try {
      const position = await getCurrentPosition();
      if (position) {
        await sendLocationToServer(position);
      }
    } catch (err) {
      console.error('Background location error:', err);
    }
  }, 30000);
}

function stopLocationTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: Date.now(),
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

async function sendLocationToServer(position) {
  try {
    const response = await fetch(`${API_BASE}/delivery/my-location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        lat: position.lat,
        lng: position.lng,
      }),
    });
    
    if (!response.ok) {
      console.warn('Failed to send location to server');
    }
  } catch (err) {
    console.error('Failed to send location:', err);
  }
}

// Push notification handling for order assignments
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.data,
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'reject', title: 'Reject' },
      ],
      vibrate: [data.priority === 'high' ? [200, 100, 200] : []],
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'accept') {
    // Open app and accept order
    clients.openWindow('/delivery');
  }
});