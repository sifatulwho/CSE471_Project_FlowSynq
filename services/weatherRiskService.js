const axios = require('axios');
const weatherCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
let warnedMissingWeatherEnv = false;

const HIGH_WIND_MS = 12.86; // ~25 knots

const getRiskLevel = (score) => {
  if (score >= 76) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 26) return 'medium';
  return 'low';
};

const buildCacheKey = (lat, lon) => `${lat.toFixed(2)}:${lon.toFixed(2)}`;

const fetchWeather = async (latitude, longitude) => {
  const key = buildCacheKey(latitude, longitude);
  const cached = weatherCache.get(key);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.data;
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  const apiUrl = process.env.OPENWEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';
  if (!apiKey) {
    if (!warnedMissingWeatherEnv) {
      warnedMissingWeatherEnv = true;
      console.warn('[weatherRiskService] OPENWEATHER_API_KEY missing. Using fallback weather profile.');
    }
    return {
      list: Array.from({ length: 6 }, (_, idx) => ({
        dt: Math.floor((Date.now() + idx * 3 * 60 * 60 * 1000) / 1000),
        wind: { speed: 6 },
        weather: [{ main: 'Clear', description: 'fallback clear weather' }],
        main: { temp: 28 },
        visibility: 10000,
      })),
    };
  }

  const url = new URL(`${apiUrl}/forecast`);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('appid', apiKey);
  url.searchParams.set('units', 'metric');

  const response = await axios.get(url.toString());
  const data = response.data;
  weatherCache.set(key, { fetchedAt: Date.now(), data });
  return data;
};

const assessSingleForecast = (item) => {
  const wind = Number(item?.wind?.speed || 0); // m/s
  const condition = String(item?.weather?.[0]?.main || '').toLowerCase();
  const description = String(item?.weather?.[0]?.description || '');
  const visibility = Number(item?.visibility || 10000);

  const rules = [];
  // Lowered threshold to be more sensitive for testing
  if (wind >= 8.0) rules.push({ type: 'moderate_wind', severity: wind >= 15 ? 'critical' : 'medium', score: 15 });
  if (condition.includes('storm') || condition.includes('thunder') || description.includes('heavy')) {
    rules.push({ type: 'storm_conditions', severity: 'critical', score: 40 });
  }
  
  // Ignore "light" precipitation to avoid spamming the map with minor alerts
  if ((condition.includes('rain') || condition.includes('snow') || condition.includes('drizzle')) && !description.includes('light')) {
    rules.push({ type: 'precipitation', severity: 'medium', score: 15 });
  }
  if (visibility < 5000) rules.push({ type: 'reduced_visibility', severity: 'medium', score: 15 });

  return {
    isRisky: rules.length > 0,
    score: Math.min(100, rules.reduce((sum, rule) => sum + rule.score, 0)),
    rules,
    description: description || rules.map(r => r.type.replace('_', ' ')).join(', ') || 'Fair weather',
  };
};

const assessWeatherRisk = async ({ routeData, estimatedArrivalTime }) => {
  const waypoints = routeData?.waypoints || [];
  if (!waypoints.length) {
    return {
      overallRiskScore: 0,
      riskLevel: 'low',
      weatherAlerts: [],
      forecasts: [],
      assessedAt: new Date(),
      nextAssessmentDue: new Date(Date.now() + 6 * 60 * 60 * 1000),
      predictedDelayHours: 0,
      weatherDelayReason: '',
    };
  }

  const sampleWaypoints = waypoints.filter((_, index) => index % 10 === 0 || index === waypoints.length - 1);
  const allForecasts = [];
  const weatherAlerts = [];
  let totalScore = 0;
  let riskyPointCount = 0;

  const now = Date.now();
  const arrival = estimatedArrivalTime ? new Date(estimatedArrivalTime).getTime() : now + 48 * 60 * 60 * 1000;

  for (const waypoint of sampleWaypoints) {
    try {
      const weatherData = await fetchWeather(waypoint.latitude, waypoint.longitude);
      const entries = Array.isArray(weatherData?.list) ? weatherData.list : [];
      
      // Ensure we check at least the first 3 entries even if arrival time is very soon
      const validEntries = entries.filter((entry) => (entry.dt * 1000) >= now && (entry.dt * 1000) <= (arrival + 3600000));
      const pointEntries = validEntries.length ? validEntries.slice(0, 5) : entries.slice(0, 3);

      for (const entry of pointEntries) {
        const assessed = assessSingleForecast(entry);
        allForecasts.push({
          waypoint: { latitude: waypoint.latitude, longitude: waypoint.longitude, sequence: waypoint.sequence },
          timestamp: new Date(entry.dt * 1000).toISOString(),
          wind: entry.wind,
          weather: entry.weather,
          main: entry.main,
          visibility: entry.visibility,
          riskScore: assessed.score,
          rules: assessed.rules,
        });
        
        if (assessed.isRisky) {
          riskyPointCount += 1;
          totalScore += assessed.score;
          assessed.rules.forEach((rule) => {
            weatherAlerts.push({
              location: `${waypoint.latitude.toFixed(2)}, ${waypoint.longitude.toFixed(2)}`,
              latitude: waypoint.latitude,
              longitude: waypoint.longitude,
              alertType: rule.type,
              severity: rule.severity,
              expectedTime: new Date(entry.dt * 1000),
              description: `At ${waypoint.latitude.toFixed(2)}, ${waypoint.longitude.toFixed(2)}: ${rule.type.replace('_', ' ')} detected. ${assessed.description}.`,
            });
          });
        }
      }
    } catch (error) {
      console.error('[weatherRiskService] Fetch error:', error.message);
    }
  }

  const denominator = Math.max(1, allForecasts.length);
  const ratioScore = (riskyPointCount / denominator) * 60;
  const avgSeverity = riskyPointCount > 0 ? (totalScore / riskyPointCount) : 0;
  const severityScore = Math.min(40, avgSeverity);
  
  const overallRiskScore = Math.max(0, Math.min(100, Math.round(ratioScore + severityScore)));
  const riskLevel = getRiskLevel(overallRiskScore);

  console.log(`[weatherRiskService] Assessment complete. Score: ${overallRiskScore}, Risky Points: ${riskyPointCount}/${denominator}`);

  // Calculate realistic delay (or zero if conditions are clear)
  // Each forecast entry covers a 3-hour window
  const predictedDelayHours = Math.max(0, riskyPointCount * 3);

  let weatherDelayReason = '';
  if (predictedDelayHours > 0) {
    const mainIssue = weatherAlerts[0]?.description || `Adverse weather conditions`;
    weatherDelayReason = `Predicted ${predictedDelayHours}h delay based on forecast parsing. ${mainIssue}`;
  }

  return {
    overallRiskScore,
    riskLevel,
    weatherAlerts: weatherAlerts.slice(0, 20),
    forecasts: allForecasts,
    assessedAt: new Date(),
    nextAssessmentDue: new Date(Date.now() + 6 * 60 * 60 * 1000),
    predictedDelayHours,
    weatherDelayReason,
  };
};

module.exports = { assessWeatherRisk, getRiskLevel };
