import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export function useProducts(includeInactive = false) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `)
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query;
      clearTimeout(timeoutId);

      if (fetchError) throw fetchError;

      setProducts(data || []);
      retryCount.current = 0; // Reset retry count on success
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching products:', error);

      // Retry logic
      if (retryCount.current < maxRetries && error.name !== 'AbortError') {
        retryCount.current += 1;
        console.log(`Retrying... (${retryCount.current}/${maxRetries})`);
        setTimeout(fetchProducts, 1000 * retryCount.current); // Exponential backoff
        return;
      }

      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, isLoading, error, refetch: fetchProducts };
}
