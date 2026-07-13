import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Search, Star, Phone, Mail, Ban, Gift, X } from 'lucide-react';
import { SkeletonTable, SkeletonCard } from '../../components/admin/SkeletonRow';

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
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState('');
  const [search, setSearch]             = useState('');
  const [tierFilter, setTierFilter]     = useState('all');
  const [pointsModal, setPointsModal]   = useState(null);
  const [pointsInput, setPointsInput]   = useState('');
  const [actionError, setActionError]   = useState('');

  const headers = { 'Content-Type': 'application/json' };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res  = await fetchWithTimeout('/api/admin/customers', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCustomers((data.customers || []).sort((a, b) => b.loyaltyPoints - a.loyaltyPoints));
      } else {
        setFetchError('Failed to load customers');
      }
    } catch { setFetchError('Could not load customers — check your connection'); }
    setLoading(false);
  }, []);

  useEffect(() => { queueMicrotask(fetchCustomers); }, [fetchCustomers]);

  const toggleBan = async (id) => {
    try {
      const customer = customers.find(c => (c._id || c.id) === id);
      const res = await fetchWithTimeout(`/api/admin/customers/${id}/ban`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ isBanned: !customer?.isBanned })
      });
      if (res.ok) {
        setCustomers(prev => prev.map(c => (c._id || c.id) === id ? { ...c, isBanned: !c.isBanned } : c));
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(err.error || 'Failed to update ban status');
      }
    } catch (e) {
      setActionError(e.message || 'Network error');
    }
  };

  const openPointsModal = (customer) => {
    setPointsModal(customer);
    setPointsInput('');
  };

  const applyPoints = async () => {
    if (!pointsModal) return;
    const add = parseInt(pointsInput, 10);
    if (isNaN(add) || add <= 0) return;
    try {
      const customerId = pointsModal._id || pointsModal.id;
      const res = await fetchWithTimeout(`/api/admin/customers/${customerId}/loyalty`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ points: add })
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(prev => prev.map(c => (c._id || c.id) === customerId ? { ...c, loyaltyPoints: data.customer.loyaltyPoints } : c));
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(err.error || 'Failed to add points');
      }
    } catch (e) {
      setActionError(e.message || 'Network error');
    }
    setPointsModal(null);
  };

  const getPoints = (c) => c.loyaltyPoints ?? 0;

  const filtered = customers.filter(c => {
    const term = search.toLowerCase();
    const matchSearch = !term || (c.name || '').toLowerCase().includes(term) || (c.email || '').toLowerCase().includes(term);
    const matchTier   = tierFilter === 'all' || getTier(getPoints(c)) === tierFilter;
    return matchSearch && matchTier;
  });

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  };

  const summaryCards = [
    { label: 'Total',         value: customers.length,                                   color: 'text-gray-900' },
    { label: 'Platinum',      value: customers.filter(c => getTier(getPoints(c)) === 'Platinum').length, color: 'text-purple-600' },
    { label: 'Gold',          value: customers.filter(c => getTier(getPoints(c)) === 'Gold').length,     color: 'text-yellow-600' },
    { label: 'Banned',        value: customers.filter(c => c.isBanned).length,          color: 'text-red-600' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-fredoka text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">{loading ? 'Loading...' : `${customers.length} customers found`}</p>
        </div>
      </div>
      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between items-center">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-500 hover:text-red-700"><X size={14} /></button>
        </div>
      )}
      {fetchError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between items-center">
          <span>{fetchError}</span>
          <button onClick={fetchCustomers} className="text-red-600 underline ml-auto text-sm font-bold">Retry</button>
        </div>
      )}

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
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Points</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <SkeletonTable rows={5} cols={6} />}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">No customers found</td></tr>
              )}
              {!loading && filtered.map(customer => {
                const pts    = getPoints(customer);
                const tier   = getTier(pts);
                const isBanned = customer.isBanned;
                const customerId = customer._id || customer.id;
                const avatar = (customer.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={customerId} className={`hover:bg-gray-50 transition-colors ${isBanned ? 'opacity-60' : ''}`}>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-yellow-600 font-semibold">
                        <Star size={13} className="fill-yellow-400 text-yellow-400" /> {pts}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(customer.createdAt)}</td>
                    <td className="px-6 py-4">
                      {isBanned
                        ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Banned</span>
                        : <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Active</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {customer.phone && (
                          <a href={`tel:${customer.phone}`} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Call"><Phone size={15} /></a>
                        )}
                        {customer.email && (
                          <a href={`mailto:${customer.email}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Email"><Mail size={15} /></a>
                        )}
                        <button onClick={() => openPointsModal(customer)}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Add loyalty points">
                          <Gift size={15} />
                        </button>
                        <button onClick={() => toggleBan(customerId)}
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

      {pointsModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setPointsModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs">
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
          </div>
        </>
      )}
    </div>
  );
}