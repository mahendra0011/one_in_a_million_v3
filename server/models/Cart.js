import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: { type: Array, default: [] },
  coupon: { type: String, default: '' },
  couponDiscount: { type: Number, default: 0 },
  fulfillment: { type: String, enum: ['delivery', 'pickup', 'dine-in'], default: 'delivery' },
  deliveryAddress: { type: String, default: '' },
  deliveryCoords: { type: Object, default: null },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Cart', cartSchema);
