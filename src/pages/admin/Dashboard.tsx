import { DollarSign, ShoppingBag, Package, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import { formatPrice } from '../../lib/utils';

export default function AdminDashboard() {
  // Mock data - will be replaced with real data from Supabase
  const stats = {
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    orderCount: 0,
    avgOrderValue: 0,
    lowStockCount: 0,
  };

  const recentOrders: { id: string; order_number: number; total: number; status: string; created_at: string }[] = [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-emerald-dark rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-brand-neon" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Today's Revenue</p>
              <p className="text-2xl font-bold text-white">{formatPrice(stats.todayRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">This Month</p>
              <p className="text-2xl font-bold text-white">{formatPrice(stats.monthRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-white">{stats.orderCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Low Stock Items</p>
              <p className="text-2xl font-bold text-white">{stats.lowStockCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-gray">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Order</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Total</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-brand-gray/50">
                    <td className="py-3 px-4 text-white">#{order.order_number}</td>
                    <td className="py-3 px-4 text-gray-400">{order.status}</td>
                    <td className="py-3 px-4 text-brand-neon">{formatPrice(order.total)}</td>
                    <td className="py-3 px-4 text-gray-400">{order.created_at}</td>
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
