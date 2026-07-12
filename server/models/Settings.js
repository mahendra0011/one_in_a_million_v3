import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  restaurantName: { type: String, default: 'One in a Million' },
  address:        { type: String, default: '303, Mall Road, Civil Lines, Jabalpur' },
  phone:          { type: String, default: '+91 9967412613' },
  openTime:       { type: String, default: '11:00' },
  closeTime:      { type: String, default: '23:00' },
  deliveryRadius: { type: Number, default: 5 },
  deliveryCharge: { type: Number, default: 39 },
  minOrderAmount: { type: Number, default: 149 },
  isOpen:         { type: Boolean, default: true },
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
