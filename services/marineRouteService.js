// marineRouteService.js
// Uses searoute-js (free, offline, Apache 2.0) — no API key needed.
// searoute-js is the JS port of eurostat/searoute which uses the
// Oak Ridge National Labs global shipping lane network.

const EARTH_RADIUS_NM = 3440.065;
const toRad = (deg) => (deg * Math.PI) / 180;

// Haversine distance in nautical miles
const haversineDistanceNM = (from, to) => {
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude));
  return EARTH_RADIUS_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Smooth great-circle arc interpolation fallback
const interpolateWaypoints = (start, end, count = 24) => {
  const waypoints = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    waypoints.push({
      latitude:  Number((start.latitude  + (end.latitude  - start.latitude)  * t).toFixed(6)),
      longitude: Number((start.longitude + (end.longitude - start.longitude) * t).toFixed(6)),
      sequence: i + 1,
    });
  }
  return waypoints;
};

// Load searoute-js once (pure-JS offline shipping-lane library, no API key)
let sr = null;
try {
  sr = require('searoute-js');
  // searoute-js exports the routing function itself directly (typeof sr === 'function')
  if (typeof sr !== 'function') {
    console.warn('[marineRouteService] searoute-js loaded but export is not a function. Haversine fallback active.');
    sr = null;
  }
} catch (e) {
  console.warn('[marineRouteService] searoute-js not available, using haversine fallback:', e.message);
}

/**
 * calculateRoute({ startingPort, destinationPort })
 *
 * Both ports must have a `coordinates` object: { latitude, longitude }
 *
 * Returns: { totalDistanceNM, totalDistanceKM, waypoints, routeApiSource, fetchedAt }
 *
 * Route source priority:
 *   1. searoute-js  — real global shipping lane network (free, offline)
 *   2. haversine    — great-circle straight line fallback (24 interpolated points)
 */
const calculateRoute = async ({ startingPort, destinationPort }) => {
  const start = startingPort?.coordinates;
  const end   = destinationPort?.coordinates;

  if (!start || !end) {
    throw new Error('Starting and destination coordinates are required.');
  }

  // searoute-js expects [longitude, latitude] (GeoJSON order)
  const from = [start.longitude, start.latitude];
  const to   = [end.longitude,   end.latitude];

  // ── Try searoute-js (real shipping lane routing) ───────────────────────
  if (sr) {
    try {
      const route = sr(from, to);   // NOTE: call sr() directly, not sr.searoute()

      if (route && route.geometry?.coordinates?.length > 1) {
        const waypoints = route.geometry.coordinates.map(([lon, lat], i) => ({
          latitude:  lat,
          longitude: lon,
          sequence:  i + 1,
        }));

        // length is in nautical miles (units: 'nm')
        const totalDistanceNM = Number(Number(route.properties?.length ?? 0).toFixed(2));

        return {
          totalDistanceNM,
          totalDistanceKM: Number((totalDistanceNM * 1.852).toFixed(2)),
          waypoints,
          routeApiSource: 'searoute-js',
          fetchedAt: new Date(),
        };
      }

      console.warn('[marineRouteService] searoute-js returned null/empty route — falling back to haversine.');
    } catch (err) {
      console.warn('[marineRouteService] searoute-js threw error, using haversine fallback:', err.message);
    }
  }

  // ── Great-circle haversine fallback ───────────────────────────────────
  const totalDistanceNM = Number(haversineDistanceNM(start, end).toFixed(2));
  return {
    totalDistanceNM,
    totalDistanceKM: Number((totalDistanceNM * 1.852).toFixed(2)),
    waypoints: interpolateWaypoints(start, end, 24),
    routeApiSource: 'haversine-fallback',
    fetchedAt: new Date(),
  };
};

module.exports = { calculateRoute };
