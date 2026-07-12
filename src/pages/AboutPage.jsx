import SEOHead from '../components/SEOHead';
import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Heart, Users, Award, ChefHat, Flame, Clock, MapPin } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function AboutPage() {
  const headingRef = useRef(null);
  const containerRef = useRef(null);
  const statsRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headingRef.current?.children || [], {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      });

      gsap.from(statsRef.current?.children || [], {
        y: 60,
        opacity: 0,
        scale: 0.9,
        duration: 0.8,
        stagger: 0.12,
        ease: 'back.out(1.7)',
        scrollTrigger: {
          trigger: statsRef.current,
          start: 'top 85%',
        },
      });

      gsap.from('.story-image', {
        x: 100,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.story-image',
          start: 'top 80%',
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const timeline = [
    { year: '2018', title: 'The Beginning', desc: 'Started as a small food truck with a big dream', emoji: '🚚' },
    { year: '2019', title: 'First Outlet', desc: 'Opened our first brick-and-mortar store', emoji: '🏪' },
    { year: '2021', title: 'Going Digital', desc: 'Launched online ordering and delivery', emoji: '💻' },
    { year: '2024', title: '50K+ Customers', desc: 'Serving thousands of happy burger lovers', emoji: '🎉' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0604]" ref={containerRef}>
      <SEOHead
        title="About Us"
        description="Learn the story of One in a Million — our passion for bold flavours, award-winning recipes, and serving Jabalpur's best burgers."
        url="/about"
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
            <Heart size={16} className="fill-white" />
            <span>OUR STORY</span>
          </span>
          <h1 className="font-fredoka text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            About One in a Million
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-3xl leading-relaxed">
            A passion for burgers, a commitment to quality, and a dream to make the best burgers in the world. This is our journey.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Story */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#F07D14]/10 border border-[#F07D14]/30 rounded-full px-4 py-1.5 mb-4">
              <Flame size={14} className="text-[#F07D14]" />
              <span className="text-[#F07D14] text-xs font-black uppercase tracking-wider">Our Journey</span>
            </div>
            <h2 className="font-fredoka text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              From a Small Kitchen to Your Hearts
            </h2>
            <p className="text-[#C4B5AB] mb-4 text-base leading-relaxed">
              Founded in 2018, One in a Million started as a small food truck with a big dream — to create the perfect burger. Our founder, Chef Arjun, spent years perfecting recipes and sourcing the finest ingredients from local farms.
            </p>
            <p className="text-[#C4B5AB] text-base leading-relaxed">
              Today, we are proud to serve over 10,000 happy customers every month. Our commitment to freshness, quality, and taste remains unchanged. Every burger is made with premium patties, fresh vegetables, artisanal buns, and our secret sauces.
            </p>
          </div>
          <div className="story-image relative group rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f59e0b'/%3E%3Cstop offset='100%25' stop-color='%23f97316'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='800' height='600'/%3E%3Ctext x='400' y='280' text-anchor='middle' fill='white' font-size='48' font-weight='bold' font-family='Fredoka, Inter, sans-serif'%3E👨‍🍳 Chef's Story%3C/text%3E%3Ctext x='400' y='340' text-anchor='middle' fill='rgba(255,255,255,0.9)' font-size='24' font-family='Inter, sans-serif'%3EPassion • Craft • Love%3C/text%3E%3C/svg%3E"
              alt="Our Story"
              className="w-full h-auto transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[
            { icon: Users, value: '50K+', label: 'Happy Customers', color: 'from-[#F07D14] to-[#E86C1B]' },
            { icon: Award, value: '7+', label: 'Years Experience', color: 'from-[#E86C1B] to-[#B83A1B]' },
            { icon: ChefHat, value: '15+', label: 'Expert Chefs', color: 'from-[#B83A1B] to-[#F07D14]' },
            { icon: Heart, value: '100%', label: 'Fresh Ingredients', color: 'from-[#F07D14] to-[#FFB366]' },
          ].map((stat, i) => (
            <div key={i} className="group relative bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-2xl p-6 shadow-lg border border-[#2A1F1A] text-center transition-all duration-500 hover:border-[#F07D14]/60 hover:shadow-[0_20px_40px_rgba(240,125,20,0.25)] hover:-translate-y-2">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F07D14]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-[#F07D14]/20 to-[#F07D14]/10 text-[#F07D14] mb-4 border border-[#F07D14]/30">
                  <stat.icon size={28} />
                </div>
                <div className="text-4xl font-fredoka font-black text-white mb-2">{stat.value}</div>
                <div className="text-sm text-[#A39791] font-semibold">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="mb-20">
          <h2 className="font-fredoka text-3xl sm:text-4xl font-bold text-white mb-12 text-center">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#F07D14]/60 via-[#E86C1B]/60 to-transparent -translate-x-1/2" />
            <div className="space-y-12">
              {timeline.map((item, i) => (
                <div key={i} className={`flex items-center gap-8 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className="flex-1 text-right">
                    <div className="bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-2xl p-6 border border-[#2A1F1A] shadow-lg hover:border-[#F07D14]/40 transition-all duration-300">
                      <div className="text-3xl mb-2">{item.emoji}</div>
                      <h3 className="font-fredoka text-xl font-bold text-white mb-1">{item.title}</h3>
                      <p className="text-[#A39791] text-sm">{item.desc}</p>
                    </div>
                  </div>
                  <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-[#F07D14] to-[#B83A1B] flex items-center justify-center text-white font-black text-sm shadow-lg flex-shrink-0">
                    {item.year}
                  </div>
                  <div className="flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="relative bg-gradient-to-br from-[#1E1612] via-[#1A1310] to-[#16100D] rounded-3xl p-8 lg:p-12 border border-[#2A1F1A] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#F07D14]/5 via-transparent to-[#F07D14]/5" />
          <h2 className="font-fredoka text-3xl sm:text-4xl font-bold text-white mb-10 text-center relative z-10">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8 relative z-10">
            {[
              { title: 'Quality First', desc: 'We never compromise on quality. From farm to table, every ingredient is carefully selected.', emoji: '💎' },
              { title: 'Customer Delight', desc: 'Your smile is our success. We go the extra mile to ensure every visit is memorable.', emoji: '😊' },
              { title: 'Innovation', desc: 'Constantly experimenting and creating new flavors while keeping our classics timeless.', emoji: '🚀' },
            ].map((value, i) => (
              <div key={i} className="group text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#F07D14]/40 hover:bg-white/10 transition-all duration-300">
                <div className="inline-block text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">{value.emoji}</div>
                <h3 className="font-fredoka text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-[#A39791] leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chef */}
        <div className="mt-16 relative bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-3xl p-8 lg:p-12 border-2 border-[#F07D14]/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#F07D14]/10 via-transparent to-[#F07D14]/10 blur-xl" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[#F07D14] to-[#B83A1B] flex items-center justify-center text-6xl shadow-[0_8px_30px_rgba(240,125,20,0.5)]">
              👨‍🍳
              <div className="absolute inset-0 rounded-full border-4 border-white/20" />
            </div>
            <div>
              <h3 className="font-fredoka text-3xl font-bold text-white mb-2">Meet Chef Arjun</h3>
              <p className="text-[#F07D14] font-semibold mb-4">Founder & Head Chef</p>
              <p className="text-[#C4B5AB] text-lg italic leading-relaxed max-w-2xl">"Every burger tells a story. I want our customers to taste the passion, dedication, and love that goes into every single bite. We're not just making food — we're creating memories."</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
