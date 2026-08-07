import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api';

const DockManagement = () => {
  const [docks, setDocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const loadDocks = useCallback(async () => {
    try {
      const res = await api.get('/docks', {
        params: {
          search,
        },
      });
      setDocks(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load docks.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadDocks();
  }, [loadDocks]);

  useEffect(() => {
    const t = setInterval(loadDocks, 10000);
    return () => clearInterval(t);
  }, [loadDocks]);

  const visibleDocks = useMemo(() => {
    return docks;
  }, [docks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Dock Management</h2>
          <p className="mt-1 text-sm text-slate-400">Predefined Jetties with occupancy and vacancy.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-1">
          <input
            className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            placeholder="Search dock name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
        {loading ? (
          <p className="text-slate-400">Loading docks...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Dock</th>
                  <th className="px-3 py-2">Port</th>
                  <th className="px-3 py-2">Capacity</th>
                  <th className="px-3 py-2">Occupied Ships</th>
                  <th className="px-3 py-2">Vacancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {visibleDocks.map((dock) => (
                  <tr key={dock._id}>
                    <td className="px-3 py-2 text-slate-200">{dock.dockName}</td>
                    <td className="px-3 py-2 text-slate-300">{dock.portName}</td>
                    <td className="px-3 py-2 text-slate-300">{dock.dockCapacity}</td>
                    <td className="px-3 py-2 text-slate-300">{dock.occupiedShips}</td>
                    <td className="px-3 py-2 text-slate-300">
                      {Number(dock.dockVacancy || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>}
    </div>
  );
};

export default DockManagement;
