import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { Product } from '../types';

export function useProducts(includeInactive = false) {
  const { data, isLoading, error, refetch } = useSupabaseQuery<Product[]>(
    (signal) => {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      return query;
    },
    [includeInactive]
  );

  return { products: data || [], isLoading, error, refetch };
}
