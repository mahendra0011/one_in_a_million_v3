import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const icons = {
  success: <CheckCircle size={18} className="text-green-400" />,
  error: <XCircle size={18} className="text-red-400" />,
  warning: <AlertTriangle size={18} className="text-yellow-400" />,
  info: <Info size={18} className="text-blue-400" />,
};

let toastId = 0;
const toasts = [];

export function toast(message, type = 'info', duration = 4000) {
  const id = ++toastId;
  const t = { id, message, type };
  toasts.push(t);
  window.dispatchEvent(new CustomEvent('toast', { detail: { action: 'add', toast: t } }));
  if (duration > 0) {
    setTimeout(() => {
      const idx = toasts.findIndex(x => x.id === id);
      if (idx > -1) {
        toasts.splice(idx, 1);
        window.dispatchEvent(new CustomEvent('toast', { detail: { action: 'remove', id } }));
      }
    }, duration);
  }
  return id;
}

export function ToastContainer() {
  const [list, setList] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail.action === 'add') setList(l => [...l, e.detail.toast]);
      if (e.detail.action === 'remove') setList(l => l.filter(t => t.id !== e.detail.id));
    };
    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, []);

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 w-[340px] pointer-events-none">
      <AnimatePresence>
        {list.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ duration: 0.2, type: 'spring' }}
            className="pointer-events-auto bg-[#1A1310] border border-white/10 rounded-xl p-4 shadow-2xl shadow-black/60 flex items-start gap-3"
          >
            <div className="mt-0.5">{icons[t.type] || icons.info}</div>
            <p className="flex-1 text-sm font-medium text-white">{t.message}</p>
            <button
              onClick={() => setList(l => l.filter(x => x.id !== t.id))}
              className="text-[#8E827B] hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}