import { create } from 'zustand';
import { authService } from '@/services/authService';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const session = await authService.getSession();
      if (session?.user) {
        let profile = null;
        try {
          profile = await authService.getProfile(session.user.id);
        } catch (e) {
          console.warn('Profile not found, continuing without it');
        }
        set({ user: session.user, profile, session, loading: false, initialized: true });
      } else {
        set({ user: null, profile: null, session: null, loading: false, initialized: true });
      }

      // Listen for auth state changes (login, logout, token refresh)
      authService.onAuthStateChange(async (event, newSession) => {
        if (newSession?.user) {
          let profile = null;
          try {
            profile = await authService.getProfile(newSession.user.id);
          } catch (e) { /* profile may not exist yet */ }
          set({ user: newSession.user, profile, session: newSession });
        } else {
          set({ user: null, profile: null, session: null });
        }
      });
    } catch (error) {
      console.error('Auth init error:', error);
      set({ user: null, profile: null, session: null, loading: false, initialized: true });
    }
  },

  signIn: async (email, password) => {
    const data = await authService.signIn(email, password);
    let profile = null;
    try {
      profile = await authService.getProfile(data.user.id);
    } catch (e) {
      console.warn('Profile not found after login');
    }
    set({ user: data.user, profile, session: data.session });
    return data;
  },

  signUp: async (email, password, fullName) => {
    const data = await authService.signUp(email, password, fullName);
    return data;
  },

  signOut: async () => {
    await authService.signOut();
    set({ user: null, profile: null, session: null });
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return;
    const profile = await authService.updateProfile(user.id, updates);
    set({ profile });
    return profile;
  },

  setSession: (session) => {
    set({ session, user: session?.user || null });
  },
}));
