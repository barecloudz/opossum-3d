import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { formatPrice, formatDateTime } from '../../lib/utils';
import { ORDER_STATUSES } from '../../lib/constants';
import type { Order, OrderStatus } from '../../types';

interface DashboardStats {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  lastMonthRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  orderCount: number;
  paidOrderCount: number;
  avgOrderValue: number;
  lowStockCount: number;
  customerCount: number;
  pendingOrders: number;
  activeSubscriptions: number;
  subscriptionMRR: number;
}

interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface OrderStatusPoint {
  name: string;
  value: number;
  color: string;
}

interface TopProduct {
  name: string;
  units: number;
  revenue: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

export default function AdminDashboard() {
  const { profile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    lastMonthRevenue: 0,
    totalRefunded: 0,
    netRevenue: 0,
    orderCount: 0,
    paidOrderCount: 0,
    avgOrderValue: 0,
    lowStockCount: 0,
    customerCount: 0,
    pendingOrders: 0,
    activeSubscriptions: 0,
    subscriptionMRR: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

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
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

      // Fetch all data in parallel with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const [ordersRes, lowStockRes, customerRes, subsRes, lastMonthRes, orderItemsRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).abortSignal(controller.signal),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('track_inventory', true).lt('stock_quantity', 5).abortSignal(controller.signal),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).abortSignal(controller.signal),
        supabase.from('customer_subscriptions').select('unit_price, quantity, interval').eq('status', 'active').abortSignal(controller.signal),
        supabase.from('orders').select('total, status, created_at').gte('created_at', lastMonthStart).lt('created_at', monthStart).in('status', ['processing', 'shipped', 'delivered']).abortSignal(controller.signal),
        supabase.from('order_items').select('product_name, quantity, total_price').abortSignal(controller.signal),
      ]);

      clearTimeout(timeoutId);

      const orders: Order[] = ordersRes.data || [];
      const lowStockCount = lowStockRes.count || 0;
      const customerCount = customerRes.count || 0;
      const activeSubs = subsRes.data || [];
      const lastMonthOrders: { total: number; status: string; created_at: string }[] = lastMonthRes.data || [];
      const orderItems: { product_name: string; quantity: number; total_price: number }[] = orderItemsRes.data || [];

      // Normalize all sub billing amounts to monthly equivalent for MRR
      const intervalToMonths: Record<string, number> = {
        weekly: 4.33, biweekly: 2.17, monthly: 1, every2months: 0.5, quarterly: 0.333,
      };
      const subscriptionMRR = activeSubs.reduce((sum: number, s: any) => {
        const monthlyMultiplier = intervalToMonths[s.interval] ?? 1;
        return sum + s.unit_price * s.quantity * monthlyMultiplier;
      }, 0);

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

      // Last month revenue
      const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + o.total, 0);

      setStats({
        todayRevenue,
        weekRevenue,
        monthRevenue,
        lastMonthRevenue,
        totalRefunded,
        netRevenue: grossRevenue - totalRefunded,
        orderCount: orders.length,
        paidOrderCount: paidOrders.length,
        avgOrderValue,
        lowStockCount,
        customerCount,
        pendingOrders: pendingOrders.length,
        activeSubscriptions: activeSubs.length,
        subscriptionMRR,
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

      // Order status donut data — all statuses we track
      const statusKeys: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      const statusCounts = statusKeys
        .map((s) => ({
          name: ORDER_STATUSES[s]?.label ?? s,
          value: orders.filter((o) => o.status === s).length,
          color: STATUS_COLORS[s] ?? '#6b7280',
        }))
        .filter((s) => s.value > 0);
      setOrderStatusData(statusCounts);

      // Top 5 products by revenue from order_items
      const productMap: Record<string, { units: number; revenue: number }> = {};
      for (const item of orderItems) {
        const name = item.product_name || 'Unknown';
        if (!productMap[name]) productMap[name] = { units: 0, revenue: 0 };
        productMap[name].units += item.quantity ?? 0;
        productMap[name].revenue += item.total_price ?? 0;
      }
      const sorted = Object.entries(productMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopProducts(sorted);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Revenue comparison helpers
  const revenueChange = stats.lastMonthRevenue > 0
    ? ((stats.monthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
    : null;
  const revenueUp = revenueChange !== null && revenueChange >= 0;

  // Top products max revenue (for progress bars)
  const maxProductRevenue = topProducts.length > 0 ? topProducts[0].revenue : 1;

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
            {profile?.first_name ? `Hey ${profile.first_name}, welcome back.` : 'Welcome back.'}
          </h1>
          <p className="text-blue-100 mb-4">
            Here's what's happening with your store today.
          </p>
          {/* Quick stats chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full">
              <DollarSign className="h-3 w-3" />
              This week: {formatPrice(stats.weekRevenue)}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full">
              <TrendingUp className="h-3 w-3" />
              Avg order: {formatPrice(stats.avgOrderValue)}
            </span>
          </div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 xl:grid-cols-5">
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

        <Card className="group col-span-2 xl:col-span-1 p-4 sm:p-6 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
            </div>
            <Link to="/admin/subscriptions" className="text-emerald-600 text-xs flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full hover:bg-emerald-500/20 transition-colors">
              <ArrowUpRight className="h-3 w-3" />
              View
            </Link>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-gray-400 text-xs sm:text-sm">Active Subscriptions</p>
            <p className="text-xl sm:text-2xl font-bold text-[#0D1B2A]">{stats.activeSubscriptions}</p>
            {stats.subscriptionMRR > 0 && (
              <p className="text-xs text-emerald-600 font-medium mt-0.5">{formatPrice(stats.subscriptionMRR)}/mo MRR</p>
            )}
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

      {/* Revenue Comparison Card */}
      <Card className="p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Month vs. Last Month</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">This Month</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#0D1B2A]">{formatPrice(stats.monthRevenue)}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">Last Month</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-400">{formatPrice(stats.lastMonthRevenue)}</p>
          </div>
          <div className="flex-shrink-0">
            {revenueChange === null ? (
              <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 text-sm font-semibold px-4 py-2 rounded-xl">
                No prior data
              </span>
            ) : revenueUp ? (
              <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 text-sm font-semibold px-4 py-2 rounded-xl border border-green-100">
                <TrendingUp className="h-4 w-4" />
                +{revenueChange.toFixed(1)}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-500 text-sm font-semibold px-4 py-2 rounded-xl border border-red-100">
                <TrendingDown className="h-4 w-4" />
                {revenueChange.toFixed(1)}%
              </span>
            )}
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

      {/* Order Status Donut + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Order Status Donut */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-[#0D1B2A] mb-4">Orders by Status</h2>
          {orderStatusData.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No orders to display</div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="h-52">
                <ResponsiveContainer width={220} height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {orderStatusData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-gray-600 font-medium">{entry.name}</span>
                    <span className="text-xs text-gray-400">({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Top 5 Products by Revenue */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-[#0D1B2A] mb-4">Top Products by Revenue</h2>
          {topProducts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No order item data available</div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">#{index + 1}</span>
                      <span className="text-sm font-medium text-[#0D1B2A] truncate">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className="text-xs text-gray-400">{product.units} units</span>
                      <span className="text-sm font-bold text-[#0D1B2A]">{formatPrice(product.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1677FF] rounded-full transition-all"
                      style={{ width: `${(product.revenue / maxProductRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
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
