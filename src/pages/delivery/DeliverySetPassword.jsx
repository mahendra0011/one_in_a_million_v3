import { fetchWithTimeout } from '../../lib/utils';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const validatePassword = pwd => pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

export default function DeliverySetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validatePassword(newPassword)) { setError('Password must be 8+ chars with uppercase, lowercase, number and special character'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await fetchWithTimeout('/api/delivery/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update password');

      // Clear the mustSetPassword flag locally so DeliveryGuard lets them through
      const user = JSON.parse(localStorage.getItem('bim_user') || '{}');
      localStorage.setItem('bim_user', JSON.stringify({ ...user, mustSetPassword: false }));
      navigate('/delivery');
    } catch (err) {
      setError(err.message || 'Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0604] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-[#1A1310] rounded-3xl border border-white/5 overflow-hidden">
        <div className="bg-gradient-to-r from-[#F07D14] to-[#E86C1B] p-8 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={28} />
          </div>
          <h1 className="font-fredoka text-2xl font-bold">Set Your Password</h1>
          <p className="text-white/80 text-sm mt-1">First time login — secure your account</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#B83A1B]/15 border border-[#B83A1B]/30 text-[#B83A1B] text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-semibold text-[#A39791] mb-1.5">New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
              <input required type={showPwd ? 'text' : 'password'} value={newPassword}
                onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters"
                className="w-full pl-9 pr-10 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm" />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E827B] hover:text-white">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
              <input required type={showPwd ? 'text' : 'password'} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[#F07D14] text-white font-bold hover:bg-[#E86C1B] transition-colors disabled:opacity-60">
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
