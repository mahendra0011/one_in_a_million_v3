/**
 * useAutoRefresh — Interval-based polling with Visibility API support.
 *
 * • Polls every `interval` ms while the browser tab is visible.
 * • Fires an immediate refresh when the tab becomes visible again after being hidden.
 * • Pauses the timer when the tab is hidden so we don't hammer the server needlessly.
 * • Returns a manual `refresh()` fn for "Refresh" buttons so they stay in sync.
 *
 * Usage:
 *   const { refresh } = useAutoRefresh({ fetchFn: fetchOrders, interval: 30_000 });
 */
import { useEffect, useCallback, useRef } from 'react';

export function useAutoRefresh({
  fetchFn,
  interval = 30_000,
  enabled  = true,
}) {
  // Always call the *latest* version of fetchFn without re-connecting the interval
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const refresh = useCallback(() => {
    fetchRef.current?.();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let timerId;

    // Schedule the next tick
    const scheduleTick = () => {
      timerId = setTimeout(async () => {
        // Only fetch when the tab is actually visible
        if (document.visibilityState !== 'hidden') {
          try { await fetchRef.current?.(); } catch { /* silent */ }
        }
        scheduleTick(); // re-queue regardless
      }, interval);
    };

    scheduleTick();

    // When the tab comes back into view, refresh immediately and reset the timer
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timerId);
        try { fetchRef.current?.(); } catch { /* silent */ }
        scheduleTick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [interval, enabled]);

  return { refresh };
}
