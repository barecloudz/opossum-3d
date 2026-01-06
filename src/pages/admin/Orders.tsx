import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Package } from 'lucide-react';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useOrders } from '../../hooks/useOrders';
import { formatPrice, formatDate } from '../../lib/utils';
import { ORDER_STATUSES } from '../../lib/constants';
import Spinner from '../../components/ui/Spinner';
import type { OrderStatus } from '../../types';

export default function AdminOrders() {
  const { orders, isLoading } = useOrders();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toString().includes(search) ||
      order.guest_email?.toLowerCase().includes(search.toLowerCase()) ||
      order.guest_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Orders</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by order # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
          className="px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-neon"
        >
          <option value="all">All Statuses</option>
          {Object.entries(ORDER_STATUSES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-gray">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Order</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Total</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-brand-gray/50 hover:bg-brand-gray/20">
                    <td className="py-3 px-4">
                      <span className="text-white font-medium">#{order.order_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white">{order.guest_name || 'Guest'}</p>
                        <p className="text-gray-500 text-sm">{order.guest_email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          order.status === 'delivered'
                            ? 'success'
                            : order.status === 'cancelled'
                            ? 'danger'
                            : order.status === 'shipped'
                            ? 'info'
                            : 'warning'
                        }
                      >
                        {ORDER_STATUSES[order.status].label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-brand-neon font-medium">
                      {formatPrice(order.total)}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{formatDate(order.created_at)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="p-2 text-gray-400 hover:text-brand-neon transition-colors"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                      </div>
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
