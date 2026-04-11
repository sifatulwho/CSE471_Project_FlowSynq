import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import RouteMap from '../../components/RouteMap';
import WeatherRiskPanel from '../../components/WeatherRiskPanel';
import DemandSupplyGapCard from '../../components/DemandSupplyGapCard';

const API = 'http://localhost:5001/api/shipments';
const PAGE_SIZE = 25;

const SeeMoreShipmentsButton = ({ onClick, disabled }) => (
  <div className="flex justify-center pt-6">
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="border hover:scale-95 duration-300 relative group cursor-pointer text-sky-50 overflow-hidden h-16 w-64 rounded-md bg-sky-200 p-2 flex justify-center items-center font-extrabold disabled:opacity-50 disabled:pointer-events-none"
    >
      <div className="absolute right-32 -top-4 group-hover:top-1 group-hover:right-2 z-10 w-40 h-40 rounded-full group-hover:scale-150 duration-500 bg-sky-900" />
      <div className="absolute right-2 -top-4 group-hover:top-1 group-hover:right-2 z-10 w-32 h-32 rounded-full group-hover:scale-150 duration-500 bg-sky-800" />
      <div className="absolute -right-12 top-4 group-hover:top-1 group-hover:right-2 z-10 w-24 h-24 rounded-full group-hover:scale-150 duration-500 bg-sky-700" />
      <div className="absolute right-20 -top-4 group-hover:top-1 group-hover:right-2 z-10 w-16 h-16 rounded-full group-hover:scale-150 duration-500 bg-sky-600" />
      <p className="z-10">See more</p>
    </button>
  </div>
);

const STATUS_CONFIG = {
  'En Route': { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  Docked: { color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  Unloading: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  Unloaded: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  Delayed: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['En Route'];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
      {status}
    </span>
  );
};

const ViewData = () => {
  const { token } = useOutletContext();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalAll, setTotalAll] = useState(0);
  const [summary, setSummary] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const applyShipmentResponse = useCallback((data, append) => {
    if (Array.isArray(data)) {
      setShipments(data);
      setHasMore(false);
      setTotalAll(data.length);
      setSummary(null);
      return;
    }
    setShipments((prev) => (append ? [...prev, ...data.items] : data.items));
    setHasMore(Boolean(data.hasMore));
    setTotalAll(Number(data.total) || 0);
    if (data.summary) setSummary(data.summary);
  }, []);

  const fetchPage = useCallback(
    async (pageNum, includeSummary) => {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          limit: PAGE_SIZE,
          page: pageNum,
          ...(includeSummary ? { includeSummary: '1' } : {}),
        },
      });
      return res.data;
    },
    [token],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchPage(1, true);
        if (cancelled) return;
        applyShipmentResponse(data, false);
        setPage(1);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage, applyShipmentResponse]);

  const loadMoreShipments = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await fetchPage(nextPage, false);
      if (Array.isArray(data)) return;
      applyShipmentResponse(data, true);
      setPage(nextPage);
    } catch {
      /* silent */
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, fetchPage, applyShipmentResponse]);

  const filtered = shipments.filter((s) =>
    !search || s.shipName.toLowerCase().includes(search.toLowerCase())
  );

  const totalQty = summary?.totalCargo ?? shipments.reduce((sum, s) => sum + (s.cargoQuantity || 0), 0);
  const dockCount = summary?.activeDocks ?? [...new Set(shipments.map((s) => s.assignedDock))].filter(Boolean).length;
  const delayedCount = summary?.delayed ?? shipments.filter((s) => s.status === 'Delayed').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">View Shipment Data</h2>
        <p className="mt-1 text-sm text-slate-400">
          Comprehensive read-only view of all shipment records with detailed information
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Shipments</p>
          <p className="mt-2 text-3xl font-bold text-white">{totalAll || shipments.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Quantity</p>
          <p className="mt-2 text-3xl font-bold text-cyan-300">{totalQty.toLocaleString()} MT</p>
        </div>
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Docks</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">{dockCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Delayed</p>
          <p className="mt-2 text-3xl font-bold text-rose-400">
            {delayedCount}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by ship name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
        />
      </div>

      {/* Data cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-500">No shipments found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s._id}
              className="rounded-2xl border border-slate-700/60 bg-slate-900/80 transition-all hover:border-slate-600/80"
            >
              {/* Header row */}
              <button
                onClick={() => setExpandedId(expandedId === s._id ? null : s._id)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-lg">
                    🚢
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{s.shipName}</h3>
                    <p className="text-xs text-slate-400">
                      {new Date(s.arrivalTime).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={s.status} />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-slate-400 transition-transform ${expandedId === s._id ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded details */}
              {expandedId === s._id && (
                <div className="border-t border-slate-800 px-5 pb-5 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Ship Name</p>
                      <p className="mt-1 font-medium text-white">{s.shipName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Cargo Quantity</p>
                      <p className="mt-1 font-medium text-white">{Number(s.cargoQuantity).toLocaleString()} MT</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Assigned Dock</p>
                      <p className="mt-1 font-medium text-white">{s.assignedDock}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Created</p>
                      <p className="mt-1 font-medium text-white">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Notes</p>
                      <p className="mt-1 font-medium text-white">
                        {Array.isArray(s.notes) && s.notes.length > 0
                          ? s.notes[s.notes.length - 1].text
                          : 'No notes available.'}
                      </p>
                    </div>
                  </div>

                  {/* Status History */}
                  {s.statusHistory && s.statusHistory.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Status Timeline</p>
                      <div className="flex flex-wrap gap-2">
                        {s.statusHistory.map((h, i) => {
                          const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG['En Route'];
                          return (
                            <div
                              key={i}
                              className="rounded-lg p-2 text-xs"
                              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                            >
                              <span style={{ color: cfg.color }} className="font-semibold">{h.status}</span>
                              <span className="ml-2 text-slate-400">
                                {new Date(h.changedAt).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {s.notes && s.notes.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</p>
                      <div className="space-y-2">
                        {s.notes.map((n, i) => (
                          <div key={i} className="rounded-lg bg-slate-800/60 p-2.5 text-xs">
                            <p className="text-slate-200">{n.text}</p>
                            <p className="mt-1 text-slate-500">{n.author} • {new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(s.startingPort?.coordinates || s.destinationPort?.coordinates || (s.routeData?.waypoints?.length ?? 0) > 1) && (
                    <div className="mt-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Route Map</p>
                      <div className="h-[340px] overflow-hidden rounded-xl border border-slate-800/80">
                        <RouteMap
                          startingPort={s.startingPort}
                          destinationPort={s.destinationPort}
                          waypoints={s.routeData?.waypoints || []}
                          routeSource={s.routeData?.routeApiSource}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <WeatherRiskPanel shipment={s} />
                    <DemandSupplyGapCard impact={s.demandSupplyImpact} commodityType={s.commodityType} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && hasMore && filtered.length > 0 && (
        <SeeMoreShipmentsButton onClick={loadMoreShipments} disabled={loadingMore} />
      )}
    </div>
  );
};

export default ViewData;
