import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import { money } from '../hooks/useCart';

export default function Checkout({ cart, coupon, fulfillment, totals, setCoupon, setFulfillment, onSubmitOrder }) {
  const [couponInput, setCouponInput] = useState(coupon);
  const [couponMsg, setCouponMsg] = useState(coupon ? `${coupon} applied.` : '');
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current.children, {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
        },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  // Step 18 — coupon validation has moved to CartDrawer via /api/coupons/validate.
  // This Checkout component is legacy/unused; left here for reference only.
  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCoupon(''); setCouponMsg('Coupon removed.'); return; }
    setCouponMsg('Please apply coupons from the cart drawer.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cart.length) return;
    const result = await onSubmitOrder(e.target);
    if (result) {
      setCouponMsg('');
      setCouponInput('');
    }
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 items-start w-[min(1180px,88vw)] mx-auto mb-[90px] pb-[70px]" id="checkout">
      <div ref={ref}>
        <p className="text-[#F07D14] text-[0.78rem] font-black uppercase tracking-wider mb-2.5">
          Ready when you are
        </p>
        <h2 className="font-fredoka text-3xl sm:text-4xl lg:text-5xl leading-[0.95] text-white">Checkout</h2>
          <p className="mt-4 text-[#A39791] leading-relaxed">
            Add delivery or pickup details and send a clean kitchen ticket for
            the whole tray.
          </p>
          {cart.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-[#F07D14]/10 text-[#F07D14] font-black">
              Cart: {cart.length} items · {money(totals.total)}
            </div>
          )}
      </div>

      <form className="grid gap-4 p-[22px] border border-white/5 rounded-lg bg-[#1A1310] shadow-lg" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Fulfillment type">
          <button
            type="button"
            className={`min-h-[42px] rounded-lg border font-black cursor-pointer transition-all ${
              fulfillment === 'delivery'
                ? 'border-[#F07D14] text-white bg-[#F07D14]'
                : 'border-white/10 bg-[#16100D] text-[#A39791] hover:border-[#F07D14]/40'
            }`}
            onClick={() => setFulfillment('delivery')}
          >
            Delivery
          </button>
          <button
            type="button"
            className={`min-h-[42px] rounded-lg border font-black cursor-pointer transition-all ${
              fulfillment === 'pickup'
                ? 'border-[#F07D14] text-white bg-[#F07D14]'
                : 'border-white/10 bg-[#16100D] text-[#A39791] hover:border-[#F07D14]/40'
            }`}
            onClick={() => setFulfillment('pickup')}
          >
            Pickup
          </button>
        </div>

        <label className="grid gap-[7px] text-[#A39791] text-sm font-black">
          Name
          <input name="name" autoComplete="name" required placeholder="Your name"
            className="w-full min-h-[44px] px-3.5 rounded-lg border border-white/10 bg-[#16100D] text-white placeholder:text-[#8E827B] outline-0 focus:border-[#F07D14] focus:shadow-[0_0_0_3px_rgba(240,125,20,0.14)]" />
        </label>
        <label className="grid gap-[7px] text-[#A39791] text-sm font-black">
          Phone
          <input name="phone" inputMode="tel" autoComplete="tel" required placeholder="10 digit mobile number"
            className="w-full min-h-[44px] px-3.5 rounded-lg border border-white/10 bg-[#16100D] text-white placeholder:text-[#8E827B] outline-0 focus:border-[#F07D14] focus:shadow-[0_0_0_3px_rgba(240,125,20,0.14)]" />
        </label>
        {fulfillment === 'delivery' && (
          <label className="grid gap-[7px] text-[#A39791] text-sm font-black">
            Address
            <textarea name="address" rows="3" required placeholder="Flat, street, landmark"
              className="w-full min-h-[74px] px-3.5 py-3 rounded-lg border border-white/10 bg-[#16100D] text-white placeholder:text-[#8E827B] outline-0 resize-y focus:border-[#F07D14] focus:shadow-[0_0_0_3px_rgba(240,125,20,0.14)]" />
          </label>
        )}
        <label className="grid gap-[7px] text-[#A39791] text-sm font-black">
          Order notes
          <textarea name="notes" rows="2" placeholder="No onion, extra napkins, etc."
            className="w-full min-h-[74px] px-3.5 py-3 rounded-lg border border-white/10 bg-[#16100D] text-white placeholder:text-[#8E827B] outline-0 resize-y focus:border-[#F07D14] focus:shadow-[0_0_0_3px_rgba(240,125,20,0.14)]" />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
            placeholder="Coupon code"
            aria-label="Coupon code"
            className="w-full min-h-[44px] px-3.5 rounded-lg border border-white/10 bg-[#16100D] text-white placeholder:text-[#8E827B] outline-0 focus:border-[#F07D14] focus:shadow-[0_0_0_3px_rgba(240,125,20,0.14)]" />
          <button type="button" onClick={applyCoupon}
            className="min-h-[44px] min-w-[96px] px-4 rounded-lg border border-white/10 bg-[#16100D] text-[#A39791] font-black cursor-pointer hover:border-[#F07D14]/40 hover:text-[#F07D14] hover:bg-[#16100D] transition-all">
            Apply
          </button>
        </div>
        <p className="min-h-[20px] -mt-2 text-[#F07D14] text-sm font-black" aria-live="polite">{couponMsg}</p>

        <button type="submit"
          className="inline-flex items-center justify-center min-h-[44px] min-w-[150px] px-5 rounded-lg text-white bg-[#F07D14] font-black shadow-[0_16px_32px_rgba(240,125,20,0.3)] border-0 cursor-pointer hover:bg-[#E86C1B] hover:-translate-y-[1px] transition-all">
          Place order
        </button>
      </form>
    </section>
  );
}