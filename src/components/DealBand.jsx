import { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Sparkles, Tag, TrendingUp } from 'lucide-react';

export default function DealBand({ onAddCombo }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="deals"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(50px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}
      className="relative w-[min(1180px,88vw)] mx-auto mb-[90px] overflow-hidden"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#F07D14]/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#F07D14]/10 rounded-full blur-[80px]" />
      </div>

      {/* Main card */}
      <div className="relative bg-gradient-to-br from-[#1E1612] via-[#1A1310] to-[#16100D] border-2 border-[#F07D14]/30 rounded-[28px] p-8 lg:p-10 shadow-[0_20px_60px_rgba(240,125,20,0.15)]">
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-[#F07D14]/20 via-transparent to-[#F07D14]/20 opacity-50 blur-xl" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-10">
          {/* Left content */}
          <div className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#F07D14]/20 to-[#F07D14]/10 border border-[#F07D14]/40 rounded-full px-4 py-2 mb-5 w-fit">
              <Sparkles size={14} className="text-[#F07D14]" />
              <span className="text-[#F07D14] text-xs font-black uppercase tracking-wider">Deal of the Week</span>
            </div>

            <h2 className="font-fredoka text-3xl sm:text-4xl lg:text-5xl leading-[0.95] text-white mb-4">
              Million Meal Combo
            </h2>

            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-5xl font-fredoka font-black text-[#F07D14]">₹399</span>
              <span className="text-lg text-[#A39791] line-through">₹649</span>
              <span className="inline-flex items-center gap-1 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black px-2.5 py-1 rounded-full">
                <Tag size={10} />
                SAVE 38%
              </span>
            </div>

            <p className="max-w-[520px] text-[#C4B5AB] leading-relaxed mb-6">
              Indulge in our iconic <span className="text-white font-bold">Paneer Makhani Burger</span> paired with golden crispy strips and a refreshing mint cooler — the perfect trio for a hearty meal.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: '🍔', label: 'Burger' },
                { icon: '🍟', label: 'Strips' },
                { icon: '🥤', label: 'Drink' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-[10px] text-[#A39791] font-bold uppercase tracking-wider">{item.label}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onAddCombo}
              className="group relative inline-flex items-center justify-center gap-3 min-w-[180px] min-h-[52px] px-8 rounded-2xl bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-extrabold text-base shadow-[0_16px_40px_rgba(240,125,20,0.45)] border-0 cursor-pointer hover:shadow-[0_20px_50px_rgba(240,125,20,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              <ShoppingBag size={20} />
              Add Combo
              <TrendingUp size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center gap-4 mt-5 text-xs text-[#A39791]">
              <span className="flex items-center gap-1">✓ Free delivery</span>
              <span className="flex items-center gap-1">✓ 30 min promise</span>
              <span className="flex items-center gap-1">✓ Fresh ingredients</span>
            </div>
          </div>

          {/* Right image grid */}
          <div className="grid grid-cols-2 grid-rows-[210px_210px] gap-3 max-md:hidden">
            {[
              { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cdefs%3E%3ClinearGradient id='g1' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f46d22'/%3E%3Cstop offset='100%25' stop-color='%23d94714'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g1)' width='400' height='300'/%3E%3Ctext x='200' y='150' text-anchor='middle' fill='white' font-size='24' font-weight='bold' font-family='sans-serif'%3E%F0%9F%8D%94 Paneer Makhani%3C/text%3E%3C/svg%3E", alt: 'Paneer makhani burger', label: 'Signature' },
              { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cdefs%3E%3ClinearGradient id='g2' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%239adf9d'/%3E%3Cstop offset='100%25' stop-color='%230f7c83'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g2)' width='400' height='300'/%3E%3Ctext x='200' y='150' text-anchor='middle' fill='white' font-size='24' font-weight='bold' font-family='sans-serif'%3E%F0%9F%8D%9F Crispy Strips%3C/text%3E%3C/svg%3E", alt: 'Crispy strips', label: 'Golden' },
              { src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Cdefs%3E%3ClinearGradient id='g3' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23c9e9f6'/%3E%3Cstop offset='100%25' stop-color='%230f7c83'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g3)' width='400' height='300'/%3E%3Ctext x='200' y='150' text-anchor='middle' fill='white' font-size='24' font-weight='bold' font-family='sans-serif'%3E%F0%9F%A5%A4 Mint Cooler%3C/text%3E%3C/svg%3E", alt: 'Mint cooler', label: 'Fresh' },
            ].map((img, idx) => (
              <div key={idx} className={`relative group overflow-hidden rounded-[16px] ${idx === 0 ? 'row-span-2' : ''}`}>
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="absolute bottom-3 left-3 bg-[#F07D14] text-black text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                  {img.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
