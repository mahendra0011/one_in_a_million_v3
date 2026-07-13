import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Star, ShoppingBag, Users, DollarSign, RefreshCw, Download, Calendar, Repeat, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { SkeletonCard, SkeletonBar } from '../../components/admin/SkeletonRow';
import { useSocket } from '../../hooks/useSocket';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const authHeaders = () => ({ credentials: 'include' });

const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BarChart = ({ data, labels, color, label }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-gray-600">
            {label === '₹' ? (val >= 1000 ? `₹${(val / 1000).toFixed(1)}k` : `₹${val}`) : val}
          </span>
          <motion.div className={`w-full rounded-t-lg ${color}`}
            initial={{ height: 0 }}
            animate={{ height: `${(val / max) * 120}px` }}
            transition={{ delay: i * 0.04, duration: 0.45, ease: 'easeOut' }}
          />
          <span className="text-xs text-gray-500">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};

function buildWeekData(orders) {
  const now = new Date(); const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const rev = Array(7).fill(0), cnt = Array(7).fill(0);
  orders.forEach(o => {
    const d = new Date(o.createdAt);
    if (d >= weekStart) { const day = (d.getDay() + 6) % 7; rev[day] += Math.round(o.totals?.total || 0); cnt[day] += 1; }
  });
  return { rev, cnt };
}

function buildMonthData(orders) {
  const year = new Date().getFullYear();
  const rev = Array(12).fill(0), cnt = Array(12).fill(0);
  orders.forEach(o => {
    const d = new Date(o.createdAt);
    if (d.getFullYear() === year) { rev[d.getMonth()] += Math.round(o.totals?.total || 0); cnt[d.getMonth()] += 1; }
  });
  return { rev, cnt };
}

function buildRangeData(orders, from, to) {
  const f = from ? new Date(from) : null;
  const t = to   ? new Date(to + 'T23:59:59') : null;
  const rangeOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    return (!f || d >= f) && (!t || d <= t);
  });
  // group by date
  const map = {};
  rangeOrders.forEach(o => {
    const key = new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    if (!map[key]) map[key] = { rev: 0, cnt: 0 };
    map[key].rev += Math.round(o.totals?.total || 0);
    map[key].cnt += 1;
  });
  const sorted = Object.entries(map).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  return {
    rev:    sorted.map(([, v]) => v.rev),
    cnt:    sorted.map(([, v]) => v.cnt),
    labels: sorted.map(([k]) => k),
  };
}

function buildTopItems(orders) {
  const map = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const key = item.name || 'Unknown';
      if (!map[key]) map[key] = { name: key, orders: 0, revenue: 0 };
      map[key].orders  += (item.quantity || 1);
      map[key].revenue += Math.round((item.price || 0) * (item.quantity || 1));
    });
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}

function buildCategoryData(orders) {
  const map = {}; let totalRev = 0;
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const cat = item.category || 'other';
      const rev = Math.round((item.price || 0) * (item.quantity || 1));
      map[cat] = (map[cat] || 0) + rev; totalRev += rev;
    });
  });
  const colors = { burgers: 'bg-orange-500', combos: 'bg-red-500', drinks: 'bg-blue-500', sides: 'bg-green-500', other: 'bg-gray-400' };
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, rev]) => ({
      cat: cat.charAt(0).toUpperCase() + cat.slice(1),
      rev, pct: totalRev > 0 ? Math.round((rev / totalRev) * 100) : 0,
      color: colors[cat] || 'bg-gray-400',
    }));
}

function buildDeliveryBoyStats(orders) {
  const map = {};
  orders.forEach(o => {
    if (!o.assignedTo) return;
    const boy = o.assignedTo;
    const id  = boy._id || boy;
    const name = boy.name || `Boy #${String(id).slice(-4)}`;
    if (!map[id]) map[id] = { id, name, delivered: 0, total: 0, times: [] };
    map[id].total += 1;
    if (o.status === 'delivered') {
      map[id].delivered += 1;
      if (o.createdAt && o.updatedAt) {
        const mins = Math.round((new Date(o.updatedAt) - new Date(o.createdAt)) / 60000);
        if (mins > 0 && mins < 300) map[id].times.push(mins);
      }
    }
  });
  return Object.values(map).map(b => ({
    ...b,
    avgTime: b.times.length > 0 ? Math.round(b.times.reduce((a, v) => a + v, 0) / b.times.length) : null,
  })).sort((a, b) => b.delivered - a.delivered);
}

function buildCouponStats(orders) {
  const map = {};
  orders.forEach(o => {
    if (!o.coupon && !o.totals?.discount) return;
    const code = o.coupon || 'discount';
    if (!map[code]) map[code] = { code, uses: 0, saved: 0 };
    map[code].uses  += 1;
    map[code].saved += Math.round(o.totals?.discount || 0);
  });
  return Object.values(map).sort((a, b) => b.uses - a.uses);
}

function buildRepeatVsNew(orders) {
  const customerOrders = {};
  orders.forEach(o => {
    const key = o.customer?.email || o.customer?.phone || o.customer?.name;
    if (!key) return;
    customerOrders[key] = (customerOrders[key] || 0) + 1;
  });
  const repeat = Object.values(customerOrders).filter(c => c > 1).length;
  const newC   = Object.values(customerOrders).filter(c => c === 1).length;
  return { repeat, newC, total: repeat + newC };
}

// ── CSV/PDF export ─────────────────────────────────────────────────────────
function exportCSV(orders, from, to) {
  const f = from ? new Date(from) : null;
  const t = to   ? new Date(to + 'T23:59:59') : null;
  const rows = orders.filter(o => {
    const d = new Date(o.createdAt);
    return (!f || d >= f) && (!t || d <= t);
  });
  const header = 'Order ID,Customer,Status,Total,Date\n';
  const body = rows.map(o =>
    `${String(o.orderId||o._id).slice(-8).toUpperCase()},` +
    `"${o.customer?.name||''}",${o.status},${Math.round(o.totals?.total||0)},` +
    `${new Date(o.createdAt).toLocaleDateString('en-IN')}`
  ).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `orders-${from||'all'}-${to||'all'}.csv`; a.click();
}

function exportPDF(orders, from, to) {
  const f = from ? new Date(from) : null;
  const t = to   ? new Date(to + 'T23:59:59') : null;
  const rows = orders.filter(o => {
    const d = new Date(o.createdAt);
    return (!f || d >= f) && (!t || d <= t);
  });
  const total = rows.reduce((s, o) => s + Math.round(o.totals?.total || 0), 0);
  const rowsHTML = rows.map(o =>
    `<tr><td>${String(o.orderId||o._id).slice(-8).toUpperCase()}</td>
     <td>${o.customer?.name||'—'}</td>
     <td>${o.status}</td>
     <td>₹${Math.round(o.totals?.total||0)}</td>
     <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td></tr>`
  ).join('');
  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(`<html><head><title>Analytics Report</title>
  <style>body{font-family:sans-serif;padding:24px}h1{margin-bottom:4px}p{color:#666;margin:0 0 16px}
  table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;border:1px solid #e5e7eb;text-align:left}
  th{background:#f9fafb;font-weight:700}tr:nth-child(even){background:#f9fafb}
  .footer{margin-top:16px;font-weight:bold;text-align:right}</style></head><body>
  <h1>🍔 One In A Million — Orders Report</h1>
  <p>Period: ${from||'All time'} → ${to||'Now'} · Total: ₹${total.toLocaleString('en-IN')}</p>
  <table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
  <tbody>${rowsHTML}</tbody></table>
  <p class="footer">Total Revenue: ₹${total.toLocaleString('en-IN')} · ${rows.length} orders</p>
  </body></html>`);
  win.document.close(); win.print();
}

export default function AdminAnalytics() {
  const [period, setPeriod]       = useState('week');
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview | delivery | coupons | customers

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [aRes, oRes] = await Promise.all([
        fetchWithTimeout('/api/analytics', { credentials: 'include' }),
        fetchWithTimeout('/api/orders',    { credentials: 'include' }),
      ]);
      if (aRes.ok) setAnalytics(await aRes.json());
      if (oRes.ok) { const d = await oRes.json(); setOrders(d.orders || d || []); }
    } catch { /* silent */ }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { queueMicrotask(fetchData); }, [fetchData]);

  // Auto-refresh every 60 s + immediate refresh on new orders/reservations
  useAutoRefresh({ fetchFn: () => fetchData(true), interval: 60_000 });
  useSocket({
    joinAdmin: true,
    onNewOrder:       () => fetchData(true),
    onNewReservation: () => fetchData(true),
    onOrderUpdated:   () => fetchData(true),
  });

  const hasDateFilter = dateFrom || dateTo;

  const weekData  = buildWeekData(orders);
  const monthData = buildMonthData(orders);
  const rangeData = buildRangeData(orders, dateFrom, dateTo);
  const topItems  = buildTopItems(hasDateFilter ? orders.filter(o => {
    const d = new Date(o.createdAt);
    return (!dateFrom || d >= new Date(dateFrom)) && (!dateTo || d <= new Date(dateTo + 'T23:59:59'));
  }) : orders);
  const catData   = buildCategoryData(orders);
  const dbStats   = buildDeliveryBoyStats(orders);
  const couponStats = buildCouponStats(orders);
  const rvn       = buildRepeatVsNew(orders);

  const chartData = hasDateFilter
    ? rangeData
    : period === 'week'
      ? { rev: weekData.rev, cnt: weekData.cnt, labels: DAYS }
      : { rev: monthData.rev, cnt: monthData.cnt, labels: MONTHS };

  const totalRevenue      = analytics?.totalRevenue || 0;
  const totalOrders       = analytics?.totalOrders || 0;
  const totalUsers        = analytics?.totalUsers || 0;
  const totalReservations = analytics?.totalReservations || 0;
  const avgOrderValue     = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const statusBreakdown   = analytics?.statusBreakdown || [];
  const getStatusCount    = (s) => statusBreakdown.find(x => x._id === s)?.count || 0;

  const metrics = [
    { label: 'Total Revenue',    value: `₹${totalRevenue.toLocaleString('en-IN')}`,   icon: DollarSign,  color: 'bg-green-100 text-green-600',   sub: `${totalOrders} total orders` },
    { label: 'Total Orders',     value: totalOrders,                                   icon: ShoppingBag, color: 'bg-orange-100 text-orange-600', sub: `${getStatusCount('pending')} pending` },
    { label: 'Avg Order Value',  value: `₹${avgOrderValue.toLocaleString('en-IN')}`,  icon: TrendingUp,  color: 'bg-blue-100 text-blue-600',     sub: 'per order' },
    { label: 'Registered Users', value: totalUsers,                                    icon: Users,       color: 'bg-purple-100 text-purple-600', sub: 'total accounts' },
    { label: 'Repeat Customers', value: rvn.repeat,                                    icon: Repeat,      color: 'bg-teal-100 text-teal-600',     sub: `${rvn.newC} new customers` },
    { label: 'Reservations',     value: totalReservations,                             icon: ShoppingBag, color: 'bg-pink-100 text-pink-600',     sub: 'total bookings' },
  ];

  const tabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'delivery',   label: 'Delivery Boys' },
    { id: 'coupons',    label: 'Coupons' },
    { id: 'customers',  label: 'Customers' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-fredoka text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Live performance data</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Date range */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Calendar size={14} className="text-gray-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="text-sm text-gray-700 border-0 focus:outline-none bg-transparent w-32" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="text-sm text-gray-700 border-0 focus:outline-none bg-transparent w-32" />
            {hasDateFilter && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 font-bold hover:underline">Clear</button>
            )}
          </div>
          {/* Export */}
          <div className="flex gap-1">
            <button onClick={() => exportCSV(orders, dateFrom, dateTo)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => exportPDF(orders, dateFrom, dateTo)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={14} /> PDF
            </button>
          </div>
          <button onClick={() => fetchData(true)} disabled={refreshing}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-orange-500' : 'text-gray-600'} />
          </button>
          {!hasDateFilter && (
            <div className="flex gap-2">
              {['week', 'month'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                    period === p ? 'bg-orange-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}>
                  {p === 'week' ? 'This Week' : 'This Year'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {loading
          ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : metrics.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-gray-600 font-medium">{m.label}</p>
                <div className={`p-2 rounded-lg ${m.color}`}><m.icon size={16} /></div>
              </div>
              <p className="text-2xl font-fredoka font-bold text-gray-900">{m.value}</p>
              <p className="text-xs text-gray-500 mt-1">{m.sub}</p>
            </motion.div>
          ))
        }
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100 pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 -mb-px ${
              activeTab === t.id ? 'border-orange-600 text-orange-700 bg-orange-50' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <>
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-fredoka text-lg font-bold text-gray-900 mb-4">
                Revenue — {hasDateFilter ? `${dateFrom||'Start'} → ${dateTo||'Now'}` : period === 'week' ? 'This Week' : 'This Year'}
              </h3>
              {loading ? <SkeletonBar /> : (chartData.rev || []).every(v => v === 0)
                ? <p className="text-gray-400 text-sm text-center py-10">No orders in this period yet</p>
                : <BarChart data={chartData.rev} labels={chartData.labels} color="bg-orange-500" label="₹" />
              }
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-fredoka text-lg font-bold text-gray-900 mb-4">
                Orders — {hasDateFilter ? `${dateFrom||'Start'} → ${dateTo||'Now'}` : period === 'week' ? 'This Week' : 'This Year'}
              </h3>
              {loading ? <SkeletonBar /> : (chartData.cnt || []).every(v => v === 0)
                ? <p className="text-gray-400 text-sm text-center py-10">No orders in this period yet</p>
                : <BarChart data={chartData.cnt} labels={chartData.labels} color="bg-blue-500" label="#" />
              }
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-fredoka text-lg font-bold text-gray-900 mb-4">Order Status Breakdown</h3>
              {loading
                ? <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
                : statusBreakdown.length === 0
                  ? <p className="text-gray-400 text-sm text-center py-6">No orders yet</p>
                  : (
                    <div className="space-y-3">
                      {[
                        { key: 'pending',   label: 'Pending',   color: 'bg-yellow-500' },
                        { key: 'confirmed', label: 'Confirmed', color: 'bg-blue-500' },
                        { key: 'preparing', label: 'Preparing', color: 'bg-orange-500' },
                        { key: 'delivered', label: 'Delivered', color: 'bg-green-500' },
                        { key: 'cancelled', label: 'Cancelled', color: 'bg-red-400' },
                      ].map(({ key, label, color }) => {
                        const count = getStatusCount(key);
                        const pct   = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                        return (
                          <div key={key}>
                            <div className="flex justify-between mb-1 text-sm">
                              <span className="font-semibold text-gray-700">{label}</span>
                              <span className="text-gray-500">{count} · {pct}%</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div className={`h-full rounded-full ${color}`}
                                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
              }
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-fredoka text-lg font-bold text-gray-900 mb-4">Sales by Category</h3>
              {loading
                ? <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
                : catData.length === 0
                  ? <p className="text-gray-400 text-sm text-center py-6">No category data yet</p>
                  : (
                    <div className="space-y-3">
                      {catData.map(({ cat, pct, color, rev }) => (
                        <div key={cat}>
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="font-semibold text-gray-700">{cat}</span>
                            <span className="text-gray-500">₹{rev.toLocaleString('en-IN')} · {pct}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div className={`h-full rounded-full ${color}`}
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, ease: 'easeOut' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
              }
            </div>
          </div>

          {/* Top Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-fredoka text-lg font-bold text-gray-900">Top Performing Items</h3>
              <p className="text-sm text-gray-500 mt-0.5">Calculated from real order data</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">#</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Units Sold</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading
                    ? Array(4).fill(0).map((_, i) => (
                      <tr key={i}>{Array(4).fill(0).map((__, j) => (
                        <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${50 + j * 15}%` }} /></td>
                      ))}</tr>
                    ))
                    : topItems.length === 0
                      ? <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 text-sm">No item data yet</td></tr>
                      : topItems.map((item, i) => (
                        <tr key={item.name} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`text-sm font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-400'}`}>
                              #{i + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{item.orders}</td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{item.revenue.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Delivery Boys Tab ── */}
      {activeTab === 'delivery' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-fredoka text-lg font-bold text-gray-900">Delivery Boy Performance</h3>
            <p className="text-sm text-gray-500 mt-0.5">Orders delivered, total assigned, and average delivery time</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Boy</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Assigned</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Delivered</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Success Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading
                  ? Array(4).fill(0).map((_, i) => (
                    <tr key={i}>{Array(5).fill(0).map((__, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                  : dbStats.length === 0
                    ? <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">No delivery data yet — assign orders to delivery boys first</td></tr>
                    : dbStats.map(b => {
                      const rate = b.total > 0 ? Math.round((b.delivered / b.total) * 100) : 0;
                      return (
                        <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                {(b.name || 'B').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-sm text-gray-900">{b.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{b.total}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-700">{b.delivered}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-sm text-gray-700 font-semibold">{rate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {b.avgTime !== null ? `${b.avgTime} min` : '—'}
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Coupons Tab ── */}
      {activeTab === 'coupons' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-fredoka text-lg font-bold text-gray-900">Coupon Usage Stats</h3>
            <p className="text-sm text-gray-500 mt-0.5">How often each coupon was used and total savings given</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Coupon Code</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Times Used</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Total Discount Given</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading
                  ? Array(3).fill(0).map((_, i) => (
                    <tr key={i}>{Array(3).fill(0).map((__, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                  : couponStats.length === 0
                    ? <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400 text-sm">No coupon usage data yet</td></tr>
                    : couponStats.map(c => (
                      <tr key={c.code} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg text-sm">
                            {String(c.code).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{c.uses}×</td>
                        <td className="px-6 py-4 text-sm font-bold text-red-600">−₹{c.saved.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Customers Tab ── */}
      {activeTab === 'customers' && (
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Repeat vs New */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-fredoka text-lg font-bold text-gray-900 mb-4">Repeat vs New Customers</h3>
            {loading
              ? <SkeletonBar />
              : rvn.total === 0
                ? <p className="text-gray-400 text-sm text-center py-6">No customer data yet</p>
                : (
                  <div className="space-y-4">
                    {[
                      { label: 'Repeat Customers', count: rvn.repeat, color: 'bg-orange-500', icon: Repeat },
                      { label: 'New Customers',    count: rvn.newC,   color: 'bg-blue-400',   icon: UserPlus },
                    ].map(({ label, count, color, icon: Icon }) => {
                      const pct = rvn.total > 0 ? Math.round((count / rvn.total) * 100) : 0;
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon size={15} className="text-gray-500" />
                              <span className="text-sm font-semibold text-gray-700">{label}</span>
                            </div>
                            <span className="text-sm text-gray-500">{count} · {pct}%</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div className={`h-full rounded-full ${color}`}
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, ease: 'easeOut' }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="mt-4 p-4 bg-orange-50 rounded-xl">
                      <p className="text-sm text-orange-800 font-semibold">
                        Retention Rate: {rvn.total > 0 ? Math.round((rvn.repeat / rvn.total) * 100) : 0}%
                      </p>
                      <p className="text-xs text-orange-600 mt-0.5">Percentage of customers who ordered more than once</p>
                    </div>
                  </div>
                )
            }
          </div>

          {/* Customer Value Segments */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-fredoka text-lg font-bold text-gray-900 mb-4">Customer Quick Stats</h3>
            {loading
              ? <SkeletonBar />
              : (
                <div className="space-y-3">
                  {[
                    { label: 'Unique Customers',    value: rvn.total,                   color: 'text-gray-900' },
                    { label: 'Returning Customers',  value: rvn.repeat,                  color: 'text-orange-600' },
                    { label: 'One-Time Buyers',      value: rvn.newC,                    color: 'text-blue-600' },
                    { label: 'Avg Orders / Customer', value: rvn.total > 0 ? (totalOrders / rvn.total).toFixed(1) : '—', color: 'text-green-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className={`text-sm font-bold ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  );
}
