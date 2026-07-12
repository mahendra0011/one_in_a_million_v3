import { useRef, useEffect, useMemo, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Map, MapMarker, MarkerContent, MarkerPopup, MapRoute, MapControls, useMap } from '../components/ui/map';
import { MapPin, Navigation, LocateFixed, Crosshair, Plus, Minus, Maximize2, User } from 'lucide-react';

function calcDist(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m) {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function animateMarkerTo(marker, lng, lat, duration = 500) {
  const start = performance.now();
  const startCoords = marker.getLngLat();
  function step(t) {
    const p = Math.min((t - start) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    marker.setLngLat([
      startCoords.lng + (lng - startCoords.lng) * e,
      startCoords.lat + (lat - startCoords.lat) * e,
    ]);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function DriverMarker({ location, viewMode }) {
  const { map, isLoaded } = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !map || !location?.lat) return;
    const el = document.createElement('div');
    const isDeliveryView = viewMode === 'delivery';
    el.innerHTML = `<div style="width:36px;height:36px;background:${isDeliveryView ? '#3b82f6' : '#F07D14'};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 12px rgba(${isDeliveryView ? '59,130,246' : '240,125,20'},0.4);transition:box-shadow 0.3s">${isDeliveryView ? '👤' : '🛵'}</div>`;
    const m = new maplibregl.Marker({ element: el })
      .setLngLat([location.lng, location.lat])
      .addTo(map);
    markerRef.current = m;
    return () => m.remove();
  }, [isLoaded, map, viewMode]);

  useEffect(() => {
    if (!markerRef.current || !location?.lat) return;
    const cur = markerRef.current.getLngLat();
    const dist = Math.sqrt(Math.pow(location.lng - cur.lng, 2) + Math.pow(location.lat - cur.lat, 2));
    if (dist > 0.00001) {
      animateMarkerTo(markerRef.current, location.lng, location.lat, 500);
    }
  }, [location?.lat, location?.lng]);

  return null;
}

function RestaurantMarker({ location }) {
  const { map, isLoaded } = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !map || !location?.lat) return;
    const el = document.createElement('div');
    el.innerHTML = `<div style="width:32px;height:32px;background:#2563eb;border:2px solid white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(37,99,235,0.4)">🍽️</div>`;
    const m = new maplibregl.Marker({ element: el })
      .setLngLat([location.lng, location.lat])
      .addTo(map);
    markerRef.current = m;
    return () => m.remove();
  }, [isLoaded, map, location?.lat]);

  return null;
}

export default function LiveTrackingMap({
  customerLocation,
  driverLocation,
  restaurantLocation,
  driverPath = [],
  routeGeometry = [],
  height = 300,
  showRoute = true,
  showControls = true,
  showBranding = true,
  viewMode = 'user',
  onMarkDestination,
  onUseMyLocation,
}) {
  const [routeFetching, setRouteFetching] = useState(false);
  const distance = (customerLocation?.lat && driverLocation?.lat)
    ? calcDist(driverLocation.lat, driverLocation.lng, customerLocation.lat, customerLocation.lng)
    : null;

  const routeCoords = useMemo(() => {
    if (!routeGeometry?.length) return [];
    return routeGeometry.map(p => [p.lng, p.lat]);
  }, [routeGeometry]);

  const driverPathCoords = useMemo(() => {
    if (!driverPath?.length) return [];
    return driverPath.map(p => [p.lng, p.lat]);
  }, [driverPath]);

  const center = useMemo(() => {
    const avg = (a, b) => (a + b) / 2;
    if (customerLocation?.lat && driverLocation?.lat) {
      return [
        avg(customerLocation.lng, driverLocation.lng),
        avg(customerLocation.lat, driverLocation.lat),
      ];
    }
    if (customerLocation?.lat && restaurantLocation?.lat) {
      return [
        avg(customerLocation.lng, restaurantLocation.lng),
        avg(customerLocation.lat, restaurantLocation.lat),
      ];
    }
    if (customerLocation?.lat) return [customerLocation.lng, customerLocation.lat];
    if (driverLocation?.lat) return [driverLocation.lng, driverLocation.lat];
    if (restaurantLocation?.lat) return [restaurantLocation.lng, restaurantLocation.lat];
    return [78.5, 23.5];
  }, [customerLocation, driverLocation, restaurantLocation]);

  return (
    <div style={{ height, position: 'relative' }} className="rounded-2xl overflow-hidden border border-white/10 bg-[#0A0604]">
      <Map center={center} zoom={14}>
        {showControls && (
          <MapControls position="bottom-right" showZoom showLocate showFullscreen />
        )}

        {showRoute && routeCoords.length >= 2 && (
          <MapRoute coordinates={routeCoords} color="#F07D14" width={4} opacity={0.85} />
        )}

        {driverPathCoords.length >= 2 && (
          <MapRoute
            id="driver-path"
            coordinates={driverPathCoords}
            color="#4A90D9"
            width={2}
            opacity={0.4}
            dashArray={[2, 2]}
          />
        )}

{restaurantLocation?.lat && (
          <MapMarker longitude={restaurantLocation.lng} latitude={restaurantLocation.lat}>
            <MarkerContent>
              <div className="w-8 h-8 bg-blue-600 border-2 border-white rounded-lg flex items-center justify-center text-sm">
                🍽️
              </div>
            </MarkerContent>
            <MarkerPopup closeButton>
              <p className="text-white font-bold text-sm">📍 Restaurant</p>
              <p className="text-[#A39791] text-xs mt-1">
                {restaurantLocation.address || 'Restaurant Location'}
              </p>
            </MarkerPopup>
          </MapMarker>
        )}

{customerLocation?.lat && (
          <MapMarker longitude={customerLocation.lng} latitude={customerLocation.lat}>
            <MarkerContent>
              {viewMode === 'delivery' ? (
                <User size={30} className="text-blue-500 fill-blue-500 drop-shadow-lg" />
              ) : (
                <MapPin size={30} className="text-red-500 fill-red-500 drop-shadow-lg" />
              )}
            </MarkerContent>
            <MarkerPopup closeButton>
              <p className="text-white font-bold text-sm">📍 {viewMode === 'delivery' ? 'Customer' : 'Destination'}</p>
              <p className="text-[#A39791] text-xs mt-1">
                {customerLocation.address || `${customerLocation.lat.toFixed(5)}, ${customerLocation.lng.toFixed(5)}`}
              </p>
            </MarkerPopup>
          </MapMarker>
        )}

        {driverLocation?.lat && <DriverMarker location={driverLocation} viewMode={viewMode} />}
      </Map>

      {showControls && driverLocation?.lat && customerLocation?.lat && (
        <button
          onClick={() => onMarkDestination?.(customerLocation)}
          className="absolute bottom-14 right-14 z-10 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F07D14]/20 border border-[#F07D14]/40 text-[#F07D14] text-xs font-bold hover:bg-[#F07D14]/30 transition-colors backdrop-blur-sm"
          title="Show route from your location"
        >
          <Navigation size={14} />
          Route
        </button>
      )}

      {showControls && onUseMyLocation && (
        <button
          onClick={onUseMyLocation}
          className="absolute bottom-14 left-14 z-10 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold hover:bg-blue-500/30 transition-colors backdrop-blur-sm"
          title="Use my current location"
        >
          <Crosshair size={14} />
          My Location
        </button>
      )}

      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        {distance != null && (
          <div className="bg-black/75 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
            📏 {fmtDist(distance)}
          </div>
        )}
      </div>
    </div>
  );
}