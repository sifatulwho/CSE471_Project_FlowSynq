const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');
export const API_BASE = `${rawApiUrl}/api`;
