import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

/**
 * Protected Route Component
 * 
 * Protects routes that require authentication
 * Optionally requires admin role
 */
export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading, checkAuth, clearAuthState } = useAuthStore();
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem('auth_token'));

  useEffect(() => {
    // Repair stale persisted state.
    if (!hasToken && isAuthenticated) {
      clearAuthState();
      return;
    }
    // Check auth status when token exists but store is not authenticated yet.
    if (!isAuthenticated && hasToken && !isLoading) {
      checkAuth();
    }
  }, [hasToken, isAuthenticated, isLoading, checkAuth, clearAuthState]);

  // Show loading state while checking auth
  if (isLoading && hasToken) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin role if required
  if (requireAdmin && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-300">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
