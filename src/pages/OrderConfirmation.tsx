import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, MapPin } from 'lucide-react';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/utils';
import type { Order, OrderItem } from '../types';

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-400" />
        </div>

        <h1 className="text-3xl font-bold text-theme mb-4">Thank you for your order!</h1>

        <p className="text-theme opacity-60 mb-2">
          Your order has been placed successfully.
        </p>
        <p className="text-theme opacity-60">
          {order?.guest_email || 'A'} confirmation email has been sent to your email.
        </p>
      </div>

      {order && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 mb-8">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[var(--color-primary)]" />
              <span className="text-theme font-medium">
                Order #{order.order_number || id?.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <span className="text-theme opacity-60 text-sm">
              {new Date(order.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Order Items */}
          <div className="space-y-3 mb-6">
            {order.items?.map((item: OrderItem) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <p className="text-theme">{item.product_name}</p>
                  {item.variant_name && (
                    <p className="text-theme opacity-60 text-sm">{item.variant_name}</p>
                  )}
                  <p className="text-theme opacity-60 text-sm">Qty: {item.quantity}</p>
                </div>
                <span className="text-theme">{formatPrice(item.total_price)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
            <div className="flex justify-between text-theme opacity-60">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount_amount && order.discount_amount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount</span>
                <span>-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-theme opacity-60">
              <span>Shipping</span>
              <span>{formatPrice(order.shipping_cost)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between text-theme opacity-60">
                <span>Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-[var(--color-border)]">
              <span className="text-theme">Total</span>
              <span className="text-[var(--color-primary)]">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
                <span className="text-theme font-medium text-sm">Shipping to</span>
              </div>
              <p className="text-theme opacity-60 text-sm">
                {order.shipping_address.address_line_1}
                {order.shipping_address.address_line_2 && `, ${order.shipping_address.address_line_2}`}
                <br />
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
              </p>
            </div>
          )}
        </div>
      )}

      {!order && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Package className="h-5 w-5 text-[var(--color-primary)]" />
            <span className="text-theme font-medium">Order #{id?.slice(0, 8).toUpperCase()}</span>
          </div>
          <p className="text-theme opacity-60 text-sm">
            We'll send you shipping updates via email as your order is processed.
          </p>
        </div>
      )}

      <div className="text-center space-y-4">
        <Button as={Link} to="/products" size="lg">
          Continue Shopping <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <div>
          <Link
            to="/account"
            className="text-[var(--color-primary)] hover:opacity-80 transition-opacity"
          >
            View order history
          </Link>
        </div>
      </div>
    </div>
  );
}
