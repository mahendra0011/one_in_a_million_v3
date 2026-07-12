import SEOHead from '../components/SEOHead';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Flame, Leaf, ShoppingBag, Settings2, Heart, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenu, useMenuCategories } from '../hooks/useMenu';
import { money } from '../lib/utils';

const getFavs = () => { try { return JSON.parse(localStorage.getItem('bim_favorites') || '[]'); } catch { return []; } };

const SUBCATS = { burgers: ['all', 'beef', 'chicken', 'veg', 'special'] };
const CATEGORY_EMOJI = { all: '🍽 All', burgers: '🍔 Burgers', sides: '🍟 Sides', drinks: '🥤 Drinks', combos: '🎁 Combos' };

export default function MenuPage({ onAddToCart, onCustomize }) {
  const { categories } = useMenuCategories();
  const navigate = useNavigate();
  const CATS = ['all', ...categories];

  const [cat, setCat] = useState('all');
  const [subcat, setSubcat] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [spicyOnly, setSpicyOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState(getFavs);

  const isFav = (id) => favorites.some(f => f.id === id);
  const toggleFav = (product) => {
    const id = product.id || product._id;
    setFavorites(prev => {
      const exists = prev.some(f => f.id === id);
      const next = exists ? prev.filter(f => f.id !== id) : [...prev, { id, name: product.name, price: product.price, image: product.image, category: product.category }];
      localStorage.setItem('bim_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Step 17 — debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // All filtering now happens server-side via /api/menu query params
  const { products: filtered, loading } = useMenu({
    category: cat,
    subcat: cat === 'burgers' ? subcat : undefined,
    search: debouncedSearch,
    veg: vegOnly ? true : undefined,
    spicy: spicyOnly ? true : undefined,
    minPrice: priceRange.min,
    maxPrice: priceRange.max,
    sort: sortBy === 'default' ? undefined : sortBy,
  });

  const resetFilters = () => {
    setSearch(''); setCat('all'); setSubcat('all');
    setVegOnly(false); setSpicyOnly(false); setSortBy('default');
    setPriceRange({ min: '', max: '' });
  };

  return (
    <div className="min-h-screen bg-[#0A0604]">
      <SEOHead
        title="Our Menu"
        description="Explore our full menu — gourmet burgers, crispy sides, refreshing drinks and combo deals. Order online for quick delivery or dine in."
        url="/menu"
      />
      <section className="bg-gradient-to-r from-[#0A0604] to-[#0E0907] text-white py-14 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F07D14] font-bold text-sm uppercase tracking-widest mb-2">What's Cookin'</p>
          <h1 className="font-fredoka text-5xl font-bold text-white mb-3">Our Menu</h1>
          <p className="text-[#A39791] max-w-xl mx-auto">Fresh-made burgers, sides, drinks &amp; combo deals — pick your poison.</p>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-30 bg-[#0A0604]/95 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 flex-shrink-0">
            {CATS.map(c => (
              <button key={c} onClick={() => { setCat(c); setSubcat('all'); }}
                className={`px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-all ${
                  cat === c ? 'bg-[#F07D14] text-white shadow-sm' : 'bg-[#16100D] text-[#A39791] hover:bg-[#1A1310] hover:text-white'
                }`}>
                {CATEGORY_EMOJI[c] || `🍴 ${c}`}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative flex-shrink-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39791]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="pl-9 pr-4 py-2 rounded-xl border border-white/10 bg-[#16100D] text-white text-sm w-44 focus:outline-none focus:border-[#F07D14] focus:w-56 transition-all placeholder:text-[#8E827B]" />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`p-2 rounded-xl border transition-all flex-shrink-0 ${showFilters ? 'border-[#F07D14] bg-[#F07D14]/10 text-[#F07D14]' : 'border-white/10 text-[#A39791] hover:border-[#F07D14]/40'}`}>
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/5">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
                {cat === 'burgers' && SUBCATS.burgers.map(s => (
                  <button key={s} onClick={() => setSubcat(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border transition-all ${
                      subcat === s ? 'bg-[#F07D14] text-white border-[#F07D14]' : 'border-white/10 text-[#A39791] hover:border-[#F07D14]/40 hover:text-white'
                    }`}>
                    {s === 'all' ? 'All Types' : s === 'veg' ? '🥦 Veg' : s === 'beef' ? '🥩 Beef' : s === 'chicken' ? '🐔 Chicken' : '⭐ Special'}
                  </button>
                ))}
                <button onClick={() => setVegOnly(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    vegOnly ? 'bg-green-700 text-white border-green-600' : 'border-white/10 text-[#A39791] hover:border-green-600/50 hover:text-white'
                  }`}>
                  <Leaf size={12} /> Veg Only
                </button>
                <button onClick={() => setSpicyOnly(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    spicyOnly ? 'bg-[#B83A1B] text-white border-[#B83A1B]' : 'border-white/10 text-[#A39791] hover:border-[#B83A1B]/50 hover:text-white'
                  }`}>
                  <Flame size={12} /> Spicy Only
                </button>
                <div className="flex items-center gap-1.5">
                  <input type="number" min="0" value={priceRange.min}
                    onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))}
                    placeholder="Min ₹"
                    className="w-20 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-white/10 bg-[#16100D] text-white focus:outline-none focus:border-[#F07D14] placeholder:text-[#8E827B]" />
                  <span className="text-[#8E827B] text-xs">–</span>
                  <input type="number" min="0" value={priceRange.max}
                    onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))}
                    placeholder="Max ₹"
                    className="w-20 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-white/10 bg-[#16100D] text-white focus:outline-none focus:border-[#F07D14] placeholder:text-[#8E827B]" />
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-[#16100D] text-[#A39791] focus:outline-none focus:border-[#F07D14] ml-auto">
                  <option value="default">Default Order</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Products Grid */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Loading skeleton */}
        {loading && filtered.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#16110E] border border-[#2A1F1A] rounded-[16px] p-5 animate-pulse">
                <div className="w-full aspect-square bg-[#2A1F1A] rounded-[12px] mb-4" />
                <div className="h-4 bg-[#2A1F1A] rounded mb-2 w-3/4" />
                <div className="h-3 bg-[#2A1F1A] rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

{!loading && filtered.length === 0 && (
           <div className="text-center py-24">
             <p className="text-5xl mb-4">🔍</p>
             <p className="text-[#A39791] font-semibold text-lg mb-2">No items found</p>
             <p className="text-[#8E827B] text-sm mb-6">Try a different filter or search term</p>
             <button onClick={resetFilters}
               className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-bold hover:shadow-lg hover:shadow-[#F07D14]/30 transition-all">Reset Filters</button>
           </div>
         )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((product, i) => (
                <motion.div key={product.id || product._id}
                  layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}
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
                    {(product.veg || product.subcat === 'veg') && (
                      <span className="absolute top-3 right-3 bg-green-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Leaf size={9} /> VEG
                      </span>
                    )}
                    {product.spicy && (
                      <span className="absolute top-3 right-3 bg-[#B83A1B] text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Flame size={9} /> SPICY
                      </span>
                    )}
                    {/* Favorite button */}
                    <button
                      onClick={() => toggleFav(product)}
                      className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${isFav(product.id || product._id) ? 'bg-red-500 text-white scale-110' : 'bg-black/50 text-white/70 hover:bg-red-500/80 hover:text-white'}`}
                      title={isFav(product.id || product._id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart size={14} fill={isFav(product.id || product._id) ? 'currentColor' : 'none'} />
                    </button>
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
                      {/* View Details */}
                      <button
                        onClick={() => navigate(`/product/${product.id || product._id}`)}
                        className="w-10 h-10 bg-[#110D0B] border border-[#2A2421] rounded-[12px] flex items-center justify-center text-white/70 hover:text-white hover:border-[#F07D14]/40 transition-all"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {product.category === 'burgers' && onCustomize && (
                        <button onClick={() => onCustomize(product.id)}
                          className="w-12 h-12 bg-[#110D0B] border border-[#2A2421] rounded-[14px] flex items-center justify-center text-white/80 hover:text-white hover:border-[#F07D14]/40 transition-all" title="Customize">
                          <Settings2 size={18} />
                        </button>
                      )}
                      <button onClick={() => onAddToCart(product.id)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#F07D14] text-white font-bold rounded-xl hover:bg-[#E86C1B] transition-colors">
                        <ShoppingBag size={16} /> Add
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
