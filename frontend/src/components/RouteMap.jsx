import { useEffect } from 'react';
import { MapContainer, Polyline, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icons for Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const portIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 0 0 2px ${color}55,0 2px 6px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

// Auto-fit the map to all waypoints when they change
const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [20, 20] });
    }
  }, [points, map]);
  return null;
};

const SOURCE_COLORS = {
  'searoute-js':      '#22d3ee',
  'haversine-fallback': '#f59e0b',
};

const SOURCE_LABELS = {
  'searoute-js':      'Shipping Lane',
  'haversine-fallback': 'Estimated',
};

const RouteMap = ({ startingPort, destinationPort, waypoints = [], routeSource, weatherAlerts = [] }) => {
  const points = waypoints.length
    ? waypoints.map((wp) => [wp.latitude, wp.longitude])
    : [
        [startingPort?.coordinates?.latitude, startingPort?.coordinates?.longitude],
        [destinationPort?.coordinates?.latitude, destinationPort?.coordinates?.longitude],
      ].filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));

  if (!points.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 text-sm text-slate-500">
        Route map unavailable.
      </div>
    );
  }

  const center = points[Math.floor(points.length / 2)];
  
  const lineColor = SOURCE_COLORS[routeSource] ?? '#22d3ee';
  const sourceLabel = SOURCE_LABELS[routeSource];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <MapContainer center={center} zoom={4} scrollWheelZoom className="h-full w-full">
        {/* Dark CARTO tiles — matches the Marine Route Planner */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
        />

        <FitBounds points={points} />

        {/* Glow shadow layer */}
        {points.length > 1 && (
          <Polyline
            positions={points}
            pathOptions={{ color: lineColor, weight: 8, opacity: 0.12 }}
          />
        )}

        {/* Main route line */}
        {points.length > 1 && (
          <Polyline
            positions={points}
            pathOptions={{ color: lineColor, weight: 2.5, opacity: 0.95 }}
          />
        )}

        {/* Origin marker */}
        {startingPort?.coordinates && (
          <Marker
            position={[startingPort.coordinates.latitude, startingPort.coordinates.longitude]}
            icon={portIcon('#34d399')}
          >
            <Popup>
              <div className="text-slate-800 text-xs">
                <p className="font-bold">🟢 Origin</p>
                <p className="mt-0.5">{startingPort.name || startingPort.code || 'Starting Port'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination marker */}
        {destinationPort?.coordinates && (
          <Marker
            position={[destinationPort.coordinates.latitude, destinationPort.coordinates.longitude]}
            icon={portIcon('#f43f5e')}
          >
            <Popup>
              <div className="text-slate-800 text-xs">
                <p className="font-bold">🔴 Destination</p>
                <p className="mt-0.5">{destinationPort.name || destinationPort.code || 'Destination Port'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Weather Alerts Markers */}
        {weatherAlerts.map((alert, idx) => {
          if (typeof alert.latitude !== 'number' || typeof alert.longitude !== 'number') return null;

          let alertColor = '#10b981';
          if (alert.severity === 'critical') alertColor = '#ef4444';
          else if (alert.severity === 'high') alertColor = '#f97316';
          else if (alert.severity === 'medium') alertColor = '#eab308';
          
          return (
            <CircleMarker
              key={idx}
              center={[alert.latitude, alert.longitude]}
              radius={6}
              pathOptions={{ color: alertColor, fillColor: alertColor, fillOpacity: 0.8, weight: 2 }}
            >
              <Popup>
                <div className="text-slate-800 text-xs">
                  <p className="font-bold" style={{ color: alertColor }}>⚠️ Weather Alert</p>
                  <p className="mt-0.5">{alert.description}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Route source badge overlay */}
      {sourceLabel && (
        <div
          className="absolute bottom-2 left-2 z-[1000] flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm"
          style={{ background: `${lineColor}22`, color: lineColor, border: `1px solid ${lineColor}44` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: lineColor }} />
          {sourceLabel}
        </div>
      )}
    </div>
  );
};

export default RouteMap;
