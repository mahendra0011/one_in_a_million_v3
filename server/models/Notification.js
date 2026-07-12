import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['order_status', 'offer', 'review_reminder', 'system'],
    default: 'system',
  },
  title: { type: String, required: true },
  body:  { type: String, required: true },
  data:  { type: Object, default: {} },
  read:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
