/**
 * useMenu — fetches menu items from backend API with full server-side filtering.
 * Falls back to static products.js data only if the API is completely unreachable
 * (offline / backend down) — this keeps the storefront from going blank, but the
 * backend is always the source of truth and admin changes are reflected live.
 *
 * Step 17: search, category, subcat, price range, veg/nonveg, spicy — all server-side.
 */
import { fetchWithTimeout } from '../lib/utils';
import { useState, useEffect, useCallback, useRef } from 'react';
import { products as staticProducts, extras, sizeOptions, spiceLevels } from '../data/products';

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  const { category, subcat, search, veg, spicy, minPrice, maxPrice, sort } = filters;
  if (category && category !== 'all') params.set('category', category);
  if (subcat && subcat !== 'all') params.set('subcat', subcat);
  if (search) params.set('search', search);
  if (veg === true) params.set('veg', 'true');
  if (veg === false) params.set('veg', 'false');
  if (spicy === true) params.set('spicy', 'true');
  if (minPrice != null && minPrice !== '') params.set('minPrice', minPrice);
  if (maxPrice != null && maxPrice !== '') params.set('maxPrice', maxPrice);
  if (sort) params.set('sort', sort);
  return params.toString();
}

export function useMenu(filters = {}) {
  const [products, setProducts] = useState(staticProducts); // immediate paint, replaced once API responds
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const hasLoadedOnce = useRef(false);

  // Stable string key so effects don't refire on a new object reference each render
  const filterKey = buildQuery(filters);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filterKey;
      const res = await fetchWithTimeout(`/api/menu${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        // Backend data takes priority; map _id → id for compatibility with existing UI code
        const mapped = data.items.map(item => ({ ...item, id: item.id || item._id }));
        setProducts(mapped);
        setUsingFallback(false);
      }
      hasLoadedOnce.current = true;
    } catch (err) {
      setError(err.message);
      // Only fall back to static data if we've never successfully loaded from the
      // backend yet (true offline/down scenario) — once live data has loaded, an
      // empty filtered result should show "no items found", not stale static items.
      if (!hasLoadedOnce.current) setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const productById = useCallback(
    (id) => products.find((p) => p.id === id || p._id === id),
    [products]
  );

  return { products, loading, error, usingFallback, refetch: fetchMenu, productById, extras, sizeOptions, spiceLevels };
}

// Step 17: dynamic category list for the menu filter bar — falls back to the
// static category set if the backend categories endpoint is unreachable.
const STATIC_CATEGORIES = ['burgers', 'sides', 'drinks', 'combos'];

export function useMenuCategories() {
  const [categories, setCategories] = useState(STATIC_CATEGORIES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWithTimeout('/api/menu/categories')
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.ok && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      })
      .catch(() => { /* keep static fallback */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { categories, loading };
}
