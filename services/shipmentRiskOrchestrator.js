const { calculateRoute } = require('./marineRouteService');
const { assessWeatherRisk } = require('./weatherRiskService');
const { analyzeDemandSupplyImpact } = require('./demandSupplyService');

const emitAlert = (req, payload) => {
  const io = req.app.get('io');
  if (!io) return;
  io.emit('shipment_risk_alert', payload);
};

const WeatherRiskLog = require('../models/WeatherRiskLog');

const enrichShipmentRisk = async ({ req, shipment, triggeredByUserId }) => {
  let routeData = shipment.routeData;
  if (!routeData?.waypoints?.length && shipment.startingPort?.coordinates && shipment.destinationPort?.coordinates) {
    routeData = await calculateRoute({
      startingPort: shipment.startingPort,
      destinationPort: shipment.destinationPort,
    });
    shipment.routeData = routeData;
  }

  const weatherRisk = await assessWeatherRisk({
    routeData: shipment.routeData,
    estimatedArrivalTime: shipment.estimatedArrivalTime || shipment.arrivalTime,
  });
  shipment.weatherRiskAssessment = {
    overallRiskScore: weatherRisk.overallRiskScore,
    riskLevel: weatherRisk.riskLevel,
    weatherAlerts: weatherRisk.weatherAlerts,
    forecasts: weatherRisk.forecasts,
    assessedAt: weatherRisk.assessedAt,
    nextAssessmentDue: weatherRisk.nextAssessmentDue,
  };

  // Log the assessment
  try {
    await WeatherRiskLog.create({
      shipmentId: shipment._id,
      riskScore: weatherRisk.overallRiskScore,
      riskLevel: weatherRisk.riskLevel,
      predictedDelayHours: weatherRisk.predictedDelayHours,
      reason: weatherRisk.weatherDelayReason,
      weatherDetails: weatherRisk.forecasts?.slice(0, 5), // Log some sample forecasts
      assessedAt: weatherRisk.assessedAt,
      triggeredBy: triggeredByUserId ? 'User' : 'System',
    });
  } catch (logErr) {
    console.error('[shipmentRiskOrchestrator] Failed to log weather risk:', logErr.message);
  }

  if (weatherRisk.predictedDelayHours > 0) {
    shipment.delayInfo = {
      ...shipment.delayInfo,
      isDelayed: true,
      delayType: shipment.delayInfo?.delayType === 'manual' ? 'both' : 'weather_predicted',
      weatherDelayReason: weatherRisk.weatherDelayReason,
      predictedDelayHours: weatherRisk.predictedDelayHours,
      delayRecordedAt: new Date(),
      delayRecordedBy: triggeredByUserId || shipment.delayInfo?.delayRecordedBy || null,
    };
    if (shipment.status !== 'Delayed') {
      shipment.statusHistory.push({
        status: 'Delayed',
        changedAt: new Date(),
        changedBy: 'weather-risk-engine',
      });
      shipment.status = 'Delayed';
    }

    shipment.demandSupplyImpact = await analyzeDemandSupplyImpact({
      shipment,
      predictedDelayHours: weatherRisk.predictedDelayHours,
    });
  }

  if (weatherRisk.riskLevel === 'high' || weatherRisk.riskLevel === 'critical') {
    emitAlert(req, {
      type: 'weather_risk',
      shipmentId: shipment._id,
      riskLevel: weatherRisk.riskLevel,
      message: `Shipment ${shipment.shipName} has ${weatherRisk.riskLevel} weather risk.`,
    });
  }

  if (shipment.demandSupplyImpact?.priceImpactPrediction?.trend === 'increase'
    && Number(shipment.demandSupplyImpact?.priceImpactPrediction?.confidence || 0) > 70) {
    emitAlert(req, {
      type: 'price_impact',
      commodityType: shipment.commodityType,
      trend: shipment.demandSupplyImpact.priceImpactPrediction.trend,
      estimatedChange: shipment.demandSupplyImpact.priceImpactPrediction.estimatedPriceChange,
    });
  }

  return shipment;
};

const applyManualDelayImpact = async ({ shipment, reason, userId }) => {
  shipment.delayInfo = {
    ...shipment.delayInfo,
    isDelayed: true,
    delayType: shipment.delayInfo?.delayType === 'weather_predicted' ? 'both' : 'manual',
    manualDelayReason: reason || shipment.delayInfo?.manualDelayReason || '',
    delayRecordedAt: new Date(),
    delayRecordedBy: userId || null,
  };

  shipment.demandSupplyImpact = await analyzeDemandSupplyImpact({
    shipment,
    predictedDelayHours: shipment.delayInfo?.predictedDelayHours || 0,
  });
  return shipment;
};

module.exports = { enrichShipmentRisk, applyManualDelayImpact };
