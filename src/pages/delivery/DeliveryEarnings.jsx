import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, Package, Calendar,
  RefreshCw, Clock, ChevronRight, Star, MapPin, Navigation
} from 'lucide-react';
import { motion } from 'framer-motion';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function StatCard({ label, count, commission, orderTotal, color, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-[#1A1310] rounded-2xl border border-white/5 p-4 space-y-3`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <span className="text-[#8E827B] text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>

      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-white text-3xl font-bold">{count}</span>
          <span className="text-[#8E827B] text-sm">deliveries</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
        <div>
          <p className="text-[#8E827B] text-[10px] uppercase tracking-wide mb-0.5">Order Value</p>
          <p className="text-white font-bold text-sm">₹{orderTotal.toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-[#8E827B] text-[10px] uppercase tracking-wide mb-0.5">My Earnings</p>
          <p className="text-[#F07D14] font-bold text-sm">₹{commission.toLocaleString('en-IN')}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function DeliveryEarnings() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('bim_user') || 'null'); } catch { return null; } })();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'history'

  const fetchEarnings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetchWithTimeout('/api/delivery/earnings', { credentials: 'include' });
      const json = await res.json();
      if (json.ok) setData(json);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!user) { navigate('/delivery/login'); return; }
    fetchEarnings();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0604]">
      {/* Header */}
      <div className="bg-[#1A1310] border-b border-white/5 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/delivery')}
              className="p-2 rounded-xl bg-[#16100D] border border-white/5 text-[#8E827B] hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <p className="text-white font-bold text-sm">Earnings & History</p>
              <p className="text-[#8E827B] text-xs">{user?.name}</p>
            </div>
          </div>
          <button
            onClick={() => fetchEarnings(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-[#16100D] border border-white/5 text-[#8E827B] hover:text-white transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 pt-5">
        <div className="flex bg-[#1A1310] rounded-xl p-1 border border-white/5 mb-5">
          {[
            { id: 'stats', label: '📊 Stats' },
            { id: 'history', label: '📋 History' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#F07D14] text-white shadow'
                  : 'text-[#8E827B] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 bg-[#1A1310] rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : !data ? (
          <div className="text-center py-16">
            <p className="text-[#8E827B] text-sm">Data load nahi ho saka. Retry karo.</p>
          </div>
        ) : activeTab === 'stats' ? (
          <div className="space-y-3">
            {/* Commission info banner */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 bg-[#F07D14]/10 border border-[#F07D14]/20 rounded-xl px-3 py-2.5"
            >
              <Star size={13} className="text-[#F07D14] shrink-0" />
              <p className="text-[#A39791] text-xs">
                Commission rate: <span className="text-[#F07D14] font-bold">{Math.round((data.commissionRate || 0.10) * 100)}%</span> per order total
              </p>
            </motion.div>

            <StatCard
              label="Aaj"
              count={data.today.count}
              commission={data.today.commission}
              orderTotal={data.today.orderTotal}
              color="bg-blue-500"
              icon={Clock}
              delay={0.05}
            />
            <StatCard
              label="Is Hafte"
              count={data.thisWeek.count}
              commission={data.thisWeek.commission}
              orderTotal={data.thisWeek.orderTotal}
              color="bg-purple-500"
              icon={Calendar}
              delay={0.1}
            />
            <StatCard
              label="Is Mahine"
              count={data.thisMonth.count}
              commission={data.thisMonth.commission}
              orderTotal={data.thisMonth.orderTotal}
              color="bg-[#F07D14]"
              icon={TrendingUp}
              delay={0.15}
            />

            {/* Quick jump to history */}
            <button
              onClick={() => setActiveTab('history')}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#1A1310] rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package size={14} className="text-[#8E827B]" />
                <span className="text-[#A39791] text-sm font-medium">Recent deliveries dekho</span>
              </div>
              <ChevronRight size={14} className="text-[#8E827B]" />
            </button>
          </div>
        ) : (
          /* History Tab */
          <div className="space-y-3">
            {data.recentOrders.length === 0 ? (
              <div className="text-center py-16 bg-[#1A1310] rounded-2xl border border-white/5">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-white font-bold text-sm">Abhi tak koi delivery nahi</p>
                <p className="text-[#8E827B] text-xs mt-1">Pehli delivery karo, earnings yahaan dikhegi</p>
              </div>
            ) : (
              <>
                <p className="text-[#8E827B] text-xs font-semibold uppercase tracking-wide">
                  Last {data.recentOrders.length} Deliveries
                </p>
                {data.recentOrders.map((order, i) => (
                  <motion.div
                    key={order.orderId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-[#1A1310] rounded-2xl border border-white/5 px-4 py-3 space-y-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                        <Package size={14} className="text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{order.orderId}</p>
                        <p className="text-[#8E827B] text-xs">
                          {order.customerName && <span>{order.customerName} · </span>}
                          {formatDate(order.date)} {formatTime(order.date)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[#F07D14] font-bold text-sm">+₹{order.commission}</p>
                        <p className="text-[#8E827B] text-[11px]">of ₹{Math.round(order.total)}</p>
                      </div>
                    </div>
                    {/* Location + Rating row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.deliveryAddress && (
                        <div className="flex items-center gap-1 bg-[#16100D] rounded-lg px-2 py-1">
                          <MapPin size={10} className="text-[#F07D14] shrink-0" />
                          <span className="text-[#8E827B] text-[11px] truncate max-w-[160px]">{order.deliveryAddress}</span>
                        </div>
                      )}
                      {order.customerLocation?.lat && (
                        <a
                          href={`https://maps.google.com/?q=${order.customerLocation.lat},${order.customerLocation.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-[#16100D] rounded-lg px-2 py-1 hover:bg-[#1E1511] transition-colors"
                        >
                          <Navigation size={10} className="text-[#F07D14]" />
                          <span className="text-[#F07D14] text-[11px] font-medium">Map</span>
                        </a>
                      )}
                      {order.deliveryRating && (
                        <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={9} className={s <= order.deliveryRating ? 'text-yellow-400 fill-yellow-400' : 'text-[#4A3F38]'} />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
