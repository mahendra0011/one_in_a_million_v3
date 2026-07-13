import { fetchWithTimeout, straightLineRoute, distanceMeters } from '../../lib/utils';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocateFixed, MapPin, Navigation, Package, Timer, Bike, ShoppingBag, X, AlertTriangle, BellRing, Radio, ChevronDown, Phone, RefreshCw, CheckCircle, Clock, Star, Bell, User, LogOut, ChevronRight, Camera, Loader2, Trophy, DollarSign, TrendingUp, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { logout } from '../../store/slices/authSlice';
import { useDispatch } from 'react-redux';
import LiveTrackingMap from '../../components/LiveTrackingMap';
import { enableBackgroundTracking, disableBackgroundTracking } from '../../lib/backgroundGeolocation';

async function safeJson(res) {
  try { return await res.json(); } catch { return { ok: false, error: 'Invalid response' }; }
}

const LOCATION_UPDATE_INTERVAL = 45000;

// Module-level — was previously re-created inside the component every render,
// which cascaded into fetchRoute/snapToRoad/startLiveTracking/pushMyLocation
// all getting new identities each render (see bug report §3b).
const headers = { 'Content-Type': 'application/json' };

const REJECT_REASONS = [
  'Too far', 'Vehicle issue', 'Already busy', 'Area not serviceable', 'Other',
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ActiveOrderCard({
  activeOrder, liveTracking, driverPath, routeGeometry, fetchRoute,
  restaurantLocation, updateStatus, otpInput, setOtpInput,
  otpError, otpLoading, verifyOtp
}) {
  return (
    <AnimatePresence>
      {activeOrder && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-br from-[#F07D14]/20 via-[#F07D14]/10 to-transparent border border-[#F07D14]/40 rounded-3xl overflow-hidden shadow-2xl shadow-[#F07D14]/20"
        >
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#F07D14]/20">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#F07D14] to-[#E86C1B] animate-pulse" />
            <p className="text-[#F07D14] font-black text-lg flex-1">Active Delivery</p>
            <span className="text-[#8E827B] text-sm font-mono">{activeOrder.orderId}</span>
            {liveTracking && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/15 px-3 py-1.5 rounded-full">
                <Radio size={12} className="animate-pulse" /> LIVE
              </span>
            )}
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-black text-xl">{activeOrder.customer?.name || '—'}</p>
                <p className="text-[#8E827B] text-sm mt-1">
                  {activeOrder.items?.length || 0} items • ₹{activeOrder.totals?.total?.toFixed(0)}
                </p>
              </div>
              {activeOrder.customer?.phone && (
                <a href={`tel:${activeOrder.customer.phone}`}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-[#F07D14]/30 transition-all">
                  <Phone size={16} /> Call
                </a>
              )}
            </div>

            {(activeOrder.customer?.address || activeOrder.customerLocation?.address) && (
              <div className="flex items-start gap-3 bg-[#16100D]/80 rounded-2xl px-4 py-3 border border-white/5">
                <MapPin size={18} className="text-[#F07D14] shrink-0 mt-0.5" />
                <p className="text-[#A39791] text-sm leading-relaxed">{activeOrder.customer?.address || activeOrder.customerLocation?.address}</p>
              </div>
            )}

            {/* Map - shows when out_for_delivery */}
            {activeOrder.status === 'out_for_delivery' && (
              <LiveTrackingMap
                customerLocation={activeOrder.customerLocation}
                driverLocation={activeOrder.deliveryBoyLocation || { lat: driverPath[driverPath.length - 1]?.lat, lng: driverPath[driverPath.length - 1]?.lng }}
                restaurantLocation={restaurantLocation}
                driverPath={driverPath}
                routeGeometry={routeGeometry}
                height={380}
                viewMode="delivery"
                showLocate={true}
                onMarkDestination={(dest) => {
                  const start = { lat: driverPath[driverPath.length - 1]?.lat, lng: driverPath[driverPath.length - 1]?.lng };
                  if (dest?.lat && dest?.lng && start?.lat && start?.lng) fetchRoute(start, dest);
                }}
                onUseMyLocation={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      const myPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                      if (activeOrder?.customerLocation?.lat) {
                        fetchRoute(myPos, { lat: activeOrder.customerLocation.lat, lng: activeOrder.customerLocation.lng, address: activeOrder.customerLocation.address });
                      }
                    });
                  }
                }}
              />
            )}

            <div className="bg-[#16100D]/60 rounded-2xl px-4 py-3 space-y-2 border border-white/5">
              <p className="text-[#8E827B] text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Package size={12} /> Order Items</p>
              {(activeOrder.items || []).slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[#A39791]">{item.qty}× {item.name}</span>
                  <span className="text-white font-bold">₹{((item.unitPrice || 0) * (item.qty || 1)).toFixed(0)}</span>
                </div>
              ))}
              {(activeOrder.items || []).length > 3 && <p className="text-[#8E827B] text-sm font-semibold">+{(activeOrder.items || []).length - 3} more items</p>}
            </div>

            <div className="space-y-3">
              {activeOrder.status === 'confirmed' && activeOrder.acceptedAt && (
                <button onClick={() => updateStatus(activeOrder.orderId, 'reached_restaurant')}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500/20 to-blue-500/10 border border-blue-500/30 text-blue-400 font-bold hover:from-blue-500/30 hover:to-blue-500/20 transition-all flex items-center justify-center gap-2">
                  <Bike size={18} /> Reached Restaurant
                </button>
              )}
              {(activeOrder.status === 'reached_restaurant' || activeOrder.status === 'preparing') && (
                <button onClick={() => updateStatus(activeOrder.orderId, 'picked_up')}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold hover:from-yellow-500/30 hover:to-yellow-500/20 transition-all flex items-center justify-center gap-2">
                  <ShoppingBag size={18} /> Picked Up
                </button>
              )}
              {activeOrder.status === 'picked_up' && (
                <button onClick={() => updateStatus(activeOrder.orderId, 'out_for_delivery')}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500/20 to-orange-500/10 border border-orange-500/30 text-orange-400 font-bold hover:from-orange-500/30 hover:to-orange-500/20 transition-all flex items-center justify-center gap-2">
                  <Navigation size={18} /> Out for Delivery
                </button>
              )}
              {activeOrder.status === 'out_for_delivery' && (
                <div className="space-y-2">
                  <button onClick={async () => {
                    if (activeOrder.deliveryBoyLocation?.lat && activeOrder.customerLocation?.lat) {
                      const dist = calculateDistance(activeOrder.deliveryBoyLocation.lat, activeOrder.deliveryBoyLocation.lng, activeOrder.customerLocation.lat, activeOrder.customerLocation.lng);
                      if (dist > 50) { if (!confirm(`You're ${Math.round(dist)}m away. Still mark as reached?`)) return; }
                    }
                    const res = await fetchWithTimeout(`/api/orders/${activeOrder.orderId}/generate-delivery-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
                    if ((await res.json()).ok) alert('OTP sent to customer. Ask them for the code.');
                  }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-500/20 to-green-500/10 border border-green-500/30 text-green-400 font-bold hover:from-green-500/30 hover:to-green-500/20 transition-all flex items-center justify-center gap-2">
                    <MapPin size={18} /> Reached Customer
                  </button>
                </div>
              )}
            </div>

            {activeOrder.status === 'out_for_delivery' && (
              <div className="space-y-3 pt-2">
                <p className="text-[#A39791] text-sm font-bold">Customer ka OTP enter karo:</p>
                <div className="flex gap-3">
                  <input value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="6-digit OTP" maxLength={6}
                    className="flex-1 px-4 py-4 rounded-2xl bg-[#16100D]/80 border border-white/10 text-white text-center text-3xl font-black tracking-widest focus:outline-none focus:border-[#F07D14] shadow-inner" />
                  <button onClick={verifyOtp} disabled={otpInput.length !== 6 || otpLoading}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 shadow-lg flex items-center gap-2">
                    <CheckCircle size={20} /> {otpLoading ? '...' : 'Confirm'}
                  </button>
                </div>
                {otpError && <p className="text-red-400 text-sm font-semibold">{otpError}</p>}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = (() => { try { return JSON.parse(localStorage.getItem('bim_user') || 'null'); } catch { return null; }})();

  const [orders, setOrders] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newAssignmentBanner, setNewAssignmentBanner] = useState(null);
  const [liveTracking, setLiveTracking] = useState(false);
  const [locationUpdating, setLocationUpdating] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const locationIntervalRef = useRef(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [driverPath, setDriverPath] = useState([]);
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [restaurantLocation, setRestaurantLocation] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const photoInputRef = useRef(null);
  const watchIdRef = useRef(null);

  const { pushLocation, isConnected } = useSocket({
    joinDelivery: user?.id,
    onNewAssignment: (order) => {
      setOrders(prev => {
        const exists = prev.some(o => o.orderId === order.orderId);
        return exists ? prev.map(o => o.orderId === order.orderId ? order : o) : [order, ...prev];
      });
      setNewAssignmentBanner(order);
    },
    onOrderUpdated: (order) => {
      setOrders(prev => prev.map(o => (o.orderId === order.orderId || o._id === order._id) ? { ...o, ...order } : o));
      if (activeOrder && (activeOrder.orderId === order.orderId || activeOrder._id === order._id)) {
        setActiveOrder(prev => prev ? { ...prev, ...order } : prev);
      }
    },
  });

  const isConnectedRef = useRef(isConnected);
  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetchWithTimeout('/api/delivery/orders', { headers, credentials: 'include' });
      const data = await safeJson(res);
      if (data.ok) {
        setOrders(data.orders);
        const active = data.orders.find(o => o.status === 'out_for_delivery');
        if (active) setActiveOrder(active);
      }
    } catch (err) { if (err.message !== 'Request timeout') console.error('Failed to fetch orders:', err); }
    try {
      const res2 = await fetchWithTimeout('/api/delivery/earnings', { credentials: 'include' });
      const data2 = await safeJson(res2);
      if (data2.ok && data2.recentOrders) setDeliveredOrders(data2.recentOrders);
    } catch {}
    setLoading(false); setRefreshing(false);
  }, [headers]);

  const fetchNotificationsData = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await fetchWithTimeout('/api/delivery/notifications', { credentials: 'include' });
      const data = await safeJson(res);
      if (data.ok) {
        setNotifications(data.notifications || []);
        setUnreadNotifCount(data.unreadCount || 0);
      }
    } catch {}
    setNotifLoading(false);
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchOrders();
    fetchNotificationsData();
    (async () => {
      try {
        const res = await fetchWithTimeout('/api/settings', { credentials: 'include' });
        const data = await safeJson(res);
        if (data.ok && data.settings?.restaurantLocation?.lat) {
          setRestaurantLocation({ lat: data.settings.restaurantLocation.lat, lng: data.settings.restaurantLocation.lng, address: data.settings.address || 'Restaurant' });
        }
      } catch {}
    })();
  }, []);

  useAutoRefresh({ fetchFn: () => fetchOrders(true), interval: 45_000 });

  const toggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    try { await fetchWithTimeout('/api/delivery/status', { method: 'PATCH', headers, credentials: 'include', body: JSON.stringify({ isOnline: newStatus }) }); } catch {}
  };

  const fetchRoute = useCallback(async (start, end) => {
    if (!start?.lat || !start?.lng || !end?.lat || !end?.lng) return;
    if (distanceMeters(start.lat, start.lng, end.lat, end.lng) < 12) {
      setRouteGeometry([]);
      return;
    }
    setRouteLoading(true);
    try {
      const res = await fetchWithTimeout('/api/routes/directions', { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ start, end }) });
      const data = await safeJson(res);
      if (data.ok && data.route?.routes?.[0]?.geometry?.coordinates) {
        setRouteGeometry(data.route.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })));
      } else {
        setRouteGeometry(straightLineRoute(start, end));
      }
    } catch (err) {
      console.error('Failed to fetch route:', err);
      setRouteGeometry(straightLineRoute(start, end));
    }
    setRouteLoading(false);
  }, [headers]);

  const snapToRoad = useCallback(async (path) => {
    if (!path || path.length < 3) return;
    try {
      const res = await fetchWithTimeout('/api/routes/snap', { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ coordinates: path }) });
      const data = await res.json();
      if (data.ok && data.matched?.snapped_waypoints?.length >= 2) {
        setRouteGeometry(data.matched.snapped_waypoints.map(c => ({ lat: c[1], lng: c[0] })));
      } else if (data.ok && data.matched?.routes?.[0]?.geometry?.coordinates?.length >= 2) {
        setRouteGeometry(data.matched.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })));
      }
    } catch {}
  }, [headers]);

  const startLiveTracking = useCallback((orderId) => {
    if (!navigator.geolocation || watchIdRef.current != null) return;
    const updateCountRef = { current: 0 };
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setDriverPath(prev => {
          const last = prev[prev.length - 1];
          const newPoint = { lat, lng };
          if (!last || (Math.abs(last.lat - lat) > 0.0001 || Math.abs(last.lng - lng) > 0.0001)) {
            const updated = [...prev, newPoint].slice(-50);
            updateCountRef.current += 1;
            if (updateCountRef.current % 8 === 0 && updated.length >= 3) snapToRoad(updated);
            return updated;
          }
          return prev;
        });
        // Socket is the primary, fast transport. REST PATCH is only a
        // fallback for when the socket is disconnected — previously both
        // fired on every tick, doubling requests and hastening rate-limit
        // hits. Bug report §3e.
        if (isConnectedRef.current) {
          pushLocation({ orderId, lat, lng, deliveryBoyId: user?.id });
        } else {
          try { await fetchWithTimeout(`/api/delivery/orders/${orderId}/location`, { method: 'PATCH', headers, body: JSON.stringify({ lat, lng }) }); } catch {}
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    setLiveTracking(true);
  }, [headers, pushLocation, user?.id, snapToRoad]);

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setLiveTracking(false);
  }, []);

  useEffect(() => () => stopLiveTracking(), [stopLiveTracking]);

  const pushMyLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try { await fetchWithTimeout('/api/delivery/my-location', { method: 'PATCH', headers, credentials: 'include', body: JSON.stringify({ lat, lng }) }); setLastLocationUpdate(new Date()); } catch {}
      }, () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, [headers]);

  const manualLocationUpdate = useCallback(async () => {
    if (!navigator.geolocation || locationUpdating) return;
    setLocationUpdating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try { await fetchWithTimeout('/api/delivery/my-location', { method: 'PATCH', headers, credentials: 'include', body: JSON.stringify({ lat, lng }) }); setLastLocationUpdate(new Date()); } catch {}
        setLocationUpdating(false);
      }, () => { setLocationUpdating(false); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }, [headers, locationUpdating]);

  useEffect(() => {
    let cleanupBg = null;
    if (isOnline) {
      pushMyLocation();
      locationIntervalRef.current = setInterval(pushMyLocation, LOCATION_UPDATE_INTERVAL);
      cleanupBg = enableBackgroundTracking(pushMyLocation);
    } else {
      disableBackgroundTracking();
      if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null; }
    }
    return () => { if (cleanupBg) cleanupBg(); if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null; } };
  }, [isOnline, pushMyLocation]);

  useEffect(() => {
    if (activeOrder?.orderId && activeOrder.status === 'out_for_delivery') startLiveTracking(activeOrder.orderId);
  }, [activeOrder?.orderId, activeOrder?.status, startLiveTracking]);

  const acceptOrder = (orderId) => {
    if (!navigator.geolocation) { alert('GPS is not available on this device.'); return; }
    setAcceptingId(orderId);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetchWithTimeout(`/api/delivery/orders/${orderId}/accept`, { method: 'PATCH', headers, credentials: 'include', body: JSON.stringify({ lat, lng }) });
          const data = await safeJson(res);
          if (data.ok) setOrders(prev => prev.map(o => o.orderId === orderId ? data.order : o));
          else alert(data.error || 'Could not accept order');
        } catch { alert('Network error while accepting order'); }
        setAcceptingId(null);
      }, () => { alert('Could not get your location. Please enable GPS to accept the order.'); setAcceptingId(null); }
    );
  };

  const rejectOrder = async () => {
    if (!rejectReason || !rejectModal) return;
    setRejectingId(rejectModal);
    try {
      const res = await fetchWithTimeout(`/api/delivery/orders/${rejectModal}/reject`, { method: 'PATCH', headers, credentials: 'include', body: JSON.stringify({ reason: rejectReason }) });
      const data = await safeJson(res);
      if (data.ok) setOrders(prev => prev.filter(o => o.orderId !== rejectModal));
      else alert(data.error || 'Could not reject order');
    } catch { alert('Network error'); }
    setRejectModal(null); setRejectReason(''); setRejectingId(null);
  };

  const updateStatus = async (orderId, status) => {
    try {
      if (status === 'out_for_delivery') {
        const order = orders.find(o => o.orderId === orderId);
        if (order?.deliveryBoyLocation && order?.customerLocation) {
          await fetchRoute({ lat: order.deliveryBoyLocation.lat, lng: order.deliveryBoyLocation.lng }, { lat: order.customerLocation.lat, lng: order.customerLocation.lng });
        }
      }
      await fetchWithTimeout(`/api/delivery/orders/${orderId}/status`, { method: 'PATCH', headers, credentials: 'include', body: JSON.stringify({ status }) });
      fetchOrders(true);
    } catch {}
  };

  const verifyOtp = async () => {
    if (!otpInput || !activeOrder) return;
    setOtpLoading(true); setOtpError('');
    try {
      const res = await fetchWithTimeout(`/api/delivery/orders/${activeOrder.orderId}/verify-otp`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ otp: otpInput }) });
      const data = await res.json();
      if (data.ok) { stopLiveTracking(); setActiveOrder(null); setOtpInput(''); fetchOrders(true); alert('✅ Delivery confirmed!'); }
      else setOtpError(data.error || 'Wrong OTP');
    } catch { setOtpError('Network error'); }
    setOtpLoading(false);
  };

  const handleLogout = async () => {
    try { await fetchWithTimeout('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    localStorage.removeItem('bim_user');
    dispatch(logout());
    navigate('/login');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData(); fd.append('photo', file);
      const res = await fetchWithTimeout('/api/auth/profile/photo', { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json();
      if (data.ok) {
        const updatedUser = { ...user, photoUrl: data.photoUrl };
        localStorage.setItem('bim_user', JSON.stringify(updatedUser));
        setLastLocationUpdate(prev => prev || new Date());
      }
    } catch {}
    setPhotoUploading(false);
  };

  const pendingOrders = orders.filter(o => !(o.status === 'out_for_delivery'));

  // Stats
  const totalEarnings = deliveredOrders.reduce((sum, o) => sum + (o.commission || 0), 0);
  const totalDeliveries = deliveredOrders.length;
  const todayDeliveries = deliveredOrders.filter(o => {
    if (!o.date) return false;
    return new Date(o.date).toDateString() === new Date().toDateString();
  }).length;
  const avgRating = 4.5;

  return (
    <div className="min-h-screen bg-[#0A0604] pb-24">
      {/* Header */}
      <header className="bg-gradient-to-b from-[#1A1310] to-[#16100D] border-b border-white/5 px-4 py-4 sticky top-0 z-20 backdrop-blur-sm" style={{ paddingTop: 'max(1rem, calc(1rem + env(safe-area-inset-top)))' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F07D14]/30 to-[#F07D14]/10 flex items-center justify-center text-xl shadow-lg shadow-[#F07D14]/10">🛵</div>
            <div>
              <p className="text-white font-bold text-base leading-tight">{user?.name || 'Delivery Boy'}</p>
              <p className="text-[#8E827B] text-xs">{user?.phone || 'Not logged in'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleOnline}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${isOnline ? 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25 shadow-lg shadow-green-500/10' : 'bg-gray-500/15 text-gray-400 border-white/10 hover:bg-gray-500/25'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </button>
            <button onClick={manualLocationUpdate} disabled={locationUpdating} title="Update My Location"
              className="p-2.5 rounded-xl bg-[#16100D] border border-white/10 text-[#8E827B] hover:text-[#F07D14] transition-all disabled:opacity-50 shadow-lg">
              {locationUpdating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      <AnimatePresence>{!isOnline && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="bg-gradient-to-r from-gray-500/15 to-gray-500/10 border-b border-gray-500/20 px-4 py-3">
          <p className="text-gray-400 text-sm text-center font-bold max-w-lg mx-auto">⛔ You are Offline — Nayi orders assign nahi hongi jab tak Online nahi hote</p>
        </motion.div>
      )}</AnimatePresence>

      {/* Location Update Banner */}
      <AnimatePresence>{isOnline && lastLocationUpdate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="bg-gradient-to-r from-green-500/15 to-green-500/10 border-b border-green-500/20 px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <p className="text-green-400 text-sm flex items-center gap-2 font-semibold">
              <LocateFixed size={14} /> Location updated: {lastLocationUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <button onClick={manualLocationUpdate} disabled={locationUpdating}
              className="text-green-400 text-xs font-bold hover:text-green-300 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10">
              {locationUpdating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Update
            </button>
          </div>
        </motion.div>
      )}</AnimatePresence>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Tab Switcher - Orders, Earnings, Profile, Notifications */}
        <div className="sticky top-[72px] z-10 -mx-4 px-4 py-2 bg-[#0A0604]/95 backdrop-blur-sm">
          <div className="flex gap-1 bg-[#1A1310] rounded-2xl p-1 border border-white/5 overflow-x-auto no-scrollbar max-w-lg mx-auto">
            {[
              { id: 'orders', label: 'Orders', icon: '📦' },
              { id: 'earnings', label: 'Earnings', icon: '💰' },
              { id: 'profile', label: 'Profile', icon: '👤' },
              { id: 'notifications', label: 'Alerts', icon: '🔔' },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative ${activeTab === t.id ? 'bg-[#F07D14] text-white' : 'text-[#8E827B] hover:text-white'}`}>
                <span>{t.icon}</span> {t.label}
                {t.id === 'notifications' && unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <>
            {/* New Assignment Toast */}
            <AnimatePresence>{newAssignmentBanner && (
              <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/30 rounded-2xl p-5 flex items-start gap-4 shadow-xl shadow-green-500/10">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center shrink-0 animate-bounce"><BellRing size={22} className="text-green-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-green-400 font-black text-lg mb-1">Nayi Order Assign Hui!</p>
                  <p className="text-[#A39791] text-sm">{newAssignmentBanner.orderId} • ₹{newAssignmentBanner.totals?.total?.toFixed(0)} • {newAssignmentBanner.customerLocation?.area}</p>
                </div>
                <button onClick={() => setNewAssignmentBanner(null)} className="text-[#8E827B] hover:text-white p-2 shrink-0 rounded-xl hover:bg-white/5 transition-colors"><X size={18} /></button>
              </motion.div>
            )}</AnimatePresence>

            {/* Active Order Card with Map */}
            <ActiveOrderCard
              activeOrder={activeOrder}
              liveTracking={liveTracking}
              driverPath={driverPath}
              routeGeometry={routeGeometry}
              fetchRoute={fetchRoute}
              restaurantLocation={restaurantLocation}
              updateStatus={updateStatus}
              otpInput={otpInput}
              setOtpInput={setOtpInput}
              otpError={otpError}
              otpLoading={otpLoading}
              verifyOtp={verifyOtp}
            />

            {/* Assigned Orders */}
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black text-lg">Assigned Orders</h2>
              <button onClick={() => fetchOrders(true)} disabled={refreshing}
                className="p-2.5 rounded-xl bg-[#1A1310] border border-white/10 text-[#8E827B] hover:text-white transition-all shadow-lg">
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-48 bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-3xl animate-pulse shadow-xl" />)}</div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-3xl border border-white/10 shadow-xl">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-white font-black text-xl mb-2">Koi pending order nahi</p>
                <p className="text-[#8E827B] text-sm">{isOnline ? 'Nayi orders ka wait kar rahe hain...' : 'Online ho jao orders receive karne ke liye'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map(order => {
                  const isNew = order.status === 'confirmed' && !order.acceptedAt;
                  const isExpanded = expandedOrderId === order.orderId;
                  const assignedAt = order.assignedAt || order.createdAt;
                  return (
                    <motion.div key={order._id || order.orderId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className={`group relative bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-3xl border overflow-hidden transition-all shadow-xl hover:shadow-2xl ${isNew ? 'border-green-500/30' : 'border-white/10'}`}>
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-white font-black text-base mb-1.5">{order.orderId}</p>
                            {assignedAt && <span className="flex items-center gap-1.5 text-[#8E827B] text-xs bg-white/5 px-2.5 py-1 rounded-lg"><Timer size={12} /> {timeAgo(assignedAt)}</span>}
                          </div>
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ${isNew ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                            {isNew ? '🔔 Nayi Order' : 'Accepted'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 bg-[#16100D]/60 rounded-2xl px-4 py-3 border border-white/5">
                          <MapPin size={16} className="text-[#F07D14] shrink-0" />
                          <p className="text-[#A39791] text-sm font-medium flex-1 truncate">{order.customerLocation?.area || order.customerLocation?.locality || order.customer?.area || 'Area not specified'}</p>
                          <span className="text-[#8E827B] text-xs font-semibold bg-white/5 px-2.5 py-1 rounded-lg">{isExpanded ? 'Full address visible' : 'Accept to see full address'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-[#8E827B] text-sm bg-white/5 px-3 py-1.5 rounded-lg"><Package size={14} /><span>{order.items?.length || 0} items</span></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-[#4A3F38]" />
                          <span className="text-[#F07D14] font-black text-lg">₹{order.totals?.total?.toFixed(0)}</span>
                        </div>
                        <AnimatePresence>{isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="bg-[#16100D]/60 rounded-2xl px-4 py-3 space-y-2.5 border border-white/5">
                            <p className="text-white text-sm font-bold">{order.customer?.name}</p>
                            {order.customer?.phone && <a href={`tel:${order.customer.phone}`} className="flex items-center gap-2 text-[#F07D14] text-sm font-semibold hover:underline"><Phone size={14} /> {order.customer.phone}</a>}
                            {(order.customer?.address || order.customerLocation?.address) && <p className="text-[#8E827B] text-sm leading-relaxed">{order.customer?.address || order.customerLocation?.address}</p>}
                          </motion.div>
                        )}</AnimatePresence>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          {isNew ? (
                            <>
                              <button onClick={() => { acceptOrder(order.orderId); setExpandedOrderId(order.orderId); }} disabled={acceptingId === order.orderId}
                                className="py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-60 shadow-lg flex items-center justify-center gap-2">
                                <CheckCircle size={16} /> {acceptingId === order.orderId ? 'Getting location...' : 'Accept'}
                              </button>
                              <button onClick={() => { setRejectModal(order.orderId); setRejectReason(''); }}
                                className="py-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/25 transition-all shadow-lg flex items-center justify-center gap-2">
                                <X size={16} /> Reject
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                                className="py-3.5 rounded-2xl bg-[#16100D]/60 border border-white/10 text-[#8E827B] font-bold hover:text-white hover:bg-white/10 transition-all shadow-lg flex items-center justify-center gap-2">
                                <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} /> {isExpanded ? 'Hide Details' : 'Show Details'}
                              </button>
                              <button onClick={() => navigate(`/delivery/orders/${order.orderId}`)}
                                className="py-3.5 rounded-2xl bg-gradient-to-r from-[#F07D14]/20 to-[#F07D14]/10 border border-[#F07D14]/30 text-[#F07D14] font-bold hover:from-[#F07D14]/30 hover:to-[#F07D14]/20 transition-all shadow-lg flex items-center justify-center gap-2">
                                Full Details →
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Recent Deliveries */}
            {deliveredOrders.length > 0 && (
              <div className="space-y-4 pt-4">
                <p className="text-[#8E827B] text-sm font-bold uppercase tracking-widest">Recent Deliveries</p>
                {deliveredOrders.slice(0, 3).map((order, i) => (
                  <motion.div key={order.orderId || i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-3xl border border-white/10 p-5 space-y-3.5 shadow-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-white font-black text-base">{order.orderId}</p>{order.customerName && <p className="text-[#8E827B] text-sm mt-1">{order.customerName}</p>}</div>
                      <div className="text-right shrink-0"><p className="text-[#F07D14] font-black text-lg">+₹{order.commission}</p><p className="text-[#8E827B] text-xs">of ₹{Math.round(order.total || 0)}</p></div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {order.date && (
                        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                          <Clock size={12} className="text-[#8E827B]" />
                          <span className="text-[#8E827B] text-xs font-medium">{new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      )}
                      {order.deliveryAddress && (
                        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 flex-1 min-w-0">
                          <MapPin size={12} className="text-[#F07D14] shrink-0" />
                          <span className="text-[#8E827B] text-xs truncate font-medium">{order.deliveryAddress}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── EARNINGS TAB ── */}
        {activeTab === 'earnings' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#F07D14]/20 to-[#1A1310] rounded-2xl border border-[#F07D14]/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center"><DollarSign size={24} className="text-yellow-400" /></div>
                <div>
                  <p className="text-[#A39791] text-sm">Total Earnings</p>
                  <p className="text-white font-bold text-3xl">₹{totalEarnings.toFixed(0)} <span className="text-[#F07D14] text-lg">earned</span></p>
                </div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-sm text-[#A39791]">💡 Commission rate: <span className="text-white font-semibold">10%</span> per order total</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-2"><Trophy size={16} className="text-[#F07D14]" /><p className="text-[#8E827B] text-xs font-semibold">Total Deliveries</p></div>
                <p className="text-white font-black text-2xl">{totalDeliveries}</p>
              </div>
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-green-400" /><p className="text-[#8E827B] text-xs font-semibold">Today</p></div>
                <p className="text-white font-black text-2xl">{todayDeliveries}</p>
              </div>
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-2"><Award size={16} className="text-yellow-400" /><p className="text-[#8E827B] text-xs font-semibold">Avg. Rating</p></div>
                <p className="text-white font-black text-2xl">{avgRating} <span className="text-[#8E827B] text-sm">★</span></p>
              </div>
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-2"><Star size={16} className="text-[#F07D14]" /><p className="text-[#8E827B] text-xs font-semibold">Avg. per Order</p></div>
                <p className="text-white font-black text-2xl">₹{totalDeliveries > 0 ? (totalEarnings / totalDeliveries).toFixed(0) : '0'}</p>
              </div>
            </div>

            {deliveredOrders.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-3xl border border-white/10">
                <div className="text-5xl mb-4">💰</div>
                <p className="text-white font-black text-xl mb-2">Abhi tak koi earning nahi</p>
                <p className="text-[#8E827B] text-sm">Orders deliver karo aur earning shuru karo!</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-2xl border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-white font-bold text-sm flex items-center gap-2"><Clock size={14} className="text-[#F07D14]" /> Recent Earnings</p>
                  <span className="text-[#8E827B] text-xs">{deliveredOrders.length} deliveries</span>
                </div>
                {deliveredOrders.slice(0, 5).map((order, i) => (
                  <div key={order.orderId || i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-white font-bold text-sm">{order.orderId}</p>
                      <p className="text-[#8E827B] text-xs">{order.customerName || ''} · {new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                    </div>
                    <p className="text-[#F07D14] font-bold">+₹{order.commission}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 py-6 bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-3xl border border-white/5">
              <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt="avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-[#F07D14]/30" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F07D14] to-[#E86C1B] flex items-center justify-center shadow-lg shadow-[#F07D14]/20">
                    <span className="text-white text-2xl font-bold">{(user?.name || 'D').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {photoUploading ? <Loader2 size={20} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-xl">{user?.name || 'Delivery Boy'}</p>
                <p className="text-[#8E827B] text-sm">{user?.phone || 'Not logged in'}</p>
                <div className="flex gap-2 mt-2 justify-center">
                  {isOnline && <span className="text-xs bg-green-500/15 text-green-400 px-2.5 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online</span>}
                  <span className="text-xs bg-[#F07D14]/15 text-[#F07D14] px-2.5 py-1 rounded-full flex items-center gap-1">🛵 Delivery Boy</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 text-center"><p className="text-[#F07D14] font-black text-xl">{totalDeliveries}</p><p className="text-[#8E827B] text-xs mt-1">Delivered</p></div>
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 text-center"><p className="text-green-400 font-black text-xl">₹{totalEarnings.toFixed(0)}</p><p className="text-[#8E827B] text-xs mt-1">Earned</p></div>
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 text-center"><p className="text-yellow-400 font-black text-xl">{avgRating}</p><p className="text-[#8E827B] text-xs mt-1">Rating</p></div>
            </div>

            <button onClick={() => navigate('/delivery/profile')}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-gradient-to-br from-[#1A1310] to-[#16100D] border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3"><User size={18} className="text-[#F07D14]" /><span className="text-white font-semibold">Profile Settings</span></div>
              <ChevronRight size={16} className="text-[#8E827B]" />
            </button>

            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-br from-red-500/15 to-red-500/10 border border-red-500/30 text-red-400 font-bold hover:from-red-500/20 hover:to-red-500/15 transition-all">
              <LogOut size={18} /><span>Logout</span>
            </button>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black text-lg">Notifications</h2>
              {unreadNotifCount > 0 && <span className="bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white text-xs font-bold px-3 py-1.5 rounded-full">{unreadNotifCount} new</span>}
            </div>

            {notifLoading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-2xl animate-pulse border border-white/10" />)}</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-3xl border border-white/10">
                <div className="text-5xl mb-4">🔔</div>
                <p className="text-white font-black text-xl mb-2">Koi notification nahi</p>
                <p className="text-[#8E827B] text-sm">Naye alerts yahaan dikhenge</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif, i) => (
                  <motion.div key={notif._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={`bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-2xl border p-4 ${notif.read ? 'border-white/5' : 'border-[#F07D14]/30 bg-[#F07D14]/5'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${notif.read ? 'bg-white/5' : 'bg-[#F07D14]/20'}`}>
                        <Bell size={16} className={notif.read ? 'text-[#8E827B]' : 'text-[#F07D14]'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notif.read ? 'text-[#A39791]' : 'text-white font-semibold'}`}>{notif.message || notif.title || 'Notification'}</p>
                        {notif.createdAt && <p className="text-[#8E827B] text-xs mt-1">{timeAgo(notif.createdAt)}</p>}
                      </div>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-[#F07D14] shrink-0 mt-2" />}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <AnimatePresence>{rejectModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center px-4 pb-6" onClick={() => setRejectModal(null)}>
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <p className="text-white font-black text-lg">Order Reject Karo</p>
              <button onClick={() => setRejectModal(null)} className="text-[#8E827B] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-[#8E827B] text-sm font-medium">Reject karne ki wajah chuniye:</p>
              <div className="space-y-2.5">
                {REJECT_REASONS.map(reason => (
                  <button key={reason} onClick={() => setRejectReason(reason)}
                    className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold transition-all border ${rejectReason === reason ? 'bg-red-500/20 border-red-500/40 text-red-300 shadow-lg shadow-red-500/10' : 'bg-white/5 border-white/10 text-[#A39791] hover:border-white/20 hover:text-white hover:bg-white/10'}`}>
                    {reason}
                  </button>
                ))}
              </div>
              <button onClick={rejectOrder} disabled={!rejectReason || rejectingId === rejectModal}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                <AlertTriangle size={18} /> {rejectingId === rejectModal ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}