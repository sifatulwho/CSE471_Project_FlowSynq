require('dotenv').config();
const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const shipments = await Shipment.find({ commodityType: { $exists: false } });
  let modifiedCount = 0;
  for (const shipment of shipments) {
    shipment.commodityType = 'Other';
    shipment.estimatedArrivalTime = shipment.arrivalTime;
    shipment.routeData = shipment.routeData || { totalDistanceNM: 0, waypoints: [], fetchedAt: null, routeApiSource: '' };
    shipment.weatherRiskAssessment = shipment.weatherRiskAssessment || {
      overallRiskScore: 0,
      riskLevel: 'low',
      weatherAlerts: [],
      forecasts: [],
      assessedAt: null,
      nextAssessmentDue: null,
    };
    shipment.delayInfo = shipment.delayInfo || {
      isDelayed: false,
      delayType: null,
      manualDelayReason: '',
      weatherDelayReason: '',
      predictedDelayHours: 0,
      actualDelayHours: 0,
      delayRecordedAt: null,
      delayRecordedBy: null,
    };
    shipment.demandSupplyImpact = shipment.demandSupplyImpact || {
      calculatedAt: null,
      commodityDemand: {
        forecastedMonthlyDemand: 0,
        currentMonthDelivered: 0,
        pendingDeliveries: 0,
        demandSupplyGap: 0,
        gapPercentage: 0,
      },
      priceImpactPrediction: {
        trend: 'stable',
        confidence: 0,
        reasoning: '',
        estimatedPriceChange: 0,
        timeframe: 'next 7-14 days',
      },
    };
    await shipment.save();
    modifiedCount += 1;
  }
  console.log(`Updated shipments: ${modifiedCount}`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
