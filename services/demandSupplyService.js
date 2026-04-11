const Demand = require('../models/Demand');
const Shipment = require('../models/Shipment');
const { predictPriceImpact } = require('./priceImpactService');

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
};

const sumField = (docs, field) => docs.reduce((sum, doc) => sum + Number(doc[field] || 0), 0);

const analyzeDemandSupplyImpact = async ({ shipment, predictedDelayHours = 0 }) => {
  const commodityType = shipment.commodityType || 'Other';
  const portName = shipment.portName || '';
  const { start, end } = getMonthRange();

  const demandRows = await Demand.find({
    status: 'approved',
    commodity_type: new RegExp(`^${commodityType.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i'),
    portName,
    date: { $gte: start, $lt: end },
  }).select('commodity_quantity demand_quantity').lean();

  const forecastedMonthlyDemand = sumField(demandRows, 'commodity_quantity') || sumField(demandRows, 'demand_quantity');

  const deliveredShipments = await Shipment.find({
    commodityType,
    portName,
    arrivalTime: { $gte: start, $lt: end },
    status: { $in: ['Docked', 'Unloading', 'Unloaded'] },
  }).select('cargoQuantity').lean();
  const currentMonthDelivered = sumField(deliveredShipments, 'cargoQuantity');

  const pendingShipments = await Shipment.find({
    commodityType,
    portName,
    status: { $in: ['En Route', 'Delayed'] },
  }).select('cargoQuantity').lean();
  const pendingDeliveries = sumField(pendingShipments, 'cargoQuantity');

  const demandSupplyGap = Number((forecastedMonthlyDemand - (currentMonthDelivered + pendingDeliveries)).toFixed(2));
  const gapPercentage = forecastedMonthlyDemand > 0
    ? Number(((demandSupplyGap / forecastedMonthlyDemand) * 100).toFixed(2))
    : 0;

  const priceImpactPrediction = predictPriceImpact({
    gapPercentage,
    predictedDelayHours,
    delayedQuantity: Number(shipment.cargoQuantity || 0),
    demandSupplyGap,
  });

  return {
    calculatedAt: new Date(),
    commodityDemand: {
      forecastedMonthlyDemand,
      currentMonthDelivered,
      pendingDeliveries,
      demandSupplyGap,
      gapPercentage,
    },
    priceImpactPrediction,
  };
};

module.exports = { analyzeDemandSupplyImpact };
