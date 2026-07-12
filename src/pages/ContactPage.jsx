import SEOHead from '../components/SEOHead';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Phone, MapPin, MessageSquare, Send, Clock, Mail, Globe } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const locations = [
  {
    name: 'Mall Road',
    address: '303, Mall Road, Civil Lines,',
    city: 'Jabalpur, Madhya Pradesh - 482001',
    phone: '9967412613',
    hours: '11:00 AM - 11:00 PM',
    map: 'https://maps.google.com',
  },
  {
    name: 'Wright Town',
    address: 'In Front of Satya Ashoka, Naagal Pavilion, Wright Town',
    city: 'Jabalpur, Madhya Pradesh - 482002',
    phone: '9202291661',
    hours: '11:00 AM - 11:00 PM',
    map: 'https://maps.google.com',
  },
];

export default function ContactPage() {
  const containerRef = useRef(null);
  const headingRef = useRef(null);
  const infoRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headingRef.current?.children || [], {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      });

      gsap.from('.contact-card', {
        y: 60,
        opacity: 0,
        scale: 0.95,
        duration: 0.7,
        stagger: 0.15,
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: infoRef.current,
          start: 'top 85%',
        },
      });

      gsap.from('.form-group', {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.contact-form',
          start: 'top 85%',
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0604]" ref={containerRef}>
      <SEOHead
        title="Contact Us"
        description="Reach out to One in a Million — find our address, phone number, and send us a message."
        url="/contact"
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
            <MessageSquare size={16} className="fill-white" />
            <span>GET IN TOUCH</span>
          </span>
          <h1 className="font-fredoka text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            Contact Us
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl leading-relaxed">
            Have a question or feedback? We'd love to hear from you. Reach out and we'll respond as soon as possible.
          </p>

          {/* Quick contact badges */}
          <div className="flex flex-wrap gap-3 mt-8">
            <a href="tel:+919967412613" className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-full text-sm font-bold hover:bg-white/25 transition-all">
              <Phone size={14} />
              Call Us Now
            </a>
            <a href="mailto:info@oneinamillion.com" className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-full text-sm font-bold hover:bg-white/25 transition-all">
              <Mail size={14} />
              Email Us
            </a>
            <a href="https://wa.me/919967412613" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-full text-sm font-bold hover:bg-white/25 transition-all">
              <Globe size={14} />
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div ref={infoRef} className="space-y-6">
            {locations.map((loc, i) => (
              <div
                key={i}
                className="contact-card group relative bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-2xl p-6 border border-[#2A1F1A] transition-all duration-500 hover:border-[#F07D14]/60 hover:shadow-[0_20px_40px_rgba(240,125,20,0.25)] hover:-translate-y-1"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F07D14]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F07D14]/60 to-transparent" />

                  {/* Location icon */}
                  <div className="inline-flex p-3 rounded-full bg-gradient-to-br from-[#F07D14]/20 to-[#F07D14]/10 text-[#F07D14] mb-4 border border-[#F07D14]/30">
                    <MapPin size={24} />
                  </div>

                  <h3 className="font-fredoka text-xl font-bold text-white mb-2">{loc.name}</h3>

                  <div className="space-y-3 text-sm">
                    {/* Address */}
                    <div>
                      <p className="text-[#C4B5AB] leading-relaxed">
                        {loc.address}<br />
                        {loc.city}
                      </p>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Phone size={16} className="text-[#F07D14]" />
                      </div>
                      <a href={`tel:${loc.phone}`} className="text-white font-semibold hover:text-[#F07D14] transition-colors">
                        {loc.phone}
                      </a>
                    </div>

                    {/* Hours */}
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Clock size={16} className="text-[#F07D14]" />
                      </div>
                      <span className="text-[#A39791]">{loc.hours}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <a
                      href={`https://wa.me/91${loc.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F07D14] text-white font-bold text-sm hover:bg-[#E86C1B] transition-all hover:scale-105 active:scale-95"
                    >
                      <MessageSquare size={16} />
                      WhatsApp
                    </a>
                    <a
                      href={loc.map}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border-2 border-white/20 text-white font-bold text-sm hover:bg-white/10 hover:border-white/40 transition-all"
                    >
                      <MapPin size={16} />
                      Directions
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form + Map */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact Form */}
            <div className="contact-form bg-gradient-to-br from-[#1E1612] via-[#1A1310] to-[#16100D] rounded-3xl p-8 border-2 border-[#F07D14]/30 relative overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#F07D14]/10 via-transparent to-[#F07D14]/10 blur-xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-[#F07D14]/10 border border-[#F07D14]/30 rounded-full px-4 py-1.5 mb-4">
                  <Send size={14} className="text-[#F07D14]" />
                  <span className="text-[#F07D14] text-xs font-black uppercase tracking-wider">Send Message</span>
                </div>
                <h2 className="font-fredoka text-3xl font-bold text-white mb-6">Get in Touch</h2>
                <p className="text-[#A39791] mb-8">Fill out the form below and we'll get back to you within 24 hours.</p>

                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); }}>
                  <div className="form-group grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Full Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="John Doe"
                        className="w-full px-4 py-3.5 rounded-xl bg-[#16100D] border-2 border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] focus:ring-4 focus:ring-[#F07D14]/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Email Address *</label>
                      <input
                        required
                        type="email"
                        placeholder="you@example.com"
                        className="w-full px-4 py-3.5 rounded-xl bg-[#16100D] border-2 border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] focus:ring-4 focus:ring-[#F07D14]/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="block text-sm font-bold text-white mb-2">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3.5 rounded-xl bg-[#16100D] border-2 border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] focus:ring-4 focus:ring-[#F07D14]/20 transition-all"
                    />
                  </div>

                  <div className="form-group">
                    <label className="block text-sm font-bold text-white mb-2">Subject *</label>
                    <input
                      required
                      type="text"
                      placeholder="How can we help you?"
                      className="w-full px-4 py-3.5 rounded-xl bg-[#16100D] border-2 border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] focus:ring-4 focus:ring-[#F07D14]/20 transition-all"
                    />
                  </div>

                  <div className="form-group">
                    <label className="block text-sm font-bold text-white mb-2">Your Message *</label>
                    <textarea
                      required
                      rows="6"
                      placeholder="Tell us what's on your mind..."
                      className="w-full px-4 py-3.5 rounded-xl bg-[#16100D] border-2 border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] focus:ring-4 focus:ring-[#F07D14]/20 transition-all resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-black text-lg shadow-[0_16px_40px_rgba(240,125,20,0.45)] hover:shadow-[0_20px_50px_rgba(240,125,20,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                    <Send size={20} className="relative z-10" />
                    <span className="relative z-10">Send Message</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Map Section */}
            <div className="bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-3xl border-2 border-[#2A1F1A] overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F07D14]/60 to-transparent" />
              <div className="h-80 bg-gradient-to-br from-[#16100D] to-[#1A1310] flex items-center justify-center relative">
                <div className="text-center relative z-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#F07D14] to-[#E86C1B] rounded-full mb-4 shadow-[0_8px_30px_rgba(240,125,20,0.5)]">
                    <MapPin size={32} className="text-white" />
                  </div>
                  <p className="text-white font-bold text-lg mb-2">Visit Our Outlets</p>
                  <p className="text-[#A39791] text-sm max-w-md mx-auto mb-6">
                    We have two convenient locations in Jabalpur to serve you better
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {locations.map((loc, i) => (
                      <a
                        key={i}
                        href={loc.map}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F07D14] text-white font-bold text-sm hover:bg-[#E86C1B] transition-all hover:scale-105"
                      >
                        <MapPin size={14} />
                        {loc.name}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
