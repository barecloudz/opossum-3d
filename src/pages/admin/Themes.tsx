import { useState, useEffect } from 'react';
import { Save, Palette, Check } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';

interface ThemeSettings {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  border_color: string;
}

interface PresetTheme {
  name: string;
  description: string;
  colors: ThemeSettings;
}

const presetThemes: PresetTheme[] = [
  {
    name: 'Neon Green',
    description: 'Electric neon green with dark silver accents',
    colors: {
      primary_color: '#00ff66',
      secondary_color: '#00cc52',
      accent_color: '#00ff66',
      background_color: '#0a0a0a',
      surface_color: '#1a1a1a',
      text_color: '#f5f5f5',
      border_color: '#2d2d2d',
    },
  },
  {
    name: 'Emerald Gold',
    description: 'Rich emerald green with luxurious gold highlights',
    colors: {
      primary_color: '#50C878',
      secondary_color: '#2E8B57',
      accent_color: '#FFD700',
      background_color: '#0d1117',
      surface_color: '#161b22',
      text_color: '#f0f6fc',
      border_color: '#30363d',
    },
  },
  {
    name: 'Ocean Blue',
    description: 'Deep ocean blue with cyan accents',
    colors: {
      primary_color: '#00bfff',
      secondary_color: '#0080ff',
      accent_color: '#00ffff',
      background_color: '#0a0f1a',
      surface_color: '#111827',
      text_color: '#f3f4f6',
      border_color: '#1f2937',
    },
  },
  {
    name: 'Royal Purple',
    description: 'Majestic purple with violet highlights',
    colors: {
      primary_color: '#a855f7',
      secondary_color: '#7c3aed',
      accent_color: '#c084fc',
      background_color: '#0c0a1a',
      surface_color: '#1a1625',
      text_color: '#f5f3ff',
      border_color: '#2e2640',
    },
  },
  {
    name: 'Sunset Orange',
    description: 'Warm sunset orange with red undertones',
    colors: {
      primary_color: '#ff6b35',
      secondary_color: '#f7931e',
      accent_color: '#ffcc00',
      background_color: '#1a0f0a',
      surface_color: '#241510',
      text_color: '#fff5eb',
      border_color: '#3d2817',
    },
  },
];

const colorFields = [
  { key: 'primary_color', label: 'Primary', description: 'Buttons, links, accents' },
  { key: 'secondary_color', label: 'Secondary', description: 'Secondary actions' },
  { key: 'accent_color', label: 'Accent', description: 'Highlights, CTAs' },
  { key: 'background_color', label: 'Background', description: 'Page background' },
  { key: 'surface_color', label: 'Surface', description: 'Cards, panels' },
  { key: 'text_color', label: 'Text', description: 'Main text' },
  { key: 'border_color', label: 'Border', description: 'Borders, dividers' },
];

export default function AdminThemes() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<ThemeSettings>(presetThemes[0].colors);
  const [activePreset, setActivePreset] = useState<string>('Neon Green');

  useEffect(() => {
    fetchTheme();
  }, []);

  const fetchTheme = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('theme_settings')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data?.theme_settings) {
        setTheme({ ...presetThemes[0].colors, ...data.theme_settings });
        // Check if it matches a preset
        const matchingPreset = presetThemes.find(
          (p) => JSON.stringify(p.colors) === JSON.stringify(data.theme_settings)
        );
        if (matchingPreset) {
          setActivePreset(matchingPreset.name);
        } else {
          setActivePreset('Custom');
        }
      }
    } catch (err) {
      console.error('Error fetching theme:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetSelect = (preset: PresetTheme) => {
    setTheme(preset.colors);
    setActivePreset(preset.name);
  };

  const handleColorChange = (key: string, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
    setActivePreset('Custom');
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('store_settings')
        .update({ theme_settings: theme })
        .eq('id', 1);

      if (error) throw error;

      alert('Theme saved! Refresh the page to see changes.');
    } catch (err) {
      console.error('Error saving theme:', err);
      alert('Failed to save theme. Run: ALTER TABLE store_settings ADD COLUMN theme_settings JSONB;');
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
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-8">Themes</h1>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Preset Themes */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-brand-neon" />
              Preset Themes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {presetThemes.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                    activePreset === preset.name
                      ? 'border-brand-neon bg-brand-neon/10'
                      : 'border-brand-gray hover:border-gray-500'
                  }`}
                >
                  {activePreset === preset.name && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-brand-neon rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-brand-black" />
                    </div>
                  )}

                  {/* Color preview */}
                  <div className="flex gap-1 mb-3">
                    <div
                      className="w-8 h-8 rounded-full border border-white/20"
                      style={{ backgroundColor: preset.colors.primary_color }}
                    />
                    <div
                      className="w-8 h-8 rounded-full border border-white/20"
                      style={{ backgroundColor: preset.colors.accent_color }}
                    />
                    <div
                      className="w-8 h-8 rounded-full border border-white/20"
                      style={{ backgroundColor: preset.colors.background_color }}
                    />
                  </div>

                  <h3 className="font-semibold text-white">{preset.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">{preset.description}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Custom Colors */}
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4">
              Custom Colors
              {activePreset === 'Custom' && (
                <span className="ml-2 text-sm text-brand-neon">(Modified)</span>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {colorFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {field.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme[field.key as keyof ThemeSettings]}
                      onChange={(e) => handleColorChange(field.key, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-brand-gray bg-transparent"
                    />
                    <input
                      type="text"
                      value={theme[field.key as keyof ThemeSettings]}
                      onChange={(e) => handleColorChange(field.key, e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-brand-black border border-brand-gray text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-neon"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Button onClick={handleSave} size="lg" isLoading={isSaving}>
            <Save className="h-5 w-5 mr-2" />
            Save Theme
          </Button>
        </div>

        {/* Live Preview */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4">Live Preview</h2>
            <div
              className="rounded-lg p-4 space-y-4"
              style={{ backgroundColor: theme.background_color }}
            >
              {/* Header Preview */}
              <div
                className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{
                  backgroundColor: theme.surface_color,
                  borderColor: theme.border_color,
                  borderWidth: '1px',
                }}
              >
                <span
                  className="font-bold text-lg"
                  style={{ color: theme.primary_color }}
                >
                  OPOSSUM
                </span>
                <div className="flex gap-2">
                  <span style={{ color: theme.text_color, opacity: 0.7 }}>Products</span>
                  <span style={{ color: theme.text_color, opacity: 0.7 }}>Cart</span>
                </div>
              </div>

              {/* Product Card Preview */}
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: theme.surface_color,
                  borderColor: theme.border_color,
                  borderWidth: '1px',
                }}
              >
                <div
                  className="w-full h-20 rounded mb-3"
                  style={{ backgroundColor: theme.border_color }}
                />
                <h3
                  className="font-semibold mb-1"
                  style={{ color: theme.text_color }}
                >
                  3D Printed Item
                </h3>
                <p
                  className="text-sm mb-2"
                  style={{ color: theme.text_color, opacity: 0.6 }}
                >
                  Custom designed product
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className="font-bold text-lg"
                    style={{ color: theme.accent_color }}
                  >
                    $29.99
                  </span>
                  <span
                    className="text-sm line-through"
                    style={{ color: theme.text_color, opacity: 0.4 }}
                  >
                    $39.99
                  </span>
                </div>
              </div>

              {/* Button Previews */}
              <button
                className="w-full py-2.5 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.primary_color,
                  color: theme.background_color,
                }}
              >
                Add to Cart
              </button>

              <button
                className="w-full py-2.5 rounded-lg font-semibold"
                style={{
                  backgroundColor: 'transparent',
                  color: theme.primary_color,
                  borderColor: theme.primary_color,
                  borderWidth: '2px',
                }}
              >
                View Details
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
