const RISK_COLORS = {
  low: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  medium: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  high: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
  critical: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
};

const WeatherRiskPanel = ({ shipment }) => {
  const risk = shipment?.weatherRiskAssessment;
  if (!risk) return null;
  const level = risk.riskLevel || 'low';
  const score = Number(risk.overallRiskScore || 0);

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Weather Risk Assessment</h3>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${RISK_COLORS[level] || RISK_COLORS.low}`}>
          {level}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
      <p className="mt-2 text-sm text-slate-300">Risk score: {score}/100</p>
      <p className="mt-1 text-sm text-slate-400">
        Predicted weather delay: {shipment?.delayInfo?.predictedDelayHours || 0}h
      </p>
      {shipment?.delayInfo?.weatherDelayReason && (
        <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200">
          <span className="font-semibold">Reason:</span> {shipment.delayInfo.weatherDelayReason}
        </div>
      )}
      <div className="mt-4 space-y-2">
        {(risk.weatherAlerts || []).slice(0, 4).map((alert, index) => (
          <div key={`${alert.alertType}-${index}`} className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-3">
            <p className="text-sm font-medium text-slate-200">{alert.alertType}</p>
            <p className="text-xs text-slate-400">{alert.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherRiskPanel;
