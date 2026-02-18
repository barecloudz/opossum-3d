import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { Order } from '../types';

export function useOrders() {
  const { data, isLoading, error, refetch } = useSupabaseQuery<Order[]>(
    (signal) =>
      supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(signal),
    []
  );

  return { orders: data || [], isLoading, error, refetch };
}
