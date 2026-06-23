import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDateTime } from '../../lib/utils';
import { ORDER_STATUSES } from '../../lib/constants';
import type { Order, OrderStatus } from '../../types';

interface DashboardStats {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  orderCount: number;
  paidOrderCount: number;
  avgOrderValue: number;
  lowStockCount: number;
  customerCount: number;
  pendingOrders: number;
}

interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalRefunded: 0,
    netRevenue: 0,
    orderCount: 0,
    paidOrderCount: 0,
    avgOrderValue: 0,
    lowStockCount: 0,
    customerCount: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);

  useEffect(() => {
    fetchDashboardData();

    // Failsafe: stop loading after 10 seconds
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch all data in parallel with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const [ordersRes, lowStockRes, customerRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).abortSignal(controller.signal),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('track_inventory', true).lt('stock_quantity', 5).abortSignal(controller.signal),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).abortSignal(controller.signal),
      ]);

      clearTimeout(timeoutId);

      const orders: Order[] = ordersRes.data || [];
      const lowStockCount = lowStockRes.count || 0;
      const customerCount = customerRes.count || 0;

      // Revenue = only orders Stripe actually captured (processing/shipped/delivered)
      // pending = order record created but payment not yet confirmed
      // cancelled = never charged
      const paidOrders = orders.filter((o: Order) =>
        o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered'
      );
      const todayOrders = paidOrders.filter((o: Order) => o.created_at >= todayStart);
      const weekOrders = paidOrders.filter((o: Order) => o.created_at >= weekStart);
      const monthOrders = paidOrders.filter((o: Order) => o.created_at >= monthStart);
      const pendingOrders = orders.filter((o: Order) => o.status === 'pending' || o.status === 'processing');

      const grossRevenue = paidOrders.reduce((sum: number, o: Order) => sum + o.total, 0);
      const totalRefunded = paidOrders.reduce((sum: number, o: Order) => sum + (o.refund_amount || 0), 0);
      const todayRevenue = todayOrders.reduce((sum: number, o: Order) => sum + o.total - (o.refund_amount || 0), 0);
      const weekRevenue = weekOrders.reduce((sum: number, o: Order) => sum + o.total - (o.refund_amount || 0), 0);
      const monthRevenue = monthOrders.reduce((sum: number, o: Order) => sum + o.total - (o.refund_amount || 0), 0);
      const avgOrderValue = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;

      setStats({
        todayRevenue,
        weekRevenue,
        monthRevenue,
        totalRefunded,
        netRevenue: grossRevenue - totalRefunded,
        orderCount: orders.length,
        paidOrderCount: paidOrders.length,
        avgOrderValue,
        lowStockCount,
        customerCount,
        pendingOrders: pendingOrders.length,
      });

      setRecentOrders(orders.slice(0, 5));

      // Generate sales data for chart (last 14 days)
      const chartData: SalesDataPoint[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayOrders = paidOrders.filter((o: Order) => o.created_at.startsWith(dateStr));
        chartData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayOrders.reduce((sum: number, o: Order) => sum + o.total, 0),
          orders: dayOrders.length,
        });
      }
      setSalesData(chartData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1677FF] to-[#0D3B8C] p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome to Nexalon Creations
          </h1>
          <p className="text-blue-100 mb-4">
            Here's what's happening with your store today.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/products/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#1677FF] rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
            >
              <Package className="h-4 w-4" />
              Add Product
            </Link>
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg font-semibold text-sm hover:bg-white/30 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              View Orders
              {stats.pendingOrders > 0 && (
                <span className="bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded-full">
                  {stats.pendingOrders}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="group p-4 sm:p-6 hover:border-brand-neon/50 transition-all duration-300 hover:shadow-lg hover:shadow-brand-neon/10">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-brand-neon/20 to-brand-emerald-dark rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-brand-neon" />
            </div>
            <span className="text-brand-neon text-xs flex items-center gap-1 bg-brand-neon/10 px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" />
              Today
            </span>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-gray-400 text-xs sm:text-sm">Today's Revenue</p>
            <p className="text-xl sm:text-2xl font-bold text-[#0D1B2A]">{formatPrice(stats.todayRevenue)}</p>
          </div>
        </Card>

        <Card className="group p-4 sm:p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            </div>
            <span className="text-blue-400 text-xs flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-full">
              <ArrowUpRight className="h-3 w-3" />
              Month
            </span>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-gray-400 text-xs sm:text-sm">This Month (net)</p>
            <p className="text-xl sm:text-2xl font-bold text-[#0D1B2A]">{formatPrice(stats.monthRevenue)}</p>
          </div>
        </Card>

        <Card className="group p-4 sm:p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
            </div>
            {stats.pendingOrders > 0 ? (
              <span className="text-yellow-400 text-xs flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full animate-pulse">
                {stats.pendingOrders} pending
              </span>
            ) : (
              <span className="text-purple-400 text-xs flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded-full">
                All clear
              </span>
            )}
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-gray-400 text-xs sm:text-sm">Total Orders</p>
            <p className="text-xl sm:text-2xl font-bold text-[#0D1B2A]">{stats.orderCount}</p>
          </div>
        </Card>

        <Card className="group p-4 sm:p-6 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
            </div>
            {stats.lowStockCount > 0 ? (
              <span className="text-yellow-400 text-xs flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full animate-pulse">
                <ArrowDownRight className="h-3 w-3" />
                Alert
              </span>
            ) : (
              <span className="text-green-400 text-xs flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                Stocked
              </span>
            )}
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-gray-400 text-xs sm:text-sm">Low Stock Items</p>
            <p className="text-xl sm:text-2xl font-bold text-[#0D1B2A]">{stats.lowStockCount}</p>
          </div>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card className="p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">All-Time Revenue Breakdown</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Gross Collected</p>
            <p className="text-xl sm:text-2xl font-bold text-[#0D1B2A]">{formatPrice(stats.netRevenue + stats.totalRefunded)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stats.paidOrderCount} paid orders</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Refunded</p>
            <p className="text-xl sm:text-2xl font-bold text-red-400">
              {stats.totalRefunded > 0 ? `- ${formatPrice(stats.totalRefunded)}` : formatPrice(0)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">returned to customers</p>
          </div>
          <div className="border-l border-gray-200 pl-4">
            <p className="text-xs text-gray-400 mb-1">Net Revenue</p>
            <p className="text-xl sm:text-2xl font-bold text-green-500">{formatPrice(stats.netRevenue)}</p>
            <p className="text-xs text-gray-500 mt-0.5">after refunds</p>
          </div>
        </div>
      </Card>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="group p-4 sm:p-6 hover:border-green-500/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">Avg. Order Value</p>
              <p className="text-lg sm:text-xl font-bold text-[#0D1B2A]">{formatPrice(stats.avgOrderValue)}</p>
            </div>
          </div>
        </Card>

        <Card className="group p-4 sm:p-6 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">Customers</p>
              <p className="text-lg sm:text-xl font-bold text-[#0D1B2A]">{stats.customerCount}</p>
            </div>
          </div>
        </Card>

        <Card className="group p-4 sm:p-6 col-span-2 lg:col-span-1 hover:border-orange-500/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">Week Revenue (net)</p>
              <p className="text-lg sm:text-xl font-bold text-[#0D1B2A]">{formatPrice(stats.weekRevenue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="p-4 sm:p-6 hover:border-brand-neon/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-[#0D1B2A]">Revenue</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Last 14 days</span>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1677FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1677FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  labelStyle={{ color: '#0D1B2A', fontWeight: 600 }}
                  formatter={(value: number) => [formatPrice(value), 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1677FF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Orders Chart */}
        <Card className="p-4 sm:p-6 hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-[#0D1B2A]">Orders</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Last 14 days</span>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  labelStyle={{ color: '#0D1B2A', fontWeight: 600 }}
                  formatter={(value: number) => [value, 'Orders']}
                />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-[#0D1B2A]">Recent Orders</h2>
          <Link
            to="/admin/orders"
            className="text-brand-neon text-sm hover:underline"
          >
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No orders yet</p>
            <p className="text-gray-500 text-sm mt-1">Orders will appear here once customers start purchasing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-sm">Order</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-sm">Status</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-sm">Total</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-200 hover:bg-blue-50">
                    <td className="py-3 px-4">
                      <Link to={`/admin/orders/${order.id}`} className="text-[#0D1B2A] font-medium hover:text-[#1677FF]">
                        #{order.order_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          order.status === 'delivered'
                            ? 'success'
                            : order.status === 'cancelled'
                            ? 'danger'
                            : 'info'
                        }
                        className="text-xs"
                      >
                        {ORDER_STATUSES[order.status as OrderStatus]?.label || order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-brand-neon font-medium">{formatPrice(order.total)}</td>
                    <td className="py-3 px-4 text-gray-400 text-sm hidden sm:table-cell">
                      {formatDateTime(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
