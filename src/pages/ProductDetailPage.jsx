import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Settings, Heart, Star, Flame, Leaf, Plus, Minus, Share2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMenu } from '../hooks/useMenu';
import SEOHead from '../components/SEOHead';

const getFavorites = () => { try { return JSON.parse(localStorage.getItem('bim_favorites') || '[]'); } catch { return []; } };

export default function ProductDetailPage({ onAddToCart, onCustomize }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { productById, extras, sizeOptions, loading } = useMenu();
  const product = productById(id);

  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [isFav, setIsFav] = useState(() => getFavorites().some(f => f.id === id));
  const [added, setAdded] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    queueMicrotask(() => { if (sizeOptions?.length && !selectedSize) setSelectedSize(sizeOptions[0]); });
  }, [sizeOptions, selectedSize]);

  const toggleExtra = (extra) => {
    setSelectedExtras(prev =>
      prev.some(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const toggleFav = () => {
    const favs = getFavorites();
    const exists = favs.some(f => f.id === id);
    const next = exists
      ? favs.filter(f => f.id !== id)
      : [...favs, { id, name: product.name, price: product.price, image: product.image, category: product.category }];
    localStorage.setItem('bim_favorites', JSON.stringify(next));
    setIsFav(!exists);
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: product.name, text: product.desc, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const extraTotal = selectedExtras.reduce((s, e) => s + e.price, 0);
  const sizeExtra = selectedSize?.price || 0;
  const unitPrice = (product?.price || 0) + sizeExtra + extraTotal;
  const totalPrice = unitPrice * qty;

  const handleAddToCart = () => {
    if (!product) return;
    onAddToCart?.(product.id || product._id, {
      size: selectedSize,
      extras: selectedExtras,
      qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  // Loading state
  if (loading && !product) {
    return (
      <div className="min-h-screen bg-[#0A0604] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#F07D14]/20 border-t-[#F07D14] rounded-full animate-spin" />
          <span className="text-[#F07D14]/60 text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  // Not found
  if (!product && !loading) {
    return (
      <div className="min-h-screen bg-[#0A0604] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-4xl sm:text-5xl">🍔</p>
        <h2 className="text-white font-bold text-lg sm:text-xl text-center">Item not found</h2>
        <p className="text-[#A39791] text-xs sm:text-sm text-center">This item may have been removed from the menu.</p>
        <Link to="/menu" className="mt-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-[#F07D14] text-white font-bold rounded-xl hover:bg-[#E86C1B] transition-colors text-xs sm:text-sm">
          Browse Menu
        </Link>
      </div>
    );
  }

  const relatedItems = [];

  return (
    <div className="min-h-screen bg-[#0A0604]">
      {product && (
        <SEOHead
          title={product.name}
          description={product.desc}
          url={`/product/${id}`}
        />
      )}

      {/* Back nav */}
      <div className="sticky top-14 sm:top-16 z-20 bg-[#0A0604]/90 backdrop-blur-md border-b border-white/5">
        <div className="mx-auto max-w-5xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 sm:gap-2 text-[#A39791] hover:text-white transition-colors text-xs sm:text-sm font-semibold"
          >
            <ArrowLeft size={14} className="sm:size-16" /> Back
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleShare}
              className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg sm:rounded-xl bg-[#16100D] border border-white/10 flex items-center justify-center text-[#A39791] hover:text-white transition-colors"
              title="Share"
            >
              {shared ? <CheckCircle size={14} className="sm:size-16" /> : <Share2 size={14} className="sm:size-16" />}
            </button>
            <button
              onClick={toggleFav}
              className={`w-8 sm:w-9 h-8 sm:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center transition-all ${
                isFav ? 'bg-red-500 border-red-500 text-white' : 'bg-[#16100D] border-white/10 text-[#A39791] hover:text-red-400'
              }`}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={14} className="sm:size-16" fill={isFav ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {product && (
        <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">

            {/* Left: Image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-square shadow-xl sm:shadow-2xl border border-white/10">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                {product.badge && (
                  <span className="absolute top-3 sm:top-4 left-3 sm:left-4 rounded-full bg-[#F07D14] text-black text-[10px] sm:text-xs font-extrabold uppercase tracking-wider px-2.5 sm:px-3 py-1">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Tag pills below image */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                {product.veg && (
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold">
                    <Leaf size={10} /> Veg
                  </span>
                )}
                {product.spicy && (
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs bg-[#B83A1B]/15 text-[#FF6B4A] border border-[#B83A1B]/30 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold">
                    <Flame size={10} /> Spicy
                  </span>
                )}
                {product.subcat && (
                  <span className="text-[10px] sm:text-xs bg-white/5 text-[#A39791] border border-white/10 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-semibold capitalize">
                    {product.subcat}
                  </span>
                )}
                <span className="text-[10px] sm:text-xs bg-white/5 text-[#A39791] border border-white/10 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-semibold capitalize">
                    {product.category}
                  </span>
              </div>
            </motion.div>

            {/* Right: Details + Customizer */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col gap-4 sm:gap-5"
            >
              {/* Name + rating */}
              <div>
                <h1 className="font-fredoka text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight mb-2">
                  {product.name}
                </h1>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} className="sm:size-14" fill={s <= 4 ? '#F07D14' : 'none'} />
                    ))}
                  </div>
                  <span className="text-[#A39791] text-[10px] sm:text-xs ml-1">4.8 (240+)</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-[#A39791] leading-relaxed text-xs sm:text-sm">{product.desc}</p>

              {/* Price */}
              <div className="flex items-end gap-2">
                <span className="font-fredoka text-2xl sm:text-3xl lg:text-4xl font-black text-[#F07D14]">
                  ₹{totalPrice}
                </span>
                {qty > 1 && (
                  <span className="text-[#8E827B] text-[10px] sm:text-xs pb-0.5">₹{unitPrice} × {qty}</span>
                )}
              </div>

              {/* Size selector */}
              {sizeOptions?.length > 0 && (
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white mb-1.5 sm:mb-2">Size</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {sizeOptions.map(size => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${
                          selectedSize?.id === size.id
                            ? 'bg-[#F07D14] border-[#F07D14] text-white shadow-md'
                            : 'bg-[#16100D] border-white/10 text-[#A39791] hover:border-[#F07D14]/40 hover:text-white'
                        }`}
                      >
                        {size.label}
                        {size.price > 0 && <span className="ml-1 opacity-70">+₹{size.price}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Extras */}
              {extras?.length > 0 && (
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white mb-1.5 sm:mb-2">Add-ons</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                    {extras.map(extra => {
                      const selected = selectedExtras.some(e => e.id === extra.id);
                      return (
                        <button
                          key={extra.id}
                          onClick={() => toggleExtra(extra)}
                          className={`flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${
                            selected
                              ? 'bg-[#F07D14]/15 border-[#F07D14]/60 text-[#F07D14]'
                              : 'bg-[#16100D] border-white/10 text-[#A39791] hover:border-[#F07D14]/30 hover:text-white'
                          }`}
                        >
                          <span>{extra.label}</span>
                          <span className="opacity-70">+₹{extra.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Qty + Add */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
                {/* Qty control */}
                <div className="flex items-center justify-between sm:justify-start gap-1 bg-[#16100D] border border-white/10 rounded-lg sm:rounded-xl p-1 w-full sm:w-auto">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg flex items-center justify-center text-[#A39791] hover:text-white hover:bg-white/5 transition-all"
                  >
                    <Minus size={14} className="sm:size-16" />
                  </button>
                  <span className="w-8 text-center text-white font-bold text-xs sm:text-sm">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg flex items-center justify-center text-[#A39791] hover:text-white hover:bg-white/5 transition-all"
                  >
                    <Plus size={14} className="sm:size-16" />
                  </button>
                </div>

                {/* Add to cart */}
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all ${
                    added
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white hover:shadow-md sm:hover:shadow-lg'
                  }`}
                >
                  {added ? <><CheckCircle size={14} className="sm:size-16" /> Added!</> : <><ShoppingBag size={14} className="sm:size-16" /> Add to Cart — ₹{totalPrice}</>}
                </button>
              </div>

              {/* Customize deep dive */}
              {product.category === 'burgers' && onCustomize && (
                <button
                  onClick={() => onCustomize(product.id || product._id)}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-[#F07D14]/30 text-[#F07D14] text-xs sm:text-sm font-bold hover:bg-[#F07D14]/10 transition-all"
                >
                  <Settings size={12} className="sm:size-14" /> Full Customization —›
                </button>
              )}
            </motion.div>
          </div>

          {/* Nutritional info */}
          <div className="mt-8 sm:mt-10 lg:mt-12 border-t border-white/5 pt-6 sm:pt-8 lg:pt-10">
            <h2 className="text-white font-bold text-base sm:text-lg mb-3 sm:mb-4">What's Inside</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {[
                { label: 'Calories', value: `${Math.round(product.price * 1.5)}`, unit: 'kcal' },
                { label: 'Protein', value: `${Math.round(product.price * 0.08)}g`, unit: '' },
                { label: 'Carbs', value: `${Math.round(product.price * 0.18)}g`, unit: '' },
                { label: 'Fat', value: `${Math.round(product.price * 0.05)}g`, unit: '' },
              ].map(({ label, value, unit }) => (
                <div key={label} className="bg-[#16100D] border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                  <p className="font-fredoka text-xl sm:text-2xl font-black text-[#F07D14]">{value}{unit}</p>
                  <p className="text-[#8E827B] text-[10px] sm:text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-[#8E827B] text-[10px] sm:text-xs mt-2.5 sm:mt-3">* Approximate values. Actual nutrition may vary by size and add-ons.</p>
          </div>

          {/* Back to menu CTA */}
          <div className="mt-8 sm:mt-10 text-center">
            <Link
              to="/menu"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl border border-[#F07D14]/30 text-[#F07D14] font-bold hover:bg-[#F07D14]/10 transition-all text-xs sm:text-sm"
            >
              <ArrowLeft size={14} className="sm:size-16" /> Browse Full Menu
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}