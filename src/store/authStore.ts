import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '../types';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'email' | 'role' | 'created_at' | 'updated_at'>>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string; marketing_opt_in?: boolean }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      isLoading: true,
      isAdmin: false,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile, isAdmin: profile?.role === 'admin' }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),

      fetchProfile: async () => {
        const { user } = get();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        set({ profile: data, isAdmin: data?.role === 'admin' });
      },

      updateProfile: async (updates) => {
        const { user, profile } = get();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }

        set({ profile: data, isAdmin: data?.role === 'admin' });
      },

      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { error };
        }

        set({ user: data.user, session: data.session });
        await get().fetchProfile();
        return { error: null };
      },

      signUp: async (email, password, metadata) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
          },
        });

        if (error) {
          return { error };
        }

        set({ user: data.user, session: data.session });
        return { error: null };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, session: null, isAdmin: false });
      },

      initialize: async () => {
        set({ isLoading: true });

        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          set({ user: session.user, session });
          await get().fetchProfile();
        }

        set({ isLoading: false });

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
          set({ user: session?.user || null, session });

          if (session?.user) {
            await get().fetchProfile();
          } else {
            set({ profile: null, isAdmin: false });
          }
        });
      },
    }),
    {
      name: 'opossum-auth',
      partialize: () => ({}), // Don't persist auth state to localStorage
    }
  )
);
