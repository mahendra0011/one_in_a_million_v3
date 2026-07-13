import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  items: Array,
  totals: Object,
  customer: Object,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'reached_restaurant', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending',
  },
  fulfillment: { type: String, enum: ['delivery', 'pickup', 'dine-in'], default: 'delivery' },
  payment: { type: String, default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customerLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    address: { type: String, default: '' },
    landmark: { type: String, default: '' },
  },
  deliveryBoyLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    updatedAt: { type: Date, default: null },
  },
  deliveryOtp: { type: String, default: null },
  deliveryOtpExpiry: { type: Date, default: null },
  deliveryOtpAttempts: { type: Number, default: 0 },
  otpVerified: { type: Boolean, default: false },
  loyaltyAwarded: { type: Boolean, default: false },
  pointsRedeemed: { type: Number, default: 0 },
  acceptedAt: { type: Date, default: null },
  assignedAt: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectReason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ assignedTo: 1 });
orderSchema.index({ status: 1 });

export default mongoose.model('Order', orderSchema);
