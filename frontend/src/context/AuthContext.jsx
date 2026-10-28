import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const initialCheckPerformed = useRef(false);

  /**
   * Restores authenticated session on initial application load.
   * Calls GET /api/auth/me with HTTP-only cookie credentials.
   */
  const checkAuth = useCallback(async () => {
    try {
      setAuthError(null);
      const data = await getCurrentUser();
      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      // 401 means visitor is simply unauthenticated
      if (err.status === 401) {
        setUser(null);
      } else if (err.isNetworkError) {
        // Backend service is unreachable; log gracefully without crashing the UI
        setUser(null);
        setAuthError(err.message);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCheckPerformed.current) {
      initialCheckPerformed.current = true;
      checkAuth();
    }
  }, [checkAuth]);

  /**
   * Log in existing student.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} Authenticated user object
   */
  const login = async (email, password) => {
    setAuthError(null);
    const data = await loginUser({ email, password });
    if (data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error('Authentication succeeded but user payload was missing.');
  };

  /**
   * Register a new student profile.
   *
   * @param {string} name
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} Created user object
   */
  const register = async (name, email, password) => {
    setAuthError(null);
    const data = await registerUser({ name, email, password });
    if (data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error('Registration succeeded but user payload was missing.');
  };

  /**
   * Invalidate session and clear HTTP-only cookie.
   */
  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setAuthError(null);
    }
  };

  const value = {
    user,
    loading,
    authError,
    login,
    register,
    logout,
    checkAuth,
    isAuthenticated: Boolean(user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to consume the SkillSync authentication context.
 *
 * @returns {{
 *   user: { id: string, name: string, email: string, createdAt: string } | null,
 *   loading: boolean,
 *   authError: string | null,
 *   login: (email: string, password: string) => Promise<object>,
 *   register: (name: string, email: string, password: string) => Promise<object>,
 *   logout: () => Promise<void>,
 *   checkAuth: () => Promise<void>,
 *   isAuthenticated: boolean
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

