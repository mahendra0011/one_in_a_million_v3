import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config/db.js';

// ─── COOKIE HELPERS ───────────────────────────────────────────────────────────
export function setAuthCookie(res, token, cookieName = 'bim_token', maxAge = 7 * 24 * 60 * 60 * 1000) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/',
  });
}

export function clearAuthCookie(res, cookieName = 'bim_token') {
  res.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', path: '/' });
}

export function getToken(req, cookieName = 'bim_token') {
  return req.cookies?.[cookieName] || req.headers.authorization?.split(' ')[1];
}

const getSecret = () => process.env.JWT_SECRET || JWT_SECRET;

// ─── AUTH GUARDS ──────────────────────────────────────────────────────────────
export function authenticate(req, res, next) {
  const token = getToken(req, 'bim_token');
  if (!token) return res.status(401).json({ ok: false, error: 'No token' });
  try { req.user = jwt.verify(token, getSecret()); next(); }
  catch { return res.status(401).json({ ok: false, error: 'Invalid token' }); }
}

export function adminOnly(req, res, next) {
  const token = getToken(req, 'bim_admin_token') || getToken(req, 'bim_token');
  if (!token) return res.status(401).json({ ok: false, error: 'No token' });
  let user;
  try { user = jwt.verify(token, getSecret()); }
  catch { return res.status(401).json({ ok: false, error: 'Invalid token' }); }
  if (user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' });
  req.user = user;
  next();
}

export function deliveryOnly(req, res, next) {
  const token = getToken(req, 'bim_delivery_token') || getToken(req, 'bim_token');
  if (!token) return res.status(401).json({ ok: false, error: 'No token' });
  let user;
  try { user = jwt.verify(token, getSecret()); }
  catch { return res.status(401).json({ ok: false, error: 'Invalid token' }); }
  if (!['admin', 'delivery_boy'].includes(user.role))
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  req.user = user;
  next();
}

export function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, getSecret());
    } catch {
      req.user = null;
    }
  }
  next();
}

// ─── PASSWORD COMPARE (reused in models) ──────────────────────────────────────
export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}
