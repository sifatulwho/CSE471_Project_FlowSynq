require('dotenv').config();
const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for shipment data repair.');

  const invalidNotesResult = await Shipment.updateMany(
    { notes: { $exists: true, $not: { $type: 'array' } } },
    { $set: { notes: [] } }
  );

  const invalidHistoryResult = await Shipment.updateMany(
    { statusHistory: { $exists: true, $not: { $type: 'array' } } },
    { $set: { statusHistory: [] } }
  );

  // Ensure docs missing arrays have defaults for stable UI/backend behavior.
  const missingNotesResult = await Shipment.updateMany(
    { notes: { $exists: false } },
    { $set: { notes: [] } }
  );

  const missingHistoryResult = await Shipment.updateMany(
    { statusHistory: { $exists: false } },
    { $set: { statusHistory: [] } }
  );

  console.log('Repair summary:', {
    invalidNotesFixed: invalidNotesResult.modifiedCount,
    invalidHistoryFixed: invalidHistoryResult.modifiedCount,
    missingNotesInitialized: missingNotesResult.modifiedCount,
    missingHistoryInitialized: missingHistoryResult.modifiedCount,
  });

  // Build schema indexes declared in Shipment model.
  await Shipment.syncIndexes();
  console.log('Shipment indexes synchronized.');

  await mongoose.disconnect();
  console.log('Repair complete.');
}

run().catch(async (error) => {
  console.error('Repair failed:', error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect failures
  }
  process.exit(1);
});
