/**
 * seed-menu.js — Seeds the MongoDB MenuItem collection with the static products.
 * Run once: node seed-menu.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const CLOUD_NAME = 'dsjxrospe';
const FOLDER     = 'one%20in%20a%20million/images';
const BASE       = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
const imageUrl = (id) => `${BASE}/f_auto,q_auto,w_600,h_600,c_fill/${FOLDER}/${id}`;

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
  createdAt: { type: Date, default: Date.now },
});
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

const products = [
  /* ─── BURGERS ─── */
  { id: "paneer-makhani", name: "Paneer Makhani Burger", category: "burgers", subcat: "veg", price: 219, image: imageUrl('paneer-makhani'), badge: "Signature", spicy: true, veg: true, desc: "Crunchy makhani paneer patty, pickled onions, mint sauce, lettuce, and toasted bun." },
  { id: "million-classic", name: "Million Classic Burger", category: "burgers", subcat: "beef", price: 189, image: imageUrl('million-classic'), badge: "Best Seller", desc: "Grilled beef patty, cheese melt, lettuce, onions, and smoky house glaze." },
  { id: "crispy-chicken-burger", name: "Crispy Chicken Burger", category: "burgers", subcat: "chicken", price: 229, image: imageUrl('crispy-chicken-burger'), badge: "Crunch", desc: "Crispy chicken, creamy mayo, fresh greens, and tangy sauce in a glossy bun." },
  { id: "veg-crunch-stack", name: "Veg Crunch Stack", category: "burgers", subcat: "veg", price: 169, image: imageUrl('veg-crunch-stack'), badge: "Fresh", veg: true, desc: "Veggie patty, onion crunch, capsicum, lettuce, and zesty green sauce." },
  { id: "smoky-bbq-beef", name: "Smoky BBQ Beef", category: "burgers", subcat: "beef", price: 259, image: imageUrl('double-smash'), badge: "New", spicy: true, desc: "Slow-cooked beef patty, house BBQ sauce, caramelized onions, crispy bacon, and pickles." },
  { id: "zinger-spicy", name: "Zinger Spicy Stack", category: "burgers", subcat: "chicken", price: 239, image: imageUrl('zinger-spicy'), badge: "🔥 Hot", spicy: true, desc: "Double-dredged spicy chicken fillet, ghost pepper sauce, jalapeños, and sriracha slaw." },
  { id: "mushroom-swiss", name: "Mushroom Swiss Burger", category: "burgers", subcat: "special", price: 249, image: imageUrl('mushroom-swiss'), badge: "Special", desc: "Sautéed portobello mushrooms, Swiss cheese, truffle aioli, and rocket leaves." },
  { id: "double-smash", name: "Double Smash Burger", category: "burgers", subcat: "beef", price: 299, image: imageUrl('double-smash'), badge: "Big Stack", desc: "Two smashed beef patties, double cheese, pickles, and our secret thousand island sauce." },
  { id: "bbq-bacon-burger", name: "BBQ Bacon Burger", category: "burgers", subcat: "beef", price: 279, image: imageUrl('double-smash'), badge: "Popular", desc: "Beef patty, smoked bacon, BBQ glaze, onions, and cheddar." },
  /* ─── SIDES ─── */
  { id: "strip-cravings", name: "Strip Cravings Box", category: "sides", price: 179, image: imageUrl('strip-cravings'), badge: "Golden", desc: "Crispy strips with a flaky seasoned crust and dip on the side." },
  { id: "crispy-bites", name: "Crispy Cheese Bites", category: "sides", price: 149, image: imageUrl('crispy-bites'), badge: "Melty", desc: "Bite-sized golden crunch with soft, cheesy centers." },
  { id: "loaded-fries", name: "Loaded Cheese Fries", category: "sides", price: 159, image: imageUrl('loaded-fries'), badge: "Loaded", desc: "Thick-cut fries smothered in nacho cheese, jalapeños, and sour cream." },
  { id: "onion-rings", name: "Crispy Onion Rings", category: "sides", price: 119, image: imageUrl('onion-rings'), badge: "Crunchy", desc: "Beer-battered onion rings with chipotle dipping sauce." },
  /* ─── DRINKS ─── */
  { id: "oreo-shake", name: "Oreo Magic Shake", category: "drinks", price: 139, image: imageUrl('oreo-shake'), badge: "Chill", desc: "Creamy Oreo shake, cold and thick with cookie crumble." },
  { id: "green-cooler", name: "Mint Lime Cooler", category: "drinks", price: 99, image: imageUrl('green-cooler'), badge: "Fizz", desc: "Mint, lime, herbs, and sparkling refreshment." },
  { id: "mango-lassi", name: "Mango Masala Lassi", category: "drinks", price: 119, image: imageUrl('mango-lassi'), badge: "Desi", desc: "Thick mango lassi with a hint of cardamom and saffron." },
  { id: "cola-float", name: "Vanilla Cola Float", category: "drinks", price: 129, image: imageUrl('oreo-shake'), badge: "Classic", desc: "Chilled cola topped with a scoop of vanilla ice cream." },
  /* ─── COMBOS ─── */
  { id: "million-meal", name: "Million Meal Combo", category: "combos", price: 399, image: imageUrl('paneer-makhani'), badge: "Deal", desc: "Paneer Makhani Burger, crispy strips, and one house drink." },
  { id: "family-feast", name: "Family Feast Box", category: "combos", price: 899, image: imageUrl('crispy-chicken-burger'), badge: "Value", desc: "4 burgers, 2 large fries, 4 drinks — perfect for sharing." },
  { id: "couple-combo", name: "Couple's Combo", category: "combos", price: 549, image: imageUrl('paneer-makhani'), badge: "Date Night", desc: "2 burgers of your choice, shared fries, and 2 house drinks." },
];

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('❌ MONGO_URI not set in .env'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  // Upsert each product (won't duplicate if run multiple times)
  for (const p of products) {
    await MenuItem.findOneAndUpdate({ id: p.id }, p, { upsert: true, new: true });
    console.log(`  ✔ ${p.name}`);
  }

  console.log(`\n🎉 Seeded ${products.length} menu items!`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
