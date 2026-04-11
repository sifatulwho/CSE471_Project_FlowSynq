const cron = require('node-cron');
const Shipment = require('../models/Shipment');
const { assessWeatherRisk } = require('../services/weatherRiskService');

const startShipmentRiskJob = (io) => {
  cron.schedule('0 */6 * * *', async () => {
    try {
      const activeShipments = await Shipment.find({
        status: { $in: ['En Route', 'Delayed'] },
      });

      for (const shipment of activeShipments) {
        const weatherRisk = await assessWeatherRisk({
          routeData: shipment.routeData,
          estimatedArrivalTime: shipment.estimatedArrivalTime || shipment.arrivalTime,
        });

        const previousLevel = shipment.weatherRiskAssessment?.riskLevel || 'low';
        shipment.weatherRiskAssessment = {
          overallRiskScore: weatherRisk.overallRiskScore,
          riskLevel: weatherRisk.riskLevel,
          weatherAlerts: weatherRisk.weatherAlerts,
          forecasts: weatherRisk.forecasts,
          assessedAt: weatherRisk.assessedAt,
          nextAssessmentDue: weatherRisk.nextAssessmentDue,
        };
        await shipment.save();

        if (previousLevel !== weatherRisk.riskLevel) {
          io.emit('shipment_risk_alert', {
            type: 'weather_risk_change',
            shipmentId: shipment._id,
            previousLevel,
            riskLevel: weatherRisk.riskLevel,
            message: `Risk level changed for ${shipment.shipName}: ${previousLevel} -> ${weatherRisk.riskLevel}`,
          });
        }
      }
    } catch (error) {
      console.error('Shipment risk cron error:', error);
    }
  });
};

module.exports = { startShipmentRiskJob };
