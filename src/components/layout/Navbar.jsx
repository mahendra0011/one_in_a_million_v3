import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, ChevronDown, User, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import NotificationBell from '../NotificationBell';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/offers', label: 'Offers', badge: '🔥' },
  { href: '/reservation', label: 'Reserve' },
  {
    label: 'More', children: [
      { href: '/about', label: 'About Us' },
      { href: '/reviews', label: 'Reviews' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact' },
    ]
  },
];

export default function Navbar({ cartCount = 0, onOpenCart }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useSelector(s => s.auth);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href) => pathname === href;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#0A0604]/95 backdrop-blur-md shadow-lg shadow-black/30' : 'bg-[#0A0604]/90 backdrop-blur-sm'
    }`}>
      {/* Top bar */}
      <div className="bg-[#F07D14] text-white text-center py-1.5 text-xs font-semibold tracking-wide">
        🍔 Fresh burgers made to order — fast delivery across the city! &nbsp;·&nbsp;
        <a href="tel:+919967412613" className="underline underline-offset-2">+91 9967 412613</a>
      </div>

      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#F07D14] flex items-center justify-center text-white text-lg font-black shadow-sm">
            B
          </div>
          <span className="font-fredoka text-xl font-bold text-white leading-none">
            Bun in a <span className="text-[#F07D14]">Million</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            if (link.children) {
              return (
                <li key="more" className="relative">
                  <button
                    onClick={() => setMoreOpen(o => !o)}
                    onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-[#A39791] hover:text-[#F07D14] hover:bg-[#16100D] transition-colors"
                  >
                    {link.label}
                    <ChevronDown size={14} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {moreOpen && (
                      <motion.ul
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-1 w-44 bg-[#16100D] rounded-xl shadow-xl shadow-black/40 border border-white/10 py-1.5 overflow-hidden"
                      >
                        {link.children.map(child => (
                          <li key={child.href}>
                            <Link
                              to={child.href}
                              className="block px-4 py-2.5 text-sm font-semibold text-[#A39791] hover:text-[#F07D14] hover:bg-[#1A1310] transition-colors"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              );
            }
            return (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive(link.href)
                      ? 'text-[#F07D14] bg-[#16100D]'
                      : 'text-[#A39791] hover:text-[#F07D14] hover:bg-[#16100D]'
                  }`}
                >
                  {link.label}
                  {link.badge && <span>{link.badge}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link to="/search" className="p-2 rounded-lg text-[#A39791] hover:text-[#F07D14] hover:bg-[#16100D] transition-colors" title="Search">
            <Search size={20} />
          </Link>
          <NotificationBell />
          {/* Account / Login - role based redirect */}
          {isLoggedIn ? (
            <button
              onClick={() => {
                const role = user?.role;
                if (role === 'admin') navigate('/admin');
                else if (role === 'delivery_boy') navigate('/delivery');
else navigate('/account');
                               }}
                               className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-[#A39791] hover:text-[#F07D14] hover:bg-[#16100D] transition-colors"
                               title="My Account"
                             >
              <User size={18} />
              <span>{user?.name?.split(' ')[0] || 'Account'}</span>
            </button>
          ) : (
<Link
               to="/login"
               className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-[#A39791] hover:text-[#F07D14] hover:bg-[#16100D] transition-colors"
               title="Login / Sign Up"
             >
              <User size={18} />
              <span>Login</span>
            </Link>
          )}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 px-4 py-2 bg-[#F07D14] text-white font-bold rounded-xl hover:bg-[#E86C1B] transition-colors text-sm shadow-sm shadow-[#F07D14]/30"
          >
            <ShoppingCart size={18} />
            <span className="hidden sm:block">Cart</span>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#B83A1B] text-white text-[10px] font-black flex items-center justify-center"
              >
                {cartCount > 9 ? '9+' : cartCount}
              </motion.span>
            )}
          </button>
          {/* Mobile menu toggle */}
          <button onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 rounded-lg text-[#A39791] hover:bg-[#16100D] transition-colors">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#0A0604] border-t border-white/5 shadow-lg shadow-black/30 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map(link => {
                if (link.children) {
                  return link.children.map(child => (
                    <Link key={child.href} to={child.href}
                      className="block px-4 py-2.5 rounded-lg text-sm font-semibold text-[#A39791] hover:text-[#F07D14] hover:bg-[#16100D] transition-colors">
                      {child.label}
                    </Link>
                  ));
                }
                return (
                  <Link key={link.href} to={link.href}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isActive(link.href) ? 'text-[#F07D14] bg-[#16100D]' : 'text-[#A39791] hover:text-[#F07D14] hover:bg-[#16100D]'
                    }`}>
                    {link.label}
                    {link.badge && <span>{link.badge}</span>}
                  </Link>
                );
              })}
              <div className="border-t border-white/5 pt-2 mt-2 flex flex-col gap-2">
<button onClick={() => {
                   const role = user?.role;
                   if (role === 'admin') navigate('/admin');
                   else if (role === 'delivery_boy') navigate('/delivery');
                   else if (isLoggedIn) navigate('/account');
                   else navigate('/login');
                 }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#A39791] hover:bg-[#16100D]">
                  <User size={16} /> My Account
                </button>
                <a href="tel:+919967412613" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#F07D14] hover:bg-[#16100D]">
                  <Phone size={16} /> Call Us
                </a>
                <Link to="/admin" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#8E827B] hover:bg-[#16100D] border border-white/10">
                  🔐 Admin Panel
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}