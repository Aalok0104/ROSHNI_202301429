// src/components/MapPanel.tsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getCurrentPosition } from '../utils/location';
import * as responderApi from '../api/responder';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import '../styles.css';

// Fix default icon paths for many bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Incidence {
  id: string;
  lat: number;
  lng: number;
  title: string;
  severity?: 'low' | 'medium' | 'high';
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

export default function MapPanel() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [incidents, setIncidents] = useState<Incidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRadius, setShowRadius] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const pos = await getCurrentPosition();
      if (pos) setPosition(pos);
      const nearby = await responderApi.fetchNearbyIncidents();
      setIncidents(nearby);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="h-96 flex items-center justify-center">Loading map...</div>;
  }

  const center: [number, number] = position ? [position.lat, position.lng] : [20, 0];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-600 mr-3">Map view</span>
          <button className="px-2 py-1 text-sm border rounded mr-2" onClick={async () => {
            const pos = await getCurrentPosition();
            if (pos) setPosition(pos);
          }}>
            Recenter
          </button>
          <button className="px-2 py-1 text-sm border rounded" onClick={() => setShowRadius(s => !s)}>
            Toggle Radius
          </button>
        </div>
        <div className="text-sm text-gray-500">{position ? `Lat ${position.lat.toFixed(4)}, Lng ${position.lng.toFixed(4)}` : 'No location'}</div>
      </div>

      <div className="h-96 rounded overflow-hidden">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && <Recenter lat={position.lat} lng={position.lng} />}
          {position && (
            <>
              <Marker position={[position.lat, position.lng]}>
                <Popup>
                  Your position
                </Popup>
              </Marker>
              {showRadius && (
                <Circle center={[position.lat, position.lng]} radius={500} />
              )}
            </>
          )}

          {incidents.map((inc) => (
            <Marker key={inc.id} position={[inc.lat, inc.lng]}>
              <Popup>
                <div>
                  <div className="font-semibold">{inc.title}</div>
                  <div className="text-xs text-gray-500">Severity: {inc.severity || 'unknown'}</div>
                  <div className="mt-1">
                    <button className="px-2 py-1 text-sm border rounded" onClick={async () => {
                      const ok = await responderApi.markIncidentAsSeen(inc.id);
                      if (ok) alert('Marked as seen');
                    }}>
                      Mark seen
                    </button>
                    <button className="ml-2 px-2 py-1 text-sm border rounded" onClick={async () => {
                      await responderApi.sendMessage({ channel: 'radio', text: `Heading to incident ${inc.title} (${inc.id})`, timestamp: new Date().toISOString() });
                      alert('Message sent to command');
                    }}>
                      Notify command
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
