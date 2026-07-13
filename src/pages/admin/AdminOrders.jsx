import { fetchWithTimeout } from '../../lib/utils';
import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Printer, Filter, ChevronDown, CheckSquare, Square, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonTable } from '../../components/admin/SkeletonRow';
import { useSocket } from '../../hooks/useSocket';

const headers = { 'Content-Type': 'application/json' };

const STATUS_OPTIONS = ['pending', 'confirmed', 'preparing', 'reached_restaurant', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'];
const STATUS_LABELS = {
  pending:            'Pending',
  confirmed:          'Confirmed',
  preparing:          'Preparing',
  reached_restaurant: 'At Restaurant',
  picked_up:          'Picked Up',
  out_for_delivery:   'Out for Delivery',
  delivered:          'Delivered',
  cancelled:          'Cancelled',
};
const STATUS_STYLE = {
  pending:            'bg-gray-100 text-gray-700',
  confirmed:          'bg-blue-100 text-blue-700',
  preparing:          'bg-yellow-100 text-yellow-700',
  reached_restaurant: 'bg-purple-100 text-purple-700',
  picked_up:          'bg-indigo-100 text-indigo-700',
  out_for_delivery:   'bg-orange-100 text-orange-700',
  delivered:          'bg-green-100 text-green-700',
  cancelled:          'bg-red-100 text-red-600',
};

// Available delivery boys cache
let deliveryBoysCache = [];

// ── Print helper ──────────────────────────────────────────────────────────────
function printOrder(order) {
  const items = (order.items || []).map(i =>
    `<tr><td>${i.name}</td><td style="text-align:center">${i.qty||i.quantity||1}</td><td style="text-align:right">₹${Math.round((i.unitPrice||i.price||0)*(i.qty||i.quantity||1))}</td></tr>`
  ).join('');
  const win = window.open('', '_blank', 'width=400,height=600');
  win.document.write(`
    <html><head><title>Order #${String(order.orderId||order._id).slice(-8).toUpperCase()}</title>
    <style>
      body{font-family:monospace;padding:16px;font-size:13px}
      h2{text-align:center;margin:0 0 8px}
      p{margin:2px 0}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{padding:4px 2px;border-bottom:1px dashed #ccc}
      th{text-align:left}
      .total{font-size:15px;font-weight:bold;text-align:right;margin-top:10px}
      .footer{text-align:center;margin-top:16px;font-size:11px;color:#666}
    </style></head><body>
    <h2>🍔 One In A Million</h2>
    <p><b>Order:</b> #${String(order.orderId||order._id).slice(-8).toUpperCase()}</p>
    <p><b>Customer:</b> ${order.customer?.name||'—'}</p>
    <p><b>Phone:</b> ${order.customer?.phone||'—'}</p>
    <p><b>Date:</b> ${new Date(order.createdAt).toLocaleString('en-IN')}</p>
    ${(order.customerLocation?.address || order.customer?.deliveryAddress) ? `<p><b>Address:</b> ${order.customerLocation?.address || order.customer?.deliveryAddress}</p>` : ''}
    ${order.notes ? `<p><b>Notes:</b> ${order.notes}</p>` : ''}
    <table><thead><tr><th>Item</th><th>Qty</th><th>Amt</th></tr></thead>
    <tbody>${items}</tbody></table>
    <p class="total">Total: ₹${Math.round(order.totals?.total||0)}</p>
    <div class="footer">— Kitchen Copy —</div>
    </body></html>`);
  win.document.close();
  win.print();
}

export default function AdminOrders() {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryBoyFilter, setDeliveryBoyFilter] = useState('all');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [expanded, setExpanded]       = useState(null);
  const [updating, setUpdating]       = useState(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [assigning, setAssigning]     = useState(null);
  const [selected, setSelected]       = useState(new Set());   // bulk selection
  const [bulkStatus, setBulkStatus]   = useState('confirmed');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetchWithTimeout('/api/orders', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOrders((data.orders || data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    } catch { /* silent */ }
    setLoading(false); setRefreshing(false);
  }, []);

  const fetchDeliveryBoys = useCallback(async () => {
    try {
      const res = await fetchWithTimeout('/api/admin/delivery-boys', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setDeliveryBoys(data.boys.filter(b => b.isActive));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchOrders(); fetchDeliveryBoys(); }, [fetchOrders, fetchDeliveryBoys]);

  useSocket({
    joinAdmin: true,
    onNewOrder:     (order) => setOrders(prev => [order, ...prev]),
    onOrderUpdated: (order) => setOrders(prev => prev.map(o =>
      (o._id === order._id || o.orderId === order.orderId) ? order : o
    )),
  });

  const updateStatus = async (order, newStatus) => {
    const id = order.orderId || order._id;
    setUpdating(id);
    try {
      const res = await fetchWithTimeout(`/api/orders/${id}/status`, {
        method: 'PATCH', headers, credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(prev => prev.map(o => (o._id === order._id) ? data.order : o));
      }
    } catch { /* silent */ }
    setUpdating(null);
  };

  const assignDeliveryBoy = async (order, deliveryBoyId) => {
    if (!deliveryBoyId) return;
    const id = order.orderId || order._id;
    setAssigning(id);
    try {
      const res = await fetchWithTimeout(`/api/orders/${id}/assign`, {
        method: 'PATCH', headers, credentials: 'include',
        body: JSON.stringify({ deliveryBoyId })
      });
      const data = await res.json();
      if (data.ok) setOrders(prev => prev.map(o => (o._id === order._id) ? data.order : o));
    } catch { /* silent */ }
    setAssigning(null);
  };

  // ── Bulk update ────────────────────────────────────────────────────────────
  const bulkUpdateStatus = async () => {
    if (selected.size === 0) return;
    setBulkUpdating(true);
    const ids = [...selected];
    await Promise.all(ids.map(id => {
      const order = orders.find(o => (o.orderId || o._id) === id);
      if (!order) return;
      return fetchWithTimeout(`/api/orders/${id}/status`, {
        method: 'PATCH', headers, credentials: 'include',
        body: JSON.stringify({ status: bulkStatus })
      }).then(r => r.ok ? r.json() : null).then(data => {
        if (data?.order) setOrders(prev => prev.map(o => (o._id === data.order._id) ? data.order : o));
      }).catch(() => {});
    }));
    setSelected(new Set());
    setBulkUpdating(false);
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const term = search.toLowerCase();
    const matchSearch = !term ||
      String(o.orderId || o._id || '').toLowerCase().includes(term) ||
      (o.customer?.name || '').toLowerCase().includes(term) ||
      (o.customer?.email || '').toLowerCase().includes(term);
    const matchStatus  = statusFilter === 'all' || o.status === statusFilter;
    const assignedId   = o.assignedTo?._id || o.assignedTo || '';
    const matchDB      = deliveryBoyFilter === 'all' || assignedId === deliveryBoyFilter;
    const orderDate    = new Date(o.createdAt);
    const matchFrom    = !dateFrom || orderDate >= new Date(dateFrom);
    const matchTo      = !dateTo   || orderDate <= new Date(dateTo + 'T23:59:59');
    return matchSearch && matchStatus && matchDB && matchFrom && matchTo;
  });

  const allSelected    = filtered.length > 0 && filtered.every(o => selected.has(o.orderId || o._id));
  const someSelected   = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.orderId || o._id)));
  };
  const toggleOne = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
  };

  const hasFilters = dateFrom || dateTo || deliveryBoyFilter !== 'all';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-fredoka text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${orders.length} total · ${orders.filter(o => o.status === 'pending').length} pending`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${hasFilters ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Filter size={14} /> Filters {hasFilters && <span className="bg-orange-600 text-white text-xs rounded-full px-1.5 py-0.5">!</span>}
          </button>
          <button onClick={() => fetchOrders(true)} disabled={refreshing}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-orange-500' : 'text-gray-600'} />
          </button>
        </div>
      </div>

      {/* Main Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order ID or customer..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...STATUS_OPTIONS].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === s ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {s === 'all' ? 'All' : (STATUS_LABELS[s] || s)}
            </button>
          ))}
        </div>
      </div>

      {/* Extended Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Date From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-500 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Date To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-500 bg-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Delivery Boy</label>
                <select value={deliveryBoyFilter} onChange={e => setDeliveryBoyFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-500 bg-white">
                  <option value="all">All Boys</option>
                  <option value="">Unassigned</option>
                  {deliveryBoys.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <button onClick={() => { setDateFrom(''); setDateTo(''); setDeliveryBoyFilter('all'); }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold">
                <X size={14} /> Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-orange-600 text-white rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold">{selected.size} selected</span>
            <span className="text-orange-300">→ Set status to:</span>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-sm bg-white text-gray-900 font-semibold border-0 focus:outline-none">
              {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
            <button onClick={bulkUpdateStatus} disabled={bulkUpdating}
              className="px-4 py-1.5 bg-white text-orange-700 rounded-lg text-sm font-bold hover:bg-orange-50 transition-colors disabled:opacity-60">
              {bulkUpdating ? 'Updating…' : 'Apply'}
            </button>
            <button onClick={() => setSelected(new Set())}
              className="ml-auto p-1 hover:bg-orange-500 rounded-lg transition-colors"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-orange-600 transition-colors">
                    {allSelected ? <CheckSquare size={16} className="text-orange-600" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Items</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Delivery Boy</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <SkeletonTable rows={6} cols={9} />}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400 text-sm">No orders found</td></tr>
              )}
              {!loading && filtered.map(order => {
                const id = String(order.orderId || order._id);
                const isExpanded = expanded === id;
                const isSelected = selected.has(order.orderId || order._id);
                return (
                  <React.Fragment key={id}>
                    <tr
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-orange-50' : ''}`}
                      onClick={() => setExpanded(isExpanded ? null : id)}>

                      {/* Checkbox */}
                      <td className="px-4 py-4" onClick={e => { e.stopPropagation(); toggleOne(order.orderId || order._id); }}>
                        {isSelected
                          ? <CheckSquare size={16} className="text-orange-600" />
                          : <Square size={16} className="text-gray-300 hover:text-gray-500" />
                        }
                      </td>

                      <td className="px-4 py-4 text-sm font-mono font-bold text-gray-900">
                        {String(order.orderId || order._id || '').slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-gray-900">{order.customer?.name || '—'}</p>
                        <p className="text-xs text-gray-500">{order.customer?.phone || order.customer?.email || ''}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{order.items?.length || 0} items</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900">₹{Math.round(order.totals?.total || 0)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>

                      {/* Delivery Boy assign */}
                      <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
<select
                             value={order.assignedTo?._id || order.assignedTo || ''}
                             disabled={assigning === id}
                             onChange={e => assignDeliveryBoy(order, e.target.value)}
                             className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500 disabled:opacity-50 bg-white text-gray-900 max-w-[140px]">
                             <option value="" className="bg-white text-gray-900">Unassigned</option>
                             {deliveryBoys.map(b => (
                               <option key={b._id} value={b._id} className="bg-white text-gray-900">{b.name}{b.isOnline ? ' 🟢' : ''}</option>
                             ))}
                           </select>
                          {assigning === id && <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-500">{formatDate(order.createdAt)}</td>

                      {/* Status change + Print */}
                      <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
<select
                             value={order.status}
                             disabled={updating === id}
                             onChange={e => updateStatus(order, e.target.value)}
                             className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500 disabled:opacity-50 bg-white text-gray-900">
                             {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize bg-white text-gray-900">{s}</option>)}
                           </select>
                          {updating === id
                            ? <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            : <button onClick={() => printOrder(order)} title="Print kitchen copy"
                                className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                                <Printer size={14} />
                              </button>
                          }
                        </div>
                      </td>
                    </tr>

                    {/* Expanded row — full detail modal-style */}
                    {isExpanded && (
                      <tr key={`${id}-detail`}>
                        <td colSpan={9} className="px-6 py-4 bg-orange-50 border-b border-orange-100">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Order Items</p>
                              <div className="flex flex-wrap gap-2">
                                {(order.items || []).map((item, j) => (
                                  <span key={j} className="bg-white border border-orange-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-800">
                                    {item.name} × {item.qty || item.quantity || 1} — ₹{Math.round((item.unitPrice || item.price || 0) * (item.qty || item.quantity || 1))}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1 text-xs text-gray-600">
                              {(order.customerLocation?.address || order.customer?.deliveryAddress || order.deliveryAddress) && (
                                <p>📍 {order.customerLocation?.address || order.customer?.deliveryAddress || order.deliveryAddress}</p>
                              )}
                              {order.notes && <p>📝 {order.notes}</p>}
                              {order.totals?.subtotal  && <p>Subtotal: ₹{Math.round(order.totals.subtotal)}</p>}
                              {order.totals?.discount  && <p>Discount: −₹{Math.round(order.totals.discount)}</p>}
                              {order.totals?.delivery  && <p>Delivery: ₹{Math.round(order.totals.delivery)}</p>}
                              <p className="font-bold text-gray-800">Total: ₹{Math.round(order.totals?.total || 0)}</p>
                              {order.paymentMethod && <p>Payment: {order.paymentMethod}</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
