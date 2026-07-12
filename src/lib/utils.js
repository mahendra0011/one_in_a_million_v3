/**
 * fetchWithTimeout — AbortController-based timeout wrapper around fetch.
 * Default timeout: 15 seconds. Pass { timeout: ms } in options to override.
 * Usage: same as fetch(url, options) — just replace fetch with fetchWithTimeout.
 */
export function fetchWithTimeout(url, options = {}) {
  const { timeout = 15000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...fetchOptions, signal: controller.signal })
    .finally(() => clearTimeout(timer))
    .catch(err => {
      if (err.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw err;
    });
}

export function retryFetchWithTimeout(url, options = {}, retries = 3) {
  const { timeout = 15000, ...fetchOptions } = options;
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      fetch(url, { ...fetchOptions, signal: controller.signal })
        .finally(() => clearTimeout(timer))
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
