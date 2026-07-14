import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Heart, Eye } from 'lucide-react';

const getFavorites = () => { try { return JSON.parse(localStorage.getItem('bim_favorites') || '[]'); } catch { return []; } };

export default function ProductCard({ product, onCustomize, onQuickAdd, index }) {
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const [isFav, setIsFav] = useState(() => getFavorites().some(f => f.id === (product.id || product._id)));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggleFav = (e) => {
    e.stopPropagation();
    const favs = getFavorites();
    const id = product.id || product._id;
    const exists = favs.some(f => f.id === id);
    const next = exists
      ? favs.filter(f => f.id !== id)
      : [...favs, { id, name: product.name, price: product.price, image: product.image, category: product.category }];
    localStorage.setItem('bim_favorites', JSON.stringify(next));
    setIsFav(!exists);
  };

  return (
    <article
      ref={cardRef}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.5s ease ${(index || 0) * 0.06}s, transform 0.5s ease ${(index || 0) * 0.06}s`,
      }}
      className="group flex flex-col w-full bg-gradient-to-b from-[#1E1612] to-[#16110E] border border-[#2A1F1A] rounded-xl sm:rounded-[20px] p-3 sm:p-5 gap-3 sm:gap-4 transition-all duration-500 hover:border-[#F07D14]/60 hover:shadow-md sm:hover:shadow-lg hover:-translate-y-1 sm:hover:-translate-y-2"
    >
      {/* Image Asset Area */}
      <div className="relative overflow-hidden rounded-lg sm:rounded-[14px]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
        <img
           src={product.image}
           alt={product.name}
           loading={index < 4 ? 'eager' : 'lazy'}
           decoding="async"
           width={600}
           height={600}
           className="w-full aspect-square object-cover rounded-lg sm:rounded-[14px] transition-transform duration-700 group-hover:scale-110 bg-gray-800"
           onLoad={(e) => e.target.classList.remove('bg-gray-800')}
         />
        {product.badge && (
          <span className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20 rounded-full bg-[#F07D14] text-[#000000] text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2 sm:px-3 py-0.5 sm:py-1.5 shadow-md sm:shadow-[0_4px_12px_rgba(240,125,20,0.5)]">
            {product.badge}
          </span>
        )}
        {product.spicy && (
          <span className="absolute top-2 sm:top-3 right-2 sm:right-3 z-20 text-base sm:text-lg">🌶️</span>
        )}
        {/* Favorite button */}
        <button
          type="button"
          onClick={toggleFav}
          className={`absolute bottom-2 sm:bottom-3 right-2 sm:right-3 z-20 w-7 sm:w-8 h-7 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 ${isFav ? 'bg-red-500 text-white scale-110' : 'bg-black/50 text-white/70 hover:bg-red-500/80 hover:text-white'}`}
          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          aria-label="Add to favorites"
        >
          <Heart size={12} className="sm:size-14" fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Product Info Block */}
      <div className="flex flex-col gap-1 sm:gap-1.5">
        <h3 className="text-left font-bold text-white text-sm sm:text-lg m-0 leading-tight truncate">
          {product.name}
        </h3>
        <p className="text-left font-normal text-[#A39791] text-xs sm:text-sm leading-relaxed m-0 line-clamp-2">
          {product.desc}
        </p>
      </div>

      {/* Custom Bottom Action Row */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mt-auto pt-1.5 sm:pt-2 gap-2 sm:gap-0">
        {/* Left: Price + Tags */}
        <div className="flex flex-col gap-0.5 sm:gap-1 w-full sm:w-auto">
          <span className="font-extrabold text-[#F07D14] text-lg sm:text-2xl tracking-tight">
            ₹{product.price}
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {product.veg && <span className="text-[9px] sm:text-[10px] text-green-400 font-bold">🌱 VEG</span>}
            {product.spicy && <span className="text-[9px] sm:text-[10px] text-red-400 font-bold">🌶️ SPICY</span>}
          </div>
        </div>

        {/* Right: Interactive Control Group */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto justify-end">
          {/* Customization Icon Button */}
          <button
            type="button"
            onClick={() => onCustomize?.(product.id || product._id)}
            className="w-8 sm:w-11 h-8 sm:h-11 bg-[#110D0B]/80 backdrop-blur-sm border border-[#2A2421] rounded-full flex items-center justify-center text-white/70 hover:text-white hover:border-[#F07D14] hover:scale-105 sm:hover:scale-110 hover:rotate-90 transition-all duration-300"
            aria-label="Customize"
            title="Customize"
          >
            <Settings size={12} className="sm:size-16" />
          </button>

          {/* View Details Button */}
          <button
            type="button"
            onClick={() => navigate(`/product/${product.id || product._id}`)}
            className="w-8 sm:w-11 h-8 sm:h-11 bg-[#110D0B]/80 backdrop-blur-sm border border-[#2A2421] rounded-full flex items-center justify-center text-white/70 hover:text-white hover:border-[#F07D14] hover:scale-105 sm:hover:scale-110 transition-all duration-300"
            aria-label="View Details"
            title="View Details"
          >
            <Eye size={12} className="sm:size-16" />
          </button>

          {/* Primary 'Add' CTA Button */}
          <button
            type="button"
            onClick={() => onQuickAdd?.(product.id || product._id)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-extrabold text-xs sm:text-sm hover:shadow-md sm:hover:shadow-lg transition-all duration-300"
            aria-label="Add to Cart"
          >
            <Plus size={12} className="sm:size-16" />
            <span className="whitespace-nowrap">Add</span>
          </button>
        </div>
      </div>
    </article>
  );
}