import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';

const AdminDemoRequestsPage = () => {
  const { profile } = useOutletContext() || {};
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/demo-requests');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load demo requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.role !== 'admin') return undefined;
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load, profile?.role]);

  const process = async (id, action) => {
    try {
      const res = await api.post(`/demo-requests/${id}/${action}`);
      setMessage(res.data.message);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to process request.');
    }
  };
  const syncPayment = async (id) => {
    try {
      const res = await api.post(`/demo-requests/${id}/sync-payment`);
      setMessage(res.data.message);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to verify payment.');
    }
  };
  return (
    <div className="space-y-4 p-6 text-slate-100">
      <h1 className="text-2xl font-bold">Demo requests</h1>
      {profile?.role !== 'admin' && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          Administrator access is required to manage demo requests.
        </p>
      )}
      {message && <p className="text-sm text-cyan-300">{message}</p>}
      {loading && <p className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">Loading demo requests...</p>}
      {!loading && profile?.role === 'admin' && requests.length === 0 && (
        <p className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">No demo requests found.</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-700"><th className="p-3">Applicant</th><th className="p-3">Company</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
          <tbody>{requests.map((request) => <tr key={request.id} className="border-b border-slate-800"><td className="p-3">{request.fullName}<br /><span className="text-slate-400">{request.email}</span></td><td className="p-3">{request.company}</td><td className="p-3">{request.status}</td><td className="p-3">{request.status === 'pending_payment' && <button onClick={() => syncPayment(request.id)} className="mr-2 rounded bg-cyan-600 px-3 py-1">Verify payment</button>}{request.status === 'paid' && <><button onClick={() => process(request.id, 'approve')} className="mr-2 rounded bg-emerald-600 px-3 py-1">Approve</button><button onClick={() => process(request.id, 'reject')} className="rounded bg-rose-600 px-3 py-1">Reject</button></>}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};
export default AdminDemoRequestsPage;
