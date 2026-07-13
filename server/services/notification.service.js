/**
 * NOTIFICATION SERVICE — Email only
 * ─────────────────────────────────────────────────────────────────
 * Handles:
 *   - Order confirmation email
 *   - Order status update email
 *   - Review reminder email (after delivery)
 * ─────────────────────────────────────────────────────────────────
 */

import * as brevo from '@getbrevo/brevo';

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@oneinamillion.com';
const SENDER_NAME  = process.env.BREVO_SENDER_NAME  || 'One in a Million';
const BREVO_KEY    = process.env.BREVO_API_KEY;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:          { emoji: '🧾', label: 'Order Received',       color: '#6366f1' },
  confirmed:        { emoji: '✅', label: 'Order Confirmed',       color: '#22c55e' },
  preparing:        { emoji: '👨‍🍳', label: 'Being Prepared',       color: '#f59e0b' },
  out_for_delivery: { emoji: '🛵', label: 'Out for Delivery',      color: '#F07D14' },
  delivered:        { emoji: '🎉', label: 'Delivered!',            color: '#10b981' },
  cancelled:        { emoji: '❌', label: 'Order Cancelled',       color: '#ef4444' },
};

// ─── Email helper ─────────────────────────────────────────────────────────────
async function sendBrevoEmail({ to, toName, subject, html }) {
  if (!BREVO_KEY) {
    console.log(`\n📧 [DEV NOTIF EMAIL]\n   To: ${to}\n   Subject: ${subject}\n`);
    return;
  }
  const api = new brevo.TransactionalEmailsApi();
  api.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_KEY);
  const mail = new brevo.SendSmtpEmail();
  mail.sender      = { name: SENDER_NAME, email: SENDER_EMAIL };
  mail.to          = [{ email: to, name: toName || to }];
  mail.subject     = subject;
  mail.htmlContent = html;
  try {
    await api.sendTransacEmail(mail);
    console.log(`[Brevo] ✅ Notification email → ${to}`);
  } catch (err) {
    console.error('[Brevo Notif Error]', err?.response?.body || err?.message);
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────
function baseLayout(body) {
  return `
  <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:12px;border:1px solid #f0e0d0;overflow:hidden;">
    <div style="background:#0A0604;padding:20px 24px;text-align:center;">
      <span style="font-size:32px;">🍔</span>
      <div style="color:#F07D14;font-size:20px;font-weight:800;margin-top:6px;">One in a Million</div>
    </div>
    <div style="padding:28px 24px;">${body}</div>
    <div style="background:#f9f9f9;padding:14px 24px;text-align:center;font-size:12px;color:#999;">
      One in a Million &bull; Deliciously yours 🍟<br>
      <a href="tel:+919967412613" style="color:#F07D14;">+91 9967 412613</a>
    </div>
  </div>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send order confirmation email right after order is placed
 */
export async function sendOrderConfirmation({ order, userEmail, userName }) {
  const cfg = STATUS_CONFIG.pending;
  const itemList = (order.items || [])
    .map(i => `<tr><td style="padding:6px 0;color:#333;">${i.name} ×${i.qty}</td><td style="padding:6px 0;text-align:right;color:#555;">₹${(i.unitPrice * i.qty).toFixed(0)}</td></tr>`)
    .join('');

  const html = baseLayout(`
    <h2 style="color:#0A0604;margin:0 0 4px;">${cfg.emoji} Order Placed!</h2>
    <p style="color:#555;margin:0 0 20px;">Hi <strong>${userName || 'there'}</strong>, your order has been received.</p>
    <div style="background:#fff7ed;border-left:4px solid #F07D14;padding:12px 16px;border-radius:6px;margin-bottom:20px;">
      <div style="font-size:13px;color:#888;">Order ID</div>
      <div style="font-size:18px;font-weight:700;color:#F07D14;">${order.orderId}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      ${itemList}
      <tr style="border-top:1px solid #eee;"><td style="padding:8px 0;font-weight:700;">Total</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#F07D14;">₹${order.totals?.total?.toFixed(0) || '—'}</td></tr>
    </table>
    <p style="color:#777;font-size:13px;">We'll notify you as soon as your order is confirmed. Estimated time: <strong>30–45 minutes</strong>.</p>
  `);

  if (userEmail) {
    await sendBrevoEmail({ to: userEmail, toName: userName, subject: `Order Confirmed — ${order.orderId}`, html });
  }
}

/**
 * Send status update notification (email only)
 */
export async function sendStatusNotification({ order, status, userEmail, userName }) {
  const cfg = STATUS_CONFIG[status] || { emoji: '📦', label: status, color: '#555' };

  const html = baseLayout(`
    <h2 style="color:${cfg.color};margin:0 0 4px;">${cfg.emoji} ${cfg.label}</h2>
    <p style="color:#555;margin:0 0 20px;">Hi <strong>${userName || 'there'}</strong>,</p>
    <div style="background:#f8f8f8;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
      <div style="font-size:13px;color:#888;margin-bottom:6px;">Your order</div>
      <div style="font-size:16px;font-weight:700;color:#333;">${order.orderId}</div>
      <div style="margin-top:10px;font-size:15px;font-weight:600;color:${cfg.color};">${cfg.label}</div>
    </div>
    ${status === 'delivered' ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;text-align:center;margin-bottom:16px;">
      <p style="color:#15803d;margin:0;font-size:14px;">🌟 Enjoyed your meal? <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/reviews" style="color:#F07D14;font-weight:700;">Leave a review</a> and earn loyalty points!</p>
    </div>` : ''}
    <p style="color:#aaa;font-size:12px;text-align:center;">Questions? Call us at <a href="tel:+919967412613" style="color:#F07D14;">+91 9967 412613</a></p>
  `);

  if (userEmail) {
    await sendBrevoEmail({ to: userEmail, toName: userName, subject: `${cfg.emoji} ${cfg.label} — ${order.orderId}`, html });
  }
}

/**
 * Send review reminder email (24h after delivery — call from a cron or after status=delivered)
 */
export async function sendReviewReminder({ orderId, userEmail, userName }) {
  if (!userEmail) return;
  const html = baseLayout(`
    <h2 style="color:#0A0604;margin:0 0 4px;">🌟 How was your experience?</h2>
    <p style="color:#555;">Hi <strong>${userName || 'there'}</strong>, we hope you enjoyed your One in a Million order!</p>
    <p style="color:#555;">Your feedback helps us serve you better. It only takes 30 seconds!</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/reviews"
         style="background:#F07D14;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;display:inline-block;">
        Leave a Review
      </a>
    </div>
    <p style="color:#aaa;font-size:12px;text-align:center;">Order: ${orderId}</p>
  `);
  await sendBrevoEmail({ to: userEmail, toName: userName, subject: '🌟 How was your One in a Million order?', html });
}

/**
 * Send reservation confirmation (email only)
 */
export async function sendReservationConfirmation({ name, email, phone, date, time, guests, location }) {
  const LOCATIONS = ['Mall Road, Civil Lines', 'Wright Town'];
  const html = baseLayout(`
    <h2 style="color:#0A0604;margin:0 0 4px;">📅 Reservation Received!</h2>
    <p style="color:#555;">Hi <strong>${name || 'there'}</strong>, we've received your table request and it's <strong>pending confirmation</strong> from our team.</p>
    <table style="width:100%;margin:16px 0;">
      <tr><td style="padding:4px;color:#888;">Date:</td><td style="padding:4px;font-weight:600;">${date}</td></tr>
      <tr><td style="padding:4px;color:#888;">Time:</td><td style="padding:4px;font-weight:600;">${time}</td></tr>
      <tr><td style="padding:4px;color:#888;">Guests:</td><td style="padding:4px;font-weight:600;">${guests}</td></tr>
      <tr><td style="padding:4px;color:#888;">Location:</td><td style="padding:4px;font-weight:600;">${LOCATIONS.includes(location) ? location : 'Mall Road, Civil Lines'}</td></tr>
    </table>
    <p style="color:#777;font-size:13px;">We'll notify you as soon as it's confirmed. Please arrive 5 minutes early once confirmed. Call us at <a href="tel:+919967412613" style="color:#F07D14;">+91 9967 412613</a> for changes.</p>
  `);
  if (email) {
    await sendBrevoEmail({ to: email, toName: name, subject: 'Reservation Received — One in a Million', html });
  }
}
