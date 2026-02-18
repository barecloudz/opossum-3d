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

    const doFetch = async (attempt = 1): Promise<void> => {
      set({ isLoading: true, error: null });

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const { data, error: fetchError } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(*),
            images:product_images(*),
            variants:product_variants(*)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (fetchError) throw fetchError;

        set({
          products: data || [],
          isLoading: false,
          error: null,
          lastFetched: Date.now(),
        });
      } catch (err: any) {
        console.error(`[ProductStore] Fetch error (attempt ${attempt}):`, err.message);

        // Retry up to 2 times on timeout or network errors
        if (attempt < 3 && (err.name === 'AbortError' || err.message?.includes('network') || err.message?.includes('fetch'))) {
          console.log(`[ProductStore] Retrying in ${attempt}s...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          return doFetch(attempt + 1);
        }

        const errorMessage = err.name === 'AbortError'
          ? 'Request timed out. Please check your connection and try again.'
          : err.message || 'Failed to load products';

        set({
          error: new Error(errorMessage),
          isLoading: false,
        });
      }
    };

    inFlightPromise = doFetch().finally(() => {
      inFlightPromise = null;
    });

    return inFlightPromise;
  },
}));
