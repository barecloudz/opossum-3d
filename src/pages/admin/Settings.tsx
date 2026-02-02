import { useState, useEffect } from 'react';
import { Save, Truck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import type { StoreSettings } from '../../types';

interface ShippingService {
  id: string;
  service_code: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
}

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
  const [shippingServices, setShippingServices] = useState<ShippingService[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchShippingServices();
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

  const fetchShippingServices = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping_services')
        .select('*')
        .order('name');

      if (error) throw error;
      setShippingServices(data || []);
    } catch (err) {
      console.error('Error fetching shipping services:', err);
    }
  };

  const toggleShippingService = async (service: ShippingService) => {
    const newValue = !service.is_enabled;

    // Optimistic update
    setShippingServices(services =>
      services.map(s => s.id === service.id ? { ...s, is_enabled: newValue } : s)
    );

    try {
      const { error } = await supabase
        .from('shipping_services')
        .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
        .eq('id', service.id);

      if (error) throw error;
      addToast(`${service.name} ${newValue ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      // Revert on error
      setShippingServices(services =>
        services.map(s => s.id === service.id ? { ...s, is_enabled: !newValue } : s)
      );
      addToast('Failed to update shipping service', 'error');
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
          <div className="space-y-4">
            <Input
              label="Default Shipping Cost"
              type="number"
              value={settings.default_shipping_cost?.toString() || '5'}
              onChange={(e) =>
                setSettings({ ...settings, default_shipping_cost: parseFloat(e.target.value) })
              }
              step="0.01"
              min="0"
              helperText="Fallback rate if USPS API fails"
            />

            {shippingServices.length > 0 && (
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Optional Shipping Services
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Enable services below to let customers add them at checkout for an extra fee.
                </p>
                <div className="space-y-3">
                  {shippingServices.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-start gap-3 p-3 bg-[var(--color-background)]/50 rounded-xl cursor-pointer hover:bg-[var(--color-background)] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={service.is_enabled}
                        onChange={() => toggleShippingService(service)}
                        className="mt-1 w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{service.name}</span>
                          {service.is_enabled && (
                            <span className="text-xs px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-gray-400 mt-0.5">{service.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
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
