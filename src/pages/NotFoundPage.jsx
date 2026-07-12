import SEOHead from '../components/SEOHead';
import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Home, Search, ShoppingBag } from 'lucide-react';

export default function NotFoundPage() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current.children, {
        y: 40, opacity: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out',
      });
      gsap.to('.burger-404', {
        y: -20, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0604] flex items-center justify-center p-4">
      <SEOHead
        title="Page Not Found"
        description="This page doesn't exist. Head back to One in a Million."
        noindex={true}
      />
            <div ref={ref} className="text-center max-w-lg mx-auto">
        {/* Floating burger */}
        <div className="burger-404 text-8xl mb-6 select-none">🍔</div>

        {/* 404 */}
        <div className="font-fredoka text-[10rem] leading-none font-bold text-[#F07D14]/15 select-none mb-0">
          404
        </div>

        {/* Message */}
        <h1 className="font-fredoka text-3xl font-bold text-white mb-3 -mt-4">
          This page went missing!
        </h1>
        <p className="text-[#A39791] mb-8 leading-relaxed">
          Looks like this page escaped the bun. Don't worry — our burgers are still here, even if this page isn't.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <Home size={18} />
            Back to Home
          </Link>
          <Link
            to="/menu"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1A1310] text-white font-bold rounded-xl border border-white/10 shadow-sm hover:border-[#F07D14]/40 hover:-translate-y-0.5 transition-all"
          >
            <ShoppingBag size={18} />
            See Our Menu
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1A1310] text-white font-bold rounded-xl border border-white/10 shadow-sm hover:border-[#F07D14]/40 hover:-translate-y-0.5 transition-all"
          >
            <Search size={18} />
            Search
          </Link>
        </div>

        {/* Popular links */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-sm font-semibold text-[#8E827B] mb-4">Popular Pages</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { to: '/offers', label: '🎉 Deals & Offers' },
              { to: '/reservation', label: '📅 Reserve a Table' },
              { to: '/about', label: '👨‍🍳 Our Story' },
              { to: '/contact', label: '📞 Contact Us' },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="px-4 py-2 rounded-full bg-[#1A1310] text-[#A39791] text-sm font-semibold border border-white/10 hover:border-[#F07D14]/40 hover:text-[#F07D14] transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}