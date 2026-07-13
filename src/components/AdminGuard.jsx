import { fetchWithTimeout } from '../lib/utils';
import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Cookie-based admin guard: verifies session with server instead of checking localStorage token
export default function AdminGuard({ children }) {
  const location = useLocation();

  // Check bim_user localStorage synchronously for a faster initial render,
  // then verify with the server below.
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('bim_user') || 'null'); } catch { return null; }})();

  const [status, setStatus] = useState(storedUser?.role === 'admin' ? 'ok' : 'loading'); // 'loading' | 'ok' | 'fail'

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
