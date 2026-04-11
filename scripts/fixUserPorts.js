/**
 * One-time migration: set `port` for legacy users missing it (fixes emergency alerts + JWT).
 * Run: node scripts/fixUserPorts.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const DEFAULT = process.env.DEFAULT_PORT_NAME || 'default';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await User.updateMany(
    { $or: [{ port: { $exists: false } }, { port: '' }, { port: null }] },
    { $set: { port: DEFAULT } }
  );
  console.log('Users matched:', result.matchedCount, 'modified:', result.modifiedCount);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
