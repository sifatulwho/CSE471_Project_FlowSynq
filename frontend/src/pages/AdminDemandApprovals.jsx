import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../api';

const AdminDemandApprovals = () => {
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (profile && !isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/demands/batches', { params: { status: 'pending' } });
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const approve = async (batchId) => {
    setMessage('');
    try {
      await api.post(`/demands/batches/${encodeURIComponent(batchId)}/approve`);
      setMessage('Batch approved. Analyst will receive a confirmation email if SMTP is configured.');
      load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Approve failed.');
    }
  };

  const reject = async () => {
    if (!rejectId) return;
    setMessage('');
    try {
      await api.post(`/demands/batches/${encodeURIComponent(rejectId)}/reject`, { reason: rejectReason });
      setMessage('Batch rejected. Analyst can correct and resubmit.');
      setRejectId(null);
      setRejectReason('');
      load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Reject failed.');
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Demand batch approvals</h1>
        <p className="mt-1 text-slate-400">
          Review pending demand batches (including daily port entries synced as commodity rows). Batch IDs look like{' '}
          <code className="text-cyan-400/90">OPS-PORTNAME-YYYY-MM-DD</code>. Approving updates both demand rows and the underlying daily entry.
        </p>
      </div>

      {message && (
        <div className="rounded-2xl bg-slate-800/80 px-4 py-3 text-sm text-slate-200">{message}</div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/80 text-slate-400">
            <tr>
              <th className="px-3 py-2">Batch ID</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Region</th>
              <th className="px-3 py-2">Rows</th>
              <th className="px-3 py-2">Submitted by</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.batchId} className="border-t border-slate-800">
                <td className="max-w-[220px] truncate px-3 py-2 text-slate-300" title={row.batchId}>
                  {row.batchId}
                </td>
                <td className="px-3 py-2 text-slate-300">
                  {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-2">{row.region}</td>
                <td className="px-3 py-2 text-slate-300">{row.rows ?? '—'}</td>
                <td className="px-3 py-2 text-slate-400">
                  {row.submittedBy?.fullName || row.submittedBy?.email || '—'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => approve(row.batchId)}
                      className="text-emerald-400 hover:underline"
                    >
                      Approve batch
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectId(row.batchId)}
                      className="text-rose-400 hover:underline"
                    >
                      Reject batch
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No pending submissions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Reject submission</h3>
            <p className="mt-2 text-sm text-slate-400">Optional message to the analyst:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason('');
                }}
                className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={reject}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDemandApprovals;
