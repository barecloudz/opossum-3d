import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const store = useAuthStore();

  return {
    user: store.user,
    profile: store.profile,
    session: store.session,
    isLoading: store.isLoading,
    isAdmin: store.isAdmin,
    isAuthenticated: !!store.user,
    signIn: store.signIn,
    signUp: store.signUp,
    signOut: store.signOut,
  };
}
