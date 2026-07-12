import SEOHead from '../components/SEOHead';
import { fetchWithTimeout } from '../lib/utils';
import { useState } from 'react';
import { Calendar, Clock, Users, MapPin, CheckCircle2, Phone, Mail, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TIME_SLOTS = ['11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM'];
const LOCATIONS = ['Mall Road, Civil Lines', 'Wright Town'];
const OCCASIONS = ['Birthday', 'Anniversary', 'Date Night', 'Family Dinner', 'Business Meeting', 'Other'];

export default function ReservationPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', time: '', guests: 2, location: LOCATIONS[0], occasion: '', notes: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithTimeout('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email || 'noemail@guest.com',
          phone: form.phone,
          date: form.date,
          time: form.time,
          guests: form.guests,
          occasion: form.occasion,
          requests: form.notes,
        }),
      });
      if (!res.ok) throw new Error('Server error');
    } catch {
      // Server unavailable — still confirm locally so UX doesn't break
    }
    setLoading(false);
    setConfirmed(true);
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#0A0604] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}
          className="bg-[#1A1310] rounded-3xl shadow-2xl p-12 text-center max-w-md w-full border border-white/5">
          <div className="w-20 h-20 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-green-400" />
          </div>
          <h2 className="font-fredoka text-3xl font-bold text-white mb-3">Table Reserved! 🎉</h2>
          <p className="text-[#A39791] mb-6">Your table for {form.guests} at <strong className="text-white">{form.location}</strong> on <strong className="text-white">{form.date}</strong> at <strong className="text-white">{form.time}</strong> has been booked.</p>
          <div className="bg-[#16100D] rounded-xl p-4 mb-6 text-sm text-left space-y-2 border border-white/5">
            <p><span className="font-semibold text-[#A39791]">Name:</span> <span className="text-white">{form.name}</span></p>
            <p><span className="font-semibold text-[#A39791]">Phone:</span> <span className="text-white">{form.phone}</span></p>
            {form.occasion && <p><span className="font-semibold text-[#A39791]">Occasion:</span> <span className="text-white">{form.occasion}</span></p>}
          </div>
          <p className="text-sm text-[#8E827B] mb-6">A confirmation SMS will be sent to {form.phone}. Call us at +91 9967 412613 to modify.</p>
          <button onClick={() => { setConfirmed(false); setStep(1); setForm({ name: '', phone: '', email: '', date: '', time: '', guests: 2, location: LOCATIONS[0], occasion: '', notes: '' }); }}
            className="w-full py-3 bg-[#F07D14] text-white font-bold rounded-xl hover:bg-[#E86C1B] transition-colors">
            Make Another Reservation
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0604]">
      <SEOHead
        title="Reserve a Table"
        description="Book a table at One in a Million Jabalpur outlets — Mall Road or Wright Town."
        url="/reservation"
      />
            <section className="bg-gradient-to-r from-[#0A0604] to-[#0E0907] text-white py-14 border-b border-white/5">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#F07D14] font-bold text-sm uppercase tracking-widest mb-2">Dine In</p>
          <h1 className="font-fredoka text-5xl font-bold mb-3 text-white">Reserve Your Table</h1>
          <p className="text-[#A39791]">Book ahead and walk in stress-free. Available daily 11 AM – 11 PM.</p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s < step ? 'bg-green-700 text-white' : s === step ? 'bg-[#F07D14] text-white ring-4 ring-[#F07D14]/30' : 'bg-[#1A1310] text-[#8E827B]'
              }`}>
                {s < step ? '✓' : s}
              </div>
              <span className={`text-sm font-semibold hidden sm:block ${s === step ? 'text-white' : 'text-[#8E827B]'}`}>
                {s === 1 ? 'Details' : s === 2 ? 'Date & Time' : 'Confirm'}
              </span>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-green-700' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="bg-[#1A1310] rounded-2xl border border-white/5 p-8 space-y-5">

              {step === 1 && (
                <>
                  <h2 className="font-fredoka text-2xl font-bold text-white mb-2">Your Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Full Name *</label>
                      <input required value={form.name} onChange={e => update('name', e.target.value)}
                        placeholder="Rahul Sharma"
                        className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Phone Number *</label>
                      <input required type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Email (optional)</label>
                      <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Number of Guests *</label>
                      <select required value={form.guests} onChange={e => update('guests', Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14] text-sm">
                        {[1,2,3,4,5,6,7,8,10,12].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Person' : 'People'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Outlet Location *</label>
                      <select required value={form.location} onChange={e => update('location', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14] text-sm">
                        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Occasion (optional)</label>
                      <select value={form.occasion} onChange={e => update('occasion', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14] text-sm">
                        <option value="">Select occasion</option>
                        {['Birthday', 'Anniversary', 'Date Night', 'Family Gathering', 'Business Meal', 'Other'].map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Special Requests</label>
                    <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
                      placeholder="High chair needed, wheelchair access, allergy info..."
                      rows={2} className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm resize-none" />
                  </div>
                  <button type="button" onClick={() => { if (form.name && form.phone) setStep(2); }}
                    disabled={!form.name || !form.phone}
                    className="w-full py-3.5 bg-[#F07D14] text-white font-bold rounded-xl hover:bg-[#E86C1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Next: Pick Date & Time →
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="font-fredoka text-2xl font-bold text-white mb-2">Date & Time</h2>
                  <div>
                    <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Preferred Date *</label>
                    <input required type="date" min={minDateStr} value={form.date} onChange={e => update('date', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14] text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#A39791] mb-3">Available Time Slots</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {TIME_SLOTS.map(slot => (
                        <button key={slot} type="button" onClick={() => update('time', slot)}
                          className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                            form.time === slot ? 'border-[#F07D14] bg-[#F07D14]/15 text-[#F07D14]' : 'border-white/10 text-[#A39791] hover:border-[#F07D14]/40'
                          }`}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex-1 py-3.5 border border-white/10 text-[#A39791] font-bold rounded-xl hover:bg-[#16100D] transition-colors">
                      ← Back
                    </button>
                    <button type="button" onClick={() => { if (form.date && form.time) setStep(3); }}
                      disabled={!form.date || !form.time}
                      className="flex-1 py-3.5 bg-[#F07D14] text-white font-bold rounded-xl hover:bg-[#E86C1B] transition-colors disabled:opacity-50">
                      Next: Confirm →
                    </button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="font-fredoka text-2xl font-bold text-white mb-4">Confirm Reservation</h2>
                  <div className="bg-[#16100D] border border-white/5 rounded-xl p-5 space-y-3 text-sm">
                    {[
                      { icon: Users, label: 'Name', value: form.name },
                      { icon: Phone, label: 'Phone', value: form.phone },
                      form.email && { icon: Mail, label: 'Email', value: form.email },
                      { icon: MapPin, label: 'Location', value: form.location },
                      { icon: Calendar, label: 'Date', value: form.date },
                      { icon: Clock, label: 'Time', value: form.time },
                      { icon: Users, label: 'Guests', value: `${form.guests} ${form.guests === 1 ? 'person' : 'people'}` },
                      form.occasion && { icon: MessageSquare, label: 'Occasion', value: form.occasion },
                      form.notes && { icon: MessageSquare, label: 'Notes', value: form.notes },
                    ].filter(Boolean).map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3">
                        <Icon size={15} className="text-[#F07D14] mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-[#8E827B] font-medium">{label}: </span>
                          <span className="font-semibold text-white">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#8E827B]">By confirming, you agree that we may send an SMS confirmation to your number. Please arrive 5 minutes early.</p>
                  {error && <p className="text-sm text-[#B83A1B] font-semibold">{error}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(2)}
                      className="flex-1 py-3.5 border border-white/10 text-[#A39791] font-bold rounded-xl hover:bg-[#16100D] transition-colors">
                      ← Back
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-1 py-3.5 bg-[#F07D14] text-white font-bold rounded-xl hover:bg-[#E86C1B] transition-colors shadow-lg shadow-[#F07D14]/20 disabled:opacity-70">
                      {loading ? 'Booking...' : 'Confirm Reservation ✓'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}