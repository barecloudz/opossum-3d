import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, MapPin, Save } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDateTime } from '../../lib/utils';
import { ORDER_STATUSES } from '../../lib/constants';
import type { Order, OrderItem, OrderStatus } from '../../types';

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      setOrder(orderData);
      setItems(itemsData || []);
      setStatus(orderData.status);
      setTrackingNumber(orderData.tracking_number || '');
      setNotes(orderData.notes || '');
    } catch (err) {
      console.error('Error fetching order:', err);
      navigate('/admin/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!order) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          tracking_number: trackingNumber || null,
          notes: notes || null,
        })
        .eq('id', order.id);

      if (error) throw error;

      setOrder({ ...order, status, tracking_number: trackingNumber, notes });
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Failed to update order');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-12 text-gray-400">Order not found</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate('/admin/orders')}
        className="inline-flex items-center text-gray-400 hover:text-brand-neon mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Order #{order.order_number}</h1>
          <p className="text-gray-400">{formatDateTime(order.created_at)}</p>
        </div>
        <Badge
          variant={
            order.status === 'delivered'
              ? 'success'
              : order.status === 'cancelled'
              ? 'danger'
              : 'info'
          }
          className="text-base px-4 py-1"
        >
          {ORDER_STATUSES[order.status].label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-brand-neon" />
              Order Items
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-brand-gray/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-gray rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-gray-500 text-sm">{item.variant_name}</p>
                      )}
                      <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="text-brand-neon font-medium">
                    {formatPrice(item.total_price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-brand-gray space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>{formatPrice(order.shipping_cost)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-brand-gray">
                <span className="text-white">Total</span>
                <span className="text-brand-neon">{formatPrice(order.total)}</span>
              </div>
            </div>
          </Card>

          {/* Shipping Address */}
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-neon" />
              Shipping Address
            </h2>
            <address className="text-gray-400 not-italic">
              {order.guest_name && <p className="text-white font-medium">{order.guest_name}</p>}
              <p>{order.shipping_address.address_line_1}</p>
              {order.shipping_address.address_line_2 && (
                <p>{order.shipping_address.address_line_2}</p>
              )}
              <p>
                {order.shipping_address.city}, {order.shipping_address.state}{' '}
                {order.shipping_address.postal_code}
              </p>
              <p>{order.shipping_address.country}</p>
              {order.guest_email && <p className="mt-2">{order.guest_email}</p>}
            </address>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4">Update Order</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-neon"
                >
                  {Object.entries(ORDER_STATUSES).map(([value, { label }]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Tracking Number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Order Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes..."
                  className="w-full px-4 py-2 rounded-lg bg-brand-black border border-brand-gray text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-neon focus:border-transparent resize-none"
                />
              </div>

              <Button onClick={handleSave} className="w-full" isLoading={isSaving}>
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </Button>
            </div>
          </Card>

          {order.stripe_payment_intent_id && (
            <Card>
              <h2 className="text-xl font-semibold text-white mb-4">Payment</h2>
              <p className="text-gray-400 text-sm break-all">
                Stripe Payment ID: {order.stripe_payment_intent_id}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
