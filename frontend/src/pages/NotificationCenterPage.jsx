import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useSocket } from '../context/useSocket';

const LIST_LIMIT = 40;

const broadcastUnread = (n) => {
  window.dispatchEvent(new CustomEvent('flowsynq-unread', { detail: { unread: n } }));
};

const NotificationCenterPage = () => {
  const navigate = useNavigate();
  const { profile } = useOutletContext() || {};
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const normalizePath = useCallback(
    (path) => {
      if (!path) return path;
      if (profile?.role === 'operator' && path.startsWith('/dashboard/supply-planning')) {
        return path.replace(/^\/dashboard\/supply-planning/, '/operator/supply-planning');
      }
      return path;
    },
    [profile?.role],
  );

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      const u = res.data?.unread ?? 0;
      setUnread(u);
      broadcastUnread(u);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError('');
    (async () => {
      try {
        const res = await api.get('/notifications', { params: { limit: LIST_LIMIT } });
        if (cancelled) return;
        const list = res.data.items || [];
        setItems(list);
        setUnread(res.data.unread ?? 0);
        const hasUnread = list.some((n) => !n.isRead);
        if (hasUnread) {
          await api.post('/notifications/mark-all-read');
          if (cancelled) return;
          setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
          setUnread(0);
          broadcastUnread(0);
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load notifications.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onApp = (n) => {
      const row = { ...n };
      setItems((prev) => {
        const id = String(row._id || '');
        if (id && prev.some((p) => String(p._id) === id)) return prev;
        return [{ ...row, isRead: false }, ...prev];
      });
    };
    socket.on('app_notification', onApp);
    return () => socket.off('app_notification', onApp);
  }, [socket]);

  useEffect(
    () => () => {
      refreshUnreadCount();
    },
    [refreshUnreadCount],
  );

  const openItem = async (item) => {
    if (!item.isRead) {
      try {
        await api.post(`/notifications/${item._id}/read`);
        setItems((prev) =>
          prev.map((n) => (String(n._id) === String(item._id) ? { ...n, isRead: true } : n)),
        );
        await refreshUnreadCount();
      } catch {
        /* continue navigation */
      }
    }
    const path = normalizePath(item.navigationPath);
    if (path) navigate(path);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.post('/notifications/mark-all-read');
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
      broadcastUnread(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Notification Center</h2>
          <p className="text-sm text-slate-400">Unread: {unread}</p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={markingAll}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Mark all as read
        </button>
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={String(n._id)}
              type="button"
              onClick={() => openItem(n)}
              className={`w-full rounded-xl border px-3 py-2 text-left transition ${n.isRead
                ? 'border-slate-700 bg-slate-900/50 text-slate-400'
                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-50'
                }`}
            >
              <p className={`text-sm ${n.isRead ? 'font-medium' : 'font-semibold'}`}>{n.title}</p>
              <p className={`text-xs mt-0.5 ${n.isRead ? 'opacity-80' : 'opacity-95'}`}>{n.message}</p>
              <p className="text-[11px] opacity-70 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </button>
          ))}
        </div>
      </div>
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>}
    </div>
  );
};

export default NotificationCenterPage;
