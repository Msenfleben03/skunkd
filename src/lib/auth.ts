import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string | null;
  isGuest: boolean;
  displayName: string;
}

/** Sign in as an anonymous guest. Stats are not tracked for guest sessions. */
export async function signInAsGuest(): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`Guest sign-in failed: ${error.message}`);
  const user = data.user!;
  return {
    id: user.id,
    email: null,
    isGuest: true,
    displayName: 'Guest',
  };
}

/** Sign in with email + password. */
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed: ${error.message}`);
  const user = data.user!;
  return {
    id: user.id,
    email: user.email ?? null,
    isGuest: false,
    displayName: user.user_metadata?.display_name ?? user.email ?? 'Player',
  };
}

/** Sign up with email + password. */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw new Error(`Sign-up failed: ${error.message}`);
  const user = data.user!;
  return {
    id: user.id,
    email: user.email ?? null,
    isGuest: false,
    displayName,
  };
}

/** Sign in with Google OAuth. */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(`Google sign-in failed: ${error.message}`);
}

/** Sign in with Apple. */
export async function signInWithApple(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(`Apple sign-in failed: ${error.message}`);
}

/** Sign out. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Sign-out failed: ${error.message}`);
}

/**
 * Upgrade a guest account to a full account by linking email.
 * Preserves game history from the guest session.
 */
export async function upgradeGuestAccount(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    email,
    password,
    data: { display_name: displayName },
  });
  if (error) throw new Error(`Account upgrade failed: ${error.message}`);
}

/** Get current session user as AuthUser, or null if not signed in. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    isGuest: user.is_anonymous ?? false,
    displayName: user.user_metadata?.display_name ?? user.email ?? 'Player',
  };
}
