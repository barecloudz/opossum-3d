import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { Profile, QuoteRequest } from '../types';

export function useCustomers() {
  const { data, isLoading, error, refetch } = useSupabaseQuery<Profile[]>(
    (signal) =>
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })
        .abortSignal(signal),
    []
  );

  return { customers: data || [], isLoading, error, refetch };
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchTeamMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      if (!mountedRef.current) return;
      if (adminError) throw adminError;
      setTeamMembers(admins || []);

      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true })
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);
      if (!mountedRef.current) return;
      if (usersError) throw usersError;
      setAllUsers(users || []);
    } catch (err: any) {
      if (mountedRef.current) {
        const msg = err.name === 'AbortError' ? 'Request timed out. Please try again.' : err.message;
        setError(new Error(msg));
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const promoteToAdmin = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);
    if (error) throw error;
    await fetchTeamMembers();
  };

  const demoteToCustomer = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'customer' })
      .eq('id', userId);
    if (error) throw error;
    await fetchTeamMembers();
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchTeamMembers();
    return () => { mountedRef.current = false; };
  }, [fetchTeamMembers]);

  return { teamMembers, allUsers, isLoading, error, refetch: fetchTeamMembers, promoteToAdmin, demoteToCustomer };
}

export function useQuoteRequests() {
  const { data, isLoading, error, refetch } = useSupabaseQuery<QuoteRequest[]>(
    (signal) =>
      supabase
        .from('quote_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(signal),
    []
  );

  return { quotes: data || [], isLoading, error, refetch };
}
