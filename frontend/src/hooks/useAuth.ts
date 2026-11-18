import { useState, useEffect } from 'react';
import type { User } from '../types';
import { auth as authApi } from '../services/api';

export function useAuth() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('strataforge_auth_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Fetch current user when token changes
  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      return;
    }
    authApi
      .getMe(token)
      .then((user) => setCurrentUser(user))
      .catch(() => {
        setToken(null);
        localStorage.removeItem('strataforge_auth_token');
      });
  }, [token]);

  const login = async (email: string, password: string): Promise<void> => {
    const data = await authApi.login(email, password);
    localStorage.setItem('strataforge_auth_token', data.access_token);
    setToken(data.access_token);
    setCurrentUser(data.user);
  };

  const register = async (email: string, password: string, full_name: string): Promise<void> => {
    const data = await authApi.register(email, password, full_name);
    localStorage.setItem('strataforge_auth_token', data.access_token);
    setToken(data.access_token);
    setCurrentUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('strataforge_auth_token');
    setToken(null);
    setCurrentUser(null);
  };

  return { token, currentUser, login, logout, register };
}
