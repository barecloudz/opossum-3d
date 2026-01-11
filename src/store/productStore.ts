import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

interface ProductStore {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
  lastFetched: number | null;
  fetchProducts: (force?: boolean) => Promise<void>;
}

// Cache products for 5 minutes before refetching
const CACHE_DURATION = 5 * 60 * 1000;

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchProducts: async (force = false) => {
    const { lastFetched, isLoading, products } = get();
    const now = Date.now();

    // Skip if already loading
    if (isLoading) {
      console.log('[ProductStore] Already loading, skipping...');
      return;
    }

    // Skip if we have cached data and it's not expired (unless forced)
    if (!force && lastFetched && products.length > 0 && (now - lastFetched) < CACHE_DURATION) {
      console.log('[ProductStore] Using cached data', {
        age: `${Math.round((now - lastFetched) / 1000)}s`,
        productCount: products.length
      });
      return;
    }

    console.log('[ProductStore] Fetching products...', { force, hadCache: !!lastFetched });
    set({ isLoading: true, error: null });

    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = 3;

    const doFetch = async (): Promise<void> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[ProductStore] Request timeout after 15s');
        controller.abort();
      }, 15000);

      try {
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

        const duration = Date.now() - startTime;
        console.log('[ProductStore] Fetch complete', {
          duration: `${duration}ms`,
          productCount: data?.length || 0,
          error: fetchError?.message
        });

        if (fetchError) throw fetchError;

        set({
          products: data || [],
          isLoading: false,
          error: null,
          lastFetched: Date.now()
        });
      } catch (err: any) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        console.error('[ProductStore] Fetch error', {
          duration: `${duration}ms`,
          error: err.message,
          name: err.name,
          retry: retryCount
        });

        // Retry on timeout or network error
        if ((err.name === 'AbortError' || err.message?.includes('network')) && retryCount < maxRetries) {
          retryCount++;
          console.log(`[ProductStore] Retry attempt ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return doFetch();
        }

        const errorMessage = err.name === 'AbortError'
          ? 'Request timed out. Please check your connection and try again.'
          : err.message || 'Failed to load products';

        set({
          error: new Error(errorMessage),
          isLoading: false
        });
      }
    };

    await doFetch();
  },
}));
