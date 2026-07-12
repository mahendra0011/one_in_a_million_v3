# One in a Million — Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
# Root (frontend)
npm install

# Server (backend)
cd server && npm install
```

### 2. Configure Environment

**server/.env** (copy from server/.env.example and fill in):
```
MONGO_URI=mongodb://localhost:27017/one-in-a-million
JWT_SECRET=your-super-secret-key-min-32-chars
PORT=3001
CLIENT_URL=http://localhost:5173

# Admin auto-create on first server start
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourAdminPassword123

# Cloudinary (already filled)
CLOUDINARY_CLOUD_NAME=dsjxrospe
...

# Brevo Email OTP
BREVO_API_KEY=your-brevo-key

# Redis (optional - for multi-server socket.io)
REDIS_URL=redis://...

# Map services
ORS_API_KEY=...
MAPTILER_API_KEY=...
```

**Root .env** (frontend):
```
VITE_MAPTILER_API_KEY=your-maptiler-key
```

### 3. Seed Menu Items (first time only)
```bash
cd server && node seed-menu.js
```

### 4. Run Both Together
```bash
# From project root
npm run dev
```
This starts both server (port 3001) and Vite (port 5173) together.

---

## Known Issues Fixed in This Version

1. ✅ `@socket.io/redis-adapter` — wrong default import fixed (now named import)
2. ✅ `bcrypt` not imported in server/index.js — fixed
3. ✅ Duplicate mongoose index warnings on `email` and `orderId` — fixed
4. ✅ Vite proxy ECONNREFUSED spam in console — now silently suppressed
5. ✅ Garbage files (`$null`, `{', etc.) — removed
6. ✅ server/.env and root/.env files created with your keys

---

## Important Notes

- **Brevo API Key** — Email OTP tabhi kaam karega jab BREVO_API_KEY set ho. Bina key ke dev mode mein OTP console pe print hoga.
- **Redis** — Optional hai. Bina Redis ke single-server pe sab kaam karta hai.
- **Menu Seed** — Pehli baar `npm run seed:menu` run karo warna menu empty dikhega.
- **Admin Account** — ADMIN_EMAIL aur ADMIN_PASSWORD .env mein set karo, server start hone pe automatically create hoga.

---

## Delivery Boy Setup
1. Admin panel → Delivery Boys → Add New
2. Name, phone, password enter karo
3. Delivery boy `/delivery/login` pe jaake phone + password se login karega

