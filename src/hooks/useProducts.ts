import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export function useProducts(includeInactive = false) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const fetchProducts = useCallback(async (isRetry = false) => {
    const startTime = Date.now();
    console.log('[useProducts] Starting fetch...', { isRetry, includeInactive });

    if (!isRetry) {
      setIsLoading(true);
      setError(null);
      retryCount.current = 0;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[useProducts] Request timeout after 15s');
      controller.abort();
    }, 15000);

    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query;
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      console.log('[useProducts] Fetch complete', {
        duration: `${duration}ms`,
        productCount: data?.length || 0,
        error: fetchError?.message
      });

      if (fetchError) throw fetchError;

      setProducts(data || []);
      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      console.error('[useProducts] Fetch error', { duration: `${duration}ms`, error: err.message, name: err.name });

      // If aborted (timeout) or network error, retry
      if ((err.name === 'AbortError' || err.message?.includes('network')) && retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(`[useProducts] Retry attempt ${retryCount.current}/${maxRetries}`);
        setTimeout(() => fetchProducts(true), 1000 * retryCount.current);
        return;
      }

      console.error('[useProducts] Final error:', err);
      const errorMessage = err.name === 'AbortError'
        ? 'Request timed out. Please check your connection and try again.'
        : err.message || 'Failed to load products';
      setError(new Error(errorMessage));
      setIsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, isLoading, error, refetch: () => fetchProducts(false) };
}
