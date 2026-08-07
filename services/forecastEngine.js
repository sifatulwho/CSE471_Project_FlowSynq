/**
 * Pure Node.js demand forecast engine.
 * Used when Python/Prophet is unavailable (typical on Render Node hosts).
 * Produces the same shape as scripts/prophet_forecast.py.
 */

function mae(yTrue, yPred) {
  const n = Math.min(yTrue.length, yPred.length);
  if (n <= 0) return null;
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(yTrue[i] - yPred[i]);
  return s / n;
}

function rmse(yTrue, yPred) {
  const n = Math.min(yTrue.length, yPred.length);
  if (n <= 0) return null;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = yTrue[i] - yPred[i];
    s += d * d;
  }
  return Math.sqrt(s / n);
}

function dayOfWeek(isoDay) {
  const d = new Date(`${isoDay}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? 0 : d.getUTCDay();
}

function addDays(isoDay, days) {
  const d = new Date(`${isoDay}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function linearTrend(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function weekdayFactors(history) {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  let total = 0;
  for (const row of history) {
    const y = Number(row.y) || 0;
    const wd = dayOfWeek(row.ds);
    sums[wd] += y;
    counts[wd] += 1;
    total += y;
  }
  const mean = history.length ? total / history.length : 0;
  return sums.map((s, i) => {
    if (!counts[i] || !mean) return 1;
    return (s / counts[i]) / mean;
  });
}

function predictSeries(history, periods) {
  const values = history.map((h) => Math.max(0, Number(h.y) || 0));
  const n = values.length;
  const window = values.slice(-Math.min(90, n));
  const { slope, intercept } = linearTrend(window);
  const factors = weekdayFactors(history);
  const lastDay = history[history.length - 1].ds;
  const baseLevel = window.reduce((a, b) => a + b, 0) / window.length;
  const residualStd = (() => {
    const errs = [];
    for (let i = 0; i < window.length; i++) {
      const trend = intercept + slope * i;
      const wd = dayOfWeek(history[history.length - window.length + i].ds);
      const expected = Math.max(0, trend * (factors[wd] || 1));
      errs.push(window[i] - expected);
    }
    if (!errs.length) return Math.max(1, baseLevel * 0.1);
    const mean = errs.reduce((a, b) => a + b, 0) / errs.length;
    const variance = errs.reduce((a, b) => a + (b - mean) ** 2, 0) / errs.length;
    return Math.max(1, Math.sqrt(variance));
  })();

  const out = [];
  for (let i = 1; i <= periods; i++) {
    const ds = addDays(lastDay, i);
    const wd = dayOfWeek(ds);
    // Continue trend from end of window
    const trend = intercept + slope * (window.length - 1 + i);
    const blended = 0.65 * trend + 0.35 * baseLevel;
    const yhat = Math.max(0, blended * (factors[wd] || 1));
    const band = residualStd * 1.28; // ~80% interval-ish
    out.push({
      ds,
      yhat,
      yhat_lower: Math.max(0, yhat - band),
      yhat_upper: yhat + band,
    });
  }
  return out;
}

/**
 * @param {{ history: Array<{ds:string,y:number}>, horizonDays: number }} args
 */
function generateNodeForecast({ history, horizonDays }) {
  const clean = (history || [])
    .map((h) => ({ ds: String(h.ds || '').slice(0, 10), y: Number(h.y) || 0 }))
    .filter((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.ds))
    .sort((a, b) => a.ds.localeCompare(b.ds));

  if (clean.length < 14) {
    throw new Error('Need at least ~14 daily points for the Node forecast engine.');
  }

  const horizon = Math.max(1, Math.min(365, Number(horizonDays) || 30));

  let accuracy = null;
  const holdout = Math.min(30, Math.max(7, Math.floor(clean.length * 0.2)));
  if (clean.length - holdout >= 14 && holdout >= 7) {
    const train = clean.slice(0, -holdout);
    const test = clean.slice(-holdout);
    const pred = predictSeries(train, holdout);
    const yTrue = test.map((r) => r.y);
    const yPred = pred.map((r) => r.yhat);
    accuracy = {
      holdoutDays: holdout,
      MAE: mae(yTrue, yPred) != null ? Math.round(mae(yTrue, yPred) * 100) / 100 : null,
      RMSE: rmse(yTrue, yPred) != null ? Math.round(rmse(yTrue, yPred) * 100) / 100 : null,
    };
  }

  const forecast = predictSeries(clean, horizon).map((r) => ({
    ds: r.ds,
    yhat: Math.round(r.yhat * 100) / 100,
    yhat_lower: Math.round(r.yhat_lower * 100) / 100,
    yhat_upper: Math.round(r.yhat_upper * 100) / 100,
  }));

  return {
    forecast,
    accuracy,
    engine: 'node-seasonal-trend',
  };
}

module.exports = {
  generateNodeForecast,
};
