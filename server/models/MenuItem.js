import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  subcat: { type: String, default: '' },
  price: { type: Number, required: true },
  image: { type: String, default: '' },
  badge: { type: String, default: '' },
  spicy: { type: Boolean, default: false },
  veg: { type: Boolean, default: false },
  desc: { type: String, default: '' },
  available: { type: Boolean, default: true },
  // Stock tracking for low stock alerts
  stock: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('MenuItem', menuItemSchema);
