/**
 * Order Detail Page
 * Display single order details
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { Order } from '../types/api';
import BackButton from '../components/common/BackButton';
import Breadcrumb from '../components/common/Breadcrumb';

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!orderId) {
      navigate('/orders');
      return;
    }
    const controller = new AbortController();
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getOrderById(orderId, { signal: controller.signal });
        if (response.success && response.data) {
          setOrder(response.data);
        } else {
          setError('Order not found');
        }
      } catch (err: any) {
        if (err?.code !== 'ABORTED') setError(err.message || 'Failed to load order');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
    return () => controller.abort();
  }, [orderId, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="container-custom py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-custom py-8">
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Orders', path: '/orders' }]} />
        <div className="mb-6">
          <BackButton to="/orders" label="Back to Orders" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Order Details</h1>
        <div className="text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Order not found'}</p>
          <Link
            to="/orders"
            className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-colors duration-300"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Home', path: '/' },
    { label: 'Orders', path: '/orders' },
    { label: `Order #${order.order_number}`, path: `/orders/${order.id}` },
  ];

  return (
    <div className="container-custom py-8">
      <Breadcrumb items={breadcrumbItems} />
      <div className="mb-6">
        <BackButton to="/orders" label="Back to Orders" />
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Order #{order.order_number}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  Placed on{' '}
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
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

        {/* Order Items */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.order_items?.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <img
                  src={item.products?.image_url || '/placeholder-product.jpg'}
                  alt={item.products?.title || 'Product'}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.products?.title}</h3>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    ₹{item.price_at_purchase.toLocaleString('en-IN')} × {item.quantity} = ₹
                    {(item.price_at_purchase * item.quantity).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">
              ₹{order.total_amount.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Shipping</span>
            <span className="font-medium text-gray-900">Free</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">
              ₹{order.total_amount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
