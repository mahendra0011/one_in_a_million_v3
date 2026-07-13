import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, User, Phone, Truck, Lock, Calendar,
  Check, X, Loader2, Eye, EyeOff, Save, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

const validatePassword = pwd => pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-bold shadow-xl flex items-center gap-2 ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
      {msg}
    </motion.div>
  );
}

export default function DeliveryProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeSection, setActiveSection] = useState('profile'); // profile | password | availability

  // Profile form
  const [form, setForm] = useState({ name: '', phone: '', vehicleType: '', vehicleNumber: '', profilePhoto: '' });
  // Availability
  const [unavailableDays, setUnavailableDays] = useState([]);
  const [availabilityNote, setAvailabilityNote] = useState('');
  // Password
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithTimeout('/api/delivery/profile', { credentials: 'include' });
        const data = await res.json();
        if (data.ok) {
          const p = data.profile;
          setProfile(p);
          setForm({ name: p.name || '', phone: p.phone || '', vehicleType: p.vehicleType || '', vehicleNumber: p.vehicleNumber || '', profilePhoto: p.profilePhoto || '' });
          setUnavailableDays(p.unavailableDays || []);
          setAvailabilityNote(p.availabilityNote || '');
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (data.url) {
        setForm(f => ({ ...f, profilePhoto: data.url }));
        showToast('Photo upload ho gaya!');
      } else { showToast('Photo upload fail', 'error'); }
    } catch { showToast('Upload error', 'error'); }
    setUploadingPhoto(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetchWithTimeout('/api/delivery/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, unavailableDays, availabilityNote }),
      });
      const data = await res.json();
      if (data.ok) {
        setProfile(data.profile);
        // Update localStorage
        const stored = JSON.parse(localStorage.getItem('bim_user') || '{}');
        localStorage.setItem('bim_user', JSON.stringify({ ...stored, name: data.profile.name, phone: data.profile.phone, profilePhoto: data.profile.profilePhoto }));
        showToast('Profile save ho gaya!');
      } else { showToast(data.error || 'Save fail', 'error'); }
    } catch { showToast('Network error', 'error'); }
    setSaving(false);
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const res = await fetchWithTimeout('/api/delivery/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ unavailableDays, availabilityNote }),
      });
      const data = await res.json();
      if (data.ok) { showToast('Schedule save ho gaya!'); }
      else { showToast(data.error || 'Save fail', 'error'); }
    } catch { showToast('Network error', 'error'); }
    setSaving(false);
  };

  const changePassword = async () => {
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Nayi passwords match nahi kar rahi'); return; }
    if (!validatePassword(pwForm.newPassword)) { setPwError('Password must be 8+ chars with uppercase, lowercase, number and special character'); return; }
    setPwSaving(true);
    try {
      const res = await fetchWithTimeout('/api/delivery/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Password change ho gaya!');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else { setPwError(data.error || 'Change fail'); }
    } catch { setPwError('Network error'); }
    setPwSaving(false);
  };

  const toggleDay = (day) => {
    setUnavailableDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const initials = (profile?.name || 'D').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0A0604]">
      {/* Header */}
      <div className="bg-[#1A1310] border-b border-white/5 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate('/delivery')} className="p-2 rounded-xl bg-[#16100D] border border-white/5 text-[#8E827B] hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </button>
          <p className="text-white font-bold text-sm">My Profile</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="text-[#F07D14] animate-spin" />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-[#F07D14] to-[#E86C1B] flex items-center justify-center">
                {form.profilePhoto ? (
                  <img src={form.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-2xl font-bold">{initials}</span>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                    <Loader2 size={20} className="text-white animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-[#F07D14] border-2 border-[#0A0604] flex items-center justify-center hover:bg-[#E86C1B] transition-colors"
              >
                <Camera size={13} className="text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="text-center">
              <p className="text-white font-bold">{profile?.name}</p>
              <p className="text-[#8E827B] text-xs">{profile?.vehicleType || 'Delivery Boy'}</p>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex bg-[#1A1310] rounded-xl p-1 border border-white/5">
            {[
              { id: 'profile', label: '👤 Profile' },
              { id: 'availability', label: '📅 Schedule' },
              { id: 'password', label: '🔒 Password' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeSection === tab.id ? 'bg-[#F07D14] text-white' : 'text-[#8E827B] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── PROFILE SECTION ── */}
          {activeSection === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="flex items-center gap-1.5 text-[#8E827B] text-xs font-semibold mb-2">
                    <User size={12} /> Full Name
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#16100D] border border-white/10 text-white text-sm focus:outline-none focus:border-[#F07D14]"
                  />
                </div>
                {/* Phone */}
                <div>
                  <label className="flex items-center gap-1.5 text-[#8E827B] text-xs font-semibold mb-2">
                    <Phone size={12} /> Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#16100D] border border-white/10 text-white text-sm focus:outline-none focus:border-[#F07D14]"
                  />
                </div>
                {/* Vehicle */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-[#8E827B] text-xs font-semibold mb-2">
                      <Truck size={12} /> Vehicle Type
                    </label>
                    <select
                      value={form.vehicleType}
                      onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#16100D] border border-white/10 text-white text-sm focus:outline-none focus:border-[#F07D14]"
                    >
                      <option value="">Select</option>
                      <option value="Bike">Bike</option>
                      <option value="Scooter">Scooter</option>
                      <option value="Bicycle">Bicycle</option>
                      <option value="Car">Car</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[#8E827B] text-xs font-semibold mb-2 block">Vehicle No.</label>
                    <input
                      value={form.vehicleNumber}
                      onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                      placeholder="MP09 AB 1234"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#16100D] border border-white/10 text-white text-sm focus:outline-none focus:border-[#F07D14]"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-[#F07D14] text-white font-bold hover:bg-[#E86C1B] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </motion.div>
          )}

          {/* ── AVAILABILITY SECTION ── */}
          {activeSection === 'availability' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 space-y-4">
                <div>
                  <p className="text-white font-bold text-sm mb-1">Kaunse din unavailable ho?</p>
                  <p className="text-[#8E827B] text-xs mb-4">In dino orders assign nahi honge</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map((day, i) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(i)}
                        className={`flex flex-col items-center py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          unavailableDays.includes(i)
                            ? 'bg-red-500/20 border-red-500/40 text-red-400'
                            : 'bg-[#16100D] border-white/5 text-[#8E827B] hover:border-white/15 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] opacity-70 mb-0.5">{DAYS_HI[i]}</span>
                        {day}
                        {unavailableDays.includes(i) && <X size={10} className="mt-1 text-red-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {unavailableDays.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                    <p className="text-red-400 text-xs font-semibold">
                      Unavailable: {unavailableDays.sort().map(d => DAYS[d]).join(', ')}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[#8E827B] text-xs font-semibold mb-2 block">
                    Additional Note (optional)
                  </label>
                  <textarea
                    value={availabilityNote}
                    onChange={e => setAvailabilityNote(e.target.value)}
                    placeholder="e.g. Sunday ko nahi aata, Sham 6 baje ke baad available"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#16100D] border border-white/10 text-white text-sm focus:outline-none focus:border-[#F07D14] resize-none"
                  />
                </div>
              </div>

              <button
                onClick={saveAvailability}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-[#F07D14] text-white font-bold hover:bg-[#E86C1B] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </motion.div>
          )}

          {/* ── PASSWORD SECTION ── */}
          {activeSection === 'password' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 space-y-4">
                {[
                  { key: 'current', label: 'Current Password', field: 'currentPassword' },
                  { key: 'new', label: 'Nayi Password', field: 'newPassword' },
                  { key: 'confirm', label: 'Confirm Password', field: 'confirmPassword' },
                ].map(({ key, label, field }) => (
                  <div key={key}>
                    <label className="flex items-center gap-1.5 text-[#8E827B] text-xs font-semibold mb-2">
                      <Lock size={12} /> {label}
                    </label>
                    <div className="relative">
                      <input
                        type={showPw[key] ? 'text' : 'password'}
                        value={pwForm[field]}
                        onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full px-3 py-2.5 pr-10 rounded-xl bg-[#16100D] border border-white/10 text-white text-sm focus:outline-none focus:border-[#F07D14]"
                      />
                      <button
                        onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E827B] hover:text-white"
                      >
                        {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                ))}

                {pwError && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                    <AlertCircle size={13} className="text-red-400 shrink-0" />
                    <p className="text-red-400 text-xs">{pwError}</p>
                  </div>
                )}
              </div>

              <button
                onClick={changePassword}
                disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword}
                className="w-full py-3 rounded-xl bg-[#F07D14] text-white font-bold hover:bg-[#E86C1B] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {pwSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                {pwSaving ? 'Changing...' : 'Change Password'}
              </button>
            </motion.div>
          )}
        </div>
      )}

      <AnimatePresence>
        {toast && <Toast key={toast.msg} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
