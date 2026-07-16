import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

interface ProductStore {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
  lastFetched: number | null;
  fetchProducts: (force?: boolean) => Promise<void>;
  invalidateCache: () => void;
}

// Cache products for 5 minutes before refetching
const CACHE_DURATION = 5 * 60 * 1000;

// Shared in-flight promise so multiple callers wait on the same fetch
let inFlightPromise: Promise<void> | null = null;

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  invalidateCache: () => {
    set({ lastFetched: null });
  },

  fetchProducts: async (force = false) => {
    const { lastFetched, products } = get();
    const now = Date.now();

    // Use cache if available and not expired
    if (!force && lastFetched && products.length > 0 && (now - lastFetched) < CACHE_DURATION) {
      return;
    }

    // If a fetch is already in progress, wait for it instead of skipping
    if (inFlightPromise) {
      return inFlightPromise;
    }

    const doFetch = async (): Promise<void> => {
      set({ isLoading: true, error: null });

      try {
        // Use Promise.race for a reliable timeout that doesn't depend on library support
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), 20000)
        );

        const query = supabase
          .from('products')
          .select(`
            *,
            images:product_images(*)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        const { data, error: fetchError } = await Promise.race([query, timeout]);

        if (fetchError) throw fetchError;

        set({
          products: data || [],
          isLoading: false,
          error: null,
          lastFetched: Date.now(),
        });
      } catch (err: any) {
        console.error('[ProductStore] Fetch error:', err.message);
        set({
          error: new Error(err.message || 'Failed to load products'),
          isLoading: false,
        });
      }
    };

    inFlightPromise = doFetch().finally(() => {
      inFlightPromise = null;
      // Safety net: ensure isLoading never stays permanently true
      set(state => state.isLoading ? { isLoading: false } : {});
    });

    return inFlightPromise;
  },
}));
