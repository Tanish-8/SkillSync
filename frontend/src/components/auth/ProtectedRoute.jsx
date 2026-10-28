import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Route guard for protected views (e.g. /dashboard).
 * Prevents unauthorized access and handles session restoration loading state.
 */
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. Wait for session check to complete before deciding to redirect
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center p-6 text-text-main">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-text-muted font-sans tracking-wide">
            Restoring authenticated session...
          </p>
        </div>
      </div>
    );
  }

  // 2. Redirect unauthenticated visitors to sign in
  if (!user) {
    return <Navigate to="/auth?mode=signin" state={{ from: location }} replace />;
  }

  // 3. Render protected content
  return children;
}

export default ProtectedRoute;

