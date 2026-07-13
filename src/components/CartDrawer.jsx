import { X, Minus, Plus, Trash2, ShoppingBag, Tag, ArrowRight, MapPin, Loader2 } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { updateQty, updateQtyImmediate, removeItem, clearCart, applyCouponResult, setCouponError, clearCoupon, setFulfillment, setDeliveryAddress, setDeliveryDetails } from '../store/slices/cartSlice';
import { fetchWithTimeout, retryFetchWithTimeout, money } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import LocationPicker from './LocationPicker';

  // Debounce hook for quantity updates
function useDebounce(fn, delay) {
  const timeoutRef = useRef(null);
  return useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function CartDrawer({ open, onClose }) {
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const items = cart.items;
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Step 23 — fetch delivery charge & min order from settings
  const [deliveryCharge, setDeliveryCharge] = useState(39);
  useEffect(() => {
    retryFetchWithTimeout('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setDeliveryCharge(d.settings.deliveryCharge ?? 39);
        }
      })
      .catch(() => {});
  }, []);

  // Debounced quantity update for input field
  const debouncedQtyUpdate = useDebounce((key, qty) => {
    dispatch(updateQtyImmediate({ key, qty }));
  }, 500);

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const discount = cart.coupon ? (cart.couponDiscount || 0) : 0;
  const delivery = cart.fulfillment === 'delivery' && subtotal > 0 ? deliveryCharge : 0;
  const tax = (subtotal - discount) * 0.05;
  const total = subtotal - discount + delivery + tax;

  // Step 18 — validate against real backend, store result in Redux
  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      dispatch(clearCoupon());
      return;
    }
    setCouponLoading(true);
    try {
      const authRaw = localStorage.getItem('bim_user');
      // Freshly-registered users (register-email/verify flow) get stored with an 'id' field,
      // while logged-in users get '_id' — support both so coupon validation doesn't silently
      // send userId: undefined right after registration.
      const parsedUser = authRaw ? JSON.parse(authRaw) : null;
      const userId = parsedUser?._id || parsedUser?.id;
      const res = await fetchWithTimeout('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderTotal: subtotal, userId }),
      });
      const data = await res.json();
      if (data.ok) {
        dispatch(applyCouponResult({ code, discount: data.discount }));
        setCouponInput('');
      } else {
        dispatch(setCouponError(data.error || 'Invalid coupon code'));
      }
    } catch {
      dispatch(setCouponError('Could not validate coupon — check your connection'));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(clearCoupon());
    setCouponInput('');
  };

  const handleLocationChange = (loc) => {
    dispatch(setDeliveryAddress({ address: loc.address, coords: { lat: loc.lat, lng: loc.lng } }));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="fixed top-0 right-0 z-[91] h-full w-full max-w-md bg-[#0A0604] shadow-2xl shadow-black/50 flex flex-col border-l border-white/5 ring-1 ring-white/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <p className="text-xs font-bold text-[#F07D14] uppercase tracking-wider">Your tray</p>
                <h2 className="text-xl font-fredoka font-bold text-white">Cart</h2>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={() => dispatch(clearCart())}
                    className="text-xs text-[#B83A1B] hover:text-red-400 font-semibold px-2 py-1 rounded hover:bg-white/5"
                  >
                    Clear all
                  </button>
                )}
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#16100D] text-[#A39791]">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Fulfillment Toggle */}
            <div className="px-5 pt-4 pb-2">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 p-1 bg-[#16100D]">
                {['delivery', 'pickup'].map((type) => (
                  <button
                    key={type}
                    onClick={() => dispatch(setFulfillment(type))}
                    className={`py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                      cart.fulfillment === type
                        ? 'bg-[#F07D14] text-white shadow-sm'
                        : 'text-[#A39791] hover:text-white'
                    }`}
                  >
                    {type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <AnimatePresence>
              {cart.fulfillment === 'delivery' && (
                <motion.div
                  key="address-section"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-5 pb-2 overflow-hidden"
                >
                  <LocationPicker
                    initialAddress={cart.deliveryAddress}
                    onLocationChange={handleLocationChange}
                  />

                  <div className="mt-3 space-y-1">
                    <label className="text-xs font-bold text-[#A39791] uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={12} className="text-[#F07D14]" /> Flat / House No. / Landmark <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={cart.deliveryDetails || ''}
                      onChange={(e) => dispatch(setDeliveryDetails(e.target.value))}
                      rows={2}
                      required
                      placeholder="e.g. Flat 302, Sunrise Apartments, near City Mall"
                      className="w-full px-3 py-2.5 rounded-lg border border-white/10 text-sm bg-[#0A0604] text-white
                        focus:outline-none focus:border-[#F07D14] focus:ring-1 focus:ring-[#F07D14]/30 placeholder:text-[#8E827B]
                        transition-all resize-none"
                    />
                    <p className="text-[10px] text-[#8E827B]">Required — helps the delivery boy find your exact door.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Items */}
            <div className="flex-1 overflow-auto px-5 py-3 space-y-3">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full py-16 text-center"
                >
                  <ShoppingBag size={48} className="text-[#8E827B]/30 mb-4" />
                  <p className="text-[#A39791] font-semibold mb-1">Your tray is empty</p>
                  <p className="text-sm text-[#8E827B] mb-6">Add a burger to get started</p>
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-lg bg-[#F07D14] text-white font-bold hover:bg-[#E86C1B] transition-colors"
                  >
                    Browse Menu
                  </button>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.key}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
                      className="flex gap-3 p-3 rounded-xl bg-[#16100D] border border-white/5 hover:border-[#F07D14]/20 transition-colors"
                    >
                      <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
          decoding="async"
        />
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${item.productId}`} onClick={onClose} className="font-fredoka font-bold text-white text-sm leading-tight truncate hover:text-[#F07D14] transition-colors block">{item.name}</Link>
                        <p className="text-xs text-[#8E827B] mt-0.5">
                          {item.size?.label || 'Regular'} · Spice {item.spice}/5
                          {item.extras?.length > 0 && ` · +${item.extras.length} extras`}
                        </p>
<div className="flex items-center justify-between mt-2">
                           <div className="inline-flex items-center rounded-lg border border-white/10 overflow-hidden">
                             <button onClick={() => dispatch(updateQty({ key: item.key, delta: -1 }))} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-[#A39791] transition-colors">
                               <Minus size={13} />
                             </button>
                             <input
                               type="number"
                               min="1"
                               max="20"
                               value={item.qty}
                               onChange={e => dispatch(updateQty({ key: item.key, delta: parseInt(e.target.value) - item.qty || 0 }))}
                               onBlur={e => {
                                 const newQty = parseInt(e.target.value) || 1;
                                 if (newQty !== item.qty && newQty >= 1) debouncedQtyUpdate(item.key, newQty);
                               }}
                               className="w-10 text-center text-sm font-bold text-white bg-transparent border-x border-white/10 focus:outline-none"
                             />
                             <button onClick={() => dispatch(updateQty({ key: item.key, delta: 1 }))} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-[#A39791] transition-colors">
                               <Plus size={13} />
                             </button>
                           </div>
                           <button onClick={() => dispatch(removeItem(item.key))} className="text-[#B83A1B] hover:text-red-400 p-1 rounded">
                             <Trash2 size={15} />
                           </button>
                         </div>
                        <p className="text-sm font-bold text-[#F07D14] mt-1">{money(item.unitPrice * item.qty)}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Summary + Actions */}
            {items.length > 0 && (
              <motion.div layout className="border-t border-white/5 p-5 space-y-3 bg-[#0E0907]">
                {/* Coupon */}
                {cart.coupon ? (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-green-900/20 border border-green-500/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-green-400" />
                      <span className="text-sm font-bold text-green-400">{cart.coupon}</span>
                      <span className="text-xs text-green-300">applied — {money(cart.couponDiscount)} off</span>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-[#A39791] hover:text-red-400 transition-colors">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
                        <input
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                          placeholder="Promo code"
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-white/10 text-sm bg-[#16100D] text-white focus:outline-none focus:border-[#F07D14] placeholder:text-[#8E827B]"
                        />
                      </div>
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading}
                        className="px-3 py-2 rounded-lg border border-white/10 bg-[#16100D] text-sm font-bold text-[#A39791] hover:border-[#F07D14]/40 hover:text-[#F07D14] transition-colors disabled:opacity-60"
                      >
                        {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {cart.couponError && (
                      <p className="text-xs font-semibold text-red-400">{cart.couponError}</p>
                    )}
                  </div>
                )}

                {/* Breakdown */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-[#A39791]">
                    <span>Subtotal</span>
                    <span className="font-semibold text-white">{money(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-500">
                      <span>Discount ({cart.coupon})</span>
                      <span className="font-semibold">-{money(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-[#A39791]">
                    <span>{cart.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                    <span className="font-semibold text-white">
                      {delivery > 0 ? money(delivery) : <span className="text-green-500">Free</span>}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-[#A39791]">
                    <span>GST (5%)</span>
                    <span className="font-semibold text-white">{money(tax)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/10">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                </div>

                {cart.fulfillment === 'delivery' && (!cart.deliveryAddress || !cart.deliveryCoords?.lat || !cart.deliveryCoords?.lng || !cart.deliveryDetails?.trim()) ? (
                  <button
                    disabled
                    title="Please pin your GPS location AND fill in flat/house/landmark details"
                    className="w-full bg-[#4A3F38] text-[#8E827B] font-bold py-3 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <MapPin size={18} />
                    Location Required
                    <ArrowRight size={16} />
                  </button>
                ) : (
                <Link
                  to="/payment"
                  onClick={onClose}
                  className="w-full bg-[#F07D14] text-white font-bold py-3 rounded-xl hover:bg-[#E86C1B] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#F07D14]/20"
                >
                  <ShoppingBag size={18} />
                  Proceed to Checkout
                  <ArrowRight size={16} />
                </Link>
                )}
              </motion.div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
