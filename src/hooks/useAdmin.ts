import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { Profile, QuoteRequest } from '../types';

export function useCustomers() {
  const { data, isLoading, error, refetch } = useSupabaseQuery<Profile[]>(
    () =>
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false }),
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
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 10000)
      );

      const [adminsResult, usersResult] = await Promise.race([
        Promise.all([
          supabase.from('profiles').select('*').eq('role', 'admin').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*').order('email', { ascending: true }),
        ]),
        timeout,
      ]);

      if (!mountedRef.current) return;
      if (adminsResult.error) throw adminsResult.error;
      if (usersResult.error) throw usersResult.error;
      setTeamMembers(adminsResult.data || []);
      setAllUsers(usersResult.data || []);
    } catch (err: any) {
      if (mountedRef.current) {
        setError(new Error(err.message || 'Failed to load team members'));
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
    () =>
      supabase
        .from('quote_requests')
        .select('*')
        .order('created_at', { ascending: false }),
    []
  );

  return { quotes: data || [], isLoading, error, refetch };
}
