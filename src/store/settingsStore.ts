import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface ThemeSettings {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  border_color: string;
}

interface SiteSettings {
  store_name: string;
  logo_url: string | null;
  hero_image_url: string | null;
  contact_email: string;
  default_shipping_cost: number;
  low_stock_threshold: number;
  subscriptions_enabled: boolean;
  theme_settings: ThemeSettings | null;
}

interface SettingsState {
  settings: SiteSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<SiteSettings>) => void;
  applyTheme: (theme: ThemeSettings) => void;
}

const defaultTheme: ThemeSettings = {
  primary_color: '#1677FF',
  secondary_color: '#0a5fd9',
  accent_color: '#1677FF',
  background_color: '#F2F4F7',
  surface_color: '#FFFFFF',
  text_color: '#0D1B2A',
  border_color: '#C9C9C9',
};

const defaultSettings: SiteSettings = {
  store_name: 'Nexalon Creations',
  logo_url: null,
  hero_image_url: null,
  contact_email: '',
  default_shipping_cost: 5,
  low_stock_threshold: 5,
  subscriptions_enabled: false,
  theme_settings: null,
};

// Apply theme colors as CSS variables
const applyThemeToDOM = (theme: ThemeSettings) => {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary_color);
  root.style.setProperty('--color-secondary', theme.secondary_color);
  root.style.setProperty('--color-accent', theme.accent_color);
  root.style.setProperty('--color-background', theme.background_color);
  root.style.setProperty('--color-surface', theme.surface_color);
  root.style.setProperty('--color-text', theme.text_color);
  root.style.setProperty('--color-border', theme.border_color);

  // Also update body background
  document.body.style.backgroundColor = theme.background_color;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  isLoading: true,

  applyTheme: (theme: ThemeSettings) => {
    applyThemeToDOM(theme);
  },

  fetchSettings: async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        set({
          settings: {
            store_name: data.store_name || 'Nexalon Creations',
            logo_url: data.logo_url || null,
            hero_image_url: data.hero_image_url || null,
            contact_email: data.contact_email || '',
            default_shipping_cost: data.default_shipping_cost || 5,
            low_stock_threshold: data.low_stock_threshold || 5,
            subscriptions_enabled: data.subscriptions_enabled ?? false,
            theme_settings: defaultTheme,
          },
        });

        // Always apply the Nexalon brand theme
        applyThemeToDOM(defaultTheme);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      // Apply default theme on error
      applyThemeToDOM(defaultTheme);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));

    // If theme was updated, apply it
    if (newSettings.theme_settings) {
      applyThemeToDOM(newSettings.theme_settings);
    }
  },
}));
