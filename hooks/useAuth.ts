import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/nextjs';

import useSWR from 'swr';
import { getCurrentUser } from '@/services/userService';

export function useAuth() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { sessionId } = useClerkAuth();
  const clerk = useClerk();

  const { data: dbUser } = useSWR(
    isSignedIn ? 'currentUser' : null,
    getCurrentUser
  );

  // Map Clerk user to our expected format
  const mappedUser = user ? {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress,
    full_name: user.fullName,
    avatar_url: user.imageUrl,
    isSuperAdmin: dbUser?.isSuperAdmin || false,
  } : null;

  return {
    user: mappedUser,
    profile: mappedUser, // Usually the same as user for Clerk
    session: sessionId,
    isSuperAdmin: dbUser?.isSuperAdmin || false,
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
