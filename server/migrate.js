import mongoose from 'mongoose';
import dns from 'node:dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OLD_URI = 'mongodb+srv://mahendrapi0053_db_user:w546hI2x3pqv6AwU@cluster0.avvnhcg.mongodb.net/one_in_a_million?retryWrites=true&w=majority&appName=Cluster0';
const NEW_URI = 'mongodb+srv://mahendrapra0077:3Bkvlwlj1aZqi8VP@cluster0.5l9k4vd.mongodb.net/buninamillion?retryWrites=true&w=majority';

const models = {};

Object.assign(models, {
  User: mongoose.model('User', new mongoose.Schema({
    name: String, email: String, password: String, phone: String, role: String,
    isPhoneVerified: Boolean, isEmailVerified: Boolean, isActive: Boolean, loyaltyPoints: Number,
    savedAddresses: Array, vehicleType: String, vehicleNumber: String, isOnline: Boolean,
    mustSetPassword: Boolean, currentLocation: Object, profilePhoto: String, unavailableDays: Array,
    availabilityNote: String, createdAt: Date
  })),
  Order: mongoose.model('Order', new mongoose.Schema({
    orderId: String, items: Array, totals: Object, customer: Object, status: String,
    fulfillment: String, payment: String, paymentStatus: String, userId: mongoose.Schema.Types.ObjectId,
    assignedTo: mongoose.Schema.Types.ObjectId, customerLocation: Object, deliveryBoyLocation: Object,
    deliveryOtp: String, deliveryOtpExpiry: Date, otpVerified: Boolean, acceptedAt: Date,
    assignedAt: Date, rejectedBy: mongoose.Schema.Types.ObjectId, rejectReason: String, createdAt: Date
  })),
  MenuItem: mongoose.model('MenuItem', new mongoose.Schema({
    id: String, name: String, category: String, subcat: String, price: Number,
    image: String, badge: String, spicy: Boolean, veg: Boolean, desc: String, available: Boolean, createdAt: Date
  })),
  Reservation: mongoose.model('Reservation', new mongoose.Schema({
    name: String, email: String, phone: String, date: String, time: String, guests: Number,
    occasion: String, requests: String, status: String, tableNo: Number, createdAt: Date
  })),
  Coupon: mongoose.model('Coupon', new mongoose.Schema({
    code: String, discountType: String, discountValue: Number, minOrder: Number,
    maxUses: Number, usedCount: Number, expiry: Date, isActive: Boolean,
    userId: mongoose.Schema.Types.ObjectId, createdAt: Date
  })),
  Review: mongoose.model('Review', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId, orderId: String, itemId: String, rating: Number,
    comment: String, photos: Array, isVisible: Boolean, createdAt: Date
  })),
  Cart: mongoose.model('Cart', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId, items: Array, coupon: String, couponDiscount: Number,
    fulfillment: String, deliveryAddress: String, deliveryCoords: Object, updatedAt: Date
  })),
  Settings: mongoose.model('Settings', new mongoose.Schema({
    restaurantName: String, address: String, phone: String, openTime: String, closeTime: String,
    deliveryRadius: Number, deliveryCharge: Number, minOrderAmount: Number, isOpen: Boolean, updatedAt: Date
  })),
  OtpSession: mongoose.model('OtpSession', new mongoose.Schema({
    identifier: String, type: String, purpose: String, otpHash: String, expiresAt: Date,
    attempts: Number, lastSentAt: Date, createdAt: Date
  })),
  Notification: mongoose.model('Notification', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId, type: String, title: String, body: String,
    data: Object, read: Boolean, createdAt: Date
  })),
  DeliveryRating: mongoose.model('DeliveryRating', new mongoose.Schema({
    orderId: String, userId: mongoose.Schema.Types.ObjectId, deliveryBoyId: mongoose.Schema.Types.ObjectId,
    rating: Number, comment: String, createdAt: Date
  })),
  DeliveryNotif: mongoose.model('DeliveryNotif', new mongoose.Schema({
    deliveryBoyId: mongoose.Schema.Types.ObjectId, type: String, title: String, body: String,
    data: Object, read: Boolean, createdAt: Date
  })),
  DeliveryPushSub: mongoose.model('DeliveryPushSub', new mongoose.Schema({
    deliveryBoyId: mongoose.Schema.Types.ObjectId, subscription: Object, updatedAt: Date
  })),
  AdminNotifLog: mongoose.model('AdminNotifLog', new mongoose.Schema({
    target: String, userQuery: String, title: String, message: String,
    type: String, sentAt: Date, sentCount: Number
  }))
});

async function migrate() {
  try {
    console.log('Connecting to OLD database...');
    await mongoose.connect(OLD_URI);
    console.log('✅ OLD DB connected');
    
    const collections = Object.keys(models);
    const backupData = {};
    
    for (const name of collections) {
      console.log(`Exporting ${name}...`);
      backupData[name] = await models[name].find({}).lean();
      console.log(`  ${backupData[name].length} documents`);
    }
    
    fs.writeFileSync(join(__dirname, 'backup.json'), JSON.stringify(backupData, null, 2));
    console.log('Backup saved to backup.json');
    
    await mongoose.disconnect();
    
    console.log('\nConnecting to NEW database...');
    await mongoose.connect(NEW_URI);
    console.log('✅ NEW DB connected');
    
    for (const name of collections) {
      console.log(`Importing ${name}...`);
      if (backupData[name].length > 0) {
        await models[name].insertMany(backupData[name]);
        console.log(`  ${backupData[name].length} documents inserted`);
      } else {
        console.log('  (no data)');
      }
    }
    
    console.log('\n✅ Migration complete!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();