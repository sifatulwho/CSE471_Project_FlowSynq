import { useEffect, useState, useCallback } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import toast from 'react-hot-toast';

const STATUS_BADGES = {
  draft: 'bg-slate-700 text-slate-300',
  'pending approval': 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  approved: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  rejected: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  active: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  completed: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  expired: 'bg-slate-600/40 text-slate-400',
};

const PRIORITY_BADGES = {
  high: 'bg-rose-500/20 text-rose-300',
  medium: 'bg-amber-500/20 text-amber-300',
  low: 'bg-emerald-500/20 text-emerald-300',
};

const MetricCard = ({ label, value, sub, icon, color = 'cyan' }) => (
  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
        <p className={`mt-1 text-2xl font-bold text-${color}-300`}>{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className={`rounded-xl bg-${color}-500/10 p-2`}>{icon}</div>
    </div>
  </div>
);

export default function DailyPlanningDashboard() {
  const { profile } = useOutletContext() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const supplyBase = location.pathname.startsWith('/operator') ? '/operator/supply-planning' : '/dashboard/supply-planning';
  const role = String(profile?.role || '').toLowerCase();
  const isOperator = role === 'operator' || role === 'admin';
  const isOrg = role === 'organization';
  const isViewer = role === 'admin' || role === 'analyst' || role === 'organization';

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [strategy, setStrategy] = useState('balanced');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState(null);

  const canEdit = isOperator && plan && ['draft', 'pending approval'].includes(plan.status);
  const canApprove = isOperator && plan && !['approved', 'active', 'completed', 'rejected'].includes(plan.status);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/supply-plans', { params: { date, limit: 1 } });
      const items = res.data?.items || [];
      if (isOrg) {
        const approved = items.find(p => ['approved', 'active', 'completed'].includes(p.status));
        setPlan(approved || null);
      } else {
        setPlan(items[0] || null);
      }
      setWarnings([]);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [date, isOrg]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const handleGenerate = async () => {
    if (!isOperator) return;
    setGenerating(true);
    try {
      const res = await api.post('/supply-plans/generate', { date, strategy, portName: profile?.portName });
      setPlan(res.data.plan);
      setWarnings(res.data.warnings || []);
      toast.success('Supply plan generated!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to generate plan.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await api.post(`/supply-plans/${plan._id}/approve`, { notes: approveNotes });
      setPlan(res.data.plan);
      toast.success('Plan approved!');
      setShowApproveModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Approval failed.');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Rejection reason required.'); return; }
    try {
      const res = await api.post(`/supply-plans/${plan._id}/reject`, { reason: rejectReason });
      setPlan(res.data.plan);
      toast.success('Plan rejected.');
      setShowRejectModal(false);
      setRejectReason('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Rejection failed.');
    }
  };

  const handleExecute = async () => {
    try {
      const res = await api.post(`/supply-plans/${plan._id}/execute`);
      setPlan(res.data.plan);
      toast.success('Plan execution started!');
      setShowExecuteModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Execute failed.');
    }
  };

  const handleSaveAlloc = async (idx, updated) => {
    const newAllocs = plan.allocations.map((a, i) => i === idx ? { ...a, ...updated } : a);
    try {
      const res = await api.patch(`/supply-plans/${plan._id}/modify`, {
        allocations: newAllocs,
        field: `allocation[${idx}]`,
        oldValue: plan.allocations[idx],
        newValue: updated,
      });
      setPlan(res.data);
      setEditingAlloc(null);
      toast.success('Allocation updated.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed.');
    }
  };

  const handleUpdateAllocStatus = async (idx, status) => {
    try {
      const res = await api.patch(`/supply-plans/${plan._id}/allocations/${idx}/status`, { status });
      setPlan(res.data);
      toast.success(`Allocation marked as ${status}.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Status update failed.');
    }
  };

  const m = plan?.metrics || {};
  const llm = plan?.llmExplanation || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Supply Planning</h1>
          <p className="text-sm text-slate-400 mt-0.5">AI-powered autonomous allocation agent</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          {isOperator && (
            <>
              <select value={strategy} onChange={e => setStrategy(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                <option value="balanced">Balanced</option>
                <option value="demand_priority">Demand Priority</option>
                <option value="cost_optimization">Cost Optimization</option>
              </select>
              <button
                id="btn-generate-plan"
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />Generating…</>
                ) : '⚡ Generate Plan'}
              </button>
            </>
          )}
          {plan && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${STATUS_BADGES[plan.status] || 'bg-slate-700 text-slate-300'}`}>
              {plan.status}
            </span>
          )}
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-1">
          {warnings.map((w, i) => <p key={i} className="text-xs text-amber-300">⚠ {w}</p>)}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
        </div>
      )}

      {!loading && !plan && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-12 text-center">
          <p className="text-slate-400">No plan found for {date}.</p>
          {isOperator && <p className="text-sm text-slate-500 mt-1">Click "Generate Plan" to create one.</p>}
        </div>
      )}

      {!loading && plan && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard label="Total Allocation" value={m.totalAllocation?.toFixed(0) ?? '—'} sub="units" icon={<svg className="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
            <MetricCard label="Demand Coverage" value={`${m.demandCoveragePercentage?.toFixed(1) ?? 0}%`} icon={<svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="emerald" />
          </div>

          {/* Demand Panel */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <h2 className="text-base font-semibold text-white mb-4">Forecasted Demand Panel</h2>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {plan.allocations.map((al, i) => (
                <div key={i} className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/40">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commodity</p>
                  <p className="text-sm font-bold text-white mt-0.5">{al.product}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Forecast</p>
                      <p className="text-sm text-cyan-300 font-semibold">{al.quantity?.toFixed(0)} units</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase text-right">Priority</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_BADGES[al.priority] || ''}`}>{al.priority}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LLM Explanation Panel */}
          <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 to-cyan-950/30 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🤖</span>
              <h2 className="text-base font-semibold text-cyan-300">AI Plan Explanation</h2>
              {llm.fallbackUsed && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Fallback Explanation</span>
              )}
              {!llm.fallbackUsed && (
                <span className="rounded-full bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 uppercase tracking-wider">TinyLlama</span>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[['Plan Summary', llm.planSummary], ['Allocation Explanation', llm.allocationExplanation], ['Shipment Priority', llm.shipmentPriorityExplanation], ['Recommendations', llm.improvementRecommendations]].map(([title, text]) => (
                <div key={title} className="rounded-xl bg-slate-900/60 p-3 border border-slate-700/40">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{text || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Shipment Priority */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Shipment Unloading Priority</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(plan.shipmentPriorities || []).length === 0 && <p className="text-sm text-slate-500">No shipment priorities.</p>}
                {(plan.shipmentPriorities || []).map((sp, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-3 py-2">
                    <span className={`shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{sp.shipName}</p>
                      <p className="text-xs text-slate-400 truncate">{sp.commodity} · {sp.quantity?.toFixed(0)} units · {sp.assignedDock || 'TBA'}</p>
                      <p className="text-xs text-slate-500 truncate">{sp.reason}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-cyan-400">{sp.priorityScore?.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allocation Table */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Allocation Plan</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(plan.allocations || []).length === 0 && <p className="text-sm text-slate-500">No allocations generated.</p>}
                {(plan.allocations || []).map((al, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-800/50 px-3 py-2">
                    {editingAlloc === idx ? (
                      <EditAllocRow alloc={al} onSave={u => handleSaveAlloc(idx, u)} onCancel={() => setEditingAlloc(null)} />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white">{al.product}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_BADGES[al.priority] || ''}`}>{al.priority}</span>
                            {plan.status === 'active' && (
                              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${al.status === 'fulfilled' ? 'bg-emerald-500 text-slate-950' : al.status === 'partial' ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>{al.status || 'pending'}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{al.quantity?.toFixed(0)} units → {al.destinationBerth}</p>
                          <p className="text-xs text-slate-500 truncate">{al.reason}</p>
                        </div>
                        {canEdit && (
                          <button onClick={() => setEditingAlloc(idx)} className="shrink-0 rounded-lg bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600">Edit</button>
                        )}
                        {plan.status === 'active' && isOperator && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleUpdateAllocStatus(idx, 'fulfilled')} className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-400 hover:bg-emerald-500/30" title="Mark Fulfilled">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={() => handleUpdateAllocStatus(idx, 'partial')} className="rounded-lg bg-amber-500/20 p-1.5 text-amber-400 hover:bg-amber-500/30" title="Mark Partial">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modification History */}
          {(plan.modificationHistory || []).length > 0 && (
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Audit Trail / Modification History</h2>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...plan.modificationHistory].reverse().map((m, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <span className="shrink-0 text-slate-500 font-mono mt-0.5">{new Date(m.modifiedAt).toLocaleString()}</span>
                    <div className="flex-1">
                      <p className="text-slate-300">
                        <span className="font-semibold text-cyan-400">{m.field}</span> changed from 
                        <span className="mx-1 text-rose-400">{JSON.stringify(m.oldValue)}</span> to 
                        <span className="mx-1 text-emerald-400">{JSON.stringify(m.newValue)}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Modified by: {m.modifiedBy?.fullName || m.modifiedBy || 'System'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Workflow */}
          {isOperator && (
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 flex flex-wrap gap-3 items-center">
              <h2 className="text-sm font-semibold text-white mr-2">Actions:</h2>
              {canApprove && (
                <button id="btn-approve-plan" onClick={() => setShowApproveModal(true)} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">✓ Approve Plan</button>
              )}
              {canApprove && (
                <button id="btn-reject-plan" onClick={() => setShowRejectModal(true)} className="rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/30">✗ Reject Plan</button>
              )}
              {plan.status === 'approved' && (
                <button id="btn-execute-plan" onClick={() => setShowExecuteModal(true)} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">▶ Execute Plan</button>
              )}
              <button onClick={() => navigate(`${supplyBase}/history`)} className="rounded-xl bg-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600">View History</button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showApproveModal && <ConfirmModal title="Approve Plan?" onConfirm={handleApprove} onCancel={() => setShowApproveModal(false)} confirmClass="bg-emerald-500 text-slate-950">
        <textarea value={approveNotes} onChange={e => setApproveNotes(e.target.value)} placeholder="Optional approval notes…" rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 mt-2" />
      </ConfirmModal>}
      {showRejectModal && <ConfirmModal title="Reject Plan?" onConfirm={handleReject} onCancel={() => setShowRejectModal(false)} confirmClass="bg-rose-500 text-white">
        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason (required)…" rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 mt-2" />
      </ConfirmModal>}
      {showExecuteModal && <ConfirmModal title="Execute approved plan?" onConfirm={handleExecute} onCancel={() => setShowExecuteModal(false)} confirmClass="bg-cyan-500 text-slate-950">
        <p className="text-sm text-slate-400 mt-2">This will mark the plan as active and begin execution tracking.</p>
      </ConfirmModal>}
    </div>
  );
}

function EditAllocRow({ alloc, onSave, onCancel }) {
  const [qty, setQty] = useState(alloc.quantity);
  const [priority, setPriority] = useState(alloc.priority);
  const [berth, setBerth] = useState(alloc.destinationBerth);
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-24 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-100" />
      <input value={berth} onChange={e => setBerth(e.target.value)} className="flex-1 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-100" />
      <select value={priority} onChange={e => setPriority(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-100">
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <button onClick={() => onSave({ quantity: qty, priority, destinationBerth: berth })} className="rounded-lg bg-cyan-500 px-2 py-1 text-xs font-semibold text-slate-950">Save</button>
      <button onClick={onCancel} className="rounded-lg bg-slate-700 px-2 py-1 text-xs text-slate-300">Cancel</button>
    </div>
  );
}

function ConfirmModal({ title, children, onConfirm, onCancel, confirmClass }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {children}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-xl bg-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
          <button onClick={onConfirm} className={`rounded-xl px-4 py-2 text-sm font-semibold ${confirmClass}`}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
