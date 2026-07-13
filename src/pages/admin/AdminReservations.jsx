import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Calendar, Clock, Users, X } from 'lucide-react';
import { SkeletonTable } from '../../components/admin/SkeletonRow';
import { useSocket } from '../../hooks/useSocket';

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled'];
const headers = { 'Content-Type': 'application/json' };
const STATUS_STYLE = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updating, setUpdating]   = useState(null);
  const [actionError, setActionError] = useState('');

  
  const fetchReservations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetchWithTimeout('/api/reservations', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setReservations((data.reservations || data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    } catch { /* silent */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { queueMicrotask(fetchReservations); }, [fetchReservations]);

  // Real-time: new reservations
  useSocket({
    joinAdmin: true,
    onNewReservation: (res) => setReservations(prev => [res, ...prev]),
  });

  const updateStatus = async (resv, newStatus) => {
    const id = resv._id || resv.id;
    setUpdating(id);
    try {
      const res = await fetchWithTimeout(`/api/reservations/${id}`, { method: 'PATCH', headers, credentials: 'include',
        body: JSON.stringify({ status: newStatus }) });
      if (res.ok) {
        setReservations(prev => prev.map(r => (r._id === id || r.id === id) ? { ...r, status: newStatus } : r));
      } else {
        const data = await res.json();
        setActionError(data.error || 'Failed to update reservation');
      }
    } catch (err) { setActionError('Network error updating reservation'); }
    setUpdating(null);
  };

  const filtered = reservations.filter(r => {
    const term = search.toLowerCase();
    const matchSearch = !term ||
      (r.name || '').toLowerCase().includes(term) ||
      (r.email || '').toLowerCase().includes(term) ||
      (r.phone || '').toLowerCase().includes(term);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  };

  return (
    <div>
      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between items-center">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-500 hover:text-red-700"><X size={14} /></button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-fredoka text-3xl font-bold text-gray-900">Reservations</h1>
          <p className="text-gray-600">{loading ? 'Loading...' : `${reservations.length} total · ${reservations.filter(r => r.status === 'pending').length} pending`}</p>
        </div>
        <button onClick={() => fetchReservations(true)} disabled={refreshing}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <RefreshCw size={16} className={refreshing ? 'animate-spin text-orange-500' : 'text-gray-600'} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: reservations.length, color: 'text-gray-900', bg: 'bg-gray-100', icon: Calendar },
          { label: 'Confirmed', value: reservations.filter(r => r.status === 'confirmed').length, color: 'text-green-700', bg: 'bg-green-100', icon: Clock },
          { label: 'Pending', value: reservations.filter(r => r.status === 'pending').length, color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Users },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-full ${s.bg}`}><s.icon size={18} className={s.color} /></div>
            <div>
              <p className={`text-2xl font-fredoka font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or phone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <div className="flex gap-2">
          {['all', ...STATUS_OPTIONS].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === s ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Guest</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Time</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Guests</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Booked On</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <SkeletonTable rows={5} cols={7} />}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-sm">No reservations found</td></tr>
              )}
              {!loading && filtered.map(resv => {
                const id = resv._id || resv.id;
                return (
                  <tr key={id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{resv.name || '—'}</p>
                      <p className="text-xs text-gray-500">{resv.phone || resv.email || ''}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDate(resv.date || resv.reservationDate)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{resv.time || resv.timeSlot || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{resv.guests || resv.partySize || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${STATUS_STYLE[resv.status] || 'bg-gray-100 text-gray-700'}`}>
                        {resv.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(resv.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={resv.status || 'pending'}
                          disabled={updating === id}
                          onChange={e => updateStatus(resv, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500 disabled:opacity-50 bg-white"
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                        {updating === id && <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}