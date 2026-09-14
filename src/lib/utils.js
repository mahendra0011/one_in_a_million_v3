const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function resolveApiUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api')) return `${API_BASE}${url}`;
  return url;
}

/**
 * fetchWithTimeout — AbortController-based timeout wrapper around fetch.
 * Default timeout: 15 seconds. Pass { timeout: ms } in options to override.
 * Usage: same as fetch(url, options) — just replace fetch with fetchWithTimeout.
 */
export function fetchWithTimeout(url, options = {}) {
  const { timeout = 15000, ...fetchOptions } = options;
  const targetUrl = resolveApiUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(targetUrl, { ...fetchOptions, signal: controller.signal })
    .then(res => {
      // Wrap .json() so callers never crash on empty / non-JSON bodies
      const originalJson = res.json.bind(res);
      let bodyConsumed = false;
      res.json = async () => {
        if (bodyConsumed) return { ok: false, error: 'Response body already consumed' };
        bodyConsumed = true;
        try {
          const text = await res.clone().text();
          if (!text) return { ok: false, error: 'Empty response from server' };
          return JSON.parse(text);
        } catch {
          return { ok: false, error: 'Server returned an invalid response' };
        }
      };
      return res;
    })
    .finally(() => clearTimeout(timer))
    .catch(err => {
      if (err.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw err;
    });
}

/**
 * safeJson — safely parse a fetch Response as JSON.
 * Returns the parsed object, or { ok: false, error: '...' } if the body
 * is empty / not valid JSON (e.g. HTML from a misconfigured proxy).
 */
export async function safeJson(res) {
  const text = await res.text();
  if (!text) return { ok: false, error: 'Empty response from server' };
  try { return JSON.parse(text); }
  catch { return { ok: false, error: 'Server returned an invalid response' }; }
}

export function retryFetchWithTimeout(url, options = {}, retries = 3) {
  const { timeout = 15000, ...fetchOptions } = options;
  const targetUrl = resolveApiUrl(url);
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      fetch(targetUrl, { ...fetchOptions, signal: controller.signal })
        .finally(() => clearTimeout(timer))
        .then(res => {
          const originalJson = res.json.bind(res);
          let bodyConsumed = false;
          res.json = async () => {
            if (bodyConsumed) return { ok: false, error: 'Response body already consumed' };
            bodyConsumed = true;
            try {
              const text = await res.clone().text();
              if (!text) return { ok: false, error: 'Empty response from server' };
              return JSON.parse(text);
            } catch {
              return { ok: false, error: 'Server returned an invalid response' };
            }
          };
          return res;
        })
        .then(resolve)
        .catch(err => {
          if (n > 0) {
            const delay = Math.min(1000 * Math.pow(2, retries - n), 4000);
            setTimeout(() => attempt(n - 1), delay);
          } else {
            reject(err.name === 'AbortError' ? new Error('Request timeout') : err);
          }
        });
    };
    attempt(retries);
  });
}

export function money(amount) {
  return '₹' + Number(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function formatTime(timeStr) {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

// Great-circle distance in metres between two lat/lng points (Haversine).
// Used to throttle route re-fetches to meaningful movement instead of every
// raw GPS tick.
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Straight-line fallback route between two points, used whenever the ORS
// directions API is unavailable (no ORS_API_KEY configured on the server,
// rate-limited, or a network error) so the map always shows *some* path
// instead of silently rendering nothing. Interpolates a few midpoints so
// the line isn't a single raw segment.
export function straightLineRoute(start, end, steps = 8) {
  if (!start?.lat || !start?.lng || !end?.lat || !end?.lng) return [];
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({
      lat: start.lat + (end.lat - start.lat) * t,
      lng: start.lng + (end.lng - start.lng) * t,
    });
  }
  return pts;
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) + ' at ' + d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });
}
