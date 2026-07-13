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
    <div className="overflow-hidden bg-[#0A0604]">
      <SEOHead
        url="/"
        description="Order the best burgers in Jabalpur — customize, track, enjoy. Fresh-made patties, bold Indian spices, lightning-fast delivery."
      />
      {/* ─── HERO ─── */}
      <BurgerHero />

      {/* ─── STATS ─── */}
      <section className="bg-[#F07D14] text-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {STATS.map(({ value, label, icon }) => (
              <motion.div key={label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <p className="text-3xl font-fredoka font-black mb-1 text-white">{value}</p>
                <p className="text-sm font-semibold text-white/80">{icon} {label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* STYLE 1: Vertical Product Layout (4-col) */}
      {/* ─── FEATURED MENU ─── */}
      {/* ════════════════════════════════════════ */}
      <section className="py-20 bg-[#0A0604]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-[#F07D14] font-bold text-sm uppercase tracking-widest mb-2">Menu Highlights</p>
              <h2 className="font-fredoka text-4xl font-bold text-white">Featured Burgers</h2>
              <p className="text-[#A39791] mt-1">Our most popular creations, loved by thousands.</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Link to="/menu" className="text-sm font-bold text-[#F07D14] hover:text-[#E86C1B] transition-colors">
                View All →
              </Link>
              <div className="h-4 w-px bg-[#F07D14]/20" />
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setFeaturedCat(c.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      featuredCat === c.key ? 'bg-[#F07D14] text-white' : 'bg-[#1A1310] text-[#A39791] hover:text-white hover:bg-[#16100D]'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredItems.map((product, i) => (
              <motion.div key={product.id}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                className="flex flex-col bg-[#16110E] border border-[#2A1F1A] rounded-[16px] p-5 gap-4"
              >
                {/* Image */}
                <div className="relative">
                  <img src={product.image} alt={product.name} className="w-full aspect-square object-cover rounded-[12px]"
          loading="lazy"
          decoding="async"
        />
                  {product.badge && (
                    <span className="absolute top-3 left-3 rounded-full bg-[#F07D14] text-[#000000] text-[11px] font-bold uppercase tracking-wider px-2.5 py-1">
                      {product.badge}
                    </span>
                  )}
                  {product.spicy && (
                    <span className="absolute top-3 right-3 bg-[#B83A1B] text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flame size={9} /> SPICY
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-left font-bold text-white text-lg m-0 leading-tight">{product.name}</h3>
                  <p className="text-left font-normal text-[#A39791] text-sm leading-relaxed m-0 line-clamp-2">{product.desc}</p>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-auto pt-2">
                  <span className="font-extrabold text-[#F07D14] text-xl">₹{product.price}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="w-10 h-10 bg-[#110D0B] border border-[#2A2421] rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:border-[#F07D14]/40 transition-all"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onAddToCart(product.id)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#F07D14] text-white font-bold rounded-xl hover:bg-[#E86C1B] transition-colors"
                    >
                      <ShoppingBag size={16} /> Add
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/menu" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border-2 border-[#F07D14] text-[#F07D14] font-bold hover:bg-[#F07D14] hover:text-white transition-all">
              Explore Full Menu <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* STYLE 2: Wide Promotional Layout (3-col) */}
      {/* ─── WHY US ─── */}
      {/* ════════════════════════════════════════ */}
      <section className="relative py-24 bg-[#0E0907] overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-[#F07D14]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 -right-32 w-80 h-80 bg-[#B83A1B]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F07D14]/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-[#1A1310] border border-[#F07D14]/20 rounded-full px-4 py-1.5 mb-6"
            >
              <Award size={14} className="text-[#F07D14]" />
              <span className="text-[#F07D14] font-bold text-xs uppercase tracking-widest">Our Promise</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-fredoka text-5xl sm:text-6xl font-black text-white mb-4"
            >
              Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F07D14] to-[#E86C1B]">Choose Us?</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-[#A39791] text-lg max-w-2xl mx-auto"
            >
              We don't just serve burgers — we craft experiences. Here's what makes every bite worth it.
            </motion.p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
                whileHover={{ y: -8 }}
                className="group relative bg-[#1A1310]/80 backdrop-blur-sm rounded-2xl p-7 shadow-xl border border-white/5 hover:border-[#F07D14]/30 transition-all duration-300"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F07D14]/0 via-transparent to-[#B83A1B]/0 group-hover:from-[#F07D14]/8 group-hover:to-[#B83A1B]/5 transition-all duration-500 pointer-events-none" />

                {/* Number badge */}
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br from-[#F07D14] to-[#E86C1B] text-white font-fredoka font-black text-sm flex items-center justify-center shadow-lg shadow-[#F07D14]/25">
                  {i + 1}
                </div>

                {/* Icon */}
                <div className={`relative w-16 h-16 rounded-2xl ${bg} flex items-center justify-center mb-5 border border-white/5 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
                  <Icon size={28} className={`${iconColor} relative z-10`} />
                  {/* Glow underneath */}
                  <div className="absolute inset-0 rounded-2xl bg-[#F07D14]/20 blur-xl group-hover:bg-[#F07D14]/30 transition-all duration-300 -z-10" />
                </div>

                {/* Content */}
                <h3 className="font-fredoka text-xl font-bold text-white mb-2 group-hover:text-[#F07D14] transition-colors">{title}</h3>
                <p className="text-[#A39791] text-sm leading-relaxed">{desc}</p>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r from-[#F07D14]/60 via-[#F07D14]/20 to-transparent group-hover:from-[#F07D14] group-hover:via-[#F07D14]/40 transition-all duration-300" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMBO HIGHLIGHT ─── */}
      <section className="py-20 bg-[#0A0604]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#1A1310] to-[#16100D] rounded-2xl p-6 sm:p-8 border border-white/5 relative overflow-hidden">
            {/* Orange top-edge micro border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F07D14]/50 to-transparent" />
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left: large visual asset */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden shadow-lg border border-white/10 col-span-2">
                  <img src={products.find(p => p.id === 'million-meal')?.image} alt="Million Meal Combo" className="w-full h-56 object-cover" loading="lazy" decoding="async" />
                </div>
                <div className="rounded-xl overflow-hidden shadow-md border border-white/10">
                  <img src={products.find(p => p.id === 'paneer-makhani')?.image} alt="Paneer Makhani Burger" className="w-full h-28 object-cover" loading="lazy" decoding="async" />
                </div>
                <div className="rounded-xl overflow-hidden shadow-md border border-white/10">
                  <img src={products.find(p => p.id === 'strip-cravings')?.image} alt="Crispy Strips" className="w-full h-28 object-cover" loading="lazy" decoding="async" />
                </div>
              </div>

              {/* Right: content + pill button */}
              <div>
                <span className="inline-block bg-[#B83A1B] text-white text-xs font-bold px-3 py-1 rounded-full mb-4">🎁 Best Deal</span>
                <h3 className="font-fredoka text-3xl font-bold text-white mb-3">Million Meal Combo</h3>
                <p className="text-sm text-[#A39791] leading-relaxed mb-6">
                  Paneer Makhani Burger + crispy strips + cooler<br />
                  A complete burger tray with a creamy makhani patty, golden crunch, and one chilled house drink.
                </p>

                {/* Size selector */}
                <div className="mb-6">
                  <p className="text-sm font-bold text-white mb-2">Select Size:</p>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-lg bg-[#F07D14] text-white font-bold text-sm">Single</button>
                    <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-[#A39791] font-bold text-sm hover:border-[#F07D14]/40 hover:text-white transition-all">Double +₹79</button>
                  </div>
                </div>

                {/* Price and Add button */}
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <span className="font-fredoka text-4xl font-black text-[#F07D14]">₹399</span>
                    <span className="text-sm text-[#8E827B] line-through ml-3">₹520</span>
                    <p className="text-xs text-green-400 font-semibold mt-1">Save 23%</p>
                  </div>
                  <button
                    onClick={() => onAddToCart('million-meal')}
                    className="flex items-center gap-2 bg-[#F07D14] text-white font-bold px-6 py-3 rounded-full hover:bg-[#E86C1B] transition-colors shadow-lg shadow-[#F07D14]/20"
                  >
                    <ShoppingBag size={18} /> Add Combo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAKE IT YOURS ─── */}
      <section className="py-20 bg-[#0E0907]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#F07D14]/10 border border-[#F07D14]/30 rounded-full px-4 py-1.5 mb-4">
                <ChefHat size={14} className="text-[#F07D14]" />
                <span className="text-[#F07D14] text-xs font-black uppercase tracking-wider">Customise</span>
              </div>
              <h2 className="font-fredoka text-4xl font-bold text-white mb-4">Make it yours</h2>
              <p className="text-[#A39791] mb-6 text-lg">Choose spice, add extra cheese, double the patty</p>
              <p className="text-sm text-[#A39791] leading-relaxed mb-6">
                Go mellow or hot, keep it extra cheesy, and finish each stack with the sauce notes your tray deserves.
              </p>
              <Link to="/menu" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-bold shadow-[0_8px_24px_rgba(240,125,20,0.3)] hover:shadow-[0_12px_32px_rgba(240,125,20,0.5)] hover:scale-105 transition-all">
                Customise Now <ArrowRight size={16} />
              </Link>
            </div>
            <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <img src={products.find(p => p.id === 'double-smash')?.image} alt="Custom Burger" className="w-full h-64 sm:h-96 object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FROM THE KITCHEN ─── */}
      <section className="py-16 bg-[#0A0604]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[#F07D14] font-bold text-sm uppercase tracking-widest mb-2">FROM THE KITCHEN</p>
              <h2 className="font-fredoka text-4xl sm:text-5xl font-black text-white">Real One in a Million photos</h2>
            </div>
            <Link to="/about" className="text-sm font-bold text-[#F07D14] hover:text-[#E86C1B] transition-colors">
              View Gallery →
            </Link>
          </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'mushroom-swiss', label: 'Big burger energy', span: 'col-span-2 row-span-2', h: 'h-64 sm:h-96' },
                { id: 'oreo-shake', label: 'Oreo shake', span: '', h: 'h-48 sm:h-64' },
                { id: 'strip-cravings', label: 'Crispy bites', span: '', h: 'h-48 sm:h-64' },
                { id: 'crispy-bites', label: 'Cheesy bites', span: 'col-span-2', h: 'h-48 sm:h-64' },
              ].map((item) => (
                <div key={item.id} className={`group relative ${item.span} ${item.h} rounded-2xl overflow-hidden shadow-lg border border-white/10`}>
                  <img
                    src={products.find(p => p.id === item.id)?.image}
                    alt={item.label}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <span className="text-white text-sm font-bold">{item.label}</span>
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
      <section className="py-24 bg-[#0E0907] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-[#F07D14]/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-[#B83A1B]/5 rounded-full blur-[100px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#F07D14]/10 border border-[#F07D14]/30 rounded-full px-4 py-1.5 mb-4">
              <Star size={14} className="text-[#F07D14] fill-[#F07D14]" />
              <span className="text-[#F07D14] text-xs font-black uppercase tracking-wider">Testimonials</span>
            </div>
            <h2 className="font-fredoka text-4xl sm:text-5xl font-black text-white mb-4">What Our Customers Say</h2>
            <p className="text-[#A39791] text-lg max-w-2xl mx-auto">Real reviews from real burger lovers. Join thousands of happy customers!</p>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REVIEWS.map((review, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-2xl p-6 border border-[#2A1F1A] transition-all duration-500 hover:border-[#F07D14]/60 hover:shadow-[0_20px_40px_rgba(240,125,20,0.25)] hover:-translate-y-2"
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F07D14]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F07D14]/60 to-transparent" />

                  {/* Quote icon */}
                  <div className="mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-[#F07D14]/40">
                      <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" fill="currentColor"/>
                    </svg>
                  </div>

                  {/* Review text */}
                  <p className="text-[#C4B5AB] mb-5 leading-relaxed">"{review.text}"</p>

                  {/* Rating stars */}
                  <div className="flex items-center gap-0.5 mb-4">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star key={j} size={14} className="fill-[#F07D14] text-[#F07D14]" />
                    ))}
                  </div>

                  {/* Reviewer info */}
                  <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F07D14] to-[#B83A1B] flex items-center justify-center text-white font-black text-sm shadow-lg flex-shrink-0">
                      {review.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm">{review.name}</p>
                      <p className="text-xs text-[#A39791]">Verified Customer</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#8E827B]">{review.date}</p>
                    </div>
                  </div>

                  {/* Hover action */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button className="inline-flex items-center gap-1.5 text-xs text-[#F07D14] font-bold hover:text-[#E86C1B] transition-colors">
                      <ThumbsUp size={12} />
                      Helpful
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link
              to="/reviews"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-bold shadow-[0_16px_40px_rgba(240,125,20,0.3)] hover:shadow-[0_20px_50px_rgba(240,125,20,0.5)] hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Read All Reviews
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-fredoka text-4xl font-black mb-3 text-white">Hungry? Order Now 🍔</h2>
          <p className="text-white/80 mb-8">Use code <span className="bg-white/20 px-2 py-0.5 rounded font-mono font-bold text-white">MILLION10</span> for 10% off your first order!</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/menu" className="px-8 py-4 rounded-xl bg-white text-[#F07D14] font-black text-lg hover:bg-orange-50 transition-colors shadow-xl">
              Order Online
            </Link>
            <Link to="/reservation" className="px-8 py-4 rounded-xl border-2 border-white text-white font-black text-lg hover:bg-white/10 transition-colors">
              Book a Table
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}