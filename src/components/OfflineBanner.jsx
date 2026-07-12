import { useState, useEffect } from 'react';

/**
 * OfflineBanner — shows a sticky banner at the top when the device goes offline.
 * Listens to navigator.online/offline events. Disappears automatically on reconnect.
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Hide "you're back" message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Nothing to show
  if (isOnline && !showReconnected) return null;

  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-0 left-0 right-0 z-[9999] bg-red-700 text-white text-center text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-lg"
      >
        <span>📡</span>
        <span>Internet connection nahi hai — kuch features kaam nahi karenge</span>
      </div>
    );
  }

  // showReconnected = true, isOnline = true
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[9999] bg-green-700 text-white text-center text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-lg"
    >
      <span>✅</span>
      <span>Internet wapas aa gaya!</span>
    </div>
  );
}
