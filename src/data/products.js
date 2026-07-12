const placeholderImage = (text, hue = 24) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <defs><linearGradient id="g${hue}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},85%,55%)"/>
      <stop offset="100%" stop-color="hsl(${hue + 30},80%,40%)"/>
    </linearGradient></defs>
    <rect fill="url(#g${hue})" width="400" height="300" rx="12"/>
    <text x="200" y="140" text-anchor="middle" fill="white"
      font-size="22" font-weight="bold" font-family="Fredoka, Inter, sans-serif"
      dy=".3em">${text}</text>
    <text x="200" y="185" text-anchor="middle" fill="rgba(255,255,255,0.75)"
      font-size="28" font-family="serif" dy=".3em">🍔</text>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
};

import { menuImageUrl } from '../lib/cloudinary.js';

// All images using Cloudinary with auto-format (WebP on supporting browsers)
// f_auto → serves WebP/AVIF automatically based on browser Accept header
// q_auto → Cloudinary picks optimal quality (usually 75-85, ~50% smaller)
// w_600,h_600,c_fill → resize to max display size so no oversized bytes are sent
const imageUrl = (id) => menuImageUrl(id);

export const products = [
  /* ─── BURGERS ─── */
  {
    id: "paneer-makhani",
    name: "Paneer Makhani Burger",
    category: "burgers",
    subcat: "veg",
    price: 219,
    image: imageUrl('paneer-makhani'),
    badge: "Signature",
    spicy: true,
    desc: "Crunchy makhani paneer patty, pickled onions, mint sauce, lettuce, and toasted bun.",
  },
  {
    id: "million-classic",
    name: "Million Classic Burger",
    category: "burgers",
    subcat: "beef",
    price: 189,
    image: imageUrl('million-classic'),
    badge: "Best Seller",
    desc: "Grilled beef patty, cheese melt, lettuce, onions, and smoky house glaze.",
  },
  {
    id: "crispy-chicken-burger",
    name: "Crispy Chicken Burger",
    category: "burgers",
    subcat: "chicken",
    price: 229,
    image: imageUrl('crispy-chicken-burger'),
    badge: "Crunch",
    desc: "Crispy chicken, creamy mayo, fresh greens, and tangy sauce in a glossy bun.",
  },
  {
    id: "veg-crunch-stack",
    name: "Veg Crunch Stack",
    category: "burgers",
    subcat: "veg",
    price: 169,
    image: imageUrl('veg-crunch-stack'),
    badge: "Fresh",
    desc: "Veggie patty, onion crunch, capsicum, lettuce, and zesty green sauce.",
  },
  {
    id: "smoky-bbq-beef",
    name: "Smoky BBQ Beef",
    category: "burgers",
    subcat: "beef",
    price: 259,
    image: imageUrl('double-smash'),
    badge: "New",
    spicy: true,
    desc: "Slow-cooked beef patty, house BBQ sauce, caramelized onions, crispy bacon, and pickles.",
  },
  {
    id: "zinger-spicy",
    name: "Zinger Spicy Stack",
    category: "burgers",
    subcat: "chicken",
    price: 239,
    image: imageUrl('zinger-spicy'),
    badge: "🔥 Hot",
    spicy: true,
    desc: "Double-dredged spicy chicken fillet, ghost pepper sauce, jalapeños, and sriracha slaw.",
  },
  {
    id: "mushroom-swiss",
    name: "Mushroom Swiss Burger",
    category: "burgers",
    subcat: "special",
    price: 249,
    image: imageUrl('mushroom-swiss'),
    badge: "Special",
    desc: "Sautéed portobello mushrooms, Swiss cheese, truffle aioli, and rocket leaves.",
  },
  {
    id: "double-smash",
    name: "Double Smash Burger",
    category: "burgers",
    subcat: "beef",
    price: 299,
    image: imageUrl('double-smash'),
    badge: "Big Stack",
    desc: "Two smashed beef patties, double cheese, pickles, and our secret thousand island sauce.",
  },
  /* ─── SIDES ─── */
  {
    id: "strip-cravings",
    name: "Strip Cravings Box",
    category: "sides",
    price: 179,
    image: imageUrl('strip-cravings'),
    badge: "Golden",
    desc: "Crispy strips with a flaky seasoned crust and dip on the side.",
  },
  {
    id: "crispy-bites",
    name: "Crispy Cheese Bites",
    category: "sides",
    price: 149,
    image: imageUrl('crispy-bites'),
    badge: "Melty",
    desc: "Bite-sized golden crunch with soft, cheesy centers.",
  },
  {
    id: "loaded-fries",
    name: "Loaded Cheese Fries",
    category: "sides",
    price: 159,
    image: imageUrl('loaded-fries'),
    badge: "Loaded",
    desc: "Thick-cut fries smothered in nacho cheese, jalapeños, and sour cream.",
  },
  {
    id: "onion-rings",
    name: "Crispy Onion Rings",
    category: "sides",
    price: 119,
    image: imageUrl('onion-rings'),
    badge: "Crunchy",
    desc: "Beer-battered onion rings with chipotle dipping sauce.",
  },
  /* ─── DRINKS ─── */
  {
    id: "oreo-shake",
    name: "Oreo Magic Shake",
    category: "drinks",
    price: 139,
    image: imageUrl('oreo-shake'),
    badge: "Chill",
    desc: "Creamy Oreo shake, cold and thick with cookie crumble.",
  },
  {
    id: "green-cooler",
    name: "Mint Lime Cooler",
    category: "drinks",
    price: 99,
    image: imageUrl('green-cooler'),
    badge: "Fizz",
    desc: "Mint, lime, herbs, and sparkling refreshment.",
  },
  {
    id: "mango-lassi",
    name: "Mango Masala Lassi",
    category: "drinks",
    price: 119,
    image: imageUrl('mango-lassi'),
    badge: "Desi",
    desc: "Thick mango lassi with a hint of cardamom and saffron.",
  },
  {
    id: "cola-float",
    name: "Vanilla Cola Float",
    category: "drinks",
    price: 129,
    image: imageUrl('oreo-shake'),
    badge: "Classic",
    desc: "Chilled cola topped with a scoop of vanilla ice cream.",
  },
  /* ─── COMBOS ─── */
  {
    id: "million-meal",
    name: "Million Meal Combo",
    category: "combos",
    price: 399,
    image: imageUrl('paneer-makhani'),
    badge: "Deal",
    desc: "Paneer Makhani Burger, crispy strips, and one house drink.",
  },
  {
    id: "family-feast",
    name: "Family Feast Box",
    category: "combos",
    price: 899,
    image: imageUrl('crispy-chicken-burger'),
    badge: "Value",
    desc: "4 burgers, 2 large fries, 4 drinks — perfect for sharing.",
  },
  {
    id: "couple-combo",
    name: "Couple's Combo",
    category: "combos",
    price: 549,
    image: imageUrl('paneer-makhani'),
    badge: "Date Night",
    desc: "2 burgers of your choice, shared fries, and 2 house drinks.",
  },
];

export const extras = [
  { id: "cheese", label: "Extra cheese", price: 35 },
  { id: "patty", label: "Extra patty", price: 79 },
  { id: "fries", label: "Fries add-on", price: 69 },
  { id: "dip", label: "House dip", price: 25 },
  { id: "bacon", label: "Crispy bacon", price: 49 },
  { id: "jalapeno", label: "Jalapeños", price: 20 },
];

export const sizeOptions = [
  { id: "single", label: "Single", price: 0 },
  { id: "double", label: "Double", price: 79 },
];

export const spiceLevels = [
  { id: 0, label: "No Spice", emoji: "🌶️" },
  { id: 1, label: "Mild", emoji: "🌶️" },
  { id: 2, label: "Medium", emoji: "🌶️🌶️" },
  { id: 3, label: "Hot", emoji: "🌶️🌶️🌶️" },
  { id: 4, label: "Extra Hot", emoji: "🌶️🌶️🌶️🌶️" },
];

// Coupons are now managed dynamically via /api/coupons — see AdminCoupons.jsx