import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import RouteMap from '../components/RouteMap';
import WeatherRiskPanel from '../components/WeatherRiskPanel';
import DemandSupplyGapCard from '../components/DemandSupplyGapCard';
import { API_BASE } from '../config';

const API = `${API_BASE}/shipments`;
const PAGE_SIZE = 8;

const OrganizationShipments = () => {
  const { token } = useOutletContext();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(API, {
          headers: { Authorization: `Bearer ${token}` },
          params: { page, limit: PAGE_SIZE },
        });
        if (cancelled) return;
        const data = response.data;
        if (Array.isArray(data)) {
          setShipments(data.slice(0, PAGE_SIZE));
          setHasMore(false);
          setTotal(data.length);
        } else {
          setShipments(data.items || []);
          setHasMore(Boolean(data.hasMore));
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setShipments([]);
          setError(err?.response?.data?.message || 'Unable to load shipments.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token, page]);

  if (loading && !shipments.length) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Shipment Risk View</h2>
          <p className="mt-1 text-sm text-slate-400">
            {total ? `${total} shipment${total === 1 ? '' : 's'} for your port` : 'Shipments for your port'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>
      )}

      {!shipments.length && !loading ? (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 text-sm text-slate-400">
          No shipments found for your port yet.
        </div>
      ) : (
        shipments.map((shipment) => {
          const isOpen = expandedId === shipment._id;
          return (
            <div key={shipment._id} className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : shipment._id)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white">{shipment.shipName}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {shipment.commodityType || 'Other'} · {shipment.status || '—'}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-cyan-300">
                  {isOpen ? 'Hide map' : 'Show map & risk'}
                </span>
              </button>

              {isOpen && (
                <div className="mt-4 space-y-4">
                  <div className="h-56 overflow-hidden rounded-xl border border-slate-700/50 sm:h-64">
                    <RouteMap
                      startingPort={shipment.startingPort}
                      destinationPort={shipment.destinationPort}
                      waypoints={shipment.routeData?.waypoints || []}
                    />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <WeatherRiskPanel shipment={shipment} />
                    <DemandSupplyGapCard impact={shipment.demandSupplyImpact} commodityType={shipment.commodityType} />
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {(hasMore || page > 1) && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">Page {page}</span>
          <button
            type="button"
            disabled={!hasMore || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default OrganizationShipments;
