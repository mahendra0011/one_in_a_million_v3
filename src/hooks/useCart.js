/**
 * useCart — manages cart state with persistence.
 * Uses useMenu for product lookups (backend or static fallback).
 *
 * NOTE: this hook is not currently wired into the app (the live cart is the Redux
 * cartSlice used by CartDrawer.jsx / PaymentPage.jsx). Kept functional and in sync
 * with the backend-validated coupon pattern (Step 18) in case it's reused later.
 */
import { fetchWithTimeout } from '../lib/utils';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { extras, sizeOptions } from '../data/products';
import { useMenu } from './useMenu';

const CART_KEY = 'millionCart';
const COUPON_KEY = 'millionCoupon';
const FULFILLMENT_KEY = 'millionFulfillment';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const money = (value) => currency.format(Math.max(0, Math.round(value)));

function loadPersisted(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function makeCartItem(product, options = {}) {
  const size = options.size || sizeOptions[0];
  const selectedExtras = options.extras || [];
  const spice = Number.isFinite(options.spice) ? options.spice : 3;
  const notes = (options.notes || '').trim();
  const extraTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);

  return {
    key: `${product.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    productId: product.id,
    name: product.name,
    image: product.image,
    category: product.category,
    basePrice: product.price,
    unitPrice: product.price + size.price + extraTotal,
    qty: 1,
    size,
    extras: selectedExtras,
    spice,
    notes,
  };
}

export function useCart() {
  const { productById } = useMenu();

  const [cart, setCart] = useState(() => loadPersisted(CART_KEY, []));
  const [coupon, setCoupon] = useState(() => loadPersisted(COUPON_KEY, ''));
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [fulfillment, setFulfillmentState] = useState(() => loadPersisted(FULFILLMENT_KEY, 'delivery'));

  // Step 23 — dynamic delivery charge from settings
  const [deliveryCharge, setDeliveryCharge] = useState(39);
  useEffect(() => {
    fetchWithTimeout('/api/settings')
      .then(r => r.json())
      .then(d => { if (d.ok) setDeliveryCharge(d.settings.deliveryCharge ?? 39); })
      .catch(() => {});
  }, []);

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem(COUPON_KEY, JSON.stringify(coupon)); }, [coupon]);
  useEffect(() => { localStorage.setItem(FULFILLMENT_KEY, JSON.stringify(fulfillment)); }, [fulfillment]);

  const setFulfillment = useCallback((type) => setFulfillmentState(type), []);

  const addToCart = useCallback((productId, options = {}) => {
    const product = productById(productId);
    if (!product) return;
    setCart((prev) => [...prev, makeCartItem(product, options)]);
  }, [productById]);

  const updateQty = useCallback((key, delta) => {
    setCart((prev) =>
      prev.reduce((acc, item) => {
        if (item.key !== key) { acc.push(item); return acc; }
        const newQty = item.qty + delta;
        if (newQty <= 0) return acc;
        acc.push({ ...item, qty: newQty });
        return acc;
      }, [])
    );
  }, []);

  const removeItem = useCallback((key) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCoupon('');
    setCouponDiscount(0);
    setCouponError('');
  }, []);

  // Step 18 — validate against the real backend instead of a hardcoded code/percentage.
  const applyCoupon = useCallback(async (code) => {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) {
      setCoupon(''); setCouponDiscount(0); setCouponError('');
      return;
    }
    const currentSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    try {
      const res = await fetchWithTimeout('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, orderTotal: currentSubtotal }),
      });
      const data = await res.json();
      if (data.ok) {
        setCoupon(trimmed);
        setCouponDiscount(data.discount);
        setCouponError('');
      } else {
        setCouponError(data.error || 'Invalid coupon code');
      }
    } catch {
      setCouponError('Could not validate coupon — check your connection');
    }
  }, [cart]);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const discount = coupon ? couponDiscount : 0;
  const delivery = fulfillment === 'delivery' && subtotal > 0 ? deliveryCharge : 0;
  const tax = (subtotal - discount) * 0.05;
  const total = subtotal - discount + delivery + tax;

  const totals = useMemo(() => ({ subtotal, discount, delivery, tax, total }), [subtotal, discount, delivery, tax, total]);

  const submitOrder = useCallback(async (formData) => {
    const order = {
      id: `BIM-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      fulfillment,
      customer: Object.fromEntries(new FormData(formData).entries()),
      couponCode: coupon || null,
      items: cart,
      totals,
    };

    let savedToServer = false;
    try {
      const response = await fetchWithTimeout('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      savedToServer = response.ok;
    } catch {}

    if (!savedToServer) {
      const offlineOrders = loadPersisted('millionOrders', []);
      offlineOrders.push(order);
      localStorage.setItem('millionOrders', JSON.stringify(offlineOrders));
    }

    setCart([]);
    setCoupon('');
    setCouponDiscount(0);
    setCouponError('');
    formData.reset?.();
    return { order, savedToServer, totals };
  }, [cart, coupon, fulfillment, totals]);

  const addFeaturedCombo = useCallback(() => {
    addToCart('million-meal', {
      size: sizeOptions[0],
      extras: [extras.find((e) => e.id === 'dip')],
      spice: 3,
      notes: 'Featured Million Meal combo',
    });
  }, [addToCart]);

  return {
    cart, coupon, couponError, fulfillment, cartCount: cart.reduce((s, i) => s + i.qty, 0), totals,
    applyCoupon, setFulfillment, addToCart, updateQty, removeItem, clearCart, productById,
    submitOrder, addFeaturedCombo, money,
  };
}
