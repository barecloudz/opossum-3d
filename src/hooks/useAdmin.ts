import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, QuoteRequest } from '../types';

export function useCustomers() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCustomers(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, isLoading, error, refetch: fetchCustomers };
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch admin users
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (adminError) throw adminError;
      setTeamMembers(admins || []);

      // Fetch all users for promotion dropdown
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true });

      if (usersError) throw usersError;
      setAllUsers(users || []);

    } catch (err) {
      setError(err as Error);
      console.error('Error fetching team members:', err);
    } finally {
      setIsLoading(false);
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
    fetchTeamMembers();
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

  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('quote_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setQuotes(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching quotes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  return { quotes, isLoading, error, refetch: fetchQuotes };
}
