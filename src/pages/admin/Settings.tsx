import { useState, useEffect, useRef } from 'react';
import { Save, Upload, X, Image as ImageIcon } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/settingsStore';
import type { StoreSettings } from '../../types';

export default function AdminSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateSettings: updateGlobalSettings } = useSettingsStore();

  const [settings, setSettings] = useState<Partial<StoreSettings>>({
    store_name: '',
    logo_url: null,
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2MB');
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Delete old logo if exists
      if (settings.logo_url) {
        const oldFileName = settings.logo_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('site-assets').remove([`logos/${oldFileName}`]);
        }
      }

      // Upload new logo
      const ext = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(`logos/${fileName}`, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(`logos/${fileName}`);

      // Update settings with new logo URL
      setSettings({ ...settings, logo_url: publicUrl });

    } catch (err) {
      console.error('Error uploading logo:', err);
      alert('Failed to upload logo. Make sure "site-assets" bucket exists in Supabase.');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (settings.logo_url) {
      try {
        const fileName = settings.logo_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('site-assets').remove([`logos/${fileName}`]);
        }
      } catch (err) {
        console.error('Error removing logo:', err);
      }
    }
    setSettings({ ...settings, logo_url: null });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          store_name: settings.store_name,
          logo_url: settings.logo_url,
          contact_email: settings.contact_email,
          default_shipping_cost: settings.default_shipping_cost,
          low_stock_threshold: settings.low_stock_threshold,
        })
        .eq('id', 1);

      if (error) throw error;

      // Update global settings store so logo updates everywhere
      updateGlobalSettings({
        store_name: settings.store_name || 'OPOSSUM',
        logo_url: settings.logo_url,
      });

      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
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
        {/* Logo Upload */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Site Logo</h2>
          <p className="text-gray-400 text-sm mb-4">
            Upload your company logo. This will be displayed in the header and throughout the site.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Logo Preview */}
            <div className="w-32 h-32 bg-brand-gray rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-brand-gray">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Site logo"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-gray-500 mx-auto mb-1" />
                  <span className="text-gray-500 text-xs">No logo</span>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                isLoading={isUploadingLogo}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                {settings.logo_url ? 'Change Logo' : 'Upload Logo'}
              </Button>

              {settings.logo_url && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRemoveLogo}
                  className="w-full sm:w-auto text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove Logo
                </Button>
              )}

              <p className="text-gray-500 text-xs">
                Recommended: Square image, PNG or SVG, max 2MB
              </p>
            </div>
          </div>
        </Card>

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
