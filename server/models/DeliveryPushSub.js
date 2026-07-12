import mongoose from 'mongoose';

const deliveryPushSubSchema = new mongoose.Schema({
  deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  subscription:   { type: Object, required: true },
  updatedAt:      { type: Date, default: Date.now },
});

export default mongoose.model('DeliveryPushSub', deliveryPushSubSchema);
