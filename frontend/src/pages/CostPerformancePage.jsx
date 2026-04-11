import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../api';

const COST_COLORS = ['#22d3ee', '#818cf8', '#f97316', '#10b981'];

const formatMoney = (value) => `$${Number(value || 0).toLocaleString()}`;
const formatPct = (value) => `${Number(value || 0).toFixed(1)}%`;



const defaultFilters = () => {
  const now = new Date();
  const start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
    portName: '',
    commodityType: '',
    shipmentStatus: '',
    comparePreviousPeriod: false,
  };
};

const KpiCard = ({ title, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur-sm transition hover:scale-[1.02]">
    <p className="text-xs uppercase tracking-wider text-slate-400">{title}</p>
    <p className="mt-2 text-2xl font-bold text-cyan-300">{value}</p>
    {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
  </div>
);

const CostPerformancePage = () => {
  const { profile } = useOutletContext() || {};
  const role = String(profile?.role || '').toLowerCase();
  const canExport = role === 'admin' || role === 'organization';

  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  const fetchData = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/analytics/cost-performance', { params: activeFilters });
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(defaultFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const handleApply = () => fetchData(filters);
  const handleReset = () => {
    const base = defaultFilters();
    setFilters(base);
    fetchData(base);
  };

  const costPieData = useMemo(() => {
    const c = data?.costBreakdown || {};
    return [
      { name: 'Transport Cost', value: Number(c.transport || 0) },
      { name: 'Storage Cost', value: Number(c.storage || 0) },
      { name: 'Delay Cost', value: Number(c.delay || 0) },
      { name: 'Handling Cost', value: Number(c.handling || 0) },
    ];
  }, [data]);

  const handleExportCsv = () => {
    if (!data) return;
    const lines = [
      ['Metric', 'Value'],
      ['Total Operational Cost', data.kpis.totalCost],
      ['Avg Cost per Shipment', data.kpis.avgCostPerShipment],
      ['Supply Fulfillment Rate', data.kpis.fulfillmentRate],
      ['Storage Utilization', data.kpis.storageUtilization],
      ['Delay Cost', data.kpis.delayCost],
      ['Efficiency Score', data.kpis.efficiencyScore],
      [],
      ['Problem', 'Recommendation', 'Expected Saving'],
      ...(data.recommendations || []).map((r) => [r.problem, r.recommendation, r.expectedSaving]),
    ];
    const csv = lines
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!data) return;
    const doc = new jsPDF({ orientation: 'portrait' });
    doc.setFontSize(18);
    doc.text('FlowSynq - Cost & Performance Report', 14, 18);
    doc.setFontSize(10);
    doc.text(
      `Date Range: ${filters.startDate} to ${filters.endDate} | Port: ${filters.portName || 'All'} | Commodity: ${filters.commodityType || 'All'}`,
      14,
      26,
    );

    autoTable(doc, {
      startY: 32,
      head: [['KPI', 'Value']],
      body: [
        ['Total Operational Cost', formatMoney(data.kpis.totalCost)],
        ['Avg Cost per Shipment', formatMoney(data.kpis.avgCostPerShipment)],
        ['Supply Fulfillment Rate', formatPct(data.kpis.fulfillmentRate)],
        ['Storage Utilization', formatPct(data.kpis.storageUtilization)],
        ['Delay Cost', formatMoney(data.kpis.delayCost)],
        ['Efficiency Score', formatPct(data.kpis.efficiencyScore)],
      ],
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Problem', 'Recommendation', 'Expected Saving']],
      body: (data.recommendations || []).map((row) => [
        row.problem,
        row.recommendation,
        formatMoney(row.expectedSaving),
      ]),
    });

    doc.save(`cost-performance-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Cost & Performance Analytics</h2>
        <p className="mt-1 text-sm text-slate-400">Operational cost, efficiency, and AI optimization insights.</p>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input type="date" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
          <input placeholder="Port Name" value={filters.portName} onChange={(e) => setFilters((p) => ({ ...p, portName: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
          <input placeholder="Commodity Type" value={filters.commodityType} onChange={(e) => setFilters((p) => ({ ...p, commodityType: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
          <input placeholder="Shipment Status" value={filters.shipmentStatus} onChange={(e) => setFilters((p) => ({ ...p, shipmentStatus: e.target.value }))} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={filters.comparePreviousPeriod} onChange={(e) => setFilters((p) => ({ ...p, comparePreviousPeriod: e.target.checked }))} />
            Compare Previous Period
          </label>
          <button onClick={handleApply} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Apply Filters</button>
          <button onClick={handleReset} className="rounded-xl bg-slate-700 px-4 py-2 text-sm text-slate-200">Reset</button>
          {canExport && (
            <>
              <button onClick={handleExportPdf} className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">Export PDF</button>
              <button onClick={handleExportCsv} className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">Export CSV</button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-8 text-center text-slate-400">Loading analytics...</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">{error}</div>
      ) : (
        <>


          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard title="Total Operational Cost" value={formatMoney(data?.kpis?.totalCost)} />
            <KpiCard title="Avg Cost per Shipment" value={formatMoney(data?.kpis?.avgCostPerShipment)} />
            <KpiCard title="Supply Fulfillment Rate" value={formatPct(data?.kpis?.fulfillmentRate)} />
            <KpiCard title="Storage Utilization" value={formatPct(data?.kpis?.storageUtilization)} />
            <KpiCard title="Delay Cost" value={formatMoney(data?.kpis?.delayCost)} />
            <KpiCard title="Efficiency Score" value={formatPct(data?.kpis?.efficiencyScore)} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 xl:col-span-1">
              <h3 className="text-sm font-semibold text-slate-200">Cost Breakdown</h3>
              <div className="mt-3 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costPieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={4}>
                      {costPieData.map((entry, idx) => <Cell key={entry.name} fill={COST_COLORS[idx % COST_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val) => formatMoney(val)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 xl:col-span-1">
              <h3 className="text-sm font-semibold text-slate-200">Cost by Port</h3>
              <div className="mt-3 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.costByPort || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="port" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip formatter={(val) => formatMoney(val)} />
                    <Bar dataKey="cost" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 xl:col-span-1">
              <h3 className="text-sm font-semibold text-slate-200">Daily Cost Trend</h3>
              <div className="mt-3 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.dailyCostTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip formatter={(val) => formatMoney(val)} />
                    <Line type="monotone" dataKey="totalCost" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
            <h3 className="text-sm font-semibold text-slate-200">Planned vs Actual Performance</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Metric</th>
                    <th className="px-3 py-2">Planned</th>
                    <th className="px-3 py-2">Actual</th>
                    <th className="px-3 py-2">Variance</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(data?.plannedVsActual || []).map((row) => (
                    <tr key={row.metric}>
                      <td className="px-3 py-2 text-slate-200">{row.metric}</td>
                      <td className="px-3 py-2 text-slate-300">{row.planned} {row.unit}</td>
                      <td className="px-3 py-2 text-slate-300">{row.actual} {row.unit}</td>
                      <td className="px-3 py-2 text-slate-300">{row.variance} {row.unit}</td>
                      <td className={`px-3 py-2 font-medium ${row.status === 'Improved' ? 'text-emerald-300' : 'text-rose-300'}`}>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-slate-200">Fulfillment Rate Over Time</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={[0, 100]} />
                    <Tooltip formatter={(val) => formatPct(val)} />
                    <Line type="monotone" dataKey="fulfillmentRate" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-slate-200">Storage Utilization Over Time</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={[0, 100]} />
                    <Tooltip formatter={(val) => formatPct(val)} />
                    <Line type="monotone" dataKey="storageUtilization" stroke="#818cf8" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
              <h3 className="text-sm font-semibold text-slate-200">Avg Cost Per Shipment</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip formatter={(val) => formatMoney(val)} />
                    <Line type="monotone" dataKey="avgCostPerShipment" stroke="#f97316" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
            <h3 className="text-sm font-semibold text-slate-200">AI Inefficiency Detection</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {(data?.inefficiencies || []).map((item) => (
                <div key={`${item.title}-${item.detail}`} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm font-semibold text-amber-200">⚠ {item.title}</p>
                  <p className="mt-1 text-xs text-amber-100/90">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
            <h3 className="text-sm font-semibold text-slate-200">AI Recommendations</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Problem</th>
                    <th className="px-3 py-2">Recommendation</th>
                    <th className="px-3 py-2">Expected Saving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(data?.recommendations || []).map((row, idx) => (
                    <tr key={`${row.problem}-${idx}`}>
                      <td className="px-3 py-2 text-slate-200">{row.problem}</td>
                      <td className="px-3 py-2 text-slate-300">{row.recommendation}</td>
                      <td className="px-3 py-2 text-emerald-300">{formatMoney(row.expectedSaving)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CostPerformancePage;
