/**
 * Orders Page
 * Display user's order history
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Calendar, DollarSign, Eye } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { Order } from '../types/api';
import BackButton from '../components/common/BackButton';
import Breadcrumb from '../components/common/Breadcrumb';

export default function Orders() {
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async (signal?: AbortSignal) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await apiService.getOrders({ limit: 50, offset: 0 }, { signal });
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
      }
    } catch (err: any) {
      if (err?.code === 'ABORTED') return;
      const msg = err.response?.data?.message || err.message || 'Failed to load orders';
      setError(msg.includes('column') || msg.includes('does not exist') ? 'Unable to load orders. Please try again later.' : msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    loadOrders(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated]);

  useEffect(() => {
    document.title = 'My Orders | Monster Men 90';
    return () => { document.title = 'Monster Men 90'; };
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="container-custom py-12">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please login to view your orders</p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-colors duration-300"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-custom py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom py-8">
        <Breadcrumb />
        <div className="mb-6">
          <BackButton to="/" label="Back to Home" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">My Orders</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => loadOrders()}
            className="px-4 py-2 bg-primary text-gray-900 font-semibold rounded-lg hover:bg-primary-dark"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <Breadcrumb />
      <div className="mb-6">
        <BackButton to="/" label="Back to Home" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Orders</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">View and track your order history.</p>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
          <p className="text-gray-600 mb-6">Start shopping to see your orders here!</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-colors duration-300"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-medium transition-shadow duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.order_number}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-gray-900">
                        ₹{order.total_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>{order.order_items?.length || 0} items</span>
                    </div>
                  </div>
                </div>
                <Link
                  to={`/orders/${order.id}`}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
