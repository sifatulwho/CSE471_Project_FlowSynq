import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  FiAnchor, FiPackage, FiDatabase, FiActivity,
  FiAlertTriangle, FiStar, FiInfo, FiCheckCircle, FiXCircle,
} from 'react-icons/fi';
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api/cost-analytics/summary';

const fmt1 = (v) => `${Number(v || 0).toFixed(1)}%`;
const fmtN = (v) => Number(v || 0).toLocaleString();
const fmtDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

const TT = {
  contentStyle: { backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', color: '#e2e8f0', fontSize: 12 },
  itemStyle: { color: '#94a3b8' },
};

// ─── Gauge ring component ─────────────────────────────────────────────────────
function GaugeRing({ value, color = '#22d3ee', size = 88 }) {
  const r = 36, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const filled = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.7s ease' }}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize="13" fontWeight="700">
        {pct.toFixed(0)}%
      </text>
    </svg>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    Docked:    'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    'En Route':'bg-sky-500/15 text-sky-300 ring-sky-500/30',
    Delayed:   'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    Unloading: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    Departed:  'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  };
  const cls = map[status] || 'bg-slate-500/15 text-slate-300 ring-slate-500/30';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${cls}`}>
      {status || '—'}
    </span>
  );
}

// ─── Insight icon ─────────────────────────────────────────────────────────────
function InsightIcon({ level }) {
  if (level === 'danger') return <FiXCircle className="text-rose-400 shrink-0 mt-0.5" />;
  if (level === 'warn')   return <FiAlertTriangle className="text-amber-400 shrink-0 mt-0.5" />;
  if (level === 'success') return <FiCheckCircle className="text-emerald-400 shrink-0 mt-0.5" />;
  return <FiInfo className="text-sky-400 shrink-0 mt-0.5" />;
}

function insightBg(level) {
  if (level === 'danger')  return 'border-rose-500/30 bg-rose-500/8';
  if (level === 'warn')    return 'border-amber-500/30 bg-amber-500/8';
  if (level === 'success') return 'border-emerald-500/30 bg-emerald-500/8';
  return 'border-sky-500/25 bg-sky-500/8';
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, title, value, sub, gauge, gaugeColor }) {
  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-5 ring-1 ring-white/5 backdrop-blur-sm transition hover:border-cyan-500/30 hover:ring-cyan-500/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 text-lg">
            {icon}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        </div>
        {gauge !== undefined && <GaugeRing value={gauge} color={gaugeColor} />}
      </div>
      <div>
        <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const defaultFilters = () => {
  const now = new Date();
  // Default: last 365 days — covers all existing demo data
  const start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate:   now.toISOString().slice(0, 10),
    portName: '',
  };
};

const CostAnalytics = () => {
  const { token, profile } = useOutletContext() || {};
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const fetchData = useCallback(async (f = filters) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      // Build params — only send portName if explicitly provided or user is analyst
      const params = {
        startDate: f.startDate,
        endDate:   f.endDate,
      };
      // Analyst is always port-scoped server-side; admin passes port only if typed
      const role = String(profile?.role || '').toLowerCase();
      if (f.portName && f.portName.trim()) {
        params.portName = f.portName.trim();
      } else if (role === 'analyst' || role === 'operator') {
        // server already scopes by JWT user port — no need to send
      }
      const res = await axios.get(API_BASE, { params, headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [token, profile]);

  useEffect(() => { fetchData(defaultFilters()); }, [token]);

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};

  return (
    <div className="flex min-h-screen flex-col gap-7 bg-slate-950 px-4 py-7 sm:px-6 lg:px-8">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400/80">Port Operations</p>
          <h1 className="mt-1.5 text-2xl font-bold text-white sm:text-3xl">
            Performance &amp; Efficiency Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor port efficiency, shipment flow, utilisation, and fulfilment performance.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 backdrop-blur-sm">
          <input
            type="date" value={filters.startDate}
            onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
            className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          <span className="text-slate-600">→</span>
          <input
            type="date" value={filters.endDate}
            onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
            className="rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          <input
            placeholder="Port name…" value={filters.portName}
            onChange={e => setFilters(p => ({ ...p, portName: e.target.value }))}
            className="w-36 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          <button
            onClick={() => fetchData(filters)}
            className="rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Apply
          </button>
          <button
            onClick={() => { const d = defaultFilters(); setFilters(d); fetchData(d); }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300 transition hover:bg-white/10"
          >
            Reset
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-500" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-300">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              icon={<FiCheckCircle />}
              title="Fulfillment Rate"
              value={fmt1(kpis.fulfillmentRate)}
              sub="Delivered qty ÷ total demand qty"
              gauge={kpis.fulfillmentRate}
              gaugeColor={kpis.fulfillmentRate >= 85 ? '#10b981' : kpis.fulfillmentRate >= 60 ? '#f59e0b' : '#f43f5e'}
            />
            <KpiCard
              icon={<FiDatabase />}
              title="Storage Utilization"
              value={fmt1(kpis.storageUtilization)}
              sub="Tank level ÷ total tank capacity"
              gauge={kpis.storageUtilization}
              gaugeColor={kpis.storageUtilization > 90 ? '#f43f5e' : kpis.storageUtilization >= 40 ? '#22d3ee' : '#f59e0b'}
            />
            <KpiCard
              icon={<FiAnchor />}
              title="Berth Utilization"
              value={fmt1(kpis.berthUtilization)}
              sub="Occupied berth ÷ total berth capacity"
              gauge={kpis.berthUtilization}
              gaugeColor={kpis.berthUtilization > 90 ? '#f43f5e' : '#818cf8'}
            />
            <KpiCard
              icon={<FiActivity />}
              title="Shipment Throughput"
              value={fmtN(kpis.shipmentThroughput)}
              sub="Shipments in selected date range"
            />
            <KpiCard
              icon={<FiAlertTriangle />}
              title="Delay Rate"
              value={fmt1(kpis.delayRate)}
              sub="Delayed shipments ÷ total shipments"
              gauge={kpis.delayRate}
              gaugeColor={kpis.delayRate > 20 ? '#f43f5e' : kpis.delayRate > 10 ? '#f59e0b' : '#10b981'}
            />
            <KpiCard
              icon={<FiStar />}
              title="Efficiency Score"
              value={fmt1(kpis.efficiencyScore)}
              sub="Average of all operational health metrics"
              gauge={kpis.efficiencyScore}
              gaugeColor={kpis.efficiencyScore >= 80 ? '#10b981' : kpis.efficiencyScore >= 60 ? '#f59e0b' : '#f43f5e'}
            />
          </div>

          {/* ── Main chart + side panel ── */}
          <div className="grid gap-5 xl:grid-cols-3">
            {/* Charts column */}
            <div className="flex flex-col gap-5 xl:col-span-2">

              {/* Demand vs Delivered */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 ring-1 ring-white/5 backdrop-blur-sm">
                <h2 className="mb-4 text-sm font-semibold text-slate-200">Demand vs Delivered (qty)</h2>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.demandVsDelivered || []} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip {...TT} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="demand"    name="Demand"    fill="#818cf8" radius={[4,4,0,0]} />
                      <Bar dataKey="delivered" name="Delivered" fill="#22d3ee" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Throughput trend */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 ring-1 ring-white/5 backdrop-blur-sm">
                <h2 className="mb-4 text-sm font-semibold text-slate-200">Shipment Throughput Trend</h2>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.shipmentThroughputTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip {...TT} />
                      <Line type="monotone" dataKey="count" name="Shipments" stroke="#22d3ee" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Utilisation trend */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 ring-1 ring-white/5 backdrop-blur-sm">
                <h2 className="mb-4 text-sm font-semibold text-slate-200">Utilisation Trend (%)</h2>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.utilizationTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip {...TT} formatter={(v) => `${v}%`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="berthUtilization"   name="Berth"   stroke="#818cf8" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="storageUtilization" name="Storage" stroke="#f97316" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Insight panel */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 ring-1 ring-white/5 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-sm">
                    <FiStar />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-200">Operational Insights</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {(data.insights || []).map((ins, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${insightBg(ins.level)}`}
                    >
                      <InsightIcon level={ins.level} />
                      <p className="text-slate-300">{ins.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stat summary */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 ring-1 ring-white/5 backdrop-blur-sm">
                <h2 className="mb-3 text-sm font-semibold text-slate-200">Quick Summary</h2>
                <dl className="space-y-2 text-xs text-slate-400">
                  {[
                    ['Fulfillment', fmt1(kpis.fulfillmentRate)],
                    ['Storage', fmt1(kpis.storageUtilization)],
                    ['Berth', fmt1(kpis.berthUtilization)],
                    ['Throughput', fmtN(kpis.shipmentThroughput) + ' ships'],
                    ['Delay Rate', fmt1(kpis.delayRate)],
                    ['Efficiency', fmt1(kpis.efficiencyScore)],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between rounded-lg bg-slate-950/50 px-3 py-2">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-semibold text-white tabular-nums">{val}</span>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>

          {/* ── Bottom table ── */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 ring-1 ring-white/5 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-200">Recent Shipment Records</h2>
              <span className="text-xs text-slate-500">{data.recentRecords?.length || 0} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
                <thead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3">Ship Name</th>
                    <th className="px-4 py-3">Commodity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Cargo (MT)</th>
                    <th className="px-4 py-3 text-right">Containers</th>
                    <th className="px-4 py-3">Assigned Dock</th>
                    <th className="px-4 py-3">Arrival</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {(data.recentRecords || []).map((row) => (
                    <tr key={String(row._id)} className="transition hover:bg-sky-500/5">
                      <td className="max-w-[140px] truncate px-4 py-3 font-medium text-white" title={row.shipName}>
                        {row.shipName || '—'}
                      </td>
                      <td className="px-4 py-3">{row.commodity || '—'}</td>
                      <td className="px-4 py-3"><Badge status={row.status} /></td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtN(row.cargoQuantity)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtN(row.containerCount)}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{row.assignedDock}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(row.arrivalTime)}</td>
                    </tr>
                  ))}
                  {!data.recentRecords?.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        No shipment records found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CostAnalytics;
