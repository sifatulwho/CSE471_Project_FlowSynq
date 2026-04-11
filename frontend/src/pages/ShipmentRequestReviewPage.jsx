import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../api';

const ShipmentRequestReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const role = String(profile?.role || '').toLowerCase();
  const isOperator = role === 'operator' || role === 'admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');

  const load = () => {
    api.get(`/shipment-requests/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load request.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = async () => {
    await api.post(`/shipment-requests/${id}/verify`);
    load();
  };
  const approve = async () => {
    if (!window.confirm('Approve this request and create shipment?')) return;
    await api.post(`/shipment-requests/${id}/approve`);
    load();
  };
  const reject = async () => {
    if (!reason.trim()) return;
    await api.post(`/shipment-requests/${id}/reject`, { reason });
    setReason('');
    load();
  };

  if (loading) return <div className="text-slate-300">Loading...</div>;
  if (!data) return <div className="text-rose-300">{error || 'Not found'}</div>;

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="rounded-xl bg-slate-700 px-3 py-1.5 text-sm text-slate-200">Back</button>
      <h2 className="text-2xl font-bold text-white">Shipment Request Review</h2>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 text-sm text-slate-200 space-y-2">
        <p><strong>Organization:</strong> {data.organizationName}</p>
        <p><strong>Commodity:</strong> {data.commodityType}</p>
        <p><strong>Vessel:</strong> {data.vesselName} {data.vesselImoNumber ? `(${data.vesselImoNumber})` : ''}</p>
        <p><strong>Quantity:</strong> {data.cargoQuantity}</p>
        <p><strong>Requested Arrival:</strong> {new Date(data.requestedArrivalTime).toLocaleString()}</p>
        <p><strong>Status:</strong> {data.status}</p>
        {data.reviewReason && <p><strong>Reason:</strong> {data.reviewReason}</p>}
      </div>
      {isOperator && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 space-y-3">
          <h3 className="text-white font-semibold">Sanction Verification</h3>
          <button onClick={verify} disabled={data.status !== 'pending' && data.status !== 'sanctioned'} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Run Sanction Check</button>
          {data.sanctionCheck?.checkedAt && (
            <div className={`rounded-xl px-3 py-2 text-sm ${data.sanctionCheck.isSanctioned ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
              {data.sanctionCheck.isSanctioned ? '✗ Sanctioned Entity Detected' : '✓ Verification Passed'}
              {Array.isArray(data.sanctionCheck.matchedEntities) && data.sanctionCheck.matchedEntities.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {data.sanctionCheck.matchedEntities.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={approve} disabled={data.status !== 'pending' || !data.sanctionCheck?.checkedAt || data.sanctionCheck?.isSanctioned} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">Approve Request</button>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason" className="flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
            <button onClick={reject} disabled={data.status !== 'pending' && data.status !== 'sanctioned'} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Reject</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentRequestReviewPage;
