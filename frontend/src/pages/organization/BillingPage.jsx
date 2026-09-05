import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';

const BillingPage = () => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const load = async () => {
    try {
      const response = await api.get('/billing/status');
      setStatus(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load subscription status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      api.post('/billing/sync', null, { params: { session_id: searchParams.get('session_id') || '' } })
        .then(() => load())
        .catch((err) => {
          setError(err?.response?.data?.message || 'Payment completed, but subscription status could not be synchronized yet.');
          load();
        });
    } else {
      load();
    }
  }, [searchParams]);

  const startCheckout = async () => {
    setError('');
    try {
      const response = await api.post('/billing/checkout', {
        clientUrl: window.location.origin,
      });
      window.location.assign(response.data.checkoutUrl);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to start subscription checkout.');
    }
  };

  const openPortal = async () => {
    setError('');
    try {
      const response = await api.post('/billing/portal');
      window.location.assign(response.data.url);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to open billing management.');
    }
  };

  const active = ['active', 'trialing'].includes(status?.status)
    && status?.currentPeriodEnd
    && new Date(status.currentPeriodEnd) > new Date();

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Organization Subscription</h2>
        <p className="mt-1 text-sm text-slate-400">A monthly subscription is required to submit new shipment requests.</p>
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
        {loading ? <p className="text-slate-400">Loading subscription...</p> : (
          <>
            <p className="text-lg font-semibold text-white">$100 USD / month</p>
            <p className="mt-2 text-sm text-slate-300">
              Status: <span className={active ? 'text-emerald-300' : 'text-amber-300'}>{status?.status || 'missing'}</span>
            </p>
            {status?.currentPeriodEnd && (
              <p className="mt-1 text-sm text-slate-400">
                {active ? 'Renews' : 'Ended'} {new Date(status.currentPeriodEnd).toLocaleString()}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {!active && <button type="button" onClick={startCheckout} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Subscribe for $100/month</button>}
              {status?.stripeCustomerId && <button type="button" onClick={openPortal} className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200">Manage billing</button>}
            </div>
          </>
        )}
      </div>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
    </div>
  );
};

export default BillingPage;
