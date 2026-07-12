import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

// ─── ENV ───────────────────────────────────────────────────────────────────────
if (!process.env.MONGO_URI) console.warn('⚠️ MONGO_URI not set - using default local mongodb');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/one-in-a-million';

// ─── CLOUDINARY ───────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── DB CONNECT ───────────────────────────────────────────────────────────────
export async function connectDB() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
export { cloudinary };
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
export const PORT = process.env.PORT || 3001;
export const JWT_SECRET = process.env.JWT_SECRET;
export const SETUP_SECRET = process.env.SETUP_SECRET;
export const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'one in a million/images';
