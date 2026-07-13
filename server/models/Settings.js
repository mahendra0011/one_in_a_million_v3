import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  restaurantName: { type: String, default: 'One in a Million' },
  tagline:        { type: String, default: '' },
  address:        { type: String, default: '303, Mall Road, Civil Lines, Jabalpur' },
  phone:          { type: String, default: '+91 9967412613' },
  email:          { type: String, default: '' },
  gstNumber:      { type: String, default: '' },
  openTime:       { type: String, default: '11:00' },
  closeTime:      { type: String, default: '23:00' },
  closedDays:     { type: [String], default: [] },
  deliveryRadius: { type: Number, default: 5 },
  deliveryCharge: { type: Number, default: 39 },
  minOrderAmount: { type: Number, default: 149 },
  isOpen:         { type: Boolean, default: true },
  // UI settings
  emailNotif:     { type: Boolean, default: true },
  smsNotif:       { type: Boolean, default: true },
  newOrderSound:  { type: Boolean, default: true },
  lowStockAlert:  { type: Boolean, default: true },
  razorpayEnabled: { type: Boolean, default: true },
  upiEnabled:     { type: Boolean, default: true },
  codEnabled:      { type: Boolean, default: true },
  theme:           { type: String, default: 'orange' },
  allowReviews:    { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  // Restaurant location coordinates for delivery tracking
  restaurantLocation: {
    lat: { type: Number, default: 23.1828 },
    lng: { type: Number, default: 79.9501 },
  },
  updatedAt:      { type: Date, default: Date.now },
});

const Settings = mongoose.model('Settings', settingsSchema);

export { Settings };
export default Settings;

export async function getSettings() {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  return s;
}