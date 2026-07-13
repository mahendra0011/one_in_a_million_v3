import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, RefreshCw, CheckCheck, Package, X, MessageSquare, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';

const TYPE_CONFIG = {
  new_order:       { icon: Package, color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/25', emoji: '🛵' },
  order_cancelled: { icon: X,       color: 'text-red-400',   bg: 'bg-red-500/15',   border: 'border-red-500/25',   emoji: '❌' },
  admin_message:   { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/25', emoji: '💬' },
  system:          { icon: Zap,     color: 'text-[#F07D14]', bg: 'bg-[#F07D14]/15', border: 'border-[#F07D14]/25', emoji: '⚡' },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 0) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function DeliveryNotifications() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('bim_user') || 'null'); } catch { return null; } })();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time: new delivery notifications via socket
  useSocket({
    joinDelivery: user?.id,
    onNewAssignment: (order) => {
      const notif = {
        _id: Date.now().toString(),
        type: 'new_order',
        title: '🛵 Nayi Order Assign!',
        body: `Order ${order.orderId} — ₹${order.totals?.total?.toFixed(0)}`,
        read: false,
        createdAt: new Date(),
        data: { orderId: order.orderId },
      };
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(c => c + 1);
    },
    // Handles cancel, admin_message, system notifs from createDeliveryNotif
    onDeliveryNotification: (notif) => {
      setNotifications(prev => {
        const exists = prev.some(n => n._id === notif._id);
        return exists ? prev : [notif, ...prev];
      });
      if (!notif.read) setUnreadCount(c => c + 1);
    },
  });

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetchWithTimeout('/api/delivery/notifications', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    queueMicrotask(fetchNotifications);
  }, []);

  const markAllRead = async () => {
    try {
      await fetchWithTimeout('/api/delivery/notifications/read-all', { method: 'PATCH', credentials: 'include' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#0A0604]">
      {/* Header */}
      <div className="bg-[#1A1310] border-b border-white/5 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/delivery')} className="p-2 rounded-xl bg-[#16100D] border border-white/5 text-[#8E827B] hover:text-white transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="text-white font-bold text-sm flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-[#F07D14] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </p>
              <p className="text-[#8E827B] text-xs">{notifications.length} total</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs font-bold text-[#8E827B] hover:text-white px-3 py-2 rounded-xl bg-[#16100D] border border-white/5 transition-colors">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
            <button onClick={() => fetchNotifications(true)} disabled={refreshing} className="p-2 rounded-xl bg-[#16100D] border border-white/5 text-[#8E827B] hover:text-white transition-colors">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-[#1A1310] rounded-2xl animate-pulse border border-white/5" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#1A1310] border border-white/5 flex items-center justify-center mx-auto mb-4">
              <BellOff size={28} className="text-[#4A3F38]" />
            </div>
            <p className="text-white font-bold text-sm">Koi notification nahi</p>
            <p className="text-[#8E827B] text-xs mt-1">Jab order assign hoga ya admin message bhejega, yahaan dikhega</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {notifications.map((notif, i) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                return (
                  <motion.div
                    key={notif._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className={`rounded-2xl border px-4 py-3.5 flex items-start gap-3 transition-colors ${
                      notif.read
                        ? 'bg-[#1A1310] border-white/5'
                        : `${cfg.bg} ${cfg.border}`
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${notif.read ? 'bg-[#16100D]' : cfg.bg}`}>
                      {cfg.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-bold text-sm ${notif.read ? 'text-[#A39791]' : 'text-white'}`}>{notif.title}</p>
                        {!notif.read && <span className="w-2 h-2 rounded-full bg-[#F07D14] shrink-0 mt-1" />}
                      </div>
                      <p className="text-[#8E827B] text-xs mt-0.5 leading-relaxed">{notif.body}</p>
                      <p className="text-[#4A3F38] text-[10px] mt-1.5">{timeAgo(notif.createdAt)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
