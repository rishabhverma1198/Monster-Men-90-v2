/**
 * Order Success Page
 * Shows order confirmation with admin contact details
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CheckCircle, Phone, Mail, Home, MessageCircle, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Order } from '../types/api';
import Breadcrumb from '../components/common/Breadcrumb';

export default function OrderSuccess() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get order details from location state or fetch from API
  const orderNumber = (location.state as any)?.orderNumber;
  const customerName = (location.state as any)?.customerName;
  const contactNumber = (location.state as any)?.contactNumber;

  // Admin contact details (can be from env or hardcoded for now)
  const adminName = import.meta.env.VITE_ADMIN_NAME || "Admin";
  const adminPhone = import.meta.env.VITE_ADMIN_PHONE || "+91XXXXXXXXXX";
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "admin@monstermen90.com";

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) {
        setError('Order ID is missing');
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiService.getOrderById(id);
        if (response.success && response.data) {
          setOrder(response.data);
        } else {
          setError('Order not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

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
      <div className="container-custom py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Order Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'Unable to load order details'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayOrderNumber = orderNumber || order.order_number || 'N/A';

  return (
    <div className="container-custom py-12">
      <Breadcrumb />
      <div className="max-w-2xl mx-auto">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your order has been received and is being processed.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Order Details
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Order ID:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {displayOrderNumber}
              </span>
            </div>
            {customerName && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {customerName}
                </span>
              </div>
            )}
            {contactNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Contact:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {contactNumber}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                ₹{order.total_amount?.toLocaleString('en-IN') || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-semibold">
                {order.status || 'Pending'}
              </span>
            </div>
            {order.shipping_awb && (
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">AWB Number:</span>
                <Link
                  to={`/track?awb=${order.shipping_awb}`}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                >
                  <span>{order.shipping_awb}</span>
                  <Package className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tracking Card */}
        {order.shipping_awb && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Track Your Order</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your order has been shipped! Track your shipment using the AWB number.
            </p>
            <Link
              to={`/track?awb=${order.shipping_awb}`}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              <Package className="w-5 h-5" />
              <span>Track Shipment</span>
            </Link>
          </div>
        )}

        {/* Admin Contact Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Contact Admin
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Please contact the admin for order confirmation and further details.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                <a
                  href={`tel:${adminPhone}`}
                  className="font-semibold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors"
                >
                  {adminPhone}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <a
                  href={`mailto:${adminEmail}`}
                  className="font-semibold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors"
                >
                  {adminEmail}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</p>
                <a
                  href={`https://wa.me/${adminPhone.replace(/[^0-9]/g, '')}?text=Hi ${adminName}, I have placed an order. Order ID: ${displayOrderNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors"
                >
                  Message on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
          <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">
            Your order has been placed successfully.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Order ID: <span className="font-semibold">{displayOrderNumber}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Please contact admin for confirmation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            View All Orders
          </button>
        </div>
      </div>
    </div>
  );
}
