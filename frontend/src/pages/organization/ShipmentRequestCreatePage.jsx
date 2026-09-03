import { useState } from 'react';
import { useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { COMMODITY_OPTIONS, PORT_OPTIONS } from '../../constants/ports';
import { api } from '../../api';
import PortCoordinateInput from '../../components/PortCoordinateInput';

const ShipmentRequestCreatePage = () => {
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const exportCommodities = Array.isArray(profile?.exportCommodities) && profile.exportCommodities.length
    ? profile.exportCommodities
    : COMMODITY_OPTIONS;
  const [form, setForm] = useState({
    commodityType: exportCommodities[0],
    vesselName: '',
    vesselImoNumber: '',
    cargoQuantity: '',
    requestedArrivalTime: '',
    startingPortCode: '',
    notes: '',
    // Custom port geocoding
    customStartingPortName: '',
    customStartingPortCoords: null,
    useCustomPort: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);

  useEffect(() => {
    api.get('/billing/status')
      .then((res) => setBilling(res.data))
      .catch((err) => setError(err?.response?.data?.message || 'Unable to verify subscription status.'))
      .finally(() => setBillingLoading(false));
  }, []);

  const subscriptionActive = ['active', 'trialing'].includes(billing?.status)
    && billing?.currentPeriodEnd
    && new Date(billing.currentPeriodEnd) > new Date();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let startingPort = null;
      
      if (form.useCustomPort) {
        if (form.customStartingPortName && form.customStartingPortCoords) {
          startingPort = {
            name: form.customStartingPortName,
            coordinates: form.customStartingPortCoords,
          };
        } else {
          setError('Please geocode the port before submitting.');
          setLoading(false);
          return;
        }
      } else {
        startingPort = PORT_OPTIONS.find((p) => p.code === form.startingPortCode) || null;
      }

      await api.post('/shipment-requests', {
        commodityType: form.commodityType,
        vesselName: form.vesselName,
        vesselImoNumber: form.vesselImoNumber,
        cargoQuantity: Number(form.cargoQuantity),
        requestedArrivalTime: form.requestedArrivalTime,
        startingPort,
        notes: form.notes,
      });
      navigate('/dashboard/shipment-requests');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Submit Shipment Request</h2>
      {!billingLoading && !subscriptionActive && (
        <div className="max-w-3xl rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-amber-100">
          <p className="font-semibold">Subscription required</p>
          <p className="mt-1 text-sm text-amber-200/80">Subscribe for $100 USD per month or renew your expired subscription to continue sending shipment requests.</p>
          <button type="button" onClick={() => navigate('/dashboard/billing')} className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Subscribe or renew</button>
        </div>
      )}
      {subscriptionActive && (
      <form onSubmit={submit} className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 space-y-3 max-w-3xl">
        <input value={profile?.fullName || profile?.username || ''} readOnly className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <select value={form.commodityType} onChange={(e) => setForm((p) => ({ ...p, commodityType: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100">
          {exportCommodities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={form.vesselName} onChange={(e) => setForm((p) => ({ ...p, vesselName: e.target.value }))} required placeholder="Vessel Name" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <input value={form.vesselImoNumber} onChange={(e) => setForm((p) => ({ ...p, vesselImoNumber: e.target.value }))} placeholder="Vessel IMO Number" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <input type="number" value={form.cargoQuantity} onChange={(e) => setForm((p) => ({ ...p, cargoQuantity: e.target.value }))} required placeholder="Cargo Quantity" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <input type="datetime-local" value={form.requestedArrivalTime} onChange={(e) => setForm((p) => ({ ...p, requestedArrivalTime: e.target.value }))} required className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Port Selection Mode</label>
          <select 
            value={form.useCustomPort ? 'custom' : 'predefined'} 
            onChange={(e) => setForm((p) => ({ ...p, useCustomPort: e.target.value === 'custom' }))}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
          >
            <option value="predefined">Predefined Ports</option>
            <option value="custom">Custom Port (Geocode)</option>
          </select>
        </div>
        {form.useCustomPort ? (
          <PortCoordinateInput
            label="Starting Port"
            portName={form.customStartingPortName}
            setPortName={(name) => setForm((p) => ({ ...p, customStartingPortName: name }))}
            coordinates={form.customStartingPortCoords}
            setCoordinates={(coords) => setForm((p) => ({ ...p, customStartingPortCoords: coords }))}
          />
        ) : (
          <select value={form.startingPortCode} onChange={(e) => setForm((p) => ({ ...p, startingPortCode: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100">
            <option value="">Select starting port</option>
            {PORT_OPTIONS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        )}
        <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional Details" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
        <button disabled={loading || billingLoading || !subscriptionActive} type="submit" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">{loading ? 'Submitting...' : 'Send Request to Operator'}</button>
      </form>
      )}
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>}
    </div>
  );
};

export default ShipmentRequestCreatePage;
