import { useRef, useEffect, useMemo, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Map, MapMarker, MarkerContent, MarkerPopup, MapRoute, MapControls, useMap } from '../components/ui/map';
import { MapPin, Navigation } from 'lucide-react';

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

// Nudges a lat/lng a few metres in a given compass bearing. Used purely for
// on-screen marker placement — when two markers sit at (or very near) the
// exact same coordinates (common in test data, or right after a delivery
// boy accepts an order at the restaurant), they'd render as one icon
// stacked on top of the other and look "missing". This keeps every icon
// visible without touching the real distance/route calculations, which
// still use the unmodified coordinates.
function offsetLatLng(lat, lng, bearingDeg, meters) {
  const bearing = (bearingDeg * Math.PI) / 180;
  const dLat = (meters * Math.cos(bearing)) / 111320;
  const dLng = (meters * Math.sin(bearing)) / (111320 * Math.cos((lat * Math.PI) / 180) || 1);
  return { lat: lat + dLat, lng: lng + dLng };
}

const DECLUTTER_THRESHOLD_M = 12;

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
    const showMotorcycle = viewMode === 'user';
    const bgColor = showMotorcycle ? '#F07D14' : '#3b82f6';
    const shadowRgb = showMotorcycle ? '240,125,20' : '59,130,246';
    const content = showMotorcycle ? '🛵' : '👤';
    el.innerHTML = `<div style="width:42px;height:42px;background:${bgColor};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 15px rgba(${shadowRgb},0.5)">${content}</div>`;
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
  showLocate = false,
  viewMode = 'user',
  onMarkDestination,
  onUseMyLocation,
}) {
  const [myLocation, setMyLocation] = useState(null);
  
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
    if (driverLocation?.lat && myLocation?.lat) {
      return [avg(driverLocation.lng, myLocation.lng), avg(driverLocation.lat, myLocation.lat)];
    }
    if (customerLocation?.lat && myLocation?.lat) {
      return [avg(customerLocation.lng, myLocation.lng), avg(customerLocation.lat, myLocation.lat)];
    }
    if (customerLocation?.lat && restaurantLocation?.lat) {
      return [
        avg(customerLocation.lng, restaurantLocation.lng),
        avg(customerLocation.lat, restaurantLocation.lat),
      ];
    }
    if (customerLocation?.lat) return [customerLocation.lng, customerLocation.lat];
    if (driverLocation?.lat) return [driverLocation.lng, driverLocation.lat];
    if (myLocation?.lat) return [myLocation.lng, myLocation.lat];
    if (restaurantLocation?.lat) return [restaurantLocation.lng, restaurantLocation.lat];
    return [78.5, 23.5];
  }, [customerLocation, driverLocation, restaurantLocation, myLocation]);

  // Get the viewer's own current location — both the customer dashboard and
  // the delivery-boy dashboard need this to show a "my location" pin
  // independent of whatever location the backend has last recorded for
  // them, so it isn't gated by viewMode anymore.
  const onUseMyLocationRef = useRef(onUseMyLocation);
  useEffect(() => { onUseMyLocationRef.current = onUseMyLocation; });

  useEffect(() => {
    if (!navigator.geolocation) return;

    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
    };

    getLocation();
    const interval = setInterval(getLocation, 45000);
    return () => clearInterval(interval);
  }, []);

  // Display-only coordinates for the driver and "my location" markers.
  // customerLocation is treated as the fixed anchor and always drawn at its
  // real position; the other two get nudged apart on-screen if they'd
  // otherwise land within a few metres of the anchor (or of each other),
  // which is exactly what happens with identical test coordinates or right
  // when a delivery boy is standing at the restaurant/customer address.
  const displayDriverLocation = useMemo(() => {
    if (!driverLocation?.lat) return driverLocation;
    if (customerLocation?.lat && calcDist(driverLocation.lat, driverLocation.lng, customerLocation.lat, customerLocation.lng) < DECLUTTER_THRESHOLD_M) {
      return { ...driverLocation, ...offsetLatLng(customerLocation.lat, customerLocation.lng, 320, 20) };
    }
    return driverLocation;
  }, [driverLocation, customerLocation]);

  const displayMyLocation = useMemo(() => {
    if (!myLocation?.lat) return myLocation;
    if (customerLocation?.lat && calcDist(myLocation.lat, myLocation.lng, customerLocation.lat, customerLocation.lng) < DECLUTTER_THRESHOLD_M) {
      return { ...myLocation, ...offsetLatLng(customerLocation.lat, customerLocation.lng, 80, 20) };
    }
    if (driverLocation?.lat && calcDist(myLocation.lat, myLocation.lng, driverLocation.lat, driverLocation.lng) < DECLUTTER_THRESHOLD_M) {
      return { ...myLocation, ...offsetLatLng(driverLocation.lat, driverLocation.lng, 200, 20) };
    }
    return myLocation;
  }, [myLocation, customerLocation, driverLocation]);

  return (
    <div style={{ height, position: 'relative' }} className="rounded-2xl overflow-hidden border border-white/10 bg-[#0A0604]">
      <Map center={center} zoom={14}>
        {showControls && (
          <MapControls
            position="top-right"
            showZoom
            showCompass
            showLocate={showLocate}
            showFullscreen
            onLocate={(c) => {
              const loc = { lat: c.latitude, lng: c.longitude };
              setMyLocation(loc);
              onUseMyLocationRef.current?.(loc);
            }}
          />
        )}

        {showRoute && routeCoords.length >= 2 && (
          <MapRoute coordinates={routeCoords} color="#F07D14" width={5} opacity={0.9} />
        )}

        {driverPathCoords.length >= 2 && (
          <MapRoute
            id="driver-path"
            coordinates={driverPathCoords}
            color="#6b7280"
            width={3}
            opacity={0.5}
            dashArray={[3, 3]}
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
                <div className="w-10 h-10 bg-red-600 border-3 border-white rounded-full flex items-center justify-center shadow-xl shadow-red-600/40">
                  <MapPin size={20} className="text-white" />
                </div>
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

        {/* Delivery boy marker (🛵) — only shown on the customer's map. On the
            delivery boy's own map this would just duplicate the "My Location"
            marker below (both come from the same GPS), so it's skipped there. */}
        {driverLocation?.lat && viewMode === 'user' && <DriverMarker location={displayDriverLocation} viewMode={viewMode} />}

        {/* Current location marker — shows the viewer's own live GPS position,
            on both the user dashboard and the delivery-boy dashboard,
            independent of whatever the destination/driver pins show. */}
        {myLocation && (
          <MapMarker longitude={displayMyLocation.lng} latitude={displayMyLocation.lat}>
            <MarkerContent>
              <div className="w-10 h-10 bg-green-500 border-3 border-white rounded-full flex items-center justify-center shadow-xl shadow-green-500/40">
                📍
              </div>
            </MarkerContent>
            <MarkerPopup closeButton>
              <p className="text-white font-bold text-sm">My Location</p>
              <p className="text-[#A39791] text-xs mt-1">
                {myLocation.lat.toFixed(5)}, {myLocation.lng.toFixed(5)}
              </p>
            </MarkerPopup>
          </MapMarker>
        )}
      </Map>

      {/* Route icon - for manual route fetch. Anchored bottom-right so it
          never overlaps the top-right zoom/compass/locate stack, regardless
          of map height (a fixed pixel offset here previously drifted out of
          alignment on taller maps). */}
      {showControls && driverLocation?.lat && customerLocation?.lat && distance != null && distance >= DECLUTTER_THRESHOLD_M && (
        <button
          onClick={() => onMarkDestination?.(customerLocation)}
          className="absolute bottom-3 right-2 z-10 w-9 h-9 rounded-lg bg-black/70 border border-white/20 flex items-center justify-center hover:bg-black/90 transition-all shadow-lg"
          title="Show route"
        >
          <Navigation size={18} className="text-white" />
        </button>
      )}

      {/* Distance indicator */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        {distance != null && (
          <div className="bg-black/75 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
            {distance < DECLUTTER_THRESHOLD_M ? '📍 Arrived' : `📏 ${fmtDist(distance)}`}
          </div>
        )}
      </div>
    </div>
  );
}