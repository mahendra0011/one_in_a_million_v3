import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Navigation, CheckCircle2,
  Package, Clock, Radio, Bike, ShoppingBag, Truck, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';
import LiveTrackingMap from '../../components/LiveTrackingMap';

const STATUS_FLOW = [
  { key: 'confirmed',          label: 'Order Accepted',      icon: CheckCircle2, color: 'text-blue-400',   bg: 'bg-blue-500/20',   border: 'border-blue-500/30' },
  { key: 'reached_restaurant', label: 'Reached Restaurant',  icon: Bike,         color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  { key: 'picked_up',          label: 'Picked Up',           icon: ShoppingBag,  color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  { key: 'out_for_delivery',   label: 'Out for Delivery',    icon: Truck,        color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  { key: 'delivered',          label: 'Delivered',           icon: Star,         color: 'text-green-400',  bg: 'bg-green-500/20',  border: 'border-green-500/30' },
];

const STATUS_STYLE = {
  confirmed:          { bg: 'bg-blue-500/20',   text: 'text-blue-400',   label: 'Accepted' },
  preparing:          { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Preparing' },
  reached_restaurant: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'At Restaurant' },
  picked_up:          { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Picked Up' },
  out_for_delivery:   { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Out for Delivery' },
  delivered:          { bg: 'bg-green-500/20',  text: 'text-green-400',  label: 'Delivered' },
};

// Next action to show based on current status
const NEXT_ACTION = {
  confirmed:          { nextStatus: 'reached_restaurant', label: 'Reached Restaurant',   icon: Bike,         color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', hoverBg: 'hover:bg-purple-500/30' },
  preparing:          { nextStatus: 'reached_restaurant', label: 'Reached Restaurant',   icon: Bike,         color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', hoverBg: 'hover:bg-purple-500/30' },
  reached_restaurant: { nextStatus: 'picked_up',          label: 'Picked Up',            icon: ShoppingBag,  color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', hoverBg: 'hover:bg-yellow-500/30' },
  picked_up:          { nextStatus: 'out_for_delivery',   label: 'Out for Delivery',     icon: Truck,        color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', hoverBg: 'hover:bg-orange-500/30' },
};

function openMaps(lat, lng) {
  window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
}

export default function DeliveryOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('bim_user') || 'null'); } catch { return null; }})();
  const headers = { 'Content-Type': 'application/json' };

  const [order, setOrder]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [liveTracking, setLiveTracking] = useState(false);
  const watchIdRef = useRef(null);

  // OTP flow
  const [otpStage, setOtpStage]     = useState(false);
  const [otpInput, setOtpInput]     = useState('');
  const [otpError, setOtpError]     = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [markLoading, setMarkLoading] = useState(false);

  const { pushLocation } = useSocket({ joinDelivery: user?.id });

  const fetchOrder = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchWithTimeout(`/api/delivery/orders/${orderId}`, { headers, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load order');
      setOrder(data.order);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (!user) { navigate('/delivery/login'); return; }
    fetchOrder();
  }, [fetchOrder]);

  // Live tracking
  const startLiveTracking = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current != null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        pushLocation({ orderId, lat, lng, deliveryBoyId: user?.id });
        try {
          await fetchWithTimeout(`/api/delivery/orders/${orderId}/location`, {
            method: 'PATCH', headers, body: JSON.stringify({ lat, lng }),
          });
          setOrder(prev => prev ? { ...prev, deliveryBoyLocation: { lat, lng, updatedAt: new Date().toISOString() } } : prev);
        } catch {}
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    setLiveTracking(true);
  }, [orderId, headers, pushLocation, user?.id]);

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLiveTracking(false);
  }, []);

  useEffect(() => () => stopLiveTracking(), [stopLiveTracking]);

  useEffect(() => {
    if (order?.status === 'out_for_delivery') startLiveTracking();
    if (order?.status === 'delivered') stopLiveTracking();
  }, [order?.status, startLiveTracking, stopLiveTracking]);

  const updateStatus = async (newStatus) => {
    setStatusUpdating(true);
    try {
      const res = await fetchWithTimeout(`/api/delivery/orders/${orderId}/status`, {
        method: 'PATCH', headers, credentials: 'include', body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.ok || res.ok) {
        setOrder(prev => prev ? { ...prev, status: newStatus } : prev);
      } else {
        alert(data.error || 'Status update failed');
      }
    } catch { alert('Network error'); }
    setStatusUpdating(false);
  };

  const requestDeliveryOtp = async () => {
    setMarkLoading(true); setOtpError('');
    try {
      const res = await fetchWithTimeout(`/api/delivery/orders/${orderId}/request-delivery-otp`, {
        method: 'POST', headers, credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send OTP');
      setOtpStage(true);
    } catch (e) { setOtpError(e.message); }
    setMarkLoading(false);
  };

  const verifyOtp = async () => {
    if (otpInput.length !== 6) return;
    setOtpLoading(true); setOtpError('');
    try {
      const res = await fetchWithTimeout(`/api/delivery/orders/${orderId}/verify-otp`, {
        method: 'POST', headers, credentials: 'include', body: JSON.stringify({ otp: otpInput }),
      });
      const data = await res.json();
      if (!data.ok) { setOtpError(data.error || 'Wrong OTP'); setOtpLoading(false); return; }
      stopLiveTracking();
      setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev);
      setOtpStage(false);
      setOtpInput('');
    } catch { setOtpError('Network error'); }
    setOtpLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0604] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F07D14] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0A0604] flex flex-col items-center justify-center px-4 text-center gap-3">
        <p className="text-white font-bold">{error || 'Order not found'}</p>
        <button onClick={() => navigate('/delivery')} className="text-[#F07D14] text-sm font-semibold hover:underline">
          ← Dashboard par wapas jao
        </button>
      </div>
    );
  }

  const st = STATUS_STYLE[order.status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: order.status };
  const isDelivered = order.status === 'delivered';
  const nextAction = NEXT_ACTION[order.status];
  const currentStepIdx = STATUS_FLOW.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-[#0A0604] pb-10">
      {/* Header */}
      <div className="bg-[#1A1310] border-b border-white/5 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/delivery')} className="p-2 -ml-2 rounded-xl text-[#8E827B] hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">{order.orderId}</p>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
          {liveTracking && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full">
              <Radio size={9} className="animate-pulse" /> LIVE
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Status Progress Bar */}
        <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4">
          <p className="text-[#8E827B] text-[10px] font-bold uppercase tracking-wide mb-3">Delivery Progress</p>
          <div className="flex items-center gap-0">
            {STATUS_FLOW.map((step, idx) => {
              const isCompleted = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                    isCompleted
                      ? `${step.bg} ${step.border} ${step.color}`
                      : 'bg-[#16100D] border-white/10 text-[#4A3F38]'
                  } ${isCurrent ? 'ring-2 ring-offset-2 ring-offset-[#1A1310] ring-[#F07D14]/60' : ''}`}>
                    <Icon size={14} />
                  </div>
                  {idx < STATUS_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors ${
                      idx < currentStepIdx ? 'bg-[#F07D14]/50' : 'bg-white/10'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2">
            <p className="text-white text-xs font-semibold">
              {STATUS_FLOW[currentStepIdx]?.label || order.status}
            </p>
          </div>
        </div>

        {/* Customer Card */}
        <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 space-y-3">
          <p className="text-[#8E827B] text-[10px] font-bold uppercase tracking-wide">Customer</p>

          {/* Name */}
          <p className="text-white font-bold text-xl">{order.customer?.name || '—'}</p>

          {/* Phone — tap to call */}
          {order.customer?.phone && (
            <a
              href={`tel:${order.customer.phone}`}
              className="flex items-center gap-3 bg-[#F07D14]/10 border border-[#F07D14]/25 rounded-xl px-4 py-3 hover:bg-[#F07D14]/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[#F07D14]/20 flex items-center justify-center shrink-0">
                <Phone size={16} className="text-[#F07D14]" />
              </div>
              <div>
                <p className="text-[#F07D14] font-bold text-sm">{order.customer.phone}</p>
                <p className="text-[#8E827B] text-xs">Tap karke directly call karo</p>
              </div>
            </a>
          )}

          {/* Delivery Address */}
          {(order.customer?.address || order.customerLocation?.address) && (
            <div className="flex items-start gap-3 bg-[#16100D] rounded-xl px-4 py-3">
              <MapPin size={15} className="text-[#F07D14] shrink-0 mt-0.5" />
              <div>
                <p className="text-[#8E827B] text-[10px] font-bold uppercase tracking-wide mb-1">Delivery Address</p>
                <p className="text-[#A39791] text-sm leading-relaxed">
                  {order.customer?.address || order.customerLocation?.address}
                </p>
              </div>
            </div>
          )}

          {/* Open in Google Maps */}
          {order.customerLocation?.lat ? (
            <button
              onClick={() => openMaps(order.customerLocation.lat, order.customerLocation.lng)}
              className="w-full flex items-center justify-center gap-2 bg-[#F07D14] text-white text-sm font-bold rounded-xl py-3 hover:bg-[#E86C1B] transition-colors"
            >
              <Navigation size={16} />
              Open in Google Maps
            </button>
          ) : (
            <p className="text-[#8E827B] text-xs text-center">Customer ka GPS location available nahi hai</p>
          )}
        </div>

        {/* Live Tracking Map - Step 18: Show route when out for delivery */}
        {order.status === 'out_for_delivery' && order.customerLocation?.lat && order.customerLocation?.lng && (
          <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 space-y-3">
            <p className="text-[#8E827B] text-[10px] font-bold uppercase tracking-wide">Live Location</p>
            <LiveTrackingMap
              customerLocation={order.customerLocation}
              driverLocation={order.deliveryBoyLocation}
              height={180}
              showControls={false}
            />
            <p className="text-center text-green-400 text-xs font-semibold">
              🛵 Driver is on the way — distance updates in real-time
            </p>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 space-y-3">
          <p className="text-[#8E827B] text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5">
            <Package size={11} /> Order Items ({order.items?.length || 0})
          </p>
          <div className="space-y-2">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-white font-medium">{item.name}</p>
                  <p className="text-[#8E827B] text-xs">Qty: {item.qty}</p>
                </div>
                <span className="text-white font-bold">₹{((item.unitPrice || 0) * (item.qty || 1)).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <span className="text-[#A39791] font-semibold text-sm">Total</span>
            <span className="text-[#F07D14] font-bold text-lg">₹{order.totals?.total?.toFixed(0) || '—'}</span>
          </div>
        </div>

        {/* Status Update Buttons */}
        {!isDelivered && nextAction && (
          <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 space-y-3">
            <p className="text-[#8E827B] text-[10px] font-bold uppercase tracking-wide">Status Update Karo</p>
            <button
              onClick={() => updateStatus(nextAction.nextStatus)}
              disabled={statusUpdating}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 border ${nextAction.bg} ${nextAction.border} ${nextAction.color} ${nextAction.hoverBg}`}
            >
              <nextAction.icon size={16} />
              {statusUpdating ? 'Updating...' : nextAction.label}
            </button>
          </div>
        )}

        {/* Mark as Delivered / OTP Flow */}
        {!isDelivered && order.status === 'out_for_delivery' && (
          <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 space-y-3">
            <p className="text-[#8E827B] text-[10px] font-bold uppercase tracking-wide">Delivery Confirm Karo</p>
            <AnimatePresence mode="wait">
              {!otpStage ? (
                <motion.div key="mark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button
                    onClick={requestDeliveryOtp}
                    disabled={markLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors disabled:opacity-60"
                  >
                    <CheckCircle2 size={17} />
                    {markLoading ? 'Customer ko OTP bheja ja raha hai...' : 'Mark as Delivered'}
                  </button>
                  {otpError && <p className="text-red-400 text-xs text-center mt-2">{otpError}</p>}
                </motion.div>
              ) : (
                <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <p className="text-[#A39791] text-sm font-semibold">Customer ka OTP enter karo:</p>
                  {otpError && <p className="text-red-400 text-xs">{otpError}</p>}
                  <div className="flex gap-2">
                    <input
                      value={otpInput}
                      onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit OTP"
                      maxLength={6}
                      autoFocus
                      className="flex-1 px-3 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white text-center text-xl font-bold tracking-[0.3em] focus:outline-none focus:border-[#F07D14]"
                    />
                    <button
                      onClick={verifyOtp}
                      disabled={otpInput.length !== 6 || otpLoading}
                      className="px-4 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={16} />
                      {otpLoading ? '...' : 'Verify'}
                    </button>
                  </div>
                  <button
                    onClick={requestDeliveryOtp}
                    disabled={markLoading}
                    className="text-[#F07D14] text-xs font-semibold hover:underline"
                  >
                    OTP dobara bhejo
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Delivered Confirmation */}
        {isDelivered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center space-y-3"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <p className="text-green-400 font-bold text-lg">Order Deliver Ho Gaya!</p>
            <p className="text-[#8E827B] text-sm">Customer ko successfully deliver kiya gaya</p>
            <button
              onClick={() => navigate('/delivery')}
              className="mt-2 px-6 py-2.5 rounded-xl bg-[#F07D14] text-white font-bold text-sm hover:bg-[#E86C1B] transition-colors"
            >
              Dashboard par wapas jao
            </button>
          </motion.div>
        )}

        {/* Live Tracking Info (subtle, bottom) */}
        {!isDelivered && order.status === 'out_for_delivery' && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-xs font-medium border ${
            liveTracking
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-[#16100D] border-white/5 text-[#8E827B]'
          }`}>
            <Radio size={12} className={liveTracking ? 'animate-pulse' : ''} />
            {liveTracking
              ? 'Live location customer ko share ho rahi hai'
              : 'Live tracking inactive — GPS enable karo'}
          </div>
        )}
      </div>
    </div>
  );
}
