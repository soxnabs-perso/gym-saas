import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { setAccessToken } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const refreshRes = await api.post('/auth/refresh');
        setAccessToken(refreshRes.data.accessToken);
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.user);
      } catch (_err) {
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  const login = useCallback(async (email, password, rememberMe) => {
    const res = await api.post('/auth/login', { email, password, rememberMe });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }, []);

  const signup = useCallback(async (payload) => {
    const res = await api.post('/auth/signup', payload);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
