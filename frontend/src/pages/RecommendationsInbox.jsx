import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';

const RecommendationsInbox = () => {
  const { profile } = useOutletContext() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const forwardRecommendation = async (id) => {
    try {
      await api.put(`/recommendations/${id}/forward`);
      setItems((prev) => prev.map((r) => r._id === id ? { ...r, status: 'forwarded' } : r));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to forward recommendation.');
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api
      .get('/recommendations', { params: { limit: 20, page: 1 } })
      .then((res) => {
        if (!alive) return;
        setItems(res.data.items || []);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.response?.data?.message || 'Failed to load recommendations.');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Recommendations</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Forwarded import decisions</h1>
        <p className="mt-1 text-slate-400">
          Port: <span className="font-semibold text-white">{profile?.portName || '—'}</span>
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-slate-400">No forwarded recommendations yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((r) => (
              <div key={r._id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{r.commodityType}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Import {Number(r.recommendedUnits || 0).toLocaleString()} units over next {r.horizonDays} days
                    </p>
                    {Array.isArray(r.scheduleDates) && r.scheduleDates.length > 0 && (
                      <p className="mt-1 text-sm text-slate-400">Schedule: {r.scheduleDates.join(', ')}</p>
                    )}
                    {r.timingAdvice && <p className="mt-2 text-sm text-cyan-200">{r.timingAdvice}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                      {r.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsInbox;

