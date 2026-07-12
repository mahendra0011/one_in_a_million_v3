import SEOHead from '../components/SEOHead';
import { fetchWithTimeout } from '../lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { loginSuccess, logout, updateUser } from '../store/slices/authSlice';
import {
  User, Clock, MapPin, LogOut, Eye, EyeOff,
  Mail, Lock, Phone, Package, ArrowLeft, CheckCircle2, RefreshCw,
  Navigation, ExternalLink, Truck, Radio, Star, Camera, X, Upload,
  CheckCircle, MessageCircle, Loader2, Home, Heart, Zap, Gift, RotateCcw,
  ShoppingBag, ChevronRight, Trophy, Bell, Share2, Copy,
  Edit2, Trash2, Plus, Shield, AtSign, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

// ─── OTP INPUT ────────────────────────────────────────────────────────────────
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
    setLeft(seconds);
    if (seconds <= 0) return;
    const t = setInterval(() => setLeft(p => (p <= 1 ? (clearInterval(t), 0) : p - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  useEffect(() => { if (left === 0 && seconds > 0) onEnd?.(); }, [left, seconds, onEnd]);
  if (left <= 0) return null;
  return <span className="text-[#8E827B] text-xs">Resend in {left}s</span>;
}

// ─── STEP INDICATOR ──────────────────────────────────────────────────────────
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

// ─── EMAIL-ONLY REGISTER (One-time Email OTP via Brevo) ─────────────────────────
function RegisterEmailFlow() {
  const dispatch = useDispatch();
  const [step, setStep]         = useState(0);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone]       = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [otp, setOtp]           = useState('');
  const [regToken, setRegToken] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [cooldown, setCooldown] = useState(0);

  const api = async (url, body) => {
    const res  = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  };

  // Step 0 → details form + send OTP
  const sendOtp = async () => {
    if (!name || !email || !password || !phone) { setError('All fields required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/register-email/send-otp', { name, email });
      setRegToken(data.regToken);
      setStep(1); setCooldown(60);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // Step 1 → verify OTP + create account
  const verifyOtp = async () => {
    if (otp.length < 6) { setError('Enter all 6 digits'); return; }
    setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/register-email/verify', { email, otp, regToken, password, phone });
      dispatch(loginSuccess({ user: data.user }));
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const resendOtp = async () => {
    setError(''); setLoading(true);
    try { const data = await api('/api/auth/register-email/send-otp', { name, email }); setRegToken(data.regToken); setCooldown(60); }
    catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="p-7 space-y-5">
      <StepDots current={step} total={2} />
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="re0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
            <div>
              <h2 className="text-white font-bold text-lg">Create Account</h2>
              <p className="text-[#8E827B] text-sm mt-1">Enter your details - email verify hoga ek baar</p>
            </div>
            {error && <div className={ERR}>{error}</div>}
            <div>
              <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Rahul Sharma" className={INPUT} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Email <span className="text-[#F07D14]">*</span></label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className={INPUT} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Phone <span className="text-[#F07D14]">*</span></label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="98765 43210" className={INPUT} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-9 pr-10 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm" />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E827B] hover:text-white">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button onClick={sendOtp} disabled={loading || !name || !email || !password || !phone} className={BTN_PRIMARY}>
              {loading ? 'Sending OTP...' : 'Send OTP →'}
            </button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="re1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
            <button onClick={() => { setStep(0); setOtp(''); setError(''); }} className="flex items-center gap-1 text-[#8E827B] hover:text-white text-sm">
              <ArrowLeft size={15} /> Back
            </button>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F07D14]/15 flex items-center justify-center mx-auto mb-3">
                <Mail size={24} className="text-[#F07D14]" />
              </div>
              <h2 className="text-white font-bold text-lg">Verify Email</h2>
              <p className="text-[#8E827B] text-sm mt-1">OTP sent to <span className="text-white font-medium">{email}</span></p>
            </div>
            {error && <div className={ERR}>{error}</div>}
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            <button onClick={verifyOtp} disabled={loading || otp.length < 6} className={BTN_PRIMARY}>
              {loading ? 'Creating Account...' : 'Verify & Create Account 🎉'}
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
      </AnimatePresence>
    </div>
  );
}

// ─── LOGIN — EMAIL + PASSWORD ───────────────────────────────────────────────────
function LoginEmailPasswordFlow() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [step, setStep]   = useState(0); // 0 = credentials, 1 = enter OTP
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [otp, setOtp]       = useState('');
  const [loginToken, setLoginToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [cooldown, setCooldown] = useState(0);

  const api = async (url, body) => {
    const res  = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  };

  const sendOtp = async () => {
    if (!email.trim() || !password) { setError('Email and password required'); return; }
    setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/login/unified/send-otp', { email, password });
      if (data.skipOtp) {
        dispatch(loginSuccess({ user: data.user }));
        if (data.user.role === 'admin') {
          localStorage.setItem('bim_user', JSON.stringify(data.user));
          navigate('/admin');
        } else if (data.user.role === 'delivery_boy') {
          localStorage.setItem('bim_user', JSON.stringify(data.user));
          navigate('/delivery');
        } else {
          localStorage.setItem('bim_user', JSON.stringify(data.user));
          navigate('/');
        }
        return;
      }
      setLoginToken(data.loginToken);
      setStep(1); setCooldown(60);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { setError('Enter all 6 digits'); return; }
    setError(''); setLoading(true);
    try {
      const data = await api('/api/auth/login/unified/verify-otp', { email, otp, loginToken });
      dispatch(loginSuccess({ user: data.user }));
      localStorage.setItem('bim_user', JSON.stringify(data.user));
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else if (data.user.role === 'delivery_boy') {
        navigate('/delivery');
      } else {
        navigate('/');
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="p-7 space-y-5">
      {step === 0 ? (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div>
            <h2 className="text-white font-bold text-lg">Login with Email</h2>
            <p className="text-[#8E827B] text-sm mt-1">Enter your email and password</p>
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
          <div>
            <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendOtp()}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm" />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E827B] hover:text-white">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button onClick={sendOtp} disabled={loading || !email.trim() || !password} className={BTN_PRIMARY}>
            {loading ? 'Signing In...' : 'Sign In →'}
          </button>

          {/* ── Demo Quick Login Buttons ── */}
          <div className="space-y-2">
            <p className="text-xs text-[#8E827B] text-center font-semibold">⚡ Demo Quick Login</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setEmail('admin@demo.com'); setPassword('admin123'); }}
                className="flex-1 py-2 rounded-xl bg-[#F07D14]/10 border border-[#F07D14]/30 text-[#F07D14] text-xs font-bold hover:bg-[#F07D14]/20 transition-colors"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => { setEmail('user@demo.com'); setPassword('user123'); }}
                className="flex-1 py-2 rounded-xl bg-[#F07D14]/10 border border-[#F07D14]/30 text-[#F07D14] text-xs font-bold hover:bg-[#F07D14]/20 transition-colors"
              >
                👤 User
              </button>
              <button
                type="button"
                onClick={() => { setEmail('delivery@demo.com'); setPassword('delivery123'); }}
                className="flex-1 py-2 rounded-xl bg-[#F07D14]/10 border border-[#F07D14]/30 text-[#F07D14] text-xs font-bold hover:bg-[#F07D14]/20 transition-colors"
              >
                🛵 Delivery
              </button>
            </div>
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[#1A1310] text-[#8E827B]">or continue with</span>
            </div>
          </div>
          <button type="button" onClick={() => window.location.href = '/api/auth/google'} disabled={loading}
            className="w-full py-3 rounded-xl bg-white text-[#1A1310] font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
            Sign in with Google
          </button>

          <div className="flex items-center justify-end text-xs mt-2">
            <a href="/forgot-password" className="text-[#8E827B] hover:text-white">Forgot Password?</a>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          <button onClick={() => { setStep(0); setOtp(''); setError(''); }} className="flex items-center gap-1 text-[#8E827B] hover:text-white text-sm">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="text-center">
            <h3 className="text-white font-bold text-lg">Enter OTP</h3>
            <p className="text-[#8E827B] text-sm mt-1">Sent to <span className="text-white font-medium">{email}</span></p>
          </div>
          <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          <button onClick={verifyOtp} disabled={loading || otp.length < 6} className={BTN_PRIMARY}>
            {loading ? 'Verifying...' : 'Verify & Login'}
          </button>
          <div className="text-center">
            {cooldown > 0 ? (
              <Countdown seconds={cooldown} onEnd={() => setCooldown(0)} />
            ) : (
              <button onClick={sendOtp} disabled={loading} className="text-[#F07D14] text-sm hover:underline flex items-center gap-1 mx-auto">
                <RefreshCw size={13} /> Resend OTP
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ initialTab }) {
  const [tab, setTab] = useState(initialTab || 'login');

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  return (
    <div className="min-h-screen bg-[#0A0604] flex items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#1A1310] rounded-3xl border border-white/5 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#F07D14] to-[#E86C1B] p-7 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 text-3xl">🍔</div>
          <h1 className="font-fredoka text-3xl font-bold">One in a Million</h1>
          <p className="text-white/80 text-sm mt-1">Your account, your cravings</p>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-white/5">
          {[['login','Sign In'],['register','Create Account']].map(([m, label]) => (
            <button key={m} onClick={() => { setTab(m); }}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === m ? 'text-[#F07D14] border-b-2 border-[#F07D14]' : 'text-[#8E827B] hover:text-[#A39791]'}`}>
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── LOGIN ── */}
          {tab === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <LoginEmailPasswordFlow />
            </motion.div>
          )}

          {/* ── REGISTER ── */}
          {tab === 'register' && (
            <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RegisterEmailFlow />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── TRACK DELIVERY SECTION ───────────────────────────────────────────────────
// Pure display — AccountPage subscribes to live socket updates and keeps `order` fresh.
function TrackDelivery({ order }) {
  const loc = order.deliveryBoyLocation;
  const hasLoc = loc?.lat && loc?.lng;
  const status = order.status;

  if (status === 'delivered') return null;

  const updatedAt = hasLoc && loc.updatedAt
    ? new Date(loc.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="bg-[#1A1310] rounded-2xl border border-[#F07D14]/30 p-4 mb-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#F07D14]/20 flex items-center justify-center">
            <Truck size={14} className="text-[#F07D14]" />
          </div>
          <p className="text-white font-bold text-sm">Track Delivery</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1.5 capitalize">
          <Radio size={10} className="animate-pulse" />
          {status?.replace(/_/g, ' ') || 'Out for Delivery'}
        </span>
      </div>

      {/* Order ID */}
      <p className="text-[#8E827B] text-xs">Order {order.orderId || order._id?.slice(-8)}</p>

      {/* Location info */}
      {hasLoc ? (
        <div className="bg-[#16100D] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation size={14} className="text-[#F07D14]" />
              <p className="text-white text-sm font-semibold">Delivery Boy Location</p>
            </div>
            {updatedAt && (
              <div className="flex items-center gap-1 text-[#8E827B] text-xs">
                <Clock size={11} />
                <span>Updated {updatedAt}</span>
              </div>
            )}
          </div>
          <p className="text-[#A39791] text-xs">
            Lat: {loc.lat.toFixed(5)}, Lng: {loc.lng.toFixed(5)}
          </p>
          <div className="flex items-center gap-2 text-[#8E827B] text-xs">
            <MapPin size={12} />
            {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
          </div>
        </div>
      ) : (
        <div className="bg-[#16100D] rounded-xl p-3 flex items-center gap-2">
          <Navigation size={14} className="text-[#8E827B]" />
          <p className="text-[#8E827B] text-sm">Waiting for delivery boy's location...</p>
        </div>
      )}
    </div>
  );
}

// ─── ORDER CARD ───────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  pending:          'bg-yellow-500/20 text-yellow-400',
  confirmed:        'bg-blue-500/20 text-blue-400',
  preparing:        'bg-orange-500/20 text-orange-400',
  out_for_delivery: 'bg-purple-500/20 text-purple-400',
  delivered:        'bg-green-500/20 text-green-400',
  cancelled:        'bg-red-500/20 text-red-400',
};

// ─── REVIEW MODAL ────────────────────────────────────────────────────────────
function ReviewModal({ order, onClose, onSuccess }) {
  const [rating, setRating]       = useState(0);
  const [hover, setHover]         = useState(0);
  const [comment, setComment]     = useState('');
  const [photos, setPhotos]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const fileRef = useRef(null);

  const uploadPhoto = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res  = await fetchWithTimeout('/api/upload', { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json();
      if (data.ok) setPhotos(p => [...p, data.url]);
      else setError(data.error || 'Upload failed');
    } catch { setError('Upload failed'); }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!rating) { setError('Please select a rating'); return; }
    setSubmitting(true); setError('');
    try {
      const res  = await fetchWithTimeout('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId: order.orderId || order._id, rating, comment, photos }),
      });
      const data = await res.json();
      if (data.ok) { onSuccess(data.review); onClose(); }
      else setError(data.error || 'Failed to submit');
    } catch { setError('Network error'); }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#1A1310] sm:rounded-3xl rounded-t-3xl border border-white/10 p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-bold text-lg">Rate Your Order</h2>
            <p className="text-[#8E827B] text-xs mt-0.5">Order #{(order.orderId || order._id)?.slice(-8)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#8E827B] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Star Rating */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-[#A39791] mb-3">How would you rate this order?</p>
          <div className="flex gap-3 justify-center">
            {[1,2,3,4,5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  size={36}
                  className={`transition-colors ${s <= (hover || rating) ? 'text-[#F07D14] fill-[#F07D14]' : 'text-[#3A2A20]'}`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-[#F07D14] font-bold mt-2">
              {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-[#A39791] mb-2">Your Review (optional)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Tell us about your experience..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white placeholder:text-[#8E827B] focus:outline-none focus:border-[#F07D14] text-sm resize-none"
          />
        </div>

        {/* Photos */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#A39791] mb-2">Add Photos (optional)</label>
          <div className="flex gap-2 flex-wrap">
            {photos.map((url, i) => (
              <div key={i} className="relative w-16 h-16">
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-white/10"
          loading="lazy"
          decoding="async"
        />
                <button
                  onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-[#8E827B] hover:border-[#F07D14]/50 hover:text-[#F07D14] transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                <span className="text-[10px]">{uploading ? 'Uploading' : 'Add'}</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { if (e.target.files[0]) uploadPhoto(e.target.files[0]); e.target.value = ''; }}
            />
          </div>
          <p className="text-xs text-[#8E827B] mt-1.5">Up to 5 photos</p>
        </div>

        {error && <p className="mb-4 text-sm text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-[#A39791] font-semibold hover:bg-white/5 transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !rating}
            className="flex-2 flex-grow-[2] py-3 rounded-xl bg-[#F07D14] text-white font-bold hover:bg-[#E86C1B] transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ORDER CARD ───────────────────────────────────────────────────────────────
function OrderCard({ order, myReviews, onReviewSubmit }) {
  const [showModal, setShowModal] = useState(false);
  const [deliveryRating, setDeliveryRating] = useState(order.deliveryRating || 0);
  const [deliveryHover, setDeliveryHover] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const isDelivered = order.status === 'delivered';
  const alreadyReviewed = myReviews.some(r => r.orderId === (order.orderId || order._id));
  const hasDeliveryBoy = !!order.deliveryBoyId || !!order.assignedTo;

  const submitDeliveryRating = async (stars) => {
    setDeliveryRating(stars);
    setRatingSubmitting(true);
    try {
      await fetchWithTimeout('/api/delivery/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId: order.orderId || order._id, rating: stars }),
      });
    } catch {}
    setRatingSubmitting(false);
  };

  return (
    <>
      {showModal && (
        <ReviewModal
          order={order}
          onClose={() => setShowModal(false)}
          onSuccess={onReviewSubmit}
        />
      )}
      <div className="bg-[#16100D] rounded-2xl border border-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#8E827B]">{order.orderId || order._id?.slice(-8)}</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLOR[order.status] || 'bg-gray-500/20 text-gray-400'}`}>
            {order.status?.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="space-y-1 mb-3">
          {(order.items || []).slice(0, 2).map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-[#A39791]">{item.name} x{item.qty}</span>
              <span className="text-white font-medium">₹{(item.unitPrice * item.qty).toFixed(0)}</span>
            </div>
          ))}
          {(order.items || []).length > 2 && (
            <p className="text-xs text-[#8E827B]">+{order.items.length - 2} more items</p>
          )}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-xs text-[#8E827B]">
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[#F07D14] font-bold">₹{order.totals?.total?.toFixed(0) || '—'}</span>
        </div>
        <Link to={`/order/${order.orderId || order._id}`} className="mt-2 text-xs text-[#F07D14] font-semibold flex items-center gap-1 hover:underline">
          View Details <ChevronRight size={12} />
        </Link>

        {/* Review CTA for delivered orders */}
        {isDelivered && (
          <div className="mt-3 pt-3 border-t border-white/5">
            {alreadyReviewed ? (
              <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
                <CheckCircle size={14} />
                <span>Review submitted — Thank you!</span>
              </div>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#F07D14]/10 border border-[#F07D14]/30 text-[#F07D14] text-xs font-bold hover:bg-[#F07D14]/20 transition-colors"
              >
                <Star size={13} className="fill-[#F07D14]" />
                Rate This Order
              </button>
            )}
          </div>
        )}

        {/* Delivery Boy Rating */}
        {isDelivered && hasDeliveryBoy && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[#8E827B] text-[11px] font-semibold mb-2 flex items-center gap-1.5">
              🛵 Delivery boy ko rate karo
              {ratingSubmitting && <Loader2 size={10} className="animate-spin" />}
            </p>
            {deliveryRating > 0 ? (
              <div className="flex items-center gap-1.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={18} className={s <= deliveryRating ? 'text-yellow-400 fill-yellow-400' : 'text-[#3A2A20]'} />
                ))}
                <span className="text-yellow-400 text-xs font-bold ml-1">
                  {['','Poor','Fair','Good','Great','Excellent!'][deliveryRating]}
                </span>
              </div>
            ) : (
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <button
                    key={s}
                    onMouseEnter={() => setDeliveryHover(s)}
                    onMouseLeave={() => setDeliveryHover(0)}
                    onClick={() => submitDeliveryRating(s)}
                    disabled={ratingSubmitting}
                    className="transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                  >
                    <Star size={22} className={`transition-colors ${s <= (deliveryHover || deliveryRating) ? 'text-yellow-400 fill-yellow-400' : 'text-[#3A2A20]'}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── MAIN ACCOUNT PAGE ────────────────────────────────────────────────────────
export default function AccountPage({ initialTab }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useSelector(s => s.auth);
  const [tab, setTab]               = useState(initialTab || 'home');
  const [orders, setOrders]         = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [myReviews, setMyReviews]   = useState([]);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const { trackOrder } = useSocket({
    joinUser: user?._id || user?.id,
    // Real-time: order status updated by admin → update orders list immediately
    onOrderUpdated: (order) => {
      setOrders(prev => prev.map(o =>
        (o.orderId === order.orderId || o._id === order._id) ? { ...o, ...order } : o
      ));
    },
    // Real-time: push notification from server (new order confirmed, dispatched, etc.)
    onNotification: (notif) => {
      // Refresh orders on delivery-related notifications so status badges stay fresh
      if (notif?.type && ['order_confirmed', 'order_dispatched', 'order_delivered', 'order_cancelled'].includes(notif.type)) {
        fetchOrders();
      }
    },
  });

  // ── Profile Photo ──
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  // ── Change Password (OTP-based) ──
  const [pwStep, setPwStep]         = useState(0); // 0=idle,1=otp sent,2=done
  const [pwOtp, setPwOtp]           = useState('');
  const [pwNew, setPwNew]           = useState('');
  const [pwConfirm, setPwConfirm]   = useState('');
  const [pwLoading, setPwLoading]   = useState(false);
  const [pwMsg, setPwMsg]           = useState('');
  const [pwCooldown, setPwCooldown] = useState(0);
  const [showPw, setShowPw]         = useState(false);

  // ── Change Email ──
  const [emailStep, setEmailStep]   = useState(0);
  const [newEmail, setNewEmail]     = useState('');
  const [emailOtp2, setEmailOtp2]   = useState('');
  const [emailLd, setEmailLd]       = useState(false);
  const [emailMsg2, setEmailMsg2]   = useState('');
  const [emailCd, setEmailCd]       = useState(0);

  // ── Addresses ──
  const [addrModal, setAddrModal]   = useState(null); // null | 'add' | index
  const [addrForm, setAddrForm]     = useState({ label: '', address: '' });
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrMsg, setAddrMsg]       = useState('');

  // ── Favorites (localStorage) ──
  const [favorites, setFavorites]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('bim_favorites') || '[]'); } catch { return []; }
  });
  const toggleFavorite = (item) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === item.id);
      const next = exists ? prev.filter(f => f.id !== item.id) : [...prev, item];
      localStorage.setItem('bim_favorites', JSON.stringify(next));
      return next;
    });
  };

  // ── Notifications prefs (localStorage) ──
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bim_notif_prefs') || 'null') || {
      orderSms: true, orderEmail: true, promoSms: false, promoEmail: false, inApp: true
    }; } catch { return { orderSms: true, orderEmail: true, promoSms: false, promoEmail: false, inApp: true }; }
  });
  const toggleNotif = (key) => {
    setNotifPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('bim_notif_prefs', JSON.stringify(next));
      return next;
    });
  };

  // ── Loyalty points mock history ──
  const pointsHistory = [
    { id: 1, desc: 'Order #BIM1234', pts: +50, date: '24 Jun 2026' },
    { id: 2, desc: 'Order #BIM1189', pts: +30, date: '20 Jun 2026' },
    { id: 3, desc: 'Referral bonus', pts: +100, date: '15 Jun 2026' },
    { id: 4, desc: 'Redeemed', pts: -80, date: '10 Jun 2026' },
  ];

  const referralCode = user ? `BIM-${(user._id || user.id || 'USER').toString().slice(-6).toUpperCase()}` : 'BIM-XXXXXX';
  const [refCopied, setRefCopied] = useState(false);
  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode).then(() => { setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); });
  };

  // Define fetch functions BEFORE useEffect calls that reference them
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res  = await fetchWithTimeout('/api/orders/my', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setOrders(data.orders);
    } catch {}
    setOrdersLoading(false);
  };

  const fetchMyReviews = async () => {
    try {
      const res  = await fetchWithTimeout('/api/reviews/my', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setMyReviews(data.reviews);
    } catch {}
  };

  useEffect(() => { if (user) setProfileForm({ name: user.name || '', phone: user.phone || '' }); }, [user]);
  useEffect(() => {
    if (isLoggedIn && (tab === 'orders' || tab === 'home')) {
      fetchOrders();
      fetchMyReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, tab]);

  // Auto-refresh orders every 30s so status updates appear without manual reload
  useAutoRefresh({ fetchFn: fetchOrders, interval: 30_000, enabled: isLoggedIn && (tab === 'orders' || tab === 'home') });

  // Step 16 — live status + location for every active order, kept in sync with the list
  // so badges in OrderCard and the TrackDelivery card both update without a refetch.
  useEffect(() => {
    const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    const unsubscribers = activeOrders.map(o => {
      const orderId = o.orderId || o._id;
      return trackOrder(
        orderId,
        (payload) => setOrders(prev => prev.map(ord =>
          (ord.orderId === payload.orderId || ord._id === payload.orderId) ? { ...ord, status: payload.status } : ord
        )),
        (payload) => setOrders(prev => prev.map(ord =>
          (ord.orderId === orderId || ord._id === orderId)
            ? { ...ord, deliveryBoyLocation: { lat: payload.lat, lng: payload.lng, updatedAt: payload.updatedAt } }
            : ord
        ))
      );
    });
    return () => unsubscribers.forEach(unsub => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.map(o => o.orderId || o._id).join(','), orders.map(o => o.status).join(',')]);

  const handleReviewSubmit = (newReview) => {
    setMyReviews(prev => [newReview, ...prev]);
  };

  // ── Profile photo upload ──
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData(); fd.append('photo', file);
      const res  = await fetchWithTimeout('/api/auth/profile/photo', { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json();
      if (data.ok) dispatch(updateUser({ photoUrl: data.photoUrl }));
    } catch {}
    setPhotoUploading(false);
  };

  // ── Change password ──
  const sendPwOtp = async () => {
    setPwLoading(true); setPwMsg('');
    try {
      const res  = await fetchWithTimeout('/api/auth/change-password/send-otp', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.ok) { setPwStep(1); setPwCooldown(60); }
      else setPwMsg(data.error || 'Failed');
    } catch { setPwMsg('Network error'); }
    setPwLoading(false);
  };
  const submitPwChange = async () => {
    if (pwNew !== pwConfirm) { setPwMsg("Passwords don't match"); return; }
    if (pwNew.length < 6)    { setPwMsg('Min 6 characters'); return; }
    setPwLoading(true); setPwMsg('');
    try {
      const res  = await fetchWithTimeout('/api/auth/change-password/verify', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: pwOtp, newPassword: pwNew }),
      });
      const data = await res.json();
      if (data.ok) { setPwStep(0); setPwMsg(''); setPwOtp(''); setPwNew(''); setPwConfirm(''); }
      else setPwMsg(data.error || 'Failed');
    } catch { setPwMsg('Network error'); }
    setPwLoading(false);
  };

  // ── Change email ──
  const sendEmailOtp2 = async () => {
    setEmailLd(true); setEmailMsg2('');
    try {
      const res  = await fetchWithTimeout('/api/auth/change-email/send-otp', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (data.ok) { setEmailStep(1); setEmailCd(60); }
      else setEmailMsg2(data.error || 'Failed');
    } catch { setEmailMsg2('Network error'); }
    setEmailLd(false);
  };
  const verifyEmailChange = async () => {
    setEmailLd(true); setEmailMsg2('');
    try {
      const res  = await fetchWithTimeout('/api/auth/change-email/verify', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, otp: emailOtp2 }),
      });
      const data = await res.json();
      if (data.ok) { dispatch(updateUser({ email: newEmail, isEmailVerified: true })); setEmailStep(0); setNewEmail(''); setEmailOtp2(''); setEmailMsg2('✅ Email updated!'); }
      else setEmailMsg2(data.error || 'Failed');
    } catch { setEmailMsg2('Network error'); }
    setEmailLd(false);
  };

  // ── Addresses ──
  const openAddAddr = () => { setAddrForm({ label: '', address: '' }); setAddrModal('add'); setAddrMsg(''); };
  const openEditAddr = (i) => { setAddrForm({ ...user.savedAddresses[i] }); setAddrModal(i); setAddrMsg(''); };
  const saveAddress = async () => {
    if (!addrForm.label || !addrForm.address) { setAddrMsg('Fill all fields'); return; }
    setAddrSaving(true); setAddrMsg('');
    try {
      const addresses = [...(user?.savedAddresses || [])];
      if (addrModal === 'add') addresses.push(addrForm);
      else addresses[addrModal] = addrForm;
      const res  = await fetchWithTimeout('/api/auth/addresses', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses }),
      });
      const data = await res.json();
      if (data.ok) { dispatch(updateUser({ savedAddresses: data.addresses || addresses })); setAddrModal(null); }
      else setAddrMsg(data.error || 'Failed');
    } catch { setAddrMsg('Network error'); }
    setAddrSaving(false);
  };
  const deleteAddress = async (i) => {
    const addresses = (user?.savedAddresses || []).filter((_, idx) => idx !== i);
    try {
      const res  = await fetchWithTimeout('/api/auth/addresses', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses }),
      });
      const data = await res.json();
      if (data.ok) dispatch(updateUser({ savedAddresses: data.addresses || addresses }));
    } catch {}
  };
  const setDefaultAddress = async (i) => {
    const addresses = [...(user?.savedAddresses || [])];
    const [picked] = addresses.splice(i, 1);
    addresses.unshift(picked);
    try {
      const res  = await fetchWithTimeout('/api/auth/addresses', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses }),
      });
      const data = await res.json();
      if (data.ok) dispatch(updateUser({ savedAddresses: data.addresses || addresses }));
    } catch {}
  };

  const saveProfile = async () => {
    setProfileSaving(true); setProfileMsg('');
    try {
      const res  = await fetchWithTimeout('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.ok) { dispatch(updateUser(data.user)); setProfileMsg('Saved!'); }
      else setProfileMsg(data.error || 'Failed');
    } catch { setProfileMsg('Network error'); }
    setProfileSaving(false);
  };

  if (!isLoggedIn) return <AuthScreen initialTab={tab} />;

  const role = user?.role || 'user';
  const tabs = role === 'admin'
    ? [
        { id: 'home',          label: 'Dashboard', icon: Home },
        { id: 'orders',        label: 'Orders',    icon: Package },
        { id: 'profile',       label: 'Profile',   icon: User },
        { id: 'wallet',        label: 'Wallet',    icon: Trophy },
        { id: 'notifications', label: 'Alerts',    icon: Bell },
      ]
    : role === 'delivery_boy'
    ? [
        { id: 'home',          label: 'Dashboard', icon: Home },
        { id: 'orders',        label: 'Deliveries', icon: Package },
        { id: 'profile',       label: 'Profile',   icon: User },
        { id: 'wallet',        label: 'Earnings',  icon: Trophy },
        { id: 'notifications', label: 'Alerts',    icon: Bell },
      ]
    : [
        { id: 'home',          label: 'Home',      icon: Home },
        { id: 'orders',        label: 'Orders',    icon: Package },
        { id: 'profile',       label: 'Profile',   icon: User },
        { id: 'addresses',     label: 'Addresses', icon: MapPin },
        { id: 'wallet',        label: 'Wallet',    icon: Trophy },
        { id: 'favorites',     label: 'Favorites', icon: Heart },
        { id: 'notifications', label: 'Alerts',    icon: Bell },
      ];

  return (
    <div className="min-h-screen bg-[#0A0604]" style={{ paddingTop: 'max(5rem, calc(5rem + env(safe-area-inset-top)))', paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
      <SEOHead title="My Account" description="Manage your orders, addresses, and profile at One in a Million." url="/account" noindex={true} />
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
              {user?.photoUrl
                ? <img src={user.photoUrl} alt="avatar" className="w-14 h-14 rounded-2xl object-cover" />
                : <div className="w-14 h-14 rounded-2xl bg-[#F07D14]/20 flex items-center justify-center text-2xl font-bold text-[#F07D14]">{user?.name?.[0]?.toUpperCase() || '👤'}</div>
              }
              <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {photoUploading ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={16} className="text-white" />}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">{user?.name}</h1>
              <p className="text-[#8E827B] text-sm">{user?.phone || user?.email}</p>
              <div className="flex gap-2 mt-1">
                {user?.isPhoneVerified && <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={10}/> Phone</span>}
                {user?.isEmailVerified && <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={10}/> Email</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#F07D14]/10 rounded-xl px-3 py-2 text-center">
              <p className="text-[#F07D14] font-bold text-lg">{user?.loyaltyPoints || 0}</p>
              <p className="text-[#8E827B] text-xs">Points</p>
            </div>
<button onClick={async () => {
                try { await fetchWithTimeout('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
                dispatch(logout());
                navigate('/login', { replace: true });
              }}
              className="p-2.5 rounded-xl bg-[#1A1310] border border-white/5 text-[#8E827B] hover:text-red-400 transition-colors">
                <LogOut size={18} />
              </button>
          </div>
        </div>

        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-[#0A0604]">
        <div className="flex gap-1 bg-[#1A1310] rounded-2xl p-1 mb-0 border border-white/5 overflow-x-auto no-scrollbar">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === id ? 'bg-[#F07D14] text-white' : 'text-[#8E827B] hover:text-white'}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        </div>

        <div className="mt-4">
        <AnimatePresence mode="wait">
          {tab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Personalized Greeting */}
              <div className="bg-gradient-to-br from-[#F07D14]/20 to-[#1A1310] rounded-2xl border border-[#F07D14]/20 p-5">
                <p className="text-[#F07D14] text-sm font-semibold mb-1">👋 Welcome back,</p>
                <h2 className="text-white font-bold text-2xl">{user?.name?.split(' ')[0] || 'Friend'}!</h2>
                <p className="text-[#8E827B] text-sm mt-1">What are you craving today?</p>
              </div>

              {/* Active Order Banner */}
              {(() => {
                const active = orders.find(o => !['delivered', 'cancelled'].includes(o.status));
                if (!active) return null;
                const statusLabel = {
                  pending: '⏳ Order Received',
                  confirmed: '✅ Confirmed',
                  preparing: '👨‍🍳 Being Prepared',
                  ready: '📦 Ready for Pickup',
                  out_for_delivery: '🛵 On the Way!',
                }[active.status] || active.status;
                return (
                  <div className="bg-[#1A1310] rounded-2xl border border-orange-500/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-bold text-sm">Active Order</p>
                      <span className="text-xs bg-[#F07D14]/15 text-[#F07D14] px-2 py-0.5 rounded-full font-semibold">{statusLabel}</span>
                    </div>
                    <p className="text-[#8E827B] text-xs mb-3">#{active.orderId || active._id?.slice(-6)} · ₹{(active.totals?.total || active.total || 0).toLocaleString('en-IN')}</p>
                    <div className="flex gap-2 mt-2">
                      {['pending','confirmed','preparing','ready','out_for_delivery'].map((s, i) => {
                        const steps = ['pending','confirmed','preparing','ready','out_for_delivery'];
                        const curr = steps.indexOf(active.status);
                        return <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${i <= curr ? 'bg-[#F07D14]' : 'bg-white/10'}`} />;
                      })}
                    </div>
                    <button onClick={() => setTab('orders')} className="mt-3 text-xs text-[#F07D14] font-semibold flex items-center gap-1 hover:underline">
                      Track order <ChevronRight size={12} />
                    </button>
                  </div>
                );
              })()}

              {/* Loyalty Points Progress */}
              {(() => {
                const pts = user?.loyaltyPoints || 0;
                const FREE_ITEM_AT = 500;
                const pct = Math.min(100, Math.round((pts / FREE_ITEM_AT) * 100));
                const remaining = Math.max(0, FREE_ITEM_AT - pts);
                return (
                  <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                        <Trophy size={18} className="text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">Loyalty Points</p>
                        <p className="text-[#8E827B] text-xs">{remaining > 0 ? `${remaining} more pts for a free item!` : '🎉 Free item unlocked!'}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[#F07D14] font-bold text-xl">{pts}</p>
                        <p className="text-[#8E827B] text-xs">/ {FREE_ITEM_AT}</p>
                      </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#F07D14] to-yellow-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[#8E827B] text-xs mt-1.5 text-right">{pct}% to free item</p>
                  </div>
                );
              })()}

              {/* Last Order Reorder */}
              {(() => {
                const last = orders.find(o => o.status === 'delivered');
                if (!last) return null;
                const items = last.items?.slice(0, 2) || [];
                return (
                  <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <RotateCcw size={16} className="text-[#F07D14]" />
                      <p className="text-white font-bold text-sm">Order Again</p>
                    </div>
                    <p className="text-[#8E827B] text-xs mb-2">Your last order:</p>
                    {items.map((item, i) => (
                      <p key={i} className="text-white text-sm">• {item.name} × {item.qty}</p>
                    ))}
                    {last.items?.length > 2 && <p className="text-[#8E827B] text-xs mt-1">+{last.items.length - 2} more items</p>}
                    <button
                      onClick={() => navigate('/menu')}
                      className="mt-3 w-full py-2.5 rounded-xl bg-[#F07D14] text-white text-sm font-bold hover:bg-[#E86C1B] transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingBag size={15} /> Reorder Now
                    </button>
                  </div>
                );
              })()}

              {/* Favourite Items */}
              {(() => {
                // Build favourite items from most-ordered
                const itemMap = {};
                orders.forEach(o => o.items?.forEach(it => {
                  if (!itemMap[it.name]) itemMap[it.name] = { name: it.name, count: 0, price: it.price };
                  itemMap[it.name].count += it.quantity;
                }));
                const favourites = Object.values(itemMap).sort((a, b) => b.count - a.count).slice(0, 3);
                if (!favourites.length) return null;
                return (
                  <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart size={16} className="text-red-400" />
                      <p className="text-white font-bold text-sm">Your Favourites</p>
                    </div>
                    <div className="space-y-2">
                      {favourites.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                            <div>
                              <p className="text-white text-sm font-semibold">{item.name}</p>
                              <p className="text-[#8E827B] text-xs">Ordered {item.count}×</p>
                            </div>
                          </div>
                          {item.price > 0 && <p className="text-[#F07D14] text-sm font-bold">₹{item.price}</p>}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => navigate('/menu')} className="mt-3 w-full py-2 rounded-xl border border-[#F07D14]/30 text-[#F07D14] text-sm font-semibold hover:bg-[#F07D14]/10 transition-colors flex items-center justify-center gap-2">
                      <Zap size={13} /> Browse Menu
                    </button>
                  </div>
                );
              })()}

              {/* No orders yet empty state */}
              {!ordersLoading && orders.length === 0 && (
                <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-8 text-center">
                  <div className="text-5xl mb-3">🍔</div>
                  <p className="text-white font-bold text-lg mb-1">No orders yet</p>
                  <p className="text-[#8E827B] text-sm mb-4">Place your first order and it'll appear here</p>
                  <button onClick={() => navigate('/menu')} className="px-6 py-2.5 rounded-xl bg-[#F07D14] text-white font-bold text-sm hover:bg-[#E86C1B] transition-colors">
                    Browse Menu
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {ordersLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-[#1A1310] rounded-2xl animate-pulse" />)}</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🍔</div>
                  <p className="text-white font-bold text-lg mb-2">No orders yet</p>
                  <p className="text-[#8E827B] text-sm">Your order history will appear here</p>
                </div>
              ) : (
                <>
                  {/* Active Orders — tracking section */}
                  {orders.filter(o => o.status === 'out_for_delivery').map(o => (
                    <TrackDelivery key={o._id} order={o} />
                  ))}
                  <div className="space-y-3">{orders.map(o => <OrderCard key={o._id} order={o} myReviews={myReviews} onReviewSubmit={handleReviewSubmit} />)}</div>
                </>
              )}
            </motion.div>
          )}

          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Basic info */}
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 space-y-5">
                <h2 className="text-white font-bold text-lg flex items-center gap-2"><User size={18} className="text-[#F07D14]" /> Basic Info</h2>
                <div>
                  <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Full Name</label>
                  <input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14] text-sm" />
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={saveProfile} disabled={profileSaving}
                    className="px-6 py-2.5 rounded-xl bg-[#F07D14] text-white font-bold hover:bg-[#E86C1B] transition-colors disabled:opacity-60">
                    {profileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {profileMsg && <span className={`text-sm font-medium ${profileMsg === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{profileMsg}</span>}
                </div>
              </div>

              {/* Change Password */}
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 space-y-4">
                <h2 className="text-white font-bold text-lg flex items-center gap-2"><Shield size={18} className="text-[#F07D14]" /> Change Password</h2>
                {pwStep === 0 && (
                  <div className="space-y-3">
                    <p className="text-[#8E827B] text-sm">We'll send an OTP to your registered phone/email to confirm the change.</p>
                    <button onClick={sendPwOtp} disabled={pwLoading}
                      className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-2">
                      {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />} Send OTP
                    </button>
                    {pwMsg && <p className="text-red-400 text-sm">{pwMsg}</p>}
                  </div>
                )}
                {pwStep === 1 && (
                  <div className="space-y-3">
                    <p className="text-[#8E827B] text-sm">Enter the OTP sent to your phone/email</p>
                    <OtpInput value={pwOtp} onChange={setPwOtp} disabled={pwLoading} />
                    <div className="flex justify-center">
                      {pwCooldown > 0 ? <Countdown seconds={pwCooldown} onEnd={() => setPwCooldown(0)} />
                        : <button onClick={() => { sendPwOtp(); }} className="text-xs text-[#F07D14] hover:underline">Resend OTP</button>}
                    </div>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} placeholder="New password" value={pwNew} onChange={e => setPwNew(e.target.value)}
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14] text-sm" />
                      <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-3.5 text-[#8E827B]">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                    <input type="password" placeholder="Confirm new password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14] text-sm" />
                    <div className="flex gap-3">
                      <button onClick={submitPwChange} disabled={pwLoading || pwOtp.length < 6}
                        className="px-5 py-2.5 rounded-xl bg-[#F07D14] text-white font-bold text-sm hover:bg-[#E86C1B] transition-colors disabled:opacity-50 flex items-center gap-2">
                        {pwLoading ? <Loader2 size={14} className="animate-spin" /> : null} Change Password
                      </button>
                      <button onClick={() => { setPwStep(0); setPwMsg(''); setPwOtp(''); setPwNew(''); setPwConfirm(''); }}
                        className="px-4 py-2.5 rounded-xl border border-white/10 text-[#8E827B] text-sm hover:text-white">Cancel</button>
                    </div>
                    {pwMsg && <p className="text-red-400 text-sm">{pwMsg}</p>}
                  </div>
                )}
              </div>

              {/* Change Email */}
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-6 space-y-4">
                <h2 className="text-white font-bold text-lg flex items-center gap-2"><AtSign size={18} className="text-[#F07D14]" /> Change Email</h2>
                <p className="text-[#8E827B] text-sm">Current: <span className="text-white font-semibold">{user?.email || 'Not set'}</span></p>
                {emailStep === 0 && (
                  <div className="space-y-3">
                    <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@email.com" type="email"
                      className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14] text-sm" />
                    <button onClick={sendEmailOtp2} disabled={emailLd || !newEmail.includes('@')}
                      className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm hover:bg-white/10 disabled:opacity-50 flex items-center gap-2">
                      {emailLd ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Send OTP
                    </button>
                    {emailMsg2 && <p className={`text-sm ${emailMsg2.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{emailMsg2}</p>}
                  </div>
                )}
                {emailStep === 1 && (
                  <div className="space-y-3">
                    <p className="text-[#8E827B] text-sm">OTP sent to {newEmail}</p>
                    <OtpInput value={emailOtp2} onChange={setEmailOtp2} disabled={emailLd} />
                    <div className="flex justify-center">
                      {emailCd > 0 ? <Countdown seconds={emailCd} onEnd={() => setEmailCd(0)} />
                        : <button onClick={sendEmailOtp2} className="text-xs text-[#F07D14] hover:underline">Resend OTP</button>}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={verifyEmailChange} disabled={emailLd || emailOtp2.length < 6}
                        className="px-5 py-2.5 rounded-xl bg-[#F07D14] text-white font-bold text-sm hover:bg-[#E86C1B] transition-colors disabled:opacity-50 flex items-center gap-2">
                        {emailLd ? <Loader2 size={14} className="animate-spin" /> : null} Verify & Update
                      </button>
                      <button onClick={() => { setEmailStep(0); setEmailMsg2(''); setEmailOtp2(''); }} className="px-4 py-2.5 rounded-xl border border-white/10 text-[#8E827B] text-sm hover:text-white">Cancel</button>
                    </div>
                    {emailMsg2 && <p className={`text-sm ${emailMsg2.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{emailMsg2}</p>}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {tab === 'addresses' && (
            <motion.div key="addresses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">Saved Addresses</h2>
                <button onClick={openAddAddr} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F07D14]/15 text-[#F07D14] font-semibold text-sm hover:bg-[#F07D14]/25 transition-colors">
                  <Plus size={15} /> Add New
                </button>
              </div>
              {(user?.savedAddresses || []).length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">📍</div>
                  <p className="text-white font-bold text-lg mb-2">No saved addresses</p>
                  <p className="text-[#8E827B] text-sm">Add addresses for quick checkout</p>
                  <button onClick={openAddAddr} className="mt-4 px-5 py-2.5 rounded-xl bg-[#F07D14] text-white font-bold text-sm">Add Address</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {user.savedAddresses.map((addr, i) => (
                    <div key={i} className={`bg-[#1A1310] rounded-2xl border p-4 flex items-start gap-3 ${i === 0 ? 'border-[#F07D14]/40' : 'border-white/5'}`}>
                      <MapPin size={18} className={`mt-0.5 shrink-0 ${i === 0 ? 'text-[#F07D14]' : 'text-[#8E827B]'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold text-sm">{addr.label}</p>
                          {i === 0 && <span className="text-xs bg-[#F07D14]/15 text-[#F07D14] px-2 py-0.5 rounded-full font-semibold">Default</span>}
                        </div>
                        <p className="text-[#A39791] text-sm mt-0.5 truncate">{addr.address}</p>
                        <div className="flex gap-3 mt-2">
                          {i !== 0 && <button onClick={() => setDefaultAddress(i)} className="text-xs text-[#F07D14] hover:underline font-semibold">Set Default</button>}
                          <button onClick={() => openEditAddr(i)} className="text-xs text-[#8E827B] hover:text-white flex items-center gap-1"><Edit2 size={11} /> Edit</button>
                          <button onClick={() => deleteAddress(i)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 size={11} /> Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit Modal */}
              <AnimatePresence>
                {addrModal !== null && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={e => { if (e.target === e.currentTarget) setAddrModal(null); }}>
                    <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
                      className="bg-[#1A1310] rounded-2xl border border-white/10 p-6 w-full max-w-md space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-bold text-lg">{addrModal === 'add' ? 'Add Address' : 'Edit Address'}</h3>
                        <button onClick={() => setAddrModal(null)} className="text-[#8E827B] hover:text-white"><X size={20} /></button>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Label (e.g. Home, Office)</label>
                        <input value={addrForm.label} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))} placeholder="Home"
                          className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14] text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#A39791] mb-1.5">Full Address</label>
                        <textarea value={addrForm.address} onChange={e => setAddrForm(f => ({ ...f, address: e.target.value }))} rows={3} placeholder="Street, City, PIN"
                          className="w-full px-4 py-3 rounded-xl bg-[#16100D] border border-white/10 text-white focus:outline-none focus:border-[#F07D14] text-sm resize-none" />
                      </div>
                      {addrMsg && <p className="text-red-400 text-sm">{addrMsg}</p>}
                      <div className="flex gap-3">
                        <button onClick={saveAddress} disabled={addrSaving}
                          className="flex-1 py-3 rounded-xl bg-[#F07D14] text-white font-bold hover:bg-[#E86C1B] transition-colors disabled:opacity-60">
                          {addrSaving ? 'Saving...' : 'Save Address'}
                        </button>
                        <button onClick={() => setAddrModal(null)} className="px-5 py-3 rounded-xl border border-white/10 text-[#8E827B] hover:text-white">Cancel</button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {tab === 'wallet' && (
            <motion.div key="wallet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Points Balance */}
              <div className="bg-gradient-to-br from-[#F07D14]/20 to-[#1A1310] rounded-2xl border border-[#F07D14]/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                    <Trophy size={24} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-[#A39791] text-sm">Total Loyalty Points</p>
                    <p className="text-white font-bold text-3xl">{user?.loyaltyPoints || 0} <span className="text-[#F07D14] text-lg">pts</span></p>
                  </div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 text-sm text-[#A39791]">
                  💡 Use points at checkout — <span className="text-white font-semibold">100 pts = ₹10 off</span>
                </div>
              </div>

              {/* Redeem section */}
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-5 space-y-3">
                <h3 className="text-white font-bold flex items-center gap-2"><Gift size={16} className="text-[#F07D14]" /> Redeem Points</h3>
                <p className="text-[#8E827B] text-sm">Redeem your points during checkout. The option appears automatically when you have 100+ points.</p>
                <div className="flex items-center gap-3 p-3 bg-[#0A0604] rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-[#F07D14]/20 flex items-center justify-center"><Zap size={14} className="text-[#F07D14]" /></div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{(user?.loyaltyPoints || 0) >= 500 ? '🎉 Free item unlocked!' : `${Math.max(0, 500 - (user?.loyaltyPoints || 0))} pts away from free item`}</p>
                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-1.5">
                      <div className="h-1.5 bg-[#F07D14] rounded-full transition-all" style={{ width: `${Math.min(100, ((user?.loyaltyPoints || 0) / 500) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Points History */}
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-5 space-y-3">
                <h3 className="text-white font-bold flex items-center gap-2"><Clock size={16} className="text-[#F07D14]" /> Points History</h3>
                <div className="space-y-2">
                  {pointsHistory.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-white text-sm font-semibold">{entry.desc}</p>
                        <p className="text-[#8E827B] text-xs">{entry.date}</p>
                      </div>
                      <span className={`font-bold text-sm ${entry.pts > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {entry.pts > 0 ? '+' : ''}{entry.pts} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral */}
              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-5 space-y-3">
                <h3 className="text-white font-bold flex items-center gap-2"><Share2 size={16} className="text-[#F07D14]" /> Refer &amp; Earn</h3>
                <p className="text-[#8E827B] text-sm">Share your referral code. Earn <span className="text-white font-semibold">100 pts</span> when a friend places their first order!</p>
                <div className="flex items-center gap-3 p-3 bg-[#0A0604] rounded-xl border border-white/5">
                  <p className="text-[#F07D14] font-bold font-mono text-lg tracking-widest flex-1">{referralCode}</p>
                  <button onClick={copyReferral} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${refCopied ? 'bg-green-500/20 text-green-400' : 'bg-[#F07D14]/15 text-[#F07D14] hover:bg-[#F07D14]/25'}`}>
                    <Copy size={12} /> {refCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <button onClick={() => navigator.share?.({ title: 'One in a Million', text: `Use my referral code ${referralCode} for rewards!` })}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-[#8E827B] text-sm font-semibold hover:text-white hover:border-white/20 flex items-center justify-center gap-2">
                  <Share2 size={14} /> Share with Friends
                </button>
              </div>
            </motion.div>
          )}

          {tab === 'favorites' && (
            <motion.div key="favorites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">My Favorites</h2>
                <span className="text-[#8E827B] text-sm">{favorites.length} item{favorites.length !== 1 ? 's' : ''}</span>
              </div>
              {favorites.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">💝</div>
                  <p className="text-white font-bold text-lg mb-2">No favorites yet</p>
                  <p className="text-[#8E827B] text-sm mb-4">Tap the ♡ on any menu item to save it here</p>
                  <a href="/menu" className="inline-block px-5 py-2.5 rounded-xl bg-[#F07D14] text-white font-bold text-sm hover:bg-[#E86C1B] transition-colors">Browse Menu</a>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {favorites.map(item => (
                    <div key={item.id} className="bg-[#1A1310] rounded-2xl border border-white/5 p-4 flex items-center gap-3">
                      {item.image && <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{item.name}</p>
                        <p className="text-[#8E827B] text-xs mt-0.5 capitalize">{item.category}</p>
                        <p className="text-[#F07D14] font-bold text-sm mt-1">₹{item.price}</p>
                      </div>
                      <button onClick={() => toggleFavorite(item)} className="p-2 rounded-xl hover:bg-white/5 text-red-400 hover:text-red-300 transition-colors" title="Remove favorite">
                        <Heart size={18} fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-center text-[#8E827B] text-xs pt-2">Favorites are saved on this device</p>
            </motion.div>
          )}

          {tab === 'notifications' && (
            <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-white font-bold text-lg">Notification Preferences</h2>

              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-5 space-y-3">
                <h3 className="text-white font-semibold flex items-center gap-2"><Bell size={16} className="text-[#F07D14]" /> In-App</h3>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-white text-sm font-semibold">Notification Bell</p>
                    <p className="text-[#8E827B] text-xs mt-0.5">Show bell icon &amp; alerts in-app</p>
                  </div>
                  <button onClick={() => toggleNotif('inApp')}>
                    {notifPrefs.inApp
                      ? <div className="w-12 h-6 bg-[#F07D14] rounded-full relative transition-colors"><div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow" /></div>
                      : <div className="w-12 h-6 bg-white/10 rounded-full relative transition-colors"><div className="w-5 h-5 bg-white/40 rounded-full absolute top-0.5 left-0.5 shadow" /></div>
                    }
                  </button>
                </div>
              </div>

              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-5 space-y-1">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-3"><Package size={16} className="text-[#F07D14]" /> Order Updates</h3>
                {[
                  { key: 'orderSms',   label: 'SMS Notifications',  desc: 'Order status via SMS' },
                  { key: 'orderEmail', label: 'Email Notifications', desc: 'Order updates via email' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-t border-white/5">
                    <div>
                      <p className="text-white text-sm font-semibold">{label}</p>
                      <p className="text-[#8E827B] text-xs mt-0.5">{desc}</p>
                    </div>
                    <button onClick={() => toggleNotif(key)}>
                      {notifPrefs[key]
                        ? <div className="w-12 h-6 bg-[#F07D14] rounded-full relative transition-colors"><div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow" /></div>
                        : <div className="w-12 h-6 bg-white/10 rounded-full relative transition-colors"><div className="w-5 h-5 bg-white/40 rounded-full absolute top-0.5 left-0.5 shadow" /></div>
                      }
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-[#1A1310] rounded-2xl border border-white/5 p-5 space-y-1">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-3"><Tag size={16} className="text-[#F07D14]" /> Promotions &amp; Offers</h3>
                {[
                  { key: 'promoSms',   label: 'Promotional SMS',    desc: 'Deals &amp; discounts via SMS' },
                  { key: 'promoEmail', label: 'Promotional Emails',  desc: 'Weekly newsletters &amp; deals' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3 border-t border-white/5">
                    <div>
                      <p className="text-white text-sm font-semibold">{label}</p>
                      <p className="text-[#8E827B] text-xs mt-0.5" dangerouslySetInnerHTML={{ __html: desc }} />
                    </div>
                    <button onClick={() => toggleNotif(key)}>
                      {notifPrefs[key]
                        ? <div className="w-12 h-6 bg-[#F07D14] rounded-full relative transition-colors"><div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow" /></div>
                        : <div className="w-12 h-6 bg-white/10 rounded-full relative transition-colors"><div className="w-5 h-5 bg-white/40 rounded-full absolute top-0.5 left-0.5 shadow" /></div>
                      }
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[#8E827B] text-xs text-center pt-1">Preferences saved locally. Server sync coming soon.</p>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
