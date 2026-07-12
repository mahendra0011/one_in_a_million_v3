import { useEffect, useRef, useState } from 'react';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '';
const STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

function openMapsDirections(sLat, sLng, dLat, dLng) {
  window.open(`https://www.google.com/maps/dir/${sLat},${sLng}/${dLat},${dLng}`, '_blank');
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function LiveTrackingMap({
  customerLocation,
  driverLocation,
  driverPath = [],
  routeGeometry = [],
  height = 300,
  showRoute = true,
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [maplibre, setMaplibre] = useState(null);
  const distance = (customerLocation?.lat && driverLocation?.lat)
    ? calculateDistance(driverLocation.lat, driverLocation.lng, customerLocation.lat, customerLocation.lng)
    : null;

  useEffect(() => {
    import('maplibre-gl').then(mod => {
      import('maplibre-gl/dist/maplibre-gl.css').catch(() => {});
      setMaplibre(mod.default || mod);
    }).catch(() => {
      setMapError(true);
    });
  }, []);

  useEffect(() => {
    if (!maplibre || !mapContainer.current || mapRef.current) return;
    if (!MAPTILER_KEY) { setMapError(true); return; }

    try {
      const map = new maplibre.Map({
        container: mapContainer.current,
        style: STYLE_URL,
        center: [
          customerLocation?.lng || driverLocation?.lng || 78.5,
          customerLocation?.lat || driverLocation?.lat || 23.5
        ],
        zoom: 14,
      });

      mapRef.current = map;
      map.on('load', () => setLoaded(true));
      map.on('error', () => setMapError(true));

      if (customerLocation?.lat && customerLocation?.lng) {
        const el = document.createElement('div');
        el.innerHTML = '📍';
        el.style.fontSize = '28px';
        el.style.cursor = 'pointer';
        customerMarkerRef.current = new maplibre.Marker({ element: el })
          .setLngLat([customerLocation.lng, customerLocation.lat])
          .setPopup(new maplibre.Popup().setHTML('<b>📍 Delivery Destination</b>'))
          .addTo(map);
      }

      if (driverLocation?.lat && driverLocation?.lng) {
        const el = document.createElement('div');
        el.innerHTML = '🛵';
        el.style.fontSize = '28px';
        el.style.cursor = 'pointer';
        driverMarkerRef.current = new maplibre.Marker({ element: el })
          .setLngLat([driverLocation.lng, driverLocation.lat])
          .setPopup(new maplibre.Popup().setHTML('<b>🛵 Delivery Boy</b>'))
          .addTo(map);
      }
    } catch {
      setMapError(true);
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [maplibre, customerLocation?.lat, customerLocation?.lng]);

  useEffect(() => {
    if (!mapRef.current || !driverLocation?.lat || !driverLocation?.lng || !maplibre) return;
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([driverLocation.lng, driverLocation.lat]);
    } else {
      const el = document.createElement('div');
      el.innerHTML = '🛵';
      el.style.fontSize = '28px';
      driverMarkerRef.current = new maplibre.Marker({ element: el })
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .addTo(mapRef.current);
    }
  }, [driverLocation?.lat, driverLocation?.lng, maplibre]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !showRoute || !routeGeometry?.length) return;
    try {
      const coords = routeGeometry.map(p => [p.lng, p.lat]);
      if (map.getSource('route')) {
        map.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } });
      } else {
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
        map.addLayer({
          id: 'route', type: 'line', source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#F07D14', 'line-width': 5, 'line-opacity': 0.9 },
        });
      }
    } catch {}
  }, [loaded, routeGeometry, showRoute]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !driverPath?.length) return;
    try {
      const coords = driverPath.map(p => [p.lng, p.lat]);
      if (map.getSource('driver-path')) {
        map.getSource('driver-path').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } });
      } else {
        map.addSource('driver-path', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
        map.addLayer({
          id: 'driver-path', type: 'line', source: 'driver-path',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#4A90D9', 'line-width': 3, 'line-opacity': 0.6, 'line-dasharray': [2, 2] },
        });
      }
    } catch {}
  }, [loaded, driverPath]);

  if (mapError || !MAPTILER_KEY) {
    const hasCustomer = customerLocation?.lat && customerLocation?.lng;
    const hasDriver = driverLocation?.lat && driverLocation?.lng;
    return (
      <div style={{ height }} className="rounded-2xl bg-[#16100D] border border-white/5 flex flex-col items-center justify-center gap-3 p-4">
        <div className="text-4xl">🗺️</div>
        <p className="text-[#A39791] text-sm text-center font-medium">
          {!MAPTILER_KEY ? 'Map API key not configured' : 'Map failed to load'}
        </p>
        {hasCustomer && (
          <a href={`https://maps.google.com/?q=${customerLocation.lat},${customerLocation.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#F07D14]/20 border border-[#F07D14]/30 rounded-xl px-4 py-2 text-[#F07D14] text-sm font-bold hover:bg-[#F07D14]/30 transition-colors">
            📍 Open Delivery Location in Google Maps
          </a>
        )}
        {hasDriver && (
          <a href={`https://maps.google.com/?q=${driverLocation.lat},${driverLocation.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-xl px-4 py-2 text-blue-400 text-sm font-bold hover:bg-blue-500/30 transition-colors">
            🛵 Open Delivery Boy Location in Google Maps
          </a>
        )}
        {hasDriver && hasCustomer && (
          <button onClick={() => openMapsDirections(driverLocation.lat, driverLocation.lng, customerLocation.lat, customerLocation.lng)}
            className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 text-green-400 text-sm font-bold hover:bg-green-500/30 transition-colors">
            🗺️ Get Directions
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ height, position: 'relative' }} className="rounded-2xl overflow-hidden border border-white/10">
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {!loaded && (
        <div className="absolute inset-0 bg-[#16100D] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#F07D14] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {loaded && (
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          {distance != null && (
            <div className="bg-black/70 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg backdrop-blur-sm">
              📏 {formatDistance(distance)}
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            {customerLocation?.lat && driverLocation?.lat && (
              <button onClick={() => openMapsDirections(driverLocation.lat, driverLocation.lng, customerLocation.lat, customerLocation.lng)}
                className="bg-[#F07D14] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow hover:bg-[#E86C1B] transition-colors">
                🗺️ Navigate
              </button>
            )}
            {customerLocation?.lat && (
              <a href={`https://maps.google.com/?q=${customerLocation.lat},${customerLocation.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="bg-white/90 text-gray-800 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow hover:bg-white transition-colors">
                📍 Open in Maps
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
