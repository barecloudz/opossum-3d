import { useState } from 'react';
import { Search, MessageSquare, Eye } from 'lucide-react';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { formatDateTime, formatPrice } from '../../lib/utils';
import { QUOTE_STATUSES } from '../../lib/constants';
import { useQuoteRequests } from '../../hooks/useAdmin';
import { supabase } from '../../lib/supabase';
import type { QuoteRequest, QuoteStatus } from '../../types';

export default function AdminQuoteRequests() {
  const { quotes, isLoading, refetch } = useQuoteRequests();
  const [search, setSearch] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    status: 'pending' as QuoteStatus,
    quoted_price: '',
    admin_notes: '',
  });

  const filteredQuotes = quotes.filter(
    (quote) =>
      quote.name.toLowerCase().includes(search.toLowerCase()) ||
      quote.email.toLowerCase().includes(search.toLowerCase()) ||
      quote.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenQuote = (quote: QuoteRequest) => {
    setSelectedQuote(quote);
    setEditData({
      status: quote.status,
      quoted_price: quote.quoted_price?.toString() || '',
      admin_notes: quote.admin_notes || '',
    });
  };

  const handleSave = async () => {
    if (!selectedQuote) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({
          status: editData.status,
          quoted_price: editData.quoted_price ? parseFloat(editData.quoted_price) : null,
          admin_notes: editData.admin_notes || null,
        })
        .eq('id', selectedQuote.id);

      if (error) throw error;

      refetch();
      setSelectedQuote(null);
    } catch (err) {
      console.error('Error updating quote:', err);
      alert('Failed to update quote');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Quote Requests</h1>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search quotes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Quotes Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No quote requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-gray">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Quote</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-b border-brand-gray/50 hover:bg-brand-gray/20"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">{quote.name}</p>
                        <p className="text-gray-500 text-sm">{quote.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-400 truncate max-w-xs">{quote.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          quote.status === 'accepted'
                            ? 'success'
                            : quote.status === 'declined'
                            ? 'danger'
                            : quote.status === 'quoted'
                            ? 'info'
                            : 'warning'
                        }
                      >
                        {QUOTE_STATUSES[quote.status].label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-brand-neon">
                      {quote.quoted_price ? formatPrice(quote.quoted_price) : '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{formatDateTime(quote.created_at)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleOpenQuote(quote)}
                          className="p-2 text-gray-400 hover:text-brand-neon transition-colors"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Quote Detail Modal */}
      <Modal
        isOpen={!!selectedQuote}
        onClose={() => setSelectedQuote(null)}
        title="Quote Request Details"
        size="lg"
      >
        {selectedQuote && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Customer</h3>
              <p className="text-white">{selectedQuote.name}</p>
              <p className="text-gray-400">{selectedQuote.email}</p>
              {selectedQuote.phone && <p className="text-gray-400">{selectedQuote.phone}</p>}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Project Description</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{selectedQuote.description}</p>
            </div>

            {/* Status & Quote */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as QuoteStatus })}
                  className="w-full px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-neon"
                >
                  {Object.entries(QUOTE_STATUSES).map(([value, { label }]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Quoted Price"
                type="number"
                value={editData.quoted_price}
                onChange={(e) => setEditData({ ...editData, quoted_price: e.target.value })}
                step="0.01"
                min="0"
              />
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Admin Notes</label>
              <textarea
                value={editData.admin_notes}
                onChange={(e) => setEditData({ ...editData, admin_notes: e.target.value })}
                rows={3}
                placeholder="Internal notes..."
                className="w-full px-4 py-2 rounded-lg bg-brand-black border border-brand-gray text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-neon focus:border-transparent resize-none"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="ghost" onClick={() => setSelectedQuote(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
