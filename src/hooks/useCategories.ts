import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { Category } from '../types';

interface UseCategoriesOptions {
  includeInactive?: boolean;
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const { includeInactive = false } = options;

  const { data, isLoading, error, refetch } = useSupabaseQuery<Category[]>(
    () => {
      let query = supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      return query;
    },
    [includeInactive]
  );

  return { categories: data || [], isLoading, error, refetch };
}
