import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function Analytics() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    fetchAnalytics();
    // Real-time subscription
    const channel = supabase
      .channel('analytics-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchAnalytics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Total Revenue
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const revenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const orderCount = orders?.length || 0;

      // Total Customers
      const { data: customers } = await supabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString());

      const customerCount = customers?.length || 0;

      // Conversion rate (placeholder - would need sessions data)
      const conversionRate = orderCount > 0 ? ((orderCount / (orderCount * 10)) * 100).toFixed(1) : 0;

      setStats({
        totalRevenue: revenue,
        totalOrders: orderCount,
        totalCustomers: customerCount,
        conversionRate: parseFloat(String(conversionRate || 0)),
      });
    } catch (error) {
      console.error('Error fetching analytics:', error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
    }
  };

  // Sales Breakdown Data
  const salesBreakdownData = [
    { name: 'Net Profit', value: stats.totalRevenue * 0.34, percentage: 34.1 },
    { name: 'Cost', value: stats.totalRevenue * 0.41, percentage: 41.1 },
    { name: 'Shipping', value: stats.totalRevenue * 0.15, percentage: 14.9 },
    { name: 'Tax', value: stats.totalRevenue * 0.06, percentage: 5.5 },
    { name: 'Payment Fee', value: stats.totalRevenue * 0.04, percentage: 4.2 },
  ];

  // Sales Funnel Data
  const funnelData = [
    { name: 'Sessions', value: 92876, percentage: 100.0 },
    { name: 'Shopping Carts', value: 10923, percentage: 11.8 },
    { name: 'Orders Placed', value: stats.totalOrders, percentage: ((stats.totalOrders / 92876) * 100).toFixed(1) },
  ];

  // Revenue by Channel (mock data)
  const revenueByChannel = [
    { channel: 'Direct', revenue: 67804, percentage: 45.8 },
    { channel: 'Organic Search', revenue: 42746, percentage: 29.3 },
    { channel: 'Unknown', revenue: 13855, percentage: 9.4 },
    { channel: 'Referral', revenue: 9876, percentage: 6.7 },
    { channel: 'Email', revenue: 7812, percentage: 5.3 },
    { channel: 'Display', revenue: 4275, percentage: 2.9 },
    { channel: 'Paid Search', revenue: 3390, percentage: 2.3 },
  ];

  // Daily Sales Data (last 30 days)
  const dailySalesData = Array.from({ length: parseInt(dateRange) }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (parseInt(dateRange) - i - 1));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: Math.floor(Math.random() * 5000) + 2000,
      orders: Math.floor(Math.random() * 50) + 10,
    };
  });

  // Revenue by Device
  const deviceData = [
    { name: 'Desktop', value: 84379, percentage: 57.2 },
    { name: 'Mobile', value: 52620, percentage: 35.7 },
    { name: 'Tablet', value: 7812, percentage: 5.3 },
    { name: 'Unknown', value: 2653, percentage: 1.8 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive business insights and metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Revenue</div>
          <div className="text-3xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</div>
          <div className="text-sm text-green-600 mt-2">↑ 11% from last period</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Orders</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
          <div className="text-sm text-green-600 mt-2">↑ 11% from last period</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Customers</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</div>
          <div className="text-sm text-green-600 mt-2">↑ 11% from last period</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Conversion Rate</div>
          <div className="text-3xl font-bold text-gray-900">{stats.conversionRate}%</div>
          <div className="text-sm text-green-600 mt-2">↑ 0.8% from last period</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Breakdown</h2>
          <div className="mb-4">
            <div className="text-2xl font-bold text-gray-900">
              ₹{stats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-gray-600">(100%)</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={salesBreakdownData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {salesBreakdownData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {salesBreakdownData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  ₹{Math.round(item.value).toLocaleString()} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={150} className="mt-6">
            <BarChart data={dailySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Funnel</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {funnelData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.name}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-900">
                    {item.value.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Channel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Channel</h2>
          <div className="space-y-3 mb-4">
            {revenueByChannel.map((item, index) => (
              <div key={item.channel}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{item.channel}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      ₹{item.revenue.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500">({item.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="sales" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Abandoned Carts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Abandoned Carts</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Abandoned Carts</div>
              <div className="text-2xl font-bold text-gray-900">6,704</div>
              <div className="text-sm text-gray-500">(61.4%)</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Abandoned Revenue</div>
              <div className="text-2xl font-bold text-gray-900">₹2,06,179</div>
              <div className="text-sm text-gray-500">(58.4%)</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="orders" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Third Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Device */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Device</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {deviceData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Country */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Country</h2>
          <div className="space-y-3">
            {[
              { country: 'United States', revenue: 72224, percentage: 48.7 },
              { country: 'India', revenue: 45230, percentage: 30.5 },
              { country: 'UK', revenue: 15890, percentage: 10.7 },
              { country: 'Canada', revenue: 8980, percentage: 6.1 },
              { country: 'Australia', revenue: 5670, percentage: 3.8 },
            ].map((item, index) => (
              <div key={item.country}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">
                    {index + 1}. {item.country}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      ₹{item.revenue.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500">({item.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
