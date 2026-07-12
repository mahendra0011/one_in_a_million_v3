import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Phone, Mail, Truck, Check, MapPin, ExternalLink, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonTable } from '../../components/admin/SkeletonRow';
import { useSocket } from '../../hooks/useSocket';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
const EMPTY_FORM = { name: '', phone: '', email: '', password: '', vehicleType: '', vehicleNumber: '' };

export default function AdminDeliveryBoys() {
  const [boys, setBoys]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const fetchBoys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithTimeout('/api/admin/delivery-boys', { headers: { credentials: 'include' } });
      const data = await res.json();
      if (data.ok) setBoys(data.boys);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchBoys(); }, [fetchBoys]);

  // Auto-refresh every 30 s + socket-triggered refresh when orders/status change
  useAutoRefresh({ fetchFn: fetchBoys, interval: 30_000 });
  useSocket({
    joinAdmin: true,
    onOrderUpdated: () => fetchBoys(),   // delivery boy status changes on order assign
    onNewOrder:     () => fetchBoys(),   // new order might set a boy as busy
  });

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.password.trim()) {
      setError('Name, phone and password are required');
      return;
    }
    setError(''); setSaving(true);
    try {
      const res = await fetchWithTimeout('/api/admin/delivery-boys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add delivery boy');
      setShowForm(false);
      fetchBoys();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const toggleActive = async (boy) => {
    try {
      const res = await fetchWithTimeout(`/api/admin/delivery-boys/${boy._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
        body: JSON.stringify({ isActive: !boy.isActive }),
      });
      const data = await res.json();
      if (data.ok) setBoys(prev => prev.map(b => b._id === boy._id ? data.boy : b));
    } catch {}
  };

  const activeCount = boys.filter(b => b.isActive).length;
  const onlineCount  = boys.filter(b => b.isOnline).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-fredoka text-3xl font-bold text-gray-900">Delivery Boys</h1>
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${boys.length} total · ${activeCount} active · ${onlineCount} online now`}
          </p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20">
          <Plus size={18} /> Add Delivery Boy
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Delivery Boy</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Online</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Location</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <SkeletonTable rows={5} cols={6} />}
              {!loading && boys.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-sm">No delivery boys added yet</td></tr>
              )}
              {!loading && boys.map(boy => {
                const avatar = (boy.name || 'D').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={boy._id} className={`hover:bg-gray-50 transition-colors ${!boy.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{boy.name}</p>
                          {boy.mustSetPassword && (
                            <p className="text-xs text-yellow-600">Password not set yet</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-700"><Phone size={13} className="text-gray-400" /> {boy.phone}</div>
                      {boy.email && !boy.email.endsWith('@delivery.bim') && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5"><Mail size={12} className="text-gray-400" /> {boy.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {boy.vehicleType ? (
                        <div className="flex items-center gap-1"><Truck size={13} className="text-gray-400" /> {boy.vehicleType}{boy.vehicleNumber ? ` · ${boy.vehicleNumber}` : ''}</div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        boy.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${boy.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {boy.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleActive(boy)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          boy.isActive ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'
                        }`}>
                        {boy.isActive ? <><Check size={12} /> Active</> : <><X size={12} /> Inactive</>}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {boy.currentLocation?.lat ? (
                        <a
                          href={`https://maps.google.com/?q=${boy.currentLocation.lat},${boy.currentLocation.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium hover:underline"
                        >
                          <MapPin size={12} /> View Map
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                      {boy.currentLocation?.updatedAt && (
                        <p className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                          <Clock size={10} />
                          {new Date(boy.currentLocation.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(boy.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowForm(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-51 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-fredoka text-2xl font-bold text-gray-900">Add Delivery Boy</h3>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Ramesh Kumar"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number *</label>
                      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="98765 43210"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="ramesh@email.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Temporary Password *</label>
                    <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Delivery boy will be asked to change this on first login"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vehicle Type</label>
                      <select value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm">
                        <option value="">Select type</option>
                        <option value="Bike">Bike</option>
                        <option value="Scooter">Scooter</option>
                        <option value="Bicycle">Bicycle</option>
                        <option value="Car">Car</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vehicle Number</label>
                      <input value={form.vehicleNumber} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                        placeholder="MP09 AB 1234"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowForm(false)}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-60">
                      {saving ? 'Adding...' : 'Add Delivery Boy'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
