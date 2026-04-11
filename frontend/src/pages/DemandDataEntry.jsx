import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../api';
import { COMMODITY_OPTIONS } from '../constants/ports';

const BERTH_LOCATIONS = ['GCB', 'NCT', 'CCT', 'JETTY-1', 'JETTY-2'];

const emptyHeader = (portName) => ({
  date: '',
  portName: portName || '',
  berthLocation: '',
  berthCapacity: '',
  totalHandled: '',
});

const emptyCommodityRow = () => ({
  commodityType: '',
  containerCount: '',
  commodityQuantity: '',
  containerDelivered: '',
});

function toNum(v) {
  if (v === '' || v === undefined || v === null) return 0;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return NaN;
  return n;
}

function isoDate(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
}

const DemandDataEntry = () => {
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const [header, setHeader] = useState(() => emptyHeader(profile?.portName));
  const [commodities, setCommodities] = useState([emptyCommodityRow()]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [applyDeliveredToPreviousDay, setApplyDeliveredToPreviousDay] = useState(true);

  const role = profile?.role;
  const allowed = role === 'admin' || role === 'analyst';

  useEffect(() => {
    if (!allowed) {
      navigate('/dashboard', { replace: true });
    }
  }, [allowed, navigate]);

  useEffect(() => {
    setHeader((h) => ({ ...h, portName: profile?.portName || h.portName }));
  }, [profile?.portName]);

  if (!allowed) {
    return null;
  }

  const updateHeader = (e) => {
    const { name, value } = e.target;
    setHeader((h) => ({ ...h, [name]: value }));
  };

  const loadSnapshot = async () => {
    if (!header.date) return;
    setLoading(true);
    try {
      const { data } = await api.get('/daily-ops/day', {
        params: { date: header.date, portName: role === 'admin' ? header.portName : undefined },
      });
      setSnapshot(data);
      if (data?.saved) {
        setHeader((h) => ({
          ...h,
          berthLocation: h.berthLocation || data.saved.berthLocation || '',
          berthCapacity: h.berthCapacity || data.saved.berthCapacity || '',
          totalHandled: h.totalHandled !== undefined && h.totalHandled !== '' ? h.totalHandled : String(data.saved.totalHandled || ''),
        }));
        if (Array.isArray(data.saved.commodities) && data.saved.commodities.length) {
          setCommodities(
            data.saved.commodities.map((r) => ({
              commodityType: String(r.commodityType || '').trim(),
              containerCount: r.containerCount ?? '',
              commodityQuantity: r.commodityQuantity ?? '',
              containerDelivered: r.containerDelivered ?? '',
            }))
          );
        }
      }
      if (!data?.saved?.berthCapacity && data?.computed?.berthCapacity && !header.berthCapacity) {
        setHeader((h) => ({ ...h, berthCapacity: data.computed.berthCapacity }));
      }
    } catch (error) {
      setSnapshot(null);
      setMessage({ type: 'err', text: error.response?.data?.message || 'Unable to load docked ships for that date.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSnapshot(null);
    if (header.date) loadSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header.date, header.portName]);

  const shipments = snapshot?.dockedShipments || snapshot?.saved?.shipments || [];
  const totalsFromShipments = snapshot?.totalsFromShipments || { totalContainer: 0, totalQuantity: 0 };
  const totalContainer = Number(snapshot?.saved?.totalContainer ?? totalsFromShipments.totalContainer ?? 0) || 0;
  const totalQuantity = Number(snapshot?.saved?.totalQuantity ?? totalsFromShipments.totalQuantity ?? 0) || 0;
  const totalHandled = toNum(header.totalHandled);
  const remainingContainer = Math.max(0, totalContainer - (Number.isNaN(totalHandled) ? 0 : totalHandled));

  const totalDeliveredFromTable = useMemo(() => {
    return commodities.reduce((acc, r) => {
      const n = toNum(r.containerDelivered);
      return acc + (Number.isNaN(n) ? 0 : n);
    }, 0);
  }, [commodities]);

  const computedVacancy = useMemo(() => {
    const cap = toNum(header.berthCapacity);
    if (Number.isNaN(cap)) return null;
    const prevRemaining = Number(snapshot?.previousRemainingContainer || 0) || 0;
    return cap - (totalContainer + prevRemaining - totalDeliveredFromTable);
  }, [header.berthCapacity, snapshot?.previousRemainingContainer, totalContainer, totalDeliveredFromTable]);

  const updateCommodityRow = (idx, key, value) => {
    setCommodities((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const addCommodityRow = () => setCommodities((prev) => [...prev, emptyCommodityRow()]);
  const removeCommodityRow = (idx) => setCommodities((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const validate = () => {
    if (!header.date) return 'Date is required.';
    if (!String(header.portName || '').trim()) return 'Port name is required.';
    if (!String(header.berthLocation || '').trim()) return 'Berth location is required.';
    const cap = toNum(header.berthCapacity);
    if (Number.isNaN(cap)) return 'Berth capacity must be a non-negative number.';
    const handled = toNum(header.totalHandled);
    if (Number.isNaN(handled)) return 'Total handled must be a non-negative number.';

    for (let i = 0; i < commodities.length; i++) {
      const r = commodities[i];
      if (!String(r.commodityType || '').trim()) return `Row ${i + 1}: Commodity type is required.`;
      const cc = toNum(r.containerCount);
      const cq = toNum(r.commodityQuantity);
      const cd = toNum(r.containerDelivered);
      if (Number.isNaN(cc) || Number.isNaN(cq) || Number.isNaN(cd)) return `Row ${i + 1}: Numbers must be non-negative.`;
      if (cd > cc) return `Row ${i + 1}: Container delivered cannot exceed container count.`;
    }
    return null;
  };

  const submit = async () => {
    setMessage({ type: '', text: '' });
    const err = validate();
    if (err) {
      setMessage({ type: 'err', text: err });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        date: header.date,
        portName: header.portName,
        berthLocation: header.berthLocation,
        berthCapacity: toNum(header.berthCapacity),
        shipments: shipments,
        totalContainer,
        totalQuantity,
        totalHandled: toNum(header.totalHandled),
        remainingContainer,
        totalDelivered: totalDeliveredFromTable,
        commodities: commodities.map((r) => ({
          commodityType: String(r.commodityType).trim(),
          containerCount: toNum(r.containerCount),
          commodityQuantity: toNum(r.commodityQuantity),
          containerDelivered: applyDeliveredToPreviousDay ? 0 : toNum(r.containerDelivered),
        })),
      };

      await api.post('/daily-ops', payload);

      if (applyDeliveredToPreviousDay) {
        const prev = new Date(`${header.date}T00:00:00.000Z`);
        prev.setUTCDate(prev.getUTCDate() - 1);
        const prevDate = isoDate(prev);

        const { data: prevSnap } = await api.get('/daily-ops/day', { params: { date: prevDate, portName: header.portName } });
        const prevSaved = prevSnap.saved || {};
        const prevRows = Array.isArray(prevSaved.commodities) ? prevSaved.commodities : [];

        const merged = commodities.map((r) => ({
          commodityType: String(r.commodityType).trim(),
          containerCount: toNum(r.containerCount),
          commodityQuantity: toNum(r.commodityQuantity),
          containerDelivered: toNum(r.containerDelivered),
        }));

        await api.post('/daily-ops', {
          date: prevDate,
          portName: header.portName,
          berthLocation: prevSaved.berthLocation || header.berthLocation,
          berthCapacity: prevSaved.berthCapacity || toNum(header.berthCapacity),
          shipments: prevSaved.shipments || prevSnap.dockedShipments || [],
          totalContainer: prevSaved.totalContainer || prevSnap.totalsFromShipments?.totalContainer || 0,
          totalQuantity: prevSaved.totalQuantity || prevSnap.totalsFromShipments?.totalQuantity || 0,
          totalHandled: prevSaved.totalHandled || 0,
          remainingContainer: prevSaved.remainingContainer || 0,
          commodities: merged.length ? merged : prevRows,
        });
      }

      setMessage({
        type: 'ok',
        text:
          role === 'admin'
            ? 'Saved and approved.'
            : 'Submitted for admin approval. Pending rows appear on the Approvals page until approved.',
      });
      setCommodities([emptyCommodityRow()]);
      setHeader((h) => ({ ...h, totalHandled: '' }));
      await loadSnapshot();
    } catch (error) {
      setMessage({ type: 'err', text: error.response?.data?.message || 'Submit failed.' });
    } finally {
      setLoading(false);
    }
  };

  const generateDemoYear = async () => {
    setMessage({ type: '', text: '' });
    const confirmed = window.confirm(
      'Generate 1 year of demo data? This creates docked shipments, daily port entries, and demand rows aligned for forecasting (same seed logic as operator demo).'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const { data } = await api.post('/demands/demo/generate', { days: 365 });
      setMessage({ type: 'ok', text: data.message || 'Demo demand dataset generated successfully.' });
    } catch (error) {
      setMessage({ type: 'err', text: error.response?.data?.message || 'Failed to generate demo data.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Product demand</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Daily product data entry</h1>
        <p className="mt-1 text-slate-400">Docked ships are auto-loaded from operator shipment actions.</p>
        {snapshot?.saved?.status && (
          <p className="mt-2 text-sm text-slate-300">
            Status for this date:{' '}
            <span className="font-semibold capitalize text-cyan-300">{snapshot.saved.status}</span>
            {snapshot.saved.status === 'pending' && role !== 'admin' && (
              <span className="text-slate-500"> — awaiting admin approval</span>
            )}
          </p>
        )}
      </div>

      {message.text && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${message.type === 'ok' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'
            }`}
        >
          {message.text}
        </div>
      )}

      {/* Stack 1 */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">1) Daily header</h2>
          <button
            type="button"
            onClick={loadSnapshot}
            disabled={loading || !header.date}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-50"
          >
            Refresh docked ships
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Date</span>
            <input
              name="date"
              type="date"
              value={header.date}
              onChange={updateHeader}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Port name</span>
            <input
              name="portName"
              value={header.portName}
              onChange={updateHeader}
              readOnly={role !== 'admin'}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500 read-only:opacity-70"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Berth location</span>
            <select
              name="berthLocation"
              value={header.berthLocation}
              onChange={updateHeader}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
              required
            >
              <option value="">Select</option>
              {BERTH_LOCATIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Berth capacity (constant)</span>
            <input
              name="berthCapacity"
              type="number"
              min={0}
              value={header.berthCapacity}
              onChange={updateHeader}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Total containers (from docked ships)</span>
            <input
              value={totalContainer}
              readOnly
              className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-slate-200 outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Total quantity (from docked ships)</span>
            <input
              value={totalQuantity}
              readOnly
              className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-slate-200 outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Total handled (random / entered)</span>
            <input
              name="totalHandled"
              type="number"
              min={0}
              value={header.totalHandled}
              onChange={updateHeader}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
              required
              placeholder="Enter handled containers"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-400">Remaining container (auto)</span>
            <input
              value={remainingContainer}
              readOnly
              className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-slate-200 outline-none"
            />
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Docked ships</p>
              <p className="text-xs text-slate-500">Loaded when shipment status is Docked and date matches.</p>
            </div>
            <div className="text-xs text-slate-400">
              Previous day remaining: <span className="font-semibold text-slate-200">{snapshot?.previousRemainingContainer ?? 0}</span>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead className="bg-slate-950/70 text-slate-400 text-xs">
                <tr>
                  <th className="px-3 py-2">Ship name</th>
                  <th className="px-3 py-2">Container count</th>
                  <th className="px-3 py-2">Cargo quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {shipments.map((s) => (
                  <tr key={s.shipName}>
                    <td className="px-3 py-2 text-slate-200">{s.shipName}</td>
                    <td className="px-3 py-2 text-slate-300">{s.containerCount}</td>
                    <td className="px-3 py-2 text-slate-300">{s.cargoQuantity}</td>
                  </tr>
                ))}
                {!shipments.length && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                      No docked ships found for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-400">
              Vacancy: <span className="font-semibold text-slate-200">{computedVacancy ?? '—'}</span>
            </div>
            {computedVacancy !== null && (
              <span
                className={`rounded-full px-3 py-1 text-xs ${computedVacancy > 0 ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'
                  }`}
              >
                {computedVacancy > 0 ? 'Vacant' : 'Not vacant'}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Stack 2 */}
      <section className="rounded-2xl border border-slate-800 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">2) Commodity details</h2>
            <p className="text-xs text-slate-500">
              Delivered containers are typically reported next day. By default, we apply your delivered inputs to <span className="font-semibold text-slate-300">yesterday</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={applyDeliveredToPreviousDay}
                onChange={(e) => setApplyDeliveredToPreviousDay(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
              />
              Apply delivered to previous day
            </label>
            <button
              type="button"
              onClick={addCommodityRow}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Add row
            </button>
            {role === 'admin' && (
              <button
                type="button"
                disabled={loading}
                onClick={generateDemoYear}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-50"
              >
                Generate 1-year demo data
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto bg-slate-950/20">
          <table className="min-w-[860px] w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/70 text-slate-400">
              <tr>
                <th className="px-3 py-2">Commodity type </th>
                <th className="px-3 py-2">Container count </th>
                <th className="px-3 py-2">Commodity quantity </th>
                <th className="px-3 py-2">Container delivered </th>
                <th className="px-3 py-2">Remaining (auto)</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {commodities.map((r, idx) => {
                const cc = toNum(r.containerCount);
                const cd = toNum(r.containerDelivered);
                const rem =
                  Number.isNaN(cc) || Number.isNaN(cd) ? '—' : Math.max(0, (cc || 0) - (cd || 0));
                return (
                  <tr key={idx} className="align-top">
                    <td className="px-3 py-2">
                      <select
                        value={r.commodityType}
                        onChange={(e) => updateCommodityRow(idx, 'commodityType', e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
                      >
                        <option value="">Select commodity…</option>
                        {COMMODITY_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    {[
                      ['containerCount', 'number', '0'],
                      ['commodityQuantity', 'number', '0'],
                      ['containerDelivered', 'number', '0'],
                    ].map(([key, type, placeholder]) => (
                      <td key={key} className="px-3 py-2">
                        <input
                          value={r[key]}
                          type={type}
                          min={type === 'number' ? 0 : undefined}
                          step={type === 'number' ? 'any' : undefined}
                          placeholder={placeholder}
                          onChange={(e) => updateCommodityRow(idx, key, e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <input
                        value={rem}
                        readOnly
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-slate-200 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeCommodityRow(idx)}
                        className="text-rose-400 hover:underline"
                        disabled={commodities.length <= 1}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Stack 3 */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-300">
            Total delivered (sum): <span className="font-semibold text-white">{totalDeliveredFromTable}</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </section>
    </div>
  );
};

export default DemandDataEntry;
