import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || 'get_your_free_key_from_maptiler';
const STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

export default function LiveTrackingMap({
  customerLocation,
  driverLocation,
  driverPath = [],
  routeGeometry = [], // Step 8: ORS route polyline
  height = 300,
  showRoute = true,
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      center: [(customerLocation?.lng || 78.5), (customerLocation?.lat || 23.5)],
      zoom: 13,
    });

    mapRef.current = map;

    map.on('load', () => setLoaded(true));

    // Customer marker
    if (customerLocation?.lat && customerLocation?.lng) {
      customerMarkerRef.current = new maplibregl.Marker({ color: '#F07D14' })
        .setLngLat([customerLocation.lng, customerLocation.lat])
        .setPopup(new maplibregl.Popup().setText('Delivery Location'))
        .addTo(map);
    }

    // Driver marker (will be updated with live location)
    if (driverLocation?.lat && driverLocation?.lng) {
      driverMarkerRef.current = new maplibregl.Marker({ color: '#10B981' })
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .setPopup(new maplibregl.Popup().setText('Delivery Boy'))
        .addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update driver marker position
  useEffect(() => {
    if (driverMarkerRef.current && driverLocation?.lat && driverLocation?.lng) {
      driverMarkerRef.current.setLngLat([driverLocation.lng, driverLocation.lat]);
    }
  }, [driverLocation]);

  // Draw ORS route (optimized path) OR driver path (live GPS trail)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !showRoute) return;

    const sourceId = 'route-line';
    const layerId = 'route-path';

    // Use ORS route geometry if available, otherwise use driver path
    const coords = routeGeometry.length > 0
      ? routeGeometry.map(p => [p.lng, p.lat])
      : driverPath.map(p => [p.lng, p.lat]);

    if (coords.length === 0) return;

    if (map.getSource(sourceId)) map.getSource(sourceId).setData(null);

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      },
    });

    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': routeGeometry.length > 0 ? '#3B82F6' : '#F07D14', // Blue for ORS route, orange for GPS trail
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [loaded, driverPath, routeGeometry, showRoute]);

  return (
    <div
      ref={mapContainer}
      className="w-full rounded-xl overflow-hidden border border-white/10"
      style={{ height }}
    />
  );
}