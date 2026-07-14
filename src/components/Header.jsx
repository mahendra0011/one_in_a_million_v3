import { ShoppingCart, Menu, X } from 'lucide-react';

export default function Header({ cartCount, onOpenCart, onOpenNav, navOpen, onCloseNav }) {
  return (
    <header className="sticky top-0 z-50 grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-6 px-3 sm:px-[6vw] py-2.5 sm:py-3 bg-[#0A0604]/90 border-b border-white/5 backdrop-blur-lg font-sans">
      <a href="#top" className="inline-flex items-center gap-2 sm:gap-3 min-w-0 no-underline text-inherit">
        <span className="relative w-9 sm:w-[46px] h-9 sm:h-[46px] flex-shrink-0">
          <span className="absolute inset-[8px_4px_3px_4px] bg-[#1A1310] rounded-md -rotate-2 shadow-lg" />
          <span className="absolute top-1 sm:top-[3px] left-2 sm:left-[10px] w-5 sm:w-[28px] h-4 sm:h-[22px] rounded-md sm:rounded-[26px_26px_8px_8px] bg-gradient-to-br from-[#ff8a32] via-[#ff8a32_45%] to-[#1f1e22] z-[2]" />
        </span>
        <span className="truncate">
          <strong className="block font-fredoka text-sm sm:text-lg text-white truncate">One in a Million</strong>
          <small className="block text-[#8E827B] text-[0.6rem] sm:text-[0.72rem] font-extrabold uppercase tracking-wide truncate">burgers made bold</small>
        </span>
      </a>

      <nav className="hidden lg:flex justify-center gap-[10px]" aria-label="Primary navigation">
        {['Menu', 'Deals', 'Gallery', 'Checkout'].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            className="px-3 py-[10px] rounded-full text-[#A39791] text-[0.92rem] font-extrabold no-underline hover:bg-[#F07D14]/10 hover:text-white transition-colors"
          >
            {item}
          </a>
        ))}
      </nav>

      <button
        className="lg:hidden grid place-items-center w-8 sm:w-[42px] h-8 sm:h-[42px] border border-white/10 rounded-lg bg-[#16100D] hover:bg-[#1A1310] transition-colors cursor-pointer text-[#A39791]"
        type="button"
        onClick={navOpen ? onCloseNav : onOpenNav}
        aria-label="Open menu"
      >
        {navOpen ? <X size={18} className="sm:size-20" /> : <Menu size={18} className="sm:size-20" />}
      </button>

      <button
        className="inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-[36px] sm:min-h-[44px] px-2 sm:px-3 py-1.5 sm:py-[7px] rounded-lg text-white bg-[#F07D14] shadow-md sm:shadow-[0_12px_24px_rgba(240,125,20,0.25)] font-black border-0 cursor-pointer hover:bg-[#E86C1B] transition-colors"
        type="button"
        onClick={onOpenCart}
        aria-label="Open cart"
      >
        <ShoppingCart size={18} className="sm:size-22" />
        <span className="hidden sm:inline text-xs sm:text-sm">Cart</span>
        <span className="grid place-items-center min-w-[20px] sm:min-w-[28px] h-5 sm:h-[28px] px-1 sm:px-1.5 rounded-full text-[#0A0604] bg-[#F07D14] text-[10px] sm:text-sm font-black">
          {cartCount}
        </span>
      </button>
    </header>
  );
}