import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, X, Check, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
const CATEGORIES = ['burgers', 'sides', 'drinks', 'combos'];
const SUBCATS = ['', 'beef', 'chicken', 'veg', 'special'];

const emptyForm = {
  name: '', category: 'burgers', subcat: '', price: '', badge: '', desc: '',
  image: '', veg: false, spicy: false, available: true,
};

export default function AdminMenu() {
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Step 17 — debounce search before hitting the backend
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Step 17 — real backend data, includes inactive items (admin sees everything)
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (catFilter !== 'all') params.set('category', catFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetchWithTimeout(`/api/menu/all?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } catch { /* silent — table just stays empty/stale */ }
    setLoading(false);
  }, [catFilter, debouncedSearch]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Menu kam change hota hai — 2 min polling kafi hai
  useAutoRefresh({ fetchFn: fetchItems, interval: 120_000 });

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setSaveError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditId(item.id || item._id);
    setForm({
      name: item.name || '', category: item.category || 'burgers', subcat: item.subcat || '',
      price: item.price ?? '', badge: item.badge || '', desc: item.desc || '',
      image: item.image || '', veg: !!item.veg, spicy: !!item.spicy, available: item.available !== false,
    });
    setSaveError('');
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetchWithTimeout('/api/upload', {
        method: 'POST',
        // no Content-Type — browser sets multipart boundary
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (data.ok) setForm(f => ({ ...f, image: data.url }));
      else setSaveError(data.error || 'Image upload failed');
    } catch {
      setSaveError('Image upload failed — check your connection');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.price === '' || Number(form.price) <= 0) {
      setSaveError('Name and a valid price are required');
      return;
    }
    setSaving(true); setSaveError('');
    const payload = {
      name: form.name.trim(),
      category: form.category,
      subcat: form.subcat,
      price: Number(form.price),
      badge: form.badge.trim(),
      desc: form.desc.trim(),
      image: form.image,
      veg: !!form.veg,
      spicy: !!form.spicy,
      available: !!form.available,
    };
    try {
      let res, data;
      if (editId) {
        res = await fetchWithTimeout(`/api/menu/${editId}`, { method: 'PUT', headers, credentials: 'include',
        body: JSON.stringify(payload) });
      } else {
        // Generate a stable slug-style id from the name + timestamp to guarantee uniqueness
        const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        res = await fetchWithTimeout('/api/menu', {
          method: 'POST', headers,
          credentials: 'include',
        body: JSON.stringify({ ...payload, id: `${slug}-${Date.now().toString(36)}` }),
        });
      }
      data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save item');
      setShowForm(false);
      fetchItems(); // live reflect — re-pull from backend so storefront and admin agree
    } catch (e) {
      setSaveError(e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await fetchWithTimeout(`/api/menu/${id}`, { method: 'DELETE', credentials: 'include' });
      setItems(prev => prev.filter(item => (item.id || item._id) !== id));
    } catch { /* silent */ }
    setDeleteConfirm(null);
  };

  // Toggle "available" — this is what actually controls live storefront visibility
  const toggleActive = async (item) => {
    const id = item.id || item._id;
    setTogglingId(id);
    try {
      const res = await fetchWithTimeout(`/api/menu/${id}`, {
        method: 'PUT', headers, credentials: 'include',
        body: JSON.stringify({ available: !item.available }),
      });
      const data = await res.json();
      if (data.ok) setItems(prev => prev.map(i => (i.id || i._id) === id ? data.item : i));
    } catch { /* silent */ }
    setTogglingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-fredoka text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600">{items.length} items · {items.filter(i => i.available !== false).length} active</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20">
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                catFilter === cat ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Item</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Category</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Price</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Badge</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No menu items found. Click "Add Item" to create one.
                  </td>
                </tr>
              ) : items.map(item => {
                const id = item.id || item._id;
                return (
                  <tr key={id} className={`hover:bg-gray-50 transition-colors ${item.available === false ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={item.image || 'https://placehold.co/80x64?text=No+Image'} alt={item.name} className="w-12 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100"
          loading="lazy"
          decoding="async"
        />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{(item.desc || '').slice(0, 60)}{item.desc?.length > 60 ? '...' : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-orange-100 text-orange-700">
                        {item.category}{item.subcat ? ` · ${item.subcat}` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{item.price}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.badge || '—'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleActive(item)} disabled={togglingId === id}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
                          item.available !== false ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'
                        }`}>
                        {togglingId === id ? <Loader2 size={12} className="animate-spin" /> : item.available !== false ? <><Check size={12} /> Active</> : <><X size={12} /> Inactive</>}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        {deleteConfirm === id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold">Confirm</button>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => !saving && setShowForm(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-51 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-fredoka text-2xl font-bold text-gray-900">
                    {editId ? 'Edit Item' : 'Add New Item'}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  {saveError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2.5 rounded-xl">
                      {saveError}
                    </div>
                  )}

                  {/* Image upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image</label>
                    <div className="flex items-center gap-3">
                      <img src={form.image || 'https://placehold.co/100x80?text=No+Image'} alt="" className="w-20 h-16 rounded-lg object-cover bg-gray-100 border border-gray-200"
          loading="lazy"
          decoding="async"
        />
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                        {uploading ? 'Uploading...' : 'Upload Image'}
                        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Spicy Paneer Burger"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
                      <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price (₹) *</label>
                      <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="199"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm" />
                    </div>
                  </div>
                  {form.category === 'burgers' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sub-category</label>
                      <select value={form.subcat} onChange={e => setForm(f => ({ ...f, subcat: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm">
                        {SUBCATS.map(s => <option key={s} value={s}>{s === '' ? 'None' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Badge Label</label>
                    <input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                      placeholder="e.g., Best Seller, New, Special"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                    <textarea rows={3} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                      placeholder="Describe the item..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 text-sm resize-none" />
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={form.veg} onChange={e => setForm(f => ({ ...f, veg: e.target.checked }))}
                        className="w-4 h-4 rounded accent-green-600" />
                      🥦 Veg
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={form.spicy} onChange={e => setForm(f => ({ ...f, spicy: e.target.checked }))}
                        className="w-4 h-4 rounded accent-red-600" />
                      🌶️ Spicy
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                        className="w-4 h-4 rounded accent-orange-600" />
                      Available on storefront
                    </label>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowForm(false)} disabled={saving}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving || uploading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-bold hover:from-orange-700 hover:to-orange-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20">
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      {saving ? 'Saving...' : editId ? 'Save Changes' : 'Add Item'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
