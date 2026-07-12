/**
 * OTP SERVICE - Email only
 * ─────────────────────────────────────────────────────
 * Email → Brevo Transactional Email API (REST, NOT SMTP)
 * OTP   → 6-digit, 10-min expiry, bcrypt-hashed in DB
 * Resend → 60-second cooldown enforced
 * ─────────────────────────────────────────────────────
 *
 * SETUP GUIDE:
 * ─────────────────────────────────────────────────────
 * BREVO:
 *   1. brevo.com pe account banao
 *   2. Settings → API Keys → Create API Key
 *   3. .env mein BREVO_API_KEY, BREVO_SENDER_EMAIL set karo
 */

import bcrypt from 'bcryptjs';
import * as brevo from '@getbrevo/brevo';

// ─── OTP GENERATOR ───────────────────────────────────────────────────────────
export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── HASH & VERIFY ───────────────────────────────────────────────────────────
export async function hashOtp(otp) {
  return bcrypt.hash(otp, 8);
}

export async function verifyOtp(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ─── EMAIL OTP via Brevo REST API ────────────────────────────────────────────
export async function sendEmailOtp({ to, otp, purpose, name = 'there' }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL  = process.env.BREVO_SENDER_EMAIL || 'noreply@oneinamillion.com';
  const SENDER_NAME   = process.env.BREVO_SENDER_NAME  || 'One in a Million';

  const purposeLabel = {
    register:         'Email Verification',
    login:            'Login OTP',
    reset:            'Password Reset',
    delivery_confirm: 'Delivery Confirmation',
  }[purpose] || 'OTP';

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;
                background:#fff;border-radius:12px;border:1px solid #f0e0d0;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">🍔</span>
        <h2 style="margin:8px 0 0;color:#1a1a1a;font-size:22px;">One in a Million</h2>
      </div>
      <h3 style="color:#ea580c;margin-top:0;">${purposeLabel}</h3>
      <p style="color:#555;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
      <p style="color:#555;">Your one-time password is:</p>
      <div style="background:#fff7ed;border:2px dashed #fb923c;border-radius:10px;
                  padding:24px;text-align:center;margin:20px 0;">
        <span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#ea580c;">
          ${otp}
        </span>
      </div>
      <p style="color:#888;font-size:13px;">
        Valid for <strong>10 minutes</strong>.<br>
        Never share this OTP with anyone.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="color:#bbb;font-size:12px;text-align:center;">
        One in a Million • Deliciously yours 🍟
      </p>
    </div>
  `;

  // Dev fallback - no API key set
  if (!BREVO_API_KEY) {
    console.log(`
[DEV EMAIL OTP]
   To:      ${to}
   OTP:     ${otp}
   Purpose: ${purpose}
`);
    return;
  }

  // Brevo SDK - Transactional Email (REST API, not SMTP)
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

  const emailObj = new brevo.SendSmtpEmail();
  emailObj.sender      = { name: SENDER_NAME, email: SENDER_EMAIL };
  emailObj.to          = [{ email: to, name }];
  emailObj.subject     = `${otp} is your One in a Million ${purposeLabel}`;
  emailObj.htmlContent = htmlBody;

  try {
    const result = await apiInstance.sendTransacEmail(emailObj);
    console.log(`[Brevo] Email OTP sent to ${to}`);
  } catch (err) {
    const detail = err?.response?.body || err?.message || err;
    console.error('[Brevo API Error]', JSON.stringify(detail));
    throw new Error('Failed to send email OTP via Brevo');
  }
}

// ─── COOLDOWN HELPERS ─────────────────────────────────────────────────────────
export function isCooldownActive(lastSentAt) {
  if (!lastSentAt) return false;
  return (Date.now() - new Date(lastSentAt).getTime()) < 60_000;
}

export function cooldownSecondsLeft(lastSentAt) {
  if (!lastSentAt) return 0;
  const remaining = 60_000 - (Date.now() - new Date(lastSentAt).getTime());
  return Math.max(0, Math.ceil(remaining / 1000));
}