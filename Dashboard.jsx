import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const token = localStorage.getItem('flowsynqToken');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    axios.get('http://localhost:5001/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setProfile(res.data))
      .catch(() => {
        setError('Session expired or invalid token. Please login again.');
        localStorage.removeItem('flowsynqToken');
      });
  }, [navigate, token]);

  const handleLogout = () => {
    localStorage.removeItem('flowsynqToken');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-700/80 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin Dashboard</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">Flowsynq Port Control</h1>
              <p className="mt-2 max-w-2xl text-slate-400">A clean admin landing page for managing tanks, shipments, and regional demand data.</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-3xl bg-rose-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-400"
            >
              Logout
            </button>
          </div>

          {error && <div className="rounded-3xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

          {profile ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl bg-slate-950/80 p-6">
                <h2 className="text-sm uppercase tracking-[0.3em] text-cyan-300">User</h2>
                <p className="mt-3 text-2xl font-semibold text-white">{profile.fullName}</p>
                <p className="mt-1 text-sm text-slate-400">{profile.email}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-6">
                <h2 className="text-sm uppercase tracking-[0.3em] text-cyan-300">Role</h2>
                <p className="mt-3 text-2xl font-semibold text-white">{profile.role}</p>
                <p className="mt-1 text-sm text-slate-400">Secure role-based access granted.</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-6">
                <h2 className="text-sm uppercase tracking-[0.3em] text-cyan-300">Country</h2>
                <p className="mt-3 text-2xl font-semibold text-white">{profile.country}</p>
                <p className="mt-1 text-sm text-slate-400">Operational region.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-900/80 p-6 text-slate-400">Loading profile...</div>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            <Link to="/tanks" className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-6 hover:border-cyan-500/50 hover:bg-slate-900/80 transition cursor-pointer group block">
              <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition">Tank Inventory &rarr;</h3>
              <p className="mt-3 text-slate-400">Add, update or delete tank inventory records from the admin panel.</p>
            </Link>
            <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-6">
              <h3 className="text-lg font-semibold text-white">Shipment Schedules</h3>
              <p className="mt-3 text-slate-400">Operators can schedule and update shipment status in real time.</p>
            </div>
            <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-6">
              <h3 className="text-lg font-semibold text-white">Regional Demand</h3>
              <p className="mt-3 text-slate-400">Analysts can manage demand entries to support forecasting.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
