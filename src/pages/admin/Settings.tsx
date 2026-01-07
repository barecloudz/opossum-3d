import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import type { StoreSettings } from '../../types';

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const [settings, setSettings] = useState<Partial<StoreSettings>>({
    store_name: '',
    contact_email: '',
    default_shipping_cost: 5,
    low_stock_threshold: 5,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          store_name: settings.store_name,
          contact_email: settings.contact_email,
          default_shipping_cost: settings.default_shipping_cost,
          low_stock_threshold: settings.low_stock_threshold,
        })
        .eq('id', 1);

      if (error) throw error;

      addToast('Settings saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving settings:', err);
      addToast('Failed to save settings', 'error');
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
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-8">Settings</h1>

      <div className="max-w-2xl space-y-6">
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Store Information</h2>
          <div className="space-y-4">
            <Input
              label="Store Name"
              value={settings.store_name || ''}
              onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
              helperText="Displayed when no logo is set"
            />
            <Input
              label="Contact Email"
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Shipping</h2>
          <Input
            label="Default Shipping Cost"
            type="number"
            value={settings.default_shipping_cost?.toString() || '5'}
            onChange={(e) =>
              setSettings({ ...settings, default_shipping_cost: parseFloat(e.target.value) })
            }
            step="0.01"
            min="0"
            helperText="Standard shipping rate in USD"
          />
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Inventory</h2>
          <Input
            label="Low Stock Threshold"
            type="number"
            value={settings.low_stock_threshold?.toString() || '5'}
            onChange={(e) =>
              setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) })
            }
            min="0"
            helperText="Alert when product stock falls below this number"
          />
        </Card>

        <Button onClick={handleSave} size="lg" isLoading={isSaving}>
          <Save className="h-5 w-5 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
