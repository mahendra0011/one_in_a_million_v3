import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

/**
 * InstallPrompt — shows a bottom-sheet install banner on mobile devices when:
 *   1. The browser fires the `beforeinstallprompt` event (Chrome/Edge Android), OR
 *   2. The user is on iOS Safari (where beforeinstallprompt doesn't fire —
 *      we show manual instructions instead).
 *
 * Once dismissed or installed, the banner stays hidden for 7 days (localStorage).
 * The banner is never shown if the app is already running in standalone mode.
 */

const DISMISS_KEY = 'pwa_install_dismissed_until';
const DISMISS_DAYS = 7;

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isDismissed() {
  const until = localStorage.getItem(DISMISS_KEY);
  if (!until) return false;
  return Date.now() < Number(until);
}

function dismiss() {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  // iOS eligibility only depends on synchronous browser APIs, so it can be
  // computed directly as initial state instead of inside an effect.
  const [showIos] = useState(() => !isInStandaloneMode() && !isDismissed() && isIos());
  const [visible, setVisible] = useState(() => !isInStandaloneMode() && !isDismissed() && isIos());

  useEffect(() => {
    // iOS case is already handled by the initial state above.
    if (isInStandaloneMode() || isDismissed() || isIos()) return;

    // Android/Chrome — listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();          // Don't show browser's mini-infobar
      setDeferredPrompt(e);        // Stash the event for our button
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // If already installed via our prompt — hide
    window.addEventListener('appinstalled', () => setVisible(false));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install app"
      className="fixed bottom-0 left-0 right-0 z-[9998] bg-[#1A1208] border-t border-[#B08850]/30 shadow-2xl px-4 py-4 sm:max-w-sm sm:left-auto sm:right-4 sm:bottom-4 sm:rounded-2xl sm:border"
    >
      {/* Close button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors"
      >
        <X size={18} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        {/* App icon */}
        <div className="w-12 h-12 rounded-xl bg-[#B08850]/20 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🍔</span>
        </div>

        <div className="flex-1">
          <p className="text-white font-semibold text-sm leading-tight">
            One in a Million
          </p>
          <p className="text-[#B08850]/80 text-xs mt-0.5 leading-snug">
            App install karein — faster ordering, offline menu access
          </p>
        </div>
      </div>

      {/* iOS instructions */}
      {showIos ? (
        <div className="mt-3 bg-white/5 rounded-xl p-3 text-xs text-white/70 leading-relaxed">
          <p className="font-medium text-white/90 mb-1">iOS pe install karna:</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Safari toolbar mein <span className="font-bold">Share</span> button tap karein <span className="text-base">⬆️</span></li>
            <li><span className="font-bold">"Add to Home Screen"</span> chunein</li>
            <li><span className="font-bold">"Add"</span> tap karein</li>
          </ol>
        </div>
      ) : (
        <button
          onClick={handleInstall}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-[#B08850] hover:bg-[#C49A60] active:bg-[#9A7440] text-black font-semibold text-sm py-2.5 rounded-xl transition-colors"
        >
          <Download size={16} />
          App Install Karein
        </button>
      )}
    </div>
  );
}
