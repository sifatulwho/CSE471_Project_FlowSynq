import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../../config';

const API = `${API_BASE}/recommendations`;

const Recommendations = () => {
  const { token, profile } = useOutletContext() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(API, { headers: { Authorization: `Bearer ${token}` } });
      setItems(res.data.items || []);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load recommendations.' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const ack = async (id) => {
    try {
      await axios.put(`${API}/${id}/ack`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ type: 'success', message: 'Acknowledged.' });
      fetchItems();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed.' });
    }
  };

  const forward = async (id) => {
    try {
      await axios.put(`${API}/${id}/forward`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ type: 'success', message: 'Forwarded to organization.' });
      fetchItems();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed.' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Import Recommendations</h2>
        <p className="mt-1 text-sm text-slate-300">
          Port: <span className="font-semibold text-white">{profile?.portName || '—'}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-950/70 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Inbox</p>
          <button
            type="button"
            onClick={fetchItems}
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-slate-400">No recommendations yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((r) => (
              <div key={r._id} className="rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{r.commodityType}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Recommended import: <span className="font-semibold text-white">{Number(r.recommendedUnits || 0).toLocaleString()}</span> units
                      {' '}over next {r.horizonDays} days
                    </p>
                    {Array.isArray(r.scheduleDates) && r.scheduleDates.length > 0 && (
                      <p className="mt-1 text-sm text-slate-400">
                        Schedule: <span className="text-slate-200">{r.scheduleDates.join(', ')}</span>
                      </p>
                    )}
                    {r.timingAdvice && (
                      <p className="mt-2 text-sm text-cyan-200">{r.timingAdvice}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${r.status === 'forwarded'
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : r.status === 'acknowledged'
                          ? 'bg-amber-500/15 text-amber-200'
                          : 'bg-sky-500/15 text-sky-200'
                      }`}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => ack(r._id)}
                    className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    onClick={() => forward(r._id)}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    Notify organization (delay shipment)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${toast.type === 'error'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            }`}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-3 text-slate-300 hover:text-white">✕</button>
        </div>
      )}
    </div>
  );
};

export default Recommendations;

