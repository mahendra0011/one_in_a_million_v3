import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import {
  Star, Eye, EyeOff, Trash2, RefreshCw, Search, Filter,
  MessageSquare, ImageIcon, ChevronDown, Loader2, AlertTriangle, CheckCircle
} from 'lucide-react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={13} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
      ))}
    </div>
  );
}

function PhotoGallery({ photos }) {
  const [open, setOpen] = useState(false);
  if (!photos?.length) return null;
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        <ImageIcon size={12} />
        {photos.length} photo{photos.length !== 1 ? 's' : ''}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {photos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
          loading="lazy"
          decoding="async"
        />
            </a>
          ))}
        </div>
      )}
    </>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [filter, setFilter]       = useState('all');   // all | visible | hidden
  const [search, setSearch]       = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast]         = useState('');
  const LIMIT = 20;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchReviews = useCallback(async (pg = 1, vis = filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (vis !== 'all') params.set('visibility', vis);
      const res  = await fetchWithTimeout(`/api/admin/reviews?${params}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setReviews(prev => pg === 1 ? data.reviews : [...prev, ...data.reviews]);
        setTotal(data.total);
        setHasMore((pg * LIMIT) < data.total);
      }
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { setPage(1); fetchReviews(1, filter); }, [filter, fetchReviews]);

  useAutoRefresh({ fetchFn: () => fetchReviews(1, filter), interval: 60_000 });

  const toggleVisibility = async (review) => {
    setActionLoading(p => ({ ...p, [review._id]: 'vis' }));
    try {
      const res  = await fetchWithTimeout(`/api/reviews/${review._id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isVisible: !review.isVisible }),
      });
      const data = await res.json();
      if (data.ok) {
        setReviews(prev => prev.map(r => r._id === review._id ? data.review : r));
        showToast(data.review.isVisible ? '✅ Review shown' : '🚫 Review hidden');
      }
    } catch {}
    setActionLoading(p => ({ ...p, [review._id]: null }));
  };

  const deleteReview = async (review) => {
    if (!window.confirm('Delete this review permanently?')) return;
    setActionLoading(p => ({ ...p, [review._id]: 'del' }));
    try {
      const res  = await fetchWithTimeout(`/api/reviews/${review._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setReviews(prev => prev.filter(r => r._id !== review._id));
        setTotal(t => t - 1);
        showToast('🗑️ Review deleted');
      }
    } catch {}
    setActionLoading(p => ({ ...p, [review._id]: null }));
  };

  // Client-side search filter
  const filtered = search.trim()
    ? reviews.filter(r =>
        r.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.comment?.toLowerCase().includes(search.toLowerCase()) ||
        r.orderId?.toLowerCase().includes(search.toLowerCase())
      )
    : reviews;

  const stats = {
    total,
    visible: reviews.filter(r => r.isVisible).length,
    hidden: reviews.filter(r => !r.isVisible).length,
    avg: reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '—',
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="text-orange-500" size={24} />
            Reviews
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Moderate customer reviews — hide, show, or delete</p>
        </div>
        <button
          onClick={() => fetchReviews(1, filter)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Reviews', value: total, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Visible', value: reviews.filter(r => r.isVisible).length, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Hidden', value: reviews.filter(r => !r.isVisible).length, color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'Avg Rating', value: reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—', color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 border border-gray-100`}>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer, comment, order ID…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'visible', label: 'Visible' },
            { key: 'hidden', label: 'Hidden' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                filter === key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-64">Review</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 size={28} className="animate-spin text-orange-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Loading reviews…</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <MessageSquare size={36} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No reviews found</p>
                    <p className="text-gray-300 text-xs mt-1">
                      {search ? 'Try different search terms' : 'Reviews will appear here once customers rate their orders'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(review => (
                  <tr
                    key={review._id}
                    className={`hover:bg-gray-50 transition-colors ${!review.isVisible ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{review.userId?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{review.userId?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <StarRow rating={review.rating} />
                        <span className="text-xs font-bold text-amber-600">{review.rating}/5</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      <p className="text-gray-700 text-sm line-clamp-2 leading-relaxed">
                        {review.comment || <span className="text-gray-300 italic">No comment</span>}
                      </p>
                      <PhotoGallery photos={review.photos} />
                    </td>
                    <td className="px-4 py-4">
                      <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">
                        #{review.orderId?.slice(-8) || '—'}
                      </code>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-gray-500">{timeAgo(review.createdAt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        review.isVisible
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {review.isVisible ? (
                          <><CheckCircle size={11} /> Visible</>
                        ) : (
                          <><EyeOff size={11} /> Hidden</>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle visibility */}
                        <button
                          onClick={() => toggleVisibility(review)}
                          disabled={!!actionLoading[review._id]}
                          title={review.isVisible ? 'Hide review' : 'Show review'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
                            review.isVisible
                              ? 'bg-red-50 text-red-500 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {actionLoading[review._id] === 'vis' ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : review.isVisible ? (
                            <EyeOff size={13} />
                          ) : (
                            <Eye size={13} />
                          )}
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => deleteReview(review)}
                          disabled={!!actionLoading[review._id]}
                          title="Delete permanently"
                          className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                          {actionLoading[review._id] === 'del' ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {hasMore && !search && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {total} reviews</p>
            <button
              onClick={() => { const next = page + 1; setPage(next); fetchReviews(next, filter); }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : null}
              Load More
            </button>
          </div>
        )}
        {!hasMore && filtered.length > 0 && (
          <div className="border-t border-gray-50 px-4 py-3 text-center">
            <p className="text-xs text-gray-300">All {total} reviews loaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
