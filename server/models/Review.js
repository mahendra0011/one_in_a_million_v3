import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: String, required: true },
  itemId: { type: String, default: '' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  photos: [{ type: String }],
  isVisible: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

reviewSchema.index({ orderId: 1 });
reviewSchema.index({ userId: 1 });

export default mongoose.model('Review', reviewSchema);
