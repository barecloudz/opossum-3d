import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface SiteSettings {
  store_name: string;
  logo_url: string | null;
  contact_email: string;
  default_shipping_cost: number;
  low_stock_threshold: number;
}

interface SettingsState {
  settings: SiteSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<SiteSettings>) => void;
}

const defaultSettings: SiteSettings = {
  store_name: 'OPOSSUM',
  logo_url: null,
  contact_email: '',
  default_shipping_cost: 5,
  low_stock_threshold: 5,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  isLoading: true,

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
            store_name: data.store_name || 'OPOSSUM',
            logo_url: data.logo_url || null,
            contact_email: data.contact_email || '',
            default_shipping_cost: data.default_shipping_cost || 5,
            low_stock_threshold: data.low_stock_threshold || 5,
          },
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },
}));
