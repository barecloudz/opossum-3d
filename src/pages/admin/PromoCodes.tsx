import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Copy, Check } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { formatPrice } from '../../lib/utils';
import type { PromoCode } from '../../types';

export default function AdminPromoCodes() {
  const [isLoading, setIsLoading] = useState(true);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_amount: '',
    max_uses: '',
    is_active: true,
    show_on_checkout: false,
    expires_at: '',
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
      addToast('Failed to load promo codes', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const promoData = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        is_active: formData.is_active,
        show_on_checkout: formData.show_on_checkout,
        expires_at: formData.expires_at || null,
      };

      if (editingCode) {
        const { error } = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', editingCode.id);

        if (error) throw error;
        addToast('Promo code updated!', 'success');
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert(promoData);

        if (error) throw error;
        addToast('Promo code created!', 'success');
      }

      setShowModal(false);
      resetForm();
      fetchPromoCodes();
    } catch (err: any) {
      console.error('Error saving promo code:', err);
      addToast(err.message || 'Failed to save promo code', 'error');
    }
  };

  const handleEdit = (code: PromoCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: code.discount_value.toString(),
      min_order_amount: code.min_order_amount?.toString() || '',
      max_uses: code.max_uses?.toString() || '',
      is_active: code.is_active,
      show_on_checkout: code.show_on_checkout || false,
      expires_at: code.expires_at ? code.expires_at.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      addToast('Promo code deleted', 'success');
      fetchPromoCodes();
    } catch (err) {
      console.error('Error deleting promo code:', err);
      addToast('Failed to delete promo code', 'error');
    }
  };

  const handleToggleActive = async (code: PromoCode) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id);

      if (error) throw error;
      fetchPromoCodes();
    } catch (err) {
      console.error('Error toggling promo code:', err);
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setEditingCode(null);
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      max_uses: '',
      is_active: true,
      show_on_checkout: false,
      expires_at: '',
    });
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Promo Codes</h1>
          <p className="text-gray-400 mt-1">Create and manage discount codes</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Code
        </Button>
      </div>

      {promoCodes.length === 0 ? (
        <Card className="text-center py-12">
          <Tag className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No promo codes yet</h3>
          <p className="text-gray-400 mb-4">Create your first promo code to offer discounts.</p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Promo Code
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {promoCodes.map((code) => (
            <Card key={code.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => copyToClipboard(code.code, code.id)}
                      className="font-mono text-xl font-bold text-brand-neon hover:text-brand-emerald transition-colors flex items-center gap-2"
                    >
                      {code.code}
                      {copiedId === code.id ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                    <Badge variant={code.is_active && !isExpired(code.expires_at) ? 'success' : 'danger'}>
                      {isExpired(code.expires_at) ? 'Expired' : code.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {code.show_on_checkout && (
                      <Badge variant="default">Checkout</Badge>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-2">
                    {code.description || 'No description'}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-white">
                      {code.discount_type === 'percentage'
                        ? `${code.discount_value}% off`
                        : `${formatPrice(code.discount_value)} off`}
                    </span>
                    {code.min_order_amount && (
                      <span className="text-gray-400">
                        Min: {formatPrice(code.min_order_amount)}
                      </span>
                    )}
                    {code.max_uses && (
                      <span className="text-gray-400">
                        Uses: {code.uses_count}/{code.max_uses}
                      </span>
                    )}
                    {code.expires_at && (
                      <span className="text-gray-400">
                        Expires: {new Date(code.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(code)}
                  >
                    {code.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(code)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(code.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-auto">
              <h2 className="text-xl font-semibold text-white mb-6">
                {editingCode ? 'Edit Promo Code' : 'Create Promo Code'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex gap-2">
                    <Input
                      label="Code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="SAVE20"
                      required
                      className="flex-1 font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateCode}
                      className="mt-6"
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <Input
                  label="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="20% off summer sale"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Discount Type
                    </label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                      className="w-full px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-neon"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <Input
                    label={formData.discount_type === 'percentage' ? 'Discount (%)' : 'Discount ($)'}
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder={formData.discount_type === 'percentage' ? '20' : '10.00'}
                    step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                    min="0"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Min Order Amount (optional)"
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                    placeholder="50.00"
                    step="0.01"
                    min="0"
                  />
                  <Input
                    label="Max Uses (optional)"
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    placeholder="100"
                    min="1"
                  />
                </div>

                <Input
                  label="Expiration Date (optional)"
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
                    />
                    <label htmlFor="is_active" className="text-gray-300">
                      Active
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="show_on_checkout"
                      checked={formData.show_on_checkout}
                      onChange={(e) => setFormData({ ...formData, show_on_checkout: e.target.checked })}
                      className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
                    />
                    <label htmlFor="show_on_checkout" className="text-gray-300">
                      Show on checkout (customers can click to apply)
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingCode ? 'Update Code' : 'Create Code'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
