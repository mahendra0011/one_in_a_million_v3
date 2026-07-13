import { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Wallet, Building2, CheckCircle2, Lock, Shield, ArrowLeft } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { clearCart, clearServerCart } from '../store/slices/cartSlice';
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

export default function PaymentPage() {
  const [method, setMethod] = useState('card');
  const [upiApp, setUpiApp] = useState(null);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '', name: '' });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cart = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const items = cart.items;

  // Redirect to menu if cart is empty, or back to cart if delivery location missing
  useEffect(() => {
    if (!paid && items.length === 0) {
      navigate('/menu', { replace: true });
    }
    if (!paid && cart.fulfillment === 'delivery' && (!cart.deliveryAddress || !cart.deliveryCoords?.lat || !cart.deliveryCoords?.lng || !cart.deliveryDetails?.trim())) {
      navigate('/menu', { replace: true });
    }
  }, [items.length, paid, navigate, cart.fulfillment, cart.deliveryAddress, cart.deliveryCoords, cart.deliveryDetails]);

  // Step 23 — fetch delivery charge from settings
  const [deliveryCharge, setDeliveryCharge] = useState(39);
  useEffect(() => {
    retryFetchWithTimeout('/api/settings')
      .then(r => r.json())
      .then(d => { if (d.ok) setDeliveryCharge(d.settings.deliveryCharge ?? 39); })
      .catch(() => {});
  }, []);

  // Loyalty points redeem
  const availablePoints = user?.loyaltyPoints || 0;
  const [redeemPoints, setRedeemPoints] = useState(false);
  const pointsDiscount = redeemPoints && availablePoints >= 100 ? Math.floor(availablePoints / 100) * 10 : 0; // 100pts = ₹10

  // Step 18 — use Redux-stored validated discount, not hardcoded local calc
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const discount = cart.coupon ? (cart.couponDiscount || 0) : 0;
  const delivery = cart.fulfillment === 'delivery' && subtotal > 0 ? deliveryCharge : 0;
  const tax = (subtotal - discount - pointsDiscount) * 0.05;
  const total = subtotal - discount - pointsDiscount + delivery + tax;

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);
    const orderPayload = {
      items,
      totals: { subtotal, discount, pointsDiscount, delivery, tax, total },
      pointsRedeemed: redeemPoints ? availablePoints : 0,
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
      userId: user?._id || user?.id || null,
    };
    try {
      const res = await fetchWithTimeout('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();
      // Increment coupon usage if one was applied
      if (data.ok && cart.coupon) {
        fetchWithTimeout('/api/coupons/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code: cart.coupon }),
        }).catch(() => {});
      }
    } catch {
      // Server unavailable — still mark paid so UX works offline
    }
    setLoading(false);
    setPaid(true);
    dispatch(clearCart());
    dispatch(clearServerCart()); // Step 20: clear server cart too
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
          <h2 className="font-fredoka text-3xl font-bold text-white mb-3">Payment Successful!</h2>
          <p className="text-[#A39791] mb-2">Demo order placed successfully. No real charge was made.</p>
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
      {/* Header */}
      <section className="bg-gradient-to-r from-[#0A0604] to-[#0E0907] text-white py-12 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[#8E827B] hover:text-white mb-4 text-sm font-semibold transition-colors">
            <ArrowLeft size={16} /> Back to store
          </Link>
          <h1 className="font-fredoka text-4xl font-bold mb-2 text-white">Secure Checkout</h1>
          <p className="text-[#A39791] flex items-center gap-2">
            <Lock size={14} className="text-green-400" />
            256-bit SSL encryption · Demo mode — no real charges
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Method Tabs */}
            <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-6">
              <h2 className="font-fredoka text-xl font-bold text-white mb-4">Payment Method</h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {[
                  { id: 'card', Icon: CreditCard, label: 'Card' },
                  { id: 'upi', Icon: Smartphone, label: 'UPI' },
                  { id: 'wallet', Icon: Wallet, label: 'Wallet' },
                  { id: 'netbanking', Icon: Building2, label: 'NetBanking' },
                  { id: 'cod', Icon: Wallet, label: 'COD' },
                ].map(({ id, Icon, label }) => (
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
            </div>

            {/* Form Panel */}
            <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-6">
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

                  <p className="text-center text-xs text-[#8E827B] flex items-center justify-center gap-1">
                    <Shield size={12} className="text-green-400" />
                    This is a demo — no real payment will be charged
                  </p>
                </motion.form>
              </AnimatePresence>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-6">
              <h3 className="font-fredoka text-xl font-bold text-white mb-4">Order Summary</h3>

              {cart.fulfillment === 'delivery' && cart.deliveryAddress && (
                <div className="flex items-start gap-2 p-3 bg-[#16100D] rounded-xl border border-white/5 mb-4">
                  <span className="text-[#F07D14] mt-0.5">📍</span>
                  <div>
                    <p className="text-xs font-bold text-[#A39791] mb-0.5">Delivering to</p>
                    <p className="text-xs text-white leading-relaxed">{cart.deliveryAddress}</p>
                    {cart.deliveryDetails && <p className="text-xs text-[#A39791] mt-0.5">{cart.deliveryDetails}</p>}
                    {cart.deliveryCoords && <p className="text-xs text-green-400 mt-0.5">GPS pinned ✓</p>}
                  </div>
                </div>
              )}

              {items.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {items.slice(0, 3).map(item => (
                    <div key={item.key} className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
          decoding="async"
        />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                        <p className="text-xs text-[#8E827B]">× {item.qty}</p>
                      </div>
                      <span className="text-sm font-bold text-white">{money(item.unitPrice * item.qty)}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-xs text-[#8E827B] text-center">+{items.length - 3} more items</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#8E827B] mb-4">Cart is empty. Add items from the menu.</p>
              )}

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
                {/* Loyalty points redeem */}
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
                <div className="flex justify-between text-sm text-[#A39791]">
                  <span>Delivery</span>
                  <span className="font-semibold text-white">{money(delivery)}</span>
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
            </div>

            {/* Trust badges */}
            <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-5">
              <div className="space-y-3">
                {[
                  { icon: '🔒', text: '256-bit SSL Encryption' },
                  { icon: '✅', text: 'PCI DSS Compliant' },
                  { icon: '🔄', text: 'Easy Refunds within 24h' },
                  { icon: '📞', text: '24/7 Customer Support' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-[#A39791]">
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
