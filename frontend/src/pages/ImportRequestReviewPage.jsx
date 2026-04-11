import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../api';

const ImportRequestReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const role = String(profile?.role || '').toLowerCase();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');

  const load = () => {
    api.get(`/import-requests/${id}`)
      .then((res) => setItem(res.data))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load request.'));
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const respond = async (decision) => {
    await api.post(`/import-requests/${id}/respond`, { decision, responseMessage: reason });
    setReason('');
    load();
  };

  if (!item) return <div className="text-slate-300">{error || 'Loading...'}</div>;
  const canRespond = role === 'organization' && item.status === 'pending';

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="rounded-xl bg-slate-700 px-3 py-1.5 text-sm text-slate-200">Back</button>
      <h2 className="text-2xl font-bold text-white">Import Request Details</h2>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 text-sm text-slate-200 space-y-2">
        <p><strong>Operator:</strong> {item.operatorName}</p>
        <p><strong>Organization:</strong> {item.organizationName}</p>
        <p><strong>Commodity:</strong> {item.commodityType}</p>
        <p><strong>Requested Quantity:</strong> {item.requestedQuantity}</p>
        <p><strong>Timeframe:</strong> {item.deliveryTimeframe}</p>
        <p><strong>Status:</strong> {item.status}</p>
        {item.demandReferenceId && <p><strong>Demand Link:</strong> {item.demandReferenceId.commodity_type} ({new Date(item.demandReferenceId.date).toLocaleDateString()})</p>}
        {item.termsDetails && <p><strong>Terms:</strong> {item.termsDetails}</p>}
        {item.responseMessage && <p><strong>Response:</strong> {item.responseMessage}</p>}
      </div>
      {canRespond && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 space-y-2">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional response / required for rejection" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
          <div className="flex gap-2">
            <button onClick={() => respond('approve')} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Approve Request</button>
            <button onClick={() => respond('reject')} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white">Reject Request</button>
          </div>
        </div>
      )}
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>}
    </div>
  );
};

export default ImportRequestReviewPage;
