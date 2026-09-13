import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Loader2,
  ShoppingCart,
  Calendar,
  User,
} from 'lucide-react';
import { orderApi } from '../lib/api';
import type { Order } from '../lib/api';

const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status') ?? '';
  const statusFilter = VALID_STATUSES.includes(statusFromUrl as any) ? statusFromUrl : '';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * limit;

      const params: Record<string, any> = {
        limit,
        offset,
      };

      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.order_number = searchQuery;

      const response = await orderApi.getOrders(params);

      setOrders(response?.orders ?? []);
      setTotal(response?.total ?? 0);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to fetch orders'
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

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

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatStatus = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Orders</h1>
        <p className="text-gray-400">
          Manage customer orders and fulfillment
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                const v = e.target.value;
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (v) next.set('status', v);
                  else next.delete('status');
                  return next;
                }, { replace: true });
                setPage(1);
              }}
              className="pl-10 pr-8 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
              aria-label="Filter by order status"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <ShoppingCart className="h-14 w-14 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400">No orders found</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  {['Order', 'Customer', 'Status', 'Items', 'Total', 'Date', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-left text-sm text-gray-300"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-mono text-white">
                      {order.order_number}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-2 items-center">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-white text-sm">
                            {(order.user_name || order.profiles?.full_name) ?? 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(order.user_email || order.profiles?.email) ?? ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-300">
                      {order.order_items?.length ?? 0}
                    </td>

                    <td className="px-6 py-4 text-white font-semibold">
                      ₹{order.total_amount.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-gray-300">
                      <div className="flex gap-2 items-center">
                        <Calendar className="h-4 w-4" />
                        {formatDate(order.created_at)}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/dashboard/orders/${order.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl p-4">
            <span className="text-gray-400 text-sm">
              Page {page} of {totalPages}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}