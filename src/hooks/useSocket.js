/**
 * useSocket — Socket.io client hook (Step 16: real-time tracking)
 *
 * Server rooms:
 *   - 'admin'              → join with joinAdmin: true
 *   - 'delivery-<id>'       → join with joinDelivery: deliveryBoyId
 *   - 'order-<orderId>'     → join via trackOrder(orderId)
 *   - 'user-<userId>'       → join with joinUser: userId (Step 21: notifications)
 *
 * Server events:
 *   - 'new-order'                 → admin room
 *   - 'new-reservation'           → admin room
 *   - 'order-updated'             → admin room + delivery room (when status changes)
 *   - 'new-assignment'            → delivery-<id> room (order object)
 *   - 'status-update'             → order-<orderId> room ({ orderId, status, message })
 *   - 'delivery-location-update'  → order-<orderId> room + admin room ({ lat, lng, updatedAt })
 *   - 'notification'              → user-<userId> room ({ type, title, body, data, … }) [Step 21]
 */
import { useEffect, useRef, useCallback, useState } from 'react';

function getSocketUrl() {
  // In dev: vite proxy handles /api, socket is on same origin
  // In prod: same domain
  return window.location.origin;
}

export function useSocket({
  onNewOrder,
  onNewReservation,
  onOrderUpdated,
  onNewAssignment,
  onStatusUpdate,
  onDeliveryLocationUpdate,
  onNotification,        // Step 21
  onDeliveryNotification, // Delivery boy in-app notifications
  joinAdmin = false,
  joinDelivery = null,   // pass deliveryBoyId to join that room
  joinUser = null,       // Step 21: pass userId to join notification room
} = {}) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs so socket listeners always call the latest version
  // without needing to reconnect the socket when callbacks change.
  const cbRefs = useRef({});
  cbRefs.current = {
    onNewOrder, onNewReservation, onOrderUpdated, onNewAssignment,
    onStatusUpdate, onDeliveryLocationUpdate, onNotification, onDeliveryNotification,
  };

  // Every order trackOrder() has been asked to watch, so we can (re)join those
  // rooms whenever the socket (re)connects. Socket.io drops room membership on
  // disconnect, and trackOrder() can be called before the socket even exists
  // yet (e.g. right after the orders list loads) — without this queue those
  // calls silently did nothing and the order-<id> room was never joined at
  // all, which is why live status/location updates went missing.
  const pendingTracksRef = useRef([]); // [{ orderId, onStatusUpdateCb, onLocationCb }]

  useEffect(() => {
    let socket;
    let cancelled = false;

    // Lazy-load socket.io-client
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;

      socket = io(getSocketUrl(), {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      socketRef.current = socket;

      // Attach listeners for any trackOrder() calls that arrived before the
      // socket existed. socket.io-client buffers emits made before 'connect'
      // fires, so this is safe even though we aren't connected yet.
      pendingTracksRef.current.forEach(({ orderId, onStatusUpdateCb, onLocationCb }) => {
        socket.emit('track-order', orderId);
        if (onStatusUpdateCb) socket.on('status-update', onStatusUpdateCb);
        if (onLocationCb) socket.on('delivery-location-update', onLocationCb);
      });

      socket.on('connect', () => {
        setIsConnected(true);
        if (joinAdmin)    socket.emit('join-admin');
        if (joinDelivery) socket.emit('join-delivery', joinDelivery);
        if (joinUser)     socket.emit('join-user', joinUser); // Step 21
        // Re-join every tracked order room too — needed after reconnects,
        // not just the first connect.
        pendingTracksRef.current.forEach(({ orderId }) => socket.emit('track-order', orderId));
      });

      socket.on('disconnect', () => setIsConnected(false));
      socket.on('connect_error', () => setIsConnected(false));

      // Use stable wrapper functions that delegate to the latest callback ref.
      // This means caller components can pass inline functions without causing
      // the socket to disconnect/reconnect on every render.
      socket.on('new-order',                (...args) => cbRefs.current.onNewOrder?.(...args));
      socket.on('new-reservation',          (...args) => cbRefs.current.onNewReservation?.(...args));
      socket.on('order-updated',            (...args) => cbRefs.current.onOrderUpdated?.(...args));
      socket.on('new-assignment',           (...args) => cbRefs.current.onNewAssignment?.(...args));
      socket.on('status-update',            (...args) => cbRefs.current.onStatusUpdate?.(...args));
      socket.on('delivery-location-update', (...args) => cbRefs.current.onDeliveryLocationUpdate?.(...args));
      socket.on('notification',             (...args) => cbRefs.current.onNotification?.(...args)); // Step 21
      socket.on('delivery-notification',    (...args) => cbRefs.current.onDeliveryNotification?.(...args));
    }).catch(() => {
      // socket.io-client not installed — silent fail, app works without real-time
      console.info('[useSocket] socket.io-client not available — real-time disabled');
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
    // Only reconnect if room membership changes — NOT on callback changes (handled via refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinAdmin, joinDelivery, joinUser]);

  // Allow tracking a specific order (customer side). Returns an unsubscribe fn.
  // Safe to call before the socket exists yet — the request is queued and
  // replayed once the socket connects (and on every reconnect after that).
  const trackOrder = useCallback((orderId, onStatusUpdateCb, onLocationCb) => {
    if (!orderId) return () => {};
    const entry = { orderId, onStatusUpdateCb, onLocationCb };
    pendingTracksRef.current = [...pendingTracksRef.current, entry];

    const socket = socketRef.current;
    if (socket) {
      socket.emit('track-order', orderId);
      if (onStatusUpdateCb) socket.on('status-update', onStatusUpdateCb);
      if (onLocationCb) socket.on('delivery-location-update', onLocationCb);
    }

    return () => {
      pendingTracksRef.current = pendingTracksRef.current.filter(e => e !== entry);
      const s = socketRef.current;
      if (s) {
        if (onStatusUpdateCb) s.off('status-update', onStatusUpdateCb);
        if (onLocationCb) s.off('delivery-location-update', onLocationCb);
      }
    };
  }, []);

  // Delivery boy: push a live location ping straight over the socket (fast lane).
  const pushLocation = useCallback(({ orderId, lat, lng, deliveryBoyId }) => {
    const socket = socketRef.current;
    if (!socket || !orderId || lat == null || lng == null) return;
    socket.emit('update-location', { orderId, lat, lng, deliveryBoyId });
  }, []);

  return { trackOrder, pushLocation, socketRef, isConnected };
}

export default useSocket;
