import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function getColor(freeBikes) {
  if (freeBikes === 0) return '#f87171';
  if (freeBikes <= 2) return '#fbbf24';
  return '#34d399';
}

function MapClickHandler({ onClearFocus }) {
  useMapEvents({ click: onClearFocus });
  return null;
}

function FlyToStation({ station }) {
  const map = useMap();
  useEffect(() => {
    if (station) {
      map.flyTo([station.lat, station.lng], 15, { duration: 1 });
    }
  }, [station, map]);
  return null;
}

function StationMarker({ station, focused }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (focused && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [focused]);

  return (
    <CircleMarker
      ref={markerRef}
      center={[station.lat, station.lng]}
      radius={focused ? 12 : 8}
      color={focused ? '#0f766e' : '#fff'}
      weight={focused ? 3 : 2}
      fillColor={getColor(station.freeBikes)}
      fillOpacity={0.85}
    >
      <Popup>
        <div style={{ minWidth: '160px' }}>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>{station.name}</p>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
            {station.networkName} &mdash; {station.city}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span
              style={{
                background: '#d1fae5',
                color: '#065f46',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {station.freeBikes} cyklar
            </span>
            <span
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {station.emptySlots} platser
            </span>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}

export default function MapView({ stations, focusedStation, onClearFocus }) {
  if (stations.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>Inga stationer att visa på kartan.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-sky-100 shadow-sm" style={{ height: '600px' }}>
      <MapContainer
        center={[62.0, 15.0]}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onClearFocus={onClearFocus} />
        <FlyToStation station={focusedStation} />
        {stations.map(station => (
          <StationMarker
            key={station.id}
            station={station}
            focused={focusedStation?.id === station.id}
          />
        ))}
      </MapContainer>
    </div>
  );
}
