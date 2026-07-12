export default function MobileNav({ open, onClose }) {
  return (
    <div
      className={`fixed top-[72px] left-0 right-0 z-40 bg-[#0A0604]/98 border-b border-white/5 backdrop-blur-lg transition-all duration-200 ${
        open
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}
      data-mobile-nav
      aria-hidden={!open}
    >
      <nav className="grid gap-0 max-w-[1180px] mx-auto px-4 py-1.5">
        {['Menu', 'Deals', 'Gallery', 'Checkout'].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            className="py-3.5 px-2 font-extrabold text-[#A39791] border-b border-white/5 no-underline last:border-b-0 hover:bg-[#F07D14]/10 hover:text-white transition-colors"
            onClick={onClose}
          >
            {item}
          </a>
        ))}
      </nav>
    </div>
  );
}