import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { Product } from '../types';

export function useProduct(slug: string) {
  const { data, isLoading, error, refetch } = useSupabaseQuery<Product>(
    (signal) =>
      supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .abortSignal(signal)
        .single(),
    [slug],
    { fetchOnMount: !!slug }
  );

  return { product: data, isLoading, error, refetch };
}
