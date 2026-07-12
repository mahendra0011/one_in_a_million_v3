// ─── SOCKET.IO SERVICE ─────────────────────────────────────────────────────────
// Socket setup + broadcast helpers centralised here.
// Routes ke through bhi use hota hai (order status updates, notifications).

let _io = null;
let _models = null;

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────────
export const STATUS_MESSAGES = {
  pending:           'Order received! 🧾',
  confirmed:         'Order confirmed! ✅',
  preparing:         'Your order is being prepared 👨\u200d🍳',
  out_for_delivery:  'Out for delivery 🛵',
  delivered:         'Enjoy your meal! 🎉',
  cancelled:         'Order cancelled ❌',
};

export const STATUS_LABELS = {
  pending:           'Order Received',
  confirmed:         'Order Confirmed',
  preparing:         'Being Prepared',
  out_for_delivery:  'Out for Delivery',
  delivered:         'Delivered!',
  cancelled:         'Order Cancelled',
};

// ─── ROOM HELPERS ─────────────────────────────────────────────────────────────
export function notifyAdmin(event, data) {
  _io?.to('admin').emit(event, data);
}

export function notifyOrder(orderId, event, data) {
  _io?.to(`order-${orderId}`).emit(event, data);
}

export function notifyDelivery(deliveryBoyId, event, data) {
  _io?.to(`delivery-${deliveryBoyId}`).emit(event, data);
}

// ─── DELIVERY NOTIFICATIONS ────────────────────────────────────────────────────
export async function createDeliveryNotif({ deliveryBoyId, type, title, body, data = {} }) {
  const { DeliveryNotif } = _models;
  const notif = await DeliveryNotif.create({ deliveryBoyId, type, title, body, data });
  notifyDelivery(deliveryBoyId, 'delivery-notification', notif);
  return notif;
}

// ─── USER NOTIFICATIONS ────────────────────────────────────────────────────────
export function notifyUser(userId, notification) {
  _io?.to(`user-${userId}`).emit('notification', notification);
}

export async function createNotification({ userId, type, title, body, data = {} }) {
  const { Notification, AdminNotifLog } = _models;
  const notif = await Notification.create({ userId, type, title, body, data });
  notifyUser(userId, notif);
  return notif;
}

// ─── BROADCAST HELPERS ────────────────────────────────────────────────────────
export function broadcastStatusUpdate(order, status) {
  notifyOrder(order._id, 'status-update', {
    order,
    status,
    message: STATUS_MESSAGES[status] || status,
    label:   STATUS_LABELS[status] || status,
  });

  if (order.userId) notifyUser(order.userId, {
    type: 'order_status',
    title: STATUS_LABELS[status] || 'Order Update',
    body:  `Order ${order.orderId} is now ${status}`,
    data:  { orderId: order.orderId, status },
  });
}

// ─── SETUP ─────────────────────────────────────────────────────────────────────
export function setupSocket(io, models) {
  _io = io;
  _models = models;

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('join-admin', () => {
      socket.join('admin');
    });

    socket.on('join-order', (orderId) => {
      socket.join(`order-${orderId}`);
    });

    socket.on('join-user', (userId) => {
      socket.join(`user-${userId}`);
    });

    socket.on('join-delivery', (deliveryBoyId) => {
      socket.join(`delivery-${deliveryBoyId}`);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });
}
