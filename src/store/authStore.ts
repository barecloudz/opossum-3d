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
  isProfileLoading: boolean;
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
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      session: null,
      isLoading: true,
      isProfileLoading: false,
      isAdmin: false,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile, isAdmin: profile?.role === 'admin' }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),

      fetchProfile: async () => {
        const { user } = get();
        if (!user) return;

        set({ isProfileLoading: true });

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          set({ isProfileLoading: false });
          return;
        }

        set({ profile: data, isAdmin: data?.role === 'admin', isProfileLoading: false });
      },

      updateProfile: async (updates) => {
        const { user } = get();
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

        if (data.user && metadata) {
          try {
            await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                email: data.user.email,
                role: 'customer',
                first_name: metadata.first_name || null,
                last_name: metadata.last_name || null,
                marketing_opt_in: metadata.marketing_opt_in || false,
              }, { onConflict: 'id' });

            await get().fetchProfile();
          } catch (err) {
            console.error('Error updating profile after signup:', err);
          }
        }

        return { error: null };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, session: null, isAdmin: false });
      },

      initialize: () => {
        set({ isLoading: true });

        // Register the listener FIRST — before any awaits — so INITIAL_SESSION
        // is never missed if it fires while async work is still in flight.
        // Supabase docs: do NOT use async callbacks here; it can corrupt their
        // internal auth state machine. Fire-and-forget fetchProfile instead.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          set({ user: session?.user ?? null, session });

          if (event === 'INITIAL_SESSION') {
            set({ isLoading: false });
            if (session?.user) {
              get().fetchProfile().catch(console.error);
            } else {
              set({ profile: null, isAdmin: false, isProfileLoading: false });
            }
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (session?.user) {
              get().fetchProfile().catch(console.error);
            }
          } else if (event === 'SIGNED_OUT') {
            set({ profile: null, isAdmin: false, isProfileLoading: false });
          }
        });

        const safetyTimeout = setTimeout(() => {
          set(state => state.isLoading ? { isLoading: false, isProfileLoading: false } : {});
        }, 5000);

        return () => {
          subscription.unsubscribe();
          clearTimeout(safetyTimeout);
        };
      },
    }),
    {
      name: 'nexalon-auth',
      partialize: () => ({}), // Don't persist auth state to localStorage
    }
  )
);
