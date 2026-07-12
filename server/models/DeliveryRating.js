import mongoose from 'mongoose';

const deliveryRatingSchema = new mongoose.Schema({
  orderId:       { type: String, required: true, unique: true },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating:        { type: Number, required: true, min: 1, max: 5 },
  comment:       { type: String, default: '' },
  createdAt:     { type: Date, default: Date.now },
});

deliveryRatingSchema.index({ deliveryBoyId: 1, createdAt: -1 });

export default mongoose.model('DeliveryRating', deliveryRatingSchema);
