import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Plus, Minus, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { updateQty, updateQtyImmediate, removeItem, clearCart, setFulfillment, setDeliveryAddress, setDeliveryDetails } from '../store/slices/cartSlice';
import { fetchWithTimeout, retryFetchWithTimeout, money } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import LocationPicker from '../components/LocationPicker';

function useDebounce(fn, delay) {
  const timeoutRef = useRef(null);
  return useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cart = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const items = cart.items;
  const [deliveryCharge, setDeliveryCharge] = useState(39);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/menu', { replace: true });
    }
    retryFetchWithTimeout('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setDeliveryCharge(d.settings.deliveryCharge ?? 39);
        }
      })
      .catch(() => {});
  }, [items.length, navigate]);

  const debouncedQtyUpdate = useDebounce((key, qty) => {
    dispatch(updateQtyImmediate({ key, qty }));
  }, 500);

  const handleLocationChange = (loc) => {
    dispatch(setDeliveryAddress({ address: loc.address, coords: { lat: loc.lat, lng: loc.lng } }));
  };

  const canProceed = cart.fulfillment === 'delivery'
    ? (cart.deliveryAddress && cart.deliveryCoords?.lat && cart.deliveryCoords?.lng && cart.deliveryDetails?.trim())
    : true;

  const handleContinue = () => {
    if (!canProceed) return;
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#0A0604] text-white">
      <header className="bg-gradient-to-r from-[#0A0604] to-[#0E0907] border-b border-white/5 sticky top-0 z-40">
        <div className="mx-auto max-w-2xl px-3 sm:px-4 py-3 sm:py-4">
          <h1 className="font-fredoka text-xl sm:text-2xl font-bold text-white">Cart</h1>
          <p className="text-[10px] sm:text-xs text-[#A39791] mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''} in your tray</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-3 sm:px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-6 pb-6 sm:pb-8">
        {/* Fulfillment Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg sm:rounded-xl border border-white/5 p-1 bg-[#16100D]"
        >
          <div className="grid grid-cols-2 gap-1">
            {['delivery', 'pickup'].map((type) => (
              <button
                key={type}
                onClick={() => dispatch(setFulfillment(type))}
                className={`py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold capitalize transition-all ${
                  cart.fulfillment === type
                    ? 'bg-[#F07D14] text-white shadow-sm'
                    : 'text-[#A39791] hover:text-white'
                }`}
              >
                {type === 'delivery' ? '🛵 Delivery' : '🏠 Pickup'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* 1. Delivery Location */}
        <AnimatePresence>
          {cart.fulfillment === 'delivery' && (
            <motion.div
              key="delivery-location"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3 sm:space-y-4"
            >
              <div className="bg-[#16100D] rounded-xl sm:rounded-2xl border border-white/5 p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4">
                <LocationPicker
                  initialAddress={cart.deliveryAddress}
                  onLocationChange={handleLocationChange}
                />

                <div className="space-y-1 pt-1.5 sm:pt-2 border-t border-white/5">
                  <label className="text-[10px] sm:text-xs font-bold text-[#A39791] uppercase tracking-wider flex items-center gap-1 sm:gap-1.5">
                    <MapPin size={10} className="sm:size-12" /> Flat / House No. / Landmark <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={cart.deliveryDetails || ''}
                    onChange={(e) => dispatch(setDeliveryDetails(e.target.value))}
                    rows={2}
                    required
                    placeholder="e.g. Flat 302, Sunrise Apartments, near City Mall"
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg border border-white/10 text-xs sm:text-sm bg-[#0A0604] text-white
                      focus:outline-none focus:border-[#F07D14] focus:ring-1 focus:ring-[#F07D14]/30 placeholder:text-[#8E827B]
                      transition-all resize-none"
                  />
                  <p className="text-[9px] sm:text-[10px] text-[#8E827B]">Required — helps the delivery boy find your exact door.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Item */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#16100D] rounded-xl sm:rounded-2xl border border-white/5 p-3 sm:p-4 space-y-3 sm:space-y-4"
        >
          {items.map((item) => (
            <motion.div key={item.key} layout className="space-y-2 sm:space-y-3">
              <div className="flex gap-2 sm:gap-3">
                <img src={item.image} alt={item.name} className="w-16 sm:w-20 h-16 sm:h-20 rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                  decoding="async"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-fredoka font-bold text-white text-xs sm:text-sm lg:text-sm leading-tight truncate">{item.name}</h3>
                  <p className="text-[10px] sm:text-xs text-[#8E827B] mt-0.5">
                    {item.size?.label || 'Regular'} • Spice {item.spice}/5
                    {item.extras?.length > 0 && ` • +${item.extras.length} extras`}
                  </p>
                  <div className="flex items-center justify-between mt-2 sm:mt-3">
                    <div className="inline-flex items-center rounded-lg border border-white/10 overflow-hidden">
                      <button
                        onClick={() => dispatch(updateQty({ key: item.key, delta: -1 }))}
                        className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center hover:bg-white/5 text-[#A39791] transition-colors"
                      >
                        <Minus size={11} className="sm:size-13" />
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
                        className="w-9 sm:w-10 text-center text-xs sm:text-sm font-bold text-white bg-transparent border-x border-white/10 focus:outline-none"
                      />
                      <button
                        onClick={() => dispatch(updateQty({ key: item.key, delta: 1 }))}
                        className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center hover:bg-white/5 text-[#A39791] transition-colors"
                      >
                        <Plus size={11} className="sm:size-13" />
                      </button>
                    </div>
                    <button
                      onClick={() => dispatch(removeItem(item.key))}
                      className="text-[#B83A1B] hover:text-red-400 p-1 rounded"
                    >
                      <Trash2 size={13} className="sm:size-15" />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#F07D14] mt-1">{money(item.unitPrice * item.qty)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* 3. Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-t from-[#0A0604] to-transparent pt-3 sm:pt-4 pb-2 border-t border-white/5"
        >
          <div className="space-y-2 sm:space-y-3">
              {cart.fulfillment === 'delivery' && !canProceed && (
                <p className="text-center text-[10px] sm:text-xs text-[#8E827B] mb-1.5 sm:mb-2">
                  Please pin your GPS location AND fill in flat/house/landmark details
                </p>
              )}
              <button
                onClick={handleContinue}
                disabled={!canProceed}
                className={`w-full py-3 sm:py-3.5 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base lg:text-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${
                  canProceed
                    ? 'bg-[#F07D14] text-white hover:bg-[#E86C1B] shadow-md sm:shadow-lg shadow-[#F07D14]/20'
                    : 'bg-[#4A3F38] text-[#8E827B] cursor-not-allowed'
                }`}
              >
                <ArrowRight size={16} className="sm:size-18" />
                Continue
              </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}