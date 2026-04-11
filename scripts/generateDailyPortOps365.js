require('dotenv').config();
const mongoose = require('mongoose');
const DailyPortOps = require('../models/DailyPortOps');
const Shipment = require('../models/Shipment');

function getArg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.split('=').slice(1).join('=');
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI in environment.');

  const days = Math.max(1, Number(getArg('days', '365')) || 365);
  const startArg = getArg('start', '');
  const start = startArg || new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const portName = getArg('portName', 'Chattogram Port');
  const berthCapacityArg = Math.max(0, Number(getArg('berthCapacity', '0')) || 0);
  const berthLocations = String(getArg('berths', 'GCB,NCT,CCT,JETTY-1,JETTY-2')).split(',').map((s) => s.trim()).filter(Boolean);

  const berthCapacities = {
    'GCB': berthCapacityArg || 2500,
    'NCT': berthCapacityArg || 2000,
    'CCT': berthCapacityArg || 1800,
    'JETTY-1': berthCapacityArg || 1500,
    'JETTY-2': berthCapacityArg || 1200,
  };

  const startDate = new Date(`${start}T00:00:00.000Z`);
  if (Number.isNaN(startDate.getTime())) throw new Error(`Invalid --start date: ${start}`);

  const rng = mulberry32(seedFromString(`${start}|${days}|${portName}|DailyOps`));

  await mongoose.connect(uri);

  let previousRemaining = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const dayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

    const shipments = await Shipment.find({
      portName,
      status: 'Docked',
      arrivalTime: { $gte: dayStart, $lte: dayEnd },
    }).select('shipName containerCount cargoQuantity').lean();

    const shipmentSnapshots = shipments.map((s) => ({
      shipName: s.shipName,
      containerCount: Number(s.containerCount || 0) || 0,
      cargoQuantity: Number(s.cargoQuantity || 0) || 0,
    }));

    const totalContainer = shipmentSnapshots.reduce((acc, s) => acc + s.containerCount, 0);
    const totalQuantity = shipmentSnapshots.reduce((acc, s) => acc + s.cargoQuantity, 0);

    const totalHandled = Math.min(totalContainer, randInt(rng, 0, Math.max(0, totalContainer)));
    const remainingContainer = Math.max(0, totalContainer - totalHandled);

    const commodities = [  'Container',
    'General Cargo',
    'Food Grain',
    'Fertilizer',
    'Clinker',
    'Sugar',
    'Salt',
    'Rapeseed',
    'Mustard Seed',
    'Oil Tanker', 'Other'];
    const rowsCount = randInt(rng, 2, 5);
    const used = new Set();
    const commodityRows = [];
    for (let r = 0; r < rowsCount; r++) {
      let c = commodities[randInt(rng, 0, commodities.length - 1)];
      while (used.has(c)) c = commodities[randInt(rng, 0, commodities.length - 1)];
      used.add(c);

      const containerCount = randInt(rng, 10, Math.max(10, Math.floor(totalContainer / 2) || 60));
      const containerDelivered = randInt(rng, 0, containerCount);
      const commodityQuantity = randInt(rng, 200, 2500);

      commodityRows.push({
        commodityType: c,
        containerCount,
        commodityQuantity,
        containerDelivered,
        remainingCommodityContainer: Math.max(0, containerCount - containerDelivered),
      });
    }

    const totalDelivered = commodityRows.reduce((acc, r) => acc + r.containerDelivered, 0);
    const berthLocation = berthLocations[randInt(rng, 0, berthLocations.length - 1)] || 'GCB';
    const berthCapacity = berthCapacities[berthLocation] || 2500;
    const berthVacancy = berthCapacity - (totalContainer + previousRemaining - totalDelivered);

    await DailyPortOps.findOneAndUpdate(
      { portName, date: dayStart },
      {
        $set: {
          portName,
          date: dayStart,
          shipments: shipmentSnapshots,
          totalContainer,
          totalQuantity,
          totalHandled,
          remainingContainer,
          berthLocation,
          berthCapacity,
          berthVacancy,
          totalDelivered,
          commodities: commodityRows,
        },
      },
      { upsert: true, new: true }
    );

    previousRemaining = remainingContainer;
  }

  // eslint-disable-next-line no-console
  console.log(`Generated DailyPortOps for ${portName} starting ${start} (${days} days).`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});

