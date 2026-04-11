const GAS_GROUPS = [
  ['LNG', 'CNG'],
  ['Diesel', 'Petrol', 'Jet Fuel'],
  ['LPG', 'Chemical Gas', 'Crude Oil', 'Petroleum'],
];

const HANDLING_TIMES = [5, 6, 7, 8, 9];
const DISTANCES = [1.2, 1.8, 2.4, 3.1, 3.8, 4.5];

const createDock = (index, portName) => {
  const i = index - 1;
  const capacity = 5 + (i % 3); // ships
  const supportedGasTypes = GAS_GROUPS[i % GAS_GROUPS.length];
  return {
    dockId: `JETTY-${index}`,
    dockName: `Jetty ${index}`,
    portName,
    dockCapacity: capacity,
    supportedGasTypes,
    averageHandlingTime: HANDLING_TIMES[i % HANDLING_TIMES.length],
    distanceToTank: DISTANCES[i % DISTANCES.length],
    status: i % 11 === 0 ? 'maintenance' : 'active',
  };
};

const getPredefinedDocks = (portName) => {
  const normalizedPort = String(portName || '').trim() || 'Default Port';
  return Array.from({ length: 30 }, (_, idx) => createDock(idx + 1, normalizedPort));
};

module.exports = { getPredefinedDocks };
