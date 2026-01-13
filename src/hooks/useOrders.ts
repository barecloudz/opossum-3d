import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 15000);
      });

      const fetchPromise = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]);

      // Only update state if still mounted
      if (!isMountedRef.current) return;

      if (fetchError) throw fetchError;

      setOrders(data || []);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
        console.error('Error fetching orders:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchOrders();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchOrders]);

  return { orders, isLoading, error, refetch: fetchOrders };
}
