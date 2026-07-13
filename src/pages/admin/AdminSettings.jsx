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
  const [fetchError, setFetchError] = useState('');

  const [settings, setSettings] = useState({
    restaurantName: '',
    address: '',
    phone: '',
    openTime: '11:00',
    closeTime: '23:00',
    deliveryRadius: 5,
    deliveryCharge: 39,
    minOrderAmount: 149,
    isOpen: true,
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
    tagline: 'Gourmet burgers made fresh to order',
    email: 'hello@oneinamillion.com',
    gstNumber: '',
    closedDays: [],
  });

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      fetchWithTimeout('/api/settings', { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            const s = d.settings;
            setSettings({
              restaurantName: s.restaurantName || '',
              address: s.address || '',
              phone: s.phone || '',
              openTime: s.openTime || '11:00',
              closeTime: s.closeTime || '23:00',
              deliveryRadius: s.deliveryRadius ?? 5,
              deliveryCharge: s.deliveryCharge ?? 39,
              minOrderAmount: s.minOrderAmount ?? 149,
              isOpen: s.isOpen ?? true,
              emailNotif: s.emailNotif ?? true,
              smsNotif: s.smsNotif ?? true,
              newOrderSound: s.newOrderSound ?? true,
              lowStockAlert: s.lowStockAlert ?? true,
              razorpay: s.razorpayEnabled ?? true,
              upi: s.upiEnabled ?? true,
              cod: s.codEnabled ?? true,
              theme: s.theme || 'orange',
              allowReviews: s.allowReviews ?? true,
              maintenanceMode: s.maintenanceMode ?? false,
              tagline: s.tagline || 'Gourmet burgers made fresh to order',
              email: s.email || 'hello@oneinamillion.com',
              gstNumber: s.gstNumber || 'MP23XXXXXX',
              closedDays: s.closedDays || [],
            });
          }
        })
        .catch(() => setFetchError('Could not load settings — using defaults'))
        .finally(() => setLoading(false));
    });
  }, []);

  const updateSetting = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        restaurantName: settings.restaurantName,
        address: settings.address,
        phone: settings.phone,
        openTime: settings.openTime,
        closeTime: settings.closeTime,
        deliveryRadius: settings.deliveryRadius,
        deliveryCharge: settings.deliveryCharge,
        minOrderAmount: settings.minOrderAmount,
        isOpen: settings.isOpen,
        emailNotif: settings.emailNotif,
        smsNotif: settings.smsNotif,
        newOrderSound: settings.newOrderSound,
        lowStockAlert: settings.lowStockAlert,
        razorpayEnabled: settings.razorpay,
        upiEnabled: settings.upi,
        codEnabled: settings.cod,
        theme: settings.theme,
        allowReviews: settings.allowReviews,
        maintenanceMode: settings.maintenanceMode,
        tagline: settings.tagline,
        email: settings.email,
        gstNumber: settings.gstNumber,
        closedDays: settings.closedDays,
      };
      const res = await fetchWithTimeout('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
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

  if (fetchError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <span>⚠️ {fetchError}</span>
          <button onClick={() => { setFetchError(''); setLoading(true); window.location.reload(); }} 
            className="ml-auto text-xs font-bold text-red-600 underline">Retry</button>
        </div>
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

        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          {tab === 'general' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-fredoka text-xl font-bold text-gray-900">General Information</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Restaurant Open</span>
                  <button
                    onClick={() => updateSetting('isOpen', !settings.isOpen)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.isOpen ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.isOpen ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                  <span className={`text-sm font-semibold ${settings.isOpen ? 'text-green-600' : 'text-gray-400'}`}>
                    {settings.isOpen ? '🟢 Open' : '🔴 Closed'}
                  </span>
                </div>
              </div>

              {[
                { label: 'Restaurant Name', key: 'restaurantName', placeholder: 'One in a Million' },
                { label: 'Phone', key: 'phone', placeholder: '+91 9876543210', type: 'tel' },
                { label: 'Address', key: 'address', placeholder: 'Full address' },
                { label: 'Email', key: 'email', placeholder: 'hello@example.com', type: 'email' },
                { label: 'Tagline', key: 'tagline', placeholder: 'Your tagline' },
                { label: 'GST Number', key: 'gstNumber', placeholder: 'XXXXXXXXXXXX' },
              ].map(({ label, key, placeholder, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={settings[key]}
                    onChange={e => updateSetting(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
              ))}

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Delivery Radius (km)', key: 'deliveryRadius' },
                  { label: 'Min. Order (₹)', key: 'minOrderAmount' },
                  { label: 'Delivery Fee (₹)', key: 'deliveryCharge' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                    <input
                      type="number"
                      value={settings[key]}
                      onChange={e => updateSetting(key, Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm"
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                ⚡ All settings are saved to the database and reflected across the app.
              </p>
            </div>
          )}

          {tab === 'hours' && (
            <div className="space-y-5">
              <h3 className="font-fredoka text-xl font-bold text-gray-900">Operating Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Opening Time</label>
                  <input
                    type="time"
                    value={settings.openTime}
                    onChange={e => updateSetting('openTime', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Closing Time</label>
                  <input
                    type="time"
                    value={settings.closeTime}
                    onChange={e => updateSetting('closeTime', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Closed Days</p>
                <div className="flex flex-wrap gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                    const closed = settings.closedDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() =>
                          updateSetting('closedDays', closed
                            ? settings.closedDays.filter(d => d !== day)
                            : [...settings.closedDays, day])
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
                  {settings.closedDays.length === 0 ? 'Open all 7 days' : `Closed on: ${settings.closedDays.join(', ')}`}
                </p>
              </div>
            </div>
          )}

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
                    onClick={() => updateSetting(key, !settings[key])}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings[key] ? 'bg-orange-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

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
                    onClick={() => updateSetting(key, !settings[key])}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings[key] ? 'bg-orange-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

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
                      onClick={() => updateSetting('theme', id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        settings.theme === id ? 'border-gray-900' : 'border-transparent hover:border-gray-200'
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
                  onClick={() => updateSetting('allowReviews', !settings.allowReviews)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.allowReviews ? 'bg-orange-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.allowReviews ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          )}

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
                      onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`text-sm font-semibold ${settings.maintenanceMode ? 'text-red-600' : 'text-gray-500'}`}>
                      {settings.maintenanceMode ? '🔴 Maintenance ON' : '🟢 Site Live'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}