import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ChevronRight, MapPin, Mail, Phone } from 'lucide-react';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useOrders } from '../../hooks/useOrders';
import { formatPrice, formatDate } from '../../lib/utils';
import { ORDER_STATUSES } from '../../lib/constants';
import Spinner from '../../components/ui/Spinner';
import type { OrderStatus } from '../../types';

const statusCounts = (orders: { status: string }[]) => {
  const counts: Record<string, number> = {};
  orders.forEach(o => {
    counts[o.status] = (counts[o.status] || 0) + 1;
  });
  return counts;
};

export default function AdminOrders() {
  const { orders, isLoading } = useOrders();
  const navigate = useNavigate();
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

  const counts = statusCounts(orders);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Orders</h1>
          <p className="text-gray-400 mt-1">{orders.length} total orders</p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            statusFilter === 'all'
              ? 'bg-white text-black'
              : 'bg-brand-gray text-gray-400 hover:text-white'
          }`}
        >
          All ({orders.length})
        </button>
        {(Object.entries(ORDER_STATUSES) as [OrderStatus, { label: string }][]).map(([value, { label }]) => {
          const count = counts[value] || 0;
          if (count === 0) return null;
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === value
                  ? 'bg-white text-black'
                  : 'bg-brand-gray text-gray-400 hover:text-white'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by order #, name, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No orders found</p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-brand-neon text-sm mt-2 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const shippingAddr = order.shipping_address;
            const isLocalPickup = shippingAddr?.address_line_1 === 'Local Pickup';

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/admin/orders/${order.id}`)}
                className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 cursor-pointer hover:border-brand-neon/40 hover:bg-brand-gray/30 transition-all"
              >
                {/* Top row: Order number, status, total */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold text-lg">#{order.order_number}</span>
                    <Badge
                      variant={
                        order.status === 'delivered'
                          ? 'success'
                          : order.status === 'cancelled'
                          ? 'danger'
                          : order.status === 'shipped'
                          ? 'info'
                          : order.status === 'paid'
                          ? 'success'
                          : 'warning'
                      }
                    >
                      {ORDER_STATUSES[order.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-brand-neon font-bold text-lg">{formatPrice(order.total)}</span>
                    <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-brand-neon transition-colors" />
                  </div>
                </div>

                {/* Customer info row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-white font-medium">
                    {order.guest_name || 'Guest'}
                  </span>
                  {order.guest_email && (
                    <span className="text-gray-500 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {order.guest_email}
                    </span>
                  )}
                  {(order as any).guest_phone && (
                    <span className="text-gray-500 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {(order as any).guest_phone}
                    </span>
                  )}
                </div>

                {/* Bottom row: shipping address + date */}
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {isLocalPickup
                      ? 'Local Pickup'
                      : shippingAddr
                        ? `${shippingAddr.city}, ${shippingAddr.state} ${shippingAddr.postal_code}`
                        : 'No address'}
                  </span>
                  <span className="text-gray-500">
                    {formatDate(order.created_at)}
                  </span>
                </div>

                {/* Tracking number if shipped */}
                {order.tracking_number && (
                  <div className="mt-2 text-xs text-gray-500">
                    Tracking: <span className="font-mono text-gray-400">{order.tracking_number}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
