import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track current fetch to cancel if slug changes
  const currentFetchRef = useRef<string | null>(null);

  const fetchProduct = useCallback(async (productSlug: string) => {
    if (!productSlug) {
      setIsLoading(false);
      return;
    }

    // Mark this as the current fetch
    currentFetchRef.current = productSlug;

    try {
      setIsLoading(true);
      setError(null);

      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 15000);
      });

      const fetchPromise = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `)
        .eq('slug', productSlug)
        .eq('is_active', true)
        .single();

      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]);

      // Check if this fetch is still relevant (slug hasn't changed and component still mounted)
      if (!isMountedRef.current || currentFetchRef.current !== productSlug) {
        return;
      }

      if (fetchError) throw fetchError;

      setProduct(data);
    } catch (err) {
      // Only update error state if still mounted and relevant
      if (isMountedRef.current && currentFetchRef.current === productSlug) {
        setError(err as Error);
        console.error('Error fetching product:', err);
      }
    } finally {
      // Only update loading state if still mounted and relevant
      if (isMountedRef.current && currentFetchRef.current === productSlug) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchProduct(slug);

    // Cleanup: mark as unmounted to prevent state updates
    return () => {
      isMountedRef.current = false;
    };
  }, [slug, fetchProduct]);

  const refetch = useCallback(() => {
    fetchProduct(slug);
  }, [slug, fetchProduct]);

  return { product, isLoading, error, refetch };
}
