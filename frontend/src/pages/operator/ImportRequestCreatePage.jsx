import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMMODITY_OPTIONS } from '../../constants/ports';
import { api } from '../../api';

const ImportRequestCreatePage = () => {
  const navigate = useNavigate();
  const [commodityType, setCommodityType] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [demands, setDemands] = useState([]);
  const [form, setForm] = useState({
    organizationId: '',
    requestedQuantity: '',
    deliveryTimeframe: '',
    demandReferenceId: '',
    demandDetails: '',
    termsDetails: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/import-requests/organizations', { params: { commodityType } }).then((res) => setOrganizations(res.data || []));
    api.get('/import-requests/demand-references').then((res) => setDemands(res.data || []));
  }, [commodityType]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/import-requests', {
        organizationId: form.organizationId,
        commodityType,
        requestedQuantity: Number(form.requestedQuantity),
        deliveryTimeframe: form.deliveryTimeframe,
        demandReferenceId: form.demandReferenceId || null,
        demandDetails: form.demandDetails,
        termsDetails: form.termsDetails,
      });
      navigate('/operator/import-requests');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create import request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Create Import Request</h2>
      <form onSubmit={submit} className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 space-y-3 max-w-3xl">
        <select value={commodityType} onChange={(e) => { setCommodityType(e.target.value); setForm((p) => ({ ...p, organizationId: '' })); }} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100">
          {COMMODITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={form.organizationId} onChange={(e) => setForm((p) => ({ ...p, organizationId: e.target.value }))} required className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100">
          <option value="">Select Organization</option>
          {organizations.map((org) => (
            <option key={org._id} value={org._id}>
              {(org.fullName || org.username)} - {Array.isArray(org.exportCommodities) ? org.exportCommodities.join(', ') : ''}
            </option>
          ))}
        </select>
        <input type="number" value={form.requestedQuantity} onChange={(e) => setForm((p) => ({ ...p, requestedQuantity: e.target.value }))} required placeholder="Requested Quantity" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <input value={form.deliveryTimeframe} onChange={(e) => setForm((p) => ({ ...p, deliveryTimeframe: e.target.value }))} placeholder="Delivery Timeframe" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <select value={form.demandReferenceId} onChange={(e) => setForm((p) => ({ ...p, demandReferenceId: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100">
          <option value="">Link Demand Data (optional)</option>
          {demands.map((d) => <option key={d._id} value={d._id}>{new Date(d.date).toLocaleDateString()} - {d.portName} - {d.commodity_type}</option>)}
        </select>
        <textarea value={form.demandDetails} onChange={(e) => setForm((p) => ({ ...p, demandDetails: e.target.value }))} placeholder="Demand details (optional)" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <textarea value={form.termsDetails} onChange={(e) => setForm((p) => ({ ...p, termsDetails: e.target.value }))} placeholder="Terms and details" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <button disabled={loading} type="submit" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">{loading ? 'Sending...' : 'Send Request'}</button>
      </form>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>}
    </div>
  );
};

export default ImportRequestCreatePage;
