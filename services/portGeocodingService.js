const axios = require("axios");

const DEFAULT_USER_AGENT = "Flowsync-Port-Geocoder/1.0";

const NOMINATIM_BASE_URL = (
  process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org"
).trim();

const resolveUserAgent = () => {
  const configured = (process.env.NOMINATIM_USER_AGENT || "").trim();
  if (!configured || /example\.com|your-email|placeholder/i.test(configured)) {
    return DEFAULT_USER_AGENT;
  }
  return configured;
};

const USER_AGENT = resolveUserAgent();

// Simple in-memory cache for project/demo use
const cache = new Map();
let lastRequestAt = 0;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const throttleNominatim = async () => {
  const now = Date.now();
  const elapsed = now - lastRequestAt;

  if (elapsed < 1100) {
    await wait(1100 - elapsed);
  }

  lastRequestAt = Date.now();
};

const normalizeResult = (result, originalQuery) => ({
  query: originalQuery,
  displayName: result.display_name,
  latitude: Number(result.lat),
  longitude: Number(result.lon),
  osmType: result.osm_type,
  osmId: result.osm_id,
  category: result.category || result.class,
  type: result.type,
  importance: result.importance,
  boundingBox: result.boundingbox,
  source: "OpenStreetMap Nominatim API",
});

const geocodePort = async (portName, countryCode) => {
  if (!portName || !portName.trim()) {
    throw new Error("Port name is required.");
  }

  const cleanPortName = portName.trim();
  const cacheKey = `${cleanPortName.toLowerCase()}-${countryCode || "any"}`;

  if (cache.has(cacheKey)) {
    return {
      ...cache.get(cacheKey),
      cached: true,
    };
  }

  await throttleNominatim();

  const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
    params: {
      q: cleanPortName,
      format: "jsonv2",
      limit: 5,
      addressdetails: 1,
      extratags: 1,
      namedetails: 1,
      countrycodes: countryCode || undefined,
    },
    headers: {
      "User-Agent": USER_AGENT,
      Referer: (process.env.CLIENT_URL || "http://localhost:5173").trim(),
    },
    timeout: 15000,
  });

  const results = response.data || [];

  if (!results.length) {
    throw new Error("No location found for this port name.");
  }

  // Prefer results that look maritime/port-related
  const preferred =
    results.find((item) =>
      String(item.display_name || "").toLowerCase().includes("port")
    ) || results[0];

  const data = normalizeResult(preferred, cleanPortName);

  cache.set(cacheKey, data);

  return {
    ...data,
    cached: false,
  };
};

module.exports = {
  geocodePort,
};