import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { Order } from '../types';

export function useOrders() {
  const { data, isLoading, error, refetch } = useSupabaseQuery<Order[]>(
    () =>
      supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false }),
    []
  );

  // Keep a ref so the subscription callback always calls the latest refetch
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  // Real-time: refetch when any order is inserted or updated
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        refetchRef.current();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { orders: data || [], isLoading, error, refetch };
}
