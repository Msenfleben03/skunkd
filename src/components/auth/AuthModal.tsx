import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/context/AuthContext';

type Tab = 'guest' | 'sign-in' | 'sign-up';

interface AuthModalProps {
  onClose?: () => void;
  /** If true, show upgrade flow instead of full auth menu */
  upgradeMode?: boolean;
}

export function AuthModal({ onClose, upgradeMode = false }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>(upgradeMode ? 'sign-up' : 'guest');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const auth = useAuthContext();

  const handleGuest = async () => {
    const ok = await auth.signInAsGuest();
    if (ok) onClose?.();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await auth.signInWithEmail(email, password);
    if (ok) onClose?.();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = upgradeMode
      ? await auth.upgradeGuestAccount(email, password, displayName)
      : await auth.signUpWithEmail(email, password, displayName);
    if (ok) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={upgradeMode ? 'Save your account' : 'Sign in'}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'relative w-full sm:max-w-sm mx-4 sm:mx-auto',
          'rounded-t-3xl sm:rounded-2xl',
          'bg-skunk-dark border border-white/10',
          'p-6 pb-8',
        )}
        style={{
          background: 'linear-gradient(160deg, #1a2e22 0%, #0d0d1a 100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2
              className="text-xl font-black text-cream"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {upgradeMode ? "Save Your Progress" : "Join SKUNK'D"}
            </h2>
            {upgradeMode && (
              <p className="text-cream/40 text-xs mt-1">
                Link an account to keep your stats and game history.
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-cream/40 hover:text-cream/80 transition-colors text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tabs — hidden in upgrade mode */}
        {!upgradeMode && (
          <div className="flex gap-1 mb-5 p-1 bg-white/5 rounded-xl">
            {(['guest', 'sign-in', 'sign-up'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                  tab === t
                    ? 'bg-gold text-skunk-dark shadow'
                    : 'text-cream/50 hover:text-cream/80',
                )}
              >
                {t === 'guest' ? 'Play as Guest' : t === 'sign-in' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {auth.error && (
          <p className="text-red-400 text-xs mb-4 px-1">{auth.error}</p>
        )}

        {/* Guest tab */}
        {tab === 'guest' && !upgradeMode && (
          <div className="space-y-3">
            <p className="text-cream/50 text-sm text-center mb-4">
              Jump in immediately. Stats not saved.
            </p>
            <button
              onClick={handleGuest}
              disabled={auth.loading}
              className={cn(
                'w-full py-3.5 rounded-xl font-black text-lg',
                'bg-gold text-skunk-dark',
                'hover:bg-gold-bright transition-all duration-150 active:scale-[0.97]',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {auth.loading ? 'Loading…' : 'Deal Me In'}
            </button>
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-cream/30 text-xs">or sign in to save stats</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            {/* Social */}
            <div className="flex gap-2">
              <button
                onClick={auth.signInWithGoogle}
                disabled={auth.loading}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-cream/70 text-sm hover:bg-white/5 transition-colors"
              >
                Google
              </button>
              <button
                onClick={auth.signInWithApple}
                disabled={auth.loading}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-cream/70 text-sm hover:bg-white/5 transition-colors"
              >
                Apple
              </button>
            </div>
          </div>
        )}

        {/* Sign In tab */}
        {(tab === 'sign-in') && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={inputClass}
              data-testid="auth-email-input"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={inputClass}
              data-testid="auth-password-input"
            />
            <button
              type="submit"
              disabled={auth.loading}
              className={submitBtnClass}
              style={{ fontFamily: "'Playfair Display', serif" }}
              data-testid="auth-submit-btn"
            >
              {auth.loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Sign Up / Upgrade tab */}
        {(tab === 'sign-up' || upgradeMode) && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              className={inputClass}
              data-testid="auth-name-input"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={inputClass}
              data-testid="auth-email-input"
            />
            <input
              type="password"
              placeholder="Password (8+ characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
              data-testid="auth-password-input"
            />
            <button
              type="submit"
              disabled={auth.loading}
              className={submitBtnClass}
              style={{ fontFamily: "'Playfair Display', serif" }}
              data-testid="auth-submit-btn"
            >
              {auth.loading
                ? upgradeMode
                  ? 'Saving…'
                  : 'Creating account…'
                : upgradeMode
                  ? 'Save My Account'
                  : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputClass = cn(
  'w-full px-4 py-3 rounded-xl text-sm',
  'bg-white/5 border border-white/10 text-cream placeholder-cream/30',
  'focus:outline-none focus:border-gold/60 focus:bg-white/8',
  'transition-colors',
);

const submitBtnClass = cn(
  'w-full py-3.5 rounded-xl font-black text-lg',
  'bg-gold text-skunk-dark',
  'hover:bg-gold-bright transition-all duration-150 active:scale-[0.97]',
  'disabled:opacity-60 disabled:cursor-not-allowed',
);
