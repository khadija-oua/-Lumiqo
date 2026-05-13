import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const client = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

// Token storage helpers (the AuthContext mirrors these so a hard reload still
// finds the token; the axios interceptor reads from here on every request).
const TOKEN_KEY = 'lumiqo:token';
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Subscribers receive {status, code} on any 401/403/429 from the backend.
const listeners = new Set();
export function onApiError(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const code = err.response?.data?.error?.code;
    if (status === 401) setStoredToken(null);
    listeners.forEach((fn) => fn({ status, code, error: err }));
    return Promise.reject(err);
  },
);

// Returns the backend's French error.message when present, else a generic
// fallback. Use in catch blocks and toasts.
export function apiMessage(err, fallback = 'Une erreur est survenue.') {
  return err?.response?.data?.error?.message || err?.message || fallback;
}

export default client;
