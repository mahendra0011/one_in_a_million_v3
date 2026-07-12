// Background Geolocation for Delivery Boy
// Uses Wake Lock API + Page Visibility to keep tracking alive
// NOTE: navigator.geolocation.watchPosition() continues working
// in background on most modern mobile browsers. We supplement it
// with Wake Lock to prevent OS sleep.

let wakeLockRef = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLockRef) {
      wakeLockRef = await navigator.wakeLock.request('screen');
      wakeLockRef.addEventListener('release', () => {
        wakeLockRef = null;
      });
    }
  } catch (err) {
    // Wake lock not supported or denied — tracking still works via watchPosition
  }
}

async function releaseWakeLock() {
  if (wakeLockRef) {
    try {
      await wakeLockRef.release();
    } catch {}
    wakeLockRef = null;
  }
}

// Re-acquire wake lock if page becomes visible again (user unlocks phone)
function setupVisibilityHandler() {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && !wakeLockRef) {
      requestWakeLock();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}

// Keep connection alive with periodic pings when page is backgrounded
function setupKeepAlive(sendPing, interval = 25000) {
  const timer = setInterval(() => {
    if (document.visibilityState === 'hidden') {
      sendPing();
    }
  }, interval);
  return () => clearInterval(timer);
}

export function enableBackgroundTracking(sendPing) {
  requestWakeLock();
  const cleanupVis = setupVisibilityHandler();
  const cleanupKeepAlive = setupKeepAlive(sendPing);
  return () => {
    releaseWakeLock();
    cleanupVis();
    cleanupKeepAlive();
  };
}

export function disableBackgroundTracking() {
  releaseWakeLock();
}
