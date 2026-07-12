import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, Plus, Minus, Locate, Maximize, Loader2 } from 'lucide-react';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '';
const MAPTILER_STYLE = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const defaultStyles = {
  dark: MAPTILER_STYLE,
  light: MAPTILER_KEY
    ? MAPTILER_STYLE
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

function getDocumentTheme() {
  if (typeof document === 'undefined') return null;
  if (document.documentElement.classList.contains('dark')) return 'dark';
  if (document.documentElement.classList.contains('light')) return 'light';
  return null;
}

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useResolvedTheme(themeProp) {
  const [detectedTheme, setDetectedTheme] = useState(
    () => getDocumentTheme() ?? getSystemTheme()
  );
  useEffect(() => {
    if (themeProp) return;
    const observer = new MutationObserver(() => {
      const docTheme = getDocumentTheme();
      if (docTheme) setDetectedTheme(docTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => { if (!getDocumentTheme()) setDetectedTheme(e.matches ? 'dark' : 'light'); };
    mq.addEventListener('change', handler);
    return () => { observer.disconnect(); mq.removeEventListener('change', handler); };
  }, [themeProp]);
  return themeProp ?? detectedTheme;
}

const MapContext = createContext(null);
export function useMap() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMap must be used within <Map>');
  return ctx;
}

export const Map = forwardRef(function Map(
  { children, className, theme: themeProp, styles, center = [78.5, 23.5], zoom = 14, loading = false, ...props },
  ref
) {
  const containerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const resolvedTheme = useResolvedTheme(themeProp);

  useImperativeHandle(ref, () => mapInstance, [mapInstance]);

  useEffect(() => {
    if (!containerRef.current) return;
    const style = styles?.dark || defaultStyles.dark;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center,
      zoom,
      attributionControl: { compact: true },
      ...props,
    });
    map.on('load', () => setIsLoaded(true));
    setMapInstance(map);
    return () => { map.remove(); setIsLoaded(false); setMapInstance(null); };
  }, []);

  const ctxValue = useMemo(() => ({ map: mapInstance, isLoaded }), [mapInstance, isLoaded]);

  return (
    <MapContext.Provider value={ctxValue}>
      <div ref={containerRef} className={`relative h-full w-full ${className || ''}`}>
        {(!isLoaded || loading) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-xs">
            <Loader2 className="size-6 animate-spin text-[#F07D14]" />
          </div>
        )}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

const MarkerContext = createContext(null);

function useMarker() {
  const ctx = useContext(MarkerContext);
  if (!ctx) throw new Error('Marker children must be inside MapMarker');
  return ctx;
}

export function MapMarker({
  longitude, latitude, children,
  onClick, onMouseEnter, onMouseLeave,
  onDragStart, onDrag, onDragEnd,
  draggable = false, color = '#F07D14', ...opts
}) {
  const { map } = useMap();
  const cbRef = useRef({ onClick, onMouseEnter, onMouseLeave, onDragStart, onDrag, onDragEnd });
  cbRef.current = { onClick, onMouseEnter, onMouseLeave, onDragStart, onDrag, onDragEnd };

  const marker = useMemo(() => {
    const el = document.createElement('div');
    const m = new maplibregl.Marker({ ...opts, element: el, draggable }).setLngLat([longitude, latitude]);
    el.addEventListener('click', (e) => cbRef.current.onClick?.(e));
    el.addEventListener('mouseenter', (e) => cbRef.current.onMouseEnter?.(e));
    el.addEventListener('mouseleave', (e) => cbRef.current.onMouseLeave?.(e));
    m.on('dragstart', () => { const l = m.getLngLat(); cbRef.current.onDragStart?.({ lng: l.lng, lat: l.lat }); });
    m.on('drag', () => { const l = m.getLngLat(); cbRef.current.onDrag?.({ lng: l.lng, lat: l.lat }); });
    m.on('dragend', () => { const l = m.getLngLat(); cbRef.current.onDragEnd?.({ lng: l.lng, lat: l.lat }); });
    return m;
  }, []);

  useEffect(() => { if (map) marker.addTo(map); return () => marker.remove(); }, [map]);
  useEffect(() => { marker.setLngLat([longitude, latitude]); }, [longitude, latitude]);

  return (
    <MarkerContext.Provider value={{ marker, map }}>
      {children}
    </MarkerContext.Provider>
  );
}

export function MarkerContent({ children, className }) {
  const { marker } = useMarker();
  return createPortal(
    <div className={`relative cursor-pointer ${className || ''}`}>{children || (
      <div className="size-5 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: '#F07D14' }} />
    )}</div>,
    marker.getElement()
  );
}

export function MarkerPopup({ children, className, closeButton = false, ...popupOpts }) {
  const { marker, map } = useMarker();
  const container = useMemo(() => document.createElement('div'), []);
  const popup = useMemo(() => new maplibregl.Popup({ offset: 16, ...popupOpts, closeButton: false }).setMaxWidth('none').setDOMContent(container), []);

  useEffect(() => {
    if (!map) return;
    popup.setDOMContent(container);
    marker.setPopup(popup);
    return () => marker.setPopup(null);
  }, [map]);

  return createPortal(
    <div className={`bg-[#1A1310] text-white relative max-w-62 rounded-xl border border-white/10 p-3 shadow-xl ${className || ''}`}>
      {closeButton && (
        <button onClick={() => popup.remove()} className="absolute top-1 right-1 z-10 text-[#8E827B] hover:text-white">
          <X className="size-3.5" />
        </button>
      )}
      {children}
    </div>,
    container
  );
}

export function MarkerTooltip({ children, className }) {
  const { marker, map } = useMarker();
  const container = useMemo(() => document.createElement('div'), []);
  const tooltip = useMemo(() => new maplibregl.Popup({ offset: 16, closeOnClick: true, closeButton: false }).setMaxWidth('none'), []);

  useEffect(() => {
    if (!map) return;
    tooltip.setDOMContent(container);
    const enter = () => { tooltip.setLngLat(marker.getLngLat()).addTo(map); };
    const leave = () => tooltip.remove();
    const el = marker.getElement();
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => { el.removeEventListener('mouseenter', enter); el.removeEventListener('mouseleave', leave); tooltip.remove(); };
  }, [map]);

  return createPortal(
    <div className={`bg-white text-black pointer-events-none rounded-md px-2 py-1 text-xs shadow-md ${className || ''}`}>{children}</div>,
    container
  );
}

export function MarkerLabel({ children, className, position = 'top' }) {
  return (
    <div className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[#A39791] text-[10px] font-medium ${
      position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
    } ${className || ''}`}>
      {children}
    </div>
  );
}

const positionMap = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-10 right-2',
};

export function MapControls({
  position = 'bottom-right',
  showZoom = true,
  showCompass = false,
  showLocate = false,
  showFullscreen = false,
  className,
  onLocate,
}) {
  const { map } = useMap();
  const [locating, setLocating] = useState(false);

  const gi = (fn) => () => { if (map) fn(map); };
  const zoomIn = gi((m) => m.zoomTo(m.getZoom() + 1, { duration: 300 }));
  const zoomOut = gi((m) => m.zoomTo(m.getZoom() - 1, { duration: 300 }));
  const resetNorth = gi((m) => m.resetNorthPitch({ duration: 300 }));

  const handleLocate = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { longitude: pos.coords.longitude, latitude: pos.coords.latitude };
        map?.flyTo({ center: [c.longitude, c.latitude], zoom: 14, duration: 1500 });
        onLocate?.(c);
        setLocating(false);
      },
      () => setLocating(false)
    );
  }, [map, onLocate]);

  const handleFullscreen = useCallback(() => {
    const c = map?.getContainer();
    if (!c) return;
    document.fullscreenElement ? document.exitFullscreen() : c.requestFullscreen();
  }, [map]);

  const Btn = ({ onClick, label, children: kid, disabled }) => (
    <button onClick={onClick} aria-label={label} type="button" disabled={disabled}
      className="flex size-8 items-center justify-center first:rounded-t-md last:rounded-b-md
        hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#F07D14] focus-visible:outline-none
        disabled:opacity-50 transition-all text-[#A39791] hover:text-white">
      {kid}
    </button>
  );

  return (
    <div className={`absolute z-10 flex flex-col gap-1.5 ${positionMap[position]} ${className || ''}`}>
      {showZoom && (
        <div className="flex flex-col overflow-hidden rounded-md border border-white/10 bg-[#1A1310] shadow-sm">
          <Btn onClick={zoomIn} label="Zoom in"><Plus className="size-4" /></Btn>
          <Btn onClick={zoomOut} label="Zoom out"><Minus className="size-4" /></Btn>
        </div>
      )}
      {showCompass && (
        <div className="overflow-hidden rounded-md border border-white/10 bg-[#1A1310] shadow-sm">
          <Btn onClick={resetNorth} label="Reset bearing"><span className="size-4 text-xs font-bold">N</span></Btn>
        </div>
      )}
      {showLocate && (
        <div className="overflow-hidden rounded-md border border-white/10 bg-[#1A1310] shadow-sm">
          <Btn onClick={handleLocate} label="Find my location" disabled={locating}>
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Locate className="size-4" />}
          </Btn>
        </div>
      )}
      {showFullscreen && (
        <div className="overflow-hidden rounded-md border border-white/10 bg-[#1A1310] shadow-sm">
          <Btn onClick={handleFullscreen} label="Toggle fullscreen"><Maximize className="size-4" /></Btn>
        </div>
      )}
    </div>
  );
}

export function MapPopup({ longitude, latitude, onClose, children, className, closeButton = false, ...popupOpts }) {
  const { map } = useMap();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const container = useMemo(() => document.createElement('div'), []);
  const popup = useMemo(() => new maplibregl.Popup({ offset: 16, ...popupOpts, closeButton: false }).setMaxWidth('none').setLngLat([longitude, latitude]), []);

  useEffect(() => {
    if (!map) return;
    popup.on('close', () => onCloseRef.current?.());
    popup.setDOMContent(container);
    popup.addTo(map);
    return () => { if (popup.isOpen()) popup.remove(); };
  }, [map]);

  return createPortal(
    <div className={`bg-[#1A1310] text-white relative max-w-62 rounded-xl border border-white/10 p-3 shadow-xl ${className || ''}`}>
      {closeButton && (
        <button onClick={() => popup.remove()} className="absolute top-1 right-1 z-10 text-[#8E827B] hover:text-white">
          <X className="size-3.5" />
        </button>
      )}
      {children}
    </div>,
    container
  );
}

export function MapRoute({
  id: propId,
  coordinates,
  color = '#F07D14',
  width = 4,
  opacity = 0.9,
  dashArray,
  onClick,
  interactive = true,
}) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId || autoId;
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  useEffect(() => {
    if (!isLoaded || !map) return;
    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
    });
    map.addLayer({
      id: layerId, type: 'line', source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': color, 'line-width': width, 'line-opacity': opacity, ...(dashArray ? { 'line-dasharray': dashArray } : {}) },
    });
    return () => {
      try { if (map.getLayer(layerId)) map.removeLayer(layerId); if (map.getSource(sourceId)) map.removeSource(sourceId); } catch {}
    };
  }, [isLoaded, map]);

  useEffect(() => {
    if (!isLoaded || !map || coordinates.length < 2) return;
    const src = map.getSource(sourceId);
    if (src) src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
  }, [isLoaded, map, coordinates, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    try {
      map.setPaintProperty(layerId, 'line-color', color);
      map.setPaintProperty(layerId, 'line-width', width);
      map.setPaintProperty(layerId, 'line-opacity', opacity);
    } catch {}
  }, [isLoaded, map, layerId, color, width, opacity]);

  return null;
}
