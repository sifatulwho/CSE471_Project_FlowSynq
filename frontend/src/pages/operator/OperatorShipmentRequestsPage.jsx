import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

const OperatorShipmentRequestsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/shipment-requests', { params: { status, search } })
      .then((res) => setItems(res.data.items || []))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load requests.'))
      .finally(() => setLoading(false));
  }, [status, search]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Shipment Requests</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100">
          <option value="">All Status</option><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option><option value="sanctioned">sanctioned</option>
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        {loading ? <p className="text-slate-400">Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Request ID</th><th className="px-3 py-2">Organization</th><th className="px-3 py-2">Commodity</th>
                  <th className="px-3 py-2">Vessel</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Requested Arrival</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((row) => (
                  <tr key={row._id}>
                    <td className="px-3 py-2 text-slate-200">{row._id.slice(-8)}</td>
                    <td className="px-3 py-2 text-slate-300">{row.organizationName}</td>
                    <td className="px-3 py-2 text-slate-300">{row.commodityType}</td>
                    <td className="px-3 py-2 text-slate-300">{row.vesselName}</td>
                    <td className="px-3 py-2 text-slate-300">{row.cargoQuantity}</td>
                    <td className="px-3 py-2 text-slate-300">{new Date(row.requestedArrivalTime).toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-300">{row.status}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => navigate(`/operator/shipment-requests/${row._id}`)} className="rounded bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300">Review</button>
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

export default OperatorShipmentRequestsPage;
