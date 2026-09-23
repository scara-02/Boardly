import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on load
    const storedUser = localStorage.getItem('user');
    const storedTenant = localStorage.getItem('tenant');
    const token = localStorage.getItem('accessToken');

    if (storedUser && storedTenant && token) {
      setUser(JSON.parse(storedUser));
      setTenant(JSON.parse(storedTenant));
    }
    
    // Listen for unauthorized events to clear state
    const handleUnauthorized = () => {
      logout();
    };
    
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    setLoading(false);
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    
    const { user: userData, tenant: tenantData, accessToken, refreshToken } = res.data.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenant', JSON.stringify(tenantData));
    
    setUser(userData);
    setTenant(tenantData);
  };

  const signup = async (tenantName, email, password, name) => {
    const res = await apiClient.post('/auth/signup', { tenantName, email, password, name });
    
    const { user: userData, tenant: tenantData, accessToken, refreshToken } = res.data.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tenant', JSON.stringify(tenantData));
    
    setUser(userData);
    setTenant(tenantData);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setUser(null);
    setTenant(null);
  };

  const value = {
    user,
    tenant,
    isAuthenticated: !!user,
    loading,
    login,
    signup,
    logout
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
