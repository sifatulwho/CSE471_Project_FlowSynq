const Demand = require('../models/Demand');
const Shipment = require('../models/Shipment');

function isoDay(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
}

function dayRangeUtc(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

async function syncDailyOpsToDemand(dailyOpsDoc) {
  if (!dailyOpsDoc) return { upserted: 0 };

  const commodities = Array.isArray(dailyOpsDoc.commodities) ? dailyOpsDoc.commodities : [];
  const range = dayRangeUtc(dailyOpsDoc.date);
  const shipmentQuery = {
    portName: dailyOpsDoc.portName,
    status: 'Docked',
  };
  if (range) {
    shipmentQuery.arrivalTime = { $gte: range.start, $lte: range.end };
  }
  const dockedShipments = await Shipment.find(shipmentQuery).select('shipName commodityType').lean();

  const shipmentsByCommodity = dockedShipments.reduce((map, s) => {
    const key = normalizeKey(s.commodityType) || '__unknown__';
    const existing = map.get(key) || [];
    existing.push(String(s.shipName || '').trim());
    map.set(key, existing);
    return map;
  }, new Map());

  const allShipNames = Array.from(
    new Set(dockedShipments.map((s) => String(s.shipName || '').trim()).filter(Boolean))
  );

  let upserted = 0;
  const day = isoDay(dailyOpsDoc.date) || 'unknown';
  const batchId = `OPS-${String(dailyOpsDoc.portName || 'PORT').toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${day}`;

  for (const row of commodities) {
    const commodityType = String(row.commodityType || '').trim();
    if (!commodityType) continue;

    const shipKey = normalizeKey(commodityType);
    const matchedNames = shipmentsByCommodity.get(shipKey) || [];
    const uniqueNames = Array.from(new Set(matchedNames.filter(Boolean)));
    const shipName = uniqueNames.length
      ? uniqueNames.join(', ')
      : allShipNames.length === 1
      ? allShipNames[0]
      : '';

    await Demand.findOneAndUpdate(
      {
        portName: dailyOpsDoc.portName,
        commodity_type: commodityType,
        date: dailyOpsDoc.date,
      },
      {
        $set: {
          region: dailyOpsDoc.portName,
          portName: dailyOpsDoc.portName,
          commodity_type: commodityType,
          shipName,
          batchId,
          batchNote: 'Synced from DailyPortOps (daily entry).',

          commodity_quantity: Number(row.commodityQuantity || 0),
          container_count: Number(row.containerCount || 0),
          container_delivered: Number(row.containerDelivered || 0),
          remaining_commodity_container: Number(row.remainingCommodityContainer || 0),

          total_container: Number(dailyOpsDoc.totalContainer || 0),
          total_quantity: Number(dailyOpsDoc.totalQuantity || 0),
          total_handled: Number(dailyOpsDoc.totalHandled || 0),
          remaining_container: Number(dailyOpsDoc.remainingContainer || 0),
          total_delivered: Number(dailyOpsDoc.totalDelivered || 0),
          total_shipments: Number(dailyOpsDoc.totalShipments || 0),
          total_delayed_shipments: Number(dailyOpsDoc.totalDelayedShipments || 0),

          berth_location: dailyOpsDoc.berthLocation || '',
          berth_capacity: Number(dailyOpsDoc.berthCapacity || 0),
          berth_vacancy: Number(dailyOpsDoc.berthVacancy || 0),

          sourceDailyOpsId: dailyOpsDoc._id,
          status: dailyOpsDoc.status || 'pending',
          submittedBy: dailyOpsDoc.submittedBy,
          reviewedBy: dailyOpsDoc.reviewedBy,
          reviewedAt: dailyOpsDoc.reviewedAt,
          rejectionReason: dailyOpsDoc.rejectionReason || '',
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    upserted += 1;
  }

  return { upserted };
}

module.exports = { syncDailyOpsToDemand };