import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('assetflow_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.me();
        setUser(data.user);
      } catch {
        localStorage.removeItem('assetflow_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const saveSession = (payload) => {
    localStorage.setItem('assetflow_token', payload.token);
    setToken(payload.token);
    setUser(payload.user);
  };

  const logout = () => {
    localStorage.removeItem('assetflow_token');
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, token, loading, saveSession, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);