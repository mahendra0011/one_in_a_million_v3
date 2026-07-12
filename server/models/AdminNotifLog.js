import mongoose from 'mongoose';

const adminNotifLogSchema = new mongoose.Schema({
  target: { type: String, enum: ['all', 'single'], required: true },
  userQuery: { type: String },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  sentAt: { type: Date, default: Date.now },
  sentCount: { type: Number, default: 0 },
});

export default mongoose.model('AdminNotifLog', adminNotifLogSchema);
