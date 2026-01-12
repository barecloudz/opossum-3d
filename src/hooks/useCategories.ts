import { useState, useEffect, useCallback } from 'react';
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

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      // Only filter by active if not including inactive
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setCategories(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, isLoading, error, refetch: fetchCategories };
}
