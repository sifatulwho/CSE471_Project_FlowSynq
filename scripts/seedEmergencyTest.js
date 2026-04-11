/**
 * Inserts one dummy row into emergency_alerts to verify schema + DB connectivity.
 * Run: node scripts/seedEmergencyTest.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const EmergencyLog = require('../models/EmergencyLog');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const doc = await EmergencyLog.create({
    type: 'emergency',
    severity: 'high',
    title: 'Dummy drill (seed)',
    message: 'This is a test document for the emergency_alerts collection.',
    sender: 'System',
    triggeredBy: 'System',
    triggeredByRole: 'operator',
    port: process.env.DEFAULT_PORT_NAME || 'default',
    location: 'Test berth',
    incidentTime: new Date(),
  });
  console.log('Inserted emergency alert id:', doc._id.toString());
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
