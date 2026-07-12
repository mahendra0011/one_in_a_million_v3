// Background Geolocation Service Worker for Delivery Boy
// Register this in DeliveryDashboard to track location even when screen is locked

export function registerBackgroundGeolocation(deliveryBoyId, orderId) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('Service Worker registered:', registration.scope);
      
      // Send deliveryBoyId and orderId to service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'START_TRACKING',
          deliveryBoyId,
          orderId,
        });
      }
    }).catch(err => {
      console.warn('Service Worker registration failed:', err);
    });
  }
}

export function unregisterBackgroundGeolocation() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => reg.unregister());
    });
  }
}