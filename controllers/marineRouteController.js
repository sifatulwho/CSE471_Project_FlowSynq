const { geocodePort } = require('../services/portGeocodingService');

// searoute-js is a pure-JS port of eurostat/searoute — fully free, no API key
let sr;
try {
  sr = require('searoute-js');
} catch (e) {
  sr = null;
}

/**
 * POST /api/marine-route/calculate
 * Body: { originPort: string, destinationPort: string }
 *
 * Workflow:
 *  1. Geocode both port names via Nominatim (free)
 *  2. Feed [lon, lat] pairs into searoute-js
 *  3. Return GeoJSON waypoints + distance + source coords
 */
const calculateMarineRoute = async (req, res) => {
  try {
    const { originPort, destinationPort } = req.body;

    if (!originPort || !destinationPort) {
      return res.status(400).json({
        success: false,
        message: 'originPort and destinationPort are required.',
      });
    }

    // Step 1 – Geocode both ports in parallel
    const [originGeo, destGeo] = await Promise.all([
      geocodePort(originPort),
      geocodePort(destinationPort),
    ]);

    const originCoords = { latitude: originGeo.latitude, longitude: originGeo.longitude };
    const destCoords   = { latitude: destGeo.latitude,   longitude: destGeo.longitude };

    // searoute-js expects [longitude, latitude]
    const from = [originGeo.longitude, originGeo.latitude];
    const to   = [destGeo.longitude,   destGeo.latitude];

    let waypoints = [];
    let totalDistanceNM = null;
    let routeSource = 'haversine-fallback';

    // Step 2 – Try searoute-js (shipping lane routing, free)
    // NOTE: searoute-js exports the routing function directly — call sr(from, to)
    // The returned length is already in nautical miles (units: 'nm')
    if (sr) {
      try {
        const route = sr(from, to);
        if (route && route.geometry && route.geometry.coordinates && route.geometry.coordinates.length > 1) {
          waypoints = route.geometry.coordinates.map(([lon, lat], i) => ({
            latitude: lat,
            longitude: lon,
            sequence: i + 1,
          }));

          // length is in nautical miles already
          const lengthNM = route.properties?.length ?? null;
          if (lengthNM !== null) {
            totalDistanceNM = Number(Number(lengthNM).toFixed(2));
          }
          routeSource = 'searoute-js';
        }
      } catch (searouteErr) {
        console.warn('[marineRouteController] searoute-js failed, using haversine fallback:', searouteErr.message);
      }
    }

    // Step 3 – Haversine interpolation fallback when searoute-js has no path
    if (!waypoints.length) {
      const EARTH_RADIUS_NM = 3440.065;
      const toRad = (d) => (d * Math.PI) / 180;

      const dLat = toRad(destCoords.latitude  - originCoords.latitude);
      const dLon = toRad(destCoords.longitude - originCoords.longitude);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLon / 2) ** 2 *
          Math.cos(toRad(originCoords.latitude)) *
          Math.cos(toRad(destCoords.latitude));
      const dist = EARTH_RADIUS_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistanceNM = Number(dist.toFixed(2));

      const STEPS = 20;
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        waypoints.push({
          latitude:  Number((originCoords.latitude  + (destCoords.latitude  - originCoords.latitude)  * t).toFixed(6)),
          longitude: Number((originCoords.longitude + (destCoords.longitude - originCoords.longitude) * t).toFixed(6)),
          sequence: i + 1,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        origin: {
          name: originPort,
          displayName: originGeo.displayName,
          coordinates: originCoords,
        },
        destination: {
          name: destinationPort,
          displayName: destGeo.displayName,
          coordinates: destCoords,
        },
        waypoints,
        totalDistanceNM,
        totalDistanceKM: totalDistanceNM ? Number((totalDistanceNM * 1.852).toFixed(2)) : null,
        routeSource,
        fetchedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[marineRouteController] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate marine route.',
    });
  }
};

module.exports = { calculateMarineRoute };
