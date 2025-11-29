import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression, Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { Task, TaskType } from './TaskCard';
import { API_BASE_URL } from '../../config';

type MapViewProps = {
  className?: string;
  tasks?: Task[];
  showAllTasks?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  isListeningForClick?: boolean;
};

const INITIAL_POSITION: LatLngExpression = [22.543099, 114.057868];

const leafletIcon = L.icon({
  iconRetinaUrl: markerRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = leafletIcon;

const taskTypeColors: Record<TaskType, string> = {
  medic: '#22c55e', // green
  fire: '#dc2626', // vermilion/red
  police: '#38bdf8', // blue
  logistics: '#eab308', // yellow
  evacuation: '#f97316', // orange
  search_rescue: '#9333ea', // purple
};


const createTaskIcon = (taskType: TaskType): L.DivIcon => {
  const color = taskTypeColors[taskType];
  return L.divIcon({
    className: 'task-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background-color: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const MapReady: FC<{ onReady: (map: LeafletMap) => void }> = ({ onReady }) => {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
};

const MapView: FC<MapViewProps> = ({
  className = '',
  tasks = [],
  showAllTasks = false,
  onMapClick,
  isListeningForClick = false,
}) => {
  const mapRef = useRef<LeafletMap | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const [initialPosition, setInitialPosition] = useState<LatLngExpression>(INITIAL_POSITION);
  const [center, setCenter] = useState<LatLngExpression>(initialPosition);
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(null);
  const [markerLabel, setMarkerLabel] = useState<string | null>(null);
  const [disasterPosition, setDisasterPosition] = useState<LatLngExpression | null>(null);
  const [disasterLabel, setDisasterLabel] = useState<string | null>(null);
  const [disasterMeta, setDisasterMeta] = useState<{ title?: string | null; description?: string | null; severity?: string | null; status?: string | null } | null>(null);

  const disasterSeverityColors: Record<string, string> = {
    low: '#16a34a', // green
    medium: '#f59e0b', // yellow
    high: '#ef4444', // red
    critical: '#000000', // black
  };

  const createDisasterIcon = (severity?: string | null): L.DivIcon => {
    const color = (severity && disasterSeverityColors[severity.toLowerCase()]) || '#6b7280';
    // Use a triangle SVG (pointing up) for disaster marker. Anchor is bottom-center.
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1">
        <path d="M12 2 L22 20 L2 20 Z" />
      </svg>
    `;
    return L.divIcon({
      className: 'disaster-marker',
      html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;">${svg}</div>`,
      iconSize: [34, 34],
      // anchor at bottom center so the triangle 'point' indicates location
      iconAnchor: [17, 28],
      popupAnchor: [0, -24],
    });
  };

  // Filter tasks based on showAllTasks
  const filteredTasks = showAllTasks
    ? tasks
    : tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled');

  const tileUrl = useMemo(
    () => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    []
  );

  const flyTo = (coords: LatLngExpression, zoom = 13) => {
    mapRef.current?.flyTo(coords, zoom, { duration: 1 });
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchTerm.trim()) return;

    setSearching(true);
    setMapMessage(null);
    const q = searchTerm.trim().toLowerCase();
    // Local search: disaster title/description
    try {
      if (disasterMeta && disasterPosition) {
        const title = (disasterMeta.title || '').toLowerCase();
        const desc = (disasterMeta.description || '').toLowerCase();
        if (title.includes(q) || desc.includes(q)) {
          flyTo(disasterPosition, 13);
          setSearching(false);
          return;
        }
      }

      // Local search: tasks by description/title
      const taskMatch = filteredTasks.find((t) => {
        const txt = ((t.description || '') + ' ' + (t.taskType || '')).toLowerCase();
        return txt.includes(q) || (t.taskId && t.taskId.toLowerCase().includes(q));
      });
      if (taskMatch && taskMatch.latitude != null && taskMatch.longitude != null) {
        const coords: LatLngExpression = [taskMatch.latitude, taskMatch.longitude];
        setCenter(coords);
        flyTo(coords, 13);
        setSearching(false);
        return;
      }

      // Fallback to Nominatim geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm.trim())}`
      );
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const match = data[0];
        const coords: LatLngExpression = [parseFloat(match.lat), parseFloat(match.lon)];
        setCenter(coords);
        setMarkerPosition(coords);
        setMarkerLabel(match.display_name);
        flyTo(coords, 13);
      } else {
        setMapMessage('No results found. Try another query.');
      }
    } catch (error) {
      console.error(error);
      setMapMessage('Unable to search right now.');
    } finally {
      setSearching(false);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!mapRef.current) return;
    direction === 'in' ? mapRef.current.zoomIn() : mapRef.current.zoomOut();
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setMapMessage('Geolocation is not supported on this device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: LatLngExpression = [position.coords.latitude, position.coords.longitude];
        setCenter(coords);
        setMarkerPosition(coords);
        setMarkerLabel('Responder Position');
        flyTo(coords, 14);
      },
      () => setMapMessage('Unable to retrieve your location.')
    );
  };

  const resetView = () => {
    // Reset center to initialPosition (usually disaster initial position)
    setCenter(initialPosition);
    setMarkerLabel(null);
    // Do NOT clear `disasterPosition` or `disasterMeta` so the disaster marker remains fixed
    flyTo(initialPosition, 12);
    setMapMessage(null);
  };

  const registerMap = useCallback((mapInstance: LeafletMap) => {
    mapRef.current = mapInstance;
  }, []);

  const getDisasterIdFromLocation = () => {
    if (typeof window === 'undefined') return null;
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('disasterId');
    } catch {
      return null;
    }
  };

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(new RegExp('(^|\\s)' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
  };

  const getEffectiveDisasterId = () => {
    const urlId = getDisasterIdFromLocation();
    if (urlId) return urlId;
    return getCookie('commander_disaster_id');
  };

  // Handle map click listener changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (isListeningForClick && onMapClick) {
      const handleMapClick = (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      };
      mapRef.current.on('click', handleMapClick);

      return () => {
        mapRef.current?.off('click', handleMapClick);
      };
    }
  }, [isListeningForClick, onMapClick]);

  // Fix map rendering on initial mount
  useEffect(() => {
    if (mapRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch disaster map info and stats, then center the map on the disaster location
  useEffect(() => {
    const disasterId = getEffectiveDisasterId();
    if (!disasterId) return;

    let mounted = true;
    (async () => {
      try {
        // Fetch map info
        const res = await fetch(`${API_BASE_URL}/disasters/${encodeURIComponent(disasterId)}/map`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const feature = data?.disaster_location;
        if (!feature || !feature.geometry || !mounted) return;
        const coords = feature.geometry.coordinates; // [lon, lat]
        if (!Array.isArray(coords) || coords.length < 2) return;
        const latlng: LatLngExpression = [coords[1], coords[0]];
        setInitialPosition(latlng);
        setCenter(latlng);
        setDisasterPosition(latlng);
        const label = feature.properties?.title || feature.properties?.name || 'Disaster location';
        // Get description, severity, and status directly from map endpoint
        const description = feature.properties?.description || feature.properties?.text_body || null;
        const severity = feature.properties?.severity_level || feature.properties?.severity || null;
        const status = feature.properties?.status || null;

        setDisasterLabel(label);
        setDisasterMeta({ title: label, description, severity, status });
        // If map already registered, fly to location
        if (mapRef.current) {
          try { mapRef.current.flyTo(latlng, 12, { duration: 0.8 }); } catch { }
          mapRef.current?.invalidateSize();
        }
      } catch (err) {
        // ignore
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Fix map rendering when container size changes
  useEffect(() => {
    if (mapRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [filteredTasks.length, showAllTasks]);

  return (
    <div className={`map-area ${className}`}>
      <form className="map-search" onSubmit={handleSearch}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search locations or incidents..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <button type="submit" disabled={searching} aria-label="Search map">
          {searching ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 4l-9 9-3-3-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </form>

      {mapMessage && <p className="map-status">{mapMessage}</p>}

      <MapContainer
        className="map-canvas"
        center={center}
        zoom={12}
        zoomControl={false}
        style={isListeningForClick ? { cursor: 'crosshair', height: '100%', width: '100%' } : { height: '100%', width: '100%' }}
      >
        <MapReady onReady={registerMap} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url={tileUrl}
          detectRetina
        />
        {disasterPosition && (
          <Marker position={disasterPosition} icon={createDisasterIcon(disasterMeta?.severity ?? null)}>
            <Popup>
              <div>
                <strong>{disasterMeta?.title ?? disasterLabel ?? 'Disaster location'}</strong>
                {disasterMeta?.description && (
                  <>
                    <br />
                    <small>{disasterMeta.description}</small>
                  </>
                )}
                {disasterMeta?.severity && (
                  <>
                    <br />
                    <small>Severity Level: {disasterMeta.severity}</small>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {markerPosition && (
          <Marker position={markerPosition}>
            <Popup>
              <div>
                <strong>{markerLabel ?? 'Location'}</strong>
              </div>
            </Popup>
          </Marker>
        )}
        {filteredTasks.map((task) => (
          <Marker
            key={task.taskId}
            position={[task.latitude, task.longitude]}
            icon={createTaskIcon(task.taskType)}
          >
            <Popup>
              <div>
                <strong>{task.description}</strong>
                <br />
                <small>{task.taskType === 'search_rescue' ? 'Search & Rescue' : task.taskType.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())}</small>
                <br />
                <small>Priority: {task.priority}</small>
                <br />
                <small>Status: {task.status}</small>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="map-controls" aria-label="map controls">
        <button type="button" aria-label="Zoom in" onClick={() => handleZoom('in')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => handleZoom('out')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" aria-label="Reset view" onClick={resetView}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a8 8 0 10-2.2 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <button type="button" className="map-locate" onClick={handleLocate}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Locate Unit
      </button>
    </div>
  );
};

export default MapView;

