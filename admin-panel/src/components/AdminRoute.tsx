import type { ReactNode } from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../store/authStore';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Admin Route Component
 * 
 * Wrapper around ProtectedRoute that specifically requires admin role
 * All admin dashboard routes should use this component
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAuthenticated } = useAuthStore();
  const hasToken = Boolean(localStorage.getItem('auth_token'));

  // If not authenticated, ProtectedRoute will handle redirect
  if (!isAuthenticated || !hasToken) {
    return <ProtectedRoute requireAdmin>{children}</ProtectedRoute>;
  }

  // Check admin role
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white/5 backdrop-blur-lg border border-red-500/20 rounded-xl">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-2">
            You do not have permission to access the admin dashboard.
          </p>
          <p className="text-sm text-gray-400">
            Required role: <span className="font-semibold text-white">admin</span>
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Your role: <span className="font-semibold text-white capitalize">{user?.role}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
