import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';

interface AffiliateSettingsRow {
  commission_rate: number;
  customer_discount_rate: number;
  min_payout_threshold: number;
  cookie_duration_days: number;
}

export default function AdminAffiliateSettings() {
  const [settings, setSettings] = useState<AffiliateSettingsRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [commissionRate, setCommissionRate] = useState('');
  const [customerDiscountRate, setCustomerDiscountRate] = useState('');
  const [minPayout, setMinPayout] = useState('');
  const [cookieDays, setCookieDays] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('affiliate_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error || !data) {
        setError('Failed to load settings');
      } else {
        setSettings(data);
        setCommissionRate(String(data.commission_rate));
        setCustomerDiscountRate(String(data.customer_discount_rate));
        setMinPayout(String(data.min_payout_threshold));
        setCookieDays(String(data.cookie_duration_days));
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setError('');
    const commission = parseFloat(commissionRate);
    const discount = parseFloat(customerDiscountRate);
    const payout = parseFloat(minPayout);
    const days = parseInt(cookieDays);

    if (isNaN(commission) || commission < 0 || commission > 100) {
      setError('Commission rate must be between 0 and 100');
      return;
    }
    if (isNaN(discount) || discount < 0 || discount > 100) {
      setError('Customer discount rate must be between 0 and 100');
      return;
    }
    if (isNaN(payout) || payout < 0) {
      setError('Minimum payout must be 0 or more');
      return;
    }
    if (isNaN(days) || days < 1) {
      setError('Cookie duration must be at least 1 day');
      return;
    }

    setIsSaving(true);
    try {
      const { error: saveError } = await supabase
        .from('affiliate_settings')
        .update({
          commission_rate: commission,
          customer_discount_rate: discount,
          min_payout_threshold: payout,
          cookie_duration_days: days,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (saveError) throw saveError;

      setSettings(prev => prev ? { ...prev, commission_rate: commission, customer_discount_rate: discount, min_payout_threshold: payout, cookie_duration_days: days } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving affiliate settings:', err);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-bold text-[#0D1B2A] mb-2">Affiliate Settings</h1>
      <p className="text-gray-400 mb-8">Global defaults for the affiliate program. Per-affiliate commission rates set on their detail page override the global rate.</p>

      <Card className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#0D1B2A] mb-1">
            Affiliate Commission Rate (%)
          </label>
          <p className="text-gray-400 text-xs mb-2">
            What affiliates earn on each sale. Applied to all affiliates unless overridden individually.
          </p>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            placeholder="e.g. 10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0D1B2A] mb-1">
            Customer Discount Rate (%)
          </label>
          <p className="text-gray-400 text-xs mb-2">
            The discount customers receive when using an affiliate code or link at checkout.
          </p>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={customerDiscountRate}
            onChange={(e) => setCustomerDiscountRate(e.target.value)}
            placeholder="e.g. 10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0D1B2A] mb-1">
            Minimum Payout Threshold ($)
          </label>
          <p className="text-gray-400 text-xs mb-2">
            Minimum balance an affiliate must reach before a payout can be issued. Set to 0 for no minimum.
          </p>
          <Input
            type="number"
            step="1"
            min="0"
            value={minPayout}
            onChange={(e) => setMinPayout(e.target.value)}
            placeholder="e.g. 25"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0D1B2A] mb-1">
            Cookie Duration (days)
          </label>
          <p className="text-gray-400 text-xs mb-2">
            How long an affiliate gets credit after someone clicks their link.
          </p>
          <Input
            type="number"
            step="1"
            min="1"
            value={cookieDays}
            onChange={(e) => setCookieDays(e.target.value)}
            placeholder="e.g. 30"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && <span className="text-green-400 text-sm">Saved!</span>}
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save className="h-4 w-4 mr-1.5" />
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
