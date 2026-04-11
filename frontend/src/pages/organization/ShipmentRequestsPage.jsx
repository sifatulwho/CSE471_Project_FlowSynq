import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';

const badgeCls = {
  pending: 'bg-amber-500/20 text-amber-300',
  approved: 'bg-emerald-500/20 text-emerald-300',
  rejected: 'bg-rose-500/20 text-rose-300',
  sanctioned: 'bg-red-900/50 text-red-300',
};

const ShipmentRequestsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/shipment-requests')
      .then((res) => setItems(res.data.items || []))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load requests.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">My Shipment Requests</h2>
        <Link to="/organization/shipment-requests/create" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">New Request</Link>
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        {loading ? <p className="text-slate-400">Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Request ID</th><th className="px-3 py-2">Commodity</th><th className="px-3 py-2">Vessel</th>
                  <th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Requested Arrival</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((row) => (
                  <tr key={row._id}>
                    <td className="px-3 py-2 text-slate-200">{row._id.slice(-8)}</td>
                    <td className="px-3 py-2 text-slate-300">{row.commodityType}</td>
                    <td className="px-3 py-2 text-slate-300">{row.vesselName}</td>
                    <td className="px-3 py-2 text-slate-300">{row.cargoQuantity}</td>
                    <td className="px-3 py-2 text-slate-300">{new Date(row.requestedArrivalTime).toLocaleString()}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs ${badgeCls[row.status] || 'bg-slate-700 text-slate-200'}`}>{row.status}</span></td>
                    <td className="px-3 py-2">
                      <button onClick={() => navigate(`/dashboard/shipment-requests/${row._id}`)} className="rounded bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300">View Details</button>
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

export default ShipmentRequestsPage;
