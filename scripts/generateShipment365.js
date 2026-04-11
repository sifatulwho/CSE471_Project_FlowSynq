require('dotenv').config();
const mongoose = require('mongoose');
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

  const ports = String(getArg('ports', 'Chattogram Port')).split(',').map((s) => s.trim()).filter(Boolean);
  const docks = String(getArg('docks', 'GCB,NCT,CTG-1,CTG-2,OUTER')).split(',').map((s) => s.trim()).filter(Boolean);

  const startDate = new Date(`${start}T00:00:00.000Z`);
  if (Number.isNaN(startDate.getTime())) throw new Error(`Invalid --start date: ${start}`);

  await mongoose.connect(uri);

  for (const portName of ports) {
    const rng = mulberry32(seedFromString(`${start}|${days}|${portName}`));

    const docs = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);

      const perDay = randInt(rng, 1, 4);
      for (let n = 0; n < perDay; n++) {
        const arrival = new Date(d);
        arrival.setUTCHours(randInt(rng, 0, 23), randInt(rng, 0, 59), 0, 0);

        const shipName = `MV-DEMO-${portName.replace(/[^a-zA-Z0-9]/g, '')}-${d.toISOString().slice(0, 10)}-${String(n + 1).padStart(2, '0')}`;
        const containerCount = randInt(rng, 50, 220);
        const cargoQuantity = randInt(rng, 900, 5200);
        const assignedDock = docks[randInt(rng, 0, docks.length - 1)] || 'GCB';

        docs.push({
          shipName,
          arrivalTime: arrival,
          cargoQuantity,
          containerCount,
          portName,
          assignedDock,
          status: 'Docked',
          statusHistory: [
            { status: 'Docked', changedAt: arrival, changedBy: 'DEMO_SEED' },
          ],
        });
      }
    }

    const inserted = await Shipment.insertMany(docs, { ordered: false });
    // eslint-disable-next-line no-console
    console.log(`Inserted ${inserted.length} shipments for ${portName} starting ${start} (${days} days).`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});

