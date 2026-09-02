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
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [reason, setReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Modal state for approve/reject
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const load = () => {
    setError('');
    api.get(`/shipment-requests/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load request.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearMessages = () => {
    setActionMsg('');
    setActionError('');
  };

  const verify = async () => {
    clearMessages();
    setVerifying(true);
    try {
      await api.post(`/shipment-requests/${id}/verify`);
      setActionMsg('Sanction verification completed successfully.');
      load();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const confirmApprove = () => {
    clearMessages();
    setShowApproveModal(true);
  };

  const approve = async () => {
    setShowApproveModal(false);
    setApproving(true);
    try {
      await api.post(`/shipment-requests/${id}/approve`);
      setActionMsg('Shipment request approved and shipment created successfully!');
      // Navigate to shipment actions after a brief moment so user sees the success message
      setTimeout(() => {
        navigate('/operator/shipment-actions');
      }, 1500);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Approval failed. Please try again.';
      setActionError(msg);
      setApproving(false);
    }
  };

  const confirmReject = () => {
    if (!reason.trim()) {
      setActionError('Please enter a rejection reason before rejecting.');
      return;
    }
    clearMessages();
    setShowRejectModal(true);
  };

  const reject = async () => {
    setShowRejectModal(false);
    setRejecting(true);
    try {
      await api.post(`/shipment-requests/${id}/reject`, { reason });
      setActionMsg('Shipment request has been rejected.');
      setReason('');
      load();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Rejection failed. Please try again.');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) return <div className="text-slate-300">Loading...</div>;
  if (!data) return <div className="text-rose-300">{error || 'Not found'}</div>;

  const statusColors = {
    pending: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
    approved: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    rejected: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
    sanctioned: 'text-orange-300 bg-orange-500/10 border-orange-500/30',
  };

  return (
    <div className="space-y-4">
      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Confirm Approval</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to <span className="font-semibold text-emerald-400">approve</span> this shipment request? A new shipment will be created and you will be redirected to Shipment Actions.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={approve}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Confirm Rejection</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to <span className="font-semibold text-rose-400">reject</span> this shipment request?
            </p>
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-300">
              <span className="font-semibold text-slate-400">Reason: </span>{reason}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 transition-colors"
              >
                Yes, Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate(-1)} className="rounded-xl bg-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600 transition-colors">
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white">Shipment Request Review</h2>

      {/* Action feedback banners */}
      {actionMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-start gap-2">
          <span>✓</span> <span>{actionMsg}</span>
        </div>
      )}
      {actionError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-start gap-2">
          <span>✗</span> <span>{actionError}</span>
        </div>
      )}

      {/* Request details */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 text-sm text-slate-200 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Organization</span>
            <p className="mt-0.5 font-medium">{data.organizationName}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Commodity</span>
            <p className="mt-0.5 font-medium">{data.commodityType}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Vessel</span>
            <p className="mt-0.5 font-medium">{data.vesselName} {data.vesselImoNumber ? `(${data.vesselImoNumber})` : ''}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Cargo Quantity</span>
            <p className="mt-0.5 font-medium">{data.cargoQuantity}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Requested Arrival</span>
            <p className="mt-0.5 font-medium">{new Date(data.requestedArrivalTime).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Status</span>
            <p className={`mt-0.5 inline-block rounded-full px-3 py-0.5 text-xs font-semibold border ${statusColors[data.status] || 'text-slate-300'}`}>
              {data.status}
            </p>
          </div>
        </div>
        {data.notes && (
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Notes</span>
            <p className="mt-0.5">{data.notes}</p>
          </div>
        )}
        {data.reviewReason && (
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Review Reason</span>
            <p className="mt-0.5">{data.reviewReason}</p>
          </div>
        )}
        {data.createdShipmentId && (
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wider">Created Shipment ID</span>
            <p className="mt-0.5 font-mono text-cyan-300">{typeof data.createdShipmentId === 'object' ? data.createdShipmentId._id : data.createdShipmentId}</p>
          </div>
        )}
      </div>

      {/* Operator/Admin actions */}
      {isOperator && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 space-y-4">
          <h3 className="text-white font-semibold text-base">Sanction Verification</h3>

          <button
            onClick={verify}
            disabled={verifying || (data.status !== 'pending' && data.status !== 'sanctioned')}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 hover:bg-cyan-400 transition-colors flex items-center gap-2"
          >
            {verifying ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Running Check...
              </>
            ) : 'Run Sanction Check'}
          </button>

          {data.sanctionCheck?.checkedAt && (
            <div className={`rounded-xl px-4 py-3 text-sm space-y-1 ${data.sanctionCheck.isSanctioned ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'}`}>
              <p className="font-semibold">
                {data.sanctionCheck.isSanctioned ? '✗ Sanctioned Entity Detected' : '✓ Verification Passed — No Sanctions Found'}
              </p>
              <p className="text-xs opacity-70">
                Checked at: {new Date(data.sanctionCheck.checkedAt).toLocaleString()}
              </p>
              {Array.isArray(data.sanctionCheck.matchedEntities) && data.sanctionCheck.matchedEntities.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {data.sanctionCheck.matchedEntities.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}
              {Array.isArray(data.sanctionCheck.reasons) && data.sanctionCheck.reasons.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs opacity-80">
                  {data.sanctionCheck.reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Approve / Reject actions */}
          <div className="border-t border-slate-700/60 pt-4">
            <h4 className="text-white font-medium text-sm mb-3">Decision</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={confirmApprove}
                disabled={approving || data.status !== 'pending' || !data.sanctionCheck?.checkedAt || data.sanctionCheck?.isSanctioned}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 hover:bg-emerald-400 transition-colors"
              >
                {approving ? 'Approving...' : '✓ Approve Request'}
              </button>
              <div className="flex flex-1 gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                />
                <button
                  onClick={confirmReject}
                  disabled={rejecting || (data.status !== 'pending' && data.status !== 'sanctioned')}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-rose-400 transition-colors whitespace-nowrap"
                >
                  {rejecting ? 'Rejecting...' : '✗ Reject'}
                </button>
              </div>
            </div>
            {!data.sanctionCheck?.checkedAt && data.status === 'pending' && (
              <p className="mt-2 text-xs text-amber-400">⚠ Run sanction check before approving.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentRequestReviewPage;
