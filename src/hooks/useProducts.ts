import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export function useProducts(includeInactive = false) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), 8000);
    });

    try {
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

      // Race between query and timeout
      const { data, error: fetchError } = await Promise.race([
        Promise.resolve(query),
        timeoutPromise
      ]);

      if (fetchError) throw fetchError;

      setProducts(data || []);
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching products:', error);
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
