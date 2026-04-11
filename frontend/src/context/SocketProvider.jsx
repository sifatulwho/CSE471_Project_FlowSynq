import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE } from '../config';
import { SocketContext } from './SocketContext';

const SOCKET_BASE = API_BASE.replace(/\/api\/?$/, '');

export const SocketProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('flowsynqToken'));

  useEffect(() => {
    const sync = () => setToken(localStorage.getItem('flowsynqToken'));
    window.addEventListener('storage', sync);
    window.addEventListener('flowsynq-auth-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('flowsynq-auth-change', sync);
    };
  }, []);

  const socket = useMemo(
    () =>
      io(SOCKET_BASE, {
        transports: ['websocket'],
        auth: { token: token || undefined },
      }),
    [token]
  );

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const value = useMemo(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
