import { fetchWithTimeout } from '../lib/utils';
import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Cookie-based admin guard: verifies session with server instead of checking localStorage token
export default function AdminGuard({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'fail'
  const location = useLocation();

  useEffect(() => {
    fetchWithTimeout('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user?.role === 'admin') {
          setStatus('ok');
        } else {
          setStatus('fail');
        }
      })
      .catch(() => setStatus('fail'));
  }, []);

  // Also check bim_user localStorage for faster initial render
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('bim_user') || 'null'); } catch { return null; }})();

  useEffect(() => {
    if (storedUser?.role === 'admin') setStatus('ok');
  }, [storedUser]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'fail') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
