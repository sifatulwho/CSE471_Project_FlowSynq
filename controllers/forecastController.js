const { spawn } = require('child_process');
const path = require('path');
const Demand = require('../models/Demand');

function safeStr(v) {
  return String(v ?? '').trim();
}

function isoDay(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
}

function median(values) {
  if (!values.length) return 0;
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function runPythonForecast({ history, horizonDays }) {
  const scriptPath = path.join(process.cwd(), 'scripts', 'prophet_forecast.py');
  const payload = JSON.stringify({ history, horizonDays });

  const tryCmd = (cmd, args) =>
    new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => {
        out += d.toString();
      });
      child.stderr.on('data', (d) => {
        err += d.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          const e = new Error(err || `Python exited with code ${code}`);
          e.details = { code, stderr: err, stdout: out };
          return reject(e);
        }
        try {
          resolve(JSON.parse(out));
        } catch (parseErr) {
          const e = new Error(`Failed to parse forecast output: ${parseErr.message}`);
          e.details = { stdout: out, stderr: err };
          reject(e);
        }
      });
      child.stdin.write(payload);
      child.stdin.end();
    });

  // Windows-friendly: try `python` then `py -3`.
  return tryCmd('python', [scriptPath]).catch(() => tryCmd('py', ['-3', scriptPath]));
}

exports.getDemandForecast = async (req, res) => {
  try {
    const commodity_type = safeStr(req.query.commodity_type);
    const role = String(req.user?.role || '').toLowerCase();
    const portName = safeStr(req.query.portName || req.user?.portName);

    const horizon = Number(req.query.horizonDays || 30);
    const horizonDays = Number.isFinite(horizon) && horizon > 0 ? Math.min(365, Math.floor(horizon)) : 30;

    if (!commodity_type || !portName) {
      let message = 'commodity_type and portName are required.';
      if (role === 'analyst' && !req.user?.portName) {
        message = 'Your account is not associated with a port. Please contact an administrator to update your profile.';
      }
      return res.status(400).json({ message });
    }

    const commodityRx = new RegExp(`^${commodity_type.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i');

    const query = {
      status: 'approved',
      commodity_type: commodityRx,
      portName,
    };

    const docs = await Demand.find(query)
      .select('date commodity_quantity demand_quantity')
      .sort({ date: 1 })
      .lean();

    const byDay = new Map();
    for (const d of docs) {
      const day = isoDay(d.date);
      if (!day) continue;
      const raw = d.commodity_quantity ?? d.demand_quantity;
      const y = Number(raw || 0);
      if (Number.isNaN(y)) continue;
      byDay.set(day, (byDay.get(day) || 0) + y);
    }

    const history = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ds, y]) => ({ ds, y }));

    if (history.length < 60) {
      return res.status(400).json({
        message: `Not enough clean historical data for forecasting. Need at least ~60 daily points, found ${history.length}.`,
      });
    }

    const forecastResult = await runPythonForecast({ history, horizonDays });
    if (!forecastResult?.forecast?.length) {
      return res.status(500).json({ message: 'Forecast engine returned empty output.' });
    }

    const fc = forecastResult.forecast;
    const avg = fc.reduce((acc, r) => acc + (Number(r.yhat) || 0), 0) / fc.length;
    let peak = fc[0];
    for (const r of fc) {
      if ((Number(r.yhat) || 0) > (Number(peak.yhat) || 0)) peak = r;
    }

    const lastN = Math.min(14, history.length);
    const recent = history.slice(-lastN);
    const recentAvg = recent.reduce((acc, r) => acc + r.y, 0) / recent.length;
    const growthPct = recentAvg > 0 ? ((avg - recentAvg) / recentAvg) * 100 : 0;

    const yhatList = fc.map((r) => Number(r.yhat)).filter((n) => Number.isFinite(n));
    const vol = median(yhatList.map((n) => Math.abs(n - median(yhatList))));
    const direction = growthPct > 1 ? 'rising' : growthPct < -1 ? 'falling' : 'stable';

    return res.json({
      filters: { commodity_type, portName, horizonDays },
      history,
      forecast: fc,
      summary: {
        avgPredictedDemand: Math.round(avg),
        peakDemandDay: peak.ds,
        peakValue: Math.round(Number(peak.yhat) || 0),
        growthPct: Math.round(growthPct * 10) / 10,
        trendDirection: direction,
        volatility: Math.round(vol),
      },
      accuracy: forecastResult.accuracy || null,
      insights: [
        `Demand expected to be ${direction} over the next ${horizonDays} days.`,
        `Average forecast is ${Math.round(avg).toLocaleString()} units/day (last ${lastN} days avg: ${Math.round(recentAvg).toLocaleString()}).`,
        `Peak demand likely on ${peak.ds} at ~${Math.round(Number(peak.yhat) || 0).toLocaleString()}.`,
      ],
      engine: {
        name: 'prophet',
      },
    });
  } catch (error) {
    console.error('Forecast error:', error?.details || error);
    const msg = String(error?.message || '');
    if (msg.toLowerCase().includes('no module named')) {
      return res.status(500).json({
        message:
          'Forecast engine is not installed. Install Python dependencies for Prophet (see requirements-forecast.txt) and try again.',
      });
    }
    return res.status(500).json({ message: 'Unable to generate forecast.' });
  }
};

