import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  const heroRef = useRef(null);
  const contentRef = useRef(null);
  const burgerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(contentRef.current.children, {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
      });

      if (burgerRef.current) {
        gsap.to(burgerRef.current, {
          rotation: -2,
          duration: 5.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative grid min-h-[670px] overflow-hidden isolate"
      aria-label="One in a Million featured burger"
    >
      {/* Background - Premium Very Dark Brown */}
      <div className="absolute inset-0 w-full h-full object-cover object-[center_58%] scale-[1.03] -z-3 bg-gradient-to-br from-[#0A0604] to-[#0E0907]" />

      {/* Overlay with warm amber glow */}
      <div
        className="absolute inset-0 -z-2"
        style={{
          background: `
            linear-gradient(90deg, rgba(10,6,4,0.85), rgba(10,6,4,0.25) 52%, rgba(10,6,4,0.55)),
            radial-gradient(circle at 82% 32%, rgba(231,122,24,0.45), transparent 26%),
            linear-gradient(180deg, transparent 82%, #0A0604 100%)
          `,
        }}
      />

      {/* Content */}
      <div ref={contentRef} className="self-center w-[min(610px,90vw)] ml-[6vw] pt-[72px] pb-[110px] text-white">
        <p className="text-[#F07D14] text-[0.78rem] font-black uppercase tracking-wider mb-2.5">
          Fast, saucy, made-to-order
        </p>
        <h1 className="font-fredoka text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] max-w-[560px] text-shadow-lg text-white">
          One in a Million
        </h1>
        <p className="max-w-[580px] mt-[22px] text-[#A39791] text-lg leading-relaxed">
          Gourmet burgers stacked with makhani paneer, crispy chicken, melted cheese,
          fresh pickled onions, and house sauces.
        </p>
        <div className="flex flex-wrap gap-3 mt-[30px]">
          <a
            href="#menu"
            className="inline-flex items-center justify-center gap-2 min-w-[150px] min-h-[44px] px-5 rounded-lg text-white bg-[#F07D14] font-black shadow-[0_16px_32px_rgba(240,125,20,0.3)] no-underline hover:bg-[#E86C1B] hover:-translate-y-[1px] transition-all"
          >
            Order burgers
            <ArrowRight size={18} />
          </a>
          <a
            href="#deals"
            className="inline-flex items-center justify-center gap-2 min-w-[140px] min-h-[44px] px-[18px] rounded-lg text-white bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.2)] font-black no-underline hover:bg-[rgba(255,255,255,0.12)] transition-all"
          >
            <Sparkles size={16} />
            View combos
          </a>
        </div>
      </div>

      {/* 3D Burger */}
      <div className="absolute right-[4vw] bottom-[70px] w-[min(430px,42vw)] h-[min(430px,42vw)] grid place-items-center pointer-events-none perspective-[950px] max-md:opacity-80 max-md:right-[-70px] max-md:bottom-[34px]">
        <div
          ref={burgerRef}
          className="relative w-[330px] h-[330px] max-md:w-[clamp(180px,55vw,260px)] max-md:h-[clamp(180px,55vw,260px)] max-md:scale-[0.58]"
          style={{ transformStyle: 'preserve-3d' }}
          data-burger3d
        >
          {/* Shadow */}
          <div className="absolute left-1/2 bottom-[26px] w-[260px] h-16 rounded-full bg-[rgba(10,6,4,0.55)] blur-lg -translate-x-1/2 rotateX-68deg" />

          {/* Stack */}
          <div
            className="absolute inset-0"
            style={{ transformStyle: 'preserve-3d', animation: 'burgerFloat 5.2s ease-in-out infinite' }}
          >
            {/* Bun Top */}
            <span className="absolute left-12 right-12 h-[72px] rounded-full rotateX-68deg shadow-[0_20px_35px_rgba(10,6,4,0.4)] top-[38px] bg-gradient-to-b from-[#f8b751] to-[#b85f1e] before:content-[''] before:absolute before:inset-[9px_0_-15px] before:rounded-full before:blur-[1px] before:bg-[#8f4819]" />
            {/* Lettuce */}
            <span className="absolute left-12 right-12 h-[44px] rotateX-68deg shadow-[0_20px_35px_rgba(10,6,4,0.4)] top-[105px] bg-[#6cc94c] before:content-[''] before:absolute before:inset-[9px_0_-15px] before:rounded-full before:blur-[1px] before:bg-[#3b9b34]" style={{ clipPath: "polygon(0 46%, 8% 26%, 18% 48%, 30% 25%, 40% 50%, 52% 28%, 62% 48%, 73% 25%, 83% 49%, 94% 27%, 100% 48%, 100% 76%, 0 76%)" }} />
            {/* Cheese */}
            <span className="absolute left-12 right-12 h-[36px] rounded-[10px] rotateX-68deg shadow-[0_20px_35px_rgba(10,6,4,0.4)] top-[132px] bg-[#ffd842] before:content-[''] before:absolute before:inset-[9px_0_-15px] before:rounded-[12px] before:blur-[1px] before:bg-[#d99713]" style={{ clipPath: "polygon(3% 16%, 97% 6%, 94% 72%, 72% 64%, 61% 100%, 43% 65%, 27% 88%, 12% 63%, 0 71%)" }} />
            {/* Tomato */}
            <span className="absolute left-12 right-12 h-[32px] rotateX-68deg shadow-[0_20px_35px_rgba(10,6,4,0.4)] top-[160px] bg-[#e73b29] before:content-[''] before:absolute before:inset-[9px_0_-15px] before:rounded-full before:blur-[1px] before:bg-[#a7221d]" />
            {/* Patty */}
            <span className="absolute left-12 right-12 h-[54px] rotateX-68deg shadow-[0_20px_35px_rgba(10,6,4,0.4)] top-[188px] bg-gradient-to-b from-[#70351f] to-[#321814] before:content-[''] before:absolute before:inset-[9px_0_-15px] before:rounded-full before:blur-[1px] before:bg-[#24110f]" />
            {/* Onion */}
            <span className="absolute left-12 right-12 h-[26px] rotateX-68deg shadow-[0_20px_35px_rgba(10,6,4,0.4)] top-[236px] before:content-[''] before:absolute before:inset-[9px_0_-15px] before:rounded-full before:blur-[1px] before:bg-[rgba(97,40,109,0.8)]" style={{ background: "repeating-radial-gradient(ellipse at center, rgba(255,255,255,0.96) 0 7px, rgba(175,90,190,0.9) 8px 10px, transparent 11px 16px)" }} />
            {/* Bun Bottom */}
            <span className="absolute left-12 right-12 h-[50px] rounded-full rotateX-68deg shadow-[0_20px_35px_rgba(10,6,4,0.4)] top-[260px] bg-gradient-to-b from-[#d98731] to-[#8e4719] before:content-[''] before:absolute before:inset-[9px_0_-15px] before:rounded-full before:blur-[1px] before:bg-[#743715]" />
          </div>

          {/* Orbits */}
          <span className="absolute inset-[36px] border border-[rgba(255,255,255,0.5)] rounded-full" style={{ transform: 'rotateX(64deg) rotateZ(24deg)', animation: 'orbitSpin 8s linear infinite' }} />
          <span className="absolute inset-[62px] border border-[rgba(240,125,20,0.65)] rounded-full" style={{ transform: 'rotateX(72deg) rotateZ(-18deg)', animation: 'orbitSpin 10s linear infinite reverse' }} />
        </div>
      </div>
    </section>
  );
}