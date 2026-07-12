import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Search, Star, Phone, Mail, Eye, Ban, Gift, ShoppingBag, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonTable, SkeletonCard } from '../../components/admin/SkeletonRow';
import { useSocket } from '../../hooks/useSocket';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const TIER_STYLES = {
  Platinum: 'bg-purple-100 text-purple-700 border border-purple-200',
  Gold:     'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Silver:   'bg-gray-100 text-gray-700 border border-gray-200',
  Bronze:   'bg-orange-100 text-orange-700 border border-orange-200',
};

function getTier(points = 0) {
  if (points >= 5000) return 'Platinum';
  if (points >= 1000) return 'Gold';
  if (points >= 300)  return 'Silver';
  return 'Bronze';
}

export default function AdminCustomers() {
  const [customers, setCustomers]       = useState([]);
  const [allOrders, setAllOrders]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [tierFilter, setTierFilter]     = useState('all');
  const [selected, setSelected]         = useState(null);   // for detail modal
  const [banned, setBanned]             = useState(() => {  // persisted in localStorage
    try { return new Set(JSON.parse(localStorage.getItem('_banned_customers') || '[]')); }
    catch { return new Set(); }
  });
  const [pointsModal, setPointsModal]   = useState(null);   // {customer}
  const [pointsInput, setPointsInput]   = useState('');
  const [pointsOverride, setPointsOverride] = useState({}); // {id: points}

  const fetchCustomers = useCallback(async () => {
    try {
      const res  = await fetchWithTimeout('/api/orders', { credentials: 'include' });
      const data = res.ok ? await res.json() : null;
      if (data) {
        const orders = data.orders || data || [];
        setAllOrders(orders);
        const map = {};
        orders.forEach(order => {
          const c   = order.customer || {};
          const key = c.email || c.phone || order._id;
          if (!key) return;
          if (!map[key]) {
            map[key] = {
              id: key, name: c.name || '—', email: c.email || '—', phone: c.phone || '—',
              orders: 0, totalSpent: 0, points: 0,
              lastOrder: order.createdAt, joined: order.createdAt,
              orderList: [],
            };
          }
          map[key].orders     += 1;
          map[key].totalSpent += Math.round(order.totals?.total || 0);
          map[key].points      = Math.floor(map[key].totalSpent / 10);
          map[key].orderList.push(order);
          if (new Date(order.createdAt) > new Date(map[key].lastOrder)) map[key].lastOrder = order.createdAt;
          if (new Date(order.createdAt) < new Date(map[key].joined))    map[key].joined    = order.createdAt;
        });
        setCustomers(Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Auto-refresh every 60 s + immediate refresh on new orders
  useAutoRefresh({ fetchFn: fetchCustomers, interval: 60_000 });
  useSocket({
    joinAdmin: true,
    onNewOrder:     () => fetchCustomers(),
    onOrderUpdated: () => fetchCustomers(),
  });

  const toggleBan = (id) => {
    setBanned(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      localStorage.setItem('_banned_customers', JSON.stringify([...n]));
      return n;
    });
  };

  const openPointsModal = (customer) => {
    setPointsModal(customer);
    setPointsInput('');
  };

  const applyPoints = () => {
    if (!pointsModal) return;
    const add = parseInt(pointsInput, 10);
    if (isNaN(add)) return;
    setPointsOverride(prev => ({
      ...prev,
      [pointsModal.id]: (prev[pointsModal.id] ?? pointsModal.points) + add,
    }));
    setPointsModal(null);
  };

  const getPoints = (c) => pointsOverride[c.id] ?? c.points;

  const filtered = customers.filter(c => {
    const term = search.toLowerCase();
    const matchSearch = !term || c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term);
    const matchTier   = tierFilter === 'all' || getTier(getPoints(c)) === tierFilter;
    return matchSearch && matchTier;
  });

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  };

  const totalLTV = customers.reduce((s, c) => s + c.totalSpent, 0);
  const summaryCards = [
    { label: 'Total',         value: customers.length,                                              color: 'text-gray-900' },
    { label: 'Platinum',      value: customers.filter(c => getTier(getPoints(c)) === 'Platinum').length, color: 'text-purple-600' },
    { label: 'Gold',          value: customers.filter(c => getTier(getPoints(c)) === 'Gold').length,     color: 'text-yellow-600' },
    { label: 'Total Revenue', value: `₹${totalLTV.toLocaleString('en-IN')}`, color: 'text-green-600' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-fredoka text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">{loading ? 'Building from orders...' : `${customers.length} customers found`}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {loading
          ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : summaryCards.map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <p className={`text-2xl font-fredoka font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))
        }
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'Platinum', 'Gold', 'Silver', 'Bronze'].map(t => (
            <button key={t} onClick={() => setTierFilter(t)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                tierFilter === t ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Lifetime Value</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Points</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Last Order</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <SkeletonTable rows={5} cols={8} />}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">No customers found</td></tr>
              )}
              {!loading && filtered.map(customer => {
                const pts    = getPoints(customer);
                const tier   = getTier(pts);
                const isBanned = banned.has(customer.id);
                const avatar = (customer.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={customer.id} className={`hover:bg-gray-50 transition-colors ${isBanned ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${isBanned ? 'bg-red-400' : 'bg-gradient-to-br from-orange-500 to-red-600'}`}>
                          {isBanned ? <Ban size={14} /> : avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIER_STYLES[tier]}`}>{tier}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{customer.orders}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">₹{customer.totalSpent.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400">~₹{Math.round(customer.totalSpent / Math.max(customer.orders, 1)).toLocaleString('en-IN')}/order</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-yellow-600 font-semibold">
                        <Star size={13} className="fill-yellow-400 text-yellow-400" /> {pts}
                        {pointsOverride[customer.id] !== undefined && <span className="text-xs text-orange-500">✎</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(customer.lastOrder)}</td>
                    <td className="px-6 py-4">
                      {isBanned
                        ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Banned</span>
                        : <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Active</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {customer.phone !== '—' && (
                          <a href={`tel:${customer.phone}`} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Call"><Phone size={15} /></a>
                        )}
                        {customer.email !== '—' && (
                          <a href={`mailto:${customer.email}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Email"><Mail size={15} /></a>
                        )}
                        <button onClick={() => openPointsModal(customer)}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Add loyalty points">
                          <Gift size={15} />
                        </button>
                        <button onClick={() => setSelected(customer)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="View history">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => toggleBan(customer.id)}
                          className={`p-1.5 rounded-lg transition-colors ${isBanned ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`}
                          title={isBanned ? 'Unban' : 'Ban customer'}>
                          <Ban size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal (order history + LTV) ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xl font-bold">
                      {(selected.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-fredoka text-xl font-bold text-gray-900">{selected.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${TIER_STYLES[getTier(getPoints(selected))]}`}>
                        {getTier(getPoints(selected))} Member
                      </span>
                    </div>
                    <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={18} /></button>
                  </div>
                </div>
                <div className="p-6">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Total Orders', value: selected.orders, icon: ShoppingBag, color: 'text-orange-600' },
                      { label: 'Lifetime Value', value: `₹${selected.totalSpent.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-green-600' },
                      { label: 'Points', value: `⭐ ${getPoints(selected)}`, icon: Star, color: 'text-yellow-600' },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className={`text-lg font-fredoka font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Contact info */}
                  <div className="space-y-2 text-sm mb-5">
                    {[
                      { label: 'Email',        value: selected.email },
                      { label: 'Phone',        value: selected.phone },
                      { label: 'Member since', value: new Date(selected.joined).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) },
                      { label: 'Avg per order',value: `₹${Math.round(selected.totalSpent / Math.max(selected.orders, 1)).toLocaleString('en-IN')}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between border-b border-gray-50 pb-2">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-semibold text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Order History */}
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Order History</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(selected.orderList || [])
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .map((order, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                        <span className="font-mono font-bold text-gray-700">#{String(order.orderId || order._id).slice(-6).toUpperCase()}</span>
                        <span className="text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-700'
                        }`}>{order.status}</span>
                        <span className="font-bold text-gray-900">₹{Math.round(order.totals?.total || 0)}</span>
                      </div>
                    ))}
                    {(!selected.orderList || selected.orderList.length === 0) && (
                      <p className="text-gray-400 text-xs text-center py-4">No orders found</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Add Points Modal ── */}
      <AnimatePresence>
        {pointsModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setPointsModal(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs pointer-events-auto">
                <h3 className="font-fredoka text-lg font-bold text-gray-900 mb-1">Add Loyalty Points</h3>
                <p className="text-sm text-gray-500 mb-4">For <b>{pointsModal.name}</b> (current: ⭐ {getPoints(pointsModal)})</p>
                <input type="number" value={pointsInput} onChange={e => setPointsInput(e.target.value)}
                  placeholder="Points to add (e.g. 100)" min="1"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-500 mb-4" />
                <div className="flex gap-2">
                  <button onClick={() => setPointsModal(null)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={applyPoints}
                    className="flex-1 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors">Add Points</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
