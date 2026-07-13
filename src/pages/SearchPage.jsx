import SEOHead from '../components/SEOHead';
import { fetchWithTimeout } from '../lib/utils';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ShoppingBag, Settings2, Flame, Leaf, Eye, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenu } from '../hooks/useMenu';
import { money } from '../lib/utils';

const SUGGESTIONS_KEY = 'bim_search_suggestions';
const MAX_HISTORY = 6;

function getSearchHistory() {
  try {
    const saved = localStorage.getItem(SUGGESTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveSearchHistory(history) {
  try {
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {}
}

export default function SearchPage({ onAddToCart, onCustomize }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [history, setHistory] = useState(getSearchHistory);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

// Save search history when user performs a search
  useEffect(() => {
    if (debouncedQuery) {
      const newHistory = [debouncedQuery, ...history.filter(h => h !== debouncedQuery)].slice(0, MAX_HISTORY);
      queueMicrotask(() => { setHistory(newHistory); saveSearchHistory(newHistory); });
    }
  }, [debouncedQuery, history]);

  // Fetch search suggestions from backend (categories + popular items)
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    if (!query) {
      Promise.all([
        fetchWithTimeout('/api/menu/categories').then(r => r.ok ? r.json() : { categories: [] }),
      ]).then(([catData]) => {
        setSuggestions([...(catData.categories || []), ...history]);
      }).catch(() => setSuggestions(history));
    }
  }, [query, history]);

  // Backend-driven search
  const { products, loading } = useMenu(debouncedQuery ? { search: debouncedQuery } : {});
  const results = debouncedQuery ? products : [];

  // Clear all history
  const clearHistory = () => {
    setHistory([]);
    saveSearchHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#0A0604]">
      <SEOHead
        title="Search"
        description="Search our menu, deals, and more at One in a Million."
        url="/search"
      />
            <section className="bg-gradient-to-r from-[#0A0604] to-[#0E0907] text-white py-14 border-b border-white/5">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-fredoka text-5xl font-bold mb-6 text-white">Search Menu</h1>
          <div className="relative">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8E827B]" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search burgers, drinks, combos..."
              className="w-full pl-14 pr-12 py-4 rounded-2xl text-white bg-[#1A1310] text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#F07D14] shadow-xl border border-white/10 placeholder:text-[#8E827B]"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E827B] hover:text-[#A39791]">
                <X size={18} />
              </button>
            )}
          </div>

          {/* Suggestions - shows history + categories */}
          {!query && (
            <div className="flex flex-col items-center gap-2 mt-5">
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.slice(0, 7).map((s, i) => {
                  const isHistory = history.includes(s);
                  return (
                    <button key={`${s}-${i}`} onClick={() => setQuery(s)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-colors border ${
                        isHistory 
                          ? 'bg-[#F07D14]/15 text-[#F07D14] border-[#F07D14]/30' 
                          : 'bg-[#1A1310] text-[#A39791] border-white/10 hover:border-[#F07D14]/40'
                      }`}>
                      {isHistory && <Clock size={12} className="inline mr-1" />}
                      {s}
                    </button>
                  );
                })}
              </div>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-[#8E827B] hover:text-[#A39791] underline mt-2">
                  Clear Search History
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {!query ? (
          <div className="text-center py-16 text-[#8E827B]">
            <Search size={48} className="mx-auto mb-4 opacity-30 text-[#8E827B]" />
            <p className="font-semibold text-lg text-[#A39791]">Start typing to search</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">😕</p>
            <p className="text-[#A39791] font-semibold text-lg mb-2">No results for "{query}"</p>
            <p className="text-[#8E827B] text-sm">Try searching for "burger", "chicken", or "combo"</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#A39791] font-semibold mb-6">
              {results.length} result{results.length !== 1 ? 's' : ''} for "<span className="text-white">{query}</span>"
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {results.map((product, i) => (
                  <motion.div key={product.id}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-[#1A1310] rounded-2xl overflow-hidden shadow-lg border border-white/5 hover:shadow-[#F07D14]/10 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col"
                  >
                    <div className="relative overflow-hidden">
                      <img src={product.image} alt={product.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
        />
                      {product.badge && (
                        <span className="absolute top-3 left-3 bg-[#B83A1B] text-white text-xs font-bold px-2.5 py-1 rounded-full">{product.badge}</span>
                      )}
                      <div className="absolute top-3 right-3 flex flex-col gap-1">
                        {(product.veg || product.subcat === 'veg') && (
                          <span className="bg-green-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><Leaf size={9} /> VEG</span>
                        )}
                        {product.spicy && (
                          <span className="bg-[#B83A1B] text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><Flame size={9} /> SPICY</span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-fredoka text-base font-bold text-white mb-1">{product.name}</h3>
                      <p className="text-xs text-[#A39791] leading-relaxed mb-3 flex-1 line-clamp-2">{product.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-fredoka text-xl font-bold text-[#F07D14]">{money(product.price)}</span>
                        <div className="flex gap-2">
                          <button onClick={() => navigate(`/product/${product.id || product._id}`)}
                            className="p-2 rounded-xl border border-white/10 text-[#A39791] hover:border-[#F07D14]/40 hover:text-[#F07D14] transition-all"
                            title="View Details">
                            <Eye size={16} />
                          </button>
                          {product.category === 'burgers' && onCustomize && (
                            <button onClick={() => onCustomize(product.id)}
                              className="p-2 rounded-xl border border-white/10 text-[#A39791] hover:border-[#F07D14]/40 hover:text-[#F07D14] transition-all">
                              <Settings2 size={16} />
                            </button>
                          )}
                          <button onClick={() => onAddToCart(product.id)}
                            className="flex items-center gap-1.5 bg-[#F07D14] text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-[#E86C1B] transition-colors">
                            <ShoppingBag size={14} /> Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>
    </div>
  );
}