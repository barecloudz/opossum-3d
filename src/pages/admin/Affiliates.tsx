import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { formatDate, formatPrice } from '../../lib/utils';
import type { Affiliate, AffiliateStatus, AffiliateConversion } from '../../types';

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

      const updates: Partial<Affiliate> & { status: AffiliateStatus; user_id?: string } = {
        status: 'approved',
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
            ? { ...a, status: 'approved', user_id: updates.user_id ?? a.user_id }
            : a
        )
      );
    } catch (err) {
      console.error('Error approving affiliate:', err);
      alert('Failed to approve affiliate');
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
          <h1 className="text-3xl font-bold text-white">Affiliates</h1>
          <p className="text-gray-400 mt-1">{affiliates.length} total affiliates</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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
                  ? 'bg-white text-black'
                  : 'bg-brand-gray text-gray-400 hover:text-white'
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
                <tr className="border-b border-brand-gray">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Code</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Business</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Applied</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Clicks</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Conv.</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Earnings</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((affiliate) => {
                  const stats = statsMap[affiliate.id] ?? { clicks: 0, conversions: 0, earnings: 0 };
                  const clicks = clicksMap[affiliate.id] ?? 0;
                  const isApproving = actionLoading === affiliate.id;
                  const isRejecting = actionLoading === affiliate.id + '-reject';

                  return (
                    <tr
                      key={affiliate.id}
                      className="border-b border-brand-gray/50 hover:bg-brand-gray/20 cursor-pointer"
                      onClick={() => navigate(`/admin/affiliates/${affiliate.id}`)}
                    >
                      <td className="py-3 px-4">
                        <span className="text-white font-medium">{affiliate.name}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">{affiliate.email}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-brand-neon text-sm bg-brand-emerald-dark/30 px-2 py-0.5 rounded">
                          {affiliate.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {affiliate.business_name || <span className="text-gray-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {formatDate(affiliate.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusBadgeVariant(affiliate.status)}>
                          {affiliate.status.charAt(0).toUpperCase() + affiliate.status.slice(1)}
                        </Badge>
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
