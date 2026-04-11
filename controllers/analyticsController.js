const Shipment = require('../models/Shipment');
const Tank = require('../models/Tank');
const Demand = require('../models/Demand');
const DailyPortOps = require('../models/DailyPortOps');

const DEFAULT_FUEL_RATE = 0.12;
const DEFAULT_HOLDING_RATE = 0.03;
const DEFAULT_DELAY_PENALTY_RATE = 90;
const DEFAULT_HANDLING_RATE = 8;

const toNum = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const safePct = (num, den) => (den > 0 ? (num / den) * 100 : 0);

const toDateOnlyKey = (date) => {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const buildDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const buildShipmentQuery = ({ req, start, end, portName, commodityType, shipmentStatus }) => {
  const query = { arrivalTime: { $gte: start, $lte: end } };
  const role = String(req.user?.role || '').toLowerCase();
  const userPort = String(req.user?.portName || '').trim();

  if (role !== 'admin' && userPort) {
    query.portName = userPort;
  } else if (portName) {
    query.portName = portName;
  }

  if (commodityType) {
    query.commodityType = commodityType;
  }
  if (shipmentStatus) {
    query.status = shipmentStatus;
  }
  return query;
};

const buildCommonQuery = ({ req, portName }) => {
  const role = String(req.user?.role || '').toLowerCase();
  const userPort = String(req.user?.portName || '').trim();
  if (role !== 'admin' && userPort) return { portName: userPort };
  if (portName) return { portName };
  return {};
};

const generatePlannedVsActual = ({
  avgCostPerShipment,
  actualDeliveryTime,
  forecastDemand,
  actualDelivered,
  fulfillmentRate,
  inventoryHoldingCost,
}) => {
  const rows = [
    { metric: 'Shipment Cost', planned: avgCostPerShipment * 0.93, actual: avgCostPerShipment, improveLower: true, unit: '$' },
    { metric: 'Delivery Time', planned: 18, actual: actualDeliveryTime, improveLower: true, unit: 'h' },
    { metric: 'Supply Quantity', planned: forecastDemand, actual: actualDelivered, improveLower: false, unit: 'MT' },
    { metric: 'Fulfillment Rate', planned: 92, actual: fulfillmentRate, improveLower: false, unit: '%' },
    { metric: 'Inventory Cost', planned: inventoryHoldingCost * 0.9, actual: inventoryHoldingCost, improveLower: true, unit: '$' },
  ];

  return rows.map((row) => {
    const variance = row.actual - row.planned;
    const improved = row.improveLower ? variance <= 0 : variance >= 0;
    return {
      metric: row.metric,
      planned: Number(row.planned.toFixed(2)),
      actual: Number(row.actual.toFixed(2)),
      variance: Number(variance.toFixed(2)),
      status: improved ? 'Improved' : 'Needs Attention',
      unit: row.unit,
    };
  });
};

const buildInefficiencies = ({ costBreakdown, kpis, trends }) => {
  const list = [];
  if (kpis.avgCostPerShipment > 700) {
    list.push({
      title: 'High Transport Cost',
      detail: `Average shipment cost is ${kpis.avgCostPerShipment.toFixed(0)}, which is above expected benchmark.`,
      severity: 'high',
    });
  }
  if (kpis.storageUtilization < 45) {
    list.push({
      title: 'Idle Storage Capacity',
      detail: `Storage utilization is ${kpis.storageUtilization.toFixed(1)}%, indicating underuse of tank and berth assets.`,
      severity: 'medium',
    });
  }
  if (kpis.storageUtilization > 90) {
    list.push({
      title: 'Storage Congestion Risk',
      detail: `Storage utilization is ${kpis.storageUtilization.toFixed(1)}%, indicating capacity pressure.`,
      severity: 'high',
    });
  }
  if (kpis.fulfillmentRate < 85) {
    list.push({
      title: 'Fulfillment Performance Drop',
      detail: `Fulfillment rate is ${kpis.fulfillmentRate.toFixed(1)}%, below target threshold.`,
      severity: 'high',
    });
  }
  if (costBreakdown.delay > Math.max(1, costBreakdown.transport * 0.2)) {
    list.push({
      title: 'Delivery Delay Risk',
      detail: 'Delay cost is consuming more than 20% of transport spend.',
      severity: 'high',
    });
  }
  if ((trends || []).length >= 2) {
    const first = trends[0];
    const last = trends[trends.length - 1];
    if (last.avgCostPerShipment > first.avgCostPerShipment * 1.2) {
      list.push({
        title: 'Rising Cost Trend',
        detail: 'Average cost per shipment trend increased by more than 20% over the selected period.',
        severity: 'medium',
      });
    }
  }
  return list;
};

const buildFallbackRecommendations = ({ inefficiencies }) => inefficiencies.slice(0, 4).map((item, idx) => {
  if (item.title.includes('Transport')) {
    return { problem: item.title, recommendation: 'Prioritize lower-distance dock assignments for affected shipments.', expectedSaving: 500 + idx * 120 };
  }
  if (item.title.includes('Storage')) {
    return { problem: item.title, recommendation: 'Rebalance tank loading plan across available ports and commodities.', expectedSaving: 700 + idx * 110 };
  }
  if (item.title.includes('Fulfillment')) {
    return { problem: item.title, recommendation: 'Increase supply planning buffer and expedite delayed lots.', expectedSaving: 900 + idx * 95 };
  }
  return { problem: item.title, recommendation: 'Investigate the flagged operational pattern and adjust allocation rules.', expectedSaving: 400 + idx * 75 };
});

const fetchAiRecommendations = async ({ payload, inefficiencies, efficiencyScore }) => {
  const serviceUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8001/analytics/recommendations';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Analytics AI failed (${response.status})`);
    const data = await response.json();
    return {
      inefficiencies: Array.isArray(data.inefficiencies) && data.inefficiencies.length ? data.inefficiencies : inefficiencies,
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      score: toNum(data.score, efficiencyScore),
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      inefficiencies,
      recommendations: buildFallbackRecommendations({ inefficiencies }),
      score: efficiencyScore,
    };
  }
};

exports.getCostPerformanceAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, portName = '', commodityType = '', shipmentStatus = '', comparePreviousPeriod = 'false' } = req.query;
    const range = buildDateRange(startDate, endDate);
    if (!range) {
      return res.status(400).json({ message: 'Invalid startDate or endDate.' });
    }

    const shipmentQuery = buildShipmentQuery({
      req,
      start: range.start,
      end: range.end,
      portName: String(portName).trim(),
      commodityType: String(commodityType).trim(),
      shipmentStatus: String(shipmentStatus).trim(),
    });
    const commonQuery = buildCommonQuery({ req, portName: String(portName).trim() });

    const [shipments, tanks, demands, dailyOps] = await Promise.all([
      Shipment.find(shipmentQuery).lean(),
      Tank.find(commonQuery).lean(),
      Demand.find({
        ...commonQuery,
        ...(commodityType ? { commodity_type: commodityType } : {}),
        date: { $gte: range.start, $lte: range.end },
      }).lean(),
      DailyPortOps.find({
        ...commonQuery,
        date: { $gte: range.start, $lte: range.end },
      }).lean(),
    ]);

    const shipmentCount = shipments.length;
    const transportCost = shipments.reduce((sum, s) => {
      const distance = toNum(s?.routeData?.totalDistanceNM, 120);
      const weight = toNum(s.cargoQuantity, 0);
      return sum + (distance * DEFAULT_FUEL_RATE * weight);
    }, 0);

    const delayCost = shipments.reduce((sum, s) => {
      const predicted = toNum(s?.delayInfo?.predictedDelayHours, 0);
      const actual = toNum(s?.delayInfo?.actualDelayHours, 0);
      const inferred = s.status === 'Delayed' && predicted + actual === 0 ? 6 : 0;
      return sum + (predicted + actual + inferred) * DEFAULT_DELAY_PENALTY_RATE;
    }, 0);

    const handlingCost = dailyOps.reduce((sum, d) => sum + toNum(d.totalHandled, 0) * DEFAULT_HANDLING_RATE, 0);

    const totalCapacity = tanks.reduce((sum, t) => sum + toNum(t.capacity, 0), 0);
    const totalUsed = tanks.reduce((sum, t) => sum + toNum(t.currentLevel, 0), 0);
    const storageUtilization = clamp(safePct(totalUsed, totalCapacity), 0, 100);

    const daySpan = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000)));
    const inventoryHoldingCost = totalUsed * DEFAULT_HOLDING_RATE * daySpan;

    const forecastDemand = demands.reduce((sum, d) => sum + toNum(d.commodity_quantity || d.demand_quantity, 0), 0);
    const actualDelivered = demands.reduce((sum, d) => sum + toNum(d.total_delivered || d.container_delivered, 0), 0);
    const fulfillmentRate = clamp(safePct(actualDelivered, forecastDemand), 0, 100);

    const costBreakdown = {
      transport: Number(transportCost.toFixed(2)),
      storage: Number(inventoryHoldingCost.toFixed(2)),
      delay: Number(delayCost.toFixed(2)),
      handling: Number(handlingCost.toFixed(2)),
    };
    const totalCost = costBreakdown.transport + costBreakdown.storage + costBreakdown.delay + costBreakdown.handling;
    const avgCostPerShipment = shipmentCount > 0 ? totalCost / shipmentCount : 0;

    const shipmentByDay = {};
    shipments.forEach((s) => {
      const key = toDateOnlyKey(s.arrivalTime);
      if (!key) return;
      if (!shipmentByDay[key]) shipmentByDay[key] = [];
      shipmentByDay[key].push(s);
    });
    const demandByDay = {};
    demands.forEach((d) => {
      const key = toDateOnlyKey(d.date);
      if (!key) return;
      if (!demandByDay[key]) demandByDay[key] = [];
      demandByDay[key].push(d);
    });
    const dailyOpsByDay = {};
    dailyOps.forEach((d) => {
      const key = toDateOnlyKey(d.date);
      if (!key) return;
      dailyOpsByDay[key] = d;
    });

    const allDays = Array.from(new Set([
      ...Object.keys(shipmentByDay),
      ...Object.keys(demandByDay),
      ...Object.keys(dailyOpsByDay),
    ])).sort();

    const trends = allDays.map((day) => {
      const dayShipments = shipmentByDay[day] || [];
      const dayDemands = demandByDay[day] || [];
      const dayOps = dailyOpsByDay[day];

      const dayTransport = dayShipments.reduce((sum, s) => sum + toNum(s?.routeData?.totalDistanceNM, 120) * DEFAULT_FUEL_RATE * toNum(s.cargoQuantity, 0), 0);
      const dayDelay = dayShipments.reduce((sum, s) => sum + (toNum(s?.delayInfo?.predictedDelayHours, 0) + toNum(s?.delayInfo?.actualDelayHours, 0)) * DEFAULT_DELAY_PENALTY_RATE, 0);
      const dayHandling = toNum(dayOps?.totalHandled, 0) * DEFAULT_HANDLING_RATE;
      const dayTotalCost = dayTransport + dayDelay + dayHandling;
      const dayForecast = dayDemands.reduce((sum, d) => sum + toNum(d.commodity_quantity || d.demand_quantity, 0), 0);
      const dayDelivered = dayDemands.reduce((sum, d) => sum + toNum(d.total_delivered || d.container_delivered, 0), 0);
      const dayFulfillment = clamp(safePct(dayDelivered, dayForecast), 0, 100);
      const dayStorageUtilization = dayOps
        ? clamp(safePct(toNum(dayOps.berthCapacity, 0) - Math.max(0, toNum(dayOps.berthVacancy, 0)), toNum(dayOps.berthCapacity, 0)), 0, 100)
        : storageUtilization;

      return {
        date: day,
        totalCost: Number(dayTotalCost.toFixed(2)),
        fulfillmentRate: Number(dayFulfillment.toFixed(2)),
        storageUtilization: Number(dayStorageUtilization.toFixed(2)),
        avgCostPerShipment: Number((dayShipments.length ? dayTotalCost / dayShipments.length : 0).toFixed(2)),
      };
    });

    const costByPortMap = {};
    shipments.forEach((s) => {
      const port = String(s.portName || 'Unknown');
      const amount = toNum(s?.routeData?.totalDistanceNM, 120) * DEFAULT_FUEL_RATE * toNum(s.cargoQuantity, 0);
      costByPortMap[port] = (costByPortMap[port] || 0) + amount;
    });
    const costByPort = Object.entries(costByPortMap).map(([port, cost]) => ({
      port,
      cost: Number(cost.toFixed(2)),
    })).sort((a, b) => b.cost - a.cost);

    const avgDeliveryTime = shipments.length
      ? shipments.reduce((sum, s) => sum + toNum(s?.delayInfo?.predictedDelayHours, 0) + 18, 0) / shipments.length
      : 0;

    const baseEfficiency = (
      (100 - clamp(safePct(costBreakdown.delay, Math.max(totalCost, 1)) * 100 / 25, 0, 100)) * 0.2
      + (100 - clamp(avgCostPerShipment / 12, 0, 100)) * 0.2
      + clamp(fulfillmentRate, 0, 100) * 0.35
      + (100 - Math.abs(storageUtilization - 75) * 2) * 0.25
    );
    const efficiencyScore = clamp(baseEfficiency, 0, 100);

    const kpis = {
      totalCost: Number(totalCost.toFixed(2)),
      avgCostPerShipment: Number(avgCostPerShipment.toFixed(2)),
      fulfillmentRate: Number(fulfillmentRate.toFixed(2)),
      storageUtilization: Number(storageUtilization.toFixed(2)),
      delayCost: Number(delayCost.toFixed(2)),
      efficiencyScore: Number(efficiencyScore.toFixed(2)),
    };

    const plannedVsActual = generatePlannedVsActual({
      avgCostPerShipment,
      actualDeliveryTime: avgDeliveryTime,
      forecastDemand,
      actualDelivered,
      fulfillmentRate,
      inventoryHoldingCost,
    });

    const inefficiencies = buildInefficiencies({ costBreakdown, kpis, trends });

    const optimizationSavings = shipments.reduce((sum, s) => sum + toNum(s?.optimizationRecommendation?.estimatedCostSaving, 0), 0);

    const aiPayload = {
      filters: { startDate: range.start, endDate: range.end, portName, commodityType, shipmentStatus },
      kpis,
      costBreakdown,
      optimizationSavings,
      trends,
      inefficiencies,
    };
    const aiResult = await fetchAiRecommendations({ payload: aiPayload, inefficiencies, efficiencyScore: kpis.efficiencyScore });
    kpis.efficiencyScore = Number(clamp(toNum(aiResult.score, kpis.efficiencyScore), 0, 100).toFixed(2));

    let previousPeriod = null;
    if (String(comparePreviousPeriod).toLowerCase() === 'true') {
      const ms = range.end.getTime() - range.start.getTime();
      const prevEnd = new Date(range.start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - ms);
      const prevShipments = await Shipment.find({
        ...buildShipmentQuery({ req, start: prevStart, end: prevEnd, portName, commodityType, shipmentStatus }),
      }).lean();
      const prevTransport = prevShipments.reduce((sum, s) => sum + toNum(s?.routeData?.totalDistanceNM, 120) * DEFAULT_FUEL_RATE * toNum(s.cargoQuantity, 0), 0);
      previousPeriod = {
        startDate: prevStart,
        endDate: prevEnd,
        shipmentCount: prevShipments.length,
        totalTransportCost: Number(prevTransport.toFixed(2)),
      };
    }

    return res.json({
      filters: {
        startDate: range.start,
        endDate: range.end,
        portName: portName || commonQuery.portName || '',
        commodityType: commodityType || '',
        shipmentStatus: shipmentStatus || '',
        comparePreviousPeriod: String(comparePreviousPeriod).toLowerCase() === 'true',
      },
      kpis,
      costBreakdown,
      costByPort,
      dailyCostTrend: trends.map((t) => ({ date: t.date, totalCost: t.totalCost })),
      plannedVsActual,
      trends,
      inefficiencies: aiResult.inefficiencies,
      recommendations: aiResult.recommendations,
      optimizationSavings: Number(optimizationSavings.toFixed(2)),
      previousPeriod,
    });
  } catch (error) {
    console.error('Cost & performance analytics error:', error);
    return res.status(500).json({ message: 'Unable to generate cost & performance analytics.' });
  }
};
