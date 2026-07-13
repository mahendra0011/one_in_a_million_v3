import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
import dns from 'node:dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import mongoSanitize from 'express-mongo-sanitize';
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  sendEmailOtp,
  isCooldownActive,
  cooldownSecondsLeft,
} from './services/otp.service.js';
import { sendOrderConfirmation, sendStatusNotification, sendReviewReminder, sendReservationConfirmation } from './services/notification.service.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  User, Order, OtpSession, MenuItem, Reservation, Coupon,
  Review, Cart, Notification, AdminNotifLog,
  DeliveryNotif, DeliveryPushSub, DeliveryRating, SecurityLog
} from './models/index.js';
import Settings, { getSettings } from './models/Settings.js';
import { authenticate, adminOnly, deliveryOnly, optionalAuth, setAuthCookie, clearAuthCookie, getToken, blacklistToken } from './middleware/auth.js';
import fileUpload from 'express-fileupload';
import webPush from 'web-push';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import helmet from 'helmet';
import { generalLimiter, authLimiter, otpLimiter, passwordLimiter, orderLimiter, reservationLimiter, uploadLimiter, couponLimiter, liveTrackingLimiter } from './middleware/rateLimiters.js';
import { validate } from './middleware/validate.js';
import * as v from './middleware/validators.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { passwordStrength } from './middleware/validators.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// ─── SECURITY LOGGING HELPER ───────────────────────────────────────────────────
const logSecurityEvent = async (type, { userId, email, details } = {}) => {
  try {
    await SecurityLog.create({ type, userId, email, ip: null, details });
  } catch { /* silent fail */ }
};

// ─── ENVIRONMENT VALIDATION ───────────────────────────────────────────────────
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI', 'BREVO_API_KEY'];
requiredEnvVars.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
});

// ─── SECURITY HEADERS ────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", process.env.CLIENT_URL || "http://localhost:5173"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://accounts.google.com"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
app.use(helmet.noSniff());
app.use(helmet.dnsPrefetchControl({ allow: false }));
app.use(helmet.hidePoweredBy());

// ─── MONGO SANITIZATION ────────────────────────────────────────────────────────
app.use(mongoSanitize());

// ─── INPUT SIZE LIMITING ────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb', strict: true }));
app.use((req, res, next) => {
  if (req.url.length > 2048) {
    return res.status(414).json({ ok: false, error: 'URL too long' });
  }
  next();
});

// ─── API REQUEST ID ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ─── CORS CONFIGURATION ───────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [process.env.CLIENT_URL || 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(cookieParser());

// ─── CSRF PROTECTION ───────────────────────────────────────────────────────────
// NOTE: We rely on httpOnly + sameSite:'strict' auth cookies (see
// server/middleware/auth.js setAuthCookie) for CSRF protection instead of a
// separate double-submit-token middleware. sameSite:'strict' cookies are not
// sent on cross-site requests, which is what actually stops CSRF here. A prior
// `csurf` middleware was wired up for production only, but no frontend code
// ever fetched/sent the token, so every mutating request (login, logout,
// orders, all admin actions) would fail with 403 as soon as NODE_ENV=production.
// csurf is also archived/unmaintained upstream, so we removed it rather than
// wiring up the missing frontend integration.

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 5 * 1024 * 1024 },
  abortOnLimit: true,
  responseOnLimit: JSON.stringify({ ok: false, error: 'File is too large. Maximum allowed size is 5 MB.' }),
}));

app.use('/api', generalLimiter);

const server = createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true } });

// ─── REDIS ADAPTER FOR SOCKET.IO ───────────────────────────────────────────────
if (process.env.REDIS_URL) {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  pubClient.on('error', () => {});
  subClient.on('error', () => {});
  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Redis adapter enabled for Socket.io');
    })
    .catch((err) => {
      console.warn('⚠️ Redis adapter failed — using in-memory adapter (single server only):', err.message);
    });
} else {
  console.log('ℹ️ No Redis URL - using in-memory Socket.io adapter');
}

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/one-in-a-million';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET env var is not set. Server cannot start without it.');
  process.exit(1);
}

mongoose.connect(MONGO_URI).then(() => {
  console.log('✅ MongoDB connected');
  bootstrapAdmin();
  server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
const STATUS_MESSAGES = {
  pending:          'Order received! Waiting for confirmation.',
  confirmed:         'Your order has been confirmed.',
  preparing:         'Your order is being prepared',
  out_for_delivery:  'Out for delivery',
  delivered:         'Delivered',
  cancelled:         'Your order has been cancelled.',
};

io.on('connection', (socket) => {
  socket.on('join-admin', () => { socket.join('admin'); });
  socket.on('join-user', (userId) => {
    if (!userId) return;
    socket.join(`user-${userId}`);
  });
  socket.on('join-delivery', (deliveryBoyId) => {
    if (!deliveryBoyId) return;
    socket.join(`delivery-${deliveryBoyId}`);
  });
  socket.on('track-order', (orderId) => {
    if (!orderId) return;
    socket.join(`order-${orderId}`);
  });
  socket.on('update-location', async ({ orderId, lat, lng, deliveryBoyId } = {}) => {
    if (!orderId || lat == null || lng == null) return;
    try {
      const updatedAt = new Date();
      await Order.findOneAndUpdate(
        { orderId, ...(deliveryBoyId ? { assignedTo: deliveryBoyId } : {}) },
        { deliveryBoyLocation: { lat, lng, updatedAt } }
      );
      notifyOrder(orderId, 'delivery-location-update', { lat, lng, updatedAt });
      notifyAdmin('delivery-location-update', { orderId, lat, lng, updatedAt });
    } catch (err) {
      console.error('[socket update-location failed]', err.message);
    }
  });
  socket.on('disconnect', () => {});
});

const notifyAdmin = (event, data) => io.to('admin').emit(event, data);
const notifyOrder = (orderId, event, data) => io.to(`order-${orderId}`).emit(event, data);
const notifyDelivery = (deliveryBoyId, event, data) => io.to(`delivery-${deliveryBoyId}`).emit(event, data);

async function createDeliveryNotif({ deliveryBoyId, type, title, body, data = {} }) {
  if (!deliveryBoyId) return null;
  try {
    const notif = await DeliveryNotif.create({ deliveryBoyId, type, title, body, data });
    notifyDelivery(deliveryBoyId.toString(), 'delivery-notification', {
      _id: notif._id, type, title, body, data, read: false, createdAt: notif.createdAt,
    });
    return notif;
  } catch (e) { console.error('[DeliveryNotif]', e.message); return null; }
}

const notifyUser = (userId, notification) => io.to(`user-${userId}`).emit('notification', notification);

async function createNotification({ userId, type, title, body, data = {} }) {
  if (!userId) return null;
  try {
    const notif = await Notification.create({ userId, type, title, body, data });
    notifyUser(userId.toString(), notif);
    return notif;
  } catch (err) {
    console.error('[createNotification]', err.message);
    return null;
  }
}

const STATUS_LABELS = {
  pending:          { emoji: '🧾', label: 'Order Received' },
  confirmed:        { emoji: '✅', label: 'Order Confirmed' },
  preparing:        { emoji: '👨‍🍳', label: 'Being Prepared' },
  out_for_delivery: { emoji: '🛵', label: 'Out for Delivery' },
  delivered:        { emoji: '🎉', label: 'Delivered!' },
  cancelled:        { emoji: '❌', label: 'Order Cancelled' },
};

const LOCATIONS = ['Mall Road, Civil Lines', 'Wright Town'];

const broadcastStatusUpdate = (order, status) => {
  const message = STATUS_MESSAGES[status] || status;
  notifyOrder(order.orderId, 'status-update', { orderId: order.orderId, status, message });
  notifyAdmin('order-updated', order);
  if (order.userId) {
    // Also notify user room for AccountPage real-time updates
    io.to(`user-${order.userId}`).emit('order-updated', order);
    const cfg = STATUS_LABELS[status] || { emoji: '📦', label: status };
    createNotification({
      userId: order.userId,
      type: 'order_status',
      title: `${cfg.emoji} ${cfg.label}`,
      body: `Your order ${order.orderId} is now: ${cfg.label}`,
      data: { orderId: order.orderId, status },
    });
    User.findById(order.userId).then(user => {
      if (!user) return;
      sendStatusNotification({ order, status, userEmail: user.email, userName: user.name }).catch(() => {});
      if (status === 'delivered') {
        createNotification({ userId: order.userId, type: 'review_reminder', title: '🌟 How was your meal?', body: `Leave a review for order ${order.orderId} and earn loyalty points!`, data: { orderId: order.orderId } });
        sendReviewReminder({ orderId: order.orderId, userEmail: user.email, userName: user.name }).catch(() => {});
      }
    }).catch(() => {});
  }
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────



// ── EMAIL-ONLY REGISTER (with password + OTP verify) ──────────────────────────
// Step 1: Send OTP to email
app.post('/api/auth/register-email/send-otp', otpLimiter, async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ ok: false, error: 'Email and name required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ ok: false, error: 'Email already registered' });

    const existingOtp = await OtpSession.findOne({ identifier: email, purpose: 'register' });
    if (existingOtp && isCooldownActive(existingOtp.lastSentAt)) {
      return res.status(429).json({ ok: false, error: `Please wait ${cooldownSecondsLeft(existingOtp.lastSentAt)}s before resending` });
    }

    const otp = generateOtp();
    const hash = await hashOtp(otp);
    await OtpSession.findOneAndDelete({ identifier: email, purpose: 'register' });
    await OtpSession.create({ identifier: email, type: 'email', purpose: 'register', otpHash: hash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), lastSentAt: new Date() });

    const regToken = jwt.sign({ email, name }, JWT_SECRET, { expiresIn: '15m' });
    await sendEmailOtp({ to: email, otp, purpose: 'register', name });
    res.json({ ok: true, message: 'OTP sent to your email', regToken });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// Step 2: Verify OTP + create account with password (phone optional)
app.post('/api/auth/register-email/verify', authLimiter, async (req, res) => {
  try {
    const { email, otp, regToken, password, phone } = req.body;
    if (!email || !otp || !regToken || !password || !phone) {
      return res.status(400).json({ ok: false, error: 'Email, OTP, regToken, password and phone required' });
    }
    if (!passwordStrength(password)) return res.status(400).json({ ok: false, error: 'Password must be 8+ chars with uppercase, lowercase, number and special character' });

    const session = await OtpSession.findOne({ identifier: email, purpose: 'register' });
    if (!session) return res.status(400).json({ ok: false, error: 'OTP not found. Please request again.' });
    if (new Date() > session.expiresAt) return res.status(400).json({ ok: false, error: 'OTP expired' });
    if (session.attempts >= 5) return res.status(429).json({ ok: false, error: 'Too many attempts. Request a new OTP.' });

    const valid = await verifyOtp(otp, session.otpHash);
    if (!valid) {
      session.attempts += 1; await session.save();
      return res.status(400).json({ ok: false, error: `Wrong OTP. ${5 - session.attempts} attempts left.` });
    }
    await OtpSession.findByIdAndDelete(session._id);

    let payload;
    try { payload = jwt.verify(regToken, JWT_SECRET); }
    catch { return res.status(401).json({ ok: false, error: 'Registration session expired. Please start again.' }); }

    if (payload.email !== email) return res.status(400).json({ ok: false, error: 'Email mismatch' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ ok: false, error: 'Email already registered' });

    const user = await User.create({
      name: payload.name,
      email: payload.email,
      password,
      phone,
      isEmailVerified: true,
      isActive: true,
    });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
setAuthCookie(res, token, 'bim_token', 7 * 24 * 60 * 60 * 1000);
    res.status(201).json({ ok: true, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, loyaltyPoints: user.loyaltyPoints } });
} catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── LOGOUT with Token Blacklisting ───────────────────────────────────────────────
app.post('/api/auth/logout', async (req, res) => {
  const tokens = [getToken(req, 'bim_token'), getToken(req, 'bim_admin_token'), getToken(req, 'bim_delivery_token')].filter(Boolean);
  for (const token of tokens) {
    try {
      const decoded = jwt.decode(token);
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        await blacklistToken(token, ttl);
      }
    } catch {}
  }
  clearAuthCookie(res, 'bim_token');
  clearAuthCookie(res, 'bim_admin_token');
  clearAuthCookie(res, 'bim_delivery_token');
  res.json({ ok: true, message: 'Logged out' });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = getToken(req, 'bim_token')
      || getToken(req, 'bim_delivery_token')
      || getToken(req, 'bim_admin_token');
    if (!token) return res.status(401).json({ ok: false, error: 'No token' });
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); }
    catch { return res.status(401).json({ ok: false, error: 'Invalid token' }); }
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    res.json({ ok: true, user });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.put('/api/auth/profile', authenticate, v.vUpdateProfile, validate, async (req, res) => {
  try {
    const { name, phone, savedAddresses } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone, savedAddresses }, { new: true }).select('-password');
    res.json({ ok: true, user });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/auth/profile/photo', authenticate, uploadLimiter, async (req, res) => {
  const file = req.files?.photo;
  try {
    if (!req.files || !file) return res.status(400).json({ ok: false, error: 'No photo uploaded' });
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      fs.unlink(file.tempFilePath, () => {});
      return res.status(415).json({ ok: false, error: 'Only JPEG, PNG, WEBP or GIF allowed' });
    }
    if (file.size > 5 * 1024 * 1024) {
      fs.unlink(file.tempFilePath, () => {});
      return res.status(413).json({ ok: false, error: 'Max file size is 5MB' });
    }
    const result = await cloudinary.uploader.upload(file.tempFilePath, { folder: process.env.CLOUDINARY_FOLDER, width: 300, height: 300, crop: 'fill', fetch_format: 'auto', quality: 'auto' });
    fs.unlink(file.tempFilePath, () => {});
    const user = await User.findByIdAndUpdate(req.user.id, { profilePhoto: result.secure_url }, { new: true }).select('-password');
    res.json({ ok: true, photoUrl: result.secure_url, user });
  } catch (err) {
    if (file?.tempFilePath) fs.unlink(file.tempFilePath, () => {});
    res.status(500).json({ ok: false, error: 'Upload failed' });
  }
});

// ── CHANGE PASSWORD (OTP-gated) ──────────────────────────────────────────────
app.post('/api/auth/change-password/send-otp', authenticate, otpLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    const email = user.email;
    const existing = await OtpSession.findOne({ identifier: email, purpose: 'reset' });
    if (existing && isCooldownActive(existing.lastSentAt)) {
      return res.status(429).json({ ok: false, error: `Wait ${cooldownSecondsLeft(existing.lastSentAt)}s before resending` });
    }
    const otp = generateOtp();
    const hash = await hashOtp(otp);
    await OtpSession.findOneAndDelete({ identifier: email, purpose: 'reset' });
    await OtpSession.create({ identifier: email, type: 'email', purpose: 'reset', otpHash: hash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), lastSentAt: new Date() });
    await sendEmailOtp({ to: email, otp, purpose: 'reset', name: user.name });
    res.json({ ok: true, message: 'OTP sent to your email' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});
app.post('/api/auth/change-password/verify', authenticate, authLimiter, async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    if (!otp || !newPassword || !passwordStrength(newPassword)) return res.status(400).json({ ok: false, error: 'OTP and new password (8+ chars with uppercase, lowercase, number and special char) required' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    const session = await OtpSession.findOne({ identifier: user.email, purpose: 'reset' });
    if (!session) return res.status(400).json({ ok: false, error: 'No OTP found. Request again.' });
    if (new Date() > session.expiresAt) return res.status(400).json({ ok: false, error: 'OTP expired' });
    if (session.attempts >= 5) return res.status(429).json({ ok: false, error: 'Too many attempts' });
    const valid = await verifyOtp(otp, session.otpHash);
    if (!valid) {
      session.attempts += 1;
      await session.save();
      await logSecurityEvent('otp_failure', { userId: req.user.id, email: user.email, details: { purpose: 'change_password' } });
      return res.status(400).json({ ok: false, error: 'Wrong OTP' });
    }
    await OtpSession.findByIdAndDelete(session._id);
    user.password = newPassword;
    await user.save();
    await logSecurityEvent('password_change', { userId: req.user.id, email: user.email });
    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});



// ── CHANGE EMAIL (OTP-gated) ──────────────────────────────────────────────────
app.post('/api/auth/change-email/send-otp', authenticate, otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'Email required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ ok: false, error: 'Email already in use' });
    const existingOtp = await OtpSession.findOne({ identifier: email, purpose: 'register' });
    if (existingOtp && isCooldownActive(existingOtp.lastSentAt)) {
      return res.status(429).json({ ok: false, error: `Wait ${cooldownSecondsLeft(existingOtp.lastSentAt)}s before resending` });
    }
    const user = await User.findById(req.user.id);
    const otp = generateOtp(); const hash = await hashOtp(otp);
    await OtpSession.findOneAndDelete({ identifier: email, purpose: 'register' });
    await OtpSession.create({ identifier: email, type: 'email', purpose: 'register', otpHash: hash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), lastSentAt: new Date() });
    await sendEmailOtp({ to: email, otp, purpose: 'register', name: user?.name || 'User' });
    res.json({ ok: true, message: 'OTP sent to new email' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});
app.post('/api/auth/change-email/verify', authenticate, authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ ok: false, error: 'Email and OTP required' });
    const session = await OtpSession.findOne({ identifier: email, purpose: 'register' });
    if (!session) return res.status(400).json({ ok: false, error: 'No OTP found. Request again.' });
    if (new Date() > session.expiresAt) return res.status(400).json({ ok: false, error: 'OTP expired' });
    if (session.attempts >= 5) return res.status(429).json({ ok: false, error: 'Too many attempts' });
    const valid = await verifyOtp(otp, session.otpHash);
    if (!valid) {
      session.attempts += 1;
      await session.save();
      await logSecurityEvent('otp_failure', { userId: req.user.id, email, details: { purpose: 'change_email' } });
      return res.status(400).json({ ok: false, error: 'Wrong OTP' });
    }
    await OtpSession.findByIdAndDelete(session._id);
    const user = await User.findByIdAndUpdate(req.user.id, { email, isEmailVerified: true }, { new: true }).select('-password');
    res.json({ ok: true, user, message: 'Email updated' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ── SAVED ADDRESSES ──────────────────────────────────────────────────────────
app.put('/api/auth/addresses', authenticate, async (req, res) => {
  try {
    const { addresses } = req.body;
    if (!Array.isArray(addresses)) return res.status(400).json({ ok: false, error: 'addresses array required' });
    const user = await User.findByIdAndUpdate(req.user.id, { savedAddresses: addresses }, { new: true }).select('-password');
    res.json({ ok: true, addresses: user.savedAddresses, user });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
app.post('/api/auth/forgot-password', otpLimiter, v.vForgotPassword, validate, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'Email required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ ok: false, error: 'No account with this email' });
    const existing = await OtpSession.findOne({ identifier: email, purpose: 'reset' });
    if (existing && isCooldownActive(existing.lastSentAt)) {
      return res.status(429).json({ ok: false, error: `Please wait ${cooldownSecondsLeft(existing.lastSentAt)}s before requesting again` });
    }
    const otp  = generateOtp();
    const hash = await hashOtp(otp);
    await OtpSession.findOneAndDelete({ identifier: email, purpose: 'reset' });
    await OtpSession.create({ identifier: email, type: 'email', purpose: 'reset', otpHash: hash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), lastSentAt: new Date() });
    await sendEmailOtp({ to: email, otp, purpose: 'reset', name: user.name });
    res.json({ ok: true, message: 'OTP sent to your email' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/auth/verify-reset-otp', authLimiter, v.vVerifyResetOtp, validate, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const session = await OtpSession.findOne({ identifier: email, purpose: 'reset' });
    if (!session) return res.status(400).json({ ok: false, error: 'No OTP found. Please request again.' });
    if (new Date() > session.expiresAt) return res.status(400).json({ ok: false, error: 'OTP expired' });
    if (session.attempts >= 5) return res.status(429).json({ ok: false, error: 'Too many attempts' });
    const valid = await bcrypt.compare(otp, session.otpHash);
    if (!valid) {
      session.attempts += 1; await session.save();
      return res.status(400).json({ ok: false, error: 'Wrong OTP' });
    }
    await OtpSession.findByIdAndDelete(session._id);
    const resetToken = jwt.sign({ email, purpose: 'reset' }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ ok: true, resetToken });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/auth/reset-password', passwordLimiter, v.vResetPassword, validate, async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    const payload = jwt.verify(resetToken, JWT_SECRET);
    if (payload.purpose !== 'reset') throw new Error('Invalid token');
    const user = await User.findOne({ email: payload.email });
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    user.password = newPassword;
    await user.save();
    res.json({ ok: true, message: 'Password updated successfully' });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

// ─── DELIVERY BOY AUTH (use unified /api/auth/login/unified/*) ────────────────
app.post('/api/delivery/login', authLimiter, v.vDeliveryLogin, validate, async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ ok: false, error: 'Phone and password required' });
    const user = await User.findOne({ phone, role: 'delivery_boy' });
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ ok: false, error: 'Account deactivated' });
    
    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(429).json({ ok: false, error: 'Account temporarily locked. Try again later.' });
    }
    
    const valid = await user.comparePassword(password);
    if (!valid) {
      await user.incLoginAttempts();
      await logSecurityEvent('failed_login', { userId: user._id, email: user.email, details: { reason: 'invalid_password', role: 'delivery_boy' } });
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    
    await user.resetLoginAttempts();
    await logSecurityEvent('login_success', { userId: user._id, email: user.email, details: { role: 'delivery_boy' } });
    
    const token = jwt.sign({ id: user._id, phone: user.phone, role: 'delivery_boy' }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token, 'bim_delivery_token', 7 * 24 * 60 * 60 * 1000);
    res.json({ ok: true, user: { id: user._id, name: user.name, phone: user.phone, role: 'delivery_boy', isOnline: user.isOnline, mustSetPassword: user.mustSetPassword } });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/delivery/set-password', deliveryOnly, passwordLimiter, v.vDeliverySetPassword, validate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'delivery_boy') return res.status(404).json({ ok: false, error: 'Delivery boy not found' });
    if (!user.mustSetPassword) {
      if (!currentPassword) return res.status(400).json({ ok: false, error: 'Current password required' });
      const valid = await user.comparePassword(currentPassword);
      if (!valid) return res.status(401).json({ ok: false, error: 'Current password is incorrect' });
    }
    user.password = newPassword;
    user.mustSetPassword = false;
    await user.save();
    res.json({ ok: true, message: 'Password updated successfully' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── ADMIN: DELIVERY BOY MANAGEMENT ──────────────────────────────────────────
app.get('/api/admin/delivery-boys', adminOnly, async (req, res) => {
  try {
    const boys = await User.find({ role: 'delivery_boy' }).select('-password').sort({ createdAt: -1 });
    res.json({ ok: true, boys });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/admin/delivery-boys', adminOnly, v.vAdminCreateDeliveryBoy, validate, async (req, res) => {
  try {
    const { name, phone, email, password, vehicleType, vehicleNumber } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ ok: false, error: 'Name, phone and password required' });
    const emailToUse = email || `${phone}@delivery.bim`;
    const existing = await User.findOne({ $or: [{ phone }, { email: emailToUse }] });
    if (existing) return res.status(409).json({ ok: false, error: 'Phone or email already registered' });
    const boy = await User.create({ name, phone, email: emailToUse, password, role: 'delivery_boy', vehicleType, vehicleNumber, mustSetPassword: true });
    res.status(201).json({ ok: true, boy: { id: boy._id, name: boy.name, phone: boy.phone, isActive: boy.isActive } });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/admin/delivery-boys/:id', adminOnly, v.vAdminUpdateDeliveryBoy, validate, async (req, res) => {
  try {
    const { name, phone, email, isActive, vehicleType, vehicleNumber } = req.body;
    const update = { name, phone, email, isActive, vehicleType, vehicleNumber };
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);
    const boy = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!boy) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, boy });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── DELIVERY BOY: ORDER ROUTES ───────────────────────────────────────────────
app.get('/api/delivery/orders', deliveryOnly, async (req, res) => {
  try {
    const orders = await Order.find({ assignedTo: req.user.id, status: { $in: ['confirmed', 'preparing', 'reached_restaurant', 'picked_up', 'out_for_delivery'] } }).sort({ createdAt: -1 });
    res.json({ ok: true, orders });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/delivery/orders/:orderId/accept', deliveryOnly, v.vDeliveryAccept, validate, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ ok: false, error: 'Location (lat/lng) required to accept' });
    const order = await Order.findOneAndUpdate({ orderId: req.params.orderId, assignedTo: req.user.id }, { acceptedAt: new Date(), deliveryBoyLocation: { lat, lng, updatedAt: new Date() } }, { new: true });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    notifyAdmin('order-updated', order);
    notifyOrder(order.orderId, 'delivery-location-update', { lat, lng, updatedAt: new Date() });
    res.json({ ok: true, order });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/delivery/orders/:orderId/reject', deliveryOnly, v.vDeliveryRejectOrder, validate, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOneAndUpdate({ orderId: req.params.orderId, assignedTo: req.user.id }, { assignedTo: null, acceptedAt: null, rejectedBy: req.user.id, rejectReason: reason, status: 'confirmed' }, { new: true });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found or not assigned to you' });
    notifyAdmin('order-updated', order);
    res.json({ ok: true, order });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/delivery/orders/:orderId', deliveryOnly, v.vDeliveryOrderIdParam, validate, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, assignedTo: req.user.id });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    res.json({ ok: true, order });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/delivery/orders/:orderId/location', liveTrackingLimiter, deliveryOnly, v.vDeliveryLocation, validate, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const order = await Order.findOneAndUpdate({ orderId: req.params.orderId, assignedTo: req.user.id }, { deliveryBoyLocation: { lat, lng, updatedAt: new Date() } }, { new: true });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    notifyOrder(order.orderId, 'delivery-location-update', { lat, lng, updatedAt: new Date() });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/delivery/orders/:orderId/status', deliveryOnly, v.vDeliveryOrderStatus, validate, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate({ orderId: req.params.orderId, assignedTo: req.user.id }, { status }, { new: true });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    broadcastStatusUpdate(order, status);
    res.json({ ok: true, order });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/delivery/orders/:orderId/request-delivery-otp', deliveryOnly, otpLimiter, v.vDeliveryOrderIdParam, validate, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, assignedTo: req.user.id });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    if (order.status === 'delivered') return res.status(400).json({ ok: false, error: 'Order already delivered' });
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    order.deliveryOtp = otpHash;
    order.deliveryOtpExpiry = expiry;
    await order.save();
    if (order.customer?.email) await sendEmailOtp({ to: order.customer.email, otp, purpose: 'delivery_confirm', name: order.customer.name || 'Customer' }).catch(() => {});
    res.json({ ok: true, message: 'OTP sent to customer' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/delivery/orders/:orderId/verify-otp', deliveryOnly, authLimiter, v.vDeliveryVerifyOtp, validate, async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId, assignedTo: req.user.id });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    if (!order.deliveryOtp) return res.status(400).json({ ok: false, error: 'No OTP generated for this order' });
    if (new Date() > order.deliveryOtpExpiry) return res.status(400).json({ ok: false, error: 'OTP expired' });
    const validOtp = await verifyOtp(otp, order.deliveryOtp);
    if (!validOtp) return res.status(400).json({ ok: false, error: 'Wrong OTP' });
    order.otpVerified = true;
    order.status = 'delivered';
    await order.save();
    broadcastStatusUpdate(order, 'delivered');
    if (order.userId && order.totals?.total) {
      await User.findByIdAndUpdate(order.userId, { $inc: { loyaltyPoints: Math.floor(order.totals.total / 10) } });
    }
    res.json({ ok: true, message: 'Delivery confirmed!' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/delivery/status', deliveryOnly, v.vDeliveryOnlineStatus, validate, async (req, res) => {
  try {
    const { isOnline } = req.body;
    await User.findByIdAndUpdate(req.user.id, { isOnline });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── DELIVERY: CURRENT LOCATION ──────────────────────────────────────────────
app.get('/api/delivery/my-location', liveTrackingLimiter, deliveryOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('currentLocation name isOnline');
    res.json({ ok: true, location: user.currentLocation });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/delivery/my-location', liveTrackingLimiter, deliveryOnly, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ ok: false, error: 'lat aur lng required hain (numbers)' });
    const updatedAt = new Date();
    await User.findByIdAndUpdate(req.user.id, { currentLocation: { lat, lng, updatedAt } });
    const activeOrder = await Order.findOne({ assignedTo: req.user.id, status: { $in: ['confirmed', 'reached_restaurant', 'picked_up', 'out_for_delivery'] } });
    if (activeOrder) {
      await Order.findByIdAndUpdate(activeOrder._id, { deliveryBoyLocation: { lat, lng, updatedAt } });
      notifyOrder(activeOrder.orderId, 'delivery-location-update', { lat, lng, updatedAt });
      notifyAdmin('delivery-location-update', { orderId: activeOrder.orderId, lat, lng, updatedAt });
    }
    res.json({ ok: true, updatedAt });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── DELIVERY: EARNINGS ──────────────────────────────────────────────────────
app.get('/api/delivery/earnings', deliveryOnly, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const baseFilter = { assignedTo: req.user.id, status: 'delivered' };
    const COMMISSION_RATE = 0.10;
    const [todayOrders, weekOrders, monthOrders, allOrders] = await Promise.all([
      Order.find({ ...baseFilter, createdAt: { $gte: startOfDay } }).select('totals createdAt orderId'),
      Order.find({ ...baseFilter, createdAt: { $gte: startOfWeek } }).select('totals createdAt orderId'),
      Order.find({ ...baseFilter, createdAt: { $gte: startOfMonth } }).select('totals createdAt orderId'),
      Order.find(baseFilter).sort({ createdAt: -1 }).limit(50).select('totals createdAt orderId customer customerLocation'),
    ]);
    const orderIds = allOrders.map(o => o.orderId);
    const ratings = await DeliveryRating.find({ orderId: { $in: orderIds } }).select('orderId rating');
    const ratingMap = {};
    ratings.forEach(r => { ratingMap[r.orderId] = r.rating; });
    const calcEarnings = (orders) => {
      const total = orders.reduce((sum, o) => sum + (o.totals?.total || 0), 0);
      return { count: orders.length, orderTotal: Math.round(total), commission: Math.round(total * COMMISSION_RATE) };
    };
    res.json({
      ok: true,
      today: calcEarnings(todayOrders),
      thisWeek: calcEarnings(weekOrders),
      thisMonth: calcEarnings(monthOrders),
      recentOrders: allOrders.map(o => ({
        orderId: o.orderId, total: o.totals?.total || 0, commission: Math.round((o.totals?.total || 0) * COMMISSION_RATE),
        customerName: o.customer?.name || '', deliveryAddress: o.customer?.address || o.customerLocation?.address || '',
        customerLocation: o.customerLocation?.lat ? { lat: o.customerLocation.lat, lng: o.customerLocation.lng } : null,
        deliveryRating: ratingMap[o.orderId] || null, date: o.createdAt,
      })),
      commissionRate: COMMISSION_RATE,
    });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── DELIVERY BOY: PROFILE ────────────────────────────────────────────────────
app.get('/api/delivery/profile', deliveryOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ ok: true, profile: user });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/delivery/profile', deliveryOnly, async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'vehicleType', 'vehicleNumber', 'profilePhoto', 'unavailableDays', 'availabilityNote'];
    const update = {};
    for (const key of allowed) { if (req.body[key] !== undefined) update[key] = req.body[key]; }
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password');
    res.json({ ok: true, profile: user });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/delivery/change-password', deliveryOnly, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || !passwordStrength(newPassword)) return res.status(400).json({ ok: false, error: 'Current aur nayi password chahiye (8+ chars with uppercase, lowercase, number and special char)' });
    const user = await User.findById(req.user.id);
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ ok: false, error: 'Current password galat hai' });
    user.password = newPassword;
    user.mustSetPassword = false;
    await user.save();
    logSecurityEvent('password_change', { userId: user._id, email: user.email });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── DELIVERY BOY: RATINGS ────────────────────────────────────────────────────
app.get('/api/delivery/ratings', deliveryOnly, async (req, res) => {
  try {
    const ratings = await DeliveryRating.find({ deliveryBoyId: req.user.id }).sort({ createdAt: -1 }).limit(50).populate('userId', 'name');
    const avg = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : null;
    res.json({ ok: true, ratings, average: avg ? parseFloat(avg) : null, total: ratings.length });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/delivery/rate', authenticate, async (req, res) => {
  try {
    const { orderId, rating, comment = '' } = req.body;
    if (!orderId || !rating || rating < 1 || rating > 5) return res.status(400).json({ ok: false, error: 'orderId aur 1-5 rating chahiye' });
    const order = await Order.findOne({ orderId, userId: req.user.id, status: 'delivered' });
    if (!order) return res.status(404).json({ ok: false, error: 'Delivered order nahi mili' });
    if (!order.assignedTo) return res.status(400).json({ ok: false, error: 'Is order mein koi delivery boy assign nahi tha' });
    const existing = await DeliveryRating.findOne({ orderId });
    if (existing) { existing.rating = rating; existing.comment = comment; await existing.save(); return res.json({ ok: true, updated: true }); }
    await DeliveryRating.create({ orderId, userId: req.user.id, deliveryBoyId: order.assignedTo, rating, comment });
    res.status(201).json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/delivery/rate/:orderId', authenticate, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, userId: req.user.id });
    if (!order) return res.status(404).json({ ok: false, error: 'Order nahi mili' });
    const existingRating = await DeliveryRating.findOne({ orderId: req.params.orderId });
    res.json({ ok: true, canRate: order.status === 'delivered' && !!order.assignedTo && !existingRating, alreadyRated: !!existingRating, existingRating: existingRating || null });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── DELIVERY BOY: NOTIFICATIONS ─────────────────────────────────────────────
app.get('/api/delivery/notifications', deliveryOnly, async (req, res) => {
  try {
    const notifications = await DeliveryNotif.find({ deliveryBoyId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await DeliveryNotif.countDocuments({ deliveryBoyId: req.user.id, read: false });
    res.json({ ok: true, notifications, unreadCount });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/delivery/notifications/read-all', deliveryOnly, async (req, res) => {
  try {
    await DeliveryNotif.updateMany({ deliveryBoyId: req.user.id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/admin/delivery-boys/:id/message', adminOnly, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ ok: false, error: 'title aur body chahiye' });
    const boy = await User.findOne({ _id: req.params.id, role: 'delivery_boy' });
    if (!boy) return res.status(404).json({ ok: false, error: 'Delivery boy nahi mila' });
    await createDeliveryNotif({ deliveryBoyId: boy._id, type: 'admin_message', title, body, data: {} });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/seed-menu', async (req, res) => {
  try {
    const products = [
      { id: "paneer-makhani", name: "Paneer Makhani Burger", category: "burgers", subcat: "veg", price: 219, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/paneer-makhani", badge: "Signature", spicy: true, veg: true, desc: "Crunchy makhani paneer patty, pickled onions, mint sauce, lettuce, and toasted bun." },
      { id: "million-classic", name: "Million Classic Burger", category: "burgers", subcat: "beef", price: 189, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/million-classic", badge: "Best Seller", desc: "Grilled beef patty, cheese melt, lettuce, onions, and smoky house glaze." },
      { id: "crispy-chicken-burger", name: "Crispy Chicken Burger", category: "burgers", subcat: "chicken", price: 229, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/crispy-chicken-burger", badge: "Crunch", desc: "Crispy chicken, creamy mayo, fresh greens, and tangy sauce in a glossy bun." },
      { id: "veg-crunch-stack", name: "Veg Crunch Stack", category: "burgers", subcat: "veg", price: 169, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/veg-crunch-stack", badge: "Fresh", veg: true, desc: "Veggie patty, onion crunch, capsicum, lettuce, and zesty green sauce." },
      { id: "smoky-bbq-beef", name: "Smoky BBQ Beef", category: "burgers", subcat: "beef", price: 259, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/double-smash", badge: "New", spicy: true, desc: "Slow-cooked beef patty, house BBQ sauce, caramelized onions, crispy bacon, and pickles." },
      { id: "zinger-spicy", name: "Zinger Spicy Stack", category: "burgers", subcat: "chicken", price: 239, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/zinger-spicy", badge: "🔥 Hot", spicy: true, desc: "Double-dredged spicy chicken fillet, ghost pepper sauce, jalapeños, and sriracha slaw." },
      { id: "mushroom-swiss", name: "Mushroom Swiss Burger", category: "burgers", subcat: "special", price: 249, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/mushroom-swiss", badge: "Special", desc: "Sautéed portobello mushrooms, Swiss cheese, truffle aioli, and rocket leaves." },
      { id: "double-smash", name: "Double Smash Burger", category: "burgers", subcat: "beef", price: 299, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/double-smash", badge: "Big Stack", desc: "Two smashed beef patties, double cheese, pickles, and our secret thousand island sauce." },
      { id: "strip-cravings", name: "Strip Cravings Box", category: "sides", price: 179, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/strip-cravings", badge: "Golden", desc: "Crispy strips with a flaky seasoned crust and dip on the side." },
      { id: "crispy-bites", name: "Crispy Cheese Bites", category: "sides", price: 149, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/crispy-bites", badge: "Melty", desc: "Bite-sized golden crunch with soft, cheesy centers." },
      { id: "loaded-fries", name: "Loaded Cheese Fries", category: "sides", price: 159, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/loaded-fries", badge: "Loaded", desc: "Thick-cut fries smothered in nacho cheese, jalapeños, and sour cream." },
      { id: "onion-rings", name: "Crispy Onion Rings", category: "sides", price: 119, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/onion-rings", badge: "Crunchy", desc: "Beer-battered onion rings with chipotle dipping sauce." },
      { id: "oreo-shake", name: "Oreo Magic Shake", category: "drinks", price: 139, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/oreo-shake", badge: "Chill", desc: "Creamy Oreo shake, cold and thick with cookie crumble." },
      { id: "green-cooler", name: "Mint Lime Cooler", category: "drinks", price: 99, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/green-cooler", badge: "Fizz", desc: "Mint, lime, herbs, and sparkling refreshment." },
      { id: "mango-lassi", name: "Mango Masala Lassi", category: "drinks", price: 119, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/mango-lassi", badge: "Desi", desc: "Thick mango lassi with a hint of cardamom and saffron." },
      { id: "cola-float", name: "Vanilla Cola Float", category: "drinks", price: 129, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/oreo-shake", badge: "Classic", desc: "Chilled cola topped with a scoop of vanilla ice cream." },
      { id: "million-meal", name: "Million Meal Combo", category: "combos", price: 399, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/paneer-makhani", badge: "Deal", desc: "Paneer Makhani Burger, crispy strips, and one house drink." },
      { id: "family-feast", name: "Family Feast Box", category: "combos", price: 899, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/crispy-chicken-burger", badge: "Value", desc: "4 burgers, 2 large fries, 4 drinks — perfect for sharing." },
      { id: "couple-combo", name: "Couple's Combo", category: "combos", price: 549, image: "https://res.cloudinary.com/dsjxrospe/image/upload/f_auto,q_auto,w_600,h_600,c_fill/one%20in%20a%20million/images/paneer-makhani", badge: "Date Night", desc: "2 burgers of your choice, shared fries, and 2 house drinks." }
    ];
    for (const p of products) {
      await MenuItem.findOneAndUpdate({ id: p.id }, p, { upsert: true, new: true });
    }
    res.json({ ok: true, message: `Seeded ${products.length} items.` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── MENU ROUTES ──────────────────────────────────────────────────────────────
app.get('/api/menu', v.vMenuQuery, validate, async (req, res) => {
  try {
    const { category, subcat, search, veg, spicy, minPrice, maxPrice, sort } = req.query;
    const filter = { available: true };
    if (category && category !== 'all') filter.category = category;
    if (subcat && subcat !== 'all') filter.subcat = subcat;
    if (veg === 'true') filter.veg = true;
    if (veg === 'false') filter.veg = false;
    if (spicy === 'true') filter.spicy = true;
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { desc: { $regex: search, $options: 'i' } }];
    if (minPrice || maxPrice) { filter.price = {}; if (minPrice) filter.price.$gte = Number(minPrice); if (maxPrice) filter.price.$lte = Number(maxPrice); }
    let query = MenuItem.find(filter);
    if (sort === 'price-asc') query = query.sort({ price: 1 });
    else if (sort === 'price-desc') query = query.sort({ price: -1 });
    else if (sort === 'name') query = query.sort({ name: 1 });
    else query = query.sort({ createdAt: -1 });
    const items = await query;
    res.json({ ok: true, items });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/menu/categories', async (req, res) => {
  try {
    const categories = await MenuItem.distinct('category', { available: true });
    res.json({ ok: true, categories });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/menu/all', adminOnly, v.vMenuAllQuery, validate, async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const items = await MenuItem.find(filter).sort({ createdAt: -1 });
    res.json({ ok: true, items });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/menu', adminOnly, v.vMenuCreate, validate, async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json({ ok: true, item });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.put('/api/menu/:id', adminOnly, v.vMenuUpdate, validate, async (req, res) => {
  try {
    const item = await MenuItem.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!item) return res.status(404).json({ ok: false, error: 'Item not found' });
    res.json({ ok: true, item });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.delete('/api/menu/:id', adminOnly, v.vMenuIdParam, validate, async (req, res) => {
  try {
    await MenuItem.findOneAndDelete({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

// ─── ORDERS ROUTES ────────────────────────────────────────────────────────────
app.post('/api/orders', authenticate, orderLimiter, v.vCreateOrder, validate, async (req, res) => {
  try {
    const orderId = 'BIM-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const customerLocation = {};
    if (req.body.customer?.deliveryAddress) customerLocation.address = req.body.customer.deliveryAddress;
    if (req.body.customer?.deliveryDetails) customerLocation.landmark = req.body.customer.deliveryDetails;
    if (req.body.customer?.deliveryCoords) { customerLocation.lat = req.body.customer.deliveryCoords.lat; customerLocation.lng = req.body.customer.deliveryCoords.lng; }
    if (req.body.fulfillment === 'delivery') {
      if (!customerLocation.address) return res.status(400).json({ ok: false, error: 'Delivery address required' });
      if (customerLocation.lat == null || customerLocation.lng == null) return res.status(400).json({ ok: false, error: 'Delivery location coordinates required — please use "My Location" button or select from search results' });
      if (!customerLocation.landmark?.trim()) return res.status(400).json({ ok: false, error: 'Flat / house number / landmark details required' });
    }
    // Check if authenticated user is banned
    if (req.user?.id) {
      const user = await User.findById(req.user.id);
      if (user?.isBanned) {
        return res.status(403).json({ ok: false, error: 'Your account has been banned' });
      }
    }
    const order = await Order.create({ userId: req.user.id, ...req.body, orderId, customerLocation });
    notifyAdmin('new-order', order);
    if (order.userId && order.totals?.total) {
      await User.findByIdAndUpdate(order.userId, { $inc: { loyaltyPoints: Math.floor(order.totals.total / 10) } });
    }
    if (order.userId) {
      createNotification({ userId: order.userId, type: 'order_status', title: '🧾 Order Placed!', body: `Your order ${orderId} has been received. We'll confirm shortly.`, data: { orderId, status: 'pending' } });
      User.findById(order.userId).then(user => { if (user) sendOrderConfirmation({ order, userEmail: user.email, userName: user.name, userPhone: user.phone }).catch(() => {}); }).catch(() => {});
    }
    res.status(201).json({ ok: true, orderId: order.orderId, _id: order._id });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.get('/api/orders', adminOnly, v.vOrdersListQuery, validate, async (req, res) => {
  const { status, page = 1, limit = 100 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const orders = await Order.find(filter).populate('assignedTo', 'name phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  const total = await Order.countDocuments(filter);
  res.json({ ok: true, orders, total, pages: Math.ceil(total / limit) });
});

app.get('/api/orders/my', authenticate, async (req, res) => {
  const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).populate('assignedTo', 'name phone currentLocation');
  res.json({ ok: true, orders });
});

app.get('/api/orders/:id', authenticate, v.vOrderIdParam, validate, async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.id }).populate('assignedTo', 'name phone currentLocation');
  if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
  // Only the customer who placed the order, the delivery boy assigned to
  // it, or an admin may view it — previously this endpoint was fully
  // public, leaking customer address/phone/coords and live delivery-boy
  // location to anyone who guessed an orderId (bug report §6).
  const isOwner = order.userId && String(order.userId) === String(req.user.id);
  const isAssignedDelivery = order.assignedTo && String(order.assignedTo._id || order.assignedTo) === String(req.user.id);
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAssignedDelivery && !isAdmin) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  res.json({ ok: true, order });
});

app.patch('/api/orders/:id/status', adminOnly, v.vOrderUpdateStatus, validate, async (req, res) => {
  try {
    const { status, assignedTo } = req.body;
    const update = { status };
    if (assignedTo) { update.assignedTo = assignedTo; update.assignedAt = new Date(); }
    const order = await Order.findOneAndUpdate({ orderId: req.params.id }, update, { new: true });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    // Auto-generate delivery OTP when status changes to out_for_delivery
    if (status === 'out_for_delivery') {
      const otp = generateOtp();
      const otpHash = await hashOtp(otp);
      const expiry = new Date(Date.now() + 10 * 60 * 1000);
      order.deliveryOtp = otpHash;
      order.deliveryOtpExpiry = expiry;
      await order.save();
      if (order.customer?.email) await sendEmailOtp({ to: order.customer.email, otp, purpose: 'delivery_confirm', name: order.customer.name || 'Customer' }).catch(() => {});
    }
    broadcastStatusUpdate(order, status);
    if (assignedTo) {
      notifyDelivery(assignedTo, 'new-assignment', order);
      createDeliveryNotif({ deliveryBoyId: assignedTo, type: 'new_order', title: '🛵 Nayi Order Assign!', body: `Order ${order.orderId} aapko assign hua hai — ₹${order.totals?.total?.toFixed(0)}`, data: { orderId: order.orderId } });
    }
    if (status === 'cancelled' && order.assignedTo) {
      createDeliveryNotif({ deliveryBoyId: order.assignedTo, type: 'order_cancelled', title: '❌ Order Cancel Hua', body: `Order ${order.orderId} customer ne cancel kar diya.`, data: { orderId: order.orderId } });
    }
    res.json({ ok: true, order });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.post('/api/orders/:id/cancel', authenticate, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    if (String(order.userId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Unauthorized' });
    }
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return res.status(400).json({ ok: false, error: 'Order cannot be cancelled at this stage' });
    }
    const update = { status: 'cancelled' };
    await Order.findOneAndUpdate({ orderId: req.params.id }, update);
    if (order.assignedTo) {
      createDeliveryNotif({ deliveryBoyId: order.assignedTo, type: 'order_cancelled', title: '❌ Order Cancel Hua', body: `Order ${order.orderId} customer ne cancel kar diya.`, data: { orderId: order.orderId } });
    }
    createNotification({ userId: order.userId, type: 'order_status', title: '❌ Order Cancelled', body: `Your order ${order.orderId} has been cancelled.`, data: { orderId: order.orderId, status: 'cancelled' } });
    res.json({ ok: true, message: 'Order cancelled' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/orders/:id/assign', adminOnly, v.vOrderAssign, validate, async (req, res) => {
  try {
    const { deliveryBoyId } = req.body;
    if (!deliveryBoyId) return res.status(400).json({ ok: false, error: 'deliveryBoyId required' });
    const deliveryBoy = await User.findOne({ _id: deliveryBoyId, role: 'delivery_boy' });
    if (!deliveryBoy) return res.status(404).json({ ok: false, error: 'Delivery boy not found' });
    if (!deliveryBoy.isActive) return res.status(400).json({ ok: false, error: 'This delivery boy is inactive' });
    const order = await Order.findOneAndUpdate({ orderId: req.params.id }, { assignedTo: deliveryBoyId, status: 'confirmed', assignedAt: new Date() }, { new: true }).populate('assignedTo', 'name phone');
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    broadcastStatusUpdate(order, 'confirmed');
    notifyDelivery(deliveryBoyId, 'new-assignment', order);
    createDeliveryNotif({ deliveryBoyId, type: 'new_order', title: '🛵 Nayi Order Assign!', body: `Order ${order.orderId} aapko assign hua hai — ₹${order.totals?.total?.toFixed(0)}`, data: { orderId: order.orderId } });
    res.json({ ok: true, order });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── ADMIN CUSTOMER MANAGEMENT ─────────────────────────────────────────────
app.get('/api/admin/customers', adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('name email phone loyaltyPoints isBanned createdAt isActive').sort({ createdAt: -1 });
    res.json({ ok: true, customers: users });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/admin/customers/:id/ban', adminOnly, v.vAdminUpdateCustomer, validate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: req.body.isBanned }, { new: true });
    if (!user) return res.status(404).json({ ok: false, error: 'Customer not found' });
    res.json({ ok: true, customer: user });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/admin/customers/:id/loyalty', adminOnly, v.vAdminUpdateLoyalty, validate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { $inc: { loyaltyPoints: req.body.points } }, { new: true });
    if (!user) return res.status(404).json({ ok: false, error: 'Customer not found' });
    res.json({ ok: true, customer: user });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/orders/:id/generate-delivery-otp', deliveryOnly, otpLimiter, v.vOrderIdParam, validate, async (req, res) => {
  try {
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    const order = await Order.findOneAndUpdate({ orderId: req.params.id }, { deliveryOtp: otpHash, deliveryOtpExpiry: expiry }, { new: true });
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });

    if (order.customer?.email) await sendEmailOtp({ to: order.customer.email, otp, purpose: 'delivery_confirm', name: order.customer.name || 'Customer' }).catch(() => {});
    res.json({ ok: true, message: 'Delivery OTP generated and sent to customer' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── RESERVATIONS ─────────────────────────────────────────────────────────────
app.post('/api/reservations', reservationLimiter, v.vCreateReservation, validate, async (req, res) => {
  try {
    const location = req.body.location || LOCATIONS[0];
    const date = req.body.date;
    const time = req.body.time;
    
    // Check table availability (max 20 tables per location)
    const existing = await Reservation.countDocuments({ location, date, time, status: { $ne: 'cancelled' } });
    if (existing >= 20) {
      return res.status(409).json({ ok: false, error: 'No tables available at this time. Please choose another slot.' });
    }
    
    const reservation = await Reservation.create(req.body);
    notifyAdmin('new-reservation', reservation);
    // Send confirmation email to customer
    const toName = req.body.name;
    const toEmail = req.body.email;
    const toPhone = req.body.phone;
    if (toEmail || toPhone) {
      sendReservationConfirmation({
        name: toName,
        email: toEmail,
        phone: toPhone,
        date: req.body.date,
        time: req.body.time,
        guests: req.body.guests,
        location: req.body.location || LOCATIONS[0],
      }).catch(() => {});
    }
    res.status(201).json({ ok: true, reservation });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.get('/api/reservations', adminOnly, v.vReservationsQuery, validate, async (req, res) => {
  const { status, date } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (date) filter.date = date;
  const reservations = await Reservation.find(filter).sort({ date: 1, time: 1 });
  res.json({ ok: true, reservations });
});

app.patch('/api/reservations/:id', adminOnly, v.vUpdateReservation, validate, async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reservation) return res.status(404).json({ ok: false, error: 'Not found' });
    // Notify admin on status change
    notifyAdmin('reservation-updated', reservation);
    res.json({ ok: true, reservation });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ── USER CANCEL RESERVATION ────────────────────────────────────────────────
// Users can cancel their own reservation by providing their email + phone
// Reservation ID is optional but helps narrow down
app.post('/api/reservations/cancel', async (req, res) => {
  try {
    const { email, phone, reservationId } = req.body;
    if (!email && !phone && !reservationId) {
      return res.status(400).json({ ok: false, error: 'Email, phone or reservationId required' });
    }
    const filter = { status: { $ne: 'cancelled' } };
    if (reservationId) filter._id = reservationId;
    if (email) filter.email = email;
    if (phone) filter.phone = phone;
    
    const reservation = await Reservation.findOne(filter);
    if (!reservation) return res.status(404).json({ ok: false, error: 'Reservation not found or already cancelled' });
    
    reservation.status = 'cancelled';
    await reservation.save();
    notifyAdmin('reservation-updated', reservation);
    res.json({ ok: true, message: 'Reservation cancelled successfully' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── COUPONS ──────────────────────────────────────────────────────────────────
app.get('/api/coupons', adminOnly, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    const now = new Date();
    const enriched = coupons.map(c => { const obj = c.toObject(); obj.isExpired = c.expiry ? c.expiry < now : false; obj.usageRate = c.maxUses ? Math.round((c.usedCount / c.maxUses) * 100) : null; return obj; });
    res.json({ ok: true, coupons: enriched });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/coupons', adminOnly, v.vCreateCoupon, validate, async (req, res) => {
  try {
    const coupon = await Coupon.create({ ...req.body, code: req.body.code?.toUpperCase() });
    res.status(201).json({ ok: true, coupon });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.patch('/api/coupons/:id', adminOnly, v.vUpdateCoupon, validate, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, coupon });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.delete('/api/coupons/:id', adminOnly, v.vDeleteCoupon, validate, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.post('/api/coupons/validate', couponLimiter, v.vValidateCoupon, validate, async (req, res) => {
  try {
    const { code, orderTotal, userId } = req.body;
    const coupon = await Coupon.findOne({ code: code?.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ ok: false, error: 'Invalid coupon code' });
    if (coupon.expiry && new Date() > coupon.expiry) return res.status(400).json({ ok: false, error: 'Coupon expired' });
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ ok: false, error: 'Coupon usage limit reached' });
    if (orderTotal < coupon.minOrder) return res.status(400).json({ ok: false, error: `Minimum order ₹${coupon.minOrder} required` });
    if (coupon.userId && coupon.userId.toString() !== userId) return res.status(403).json({ ok: false, error: 'This coupon is not for you' });
    const discount = coupon.discountType === 'percent' ? Math.floor(orderTotal * coupon.discountValue / 100) : coupon.discountValue;
    res.json({ ok: true, discount, discountType: coupon.discountType, discountValue: coupon.discountValue });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/coupons/use', optionalAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ ok: false, error: 'code required' });
    await Coupon.findOneAndUpdate({ code: code.toUpperCase(), isActive: true }, { $inc: { usedCount: 1 } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/coupons/my', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || null;
    const now = new Date();
    const query = { isActive: true, $or: [{ userId: null }, ...(userId ? [{ userId }] : [])], $and: [{ $or: [{ expiry: null }, { expiry: { $gt: now } }] }, { $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] }] };
    const coupons = await Coupon.find(query).select('-userId').sort({ createdAt: -1 });
    res.json({ ok: true, coupons });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── REVIEWS ────────────────────────────────────────────────────────────────
app.get('/api/reviews', v.vReviewsQuery, validate, async (req, res) => {
  try {
    const { itemId, page = 1, limit = 20 } = req.query;
    const filter = { isVisible: true };
    if (itemId) filter.itemId = itemId;
    const reviews = await Review.find(filter).populate('userId', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    const total = await Review.countDocuments(filter);
    const allVisible = await Review.find({ isVisible: true }, 'rating');
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allVisible.forEach(r => { if (ratingCounts[r.rating] !== undefined) ratingCounts[r.rating]++; });
    const avgRating = allVisible.length ? (allVisible.reduce((s, r) => s + r.rating, 0) / allVisible.length).toFixed(1) : '0.0';
    res.json({ ok: true, reviews, total, ratingCounts, avgRating: Number(avgRating), totalVisible: allVisible.length });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/reviews/my', authenticate, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ ok: true, reviews });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/reviews', authenticate, v.vCreateReview, validate, async (req, res) => {
  try {
    const { orderId, itemId, rating, comment, photos } = req.body;
    if (!orderId || !rating) return res.status(400).json({ ok: false, error: 'orderId and rating are required' });
    const order = await Order.findOne({ orderId, userId: req.user.id, status: 'delivered' });
    if (!order) return res.status(403).json({ ok: false, error: 'You can only review delivered orders' });
    const existing = await Review.findOne({ userId: req.user.id, orderId });
    if (existing) return res.status(409).json({ ok: false, error: 'Already reviewed this order' });
    const review = await Review.create({ userId: req.user.id, orderId, itemId: itemId || '', rating: Number(rating), comment: comment || '', photos: Array.isArray(photos) ? photos : [] });
    const populated = await review.populate('userId', 'name');
    res.status(201).json({ ok: true, review: populated });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.patch('/api/reviews/:id/visibility', adminOnly, v.vReviewVisibility, validate, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { isVisible: req.body.isVisible }, { new: true }).populate('userId', 'name email');
    if (!review) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, review });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.delete('/api/reviews/:id', adminOnly, v.vReviewIdParam, validate, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});

app.get('/api/admin/reviews', adminOnly, v.vAdminReviewsQuery, validate, async (req, res) => {
  try {
    const { page = 1, limit = 50, visibility } = req.query;
    const filter = {};
    if (visibility === 'visible') filter.isVisible = true;
    if (visibility === 'hidden') filter.isVisible = false;
    const reviews = await Review.find(filter).populate('userId', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    const total = await Review.countDocuments(filter);
    res.json({ ok: true, reviews, total });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ ok: true, notifications, unreadCount });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/notifications/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.patch('/api/notifications/:id/read', authenticate, v.vNotificationIdParam, validate, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { read: true }, { new: true });
    if (!notif) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, notification: notif });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.delete('/api/notifications/:id', authenticate, v.vNotificationIdParam, validate, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.delete('/api/notifications', authenticate, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/admin/notifications/broadcast', adminOnly, v.vBroadcastNotification, validate, async (req, res) => {
  try {
    const { title, body, type = 'offer', data = {}, userId } = req.body;
    if (!title || !body) return res.status(400).json({ ok: false, error: 'title and body required' });
    if (userId) {
      const notif = await createNotification({ userId, type, title, body, data });
      return res.status(201).json({ ok: true, sent: 1, notification: notif });
    }
    const users = await User.find({ role: 'user' }, '_id');
    const docs = users.map(u => ({ userId: u._id, type, title, body, data }));
    await Notification.insertMany(docs);
    users.forEach(u => notifyUser(u._id.toString(), { type, title, body, data, read: false, createdAt: new Date() }));
    res.status(201).json({ ok: true, sent: users.length });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/admin/notifications', adminOnly, async (req, res) => {
  try {
    const notifications = await AdminNotifLog.find().sort({ sentAt: -1 }).limit(100);
    res.json({ ok: true, notifications });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/admin/notifications/send', adminOnly, async (req, res) => {
  try {
    const { target, userQuery, title, message, type = 'info' } = req.body;
    if (!title?.trim() || !message?.trim()) return res.status(400).json({ ok: false, error: 'Title and message are required' });
    let sentCount = 0;
    const notifType = ['order_status','offer','review_reminder','system'].includes(type) ? type : 'system';
    if (target === 'single') {
      if (!userQuery?.trim()) return res.status(400).json({ ok: false, error: 'User phone or email required' });
      const isPhone = /^\+?\d[\d\s\-]{7,}$/.test(userQuery.trim());
      const query = isPhone ? { phone: userQuery.replace(/\s|-/g, '') } : { email: userQuery.trim().toLowerCase() };
      const targetUser = await User.findOne(query);
      if (!targetUser) return res.status(404).json({ ok: false, error: 'User not found' });
      await createNotification({ userId: targetUser._id, type: notifType, title, body: message, data: {} });
      sentCount = 1;
    } else {
      const users = await User.find({ role: 'user' }, '_id');
      const docs = users.map(u => ({ userId: u._id, type: notifType, title, body: message, data: {} }));
      if (docs.length > 0) await Notification.insertMany(docs);
      users.forEach(u => notifyUser(u._id.toString(), { type: notifType, title, body: message, data: {}, read: false, createdAt: new Date() }));
      sentCount = users.length;
    }
    await AdminNotifLog.create({ target, userQuery: target === 'single' ? userQuery : undefined, title, message, type, sentCount });
    res.status(201).json({ ok: true, message: `Notification sent to ${sentCount} user${sentCount !== 1 ? 's' : ''}!`, sentCount });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.delete('/api/admin/notifications/:id', adminOnly, async (req, res) => {
  try {
    await AdminNotifLog.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── CART ───────────────────────────────────────────────────────────────────
app.get('/api/cart', authenticate, async (req, res) => {
  try {
    const saved = await Cart.findOne({ userId: req.user.id });
    if (!saved) return res.json({ ok: true, cart: null });
    const liveItems = [];
    for (const item of saved.items) {
      const menuItem = await MenuItem.findOne({ id: item.productId });
      if (!menuItem) continue;
      const priceDiff = menuItem.price - item.basePrice;
      liveItems.push({ ...item, name: menuItem.name, image: menuItem.image || item.image, basePrice: menuItem.price, unitPrice: item.unitPrice + priceDiff });
    }
    if (liveItems.length !== saved.items.length) { saved.items = liveItems; saved.updatedAt = new Date(); await saved.save(); }
    res.json({ ok: true, cart: { ...saved.toObject(), items: liveItems } });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.put('/api/cart', authenticate, v.vSaveCart, validate, async (req, res) => {
  try {
    const { items = [], coupon = '', couponDiscount = 0, fulfillment = 'delivery', deliveryAddress = '', deliveryCoords = null } = req.body;
    const cart = await Cart.findOneAndUpdate({ userId: req.user.id }, { items, coupon, couponDiscount, fulfillment, deliveryAddress, deliveryCoords, updatedAt: new Date() }, { upsert: true, new: true });
    res.json({ ok: true, cart });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.delete('/api/cart', authenticate, async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ userId: req.user.id }, { items: [], coupon: '', couponDiscount: 0, deliveryAddress: '', deliveryCoords: null, updatedAt: new Date() }, { upsert: true, new: true });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
app.get('/api/analytics', adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd); yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);
    const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart); prevWeekEnd.setMilliseconds(-1);

    const [totalOrders, totalRevenueAgg, totalUsers, totalDeliveryBoys, activeDeliveryBoys, totalReservations, statusBreakdown, recentOrders, todayRevenueAgg, yesterdayRevenueAgg, todayOrderCount, yesterdayOrderCount, thisWeekDailyAgg, prevWeekRevenueAgg, avgOrderValueAgg, topItemsAgg, peakHoursAgg, outForDeliveryCount, pendingCount] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totals.total' } } }]),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'delivery_boy' }),
      User.countDocuments({ role: 'delivery_boy', isOnline: true }),
      Reservation.countDocuments(),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.find().populate('assignedTo', 'name').sort({ createdAt: -1 }).limit(8),
      Order.aggregate([{ $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } }, { $group: { _id: null, total: { $sum: '$totals.total' } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } } }, { $group: { _id: null, total: { $sum: '$totals.total' } } }]),
      Order.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      Order.countDocuments({ createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }),
      Order.aggregate([{ $match: { createdAt: { $gte: weekStart, $lte: todayEnd } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } }, revenue: { $sum: '$totals.total' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: prevWeekStart, $lte: prevWeekEnd } } }, { $group: { _id: null, total: { $sum: '$totals.total' }, orders: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { status: { $in: ['delivered', 'out_for_delivery', 'preparing', 'confirmed'] } } }, { $group: { _id: null, avg: { $avg: '$totals.total' } } }]),
      Order.aggregate([{ $unwind: '$items' }, { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } }, { $sort: { qty: -1 } }, { $limit: 5 }]),
      Order.aggregate([{ $match: { createdAt: { $gte: weekStart } } }, { $group: { _id: { $hour: { date: '$createdAt', timezone: '+05:30' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Order.countDocuments({ status: 'out_for_delivery' }),
      Order.countDocuments({ status: 'pending' }),
    ]);

    const weeklyData = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      const key = date.toISOString().slice(0, 10);
      const found = thisWeekDailyAgg.find(r => r._id === key);
      weeklyData.push({ date: key, label: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }), revenue: Math.round(found?.revenue || 0), orders: found?.orders || 0 });
    }

    const peakHours = Array.from({ length: 24 }, (_, h) => {
      const found = peakHoursAgg.find(r => r._id === h);
      const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
      return { hour: h, label, count: found?.count || 0 };
    });

    const thisWeekRevenue = weeklyData.reduce((s, d) => s + d.revenue, 0);
    const thisWeekOrders = weeklyData.reduce((s, d) => s + d.orders, 0);

    res.json({
      ok: true, totalOrders, totalRevenue: totalRevenueAgg[0]?.total || 0,
      totalUsers, totalDeliveryBoys, activeDeliveryBoys, totalReservations, statusBreakdown, recentOrders,
      todayRevenue: Math.round(todayRevenueAgg[0]?.total || 0), yesterdayRevenue: Math.round(yesterdayRevenueAgg[0]?.total || 0),
      todayOrders: todayOrderCount, yesterdayOrders: yesterdayOrderCount,
      weeklyData, thisWeekRevenue: Math.round(thisWeekRevenue), thisWeekOrders,
      prevWeekRevenue: Math.round(prevWeekRevenueAgg[0]?.total || 0), prevWeekOrders: prevWeekRevenueAgg[0]?.orders || 0,
      avgOrderValue: Math.round(avgOrderValueAgg[0]?.avg || 0),
      topItems: topItemsAgg.map(t => ({ name: t._id, qty: t.qty, revenue: Math.round(t.revenue) })),
      peakHours, outForDeliveryCount, pendingCount,
    });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
app.get('/api/settings', async (_req, res) => {
  try {
    const s = await getSettings();
    res.json({ ok: true, settings: s });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.put('/api/settings', adminOnly, v.vUpdateSettings, validate, async (req, res) => {
  try {
    const allowed = ['restaurantName', 'address', 'phone', 'openTime', 'closeTime', 'deliveryRadius', 'deliveryCharge', 'minOrderAmount', 'isOpen', 'emailNotif', 'smsNotif', 'newOrderSound', 'lowStockAlert', 'razorpayEnabled', 'upiEnabled', 'codEnabled', 'theme', 'allowReviews', 'maintenanceMode', 'tagline', 'email', 'gstNumber', 'closedDays'];
    const update = {};
    for (const key of allowed) { if (req.body[key] !== undefined) update[key] = req.body[key]; }
    update.updatedAt = new Date();
    const s = await Settings.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true });
    res.json({ ok: true, settings: s });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── UPLOAD ───────────────────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

const IMAGE_MAGIC = [
  { mime: 'image/jpeg', offset: 0, sig: Buffer.from([0xFF, 0xD8, 0xFF]) },
  { mime: 'image/png',  offset: 0, sig: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) },
  { mime: 'image/gif',  offset: 0, sig: Buffer.from('GIF8') },
  { mime: 'image/webp', offset: 0, sig: Buffer.from('RIFF') },
];

function checkMagicBytes(fileBuffer, declaredMime) {
  for (const { mime, offset, sig } of IMAGE_MAGIC) {
    if (mime !== declaredMime) continue;
    const slice = fileBuffer.slice(offset, offset + sig.length);
    if (slice.equals(sig)) {
      if (mime === 'image/webp') { const webpSig = fileBuffer.slice(8, 12); return webpSig.equals(Buffer.from('WEBP')); }
      return true;
    }
  }
  return false;
}

app.post('/api/upload', authenticate, uploadLimiter, async (req, res) => {
  const file = req.files?.image;
  try {
    if (!req.files || !file) return res.status(400).json({ ok: false, error: 'No file uploaded. Send an image in the "image" field.' });
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) { fs.unlink(file.tempFilePath, () => {}); return res.status(415).json({ ok: false, error: 'Unsupported file type. Only JPEG, PNG, WEBP, or GIF images are allowed.' }); }
    if (file.size > MAX_UPLOAD_SIZE) { fs.unlink(file.tempFilePath, () => {}); return res.status(413).json({ ok: false, error: 'File is too large. Maximum allowed size is 5 MB.' }); }
    const headerBuf = Buffer.alloc(12);
    let fd;
    try { fd = fs.openSync(file.tempFilePath, 'r'); fs.readSync(fd, headerBuf, 0, 12, 0); } finally { if (fd !== undefined) fs.closeSync(fd); }
    if (!checkMagicBytes(headerBuf, file.mimetype)) { fs.unlink(file.tempFilePath, () => {}); return res.status(415).json({ ok: false, error: 'File content does not match its declared type. Upload a valid image.' }); }
    const result = await cloudinary.uploader.upload(file.tempFilePath, { folder: process.env.CLOUDINARY_FOLDER, eager: [{ width: 600, height: 600, crop: 'fill', fetch_format: 'auto', quality: 'auto' }, { width: 1200, height: 630, crop: 'fill', fetch_format: 'auto', quality: 'auto' }] });
    fs.unlink(file.tempFilePath, () => {});
    res.json({ ok: true, url: result.secure_url });
  } catch (err) {
    if (file?.tempFilePath) fs.unlink(file.tempFilePath, () => {});
    res.status(500).json({ ok: false, error: 'Upload failed. Please try again.' });
  }
});

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ─── SECURITY STATUS ─────────────────────────────────────────────────────────────
app.get('/api/security-status', (_req, res) => {
  res.json({
    ok: true,
    security: 'ok',
    headers: {
      helmet: true,
      cors: true,
      rateLimiting: true,
      inputValidation: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// ─── SITEMAP ───────────────────────────────────────────────────────────────────
app.get('/sitemap.xml', async (_req, res) => {
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
  const today = new Date().toISOString().split('T')[0];
  
  // Static pages
  const staticPages = [
    { loc: '', priority: '1.0', changefreq: 'daily' },
    { loc: '/menu', priority: '0.9', changefreq: 'daily' },
    { loc: '/offers', priority: '0.8', changefreq: 'weekly' },
    { loc: '/about', priority: '0.6', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.6', changefreq: 'monthly' },
    { loc: '/reviews', priority: '0.7', changefreq: 'weekly' },
    { loc: '/faq', priority: '0.5', changefreq: 'monthly' },
    { loc: '/reservation', priority: '0.7', changefreq: 'daily' },
    { loc: '/search', priority: '0.5', changefreq: 'weekly' },
  ];
  
  // Build menu items from DB
  let menuItems = [];
  try {
    menuItems = await MenuItem.find({ available: true }).select('id updatedAt').lean();
  } catch {}
  
  const urls = [];
  
  for (const page of staticPages) {
    urls.push(`
  <url>
    <loc>${CLIENT_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }
  
  for (const item of menuItems) {
    const lastMod = item.updatedAt ? new Date(item.updatedAt).toISOString().split('T')[0] : today;
    urls.push(`
  <url>
    <loc>${CLIENT_URL}/product/${item.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}
</urlset>`;
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// ─── ADMIN BOOTSTRAP ─────────────────────────────────────────────────────────
app.post('/api/setup/admin', authLimiter, v.vSetupAdmin, validate, async (req, res) => {
  const { secret, name, email, password } = req.body;
  if (secret !== process.env.SETUP_SECRET) return res.status(403).json({ ok: false, error: 'Wrong secret' });
  const existing = await User.findOne({ role: 'admin' });
  if (existing) return res.status(409).json({ ok: false, error: 'Admin already exists' });
  const admin = await User.create({ name, email, password, role: 'admin' });
  res.status(201).json({ ok: true, message: 'Admin created', email: admin.email });
});

// ─── AUTO-CREATE ADMIN FROM ENV ───────────────────────────────────────────────
async function bootstrapAdmin() {
  try {
    const adminEmail    = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminPhone    = process.env.ADMIN_PHONE;
    if (!adminEmail || !adminPassword) {
      console.warn('⚠️ ADMIN_EMAIL / ADMIN_PASSWORD not set in .env — skipping admin bootstrap');
      return;
    }
    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      let modified = false;
      if (adminPhone && existing.phone !== adminPhone) {
        existing.phone = adminPhone;
        existing.isPhoneVerified = true;
        modified = true;
      }
      if (existing.email !== adminEmail) {
        existing.email = adminEmail;
        modified = true;
      }
      const passMatches = await existing.comparePassword(adminPassword);
      if (!passMatches) {
        existing.password = adminPassword; // will be hashed by pre-save hook
        modified = true;
      }
      if (modified) {
        await existing.save();
        console.log('✅ Admin credentials updated from .env');
      }
      return;
    }
    // Pehle check karo ki is email se koi user (kisi bhi role mein) exist karta hai
    const userByEmail = await User.findOne({ email: adminEmail });
    if (userByEmail) {
      userByEmail.role = 'admin';
      userByEmail.password = adminPassword; // will be hashed by pre-save hook
      if (adminPhone) {
        userByEmail.phone = adminPhone;
        userByEmail.isPhoneVerified = true;
      }
      userByEmail.isEmailVerified = true;
      await userByEmail.save();
      console.log('✅ Existing user promoted to admin from .env');
      return;
}
    await User.create({ name: 'Admin', email: adminEmail, password: adminPassword, phone: adminPhone || '', role: 'admin', isEmailVerified: true, isPhoneVerified: !!adminPhone });
    console.log('✅ Admin auto-created from .env');
  } catch (err) { console.error('❌ Admin bootstrap failed:', err.message); }
}

// ─── UNIFIED LOGIN (email + password + OTP) ─────────────────────────────────────
// Works for all roles: user, admin, delivery_boy
// Skips OTP for already-email-verified users
app.post('/api/auth/login/unified/send-otp', authLimiter, v.vUnifiedLoginSendOtp, validate, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ ok: false, error: 'Account deactivated' });
    
    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(429).json({ ok: false, error: 'Account temporarily locked. Try again later.' });
    }
    
    const valid = await user.comparePassword(password);
    if (!valid) {
      await user.incLoginAttempts();
      await logSecurityEvent('failed_login', { userId: user._id, email: user.email, details: { reason: 'invalid_password' } });
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    
    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    await logSecurityEvent('login_success', { userId: user._id, email: user.email });
    
    // Skip OTP for already verified users
    if (user.isEmailVerified) {
      const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      const redirectMap = { admin: 'bim_admin_token', delivery_boy: 'bim_delivery_token', user: 'bim_token' };
      const cookieName = redirectMap[user.role] || 'bim_token';
      setAuthCookie(res, token, cookieName, 7 * 24 * 60 * 60 * 1000);
      return res.json({ ok: true, skipOtp: true, user, redirectTo: redirectMap[user.role] === 'bim_admin_token' ? '/admin' : redirectMap[user.role] === 'bim_delivery_token' ? '/delivery' : '/' });
    }
    
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    await OtpSession.findOneAndDelete({ identifier: email, purpose: 'login' });
    await OtpSession.create({ identifier: email, type: 'email', purpose: 'login', otpHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), lastSentAt: new Date() });
    await sendEmailOtp({ to: email, otp, purpose: 'login', name: user.name || 'User' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ ok: true, message: 'OTP sent to your email', loginToken: token, role: user.role });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/auth/login/unified/verify-otp', authLimiter, v.vUnifiedLoginVerifyOtp, validate, async (req, res) => {
  try {
    const { email, otp, loginToken } = req.body;
    let payload;
    try { payload = jwt.verify(loginToken, JWT_SECRET); }
    catch { return res.status(401).json({ ok: false, error: 'Session expired. Please login again.' }); }
    const session = await OtpSession.findOne({ identifier: email, purpose: 'login' });
    if (!session) return res.status(400).json({ ok: false, error: 'No OTP found. Request again.' });
    if (new Date() > session.expiresAt) return res.status(400).json({ ok: false, error: 'OTP expired' });
    if (session.attempts >= 5) return res.status(429).json({ ok: false, error: 'Too many attempts' });
    const valid = await verifyOtp(otp, session.otpHash);
    if (!valid) { session.attempts += 1; await session.save(); return res.status(400).json({ ok: false, error: 'Wrong OTP' }); }
    await OtpSession.findByIdAndDelete(session._id);
    const user = await User.findById(payload.id).select('-password');
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    const redirectMap = { admin: 'bim_admin_token', delivery_boy: 'bim_delivery_token', user: 'bim_token' };
    const cookieName = redirectMap[user.role] || 'bim_token';
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token, cookieName, 7 * 24 * 60 * 60 * 1000);
    res.json({ ok: true, user, redirectTo: redirectMap[user.role] === 'bim_admin_token' ? '/admin' : redirectMap[user.role] === 'bim_delivery_token' ? '/delivery' : '/' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// -- GOOGLE LOGIN ---------------------------------------------------------------
app.get('/api/auth/google', async (req, res) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.SERVER_URL || 'http://localhost:3001'}/api/auth/google/callback`;
const scope = 'openid email profile';
res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ ok: false, error: 'No code from Google' });
  
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
redirect_uri: `${process.env.SERVER_URL || 'http://localhost:3001'}/api/auth/google/callback`,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('No access token');
    
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleData = await userRes.json();
    
    let user = await User.findOne({ email: googleData.email });
    if (!user) {
      user = await User.create({
        name: googleData.name || googleData.given_name || 'User',
        email: googleData.email,
        password: Math.random().toString(36).slice(-12) + Date.now().toString(36),
        isEmailVerified: true,
        isActive: true,
      });
    }
    if (!user.isActive) throw new Error('Account deactivated');
    
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token, 'bim_token', 7 * 24 * 60 * 60 * 1000);
    res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/account?error=google_auth_failed`);
  }
});

// ─── ROUTING & MAP MATCHING ───────────────────────────────────────────────────────
// Step 8: Route generation via OpenRouteService
const ORS_API_KEY = process.env.ORS_API_KEY;
app.post('/api/routes/directions', liveTrackingLimiter, v.vORSRoute, validate, async (req, res) => {
  try {
    const { start, end } = req.body;
    if (!ORS_API_KEY) {
      return res.status(503).json({ ok: false, error: 'ORS API key not configured' });
    }
    const orsRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [[start.lng, start.lat], [end.lng, end.lat]],
      }),
    });
    const route = await orsRes.json();
    if (!orsRes.ok) {
      return res.status(502).json({ ok: false, error: route.error || 'Routing failed' });
    }
    res.json({ ok: true, route });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Step 14: Map matching (snap-to-road) via ORS
app.post('/api/routes/snap', v.vORSSnap, validate, async (req, res) => {
  try {
    const { coordinates } = req.body;
    if (!ORS_API_KEY) {
      return res.status(503).json({ ok: false, error: 'ORS API key not configured' });
    }
    const orsRes = await fetch('https://api.openrouteservice.org/v2/matching/driving-car', {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: coordinates.map(c => [c.lng, c.lat]),
      }),
    });
    const snapped = await orsRes.json();
    if (!orsRes.ok) {
      return res.status(502).json({ ok: false, error: snapped.error || 'Map matching failed' });
    }
    res.json({ ok: true, matched: snapped });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── GEOCODING ─────────────────────────────────────────────────────────────────────
// Step 4: Forward geocoding via MapTiler
app.get('/api/geocode/search', v.vGeocodeSearch, validate, async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    const MAPTILER_API_KEY = process.env.MAPTILER_API_KEY;
    const url = MAPTILER_API_KEY
      ? `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${MAPTILER_API_KEY}&limit=${limit}`
      : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=${limit}`;
    const geoRes = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await geoRes.json();
    const features = data.features || data;
    const results = Array.isArray(features)
      ? features.map((f, i) => ({
          place_id: f.id || i,
          lat: f.center ? f.center[1] : f.lat,
          lng: f.center ? f.center[0] : f.lon,
          display_name: f.place_name || f.display_name,
        }))
      : [];
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Step 4b: Reverse geocoding via MapTiler (fallback: Nominatim)
app.get('/api/geocode/reverse', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: 'lat aur lng required hain (numbers)' });
    }
    const MAPTILER_API_KEY = process.env.MAPTILER_API_KEY;
    const url = MAPTILER_API_KEY
      ? `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_API_KEY}`
      : `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const geoRes = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await geoRes.json();
    const address = data.features?.[0]?.place_name || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    res.json({ ok: true, address, lat, lng });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── SIMPLE LOGIN (backward compat alias for unified login) ──────────────────
// AccountPage unified flow use karta hai, ye route direct API callers ke liye hai
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user || !user.isActive) return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    const cookieMap = { admin: 'bim_admin_token', delivery_boy: 'bim_delivery_token', user: 'bim_token' };
    const cookieName = cookieMap[user.role] || 'bim_token';
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token, cookieName, 7 * 24 * 60 * 60 * 1000);
    res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, loyaltyPoints: user.loyaltyPoints } });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── PUSH NOTIFICATIONS CONFIG ───────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:admin@oneinamillion.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// ─── PUSH NOTIFICATION ENDPOINTS ───────────────────────────────────────────────────
app.get('/api/push/public-key', (_req, res) => {
  res.json({ ok: true, publicKey: VAPID_PUBLIC_KEY || null });
});

app.post('/api/push/subscribe', authenticate, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ ok: false, error: 'subscription required' });
  try {
    await DeliveryPushSub.findOneAndUpdate(
      { deliveryBoyId: req.user.id },
      { subscription, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Send push to delivery boy
async function sendPushToDelivery(deliveryBoyId, payload) {
  const sub = await DeliveryPushSub.findOne({ deliveryBoyId });
  if (!sub || !VAPID_PUBLIC_KEY) return;
  try {
    await webPush.sendNotification(sub.subscription, JSON.stringify(payload));
  } catch (e) {
    console.error('[push] Failed to send:', e.message);
  }
}

// ─── CONTACT ───────────────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ ok: false, error: 'Name, email, subject and message required' });
    }
    // Create admin notification for the contact message
    const AdminNotif = (await import('./models/AdminNotifLog.js')).default;
    await AdminNotif.create({
      type: 'contact_message',
      title: `📧 ${subject}`,
      body: `${name} (${email}${phone ? ', ' + phone : ''}): ${message.slice(0, 500)}`,
      data: { name, email, phone, subject, message },
    });
    // Emit real-time event to admin room
    notifyAdmin('contact-message', { name, email, phone, subject, message });
    // Send email to admin (if email service configured)
    if (process.env.ADMIN_CONTACT_EMAIL) {
      const { sendEmailOtp } = await import('./services/otp.service.js');
      await sendEmailOtp({
        to: process.env.ADMIN_CONTACT_EMAIL,
        otp: '',
        purpose: 'contact',
        name,
        extra: `Email: ${email}\nPhone: ${phone || 'N/A'}\nSubject: ${subject}\nMessage: ${message}`,
      }).catch(() => {});
    }
    res.json({ ok: true, message: 'Message sent successfully' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, error: `Route not found: ${req.method} ${req.path}` });
});

// ─── CONTACT FORM ──────────────────────────────────────────────────────────────
app.post('/api/contact', v.vContactForm, validate, async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    // Admin notification create karo
    await AdminNotifLog.create({
      target: 'contact',
      userQuery: `${name} <${email}> | ${phone || '—'}`,
      title: subject,
      message,
      type: 'contact',
      sentCount: 0
    });
    res.status(201).json({ ok: true, message: 'Message received! We will get back to you soon.' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// ─── GLOBAL ERROR HANDLER ───────────────────────────────────────────────────────
app.use(globalErrorHandler);
