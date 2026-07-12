import { useEffect, useRef, Suspense, useState, useCallback, Component } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import gsap from "gsap";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import burgerImg from "../assets/burger-hero.png";

// Error boundary so that WebGL Context Lost doesn't kill the entire page
class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err, info) {
    console.warn('[BurgerHero] WebGL crashed, hiding 3D background:', err.message);
  }
  render() {
    if (this.state.hasError) return null; // silently hide the 3D canvas
    return this.props.children;
  }
}

function ParticleField() {
  const ref = useRef(null);
  const count = 800;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.05;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
  });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.04} color="#ffb347" transparent opacity={0.85} sizeAttenuation />
    </points>
  );
}

function GlowOrb() {
  const ref = useRef(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.3;
  });
  return (
    <mesh ref={ref} position={[0, 0, -2]}>
      <sphereGeometry args={[2.2, 64, 64]} />
      <meshBasicMaterial color="#ff6b1a" transparent opacity={0.18} />
    </mesh>
  );
}

const marqueeKeyframes = `
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
`;

const slides = [
  {
    badge: "Available every day · 11AM–11PM",
    h1: ["BURGERS THAT", "HIT DIFFERENT."],
    sub: "Experience gourmet burgers redefined. Made with 100% premium ingredients, flame-grilled to order, and served in freshly baked brioche buns.",
    cta1: "GRAB A BITE",
    cta1Link: "/menu",
    cta2: "View Menu",
    cta2Link: "/menu",
    img: burgerImg,
    price: "₹199",
    priceLabel: "The Classic",
  },
  {
    badge: null,
    h1: ["STACKED WITH", "FLAVOR"],
    sub: "Dine in with your family. Premium experience, local flavors.",
    cta1: "Book a Table",
    cta1Link: "/reservation",
    cta2: "View Menu",
    cta2Link: "/menu",
    img: burgerImg,
    price: "₹399",
    priceLabel: "The Stack",
  },
  {
    badge: null,
    h1: ["DEALS THAT HIT", "DIFFERENT"],
    sub: "New deals every week — family combos, happy hour discounts. Don't miss out!",
    cta1: "See Offers",
    cta1Link: "/offers",
    cta2: "View Menu",
    cta2Link: "/menu",
    img: burgerImg,
    price: "₹249",
    priceLabel: "Deal of the Week",
  },
];

export default function BurgerHero() {
  const headlineRef = useRef(null);
  const subRef = useRef(null);
  const ctaRef = useRef(null);
  const statsRef = useRef(null);
  const imgRef = useRef(null);
  const priceCardRef = useRef(null);
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);
  const slide = slides[active];

  const goTo = useCallback((idx) => {
    setActive(idx);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setActive((p) => (p + 1) % slides.length), 4000);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => setActive((p) => (p + 1) % slides.length), 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!document.getElementById("hero-keyframes")) {
      const s = document.createElement("style");
      s.id = "hero-keyframes";
      s.textContent = marqueeKeyframes;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      // Text: split each char and animate y + rotateX + opacity — same as original
      if (headlineRef.current) {
        const lines = headlineRef.current.querySelectorAll(".line-inner");
        lines.forEach((line) => {
          const text = line.dataset.text;
          line.innerHTML = text
            .split("")
            .map((c) =>
              c === " "
                ? `<span class="char" style="display:inline-block;width:0.3em"> </span>`
                : `<span class="char" style="display:inline-block">${c}</span>`
            )
            .join("");
        });
        const chars = headlineRef.current.querySelectorAll(".char");
        tl.from(chars, {
          y: 120,
          opacity: 0,
          rotateX: -90,
          duration: 1.1,
          stagger: 0.04,
        });
      }

      // Sub, cta, stats animate in
      tl.from(subRef.current, { y: 30, opacity: 0, duration: 0.8 }, "-=0.6");
      tl.from(ctaRef.current?.children ?? [], { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.4");
      tl.from(statsRef.current?.children ?? [], { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.3");

      // Image: scale 0.6 rotate -15 → scale 1 rotate 0 — same as original framer-motion
      if (imgRef.current) {
        gsap.fromTo(
          imgRef.current,
          { opacity: 0, scale: 0.6, rotate: -15 },
          { opacity: 1, scale: 1, rotate: 0, duration: 1.2, ease: "cubic-bezier(0.22,1,0.36,1)" }
        );
      }

      // Price card fade in with delay — same as original
      if (priceCardRef.current) {
        gsap.from(priceCardRef.current, { y: 20, opacity: 0, duration: 0.6, delay: 1.4, ease: "power2.out" });
      }
    });

    return () => ctx.revert();
  }, [active]);

  const lines = slide.h1;

  return (
    <section style={{ position: "relative", minHeight: "100vh", width: "100%", overflow: "hidden", background: "#0a0604", color: "#fef7e8" }}>
      {/* Three.js background */}
      <WebGLErrorBoundary>
        <div style={{ position: "absolute", inset: 0 }}>
          <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 2]}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.5} />
              <GlowOrb />
              <ParticleField />
            </Suspense>
          </Canvas>
        </div>
      </WebGLErrorBoundary>

      {/* Vignette overlay */}
      <div style={{ pointerEvents: "none", position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)" }} />
      {/* Grain overlay */}
      <div style={{
        pointerEvents: "none", position: "absolute", inset: 0, opacity: 0.08, mixBlendMode: "overlay",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
      }} />

      {/* Main grid */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "grid", minHeight: "calc(100vh - 100px)",
        gridTemplateColumns: "1fr 1fr",
        alignItems: "center", gap: 32,
        padding: "96px 48px 48px"
      }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {slide.badge && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                display: "inline-flex", width: "fit-content", alignItems: "center", gap: 8,
                borderRadius: "9999px", border: "1px solid rgba(255,140,26,0.4)",
                background: "rgba(255,140,26,0.1)", padding: "6px 16px",
                fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "#ff8c1a"
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff8c1a", animation: "pulse 2s infinite" }} />
              {slide.badge}
            </motion.div>
          )}

          {/* Headline */}
          <h1
            ref={headlineRef}
            style={{
              fontFamily: '"Anton", "Impact", sans-serif',
              fontSize: "clamp(3rem, 6vw, 6rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              lineHeight: 0.9,
              letterSpacing: "-0.02em",
              perspective: 800,
              margin: 0,
            }}
          >
            {lines.map((line, i) => (
              <span key={`${active}-${i}`} style={{ display: "block", overflow: "hidden" }}>
                <span
                  className="line-inner"
                  data-text={line}
                  style={{
                    display: "inline-block",
                    color: i === 1 ? "#ff8c1a" : "#fef7e8",
                    fontStyle: i === 1 ? "italic" : "normal",
                  }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p ref={subRef} style={{ maxWidth: 480, fontSize: "1.125rem", color: "rgba(254,247,232,0.7)", lineHeight: 1.6, margin: 0 }}>
            {slide.sub}
          </p>

          <div ref={ctaRef} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
            <Link
              to={slide.cta1Link}
              style={{
                borderRadius: "9999px", padding: "16px 32px", fontSize: "0.875rem", fontWeight: 700,
                letterSpacing: "0.2em", textTransform: "uppercase", background: "#ff8c1a", color: "#0a0604",
                border: "none", cursor: "pointer", textDecoration: "none", display: "inline-block",
                position: "relative", overflow: "hidden", transition: "transform 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {slide.cta1}
            </Link>
            <Link
              to={slide.cta2Link}
              style={{
                borderRadius: "9999px", padding: "16px 32px", fontSize: "0.875rem", fontWeight: 700,
                letterSpacing: "0.2em", textTransform: "uppercase", border: "1px solid rgba(254,247,232,0.3)",
                color: "#fef7e8", background: "transparent", cursor: "pointer", textDecoration: "none",
                display: "inline-block", transition: "border-color 0.2s, color 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#ff8c1a"; e.currentTarget.style.color = "#ff8c1a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(254,247,232,0.3)"; e.currentTarget.style.color = "#fef7e8"; }}
            >
              {slide.cta2}
            </Link>
          </div>

          <div ref={statsRef} style={{ display: "flex", gap: 32, paddingTop: 16 }}>
            <Stat value="500K+" label="Burgers Flipped" />
            <Stat value="4.9★" label="Avg Rating" />
            <Stat value="24/7" label="Delivery" />
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ position: "relative", display: "flex", height: 640, alignItems: "center", justifyContent: "center" }}>
          {/* Rotating circle text */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ position: "absolute", right: 24, top: 48, zIndex: 20 }}
          >
            <svg viewBox="0 0 120 120" style={{ width: 128, height: 128 }}>
              <defs>
                <path id="circ" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
              </defs>
              <text style={{ fill: "#ff8c1a", fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.3em" }}>
                <textPath href="#circ">· Fresh Daily · Flame Grilled · Hand Pressed</textPath>
              </text>
            </svg>
          </motion.div>

          {/* Glow blur behind image */}
          <div style={{ position: "absolute", width: "80%", height: "80%", borderRadius: "50%", background: "rgba(255,140,26,0.3)", filter: "blur(80px)" }} />

          {/* Burger image — GSAP animates this on slide change */}
          <img
            ref={imgRef}
            key={active}
            src={slide.img}
            alt="Signature gourmet burger"
            style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 560, filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.6))" }}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />

          {/* Price card */}
          <div
            ref={priceCardRef}
            style={{
              position: "absolute", bottom: 48, left: 24, zIndex: 20,
              borderRadius: 16, border: "1px solid rgba(254,247,232,0.2)",
              background: "rgba(10,6,4,0.7)", padding: "12px 20px",
              backdropFilter: "blur(12px)"
            }}
          >
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(254,247,232,0.6)" }}>{slide.priceLabel}</div>
            <div style={{ fontFamily: '"Anton", "Impact", sans-serif', fontSize: "1.5rem", fontWeight: 900, color: "#ff8c1a" }}>{slide.price}</div>
          </div>
        </div>
      </div>

      {/* Marquee */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
        overflow: "hidden", borderTop: "1px solid rgba(254,247,232,0.1)",
        background: "rgba(10,6,4,0.4)", padding: "12px 0", backdropFilter: "blur(8px)"
      }}>
        <div style={{
          display: "flex", gap: 48, whiteSpace: "nowrap",
          fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.3em", color: "rgba(254,247,232,0.6)",
          animation: "marquee 28s linear infinite"
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 48 }}>
              🔥 Free Delivery Over ₹499
              <span style={{ color: "#ff8c1a" }}>●</span>
              100% Fresh Ingredients
              <span style={{ color: "#ff8c1a" }}>●</span>
              Made to Order
              <span style={{ color: "#ff8c1a" }}>●</span>
            </span>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{
        position: "absolute", bottom: 48, left: "50%", zIndex: 20,
        display: "flex", transform: "translateX(-50%)", alignItems: "center", gap: 12
      }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              borderRadius: "9999px", border: "none", cursor: "pointer",
              transition: "all 0.3s",
              height: i === active ? 12 : 10,
              width: i === active ? 32 : 10,
              background: i === active ? "#ff8c1a" : "rgba(254,247,232,0.3)",
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div style={{ fontFamily: '"Anton", "Impact", sans-serif', fontSize: "1.5rem", fontWeight: 900, color: "#fef7e8" }}>{value}</div>
      <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(254,247,232,0.5)" }}>{label}</div>
    </div>
  );
}
