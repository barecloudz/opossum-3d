import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, RefreshCw, Settings, Save, Trash2, Trophy, Plus, Check } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { formatDate, formatPrice } from '../../lib/utils';
import type { Affiliate, AffiliateStatus, AffiliateConversion, AffiliateSettings } from '../../types';

interface MilestoneTier {
  id: string;
  conversions_required: number;
  commission_rate: number;
  label: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

type StatusFilter = 'all' | AffiliateStatus;

interface AffiliateStats {
  clicks: number;
  conversions: number;
  earnings: number;
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

function statusBadgeVariant(status: AffiliateStatus): 'warning' | 'success' | 'danger' | 'default' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'suspended':
      return 'default';
  }
}

export default function AdminAffiliates() {
  const navigate = useNavigate();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, AffiliateStats>>({});
  const [clicksMap, setClicksMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Program settings state
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  const [commissionRate, setCommissionRate] = useState('');
  const [discountRate, setDiscountRate] = useState('');
  const [minPayout, setMinPayout] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Milestone tiers state
  const [tiers, setTiers] = useState<MilestoneTier[]>([]);
  const [tierEdits, setTierEdits] = useState<Record<string, Partial<MilestoneTier>>>({});
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [deletingTier, setDeletingTier] = useState<string | null>(null);
  const [addingTier, setAddingTier] = useState(false);
  const [newTier, setNewTier] = useState({ label: '', conversions_required: '', commission_rate: '', description: '' });
  const [savingNewTier, setSavingNewTier] = useState(false);

  const fetchTiers = async () => {
    const { data } = await supabase
      .from('affiliate_milestone_tiers')
      .select('*')
      .order('display_order', { ascending: true });
    if (data) setTiers(data as MilestoneTier[]);
  };

  const handleSaveTier = async (tier: MilestoneTier) => {
    const edits = tierEdits[tier.id] ?? {};
    const updated = { ...tier, ...edits };
    setSavingTier(tier.id);
    try {
      const { error } = await supabase
        .from('affiliate_milestone_tiers')
        .update({
          label: updated.label,
          description: updated.description,
          conversions_required: Number(updated.conversions_required),
          commission_rate: Number(updated.commission_rate),
          is_active: updated.is_active,
        })
        .eq('id', tier.id);
      if (error) throw error;
      setTiers(prev => prev.map(t => t.id === tier.id ? { ...t, ...edits } : t));
      setTierEdits(prev => { const next = { ...prev }; delete next[tier.id]; return next; });
    } catch (err) {
      console.error('Error saving tier:', err);
      alert('Failed to save tier');
    } finally {
      setSavingTier(null);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!window.confirm('Delete this milestone tier? Affiliates who already unlocked it will keep their rate.')) return;
    setDeletingTier(tierId);
    try {
      const { error } = await supabase.from('affiliate_milestone_tiers').delete().eq('id', tierId);
      if (error) throw error;
      setTiers(prev => prev.filter(t => t.id !== tierId));
    } catch (err) {
      console.error('Error deleting tier:', err);
      alert('Failed to delete tier');
    } finally {
      setDeletingTier(null);
    }
  };

  const handleAddTier = async () => {
    if (!newTier.label.trim() || !newTier.conversions_required || !newTier.commission_rate) {
      alert('Label, conversions required, and commission rate are all required.');
      return;
    }
    setSavingNewTier(true);
    try {
      const { data, error } = await supabase
        .from('affiliate_milestone_tiers')
        .insert({
          label: newTier.label.trim(),
          description: newTier.description.trim() || null,
          conversions_required: Number(newTier.conversions_required),
          commission_rate: Number(newTier.commission_rate),
          display_order: tiers.length,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      setTiers(prev => [...prev, data as MilestoneTier]);
      setNewTier({ label: '', conversions_required: '', commission_rate: '', description: '' });
      setAddingTier(false);
    } catch (err) {
      console.error('Error adding tier:', err);
      alert('Failed to add tier');
    } finally {
      setSavingNewTier(false);
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('affiliate_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (data) {
      setSettings(data as AffiliateSettings);
      setCommissionRate(String(data.commission_rate));
      setDiscountRate(String(data.customer_discount_rate));
      setMinPayout(String(data.min_payout_threshold));
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from('affiliate_settings')
        .update({
          commission_rate: parseFloat(commissionRate) || 10,
          customer_discount_rate: parseFloat(discountRate) || 10,
          min_payout_threshold: parseFloat(minPayout) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
      if (error) throw error;
      await fetchSettings();
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (affiliateError) throw affiliateError;

      const affiliateList: Affiliate[] = affiliateData || [];
      setAffiliates(affiliateList);

      if (affiliateList.length === 0) return;

      const ids = affiliateList.map((a) => a.id);

      // Fetch conversions
      const { data: convData } = await supabase
        .from('affiliate_conversions')
        .select('affiliate_id, commission_amount, status')
        .in('affiliate_id', ids);

      // Fetch clicks counts per affiliate
      const { data: clickData } = await supabase
        .from('affiliate_clicks')
        .select('affiliate_id')
        .in('affiliate_id', ids);

      // Build stats map
      const stats: Record<string, AffiliateStats> = {};
      for (const id of ids) {
        stats[id] = { clicks: 0, conversions: 0, earnings: 0 };
      }

      for (const conv of (convData as AffiliateConversion[]) || []) {
        if (!stats[conv.affiliate_id]) continue;
        stats[conv.affiliate_id].conversions += 1;
        if (conv.status !== 'pending') {
          stats[conv.affiliate_id].earnings += conv.commission_amount;
        }
      }

      setStatsMap(stats);

      const clicks: Record<string, number> = {};
      for (const row of (clickData as { affiliate_id: string }[]) || []) {
        clicks[row.affiliate_id] = (clicks[row.affiliate_id] || 0) + 1;
      }
      setClicksMap(clicks);
    } catch (err) {
      console.error('Error fetching affiliates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSettings();
    fetchTiers();
  }, []);

  const handleApprove = async (affiliate: Affiliate) => {
    setActionLoading(affiliate.id);
    try {
      // Try to find a matching profile by email to link user_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', affiliate.email)
        .maybeSingle();

      // Stamp current global commission rate so future rate changes don't affect this affiliate
      const { data: settingsData } = await supabase
        .from('affiliate_settings')
        .select('commission_rate')
        .eq('id', 1)
        .single();
      const globalRate = settingsData?.commission_rate ?? 10;

      const updates: Partial<Affiliate> & { status: AffiliateStatus; user_id?: string; commission_rate?: number } = {
        status: 'approved',
        commission_rate: affiliate.commission_rate ?? globalRate,
      };
      if (profileData?.id) {
        updates.user_id = profileData.id;
      }

      const { error } = await supabase
        .from('affiliates')
        .update(updates)
        .eq('id', affiliate.id);

      if (error) throw error;

      setAffiliates((prev) =>
        prev.map((a) =>
          a.id === affiliate.id
            ? { ...a, status: 'approved', user_id: updates.user_id ?? a.user_id, commission_rate: updates.commission_rate ?? a.commission_rate }
            : a
        )
      );

      // Send approval email with one-click magic link — fire and forget
      supabase.auth.getSession().then(({ data: { session } }) => {
        fetch('/.netlify/functions/approve-affiliate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            affiliateId: affiliate.id,
            name: affiliate.name,
            email: affiliate.email,
            code: affiliate.code,
          }),
        }).catch(err => console.error('[Affiliates] Approval email failed:', err));
      });

    } catch (err) {
      console.error('Error approving affiliate:', err);
      alert('Failed to approve affiliate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (affiliate: Affiliate) => {
    if (!window.confirm(`Delete ${affiliate.name} (${affiliate.code})? This cannot be undone.`)) return;
    setActionLoading(affiliate.id + '-delete');
    try {
      const { error } = await supabase
        .from('affiliates')
        .delete()
        .eq('id', affiliate.id);
      if (error) throw error;
      setAffiliates((prev) => prev.filter((a) => a.id !== affiliate.id));
    } catch (err) {
      console.error('Error deleting affiliate:', err);
      alert('Failed to delete affiliate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (affiliate: Affiliate) => {
    setActionLoading(affiliate.id + '-reject');
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ status: 'rejected' })
        .eq('id', affiliate.id);

      if (error) throw error;

      setAffiliates((prev) =>
        prev.map((a) => (a.id === affiliate.id ? { ...a, status: 'rejected' } : a))
      );
    } catch (err) {
      console.error('Error rejecting affiliate:', err);
      alert('Failed to reject affiliate');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered =
    statusFilter === 'all'
      ? affiliates
      : affiliates.filter((a) => a.status === statusFilter);

  const countsByStatus = affiliates.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0D1B2A]">Affiliates</h1>
          <p className="text-gray-400 mt-1">{affiliates.length} total affiliates</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Program Settings Panel */}
      <Card className="mb-6">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-brand-neon" />
            <span className="text-[#0D1B2A] font-semibold">Program Settings</span>
            {settings && (
              <span className="text-xs text-gray-500 ml-2">
                Commission: {settings.commission_rate}% · Customer discount: {settings.customer_discount_rate}% · Min payout: ${settings.min_payout_threshold}
              </span>
            )}
          </div>
          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${settingsOpen ? 'rotate-90' : ''}`} />
        </button>

        {settingsOpen && (
          <div className="mt-5 pt-5 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Commission Rate (%)
              </label>
              <p className="text-xs text-gray-500 mb-2">% affiliates earn on each sale</p>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="100"
                placeholder="10"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Customer Discount Rate (%)
              </label>
              <p className="text-xs text-gray-500 mb-2">% discount customers get with affiliate code</p>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="100"
                placeholder="10"
                value={discountRate}
                onChange={(e) => setDiscountRate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Minimum Payout ($)
              </label>
              <p className="text-xs text-gray-500 mb-2">Minimum balance before payout (0 = no minimum)</p>
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={minPayout}
                onChange={(e) => setMinPayout(e.target.value)}
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button onClick={handleSaveSettings} isLoading={isSavingSettings} size="sm">
                <Save className="h-4 w-4 mr-1.5" />
                Save Settings
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Milestone Tiers Panel */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-[#0D1B2A] font-semibold">Commission Milestone Tiers</span>
            <span className="text-xs text-gray-500 ml-1">Affiliates auto-unlock higher rates as they hit these thresholds</span>
          </div>
          <button
            onClick={() => setAddingTier(!addingTier)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 text-[#1677FF] hover:bg-blue-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Tier
          </button>
        </div>

        {/* Tier rows */}
        <div className="space-y-3">
          {tiers.map((tier) => {
            const edits = tierEdits[tier.id] ?? {};
            const current = { ...tier, ...edits };
            const isDirty = Object.keys(edits).length > 0;

            return (
              <div key={tier.id} className={`border rounded-xl p-4 ${current.is_active ? 'border-gray-200 bg-gray-50' : 'border-dashed border-gray-300 bg-gray-100 opacity-60'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Label</label>
                    <input
                      type="text"
                      value={current.label}
                      onChange={(e) => setTierEdits(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], label: e.target.value } }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Conversions Required</label>
                    <input
                      type="number"
                      min="0"
                      value={current.conversions_required}
                      onChange={(e) => setTierEdits(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], conversions_required: Number(e.target.value) } }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Commission Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={current.commission_rate}
                      onChange={(e) => setTierEdits(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], commission_rate: Number(e.target.value) } }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={current.is_active}
                        onChange={(e) => setTierEdits(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], is_active: e.target.checked } }))}
                        className="rounded"
                      />
                      Active
                    </label>
                    {isDirty && (
                      <button
                        onClick={() => handleSaveTier(tier)}
                        disabled={savingTier === tier.id}
                        className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                        title="Save changes"
                      >
                        {savingTier === tier.id ? <span className="text-xs px-1">...</span> : <Check className="h-4 w-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTier(tier.id)}
                      disabled={deletingTier === tier.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Delete tier"
                    >
                      {deletingTier === tier.id ? <span className="text-xs">...</span> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-500 mb-1">Description (shown to affiliates)</label>
                  <input
                    type="text"
                    value={current.description ?? ''}
                    onChange={(e) => setTierEdits(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], description: e.target.value } }))}
                    placeholder="e.g. Refer 20 orders to unlock 7% commission!"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                {isDirty && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleSaveTier(tier)}
                      disabled={savingTier === tier.id}
                      className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#1677FF] text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {savingTier === tier.id ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setTierEdits(prev => { const next = { ...prev }; delete next[tier.id]; return next; })}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {tiers.length === 0 && !addingTier && (
            <p className="text-center text-gray-400 text-sm py-4">No milestone tiers configured. Run the SQL migration first, or add one manually above.</p>
          )}
        </div>

        {/* Add new tier form */}
        {addingTier && (
          <div className="mt-4 border-2 border-dashed border-blue-200 rounded-xl p-4 bg-blue-50">
            <p className="text-sm font-medium text-[#0D1B2A] mb-3">New Milestone Tier</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Label *</label>
                <input
                  type="text"
                  placeholder="e.g. Rising Star"
                  value={newTier.label}
                  onChange={(e) => setNewTier(prev => ({ ...prev, label: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Conversions Required *</label>
                <input
                  type="number"
                  min="0"
                  placeholder="20"
                  value={newTier.conversions_required}
                  onChange={(e) => setNewTier(prev => ({ ...prev, conversions_required: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Commission Rate (%) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="7"
                  value={newTier.commission_rate}
                  onChange={(e) => setNewTier(prev => ({ ...prev, commission_rate: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
              <input
                type="text"
                placeholder="e.g. Refer 20 orders to unlock 7% commission!"
                value={newTier.description}
                onChange={(e) => setNewTier(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddTier}
                disabled={savingNewTier}
                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-[#1677FF] text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {savingNewTier ? 'Adding...' : 'Add Tier'}
              </button>
              <button
                onClick={() => { setAddingTier(false); setNewTier({ label: '', conversions_required: '', commission_rate: '', description: '' }); }}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Program summary stats */}
      {affiliates.length > 0 && (() => {
        const allConvs = Object.values(statsMap);
        const totalPending = allConvs.reduce((s, a) => s + (a.earnings ?? 0), 0);
        const activeCount = affiliates.filter(a => a.status === 'approved').length;
        const totalClicks = Object.values(clicksMap).reduce((s, n) => s + n, 0);
        const totalConversions = allConvs.reduce((s, a) => s + a.conversions, 0);
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Active Affiliates', value: activeCount },
              { label: 'Total Clicks', value: totalClicks },
              { label: 'Total Conversions', value: totalConversions },
              { label: 'Commissions Owed', value: `$${totalPending.toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#0D1B2A]">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === 'all' ? affiliates.length : (countsByStatus[tab.value] || 0);
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.value
                  ? 'bg-[#1677FF] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#0D1B2A]'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No affiliates found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Code</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Business</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Applied</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Rate</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Clicks</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Conv.</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Earnings</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((affiliate) => {
                  const stats = statsMap[affiliate.id] ?? { clicks: 0, conversions: 0, earnings: 0 };
                  const clicks = clicksMap[affiliate.id] ?? 0;
                  const isApproving = actionLoading === affiliate.id;
                  const isRejecting = actionLoading === affiliate.id + '-reject';
                  const isDeleting = actionLoading === affiliate.id + '-delete';

                  return (
                    <tr
                      key={affiliate.id}
                      className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer"
                      onClick={() => navigate(`/admin/affiliates/${affiliate.id}`)}
                    >
                      <td className="py-3 px-4">
                        <span className="text-[#0D1B2A] font-medium">{affiliate.name}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">{affiliate.email}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-brand-neon text-sm bg-brand-emerald-dark/30 px-2 py-0.5 rounded">
                          {affiliate.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {affiliate.business_name || <span className="text-gray-600">-</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {formatDate(affiliate.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusBadgeVariant(affiliate.status)}>
                          {affiliate.status.charAt(0).toUpperCase() + affiliate.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {affiliate.commission_rate != null
                          ? <span className="text-brand-neon font-medium">{affiliate.commission_rate}%</span>
                          : <span className="text-gray-500">global</span>}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300 text-sm">{clicks}</td>
                      <td className="py-3 px-4 text-right text-gray-300 text-sm">
                        {stats.conversions}
                      </td>
                      <td className="py-3 px-4 text-right text-brand-neon text-sm font-medium">
                        {formatPrice(stats.earnings)}
                      </td>
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          {affiliate.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(affiliate)}
                                disabled={isApproving || isRejecting}
                                className="px-3 py-1 text-xs font-medium rounded-lg bg-brand-emerald/20 text-brand-neon hover:bg-brand-emerald/40 transition-colors disabled:opacity-50"
                              >
                                {isApproving ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleReject(affiliate)}
                                disabled={isApproving || isRejecting}
                                className="px-3 py-1 text-xs font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                              >
                                {isRejecting ? '...' : 'Reject'}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(affiliate)}
                            disabled={isDeleting || isApproving || isRejecting}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {isDeleting ? <span className="text-xs">...</span> : <Trash2 className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => navigate(`/admin/affiliates/${affiliate.id}`)}
                            className="p-1.5 text-gray-500 hover:text-brand-neon transition-colors"
                            title="View details"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
