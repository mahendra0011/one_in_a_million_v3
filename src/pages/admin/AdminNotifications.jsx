import { useState, useEffect } from 'react';
import { fetchWithTimeout } from '../../lib/utils';
import { Bell, Send, Users, User, CheckCircle2, AlertCircle, Loader2, Trash2, Clock } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const TARGET_OPTIONS = [
  { value: 'all', label: '📢 All Users', desc: 'Send to every registered user' },
  { value: 'single', label: '👤 Specific User', desc: 'Send to one user by phone/email' },
];

// Values must match the Notification model's enum exactly (server/models/Notification.js):
// ['order_status', 'offer', 'review_reminder', 'system']. Anything else silently
// falls back to 'system' server-side, so these 4 stay in sync with that enum.
const NOTIF_TYPES = [
  { value: 'system', label: '🔔 General', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'offer', label: '🎉 Offer', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'order_status', label: '📦 Order Update', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'review_reminder', label: '⭐ Review Reminder', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
];

export default function AdminNotifications() {
  const [target, setTarget]         = useState('all');
  const [userQuery, setUserQuery]   = useState('');
  const [title, setTitle]           = useState('');
  const [message, setMessage]       = useState('');
  const [type, setType]             = useState('system');
  const [sending, setSending]       = useState(false);
  const [result, setResult]         = useState(null); // { ok, msg }
  const [history, setHistory]       = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res  = await fetchWithTimeout('/api/admin/notifications', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setHistory(data.notifications || []);
    } catch {}
    setLoadingHistory(false);
  };

  useEffect(() => { queueMicrotask(fetchHistory); }, []);

  // Auto-refresh every 30 s + instant refresh when a notification is broadcast
  useAutoRefresh({ fetchFn: fetchHistory, interval: 30_000 });
  useSocket({
    joinAdmin: true,
    onNotification: () => fetchHistory(),  // someone received a notification → refresh log
    onNewOrder:     () => fetchHistory(),  // new-order triggers a notification log update
  });

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setResult({ ok: false, msg: 'Title and message are required.' });
      return;
    }
    if (target === 'single' && !userQuery.trim()) {
      setResult({ ok: false, msg: 'Please enter a phone number or email to target a specific user.' });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res  = await fetchWithTimeout('/api/admin/notifications/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, userQuery: target === 'single' ? userQuery : undefined, title, message, type }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, msg: data.message || `Notification sent successfully!` });
        setTitle(''); setMessage(''); setUserQuery('');
        fetchHistory();
      } else {
        setResult({ ok: false, msg: data.error || 'Failed to send notification.' });
      }
    } catch {
      setResult({ ok: false, msg: 'Network error. Please try again.' });
    }
    setSending(false);
  };

  const handleDelete = async (id) => {
    try {
      await fetchWithTimeout(`/api/admin/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
      setHistory(prev => prev.filter(n => n._id !== id));
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <Bell className="text-orange-600" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">Send push notifications to users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Compose Panel */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Send size={18} className="text-orange-500" /> Compose Notification
          </h2>

          {/* Target */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Send To</label>
            <div className="grid grid-cols-2 gap-3">
              {TARGET_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTarget(opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    target === opt.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Specific user query */}
          {target === 'single' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">User Phone / Email</label>
              <input
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                placeholder="e.g. +91 98765 43210 or user@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              />
            </div>
          )}

          {/* Notification Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {NOTIF_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
                    type === t.value ? t.color + ' ring-2 ring-offset-1 ring-orange-400' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Weekend Special Offer 🎉"
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your notification message here..."
              rows={4}
              maxLength={300}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/300</p>
          </div>

          {/* Result Banner */}
          {result && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm font-medium ${
              result.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {result.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
              {result.msg}
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Sending...' : target === 'all' ? 'Broadcast to All Users' : 'Send to User'}
          </button>
        </div>

        {/* Stats Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={16} className="text-orange-500" /> Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-orange-500" />
                  <span className="text-sm text-gray-700">Total Sent</span>
                </div>
                <span className="font-bold text-gray-900">{history.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-blue-500" />
                  <span className="text-sm text-gray-700">Broadcasts</span>
                </div>
                <span className="font-bold text-gray-900">{history.filter(n => n.target === 'all').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-purple-500" />
                  <span className="text-sm text-gray-700">Targeted</span>
                </div>
                <span className="font-bold text-gray-900">{history.filter(n => n.target === 'single').length}</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Preview</h3>
            <div className="bg-gray-900 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center text-xs">🍔</div>
                <span className="text-xs text-gray-400">One in a Million</span>
              </div>
              <p className="font-bold text-sm">{title || 'Notification Title'}</p>
              <p className="text-xs text-gray-300 mt-1">{message || 'Your message will appear here...'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
          <Clock size={18} className="text-orange-500" /> Sent History
        </h2>
        {loadingHistory ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No notifications sent yet</p>
            <p className="text-gray-400 text-sm">Your sent notifications will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map(n => {
              const typeInfo = NOTIF_TYPES.find(t => t.value === n.type) || NOTIF_TYPES[0];
              return (
                <div key={n._id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${typeInfo.color} shrink-0 mt-0.5`}>
                    {typeInfo.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400">
                        {n.target === 'all' ? '📢 All users' : `👤 ${n.userQuery}`}
                      </span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {n.sentAt ? new Date(n.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(n._id)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
