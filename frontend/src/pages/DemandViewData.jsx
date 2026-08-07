import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { COMMODITY_OPTIONS } from '../constants/ports';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb7185', '#2dd4bf'];

const presets = [
  { id: '', label: 'Custom range' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
];

const reportTypes = [
  { id: 'monthly', label: 'Monthly summary' },
  { id: 'weekly', label: 'Weekly overview' },
];

function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function fmtNum(v, opts) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, opts);
}

function aggregateByTime(rows, mode) {
  const map = new Map();
  for (const r of rows) {
    const d = new Date(r.date);
    if (Number.isNaN(d.getTime())) continue;
    let key;
    if (mode === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (mode === 'weekly') {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      key = start.toISOString().slice(0, 10);
    } else {
      key = d.toISOString().slice(0, 10);
    }
    const prev = map.get(key) || { label: key, demand: 0 };
    prev.demand += Number((r.demand_quantity ?? r.commodity_quantity ?? r.commodityQuantity) || 0) || 0;
    map.set(key, prev);
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function sumByRegion(rows) {
  const map = new Map();
  for (const r of rows) {
    const k = String(r.region || r.portName || 'Unknown').trim() || 'Unknown';
    const value = Number((r.demand_quantity ?? r.commodity_quantity ?? r.commodityQuantity) || 0) || 0;
    map.set(k, (map.get(k) || 0) + value);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

function sumByCommodity(rows) {
  const map = new Map();
  for (const r of rows) {
    const k = String(r.commodity_type || r.commodityType || 'Unspecified').trim() || 'Unspecified';
    const value = Number((r.demand_quantity ?? r.commodity_quantity ?? r.commodityQuantity) || 0) || 0;
    map.set(k, (map.get(k) || 0) + value);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

function stackedByRegionCommodity(rows) {
  const regions = [...new Set(rows.map((r) => String(r.region || r.portName || 'Unknown').trim() || 'Unknown'))];
  const commodities = [...new Set(rows.map((r) => String(r.commodity_type || r.commodityType || 'Unspecified').trim() || 'Unspecified'))];
  const byRegion = new Map();
  for (const r of rows) {
    const reg = String(r.region || r.portName || 'Unknown').trim() || 'Unknown';
    const com = String(r.commodity_type || r.commodityType || 'Unspecified').trim() || 'Unspecified';
    if (!byRegion.has(reg)) byRegion.set(reg, new Map());
    const m = byRegion.get(reg);
    const value = Number((r.demand_quantity ?? r.commodity_quantity ?? r.commodityQuantity) || 0) || 0;
    m.set(com, (m.get(com) || 0) + value);
  }
  return regions.map((region) => {
    const row = { region };
    const m = byRegion.get(region) || new Map();
    commodities.forEach((c) => {
      row[c] = m.get(c) || 0;
    });
    return row;
  });
}

const TOOLTIP_STYLE = { background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px' };

const DemandViewData = () => {
  const [preset, setPreset] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [commodity, setCommodity] = useState('');
  const [region, setRegion] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reportType, setReportType] = useState('monthly');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [chartRows, setChartRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 450);
    return () => clearTimeout(t);
  }, [search]);

  const filterParams = useMemo(
    () => ({
      preset: preset || undefined,
      dateFrom: preset ? undefined : dateFrom || undefined,
      dateTo: preset ? undefined : dateTo || undefined,
      commodity_type: commodity || undefined,
      region: region || undefined,
      search: debouncedSearch || undefined,
    }),
    [preset, dateFrom, dateTo, commodity, region, debouncedSearch]
  );

  const tableParams = useMemo(
    () => ({ ...filterParams, page, limit }),
    [filterParams, page, limit]
  );

  const fetchTable = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/demands', { params: tableParams });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tableParams]);

  const fetchCharts = useCallback(async () => {
    try {
      const { data } = await api.get('/demands', {
        params: { ...filterParams, page: 1, limit: 100 },
      });
      setChartRows(data.items || []);
    } catch {
      setChartRows([]);
    }
  }, [filterParams]);

  useEffect(() => {
    setPage(1);
  }, [preset, dateFrom, dateTo, commodity, region, debouncedSearch]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  // Defer chart fetch until after the table paints so sidebar navigation feels faster
  useEffect(() => {
    const t = setTimeout(() => {
      fetchCharts();
    }, 150);
    return () => clearTimeout(t);
  }, [fetchCharts]);

  const lineMode = reportType === 'monthly' ? 'monthly' : 'weekly';
  const lineData = useMemo(
    () => aggregateByTime(chartRows, lineMode),
    [chartRows, lineMode]
  );
  const barRegions = useMemo(() => sumByRegion(chartRows), [chartRows]);
  const pieCommodity = useMemo(() => sumByCommodity(chartRows), [chartRows]);
  const stacked = useMemo(() => stackedByRegionCommodity(chartRows), [chartRows]);
  const stackKeys = useMemo(() => {
    const s = new Set();
    stacked.forEach((row) => {
      Object.keys(row).forEach((k) => {
        if (k !== 'region') s.add(k);
      });
    });
    return [...s];
  }, [stacked]);

  const sortedItems = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'date') {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [items, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const sortHint = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  const exportFields = [
    { key: 'date', label: 'Entry date', format: (r) => (r.date ? new Date(r.date).toISOString() : '') },
    { key: 'region', label: 'Region / port area' },
    { key: 'shipName', label: 'Ship name' },
    { key: 'commodity_type', label: 'Commodity' },
    { key: 'demand_quantity', label: 'Demand quantity' },
    { key: 'vessel_count', label: 'Vessels (total)' },
    { key: 'working_vessels', label: 'Working vessels' },
    { key: 'waiting_vessels', label: 'Waiting vessels' },
    { key: 'containers_handled', label: 'Containers handled' },
    { key: 'storage_level', label: 'Storage level' },
    { key: 'berth_occupancy', label: 'Berth occupancy' },
    { key: 'vacant_berths', label: 'Vacant berths' },
    { key: 'equipment_usage_index', label: 'Equipment usage index' },
    { key: 'location_code', label: 'Location code' },
    { key: 'location_count', label: 'Location count' },
    { key: 'vessel_status', label: 'Vessel status' },
    { key: 'status', label: 'Approval status' },
  ];

  const exportCsv = () => {
    const rows = chartRows;
    if (!rows.length) {
      window.alert('No data to export for the current filters.');
      return;
    }
    const headers = exportFields.map((f) => f.label);
    const lines = [headers.join(',')];
    for (const r of rows) {
      const vals = exportFields.map((f) => {
        const raw = f.format ? f.format(r) : r[f.key];
        const s = raw == null ? '' : String(raw).replace(/"/g, '""');
        return `"${s}"`;
      });
      lines.push(vals.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demand-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const rows = chartRows;
    if (!rows.length) {
      window.alert('No data to export for the current filters.');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12);
    doc.text('Demand & port operations report', 14, 14);
    doc.setFontSize(8);
    doc.text(
      `Filters: ${preset || 'custom'} | Region: ${region || 'all'} | Commodity: ${commodity || 'all'} | Search: ${debouncedSearch || '—'}`,
      14,
      20
    );
    const head = exportFields.map((f) => f.label);
    const body = rows.map((r) =>
      exportFields.map((f) => {
        if (f.format) return f.format(r);
        const v = r[f.key];
        return v == null ? '' : String(v);
      })
    );
    autoTable(doc, {
      startY: 24,
      head: [head],
      body,
      styles: { fontSize: 6, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    doc.save(`demand-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const colCount = 15;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-300/90">Demand intelligence</p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">View data</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Explore approved demand entries: filter the table below, then review trends.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 ring-1 ring-white/5">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/5"
        >
          <div>
            <h2 className="text-sm font-semibold text-white">Filters</h2>
            <p className="text-xs text-slate-500">Narrow by time, region, commodity, or keywords</p>
          </div>
          <span className="text-xs font-medium text-sky-300/90">{filtersOpen ? 'Hide' : 'Show'}</span>
        </button>
        {filtersOpen && (
          <div className="grid gap-4 border-t border-white/10 px-5 pb-5 pt-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-slate-400">Time window</span>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-slate-100 outline-none ring-sky-500/30 transition focus:ring-2"
              >
                {presets.map((p) => (
                  <option key={p.id || 'c'} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-slate-400">From (custom)</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPreset('');
                }}
                
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-slate-400">To (custom)</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPreset('');
                }}
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-slate-400">Commodity</span>
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-slate-100 outline-none ring-sky-500/30 transition focus:ring-2"
              >
                <option value="">All commodities</option>
                {COMMODITY_OPTIONS.map((com) => (
                  <option key={com} value={com}>
                    {com}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-slate-400">Region/Port</span>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="port name or region"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm md:col-span-2 lg:col-span-1">
              <span className="text-slate-400">Keyword search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="Matches region, commodity, location code, vessel status…"
              />
              
            </label>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Demand records</h2>
            <p className="text-sm text-slate-500">
              Approved operational entries matching your filters. Click column headers to sort.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
            >
              Export PDF
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 ring-1 ring-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/95 text-[11px] font-semibold uppercase tracking-wide text-slate-400 backdrop-blur-sm">
                <tr>
                  <th className="cursor-pointer whitespace-nowrap px-3 py-3 hover:text-sky-300" onClick={() => toggleSort('date')}>
                    Date{sortHint('date')}
                  </th>
                  <th className="cursor-pointer whitespace-nowrap px-3 py-3 hover:text-sky-300" onClick={() => toggleSort('portName')}>
                    Port{sortHint('portName')}
                  </th>
                  <th className="whitespace-nowrap px-3 py-3">Ship Name</th>
                  <th className="cursor-pointer whitespace-nowrap px-3 py-3 hover:text-sky-300" onClick={() => toggleSort('commodity_type')}>
                    Commodity{sortHint('commodity_type')}
                  </th>
                  <th className="cursor-pointer whitespace-nowrap px-3 py-3 hover:text-sky-300" onClick={() => toggleSort('commodity_quantity')}>
                    Qty{sortHint('commodity_quantity')}
                  </th>
                  <th className="cursor-pointer whitespace-nowrap px-3 py-3 hover:text-sky-300" onClick={() => toggleSort('container_count')}>
                    Containers{sortHint('container_count')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {sortedItems.map((row) => (
                  <tr key={row._id} className="transition hover:bg-sky-500/5">
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{fmtDate(row.date)}</td>
                    <td className="max-w-[140px] truncate px-3 py-2.5 font-medium text-white" title={row.portName}>
                      {row.portName || '—'}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2.5" title={row.shipName}>
                      {row.shipName || '—'}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2.5" title={row.commodity_type}>
                      {row.commodity_type || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{fmtNum(row.commodity_quantity)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{fmtNum(row.container_count)}</td>
                  </tr>
                ))}
                {!sortedItems.length && !loading && (
                  <tr>
                    <td colSpan={colCount} className="px-3 py-12 text-center text-slate-500">
                      No approved records match these filters. Adjust filters or add data via Demand entry (admin/analyst).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-500">
              {loading ? 'Loading…' : `Page ${page} of ${totalPages} · ${total} record(s)`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Trends & distribution</h2>
            <p className="text-sm text-slate-500">
              Region × commodity breakdown (based on current filters, up to 500 rows).
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 ring-1 ring-white/5">
          <h3 className="mb-3 text-sm font-medium text-slate-300">Region × commodity (stacked)</h3>
          <div className="h-64 w-full overflow-x-auto">
            <div style={{ minWidth: Math.max(480, stacked.length * 72) }}>
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={stacked}>
                  <XAxis dataKey="region" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  {stackKeys.map((k, i) => (
                    <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DemandViewData;
