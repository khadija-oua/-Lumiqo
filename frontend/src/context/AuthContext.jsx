import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getStoredToken, setStoredToken, onApiError } from '../api/client';
import * as authApi from '../api/auth';
import toast from 'react-hot-toast';
import t from '../i18n/fr';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken());
  // 'pending' = checking token on boot; 'ready' = done.
  const [status, setStatus] = useState(token ? 'pending' : 'ready');

  const signOut = useCallback((reason) => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    if (reason === 'expired') toast.error(t.errors.sessionExpired);
  }, []);

  const signIn = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signUp = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Validate the stored token on app load.
  useEffect(() => {
    if (!token) {
      setStatus('ready');
      return;
    }
    let cancelled = false;
    authApi
      .me()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStoredToken(null);
          setToken(null);
          setUser(null);
          setStatus('ready');
        }
      });
    return () => {
      cancelled = true;
    };
    // Only run on mount or when the token changes externally (login/logout).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for any 401 from the API client and force sign-out.
  useEffect(() => {
    return onApiError(({ status: s, code }) => {
      if (s === 401 && token) {
        signOut(code === 'TOKEN_EXPIRED' ? 'expired' : 'silent');
      }
    });
  }, [token, signOut]);

  return (
    <AuthContext.Provider value={{ user, token, status, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
