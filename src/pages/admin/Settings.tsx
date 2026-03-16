import { useState, useEffect } from 'react';
import { Save, Truck, Mail, FlaskConical, Send } from 'lucide-react';
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

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testEmailType, setTestEmailType] = useState<'confirmation' | 'shipping'>('confirmation');
  const [isSendingTest, setIsSendingTest] = useState(false);

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

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      addToast('Please enter an email address', 'error');
      return;
    }
    setIsSendingTest(true);

    try {
      const fakeOrderPayload = {
        orderId: 'test-00000000',
        orderNumber: 'TEST1234',
        customerEmail: testEmail.trim(),
        customerName: 'Jane Doe',
        items: [
          {
            product_name: 'Articulated Dragon - Large',
            variant_name: 'Midnight Black',
            quantity: 1,
            unit_price: 24.99,
            total_price: 24.99,
          },
          {
            product_name: 'Flexi Rex',
            variant_name: null,
            quantity: 2,
            unit_price: 8.50,
            total_price: 17.00,
          },
        ],
        subtotal: 41.99,
        shipping: 5.60,
        tax: 0,
        discount: 5.00,
        total: 42.59,
        shippingAddress: {
          address_line_1: '123 Main Street',
          address_line_2: 'Apt 4B',
          city: 'Marietta',
          state: 'SC',
          postal_code: '29661',
        },
        shippingMethod: 'Priority Mail',
        estimatedDays: 3,
      };

      const endpoint = testEmailType === 'confirmation'
        ? '/.netlify/functions/send-order-confirmation'
        : '/.netlify/functions/send-shipping-confirmation';

      const body = testEmailType === 'shipping'
        ? {
            orderNumber: 'TEST1234',
            customerEmail: testEmail.trim(),
            customerName: 'Jane Doe',
            trackingNumber: '9400111899223100001234',
            shippingAddress: fakeOrderPayload.shippingAddress,
          }
        : fakeOrderPayload;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        addToast(`Test ${testEmailType} email sent to ${testEmail}!`, 'success');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send test email');
      }
    } catch (err: any) {
      console.error('Test email error:', err);
      addToast(err.message || 'Failed to send test email', 'error');
    } finally {
      setIsSendingTest(false);
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

        {/* Test Email Section */}
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-semibold text-white">Test Emails</h2>
            <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full font-medium">Experimental</span>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Send a fake order email to any address to preview what customers see.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTestEmailType('confirmation')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    testEmailType === 'confirmation'
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40'
                      : 'bg-[var(--color-background)]/50 text-gray-400 border border-[var(--color-border)] hover:text-white'
                  }`}
                >
                  <Mail className="h-4 w-4 inline mr-2" />
                  Order Confirmation
                </button>
                <button
                  onClick={() => setTestEmailType('shipping')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    testEmailType === 'shipping'
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40'
                      : 'bg-[var(--color-background)]/50 text-gray-400 border border-[var(--color-border)] hover:text-white'
                  }`}
                >
                  <Truck className="h-4 w-4 inline mr-2" />
                  Shipping Confirmation
                </button>
              </div>
            </div>

            <Input
              label="Send To"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your@email.com"
            />

            <Button
              onClick={sendTestEmail}
              variant="outline"
              className="w-full border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
              isLoading={isSendingTest}
              disabled={!testEmail.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Test {testEmailType === 'confirmation' ? 'Order Confirmation' : 'Shipping Confirmation'}
            </Button>

            <p className="text-gray-600 text-xs">
              Sends a fake order with sample data (2 items, $42.59 total) so you can preview the email template.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
