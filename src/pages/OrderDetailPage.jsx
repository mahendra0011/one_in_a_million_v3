import SEOHead from '../components/SEOHead';
import { fetchWithTimeout } from '../lib/utils';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, Clock, MapPin, Navigation, Star, ChevronRight, Truck, Radio, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import LiveTrackingMap from '../components/LiveTrackingMap';

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'reached_restaurant', 'picked_up', 'out_for_delivery', 'delivered'];
const STATUS_LABELS = {
  pending:          { emoji: '🧾', label: 'Order Received',      color: 'text-yellow-400', bar: 'bg-yellow-500' },
  confirmed:        { emoji: '✅', label: 'Order Confirmed',      color: 'text-blue-400',   bar: 'bg-blue-500' },
  preparing:        { emoji: '👨‍🍳', label: 'Being Prepared',      color: 'text-orange-400',  bar: 'bg-orange-500' },
  reached_restaurant: { emoji: '🏪', label: 'Reached Restaurant', color: 'text-purple-400', bar: 'bg-purple-500' },
  picked_up:        { emoji: '📦', label: 'Picked Up',            color: 'text-indigo-400',  bar: 'bg-indigo-500' },
  out_for_delivery: { emoji: '🛵', label: 'Out for Delivery',     color: 'text-[#F07D14]',   bar: 'bg-[#F07D14]' },
  delivered:        { emoji: '🎉', label: 'Delivered!',           color: 'text-green-400',   bar: 'bg-green-500' },
  cancelled:        { emoji: '❌', label: 'Order Cancelled',      color: 'text-red-400',     bar: 'bg-red-500' },
};

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetchWithTimeout(`/api/orders/${orderId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.ok) setOrder(d.order);
        else setError(d.error || 'Order not found');
      })
      .catch(() => setError('Failed to load order'))
      .finally(() => setLoading(false));
  }, [orderId]);

  // Live status updates via socket
  useEffect(() => {
    if (!order) return;
    let socket;
    import('socket.io-client').then(({ io }) => {
      socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
      socket.emit('track-order', order.orderId || order._id);
      socket.on('status-update', (payload) => {
        if (payload.orderId === (order.orderId || order._id)) {
          setOrder(prev => ({ ...prev, status: payload.status }));
        }
      });
      socket.on('delivery-location-update', (payload) => {
        setOrder(prev => ({ ...prev, deliveryBoyLocation: { lat: payload.lat, lng: payload.lng, updatedAt: payload.updatedAt } }));
      });
    }).catch(() => {});
    return () => { socket?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.orderId, order?._id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0604] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#F07D14]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0A0604] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-white font-bold text-lg mb-2">Order Not Found</p>
          <p className="text-[#8E827B] text-sm mb-6">{error || 'This order does not exist'}</p>
          <button onClick={() => navigate('/account')} className="px-6 py-2.5 bg-[#F07D14] text-white font-bold rounded-xl">
            Back to Account
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[order.status] || { emoji: '📦', label: order.status, color: 'text-gray-400', bar: 'bg-gray-500' };
  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const loc = order.deliveryBoyLocation;
  const hasLoc = loc?.lat && loc?.lng;
  const updatedAt = hasLoc && loc.updatedAt ? new Date(loc.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;

  const items = order.items || [];
  const total = order.totals?.total || 0;
  const subtotal = order.totals?.subtotal || total;
  const discount = order.totals?.discount || 0;
  const deliveryCharge = order.totals?.deliveryCharge || 0;

  return (
    <div className="min-h-screen bg-[#0A0604]" style={{ paddingTop: 'max(5rem, calc(5rem + env(safe-area-inset-top)))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
      <SEOHead title={`Order ${order.orderId}`} description="View your order details and track delivery status." noindex={true} />
      <div className="max-w-2xl mx-auto px-4">
        {/* Back button */}
        <button onClick={() => navigate('/account')} className="flex items-center gap-2 text-[#8E827B] hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Orders
        </button>

        {/* Order Header */}
        <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-white font-bold text-xl">Order #{order.orderId?.slice(-8) || order._id?.slice(-8)}</h1>
              <p className="text-[#8E827B] text-sm mt-0.5">
                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.color} bg-white/5`}>
              {statusInfo.emoji} {statusInfo.label}
            </span>
          </div>

          {/* Progress bar — only show for non-cancelled */}
          {!isCancelled && !isDelivered && currentStep >= 0 && (
            <div className="mt-4 space-y-1">
              <div className="flex gap-1">
                {STATUS_STEPS.slice(0, 6).map((s, i) => (
                  <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= currentStep ? 'bg-[#F07D14]' : 'bg-white/10'}`} />
                ))}
              </div>
              <p className="text-[#8E827B] text-xs text-right">{statusInfo.label}</p>
            </div>
          )}
        </div>

{/* Delivery Tracking with Live Map */}
         {order.status === 'out_for_delivery' && (
           <div className="bg-[#1A1310] rounded-2xl border border-[#F07D14]/30 p-4 mb-4">
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                 <Truck size={16} className="text-[#F07D14]" />
                 <p className="text-white font-bold text-sm">Live Tracking</p>
               </div>
               <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1.5">
                 <Radio size={10} className="animate-pulse" /> Live
               </span>
             </div>
             <LiveTrackingMap
               customerLocation={order.customerLocation}
               driverLocation={order.deliveryBoyLocation}
               height={200}
             />
             {loc && (
               <a href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`} target="_blank" rel="noopener noreferrer"
                 className="w-full flex items-center justify-center gap-2 bg-[#F07D14]/15 border border-[#F07D14]/30 rounded-xl py-2.5 text-[#F07D14] text-sm font-bold hover:bg-[#F07D14]/25 transition-colors mt-2">
                 <MapPin size={14} /> Open in Google Maps <ExternalLink size={12} />
               </a>
             )}
           </div>
         )}

        {/* Items */}
        <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 mb-4">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Package size={18} className="text-[#F07D14]" /> Items</h2>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                {item.image && <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover" loading="lazy" decoding="async" />}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                  {item.extras?.length > 0 && (
                    <p className="text-[#8E827B] text-xs">+ {item.extras.map(e => e.label).join(', ')}</p>
                  )}
                  {item.spice != null && <p className="text-[#8E827B] text-xs">Spice: {item.spice}/5</p>}
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-sm">×{item.qty || item.quantity}</p>
                  <p className="text-[#F07D14] text-xs font-semibold">₹{((item.unitPrice || item.price) * (item.qty || item.quantity)).toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5 text-sm">
            <div className="flex justify-between text-[#A39791]"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-400"><span>Discount</span><span>-₹{discount.toFixed(0)}</span></div>}
            {deliveryCharge > 0 && <div className="flex justify-between text-[#A39791]"><span>Delivery</span><span>₹{deliveryCharge.toFixed(0)}</span></div>}
            <div className="flex justify-between text-white font-bold text-base pt-1.5 border-t border-white/5 mt-1.5">
              <span>Total</span><span className="text-[#F07D14]">₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Customer & Delivery Info */}
        <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 mb-4">
          <h2 className="text-white font-bold text-lg mb-4">Details</h2>
          <div className="space-y-3 text-sm">
            {order.fulfillment && (
              <div className="flex justify-between">
                <span className="text-[#8E827B]">Fulfillment</span>
                <span className="text-white font-semibold capitalize">{order.fulfillment}</span>
              </div>
            )}
            {order.payment && (
              <div className="flex justify-between">
                <span className="text-[#8E827B]">Payment</span>
                <span className="text-white font-semibold">{order.payment.toUpperCase()}</span>
              </div>
            )}
            {order.customerLocation?.address && (
              <div className="flex justify-between">
                <span className="text-[#8E827B]">Delivery Address</span>
                <span className="text-white font-semibold text-right max-w-[60%]">{order.customerLocation.address}</span>
              </div>
            )}
            {order.assignedTo && (
              <div className="flex justify-between items-center">
                <span className="text-[#8E827B]">Delivery Boy</span>
                <span className="text-white font-semibold">{order.assignedTo.name || `#${String(order.assignedTo._id || order.assignedTo).slice(-4)}`}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cancel / Review actions */}
        <div className="space-y-3">
          {isDelivered && (
            <Link to={`/account`} className="block w-full py-3 rounded-xl bg-[#F07D14]/15 border border-[#F07D14]/30 text-[#F07D14] font-bold text-sm text-center hover:bg-[#F07D14]/25 transition-colors">
              <Star size={15} className="inline mr-1.5" /> Rate & Review This Order
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}