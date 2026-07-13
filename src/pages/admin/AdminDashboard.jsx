import SEOHead from '../../components/SEOHead';
import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, ShoppingBag, Calendar, Users, TrendingUp, TrendingDown,
  Clock, Bell, Truck, AlertTriangle, Bike, BarChart2, Star, Flame,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { SkeletonCard, SkeletonTable } from '../../components/admin/SkeletonRow';
import { useSocket } from '../../hooks/useSocket';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

// ── Tiny inline bar-chart component (no recharts dep needed) ─────────────────
function MiniBar({ value, max, color = '#F07D14' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Weekly bar chart ──────────────────────────────────────────────────────────
function WeeklyChart({ data, mode = 'revenue' }) {
  if (!data?.length) return <div className="h-36 flex items-center justify-center text-gray-400 text-sm">No data yet</div>;
  const values = data.map(d => mode === 'revenue' ? d.revenue : d.orders);
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1.5 h-36 w-full">
      {data.map((d, i) => {
        const h = Math.max(4, Math.round((values[i] / max) * 128));
        const isToday = i === data.length - 1;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {d.label}<br />
              {mode === 'revenue' ? `₹${d.revenue.toLocaleString('en-IN')}` : `${d.orders} orders`}
            </div>
            <div
              className="w-full rounded-t-md transition-all duration-700"
              style={{ height: `${h}px`, backgroundColor: isToday ? '#F07D14' : '#FED7AA' }}
            />
            <span className="text-[9px] text-gray-500 truncate w-full text-center">{d.label.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Peak hours chart ─────────────────────────────────────────────────────────
function PeakHoursChart({ data }) {
  if (!data?.length) return <div className="h-24 flex items-center justify-center text-gray-400 text-sm">No data yet</div>;
  // Show only 6am–11pm range
  const visible = data.filter(d => d.hour >= 6 && d.hour <= 23);
  const max = Math.max(...visible.map(d => d.count), 1);
  const peakHour = visible.reduce((best, d) => d.count > best.count ? d : best, visible[0]);
  return (
    <div>
      <div className="flex items-end gap-1 h-20 w-full mb-1">
        {visible.map(d => {
          const h = Math.max(2, Math.round((d.count / max) * 72));
          const isPeak = d.hour === peakHour?.hour;
          return (
            <div key={d.hour} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {d.label}: {d.count}
              </div>
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{ height: `${h}px`, backgroundColor: isPeak ? '#EF4444' : '#FDBA74' }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 px-0.5">
        <span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
      </div>
      {peakHour && (
        <p className="text-xs text-gray-600 mt-2">
          🔥 Peak: <span className="font-bold text-red-500">{peakHour.label}</span> — {peakHour.count} orders this week
        </p>
      )}
    </div>
  );
}

// ── Delta badge ──────────────────────────────────────────────────────────────
function Delta({ current, previous, prefix = '', suffix = '' }) {
  if (!previous && !current) return null;
  const diff = current - previous;
  const pct  = previous > 0 && previous !== undefined ? Math.round((diff / previous) * 100) : null;
  if (diff === 0) return <span className="text-xs text-gray-400 flex items-center gap-0.5"><Minus size={11} /> Same as yesterday</span>;
  const up = diff > 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {prefix}{Math.abs(diff).toLocaleString('en-IN')}{suffix}
      {pct !== null && ` (${pct > 0 ? '+' : ''}${pct}%)`}
      {' vs yesterday'}
    </span>
  );
}

const STATUS_STYLE = {
  delivered:          'bg-green-100 text-green-700',
  preparing:          'bg-yellow-100 text-yellow-700',
  cancelled:          'bg-red-100 text-red-600',
  confirmed:          'bg-blue-100 text-blue-700',
  pending:            'bg-gray-100 text-gray-600',
  reached_restaurant: 'bg-purple-100 text-purple-700',
  picked_up:          'bg-indigo-100 text-indigo-700',
  out_for_delivery:   'bg-orange-100 text-orange-700',
};
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

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [liveToast, setLiveToast] = useState(null);
  const [weekMode, setWeekMode] = useState('revenue'); // 'revenue' | 'orders'

  const fetchAll = useCallback(async () => {
    setFetchError('');
    const aRes = await fetchWithTimeout('/api/analytics', { credentials: 'include' }).catch(() => null);
    if (aRes?.ok) {
      const d = await aRes.json();
      setAnalytics(d);
      setRecentOrders((d.recentOrders || []).slice(0, 8));
    } else {
      setFetchError('Could not load analytics — check your connection');
    }
    setLoading(false);
  }, []);

  useEffect(() => { queueMicrotask(fetchAll); }, [fetchAll]);

  const showToast = (msg) => {
    setLiveToast(msg);
    setTimeout(() => setLiveToast(null), 4500);
  };

  useSocket({
    joinAdmin: true,
    onNewOrder: (order) => {
      showToast(`🛒 New order from ${order.customer?.name || 'customer'}!`);
      setRecentOrders(prev => {
        const exists = prev.some(o => o._id === order._id || o.orderId === order.orderId);
        return exists ? prev.map(o => (o._id === order._id || o.orderId === order.orderId) ? order : o) : [order, ...prev].slice(0, 8);
      });
      setAnalytics(prev => prev ? {
        ...prev,
        totalOrders:    (prev.totalOrders    || 0) + 1,
        todayOrders:    (prev.todayOrders    || 0) + 1,
        totalRevenue:   (prev.totalRevenue   || 0) + Math.round(order.totals?.total || 0),
        todayRevenue:   (prev.todayRevenue   || 0) + Math.round(order.totals?.total || 0),
        pendingCount:   (prev.pendingCount   || 0) + 1,
      } : prev);
    },
    onNewReservation: (res) => {
      showToast(`📅 New reservation by ${res.name || 'guest'}!`);
      setAnalytics(prev => prev ? { ...prev, totalReservations: (prev.totalReservations || 0) + 1 } : prev);
    },
    onOrderUpdated: (order) => {
      let oldStatus;
      setRecentOrders(prev => {
        const match = prev.find(o => o._id === order._id || o.orderId === order.orderId);
        oldStatus = match?.status;
        return prev.map(o => (o._id === order._id || o.orderId === order.orderId) ? order : o);
      });
      // Update live counters based on the actual status transition, so counts
      // decrement when an order leaves 'pending'/'out_for_delivery', not just increment forever.
      setAnalytics(prev => {
        if (!prev) return prev;
        let { outForDeliveryCount = 0, pendingCount = 0 } = prev;
        if (oldStatus !== order.status) {
          if (oldStatus === 'out_for_delivery') outForDeliveryCount = Math.max(0, outForDeliveryCount - 1);
          if (oldStatus === 'pending')           pendingCount = Math.max(0, pendingCount - 1);
          if (order.status === 'out_for_delivery') outForDeliveryCount++;
          if (order.status === 'pending')           pendingCount++;
        }
        return { ...prev, outForDeliveryCount, pendingCount };
      });
    },
  });

  // Periodic resync as a safety net — socket-driven increments/decrements above keep
  // counters live, but this guarantees they can't drift if an event is ever missed.
  useAutoRefresh({ fetchFn: fetchAll, interval: 60_000 });

  const a = analytics || {};

  // ── Top stat cards ─────────────────────────────────────────────────────────
  const statCards = [
    {
      label: "Today's Revenue",
      value: `₹${(a.todayRevenue || 0).toLocaleString('en-IN')}`,
      sub: <Delta current={a.todayRevenue || 0} previous={a.yesterdayRevenue || 0} prefix="₹" />,
      icon: DollarSign, color: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-200',
    },
    {
      label: "Today's Orders",
      value: a.todayOrders ?? '—',
      sub: <Delta current={a.todayOrders || 0} previous={a.yesterdayOrders || 0} suffix=" orders" />,
      icon: ShoppingBag, color: 'bg-orange-100 text-orange-600', ring: 'ring-orange-200',
    },
    {
      label: 'Avg Order Value',
      value: `₹${(a.avgOrderValue || 0).toLocaleString('en-IN')}`,
      sub: <span className="text-xs text-gray-400">Per delivered order</span>,
      icon: TrendingUp, color: 'bg-violet-100 text-violet-600', ring: 'ring-violet-200',
    },
    {
      label: 'Total Revenue',
      value: `₹${(a.totalRevenue || 0).toLocaleString('en-IN')}`,
      sub: <span className="text-xs text-gray-400">{a.totalOrders || 0} orders all time</span>,
      icon: BarChart2, color: 'bg-sky-100 text-sky-600', ring: 'ring-sky-200',
    },
  ];

  // ── Live operations bar ───────────────────────────────────────────────────
  const pendingCount       = a.pendingCount       || 0;
  const outForDelivery     = a.outForDeliveryCount || 0;
  const activeDeliveryBoys = a.activeDeliveryBoys  || 0;

  return (
    <div className="space-y-6">
      <SEOHead title="Admin Dashboard" noindex />

      {/* ── Live toast ─────────────────────────────────────────────────────── */}
      {liveToast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce-in">
          <Bell size={16} className="text-orange-400 shrink-0" />
          <span className="text-sm font-semibold">{liveToast}</span>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-fredoka text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Real-time overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        {loading && <span className="text-sm text-gray-400 animate-pulse">Loading...</span>}
        {!loading && fetchError && <span className="text-sm text-red-500 font-semibold">⚠️ Connection issue</span>}
      </div>

      {/* ── Fetch Error Banner ────────────────────────────────────────────── */}
      {!loading && fetchError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-semibold">{fetchError}</p>
          <button onClick={fetchAll} className="ml-auto text-xs font-bold text-red-600 underline whitespace-nowrap">Retry</button>
        </div>
      )}

{/* ── PENDING ALERT ──────────────────────────────────────────────────── */}
       {!loading && pendingCount >= 3 && (
         <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-3.5">
           <AlertTriangle size={20} className="text-amber-500 shrink-0 animate-pulse" />
           <div>
            <p className="font-bold text-amber-800 text-sm">
              ⚠️ {pendingCount} order{pendingCount > 1 ? 's' : ''} waiting for confirmation!
            </p>
            <p className="text-amber-600 text-xs mt-0.5">Review pending orders in the Orders section to avoid delays.</p>
          </div>
          <a href="/admin/orders" className="ml-auto text-xs font-bold text-amber-700 underline whitespace-nowrap">View Orders →</a>
        </div>
      )}

      {/* ── Today stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((s, i) => (
            <div key={i} className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 ring-1 ${s.ring}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                  <p className="text-2xl font-fredoka font-bold text-gray-900 mt-0.5 truncate">{s.value}</p>
                  <div className="mt-1.5">{s.sub}</div>
                </div>
                <div className={`p-2.5 rounded-xl shrink-0 ${s.color}`}>
                  <s.icon size={18} />
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* ── LIVE OPERATIONS ROW ────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Pending orders */}
          <div className={`rounded-xl p-4 border flex items-center gap-4 ${pendingCount >= 5 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
            <div className={`p-3 rounded-xl ${pendingCount >= 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pending Orders</p>
              <p className={`text-3xl font-fredoka font-bold ${pendingCount >= 5 ? 'text-red-600' : 'text-gray-900'}`}>{pendingCount}</p>
              {pendingCount >= 5 && <p className="text-xs text-red-500 font-semibold">Needs attention!</p>}
            </div>
          </div>
          {/* Out for delivery */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Out for Delivery</p>
              <p className="text-3xl font-fredoka font-bold text-indigo-600">{outForDelivery}</p>
              <p className="text-xs text-gray-400">Live orders in transit</p>
            </div>
          </div>
          {/* Active delivery boys */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100 text-green-600">
              <Bike size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Active Delivery Boys</p>
              <p className="text-3xl font-fredoka font-bold text-green-600">{activeDeliveryBoys}</p>
              <p className="text-xs text-gray-400">of {a.totalDeliveryBoys || 0} total online</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CHARTS ROW ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Weekly Revenue / Orders graph */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-fredoka text-lg font-bold text-gray-900">This Week vs Last Week</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                This week:&nbsp;
                <span className="font-bold text-orange-600">
                  {weekMode === 'revenue'
                    ? `₹${(a.thisWeekRevenue || 0).toLocaleString('en-IN')}`
                    : `${a.thisWeekOrders || 0} orders`}
                </span>
                &nbsp;·&nbsp;
                {weekMode === 'revenue' ? (
                  <Delta current={a.thisWeekRevenue || 0} previous={a.prevWeekRevenue || 0} prefix="₹" />
                ) : (
                  <Delta current={a.thisWeekOrders || 0} previous={a.prevWeekOrders || 0} suffix=" orders" />
                )}
              </p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {['revenue', 'orders'].map(m => (
                <button key={m} onClick={() => setWeekMode(m)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-all ${weekMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          {loading
            ? <div className="h-36 bg-gray-100 rounded-lg animate-pulse" />
            : <WeeklyChart data={a.weeklyData || []} mode={weekMode} />
          }
        </div>

        {/* Peak hours chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-fredoka text-lg font-bold text-gray-900 mb-1">Peak Hours</h2>
          <p className="text-xs text-gray-400 mb-4">Orders by hour (last 7 days, IST)</p>
          {loading
            ? <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            : <PeakHoursChart data={a.peakHours || []} />
          }
        </div>
      </div>

      {/* ── TOP ITEMS + USERS ROW ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 5 items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-fredoka text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Flame size={18} className="text-orange-500" /> Top 5 Items
          </h2>
          {loading ? (
            <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : !a.topItems?.length ? (
            <p className="text-gray-400 text-sm">No order data yet</p>
          ) : (
            <div className="space-y-3">
              {a.topItems.map((item, i) => {
                const max = a.topItems[0]?.qty || 1;
                const medals = ['🥇','🥈','🥉'];
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{medals[i] || `${i+1}.`}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800 truncate">{item.name}</span>
                        <span className="text-xs text-gray-500 ml-2 shrink-0">{item.qty} sold</span>
                      </div>
                      <MiniBar value={item.qty} max={max} color={i === 0 ? '#F07D14' : '#FDBA74'} />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 shrink-0">₹{item.revenue.toLocaleString('en-IN')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-fredoka text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star size={18} className="text-yellow-500" /> Overview
          </h2>
          {loading ? (
            <div className="space-y-3">{Array(6).fill(0).map((_, i) => <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2.5">
              {[
                { label: 'Total Orders (all time)', value: a.totalOrders?.toLocaleString('en-IN') || '0', icon: ShoppingBag },
                { label: 'Total Revenue (all time)', value: `₹${(a.totalRevenue || 0).toLocaleString('en-IN')}`, icon: DollarSign },
                { label: 'Registered Customers', value: a.totalUsers?.toLocaleString('en-IN') || '0', icon: Users },
                { label: 'Total Reservations', value: a.totalReservations?.toLocaleString('en-IN') || '0', icon: Calendar },
                { label: 'Delivery Boys (total)', value: a.totalDeliveryBoys || '0', icon: Bike },
                { label: 'Avg Order Value', value: `₹${a.avgOrderValue || 0}`, icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Icon size={14} className="text-gray-400" />
                    {label}
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Orders ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-fredoka text-xl font-bold text-gray-900">Recent Orders</h2>
          <span className="text-xs text-gray-400 flex items-center gap-1"><Bell size={11} /> Live updates enabled</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                {['Order ID','Customer','Items','Total','Status','Time'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <SkeletonTable rows={5} cols={6} />}
              {!loading && recentOrders.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">No orders yet</td></tr>
              )}
              {!loading && recentOrders.map((order, i) => (
                <tr key={order._id || order.orderId || i} className={`hover:bg-gray-50 transition-colors ${order.status === 'pending' ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-5 py-3.5 text-sm font-mono font-semibold text-gray-900">
                    {String(order.orderId || order._id || '').slice(-8).toUpperCase()}
                    {order.status === 'pending' && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">NEW</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{order.customer?.name || order.customer?.email || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{order.items?.length || 0} items</td>
                  <td className="px-5 py-3.5 text-sm font-bold text-gray-900">₹{Math.round(order.totals?.total || 0)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[order.status] || (order.status || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
