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
  orderCount: number;
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
    orderCount: 0,
    avgOrderValue: 0,
    lowStockCount: 0,
    customerCount: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch all orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch low stock products
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('track_inventory', true)
        .lt('stock_quantity', 5);

      // Fetch customer count
      const { count: customerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (orders) {
        // Calculate stats
        const todayOrders = orders.filter(o => o.created_at >= todayStart);
        const weekOrders = orders.filter(o => o.created_at >= weekStart);
        const monthOrders = orders.filter(o => o.created_at >= monthStart);
        const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');

        const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
        const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);
        const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);
        const avgOrderValue = orders.length > 0 ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0;

        setStats({
          todayRevenue,
          weekRevenue,
          monthRevenue,
          orderCount: orders.length,
          avgOrderValue,
          lowStockCount: lowStockCount || 0,
          customerCount: customerCount || 0,
          pendingOrders: pendingOrders.length,
        });

        setRecentOrders(orders.slice(0, 5));

        // Generate sales data for chart (last 14 days)
        const chartData: SalesDataPoint[] = [];
        for (let i = 13; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          const dayOrders = orders.filter(o => o.created_at.startsWith(dateStr));
          chartData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
            orders: dayOrders.length,
          });
        }
        setSalesData(chartData);
      }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
        <div className="text-sm text-gray-400">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-emerald-dark rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-brand-neon" />
            </div>
            <span className="text-brand-neon text-xs flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Today
            </span>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-gray-400 text-xs sm:text-sm">Today's Revenue</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{formatPrice(stats.todayRevenue)}</p>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            </div>
            <span className="text-blue-400 text-xs flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              Month
            </span>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-gray-400 text-xs sm:text-sm">This Month</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{formatPrice(stats.monthRevenue)}</p>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
            </div>
            <span className="text-purple-400 text-xs flex items-center gap-1">
              {stats.pendingOrders} pending
            </span>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-gray-400 text-xs sm:text-sm">Total Orders</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{stats.orderCount}</p>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
            </div>
            {stats.lowStockCount > 0 && (
              <span className="text-yellow-400 text-xs flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3" />
                Alert
              </span>
            )}
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-gray-400 text-xs sm:text-sm">Low Stock Items</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{stats.lowStockCount}</p>
          </div>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">Avg. Order Value</p>
              <p className="text-lg sm:text-xl font-bold text-white">{formatPrice(stats.avgOrderValue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">Customers</p>
              <p className="text-lg sm:text-xl font-bold text-white">{stats.customerCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">Week Revenue</p>
              <p className="text-lg sm:text-xl font-bold text-white">{formatPrice(stats.weekRevenue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Revenue (14 Days)</h2>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff66" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00ff66" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2d2d2d',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f5f5f5' }}
                  formatter={(value: number) => [formatPrice(value), 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#00ff66"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Orders Chart */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Orders (14 Days)</h2>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2d2d2d',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f5f5f5' }}
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
          <h2 className="text-lg sm:text-xl font-semibold text-white">Recent Orders</h2>
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
                <tr className="border-b border-brand-gray">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Order</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Total</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-brand-gray/50 hover:bg-brand-gray/20">
                    <td className="py-3 px-4">
                      <Link to={`/admin/orders/${order.id}`} className="text-white hover:text-brand-neon">
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
