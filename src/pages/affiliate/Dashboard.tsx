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
  TrendingUp,
  Handshake,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Affiliate, AffiliateConversion, AffiliatePayout } from '../../types';

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
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <TrendingUp className="h-4 w-4 text-gray-300" />
      </div>
      <p className="text-2xl font-bold text-[#0D1B2A]">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ConversionStatusBadge({ status }: { status: AffiliateConversion['status'] }) {
  const map: Record<AffiliateConversion['status'], { label: string; classes: string }> = {
    pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
    approved: { label: 'Approved', classes: 'bg-blue-100 text-blue-800 border border-blue-200' },
    paid: { label: 'Paid', classes: 'bg-green-100 text-green-800 border border-green-200' },
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
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
        copied
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-white border-gray-200 text-[#0D1B2A] hover:bg-gray-50 hover:border-gray-300'
      }`}
    >
      {copied ? (
        <><Check className="h-3.5 w-3.5" /> Copied!</>
      ) : (
        <><Copy className="h-3.5 w-3.5" /> {label}</>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Status screens
// ---------------------------------------------------------------------------

function NotLoggedIn() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full text-center bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="h-8 w-8 text-[#1677FF]" />
        </div>
        <h1 className="text-xl font-bold text-[#0D1B2A] mb-2">Sign in required</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Please sign in to access your affiliate dashboard.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1677FF] text-white font-semibold rounded-xl hover:bg-[#1060d0] transition-colors text-sm"
        >
          Go to Login <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function PendingScreen() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full text-center bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
        <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <h1 className="text-xl font-bold text-[#0D1B2A] mb-2">Application Under Review</h1>
        <p className="text-gray-500 text-sm">
          Your affiliate application is being reviewed. We'll notify you by email within 1–2 business
          days once a decision has been made.
        </p>
      </div>
    </div>
  );
}

function RejectedScreen() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full text-center bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-[#0D1B2A] mb-2">Application Not Approved</h1>
        <p className="text-gray-500 text-sm mb-6">
          Unfortunately your affiliate application was not approved at this time. If you have
          questions, please reach out to us.
        </p>
        <a
          href="mailto:NexalonCreations@gmail.com"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1677FF] text-white font-semibold rounded-xl hover:bg-[#1060d0] transition-colors text-sm"
        >
          Contact Us
        </a>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1677FF] border-t-transparent rounded-full animate-spin" />
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
  const [globalCommissionRate, setGlobalCommissionRate] = useState<number>(10);
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalConversions: 0,
    totalEarned: 0,
    pendingBalance: 0,
  });
  const [conversions, setConversions] = useState<AffiliateConversion[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);

  const loadDashboard = useCallback(async (affiliateRecord: Affiliate) => {
    const affiliateId = affiliateRecord.id;

    const { data: settingsData } = await supabase
      .from('affiliate_settings')
      .select('commission_rate')
      .eq('id', 1)
      .single();
    if (settingsData) setGlobalCommissionRate(settingsData.commission_rate);

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

    const totalClicks = clicksRes.count ?? 0;
    const allConversions = (conversionsRes.data ?? []) as unknown as AffiliateConversion[];

    const totalEarned = allConversions
      .filter((c) => c.status !== 'pending')
      .reduce((sum, c) => sum + c.commission_amount, 0);

    const pendingBalance = allConversions
      .filter((c) => c.status === 'pending' || c.status === 'approved')
      .reduce((sum, c) => sum + c.commission_amount, 0);

    setStats({ totalClicks, totalConversions: allConversions.length, totalEarned, pendingBalance });
    setConversions(allConversions);
    setPayouts((payoutsRes.data ?? []) as AffiliatePayout[]);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setPageState('no-auth'); return; }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) { setPageState('no-record'); return; }

      const record = data as Affiliate;
      setAffiliate(record);

      if (record.status === 'pending') setPageState('pending');
      else if (record.status === 'rejected' || record.status === 'suspended') setPageState('rejected');
      else if (record.status === 'approved') { await loadDashboard(record); setPageState('approved'); }
      else setPageState('no-record');
    })();

    return () => { cancelled = true; };
  }, [user, authLoading, loadDashboard]);

  useEffect(() => {
    if (pageState === 'no-record') navigate('/affiliate/apply', { replace: true });
  }, [pageState, navigate]);

  if (pageState === 'loading' || pageState === 'no-record') return <LoadingScreen />;
  if (pageState === 'no-auth') return <NotLoggedIn />;
  if (pageState === 'pending') return <PendingScreen />;
  if (pageState === 'rejected') return <RejectedScreen />;
  if (!affiliate) return <LoadingScreen />;

  const commissionRate = affiliate.commission_rate ?? globalCommissionRate;
  const referralLink = `${window.location.origin}/?ref=${affiliate.code}`;

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#1677FF] to-[#0D3B8C]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Handshake className="h-5 w-5 text-blue-200" />
                <span className="text-blue-200 text-sm font-medium">Affiliate Partner</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Welcome back, {affiliate.name.split(' ')[0]}
              </h1>
              <p className="text-blue-100 mt-1 text-sm">
                Here's how your referrals are performing
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/15 border border-white/25 rounded-2xl px-5 py-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium">Your Commission</p>
                <p className="text-white text-xl font-bold">{commissionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={MousePointerClick}
            label="Total Clicks"
            value={stats.totalClicks.toLocaleString()}
            sub="All time"
            accent="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={ShoppingBag}
            label="Conversions"
            value={stats.totalConversions.toLocaleString()}
            sub="Referred orders"
            accent="bg-purple-100 text-purple-600"
          />
          <StatCard
            icon={DollarSign}
            label="Total Earned"
            value={formatCurrency(stats.totalEarned)}
            sub="Confirmed only"
            accent="bg-green-100 text-green-600"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={formatCurrency(stats.pendingBalance)}
            sub="Awaiting confirmation"
            accent="bg-yellow-100 text-yellow-600"
          />
        </div>

        {/* Referral Tools */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-[#0D1B2A] mb-5">Your Referral Tools</h2>
          <div className="space-y-4">
            {/* Code */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-[#F4F6F9] rounded-xl border border-gray-200">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">Referral Code</p>
                <p className="font-mono text-xl font-bold tracking-widest text-[#1677FF]">{affiliate.code}</p>
              </div>
              <CopyButton value={affiliate.code} label="Copy Code" />
            </div>
            {/* Link */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-[#F4F6F9] rounded-xl border border-gray-200">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">Referral Link</p>
                <p className="font-mono text-sm text-[#0D1B2A] truncate">{referralLink}</p>
              </div>
              <CopyButton value={referralLink} label="Copy Link" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Customers who use your code or link get a discount — you earn {commissionRate}% on every order they place.
          </p>
        </div>

        {/* Recent Conversions */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0D1B2A]">Recent Conversions</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 10 referred orders</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300" />
          </div>

          {conversions.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-[#0D1B2A] font-medium">No conversions yet</p>
              <p className="text-sm text-gray-400 mt-1">Share your referral link to start earning.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Order</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Order Total</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Commission</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {conversions.map((conv) => (
                    <tr key={conv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#0D1B2A]">
                        {conv.order ? `#${conv.order.order_number}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(conv.created_at)}</td>
                      <td className="px-6 py-4 text-right text-[#0D1B2A]">{formatCurrency(conv.order_total)}</td>
                      <td className="px-6 py-4 text-right font-bold text-[#1677FF]">{formatCurrency(conv.commission_amount)}</td>
                      <td className="px-6 py-4 text-center"><ConversionStatusBadge status={conv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payout History */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-[#0D1B2A]">Payout History</h2>
            <p className="text-xs text-gray-400 mt-0.5">Last 10 payouts</p>
          </div>

          {payouts.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-[#0D1B2A] font-medium">No payouts yet</p>
              <p className="text-sm text-gray-400 mt-1">Payouts are processed during the first week of each month.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Method</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-500">{formatDate(payout.created_at)}</td>
                      <td className="px-6 py-4 text-right font-bold text-[#1677FF]">{formatCurrency(payout.amount)}</td>
                      <td className="px-6 py-4 text-[#0D1B2A] capitalize">{payout.method}</td>
                      <td className="px-6 py-4 text-gray-500">{payout.reference ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payout Info */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-[#0D1B2A] mb-4">Payout Information</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div className="p-4 bg-[#F4F6F9] rounded-xl border border-gray-200">
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">Method</p>
              <p className="text-[#0D1B2A] font-medium capitalize">
                {affiliate.payout_method ?? <span className="text-gray-400 italic font-normal">Not set</span>}
              </p>
            </div>
            <div className="p-4 bg-[#F4F6F9] rounded-xl border border-gray-200">
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">Details</p>
              <p className="text-[#0D1B2A] font-medium break-all">
                {affiliate.payout_details ?? <span className="text-gray-400 italic font-normal">Not set</span>}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
            To update your payout information, contact{' '}
            <a href="mailto:NexalonCreations@gmail.com" className="text-[#1677FF] hover:underline font-medium">
              NexalonCreations@gmail.com
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
