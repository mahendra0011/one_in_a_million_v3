import { fetchWithTimeout } from '../../lib/utils';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_KEY = 'bim_cart';

const loadCart = () => {
  try {
    const saved = localStorage.getItem(LS_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return {
      items: [], coupon: '', couponDiscount: 0, couponError: '',
      fulfillment: 'delivery', deliveryAddress: '', deliveryCoords: null,
      syncing: false,
      ...parsed,
      syncing: false, // never persist syncing flag
    };
  } catch {
    return { items: [], coupon: '', couponDiscount: 0, couponError: '', fulfillment: 'delivery', deliveryAddress: '', deliveryCoords: null, syncing: false };
  }
};

const saveCartToLS = (state) => {
  try {
    const { syncing, couponError, ...toSave } = state;
    localStorage.setItem(LS_KEY, JSON.stringify(toSave));
  } catch {}
};

// ─── API helpers ──────────────────────────────────────────────────────────────
const API = '/api/cart';
// Cookie-based auth — no Authorization header needed; credentials: 'include' sends the cookie
const credentialsOpts = { credentials: 'include' };

// ─── Thunks ───────────────────────────────────────────────────────────────────

// Fetch cart from server on login / app load (merges with localStorage)
export const fetchServerCart = createAsyncThunk('cart/fetchServer', async (_, { getState }) => {
  const res = await fetchWithTimeout(API, credentialsOpts);
  if (!res.ok) throw new Error('fetch failed');
  const data = await res.json();
  return data.cart; // null if no server cart yet
});

// Push current Redux cart state to server (debounce at call-site)
export const syncCartToServer = createAsyncThunk('cart/syncToServer', async (_, { getState }) => {
  const { cart } = getState();
  const { syncing, couponError, ...payload } = cart;
  const res = await fetchWithTimeout(API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('sync failed');
  return true;
});

// Validate cart items against DB — removes deleted products
export const validateCartItems = createAsyncThunk('cart/validate', async (_, { getState }) => {
  const { cart } = getState();
  if (!cart.items.length) return cart.items;
  // Use server GET which validates internally (only works when logged in via cookie)
  const res = await fetchWithTimeout(API, credentialsOpts);
  if (!res.ok) return cart.items; // not logged in or error — skip server validation
  const data = await res.json();
  return data.cart ? data.cart.items : cart.items;
});

// Clear cart on server (after order placed)
export const clearServerCart = createAsyncThunk('cart/clearServer', async () => {
  await fetchWithTimeout(API, { method: 'DELETE', credentials: 'include' });
});

// ─── Slice ────────────────────────────────────────────────────────────────────
const cartSlice = createSlice({
  name: 'cart',
  initialState: loadCart(),
  reducers: {
    addItem(state, action) {
      const item = action.payload;
      const existing = state.items.find(i => i.key === item.key);
      if (existing) { existing.qty += 1; } else { state.items.push(item); }
      saveCartToLS(state);
    },
    removeItem(state, action) {
      state.items = state.items.filter(i => i.key !== action.payload);
      saveCartToLS(state);
    },
    updateQty(state, action) {
      const { key, delta } = action.payload;
      const item = state.items.find(i => i.key === key);
      if (item) {
        item.qty = Math.max(0, item.qty + delta);
        if (item.qty === 0) state.items = state.items.filter(i => i.key !== key);
      }
      saveCartToLS(state);
    },
    updateQtyImmediate(state, action) {
      // Used with debounce - sets exact qty
      const { key, qty } = action.payload;
      const item = state.items.find(i => i.key === key);
      if (item) {
        if (qty <= 0) { state.items = state.items.filter(i => i.key !== key); }
        else { item.qty = qty; }
      }
      saveCartToLS(state);
    },
    setQty(state, action) {
      const { key, qty } = action.payload;
      const item = state.items.find(i => i.key === key);
      if (item) {
        if (qty <= 0) { state.items = state.items.filter(i => i.key !== key); }
        else { item.qty = qty; }
      }
      saveCartToLS(state);
    },
    clearCart(state) {
      state.items = [];
      state.coupon = '';
      state.couponDiscount = 0;
      state.couponError = '';
      state.deliveryAddress = '';
      state.deliveryCoords = null;
      saveCartToLS(state);
    },
    // Step 18 — coupon
    applyCouponResult(state, action) {
      const { code, discount } = action.payload;
      state.coupon = code;
      state.couponDiscount = discount;
      state.couponError = '';
      saveCartToLS(state);
    },
    setCouponError(state, action) {
      state.couponError = action.payload;
    },
    clearCoupon(state) {
      state.coupon = '';
      state.couponDiscount = 0;
      state.couponError = '';
      saveCartToLS(state);
    },
    setFulfillment(state, action) {
      state.fulfillment = action.payload;
      saveCartToLS(state);
    },
    setDeliveryAddress(state, action) {
      const { address, coords } = action.payload;
      state.deliveryAddress = address;
      state.deliveryCoords = coords || null;
      saveCartToLS(state);
    },
    // Merge server cart into local (prefer server items if non-empty, else keep local)
    mergeServerCart(state, action) {
      const serverCart = action.payload;
      if (!serverCart) return;
      // If server has items, use server. Else keep local (local could be fresher if just added)
      if (serverCart.items && serverCart.items.length > 0) {
        state.items = serverCart.items;
        state.coupon = serverCart.coupon || state.coupon;
        state.couponDiscount = serverCart.couponDiscount || state.couponDiscount;
        state.fulfillment = serverCart.fulfillment || state.fulfillment;
        state.deliveryAddress = serverCart.deliveryAddress || state.deliveryAddress;
        state.deliveryCoords = serverCart.deliveryCoords || state.deliveryCoords;
        saveCartToLS(state);
      }
    },
  },
  extraReducers: (builder) => {
    // fetchServerCart
    builder.addCase(fetchServerCart.pending, (state) => { state.syncing = true; });
    builder.addCase(fetchServerCart.fulfilled, (state, action) => {
      state.syncing = false;
      const serverCart = action.payload;
      if (!serverCart) return;
      // Merge: server wins if it has items (handles multi-device sync)
      if (serverCart.items && serverCart.items.length > 0) {
        state.items = serverCart.items;
        state.coupon = serverCart.coupon || '';
        state.couponDiscount = serverCart.couponDiscount || 0;
        state.fulfillment = serverCart.fulfillment || 'delivery';
        state.deliveryAddress = serverCart.deliveryAddress || '';
        state.deliveryCoords = serverCart.deliveryCoords || null;
        saveCartToLS(state);
      }
    });
    builder.addCase(fetchServerCart.rejected, (state) => { state.syncing = false; });

    // validateCartItems — update items with validated/pruned list
    builder.addCase(validateCartItems.fulfilled, (state, action) => {
      const validated = action.payload;
      if (validated && validated.length !== state.items.length) {
        state.items = validated;
        saveCartToLS(state);
      }
    });

    // syncCartToServer
    builder.addCase(syncCartToServer.pending, (state) => { state.syncing = true; });
    builder.addCase(syncCartToServer.fulfilled, (state) => { state.syncing = false; });
    builder.addCase(syncCartToServer.rejected, (state) => { state.syncing = false; });
  },
});

export const {
  addItem, removeItem, updateQty, updateQtyImmediate, setQty, clearCart,
  applyCouponResult, setCouponError, clearCoupon,
  setFulfillment, setDeliveryAddress, mergeServerCart,
} = cartSlice.actions;
export default cartSlice.reducer;
