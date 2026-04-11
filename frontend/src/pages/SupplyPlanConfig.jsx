import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';
import toast from 'react-hot-toast';

export default function SupplyPlanConfig() {
  const { profile } = useOutletContext() || {};
  const role = String(profile?.role || '').toLowerCase();
  const isOperator = role === 'operator' || role === 'admin';

  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    autoGenerationTime: '06:00',
    lookAheadDays: 3,
    safetyStockPercentage: 15,
    allocationStrategy: 'balanced',
    approvalRequired: true,
    constraints: {
      minimumAllocationQuantity: 100,
      maximumDailyTransfers: 10,
      maximumDockLoad: 90,
      safetyStockLimit: 10,
    },
  });

  useEffect(() => {
    api.get('/supply-plans/config')
      .then(res => {
        setConfig(res.data);
        setForm({
          autoGenerationTime: res.data.autoGenerationTime || '06:00',
          lookAheadDays: res.data.lookAheadDays || 3,
          safetyStockPercentage: res.data.safetyStockPercentage || 15,
          allocationStrategy: res.data.allocationStrategy || 'balanced',
          approvalRequired: res.data.approvalRequired !== false,
          constraints: {
            minimumAllocationQuantity: res.data.constraints?.minimumAllocationQuantity || 100,
            maximumDailyTransfers: res.data.constraints?.maximumDailyTransfers || 10,
            maximumDockLoad: res.data.constraints?.maximumDockLoad || 90,
            safetyStockLimit: res.data.constraints?.safetyStockLimit || 10,
          },
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/supply-plans/config', form);
      setConfig(res.data);
      toast.success('Configuration saved!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const setConstraint = (field, value) => setForm(f => ({ ...f, constraints: { ...f.constraints, [field]: value } }));

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
    </div>
  );

  if (!isOperator) return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-8 text-center text-slate-400">
      Configuration is only available to operators and admins.
    </div>
  );

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none";
  const labelClass = "block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Configuration</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configure the Autonomous Daily Supply Planning Agent</p>
        {config?.portName && <p className="text-xs text-cyan-400 mt-1">Port: {config.portName}</p>}
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 space-y-5">
        <h2 className="text-sm font-semibold text-white border-b border-slate-700/60 pb-2">Scheduling</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Auto-Generation Time</label>
            <input type="time" value={form.autoGenerationTime} onChange={e => set('autoGenerationTime', e.target.value)} className={inputClass} />
            <p className="text-xs text-slate-500 mt-1">Daily plan auto-generation trigger time</p>
          </div>
          <div>
            <label className={labelClass}>Look-Ahead Days</label>
            <input type="number" min={1} max={14} value={form.lookAheadDays} onChange={e => set('lookAheadDays', Number(e.target.value))} className={inputClass} />
            <p className="text-xs text-slate-500 mt-1">How many days ahead to plan</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 space-y-5">
        <h2 className="text-sm font-semibold text-white border-b border-slate-700/60 pb-2">Planning Strategy</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Allocation Strategy</label>
            <select value={form.allocationStrategy} onChange={e => set('allocationStrategy', e.target.value)} className={inputClass}>
              <option value="demand_priority">Demand Priority</option>
              <option value="cost_optimization">Cost Optimization</option>
              <option value="balanced">Balanced</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Safety Stock %</label>
            <input type="number" min={0} max={50} value={form.safetyStockPercentage} onChange={e => set('safetyStockPercentage', Number(e.target.value))} className={inputClass} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input id="approvalRequired" type="checkbox" checked={form.approvalRequired} onChange={e => set('approvalRequired', e.target.checked)} className="h-4 w-4 rounded border-slate-600 accent-cyan-500" />
          <label htmlFor="approvalRequired" className="text-sm text-slate-300">Require operator approval before plan becomes active</label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 space-y-5">
        <h2 className="text-sm font-semibold text-white border-b border-slate-700/60 pb-2">Operational Constraints</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Min Allocation Qty (units)', 'minimumAllocationQuantity'],
            ['Max Daily Transfers', 'maximumDailyTransfers'],
            ['Max Dock Load (%)', 'maximumDockLoad'],
            ['Safety Stock Limit (%)', 'safetyStockLimit'],
          ].map(([label, field]) => (
            <div key={field}>
              <label className={labelClass}>{label}</label>
              <input type="number" min={0} value={form.constraints[field]} onChange={e => setConstraint(field, Number(e.target.value))} className={inputClass} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={handleSave} disabled={saving}
          className="rounded-xl bg-cyan-500 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
