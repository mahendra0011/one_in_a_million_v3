import { fetchWithTimeout } from '../../lib/utils';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Utensils, ClipboardList, Calendar, Users, Bike, BarChart3, Settings2, LogOut, ExternalLink, Tag, MessageSquare, Bell, Menu, X } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { logout } from '../../store/slices/authSlice';
import { useDispatch } from 'react-redux';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/menu', icon: Utensils, label: 'Menu' },
  { to: '/admin/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/admin/reservations', icon: Calendar, label: 'Reservations' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
  { to: '/admin/delivery-boys', icon: Bike, label: 'Delivery Boys' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/coupons', icon: Tag, label: 'Coupons' },
  { to: '/admin/reviews', icon: MessageSquare, label: 'Reviews' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { to: '/admin/settings', icon: Settings2, label: 'Settings' },
];

// Bottom nav shows only the most important 5 items on mobile
const bottomNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Home', exact: true },
  { to: '/admin/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/admin/menu', icon: Utensils, label: 'Menu' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Stats' },
  { to: '/admin/notifications', icon: Bell, label: 'Alerts' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global admin socket — exposes isConnected for the live indicator.
  // Child pages also call useSocket independently; socket.io-client reuses
  // the same underlying TCP connection via its internal manager.
  const { isConnected } = useSocket({ joinAdmin: true });

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem('bim_user') || 'null'); } catch { return null; }
  })();

  const handleLogout = async () => {
    try {
      await fetchWithTimeout('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.removeItem('bim_user');
    dispatch(logout());
    navigate('/admin/login');
  };

  const isActive = (item) => item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);

  return (
    <div className="min-h-screen bg-[#0A0604] flex">

      {/* ── Mobile overlay ────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (hidden on mobile unless open) ────────────────────── */}
      <aside className={`
        w-64 bg-[#1A1310] border-r border-white/10 flex flex-col fixed top-0 left-0 h-full z-50
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white text-xl shadow-lg">
              🍔
            </div>
            <div>
              <span className="font-fredoka text-lg font-bold text-white">OneInAMillion</span>
              <span className="block text-xs text-[#8E827B]">Admin Panel</span>
            </div>
          </Link>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#8E827B] hover:bg-[#241A16]"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-auto p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive(item)
                  ? 'bg-[#F07D14]/15 text-[#F07D14] border border-[#F07D14]/25'
                  : 'text-[#C9B8AF] hover:bg-white/5'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Admin user info + actions */}
        <div className="p-3 border-t border-white/5 space-y-1">
          {adminUser && (
            <div className="px-3 py-2 mb-1 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{adminUser.name || 'Admin'}</p>
                <p className="text-xs text-[#8E827B] truncate">{adminUser.email}</p>
              </div>
              {/* Live indicator */}
              <div
                className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-full"
                style={{ background: isConnected ? '#052e16' : '#1A1310' }}
                title={isConnected ? 'Real-time updates active' : 'Connecting to live updates...'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-[#4B3F38]'}`} />
                <span className="text-[10px] font-semibold" style={{ color: isConnected ? '#4ade80' : '#8E827B' }}>
                  {isConnected ? 'Live' : '...'}
                </span>
              </div>
            </div>
          )}
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#8E827B] hover:bg-white/5 transition-colors"
          >
            <ExternalLink size={18} />
            View Store
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto lg:ml-64 pb-16 lg:pb-0 bg-white">

        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 bg-gray-50 border-b border-gray-200 flex items-center gap-3 px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white text-sm">
              🍔
            </div>
            <span className="font-fredoka font-bold text-gray-900 text-base truncate">OneInAMillion Admin</span>
          </div>
          {/* Live socket indicator */}
          <div className="flex items-center gap-1.5 shrink-0" title={isConnected ? 'Live updates connected' : 'Connecting...'}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-[10px] font-semibold hidden sm:block" style={{ color: isConnected ? '#22c55e' : '#666666' }}>
              {isConnected ? 'Live' : 'Connecting'}
            </span>
          </div>
          {adminUser && (
            <span className="text-xs text-gray-600 truncate max-w-[80px] hidden sm:block">{adminUser.name}</span>
          )}
        </div>

        <div className="p-4 lg:p-6 xl:p-8">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom navigation ──────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex lg:hidden">
        {bottomNavItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? 'text-orange-600' : 'text-gray-600'
              }`}
            >
              <item.icon size={20} className={active ? 'text-orange-600' : ''} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {/* "More" button opens sidebar */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold text-gray-600"
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>

    </div>
  );
}