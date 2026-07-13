import { fetchWithTimeout } from '../../lib/utils';
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

// Cookie-based delivery guard: verifies session with server instead of checking localStorage token
export default function DeliveryGuard({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'set-password' | 'fail'

  // Check bim_user localStorage for faster initial render
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('bim_user') || 'null'); } catch { return null; }})();

  useEffect(() => {
    fetchWithTimeout('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user?.role === 'delivery_boy') {
          if (data.user.mustSetPassword) {
            setStatus('set-password');
          } else {
            setStatus('ok');
          }
        } else {
          setStatus('fail');
        }
      })
      .catch(() => setStatus('fail'));
  }, []);

  useEffect(() => {
    if (storedUser?.role === 'delivery_boy') {
      if (storedUser.mustSetPassword) {
        setStatus('set-password');
      } else {
        setStatus('ok');
      }
    }
  }, [storedUser]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0604] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F07D14] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'set-password') {
    return <Navigate to="/delivery/set-password" replace />;
  }

  if (status === 'fail') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
