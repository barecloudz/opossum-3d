import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MousePointerClick,
  ShoppingBag,
  DollarSign,
  Clock,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Affiliate, AffiliateConversion, AffiliatePayout } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  totalClicks: number;
  totalConversions: number;
  totalEarned: number;
  pendingBalance: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass rounded-2xl border border-[var(--color-border)] p-5 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-[#6B7280] uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold text-[#0D1B2A] mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function ConversionStatusBadge({ status }: { status: AffiliateConversion['status'] }) {
  const map: Record<AffiliateConversion['status'], { label: string; classes: string }> = {
    pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', classes: 'bg-blue-100 text-blue-800' },
    paid: { label: 'Paid', classes: 'bg-green-100 text-green-800' },
  };
  const { label, classes } = map[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--color-border)] text-[#0D1B2A] hover:bg-gray-50 transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Status screens
// ---------------------------------------------------------------------------

function NotLoggedIn() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full text-center glass rounded-2xl border border-[var(--color-border)] p-10">
        <AlertCircle className="h-10 w-10 text-[var(--color-primary)] mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#0D1B2A] mb-2">Sign in required</h1>
        <p className="text-[#6B7280] mb-6 text-sm">
          Please sign in to access your affiliate dashboard.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity text-sm"
        >
          Go to Login <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function PendingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full text-center glass rounded-2xl border border-[var(--color-border)] p-10">
        <Clock className="h-10 w-10 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#0D1B2A] mb-2">Application Under Review</h1>
        <p className="text-[#6B7280] text-sm">
          Your affiliate application is being reviewed. We'll notify you by email within 1–2 business
          days once a decision has been made.
        </p>
      </div>
    </div>
  );
}

function RejectedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full text-center glass rounded-2xl border border-[var(--color-border)] p-10">
        <XCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#0D1B2A] mb-2">Application Not Approved</h1>
        <p className="text-[#6B7280] text-sm mb-6">
          Unfortunately your affiliate application was not approved at this time. If you have
          questions, please reach out to us.
        </p>
        <a
          href="mailto:NexalonCreations@gmail.com"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity text-sm"
        >
          Contact Us
        </a>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AffiliateDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();

  const [pageState, setPageState] = useState<
    'loading' | 'no-auth' | 'no-record' | 'pending' | 'rejected' | 'approved'
  >('loading');

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalClicks: 0,
    totalConversions: 0,
    totalEarned: 0,
    pendingBalance: 0,
  });
  const [conversions, setConversions] = useState<AffiliateConversion[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------

  const loadDashboard = useCallback(async (affiliateRecord: Affiliate) => {
    const affiliateId = affiliateRecord.id;

    const [clicksRes, conversionsRes, payoutsRes] = await Promise.all([
      supabase
        .from('affiliate_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateId),

      supabase
        .from('affiliate_conversions')
        .select('id, affiliate_id, order_id, order_total, commission_amount, status, payout_id, created_at, order:orders(order_number, created_at, total)')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(10),

      supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Clicks
    const totalClicks = clicksRes.count ?? 0;

    // Conversions
    const allConversions = (conversionsRes.data ?? []) as unknown as AffiliateConversion[];
    const totalConversions = allConversions.length;

    const totalEarned = allConversions
      .filter((c) => c.status !== 'pending')
      .reduce((sum, c) => sum + c.commission_amount, 0);

    const pendingBalance = allConversions
      .filter((c) => c.status === 'pending' || c.status === 'approved')
      .reduce((sum, c) => sum + c.commission_amount, 0);

    setStats({ totalClicks, totalConversions, totalEarned, pendingBalance });
    setConversions(allConversions);
    setPayouts((payoutsRes.data ?? []) as AffiliatePayout[]);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setPageState('no-auth');
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Error fetching affiliate record:', error);
        setPageState('no-record');
        return;
      }

      if (!data) {
        setPageState('no-record');
        return;
      }

      const record = data as Affiliate;
      setAffiliate(record);

      if (record.status === 'pending') {
        setPageState('pending');
      } else if (record.status === 'rejected' || record.status === 'suspended') {
        setPageState('rejected');
      } else if (record.status === 'approved') {
        await loadDashboard(record);
        setPageState('approved');
      } else {
        setPageState('no-record');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, loadDashboard]);

  // Redirect to apply if no record
  useEffect(() => {
    if (pageState === 'no-record') {
      navigate('/affiliate/apply', { replace: true });
    }
  }, [pageState, navigate]);

  // ------------------------------------------------------------------
  // Render branch
  // ------------------------------------------------------------------

  if (pageState === 'loading' || pageState === 'no-record') return <LoadingScreen />;
  if (pageState === 'no-auth') return <NotLoggedIn />;
  if (pageState === 'pending') return <PendingScreen />;
  if (pageState === 'rejected') return <RejectedScreen />;

  // pageState === 'approved'
  if (!affiliate) return <LoadingScreen />;

  const referralLink = `${window.location.origin}/?ref=${affiliate.code}`;

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#0D1B2A]">Affiliate Dashboard</h1>
          <p className="text-[#6B7280] mt-1">
            Welcome back, <span className="font-medium text-[#0D1B2A]">{affiliate.name}</span>
          </p>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={MousePointerClick}
            label="Total Clicks"
            value={stats.totalClicks.toLocaleString()}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={ShoppingBag}
            label="Total Conversions"
            value={stats.totalConversions.toLocaleString()}
            color="bg-purple-100 text-purple-600"
          />
          <StatCard
            icon={DollarSign}
            label="Total Earned"
            value={formatCurrency(stats.totalEarned)}
            color="bg-green-100 text-green-600"
          />
          <StatCard
            icon={Clock}
            label="Pending Balance"
            value={formatCurrency(stats.pendingBalance)}
            color="bg-yellow-100 text-yellow-600"
          />
        </div>

        {/* ── Referral tools ────────────────────────────────────────── */}
        <div className="glass rounded-2xl border border-[var(--color-border)] p-6 space-y-5">
          <h2 className="text-lg font-bold text-[#0D1B2A]">Your Referral Tools</h2>

          {/* Code */}
          <div>
            <p className="text-xs uppercase tracking-wide font-medium text-[#6B7280] mb-2">
              Referral Code
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0 bg-gray-50 border border-[var(--color-border)] rounded-xl px-4 py-3">
                <span className="font-mono text-lg font-bold tracking-widest text-[#0D1B2A]">
                  {affiliate.code}
                </span>
              </div>
              <CopyButton value={affiliate.code} label="Copy Code" />
            </div>
          </div>

          {/* Link */}
          <div>
            <p className="text-xs uppercase tracking-wide font-medium text-[#6B7280] mb-2">
              Referral Link
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0 bg-gray-50 border border-[var(--color-border)] rounded-xl px-4 py-3 overflow-hidden">
                <span className="font-mono text-sm text-[#0D1B2A] truncate block">{referralLink}</span>
              </div>
              <CopyButton value={referralLink} label="Copy Link" />
            </div>
          </div>
        </div>

        {/* ── Recent Conversions ────────────────────────────────────── */}
        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-bold text-[#0D1B2A]">Recent Conversions</h2>
            <p className="text-sm text-[#6B7280] mt-0.5">Last 10 referred orders</p>
          </div>

          {conversions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ShoppingBag className="h-8 w-8 text-[#6B7280] mx-auto mb-3 opacity-40" />
              <p className="text-[#6B7280] text-sm">No conversions yet.</p>
              <p className="text-xs text-[#6B7280] mt-1 opacity-70">
                Share your referral link to start earning commissions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[var(--color-border)]">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Order #
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Date
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Order Total
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Commission
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {conversions.map((conv) => (
                    <tr key={conv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-[#0D1B2A]">
                        {conv.order ? `#${conv.order.order_number}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-[#6B7280]">
                        {formatDate(conv.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right text-[#0D1B2A]">
                        {formatCurrency(conv.order_total)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-[#0D1B2A]">
                        {formatCurrency(conv.commission_amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ConversionStatusBadge status={conv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Payout History ────────────────────────────────────────── */}
        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-bold text-[#0D1B2A]">Payout History</h2>
            <p className="text-sm text-[#6B7280] mt-0.5">Last 10 payouts</p>
          </div>

          {payouts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <DollarSign className="h-8 w-8 text-[#6B7280] mx-auto mb-3 opacity-40" />
              <p className="text-[#6B7280] text-sm">No payouts yet.</p>
              <p className="text-xs text-[#6B7280] mt-1 opacity-70">
                Payouts are processed during the first week of each month.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[var(--color-border)]">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Date
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Amount
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Method
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-[#6B7280]">{formatDate(payout.created_at)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-[#0D1B2A]">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-6 py-4 text-[#0D1B2A] capitalize">{payout.method}</td>
                      <td className="px-6 py-4 text-[#6B7280]">{payout.reference ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Payout Info ───────────────────────────────────────────── */}
        <div className="glass rounded-2xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-bold text-[#0D1B2A] mb-4">Payout Information</h2>

          <div className="space-y-3 mb-5">
            <div className="flex items-start gap-3">
              <span className="text-xs uppercase tracking-wide font-semibold text-[#6B7280] w-28 shrink-0 pt-0.5">
                Method
              </span>
              <span className="text-[#0D1B2A] text-sm capitalize">
                {affiliate.payout_method ?? (
                  <span className="text-[#6B7280] italic">Not set</span>
                )}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xs uppercase tracking-wide font-semibold text-[#6B7280] w-28 shrink-0 pt-0.5">
                Details
              </span>
              <span className="text-[#0D1B2A] text-sm break-all">
                {affiliate.payout_details ?? (
                  <span className="text-[#6B7280] italic">Not set</span>
                )}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#6B7280] border-t border-[var(--color-border)] pt-4">
            To update your payout information, contact{' '}
            <a
              href="mailto:NexalonCreations@gmail.com"
              className="text-[var(--color-primary)] hover:underline"
            >
              NexalonCreations@gmail.com
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
