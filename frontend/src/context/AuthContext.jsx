import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token,             setToken]             = useState(localStorage.getItem('token') || null);
  const [user,              setUser]              = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  const [apiBaseUrl]  = useState(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5004');

  useEffect(() => {
    if (token) fetchUserProfile();
    else setLoading(false);
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      // Decode role from JWT (no signature check needed — server validates on every request)
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const role    = decoded.role;

      // ── Supervisor OR Superuser → hit supervisor endpoints ──────────────
      if (role === 'supervisor' || role === 'superuser') {
        const profileRes = await fetch(`${apiBaseUrl}/api/supervisor/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUser({
            id:                  decoded.user_id,
            role,
            name:                profileData.name                || (role === 'superuser' ? 'System Admin' : 'SIWES Supervisor'),
            email:               profileData.email_address       || '',
            industry_department: profileData.industry_department || '',
          });
        } else if (profileRes.status === 401) {
          logout();
          return;
        } else {
          // Profile endpoint failed (maybe network issue) but token is valid — keep user logged in
          // using decoded token data as fallback so we don't kick them out unnecessarily
          setUser({
            id:   decoded.user_id,
            role,
            name: role === 'superuser' ? 'System Admin' : 'SIWES Supervisor',
          });
        }

      // ── Intern ──────────────────────────────────────────────────────────
      } else {
        const dashRes = await fetch(`${apiBaseUrl}/api/intern/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (dashRes.ok) {
          const dashData = await dashRes.json();
          const internRes = await fetch(`${apiBaseUrl}/api/supervisor/interns`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          // Try to get intern_id from interns list or decode from token
          setUser({
            id:   decoded.user_id,
            role: 'intern',
            name: dashData.profile?.name || '',
          });
          // Check if default password
          setIsDefaultPassword(false); // will be set correctly after login
        } else if (dashRes.status === 401) {
          logout();
          return;
        } else {
          // Fallback — don't kick out, just use decoded data
          setUser({ id: decoded.user_id, role: 'intern', name: '' });
        }
      }

    } catch (err) {
      console.error('fetchUserProfile error:', err);
      // Network error (e.g. no internet) — don't log out, just keep the existing token
      // Try to decode name from token as fallback
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: decoded.user_id, role: decoded.role, name: '' });
      } catch {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Login failed');

    localStorage.setItem('token', data.token);
    // Set user immediately from login response so there's no flash
    setUser(data.user);
    setIsDefaultPassword(data.is_default_password || false);
    // Setting token triggers useEffect → fetchUserProfile (which updates name from profile)
    setToken(data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsDefaultPassword(false);
  };

  const authenticatedFetch = async (endpoint, options = {}) => {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type':  'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please login again.');
    }
    return response;
  };

  return (
    <AuthContext.Provider value={{
      token, user, setUser, loading,
      isDefaultPassword, setIsDefaultPassword,
      apiBaseUrl, login, logout, authenticatedFetch,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
