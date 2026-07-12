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
 
 ## 🛰️ 20-Step Live Tracking System Implementation
 
 This guide documents the complete Burger Delivery Live Tracking System implementation:
 
 ### Phase 1: Backend & Real-time Infrastructure (Steps 1-5)
 
 **Step 1: Node.js Project Setup**
 ```bash
 npm install express mongoose socket.io redis @socket.io/redis-adapter nodemailer axios cors dotenv
 ```
 Packages: Server (express), Database (mongoose), Real-time (socket.io + redis), Email (brevo)
 
 **Step 2: Redis Setup (Render Free)**
 - Use the provided Render Redis URL: `redis://red-d99b8mf7f7vs73a4u9b0:6379`
 - Add to `.env`: `REDIS_URL=redis://red-d99b8mf7f7vs73a4u9b0:6379`
 
 **Step 3: Socket.io + Redis Adapter** (Already implemented in `server/index.js`)
 ```javascript
 const pubClient = createClient({ url: process.env.REDIS_URL });
 const subClient = pubClient.duplicate();
 Promise.all([pubClient.connect(), subClient.connect()])
   .then(() => io.adapter(createAdapter(pubClient, subClient)));
 ```
 
 **Step 4: Database Schemas** (Already in `server/models/`)
 - `User.js`: role support (user/admin/delivery_boy), currentLocation, isOnline
 - `Order.js`: customerLocation, deliveryBoyLocation, deliveryOtp fields
 - `DeliveryNotif.js`: In-app notifications for delivery boys
 - `DeliveryRating.js`: Customer ratings for delivery boys
 
 **Step 5: Admin Delivery Boy Onboarding** (Already implemented)
 - POST `/api/admin/delivery-boys` - Create delivery boy account
 - GET `/api/admin/delivery-boys` - List all delivery boys
 - PATCH `/api/admin/delivery-boys/:id` - Update delivery boy
 
 ---
 
 ### Phase 2: User Order Flow (Steps 6-8)
 
 **Step 6: User Location UI** (Already in `src/components/CartDrawer.jsx`)
 - "Use Current Location" button - HTML5 Geolocation API
 - Manual address field - Text input
 - Both are required for delivery orders
 
 **Step 7: Geocoding Integration**
 - Uses Nominatim for reverse geocoding (no API key needed)
 - MapTiler API key used for forward geocoding
 - Search endpoint: `/api/geocode/search?q=address&limit=5`
 
 **Step 8: Order Placement**
 - POST `/api/orders` - Saves coordinates + address
 - Order is now ready for assignment
 
 ---
 
 ### Phase 3: Delivery Boy Flow (Steps 9-11)
 
 **Step 9: Order Notification**
 - Uses Socket.io for real-time assignment
 - `onNewAssignment` event in `DeliveryDashboard.jsx`
 
 **Step 10: Accept Order with Location**
 - PATCH `/api/delivery/orders/:id/accept` - Requires lat/lng
 - Driver's location saved + order assigned
 
 **Step 11: Email OTP Generation**
 - OTP generated via Brevo API
 - Sent to customer email on acceptance
 - Also generated on "Reached Customer" status
 
 ---
 
 ### Phase 4: Live Tracking Core (Steps 12-15)
 
 **Step 12: Socket Rooms**
 - `socket.join('order-${orderId}')` - Per-order room
 - Location updates only sent to that room
 
 **Step 13: Background Geolocation** (`src/lib/backgroundGeolocation.js`)
 - Wake Lock API prevents screen sleep
 - Visibility handler re-acquires lock
 - Works when phone is locked
 
 **Step 14: Socket Location Emission** (Already in `useSocket.js`)
 ```javascript
 socket.emit('update-location', { orderId, lat, lng, deliveryBoyId });
 ```
 
 **Step 15: Map Matching (Snap-to-Road)**
 - POST `/api/routes/snap` - OpenRouteService snapped coordinates
 - Location smoothed to roads every 8 updates
 
 ---
 
 ### Phase 5: Map Integration (Steps 16-19)
 
 **Step 16-17: MapLibre + MapTiler** (Already in `LiveTrackingMap.jsx`)
 - Map initialized with streets-v2 style
 - MapTiler API key required: `VITE_MAPTILER_API_KEY`
 
 **Step 18: Driver Map UI** (Already in `DeliveryDashboard.jsx`)
 - Live map shows driver marker + customer location
 - Route polyline between them (blue line)
 - Distance indicator displayed
 
 **Step 19: User Map UI** (Already in `OrderDetailPage.jsx`)
 - `LiveTrackingMap` component included for out_for_delivery orders
 - Smooth marker animation for realistic movement
 
 ---
 
 ### Phase 6: Delivery & Cleanup (Step 20)
 
 **Step 20: OTP Verification & Cleanup**
 - Driver enters 4/6-digit OTP
 - Backend verifies + marks order delivered
 - Live tracking stops automatically
 
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

