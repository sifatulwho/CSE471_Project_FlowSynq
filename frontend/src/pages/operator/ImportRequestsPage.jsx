import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';

const ImportRequestsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [commodityType, setCommodityType] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/import-requests', { params: { status, commodityType, search } })
      .then((res) => setItems(res.data.items || []))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load import requests.'));
  }, [status, commodityType, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Import Requests</h2>
        <Link to="/operator/import-requests/create" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Create Import Request</Link>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search organization..." className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <input value={commodityType} onChange={(e) => setCommodityType(e.target.value)} placeholder="Commodity" className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"><option value="">All status</option><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option></select>
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-400">
              <tr><th className="px-3 py-2">Request ID</th><th className="px-3 py-2">Organization</th><th className="px-3 py-2">Commodity</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Timeframe</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((row) => (
                <tr key={row._id}>
                  <td className="px-3 py-2 text-slate-200">{row._id.slice(-8)}</td>
                  <td className="px-3 py-2 text-slate-300">{row.organizationName}</td>
                  <td className="px-3 py-2 text-slate-300">{row.commodityType}</td>
                  <td className="px-3 py-2 text-slate-300">{row.requestedQuantity}</td>
                  <td className="px-3 py-2 text-slate-300">{row.deliveryTimeframe}</td>
                  <td className="px-3 py-2 text-slate-300">{row.status}</td>
                  <td className="px-3 py-2"><button onClick={() => navigate(`/operator/import-requests/${row._id}`)} className="rounded bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>}
    </div>
  );
};

export default ImportRequestsPage;
