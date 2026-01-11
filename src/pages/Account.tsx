import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, LogOut, Settings, ChevronRight, MapPin, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { formatDate, formatPrice } from '../lib/utils';
import { ORDER_STATUSES } from '../lib/constants';
import type { Order, OrderItem } from '../types';

interface OrderWithItems extends Order {
  items: OrderItem[];
}

export default function Account() {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile } = useAuthStore();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    phone: profile?.phone || '',
    marketingOptIn: profile?.marketing_opt_in || false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
        marketingOptIn: profile.marketing_opt_in || false,
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone || null,
        marketing_opt_in: formData.marketingOptIn,
      });

      // Update email subscriber if marketing preference changed
      if (user?.email) {
        const { data: existingSub } = await supabase
          .from('email_subscribers')
          .select('id')
          .eq('email', user.email.toLowerCase())
          .maybeSingle();

        if (existingSub) {
          await supabase
            .from('email_subscribers')
            .update({
              is_subscribed: formData.marketingOptIn,
              first_name: formData.firstName || null,
              last_name: formData.lastName || null,
              unsubscribed_at: formData.marketingOptIn ? null : new Date().toISOString(),
            })
            .eq('id', existingSub.id);
        } else if (formData.marketingOptIn) {
          await supabase.from('email_subscribers').insert({
            email: user.email.toLowerCase(),
            first_name: formData.firstName || null,
            last_name: formData.lastName || null,
            source: 'register',
            is_subscribed: true,
            subscribed_at: new Date().toISOString(),
          });
        }
      }

      addToast('Settings saved successfully', 'success');
    } catch (err) {
      console.error('Error saving settings:', err);
      addToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusVariant = (status: string): 'success' | 'danger' | 'info' | 'warning' | 'default' => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'danger';
      case 'shipped':
        return 'info';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[var(--color-surface)] rounded-full flex items-center justify-center border border-[var(--color-border)]">
            <User className="h-8 w-8 text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-theme">
              {profile?.first_name
                ? `${profile.first_name} ${profile.last_name || ''}`
                : 'My Account'}
            </h1>
            <p className="text-theme opacity-60">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-1 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-theme opacity-60 hover:opacity-100'
          }`}
        >
          <Package className="h-5 w-5" />
          Orders
          {orders.length > 0 && (
            <span className="text-xs bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-1 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-theme opacity-60 hover:opacity-100'
          }`}
        >
          <Settings className="h-5 w-5" />
          Settings
        </button>
      </div>

      {/* Content */}
      {activeTab === 'orders' ? (
        <div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : orders.length === 0 ? (
            <Card className="text-center py-12">
              <Package className="h-12 w-12 text-theme opacity-30 mx-auto mb-4" />
              <p className="text-theme opacity-60 mb-4">No orders yet</p>
              <Button onClick={() => navigate('/products')}>Start Shopping</Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} padding="none" className="overflow-hidden">
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-[var(--color-border)]/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-[var(--color-primary)]" />
                      </div>
                      <div className="text-left">
                        <p className="text-theme font-medium">Order #{order.order_number}</p>
                        <p className="text-theme opacity-60 text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant={getStatusVariant(order.status)}>
                          {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]?.label || order.status}
                        </Badge>
                        <p className="text-[var(--color-primary)] font-semibold mt-1">
                          {formatPrice(order.total)}
                        </p>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-theme opacity-60 transition-transform ${expandedOrder === order.id ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded Order Details */}
                  {expandedOrder === order.id && (
                    <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-background)]/50">
                      {/* Items */}
                      <div className="space-y-3 mb-4">
                        {order.items.map((item) => (
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
                      <div className="border-t border-[var(--color-border)] pt-4 space-y-1 text-sm">
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
                        <div className="flex justify-between text-theme font-semibold pt-2 border-t border-[var(--color-border)]">
                          <span>Total</span>
                          <span>{formatPrice(order.total)}</span>
                        </div>
                      </div>

                      {/* Shipping Address */}
                      {order.shipping_address && (
                        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                          <div className="flex items-center gap-2 mb-2 text-theme opacity-60 text-sm">
                            <MapPin className="h-4 w-4" />
                            <span>Shipped to</span>
                          </div>
                          <p className="text-theme text-sm">
                            {order.shipping_address.address_line_1}
                            {order.shipping_address.address_line_2 && `, ${order.shipping_address.address_line_2}`}
                            <br />
                            {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                          </p>
                        </div>
                      )}

                      {/* Tracking */}
                      {order.tracking_number && (
                        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                          <p className="text-theme text-sm">
                            <span className="opacity-60">Tracking:</span>{' '}
                            <span className="font-mono">{order.tracking_number}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <h2 className="text-xl font-semibold text-theme mb-6">Account Settings</h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            <Input
              label="Phone (optional)"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="marketingOptIn"
                checked={formData.marketingOptIn}
                onChange={(e) => setFormData({ ...formData, marketingOptIn: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <label htmlFor="marketingOptIn" className="text-theme opacity-60 text-sm">
                I want to receive marketing emails about new products, offers, and updates
              </label>
            </div>

            <div className="pt-4">
              <Button type="submit" isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-theme mb-4">Account Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-theme opacity-60">Email</span>
                <span className="text-theme">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme opacity-60">Member since</span>
                <span className="text-theme">
                  {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
