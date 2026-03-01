// Task 5.3: Join game page — handles /join/:code deep links
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/context/AuthContext';
import { joinGame } from '@/lib/gameApi';
import { saveActiveGame } from '@/lib/activeGameStorage';

export function Join() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const auth = useAuthContext();

  const [status, setStatus] = useState<'idle' | 'joining' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Auto-join once auth is ready
  useEffect(() => {
    if (auth.loading) return;
    if (!code) {
      setError('Invalid invite link — no code found.');
      setStatus('error');
      return;
    }
    handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading]);

  const handleJoin = async () => {
    if (!code) return;
    setStatus('joining');
    setError(null);

    try {
      // Sign in as guest if not already authenticated
      if (!auth.user) {
        await auth.signInAsGuest();
      }

      const gameSummary = await joinGame(code);
      saveActiveGame({ gameId: gameSummary.game.id, inviteCode: code.toUpperCase(), seat: gameSummary.localSeat });
      // Navigate to game screen with joined game context
      navigate('/', { state: { joinedGame: gameSummary } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join game');
      setStatus('error');
    }
  };

  return (
    <div
      className="h-screen flex flex-col items-center justify-center relative overflow-hidden bg-felt-gradient"
    >
      {/* Felt texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity: 0.045,
          mixBlendMode: 'overlay',
        }}
      />

      <div className="relative z-10 text-center px-8 max-w-xs w-full animate-float-in">
        {/* Logo small */}
        <img
          src="/skunkd-logo.png"
          alt="SKUNK'D"
          className="w-24 h-24 object-contain mx-auto mb-4 opacity-90"
        />

        <h1
          className="text-2xl font-black text-gold mb-2 font-display"
        >
          {status === 'error' ? 'Oops.' : "You've Been Challenged"}
        </h1>

        {status === 'idle' || status === 'joining' ? (
          <>
            <p className="text-cream/50 text-sm mb-6">
              {status === 'joining'
                ? 'Joining the game…'
                : `Joining game ${code}…`}
            </p>

            {/* Invite code badge */}
            {code && (
              <div className="bg-white/5 border border-white/10 rounded-xl py-3 px-6 mb-6">
                <span
                  className="text-2xl font-black tracking-[0.2em] text-gold font-display"
                >
                  {code.toUpperCase()}
                </span>
              </div>
            )}

            {/* Loading spinner */}
            {status === 'joining' && (
              <div className="flex justify-center mb-4">
                <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={status === 'joining' || auth.loading}
              className={cn(
                'w-full py-4 rounded-xl font-black text-lg font-display',
                'bg-gold text-skunk-dark',
                'hover:bg-gold-bright transition-all duration-150 active:scale-[0.97]',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
              data-testid="join-game-btn"
            >
              {status === 'joining' ? 'Joining…' : 'Accept Challenge'}
            </button>
          </>
        ) : (
          <>
            <p className="text-cream/50 text-sm mb-6">{error}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleJoin}
                className={cn(
                  'w-full py-4 rounded-xl font-black text-lg font-display',
                  'bg-gold text-skunk-dark',
                  'hover:bg-gold-bright transition-all',
                )}
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 rounded-xl text-sm font-semibold border border-white/10 text-cream/60 hover:text-cream/80 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
