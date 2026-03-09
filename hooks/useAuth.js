import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, profile, session, loading, initialized, signIn, signUp, signOut, updateProfile } =
    useAuthStore();

  return {
    user,
    profile,
    session,
    loading,
    initialized,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
  };
}
