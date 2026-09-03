import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config';

const DemoRequestPage = () => {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ fullName: '', email: '', company: '', portName: '' });
  const [message, setMessage] = useState(params.get('paid') ? 'Payment received. An administrator will review your request.' : '');
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.post(`${API_BASE}/demo-requests`, form);
      window.location.assign(response.data.checkoutUrl);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to start secure payment.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold">Request a FlowSynq demo</h1>
        <p className="text-sm text-slate-400">$100 one-time payment. Approved access is view-only and expires after the configured demo period.</p>
        {['fullName', 'email', 'company', 'portName'].map((name) => (
          <input key={name} required={name !== 'portName'} type={name === 'email' ? 'email' : 'text'} placeholder={name === 'portName' ? 'Port (optional)' : name} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
        ))}
        <button disabled={loading} className="w-full rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60">{loading ? 'Redirecting...' : 'Pay $100 securely'}</button>
        {message && <p className="text-sm text-cyan-300">{message}</p>}
      </form>
    </main>
  );
};
export default DemoRequestPage;
