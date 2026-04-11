const Shipment = require('../models/Shipment');
const { getPredefinedDocks } = require('./predefinedDocks');

// Only these statuses occupy a dock
const OCCUPYING_STATUSES = new Set([
  'docked',
  'unloading',
]);

// Normalize helpers
const normalize = (val) => String(val || '').trim().toLowerCase();

const getDockStatusForPort = async ({ portName }) => {
  const normalizedPort = String(portName || '').trim();
  const docks = getPredefinedDocks(normalizedPort);

  // Fetch all shipments with assigned docks for that port
  const shipments = await Shipment.find({
    portName: normalizedPort,
    assignedDock: { $exists: true, $ne: '' },
  })
    .select('assignedDock status')
    .lean();

  // Count occupied docks
  const occupiedMap = {};

  for (const shipment of shipments) {
    const status = normalize(shipment.status);

    // Only count if status is occupying
    if (!OCCUPYING_STATUSES.has(status)) continue;

    const dockKey = normalize(shipment.assignedDock);
    occupiedMap[dockKey] = (occupiedMap[dockKey] || 0) + 1;
  }

  // Build final dock status
  return docks.map((dock) => {
    const dockKey = normalize(dock.dockName);
    const occupiedShips = occupiedMap[dockKey] || 0;

    const capacity = Number(dock.dockCapacity || 0);
    const dockVacancy = Math.max(0, capacity - occupiedShips);

    return {
      ...dock,
      occupiedShips,
      dockVacancy,
    };
  });
};

module.exports = {
  getDockStatusForPort,
  OCCUPYING_STATUSES,
};