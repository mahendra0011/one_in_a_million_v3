import mongoose from 'mongoose';

const otpSessionSchema = new mongoose.Schema({
  identifier: { type: String, required: true },
  type: { type: String, enum: ['email'], required: true },
  purpose: { type: String, enum: ['register', 'login', 'reset', 'delivery_confirm'], required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

otpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('OtpSession', otpSessionSchema);
