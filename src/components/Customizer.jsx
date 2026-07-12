import { useState, useEffect } from 'react';
import { X, Minus, Plus, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenu } from '../hooks/useMenu';
import { money } from '../lib/utils';

export default function Customizer({ open, onClose, productId, onAddCustomized }) {
  const { productById, extras, sizeOptions } = useMenu();
  const product = productById(productId);
  const [size, setSize] = useState(sizeOptions?.[0] ?? null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [spice, setSpice] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setSize(sizeOptions?.[0] ?? null);
      setSelectedExtras([]);
      setSpice(3);
      setNotes('');
    }
  }, [open, productId]);

  if (!product) return null;

  const toggleExtra = (extra) => {
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]
    );
  };

  const total = product.price + (size?.price ?? 0) + selectedExtras.reduce((sum, e) => sum + e.price, 0);

  const handleAdd = () => {
    onAddCustomized(productId, { size, extras: selectedExtras, spice, notes });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[92] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed inset-0 z-[93] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
          >
            <div className="bg-[#0A0604] border border-white/5 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-auto pointer-events-auto">
              {/* Product header */}
              <div className="relative">
                <img src={product.image} alt={product.name} className="w-full h-44 object-cover rounded-t-3xl sm:rounded-t-3xl"
          loading="lazy"
          decoding="async"
        />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-t-3xl" />
                <button onClick={onClose} className="absolute top-4 right-4 bg-[#1A1310] border border-white/10 backdrop-blur-sm p-2 rounded-full shadow">
                  <X size={18} className="text-[#A39791]" />
                </button>
                <div className="absolute bottom-4 left-5">
                  <p className="text-xs font-bold text-[#F07D14] uppercase tracking-wider">Customize</p>
                  <h2 className="font-fredoka text-2xl font-bold text-white">{product.name}</h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Size */}
                <div>
                  <p className="text-sm font-bold text-white mb-3">Size / Patty</p>
                  <div className="grid grid-cols-2 gap-3">
                    {sizeOptions.map(s => (
                      <button key={s.id} onClick={() => setSize(s)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          size.id === s.id ? 'border-[#F07D14] bg-[#F07D14]/10 text-[#F07D14]' : 'border-white/10 text-[#A39791] hover:border-[#F07D14]/40'
                        }`}>
                        <span>{s.label}</span>
                        <span>{s.price === 0 ? 'Included' : `+${money(s.price)}`}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extras */}
                <div>
                  <p className="text-sm font-bold text-white mb-3">Add-Ons</p>
                  <div className="grid grid-cols-2 gap-2">
                    {extras.map(extra => {
                      const selected = !!selectedExtras.find(e => e.id === extra.id);
                      return (
                        <button key={extra.id} onClick={() => toggleExtra(extra)}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                            selected ? 'border-[#F07D14] bg-[#F07D14]/10 text-[#F07D14]' : 'border-white/10 text-[#A39791] hover:border-[#F07D14]/40'
                          }`}>
                          <span>{extra.label}</span>
                          <span>+{money(extra.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Spice Level */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-white">Spice Level</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Flame key={i} size={16} className={i < spice ? 'text-[#F07D14] fill-[#F07D14]' : 'text-[#8E827B] fill-[#8E827B]'} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSpice(s => Math.max(1, s - 1))}
                      className="w-8 h-8 rounded-full border-2 border-white/10 flex items-center justify-center hover:border-[#F07D14]/40 text-[#A39791] transition-colors">
                      <Minus size={14} />
                    </button>
                    <div className="flex-1 bg-[#16100D] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#F07D14] to-[#B83A1B] h-full rounded-full transition-all"
                        style={{ width: `${(spice / 5) * 100}%` }}
                      />
                    </div>
                    <button onClick={() => setSpice(s => Math.min(5, s + 1))}
                      className="w-8 h-8 rounded-full border-2 border-white/10 flex items-center justify-center hover:border-[#F07D14]/40 text-[#A39791] transition-colors">
                      <Plus size={14} />
                    </button>
                    <span className="text-sm font-bold text-white w-8 text-center">{spice}/5</span>
                  </div>
                  <p className="text-xs text-[#8E827B] mt-1">
                    {['', 'Mild', 'Medium-mild', 'Medium', 'Hot', '🔥 Extra Hot'][spice]}
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-bold text-white mb-2 block">Special Instructions</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any special requests? (e.g., no onions, extra sauce...)"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] text-sm focus:outline-none focus:border-[#F07D14] resize-none"
                  />
                </div>

                {/* Add to Cart */}
                <button onClick={handleAdd}
                  className="w-full py-4 rounded-xl bg-[#F07D14] text-white font-bold text-base hover:bg-[#E86C1B] transition-colors shadow-lg shadow-[#F07D14]/20 flex items-center justify-center gap-3">
                  <span>Add to Cart</span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{money(total)}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}