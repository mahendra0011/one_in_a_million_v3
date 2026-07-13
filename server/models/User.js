import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { hashPassword, comparePassword } from '../middleware/auth.js';
import uniqueValidator from 'mongoose-unique-validator';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin', 'delivery_boy'], default: 'user' },
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
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
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

userSchema.plugin(uniqueValidator, { message: '{PATH} already exists' });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await hashPassword(this.password);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return comparePassword(plain, this.password);
};

userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil > new Date()) {
    throw new Error('Account locked');
  }
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  return this.save();
};

userSchema.methods.resetLoginAttempts = function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  return this.save();
};

userSchema.index({ role: 1 });
userSchema.index({ phone: 1 });

const User = mongoose.model('User', userSchema);

export default User;
