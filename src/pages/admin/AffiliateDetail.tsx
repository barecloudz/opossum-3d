import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, DollarSign, MousePointerClick, TrendingUp, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDate, formatDateTime } from '../../lib/utils';
import type {
  Affiliate,
  AffiliateStatus,
  AffiliateConversion,
  AffiliateConversionStatus,
  AffiliatePayout,
} from '../../types';

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

function convStatusBadgeVariant(
  status: AffiliateConversionStatus
): 'warning' | 'info' | 'success' | 'danger' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'info';
    case 'paid':
      return 'success';
    case 'reversed':
      return 'danger';
  }
}

export default function AdminAffiliateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [conversions, setConversions] = useState<AffiliateConversion[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Admin notes
  const [adminNotes, setAdminNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Commission rate override
  const [commissionRate, setCommissionRate] = useState('');
  const [isSavingRate, setIsSavingRate] = useState(false);

  // Status action loading
  const [statusLoading, setStatusLoading] = useState<AffiliateStatus | 'suspended' | null>(null);

  // Conversion status update
  const [convStatusLoading, setConvStatusLoading] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  // Payout modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');
  const [payoutReference, setPayoutReference] = useState('');
  const [isSavingPayout, setIsSavingPayout] = useState(false);

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      // Fetch affiliate
      const { data: aff, error: affErr } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', id)
        .single();

      if (affErr) throw affErr;
      setAffiliate(aff);
      setAdminNotes(aff.admin_notes || '');
      setCommissionRate(aff.commission_rate != null ? String(aff.commission_rate) : '');

      // Fetch conversions with order info
      const { data: convData } = await supabase
        .from('affiliate_conversions')
        .select('*, order:orders(order_number, created_at, total)')
        .eq('affiliate_id', id)
        .order('created_at', { ascending: false });

      setConversions((convData as AffiliateConversion[]) || []);

      // Fetch payouts
      const { data: payoutData } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', id)
        .order('created_at', { ascending: false });

      setPayouts((payoutData as AffiliatePayout[]) || []);

      // Fetch click count
      const { count } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', id);

      setClickCount(count || 0);
    } catch (err) {
      console.error('Error fetching affiliate detail:', err);
      navigate('/admin/affiliates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: AffiliateStatus) => {
    if (!affiliate) return;
    setStatusLoading(newStatus);
    try {
      const updates: Partial<Affiliate> & { status: AffiliateStatus; user_id?: string; commission_rate?: number } = {
        status: newStatus,
      };

      // On approve: link user_id and stamp commission rate
      if (newStatus === 'approved') {
        if (!affiliate.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', affiliate.email)
            .maybeSingle();
          if (profileData?.id) updates.user_id = profileData.id;
        }
        // Stamp current global rate so future global changes don't affect this affiliate
        if (affiliate.commission_rate == null) {
          const { data: settingsData } = await supabase
            .from('affiliate_settings')
            .select('commission_rate')
            .eq('id', 1)
            .single();
          updates.commission_rate = settingsData?.commission_rate ?? 10;
        }
      }

      const { error } = await supabase
        .from('affiliates')
        .update(updates)
        .eq('id', affiliate.id);

      if (error) throw error;

      setAffiliate((prev) =>
        prev
          ? { ...prev, status: newStatus, user_id: updates.user_id ?? prev.user_id, commission_rate: updates.commission_rate ?? prev.commission_rate }
          : prev
      );
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setStatusLoading(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!affiliate) return;
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ admin_notes: adminNotes || null })
        .eq('id', affiliate.id);

      if (error) throw error;
      setAffiliate((prev) => (prev ? { ...prev, admin_notes: adminNotes || null } : prev));
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSaveCommissionRate = async () => {
    if (!affiliate) return;
    setIsSavingRate(true);
    try {
      const parsed = commissionRate.trim() !== '' ? parseFloat(commissionRate) : null;
      if (parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > 100)) {
        alert('Commission rate must be a number between 0 and 100 (e.g. 10 for 10%)');
        return;
      }

      const { error } = await supabase
        .from('affiliates')
        .update({ commission_rate: parsed })
        .eq('id', affiliate.id);

      if (error) throw error;
      setAffiliate((prev) => (prev ? { ...prev, commission_rate: parsed } : prev));
    } catch (err) {
      console.error('Error saving commission rate:', err);
      alert('Failed to save commission rate');
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleBulkApprove = async () => {
    const pendingIds = conversions.filter(c => c.status === 'pending').map(c => c.id);
    if (pendingIds.length === 0) return;
    setBulkApproving(true);
    try {
      const { error } = await supabase
        .from('affiliate_conversions')
        .update({ status: 'approved' })
        .in('id', pendingIds);
      if (error) throw error;
      setConversions(prev => prev.map(c => pendingIds.includes(c.id) ? { ...c, status: 'approved' as AffiliateConversionStatus } : c));
    } catch (err) {
      console.error('Error bulk approving:', err);
      alert('Failed to bulk approve');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleConversionStatusChange = async (
    convId: string,
    newStatus: AffiliateConversionStatus
  ) => {
    setConvStatusLoading(convId);
    try {
      const { error } = await supabase
        .from('affiliate_conversions')
        .update({ status: newStatus })
        .eq('id', convId);

      if (error) throw error;

      setConversions((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error('Error updating conversion status:', err);
      alert('Failed to update conversion status');
    } finally {
      setConvStatusLoading(null);
    }
  };

  const handleOpenPayoutModal = () => {
    const approvedTotal = conversions
      .filter((c) => c.status === 'approved')
      .reduce((sum, c) => sum + c.commission_amount, 0);
    setPayoutAmount(approvedTotal > 0 ? approvedTotal.toFixed(2) : '');
    setPayoutMethod('');
    setPayoutReference('');
    setShowPayoutModal(true);
  };

  const handleRecordPayout = async () => {
    if (!affiliate) return;
    if (!payoutAmount || !payoutMethod.trim()) {
      alert('Amount and method are required');
      return;
    }
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Enter a valid payout amount');
      return;
    }

    setIsSavingPayout(true);
    try {
      // Insert payout record
      const { data: newPayout, error: payoutErr } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: affiliate.id,
          amount,
          method: payoutMethod.trim(),
          reference: payoutReference.trim() || null,
          notes: null,
        })
        .select()
        .single();

      if (payoutErr) throw payoutErr;

      // Mark approved conversions as paid and attach payout_id
      const approvedIds = conversions
        .filter((c) => c.status === 'approved')
        .map((c) => c.id);

      if (approvedIds.length > 0) {
        const { error: convErr } = await supabase
          .from('affiliate_conversions')
          .update({ status: 'paid', payout_id: newPayout.id })
          .in('id', approvedIds);

        if (convErr) throw convErr;

        setConversions((prev) =>
          prev.map((c) =>
            approvedIds.includes(c.id)
              ? { ...c, status: 'paid' as AffiliateConversionStatus, payout_id: newPayout.id }
              : c
          )
        );
      }

      setPayouts((prev) => [newPayout as AffiliatePayout, ...prev]);
      setShowPayoutModal(false);
    } catch (err) {
      console.error('Error recording payout:', err);
      alert('Failed to record payout');
    } finally {
      setIsSavingPayout(false);
    }
  };

  // Computed stats
  const totalEarned = conversions
    .filter((c) => c.status !== 'pending')
    .reduce((sum, c) => sum + c.commission_amount, 0);

  const pendingBalance = conversions
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + c.commission_amount, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!affiliate) {
    return <div className="text-center py-12 text-gray-400">Affiliate not found</div>;
  }

  return (
    <div>
      {/* Back nav */}
      <button
        onClick={() => navigate('/admin/affiliates')}
        className="inline-flex items-center text-gray-400 hover:text-brand-neon mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Affiliates
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-[#0D1B2A]">{affiliate.name}</h1>
            <Badge variant={statusBadgeVariant(affiliate.status)}>
              {affiliate.status.charAt(0).toUpperCase() + affiliate.status.slice(1)}
            </Badge>
          </div>
          <p className="text-gray-400">{affiliate.email}</p>
          <p className="text-sm mt-1">
            <span className="text-gray-500">Code: </span>
            <span className="font-mono text-brand-neon bg-brand-emerald-dark/30 px-2 py-0.5 rounded text-sm">
              {affiliate.code}
            </span>
          </p>
        </div>

        {/* Status action buttons */}
        <div className="flex flex-wrap gap-2">
          {affiliate.status !== 'approved' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('approved')}
              isLoading={statusLoading === 'approved'}
              disabled={statusLoading !== null}
            >
              Approve
            </Button>
          )}
          {affiliate.status !== 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('rejected')}
              isLoading={statusLoading === 'rejected'}
              disabled={statusLoading !== null}
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              Reject
            </Button>
          )}
          {affiliate.status !== 'suspended' && affiliate.status === 'approved' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('suspended')}
              isLoading={statusLoading === 'suspended'}
              disabled={statusLoading !== null}
              className="text-gray-400 border-gray-500/30 hover:bg-gray-500/10"
            >
              Suspend
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="text-center">
          <div className="flex flex-col items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-blue-400" />
            <p className="text-2xl font-bold text-[#0D1B2A]">{clickCount}</p>
            <p className="text-gray-400 text-sm">Clicks</p>
          </div>
        </Card>
        <Card className="text-center">
          <div className="flex flex-col items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-neon" />
            <p className="text-2xl font-bold text-[#0D1B2A]">{conversions.length}</p>
            <p className="text-gray-400 text-sm">Conversions</p>
          </div>
        </Card>
        <Card className="text-center">
          <div className="flex flex-col items-center gap-2">
            <DollarSign className="h-5 w-5 text-brand-neon" />
            <p className="text-2xl font-bold text-brand-neon">{formatPrice(totalEarned)}</p>
            <p className="text-gray-400 text-sm">Total Earned</p>
          </div>
        </Card>
        <Card className="text-center">
          <div className="flex flex-col items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            <p className="text-2xl font-bold text-yellow-400">{formatPrice(pendingBalance)}</p>
            <p className="text-gray-400 text-sm">Pending Balance</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Admin notes */}
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#0D1B2A] mb-4">Admin Notes</h2>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={4}
            placeholder="Internal notes about this affiliate..."
            className="w-full px-4 py-2 rounded-lg bg-brand-black border border-brand-gray text-[#0D1B2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none mb-3"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveNotes} isLoading={isSavingNotes}>
              <Save className="h-4 w-4 mr-1.5" />
              Save Notes
            </Button>
          </div>
        </Card>

        {/* Commission rate override */}
        <Card>
          <h2 className="text-lg font-semibold text-[#0D1B2A] mb-4">Commission Rate</h2>
          <p className="text-gray-400 text-sm mb-3">
            Leave blank to use the global rate. Enter a whole number, e.g.{' '}
            <span className="font-mono text-gray-300">10</span> for 10%.
          </p>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="100"
            placeholder="Using global rate"
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
          />
          {affiliate.commission_rate != null && (
            <p className="text-xs text-gray-500 mt-1">
              Currently: {affiliate.commission_rate.toFixed(1)}%
            </p>
          )}
          <div className="flex justify-end mt-3">
            <Button size="sm" onClick={handleSaveCommissionRate} isLoading={isSavingRate}>
              <Save className="h-4 w-4 mr-1.5" />
              Save Rate
            </Button>
          </div>
        </Card>
      </div>

      {/* Conversions table */}
      <Card padding="none" className="mb-6">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0D1B2A]">Conversions</h2>
          <div className="flex gap-2">
            {conversions.some(c => c.status === 'pending') && (
              <Button size="sm" variant="outline" onClick={handleBulkApprove} isLoading={bulkApproving}>
                Approve All Pending
              </Button>
            )}
            {pendingBalance > 0 && (
              <Button size="sm" onClick={handleOpenPayoutModal}>
                <DollarSign className="h-4 w-4 mr-1.5" />
                Record Payout
              </Button>
            )}
          </div>
        </div>
        {conversions.length === 0 ? (
          <div className="text-center py-10">
            <TrendingUp className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No conversions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Order #</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Order Total</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Commission</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((conv) => (
                  <tr
                    key={conv.id}
                    className="border-b border-gray-200 hover:bg-blue-50"
                  >
                    <td className="py-3 px-4 text-[#0D1B2A] font-medium">
                      {conv.order?.order_number ? `#${conv.order.order_number}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {formatDate(conv.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      {formatPrice(conv.order_total)}
                    </td>
                    <td className="py-3 px-4 text-right text-brand-neon font-medium">
                      {formatPrice(conv.commission_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={convStatusBadgeVariant(conv.status)}>
                        {conv.status.charAt(0).toUpperCase() + conv.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        {conv.status === 'pending' && (
                          <button
                            onClick={() => handleConversionStatusChange(conv.id, 'approved')}
                            disabled={convStatusLoading === conv.id}
                            className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                          >
                            {convStatusLoading === conv.id ? '...' : 'Approve'}
                          </button>
                        )}
                        {conv.status === 'approved' && (
                          <button
                            onClick={() => handleConversionStatusChange(conv.id, 'paid')}
                            disabled={convStatusLoading === conv.id}
                            className="px-3 py-1 text-xs font-medium rounded-lg bg-brand-emerald/20 text-brand-neon hover:bg-brand-emerald/40 transition-colors disabled:opacity-50"
                          >
                            {convStatusLoading === conv.id ? '...' : 'Mark Paid'}
                          </button>
                        )}
                        {conv.status === 'paid' && (
                          <span className="text-xs text-gray-500">Paid</span>
                        )}
                        {conv.status === 'reversed' && (
                          <span className="text-xs text-red-400">Reversed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payout history */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0D1B2A]">Payout History</h2>
          {pendingBalance === 0 && conversions.some((c) => c.status === 'approved') === false && (
            <Button size="sm" variant="outline" onClick={handleOpenPayoutModal}>
              <DollarSign className="h-4 w-4 mr-1.5" />
              Record Payout
            </Button>
          )}
        </div>
        {payouts.length === 0 ? (
          <div className="text-center py-10">
            <DollarSign className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No payouts recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Method</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="border-b border-gray-200 hover:bg-blue-50"
                  >
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {formatDateTime(payout.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right text-brand-neon font-medium">
                      {formatPrice(payout.amount)}
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm capitalize">
                      {payout.method}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {payout.reference || <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Payout Modal */}
      <Modal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        title="Record Payout"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Recording a payout will mark all{' '}
            <span className="text-blue-400 font-medium">approved</span> conversions as{' '}
            <span className="text-brand-neon font-medium">paid</span>.
          </p>

          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Method</label>
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
              className="w-full px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="">Select method...</option>
              <option value="cash">Cash</option>
              <option value="cash_app">Cash App</option>
              <option value="venmo">Venmo</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <Input
            label="Reference / Note (optional)"
            type="text"
            placeholder="Transaction ID, check number, etc."
            value={payoutReference}
            onChange={(e) => setPayoutReference(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowPayoutModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayout} isLoading={isSavingPayout}>
              <DollarSign className="h-4 w-4 mr-1.5" />
              Record Payout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
