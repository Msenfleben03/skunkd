import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  signInAsGuest,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithApple,
  signOut as authSignOut,
  upgradeGuestAccount,
  type AuthUser,
} from '@/lib/auth';

export interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signInAsGuest: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  upgradeGuestAccount: (email: string, password: string, displayName: string) => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          isGuest: session.user.is_anonymous ?? false,
          displayName:
            session.user.user_metadata?.display_name ??
            session.user.email ??
            'Player',
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthAction = useCallback(async (action: () => Promise<AuthUser | void>) => {
    setError(null);
    setLoading(true);
    try {
      const result = await action();
      if (result) setUser(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    clearError: useCallback(() => setError(null), []),

    signInAsGuest: useCallback(
      () => handleAuthAction(signInAsGuest),
      [handleAuthAction]
    ),
    signInWithEmail: useCallback(
      (email: string, password: string) =>
        handleAuthAction(() => signInWithEmail(email, password)),
      [handleAuthAction]
    ),
    signUpWithEmail: useCallback(
      (email: string, password: string, displayName: string) =>
        handleAuthAction(() => signUpWithEmail(email, password, displayName)),
      [handleAuthAction]
    ),
    signInWithGoogle: useCallback(
      () => handleAuthAction(signInWithGoogle),
      [handleAuthAction]
    ),
    signInWithApple: useCallback(
      () => handleAuthAction(signInWithApple),
      [handleAuthAction]
    ),
    signOut: useCallback(
      () => handleAuthAction(authSignOut),
      [handleAuthAction]
    ),
    upgradeGuestAccount: useCallback(
      (email: string, password: string, displayName: string) =>
        handleAuthAction(() => upgradeGuestAccount(email, password, displayName)),
      [handleAuthAction]
    ),
  };
}
