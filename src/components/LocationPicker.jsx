import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchWithTimeout } from '../lib/utils';
import { MapPin, Navigation, Loader2, Search, Crosshair } from 'lucide-react';

const DEBOUNCE_MS = 400;

export default function LocationPicker({ onLocationChange, initialAddress = '' }) {
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinned, setPinned] = useState(null);
  const debounceRef = useRef(null);
  const searchRef = useRef(null);

  const searchAddress = useCallback((query) => {
    if (!query || query.length < 3) { setResults([]); return; }
    setSearching(true);
    fetchWithTimeout(`/api/geocode/search?q=${encodeURIComponent(query)}&limit=5`)
      .then(r => r.json())
      .then(d => { if (d.ok) setResults(d.results); })
      .catch(() => {})
      .finally(() => setSearching(false));
  }, []);

  const handleInputChange = (val) => {
    setAddressInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), DEBOUNCE_MS);
  };

  const selectResult = (result) => {
    const loc = { lat: result.lat, lng: result.lng, address: result.display_name };
    setAddressInput(result.display_name);
    setPinned(loc);
    setResults([]);
    setShowResults(false);
    setError('');
    onLocationChange?.(loc);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetchWithTimeout(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' }, timeout: 8000 }
          );
          const data = await res.json();
          const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          const loc = { lat, lng, address: addr };
          setAddressInput(addr);
          setPinned(loc);
          onLocationChange?.(loc);
        } catch {
          const addr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          const loc = { lat, lng, address: addr };
          setAddressInput(addr);
          setPinned(loc);
          onLocationChange?.(loc);
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === 1) setError('Location permission denied. Allow access or enter manually.');
        else setError('Could not get location. Enter address manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-[#A39791] uppercase tracking-wider flex items-center gap-1.5">
        <MapPin size={12} className="text-[#F07D14]" /> Delivery Location
      </p>
      <p className="text-[10px] text-[#A39791]">
        Address and GPS location both required — search and select from results, or use "My Location"
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
          <input
            ref={searchRef}
            value={addressInput}
            onChange={(e) => { handleInputChange(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 250)}
            placeholder="Search your delivery address..."
            className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-white/10 text-sm bg-[#0A0604] text-white
              focus:outline-none focus:border-[#F07D14] focus:ring-1 focus:ring-[#F07D14]/30 placeholder:text-[#8E827B]
              transition-all"
          />

          {showResults && results.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-[#16100D] border border-white/10 rounded-xl
              max-h-52 overflow-y-auto shadow-2xl shadow-black/50">
              {results.map((r, i) => (
                <button
                  key={i}
                  onMouseDown={() => selectResult(r)}
                  className="w-full text-left px-3 py-2.5 text-xs text-white hover:bg-white/5
                    border-b border-white/5 last:border-0 flex items-start gap-2 transition-colors"
                >
                  <MapPin size={12} className="text-[#F07D14] shrink-0 mt-0.5" />
                  <span className="leading-snug">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {searching && (
            <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E827B] animate-spin" />
          )}
        </div>

        <button
          onClick={handleUseCurrentLocation}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#F07D14]/40 bg-[#F07D14]/10
            text-[#F07D14] text-xs font-bold hover:bg-[#F07D14]/20 transition-all disabled:opacity-60 whitespace-nowrap"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
          {loading ? 'Locating...' : 'My Location'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 font-semibold flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}

      {pinned && !error && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          <MapPin size={14} className="text-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-green-400 text-xs font-bold">📍 Location Pinned</p>
            <p className="text-[#A39791] text-[10px] truncate">
              {pinned.address} ({pinned.lat.toFixed(5)}, {pinned.lng.toFixed(5)})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
