import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, ApiError } from '@/api';
import type { Admin, LoginResult, TokenPair } from '@/api/types';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthValue = {
  status: Status;
  admin: Admin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  /** Set when the server could not be reached while restoring the session. */
  offline: boolean;
  retryRestore: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [offline, setOffline] = useState(false);

  const restore = useCallback(async () => {
    setStatus('loading');
    setOffline(false);
    const outcome = await api.refresh();
    if (outcome === 'ok') {
      try {
        setAdmin(await api.request<Admin>('/v1/auth/me'));
        setStatus('signedIn');
        return;
      } catch (e) {
        if (e instanceof ApiError && e.isNetwork) {
          setOffline(true);
          setStatus('signedOut');
          return;
        }
      }
    } else if (outcome === 'network') {
      setOffline(true);
    }
    setAdmin(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    api.setSessionExpiredHandler(() => {
      setAdmin(null);
      setStatus('signedOut');
    });
    restore();
    return () => api.setSessionExpiredHandler(null);
  }, [restore]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.request<LoginResult>('/v1/auth/login', {
      method: 'POST',
      body: { email: email.trim(), password },
      auth: false,
    });
    await api.setTokens(res.tokens);
    setAdmin(res.admin);
    setStatus('signedIn');
  }, []);

  const logout = useCallback(async () => {
    try {
      const rt = await api.getRefreshToken();
      if (rt) await api.request('/v1/auth/logout', { method: 'POST', body: { refresh_token: rt }, auth: false });
    } catch {
      // Signing out locally is what matters; the server session expires on its own.
    }
    await api.clearSession();
    setAdmin(null);
    setStatus('signedOut');
  }, []);

  const changePassword = useCallback(async (current: string, next: string) => {
    const pair = await api.request<TokenPair>('/v1/auth/change-password', {
      method: 'POST',
      body: { current_password: current, new_password: next },
    });
    await api.setTokens(pair);
    setAdmin((a) => (a ? { ...a, must_change_password: false } : a));
  }, []);

  const value = useMemo(
    () => ({ status, admin, login, logout, changePassword, offline, retryRestore: restore }),
    [status, admin, login, logout, changePassword, offline, restore],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
