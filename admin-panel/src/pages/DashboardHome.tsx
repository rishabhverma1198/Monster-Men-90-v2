import { useState, useEffect } from 'react';
import type { AxiosError } from 'axios';
import { LayoutDashboard, Package, ShoppingCart, Users, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient, { type ApiErrorResponse } from '../lib/api';
import SkeletonLoader from '../components/common/SkeletonLoader';

/**
 * Dashboard Home Page
 * 
 * Real-time dashboard with live statistics
 */
export default function DashboardHome() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    revenue: 0,
    activeUsers: 0,
    pendingOrders: 0,
    newOrdersToday: 0,
    completedOrdersToday: 0,
    leadsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    if (!localStorage.getItem('auth_token')) {
      setLoading(false);
      setError('Session expired. Please login again.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/admin/stats');
      const data = response.data.data;
      setStats({
        totalProducts: data.totalProducts || 0,
        totalOrders: data.totalOrders || 0,
        totalUsers: data.totalUsers || 0,
        revenue: data.revenue || 0,
        activeUsers: data.activeUsers || 0,
        pendingOrders: data.pendingOrders || 0,
        newOrdersToday: data.newOrdersToday || 0,
        completedOrdersToday: data.completedOrdersToday || 0,
        leadsCount: data.leadsCount || 0,
      });
    } catch (err) {
      setError((err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to load dashboard stats');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: 'Total Products',
      value: loading ? '...' : stats.totalProducts.toLocaleString(),
      icon: Package,
      color: 'from-blue-500 to-cyan-500',
      href: '/dashboard/products',
    },
    {
      name: 'Total Orders',
      value: loading ? '...' : stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'from-purple-500 to-pink-500',
      href: '/dashboard/orders',
    },
    {
      name: 'Total Users',
      value: loading ? '...' : stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      href: '/dashboard/users',
    },
    {
      name: 'Revenue',
      value: loading ? '...' : `₹${stats.revenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-yellow-500 to-orange-500',
      href: '/dashboard/analytics',
    },
  ];

  const quickActions = [
    {
      title: 'Add New Product',
      description: 'Create a new product listing',
      icon: Package,
      href: '/dashboard/products/create',
      color: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50',
    },
    {
      title: 'View Orders',
      description: 'Manage customer orders',
      icon: ShoppingCart,
      href: '/dashboard/orders',
      color: 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50',
    },
    {
      title: 'Manage Users',
      description: 'View and manage users',
      icon: Users,
      href: '/dashboard/users',
      color: 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50',
    },
    {
      title: 'View Analytics',
      description: 'Check sales and performance',
      icon: TrendingUp,
      href: '/dashboard/analytics',
      color: 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here's an overview of your store.</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.href}
              className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                {loading ? (
                  <SkeletonLoader variant="rectangular" width={60} height={32} />
                ) : (
                  <span className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
                    {stat.value}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-400">{stat.name}</h3>
              <p className="text-xs text-gray-500 mt-1">Click to view details</p>
            </Link>
          );
        })}
      </div>

      {/* Additional Stats */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <Link
            to="/dashboard/orders?status=pending"
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Pending Orders</h3>
                <p className="text-3xl font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                  {stats.pendingOrders.toLocaleString()}
                </p>
              </div>
              <Clock className="h-12 w-12 text-amber-400/50" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Click to view pending</p>
          </Link>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">New Orders (Today)</h3>
                <p className="text-3xl font-bold text-blue-400">{stats.newOrdersToday.toLocaleString()}</p>
              </div>
              <ShoppingCart className="h-12 w-12 text-blue-400/50" />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Completed (Today)</h3>
                <p className="text-3xl font-bold text-green-400">{stats.completedOrdersToday.toLocaleString()}</p>
              </div>
              <ShoppingCart className="h-12 w-12 text-green-400/50" />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Active Users</h3>
                <p className="text-3xl font-bold text-purple-400">{stats.activeUsers.toLocaleString()}</p>
              </div>
              <Users className="h-12 w-12 text-purple-400/50" />
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Leads Count</h3>
                <p className="text-3xl font-bold text-pink-400">{stats.leadsCount.toLocaleString()}</p>
              </div>
              <Users className="h-12 w-12 text-pink-400/50" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.href}
                className={`p-6 rounded-xl border ${action.color} transition-all cursor-pointer group`}
              >
                <Icon className="h-8 w-8 text-white mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-white mb-1">{action.title}</h3>
                <p className="text-sm text-gray-300">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Empty State Message */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-12 text-center">
        <LayoutDashboard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Dashboard Ready</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Your admin dashboard is set up and ready. Stats and data will appear here once you start
          adding products and receiving orders.
        </p>
        <div className="mt-6 flex justify-center space-x-4">
          <Link
            to="/dashboard/products/create"
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Add Your First Product
          </Link>
        </div>
      </div>
    </div>
  );
}
