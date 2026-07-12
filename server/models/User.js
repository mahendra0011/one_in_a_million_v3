import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { hashPassword, comparePassword } from '../middleware/auth.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin', 'delivery_boy'], default: 'user' },
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  loyaltyPoints: { type: Number, default: 0 },
  savedAddresses: [{ label: String, address: String, phone: String }],
  vehicleType: { type: String, default: '' },
  vehicleNumber: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  mustSetPassword: { type: Boolean, default: false },
  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    updatedAt: { type: Date, default: null },
  },
  profilePhoto: { type: String, default: '' },
  unavailableDays: { type: [Number], default: [] },
  availabilityNote: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await hashPassword(this.password);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return comparePassword(plain, this.password);
};

userSchema.index({ role: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

const User = mongoose.model('User', userSchema);

export default User;
