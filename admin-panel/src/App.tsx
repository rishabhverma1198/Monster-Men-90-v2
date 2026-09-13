import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { useAuthStore } from './store/authStore';
import { AdminRoute } from './components/AdminRoute';
import Layout from './components/Layout';
import { Toaster } from './components/common/Toaster';
import { Loader2 } from 'lucide-react';

// Lazy load pages for code splitting - reduces initial bundle size
const Login = lazy(() => import('./pages/Login'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Products = lazy(() => import('./pages/Products'));
const ProductsCreate = lazy(() => import('./pages/ProductsCreate'));
const ProductsEdit = lazy(() => import('./pages/ProductsEdit'));
const Users = lazy(() => import('./pages/Users'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetails = lazy(() => import('./pages/OrderDetails'));
const Leads = lazy(() => import('./pages/Leads'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      <p className="text-gray-400">Loading...</p>
    </div>
  </div>
);

function App() {
  const { checkAuth, clearAuthState, isAuthenticated, isLoading } = useAuthStore();
  const hasToken = Boolean(localStorage.getItem('auth_token'));

  // Keep Zustand auth state and token storage in sync.
  useEffect(() => {
    if (!hasToken && isAuthenticated) {
      clearAuthState();
      return;
    }
    if (hasToken && !isAuthenticated) {
      checkAuth();
    }
  }, [checkAuth, clearAuthState, hasToken, isAuthenticated]);

  // Handle auth reset triggered from API interceptor (401/refresh failure).
  useEffect(() => {
    const handleSessionCleared = () => clearAuthState();
    window.addEventListener('auth:session-cleared', handleSessionCleared);
    return () => window.removeEventListener('auth:session-cleared', handleSessionCleared);
  }, [clearAuthState]);

  // Show loading state while checking auth
  if (isLoading && hasToken) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <Toaster />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={isAuthenticated && hasToken ? <Navigate to="/dashboard" replace /> : <Login />}
            />

            {/* Protected Admin Routes - All require admin role */}
            <Route
              path="/dashboard"
              element={
                <AdminRoute>
                  <Layout />
                </AdminRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="products" element={<Products />} />
              <Route path="products/create" element={<ProductsCreate />} />
              <Route path="products/:id/edit" element={<ProductsEdit />} />
              <Route path="users" element={<Users />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetails />} />
              <Route path="leads" element={<Leads />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
