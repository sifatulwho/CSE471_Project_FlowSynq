// const Shipment = require('../models/Shipment');
// const DailyPortOps = require('../models/DailyPortOps');



// const getActor = (req) => {
//   const role = req.user?.role ? String(req.user.role).toLowerCase() : 'operator';
//   return req.user?.email || role || 'operator';
// };

// function seedFromString(s) {
//   let h = 2166136261;
//   for (let i = 0; i < s.length; i++) {
//     h ^= s.charCodeAt(i);
//     h = Math.imul(h, 16777619);
//   }
//   return h >>> 0;
// }

// function mulberry32(seed) {
//   let t = seed >>> 0;
//   return function () {
//     t += 0x6D2B79F5;
//     let x = Math.imul(t ^ (t >>> 15), 1 | t);
//     x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
//     return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
//   };
// }

// function randInt(rng, min, max) {
//   return Math.floor(rng() * (max - min + 1)) + min;
// }

// exports.getShipments = async (req, res) => {
//   try {
//     const query = {};
//     const role = String(req.user?.role || '').toLowerCase();
//     const userPort = String(req.user?.portName || '').trim();

//     if (role === 'analyst' && !userPort) {
//       return res.status(400).json({ message: 'Your account is not associated with a port. Please contact admin.' });
//     }

//     if (role !== 'admin' && userPort) {
//       query.portName = userPort;
//     } else if (req.query.portName) {
//       query.portName = String(req.query.portName).trim();
//     }

//     if (req.query.status) {
//       query.status = String(req.query.status);
//     }

//     if (req.query.assignedDock) {
//       query.assignedDock = String(req.query.assignedDock);
//     }

//     const arrivalTime = {};
//     if (req.query.arrivalFrom) {
//       const d = new Date(req.query.arrivalFrom);
//       if (!Number.isNaN(d.getTime())) {
//         arrivalTime.$gte = d;
//       }
//     }
//     if (req.query.arrivalTo) {
//       const d = new Date(req.query.arrivalTo);
//       if (!Number.isNaN(d.getTime())) {
//         arrivalTime.$lte = d;
//       }
//     }

//     // Convenience: date=YYYY-MM-DD filters by that whole local day
//     if (req.query.date) {
//       const raw = String(req.query.date);
//       const start = new Date(`${raw}T00:00:00.000Z`);
//       const end = new Date(`${raw}T23:59:59.999Z`);
//       if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
//         arrivalTime.$gte = start;
//         arrivalTime.$lte = end;
//       }
//     }

//     if (Object.keys(arrivalTime).length) {
//       query.arrivalTime = arrivalTime;
//     }

//     const shipments = await Shipment.find(query).sort({ arrivalTime: -1 });
//     res.json(shipments);
//   } catch (error) {
//     console.error('Get shipments error:', error);
//     res.status(500).json({ message: 'Unable to load shipments.' });
//   }
// };

// // Admin demo generator: creates 365 docked shipments + daily ops rows
// exports.generateDemoShipments365 = async (req, res) => {
//   try {
//     const role = String(req.user?.role || '').toLowerCase();
//     if (role !== 'admin') return res.status(403).json({ message: 'Admins only.' });

//     const days = Math.max(1, Math.min(3650, Number(req.body?.days || 365) || 365));
//     const portName = typeof req.body?.portName === 'string' ? req.body.portName.trim() : 'Chattogram Port';
//     const berthCapacity = Math.max(0, Number(req.body?.berthCapacity || 2500) || 2500);
//     const start = typeof req.body?.startDate === 'string' ? req.body.startDate.trim() : '';
//     const startDate = start ? new Date(`${start}T00:00:00.000Z`) : new Date(Date.now() - (days - 1) * 86400000);
//     startDate.setUTCHours(0, 0, 0, 0);

//     const rng = mulberry32(seedFromString(`${portName}|${days}|${startDate.toISOString().slice(0, 10)}`));
//     const docks = ['GCB', 'NCT', 'CCT', 'JETTY-1', 'JETTY-2'];
//     const commodities = ['LNG', 'LPG', 'Diesel', 'Petrol', 'Jet Fuel'];

//     const shipmentDocs = [];
//     const dailyOpsDocs = [];
//     let previousRemaining = 0;

//     for (let i = 0; i < days; i++) {
//       const dayStart = new Date(startDate);
//       dayStart.setUTCDate(dayStart.getUTCDate() + i);
//       const shipCount = randInt(rng, 1, 4);

//       const shipments = [];
//       for (let n = 0; n < shipCount; n++) {
//         const arrival = new Date(dayStart);
//         arrival.setUTCHours(randInt(rng, 0, 23), randInt(rng, 0, 59), 0, 0);

//         const shipName = `MV-DEMO-${dayStart.toISOString().slice(0, 10)}-${String(n + 1).padStart(2, '0')}`;
//         const containerCount = randInt(rng, 50, 220);
//         const cargoQuantity = randInt(rng, 900, 5200);
//         const assignedDock = docks[randInt(rng, 0, docks.length - 1)];

//         shipmentDocs.push({
//           shipName,
//           arrivalTime: arrival,
//           cargoQuantity,
//           containerCount,
//           portName,
//           assignedDock,
//           status: 'Docked',
//           statusHistory: [{ status: 'Docked', changedAt: arrival, changedBy: 'DEMO_SEED' }],
//         });

//         shipments.push({ shipName, containerCount, cargoQuantity });
//       }

//       const totalContainer = shipments.reduce((a, s) => a + s.containerCount, 0);
//       const totalQuantity = shipments.reduce((a, s) => a + s.cargoQuantity, 0);
//       const totalHandled = randInt(rng, 0, Math.max(0, totalContainer));
//       const remainingContainer = Math.max(0, totalContainer - totalHandled);

//       const rowsCount = randInt(rng, 2, 5);
//       const used = new Set();
//       const commodityRows = [];
//       for (let r = 0; r < rowsCount; r++) {
//         let c = commodities[randInt(rng, 0, commodities.length - 1)];
//         while (used.has(c)) c = commodities[randInt(rng, 0, commodities.length - 1)];
//         used.add(c);
//         const cc = randInt(rng, 10, Math.max(10, Math.floor(totalContainer / 2) || 60));
//         const cd = randInt(rng, 0, cc);
//         const qty = randInt(rng, 200, 2500);
//         commodityRows.push({
//           commodityType: c,
//           containerCount: cc,
//           commodityQuantity: qty,
//           containerDelivered: cd,
//           remainingCommodityContainer: Math.max(0, cc - cd),
//         });
//       }
//       const totalDelivered = commodityRows.reduce((a, r) => a + r.containerDelivered, 0);
//       const berthLocation = docks[randInt(rng, 0, docks.length - 1)];
//       const berthVacancy = berthCapacity - (totalContainer + previousRemaining - totalDelivered);

//       dailyOpsDocs.push({
//         date: dayStart,
//         portName,
//         shipments,
//         totalContainer,
//         totalQuantity,
//         totalHandled,
//         remainingContainer,
//         berthLocation,
//         berthCapacity,
//         berthVacancy,
//         totalDelivered,
//         commodities: commodityRows,
//       });

//       previousRemaining = remainingContainer;
//     }


//     const [shipIns, opsIns] = await Promise.all([
//       Shipment.insertMany(shipmentDocs, { ordered: false }),
//       DailyPortOps.insertMany(dailyOpsDocs, { ordered: false }),
//     ]);


//     return res.status(201).json({
//       message: 'Demo shipments + daily ops generated.',
//       shipmentsInserted: shipIns.length,
//       dailyOpsInserted: opsIns.length,
//       portName,
//       days,
//     });
//   } catch (error) {
//     console.error('Generate demo shipments error:', error);
//     return res.status(500).json({ message: 'Unable to generate demo shipments.' });
//   }
// };

// exports.getShipmentById = async (req, res) => {
//   try {
//     const shipment = await Shipment.findById(req.params.id);
//     if (!shipment) {
//       return res.status(404).json({ message: 'Shipment not found.' });
//     }
//     res.json(shipment);
//   } catch (error) {
//     console.error('Get shipment error:', error);
//     res.status(500).json({ message: 'Unable to load shipment.' });
//   }
// };

// exports.createShipment = async (req, res) => {
//   try {
//     const role = String(req.user?.role || '').toLowerCase();
//     const userPort = String(req.user?.portName || '').trim();
//     const payload = {
//       shipName: req.body.shipName,
//       arrivalTime: req.body.arrivalTime,
//       cargoQuantity: req.body.cargoQuantity,
//       containerCount: req.body.containerCount,
//       portName: role !== 'admin' ? userPort : (typeof req.body.portName === 'string' ? req.body.portName.trim() : userPort),
//       assignedDock: req.body.assignedDock,
//       status: req.body.status,
//     };

//     if (Array.isArray(req.body.notes)) {
//       payload.notes = req.body.notes;
//     }

//     const shipment = await Shipment.create(payload);
//     res.status(201).json(shipment);
//   } catch (error) {
//     console.error('Create shipment error:', error);
//     res.status(500).json({ message: 'Unable to create shipment.' });
//   }
// };

// exports.updateShipment = async (req, res) => {
//   try {
//     const shipment = await Shipment.findById(req.params.id);
//     if (!shipment) {
//       return res.status(404).json({ message: 'Shipment not found.' });
//     }

//     const oldStatus = shipment.status;
//     const changedBy = getActor(req);

//     // Update only allowed fields explicitly (avoids Mongoose change-tracking issues)
//     const allowedFields = ['shipName', 'arrivalTime', 'cargoQuantity', 'containerCount', 'assignedDock', 'status', 'notes'];
//     for (const field of allowedFields) {
//       if (req.body[field] !== undefined) {
//         shipment[field] = req.body[field];
//       }
//     }

//     // Track status change in history
//     if (req.body.status && req.body.status !== oldStatus) {
//       shipment.statusHistory.push({
//         status: req.body.status,
//         changedAt: new Date(),
//         changedBy,
//       });
//     }

//     // Mark modified to ensure Mongoose persists all changes
//     shipment.markModified('statusHistory');
//     await shipment.save();
//     res.json(shipment);
//   } catch (error) {
//     console.error('Update shipment error:', error);
//     res.status(500).json({ message: 'Unable to update shipment.', error: error.message });
//   }
// };

// exports.deleteShipment = async (req, res) => {
//   try {
//     const shipment = await Shipment.findByIdAndDelete(req.params.id);
//     if (!shipment) {
//       return res.status(404).json({ message: 'Shipment not found.' });
//     }
//     res.json({ message: 'Shipment deleted.' });
//   } catch (error) {
//     console.error('Delete shipment error:', error);
//     res.status(500).json({ message: 'Unable to delete shipment.' });
//   }
// };

// exports.bulkUpdateShipments = async (req, res) => {
//   try {
//     const { ids, updates } = req.body;
//     if (!Array.isArray(ids) || ids.length === 0) {
//       return res.status(400).json({ message: 'No shipment IDs provided.' });
//     }

//     if (!updates || (typeof updates !== 'object') || Object.keys(updates).length === 0) {
//       return res.status(400).json({ message: 'No update fields provided.' });
//     }

//     const changedBy = getActor(req);

//     // If status is being updated, fetch each doc to push statusHistory
//     if (updates.status) {
//       const shipments = await Shipment.find({ _id: { $in: ids } });
//       if (shipments.length === 0) {
//         return res.status(404).json({ message: 'No matching shipments found.' });
//       }

//       const updatePromises = shipments.map((shipment) => {
//         const oldStatus = shipment.status;

//         // Set allowed fields explicitly
//         if (updates.status !== undefined) shipment.status = updates.status;
//         if (updates.assignedDock !== undefined) shipment.assignedDock = updates.assignedDock;

//         if (updates.status !== oldStatus) {
//           shipment.statusHistory.push({
//             status: updates.status,
//             changedAt: new Date(),
//             changedBy,
//           });
//           shipment.markModified('statusHistory');
//         }
//         return shipment.save();
//       });
//       await Promise.all(updatePromises);
//       res.json({ message: 'Bulk update complete.', modifiedCount: shipments.length });
//     } else {
//       // For non-status updates (e.g., assignedDock), use updateMany
//       const allowedUpdates = {};
//       if (updates.assignedDock !== undefined) allowedUpdates.assignedDock = updates.assignedDock;
//       if (updates.shipName !== undefined) allowedUpdates.shipName = updates.shipName;
//       if (updates.containerCount !== undefined) allowedUpdates.containerCount = updates.containerCount;

//       if (Object.keys(allowedUpdates).length === 0) {
//         return res.status(400).json({ message: 'No valid update fields provided.' });
//       }

//       const result = await Shipment.updateMany({ _id: { $in: ids } }, { $set: allowedUpdates });
//       res.json({ message: 'Bulk update complete.', modifiedCount: result.modifiedCount });
//     }
//   } catch (error) {
//     console.error('Bulk update error:', error);
//     res.status(500).json({ message: 'Unable to update shipments in bulk.', error: error.message });
//   }
// };

// exports.addNote = async (req, res) => {
//   try {
//     const { text } = req.body;
//     if (!text || !text.trim()) {
//       return res.status(400).json({ message: 'Note text is required.' });
//     }

//     const shipment = await Shipment.findById(req.params.id);
//     if (!shipment) {
//       return res.status(404).json({ message: 'Shipment not found.' });
//     }

//     shipment.notes.push({
//       text: text.trim(),
//       author: getActor(req),
//       createdAt: new Date(),
//     });

//     shipment.markModified('notes');
//     await shipment.save();
//     res.json(shipment);
//   } catch (error) {
//     console.error('Add note error:', error);
//     res.status(500).json({ message: 'Unable to add note.', error: error.message });
//   }
// };

// exports.updateNote = async (req, res) => {
//   try {
//     const { text } = req.body;
//     if (!text || !text.trim()) {
//       return res.status(400).json({ message: 'Note text is required.' });
//     }

//     const shipment = await Shipment.findById(req.params.id);
//     if (!shipment) {
//       return res.status(404).json({ message: 'Shipment not found.' });
//     }

//     const note = shipment.notes.id(req.params.noteId);
//     if (!note) {
//       return res.status(404).json({ message: 'Note not found.' });
//     }

//     note.text = text.trim();
//     note.author = getActor(req);
//     shipment.markModified('notes');
//     await shipment.save();

//     res.json(shipment);
//   } catch (error) {
//     console.error('Update note error:', error);
//     res.status(500).json({ message: 'Unable to update note.', error: error.message });
//   }
// };

// exports.getStatusHistory = async (req, res) => {
//   try {
//     const shipment = await Shipment.findById(req.params.id).select('shipName statusHistory');
//     if (!shipment) {
//       return res.status(404).json({ message: 'Shipment not found.' });
//     }
//     res.json({ shipName: shipment.shipName, history: shipment.statusHistory });
//   } catch (error) {
//     console.error('Get status history error:', error);
//     res.status(500).json({ message: 'Unable to load status history.' });
//   }
// };


// const [shipIns, opsIns] = await Promise.all([
//   Shipment.insertMany(shipmentDocs, { ordered: false }),
//   DailyPortOps.insertMany(dailyOpsDocs, { ordered: false }),
// ]); s


const Shipment = require('../models/Shipment');
const Tank = require('../models/Tank');
const { generateYearlyPortDemo } = require('../utils/generateYearlyPortDemo');
const { calculateRoute } = require('../services/marineRouteService');
const { assessWeatherRisk } = require('../services/weatherRiskService');
const { analyzeDemandSupplyImpact } = require('../services/demandSupplyService');
const { enrichShipmentRisk, applyManualDelayImpact } = require('../services/shipmentRiskOrchestrator');
const { optimizeDockAssignment } = require('../services/dockOptimizationService');
const { getDockStatusForPort } = require('../services/dockStateService');
const { generateDailyPlan } = require('../services/supplyPlanService');

const getActor = (req) => {
  const role = req.user?.role ? String(req.user.role).toLowerCase() : 'operator';
  return req.user?.email || role || 'operator';
};

const canAccessShipmentByRole = (req, shipmentPortName) => {
  const role = String(req.user?.role || '').toLowerCase();
  const userPort = String(req.user?.portName || '').trim();
  if (role === 'admin' || role === 'organization') return true;
  if ((role === 'operator' || role === 'analyst') && userPort) {
    return String(shipmentPortName || '') === userPort;
  }
  return false;
};

const normalizePort = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const latitude = Number(raw?.coordinates?.latitude);
  const longitude = Number(raw?.coordinates?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    name: String(raw.name || '').trim(),
    code: String(raw.code || '').trim(),
    coordinates: { latitude, longitude },
  };
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeDockRecommendation = (recommendation) => ({
  dockId: recommendation.dockId || '',
  recommendedDock: recommendation.recommendedDock || '',
  score: Number(recommendation.score || 0),
  estimatedCostSaving: Number(recommendation.estimatedCostSaving || 0),
  estimatedTimeSavingHours: Number(recommendation.estimatedTimeSavingHours || 0),
  reason: recommendation.reason || '',
  warnings: Array.isArray(recommendation.warnings) ? recommendation.warnings : [],
  generatedAt: new Date(),
});

const isPredefinedDockForPort = async ({ dockName, portName }) => {
  if (!dockName) return false;
  const docks = await getDockStatusForPort({ portName });
  return docks.some((dock) => dock.dockName === dockName);
};

const buildDockRecommendation = async ({ shipmentPayload }) => {
  const shipmentGasType = String(shipmentPayload.gasType || shipmentPayload.commodityType || 'Other').trim();
  const shipmentQuantity = Number(shipmentPayload.cargoQuantity || 0);
  const portName = String(shipmentPayload.portName || '').trim();

  const docks = (await getDockStatusForPort({ portName }))
    .filter((dock) => dock.status !== 'inactive')
    .map((dock) => ({
      dockId: dock.dockId,
      dockName: dock.dockName,
      portName: dock.portName,
      dockCapacity: Number(dock.dockCapacity || 0),
      currentOccupiedCapacity: Number(dock.occupiedShips || 0),
      dockVacancy: Number(dock.dockVacancy || 0),
      supportedGasTypes: Array.isArray(dock.supportedGasTypes) ? dock.supportedGasTypes : [],
      averageHandlingTime: Number(dock.averageHandlingTime || 0),
      distanceToTank: Number(dock.distanceToTank || 0),
      status: dock.status,
    }));

  const tanksRaw = await Tank.find({
    commodity: new RegExp(`^${escapeRegex(shipmentGasType)}$`, 'i'),
    location: new RegExp(`^${escapeRegex(portName)}$`, 'i'),
  }).lean();

  const tanks = tanksRaw.map((tank) => ({
    tankId: String(tank._id),
    tankName: tank.tankId || String(tank._id),
    gasType: tank.commodity,
    location: tank.location,
    capacity: Number(tank.capacity || 0),
    currentLevel: Number(tank.currentLevel || 0),
  }));

  const weatherRiskScore = Number(shipmentPayload.weatherRiskScore || shipmentPayload.weatherRiskAssessment?.overallRiskScore || 0);
  const marineRiskScore = Number(shipmentPayload.marineRiskScore || 0);

  return optimizeDockAssignment({
    shipment: {
      shipmentId: String(shipmentPayload.shipmentId || ''),
      shipName: shipmentPayload.shipName,
      arrivalTime: shipmentPayload.arrivalTime,
      cargoQuantity: shipmentQuantity,
      gasType: shipmentGasType,
      portName,
      weatherRiskScore,
      marineRiskScore,
    },
    docks,
    tanks,
  });
};

exports.getShipments = async (req, res) => {
  try {
    const query = {};
    const role = String(req.user?.role || '').toLowerCase();
    const userPort = String(req.user?.portName || '').trim();

    if (role === 'analyst' && !userPort) {
      return res.status(400).json({ message: 'Your account is not associated with a port. Please contact admin.' });
    }

    if ((role === 'operator' || role === 'analyst') && userPort) {
      query.portName = userPort;
    } else if (req.query.portName) {
      query.portName = String(req.query.portName).trim();
    }

    if (req.query.status) {
      query.status = String(req.query.status);
    }

    if (req.query.assignedDock) {
      query.assignedDock = String(req.query.assignedDock);
    }

    const arrivalTime = {};
    if (req.query.arrivalFrom) {
      const d = new Date(req.query.arrivalFrom);
      if (!Number.isNaN(d.getTime())) {
        arrivalTime.$gte = d;
      }
    }
    if (req.query.arrivalTo) {
      const d = new Date(req.query.arrivalTo);
      if (!Number.isNaN(d.getTime())) {
        arrivalTime.$lte = d;
      }
    }

    if (req.query.date) {
      const raw = String(req.query.date);
      const start = new Date(`${raw}T00:00:00.000Z`);
      const end = new Date(`${raw}T23:59:59.999Z`);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        arrivalTime.$gte = start;
        arrivalTime.$lte = end;
      }
    }

    if (Object.keys(arrivalTime).length) {
      query.arrivalTime = arrivalTime;
    }

    const paginate = req.query.page !== undefined || req.query.limit !== undefined;
    if (paginate) {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
      const page = Math.max(1, Number(req.query.page || 1));
      const skip = (page - 1) * limit;
      const includeStatusCounts = String(req.query.includeStatusCounts || '') === '1';
      const includeSummary = String(req.query.includeSummary || '') === '1';

      const [items, total, statusAgg, summaryAgg, distinctDocks] = await Promise.all([
        Shipment.find(query).sort({ arrivalTime: -1 }).skip(skip).limit(limit).lean(),
        Shipment.countDocuments(query),
        includeStatusCounts
          ? Shipment.aggregate([
              { $match: query },
              { $group: { _id: '$status', count: { $sum: 1 } } },
            ])
          : Promise.resolve(null),
        includeSummary
          ? Shipment.aggregate([
              { $match: query },
              {
                $group: {
                  _id: null,
                  totalCargo: { $sum: { $ifNull: ['$cargoQuantity', 0] } },
                  delayed: { $sum: { $cond: [{ $eq: ['$status', 'Delayed'] }, 1, 0] } },
                },
              },
            ])
          : Promise.resolve(null),
        includeSummary ? Shipment.distinct('assignedDock', query) : Promise.resolve(null),
      ]);

      const statusCounts = {};
      if (Array.isArray(statusAgg)) {
        statusAgg.forEach((r) => {
          if (r._id) statusCounts[r._id] = r.count;
        });
      }

      let summary = null;
      if (includeSummary && Array.isArray(summaryAgg)) {
        const row = summaryAgg[0] || {};
        const docks = Array.isArray(distinctDocks) ? distinctDocks.filter(Boolean) : [];
        summary = {
          totalCargo: row.totalCargo || 0,
          delayed: row.delayed || 0,
          activeDocks: docks.length,
        };
      }

      return res.json({
        items,
        total,
        page,
        limit,
        hasMore: skip + items.length < total,
        ...(includeStatusCounts ? { statusCounts } : {}),
        ...(summary ? { summary } : {}),
      });
    }

    const shipments = await Shipment.find(query).sort({ arrivalTime: -1 });
    res.json(shipments);
  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ message: 'Unable to load shipments.' });
  }
};
//new

exports.generateDemoShipments365 = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'operator') {
      return res.status(403).json({ message: 'Admins and operators only.' });
    }

    const days = Math.max(1, Math.min(3650, Number(req.body?.days || 365) || 365));
    const userPort = String(req.user?.portName || '').trim();
    const portName = typeof req.body?.portName === 'string' && req.body.portName.trim()
      ? req.body.portName.trim()
      : (role === 'admin' ? '' : userPort);
    if (!portName) {
      if (role !== 'admin') {
        return res.status(400).json({ message: 'portName is required (set your port in profile or pass portName).' });
      }
    }
    const berthCapacity = Math.max(0, Number(req.body?.berthCapacity || 2500) || 2500);

    const result = await generateYearlyPortDemo({
      portName,
      days,
      berthCapacity,
      startDate: req.body?.startDate,
      userId: req.user.id,
      role,
    });

    return res.status(201).json({
      message: 'Demo shipments, daily ops, and demand rows generated.',
      ...result,
    });
  } catch (error) {
    console.error('Generate demo shipments error:', error);
    return res.status(500).json({ message: error.message || 'Unable to generate demo shipments.' });
  }
};

// exports.generateDemoShipments365 = async (req, res) => {
//   try {
//     const role = String(req.user?.role || '').toLowerCase();
//     if (role !== 'admin') return res.status(403).json({ message: 'Admins only.' });

//     const days = Math.max(1, Math.min(3650, Number(req.body?.days || 365) || 365));
//     const portName = typeof req.body?.portName === 'string' ? req.body.portName.trim() : 'Chattogram Port';
//     const berthCapacity = Math.max(0, Number(req.body?.berthCapacity || 2500) || 2500);
//     const start = typeof req.body?.startDate === 'string' ? req.body.startDate.trim() : '';
//     const startDate = start ? new Date(`${start}T00:00:00.000Z`) : new Date(Date.now() - (days - 1) * 86400000);
//     startDate.setUTCHours(0, 0, 0, 0);

//     const rng = mulberry32(seedFromString(`${portName}|${days}|${startDate.toISOString().slice(0, 10)}`));
//     const docks = ['GCB', 'NCT', 'CCT', 'JETTY-1', 'JETTY-2'];
//     const commodities = ['LNG', 'LPG', 'Diesel', 'Petrol', 'Jet Fuel'];

//     const shipmentDocs = [];
//     const dailyOpsDocs = [];
//     let previousRemaining = 0;

//     for (let i = 0; i < days; i++) {
//       const dayStart = new Date(startDate);
//       dayStart.setUTCDate(dayStart.getUTCDate() + i);
//       const shipCount = randInt(rng, 1, 4);

//       const shipments = [];
//       for (let n = 0; n < shipCount; n++) {
//         const arrival = new Date(dayStart);
//         arrival.setUTCHours(randInt(rng, 0, 23), randInt(rng, 0, 59), 0, 0);

//         const shipName = `MV-DEMO-${dayStart.toISOString().slice(0, 10)}-${String(n + 1).padStart(2, '0')}`;
//         const containerCount = randInt(rng, 50, 220);
//         const cargoQuantity = randInt(rng, 900, 5200);
//         const assignedDock = docks[randInt(rng, 0, docks.length - 1)];

//         shipmentDocs.push({
//           shipName,
//           arrivalTime: arrival,
//           cargoQuantity,
//           containerCount,
//           portName,
//           assignedDock,
//           status: 'Docked',
//           statusHistory: [{ status: 'Docked', changedAt: arrival, changedBy: 'DEMO_SEED' }],
//         });

//         shipments.push({ shipName, containerCount, cargoQuantity });
//       }

//       const totalContainer = shipments.reduce((a, s) => a + s.containerCount, 0);
//       const totalQuantity = shipments.reduce((a, s) => a + s.cargoQuantity, 0);
//       const totalHandled = randInt(rng, 0, Math.max(0, totalContainer));
//       const remainingContainer = Math.max(0, totalContainer - totalHandled);

//       const rowsCount = randInt(rng, 2, 5);
//       const used = new Set();
//       const commodityRows = [];
//       for (let r = 0; r < rowsCount; r++) {
//         let c = commodities[randInt(rng, 0, commodities.length - 1)];
//         while (used.has(c)) c = commodities[randInt(rng, 0, commodities.length - 1)];
//         used.add(c);
//         const cc = randInt(rng, 10, Math.max(10, Math.floor(totalContainer / 2) || 60));
//         const cd = randInt(rng, 0, cc);
//         const qty = randInt(rng, 200, 2500);
//         commodityRows.push({
//           commodityType: c,
//           containerCount: cc,
//           commodityQuantity: qty,
//           containerDelivered: cd,
//           remainingCommodityContainer: Math.max(0, cc - cd),
//         });
//       }

//       const totalDelivered = commodityRows.reduce((a, r) => a + r.containerDelivered, 0);
//       const berthLocation = docks[randInt(rng, 0, docks.length - 1)];
//       const berthVacancy = berthCapacity - (totalContainer + previousRemaining - totalDelivered);

//       dailyOpsDocs.push({
//         date: dayStart,
//         portName,
//         shipments,
//         totalContainer,
//         totalQuantity,
//         totalHandled,
//         remainingContainer,
//         berthLocation,
//         berthCapacity,
//         berthVacancy,
//         totalDelivered,
//         commodities: commodityRows,
//       });

//       previousRemaining = remainingContainer;
//     }

//     const [shipIns, opsIns] = await Promise.all([
//       Shipment.insertMany(shipmentDocs, { ordered: false }),
//       DailyPortOps.insertMany(dailyOpsDocs, { ordered: false }),
//     ]);

//     return res.status(201).json({
//       message: 'Demo shipments + daily ops generated.',
//       shipmentsInserted: shipIns.length,
//       dailyOpsInserted: opsIns.length,
//       portName,
//       days,
//     });
//   } catch (error) {
//     console.error('Generate demo shipments error:', error);
//     return res.status(500).json({ message: 'Unable to generate demo shipments.' });
//   }
// };

exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found.' });
    }
    if (!canAccessShipmentByRole(req, shipment.portName)) {
      return res.status(403).json({ message: 'Access denied for this port shipment.' });
    }
    
    // Avoid expensive recalculation on every detail view; only backfill when absent.
    if (!shipment.demandSupplyImpact?.calculatedAt) {
      shipment.demandSupplyImpact = await analyzeDemandSupplyImpact({
        shipment,
        predictedDelayHours: shipment.delayInfo?.predictedDelayHours || 0,
      });
      await shipment.save();
    }
    
    res.json(shipment);
  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({ message: 'Unable to load shipment.' });
  }
};

exports.createShipment = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const userPort = String(req.user?.portName || '').trim();
    const resolvedPortName = role !== 'admin'
      ? userPort
      : (typeof req.body.portName === 'string' ? req.body.portName.trim() : userPort);
    const incomingStatus = req.body.status || 'En Route';
    const incomingDock = String(req.body.assignedDock || '').trim();
    if (incomingStatus !== 'En Route' && !incomingDock) {
      return res.status(400).json({ message: 'assignedDock is required unless shipment is En Route.' });
    }
    if (incomingDock && !(await isPredefinedDockForPort({ dockName: incomingDock, portName: resolvedPortName }))) {
      return res.status(400).json({ message: 'assignedDock must be one of the predefined port docks.' });
    }

    const payload = {
      shipName: req.body.shipName,
      arrivalTime: req.body.arrivalTime,
      cargoQuantity: req.body.cargoQuantity,
      containerCount: req.body.containerCount,
      portName: resolvedPortName,
      assignedDock: incomingDock,
      status: incomingStatus,
      commodityType: req.body.commodityType || 'Other',
      gasType: req.body.gasType || req.body.commodityType || 'Other',
      startingPort: normalizePort(req.body.startingPort),
      destinationPort: normalizePort(req.body.destinationPort),
      estimatedArrivalTime: req.body.estimatedArrivalTime || req.body.arrivalTime,
    };

    if (Array.isArray(req.body.notes)) {
      payload.notes = req.body.notes;
    }

    const shipment = await Shipment.create(payload);
    await enrichShipmentRisk({
      req,
      shipment,
      triggeredByUserId: req.user?.id || null,
    });
    await shipment.save();
    res.status(201).json(shipment);
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ message: 'Unable to create shipment.' });
  }
};

exports.updateShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found.' });
    }
    if (!canAccessShipmentByRole(req, shipment.portName)) {
      return res.status(403).json({ message: 'Access denied for this port shipment.' });
    }

    const oldStatus = shipment.status;
    const changedBy = getActor(req);

    const allowedFields = [
      'shipName',
      'arrivalTime',
      'cargoQuantity',
      'containerCount',
      'assignedDock',
      'status',
      'notes',
      'commodityType',
      'gasType',
      'estimatedArrivalTime',
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        shipment[field] = req.body[field];
      }
    }
    const nextStatus = req.body.status !== undefined ? req.body.status : shipment.status;
    const nextAssignedDock = req.body.assignedDock !== undefined ? String(req.body.assignedDock || '').trim() : String(shipment.assignedDock || '').trim();
    if (nextStatus !== 'En Route' && !nextAssignedDock) {
      return res.status(400).json({ message: 'assignedDock is required unless shipment is En Route.' });
    }
    if (nextAssignedDock && !(await isPredefinedDockForPort({ dockName: nextAssignedDock, portName: shipment.portName }))) {
      return res.status(400).json({ message: 'assignedDock must be one of the predefined port docks.' });
    }
    if (req.body.startingPort) {
      shipment.startingPort = normalizePort(req.body.startingPort);
    }
    if (req.body.destinationPort) {
      shipment.destinationPort = normalizePort(req.body.destinationPort);
    }

    if (req.body.status && req.body.status !== oldStatus) {
      shipment.statusHistory.push({
        status: req.body.status,
        changedAt: new Date(),
        changedBy,
      });
    }
    if (req.body.status === 'Delayed' && oldStatus !== 'Delayed') {
      await applyManualDelayImpact({
        shipment,
        reason: req.body.manualDelayReason || '',
        userId: req.user?.id || null,
      });
    }

    // Recalculate demand supply impact on berth allocation or status change
    if (['Docked', 'Unloading', 'Unloaded'].includes(req.body.status) || (req.body.status && req.body.status !== oldStatus)) {
      shipment.demandSupplyImpact = await analyzeDemandSupplyImpact({
        shipment,
        predictedDelayHours: shipment.delayInfo?.predictedDelayHours || 0,
      });
    }

    shipment.markModified('statusHistory');
    await shipment.save();

    // Trigger supply plan regeneration when a shipment is docked
    if (req.body.status === 'Docked' && oldStatus !== 'Docked') {
      try {
        const planDate = new Date(shipment.arrivalTime || Date.now()).toISOString().slice(0, 10);
        const { plan } = await generateDailyPlan({
          planDate,
          portName: shipment.portName,
          strategy: 'balanced',
          requestedBy: { userId: req.user?.id, userName: 'system' },
        });
        const io = req.app && req.app.get('io');
        if (io && plan) {
          const User = require('../models/User');
          const { emitNotification } = require('../services/notificationService');
          const operators = await User.find({ role: { $in: ['operator', 'admin'] }, portName: new RegExp(`^${shipment.portName}$`, 'i') }).select('_id role portName');
          await Promise.all(operators.map((op) => emitNotification({
            io,
            recipientUserId: op._id,
            recipientRole: op.role,
            portName: op.portName || '',
            type: 'supply_plan_generated',
            title: 'Supply Plan Updated',
            message: `${shipment.shipName} docked. Supply plan for ${planDate} has been refreshed.`,
            relatedEntityType: 'supplyPlan',
            relatedEntityId: String(plan._id),
            navigationPath: op.role === 'operator' ? '/operator/supply-planning' : '/dashboard/supply-planning',
          })));
        }
      } catch (planErr) {
        console.warn('Supply plan auto-generate warning:', planErr.message);
      }
    }

    res.json(shipment);
  } catch (error) {
    console.error('Update shipment error:', error);
    res.status(500).json({ message: 'Unable to update shipment.', error: error.message });
  }
};

exports.deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found.' });
    }
    if (!canAccessShipmentByRole(req, shipment.portName)) {
      return res.status(403).json({ message: 'Access denied for this port shipment.' });
    }
    await Shipment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Shipment deleted.' });
  } catch (error) {
    console.error('Delete shipment error:', error);
    res.status(500).json({ message: 'Unable to delete shipment.' });
  }
};

exports.bulkUpdateShipments = async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No shipment IDs provided.' });
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update fields provided.' });
    }

    const changedBy = getActor(req);

    if (updates.status) {
      const shipments = await Shipment.find({ _id: { $in: ids } });
      if (shipments.length === 0) {
        return res.status(404).json({ message: 'No matching shipments found.' });
      }
      if (shipments.some((s) => !canAccessShipmentByRole(req, s.portName))) {
        return res.status(403).json({ message: 'Access denied for one or more selected shipments.' });
      }

      const updatePromises = shipments.map(async (shipment) => {
        const oldStatus = shipment.status;

        if (updates.status !== undefined) shipment.status = updates.status;
        if (updates.assignedDock !== undefined) shipment.assignedDock = updates.assignedDock;

        if (updates.status !== oldStatus) {
          shipment.statusHistory.push({
            status: updates.status,
            changedAt: new Date(),
            changedBy,
          });
          shipment.markModified('statusHistory');

          // Recalculate demand supply impact on status change
          if (['Docked', 'Unloading', 'Unloaded'].includes(updates.status) || updates.status) {
            shipment.demandSupplyImpact = await analyzeDemandSupplyImpact({
              shipment,
              predictedDelayHours: shipment.delayInfo?.predictedDelayHours || 0,
            });
          }
        }
        return shipment.save();
      });

      await Promise.all(updatePromises);
      res.json({ message: 'Bulk update complete.', modifiedCount: shipments.length });
    } else {
      const allowed = await Shipment.find({ _id: { $in: ids } }).select('portName').lean();
      if (allowed.some((s) => !canAccessShipmentByRole(req, s.portName))) {
        return res.status(403).json({ message: 'Access denied for one or more selected shipments.' });
      }
      const allowedUpdates = {};
      if (updates.assignedDock !== undefined) allowedUpdates.assignedDock = updates.assignedDock;
      if (updates.shipName !== undefined) allowedUpdates.shipName = updates.shipName;
      if (updates.containerCount !== undefined) allowedUpdates.containerCount = updates.containerCount;

      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ message: 'No valid update fields provided.' });
      }

      const result = await Shipment.updateMany({ _id: { $in: ids } }, { $set: allowedUpdates });
      res.json({ message: 'Bulk update complete.', modifiedCount: result.modifiedCount });
    }
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ message: 'Unable to update shipments in bulk.', error: error.message });
  }
};

exports.addNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Note text is required.' });
    }

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found.' });
    }
    if (!canAccessShipmentByRole(req, shipment.portName)) {
      return res.status(403).json({ message: 'Access denied for this port shipment.' });
    }

    shipment.notes.push({
      text: text.trim(),
      author: getActor(req),
      createdAt: new Date(),
    });

    shipment.markModified('notes');
    await shipment.save();
    res.json(shipment);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: 'Unable to add note.', error: error.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Note text is required.' });
    }

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found.' });
    }
    if (!canAccessShipmentByRole(req, shipment.portName)) {
      return res.status(403).json({ message: 'Access denied for this port shipment.' });
    }

    const note = shipment.notes.id(req.params.noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    note.text = text.trim();
    note.author = getActor(req);
    shipment.markModified('notes');
    await shipment.save();

    res.json(shipment);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ message: 'Unable to update note.', error: error.message });
  }
};

exports.getStatusHistory = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id).select('shipName statusHistory portName');
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found.' });
    }
    if (!canAccessShipmentByRole(req, shipment.portName)) {
      return res.status(403).json({ message: 'Access denied for this port shipment.' });
    }
    res.json({ shipName: shipment.shipName, history: shipment.statusHistory });
  } catch (error) {
    console.error('Get status history error:', error);
    res.status(500).json({ message: 'Unable to load status history.' });
  }
};

exports.calculateRoutePreview = async (req, res) => {
  try {
    const startingPort = normalizePort(req.body.startingPort);
    const destinationPort = normalizePort(req.body.destinationPort);
    if (!startingPort || !destinationPort) {
      return res.status(400).json({ message: 'startingPort and destinationPort with coordinates are required.' });
    }

    const routeData = await calculateRoute({ startingPort, destinationPort });
    const weatherRisk = await assessWeatherRisk({
      routeData,
      estimatedArrivalTime: req.body.estimatedArrivalTime,
    });
    return res.json({
      routeData,
      weatherRiskAssessment: {
        overallRiskScore: weatherRisk.overallRiskScore,
        riskLevel: weatherRisk.riskLevel,
        weatherAlerts: weatherRisk.weatherAlerts,
        assessedAt: weatherRisk.assessedAt,
      },
    });
  } catch (error) {
    console.error('Calculate route preview error:', error);
    return res.status(500).json({ message: 'Unable to calculate route preview.' });
  }
};

exports.assessShipmentWeatherRisk = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found.' });
    }

    await enrichShipmentRisk({
      req,
      shipment,
      triggeredByUserId: req.user?.id || null,
    });
    await shipment.save();
    return res.json(shipment.weatherRiskAssessment);
  } catch (error) {
    console.error('Assess weather risk error:', error);
    return res.status(500).json({ message: 'Unable to assess weather risk.' });
  }
};

exports.getShipmentWeatherForecast = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id).select('weatherRiskAssessment routeData');
    if (!shipment) return res.status(404).json({ message: 'Shipment not found.' });
    return res.json({
      routeData: shipment.routeData,
      weatherRiskAssessment: shipment.weatherRiskAssessment,
      forecasts: shipment.weatherRiskAssessment?.forecasts || [],
    });
  } catch (error) {
    console.error('Get weather forecast error:', error);
    return res.status(500).json({ message: 'Unable to fetch weather forecast.' });
  }
};

exports.getShipmentDemandImpact = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ message: 'Shipment not found.' });
    if (!shipment.demandSupplyImpact?.calculatedAt) {
      shipment.demandSupplyImpact = await analyzeDemandSupplyImpact({
        shipment,
        predictedDelayHours: shipment.delayInfo?.predictedDelayHours || 0,
      });
      await shipment.save();
    }
    return res.json(shipment.demandSupplyImpact);
  } catch (error) {
    console.error('Get demand impact error:', error);
    return res.status(500).json({ message: 'Unable to fetch demand impact.' });
  }
};

exports.reassessShipmentRisk = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ message: 'Shipment not found.' });
    await enrichShipmentRisk({
      req,
      shipment,
      triggeredByUserId: req.user?.id || null,
    });
    await shipment.save();
    return res.json(shipment);
  } catch (error) {
    console.error('Reassess shipment risk error:', error);
    return res.status(500).json({ message: 'Unable to reassess shipment risk.' });
  }
};

exports.suggestBestDock = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ message: 'Shipment not found.' });
    const recommendation = await buildDockRecommendation({
      shipmentPayload: {
        shipmentId: String(shipment._id),
        shipName: shipment.shipName,
        arrivalTime: shipment.arrivalTime,
        cargoQuantity: shipment.cargoQuantity,
        gasType: shipment.gasType,
        commodityType: shipment.commodityType,
        portName: shipment.portName,
        weatherRiskAssessment: shipment.weatherRiskAssessment,
      },
    });

    shipment.optimizationRecommendation = normalizeDockRecommendation(recommendation);
    await shipment.save();

    return res.json(shipment.optimizationRecommendation);
  } catch (error) {
    console.error('Suggest dock error:', error);
    return res.status(500).json({ message: 'Unable to suggest best dock.' });
  }
};

exports.suggestDockForDraftShipment = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const userPort = String(req.user?.portName || '').trim();
    const portName = role === 'admin'
      ? String(req.body.portName || '').trim()
      : userPort;
    const recommendation = await buildDockRecommendation({
      shipmentPayload: {
        shipmentId: '',
        shipName: req.body.shipName,
        arrivalTime: req.body.arrivalTime,
        cargoQuantity: req.body.cargoQuantity,
        gasType: req.body.gasType,
        commodityType: req.body.commodityType,
        portName,
        weatherRiskScore: req.body.weatherRiskScore,
        marineRiskScore: req.body.marineRiskScore,
      },
    });
    return res.json(normalizeDockRecommendation(recommendation));
  } catch (error) {
    console.error('Suggest draft dock error:', error);
    return res.status(500).json({ message: 'Unable to suggest best dock for draft shipment.' });
  }
};

exports.assignSuggestedDock = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ message: 'Shipment not found.' });

    const recommendation = shipment.optimizationRecommendation || {};
    const recommendedDock = String(recommendation.recommendedDock || '').trim();
    if (!recommendedDock) {
      return res.status(400).json({ message: 'No optimization recommendation found. Suggest a dock first.' });
    }
    if (!(await isPredefinedDockForPort({ dockName: recommendedDock, portName: shipment.portName }))) {
      return res.status(400).json({ message: 'Recommended dock is invalid for this port.' });
    }

    shipment.assignedDock = recommendedDock;
    shipment.assignedDockSource = 'optimized';
    await shipment.save();

    return res.json({
      message: 'Dock assignment updated from optimization recommendation.',
      shipment,
    });
  } catch (error) {
    console.error('Assign suggested dock error:', error);
    return res.status(500).json({ message: 'Unable to assign suggested dock.' });
  }
};