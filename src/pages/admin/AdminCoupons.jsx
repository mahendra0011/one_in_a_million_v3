import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Tag, TrendingUp, Users, AlertCircle, X, Loader2, RefreshCw } from 'lucide-react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const API = '/api/coupons';

const EMPTY_FORM = {
  code: '', discountType: 'percent', discountValue: '', minOrder: 0,
  maxUses: '', expiry: '', isActive: true, userId: '',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpired(d) {
  return d && new Date(d) < new Date();
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout(API, { headers: { 'Content-Type': 'application/json' },
      credentials: 'include' });
      const data = await res.json();
      if (data.ok) setCoupons(data.coupons);
      else setError(data.error || 'Failed to load coupons');
    } catch {
      setError('Network error — could not load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(fetchCoupons); }, [fetchCoupons]);

  useAutoRefresh({ fetchFn: fetchCoupons, interval: 60_000 });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (coupon) => {
    setEditingId(coupon._id);
    setForm({
      code: coupon.code || '',
      discountType: coupon.discountType || 'percent',
      discountValue: coupon.discountValue ?? '',
      minOrder: coupon.minOrder ?? 0,
      maxUses: coupon.maxUses ?? '',
      expiry: coupon.expiry ? new Date(coupon.expiry).toISOString().slice(0, 10) : '',
      isActive: coupon.isActive ?? true,
      userId: coupon.userId || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.code.trim()) { setFormError('Coupon code is required'); return; }
    if (!form.discountValue || Number(form.discountValue) <= 0) { setFormError('Discount value must be > 0'); return; }
    if (form.discountType === 'percent' && Number(form.discountValue) > 100) { setFormError('Percent discount cannot exceed 100'); return; }

    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrder: Number(form.minOrder) || 0,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiry: form.expiry || null,
      isActive: form.isActive,
      userId: form.userId.trim() || null,
    };

    try {
      const url = editingId ? `${API}/${editingId}` : API;
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetchWithTimeout(url, { method, headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.ok) {
        setShowForm(false);
        fetchCoupons();
      } else {
        setFormError(data.error || 'Failed to save coupon');
      }
    } catch {
      setFormError('Network error — could not save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon) => {
    try {
      const res = await fetchWithTimeout(`${API}/${coupon._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const data = await res.json();
      if (data.ok) fetchCoupons();
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetchWithTimeout(`${API}/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      credentials: 'include' });
      const data = await res.json();
      if (data.ok) { setDeleteConfirm(null); fetchCoupons(); }
    } catch {}
  };

  // Stats derived from loaded coupons
  const totalActive = coupons.filter(c => c.isActive && !isExpired(c.expiry)).length;
  const totalUsed = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
  const expiringSoon = coupons.filter(c => {
    if (!c.expiry || !c.isActive) return false;
    const diff = (new Date(c.expiry) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage discount codes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCoupons} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
          >
            <Plus size={16} /> New Coupon
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Coupons', value: totalActive, icon: Tag, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Redemptions', value: totalUsed, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Expiring in 7 Days', value: expiringSoon, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading coupons…
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Tag size={36} className="mb-3 text-gray-300" />
            <p className="font-semibold">No coupons yet</p>
            <p className="text-sm mt-1">Create your first discount code above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Code', 'Discount', 'Min Order', 'Usage', 'Expiry', 'User-Specific', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coupons.map((coupon) => {
                  const expired = isExpired(coupon.expiry);
                  const maxed = coupon.maxUses && coupon.usedCount >= coupon.maxUses;
                  const statusColor = !coupon.isActive ? 'text-gray-400' : expired ? 'text-red-500' : maxed ? 'text-orange-500' : 'text-green-600';
                  const statusLabel = !coupon.isActive ? 'Inactive' : expired ? 'Expired' : maxed ? 'Maxed out' : 'Active';
                  return (
                    <tr key={coupon._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-bold text-gray-900 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg text-xs tracking-wide">
                          <Tag size={11} /> {coupon.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {coupon.discountType === 'percent'
                          ? `${coupon.discountValue}%`
                          : `₹${coupon.discountValue}`}
                        <span className="text-xs text-gray-400 ml-1">({coupon.discountType})</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {coupon.minOrder > 0 ? `₹${coupon.minOrder}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-gray-900">{coupon.usedCount || 0}</span>
                          {coupon.maxUses ? (
                            <>
                              <span className="text-gray-400">/</span>
                              <span className="text-gray-500">{coupon.maxUses}</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">/ ∞</span>
                          )}
                        </div>
                        {coupon.maxUses > 0 && (
                          <div className="mt-1 w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-orange-400"
                              style={{ width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-xs font-semibold ${expired ? 'text-red-500' : 'text-gray-600'}`}>
                        {formatDate(coupon.expiry)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {coupon.userId ? (
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                            <Users size={10} /> Yes
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(coupon)}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                            coupon.isActive && !expired && !maxed
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title={coupon.isActive ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {coupon.isActive
                            ? <ToggleRight size={13} />
                            : <ToggleLeft size={13} />}
                          <span className={statusColor}>{statusLabel}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(coupon)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(coupon)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-semibold">
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Coupon Code *</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SAVE20"
                  disabled={!!editingId}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 font-mono font-bold tracking-widest focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50 disabled:text-gray-400"
                />
                {editingId && <p className="text-xs text-gray-400 mt-1">Code cannot be changed after creation</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Discount Type *</label>
                  <select
                    value={form.discountType}
                    onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Discount Value * {form.discountType === 'percent' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={form.discountType === 'percent' ? 100 : undefined}
                    value={form.discountValue}
                    onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                    placeholder={form.discountType === 'percent' ? '10' : '50'}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Minimum Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minOrder}
                    onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Uses (blank = unlimited)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxUses}
                    onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    placeholder="e.g. 100"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expiry Date (blank = never expires)</label>
                <input
                  type="date"
                  value={form.expiry}
                  onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  User ID (optional — for personal coupons like birthday discounts)
                </label>
                <input
                  value={form.userId}
                  onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                  placeholder="MongoDB ObjectId of the specific user"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 font-mono text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
                <p className="text-xs text-gray-400 mt-1">If set, only this user can redeem it. Leave blank for public coupons.</p>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Active</p>
                  <p className="text-xs text-gray-400">Inactive coupons cannot be redeemed</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-orange-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : editingId ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Coupon?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete <span className="font-bold text-orange-600">{deleteConfirm.code}</span>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm._id)}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
