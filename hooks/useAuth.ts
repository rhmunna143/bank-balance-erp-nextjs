import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/nextjs';

export function useAuth() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { sessionId } = useClerkAuth();
  const clerk = useClerk();

  // Map Clerk user to our expected format
  const mappedUser = user ? {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress,
    full_name: user.fullName,
    avatar_url: user.imageUrl,
  } : null;

  return {
    user: mappedUser,
    profile: mappedUser, // Usually the same as user for Clerk
    session: sessionId,
    isSuperAdmin: false, // You could check clerk metadata for roles
    loading: !isLoaded,
    initialized: isLoaded,
    signIn: () => clerk.redirectToSignIn(),
    signUp: () => clerk.redirectToSignUp(),
    signOut: () => clerk.signOut(),
    updateProfile: async (data: any) => {
      if (user) {
        await user.update({
          firstName: data.full_name?.split(' ')[0],
          lastName: data.full_name?.split(' ').slice(1).join(' '),
        });
      }
    },
    isAuthenticated: !!isSignedIn,
  };
}
