const Shipment = require('../models/Shipment');
const Tank = require('../models/Tank');
const Demand = require('../models/Demand');
const DailyPortOps = require('../models/DailyPortOps');

const toNum = (v) => Number(v) || 0;

// Clamp a score into a 0-100 band with a sweet-spot window
function healthScore(value, low, high) {
  if (value >= low && value <= high) return 100;
  if (value < low) return Math.max(0, (value / low) * 100);
  // penalise overuse
  const over = value - high;
  return Math.max(0, 100 - over * 2);
}

exports.getCostSummary = async (req, res) => {
  try {
    const { startDate, endDate, portName, commodityType } = req.query;

    // Auth & port scoping
    // Analysts are always scoped to their own port.
    // Admins can filter by portName query param; if blank, no port filter (see all).
    const role = String(req.user?.role || '').toLowerCase();
    const userPort = String(req.user?.portName || '').trim();
    let filterPort = '';
    if (role === 'analyst' || role === 'operator' || role === 'organization') {
      filterPort = userPort; // always scoped to the user's port
    } else if (role === 'admin') {
      filterPort = String(portName || '').trim(); // optional filter
    }

    // Default to last 90 days for faster first paint (client can widen the range)
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Build queries — only add portName filter when a non-empty port is specified
    const opsQuery    = { date:        { $gte: start, $lte: end } };
    const shipQuery   = { arrivalTime: { $gte: start, $lte: end } };
    const demandQuery = { date:        { $gte: start, $lte: end } };
    const tankQuery   = {};

    if (filterPort) {
      const portRegex = new RegExp(`^${filterPort.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      opsQuery.portName    = portRegex;
      shipQuery.portName   = portRegex;
      demandQuery.portName = portRegex;
      tankQuery.location   = portRegex;
    }
    if (commodityType && String(commodityType).trim()) {
      const comRegex = new RegExp(`^${String(commodityType).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      shipQuery.commodityType      = comRegex;
      demandQuery.commodity_type   = comRegex;
    }

    const [shipments, tanks, demands, dailyOps] = await Promise.all([
      Shipment.find(shipQuery).sort({ arrivalTime: -1 }).limit(2000).lean(),
      Tank.find(tankQuery).limit(500).lean(),
      Demand.find(demandQuery).limit(2000).lean(),
      DailyPortOps.find(opsQuery).limit(500).lean(),
    ]);

    // ─── 1. Fulfillment Rate ────────────────────────────────────────────────
    const totalDelivered = dailyOps.reduce((s, d) => s + toNum(d.totalDelivered), 0)
      + demands.reduce((s, d) => s + toNum(d.container_delivered), 0);
    const totalDemand    = demands.reduce((s, d) =>
      s + toNum(d.demand_quantity ?? d.commodity_quantity ?? d.total_quantity), 0);
    const fulfillmentRate = totalDemand > 0
      ? Math.min(100, (totalDelivered / totalDemand) * 100) : 0;

    // ─── 2. Storage Utilization ─────────────────────────────────────────────
    const totalCapacity = tanks.reduce((s, t) => s + toNum(t.capacity), 0);
    const totalLevel    = tanks.reduce((s, t) => s + toNum(t.currentLevel), 0);
    const storageUtilization = totalCapacity > 0
      ? (totalLevel / totalCapacity) * 100 : 0;

    // ─── 3. Berth / Dock Utilization ────────────────────────────────────────
    const totalBerthCap     = dailyOps.reduce((s, d) => s + toNum(d.berthCapacity), 0);
    const totalBerthVacancy = dailyOps.reduce((s, d) => s + toNum(d.berthVacancy), 0);
    const occupiedBerth     = Math.max(0, totalBerthCap - totalBerthVacancy);
    const berthUtilization  = totalBerthCap > 0
      ? (occupiedBerth / totalBerthCap) * 100 : 0;

    // ─── 4. Shipment Throughput ─────────────────────────────────────────────
    const shipmentThroughput = shipments.length;

    // ─── 5. Delay Rate ──────────────────────────────────────────────────────
    const delayedCount = shipments.filter(s => s.status === 'Delayed').length;
    const delayRate = shipmentThroughput > 0
      ? (delayedCount / shipmentThroughput) * 100 : 0;

    // ─── 6. Efficiency Score ────────────────────────────────────────────────
    const storageHealth = healthScore(storageUtilization, 70, 85);
    const berthHealth   = healthScore(berthUtilization, 70, 90);
    const nonDelayScore = 100 - delayRate;
    const efficiencyScore = (fulfillmentRate + storageHealth + berthHealth + nonDelayScore) / 4;

    // ─── Charts ─────────────────────────────────────────────────────────────
    // Demand vs Delivered (daily aggregation)
    const dvdMap = {};
    demands.forEach(d => {
      const day = new Date(d.date).toISOString().slice(0, 10);
      if (!dvdMap[day]) dvdMap[day] = { date: day, demand: 0, delivered: 0 };
      dvdMap[day].demand += toNum(d.demand_quantity ?? d.commodity_quantity ?? d.total_quantity);
    });
    dailyOps.forEach(d => {
      const day = new Date(d.date).toISOString().slice(0, 10);
      if (!dvdMap[day]) dvdMap[day] = { date: day, demand: 0, delivered: 0 };
      dvdMap[day].delivered += toNum(d.totalDelivered);
    });
    const demandVsDelivered = Object.values(dvdMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60);

    // Shipment Throughput trend (daily count)
    const throughputMap = {};
    shipments.forEach(s => {
      const day = new Date(s.arrivalTime).toISOString().slice(0, 10);
      throughputMap[day] = (throughputMap[day] || 0) + 1;
    });
    const shipmentThroughputTrend = Object.entries(throughputMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60);

    // Utilization trend (daily berth + storage combined)
    const utilMap = {};
    dailyOps.forEach(d => {
      const day = new Date(d.date).toISOString().slice(0, 10);
      if (!utilMap[day]) utilMap[day] = { date: day, berthCap: 0, berthVac: 0 };
      utilMap[day].berthCap += toNum(d.berthCapacity);
      utilMap[day].berthVac += toNum(d.berthVacancy);
    });
    const utilizationTrend = Object.values(utilMap)
      .map(row => ({
        date: row.date,
        berthUtilization: row.berthCap > 0
          ? Math.round(((row.berthCap - row.berthVac) / row.berthCap) * 100) : 0,
        storageUtilization: Math.round(storageUtilization),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60);

    // ─── Insights ────────────────────────────────────────────────────────────
    const insights = [];
    if (fulfillmentRate < 85)
      insights.push({ level: 'warn', text: 'Fulfillment rate is below 85%. Review supply planning and delayed shipments.' });
    if (storageUtilization > 90)
      insights.push({ level: 'danger', text: 'Storage utilization is critically high. Risk of yard congestion.' });
    else if (storageUtilization < 40)
      insights.push({ level: 'info', text: 'Storage utilization is low. Storage resources may be underused.' });
    if (berthUtilization > 90)
      insights.push({ level: 'danger', text: 'Berth utilization is very high. Possible dock congestion — review scheduling.' });
    if (delayRate > 20)
      insights.push({ level: 'warn', text: 'High delay rate detected. Review delayed shipments and berth scheduling.' });
    if (efficiencyScore >= 85)
      insights.push({ level: 'success', text: 'Port operations are performing well. Efficiency score is above 85%.' });
    if (insights.length === 0)
      insights.push({ level: 'info', text: 'Operations are stable. All metrics within normal parameters.' });

    // ─── Recent Records ──────────────────────────────────────────────────────
    const recentRecords = shipments
      .slice(-20)
      .reverse()
      .map(s => ({
        _id: s._id,
        shipName: s.shipName,
        commodity: s.commodityType || s.gasType || '—',
        status: s.status,
        cargoQuantity: s.cargoQuantity,
        containerCount: s.containerCount,
        assignedDock: s.assignedDock || '—',
        arrivalTime: s.arrivalTime,
      }));

    return res.json({
      kpis: {
        fulfillmentRate:     Math.round(fulfillmentRate * 10) / 10,
        storageUtilization:  Math.round(storageUtilization * 10) / 10,
        berthUtilization:    Math.round(berthUtilization * 10) / 10,
        shipmentThroughput,
        delayRate:           Math.round(delayRate * 10) / 10,
        efficiencyScore:     Math.round(efficiencyScore * 10) / 10,
      },
      charts: {
        demandVsDelivered,
        shipmentThroughputTrend,
        utilizationTrend,
      },
      insights,
      recentRecords,
    });
  } catch (error) {
    console.error('Performance Analytics Error:', error);
    return res.status(500).json({ message: 'Error generating performance analytics.' });
  }
};
