import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MousePointerClick,
  ShoppingBag,
  DollarSign,
  Clock,
  Copy,
  Check,
  XCircle,
  TrendingUp,
  Handshake,
  ArrowRight,
  ArrowUp,
  Trophy,
  Lock,
  X,
  Tag,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Affiliate, AffiliateConversion, AffiliatePayout } from '../../types';

interface MilestoneTier {
  id: string;
  conversions_required: number;
  commission_rate: number;
  label: string;
  description: string;
  display_order: number;
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
    reversed: { label: 'Reversed', classes: 'bg-gray-100 text-gray-500 border border-gray-200 line-through' },
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
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Handshake className="h-8 w-8 text-[#1677FF]" />
          </div>
          <h1 className="text-xl font-bold text-[#0D1B2A] mb-2">Affiliate Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Sign in with the email you used to apply. If you just got approved, use the link in your approval email.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#1677FF] text-white font-semibold rounded-xl hover:bg-[#1060d0] transition-colors text-sm"
          >
            Sign In to Dashboard
          </Link>
          <Link
            to="/affiliate/apply"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Apply to Become an Affiliate
          </Link>
        </div>
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
  const [customerDiscountRate, setCustomerDiscountRate] = useState<number>(0);

  // Password setup state (shown when affiliate has no password yet)
  const [needsPassword, setNeedsPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalConversions: 0,
    conversionRate: 0,
    totalEarned: 0,
    pendingBalance: 0,
  });
  const [conversions, setConversions] = useState<AffiliateConversion[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [campaignStats, setCampaignStats] = useState<{ sub_id: string | null; count: number }[]>([]);

  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'payouts'>('overview');

  // Milestones
  const [milestones, setMilestones] = useState<MilestoneTier[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Payout info editing
  const [payoutMethod, setPayoutMethod] = useState('');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);
  const [payoutError, setPayoutError] = useState('');

  const loadDashboard = useCallback(async (affiliateRecord: Affiliate) => {
    const affiliateId = affiliateRecord.id;

    const { data: settingsData } = await supabase
      .from('affiliate_settings')
      .select('commission_rate, customer_discount_rate')
      .eq('id', 1)
      .single();
    if (settingsData) {
      setGlobalCommissionRate(settingsData.commission_rate);
      setCustomerDiscountRate(settingsData.customer_discount_rate ?? 0);
    }

    // Fetch milestone tiers
    const { data: tierData } = await supabase
      .from('affiliate_milestone_tiers')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (tierData) setMilestones(tierData as MilestoneTier[]);

    const [clicksRes, conversionsRes, payoutsRes, campaignRes] = await Promise.all([
      supabase
        .from('affiliate_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', affiliateId),
      supabase
        .from('affiliate_conversions')
        .select('id, affiliate_id, order_id, order_total, commission_amount, status, payout_id, created_at, order:orders(order_number, created_at, total, guest_name, guest_email, items:order_items(product_name, quantity))')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('affiliate_clicks')
        .select('sub_id')
        .eq('affiliate_id', affiliateId),
    ]);

    // Build campaign breakdown from sub_id counts
    const rawClicks = (campaignRes.data ?? []) as { sub_id: string | null }[];
    const campaignMap: Record<string, number> = {};
    for (const row of rawClicks) {
      const key = row.sub_id ?? '(direct link)';
      campaignMap[key] = (campaignMap[key] || 0) + 1;
    }
    const campaigns = Object.entries(campaignMap)
      .map(([sub_id, count]) => ({ sub_id: sub_id === '(direct link)' ? null : sub_id, count }))
      .sort((a, b) => b.count - a.count);
    setCampaignStats(campaigns);

    const totalClicks = clicksRes.count ?? 0;
    const allConversions = (conversionsRes.data ?? []) as unknown as AffiliateConversion[];

    const totalEarned = allConversions
      .filter((c) => c.status !== 'pending' && c.status !== 'reversed')
      .reduce((sum, c) => sum + c.commission_amount, 0);

    const pendingBalance = allConversions
      .filter((c) => c.status === 'pending' || c.status === 'approved')
      .reduce((sum, c) => sum + c.commission_amount, 0);

    const conversionRate = totalClicks > 0
      ? (allConversions.length / totalClicks) * 100
      : 0;

    setStats({ totalClicks, totalConversions: allConversions.length, conversionRate, totalEarned, pendingBalance });
    setConversions(allConversions);
    setPayouts((payoutsRes.data ?? []) as AffiliatePayout[]);

    // Auto-unlock: check if affiliate has crossed a milestone tier
    if (tierData && tierData.length > 0) {
      const completedConversions = allConversions.filter(c => c.status !== 'reversed').length;
      const earned = [...(tierData as MilestoneTier[])]
        .filter(t => t.conversions_required <= completedConversions)
        .sort((a, b) => b.conversions_required - a.conversions_required)[0];
      const currentRate = affiliateRecord.commission_rate;
      if (earned && (!currentRate || earned.commission_rate > currentRate)) {
        await supabase
          .from('affiliates')
          .update({ commission_rate: earned.commission_rate })
          .eq('id', affiliateId);
        setAffiliate(prev => prev ? { ...prev, commission_rate: earned.commission_rate } : prev);
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setPageState('no-auth'); return; }

    let cancelled = false;

    // Failsafe: never stay stuck on loading spinner forever
    const failsafeTimer = setTimeout(() => {
      if (!cancelled) setPageState(prev => prev === 'loading' ? 'no-auth' : prev);
    }, 15000);

    (async () => {
      try {
        // First try matching by user_id (returning affiliates)
        let { data, error } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        // Fallback: match by email for newly registered affiliates whose
        // user_id hasn't been linked yet, then link them now
        if (!data && user.email) {
          const { data: byEmail } = await supabase
            .from('affiliates')
            .select('*')
            .eq('email', user.email.toLowerCase())
            .maybeSingle();

          if (byEmail && !byEmail.user_id) {
            // Link the user_id now that they've registered
            await supabase
              .from('affiliates')
              .update({ user_id: user.id })
              .eq('id', byEmail.id);
            data = { ...byEmail, user_id: user.id };
            error = null;
          } else if (byEmail) {
            data = byEmail;
            error = null;
          }
        }

        if (cancelled) return;
        if (error || !data) { setPageState('no-record'); return; }

        const record = data as Affiliate;
        setAffiliate(record);
        setPayoutMethod(record.payout_method ?? '');
        setPayoutDetails(record.payout_details ?? '');

        if (record.status === 'pending') { setPageState('pending'); return; }
        if (record.status === 'rejected' || record.status === 'suspended') { setPageState('rejected'); return; }
        if (record.status === 'approved') {
          try {
            await loadDashboard(record);
          } catch (dashErr) {
            console.error('[AffiliateDashboard] loadDashboard error:', dashErr);
          } finally {
            if (!cancelled) setPageState('approved');
          }
          // Show password prompt if they signed in via magic link / invite (no password set)
          if (!cancelled) {
            const identities = (user as any)?.identities ?? [];
            const hasEmailPassword = identities.some(
              (i: any) => i.provider === 'email' && i.identity_data?.email_verified
            );
            const lastSignIn = (user as any)?.last_sign_in_at;
            const createdAt = (user as any)?.created_at;
            const isFirstLogin = lastSignIn && createdAt &&
              Math.abs(new Date(lastSignIn).getTime() - new Date(createdAt).getTime()) < 60000;
            if (isFirstLogin || !hasEmailPassword) setNeedsPassword(true);
          }
          return;
        }
        setPageState('no-record');
      } catch (err) {
        console.error('[AffiliateDashboard] Load error:', err);
        if (!cancelled) setPageState('no-auth');
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(failsafeTimer);
    };
  }, [user, authLoading, loadDashboard]);

  useEffect(() => {
    if (pageState === 'no-record') navigate('/affiliate/apply', { replace: true });
  }, [pageState, navigate]);

  const handleSetPassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) { setPasswordError(error.message); return; }
    setPasswordSaved(true);
    setNeedsPassword(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSavePayoutInfo = async () => {
    if (!affiliate) return;
    if (!payoutMethod) { setPayoutError('Please select a payout method'); return; }
    if (!payoutDetails.trim()) { setPayoutError('Please enter your payout details (e.g. your handle or email)'); return; }
    setPayoutError('');
    setSavingPayout(true);
    const { error } = await supabase
      .from('affiliates')
      .update({ payout_method: payoutMethod, payout_details: payoutDetails.trim() })
      .eq('id', affiliate.id);
    setSavingPayout(false);
    if (error) { setPayoutError('Failed to save. Please try again.'); return; }
    setAffiliate(prev => prev ? { ...prev, payout_method: payoutMethod, payout_details: payoutDetails.trim() } : prev);
    setPayoutSaved(true);
    setTimeout(() => setPayoutSaved(false), 3000);
  };

  if (pageState === 'loading' || pageState === 'no-record') return <LoadingScreen />;
  if (pageState === 'no-auth') return <NotLoggedIn />;
  if (pageState === 'pending') return <PendingScreen />;
  if (pageState === 'rejected') return <RejectedScreen />;
  if (!affiliate) return <LoadingScreen />;

  const commissionRate = affiliate.commission_rate ?? globalCommissionRate;
  const referralLink = `${window.location.origin}/?ref=${affiliate.code}`;

  return (
    <div className="min-h-screen bg-[#F4F6F9]">

      {/* Set Password Banner */}
      {needsPassword && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <p className="font-semibold text-amber-800 mb-1">Set a password to log back in anytime</p>
            <p className="text-amber-700 text-sm mb-3">You logged in with a one-time link. Set a password now so you can sign in whenever you want.</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs font-medium text-amber-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
              <button
                onClick={handleSetPassword}
                disabled={passwordSaving}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {passwordSaving ? 'Saving...' : 'Save Password'}
              </button>
              <button
                onClick={() => setNeedsPassword(false)}
                className="px-4 py-2 text-amber-700 hover:text-amber-900 text-sm transition-colors"
              >
                Remind me later
              </button>
            </div>
            {passwordError && <p className="text-red-600 text-sm mt-2">{passwordError}</p>}
          </div>
        </div>
      )}

      {/* Password saved toast */}
      {passwordSaved && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <p className="text-green-700 font-medium text-sm">✓ Password saved! You can now log in at any time with your email and password.</p>
            <button onClick={() => setPasswordSaved(false)} className="text-green-500 hover:text-green-700 text-lg leading-none">×</button>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-white/15 border border-white/25 rounded-2xl px-5 py-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-xs font-medium">Your Commission</p>
                  <p className="text-white text-xl font-bold">{commissionRate}%</p>
                </div>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <ArrowUp className="h-4 w-4" />
                <span className="hidden sm:inline">Increase your Commission</span>
                <span className="sm:hidden">Upgrade</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'milestones', label: '🏆 Milestones' },
            { key: 'payouts', label: 'Payouts' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#1677FF] text-[#1677FF]'
                  : 'border-transparent text-gray-500 hover:text-[#0D1B2A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && <>

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
            sub={stats.totalClicks > 0 ? `${stats.conversionRate.toFixed(1)}% conversion rate` : 'Referred orders'}
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
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              <DollarSign className="h-4 w-4 text-[#1677FF]" />
              <div>
                <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">Your Commission</p>
                <p className="text-sm font-bold text-[#1677FF]">{commissionRate}% per sale</p>
              </div>
            </div>
            {customerDiscountRate > 0 && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                <Tag className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-[10px] text-green-500 font-semibold uppercase tracking-wide">Customer Discount</p>
                  <p className="text-sm font-bold text-green-700">{customerDiscountRate}% off their order</p>
                </div>
              </div>
            )}
          </div>

          {/* Campaign breakdown — only show if sub_id data exists */}
          {campaignStats.length > 1 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Clicks by Campaign</p>
              <div className="space-y-2">
                {campaignStats.map((c) => {
                  const total = campaignStats.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                  return (
                    <div key={c.sub_id ?? '__direct'} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24 truncate font-mono">
                        {c.sub_id ?? 'direct'}
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1677FF] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{c.count}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Add <span className="font-mono text-[#1677FF]">?sub=instagram</span> (or tiktok, youtube, etc.) to your link to track which platform drives traffic.
              </p>
            </div>
          )}
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
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Items</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Commission</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {conversions.map((conv) => {
                    const name = conv.order?.guest_name || conv.order?.guest_email || '-';
                    const initials = conv.order?.guest_name
                      ? conv.order.guest_name.trim().split(/\s+/).map((w: string) => w[0].toUpperCase()).slice(0, 2).join('. ') + '.'
                      : name;
                    const items = conv.order?.items ?? [];
                    const itemSummary = items.length > 0
                      ? items.map((i: { product_name: string; quantity: number }) =>
                          `${i.quantity}x ${i.product_name}`
                        ).join(', ')
                      : '-';
                    return (
                      <tr key={conv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-[#0D1B2A]">
                          {conv.order ? `#${conv.order.order_number}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{initials}</td>
                        <td className="px-6 py-4 text-gray-500 max-w-[180px] truncate" title={itemSummary}>{itemSummary}</td>
                        <td className="px-6 py-4 text-gray-500">{formatDate(conv.created_at)}</td>
                        <td className="px-6 py-4 text-right font-bold text-[#1677FF]">{formatCurrency(conv.commission_amount)}</td>
                        <td className="px-6 py-4 text-center"><ConversionStatusBadge status={conv.status} /></td>
                      </tr>
                    );
                  })}
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
                      <td className="px-6 py-4 text-gray-500">{payout.reference ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payout Info */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-[#0D1B2A] mb-1">Payout Information</h2>
          <p className="text-xs text-gray-400 mb-5">Tell us how you want to be paid so we can send your commissions.</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Payout Method</label>
              <select
                value={payoutMethod}
                onChange={e => setPayoutMethod(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-[#0D1B2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent"
              >
                <option value="">Select method…</option>
                <option value="cash_app">Cash App</option>
                <option value="venmo">Venmo</option>
                <option value="paypal">PayPal</option>
                <option value="zelle">Zelle</option>
                <option value="check">Check</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {payoutMethod === 'cash_app' ? 'Your $Cashtag' :
                 payoutMethod === 'venmo' ? 'Your @handle' :
                 payoutMethod === 'paypal' ? 'Your PayPal email' :
                 payoutMethod === 'zelle' ? 'Your phone or email' :
                 payoutMethod === 'check' ? 'Name on check' :
                 payoutMethod === 'bank_transfer' ? 'Account details' :
                 'Your details'}
              </label>
              <input
                type="text"
                value={payoutDetails}
                onChange={e => setPayoutDetails(e.target.value)}
                placeholder={
                  payoutMethod === 'cash_app' ? '$YourCashtag' :
                  payoutMethod === 'venmo' ? '@yourhandle' :
                  payoutMethod === 'paypal' ? 'email@example.com' :
                  payoutMethod === 'zelle' ? 'phone or email' :
                  'Enter details'
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-[#0D1B2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent"
              />
            </div>
          </div>

          {payoutError && (
            <p className="text-red-500 text-sm mb-3">{payoutError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSavePayoutInfo}
              disabled={savingPayout}
              className="px-5 py-2.5 bg-[#1677FF] hover:bg-[#1060d0] text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {savingPayout ? 'Saving…' : 'Save Payout Info'}
            </button>
            {payoutSaved && (
              <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                <Check className="h-4 w-4" /> Saved!
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 border-t border-gray-100 pt-4 mt-4">
            Payouts are processed during the first week of each month for approved balances. Questions?{' '}
            <a href="mailto:NexalonCreations@gmail.com" className="text-[#1677FF] hover:underline font-medium">
              NexalonCreations@gmail.com
            </a>
          </p>
        </div>

        </> /* end overview tab */}

        {/* ── MILESTONES TAB ── */}
        {activeTab === 'milestones' && (() => {
          const completedConversions = conversions.filter(c => c.status !== 'reversed').length;
          // Use DB tiers if available, else show defaults so the UI always renders
          const displayTiers: MilestoneTier[] = milestones.length > 0 ? milestones : [
            { id: '__starter',    conversions_required: 0,  commission_rate: 5,  label: 'Starter',     description: 'Your starting commission rate when you join the program.', display_order: 0, is_active: true },
            { id: '__rising',     conversions_required: 20, commission_rate: 7,  label: 'Rising Star', description: 'Refer 20 orders to unlock 7% commission. Keep growing!',         display_order: 1, is_active: true },
            { id: '__elite',      conversions_required: 45, commission_rate: 10, label: 'Elite',       description: 'Refer 45 total orders to unlock the maximum 10% commission.',   display_order: 2, is_active: true },
          ];
          const maxRate = Math.max(...displayTiers.map(m => m.commission_rate));
          const isMaxed = commissionRate >= maxRate;
          const nextTier = displayTiers.find(t => completedConversions < t.conversions_required);
          const ordersToNext = nextTier ? nextTier.conversions_required - completedConversions : 0;

          return (
            <div className="space-y-4">
              {/* Header card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <h2 className="text-lg font-bold text-[#0D1B2A]">Commission Milestones</h2>
                    </div>
                    <p className="text-sm text-gray-500 max-w-md">
                      Refer more orders, unlock higher rates permanently. Upgrades apply automatically the moment you qualify.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-0.5">Your current rate</p>
                    <p className="text-4xl font-black text-[#1677FF]">{commissionRate}%</p>
                    {isMaxed
                      ? <p className="text-xs text-green-600 font-semibold mt-0.5">Max rate achieved!</p>
                      : <p className="text-xs text-gray-400 mt-0.5">{ordersToNext} order{ordersToNext !== 1 ? 's' : ''} to next tier</p>
                    }
                  </div>
                </div>
                {/* Overall progress bar toward next tier */}
                {!isMaxed && nextTier && nextTier.conversions_required > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{completedConversions} referrals</span>
                      <span>{nextTier.conversions_required} for {nextTier.label}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1677FF] to-[#0D3B8C] transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.round((completedConversions / nextTier.conversions_required) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Your Progress Path</p>

                <div>
                  {displayTiers.map((tier, i) => {
                    const isLast = i === displayTiers.length - 1;
                    const isUnlocked = completedConversions >= tier.conversions_required;
                    const isCurrent = commissionRate === tier.commission_rate;
                    const isNext = !isUnlocked && displayTiers.slice(0, i).every(t => completedConversions >= t.conversions_required);
                    const prevRequired = i > 0 ? displayTiers[i - 1].conversions_required : 0;
                    const segmentProgress = tier.conversions_required === 0
                      ? 100
                      : Math.min(100, Math.max(0, Math.round(((completedConversions - prevRequired) / (tier.conversions_required - prevRequired)) * 100)));

                    return (
                      <div key={tier.id} className="flex gap-4 sm:gap-6">
                        {/* Left column: circle + connecting line */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          {/* Circle */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 shadow-md transition-all z-10 ${
                            isUnlocked
                              ? 'bg-green-500 border-green-400 text-white'
                              : isCurrent
                              ? 'bg-[#1677FF] border-blue-400 text-white'
                              : isNext
                              ? 'bg-yellow-400 border-yellow-300 text-yellow-900'
                              : 'bg-gray-100 border-gray-200 text-gray-300'
                          }`}>
                            {isUnlocked
                              ? <Check className="h-5 w-5 stroke-[3]" />
                              : isNext
                              ? <Trophy className="h-5 w-5" />
                              : <Lock className="h-4 w-4" />
                            }
                          </div>
                          {/* Connector line to next node */}
                          {!isLast && (
                            <div className="w-1 flex-1 my-1 rounded-full overflow-hidden bg-gray-100 min-h-[40px]">
                              <div
                                className={`w-full transition-all duration-700 rounded-full ${isUnlocked ? 'bg-green-400' : 'bg-gray-200'}`}
                                style={{ height: isUnlocked ? '100%' : '0%' }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Right column: content */}
                        <div className={`flex-1 mb-4 ${isLast ? '' : 'pb-2'}`}>
                          <div className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                            isCurrent   ? 'border-[#1677FF] bg-blue-50 shadow-sm shadow-blue-100' :
                            isUnlocked  ? 'border-green-200 bg-green-50' :
                            isNext      ? 'border-yellow-200 bg-yellow-50 shadow-sm shadow-yellow-100' :
                            'border-gray-100 bg-gray-50'
                          }`}>
                            {/* Top row: name + badges + rate */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-bold text-[#0D1B2A] text-base">{tier.label}</span>
                                  {isCurrent && <span className="text-[10px] bg-[#1677FF] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Current</span>}
                                  {isUnlocked && !isCurrent && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Unlocked</span>}
                                  {isNext && <span className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Up Next</span>}
                                </div>
                                {tier.description && <p className="text-xs text-gray-500 leading-relaxed">{tier.description}</p>}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-2xl sm:text-3xl font-black leading-none ${isUnlocked || isCurrent ? 'text-[#1677FF]' : 'text-gray-300'}`}>
                                  {tier.commission_rate}%
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">commission</p>
                              </div>
                            </div>

                            {/* Stats + progress */}
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                              {tier.conversions_required === 0 ? (
                                <span className="text-green-600 font-semibold">Starting tier — no orders required</span>
                              ) : isUnlocked ? (
                                <span className="flex items-center gap-1 text-green-600 font-semibold">
                                  <Check className="h-3 w-3 stroke-[3]" /> Completed at {tier.conversions_required} orders
                                </span>
                              ) : (
                                <span>
                                  <span className="font-bold text-[#0D1B2A]">{completedConversions}</span>
                                  <span className="text-gray-400"> / {tier.conversions_required} orders</span>
                                  {isNext && (
                                    <span className="text-yellow-600 font-bold"> — {tier.conversions_required - completedConversions} to go!</span>
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Progress bar for active/locked tiers */}
                            {!isUnlocked && tier.conversions_required > 0 && (
                              <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-200">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${isNext ? 'bg-yellow-400' : 'bg-gray-200'}`}
                                  style={{ width: `${isNext && segmentProgress > 0 ? Math.max(3, segmentProgress) : 0}%` }}
                                />
                              </div>
                            )}
                            {isUnlocked && (
                              <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                                <div className="h-full w-full bg-green-400 rounded-full" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-400 text-center border-t border-gray-100 pt-4 mt-2">
                  Commission upgrades apply automatically when you hit the threshold. Keep sharing your link!
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── PAYOUTS TAB ── */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            {/* Payout History */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-[#0D1B2A]">Payout History</h2>
                <p className="text-xs text-gray-400 mt-0.5">All payouts processed to you</p>
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
                          <td className="px-6 py-4 text-gray-500">{payout.reference ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payout Info */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-bold text-[#0D1B2A] mb-1">Payout Information</h2>
              <p className="text-xs text-gray-400 mb-5">Tell us how you want to be paid so we can send your commissions.</p>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Payout Method</label>
                  <select
                    value={payoutMethod}
                    onChange={e => setPayoutMethod(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-[#0D1B2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent"
                  >
                    <option value="">Select method…</option>
                    <option value="cash_app">Cash App</option>
                    <option value="venmo">Venmo</option>
                    <option value="paypal">PayPal</option>
                    <option value="zelle">Zelle</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {payoutMethod === 'cash_app' ? 'Your $Cashtag' :
                     payoutMethod === 'venmo' ? 'Your @handle' :
                     payoutMethod === 'paypal' ? 'Your PayPal email' :
                     payoutMethod === 'zelle' ? 'Your phone or email' :
                     payoutMethod === 'check' ? 'Name on check' :
                     payoutMethod === 'bank_transfer' ? 'Account details' :
                     'Your details'}
                  </label>
                  <input
                    type="text"
                    value={payoutDetails}
                    onChange={e => setPayoutDetails(e.target.value)}
                    placeholder={
                      payoutMethod === 'cash_app' ? '$YourCashtag' :
                      payoutMethod === 'venmo' ? '@yourhandle' :
                      payoutMethod === 'paypal' ? 'email@example.com' :
                      payoutMethod === 'zelle' ? 'phone or email' :
                      'Enter details'
                    }
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-[#0D1B2A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent"
                  />
                </div>
              </div>
              {payoutError && <p className="text-red-500 text-sm mb-3">{payoutError}</p>}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSavePayoutInfo}
                  disabled={savingPayout}
                  className="px-5 py-2.5 bg-[#1677FF] hover:bg-[#1060d0] text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {savingPayout ? 'Saving…' : 'Save Payout Info'}
                </button>
                {payoutSaved && (
                  <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                    <Check className="h-4 w-4" /> Saved!
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 border-t border-gray-100 pt-4 mt-4">
                Payouts are processed during the first week of each month for approved balances. Questions?{' '}
                <a href="mailto:NexalonCreations@gmail.com" className="text-[#1677FF] hover:underline font-medium">
                  NexalonCreations@gmail.com
                </a>
              </p>
            </div>
          </div>
        )}

      </div>

      {/* ── UPGRADE MODAL ── */}
      {showUpgradeModal && (() => {
        const completedConversions = conversions.filter(c => c.status !== 'reversed').length;
        const maxRate = milestones.length > 0 ? Math.max(...milestones.map(m => m.commission_rate)) : commissionRate;
        const isMaxed = commissionRate >= maxRate;
        const nextTier = milestones.find(t => completedConversions < t.conversions_required);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-[#1677FF] to-[#0D3B8C] px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-yellow-300" />
                    <h2 className="text-white font-bold text-lg">Commission Milestones</h2>
                  </div>
                  <button onClick={() => setShowUpgradeModal(false)} className="text-white/70 hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {/* Current rate big display */}
                <div className="bg-white/15 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-xs">Your current rate</p>
                    <p className="text-white text-3xl font-black">{commissionRate}%</p>
                  </div>
                  {isMaxed ? (
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-full">Max Rate Achieved!</span>
                  ) : nextTier ? (
                    <div className="text-right">
                      <p className="text-white/70 text-xs">Next tier</p>
                      <p className="text-yellow-300 text-xl font-black">{nextTier.commission_rate}%</p>
                      <p className="text-white/60 text-xs">{nextTier.conversions_required - completedConversions} orders away</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="p-6">
                {isMaxed ? (
                  <div className="text-center mb-5 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-yellow-800 font-bold text-base">You've reached the top!</p>
                    <p className="text-yellow-700 text-sm mt-1">You're already earning the maximum commission rate. Keep referring to grow your earnings.</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                    Refer more orders and unlock higher commission rates permanently. Each milestone you hit upgrades your rate automatically.
                  </p>
                )}

                {/* Tier list */}
                {milestones.length > 0 ? (
                  <div className="space-y-2 mb-6">
                    {milestones.map((tier, i) => {
                      const isUnlocked = completedConversions >= tier.conversions_required;
                      const isCurrent = commissionRate === tier.commission_rate;
                      const isNext = !isUnlocked && milestones.slice(0, i).every(t => completedConversions >= t.conversions_required);
                      return (
                        <div key={tier.id} className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                          isCurrent ? 'border-[#1677FF] bg-blue-50' :
                          isUnlocked ? 'border-green-200 bg-green-50' :
                          isNext ? 'border-yellow-200 bg-yellow-50' :
                          'border-gray-100 bg-gray-50'
                        }`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isUnlocked ? 'bg-green-500 text-white' :
                            isNext ? 'bg-yellow-400 text-yellow-900' :
                            'bg-gray-200 text-gray-400'
                          }`}>
                            {isUnlocked ? <Check className="h-4 w-4" /> : isNext ? <Trophy className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[#0D1B2A] text-sm">{tier.label}</span>
                              {isCurrent && <span className="text-xs bg-[#1677FF] text-white px-2 py-0.5 rounded-full font-semibold">Current</span>}
                              {isNext && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-semibold border border-yellow-200">Up Next</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {tier.conversions_required === 0 ? 'Starting rate — no orders required' : `Requires ${tier.conversions_required} referred orders`}
                              {isUnlocked && !isCurrent ? ' (completed)' : ''}
                            </p>
                            {isNext && (
                              <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-400 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(2, Math.round((completedConversions / tier.conversions_required) * 100)))}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <span className={`text-2xl font-black flex-shrink-0 ${isUnlocked || isCurrent ? 'text-[#1677FF]' : 'text-gray-300'}`}>
                            {tier.commission_rate}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
                    <p className="text-gray-400 text-sm">Milestone tiers are being set up. Check back soon.</p>
                  </div>
                )}

                <button
                  onClick={() => { setShowUpgradeModal(false); setActiveTab('milestones'); }}
                  className="w-full py-3 bg-[#1677FF] hover:bg-[#1060d0] text-white font-bold rounded-xl transition-colors"
                >
                  {isMaxed ? 'View My Milestones' : 'See My Full Progress →'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
