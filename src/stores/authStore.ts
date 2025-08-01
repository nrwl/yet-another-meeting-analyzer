import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

// Extend Window interface to include our cleanup function
declare global {
  interface Window {
    __authCleanup?: () => void;
  }
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  handleAuthCallback: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'An error occurred' });
    }
  },
  initializeAuth: async () => {
    try {
      // First, set up the auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null, loading: false });
      });

      // Then get the initial session
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user ?? null, loading: false });

      // Store subscription for cleanup
      const cleanup = () => {
        subscription.unsubscribe();
      };
      // Attach cleanup to window for component unmount
      window.__authCleanup = cleanup;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'An error occurred', loading: false });
    }
  },
  signInWithGoogle: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      set({ loading: false });
    }
  },
  handleAuthCallback: async () => {
    try {
      set({ loading: true, error: null });
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) throw new Error('No session found');
      set({ user: session.user, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'An error occurred', loading: false });
      throw error;
    }
  },
}));
