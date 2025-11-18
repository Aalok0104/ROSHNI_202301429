import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression, Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type MapViewProps = {
  className?: string;
};

const INITIAL_POSITION: LatLngExpression = [22.543099, 114.057868];

// Configure Leaflet's default marker so bundlers know where to find the assets
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

const MapReady: FC<{ onReady: (map: LeafletMap) => void }> = ({ onReady }) => {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
};

const MapView: FC<MapViewProps> = ({ className = '' }) => {
  const mapRef = useRef<LeafletMap | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const [center, setCenter] = useState<LatLngExpression>(INITIAL_POSITION);
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression>(INITIAL_POSITION);
  const [markerLabel, setMarkerLabel] = useState('Shenzhen Command Center');

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

    try {
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
    setCenter(INITIAL_POSITION);
    setMarkerPosition(INITIAL_POSITION);
    setMarkerLabel('Shenzhen Command Center');
    flyTo(INITIAL_POSITION, 12);
    setMapMessage(null);
  };

  const registerMap = useCallback((mapInstance: LeafletMap) => {
    mapRef.current = mapInstance;
  }, []);

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
      >
        <MapReady onReady={registerMap} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url={tileUrl}
          detectRetina
        />
        <Marker position={markerPosition}>
          <Popup>{markerLabel}</Popup>
        </Marker>
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

