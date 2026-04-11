const axios = require('axios');
const Demand = require('../models/Demand');
const Shipment = require('../models/Shipment');
const SupplyPlan = require('../models/SupplyPlan');
const SupplyPlanConfig = require('../models/SupplyPlanConfig');
const { getDockStatusForPort } = require('./dockStateService');

const AI_SERVICE_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const safeDiv = (a, b) => (b ? a / b : 0);

/**
 * Deterministic priority scoring for a shipment.
 * Higher score = should unload first.
 */
const scoreShipment = (shipment, demandMap, dockVacancyMap, trendMap = {}) => {
  const commodity = String(shipment.commodityType || shipment.gasType || 'Other');
  const demand = demandMap[commodity] || 0;
  const supply = Number(shipment.cargoQuantity || 0);
  const trend = trendMap[commodity] || 'stable'; // rising, falling, stable

  const arrivalTs = new Date(shipment.arrivalTime || shipment.estimatedArrivalTime || Date.now()).getTime();
  const nowTs = Date.now();
  const hoursUntilArrival = Math.max(0, (arrivalTs - nowTs) / 3600000);

  // Weights
  const demandWeight = Math.min(45, safeDiv(demand, 100) * 6);
  const trendWeight = trend === 'rising' ? 15 : trend === 'falling' ? -5 : 0;
  const shortageRiskWeight = demand > supply ? 25 : 0;
  const arrivalUrgencyWeight = hoursUntilArrival < 6 ? 25 : hoursUntilArrival < 12 ? 15 : hoursUntilArrival < 24 ? 8 : 0;

  const dock = String(shipment.assignedDock || '');
  const dockVacancy = dockVacancyMap[dock.toLowerCase()] ?? 1;
  const dockAvailabilityWeight = dockVacancy > 0 ? 10 : 0;

  const isDelayed = String(shipment.status || '').toLowerCase() === 'delayed';
  const delayUrgencyWeight = isDelayed ? 10 : 0;

  const costPenalty = 0; // NO COST LOGIC PER USER REQUIREMENT

  return Math.max(0, demandWeight + trendWeight + shortageRiskWeight + arrivalUrgencyWeight + dockAvailabilityWeight + delayUrgencyWeight - costPenalty);
};

/**
 * Build a demand map from Demand documents: commodity → total demand quantity
 */
const buildDemandMap = (demandDocs) => {
  const map = {};
  for (const d of demandDocs) {
    const key = String(d.commodity_type || '');
    if (!key) continue;
    map[key] = (map[key] || 0) + Number(d.commodity_quantity || d.demand_quantity || 0);
  }
  return map;
};

/**
 * Calculate demand trend (rising/falling/stable) based on historical data
 */
const calculateTrendMap = async (portName, commodities) => {
  const trendMap = {};
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const histDemand = await Demand.find({
    portName: new RegExp(`^${portName}$`, 'i'),
    date: { $gte: thirtyDaysAgo },
  }).sort({ date: 1 }).lean();

  for (const commodity of commodities) {
    const commData = histDemand.filter(d => String(d.commodity_type).toLowerCase() === commodity.toLowerCase());
    if (commData.length < 2) {
      trendMap[commodity] = 'stable';
      continue;
    }
    const firstHalf = commData.slice(0, Math.floor(commData.length / 2));
    const secondHalf = commData.slice(Math.floor(commData.length / 2));
    const avg1 = safeDiv(firstHalf.reduce((a, b) => a + (b.commodity_quantity || 0), 0), firstHalf.length);
    const avg2 = safeDiv(secondHalf.reduce((a, b) => a + (b.commodity_quantity || 0), 0), secondHalf.length);

    if (avg2 > avg1 * 1.05) trendMap[commodity] = 'rising';
    else if (avg2 < avg1 * 0.95) trendMap[commodity] = 'falling';
    else trendMap[commodity] = 'stable';
  }
  return trendMap;
};

/**
 * Fallback deterministic explanation generator.
 */
const fallbackExplanation = (plan, metrics, allocations, priorities) => {
  const topAlloc = allocations[0];
  const topShip = priorities[0];

  return {
    planSummary: `The daily supply plan for ${plan.planDate} at ${plan.portName} prioritizes commodities with highest demand and shipments currently docked or arriving. Total allocation: ${metrics.totalAllocation?.toFixed(0) || 0} units.`,
    allocationExplanation: topAlloc
      ? `Priority allocation of ${topAlloc.quantity} units for ${topAlloc.product} at ${topAlloc.destinationBerth} driven by forecasted demand.`
      : 'No specific allocations generated.',
    shipmentPriorityExplanation: topShip
      ? `Shipment ${topShip.shipName} prioritized because ${topShip.commodity} has highest forecast demand and berth ${topShip.assignedDock || 'Jetty'} is available.`
      : 'No shipment priority recommendations available.',
    improvementRecommendations: metrics.demandCoveragePercentage < 80
      ? 'Demand coverage is critical. Consider urgent offloading of high-priority vessels.'
      : 'Maintain current turnaround times to ensure supply stability.',
    fallbackUsed: true,
  };
};

// ─── Main Planning Service ─────────────────────────────────────────────────────

/**
 * generateDailyPlan: core planning algorithm
 * @param {string} planDate   - YYYY-MM-DD
 * @param {string} portName
 * @param {string} strategy   - demand_priority | cost_optimization | balanced
 * @param {object} requestedBy - { userId, userName }
 */
const generateDailyPlan = async ({ planDate, portName, strategy = 'balanced', requestedBy = {} }) => {
  const warnings = [];
  const dateStart = new Date(`${planDate}T00:00:00.000Z`);
  const dateEnd = new Date(`${planDate}T23:59:59.999Z`);

  // ── 1. Fetch Demand ─────────────────────────────────────────────────────────
  // Search a 90-day window around the plan date first
  const demandWindowStart = new Date(dateStart);
  demandWindowStart.setDate(demandWindowStart.getDate() - 90);
  const demandWindowEnd = new Date(dateEnd);
  demandWindowEnd.setDate(demandWindowEnd.getDate() + 90);

  let demandDocs = await Demand.find({
    portName: new RegExp(`^${portName}$`, 'i'),
    date: { $gte: demandWindowStart, $lte: demandWindowEnd },
  }).lean();

  if (demandDocs.length === 0) {
    // Fallback: use ALL demand for this port regardless of date
    demandDocs = await Demand.find({
      portName: new RegExp(`^${portName}$`, 'i'),
    }).sort({ date: -1 }).limit(500).lean();
    if (demandDocs.length > 0) {
      warnings.push('No demand data near plan date. Using all-time historical demand as fallback.');
    } else {
      warnings.push('No demand data available for this port. Plan generated with zero demand baseline.');
    }
  }

  const demandMap = buildDemandMap(demandDocs);
  const commoditiesForTrend = Object.keys(demandMap);
  const trendMap = await calculateTrendMap(portName, commoditiesForTrend);

  // ── 2. Fetch Shipments ──────────────────────────────────────────────────────
  // Fetch all ships at the port that are currently active or recently arrived
  // We do NOT restrict to a single day — ships stay docked for multiple days
  const shipmentQuery = {
    portName: new RegExp(`^${portName}$`, 'i'),
    $or: [
      { status: { $in: ['Docked', 'Unloading', 'Delayed', 'En Route'] } },
      { arrivalTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      { estimatedArrivalTime: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
    ],
  };
  const shipmentDocs = await Shipment.find(shipmentQuery).sort({ arrivalTime: -1 }).limit(200).lean();
  if (shipmentDocs.length === 0) {
    warnings.push('No active or recent shipments found for this port. Partial plan generated.');
  }

  // ── 3. Fetch Dock State ─────────────────────────────────────────────────────
  let docks = [];
  try {
    docks = await getDockStatusForPort({ portName });
  } catch (err) {
    warnings.push('Could not load dock state. Dock availability not considered.');
  }

  const dockVacancyMap = {};
  for (const d of docks) {
    dockVacancyMap[String(d.dockName || '').toLowerCase()] = d.dockVacancy;
  }

  // ── 4. Score & Rank Shipments ───────────────────────────────────────────────
  const scoredShipments = shipmentDocs.map((s) => ({
    ...s,
    _score: scoreShipment(s, demandMap, dockVacancyMap, trendMap),
  }));
  scoredShipments.sort((a, b) => b._score - a._score);

  const shipmentPriorities = scoredShipments.map((s, idx) => {
    const commodity = String(s.commodityType || s.gasType || 'Other');
    const demand = demandMap[commodity] || 0;
    const supply = Number(s.cargoQuantity || 0);
    const reasons = [];
    if (demand > 0) reasons.push(`high forecasted demand (${demand.toFixed(0)} units)`);
    if (demand > supply) reasons.push('shortage risk detected');
    if (String(s.status || '').toLowerCase() === 'delayed') reasons.push('delayed shipment with urgent cargo');
    if (dockVacancyMap[String(s.assignedDock || '').toLowerCase()] > 0) reasons.push('dock available');

    return {
      shipmentId: s._id,
      shipName: s.shipName || 'Unknown Vessel',
      commodity,
      quantity: Number(s.cargoQuantity || 0),
      assignedDock: s.assignedDock || '',
      priorityLevel: Math.max(1, Math.min(10, Math.round(10 - idx * (10 / Math.max(1, scoredShipments.length))))),
      reason: reasons.length ? reasons.join(', ') : 'Standard scheduling',
      priorityScore: s._score,
    };
  });

  // ── 5. Build Allocation Plan ────────────────────────────────────────────────
  const allocations = [];
  const commodities = Object.keys(demandMap).length > 0
    ? Object.keys(demandMap)
    : [...new Set(shipmentDocs.map((s) => String(s.commodityType || s.gasType || 'Other')))];

  const availableDocks = docks.filter((d) => d.dockVacancy > 0 && d.status !== 'inactive');

  for (const commodity of commodities) {
    const totalDemand = demandMap[commodity] || 0;
    const relatedShipments = shipmentDocs.filter((s) =>
      String(s.commodityType || s.gasType || '').toLowerCase() === commodity.toLowerCase()
    );
    const totalSupply = relatedShipments.reduce((a, s) => a + Number(s.cargoQuantity || 0), 0);

    const allocatableQty = Math.min(totalSupply, totalDemand);

    if (allocatableQty <= 0 && totalSupply <= 0) continue;

    // Find best dock for this commodity
    let bestDock = availableDocks.find((d) =>
      Array.isArray(d.supportedGasTypes) && d.supportedGasTypes.some(
        (t) => t.toLowerCase() === commodity.toLowerCase()
      )
    ) || availableDocks[0];

    const shortage = Math.max(0, totalDemand - totalSupply);
    const priorityLabel = shortage > totalDemand * 0.3 ? 'high' : shortage > 0 ? 'medium' : 'low';
    const estimatedCost = allocatableQty * 0.35;

    allocations.push({
      product: commodity,
      quantity: Number(allocatableQty.toFixed(2)),
      destinationBerth: bestDock?.dockName || 'To Be Assigned',
      priority: priorityLabel,
      estimatedCost: Number(estimatedCost.toFixed(2)),
      reason: shortage > 0
        ? `Shortage of ${shortage.toFixed(0)} units detected. Priority allocation recommended.`
        : `Supply meets demand. Standard allocation applied.`,
    });
  }

  // ── 6. Calculate Metrics ────────────────────────────────────────────────────
  const totalAllocation = allocations.reduce((a, al) => a + al.quantity, 0);
  const totalDemand = Object.values(demandMap).reduce((a, v) => a + v, 0);
  const demandCoveragePercentage = totalDemand > 0 ? Math.min(100, safeDiv(totalAllocation, totalDemand) * 100) : 0;
  const totalCapacity = docks.reduce((a, d) => a + Number(d.dockCapacity || 0), 0);
  const totalOccupied = docks.reduce((a, d) => a + Number(d.occupiedShips || 0), 0);
  const inventoryUtilization = totalCapacity > 0 ? safeDiv(totalOccupied, totalCapacity) * 100 : 0;
  const estimatedCost = allocations.reduce((a, al) => a + al.estimatedCost, 0);
  const totalSupply = shipmentDocs.reduce((a, s) => a + Number(s.cargoQuantity || 0), 0);
  const shortageAmount = Math.max(0, totalDemand - totalSupply);
  const highPriorityShipments = shipmentPriorities.filter((sp) => sp.priorityLevel >= 8).length;
  const efficiencyScore = Math.min(100, demandCoveragePercentage * 0.6 + (100 - inventoryUtilization) * 0.4);

  const metrics = {
    totalAllocation: Number(totalAllocation.toFixed(2)),
    demandCoveragePercentage: Number(demandCoveragePercentage.toFixed(2)),
    inventoryUtilization: Number(inventoryUtilization.toFixed(2)),
    estimatedCost: Number(estimatedCost.toFixed(2)),
    shortageAmount: Number(shortageAmount.toFixed(2)),
    highPriorityShipments,
    planEfficiencyScore: Number(efficiencyScore.toFixed(2)),
  };

  // ── 7. Try AI / TinyLlama Explanation ───────────────────────────────────────
  let llmExplanation = { fallbackUsed: true };
  const planSummaryForLLM = { planDate, portName, strategy, metrics, allocations: allocations.slice(0, 5), shipmentPriorities: shipmentPriorities.slice(0, 5) };

  try {
    const aiResp = await axios.post(
      `${AI_SERVICE_URL}/ai/generate-plan-explanation`,
      planSummaryForLLM,
      { timeout: 60000 }
    );
    if (aiResp.data && aiResp.data.planSummary) {
      llmExplanation = { ...aiResp.data, fallbackUsed: false };
    } else {
      llmExplanation = fallbackExplanation({ planDate, portName }, metrics, allocations, shipmentPriorities);
    }
  } catch {
    warnings.push('AI explanation service (TinyLlama) unavailable. Deterministic fallback explanation used.');
    llmExplanation = fallbackExplanation({ planDate, portName }, metrics, allocations, shipmentPriorities);
  }

  // ── 8. Upsert Plan ──────────────────────────────────────────────────────────
  const existingPlan = await SupplyPlan.findOne({ planDate, portName: new RegExp(`^${portName}$`, 'i') });

  if (existingPlan && ['approved', 'active', 'completed'].includes(existingPlan.status)) {
    return {
      plan: existingPlan,
      warnings: ['A finalized plan already exists for this date. Returning existing plan.'],
      isNew: false,
    };
  }

  const planData = {
    planDate,
    generatedTime: new Date(),
    generatedBy: 'AI',
    status: 'draft',
    portName,
    allocations,
    shipmentPriorities,
    metrics,
    llmExplanation,
  };

  let plan;
  if (existingPlan) {
    Object.assign(existingPlan, planData);
    plan = await existingPlan.save();
  } else {
    plan = await SupplyPlan.create(planData);
  }

  return { plan, warnings, isNew: !existingPlan };
};

module.exports = { generateDailyPlan, fallbackExplanation };
