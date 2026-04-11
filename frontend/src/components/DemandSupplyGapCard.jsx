const TREND_STYLE = {
  increase: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  decrease: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  stable: 'border-slate-600 bg-slate-800/60 text-slate-200',
};

const DemandSupplyGapCard = ({ impact, commodityType = 'Commodity' }) => {
  if (!impact?.commodityDemand) return null;
  const demand = impact.commodityDemand;
  const price = impact.priceImpactPrediction || {};

  const forecastedDemand = Number(demand.forecastedMonthlyDemand || 0);
  const currentDelivered = Number(demand.currentMonthDelivered || 0);
  const pendingDeliveries = Number(demand.pendingDeliveries || 0);
  const totalSupply = currentDelivered + pendingDeliveries;
  const gapValue = Number(demand.demandSupplyGap || 0);
  const gapPercentage = Number(demand.gapPercentage || 0);

  const formatNumber = (num) => Number(num || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

  const getGapColor = () => {
    if (gapValue > 0) return 'text-rose-400'; // shortage
    if (gapValue < 0) return 'text-emerald-400'; // surplus
    return 'text-slate-300'; // balanced
  };

  const getGapLabel = () => {
    if (gapValue > 0) return 'Shortage';
    if (gapValue < 0) return 'Surplus';
    return 'Balanced';
  };

  return (
    <div className={`rounded-2xl border p-5 ${TREND_STYLE[price.trend || 'stable']}`}>
      <h3 className="text-lg font-semibold">Demand-Supply Impact</h3>
      <p className="mt-1 text-xs text-slate-400">For: <span className="font-medium text-slate-300">{commodityType}</span></p>

      {/* Demand Supply Metrics */}
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-800/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Forecasted Demand</p>
            <p className="mt-1.5 text-xl font-bold text-cyan-300">{formatNumber(forecastedDemand)} <span className="text-xs font-normal text-slate-400">MT</span></p>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Currently Delivered</p>
            <p className="mt-1.5 text-xl font-bold text-emerald-300">{formatNumber(currentDelivered)} <span className="text-xs font-normal text-slate-400">MT</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-800/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Pending Deliveries</p>
            <p className="mt-1.5 text-xl font-bold text-orange-300">{formatNumber(pendingDeliveries)} <span className="text-xs font-normal text-slate-400">MT</span></p>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Supply</p>
            <p className="mt-1.5 text-xl font-bold text-slate-100">{formatNumber(totalSupply)} <span className="text-xs font-normal text-slate-400">MT</span></p>
          </div>
        </div>

        {/* Gap Display */}
        <div className={`rounded-lg bg-slate-800/50 p-3 border border-slate-700/50`}>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Demand-Supply Gap</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className={`text-2xl font-bold ${getGapColor()}`}>{formatNumber(gapValue)} MT</p>
            <span className={`text-xs font-semibold px-2 py-1 rounded ${getGapColor()} bg-slate-900/50`}>
              {getGapLabel()} ({gapPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Price Impact Prediction */}
      <div className="mt-4 rounded-xl bg-slate-950/50 p-3 border border-slate-700/30">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Price Impact Prediction</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Trend:</span>
            <span className={`font-semibold uppercase px-2 py-1 rounded text-xs ${
              price.trend === 'increase' ? 'bg-rose-500/20 text-rose-300' :
              price.trend === 'decrease' ? 'bg-emerald-500/20 text-emerald-300' :
              'bg-slate-700/50 text-slate-300'
            }`}>
              {price.trend || 'stable'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Confidence:</span>
            <span className="font-semibold text-slate-100">{Number(price.confidence || 0)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Est. Price Change:</span>
            <span className={`font-semibold ${
              price.estimatedPriceChange > 0 ? 'text-rose-400' : 
              price.estimatedPriceChange < 0 ? 'text-emerald-400' : 
              'text-slate-300'
            }`}>
              {price.estimatedPriceChange > 0 ? '+' : ''}{Number(price.estimatedPriceChange || 0).toFixed(2)}%
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 italic border-t border-slate-700/50 pt-2">{price.reasoning || 'No prediction available'}</p>
        </div>
      </div>
    </div>
  );
};

export default DemandSupplyGapCard;
