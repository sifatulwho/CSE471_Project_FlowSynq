const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Demand = require('./models/Demand');
  const Shipment = require('./models/Shipment');
  const p = 'Chattogram Port';

  const approvedDemand = await Demand.countDocuments({ portName: new RegExp('^' + p + '$', 'i'), status: 'approved' });
  const anyDemand = await Demand.countDocuments({ portName: new RegExp('^' + p + '$', 'i') });
  const ships = await Shipment.countDocuments({ portName: new RegExp('^' + p + '$', 'i') });
  const statuses = await Shipment.distinct('status', { portName: new RegExp('^' + p + '$', 'i') });
  const sampleD = await Demand.findOne({ portName: new RegExp('^' + p + '$', 'i') }).lean();

  console.log('Demand approved:', approvedDemand);
  console.log('Demand total:', anyDemand);
  console.log('Ships at Chattogram:', ships);
  console.log('Ship statuses:', statuses);
  console.log('Sample demand status:', sampleD && sampleD.status);
  console.log('Sample demand date:', sampleD && sampleD.date);

  // Check supply plan config collection
  try {
    const SupplyPlanConfig = require('./models/SupplyPlanConfig');
    const cfg = await SupplyPlanConfig.findOne({}).lean();
    console.log('SupplyPlanConfig exists:', !!cfg);
  } catch (e) {
    console.log('SupplyPlanConfig model error:', e.message);
  }

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
