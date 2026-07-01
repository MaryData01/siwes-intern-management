import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  const [apiBaseUrl] = useState(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');

  useEffect(() => {
    // If we have a token, fetch user profile/verify validity
    if (token) {
      // In a real app we'd fetch profile. We'll decode the token or fetch profile.
      // Let's decode or perform a profile query to check validity.
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      // We can fetch profile based on role
      // But we can also decode or query an endpoint. Let's hit the role-appropriate dashboard endpoint to verify
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const role = decoded.role;
      const endpoint = role === 'supervisor' ? '/api/supervisor/dashboard' : '/api/intern/dashboard';
      
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Set user object from the response
        if (role === 'supervisor') {
          const profileResponse = await fetch(`${apiBaseUrl}/api/supervisor/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setUser({
              id: decoded.sub,
              role: 'supervisor',
              name: profileData.name || 'SIWES Supervisor',
              email: profileData.email_address || 'supervisor@siwes.com'
            });
          } else {
            setUser({
              id: decoded.sub,
              role: 'supervisor',
              name: 'SIWES Supervisor',
              email: 'supervisor@siwes.com'
            });
          }
        } else {
          setUser({
            id: decoded.sub,
            role: 'intern',
            name: data.profile.name,
            matric_number: data.profile.matric_number,
            intern_id: decoded.sub // Wait, sub is user_id, which is fine
          });
        }
      } else {
        // Token invalid or expired
        logout();
      }
    } catch (err) {
      console.error("Failed to fetch profile on load:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsDefaultPassword(data.is_default_password || false);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsDefaultPassword(false);
  };

  const changePassword = async (newPassword) => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${apiBaseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ new_password: newPassword })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to change password');
    }

    setIsDefaultPassword(false);
    return data;
  };

  const authenticatedFetch = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please login again.');
    }

    return response;
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      setUser,
      loading,
      isDefaultPassword,
      apiBaseUrl,
      login,
      logout,
      changePassword,
      authenticatedFetch
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
