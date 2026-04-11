import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { calculateMarineRoute } from '../api';

// Fix Leaflet default icon paths (Vite build issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom ship icon for start/end markers
const portIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;
      border-radius:50%;
      background:${color};
      border:3px solid #fff;
      box-shadow:0 0 0 2px ${color}55,0 2px 8px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

// Auto-fit map to waypoints
const FitBounds = ({ waypoints }) => {
  const map = useMap();
  useEffect(() => {
    if (waypoints.length > 1) {
      const latlngs = waypoints.map((w) => [w.latitude, w.longitude]);
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    }
  }, [waypoints, map]);
  return null;
};

const SOURCE_LABELS = {
  'searoute-js': { label: 'Real Shipping Lane', color: '#22d3ee' },
  'haversine-fallback': { label: 'Estimated Great Circle', color: '#f59e0b' },
};


export default function MarineRoutePlanner() {
  const [originPort, setOriginPort] = useState('');
  const [destinationPort, setDestinationPort] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [animationStep, setAnimationStep] = useState(0);
  const animRef = useRef(null);

  // Animate the route drawing step-by-step
  useEffect(() => {
    if (!result) return;
    setAnimationStep(0);
    const total = result.data.waypoints.length;
    let step = 0;

    const animate = () => {
      step += Math.ceil(total / 60);
      if (step >= total) {
        setAnimationStep(total);
        return;
      }
      setAnimationStep(step);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [result]);

  const handleCalculate = async (e) => {
    e?.preventDefault();
    if (!originPort.trim() || !destinationPort.trim()) {
      setError('Please enter both origin and destination port names.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await calculateMarineRoute(originPort.trim(), destinationPort.trim());
      if (res.success) {
        setResult(res);
      } else {
        setError(res.message || 'Failed to calculate route.');
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || 'Server error. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const waypoints = result?.data?.waypoints ?? [];
  const visibleWaypoints = waypoints.slice(0, animationStep || waypoints.length);
  const polylinePoints = visibleWaypoints.map((w) => [w.latitude, w.longitude]);
  const srcInfo = result ? SOURCE_LABELS[result.data.routeSource] ?? SOURCE_LABELS['haversine-fallback'] : null;

  const inputCls =
    'w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none transition-all duration-200 placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 backdrop-blur-sm';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/25">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l1.5 4.5L9 16l3 4 3-4 4.5-1.5L21 10 12 3 3 10z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Marine Route Planner</h1>
            <p className="text-sm text-slate-400">Real shipping-lane routes via OpenStreetMap + Searoute</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left panel – input */}
        <div className="lg:col-span-2 space-y-4">

          {/* Form */}
          <form onSubmit={handleCalculate} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-4 backdrop-blur-sm">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Origin Port</label>
              <input
                id="marine-origin-port"
                className={inputCls}
                value={originPort}
                onChange={(e) => setOriginPort(e.target.value)}
                placeholder="e.g. Port of Mumbai"
                disabled={loading}
                autoComplete="off"
              />
            </div>

            {/* Swap arrow */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => { setOriginPort(destinationPort); setDestinationPort(originPort); }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/60 bg-slate-800/80 text-slate-400 transition hover:border-cyan-400/60 hover:text-cyan-400"
                title="Swap ports"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500">Destination Port</label>
              <input
                id="marine-destination-port"
                className={inputCls}
                value={destinationPort}
                onChange={(e) => setDestinationPort(e.target.value)}
                placeholder="e.g. Port of Singapore"
                disabled={loading}
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            <button
              id="marine-calculate-btn"
              type="submit"
              disabled={loading || !originPort.trim() || !destinationPort.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Geocoding &amp; Routing…
                </span>
              ) : 'Calculate Marine Route'}
            </button>
          </form>


          {/* Stats panel */}
          {result && (
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-4 backdrop-blur-sm animate-[fadeIn_0.4s_ease]">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Route Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-800/70 p-3">
                  <p className="text-[10px] text-slate-500 mb-1">Distance (NM)</p>
                  <p className="text-lg font-bold text-cyan-300">{result.data.totalDistanceNM?.toLocaleString() ?? '—'}</p>
                </div>
                <div className="rounded-xl bg-slate-800/70 p-3">
                  <p className="text-[10px] text-slate-500 mb-1">Distance (KM)</p>
                  <p className="text-lg font-bold text-blue-300">{result.data.totalDistanceKM?.toLocaleString() ?? '—'}</p>
                </div>
                <div className="rounded-xl bg-slate-800/70 p-3">
                  <p className="text-[10px] text-slate-500 mb-1">Waypoints</p>
                  <p className="text-lg font-bold text-purple-300">{result.data.waypoints.length}</p>
                </div>
                <div className="rounded-xl bg-slate-800/70 p-3">
                  <p className="text-[10px] text-slate-500 mb-1">Source</p>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${srcInfo?.color}22`, color: srcInfo?.color }}
                  >
                    {srcInfo?.label}
                  </span>
                </div>
              </div>

              {/* Port details */}
              <div className="space-y-2 text-xs">
                <div className="rounded-xl bg-slate-800/50 px-3 py-2 border-l-2 border-emerald-400">
                  <p className="text-slate-500 mb-0.5">Origin</p>
                  <p className="text-slate-200 font-medium">{result.data.origin.displayName}</p>
                  <p className="text-slate-500 mt-0.5">
                    {result.data.origin.coordinates.latitude.toFixed(5)}, {result.data.origin.coordinates.longitude.toFixed(5)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-800/50 px-3 py-2 border-l-2 border-rose-400">
                  <p className="text-slate-500 mb-0.5">Destination</p>
                  <p className="text-slate-200 font-medium">{result.data.destination.displayName}</p>
                  <p className="text-slate-500 mt-0.5">
                    {result.data.destination.coordinates.latitude.toFixed(5)}, {result.data.destination.coordinates.longitude.toFixed(5)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel – Map */}
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-slate-700/60 shadow-2xl" style={{ height: '600px' }}>
            {!result && !loading && (
              <div className="flex h-full flex-col items-center justify-center bg-slate-900/80 gap-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full border-2 border-slate-700/60 bg-slate-800/60 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                    </svg>
                  </div>
                  <div className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-cyan-400/20 animate-ping" />
                </div>
                <p className="text-slate-500 text-sm">Enter port names and calculate a route to see the map</p>
              </div>
            )}
            {loading && (
              <div className="flex h-full flex-col items-center justify-center bg-slate-900/80 gap-4">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-400/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-300">Geocoding ports…</p>
                  <p className="text-xs text-slate-500 mt-1">Fetching coordinates via Nominatim</p>
                </div>
              </div>
            )}
            {result && waypoints.length > 0 && (
              <MapContainer
                center={[
                  (result.data.origin.coordinates.latitude + result.data.destination.coordinates.latitude) / 2,
                  (result.data.origin.coordinates.longitude + result.data.destination.coordinates.longitude) / 2,
                ]}
                zoom={4}
                scrollWheelZoom
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com">CARTO</a>'
                />

                <FitBounds waypoints={waypoints} />

                {/* Animated polyline — shadow layer */}
                {polylinePoints.length > 1 && (
                  <Polyline
                    positions={polylinePoints}
                    pathOptions={{ color: '#22d3ee', weight: 6, opacity: 0.15 }}
                  />
                )}

                {/* Main animated polyline */}
                {polylinePoints.length > 1 && (
                  <Polyline
                    positions={polylinePoints}
                    pathOptions={{
                      color: srcInfo?.color ?? '#22d3ee',
                      weight: 3,
                      opacity: 0.95,
                      dashArray: animationStep < waypoints.length ? '8 6' : undefined,
                    }}
                  />
                )}

                {/* Origin marker */}
                <Marker
                  position={[
                    result.data.origin.coordinates.latitude,
                    result.data.origin.coordinates.longitude,
                  ]}
                  icon={portIcon('#34d399')}
                >
                  <Popup>
                    <div className="text-slate-800">
                      <p className="font-bold">🟢 Origin</p>
                      <p className="text-xs mt-1">{result.data.origin.displayName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {result.data.origin.coordinates.latitude.toFixed(5)}, {result.data.origin.coordinates.longitude.toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Destination marker */}
                <Marker
                  position={[
                    result.data.destination.coordinates.latitude,
                    result.data.destination.coordinates.longitude,
                  ]}
                  icon={portIcon('#f43f5e')}
                >
                  <Popup>
                    <div className="text-slate-800">
                      <p className="font-bold">🔴 Destination</p>
                      <p className="text-xs mt-1">{result.data.destination.displayName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {result.data.destination.coordinates.latitude.toFixed(5)}, {result.data.destination.coordinates.longitude.toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            )}
          </div>

          {/* Map legend */}
          {result && (
            <div className="mt-3 flex flex-wrap items-center gap-4 px-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-400">Origin: {result.data.origin.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="text-xs text-slate-400">Destination: {result.data.destination.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-8 rounded" style={{ background: srcInfo?.color }} />
                <span className="text-xs text-slate-400">{srcInfo?.label}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
