import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export default function Builder() {
  const ref = useRef(null);
  const burgersRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current.children, {
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
        },
      });

      if (burgersRef.current) {
        gsap.to(burgersRef.current.children, {
          y: -18,
          duration: 3.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 0.35,
        });
      }
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] items-center gap-10 w-[min(1180px,88vw)] mx-auto mb-[90px]" id="builder">
      <div className="min-h-[360px] grid place-items-center overflow-hidden rounded-lg border border-white/5" style={{
        background: 'linear-gradient(145deg, rgba(240,125,20,0.15), rgba(10,6,4,0.95)), repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 10px, transparent 10px 20px)',
      }}>
        <div className="relative w-[320px] h-[250px] perspective-[700px] max-md:scale-75">
          <div className="absolute left-[38px] right-[38px] bottom-[34px] h-[38px] rounded-full bg-[rgba(10,6,4,0.4)] blur-lg" />
          <div ref={burgersRef} className="relative w-full h-full">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute w-[145px] h-[92px] rounded-[50%_50%_18px_18px] shadow-[0_20px_36px_rgba(0,0,0,0.3)]"
                style={{
                  background: 'linear-gradient(#f0a945 0 28%, #69b647 29% 38%, #ffcf35 39% 48%, #5b2b1c 49% 68%, #d6822b 69%)',
                  transformStyle: 'preserve-3d',
                  left: i === 0 ? '20px' : i === 1 ? '96px' : 'auto',
                  right: i === 2 ? '14px' : 'auto',
                  top: i === 0 ? '88px' : i === 1 ? '54px' : '98px',
                  transform: i === 0 ? 'rotate(-12deg)' : i === 2 ? 'rotate(13deg)' : 'rotate(0deg)',
                  animationDelay: i === 1 ? '350ms' : i === 2 ? '700ms' : '0ms',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div ref={ref}>
        <p className="text-[#F07D14] text-[0.78rem] font-black uppercase tracking-wider mb-2.5">
          Make it yours
        </p>
        <h2 className="font-fredoka text-3xl sm:text-4xl lg:text-5xl leading-[0.95] text-white">
          Choose spice, add extra cheese, double the patty
        </h2>
        <p className="max-w-[520px] mt-4 text-[#A39791] leading-relaxed">
          Go mellow or hot, keep it extra cheesy, and finish each stack with
          the sauce notes your tray deserves.
        </p>
      </div>
    </section>
  );
}