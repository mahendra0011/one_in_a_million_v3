import SEOHead from '../components/SEOHead';
import { fetchWithTimeout } from '../lib/utils';
import { useState, useEffect } from 'react';
import { Tag, Clock, Copy, Check, ArrowRight, Star, Zap, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { money } from '../lib/utils';

// Fetch coupons from backend API
function useCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWithTimeout('/api/coupons/my', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          const now = new Date();
          setCoupons(d.coupons?.filter(c => !c.expiry || new Date(c.expiry) > now) || []);
        } else {
          setError(d.error || 'Failed to load coupons');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  return { coupons, loading, error };
}

const DEALS = [
  {
    title: 'Happy Hour',
    subtitle: '11 AM – 1 PM',
    desc: 'Any burger + fries + drink at a flat 15% discount during lunch hours.',
    emoji: '⏰',
    badge: 'Daily',
    color: 'bg-[#16100D] border-[#F07D14]/20',
    badgeColor: 'bg-[#F07D14]',
  },
  {
    title: 'Family Feast',
    subtitle: '4 Burgers, 4 Drinks, Shared Fries',
    desc: 'Perfect for families. Save over ₹200 compared to ordering à la carte.',
    emoji: '👨‍👩‍👧‍👦',
    badge: 'Best Value',
    color: 'bg-[#16100D] border-[#F07D14]/20',
    badgeColor: 'bg-[#F07D14]',
    link: '/menu',
    price: 899,
  },
  {
    title: 'Wednesday Crunch',
    subtitle: 'Every Wednesday',
    desc: 'Buy any crispy burger and get a free side of onion rings. No code needed.',
    emoji: '🧅',
    badge: 'Weekly',
    color: 'bg-[#16100D] border-[#F07D14]/20',
    badgeColor: 'bg-[#E86C1B]',
  },
  {
    title: 'Loyalty Points',
    subtitle: '1 Point per ₹10 spent',
    desc: 'Earn points on every order and redeem them for free burgers and sides.',
    emoji: '⭐',
    badge: 'Always On',
    color: 'bg-[#16100D] border-[#F07D14]/20',
    badgeColor: 'bg-[#F07D14]',
  },
  {
    title: "Couple's Combo",
    subtitle: '2 Burgers + 2 Drinks + Fries',
    desc: 'Date night sorted. A premium combo for two at an unbeatable price.',
    emoji: '💑',
    badge: 'Hot Deal',
    color: 'bg-[#16100D] border-[#F07D14]/20',
    badgeColor: 'bg-[#B83A1B]',
    link: '/menu',
    price: 549,
  },
  {
    title: 'Midnight Munchies',
    subtitle: '9 PM – 11 PM',
    desc: 'Order after 9 PM and get a free upgrade to double patty on any burger.',
    emoji: '🌙',
    badge: 'Night Only',
    color: 'bg-[#16100D] border-[#F07D14]/20',
    badgeColor: 'bg-[#E86C1B]',
  },
  {
    title: 'Student Special',
    subtitle: 'Valid with student ID',
    desc: 'Show your student ID and get 20% off any meal combo. Perfect for study sessions.',
    emoji: '🎓',
    badge: 'Student Deal',
    color: 'bg-[#16100D] border-[#F07D14]/20',
    badgeColor: 'bg-blue-600',
    link: '/menu',
  },
];

function CouponCard({ coupon }) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-2xl shadow-lg border border-[#2A1F1A] overflow-hidden transition-all duration-500 hover:border-[#F07D14]/60 hover:shadow-[0_20px_40px_rgba(240,125,20,0.25)] hover:-translate-y-1"
    >
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-r ${coupon.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

      <div className={`relative bg-gradient-to-r ${coupon.color} p-5 text-white`}>
        <div className="flex items-center justify-between mb-3">
          <Tag size={20} className="text-white/90" />
          <span className="text-xs font-black bg-white/25 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
            {coupon.type === 'percent' ? `${coupon.value}% OFF` : coupon.type === 'flat' ? `₹${coupon.value} OFF` : 'FREE DELIVERY'}
          </span>
        </div>
        <h3 className="font-fredoka text-3xl font-black mb-2 tracking-tight">{coupon.code}</h3>
        <p className="text-sm text-white/90 font-medium">{coupon.desc}</p>
      </div>
      <div className="p-5 flex items-center justify-between bg-[#16100D]">
        <div className="text-xs text-[#A39791]">
          {coupon.min > 0 ? (
            <span className="font-semibold">Min. order {money(coupon.min)}</span>
          ) : (
            <span className="font-semibold text-green-400">✓ No minimum order</span>
          )}
          <br />
          <span className="flex items-center gap-1.5 mt-1.5 text-[#8E827B]">
            <Clock size={12} className="text-[#F07D14]" />
            <span className="font-medium">Expires {coupon.expiry}</span>
          </span>
        </div>
        <button
          onClick={copy}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-300 overflow-hidden ${
            copied
              ? 'bg-green-600 text-white shadow-[0_8px_20px_rgba(22,163,74,0.4)]'
              : isHovered
              ? 'bg-gradient-to-r from-[#E86C1B] to-[#F07D14] text-white shadow-[0_8px_24px_rgba(240,125,20,0.5)] scale-105'
              : 'bg-[#F07D14] text-white hover:bg-[#E86C1B]'
          }`}
        >
          {copied ? (
            <>
              <Check size={14} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy Code
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default function OffersPage() {
  const { coupons, loading, error } = useCoupons();
  
  // Map backend coupons to frontend format
  const mappedCoupons = coupons.map(c => ({
    code: c.code,
    desc: c.discountType === 'percent' 
      ? `${c.discountValue}% off on orders above ${money(c.minOrder)}` 
      : c.discountType === 'flat' 
        ? `₹${c.discountValue} off on orders above ${money(c.minOrder)}` 
        : `Special offer: ${c.discountValue}`,
    min: c.minOrder || 0,
    type: c.discountType,
    value: c.discountValue,
    expiry: c.expiry ? new Date(c.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No expiry',
    color: 'from-[#F07D14] to-[#E86C1B]',
  }));

  return (
    <div className="min-h-screen bg-[#0A0604]">
      <SEOHead
        title="Offers & Deals"
        description="Check out the latest deals and limited-time offers at One in a Million. Save big on your favourite burgers."
        url="/offers"
      />
            {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#F07D14] via-[#E86C1B] to-[#B83A1B] text-white py-20 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-full text-sm font-black mb-5 shadow-lg">
            <Zap size={16} className="text-yellow-300" />
            <span>LIMITED TIME DEALS</span>
          </div>
          <h1 className="font-fredoka text-5xl sm:text-6xl lg:text-7xl font-black mb-4 leading-tight">
            🔥 Offers & <span className="text-yellow-300">Deals</span>
          </h1>
          <p className="text-white/90 text-lg sm:text-xl mb-8 max-w-2xl mx-auto font-medium">
            Save big on your favourite burgers. New offers added every week!
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {['10% off', 'Free Delivery', 'Combo Deals', 'Daily Specials'].map(tag => (
              <span key={tag} className="px-5 py-2.5 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-full text-sm font-bold hover:bg-white/30 hover:scale-105 transition-all duration-300">
                ✓ {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        {/* Coupon codes */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#F07D14]/10 border border-[#F07D14]/30 rounded-full px-4 py-1.5 mb-3">
                <Tag size={14} className="text-[#F07D14]" />
                <span className="text-[#F07D14] text-xs font-black uppercase tracking-wider">Promo Codes</span>
              </div>
              <h2 className="font-fredoka text-3xl sm:text-4xl font-bold text-white">Save More with Coupons</h2>
              <p className="text-[#A39791] text-sm mt-2">Click to copy and use at checkout</p>
            </div>
            <span className="text-sm text-[#A39791] bg-[#1A1310] px-4 py-2 rounded-full border border-[#F07D14]/30 font-bold">
              {mappedCoupons.length} active code{mappedCoupons.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-[#1E1612] border border-white/10 rounded-2xl p-5 animate-pulse">
                  <div className="h-6 bg-white/10 rounded mb-3" />
                  <div className="h-4 bg-white/10 rounded mb-2" />
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}
          
          {!loading && error && (
            <p className="text-center py-8 text-red-400">{error}</p>
          )}
          
          {!loading && !error && mappedCoupons.length === 0 && (
            <p className="text-center py-8 text-[#8E827B]">No active coupons available right now. Check back later!</p>
          )}
          
          {!loading && !error && mappedCoupons.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {mappedCoupons.map((c) => <CouponCard key={c.code} coupon={c} />)}
            </div>
          )}
        </section>

        {/* Deals */}
        <section>
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-3">
              <Sparkles size={14} className="text-[#F07D14]" />
              <span className="text-[#F07D14] text-xs font-black uppercase tracking-wider">Active Promotions</span>
            </div>
            <h2 className="font-fredoka text-3xl sm:text-4xl font-bold text-white mb-1">Current Deals</h2>
            <p className="text-[#A39791] text-sm">No code needed — deals apply automatically</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEALS.map((deal, i) => (
              <motion.div
                key={deal.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-2xl border border-[#2A1F1A] p-6 transition-all duration-500 hover:border-[#F07D14]/60 hover:shadow-[0_20px_40px_rgba(240,125,20,0.25)] hover:-translate-y-1"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F07D14]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{deal.emoji}</span>
                    <span className={`text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg ${deal.badgeColor}`}>
                      {deal.badge}
                    </span>
                  </div>
                  <h3 className="font-fredoka text-xl font-bold text-white mb-2 group-hover:text-[#F07D14] transition-colors">{deal.title}</h3>
                  <p className="text-sm font-bold text-[#F07D14] mb-3">{deal.subtitle}</p>
                  <p className="text-sm text-[#A39791] leading-relaxed mb-5">{deal.desc}</p>
                  {deal.price && (
                    <div className="flex items-baseline gap-2 mb-4">
                      <p className="text-3xl font-fredoka font-black text-[#F07D14]">{money(deal.price)}</p>
                    </div>
                  )}
                  {deal.link && (
                    <Link
                      to={deal.link}
                      className="group/link inline-flex items-center gap-2 text-sm font-black text-[#F07D14] hover:text-[#E86C1B] transition-colors"
                    >
                      Order Now
                      <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-14 relative bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-3xl p-10 sm:p-12 text-center border-2 border-[#F07D14]/30 overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F07D14]/20 via-transparent to-[#F07D14]/20 blur-xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#F07D14] to-[#E86C1B] rounded-full mb-5 shadow-[0_8px_24px_rgba(240,125,20,0.5)]">
              <Star size={32} className="text-white fill-white" />
            </div>
            <h3 className="font-fredoka text-3xl sm:text-4xl font-black text-white mb-3">Join Loyalty Program</h3>
            <p className="text-[#C4B5AB] mb-8 max-w-lg mx-auto text-base">
              Earn <span className="text-[#F07D14] font-black">1 point per ₹10 spent</span>. Redeem for free burgers, priority delivery, and exclusive offers.
            </p>
            <Link
              to="/account"
              className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-black text-lg shadow-[0_16px_40px_rgba(240,125,20,0.45)] border-0 cursor-pointer hover:shadow-[0_20px_50px_rgba(240,125,20,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              <span className="relative z-10">Create Account</span>
              <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}