import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import ProfileModal from '../../components/ProfileModal';
import { api } from '../../api';
import { useSocket } from '../../context/useSocket';
import { API_BASE } from '../../config';

const AUTH_API = `${API_BASE}/auth`;

const navBtnClass = (isActive) =>
  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
    ? 'bg-cyan-500/15 text-cyan-300 shadow-lg shadow-cyan-500/5'
    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
  }`;

const navItemsTop = [
  {
    to: '/operator/dashboard',
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
      </svg>
    ),
  },
  {
    to: '/operator/recommendations',
    label: 'Recommendations',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    to: '/operator/bulk-updates',
    label: 'Bulk Updates',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    to: '/operator/shipment-actions',
    label: 'Shipment Actions',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/operator/dock-management',
    label: 'Dock Management',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z" />
      </svg>
    ),
  },
  {
    to: '/operator/view-data',
    label: 'View Data',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const navItemsBottom = [
  {
    to: '/operator/shipment-requests',
    label: 'Shipment Requests',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-8 8h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/operator/import-requests',
    label: 'Import Requests',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    to: '/operator/sanctioned-list',
    label: 'Sanctioned List',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M6.343 6.343l11.314 11.314" />
      </svg>
    ),
  },
  {
    to: '/operator/notifications',
    label: 'Notifications',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0" />
      </svg>
    ),
  },
];

const OperatorLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [supplyPlanningOpen, setSupplyPlanningOpen] = useState(() =>
    location.pathname.startsWith('/operator/supply-planning'));
  const [notificationUnread, setNotificationUnread] = useState(0);
  const token = localStorage.getItem('flowsynqToken');

  const refreshUnread = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setNotificationUnread(res.data?.unread ?? 0);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith('/operator/supply-planning')) return;
    const t = requestAnimationFrame(() => setSupplyPlanningOpen(true));
    return () => cancelAnimationFrame(t);
  }, [location.pathname]);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    axios
      .get(`${AUTH_API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.data.role !== 'operator' && res.data.role !== 'admin') {
          navigate('/dashboard');
          return;
        }
        setProfile(res.data);
      })
      .catch(() => {
        localStorage.removeItem('flowsynqToken');
        navigate('/');
      });
  }, [navigate, token]);

  useEffect(() => {
    if (!token) return;
    const t = requestAnimationFrame(() => {
      refreshUnread();
    });
    return () => cancelAnimationFrame(t);
  }, [token, refreshUnread]);

  useEffect(() => {
    const onUnread = (e) => {
      if (e.detail?.unread !== undefined) setNotificationUnread(e.detail.unread);
    };
    window.addEventListener('flowsynq-unread', onUnread);
    return () => window.removeEventListener('flowsynq-unread', onUnread);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const bumpUnread = () => {
      if (location.pathname.includes('/notifications')) return;
      refreshUnread();
    };
    socket.on('app_notification', bumpUnread);
    return () => socket.off('app_notification', bumpUnread);
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
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Verifying operator access…</p>
        </div>
      </div>
    );
  }

  const supplyActive = location.pathname.startsWith('/operator/supply-planning');

  const renderNavLink = (item) => (
    <li key={item.to}>
      <NavLink
        to={item.to}
        className={({ isActive }) => navBtnClass(isActive)}
      >
        {item.icon}
        {sidebarOpen && (
          <span className="flex items-center gap-2">
            {item.label}
            {item.to === '/operator/notifications' && notificationUnread > 0 && (
              <span className="inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-semibold text-slate-950">
                {notificationUnread > 9 ? '9+' : notificationUnread}
              </span>
            )}
          </span>
        )}
      </NavLink>
    </li>
  );

  return (
    <div className="relative flex min-h-screen bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-10"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&q=80')",
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-br from-slate-950/95 via-slate-950/90 to-cyan-950/80" />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-700/60 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-[72px]'
          }`}
      >
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

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItemsTop.map(renderNavLink)}
            <li>
              <button
                type="button"
                onClick={() => setSupplyPlanningOpen(!supplyPlanningOpen)}
                className={`flex w-full items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${supplyActive ? 'bg-cyan-500/15 text-cyan-300 shadow-lg shadow-cyan-500/5' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
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
                    <NavLink
                      to="/operator/supply-planning"
                      className={({ isActive }) =>
                        `block rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'font-medium text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Daily supply planning dashboard
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/operator/supply-planning/history"
                      className={({ isActive }) =>
                        `block rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'font-medium text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      Plan history
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
            <li>
              <NavLink
                to="/operator/cost-analytics"
                className={({ isActive }) => navBtnClass(isActive)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {sidebarOpen && <span>Cost Analytics</span>}
              </NavLink>
            </li>
            {navItemsBottom.map(renderNavLink)}
          </ul>
        </nav>

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

      <main className={`relative z-10 flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-[72px]'}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-700/60 bg-slate-950/80 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Main
            </button>
          </div>
        </header>

        <div className="p-6">
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

export default OperatorLayout;
