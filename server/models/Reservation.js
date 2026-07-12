import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  guests: { type: Number, default: 2 },
  location: { type: String, default: 'Mall Road, Civil Lines' },
  occasion: { type: String, default: '' },
  requests: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  tableNo: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Reservation', reservationSchema);
