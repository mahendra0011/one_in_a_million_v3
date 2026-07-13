import { useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, Smartphone, Wallet, Building2, CheckCircle2, Lock, Shield, ArrowLeft, MapPin, Minus, Plus, Trash2 } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { updateQty, updateQtyImmediate, removeItem, clearCart, clearServerCart, applyCouponResult, setCouponError, clearCoupon } from '../store/slices/cartSlice';
import { fetchWithTimeout, retryFetchWithTimeout, money } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay', color: 'from-[#F07D14] to-[#E86C1B]', emoji: '🅶' },
  { id: 'phonepe', name: 'PhonePe', color: 'from-[#F07D14] to-[#B83A1B]', emoji: '📱' },
  { id: 'paytm', name: 'Paytm', color: 'from-[#F07D14] to-[#E86C1B]', emoji: '💙' },
  { id: 'bhim', name: 'BHIM', color: 'from-[#F07D14] to-[#B83A1B]', emoji: '🇮🇳' },
];

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank', 'Bank of Baroda'];

function useDebounce(fn, delay) {
  const timeoutRef = useRef(null);
  return useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function CheckoutPage() {
  const [method, setMethod] = useState('card');
  const [upiApp, setUpiApp] = useState(null);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cart = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const items = cart.items;
  const [deliveryCharge, setDeliveryCharge] = useState(39);
  const [minOrderAmount, setMinOrderAmount] = useState(149);
  const [settings, setSettings] = useState({ razorpayEnabled: true, upiEnabled: true, codEnabled: true, maintenanceMode: false, isOpen: true });

  const debouncedQtyUpdate = useDebounce((key, qty) => {
    dispatch(updateQtyImmediate({ key, qty }));
  }, 500);

  useEffect(() => {
    if (!paid && items.length === 0) {
      navigate('/menu', { replace: true });
    }
    if (!paid && cart.fulfillment === 'delivery' && (!cart.deliveryAddress || !cart.deliveryCoords?.lat || !cart.deliveryCoords?.lng || !cart.deliveryDetails?.trim())) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, paid, navigate, cart.fulfillment, cart.deliveryAddress, cart.deliveryCoords, cart.deliveryDetails]);

  useEffect(() => {
    retryFetchWithTimeout('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setSettings({
            deliveryCharge: d.settings.deliveryCharge ?? 39,
            minOrderAmount: d.settings.minOrderAmount ?? 149,
            razorpayEnabled: d.settings.razorpayEnabled ?? true,
            upiEnabled: d.settings.upiEnabled ?? true,
            codEnabled: d.settings.codEnabled ?? true,
            maintenanceMode: d.settings.maintenanceMode ?? false,
            isOpen: d.settings.isOpen ?? true,
          });
          setDeliveryCharge(d.settings.deliveryCharge ?? 39);
          setMinOrderAmount(d.settings.minOrderAmount ?? 149);
        }
      })
      .catch(() => {});
  }, []);

  const availablePoints = user?.loyaltyPoints || 0;
  const [redeemPoints, setRedeemPoints] = useState(false);
  const pointsDiscount = redeemPoints && availablePoints >= 100 ? Math.floor(availablePoints / 100) * 10 : 0;

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const discount = cart.coupon ? (cart.couponDiscount || 0) : 0;
  const delivery = cart.fulfillment === 'delivery' && subtotal > 0 ? deliveryCharge : 0;
  const tax = (subtotal - discount - pointsDiscount) * 0.05;
  const total = subtotal - discount - pointsDiscount + delivery + tax;

  const [error, setError] = useState('');

  const METHOD_TABS = [
    ...(settings.razorpayEnabled ? [{ id: 'card', Icon: CreditCard, label: 'Card' }] : []),
    ...(settings.upiEnabled ? [{ id: 'upi', Icon: Smartphone, label: 'UPI' }] : []),
    ...(settings.razorpayEnabled ? [{ id: 'wallet', Icon: Wallet, label: 'Wallet' }] : []),
    ...(settings.razorpayEnabled ? [{ id: 'netbanking', Icon: Building2, label: 'NetBanking' }] : []),
    ...(settings.codEnabled ? [{ id: 'cod', Icon: Wallet, label: 'COD' }] : []),
  ];

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      dispatch(clearCoupon());
      return;
    }
    setCouponLoading(true);
    try {
      const authRaw = localStorage.getItem('bim_user');
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

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!settings.isOpen) {
      setError('Restaurant is currently closed. Please try again later.');
      setLoading(false);
      return;
    }
    if (subtotal < settings.minOrderAmount) {
      setError(`Minimum order amount is ₹${settings.minOrderAmount}. Add more items to proceed.`);
      setLoading(false);
      return;
    }
    const orderPayload = {
      items,
      totals: { subtotal, discount, pointsDiscount, delivery, tax, total },
      pointsRedeemed: pointsDiscount > 0 ? pointsDiscount * 10 : 0,
      coupon: cart.coupon || null,
      customer: {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        deliveryAddress: cart.deliveryAddress || '',
        deliveryCoords: cart.deliveryCoords || null,
        deliveryDetails: cart.deliveryDetails || '',
      },
      payment: method,
      paymentStatus: method === 'cod' ? 'pending' : 'paid',
      fulfillment: cart.fulfillment,
    };
    try {
      const res = await fetchWithTimeout('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Order failed');
      setLoading(false);
      setPaid(true);
      dispatch(clearCart());
      dispatch(clearServerCart());
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to place order. Please try again.');
    }
  };

  const formatCard = (val) => val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (val) => val.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);

  if (paid) {
    return (
      <div className="min-h-screen bg-[#0A0604] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="bg-[#1A1310] rounded-3xl shadow-2xl p-12 text-center max-w-md w-full border border-white/5"
        >
          <div className="w-20 h-20 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-green-400" />
          </div>
          <h2 className="font-fredoka text-3xl font-bold text-white mb-3">Order Placed!</h2>
          <p className="text-[#A39791] mb-2">Your order has been confirmed. No real charge was made.</p>
          <p className="text-sm text-[#F07D14] font-bold mb-8">Your burger is being prepared! 🍔</p>
          <div className="flex flex-col gap-3">
            <Link to="/" className="px-6 py-3 bg-[#F07D14] text-white font-bold rounded-xl hover:bg-[#E86C1B] transition-colors">
              Back to Home
            </Link>
            <Link to="/menu" className="px-6 py-3 border border-white/10 text-[#A39791] font-bold rounded-xl hover:bg-[#16100D] hover:text-white transition-colors">
              Order More
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0604]">
      <header className="bg-gradient-to-r from-[#0A0604] to-[#0E0907] text-white py-8 border-b border-white/5 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/cart" className="inline-flex items-center gap-2 text-[#8E827B] hover:text-white mb-4 text-sm font-semibold transition-colors">
            <ArrowLeft size={16} /> Back to Cart
          </Link>
          <h1 className="font-fredoka text-3xl font-bold mb-2 text-white">Checkout</h1>
          <p className="text-[#A39791] flex items-center gap-2">
            <Lock size={14} className="text-green-400" />
            256-bit SSL encryption · Demo mode — no real charges
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Items + Promo + Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 space-y-4"
            >
              <h2 className="font-fredoka text-xl font-bold text-white mb-2">Your Order</h2>

              {items.length > 0 ? (
                <div className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={item.key}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#16100D] rounded-xl border border-white/5 p-4 space-y-3"
                    >
                      <div className="flex gap-3">
                        <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-fredoka font-bold text-white text-sm leading-tight truncate">{item.name}</h3>
                          <p className="text-xs text-[#8E827B] mt-0.5">
                            {item.size?.label || 'Regular'} · Spice {item.spice}/5
                            {item.extras?.length > 0 && ` · +${item.extras.length} extras`}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <div className="inline-flex items-center rounded-lg border border-white/10 overflow-hidden">
                              <button
                                onClick={() => dispatch(updateQty({ key: item.key, delta: -1 }))}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-[#A39791] transition-colors"
                              >
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
                              <button
                                onClick={() => dispatch(updateQty({ key: item.key, delta: 1 }))}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-[#A39791] transition-colors"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            <button
                              onClick={() => dispatch(removeItem(item.key))}
                              className="text-[#B83A1B] hover:text-red-400 p-1 rounded"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-[#F07D14] mt-1">{money(item.unitPrice * item.qty)}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#8E827B] text-center py-8">Cart is empty. Add items from the menu.</p>
              )}
            </motion.div>

            {/* Promo Code */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 space-y-3"
            >
              <h3 className="font-fredoka text-lg font-bold text-white">Promo Code</h3>
              {cart.coupon ? (
                <div className="flex items-center justify-between px-3 py-2.5 bg-green-900/20 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-green-400">{cart.coupon}</span>
                    <span className="text-green-300">applied — {money(cart.couponDiscount)} off</span>
                  </div>
                  <button onClick={handleRemoveCoupon} className="text-[#A39791] hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      placeholder="Enter promo code"
                      className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-white/10 text-sm bg-[#16100D] text-white focus:outline-none focus:border-[#F07D14] placeholder:text-[#8E827B]"
                    />
                  </div>
                  <button
                    onClick={applyCoupon}
                    disabled={couponLoading}
                    className="px-4 py-2.5 rounded-lg border border-white/10 bg-[#16100D] text-sm font-bold text-[#A39791] hover:border-[#F07D14]/40 hover:text-[#F07D14] transition-colors disabled:opacity-60 whitespace-nowrap"
                  >
                    {couponLoading ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : 'Apply'}
                  </button>
                </div>
              )}
              {cart.couponError && (
                <p className="text-xs font-semibold text-red-400">{cart.couponError}</p>
              )}

              {/* Loyalty Points */}
              {availablePoints >= 100 && (
                <div className={`flex items-center justify-between py-2 px-3 rounded-xl border transition-colors ${redeemPoints ? 'border-yellow-500/40 bg-yellow-500/8' : 'border-white/8 bg-white/3'}`}>
                  <div>
                    <p className="text-sm font-semibold text-white">Redeem Points</p>
                    <p className="text-xs text-[#8E827B]">{availablePoints} pts → save {money(pointsDiscount)}</p>
                  </div>
                  <button onClick={() => setRedeemPoints(p => !p)} className="flex-shrink-0">
                    {redeemPoints
                      ? <div className="w-11 h-6 bg-yellow-500 rounded-full relative"><div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow" /></div>
                      : <div className="w-11 h-6 bg-white/10 rounded-full relative"><div className="w-5 h-5 bg-white/40 rounded-full absolute top-0.5 left-0.5 shadow" /></div>
                    }
                  </button>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-sm text-yellow-400">
                  <span>🏆 Points Redeemed</span>
                  <span className="font-semibold">-{money(pointsDiscount)}</span>
                </div>
              )}
            </motion.div>

            {/* Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 space-y-3"
            >
              <h3 className="font-fredoka text-xl font-bold text-white">Order Summary</h3>
              <div className="border-t border-white/5 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-[#A39791]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">{money(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Discount ({cart.coupon})</span>
                    <span className="font-semibold">-{money(discount)}</span>
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div className="flex justify-between text-sm text-yellow-400">
                    <span>🏆 Points Redeemed</span>
                    <span className="font-semibold">-{money(pointsDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-[#A39791]">
                  <span>{cart.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                  <span className="font-semibold text-white">{delivery > 0 ? money(delivery) : <span className="text-green-500">Free</span>}</span>
                </div>
                <div className="flex justify-between text-sm text-[#A39791]">
                  <span>GST (5%)</span>
                  <span className="font-semibold text-white">{money(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span className="text-[#F07D14]">{money(total)}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Payment + Delivery Location */}
          <div className="sticky top-24 space-y-6">
            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 space-y-6"
            >
              <h2 className="font-fredoka text-xl font-bold text-white">Payment Method</h2>
              <div className="grid grid-cols-3 gap-3">
                {METHOD_TABS.map(({ id, Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setMethod(id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 font-semibold transition-all text-sm ${
                      method === id
                        ? 'border-[#F07D14] bg-[#F07D14]/10 text-[#F07D14] shadow-sm'
                        : 'border-white/10 text-[#A39791] hover:border-[#F07D14]/40 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.form
                  key={method}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handlePay}
                  className="space-y-4"
                >
                  {method === 'card' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Cardholder Name</label>
                        <input
                          required
                          value={cardData.name}
                          onChange={e => setCardData(d => ({ ...d, name: e.target.value }))}
                          placeholder="Name on card"
                          className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] focus:ring-2 focus:ring-[#F07D14]/10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Card Number</label>
                        <div className="relative">
                          <input
                            required
                            value={cardData.number}
                            onChange={e => setCardData(d => ({ ...d, number: formatCard(e.target.value) }))}
                            placeholder="4111 1111 1111 1111"
                            maxLength={19}
                            className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] focus:ring-2 focus:ring-[#F07D14]/10 font-mono"
                          />
                          <CreditCard size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E827B]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Expiry Date</label>
                          <input
                            required
                            value={cardData.expiry}
                            onChange={e => setCardData(d => ({ ...d, expiry: formatExpiry(e.target.value) }))}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] focus:ring-2 focus:ring-[#F07D14]/10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#A39791] mb-1.5">CVV</label>
                          <input
                            required
                            value={cardData.cvc}
                            onChange={e => setCardData(d => ({ ...d, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                            placeholder="123"
                            maxLength={4}
                            type="password"
                            className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] focus:ring-2 focus:ring-[#F07D14]/10"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {['VISA', 'MC', 'AMEX', 'RuPay'].map(brand => (
                          <span key={brand} className="px-2 py-1 bg-[#16100D] text-[#A39791] text-xs font-bold rounded border border-white/10">{brand}</span>
                        ))}
                        <span className="text-xs text-[#8E827B] ml-auto flex items-center gap-1">
                          <Shield size={12} className="text-green-400" /> Secure
                        </span>
                      </div>
                    </>
                  )}

                  {method === 'upi' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {UPI_APPS.map(app => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setUpiApp(app.id)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                              upiApp === app.id ? 'border-[#F07D14] bg-[#F07D14]/10' : 'border-white/10 hover:border-[#F07D14]/40'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${app.color} flex items-center justify-center text-white text-lg`}>
                              {app.emoji}
                            </div>
                            <span className="text-xs font-semibold text-[#A39791]">{app.name}</span>
                          </button>
                        ))}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Or Enter UPI ID</label>
                        <input
                          placeholder="yourname@upi"
                          className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14]"
                        />
                      </div>
                    </div>
                  )}

                  {method === 'wallet' && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-[#A39791] mb-2">Select Wallet</p>
                      {['Paytm', 'PhonePe', 'Amazon Pay', 'Mobikwik'].map(w => (
                        <label key={w} className="flex items-center gap-3 p-3 border border-white/10 rounded-xl cursor-pointer hover:border-[#F07D14]/40 transition-colors">
                          <input type="radio" name="wallet" value={w} className="accent-[#F07D14]" />
                          <span className="font-semibold text-white">{w}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {method === 'netbanking' && (
                    <div>
                      <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Select Bank</label>
                      <select className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14]">
                        <option value="">Choose your bank</option>
                        {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  )}

                  {method === 'cod' && (
                    <div className="flex items-start gap-4 p-4 bg-[#F07D14]/10 rounded-xl border border-[#F07D14]/20">
                      <div className="text-3xl">💵</div>
                      <div>
                        <h4 className="font-bold text-white mb-1">Cash on Delivery</h4>
                        <p className="text-sm text-[#A39791]">Pay with cash when your order arrives. Please keep exact change ready.</p>
                        <p className="text-sm text-[#F07D14] font-semibold mt-2">Note: COD available for orders under ₹2000</p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-[#F07D14] text-white font-bold text-lg hover:bg-[#E86C1B] transition-colors shadow-lg shadow-[#F07D14]/25 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock size={18} />
                        {method === 'cod' ? 'Place Order (COD)' : `Pay ${money(total)}`}
                      </>
                    )}
                  </button>

                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                  <p className="text-center text-xs text-[#8E827B] flex items-center justify-center gap-1">
                    <Shield size={12} className="text-green-400" />
                    This is a demo — no real payment will be charged
                  </p>
                </motion.form>
              </AnimatePresence>
            </motion.div>

            {/* Delivery Location */}
            {cart.fulfillment === 'delivery' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 space-y-4"
              >
                <h3 className="font-fredoka text-lg font-bold text-white flex items-center gap-2">
                  <MapPin size={18} className="text-[#F07D14]" />
                  Delivery Location
                </h3>

                <div className="p-3 bg-[#16100D] rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-[#F07D14] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#A39791] mb-1">Address</p>
                      <p className="text-sm text-white truncate">{cart.deliveryAddress}</p>
                      {cart.deliveryCoords && (
                        <p className="text-xs text-green-400 mt-0.5">GPS pinned ✓</p>
                      )}
                    </div>
                  </div>

                  {cart.deliveryDetails && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-xs font-bold text-[#A39791] mb-1">Flat / House / Landmark</p>
                      <p className="text-sm text-white">{cart.deliveryDetails}</p>
                    </div>
                  )}
                </div>

                <Link
                  to="/cart"
                  className="w-full text-center text-sm font-semibold text-[#F07D14] hover:text-[#E86C1B] transition-colors py-2"
                >
                  Change location
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}