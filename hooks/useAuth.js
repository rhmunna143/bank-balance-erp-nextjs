import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, profile, session, isSuperAdmin, loading, initialized, signIn, signUp, signOut, updateProfile } =
    useAuthStore();

  return {
    user,
    profile,
    session,
    isSuperAdmin,
    loading,
    initialized,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
  };
}
