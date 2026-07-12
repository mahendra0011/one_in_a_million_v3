import { useEffect, useRef, useState } from 'react';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '';
const STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

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

  // Dynamically import maplibre-gl so it doesn't crash if not installed
  useEffect(() => {
    import('maplibre-gl').then(mod => {
      // Also import CSS
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

      // Customer marker
      if (customerLocation?.lat && customerLocation?.lng) {
        const el = document.createElement('div');
        el.innerHTML = '📍';
        el.style.fontSize = '28px';
        el.style.cursor = 'pointer';
        customerMarkerRef.current = new maplibre.Marker({ element: el })
          .setLngLat([customerLocation.lng, customerLocation.lat])
          .setPopup(new maplibre.Popup().setText('Delivery Location'))
          .addTo(map);
      }

      // Driver marker
      if (driverLocation?.lat && driverLocation?.lng) {
        const el = document.createElement('div');
        el.innerHTML = '🛵';
        el.style.fontSize = '28px';
        el.style.cursor = 'pointer';
        driverMarkerRef.current = new maplibre.Marker({ element: el })
          .setLngLat([driverLocation.lng, driverLocation.lat])
          .setPopup(new maplibre.Popup().setText('Delivery Boy'))
          .addTo(map);
      }
    } catch {
      setMapError(true);
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [maplibre, customerLocation?.lat, customerLocation?.lng]);

  // Update driver marker position in real-time
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

  // Draw ORS route polyline on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !showRoute || !routeGeometry?.length) return;
    try {
      if (map.getSource('route')) {
        map.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: routeGeometry } });
      } else {
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: routeGeometry } } });
        map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#F07D14', 'line-width': 4, 'line-opacity': 0.85 } });
      }
    } catch {}
  }, [loaded, routeGeometry, showRoute]);

  // Fallback UI when maplibre not available or no API key
  if (mapError || !MAPTILER_KEY) {
    const hasLocation = customerLocation?.lat && customerLocation?.lng;
    const hasDrLoc = driverLocation?.lat && driverLocation?.lng;
    return (
      <div style={{ height }} className="rounded-2xl bg-[#16100D] border border-white/5 flex flex-col items-center justify-center gap-3 p-4">
        <div className="text-4xl">🗺️</div>
        <p className="text-[#A39791] text-sm text-center font-medium">
          {!MAPTILER_KEY ? 'Map API key not configured' : 'Map failed to load'}
        </p>
        {hasLocation && (
          <a href={`https://maps.google.com/?q=${customerLocation.lat},${customerLocation.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#F07D14]/20 border border-[#F07D14]/30 rounded-xl px-4 py-2 text-[#F07D14] text-sm font-bold hover:bg-[#F07D14]/30 transition-colors">
            📍 Open Delivery Location in Google Maps
          </a>
        )}
        {hasDrLoc && (
          <a href={`https://maps.google.com/?q=${driverLocation.lat},${driverLocation.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-xl px-4 py-2 text-blue-400 text-sm font-bold hover:bg-blue-500/30 transition-colors">
            🛵 Open Delivery Boy Location in Google Maps
          </a>
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
      {/* Google Maps fallback buttons */}
      {loaded && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-2">
          {customerLocation?.lat && (
            <a href={`https://maps.google.com/?q=${customerLocation.lat},${customerLocation.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="bg-white/90 text-gray-800 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow hover:bg-white transition-colors">
              📍 Open in Maps
            </a>
          )}
        </div>
      )}
    </div>
  );
}
