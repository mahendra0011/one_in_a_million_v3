import { fetchWithTimeout } from '../lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── OTP INPUT (same pattern as AccountPage) ──────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);
  const digits = (value || '').padEnd(6, '').split('');

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = digits.slice(); next[i] = '';
      onChange(next.join('').trim());
      if (i > 0 && !digits[i]) inputs.current[i - 1]?.focus();
      return;
    }
    if (e.key === 'ArrowLeft' && i > 0) { inputs.current[i - 1]?.focus(); return; }
    if (e.key === 'ArrowRight' && i < 5) { inputs.current[i + 1]?.focus(); return; }
  };

  const handleChange = (i, val) => {
    const ch = val.replace(/\D/g, '').slice(-1);
    const next = digits.slice(); next[i] = ch;
    onChange(next.join('').trim());
    if (ch && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0,1,2,3,4,5].map(i => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-11 h-13 text-center text-xl font-bold rounded-xl bg-[#16100D] border border-white/10
                     text-white focus:outline-none focus:border-[#F07D14] focus:ring-1 focus:ring-[#F07D14]
                     disabled:opacity-50 transition-colors"
          style={{ height: '52px' }}
        />
      ))}
    </div>
  );
}

// ─── COUNTDOWN TIMER ─────────────────────────────────────────────────────────
function Countdown({ seconds, onEnd }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    queueMicrotask(() => setLeft(seconds));
    if (seconds <= 0) return;
    const t = setInterval(() => setLeft(p => (p <= 1 ? (clearInterval(t), 0) : p - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  useEffect(() => { if (left === 0 && seconds > 0) onEnd?.(); }, [left, seconds, onEnd]);
  if (left <= 0) return null;
  return <span className="text-[#8E827B] text-xs">Resend in {left}s</span>;
}

// ─── STEP DOTS ────────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all ${
          i < current ? 'w-2 h-2 bg-green-400' :
          i === current ? 'w-6 h-2 bg-[#F07D14]' : 'w-2 h-2 bg-white/20'
        }`} />
      ))}
    </div>
  );
}

const INPUT = "w-full pl-9 pr-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm";
const BTN_PRIMARY = "w-full py-3 rounded-xl bg-[#F07D14] text-white font-bold hover:bg-[#E86C1B] transition-colors disabled:opacity-60";
const ERR = "p-3 rounded-xl bg-[#B83A1B]/15 border border-[#B83A1B]/30 text-[#B83A1B] text-sm";
const OK  = "p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm";

const validatePassword = pwd => pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // step 0 = enter email, 1 = enter OTP, 2 = set new password, 3 = done
  const [step, setStep]           = useState(0);
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [cooldown, setCooldown]   = useState(0);

  const api = async (url, body) => {
    const res  = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  };

  // Step 0 → send OTP
  const sendOtp = async () => {
    if (!email.trim()) { setError('Enter your email'); return; }
    setError(''); setLoading(true);
    try {
      await api('/api/auth/forgot-password', { email });
      setStep(1); setCooldown(60);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const resendOtp = async () => {
    setError(''); setLoading(true);
    try { await api('/api/auth/forgot-password', { email }); setCooldown(60); }
    catch (e) { setError(e.message); }
    setLoading(false);
  };

  // Step 1 → verify OTP
  const verifyOtp = async () => {
    if (otp.length < 6) { setError('Enter all 6 digits'); return; }
    setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/verify-reset-otp', { email, otp });
      setResetToken(data.resetToken);
      setStep(2);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // Step 2 → set new password
  const resetPassword = async () => {
    if (!validatePassword(newPassword)) { setError('Password must be 8+ chars with uppercase, lowercase, number and special character'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError(''); setLoading(true);
    try {
      await api('/api/auth/reset-password', { resetToken, newPassword });
      setStep(3);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-[#0A0604] flex items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#1A1310] rounded-3xl border border-white/5 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#F07D14] to-[#E86C1B] p-7 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 text-3xl">🔒</div>
          <h1 className="font-fredoka text-3xl font-bold">Forgot Password</h1>
          <p className="text-white/80 text-sm mt-1">We'll help you get back in</p>
        </div>

        <div className="p-7 space-y-5">
          {step < 3 && <StepDots current={step} total={totalSteps} />}

          <AnimatePresence mode="wait">
            {/* ── STEP 0: Enter Email ── */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div>
                  <h2 className="text-white font-bold text-lg">Reset your password</h2>
                  <p className="text-[#8E827B] text-sm mt-1">Enter the email linked to your account, we'll send an OTP</p>
                </div>
                {error && <div className={ERR}>{error}</div>}
                <div>
                  <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendOtp()}
                      placeholder="you@email.com" className={INPUT} />
                  </div>
                </div>
                <button onClick={sendOtp} disabled={loading || !email.trim()} className={BTN_PRIMARY}>
                  {loading ? 'Sending OTP...' : 'Send OTP →'}
                </button>
                <button onClick={() => navigate('/account')} className="w-full text-center text-sm text-[#8E827B] hover:text-white">
                  ← Back to Sign In
                </button>
              </motion.div>
            )}

            {/* ── STEP 1: Verify OTP ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
                <button onClick={() => { setStep(0); setOtp(''); setError(''); }} className="flex items-center gap-1 text-[#8E827B] hover:text-white text-sm">
                  <ArrowLeft size={15} /> Back
                </button>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F07D14]/15 flex items-center justify-center mx-auto mb-3">
                    <Mail size={24} className="text-[#F07D14]" />
                  </div>
                  <h2 className="text-white font-bold text-lg">Enter OTP</h2>
                  <p className="text-[#8E827B] text-sm mt-1">Sent to <span className="text-white font-medium">{email}</span></p>
                </div>
                {error && <div className={ERR}>{error}</div>}
                <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                <button onClick={verifyOtp} disabled={loading || otp.length < 6} className={BTN_PRIMARY}>
                  {loading ? 'Verifying...' : 'Verify OTP →'}
                </button>
                <div className="text-center">
                  {cooldown > 0
                    ? <Countdown seconds={cooldown} onEnd={() => setCooldown(0)} />
                    : <button onClick={resendOtp} disabled={loading} className="text-[#F07D14] text-sm hover:underline flex items-center gap-1 mx-auto">
                        <RefreshCw size={13} /> Resend OTP
                      </button>
                  }
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Set New Password ── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div>
                  <h2 className="text-white font-bold text-lg">Set new password</h2>
                  <p className="text-[#8E827B] text-sm mt-1">Choose a new password for your account</p>
                </div>
                {error && <div className={ERR}>{error}</div>}
                <div>
                  <label className="block text-sm font-semibold text-[#A39791] mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
                    <input type={showPwd ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
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
                    <input type={showPwd ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && resetPassword()}
                      placeholder="Re-enter new password"
                      className="w-full pl-9 pr-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm" />
                  </div>
                </div>
                <button onClick={resetPassword} disabled={loading} className={BTN_PRIMARY}>
                  {loading ? 'Updating...' : 'Reset Password'}
                </button>
              </motion.div>
            )}

            {/* ── STEP 3: Done ── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 py-4">
                <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-green-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Password updated! 🎉</h2>
                  <p className="text-[#8E827B] text-sm mt-1">You can now sign in with your new password</p>
                </div>
                <button onClick={() => navigate('/account')} className={BTN_PRIMARY}>
                  Go to Sign In
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
