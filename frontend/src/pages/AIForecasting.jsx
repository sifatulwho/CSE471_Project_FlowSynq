import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { api } from '../api';
import { PORT_OPTIONS, COMMODITY_OPTIONS } from '../constants/ports';


const COMMODITIES = COMMODITY_OPTIONS;

const HORIZONS = [
  { label: '7 Days', value: 7 },
  { label: '15 Days', value: 15 },
  { label: '30 Days', value: 30 },
  { label: '6 Months', value: 180 },
  { label: '1 Year', value: 365 },
];

function fmtNum(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return Math.round(x).toLocaleString();
}

function fmtPct(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return `${x > 0 ? '+' : ''}${x.toFixed(1)}%`;
}

const AIForecasting = () => {
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const role = profile?.role;
  const allowed = role === 'admin' || role === 'analyst';
  const isAdmin = role === 'admin';
  const profilePort = profile?.portName || '';

  const [selectedPort, setSelectedPort] = useState(profilePort);
  const [commodity, setCommodity] = useState(COMMODITIES[0]);
  const [horizonDays, setHorizonDays] = useState(30);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [data, setData] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!allowed) navigate('/dashboard', { replace: true });
  }, [allowed, navigate]);

  useEffect(() => {
    if (profilePort) setSelectedPort(profilePort);
  }, [profilePort]);

  const portName = isAdmin ? selectedPort : profilePort;

  const chartData = useMemo(() => {
    if (!data?.history?.length && !data?.forecast?.length) return [];
    const hist = (data.history || []).map((r) => ({
      date: r.ds,
      actual: r.y,
      yhat: null,
      yhat_lower: null,
      yhat_upper: null,
      kind: 'history',
    }));
    const fc = (data.forecast || []).map((r) => ({
      date: r.ds,
      actual: null,
      yhat: r.yhat,
      yhat_lower: r.yhat_lower,
      yhat_upper: r.yhat_upper,
      kind: 'forecast',
    }));
    return [...hist, ...fc];
  }, [data]);

  const onGenerate = async () => {
    setMessage({ type: '', text: '' });
    if (!portName) {
      setMessage({
        type: 'err',
        text: isAdmin
          ? 'Select a port to generate the forecast.'
          : 'Port is not assigned. Please check your profile.',
      });
      return;
    }
    setLoading(true);
    setData(null);
    setInventory(null);
    try {
      const [forecastRes, inventoryRes] = await Promise.all([
        api.get('/forecast', {
          params: { commodity_type: commodity, horizonDays, portName },
        }),
        api.get('/tanks/inventory', {
          params: { portName, commodity },
        }).catch(() => ({ data: null })),
      ]);
      setData(forecastRes.data);
      setInventory(inventoryRes.data);
      const engineNote = forecastRes.data?.engine?.note;
      setMessage({
        type: 'ok',
        text: engineNote || 'Forecast generated successfully.',
      });
    } catch (error) {
      setData(null);
      setInventory(null);
      setMessage({ type: 'err', text: error.response?.data?.message || 'Unable to generate forecast.' });
    } finally {
      setLoading(false);
    }
  };

  const buildRecommendation = () => {
    const h = Number(data?.filters?.horizonDays || horizonDays) || horizonDays;
    const rangeDays = Math.min(10, Math.max(1, h));
    const avg = Number(data?.summary?.avgPredictedDemand || 0) || 0;
    const peakDay = data?.summary?.peakDemandDay;
    const scheduleDates = [];
    const fc = Array.isArray(data?.forecast) ? data.forecast : [];
    if (fc[0]?.ds) scheduleDates.push(fc[0].ds);
    if (peakDay && !scheduleDates.includes(peakDay)) scheduleDates.push(peakDay);
    if (scheduleDates.length < 2 && fc[Math.min(4, fc.length - 1)]?.ds) scheduleDates.push(fc[Math.min(4, fc.length - 1)].ds);

    const growth = Number(data?.summary?.growthPct || 0) || 0;

    // Check inventory levels
    const currentLevel = Number(inventory?.totalCurrentLevel || 0);
    const capacity = Number(inventory?.totalCapacity || 0);
    const utilization = Number(inventory?.utilizationPct || 0);

    // Calculate recommended units based on demand and inventory
    let recommendedUnits = Math.round(avg * rangeDays);
    let timingAdvice = '';

    if (capacity > 0) {
      const projectedUsage = avg * rangeDays;
      const availableCapacity = capacity - currentLevel;

      if (availableCapacity < projectedUsage) {
        // Need to import more than projected demand
        const shortage = projectedUsage - availableCapacity;
        recommendedUnits = Math.round(projectedUsage + shortage);
        timingAdvice = `Critical: Current inventory (${Math.round(currentLevel).toLocaleString()} units, ${utilization}% capacity) insufficient for projected demand. Import ${Math.round(shortage).toLocaleString()} additional units immediately.`;
      } else if (utilization > 80) {
        timingAdvice = `High inventory utilization (${utilization}%). Schedule import within 48 hours to maintain buffer.`;
      } else if (utilization < 30) {
        timingAdvice = `Low inventory utilization (${utilization}%). Consider delaying import by 3-5 days.`;
      } else {
        timingAdvice = growth >= 10
          ? 'Urgent import required within 48 hours to prevent shortages.'
          : growth <= -5
            ? 'Optimal timing: delay import by 3 days to avoid overstock.'
            : 'Optimal timing: schedule imports evenly across the next week.';
      }
    } else {
      // No inventory data available, use demand-based logic
      timingAdvice = growth >= 10
        ? 'Urgent import required within 48 hours to prevent shortages.'
        : growth <= -5
          ? 'Optimal timing: delay import by 3 days to avoid overstock.'
          : 'Optimal timing: schedule imports evenly across the next week.';
    }

    return {
      horizonDays: rangeDays,
      commodityType: data?.filters?.commodity_type || commodity,
      recommendedUnits,
      scheduleDates: scheduleDates.slice(0, 2),
      timingAdvice,
    };
  };

  const sendToOperator = async () => {
    const rec = buildRecommendation();
    setSending(true);
    try {
      await api.post('/recommendations', {
        portName: data?.filters?.portName || portName,
        commodityType: rec.commodityType,
        horizonDays: rec.horizonDays,
        recommendedUnits: rec.recommendedUnits,
        scheduleDates: rec.scheduleDates,
        timingAdvice: rec.timingAdvice,
      });
      setMessage({ type: 'ok', text: 'Recommendation sent to operator.' });
    } catch (error) {
      setMessage({ type: 'err', text: error.response?.data?.message || 'Failed to send recommendation.' });
    } finally {
      setSending(false);
    }
  };

  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">AI</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">AI demand forecasting</h1>
        <p className="mt-1 text-slate-400">
          Forecasts demand using historical delivered quantities (7 days to 1 year).
        </p>
      </div>

      {message.text && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${message.type === 'ok' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'
            }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid w-full gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-400">Port</span>
              {isAdmin ? (
                <select
                  value={selectedPort}
                  onChange={(e) => setSelectedPort(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
                >
                  <option value="">Select port</option>
                  {PORT_OPTIONS.map((p) => (
                    <option key={p.code} value={p.name}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={portName}
                  disabled
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
                />
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-400">Commodity type</span>
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
              >
                {COMMODITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-400">Forecast horizon</span>
              <select
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
              >
                {HORIZONS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onGenerate}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate forecast'}
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2 self-end text-xs text-slate-500">
            Tip: select 7, 15, or 30 days for short-term demand planning.
          </div>
        </div>
      </section>

      {data && (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            {[
              { k: 'Forecast period', v: `Next ${data.filters?.horizonDays || horizonDays} days` },
              { k: 'Port', v: data.filters?.portName || portName || '—' },
              { k: 'Product', v: data.filters?.commodity_type || commodity },
              { k: 'Avg predicted demand', v: fmtNum(data.summary?.avgPredictedDemand) },
              { k: 'Peak demand day', v: data.summary?.peakDemandDay || '—' },
              { k: 'Peak value', v: fmtNum(data.summary?.peakValue) },
              { k: 'Growth vs last 14d', v: fmtPct(data.summary?.growthPct) },
              { k: 'Trend', v: (data.summary?.trendDirection || '—').toString() },
              ...(inventory ? [
                { k: 'Current inventory', v: `${fmtNum(inventory.totalCurrentLevel)} / ${fmtNum(inventory.totalCapacity)}` },
                { k: 'Inventory utilization', v: `${inventory.utilizationPct}%` },
                { k: 'Available capacity', v: fmtNum(inventory.totalCapacity - inventory.totalCurrentLevel) },
              ] : []),
            ].map((c) => (
              <div key={c.k} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{c.k}</p>
                <p className="mt-2 text-lg font-semibold text-white">{c.v}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/25 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Past trend + forecast</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Blue = historical delivered quantity. Green = predicted demand.
                </p>
              </div>
            </div>

            <div className="mt-4 h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" strokeDasharray="4 4" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} minTickGap={24} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} width={70} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(2,6,23,0.9)',
                      border: '1px solid rgba(148,163,184,0.25)',
                      borderRadius: 12,
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="actual" name="Historical (actual)" stroke="#38bdf8" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="yhat" name="Forecast (yhat)" stroke="#22c55e" dot={false} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <h2 className="text-sm font-semibold text-white">Trend insights</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {(data.insights || []).map((t, i) => (
                  <li key={i} className="rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <h2 className="text-sm font-semibold text-white">Next 7 days (quick view)</h2>
              <p className="mt-2 text-sm text-slate-400">A short list instead of a long forecast table.</p>
              <div className="mt-3 space-y-2">
                {(data.forecast || []).slice(0, 7).map((r) => (
                  <div
                    key={r.ds}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-300">{r.ds}</span>
                    <span className="font-semibold text-white">{fmtNum(r.yhat)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Import recommendations</h2>
                <p className="mt-1 text-sm text-slate-400">Send a recommendation notification to the operator.</p>
              </div>
              <button
                type="button"
                onClick={sendToOperator}
                disabled={sending}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send to operator'}
              </button>
            </div>

            {(() => {
              const rec = buildRecommendation();
              return (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recommended import plan</p>
                    <p className="mt-2 text-sm text-slate-200">
                      Import <span className="font-semibold text-white">{fmtNum(rec.recommendedUnits)}</span> units of{' '}
                      <span className="font-semibold text-white">{rec.commodityType}</span> over the next{' '}
                      <span className="font-semibold text-white">{rec.horizonDays}</span> days.
                    </p>
                    {rec.scheduleDates.length > 0 && (
                      <p className="mt-2 text-sm text-slate-300">
                        Schedule import on <span className="font-semibold text-white">{rec.scheduleDates.join(' & ')}</span>.
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Import scheduling recommendation</p>
                    <p className="mt-2 text-sm text-cyan-200">{rec.timingAdvice}</p>
                  </div>
                </div>
              );
            })()}
          </section>
        </>
      )}
    </div>
  );
};

export default AIForecasting;

