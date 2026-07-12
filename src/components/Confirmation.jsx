import { useEffect } from 'react';
import gsap from 'gsap';
import { X, CheckCircle } from 'lucide-react';

export default function Confirmation({ open, onClose, order, totals, savedToServer, moneyFormat }) {
  useEffect(() => {
    if (open) {
      gsap.from('.confirmation-card-content', {
        scale: 0.8,
        opacity: 0,
        duration: 0.4,
        ease: 'back.out(1.7)',
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[111] grid place-items-center p-4">
        <div className="confirmation-card-content relative p-8 rounded-lg bg-[#1A1310] border border-white/5 shadow-2xl shadow-black/40 max-w-[460px] w-full">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 grid place-items-center w-[42px] h-[42px] border border-white/10 rounded-lg bg-[#16100D] cursor-pointer hover:bg-[#1A1310] transition-colors text-[#A39791]"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <CheckCircle size={32} className="text-green-400" />
            <p className="text-[#F07D14] text-[0.78rem] font-black uppercase tracking-wider mb-0">Order placed</p>
          </div>

          <h2 className="font-fredoka text-2xl leading-[0.95] text-white mb-3">
            {order ? `Order ${order.id}` : 'Kitchen has it'}
          </h2>

          <p className="text-[#A39791] leading-relaxed mb-0">
            {order && totals
              ? `Your total is ${moneyFormat ? moneyFormat(totals.total) : `₹${totals.total}`}. ${
                  savedToServer
                    ? 'The order has been saved locally by the Python server.'
                    : 'The order is saved in this browser until the Python server is running.'
                }`
              : 'Your order has been sent to the kitchen!'}
          </p>
        </div>
      </div>
    </>
  );
}