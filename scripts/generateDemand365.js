require('dotenv').config();
const mongoose = require('mongoose');
const Demand = require('../models/Demand');

function getArg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.split('=').slice(1).join('=');
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI in environment.');
  }

  const days = Math.max(1, Number(getArg('days', '365')) || 365);
  const startArg = getArg('start', '');
  const start = startArg || new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const region = getArg('region', 'Chattogram Port');
  const regions = String(getArg('regions', region)).split(',').map((s) => s.trim()).filter(Boolean);
  const commodity = getArg('commodity', '');
  const approved = !hasFlag('pending');

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error(`Invalid --start date: ${start}`);
  }

  await mongoose.connect(uri);

  for (const r of regions) {
    const docs = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const qty = randInt(7000, 9000);
      docs.push({
        date: d,
        region: r,
        portName: r,
        commodity_type: commodity,
        commodity_quantity: qty,
        status: approved ? 'approved' : 'pending',
        batchId: `CLI-${d.toISOString().slice(0, 10)}`,
        batchNote: 'Auto-generated demo data (365-day CLI).',
        reviewedAt: approved ? new Date() : undefined,
      });
    }

    const result = await Demand.insertMany(docs, { ordered: true });
    // eslint-disable-next-line no-console
    console.log(`Inserted ${result.length} demand records for ${r} starting ${start}.`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
