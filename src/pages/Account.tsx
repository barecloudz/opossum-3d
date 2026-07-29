import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Package, LogOut, Settings, ChevronRight, MapPin, Clock, Handshake, KeyRound, RefreshCw, X } from 'lucide-react';
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

interface CustomerSubscription {
  id: string;
  product_id: string | null;
  interval: string;
  status: string;
  next_billing_date: string | null;
  quantity: number;
  unit_price: number;
  selected_colors: string[] | null;
  product_description: string | null;
  created_at: string;
  product?: { name: string; slug: string } | null;
}

const INTERVAL_LABELS: Record<string, string> = {
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
  every2months: 'Every 2 months',
  quarterly: 'Every 3 months',
};

export default function Account() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, isLoading: authLoading, signOut, updateProfile } = useAuthStore();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'subscriptions' | 'settings'>(
    searchParams.get('tab') === 'subscriptions' ? 'subscriptions' : 'orders'
  );
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // Subscriptions
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const passwordChangedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (authLoading) return; // Wait until auth is resolved
    if (!user) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    // Failsafe: never leave the spinner spinning forever
    const failsafe = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 10000);

    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (cancelled) return;
        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        clearTimeout(failsafe);
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchOrders();

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('affiliates')
      .select('id')
      .eq('status', 'approved')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()
      .then(({ data }) => { if (data) setIsAffiliate(true); });
  }, [user]);

  useEffect(() => {
    if (!user || activeTab !== 'subscriptions') return;
    setSubsLoading(true);
    supabase
      .from('customer_subscriptions')
      .select('*, product:products(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSubscriptions((data as CustomerSubscription[]) || []);
        setSubsLoading(false);
      });
  }, [user, activeTab]);

  const handleCancelSubscription = async (subId: string) => {
    if (!confirm('Cancel this subscription? You\'ll keep access until the end of the current billing period.')) return;
    setCancelingId(subId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch('/.netlify/functions/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subscriptionId: subId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancel failed');
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, status: 'canceled' } : s));
      addToast('Subscription canceled. It will remain active until the end of the billing period.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to cancel subscription', 'error');
    } finally {
      setCancelingId(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) { setPasswordError(error.message); return; }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordChanged(true);
    if (passwordChangedTimerRef.current) clearTimeout(passwordChangedTimerRef.current);
    passwordChangedTimerRef.current = setTimeout(() => setPasswordChanged(false), 4000);
  };

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
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 px-1 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'subscriptions'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-theme opacity-60 hover:opacity-100'
          }`}
        >
          <RefreshCw className="h-5 w-5" />
          Subscriptions
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
        {isAffiliate && (
          <button
            onClick={() => navigate('/affiliate/dashboard')}
            className="pb-3 px-1 font-medium transition-colors flex items-center gap-2 text-theme opacity-60 hover:opacity-100"
          >
            <Handshake className="h-5 w-5" />
            Affiliate
          </button>
        )}
      </div>

      {/* Subscribed banner */}
      {searchParams.get('subscribed') === '1' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          Your subscription is active! You'll receive a confirmation email shortly.
        </div>
      )}

      {/* Content */}
      {activeTab === 'subscriptions' ? (
        <div>
          {subsLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>
          ) : subscriptions.length === 0 ? (
            <Card className="text-center py-12">
              <RefreshCw className="h-12 w-12 text-theme opacity-30 mx-auto mb-4" />
              <p className="text-theme opacity-60 mb-4">No active subscriptions</p>
              <Button onClick={() => navigate('/products')}>Browse Products</Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {subscriptions.map(sub => (
                <Card key={sub.id} padding="none" className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <RefreshCw className="h-5 w-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                          <p className="text-theme font-semibold">
                            {sub.product?.name || 'Subscription'}
                          </p>
                          <p className="text-theme opacity-60 text-sm mt-0.5">
                            {INTERVAL_LABELS[sub.interval] ?? sub.interval} · {sub.quantity} × ${sub.unit_price.toFixed(2)}
                          </p>
                          {sub.next_billing_date && sub.status === 'active' && (
                            <p className="text-theme opacity-50 text-xs mt-1">
                              Next billing: {new Date(sub.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                          {sub.selected_colors?.length ? (
                            <p className="text-theme opacity-50 text-xs mt-1">Colors: {sub.selected_colors.join(', ')}</p>
                          ) : null}
                          {sub.product_description && (
                            <p className="text-theme opacity-50 text-xs mt-1 italic">"{sub.product_description}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          sub.status === 'active' ? 'bg-green-100 text-green-700' :
                          sub.status === 'past_due' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {sub.status === 'active' ? 'Active' : sub.status === 'past_due' ? 'Past Due' : 'Canceled'}
                        </span>
                        {sub.status !== 'canceled' && (
                          <button
                            onClick={() => handleCancelSubscription(sub.id)}
                            disabled={cancelingId === sub.id}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                            {cancelingId === sub.id ? 'Canceling...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'orders' ? (
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
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="h-5 w-5 text-[var(--color-primary)]" />
              <h3 className="text-lg font-semibold text-theme">Change Password</h3>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>
              {passwordError && (
                <p className="text-red-500 text-sm">{passwordError}</p>
              )}
              {passwordChanged && (
                <p className="text-green-500 text-sm font-medium">Password changed successfully.</p>
              )}
              <Button type="submit" isLoading={passwordSaving}>
                Update Password
              </Button>
            </form>
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
