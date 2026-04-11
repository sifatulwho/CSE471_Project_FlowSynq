import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSocket } from '../context/useSocket';

const formatWhen = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const GlobalAlertListener = () => {
  const socketContext = useSocket();
  const socket = socketContext?.socket;

  useEffect(() => {
    if (!socket) return;

    const onEmergencyAlert = (alert) => {
      const title = alert?.title || 'Emergency Alert';
      const location = alert?.location || 'Location not specified';
      const when = formatWhen(alert?.incidentTime || alert?.timestamp);
      const body = alert?.message || '';
      const by = alert?.triggeredBy ? `${alert.triggeredBy}${alert?.triggeredByRole ? ` (${alert.triggeredByRole})` : ''}` : '';

      toast.custom(
        (t) => (
          <div
            className={`max-w-md rounded-xl border border-rose-500/40 bg-slate-900/95 px-4 py-3 text-left shadow-2xl backdrop-blur-xl ${t.visible ? 'opacity-100' : 'opacity-0'}`}
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-rose-300">
              Port emergency · {alert?.severity || 'critical'}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{title}</p>
            <p className="mt-2 text-xs text-slate-300">
              <span className="text-slate-500">Where:</span> {location}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              <span className="text-slate-500">When:</span> {when}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">{body}</p>
            {by && <p className="mt-2 text-xs text-slate-500">Reported by {by}</p>}
          </div>
        ),
        {
          duration: 12000,
          id: alert?.id ? String(alert.id) : `emergency-${alert?.timestamp || Date.now()}`,
        }
      );
    };

    const onNewRecommendation = (alert) => {
      toast.custom(
        (t) => (
          <div className={`max-w-md rounded-xl border border-cyan-500/40 bg-slate-900/95 px-4 py-3 text-left shadow-2xl backdrop-blur-xl ${t.visible ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-cyan-300">
              New Recommendation
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{alert?.title || 'Import Recommendation'}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">{alert?.message}</p>
          </div>
        ),
        {
          duration: 12000,
          id: alert?.id ? String(alert.id) : `rec-${Date.now()}`,
        }
      );
    };

    socket.on('emergency_alert', onEmergencyAlert);
    socket.on('new_recommendation', onNewRecommendation);
    socket.on('app_notification', (n) => {
      toast.custom(
        (t) => (
          <div className={`max-w-md rounded-xl border border-cyan-500/40 bg-slate-900/95 px-4 py-3 text-left shadow-2xl backdrop-blur-xl ${t.visible ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-cyan-300">Notification</p>
            <p className="mt-1 text-sm font-semibold text-white">{n?.title || 'Update'}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">{n?.message}</p>
          </div>
        ),
        { duration: 8000, id: n?._id ? `app-${n._id}` : `app-${Date.now()}` },
      );
    });
    
    return () => {
      socket.off('emergency_alert', onEmergencyAlert);
      socket.off('new_recommendation', onNewRecommendation);
      socket.off('app_notification');
    };
  }, [socket]);

  return null;
};

export default GlobalAlertListener;
