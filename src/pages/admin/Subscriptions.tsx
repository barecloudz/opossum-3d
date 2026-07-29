import { useState, useEffect } from 'react';
import { RefreshCw, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { formatDate, formatPrice } from '../../lib/utils';

interface Subscription {
  id: string;
  user_id: string;
  product_id: string | null;
  interval: string;
  status: string;
  next_billing_date: string | null;
  quantity: number;
  unit_price: number;
  selected_colors: string[] | null;
  product_description: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  product?: { name: string } | null;
  profile?: { first_name: string | null; last_name: string | null; email: string } | null;
}

const INTERVAL_LABELS: Record<string, string> = {
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
  every2months: 'Every 2 months',
  quarterly: 'Every 3 months',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'default'; icon: typeof CheckCircle }> = {
  active:   { label: 'Active',    variant: 'success', icon: CheckCircle },
  canceled: { label: 'Canceled',  variant: 'danger',  icon: XCircle },
  past_due: { label: 'Past Due',  variant: 'warning', icon: AlertCircle },
  paused:   { label: 'Paused',    variant: 'default', icon: AlertCircle },
};

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select(`
          *,
          product:products(name),
          profile:profiles(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (!error) setSubscriptions((data as Subscription[]) || []);
      setIsLoading(false);
    };

    fetchSubscriptions();
  }, []);

  const filtered = subscriptions.filter(sub => {
    const name = `${sub.profile?.first_name ?? ''} ${sub.profile?.last_name ?? ''}`.toLowerCase();
    const email = (sub.profile?.email ?? '').toLowerCase();
    const product = (sub.product?.name ?? '').toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = !q || name.includes(q) || email.includes(q) || product.includes(q);
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    past_due: subscriptions.filter(s => s.status === 'past_due').length,
    canceled: subscriptions.filter(s => s.status === 'canceled').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Subscriptions</h1>
          <p className="text-gray-500 text-sm mt-1">All customer Subscribe &amp; Save subscriptions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4" />
          {counts.active} active
        </div>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'active', 'past_due', 'canceled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              statusFilter === s
                ? 'bg-[#1677FF] text-white border-[#1677FF]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1677FF]'
            }`}
          >
            {s === 'all' ? 'All' : s === 'past_due' ? 'Past Due' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">({counts[s] ?? subscriptions.filter(x => x.status === s).length})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search customer or product..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1677FF] bg-white"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <RefreshCw className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No subscriptions found</p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Frequency</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Bill</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(sub => {
                  const statusCfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG['paused'];
                  const fullName = [sub.profile?.first_name, sub.profile?.last_name].filter(Boolean).join(' ') || '—';
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0D1B2A]">{fullName}</p>
                        <p className="text-xs text-gray-400">{sub.profile?.email ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#0D1B2A]">{sub.product?.name ?? 'Unknown product'}</p>
                        {sub.selected_colors?.length ? (
                          <p className="text-xs text-gray-400">Colors: {sub.selected_colors.join(', ')}</p>
                        ) : null}
                        {sub.product_description && (
                          <p className="text-xs text-gray-400 italic truncate max-w-[180px]">"{sub.product_description}"</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {INTERVAL_LABELS[sub.interval] ?? sub.interval}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#0D1B2A]">
                        {formatPrice(sub.unit_price * sub.quantity)}
                        {sub.quantity > 1 && (
                          <span className="text-xs font-normal text-gray-400 ml-1">×{sub.quantity}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {sub.next_billing_date && sub.status === 'active'
                          ? new Date(sub.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {formatDate(sub.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {subscriptions.length} subscriptions
          </div>
        </Card>
      )}
    </div>
  );
}
