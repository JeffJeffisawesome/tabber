import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  provider?: string;
}

const LOCAL_STORAGE_USER_KEY = 'tabber_local_auth_user';

/**
 * Helper to convert Supabase User into our unified AuthUser
 */
export function mapSupabaseUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email,
    name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Guitarist',
    avatar_url: meta.avatar_url || meta.picture,
    provider: user.app_metadata?.provider || 'supabase',
  };
}

/**
 * Authentication service supporting Supabase OAuth (GitHub, Google),
 * Email/Password, and a fallback for local offline development.
 */
export const authService = {
  /**
   * Get the current active session
   */
  async getSession(): Promise<Session | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Error fetching Supabase session:', error.message);
          return null;
        }
        return data.session;
      } catch (err) {
        console.warn('Failed to retrieve Supabase session:', err);
        return null;
      }
    }

    // Local mode check
    return null;
  },

  /**
   * Get the current user
   */
  async getUser(): Promise<AuthUser | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;
        return mapSupabaseUser(user);
      } catch {
        return null;
      }
    }

    // Local Storage mock user
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Ignore
    }
    return null;
  },

  /**
   * Sign in with OAuth provider (GitHub, Google)
   */
  async signInWithOAuth(provider: 'github' | 'google'): Promise<{ error: Error | null }> {
    if (isSupabaseConfigured() && supabase) {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });
      return { error: error ? new Error(error.message) : null };
    }

    // Local mock sign-in when Supabase is not configured
    const mockUser: AuthUser = {
      id: `mock-${provider}-${Date.now()}`,
      email: `${provider}_user@tabber.local`,
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Guitarist`,
      provider,
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    return { error: null };
  },

  /**
   * Sign in with Email and Password
   */
  async signInWithEmail(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { user: null, error: new Error(error.message) };
      return { user: mapSupabaseUser(data.user), error: null };
    }

    // Local mock login
    const mockUser: AuthUser = {
      id: `mock-${Date.now()}`,
      email,
      name: email.split('@')[0],
      provider: 'local',
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    return { user: mockUser, error: null };
  },

  /**
   * Sign up with Email and Password
   */
  async signUpWithEmail(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) return { user: null, error: new Error(error.message) };
      return { user: mapSupabaseUser(data.user), error: null };
    }

    // Local mock sign up
    const mockUser: AuthUser = {
      id: `mock-${Date.now()}`,
      email,
      name: email.split('@')[0],
      provider: 'local',
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    return { user: mockUser, error: null };
  },

  /**
   * Instant 1-click Demo Login (convenient for immediate testing)
   */
  async signInAsDemo(): Promise<AuthUser> {
    const demoUser: AuthUser = {
      id: 'demo-user-123',
      email: 'demo.guitarist@tabber.app',
      name: 'Demo Guitarist',
      provider: 'demo',
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
    return demoUser;
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
      return () => {
        subscription.unsubscribe();
      };
    }

    // Fallback for storage event (cross-tab local auth)
    const handler = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_USER_KEY) {
        callback('USER_UPDATED', null);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },
};

