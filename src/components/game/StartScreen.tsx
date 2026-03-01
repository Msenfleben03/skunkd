import { cn } from '@/lib/utils';
import { ShareLink } from './ShareLink';
import { AuthModal } from '@/components/auth/AuthModal';

type OnlineStep = null | 'menu' | 'creating' | 'waiting' | 'join-input';

interface PendingOnlineGame {
  gameId: string;
  inviteCode: string;
}

export interface StartScreenProps {
  onlineStep: OnlineStep;
  setOnlineStep: (step: OnlineStep) => void;
  pendingGame: PendingOnlineGame | null;
  setPendingGame: (game: PendingOnlineGame | null) => void;
  joinCode: string;
  setJoinCode: (code: string) => void;
  onlineError: string | null;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authUser: { displayName: string; isGuest?: boolean } | null;
  authLoading: boolean;
  onStartVsAI: () => void;
  onCreateOnlineGame: () => void;
  onJoinWithCode: () => void;
  onNavigateStats: () => void;
  onNavigateHistory: () => void;
  /** Active game session from localStorage — shows Resume button when present. */
  resumeGame?: { inviteCode: string } | null;
  onResumeGame?: () => void;
  className?: string;
}

const feltOverlay = (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      opacity: 0.045,
      mixBlendMode: 'overlay' as const,
    }}
  />
);

const vignette = (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.72) 100%)' }}
  />
);

export function StartScreen({
  onlineStep,
  setOnlineStep,
  pendingGame,
  setPendingGame,
  joinCode,
  setJoinCode,
  onlineError,
  showAuthModal,
  setShowAuthModal,
  authUser,
  authLoading,
  onStartVsAI,
  onCreateOnlineGame,
  onJoinWithCode,
  onNavigateStats,
  onNavigateHistory,
  resumeGame,
  onResumeGame,
  className,
}: StartScreenProps) {
  // ── Online game creation / waiting screen ────────────────────────────────
  if (onlineStep === 'menu' || onlineStep === 'creating') {
    return (
      <div className={cn('h-screen flex flex-col items-center justify-center relative overflow-hidden', 'bg-felt-gradient', className)}>
        {feltOverlay}{vignette}
        <div className="relative z-10 text-center px-8 max-w-xs w-full animate-float-in">
          <img src="/skunkd-logo.png" alt="SKUNK'D" className="w-24 h-24 object-contain mx-auto mb-4 opacity-90" />
          <h2 className="text-xl font-black text-gold mb-6 font-display">
            Play Online
          </h2>
          {onlineError && <p className="text-red-400 text-xs mb-4">{onlineError}</p>}
          <div className="flex flex-col gap-3">
            <button
              onClick={onCreateOnlineGame}
              disabled={onlineStep === 'creating'}
              className={cn(
                'w-full py-4 rounded-xl font-black text-lg bg-gold text-skunk-dark',
                'hover:bg-gold-bright transition-all duration-150 active:scale-[0.97]',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'font-display',
              )}
              data-testid="create-game-btn"
            >
              {onlineStep === 'creating' ? 'Creating…' : 'Create Game'}
            </button>
            <button
              onClick={() => setOnlineStep('join-input')}
              className="w-full py-3 rounded-xl text-sm font-semibold border border-white/10 text-cream/70 hover:text-cream hover:border-white/20 transition-all"
            >
              Join a Game
            </button>
            <button
              onClick={() => setOnlineStep(null)}
              className="w-full py-2.5 text-xs text-cream/35 hover:text-cream/60 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Waiting for opponent after creating game ──────────────────────────────
  if (onlineStep === 'waiting' && pendingGame) {
    return (
      <div className={cn('h-screen flex flex-col items-center justify-center relative overflow-hidden', 'bg-felt-gradient', className)}>
        {feltOverlay}{vignette}
        <div className="relative z-10 text-center px-8 max-w-xs w-full animate-float-in">
          <img src="/skunkd-logo.png" alt="SKUNK'D" className="w-20 h-20 object-contain mx-auto mb-4 opacity-80" />
          <h2 className="text-xl font-black text-gold mb-2 font-display">
            Waiting for Opponent
          </h2>
          <p className="text-cream/40 text-xs mb-6">Share this code to challenge a friend:</p>
          <ShareLink inviteCode={pendingGame.inviteCode} className="mb-6" />
          <button
            onClick={() => { setOnlineStep(null); setPendingGame(null); }}
            className="w-full py-2.5 text-xs text-cream/35 hover:text-cream/60 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Join by code input ────────────────────────────────────────────────────
  if (onlineStep === 'join-input') {
    return (
      <div className={cn('h-screen flex flex-col items-center justify-center relative overflow-hidden', 'bg-felt-gradient', className)}>
        {feltOverlay}{vignette}
        <div className="relative z-10 text-center px-8 max-w-xs w-full animate-float-in">
          <img src="/skunkd-logo.png" alt="SKUNK'D" className="w-24 h-24 object-contain mx-auto mb-4 opacity-90" />
          <h2 className="text-xl font-black text-gold mb-6 font-display">
            Enter Game Code
          </h2>
          <input
            type="text"
            placeholder="ABC123"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className={cn(
              'w-full px-4 py-4 rounded-xl text-center text-2xl font-black tracking-widest mb-4 font-display',
              'bg-white/5 border border-white/10 text-gold placeholder-cream/20',
              'focus:outline-none focus:border-gold/60 transition-colors',
            )}
            data-testid="join-code-input"
            onKeyDown={e => e.key === 'Enter' && onJoinWithCode()}
          />
          <div className="flex flex-col gap-3">
            <button
              onClick={onJoinWithCode}
              disabled={joinCode.trim().length < 4}
              className={cn(
                'w-full py-4 rounded-xl font-black text-lg bg-gold text-skunk-dark font-display',
                'hover:bg-gold-bright transition-all duration-150 active:scale-[0.97]',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Join Game
            </button>
            <button
              onClick={() => setOnlineStep('menu')}
              className="w-full py-2.5 text-xs text-cream/35 hover:text-cream/60 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main start screen ─────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'h-screen flex flex-col items-center justify-center',
        'relative overflow-hidden bg-felt-gradient',
        className,
      )}
    >
      {feltOverlay}{vignette}

      <div className="relative z-10 text-center px-8 max-w-xs w-full">
        {/* SKUNK'D logo with idle float animation */}
        <div className="animate-float-in mb-3">
          <img
            src="/skunkd-logo.png"
            alt="SKUNK'D — skunk holding playing cards"
            className="skunk-idle w-56 h-56 object-contain mx-auto"
          />
        </div>

        {/* Tagline */}
        <p
          className="animate-float-in text-cream/55 italic text-sm mb-1 font-display"
          style={{ animationDelay: '0.1s' }}
        >
          The smell of failure is only one street away.
        </p>
        <p
          className="animate-float-in text-cream/25 text-[10px] mb-7 leading-relaxed"
          style={{ animationDelay: '0.18s' }}
        >
          Since 1630 — invented by a cheating poet,
          <br />
          perfected on submarines.
        </p>

        {/* Buttons */}
        <div
          className="animate-float-in flex flex-col gap-3"
          style={{ animationDelay: '0.3s' }}
        >
          {/* Resume active multiplayer game (shown when localStorage has an active session) */}
          {resumeGame && onResumeGame && (
            <button
              className={cn(
                'w-full rounded-xl py-4 px-8 font-black text-xl font-display',
                'bg-gold text-skunk-dark shadow-xl shadow-gold/30',
                'hover:bg-gold-bright hover:shadow-gold/50 hover:scale-[1.02]',
                'transition-all duration-150 active:scale-[0.97]',
              )}
              onClick={onResumeGame}
              data-testid="resume-game-btn"
            >
              ▶ Resume Game
            </button>
          )}

          {/* Primary CTA — vs AI */}
          <button
            className={cn(
              'w-full rounded-xl py-4 px-8 font-black text-xl font-display',
              'bg-gold text-skunk-dark shadow-xl shadow-gold/30',
              'hover:bg-gold-bright hover:shadow-gold/50 hover:scale-[1.02]',
              'transition-all duration-150 active:scale-[0.97]',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
            onClick={onStartVsAI}
            disabled={authLoading}
            data-testid="deal-me-in-btn"
          >
            {authLoading ? 'Loading…' : "How 'Bout a Quick Game? (Solo)"}
          </button>

          {/* Play Online */}
          <button
            className={cn(
              'w-full rounded-xl py-3 px-8 font-semibold text-sm',
              'border border-white/10 text-cream/55',
              'hover:border-white/20 hover:text-cream/80 transition-all duration-150',
            )}
            onClick={() => setOnlineStep('menu')}
            data-testid="play-online-btn"
          >
            Not a Loner? (Multiplayer)
          </button>

          {/* Stats & History */}
          <div className="flex gap-3 w-full">
            <button
              className={cn(
                'flex-1 rounded-xl py-3 px-4 font-semibold text-sm',
                'text-cream/40 hover:text-cream/60 transition-colors',
              )}
              onClick={onNavigateStats}
              data-testid="stats-btn"
            >
              My Stats
            </button>
            <button
              className={cn(
                'flex-1 rounded-xl py-3 px-4 font-semibold text-sm',
                'text-cream/40 hover:text-cream/60 transition-colors',
              )}
              onClick={onNavigateHistory}
              data-testid="history-btn"
            >
              History
            </button>
          </div>
        </div>

        {/* Auth status / sign-in link */}
        {authUser && !authUser.isGuest ? (
          <p
            className="animate-float-in text-cream/30 text-[9px] mt-4"
            style={{ animationDelay: '0.48s' }}
          >
            Signed in as {authUser.displayName}
          </p>
        ) : (
          <button
            className="animate-float-in mt-4 text-gold/50 hover:text-gold/80 text-xs transition-colors"
            style={{ animationDelay: '0.48s' }}
            onClick={() => setShowAuthModal(true)}
            data-testid="sign-in-btn"
          >
            Sign In / Create Account
          </button>
        )}

        <p
          className="animate-float-in text-cream/15 text-[9px] mt-2"
          style={{ animationDelay: '0.55s' }}
        >
          Lose by more than 31 and you'll never live it down.
        </p>
      </div>

      {/* Auth modal overlay */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
