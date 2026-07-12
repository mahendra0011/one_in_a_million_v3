import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect } from 'react';
import { Save, Bell, Globe, CreditCard, Palette, Shield, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const TABS = [
  { id: 'general', label: 'General', Icon: Globe },
  { id: 'hours', label: 'Hours', Icon: Clock },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'payment', label: 'Payment', Icon: CreditCard },
  { id: 'appearance', label: 'Appearance', Icon: Palette },
  { id: 'security', label: 'Security', Icon: Shield },
];

export default function AdminSettings() {
  const [tab, setTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState('');

  // Core settings — persisted in DB via /api/settings
  const [coreSettings, setCoreSettings] = useState({
    restaurantName: '',
    address: '',
    phone: '',
    openTime: '11:00',
    closeTime: '23:00',
    deliveryRadius: 5,
    deliveryCharge: 39,
    minOrderAmount: 149,
    isOpen: true,
  });

  // UI-only settings (not persisted yet — kept for display)
  const [uiSettings, setUiSettings] = useState({
    tagline: 'Gourmet burgers made fresh to order',
    email: 'hello@oneinamillion.com',
    gstNumber: 'MP23XXXXXX',
    closedDays: [],
    emailNotif: true,
    smsNotif: true,
    newOrderSound: true,
    lowStockAlert: true,
    razorpay: true,
    upi: true,
    cod: true,
    theme: 'orange',
    allowReviews: true,
    maintenanceMode: false,
  });

  // Fetch settings from backend on mount
  useEffect(() => {
    setLoading(true);
    fetchWithTimeout('/api/settings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          const s = d.settings;
          setCoreSettings({
            restaurantName: s.restaurantName || '',
            address: s.address || '',
            phone: s.phone || '',
            openTime: s.openTime || '11:00',
            closeTime: s.closeTime || '23:00',
            deliveryRadius: s.deliveryRadius ?? 5,
            deliveryCharge: s.deliveryCharge ?? 39,
            minOrderAmount: s.minOrderAmount ?? 149,
            isOpen: s.isOpen ?? true,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateCore = (key, value) => setCoreSettings(s => ({ ...s, [key]: value }));
  const updateUi = (key, value) => setUiSettings(s => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetchWithTimeout('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(coreSettings),
      });
      const data = await res.json();
      if (data.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setSaveError(data.error || 'Save failed');
      }
    } catch {
      setSaveError('Network error — could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading settings…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-fredoka text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage restaurant configuration</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : saving
                ? 'bg-orange-400 text-white cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            } shadow-lg shadow-orange-600/20`}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saved ? '✅ Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <nav className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 h-fit">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-colors mb-0.5 ${
                tab === id ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          {/* ── GENERAL ─────────────────────────────────────────────── */}
          {tab === 'general' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-fredoka text-xl font-bold text-gray-900">General Information</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Restaurant Open</span>
                  <button
                    onClick={() => updateCore('isOpen', !coreSettings.isOpen)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${coreSettings.isOpen ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${coreSettings.isOpen ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                  <span className={`text-sm font-semibold ${coreSettings.isOpen ? 'text-green-600' : 'text-gray-400'}`}>
                    {coreSettings.isOpen ? '🟢 Open' : '🔴 Closed'}
                  </span>
                </div>
              </div>

              {/* Core fields */}
              {[
                { label: 'Restaurant Name', key: 'restaurantName', placeholder: 'One in a Million' },
                { label: 'Phone', key: 'phone', placeholder: '+91 9876543210', type: 'tel' },
                { label: 'Address', key: 'address', placeholder: 'Full address' },
              ].map(({ label, key, placeholder, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={coreSettings[key]}
                    onChange={e => updateCore(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
              ))}

              {/* UI-only fields */}
              {[
                { label: 'Email', key: 'email', placeholder: 'hello@example.com', type: 'email' },
                { label: 'Tagline', key: 'tagline', placeholder: 'Your tagline' },
                { label: 'GST Number', key: 'gstNumber', placeholder: 'XXXXXXXXXXXX' },
              ].map(({ label, key, placeholder, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={uiSettings[key]}
                    onChange={e => updateUi(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
              ))}

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Delivery Radius (km)', key: 'deliveryRadius', core: true },
                  { label: 'Min. Order (₹)', key: 'minOrderAmount', core: true },
                  { label: 'Delivery Fee (₹)', key: 'deliveryCharge', core: true },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                    <input
                      type="number"
                      value={coreSettings[key]}
                      onChange={e => updateCore(key, Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm"
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                ⚡ Restaurant Name, Phone, Address, Delivery Radius, Delivery Fee, Min Order &amp; Open status are saved to the database and reflected live across the app.
              </p>
            </div>
          )}

          {/* ── HOURS ───────────────────────────────────────────────── */}
          {tab === 'hours' && (
            <div className="space-y-5">
              <h3 className="font-fredoka text-xl font-bold text-gray-900">Operating Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Opening Time</label>
                  <input
                    type="time"
                    value={coreSettings.openTime}
                    onChange={e => updateCore('openTime', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Closing Time</label>
                  <input
                    type="time"
                    value={coreSettings.closeTime}
                    onChange={e => updateCore('closeTime', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Closed Days</p>
                <div className="flex flex-wrap gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                    const closed = uiSettings.closedDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() =>
                          updateUi('closedDays', closed
                            ? uiSettings.closedDays.filter(d => d !== day)
                            : [...uiSettings.closedDays, day])
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                          closed ? 'bg-red-50 border-red-300 text-red-600' : 'bg-green-50 border-green-200 text-green-700'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {uiSettings.closedDays.length === 0 ? 'Open all 7 days' : `Closed on: ${uiSettings.closedDays.join(', ')}`}
                </p>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ───────────────────────────────────────── */}
          {tab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="font-fredoka text-xl font-bold text-gray-900">Notification Preferences</h3>
              {[
                { key: 'emailNotif', label: 'Email Notifications', desc: 'Get notified via email for new orders' },
                { key: 'smsNotif', label: 'SMS Notifications', desc: 'Receive SMS for order updates' },
                { key: 'newOrderSound', label: 'New Order Sound', desc: 'Play a sound when a new order arrives' },
                { key: 'lowStockAlert', label: 'Low Stock Alert', desc: 'Alert when menu items run low' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <button
                    onClick={() => updateUi(key, !uiSettings[key])}
                    className={`w-12 h-6 rounded-full transition-colors relative ${uiSettings[key] ? 'bg-orange-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${uiSettings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── PAYMENT ─────────────────────────────────────────────── */}
          {tab === 'payment' && (
            <div className="space-y-4">
              <h3 className="font-fredoka text-xl font-bold text-gray-900">Payment Methods</h3>
              {[
                { key: 'razorpay', label: 'Razorpay (Card/UPI/NetBanking)', desc: 'Accept cards, UPI, and net banking via Razorpay', icon: '💳' },
                { key: 'upi', label: 'Direct UPI', desc: 'Accept UPI payments directly', icon: '📱' },
                { key: 'cod', label: 'Cash on Delivery', desc: 'Allow customers to pay with cash', icon: '💵' },
              ].map(({ key, label, desc, icon }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{label}</p>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateUi(key, !uiSettings[key])}
                    className={`w-12 h-6 rounded-full transition-colors relative ${uiSettings[key] ? 'bg-orange-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${uiSettings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── APPEARANCE ──────────────────────────────────────────── */}
          {tab === 'appearance' && (
            <div className="space-y-5">
              <h3 className="font-fredoka text-xl font-bold text-gray-900">Appearance</h3>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Brand Color Theme</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'orange', label: 'Flame Orange', color: 'bg-orange-500' },
                    { id: 'red', label: 'Burger Red', color: 'bg-red-500' },
                    { id: 'amber', label: 'Honey Amber', color: 'bg-amber-500' },
                    { id: 'teal', label: 'Mint Teal', color: 'bg-teal-500' },
                  ].map(({ id, label, color }) => (
                    <button
                      key={id}
                      onClick={() => updateUi('theme', id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        uiSettings.theme === id ? 'border-gray-900' : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full ${color}`} />
                      <span className="text-xs font-semibold text-gray-700">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">Allow Reviews</p>
                  <p className="text-sm text-gray-500">Let customers post public reviews</p>
                </div>
                <button
                  onClick={() => updateUi('allowReviews', !uiSettings.allowReviews)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${uiSettings.allowReviews ? 'bg-orange-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${uiSettings.allowReviews ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          )}

          {/* ── SECURITY ────────────────────────────────────────────── */}
          {tab === 'security' && (
            <div className="space-y-5">
              <h3 className="font-fredoka text-xl font-bold text-gray-900">Security Settings</h3>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <span className="text-2xl mt-0.5">⚠️</span>
                <div>
                  <p className="font-semibold text-amber-800">Maintenance Mode</p>
                  <p className="text-sm text-amber-700">Enabling this will show a maintenance page to customers.</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => updateUi('maintenanceMode', !uiSettings.maintenanceMode)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${uiSettings.maintenanceMode ? 'bg-red-500' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${uiSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`text-sm font-semibold ${uiSettings.maintenanceMode ? 'text-red-600' : 'text-gray-500'}`}>
                      {uiSettings.maintenanceMode ? '🔴 Maintenance ON' : '🟢 Site Live'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Change Admin Password</label>
                  <input type="password" placeholder="Current password"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm mb-2" />
                  <input type="password" placeholder="New password"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm mb-2" />
                  <input type="password" placeholder="Confirm new password"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm" />
                  <button className="mt-3 px-5 py-2 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors">
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
