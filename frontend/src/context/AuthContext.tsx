import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authService, mapSupabaseUser, type AuthUser } from '../services/auth';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoggedIn: boolean;
  loading: boolean;
  loginModalOpen: boolean;
  loginPromptMessage: string | null;
  openLoginModal: (message?: string) => void;
  closeLoginModal: () => void;
  signInWithOAuth: (provider: 'github' | 'google') => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const currentSession = await authService.getSession();
        if (!mounted) return;

        if (currentSession) {
          setSession(currentSession);
          setUser(mapSupabaseUser(currentSession.user));
        } else {
          // Check local user fallback
          const localUser = await authService.getUser();
          if (mounted && localUser) {
            setUser(localUser);
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // Listen for auth events (e.g. OAuth redirect callback, token refresh, sign-in, sign-out)
    const unsubscribe = authService.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user) {
        setUser(mapSupabaseUser(newSession.user));
      } else {
        authService.getUser().then((u) => {
          if (mounted) setUser(u);
        });
      }
      setLoading(false);

      // Clean up OAuth hash fragments in address bar if present
      if (window.location.hash.includes('access_token=') || window.location.hash.includes('error=')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const openLoginModal = useCallback((message?: string) => {
    setLoginPromptMessage(message || null);
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    setLoginPromptMessage(null);
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'github' | 'google') => {
    const res = await authService.signInWithOAuth(provider);
    if (!res.error) {
      // If local mock was used, refresh user
      const currentUser = await authService.getUser();
      setUser(currentUser);
      closeLoginModal();
    }
    return res;
  }, [closeLoginModal]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const res = await authService.signInWithEmail(email, password);
    if (!res.error && res.user) {
      setUser(res.user);
      closeLoginModal();
    }
    return { error: res.error };
  }, [closeLoginModal]);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const res = await authService.signUpWithEmail(email, password);
    if (!res.error && res.user) {
      setUser(res.user);
      closeLoginModal();
    }
    return { error: res.error };
  }, [closeLoginModal]);

  const signInAsDemo = useCallback(async () => {
    const demo = await authService.signInAsDemo();
    setUser(demo);
    closeLoginModal();
  }, [closeLoginModal]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoggedIn: Boolean(user),
    loading,
    loginModalOpen,
    loginPromptMessage,
    openLoginModal,
    closeLoginModal,
    signInWithOAuth,
    signInWithEmail,
    signUpWithEmail,
    signInAsDemo,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

