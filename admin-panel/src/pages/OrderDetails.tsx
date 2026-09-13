import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Package, Loader2, CheckCircle2, XCircle, Truck, PackageCheck } from 'lucide-react';
import { orderApi } from '../lib/api';
import type { Order } from '../lib/api';
import ShippingSection from '../components/features/ShippingSection';

/**
 * Order Details Page
 * 
 * Shows complete order information including customer details,
 * order items, and allows status updates
 */
export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const orderData = await orderApi.getOrderById(id!);
      setOrder(orderData);
      setNewStatus(orderData.status);
      setNotes(orderData.notes || '');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!order || !newStatus || newStatus === order.status) {
      setShowStatusModal(false);
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const updatedOrder = await orderApi.updateOrderStatus(id!, {
        status: newStatus,
        notes: notes.trim() || undefined,
      });
      setOrder(updatedOrder);
      setNewStatus(updatedOrder.status);
      setNotes(updatedOrder.notes || '');
      setShowStatusModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <XCircle className="h-5 w-5 text-yellow-400" />;
      case 'confirmed':
        return <CheckCircle2 className="h-5 w-5 text-blue-400" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-400" />;
      case 'delivered':
        return <PackageCheck className="h-5 w-5 text-green-400" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Package className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'shipped':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      case 'delivered':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'cancelled':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="space-y-6">
        <Link
          to="/dashboard/orders"
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Orders</span>
        </Link>
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard/orders"
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Order Details</h1>
            <p className="text-gray-400">Order #{order.order_number}</p>
          </div>
        </div>
        <button
          onClick={() => setShowStatusModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
        >
          Update Status
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Order Items</span>
            </h2>
            <div className="space-y-4">
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-4 p-4 bg-gray-900/50 rounded-lg"
                  >
                    {item.products?.image_url ? (
                      <img
                        src={item.products.image_url}
                        alt={item.products.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{item.products?.title || 'Unknown Product'}</h3>
                      <p className="text-sm text-gray-400">
                        Quantity: {item.quantity} × ₹{(item.unit_price || item.price_at_purchase || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        ₹{(item.quantity * (item.unit_price || item.price_at_purchase || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">No items found</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Amount</span>
                <span className="text-xl font-bold text-white">₹{order.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Items</span>
                <span className="text-white">
                  {order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Item Count</span>
                <span className="text-white">{order.order_items?.length || 0}</span>
              </div>
              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center space-x-2 text-gray-400 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Created</span>
                </div>
                <p className="text-white">{formatDate(order.created_at)}</p>
                {order.updated_at && (
                  <>
                    <div className="flex items-center space-x-2 text-gray-400 mt-4 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Updated</span>
                    </div>
                    <p className="text-white">{formatDate(order.updated_at)}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Customer Information</span>
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Name</p>
                <p className="text-white font-medium">{order.user_name || order.profiles?.full_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{order.user_email || order.profiles?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Phone</p>
                <p className="text-white">{order.user_phone || 'N/A'}</p>
              </div>
              {order.user_type && (
                <div>
                  <p className="text-sm text-gray-400">User Type</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                    order.user_type === 'wholeseller'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                      : 'bg-green-500/20 text-green-300 border-green-500/50'
                  }`}>
                    {order.user_type === 'wholeseller' ? 'Wholeseller' : 'Single Buyer'}
                  </span>
                </div>
              )}
              {order.shipping_address && (
                <div>
                  <p className="text-sm text-gray-400">Shipping Address</p>
                  <p className="text-white text-sm">{order.shipping_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setNewStatus('confirmed');
                  setShowStatusModal(true);
                }}
                disabled={order.status === 'confirmed' || order.status === 'delivered' || order.status === 'cancelled'}
                className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                ✓ Mark as Contacted
              </button>
              <button
                onClick={() => {
                  setNewStatus('delivered');
                  setShowStatusModal(true);
                }}
                disabled={order.status === 'delivered' || order.status === 'cancelled'}
                className="w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                ✓ Mark as Completed
              </button>
              <button
                onClick={() => {
                  setNewStatus('cancelled');
                  setShowStatusModal(true);
                }}
                disabled={order.status === 'cancelled' || order.status === 'delivered'}
                className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                ✗ Cancel Order
              </button>
            </div>
          </div>

          {/* Shipping Section */}
          <ShippingSection order={order} onShipmentCreated={fetchOrder} />

          {/* Notes */}
          {order.notes && (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Notes</h2>
              <p className="text-gray-300">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Update Order Status</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="new-status-select" className="block text-sm font-semibold text-gray-300 mb-2">
                  New Status <span className="text-red-400">*</span>
                </label>
                <select
                  id="new-status-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Notes <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Add notes about this status change..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 mt-6 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus(order.status);
                  setNotes(order.notes || '');
                }}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === order.status}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Status</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
