import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import { useMenu } from '../hooks/useMenu';
import ProductCard from './ProductCard';

export default function Menu({ onCustomize, onQuickAdd }) {
  const { products } = useMenu();
  const [filter, setFilter] = useState('all');
  const headingRef = useRef(null);
  const toolbarRef = useRef(null);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'burgers', label: 'Burgers' },
    { id: 'sides', label: 'Sides' },
    { id: 'drinks', label: 'Drinks' },
    { id: 'combos', label: 'Combos' },
  ];

  const visibleProducts = products.filter(
    (p) => filter === 'all' || p.category === filter
  );

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headingRef.current?.children || [], {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: headingRef.current,
          start: 'top 85%',
        },
      });
    }, headingRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="w-[min(1180px,88vw)] mx-auto mb-[90px] relative" id="menu">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F07D14]/5 rounded-full blur-[120px] pointer-events-none" />

      <div ref={headingRef} className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-7 mb-10 relative z-10">
        <div className="flex flex-col gap-3">
          <p className="text-[#F07D14] text-[0.78rem] font-black uppercase tracking-wider mb-0 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#F07D14]" />
            Build your tray
          </p>
          <h2 className="font-fredoka text-3xl sm:text-4xl lg:text-5xl leading-[0.95] max-w-[720px] text-white">
            Order burgers, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F07D14] to-[#FFB366]">sides,</span> and sips
          </h2>
        </div>
        <div className="flex items-center gap-3 bg-[#1A1411] border border-[#2A1F1A] rounded-full px-5 py-2.5">
          <span className="text-[#A39791] text-sm">Showing</span>
          <span className="text-white font-black text-sm">{visibleProducts.length}</span>
          <span className="text-[#A39791] text-sm">items</span>
        </div>
      </div>

      <div className="grid gap-[22px] relative z-10">
        <div ref={toolbarRef} className="flex flex-wrap gap-3">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`group relative min-h-[46px] px-6 rounded-full border-2 font-black cursor-pointer transition-all duration-300 ${
                filter === f.id
                  ? 'border-[#F07D14] text-white bg-[#F07D14] shadow-[0_0_20px_rgba(240,125,20,0.4)]'
                  : 'border-[#2A1F1A] bg-[#16100D] text-[#A39791] hover:border-[#F07D14]/60 hover:text-white hover:bg-[#1E1612]'
              }`}
            >
              {filter === f.id && (
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[22px]">
          {visibleProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onCustomize={onCustomize}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </div>

        {visibleProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#A39791] text-lg">No items found in this category</p>
          </div>
        )}
      </div>
    </section>
  );
}