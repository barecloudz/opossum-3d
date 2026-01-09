import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export function useProducts(includeInactive = false) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      setError(new Error('Request timed out'));
      setIsLoading(false);
    }, 10000);

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

      const { data, error: fetchError } = await query;
      clearTimeout(timeoutId);

      if (fetchError) throw fetchError;

      setProducts(data || []);
      setIsLoading(false);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Error fetching products:', err);
      setError(err as Error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [includeInactive]);

  return { products, isLoading, error, refetch: fetchProducts };
}
