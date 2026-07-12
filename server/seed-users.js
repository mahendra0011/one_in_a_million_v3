/**
 * seed-users.js — Seeds demo users (admin, user, delivery boys) into MongoDB.
 * Run: node seed-users.js
 */
import dns from 'node:dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema);

// ─── DEMO USERS ────────────────────────────────────────────────────────────────
const demoUsers = [
  {
    name: 'Demo Admin',
    email: 'admin@demo.com',
    password: 'admin123',
    phone: '9999999991',
    role: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true,
  },
  {
    name: 'Demo User',
    email: 'user@demo.com',
    password: 'user123',
    phone: '9999999992',
    role: 'user',
    isEmailVerified: true,
    isPhoneVerified: true,
    savedAddresses: [
      { label: 'Home', address: '303, Mall Road, Civil Lines, Jabalpur', phone: '9999999992' },
    ],
  },
  {
    name: 'Demo Delivery',
    email: 'delivery@demo.com',
    password: 'delivery123',
    phone: '9999999993',
    role: 'delivery_boy',
    isEmailVerified: true,
    isPhoneVerified: true,
    vehicleType: 'Scooter',
    vehicleNumber: 'MP 20 AB 1234',
    isOnline: false,
  },
];

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  let created = 0;
  let skipped = 0;

  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  ⏭  ${u.email} (${u.role}) — already exists, skipping`);
      skipped++;
      continue;
    }

    await User.create(u);
    console.log(`  ✔ ${u.email} (${u.role}) — created`);
    created++;
  }

  console.log(`\n🎉 Done! ${created} created, ${skipped} skipped.`);
  console.log('\n📋 Demo Credentials:');
  console.log('   ┌──────────────────────┬─────────────────────┬────────────────────┐');
  console.log('   │ Role                 │ Email               │ Password           │');
  console.log('   ├──────────────────────┼─────────────────────┼────────────────────┤');
  console.log('   │ Admin                │ admin@demo.com      │ admin123           │');
  console.log('   │ User                 │ user@demo.com       │ user123            │');
  console.log('   │ Delivery Boy         │ delivery@demo.com   │ delivery123        │');
  console.log('   └──────────────────────┴─────────────────────┴────────────────────┘');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});