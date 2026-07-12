import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import { Clock, Flame, Percent } from 'lucide-react';

const items = [
  { icon: Clock, label: '12-18 min', desc: 'Hot pickup window' },
  { icon: Flame, label: 'Fresh', desc: 'Grilled after order' },
  { icon: Percent, label: '10% off', desc: 'Use MILLION10' },
];

export default function QuickOrder() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current.children, {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
        },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      className="relative z-5 grid grid-cols-1 sm:grid-cols-3 gap-px w-[min(980px,88vw)] mx-auto -mt-[54px] mb-[70px] overflow-hidden border border-white/10 rounded-lg bg-white/10 shadow-xl"
    >
      {items.map((item) => (
        <article key={item.label} className="p-5 sm:p-6 bg-[#1A1310]">
          <div className="flex items-center gap-2">
            <item.icon size={18} className="text-[#F07D14]" />
            <span className="block text-[#F07D14] font-black">{item.label}</span>
          </div>
          <strong className="block mt-1.5 text-white">{item.desc}</strong>
        </article>
      ))}
    </div>
  );
}