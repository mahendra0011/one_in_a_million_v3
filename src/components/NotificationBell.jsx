import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Bell, X, Check, CheckCheck, Trash2, ShoppingBag, Tag, Star, Bell as BellIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchNotifications, markOneRead, markAllRead,
  deleteNotification, clearAllNotifications,
} from '../store/slices/notificationSlice';

const TYPE_ICON = {
  order_status:    <ShoppingBag size={14} className="text-[#F07D14]" />,
  offer:           <Tag size={14} className="text-purple-400" />,
  review_reminder: <Star size={14} className="text-yellow-400" />,
  system:          <BellIcon size={14} className="text-blue-400" />,
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const dispatch = useDispatch();
  const { items, unreadCount, loading } = useSelector(s => s.notifications);
  const isLoggedIn = useSelector(s => s.auth.isLoggedIn);

  // Respect user's inApp notification preference
  const inAppEnabled = (() => {
    try { return JSON.parse(localStorage.getItem('bim_notif_prefs') || '{}').inApp !== false; } catch { return true; }
  })();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Fetch when opened
  useEffect(() => {
    if (open && isLoggedIn) dispatch(fetchNotifications());
  }, [open, isLoggedIn, dispatch]);

  if (!isLoggedIn || !inAppEnabled) return null;

  const handleOpen = () => setOpen(o => !o);

  const handleClickNotif = (notif) => {
    if (!notif.read) dispatch(markOneRead(notif._id));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-[#A39791] hover:text-[#F07D14] hover:bg-[#16100D] transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F07D14] text-white text-[10px] font-black flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[340px] max-h-[480px] flex flex-col bg-[#16100D] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-semibold text-white text-sm">Notifications</span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => dispatch(markAllRead())}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-[#A39791] hover:text-[#F07D14] hover:bg-white/5 transition-colors"
                    title="Mark all read"
                  >
                    <CheckCheck size={13} /> All read
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    onClick={() => dispatch(clearAllNotifications())}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-[#A39791] hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Clear all"
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-[#A39791] hover:bg-white/5 transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 divide-y divide-white/5">
              {loading && (
                <div className="flex items-center justify-center py-10 text-[#A39791] text-sm">
                  Loading…
                </div>
              )}
              {!loading && items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#A39791]">
                  <Bell size={28} className="opacity-30" />
                  <span className="text-sm">No notifications yet</span>
                </div>
              )}
              {!loading && items.map(notif => (
                <motion.div
                  key={notif._id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  onClick={() => handleClickNotif(notif)}
                  className={`group relative flex gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    notif.read ? 'hover:bg-white/3' : 'bg-[#F07D14]/8 hover:bg-[#F07D14]/12'
                  }`}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#F07D14]" />
                  )}

                  {/* Icon */}
                  <div className="shrink-0 w-8 h-8 rounded-full bg-white/8 flex items-center justify-center mt-0.5">
                    {TYPE_ICON[notif.type] || TYPE_ICON.system}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug truncate ${notif.read ? 'text-[#A39791]' : 'text-white'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-[#6B605A] mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    <p className="text-[10px] text-[#4B4039] mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>

                  {/* Delete btn */}
                  <button
                    onClick={(e) => { e.stopPropagation(); dispatch(deleteNotification(notif._id)); }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-[#6B605A] hover:text-red-400 transition-all"
                  >
                    <X size={13} />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
