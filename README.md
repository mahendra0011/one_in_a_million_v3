# 🍔 One in a Million — Full Stack Restaurant App

A full-stack restaurant ordering platform with customer storefront, real-time order tracking, an admin dashboard, and a delivery-partner panel.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?logo=socket.io&logoColor=white)

---

## 📖 Table of Contents
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Creating the First Admin User](#-creating-the-first-admin-user)
- [API Routes](#-api-routes)
- [Socket.io Events](#-socketio-events)
- [Admin Panel](#-admin-panel)
- [Delivery Panel](#-delivery-panel)
- [Color Theme](#-color-theme)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## ✨ Features

- 🛒 Customer storefront — menu browsing, product customization, cart, checkout, payments, reservations, reviews, search, FAQ
- 🔐 Auth system — register/login, OTP via Email (Brevo), JWT-based sessions
- 📦 Order tracking — real-time order status updates via Socket.io
- 🧑‍💼 Admin dashboard — menu management, orders, reservations, customers, coupons, reviews, analytics, delivery-boy management, notifications
- 🚴 Delivery partner panel — login, dashboard, order details, earnings, profile, notifications
- 🖼️ Cloudinary integration for image uploads
- 📱 PWA-ready (installable, offline caching via Workbox)
- 🎨 Tailwind CSS v4 + GSAP + Framer Motion animations

---

## 🛠 Tech Stack

**Frontend**
- React 19 + Vite 6
- Tailwind CSS v4
- Redux Toolkit + React Redux (state management)
- React Router v7
- TanStack React Query
- GSAP + Framer Motion (animations)
- React Three Fiber + Drei (3D)
- Lucide React (icons)
- Socket.io Client
- vite-plugin-pwa

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- Socket.io (real-time events)
- JWT authentication + bcryptjs
- Cloudinary (image storage)
- Brevo (email OTP)

- express-validator, express-rate-limit, helmet, cookie-parser

---

## 📁 Project Structure

```
one_in_a_million_v3/
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx, MenuPage.jsx, OffersPage.jsx, ReservationPage.jsx
│   │   ├── AboutPage.jsx, ContactPage.jsx, SearchPage.jsx, ReviewsPage.jsx
│   │   ├── AccountPage.jsx, FAQPage.jsx, PaymentPage.jsx, ProductDetailPage.jsx
│   │   ├── ForgotPasswordPage.jsx, NotFoundPage.jsx
│   │   ├── admin/         → AdminLogin, AdminDashboard, AdminMenu, AdminOrders,
│   │   │                    AdminReservations, AdminCustomers, AdminAnalytics,
│   │   │                    AdminCoupons, AdminReviews, AdminDeliveryBoys,
│   │   │                    AdminNotifications, AdminSettings, AdminLayout
│   │   └── delivery/      → DeliveryLogin, DeliveryDashboard, DeliveryOrderDetail,
│   │                         DeliveryEarnings, DeliveryProfile, DeliveryNotifications,
│   │                         DeliverySetPassword
│   ├── components/
│   │   ├── shared/, admin/, delivery/, layout/
│   ├── hooks/             → custom React hooks
│   ├── store/
│   │   ├── index.js       → Redux store config
│   │   └── slices/        → cartSlice, authSlice, etc.
│   ├── data/              → static product/menu data
│   ├── lib/                → utility/helper functions
│   ├── assets/
│   ├── App.jsx
│   ├── main.jsx
│   └── home.css / index.css
├── server/
│   ├── index.js           → Express app entry point
│   ├── routes/            → API route definitions
│   ├── models/            → Mongoose schemas
│   ├── middleware/         → errorHandler, rateLimiters, validate, validators
│   ├── services/          → notification.service.js, otp.service.js
│   ├── utils/              → cloudinary-upload.js
│   ├── .env.example
│   └── package.json
├── public/                 → PWA icons, favicons
├── index.html
├── vite.config.js          → Vite + PWA + Tailwind + proxy config
├── eslint.config.js
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (recommended v20+)
- [MongoDB](https://www.mongodb.com/) (local instance or MongoDB Atlas)
- npm (comes with Node.js)

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd one_in_a_million_v3
```

### 2. Frontend Setup
```bash
npm install
npm run dev
```
Frontend runs at → **http://localhost:5173**

### 3. Backend Setup
```bash
cd server
npm install
cp .env.example .env   # then fill in your own values, see below
npm run dev
```
API runs at → **http://localhost:3001**

> Frontend is configured (in `vite.config.js`) to proxy all `/api/*` requests to `http://localhost:3001`, so both servers should run together during development.

---

## 🔑 Environment Variables

Copy `server/.env.example` to `server/.env` and fill in your own values:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `PORT` | Backend server port (default `3001`) |
| `CLIENT_URL` | Frontend URL (used in emails/links) |
| `SETUP_SECRET` | One-time secret to create the first admin user |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` / `CLOUDINARY_FOLDER` | Cloudinary image upload credentials |
| `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` | Brevo (email OTP) credentials |


**Never commit your real `.env` file** — only `.env.example` should be tracked in git.

---

## 👤 Creating the First Admin User

Once the backend is running, call this endpoint **once**:
```bash
curl -X POST http://localhost:3001/api/setup/admin \
  -H "Content-Type: application/json" \
  -d '{"secret":"my-setup-secret-2024","name":"Admin","email":"admin@oneinamillion.com","password":"admin123"}'
```

Or use the dev fallback credentials at `/admin/login` (works even without MongoDB connected):
```
Email:    admin@oneinamillion.com
Password: admin123
```

---

## 🔌 API Routes

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user (requires token) |
| PUT | `/api/auth/profile` | Update profile (requires token) |
| POST | `/api/auth/admin-login` | Admin login |

### Menu
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/menu` | Public | Get all menu items |
| POST | `/api/menu` | Admin | Add menu item |
| PUT | `/api/menu/:id` | Admin | Update menu item |
| DELETE | `/api/menu/:id` | Admin | Delete menu item |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders` | Public | Place new order |
| GET | `/api/orders` | Admin | Get all orders |
| GET | `/api/orders/my` | User | Get my orders |
| GET | `/api/orders/:id` | Public | Get order by ID |
| PATCH | `/api/orders/:id/status` | Admin | Update order status |

### Reservations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reservations` | Public | Make reservation |
| GET | `/api/reservations` | Admin | Get all reservations |
| PATCH | `/api/reservations/:id` | Admin | Update reservation |

### Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics` | Admin | Get dashboard stats |

> Additional routes exist for coupons, reviews, delivery partners, and notifications — see `server/routes/` for the full list.

---

## 📡 Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-admin` | Client → Server | Subscribe to admin notifications |
| `new-order` | Server → Admin | New order placed |
| `order-updated` | Server → Admin | Order status changed |
| `new-reservation` | Server → Admin | New reservation made |
| `track-order` | Client → Server | Track a specific order |
| `status-update` | Server → Client | Order status update for customer |

---

## 🧑‍💼 Admin Panel

- Access at: **`/admin/login`**
- Default dev credentials: `admin@oneinamillion.com` / `admin123`
- Protected by `AdminGuard` component (route guarding)
- JWT token stored in `localStorage`
- Sections: Dashboard, Menu, Orders, Reservations, Customers, Coupons, Reviews, Delivery Boys, Notifications, Analytics, Settings

## 🚴 Delivery Panel
 
 - Access at: **`/delivery/login`**
 - Sections: Dashboard, Order Detail, Earnings, Profile, Notifications, Set Password
 
 ---
 
 ## 🛰️ Live Tracking System (20-Step Implementation)
 
 This system provides real-time burger delivery tracking with the following architecture:
 
 ### Phase 1: Backend & Real-time Infrastructure
 - **Step 1-3**: Node.js project with Express, MongoDB, Socket.io, and Redis adapter for scalable pub/sub
 - **Step 4**: Database schemas (User, Order, DeliveryNotif, DeliveryRating)
 - **Step 5**: Admin API for delivery boy onboarding
 
 ### Phase 2: User Order Flow
 - **Step 6-7**: User frontend with geolocation + manual address input + MapTiler geocoding
 - **Step 8**: Order placement saves coordinates and address to database
 
 ### Phase 3: Delivery Flow & OTP
 - **Step 9-11**: Delivery boy notifications, order acceptance with location, OTP via email
 
 ### Phase 4: Live Tracking Core
 - **Step 12**: Socket.io rooms per order (`order_<orderId>`)
 - **Step 13**: Background geolocation (HTML5 + Wake Lock API for mobile)
 - **Step 14**: Socket emission for location updates
 - **Step 15**: OpenRouteService map matching (snap-to-road) for accurate positioning
 
 ### Phase 5: Map Integration (MapLibre + MapTiler)
 - **Step 16-17**: MapLibre maps with streets-v2 style, MapTiler API key
 - **Step 18-19**: Driver dashboard with route polyline + live map for users
 
 ### Phase 6: Delivery & Cleanup
 - **Step 20**: OTP verification marks order delivered + cleanup
 
 ### Real-time Events Flow
 ```
 User places order → Admin assigns → Delivery boy gets notification → 
 Driver accepts (sends location) → Live tracking starts → 
 OTP generated when near customer → OTP verified → Order marked delivered
 ```
 
 ### API Endpoints for Live Tracking
 | Method | Endpoint | Description |
 |--------|----------|-------------|
 | POST | `/api/routes/directions` | Get route polyline between two points (ORS) |
 | POST | `/api/routes/snap` | Snap GPS coordinates to road (ORS matching) |
 | GET | `/api/geocode/search` | Address search with MapTiler/Nominatim |
 | PATCH | `/api/delivery/my-location` | Update driver's current location |
 | PATCH | `/api/delivery/orders/:id/location` | Push location during delivery |
 | PATCH | `/api/delivery/orders/:id/accept` | Accept order with location |
 | POST | `/api/delivery/orders/:id/request-delivery-otp` | Generate OTP for delivery |
 | POST | `/api/delivery/orders/:id/verify-otp` | Verify OTP and complete delivery |
 
 ### Socket.io Rooms
 | Room | Join Event | Purpose |
 |------|------------|---------|
 | `admin` | `join-admin` | Admin dashboard notifications |
 | `user-{id}` | `join-user` | Customer notifications |
 | `delivery-{id}` | `join-delivery` | Delivery boy assignments |
 | `order-{orderId}` | `track-order` | Live location updates |
 
 ---
 
 ## 🎨 Color Theme

```
Orange:  #f46d22
Deep:    #d94714
Dark:    #171315
Paper:   #fff8ed
Sun:     #ffc44d
Mint:    #9adf9d
Teal:    #0f7c83
```

---

## 🩹 Troubleshooting

**`npm i` fails with `ERESOLVE` peer-dependency error**
This project pins React 19. Some packages (e.g. `react-helmet-async`) declare an older peer-dependency range. This is already handled via the `overrides` field in `package.json`. If you still hit a peer conflict on a new package you add, run:
```bash
npm i --legacy-peer-deps
```

**`'vite' is not recognized as an internal or external command` (Windows)**
This means `npm install` did not complete successfully (so `node_modules/.bin/vite` was never created). Fix the underlying `npm i` error first, then re-run `npm install`.

**Backend won't start / MongoDB connection errors**
Make sure MongoDB is running locally, or `MONGO_URI` in `server/.env` points to a valid MongoDB Atlas cluster.

**Images not loading**
Check your `CLOUDINARY_*` env vars in `server/.env`. See `cloudinary-images.json` at the project root for the expected image catalog format.

---

## 📄 License

This project is for educational/personal use. Add your preferred license (MIT, etc.) here if open-sourcing.
