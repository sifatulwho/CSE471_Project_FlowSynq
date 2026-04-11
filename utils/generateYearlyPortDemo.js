const Shipment = require('../models/Shipment');
const DailyPortOps = require('../models/DailyPortOps');
const { syncDailyOpsToDemand } = require('./syncDailyOpsToDemand');
const { PORT_OPTIONS, COMMODITY_TYPES, COMMODITY_MAP, BERTH_LOCATIONS } = require('../constants/ports');

function seedFromString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function weightedStatus(rng) {
  const p = rng();
  if (p < 0.35) return 'En Route';
  if (p < 0.6) return 'Docked';
  if (p < 0.75) return 'Unloading';
  if (p < 0.9) return 'Unloaded';
  return 'Delayed';
}

function pickPortForDay(rng, fixedPortName) {
  if (fixedPortName) {
    const fixed = PORT_OPTIONS.find((p) => p.name === fixedPortName);
    if (fixed) return fixed;
    return PORT_OPTIONS.find((p) => p.name.includes(fixedPortName)) || PORT_OPTIONS[0];
  }
  // Weight Chattogram Port (70% chance) to generate more data there
  const p = rng();
  if (p < 0.7) {
    return PORT_OPTIONS.find((p) => p.name === 'Chattogram Port');
  }
  // 30% chance for other ports
  return PORT_OPTIONS[randInt(rng, 0, PORT_OPTIONS.length - 1)];
}

function pickOtherPort(rng, currentCode) {
  const options = PORT_OPTIONS.filter((p) => p.code !== currentCode);
  return options[randInt(rng, 0, options.length - 1)] || PORT_OPTIONS[0];
}

async function generateYearlyPortDemo({
  portName,
  days = 365,
  berthCapacity = 2500,
  startDate: startDateInput,
  userId,
  role = 'admin',
}) {
  const fixedPort = String(portName || '').trim();
  const d = Math.min(3650, Math.max(1, Number(days) || 365));
  const cap = Math.max(1000, Number(berthCapacity) || 2500);

  const startDate = startDateInput
    ? new Date(`${String(startDateInput).trim()}T00:00:00.000Z`)
    : new Date(Date.now() - (d - 1) * 86400000);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid startDate.');
  }
  startDate.setUTCHours(0, 0, 0, 0);

  const seedKey = `${fixedPort || 'MULTI_PORT'}|${d}|${startDate.toISOString().slice(0, 10)}`;
  const rng = mulberry32(seedFromString(seedKey));
  const isAdmin = String(role).toLowerCase() === 'admin';
  const uid = userId || undefined;

  const shipmentDocs = [];
  const dailyOpsDocs = [];
  const containerDeliveryQueue = {}; // Track delivered containers for next day

  for (let i = 0; i < d; i += 1) {
    const currentDate = new Date(startDate);
    currentDate.setUTCDate(currentDate.getUTCDate() + i);

    const dayPort = pickPortForDay(rng, fixedPort || null);
    const currentPortName = dayPort.name;
    const currentPortCode = dayPort.code;
    const portKey = currentPortName;
    
    // Initialize if not exists
    if (!containerDeliveryQueue[portKey]) {
      containerDeliveryQueue[portKey] = { remaining: 0, deliverableToday: [] };
    }

    const berthCapacityForDay = randInt(rng, Math.max(1500, cap - 500), cap + 500);
    const shipCount = randInt(rng, 4, 10);

    const shipmentsForDaily = [];
    const statusCounts = { total: 0, delayed: 0 };
    let totalContainersArrived = 0;
    let totalCargoArrived = 0;

    // Generate shipments arriving today
    for (let n = 0; n < shipCount; n += 1) {
      const commodityKey = COMMODITY_TYPES[randInt(rng, 0, COMMODITY_TYPES.length - 1)];
      const commodityLabel = COMMODITY_MAP[commodityKey];
      const status = weightedStatus(rng);

      const arrivalTime = new Date(currentDate);
      arrivalTime.setUTCHours(randInt(rng, 0, 23), randInt(rng, 0, 59), 0, 0);

      const containerCount = randInt(rng, 80, 350);
      const cargoQuantity = randInt(rng, 5000, 25000);
      const assignedDock = BERTH_LOCATIONS[randInt(rng, 0, BERTH_LOCATIONS.length - 1)];
      const destinationPort = pickOtherPort(rng, currentPortCode);
      const shipName = `${currentPortCode}-${dayPort.region?.split(' ')[0] || 'SHP'}-${currentDate.toISOString().slice(0, 10)}-${String(n + 1).padStart(3, '0')}`;

      shipmentDocs.push({
        shipName,
        arrivalTime,
        cargoQuantity,
        containerCount,
        portName: currentPortName,
        assignedDock,
        status,
        commodityType: commodityLabel,
        gasType: commodityLabel,
        startingPort: {
          name: dayPort.name,
          code: dayPort.code,
          coordinates: dayPort.coordinates,
        },
        destinationPort: {
          name: destinationPort.name,
          code: destinationPort.code,
          coordinates: destinationPort.coordinates,
        },
        estimatedArrivalTime: new Date(arrivalTime.getTime() + randInt(rng, 1, 14) * 86400000),
        notes: [{ text: 'Auto-generated demo shipment with realistic port operations.', author: 'DEMO_SEED', createdAt: arrivalTime }],
        statusHistory: [{ status, changedAt: arrivalTime, changedBy: 'DEMO_SEED' }],
      });

      shipmentsForDaily.push({
        shipName,
        status,
        arrivalTime,
        containerCount,
        cargoQuantity,
      });
      
      totalContainersArrived += containerCount;
      totalCargoArrived += cargoQuantity;
      statusCounts.total += 1;
      if (status === 'Delayed') statusCounts.delayed += 1;

      // Add to delivery queue (will be delivered next day in real scenario)
      containerDeliveryQueue[portKey].deliverableToday.push({
        shipName,
        containerCount,
        cargoQuantity,
        commodityKey,
        commodityLabel,
      });
    }

    // Calculate deliveries from previous day's queue
    let totalDelivered = 0;
    const previousRemaining = containerDeliveryQueue[portKey].remaining || 0;
    const commodityRows = [];
    const commodityCounts = {};

    // Process deliveries from queue
    for (const deliverable of containerDeliveryQueue[portKey].deliverableToday) {
      const key = deliverable.commodityKey;
      if (!commodityCounts[key]) {
        commodityCounts[key] = {
          containerCount: 0,
          commodityQuantity: 0,
          containerDelivered: 0,
        };
      }
      
      // Randomly deliver 40-80% of containers from previous day's queue
      const deliveryPercent = randInt(rng, 40, 80) / 100;
      const containerDelivered = Math.floor(deliverable.containerCount * deliveryPercent);
      
      commodityCounts[key].containerCount += deliverable.containerCount;
      commodityCounts[key].commodityQuantity += deliverable.cargoQuantity;
      commodityCounts[key].containerDelivered += containerDelivered;
      totalDelivered += containerDelivered;
    }

    // Build commodity rows
    for (const [commodityKey, counts] of Object.entries(commodityCounts)) {
      commodityRows.push({
        commodityType: COMMODITY_MAP[commodityKey],
        containerCount: counts.containerCount,
        commodityQuantity: counts.commodityQuantity,
        containerDelivered: counts.containerDelivered,
        remainingCommodityContainer: counts.containerCount - counts.containerDelivered,
      });
    }

    // Calculate berth vacancy: capacity - (total arrived + previous remaining - total delivered today)
    const berthVacancy = berthCapacityForDay - (totalContainersArrived + previousRemaining - totalDelivered);
    const remainingContainerForNextDay = totalContainersArrived + previousRemaining - totalDelivered;

    const baseOps = {
      date: currentDate,
      portName: currentPortName,
      shipments: shipmentsForDaily,
      totalContainer: totalContainersArrived,
      totalQuantity: totalCargoArrived,
      totalHandled: totalDelivered,
      remainingContainer: remainingContainerForNextDay,
      totalShipments: statusCounts.total,
      totalDelayedShipments: statusCounts.delayed,
      berthLocation: BERTH_LOCATIONS[randInt(rng, 0, BERTH_LOCATIONS.length - 1)],
      berthCapacity: berthCapacityForDay,
      berthVacancy: Math.max(0, berthVacancy),
      totalDelivered,
      commodities: commodityRows,
    };

    if (isAdmin && uid) {
      Object.assign(baseOps, {
        status: 'approved',
        submittedBy: uid,
        reviewedBy: uid,
        reviewedAt: new Date(),
        rejectionReason: '',
      });
    } else {
      Object.assign(baseOps, {
        status: 'pending',
        submittedBy: uid,
        rejectionReason: '',
      });
    }

    dailyOpsDocs.push(baseOps);

    // Update queue for next day
    containerDeliveryQueue[portKey].remaining = remainingContainerForNextDay;
    containerDeliveryQueue[portKey].deliverableToday = [];
  }

  const [shipIns, opsIns] = await Promise.all([
    Shipment.insertMany(shipmentDocs, { ordered: false }),
    DailyPortOps.insertMany(dailyOpsDocs, { ordered: false }),
  ]);

  let demandRowsUpserted = 0;
  for (const doc of opsIns) {
    const result = await syncDailyOpsToDemand(doc);
    demandRowsUpserted += result.upserted;
  }

  return {
    shipmentsInserted: shipIns.length,
    dailyOpsInserted: opsIns.length,
    demandRowsUpserted,
    portName: fixedPort || 'MULTI_PORT_CHATTOGRAM_PRIORITY',
    days: d,
  };
}

module.exports = { generateYearlyPortDemo };
