import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const FOOTER_LINKS = {
  'Quick Links': [
    { href: '/', label: 'Home' },
    { href: '/menu', label: 'Our Menu' },
    { href: '/offers', label: 'Offers & Deals' },
    { href: '/reservation', label: 'Reserve a Table' },
    { href: '/about', label: 'About Us' },
  ],
  'Customer': [
    { href: '/account', label: 'My Account' },
    { href: '/reviews', label: 'Reviews' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact Us' },
    { href: '/admin', label: '🔐 Admin Panel' },
  ],
};

const SOCIALS = [
  { label: 'Instagram', href: '#', color: 'hover:text-[#F07D14]', svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg> },
  { label: 'Twitter/X', href: '#', color: 'hover:text-[#F07D14]', svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16H20L8.267 4H4z"/><path d="M4 20l6.768-6.768M20 4l-6.768 6.768"/></svg> },
  { label: 'YouTube', href: '#', color: 'hover:text-[#F07D14]', svg: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z"/><path d="m10 15 5-3-5-3z"/></svg> },
];

export default function Footer() {
  return (
    <footer className="bg-[#0A0604] text-[#A39791] border-t border-white/5">
      {/* Main */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#F07D14] flex items-center justify-center text-white font-black text-lg">B</div>
              <span className="font-fredoka text-xl font-bold text-white">Bun in a <span className="text-[#F07D14]">Million</span></span>
            </div>
            <p className="text-sm text-[#8E827B] leading-relaxed mb-5">
              Gourmet burgers made fresh, every single order. Quality ingredients, bold flavors, unforgettable experience.
            </p>
            <div className="flex items-center gap-3">
              {SOCIALS.map(({ href, label, color, svg }) => (
                <a key={label} href={href} aria-label={label}
                  className={`text-[#8E827B] ${color} transition-colors p-2 rounded-lg hover:bg-[#16100D]`}>
                  {svg}
                </a>
              ))}
            </div>
          </div>

          {/* Nav Columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-[#F07D14] font-bold text-sm uppercase tracking-wider mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link to={href} className="text-sm text-[#8E827B] hover:text-[#F07D14] transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div>
            <h4 className="text-[#F07D14] font-bold text-sm uppercase tracking-wider mb-4">Visit Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3 text-[#8E827B]">
                <MapPin size={15} className="text-[#F07D14] mt-0.5 flex-shrink-0" />
                <span>303, Mall Road, Civil Lines,<br />Jabalpur – 482001, MP</span>
              </li>
              <li className="flex items-center gap-3 text-[#8E827B]">
                <Phone size={15} className="text-[#F07D14] flex-shrink-0" />
                <a href="tel:+919967412613" className="hover:text-[#F07D14] transition-colors">+91 9967 412613</a>
              </li>
              <li className="flex items-center gap-3 text-[#8E827B]">
                <Mail size={15} className="text-[#F07D14] flex-shrink-0" />
                <a href="mailto:hello@oneinamillion.com" className="hover:text-[#F07D14] transition-colors">hello@oneinamillion.com</a>
              </li>
              <li className="flex items-start gap-3 text-[#8E827B]">
                <Clock size={15} className="text-[#F07D14] mt-0.5 flex-shrink-0" />
                <span>Mon–Sun: 11:00 AM – 11:00 PM</span>
              </li>
            </ul>

            {/* Coupon pill */}
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F07D14]/10 border border-[#F07D14]/30">
              <span className="text-[#F07D14] text-xs font-bold">🏷 MILLION10</span>
              <span className="text-[#8E827B] text-xs">= 10% off</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8E827B]">
          <span>© {new Date().getFullYear()} One in a Million. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-[#F07D14] cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-[#F07D14] cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-[#F07D14] cursor-pointer transition-colors">Refund Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}