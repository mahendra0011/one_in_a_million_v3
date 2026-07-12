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
