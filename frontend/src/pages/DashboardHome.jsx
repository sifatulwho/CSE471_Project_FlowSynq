import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import ImageBackground from '../components/ImageBackground';
import bgImage from '../assets/bg-image.jpg';
import { api } from '../api';
import AdminDashboardHome from './AdminDashboardHome';

const DashboardHome = () => {
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const [cachedUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('flowsynqUser') || 'null');
    } catch {
      return null;
    }
  });
  const [widgets, setWidgets] = useState({});

  const displayName = profile?.fullName || cachedUser?.fullName;
  const role = profile?.role;
  const canEntry = role === 'admin' || role === 'analyst';
  const isAdmin = role === 'admin';
  const isOperatorOrAdmin = role === 'operator' || role === 'admin';

  useEffect(() => {
    let mounted = true;
    const loadWidgets = async () => {
      try {
        if (role === 'operator') {
          const [shipmentReq, importReq] = await Promise.all([
            api.get('/shipment-requests', { params: { status: 'pending', limit: 1 } }),
            api.get('/import-requests', { params: { limit: 5 } }),
          ]);
          if (mounted) setWidgets({
            pendingShipmentRequests: shipmentReq.data?.total || 0,
            importResponses: (importReq.data?.items || []).filter((i) => i.status !== 'pending').length,
          });
        } else if (role === 'organization') {
          const [myReq, imports] = await Promise.all([
            api.get('/shipment-requests', { params: { limit: 200 } }),
            api.get('/import-requests', { params: { status: 'pending', limit: 200 } }),
          ]);
          const list = myReq.data?.items || [];
          if (mounted) setWidgets({
            myShipmentPending: list.filter((i) => i.status === 'pending').length,
            myShipmentApproved: list.filter((i) => i.status === 'approved').length,
            pendingImportRequests: imports.data?.total || 0,
          });
        } else if (role === 'admin') {
          const [sanctions, requests] = await Promise.all([
            api.get('/sanctioned-list', { params: { limit: 500 } }),
            api.get('/shipment-requests', { params: { limit: 5 } }),
          ]);
          const items = sanctions.data?.items || [];
          if (mounted) setWidgets({
            sanctionedOrganizations: items.filter((i) => i.entryType === 'organization' && i.status === 'active').length,
            sanctionedCommodities: items.filter((i) => i.entryType === 'commodity' && i.status === 'active').length,
            sanctionedVessels: items.filter((i) => i.entryType === 'vessel' && i.status === 'active').length,
            recentShipmentRequestActivity: requests.data?.items?.length || 0,
          });
        }
      } catch {
        // keep dashboard resilient even when optional widget APIs fail
      }
    };
    loadWidgets();
    return () => { mounted = false; };
  }, [role]);

  // Dedicated admin home — avoids blank/broken generic dashboard for admin role
  if (role === 'admin') {
    return <AdminDashboardHome />;
  }

  return (
    <div className="relative isolate min-h-screen">
      <ImageBackground imageSrc={bgImage} />

      <div className="relative z-10 flex flex-col gap-8 p-6">
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/70 p-8 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300/90">Your workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {displayName ? (
              <>
                Welcome back, <span className="text-cyan-400">{displayName}</span>
              </>
            ) : (
              'Loading your dashboard…'
            )}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
            Monitor port demand, review submissions, and keep operations aligned.
          </p>
        </div>

        {profile ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm transition-transform hover:scale-[1.02]">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Account</p>
              <p className="mt-2 truncate text-lg font-bold text-white">{profile.email}</p>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm transition-transform hover:scale-[1.02]">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Role</p>
              <p className="mt-2 text-lg font-bold capitalize text-cyan-400">{profile.role}</p>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm transition-transform hover:scale-[1.02]">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">country</p>
              <p className="mt-2 text-lg font-bold text-white">{profile.country}</p>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 backdrop-blur-sm transition-transform hover:scale-[1.02]">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Access</p>
              <p className="mt-2 text-sm leading-snug text-slate-300">
                {isAdmin ? 'Full access: tanks, shipments, demand' : isOperatorOrAdmin ? 'Shipment management' : canEntry ? 'Submit demand for approval' : 'View approved demand data'}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-8 text-slate-400 backdrop-blur-sm">Loading profile…</div>
        )}

        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Quick actions</h2>
          {role === 'operator' && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">Pending Shipment Requests: <span className="font-semibold text-cyan-300">{widgets.pendingShipmentRequests ?? 0}</span></div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">Import Request Responses: <span className="font-semibold text-cyan-300">{widgets.importResponses ?? 0}</span></div>
            </div>
          )}
          {role === 'organization' && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">My Shipment Requests (Pending): <span className="font-semibold text-cyan-300">{widgets.myShipmentPending ?? 0}</span></div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">My Shipment Requests (Approved): <span className="font-semibold text-cyan-300">{widgets.myShipmentApproved ?? 0}</span></div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">Pending Import Requests: <span className="font-semibold text-cyan-300">{widgets.pendingImportRequests ?? 0}</span></div>
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/dashboard/demand/view"
              className="group rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 transition-all hover:border-cyan-400/40 hover:bg-slate-900/80 backdrop-blur-sm hover:scale-[1.02]"
            >
              <p className="font-semibold text-white group-hover:text-cyan-300">View demand data</p>
              <p className="mt-1 text-sm text-slate-400">Filter, sort, and export approved entries</p>
            </Link>
            {canEntry && (
              <Link
                to="/dashboard/demand/entry"
                className="group rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 transition-all hover:border-cyan-400/40 hover:bg-slate-900/80 backdrop-blur-sm hover:scale-[1.02]"
              >
                <p className="font-semibold text-white group-hover:text-cyan-300">New demand entry</p>
                <p className="mt-1 text-sm text-slate-400">Log regional and operational metrics</p>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/dashboard/demand/approvals"
                className="group rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 transition-all hover:border-amber-400/40 hover:bg-slate-900/80 backdrop-blur-sm hover:scale-[1.02]"
              >
                <p className="font-semibold text-white group-hover:text-amber-300">Pending approvals</p>
                <p className="mt-1 text-sm text-slate-400">Review analyst submissions</p>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/dashboard/tanks"
                className="group rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 transition-all hover:border-emerald-400/40 hover:bg-slate-900/80 backdrop-blur-sm hover:scale-[1.02]"
              >
                <p className="font-semibold text-white group-hover:text-emerald-300">Tank Inventory</p>
                <p className="mt-1 text-sm text-slate-400">Add, update, and manage tank records</p>
              </Link>
            )}
            {role === 'operator' && (
              <button
                type="button"
                onClick={() => navigate('/operator/dashboard')}
                className="group rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 text-left transition-all hover:border-blue-400/40 hover:bg-slate-900/80 backdrop-blur-sm hover:scale-[1.02]"
              >
                <p className="font-semibold text-white group-hover:text-blue-300">Operator Hub</p>
                <p className="mt-1 text-sm text-slate-400">Real-time shipment tracking & bulk updates</p>
              </button>
            )}
            {role === 'organization' && (
              <Link
                to="/organization/shipment-requests/create"
                className="group rounded-2xl border border-slate-700/60 bg-slate-950/70 p-5 transition-all hover:border-blue-400/40 hover:bg-slate-900/80 backdrop-blur-sm hover:scale-[1.02]"
              >
                <p className="font-semibold text-white group-hover:text-blue-300">New Shipment Request</p>
                <p className="mt-1 text-sm text-slate-400">Submit a shipment request to operators</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
