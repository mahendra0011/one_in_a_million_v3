import mongoose from 'mongoose';

const deliveryNotifSchema = new mongoose.Schema({
  deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['new_order', 'order_cancelled', 'admin_message', 'system'], default: 'system' },
  title: { type: String, required: true },
  body:  { type: String, required: true },
  data:  { type: Object, default: {} },
  read:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

deliveryNotifSchema.index({ deliveryBoyId: 1, createdAt: -1 });

export default mongoose.model('DeliveryNotif', deliveryNotifSchema);
