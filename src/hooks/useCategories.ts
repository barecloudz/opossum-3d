import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

interface UseCategoriesOptions {
  includeInactive?: boolean;
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const { includeInactive = false } = options;
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 15000);
      });

      let query = supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      // Only filter by active if not including inactive
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await Promise.race([query, timeoutPromise]);

      // Only update state if still mounted
      if (!isMountedRef.current) return;

      if (fetchError) throw fetchError;

      setCategories(data || []);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
        console.error('Error fetching categories:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [includeInactive]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchCategories();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchCategories]);

  return { categories, isLoading, error, refetch: fetchCategories };
}
