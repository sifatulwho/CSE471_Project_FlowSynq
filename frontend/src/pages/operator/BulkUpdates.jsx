import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';

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

const STATUSES = Object.keys(STATUS_CONFIG);

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

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${type === 'error'
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
        }`}
    >
      {message}
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white">✕</button>
    </div>
  );
};

const BulkUpdates = () => {
  const { token } = useOutletContext();

  // Build auth config fresh each call to avoid stale closure issues
  const authConfig = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const [shipments, setShipments] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [executing, setExecuting] = useState(false);

  const applyShipmentResponse = useCallback((data, append) => {
    if (Array.isArray(data)) {
      setShipments(data);
      setHasMore(false);
      return;
    }
    setShipments((prev) => (append ? [...prev, ...data.items] : data.items));
    setHasMore(Boolean(data.hasMore));
  }, []);

  const fetchPage = useCallback(
    async (pageNum) => {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: PAGE_SIZE, page: pageNum },
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
        const data = await fetchPage(1);
        if (cancelled) return;
        applyShipmentResponse(data, false);
        setPage(1);
      } catch (err) {
        console.error('Fetch shipments error:', err);
        if (!cancelled) setToast({ message: 'Failed to load shipments.', type: 'error' });
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
      const data = await fetchPage(nextPage);
      if (Array.isArray(data)) return;
      applyShipmentResponse(data, true);
      setPage(nextPage);
    } catch (err) {
      console.error('Fetch shipments error:', err);
      setToast({ message: 'Failed to load more shipments.', type: 'error' });
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, fetchPage, applyShipmentResponse]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === shipments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(shipments.map((s) => s._id)));
    }
  };

  const openBulkModal = (action) => {
    if (selected.size === 0) {
      setToast({ message: 'Please select at least one shipment.', type: 'error' });
      return;
    }
    setBulkAction(action);
    setBulkValue(action === 'Mark Delayed' ? 'Delayed' : '');
    setShowModal(true);
  };

  const executeBulk = async () => {
    const ids = Array.from(selected);
    let updates = {};

    if (bulkAction === 'Update Status') {
      if (!bulkValue) {
        setToast({ message: 'Please select a status.', type: 'error' });
        return;
      }
      updates = { status: bulkValue };
    } else if (bulkAction === 'Mark Delayed') {
      updates = { status: 'Delayed' };
    } else if (bulkAction === 'Assign Dock') {
      if (!bulkValue.trim()) {
        setToast({ message: 'Please enter a dock name.', type: 'error' });
        return;
      }
      updates = { assignedDock: bulkValue.trim() };
    }

    setExecuting(true);
    try {
      const res = await axios.put(`${API}/bulk-update`, { ids, updates }, authConfig());
      setToast({ message: `${res.data.modifiedCount || ids.length} shipment(s) updated successfully!`, type: 'success' });
      setSelected(new Set());
      setShowModal(false);
      const data = await fetchPage(1);
      applyShipmentResponse(data, false);
      setPage(1);
    } catch (err) {
      console.error('Bulk update error:', err?.response?.data || err);
      setToast({ message: err?.response?.data?.message || 'Bulk update failed.', type: 'error' });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Bulk Update System</h2>
        <p className="mt-1 text-sm text-slate-400">
          Select multiple shipments and perform batch operations
        </p>
      </div>

      {/* Bulk action toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
        <span className="text-sm text-slate-400">
          <span className="font-semibold text-cyan-300">{selected.size}</span> selected
        </span>
        <div className="h-5 w-px bg-slate-700" />
        <button
          onClick={() => openBulkModal('Update Status')}
          className="rounded-xl bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/25"
        >
          Update Status
        </button>
        <button
          onClick={() => openBulkModal('Assign Dock')}
          className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/25"
        >
          Assign Dock
        </button>
        <button
          onClick={() => openBulkModal('Mark Delayed')}
          className="rounded-xl bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/25"
        >
          Mark Delayed
        </button>
        <div className="flex-1" />
        <button
          onClick={selectAll}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          {selected.size === shipments.length && shipments.length > 0 ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Shipments table with checkboxes */}
      <div className="overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-900/60">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="py-16 text-center text-slate-500">No shipments available.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selected.size === shipments.length && shipments.length > 0}
                    onChange={selectAll}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                  />
                </th>
                <th className="px-5 py-4">Ship Name</th>
                <th className="px-5 py-4">Arrival Time</th>
                <th className="px-5 py-4">Cargo Qty</th>
                <th className="px-5 py-4">Assigned Dock</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {shipments.map((s) => (
                <tr
                  key={s._id}
                  className={`transition-colors ${selected.has(s._id) ? 'bg-cyan-500/5' : 'hover:bg-slate-800/40'
                    }`}
                >
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={selected.has(s._id)}
                      onChange={() => toggleSelect(s._id)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                    />
                  </td>
                  <td className="px-5 py-3.5 font-medium text-white">{s.shipName}</td>
                  <td className="px-5 py-3.5 text-slate-300">
                    {new Date(s.arrivalTime).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{Number(s.cargoQuantity).toLocaleString()} MT</td>
                  <td className="px-5 py-3.5 text-slate-300">{s.assignedDock}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && hasMore && shipments.length > 0 && (
        <SeeMoreShipmentsButton onClick={loadMoreShipments} disabled={loadingMore} />
      )}

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[slideUp_0.3s_ease] rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm Bulk Action</h3>
            <p className="mt-2 text-sm text-slate-400">
              Applying <span className="font-semibold text-cyan-300">{bulkAction}</span> to{' '}
              <span className="font-semibold text-cyan-300">{selected.size}</span> shipment(s).
            </p>

            {bulkAction === 'Update Status' && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-slate-400">New Status</label>
                <select
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                >
                  <option value="">Select status…</option>
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            )}

            {bulkAction === 'Assign Dock' && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-slate-400">Dock Name</label>
                <input
                  type="text"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder="e.g. Dock A"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
            )}

            {bulkAction === 'Mark Delayed' && (
              <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">
                ⚠️ This will mark all selected shipments as <strong>Delayed</strong>.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl px-4 py-2 text-sm text-slate-400 transition hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={executeBulk}
                disabled={executing}
                className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
              >
                {executing ? 'Updating…' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default BulkUpdates;
