// ─── STEP 24: RATE LIMITING ───────────────────────────────────────────────────
// express-rate-limit se request flooding rokte hain. Auth routes (login, OTP,
// password reset) pe especially tight limits hain kyunki yeh brute-force aur
// OTP-spam attacks ke sabse common targets hote hain.
import rateLimit from 'express-rate-limit';

// Common JSON response jab limit cross ho jaye
const limitHandler = (req, res) => {
  res.status(429).json({
    ok: false,
    error: 'Too many requests. Please try again later.',
  });
};

// ── General API limiter ──────────────────────────────────────────────────────
// Har IP ko 15 minute mein max 300 requests — normal browsing/usage easily
// fit ho jaata hai, par scripted abuse/scraping slow ho jaata hai.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// ── Auth limiter ──────────────────────────────────────────────────────────────
// Login/admin-login/delivery-login pe brute-force password guessing rokne ke
// liye — 15 minute mein max 10 attempts per IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // sirf failed attempts count hon, taaki normal user lock na ho
  handler: limitHandler,
});

// ── OTP limiter ───────────────────────────────────────────────────────────────
// OTP send/verify endpoints pe — SMS/email spam aur OTP brute-force dono
// rokta hai. Thoda tighter: 10 minute mein max 5 requests per IP.
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// ── Password reset / set-password limiter ────────────────────────────────────
export const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// ── Order creation limiter ────────────────────────────────────────────────────
// POST /api/orders is public (guest checkout allowed). Bina limiter ke koi bhi
// script thousands of orders create kar sakta hai. 1 ghante mein max 20 orders
// per IP — ek legitimate customer ke liye kaafi hai.
export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// ── Reservation limiter ───────────────────────────────────────────────────────
// POST /api/reservations bhi public hai. Spam reservations restaurant operations
// disrupt kar sakte hain. 1 ghante mein max 10 per IP.
export const reservationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// ── Upload limiter ────────────────────────────────────────────────────────────
// POST /api/upload Cloudinary pe jaata hai — har request ka cost hai. Authenticated
// hai lekin fir bhi ek compromised token se abuse ho sakta hai.
// 15 minute mein max 30 uploads per IP.
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

// ── Coupon validation limiter ─────────────────────────────────────────────────
// POST /api/coupons/validate is public — bina limiter ke koi bhi valid coupon
// codes brute-force kar sakta hai. 15 minute mein max 20 attempts per IP.
export const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});
