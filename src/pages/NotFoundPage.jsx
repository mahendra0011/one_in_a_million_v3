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
        y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out',
      });
      gsap.to('.burger-404', {
        y: -15, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0604] flex items-center justify-center p-3 sm:p-4">
      <SEOHead
        title="Page Not Found"
        description="This page doesn't exist. Head back to One in a Million."
        noindex={true}
      />
      <div ref={ref} className="text-center max-w-sm sm:max-w-md mx-auto px-4">
        {/* Floating burger */}
        <div className="burger-404 text-5xl sm:text-6xl lg:text-8xl mb-4 sm:mb-6 select-none">🍔</div>

        {/* 404 */}
        <div className="font-fredoka text-8xl sm:text-9xl lg:text-[10rem] leading-none font-bold text-[#F07D14]/15 select-none mb-0">
          404
        </div>

        {/* Message */}
        <h1 className="font-fredoka text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3 -mt-2 sm:-mt-3 lg:-mt-4">
          This page went missing!
        </h1>
        <p className="text-[#A39791] mb-6 sm:mb-8 text-xs sm:text-sm leading-relaxed">
          Looks like this page escaped the bun. Don't worry — our burgers are still here, even if this page isn't.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-bold text-xs sm:text-sm lg:text-base shadow-md sm:shadow-lg hover:shadow-lg transition-all"
          >
            <Home size={16} className="sm:size-18" />
            Back to Home
          </Link>
          <Link
            to="/menu"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 rounded-xl bg-[#1A1310] text-white font-bold text-xs sm:text-sm lg:text-base border border-white/10 shadow-sm hover:border-[#F07D14]/40 transition-all"
          >
            <ShoppingBag size={16} className="sm:size-18" />
            See Our Menu
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 rounded-xl bg-[#1A1310] text-white font-bold text-xs sm:text-sm lg:text-base border border-white/10 shadow-sm hover:border-[#F07D14]/40 transition-all"
          >
            <Search size={16} className="sm:size-18" />
            Search
          </Link>
        </div>

        {/* Popular links */}
        <div className="mt-8 sm:mt-10 lg:mt-12 pt-6 sm:pt-8 border-t border-white/5">
          <p className="text-xs sm:text-sm font-semibold text-[#8E827B] mb-3 sm:mb-4">Popular Pages</p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center">
            {[
              { to: '/offers', label: '🎁 Deals & Offers' },
              { to: '/reservation', label: '📅 Reserve a Table' },
              { to: '/about', label: '👨‍🍳 Our Story' },
              { to: '/contact', label: '📞 Contact Us' },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#1A1310] text-[#A39791] text-xs sm:text-sm font-semibold border border-white/10 hover:border-[#F07D14]/40 hover:text-[#F07D14] transition-all"
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