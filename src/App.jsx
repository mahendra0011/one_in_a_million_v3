import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { addItem, fetchServerCart, syncCartToServer, validateCartItems } from './store/slices/cartSlice';
import { fetchNotifications, pushNotification, clearNotificationsState } from './store/slices/notificationSlice';
import { useMenu } from './hooks/useMenu';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CartDrawer from './components/CartDrawer';
import Customizer from './components/Customizer';
import AdminGuard from './components/AdminGuard';
import DeliveryGuard from './components/delivery/DeliveryGuard';
import OfflineBanner from './components/OfflineBanner';
import InstallPrompt from './components/InstallPrompt';

// ── STEP 25: Code splitting — each page is a separate JS chunk ──────────────
// React.lazy + Suspense ensures pages are only downloaded when first visited.
// The fallback spinner keeps UX smooth during chunk load.
const HomePage          = lazy(() => import('./pages/HomePage'));
const MenuPage          = lazy(() => import('./pages/MenuPage'));
const OffersPage        = lazy(() => import('./pages/OffersPage'));
const ReservationPage   = lazy(() => import('./pages/ReservationPage'));
const AboutPage         = lazy(() => import('./pages/AboutPage'));
const ContactPage       = lazy(() => import('./pages/ContactPage'));
const SearchPage        = lazy(() => import('./pages/SearchPage'));
const ReviewsPage       = lazy(() => import('./pages/ReviewsPage'));
const AccountPage       = lazy(() => import('./pages/AccountPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const FAQPage           = lazy(() => import('./pages/FAQPage'));
const PaymentPage       = lazy(() => import('./pages/PaymentPage'));
const NotFoundPage      = lazy(() => import('./pages/NotFoundPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const OrderDetailPage   = lazy(() => import('./pages/OrderDetailPage'));

// Admin pages — heavy dashboard chunks, only loaded when /admin is visited
const AdminLogin        = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout       = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminMenu         = lazy(() => import('./pages/admin/AdminMenu'));
const AdminOrders       = lazy(() => import('./pages/admin/AdminOrders'));
const AdminReservations = lazy(() => import('./pages/admin/AdminReservations'));
const AdminCustomers    = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminDeliveryBoys = lazy(() => import('./pages/admin/AdminDeliveryBoys'));
const AdminAnalytics    = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminSettings     = lazy(() => import('./pages/admin/AdminSettings'));
const AdminCoupons      = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminReviews      = lazy(() => import('./pages/admin/AdminReviews'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));

// Delivery pages
const DeliverySetPassword = lazy(() => import('./pages/delivery/DeliverySetPassword'));
const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard'));
const DeliveryOrderDetail = lazy(() => import('./pages/delivery/DeliveryOrderDetail'));
const DeliveryEarnings  = lazy(() => import('./pages/delivery/DeliveryEarnings'));
const DeliveryNotifications = lazy(() => import('./pages/delivery/DeliveryNotifications'));
const DeliveryProfile   = lazy(() => import('./pages/delivery/DeliveryProfile'));

// ── Page loading fallback ────────────────────────────────────────────────────
// Lightweight spinner shown while a page chunk is being downloaded.
// Keeps the Navbar/layout visible so the shell doesn't flash away.
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#B08850]/20 border-t-[#B08850] rounded-full animate-spin" />
        <span className="text-[#B08850]/60 text-sm">Loading…</span>
      </div>
    </div>
  );
}

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  const [custOpen, setCustOpen] = useState(false);
  const [custProductId, setCustProductId] = useState(null);

  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const cartCount = cart.items.reduce((sum, item) => sum + item.qty, 0);
  const auth = useSelector((state) => state.auth);
  const prevLoggedIn = useRef(auth.isLoggedIn);
  const syncTimerRef = useRef(null);

  // On app load: validate localStorage cart items against DB (removes deleted products)
  useEffect(() => {
    dispatch(validateCartItems());
  }, [dispatch]);

  // On login: fetch server cart (merges with local, server wins if non-empty)
  useEffect(() => {
    if (auth.isLoggedIn && !prevLoggedIn.current) {
      dispatch(fetchServerCart());
      dispatch(fetchNotifications()); // Step 21
    }
    if (!auth.isLoggedIn && prevLoggedIn.current) {
      dispatch(clearNotificationsState()); // Step 21 — clear on logout
    }
    prevLoggedIn.current = auth.isLoggedIn;
  }, [auth.isLoggedIn, dispatch]);

  // On app boot if already logged in: restore cart + notifications from server
  useEffect(() => {
    if (auth.isLoggedIn) {
      dispatch(fetchServerCart());
      dispatch(fetchNotifications()); // Step 21
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // Step 21 — real-time notification socket subscription
  useEffect(() => {
    if (!auth.isLoggedIn || !auth.user?._id) return;
    let socket;
    let cancelled = false;
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      socket = io(window.location.origin, { transports: ['polling', 'websocket'] });
      socket.on('connect', () => socket.emit('join-user', auth.user._id));
      socket.on('notification', (notif) => dispatch(pushNotification(notif)));
    }).catch(() => {});
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [auth.isLoggedIn, auth.user?._id, dispatch]);

  // Debounced cart sync to backend whenever cart changes (logged-in users only)
  useEffect(() => {
    if (!auth.isLoggedIn) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      dispatch(syncCartToServer());
    }, 800); // 800ms debounce
    return () => clearTimeout(syncTimerRef.current);
  }, [auth.isLoggedIn, cart.items, cart.coupon, cart.couponDiscount, cart.fulfillment, cart.deliveryAddress, dispatch]);

  // useMenu provides productById with backend data + static fallback
  const { productById, sizeOptions } = useMenu();

  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isDelivery = location.pathname.startsWith('/delivery');
  const isHome = location.pathname === '/';

  const makeCartItem = useCallback((product, options = {}) => {
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
  }, [sizeOptions]);

  const handleAddToCart = useCallback((productId, options = {}) => {
    const p = typeof productId === 'object' ? productId : productById(productId);
    if (p) {
      dispatch(addItem(makeCartItem(p, options)));
      setCartOpen(true);
    }
  }, [dispatch, productById, makeCartItem]);

  const handleCustomize = useCallback((productId) => {
    setCustProductId(productId);
    setCustOpen(true);
  }, []);

  const handleAddCustomized = useCallback((productId, options) => {
    handleAddToCart(productId, options);
    setCustOpen(false);
  }, [handleAddToCart]);

  const hideNav = isAdmin || isDelivery;

  return (
    <div className="min-h-screen bg-[#0A0604] flex flex-col">
      <OfflineBanner />
      {!hideNav && <Navbar cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />}
      {!hideNav && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
      {!hideNav && (
        <Customizer
          open={custOpen}
          onClose={() => setCustOpen(false)}
          productId={custProductId}
          onAddCustomized={handleAddCustomized}
        />
      )}

      <main className={`flex-1 ${!hideNav && !isHome ? 'pt-16' : !hideNav ? 'pt-16' : ''}`}>
        {/* Suspense boundary — shows PageLoader while lazy page chunk downloads */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage onAddToCart={handleAddToCart} onCustomize={handleCustomize} />} />
            <Route path="/menu" element={<MenuPage onAddToCart={handleAddToCart} onCustomize={handleCustomize} />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/reservation" element={<ReservationPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/search" element={<SearchPage onAddToCart={handleAddToCart} onCustomize={handleCustomize} />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/login" element={<AccountPage initialTab="login" />} />
            <Route path="/create-account" element={<AccountPage initialTab="register" />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/payment" element={<PaymentPage />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
              <Route index element={<AdminDashboard />} />
              <Route path="menu" element={<AdminMenu />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="reservations" element={<AdminReservations />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="delivery-boys" element={<AdminDeliveryBoys />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="notifications" element={<AdminNotifications />} />
            </Route>

            {/* Delivery Boy Routes */}
            <Route path="/delivery/set-password" element={<DeliverySetPassword />} />
            <Route path="/delivery" element={<DeliveryGuard><DeliveryDashboard /></DeliveryGuard>} />
            <Route path="/delivery/orders/:orderId" element={<DeliveryGuard><DeliveryOrderDetail /></DeliveryGuard>} />
            <Route path="/delivery/earnings" element={<DeliveryGuard><DeliveryEarnings /></DeliveryGuard>} />
            <Route path="/delivery/notifications" element={<DeliveryGuard><DeliveryNotifications /></DeliveryGuard>} />
            <Route path="/delivery/profile" element={<DeliveryGuard><DeliveryProfile /></DeliveryGuard>} />

            <Route path="/order/:orderId" element={<OrderDetailPage />} />
            <Route path="/product/:id" element={<ProductDetailPage onAddToCart={handleAddToCart} onCustomize={handleCustomize} />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {!hideNav && <Footer />}

      {/* PWA install prompt — mobile only, shown when browser fires beforeinstallprompt */}
      {!hideNav && <InstallPrompt />}
    </div>
  );
}
