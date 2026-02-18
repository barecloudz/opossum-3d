import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { Category } from '../types';

interface UseCategoriesOptions {
  includeInactive?: boolean;
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const { includeInactive = false } = options;

  const { data, isLoading, error, refetch } = useSupabaseQuery<Category[]>(
    (signal) => {
      let query = supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
        .abortSignal(signal);

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      return query;
    },
    [includeInactive]
  );

  return { categories: data || [], isLoading, error, refetch };
}
