import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, QuoteRequest } from '../types';

export function useCustomers() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 15000);
      });

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]);

      if (!isMountedRef.current) return;
      if (fetchError) throw fetchError;

      setCustomers(data || []);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
        console.error('Error fetching customers:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchCustomers();
    return () => { isMountedRef.current = false; };
  }, [fetchCustomers]);

  return { customers, isLoading, error, refetch: fetchCustomers };
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 15000);
      });

      // Fetch admin users
      const adminsPromise = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      const { data: admins, error: adminError } = await Promise.race([adminsPromise, timeoutPromise]);

      if (!isMountedRef.current) return;
      if (adminError) throw adminError;
      setTeamMembers(admins || []);

      // Fetch all users for promotion dropdown
      const usersPromise = supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true });

      const { data: users, error: usersError } = await Promise.race([usersPromise, timeoutPromise]);

      if (!isMountedRef.current) return;
      if (usersError) throw usersError;
      setAllUsers(users || []);

    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
        console.error('Error fetching team members:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
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
    isMountedRef.current = true;
    fetchTeamMembers();
    return () => { isMountedRef.current = false; };
  }, [fetchTeamMembers]);

  return {
    teamMembers,
    allUsers,
    isLoading,
    error,
    refetch: fetchTeamMembers,
    promoteToAdmin,
    demoteToCustomer,
  };
}

export function useQuoteRequests() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 15000);
      });

      const fetchPromise = supabase
        .from('quote_requests')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]);

      if (!isMountedRef.current) return;
      if (fetchError) throw fetchError;

      setQuotes(data || []);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
        console.error('Error fetching quotes:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchQuotes();
    return () => { isMountedRef.current = false; };
  }, [fetchQuotes]);

  return { quotes, isLoading, error, refetch: fetchQuotes };
}
