/**
 * Port definitions with coordinates for geolocation-based route calculation.
 * Used consistently across shipment, demand, and demo data generation.
 */

const PORT_OPTIONS = [
  // Bangladesh
  { name: 'Chattogram Port', code: 'CTG', coordinates: { latitude: 22.335, longitude: 91.832 }, region: 'South Asia' },
  { name: 'Mongla Port', code: 'MGL', coordinates: { latitude: 22.466, longitude: 89.600 }, region: 'South Asia' },
  { name: 'Payra Port', code: 'PYR', coordinates: { latitude: 21.733, longitude: 89.963 }, region: 'South Asia' },

  // South Asia
  { name: 'Port of Colombo', code: 'CMB', coordinates: { latitude: 6.933, longitude: 79.847 }, region: 'South Asia' },
  { name: 'Port of Mumbai', code: 'MUM', coordinates: { latitude: 18.930, longitude: 72.822 }, region: 'South Asia' },
  { name: 'Port of Karachi', code: 'KHI', coordinates: { latitude: 24.796, longitude: 66.981 }, region: 'South Asia' },
  { name: 'Port Qasim', code: 'QAS', coordinates: { latitude: 24.640, longitude: 67.386 }, region: 'South Asia' },
  { name: 'Port of Chabahar', code: 'CHA', coordinates: { latitude: 25.290, longitude: 60.647 }, region: 'Middle East' },

  // Southeast & East Asia
  { name: 'Port of Singapore', code: 'SGP', coordinates: { latitude: 1.264, longitude: 103.840 }, region: 'Southeast Asia' },
  { name: 'Port Klang', code: 'PKG', coordinates: { latitude: 2.994, longitude: 101.381 }, region: 'Southeast Asia' },
  { name: 'Tanjung Pelepas Port', code: 'TAN', coordinates: { latitude: 1.313, longitude: 103.306 }, region: 'Southeast Asia' },
  { name: 'Port of Laem Chabang', code: 'LCB', coordinates: { latitude: 13.100, longitude: 100.876 }, region: 'Southeast Asia' },
  { name: 'Port of Jakarta (Tanjung Priok)', code: 'CGK', coordinates: { latitude: -6.117, longitude: 106.865 }, region: 'Southeast Asia' },
  { name: 'Port of Manila', code: 'MNL', coordinates: { latitude: 14.596, longitude: 120.974 }, region: 'Southeast Asia' },
  { name: 'Port of Shanghai', code: 'SHA', coordinates: { latitude: 31.230, longitude: 121.473 }, region: 'East Asia' },
  { name: 'Port of Ningbo-Zhoushan', code: 'NGB', coordinates: { latitude: 29.866, longitude: 121.544 }, region: 'East Asia' },
  { name: 'Port of Shenzhen', code: 'SZX', coordinates: { latitude: 22.600, longitude: 113.927 }, region: 'East Asia' },
  { name: 'Port of Guangzhou', code: 'CAN', coordinates: { latitude: 23.129, longitude: 113.258 }, region: 'East Asia' },
  { name: 'Port of Qingdao', code: 'TAO', coordinates: { latitude: 35.959, longitude: 120.767 }, region: 'East Asia' },
  { name: 'Port of Tianjin', code: 'TJN', coordinates: { latitude: 39.002, longitude: 117.701 }, region: 'East Asia' },
  { name: 'Port of Hong Kong', code: 'HKG', coordinates: { latitude: 22.302, longitude: 114.177 }, region: 'East Asia' },
  { name: 'Port of Busan', code: 'PUS', coordinates: { latitude: 35.104, longitude: 129.037 }, region: 'East Asia' },
  { name: 'Port of Yokohama', code: 'YOK', coordinates: { latitude: 35.443, longitude: 139.636 }, region: 'East Asia' },
  { name: 'Port of Tokyo', code: 'TKY', coordinates: { latitude: 35.629, longitude: 139.775 }, region: 'East Asia' },

  // Middle East
  { name: 'Port of Jebel Ali', code: 'JEA', coordinates: { latitude: 25.010, longitude: 55.060 }, region: 'Middle East' },
  { name: 'Port of Khalifa', code: 'KHA', coordinates: { latitude: 25.278, longitude: 55.291 }, region: 'Middle East' },
  { name: 'Port Rashid', code: 'RAS', coordinates: { latitude: 25.282, longitude: 55.286 }, region: 'Middle East' },
  { name: 'Port of Dammam', code: 'DMM', coordinates: { latitude: 26.479, longitude: 50.101 }, region: 'Middle East' },
  { name: 'Port of Jeddah', code: 'JED', coordinates: { latitude: 21.542, longitude: 39.172 }, region: 'Middle East' },
  { name: 'Port of Salalah', code: 'SLL', coordinates: { latitude: 17.061, longitude: 54.084 }, region: 'Middle East' },
  { name: 'Port of Sohar', code: 'SHR', coordinates: { latitude: 24.353, longitude: 56.749 }, region: 'Middle East' },
  { name: 'Port of Kuwait', code: 'KWT', coordinates: { latitude: 29.362, longitude: 47.806 }, region: 'Middle East' },
  { name: 'Port of Hamad', code: 'HAM', coordinates: { latitude: 25.262, longitude: 50.772 }, region: 'Middle East' },
  { name: 'Port of Aden', code: 'ADE', coordinates: { latitude: 12.782, longitude: 45.028 }, region: 'Middle East' },

  // Europe
  { name: 'Port of Rotterdam', code: 'RTM', coordinates: { latitude: 51.905, longitude: 4.435 }, region: 'Europe' },
  { name: 'Port of Antwerp-Bruges', code: 'ANR', coordinates: { latitude: 51.268, longitude: 4.380 }, region: 'Europe' },
  { name: 'Port of Hamburg', code: 'HAM', coordinates: { latitude: 53.546, longitude: 9.966 }, region: 'Europe' },
  { name: 'Port of Bremerhaven', code: 'BRM', coordinates: { latitude: 53.516, longitude: 8.572 }, region: 'Europe' },
  { name: 'Port of Felixstowe', code: 'FEL', coordinates: { latitude: 51.956, longitude: 1.353 }, region: 'Europe' },
  { name: 'Port of London', code: 'LON', coordinates: { latitude: 51.510, longitude: 0.076 }, region: 'Europe' },
  { name: 'Port of Le Havre', code: 'LHR', coordinates: { latitude: 49.394, longitude: 0.107 }, region: 'Europe' },
  { name: 'Port of Marseille-Fos', code: 'MRS', coordinates: { latitude: 43.327, longitude: 4.948 }, region: 'Europe' },
  { name: 'Port of Genoa', code: 'GEN', coordinates: { latitude: 44.413, longitude: 8.931 }, region: 'Europe' },
  { name: 'Port of Valencia', code: 'VLC', coordinates: { latitude: 39.289, longitude: -0.315 }, region: 'Europe' },
  { name: 'Port of Barcelona', code: 'BCN', coordinates: { latitude: 41.402, longitude: 2.225 }, region: 'Europe' },
  { name: 'Port of Piraeus', code: 'PIR', coordinates: { latitude: 37.927, longitude: 23.634 }, region: 'Europe' },

  // North America
  { name: 'Port of Los Angeles', code: 'LAX', coordinates: { latitude: 33.736, longitude: -118.261 }, region: 'North America' },
  { name: 'Port of Long Beach', code: 'LGB', coordinates: { latitude: 33.742, longitude: -118.202 }, region: 'North America' },
  { name: 'Port of Oakland', code: 'OAK', coordinates: { latitude: 37.806, longitude: -122.272 }, region: 'North America' },
  { name: 'Port of Seattle', code: 'SEA', coordinates: { latitude: 47.603, longitude: -122.330 }, region: 'North America' },
  { name: 'Port of Tacoma', code: 'TAC', coordinates: { latitude: 47.265, longitude: -122.438 }, region: 'North America' },
  { name: 'Port of Vancouver', code: 'YVR', coordinates: { latitude: 49.203, longitude: -123.179 }, region: 'North America' },
  { name: 'Port of Prince Rupert', code: 'YPR', coordinates: { latitude: 54.305, longitude: -130.333 }, region: 'North America' },
  { name: 'Port of New York', code: 'NYK', coordinates: { latitude: 40.660, longitude: -74.038 }, region: 'North America' },
  { name: 'Port of Savannah', code: 'SAV', coordinates: { latitude: 32.076, longitude: -81.091 }, region: 'North America' },
  { name: 'Port of Charleston', code: 'CHS', coordinates: { latitude: 32.780, longitude: -79.968 }, region: 'North America' },
  { name: 'Port of Miami', code: 'MIA', coordinates: { latitude: 25.757, longitude: -80.228 }, region: 'North America' },
  { name: 'Port of Houston', code: 'HOU', coordinates: { latitude: 29.731, longitude: -95.002 }, region: 'North America' },
  { name: 'Port of Montreal', code: 'YUL', coordinates: { latitude: 45.425, longitude: -73.550 }, region: 'North America' },

  // South America
  { name: 'Port of Santos', code: 'SAO', coordinates: { latitude: -23.961, longitude: -46.303 }, region: 'South America' },
  { name: 'Port of Rio de Janeiro', code: 'RIO', coordinates: { latitude: -22.876, longitude: -43.182 }, region: 'South America' },
  { name: 'Port of Buenos Aires', code: 'BUE', coordinates: { latitude: -34.608, longitude: -58.362 }, region: 'South America' },
  { name: 'Port of Callao', code: 'CAL', coordinates: { latitude: -12.051, longitude: -77.129 }, region: 'South America' },
  { name: 'Port of Cartagena', code: 'CTG', coordinates: { latitude: 10.393, longitude: -75.530 }, region: 'South America' },
  { name: 'Port of Valparaiso', code: 'VLP', coordinates: { latitude: -33.048, longitude: -71.622 }, region: 'South America' },

  // Africa
  { name: 'Port of Durban', code: 'DUR', coordinates: { latitude: -29.858, longitude: 31.031 }, region: 'Africa' },
  { name: 'Port of Cape Town', code: 'CPT', coordinates: { latitude: -33.925, longitude: 18.418 }, region: 'Africa' },
  { name: 'Port of Mombasa', code: 'MBA', coordinates: { latitude: -4.038, longitude: 39.666 }, region: 'Africa' },
  { name: 'Port of Dar es Salaam', code: 'DAR', coordinates: { latitude: -6.802, longitude: 39.202 }, region: 'Africa' },
  { name: 'Port of Djibouti', code: 'DJI', coordinates: { latitude: 11.586, longitude: 43.150 }, region: 'Africa' },
  { name: 'Port of Alexandria', code: 'ALX', coordinates: { latitude: 31.203, longitude: 29.958 }, region: 'Africa' },
  { name: 'Port Said', code: 'PSD', coordinates: { latitude: 31.267, longitude: 32.302 }, region: 'Africa' },
  { name: 'Port of Lagos', code: 'LOS', coordinates: { latitude: 6.457, longitude: 3.361 }, region: 'Africa' },
  { name: 'Port of Tema', code: 'TEM', coordinates: { latitude: 5.652, longitude: -0.016 }, region: 'Africa' },

  // Oceania
  { name: 'Port of Sydney', code: 'SYD', coordinates: { latitude: -33.865, longitude: 151.209 }, region: 'Oceania' },
  { name: 'Port of Melbourne', code: 'MEL', coordinates: { latitude: -37.815, longitude: 144.966 }, region: 'Oceania' },
  { name: 'Port of Brisbane', code: 'BNE', coordinates: { latitude: -27.394, longitude: 153.172 }, region: 'Oceania' },
  { name: 'Port of Auckland', code: 'AKL', coordinates: { latitude: -37.008, longitude: 174.791 }, region: 'Oceania' },
];

const COMMODITY_TYPES = [
  'CONTAINER',
  'GENERAL CARGO',
  'FOOD GRAIN',
  'FERTILIZER',
  'C/CLINKER',
  'SUGAR',
  'SALT',
  'RAPE SEED',
  'M/SEED',
  'OIL TANKER',
];

const COMMODITY_MAP = {
  'CONTAINER': 'Container',
  'GENERAL CARGO': 'General Cargo',
  'FOOD GRAIN': 'Food Grain',
  'FERTILIZER': 'Fertilizer',
  'C/CLINKER': 'Clinker',
  'SUGAR': 'Sugar',
  'SALT': 'Salt',
  'RAPE SEED': 'Rapeseed',
  'M/SEED': 'Mustard Seed',
  'OIL TANKER': 'Oil Tanker',
};

const BERTH_LOCATIONS = [
  'GCB',        // General Cargo Berth
  'NCT',        // New Container Terminal
  'CCT',        // Container Cargo Terminal
  'Jetty 1',
  'Jetty 2',
];

const REGIONS = [
  'South Asia',
  'Southeast Asia',
  'East Asia',
  'Middle East',
  'Europe',
  'North America',
  'South America',
  'Africa',
  'Oceania',
];

module.exports = {
  PORT_OPTIONS,
  COMMODITY_TYPES,
  COMMODITY_MAP,
  BERTH_LOCATIONS,
  REGIONS,
};
