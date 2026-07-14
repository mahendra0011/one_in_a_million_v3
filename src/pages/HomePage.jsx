import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Star, Clock, MapPin, Flame, ChefHat, Award, ShoppingBag, ThumbsUp, Minus, Plus, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMenu } from '../hooks/useMenu';
import SEOHead from '../components/SEOHead';
import BurgerHero from '../components/BurgerHero';

const CATEGORIES = [
  { key: 'all', label: '🍽 All' },
  { key: 'burgers', label: '🍔 Burgers' },
  { key: 'sides', label: '🍟 Sides' },
  { key: 'drinks', label: '🥤 Drinks' },
  { key: 'combos', label: '🎁 Combos' },
];

const STATS = [
  { value: '50K+', label: 'Happy Customers', icon: '😊' },
  { value: '4.9★', label: 'Average Rating', icon: '⭐' },
  { value: '18 min', label: 'Avg Delivery', icon: '🛵' },
  { value: '2 Outlets', label: 'Jabalpur', icon: '📍' },
];

const REVIEWS = [
  { name: 'Rahul S.', rating: 5, text: 'Best burger in Jabalpur! The Paneer Makhani is an absolute game-changer.', avatar: 'R', date: '2 days ago' },
  { name: 'Priya P.', rating: 5, text: 'Loved the crispy chicken! Fresh, hot, and worth every rupee.', avatar: 'P', date: '1 week ago' },
  { name: 'Arjun M.', rating: 5, text: 'Quick delivery and fantastic flavors. The combo deals are 🔥', avatar: 'A', date: '2 weeks ago' },
];

export default function HomePage({ onAddToCart }) {
  const { products } = useMenu();
  const navigate = useNavigate();
  const [featuredCat, setFeaturedCat] = useState('all');
  const featuredItems = featuredCat === 'all'
    ? products.slice(0, 8)
    : products.filter(p => p.category === featuredCat).slice(0, 8);

  return (
    <div className="overflow-x-hidden bg-[#0A0604]">
      <SEOHead
        url="/"
        description="Order the best burgers in Jabalpur — customize, track, enjoy. Fresh-made patties, bold Indian spices, lightning-fast delivery."
      />
      {/* ─── HERO ─── */}
      <BurgerHero />

      {/* ─── STATS ─── */}
      <section className="bg-[#F07D14] text-white py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center">
            {STATS.map(({ value, label, icon }) => (
              <motion.div key={label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <p className="text-2xl sm:text-3xl font-fredoka font-black mb-1 text-white">{value}</p>
                <p className="text-xs sm:text-sm font-semibold text-white/80">{icon} {label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* STYLE 1: Vertical Product Layout (4-col) */}
      {/* ─── FEATURED MENU ─── */}
      {/* ════════════════════════════════════════ */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#0A0604]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-10">
            <div>
              <p className="text-[#F07D14] font-bold text-xs sm:text-sm uppercase tracking-widest mb-1 sm:mb-2">Menu Highlights</p>
              <h2 className="font-fredoka text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Featured Burgers</h2>
              <p className="text-[#A39791] mt-0.5 sm:mt-1 text-xs sm:text-sm">Our most popular creations, loved by thousands.</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Link to="/menu" className="text-xs sm:text-sm font-bold text-[#F07D14] hover:text-[#E86C1B] transition-colors">
                View All →
              </Link>
              <div className="h-3 sm:h-4 w-px bg-[#F07D14]/20" />
              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setFeaturedCat(c.key)}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                      featuredCat === c.key ? 'bg-[#F07D14] text-white' : 'bg-[#1A1310] text-[#A39791] hover:text-white hover:bg-[#16100D]'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredItems.map((product, i) => (
              <motion.div key={product.id}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                className="flex flex-col bg-[#16110E] border border-[#2A1F1A] rounded-[14px] sm:rounded-[16px] p-4 sm:p-5 gap-3 sm:gap-4"
              >
                {/* Image */}
                <div className="relative">
                  <img src={product.image} alt={product.name} className="w-full aspect-square object-cover rounded-[10px] sm:rounded-[12px]"
          loading="lazy"
          decoding="async"
        />
                  {product.badge && (
                    <span className="absolute top-2 sm:top-3 left-2 sm:left-3 rounded-full bg-[#F07D14] text-[#000000] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1">
                      {product.badge}
                    </span>
                  )}
                  {product.spicy && (
                    <span className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-[#B83A1B] text-white text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0 sm:py-0.5 rounded-full flex items-center gap-0.5 sm:gap-1">
                      <Flame size={8} className="sm:size-9" /> SPICY
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1 sm:gap-1.5">
                  <h3 className="text-left font-bold text-white text-sm sm:text-lg m-0 leading-tight">{product.name}</h3>
                  <p className="text-left font-normal text-[#A39791] text-xs sm:text-sm leading-relaxed m-0 line-clamp-2">{product.desc}</p>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-auto pt-1.5 sm:pt-2">
                  <span className="font-extrabold text-[#F07D14] text-lg sm:text-xl">₹{product.price}</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="w-8 sm:w-10 h-8 sm:h-10 bg-[#110D0B] border border-[#2A2421] rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:border-[#F07D14]/40 transition-all"
                      title="View Details"
                    >
                      <Eye size={14} className="sm:size-16" />
                    </button>
                    <button
                      onClick={() => onAddToCart(product.id)}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-[#F07D14] text-white font-bold rounded-xl hover:bg-[#E86C1B] transition-colors text-xs sm:text-sm"
                    >
                      <ShoppingBag size={14} className="sm:size-16" /> Add
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8 sm:mt-10">
            <Link to="/menu" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl border-2 border-[#F07D14] text-[#F07D14] font-bold hover:bg-[#F07D14] hover:text-white transition-all text-sm sm:text-base">
              Explore Full Menu <ArrowRight size={14} className="sm:size-16" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* STYLE 2: Wide Promotional Layout (3-col) */}
      {/* ─── WHY US ─── */}
      {/* ════════════════════════════════════════ */}
      <section className="relative py-16 sm:py-20 lg:py-24 bg-[#0E0907] overflow-hidden">
        {/* Decorative background blobs - hidden on mobile for performance */}
        <div className="hidden sm:block absolute top-10 sm:top-20 -left-20 sm:-left-32 w-64 sm:w-96 h-64 sm:h-96 bg-[#F07D14]/10 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />
        <div className="hidden sm:block absolute bottom-6 sm:bottom-10 -right-16 sm:-right-32 w-64 sm:w-80 h-64 sm:h-80 bg-[#B83A1B]/10 rounded-full blur-[60px] sm:blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-[#F07D14]/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#1A1310] border border-[#F07D14]/20 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 mb-4 sm:mb-6"
            >
              <Award size={12} className="sm:size-14" />
              <span className="text-[#F07D14] font-bold text-[10px] sm:text-xs uppercase tracking-widest">Our Promise</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-fredoka text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3 sm:mb-4 leading-tight"
            >
              Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F07D14] to-[#E86C1B]">Choose Us?</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-[#A39791] text-sm sm:text-lg max-w-2xl mx-auto"
            >
              We don't just serve burgers — we craft experiences. Here's what makes every bite worth it.
            </motion.p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {[
              { Icon: ChefHat, title: 'Fresh Made to Order', desc: 'Every burger is assembled fresh when you order — no pre-made patties sitting around.', iconColor: 'text-[#F07D14]', bg: 'bg-[#F07D14]/15' },
              { Icon: Clock, title: 'Lightning Fast Delivery', desc: 'We average 18 minutes from order to door. Hot, fresh, fast.', iconColor: 'text-[#F07D14]', bg: 'bg-[#F07D14]/10' },
              { Icon: Star, title: 'Top Rated', desc: '4.9 stars across 3,000+ reviews. Our customers love us, and we love them back.', iconColor: 'text-[#F07D14]', bg: 'bg-[#F07D14]/15' },
              { Icon: MapPin, title: '2 Locations', desc: 'Dine in at our Mall Road or Wright Town outlets. Reserve your table today.', iconColor: 'text-[#F07D14]', bg: 'bg-[#F07D14]/10' },
              { Icon: Flame, title: 'Bold Flavours', desc: 'Our recipes blend Indian spices with gourmet burger techniques. Unique every time.', iconColor: 'text-[#B83A1B]', bg: 'bg-[#B83A1B]/15' },
              { Icon: Award, title: 'Award-Winning', desc: 'One In A Million in Jabalpur won the award for Best Fast Food at the Zomato Restaurant Awards.', iconColor: 'text-[#F07D14]', bg: 'bg-[#F07D14]/15' },
            ].map(({ Icon, title, desc, iconColor, bg }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 100 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                className="group relative bg-[#1A1310]/80 backdrop-blur-sm rounded-2xl p-5 sm:p-6 lg:p-7 shadow-xl border border-white/5 hover:border-[#F07D14]/30 transition-all duration-300"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F07D14]/0 via-transparent to-[#B83A1B]/0 group-hover:from-[#F07D14]/8 group-hover:to-[#B83A1B]/5 transition-all duration-500 pointer-events-none" />

                {/* Number badge */}
                <div className="absolute -top-2 sm:-top-3 -right-2 sm:-right-3 w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-gradient-to-br from-[#F07D14] to-[#E86C1B] text-white font-fredoka font-black text-xs sm:text-sm flex items-center justify-center shadow-lg shadow-[#F07D14]/25">
                  {i + 1}
                </div>

                {/* Icon */}
                <div className={`relative w-12 sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl ${bg} flex items-center justify-center mb-4 sm:mb-5 border border-white/5 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
                  <Icon size={24} className="sm:size-28" />
                  {/* Glow underneath */}
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-[#F07D14]/20 blur-lg sm:blur-xl group-hover:bg-[#F07D14]/30 transition-all duration-300 -z-10" />
                </div>

                {/* Content */}
                <h3 className="font-fredoka text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2 group-hover:text-[#F07D14] transition-colors">{title}</h3>
                <p className="text-[#A39791] text-xs sm:text-sm leading-relaxed">{desc}</p>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-4 sm:left-6 right-4 sm:right-6 h-[1px] sm:h-[2px] bg-gradient-to-r from-[#F07D14]/60 via-[#F07D14]/20 to-transparent group-hover:from-[#F07D14] group-hover:via-[#F07D14]/40 transition-all duration-300" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMBO HIGHLIGHT ─── */}
      <section className="py-16 sm:py-20 bg-[#0A0604]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-2xl p-5 sm:p-6 lg:p-8 border border-white/5 relative overflow-hidden">
            {/* Orange top-edge micro border */}
            <div className="absolute top-0 left-0 right-0 h-[1px] sm:h-[2px] bg-gradient-to-r from-transparent via-[#F07D14]/50 to-transparent" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 lg:gap-8 items-center">
              {/* Left: large visual asset */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 order-2 lg:order-1">
                <div className="rounded-xl overflow-hidden shadow-lg border border-white/10 col-span-2">
                  <img src={products.find(p => p.id === 'million-meal')?.image} alt="Million Meal Combo" className="w-full h-40 sm:h-48 lg:h-56 object-cover" loading="lazy" decoding="async" />
                </div>
                <div className="rounded-xl overflow-hidden shadow-md border border-white/10">
                  <img src={products.find(p => p.id === 'paneer-makhani')?.image} alt="Paneer Makhani Burger" className="w-full h-16 sm:h-20 lg:h-28 object-cover" loading="lazy" decoding="async" />
                </div>
                <div className="rounded-xl overflow-hidden shadow-md border border-white/10">
                  <img src={products.find(p => p.id === 'strip-cravings')?.image} alt="Crispy Strips" className="w-full h-16 sm:h-20 lg:h-28 object-cover" loading="lazy" decoding="async" />
                </div>
              </div>

              {/* Right: content + pill button */}
              <div className="order-1 lg:order-2">
                <span className="inline-block bg-[#B83A1B] text-white text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full mb-3 sm:mb-4">🎁 Best Deal</span>
                <h3 className="font-fredoka text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3">Million Meal Combo</h3>
                <p className="text-xs sm:text-sm text-[#A39791] leading-relaxed mb-4 sm:mb-5 lg:mb-6">
                  Paneer Makhani Burger + crispy strips + cooler<br />
                  A complete burger tray with a creamy makhani patty, golden crunch, and one chilled house drink.
                </p>

                {/* Size selector */}
                <div className="mb-4 sm:mb-5 lg:mb-6">
                  <p className="text-xs sm:text-sm font-bold text-white mb-1.5 sm:mb-2">Select Size:</p>
                  <div className="flex gap-2 sm:gap-3">
                    <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#F07D14] text-white font-bold text-xs sm:text-sm">Single</button>
                    <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white/5 border border-white/20 text-[#A39791] font-bold text-xs sm:text-sm hover:border-[#F07D14]/40 hover:text-white transition-all">Double +₹79</button>
                  </div>
                </div>

                {/* Price and Add button */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
                  <div>
                    <span className="font-fredoka text-3xl sm:text-4xl font-black text-[#F07D14]">₹399</span>
                    <span className="text-xs sm:text-sm text-[#8E827B] line-through ml-2 sm:ml-3">₹520</span>
                    <p className="text-[10px] sm:text-xs text-green-400 font-semibold mt-0.5 sm:mt-1">Save 23%</p>
                  </div>
                  <button
                    onClick={() => onAddToCart('million-meal')}
                    className="flex items-center gap-1.5 sm:gap-2 bg-[#F07D14] text-white font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-full hover:bg-[#E86C1B] transition-colors shadow-lg shadow-[#F07D14]/20 text-xs sm:text-sm"
                  >
                    <ShoppingBag size={16} className="sm:size-18" /> Add Combo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAKE IT YOURS ─── */}
      <section className="py-16 sm:py-20 bg-[#0E0907]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#F07D14]/10 border border-[#F07D14]/30 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 mb-3 sm:mb-4">
                <ChefHat size={12} className="sm:size-14" />
                <span className="text-[#F07D14] text-[10px] sm:text-xs font-black uppercase tracking-wider">Customise</span>
              </div>
              <h2 className="font-fredoka text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">Make it yours</h2>
              <p className="text-[#A39791] mb-4 sm:mb-5 lg:mb-6 text-sm sm:text-base lg:text-lg">Choose spice, add extra cheese, double the patty</p>
              <p className="text-xs sm:text-sm text-[#A39791] leading-relaxed mb-4 sm:mb-5 lg:mb-6">
                Go mellow or hot, keep it extra cheesy, and finish each stack with the sauce notes your tray deserves.
              </p>
              <Link to="/menu" className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-xl bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-bold shadow-[0_6px_18px_rgba(240,125,20,0.3)] sm:shadow-[0_8px_24px_rgba(240,125,20,0.3)] hover:shadow-[0_10px_28px_rgba(240,125,20,0.5)] lg:hover:shadow-[0_12px_32px_rgba(240,125,20,0.5)] hover:scale-105 transition-all text-xs sm:text-sm lg:text-base">
                Customise Now <ArrowRight size={14} className="sm:size-16" />
              </Link>
            </div>
            <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <img src={products.find(p => p.id === 'double-smash')?.image} alt="Custom Burger" className="w-full h-48 sm:h-64 lg:h-80 object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FROM THE KITCHEN ─── */}
      <section className="py-12 sm:py-16 bg-[#0A0604]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8 lg:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
            <div>
              <p className="text-[#F07D14] font-bold text-xs sm:text-sm uppercase tracking-widest mb-1 sm:mb-2">FROM THE KITCHEN</p>
              <h2 className="font-fredoka text-2xl sm:text-3xl lg:text-4xl font-black text-white">Real One in a Million photos</h2>
            </div>
            <Link to="/about" className="text-xs sm:text-sm font-bold text-[#F07D14] hover:text-[#E86C1B] transition-colors">
              View Gallery →
            </Link>
          </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {[
                { id: 'mushroom-swiss', label: 'Big burger energy', span: 'col-span-2 sm:col-span-2 row-span-2', h: 'h-40 sm:h-48 lg:h-56' },
                { id: 'oreo-shake', label: 'Oreo shake', span: '', h: 'h-28 sm:h-32 lg:h-40' },
                { id: 'strip-cravings', label: 'Crispy bites', span: '', h: 'h-28 sm:h-32 lg:h-40' },
                { id: 'crispy-bites', label: 'Cheesy bites', span: 'col-span-2 sm:col-span-2', h: 'h-28 sm:h-32 lg:h-40' },
              ].map((item) => (
                <div key={item.id} className={`group relative ${item.span} ${item.h} rounded-xl sm:rounded-2xl overflow-hidden shadow-lg border border-white/10`}>
                  <img
                    src={products.find(p => p.id === item.id)?.image}
                    alt={item.label}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 lg:p-4 translate-y-1 sm:translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <span className="text-white text-xs sm:text-sm font-bold">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* STYLE 3: Enhanced Testimonials */}
      {/* ─── REVIEWS ─── */}
      {/* ════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 lg:py-24 bg-[#0E0907] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 sm:top-16 lg:top-20 left-10 sm:left-20 w-48 sm:w-64 lg:w-72 h-48 sm:h-64 lg:h-72 bg-[#F07D14]/5 rounded-full blur-[60px] sm:blur-[80px] lg:blur-[100px]" />
          <div className="absolute bottom-10 sm:bottom-16 lg:bottom-20 right-10 sm:right-20 w-48 sm:w-64 lg:w-72 h-48 sm:h-64 lg:h-72 bg-[#B83A1B]/5 rounded-full blur-[60px] sm:blur-[80px] lg:blur-[100px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#F07D14]/10 border border-[#F07D14]/30 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 mb-3 sm:mb-4">
              <Star size={12} className="sm:size-14" />
              <span className="text-[#F07D14] text-[10px] sm:text-xs font-black uppercase tracking-wider">Testimonials</span>
            </div>
            <h2 className="font-fredoka text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-2 sm:mb-3 lg:mb-4">What Our Customers Say</h2>
            <p className="text-[#A39791] text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">Real reviews from real burger lovers. Join thousands of happy customers!</p>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {REVIEWS.map((review, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-[#2A1F1A] transition-all duration-500 hover:border-[#F07D14]/60 hover:shadow-[0_12px_24px_rgba(240,125,20,0.25)] sm:hover:shadow-[0_16px_32px_rgba(240,125,20,0.25)] lg:hover:shadow-[0_20px_40px_rgba(240,125,20,0.25)] hover:-translate-y-1 sm:hover:-translate-y-1.5 lg:hover:-translate-y-2"
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#F07D14]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] sm:h-[2px] bg-gradient-to-r from-transparent via-[#F07D14]/60 to-transparent" />

                  {/* Quote icon */}
                  <div className="mb-3 sm:mb-4">
                    <svg width="28" height="28" className="sm:w-32 sm:h-32" viewBox="0 0 24 24" fill="none" className="text-[#F07D14]/40">
                      <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" fill="currentColor"/>
                    </svg>
                  </div>

                  {/* Review text */}
                  <p className="text-[#C4B5AB] mb-3 sm:mb-4 lg:mb-5 leading-relaxed text-xs sm:text-sm">"{review.text}"</p>

                  {/* Rating stars */}
                  <div className="flex items-center gap-0.5 mb-3 sm:mb-4">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star key={j} size={12} className="sm:size-14" />
                    ))}
                  </div>

                  {/* Reviewer info */}
                  <div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-white/5">
                    <div className="w-9 sm:w-11 h-9 sm:h-11 rounded-full bg-gradient-to-br from-[#F07D14] to-[#B83A1B] flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md sm:shadow-lg flex-shrink-0">
                      {review.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-xs sm:text-sm">{review.name}</p>
                      <p className="text-[10px] sm:text-xs text-[#A39791]">Verified Customer</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs text-[#8E827B]">{review.date}</p>
                    </div>
                  </div>

                  {/* Hover action */}
                  <div className="mt-3 sm:mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-[#F07D14] font-bold hover:text-[#E86C1B] transition-colors">
                      <ThumbsUp size={10} className="sm:size-12" />
                      Helpful
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-8 sm:mt-10 lg:mt-12">
            <Link
              to="/reviews"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-6 sm:px-7 lg:px-8 py-2.5 sm:py-3 lg:py-3.5 rounded-full bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-bold shadow-[0_10px_25px_rgba(240,125,20,0.3)] sm:shadow-[0_12px_30px_rgba(240,125,20,0.3)] lg:shadow-[0_16px_40px_rgba(240,125,20,0.3)] hover:shadow-[0_12px_30px_rgba(240,125,20,0.5)] sm:hover:shadow-[0_16px_35px_rgba(240,125,20,0.5)] lg:hover:shadow-[0_20px_50px_rgba(240,125,20,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 text-xs sm:text-sm lg:text-base"
            >
              Read All Reviews
              <ArrowRight size={14} className="sm:size-16" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white py-12 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-fredoka text-2xl sm:text-3xl lg:text-4xl font-black mb-2 sm:mb-3 text-white">Hungry? Order Now 🍔</h2>
          <p className="text-white/80 mb-5 sm:mb-6 lg:mb-8 text-xs sm:text-sm lg:text-base">Use code <span className="bg-white/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono font-bold text-white">MILLION10</span> for 10% off your first order!</p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center">
            <Link to="/menu" className="px-6 sm:px-7 lg:px-8 py-3 sm:py-3.5 lg:py-4 rounded-xl bg-white text-[#F07D14] font-black text-sm sm:text-base lg:text-lg hover:bg-orange-50 transition-colors shadow-md sm:shadow-lg">
              Order Online
            </Link>
            <Link to="/reservation" className="px-6 sm:px-7 lg:px-8 py-3 sm:py-3.5 lg:py-4 rounded-xl border-2 border-white text-white font-black text-sm sm:text-base lg:text-lg hover:bg-white/10 transition-colors">
              Book a Table
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}