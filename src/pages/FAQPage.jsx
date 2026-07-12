import SEOHead from '../components/SEOHead';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, HelpCircle, MessageCircle, Phone, Mail } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    category: 'Ordering & Delivery',
    icon: '🛵',
    q: 'What are your delivery hours?',
    a: 'We deliver from 11:00 AM to 11:00 PM, all week long. Orders placed within this window will be delivered as scheduled.',
  },
  {
    category: 'Menu & Options',
    icon: '🍔',
    q: 'Do you offer vegetarian options?',
    a: 'Yes! We have a wide range of vegetarian burgers, sides, and drinks. Look for the "Veg Only" filter on our menu page.',
  },
  {
    category: 'Order Tracking',
    icon: '📍',
    q: 'How can I track my order?',
    a: 'Once your order is confirmed, you will receive a tracking link via SMS and email. You can also track it from the Account page.',
  },
  {
    category: 'Payments',
    icon: '💳',
    q: 'What payment methods do you accept?',
    a: 'We accept credit/debit cards, PayPal, Stripe, Apple Pay, Google Pay, and Cash on Delivery.',
  },
  {
    category: 'Orders',
    icon: '📝',
    q: 'How do I cancel or modify my order?',
    a: 'You can modify or cancel your order within 5 minutes of placing it. Please call us at +91 9967412613 for assistance.',
  },
  {
    category: 'Rewards',
    icon: '⭐',
    q: 'Do you have a loyalty program?',
    a: 'Yes! Earn 1 point for every ₹10 spent. Redeem points for free burgers, sides, and exclusive discounts.',
  },
];

export default function FAQPage() {
  const containerRef = useRef(null);
  const headingRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headingRef.current?.children || [], {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      });

      gsap.from('.faq-item', {
        y: 50,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: listRef.current,
          start: 'top 85%',
        },
      });

      gsap.from('.faq-icon', {
        scale: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: listRef.current,
          start: 'top 85%',
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0604]" ref={containerRef}>
      <SEOHead
        title="FAQ"
        description="Frequently asked questions about ordering, delivery, payment, and more at One in a Million."
        url="/faq"
      />
            {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#F07D14] via-[#E86C1B] to-[#B83A1B] text-white py-24 overflow-hidden">
        {/* Animated blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" ref={headingRef}>
          <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-5 py-2.5 rounded-full text-sm font-black mb-6 shadow-lg">
            <HelpCircle size={16} className="fill-white" />
            <span>SUPPORT</span>
          </span>
          <h1 className="font-fredoka text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl leading-relaxed">
            Find quick answers to common questions about ordering, delivery, payments, and more.
          </p>

          {/* Quick contact badges */}
          <div className="flex flex-wrap gap-3 mt-8">
            <a href="tel:+919967412613" className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-full text-sm font-bold hover:bg-white/25 transition-all">
              <Phone size={14} />
              Call Us
            </a>
            <a href="/contact" className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-full text-sm font-bold hover:bg-white/25 transition-all">
              <MessageCircle size={14} />
              Send Message
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        {/* FAQ Items */}
        <div ref={listRef} className="space-y-4">
          {faqs.map((item, i) => (
            <details
              key={i}
              className="faq-item group relative bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-2xl border border-[#2A1F1A] transition-all duration-500 hover:border-[#F07D14]/60"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F07D14]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <summary className="flex items-center justify-between p-6 cursor-pointer list-none relative z-10">
                <div className="flex items-center gap-4 flex-1">
                  <span className="faq-icon text-3xl flex-shrink-0">{item.icon}</span>
                  <div className="flex-1">
                    <span className="inline-block text-[10px] font-black text-[#F07D14] uppercase tracking-wider mb-1">{item.category}</span>
                    <h3 className="font-fredoka font-bold text-white text-lg">{item.q}</h3>
                  </div>
                </div>
                <span className="ml-4 p-2 rounded-full bg-[#F07D14]/15 text-[#F07D14] group-open:rotate-180 transition-transform duration-300 flex-shrink-0">
                  <ChevronDown size={20} />
                </span>
              </summary>
              <div className="px-6 pb-6 text-[#C4B5AB] leading-relaxed relative z-10 pl-[4.5rem]">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 relative bg-gradient-to-br from-[#1E1612] via-[#1A1310] to-[#16100D] rounded-3xl p-8 sm:p-10 text-center border-2 border-[#F07D14]/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#F07D14]/20 via-transparent to-[#F07D14]/20 blur-xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#F07D14] to-[#E86C1B] rounded-full mb-6 shadow-[0_8px_30px_rgba(240,125,20,0.5)]">
              <MessageCircle size={32} className="text-white" />
            </div>
            <h3 className="font-fredoka text-3xl sm:text-4xl font-black text-white mb-3">Still have questions?</h3>
            <p className="text-[#C4B5AB] mb-8 max-w-lg mx-auto">
              Can't find the answer you're looking for? Our support team is here to help you with any questions or concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-black text-lg shadow-[0_16px_40px_rgba(240,125,20,0.45)] hover:shadow-[0_20px_50px_rgba(240,125,20,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                <Mail size={20} className="relative z-10" />
                <span className="relative z-10">Contact Us</span>
              </a>
              <a
                href="tel:+919967412613"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 border-2 border-white/20 text-white font-black text-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300"
              >
                <Phone size={20} />
                <span>Call Now</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
