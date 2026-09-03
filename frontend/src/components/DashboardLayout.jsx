import { useEffect, useState, useCallback } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { API_HOST } from '../config';
import ProfileModal from './ProfileModal';
import { useSocket } from '../context/useSocket';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const token = localStorage.getItem('flowsynqToken');
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('flowsynqUser') || 'null');
    } catch {
      return null;
    }
  });
  const [error, setError] = useState('');
  const [demandOpen, setDemandOpen] = useState(true);
  const [operatorOpen, setOperatorOpen] = useState(location.pathname.startsWith('/operator'));
  const [supplyPlanningOpen, setSupplyPlanningOpen] = useState(location.pathname.includes('/dashboard/supply-planning'));
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notificationUnread, setNotificationUnread] = useState(0);

  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false);
  }, [location.pathname, isDesktop]);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setProfile(res.data);
        localStorage.setItem('flowsynqUser', JSON.stringify(res.data));
      })
      .catch(() => {
        setError('Session expired or invalid token. Please login again.');
        localStorage.removeItem('flowsynqToken');
        localStorage.removeItem('flowsynqUser');
        setProfile(null);
      });
  }, [navigate, token]);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setNotificationUnread(res.data?.unread ?? 0);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    const raf = requestAnimationFrame(() => {
      refreshUnread();
    });
    const t = setInterval(refreshUnread, 30000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, [profile, refreshUnread]);

  useEffect(() => {
    const onUnread = (e) => {
      if (e.detail?.unread !== undefined) setNotificationUnread(e.detail.unread);
    };
    window.addEventListener('flowsynq-unread', onUnread);
    return () => window.removeEventListener('flowsynq-unread', onUnread);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const bump = () => {
      if (location.pathname.includes('/notifications')) return;
      refreshUnread();
    };
    socket.on('app_notification', bump);
    return () => socket.off('app_notification', bump);
  }, [socket, location.pathname, refreshUnread]);

  const handleLogout = () => {
    localStorage.removeItem('flowsynqToken');
    localStorage.removeItem('flowsynqUser');
    window.dispatchEvent(new Event('flowsynq-auth-change'));
    navigate('/');
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 px-4 text-center">
          {error ? (
            <>
              <p className="max-w-md text-sm text-rose-300">{error}</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Back to login
              </button>
            </>
          ) : (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
              <p className="text-sm text-slate-400">Loading dashboard…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const role = profile?.role;
  const canDemandEntry = role === 'admin' || role === 'analyst';
  const isAdmin = role === 'admin';
  const isOperatorOrAdmin = role === 'operator' || role === 'admin';

  const demandActive = location.pathname.includes('/dashboard/demand');
  const operatorActive = location.pathname.startsWith('/operator');

  const navBtnClass = (isActive) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
      ? 'bg-cyan-500/15 text-cyan-300 shadow-lg shadow-cyan-500/5'
      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
    }`;

  return (
    <div className="relative flex min-h-screen bg-slate-950 text-slate-100">
      {/* Seaport background image */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-10"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&q=80')",
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-br from-slate-950/95 via-slate-950/90 to-cyan-950/80" />

      {/* Mobile overlay */}
      {!isDesktop && sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-700/60 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
          sidebarOpen
            ? 'w-64 translate-x-0'
            : '-translate-x-full w-64 lg:translate-x-0 lg:w-[72px]'
        }`}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-700/60 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          {sidebarOpen && (
            <span
              className="text-xl font-bold tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.06em',
              }}
            >
              FlowSynq
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            <li>
              <Link to="/dashboard" className={navBtnClass(location.pathname === '/dashboard')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
                </svg>
                {sidebarOpen && <span>Dashboard</span>}
              </Link>
            </li>

            {isAdmin && (
              <li>
                <Link to="/dashboard/tanks" className={navBtnClass(location.pathname === '/dashboard/tanks')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  {sidebarOpen && <span>Tank Inventory</span>}
                </Link>
              </li>
            )}

            {isOperatorOrAdmin && role !== 'operator' && (
              <li>
                <button
                  type="button"
                  onClick={() => setOperatorOpen(!operatorOpen)}
                  className={navBtnClass(operatorActive)}
                  title="Operator Hub"
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {sidebarOpen && <span>Operator Hub</span>}
                  </div>
                  {sidebarOpen && (
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${operatorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                {operatorOpen && sidebarOpen && (
                  <ul className="ml-9 mt-1 flex flex-col gap-1 border-l border-slate-700/60 pl-3">
                    <li>
                      <Link
                        to="/operator/bulk-updates"
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${location.pathname === '/operator/bulk-updates'
                          ? 'font-medium text-cyan-300'
                          : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        Bulk Update
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/operator/shipment-actions"
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${location.pathname === '/operator/shipment-actions'
                          ? 'font-medium text-cyan-300'
                          : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        Shipment Actions
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/operator/view-data"
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${location.pathname === '/operator/view-data'
                          ? 'font-medium text-cyan-300'
                          : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        View Data
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}

            <div className="my-3 border-t border-slate-700/60" />

            <li>
              <button
                type="button"
                onClick={() => setDemandOpen(!demandOpen)}
                className={`flex w-full items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${demandActive ? 'bg-slate-800/60 text-slate-200' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                title="Demand Data"
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {sidebarOpen && <span>Demand Data</span>}
                </div>
                {sidebarOpen && (
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${demandOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {demandOpen && sidebarOpen && (
                <ul className="ml-9 mt-1 flex flex-col gap-1 border-l border-slate-700/60 pl-3">
                  {canDemandEntry && (
                    <li>
                      <Link
                        to="/dashboard/demand/entry"
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${location.pathname === '/dashboard/demand/entry'
                          ? 'font-medium text-cyan-300'
                          : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        Entry
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link
                      to="/dashboard/demand/view"
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${location.pathname === '/dashboard/demand/view'
                        ? 'font-medium text-cyan-300'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      View Data
                    </Link>
                  </li>
                  {isAdmin && (
                    <li>
                      <Link
                        to="/dashboard/demand/approvals"
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${location.pathname === '/dashboard/demand/approvals'
                          ? 'font-medium text-cyan-300'
                          : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        Approvals
                      </Link>
                    </li>
                  )}

                </ul>
              )}
            </li>

            {canDemandEntry && (
              <li>
                <Link to="/dashboard/forecast" className={navBtnClass(location.pathname === '/dashboard/forecast')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {sidebarOpen && <span>AI Forecasting</span>}
                </Link>
              </li>
            )}

            {role !== 'operator' && (
              <li>
                <Link to="/dashboard/recommendations" className={navBtnClass(location.pathname === '/dashboard/recommendations')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {sidebarOpen && <span>Recommendations</span>}
                </Link>
              </li>
            )}

            {isAdmin && (
              <li>
                <Link to="/dashboard/admin/demo-requests" className={navBtnClass(location.pathname === '/dashboard/admin/demo-requests')}>
                  <span className="h-5 w-5 shrink-0 text-center">D</span>
                  {sidebarOpen && <span>Demo Requests</span>}
                </Link>
              </li>
            )}
            {role === 'organization' && (
              <li>
                <Link to="/dashboard/shipments" className={navBtnClass(location.pathname === '/dashboard/shipments')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21V7a2 2 0 00-2-2h-3V3H9v2H6a2 2 0 00-2 2v14m16 0H4m16 0v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5m12-9h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
                  </svg>
                  {sidebarOpen && <span>Shipment Risk</span>}
                </Link>
              </li>
            )}
            <li>
              <Link to={isAdmin ? '/dashboard/admin/sanctioned-list' : '/dashboard/sanctioned-list'} className={navBtnClass(location.pathname.includes('/sanctioned-list'))}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M6.343 6.343l11.314 11.314" />
                </svg>
                {sidebarOpen && <span>Sanctioned List</span>}
              </Link>
            </li>
            {role === 'organization' && (
              <>
                <li>
                  <Link to="/dashboard/billing" className={navBtnClass(location.pathname.includes('/dashboard/billing'))}>
                    <span className="h-5 w-5 shrink-0 text-center">$</span>
                    {sidebarOpen && <span>Subscription</span>}
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/shipment-requests" className={navBtnClass(location.pathname.includes('/dashboard/shipment-requests'))}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-8 8h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {sidebarOpen && <span>Shipment Requests</span>}
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard/import-requests" className={navBtnClass(location.pathname.includes('/dashboard/import-requests'))}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {sidebarOpen && <span>Import Requests</span>}
                  </Link>
                </li>
              </>
            )}
            <li>
              <Link to="/dashboard/notifications" className={navBtnClass(location.pathname.includes('/dashboard/notifications'))}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0" />
                </svg>
                {sidebarOpen && (
                  <span className="flex items-center gap-2">
                    Notifications
                    {notificationUnread > 0 && (
                      <span className="inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-semibold text-slate-950">
                        {notificationUnread > 9 ? '9+' : notificationUnread}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            </li>

            {/* Supply Planning (operators use /operator/supply-planning) */}
            {(role === 'admin' || role === 'analyst' || role === 'organization') && (
              <li>
                <button
                  type="button"
                  onClick={() => setSupplyPlanningOpen(!supplyPlanningOpen)}
                  className={`flex w-full items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${location.pathname.includes('/dashboard/supply-planning') ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                  title="Supply Planning"
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    {sidebarOpen && <span>Supply Planning</span>}
                  </div>
                  {sidebarOpen && (
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${supplyPlanningOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                {supplyPlanningOpen && sidebarOpen && (
                  <ul className="ml-9 mt-1 flex flex-col gap-1 border-l border-slate-700/60 pl-3">
                    <li>
                      <Link
                        to="/dashboard/supply-planning"
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${location.pathname === '/dashboard/supply-planning' ? 'font-medium text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Daily Planning Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/dashboard/supply-planning/history"
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${location.pathname === '/dashboard/supply-planning/history' ? 'font-medium text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Plan History
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}

            {role !== 'operator' && (
              <li>
                <Link to="/dashboard/cost-analytics" className={navBtnClass(location.pathname === '/dashboard/cost-analytics')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {sidebarOpen && <span>Cost Analytics</span>}
                </Link>
              </li>
            )}

       

          </ul>
        </nav>

        {/* User profile + sidebar toggle */}
        <div className="border-t border-slate-700/60 p-3">
          {sidebarOpen && (
            <div
              className="mb-3 rounded-xl bg-slate-900/80 p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition group"
              onClick={() => setShowProfileModal(true)}
              title="Edit Profile"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-700/60 bg-slate-800 flex items-center justify-center">
                {profile.profilePicture ? (
                  <img src={`${API_HOST}${profile.profilePicture}`} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-slate-400 uppercase">
                    {profile.fullName?.charAt(0) || profile.username?.charAt(0)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white group-hover:text-cyan-300 transition">{profile.fullName}</p>
                <p className="truncate text-xs text-slate-400">{profile.email}</p>
                <span className="mt-1 inline-block rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-cyan-300">
                  {profile.role}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main
        className={`relative z-10 flex min-w-0 flex-1 flex-col transition-all duration-300 ${
          isDesktop ? (sidebarOpen ? 'ml-64' : 'ml-[72px]') : 'ml-0'
        }`}
      >
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-700/60 bg-slate-950/85 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white">FlowSynq</span>
        </header>
        <div className="p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm font-medium text-rose-200 shadow-xl backdrop-blur-xl">
              {error}
            </div>
          )}
          {profile.isDemo && (
            <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm text-amber-200">
              Demo mode: view-only access. Expires {new Date(profile.demoExpiresAt).toLocaleString()}.
            </div>
          )}
          <Outlet context={{ profile, token }} />
        </div>
      </main>

      {showProfileModal && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(updatedProfile) => {
            setProfile(updatedProfile);
            localStorage.setItem('flowsynqUser', JSON.stringify(updatedProfile));
          }}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
