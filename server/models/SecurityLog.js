import mongoose from 'mongoose';

const securityLogSchema = new mongoose.Schema({
  type: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

securityLogSchema.index({ type: 1, createdAt: -1 });
securityLogSchema.index({ userId: 1 });

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);
export default SecurityLog;