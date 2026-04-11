const predictPriceImpact = ({ gapPercentage, predictedDelayHours, delayedQuantity = 0, demandSupplyGap = 0 }) => {
  const absGap = Math.abs(gapPercentage || 0);
  let trend = 'stable';
  let estimatedPriceChange = 0;
  let confidence = 45;
  let reasoning = 'Demand and supply are broadly balanced.';

  if (demandSupplyGap > 0) {
    if (absGap < 10) {
      trend = 'stable';
      estimatedPriceChange = 2;
      confidence = 55;
      reasoning = 'Minor shortage detected; price pressure is limited.';
    } else if (absGap <= 25) {
      trend = 'increase';
      estimatedPriceChange = 7;
      confidence = 68;
      reasoning = 'Medium shortage is likely to push prices upward.';
    } else {
      trend = 'increase';
      estimatedPriceChange = 14;
      confidence = 80;
      reasoning = 'Large shortage indicates strong upward price pressure.';
    }
  } else if (demandSupplyGap < 0) {
    trend = 'decrease';
    estimatedPriceChange = Math.min(15, Math.max(3, absGap / 2));
    confidence = 66;
    reasoning = 'Supply surplus suggests a likely price decline.';
  }

  const delayBoost = Math.min(12, (predictedDelayHours || 0) / 2);
  const delayedBoost = delayedQuantity > 0 ? Math.min(8, delayedQuantity / 2000) : 0;
  confidence = Math.min(95, Math.round(confidence + delayBoost + delayedBoost));

  return {
    trend,
    confidence,
    reasoning,
    estimatedPriceChange: Number(estimatedPriceChange.toFixed(2)),
    timeframe: 'next 7-14 days',
  };
};

module.exports = { predictPriceImpact };
