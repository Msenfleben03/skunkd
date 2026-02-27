import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { fetchStats, type PlayerStats } from '@/lib/statsApi';
import { AuthModal } from '@/components/auth/AuthModal';

function winRate(wins: number, played: number): string {
  if (played === 0) return '0%';
  return `${Math.round((wins / played) * 100)}%`;
}

export function StatsPage() {
  const navigate = useNavigate();
  const auth = useAuthContext();
  const { user, loading: authLoading } = auth;
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const userId = user?.id;
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchStats(userId);
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setStats(null);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId, authLoading]);

  const bgStyle = {
    background: 'radial-gradient(ellipse at 50% 35%, #1e4d35 0%, #0a0a16 60%, #060610 100%)',
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4" style={bgStyle}>
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-cream/50 hover:text-cream/80 transition-colors text-sm"
          data-testid="stats-back-btn"
        >
          &larr; Back
        </button>
        <h1
          className="text-lg font-black text-gold"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Your Stats
        </h1>
        <span className="text-cream/30 text-xs">{user?.displayName}</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20" data-testid="stats-loading">
          <div className="w-4 h-4 rounded-full bg-gold/60 animate-pulse" />
        </div>
      )}

      {/* Unauthenticated — prompt to sign in */}
      {!loading && !userId && (
        <div className="text-center py-16 max-w-xs" data-testid="stats-sign-in">
          <p className="text-cream/60 text-sm mb-4">
            Sign in to track your wins, streaks, and skunks.
          </p>
          <button
            className="rounded-xl py-3 px-6 font-semibold text-sm bg-gold text-skunk-dark hover:bg-gold-bright transition-colors"
            onClick={() => setShowAuthModal(true)}
            data-testid="stats-sign-in-btn"
          >
            Sign In / Create Account
          </button>
        </div>
      )}

      {!loading && !stats && userId && (
        <div className="text-center py-20" data-testid="stats-error">
          <p className="text-cream/50 text-sm">Couldn&apos;t load stats. Try again.</p>
          <button
            onClick={() => {
              if (!userId) return;
              setLoading(true);
              fetchStats(userId)
                .then(d => { setStats(d); setLoading(false); })
                .catch(() => { setStats(null); setLoading(false); });
            }}
            className="mt-3 text-gold/70 text-xs underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && stats && stats.games_played === 0 && (
        <div className="text-center py-20" data-testid="stats-empty">
          <p className="text-cream/50 text-sm italic">No games yet &mdash; deal yourself in.</p>
        </div>
      )}

      {!loading && stats && stats.games_played > 0 && (
        <div className="w-full max-w-sm space-y-3">
          {/* Win rate */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span
                  className="text-3xl font-black text-gold tabular-nums"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  <span data-testid="stats-wins">{stats.wins}</span>
                  <span className="text-cream/30 mx-1 text-xl">/</span>
                  <span data-testid="stats-losses">{stats.losses}</span>
                </span>
                <span className="text-cream/40 text-xs ml-2">W / L</span>
              </div>
              <div className="text-right">
                <span
                  className="text-2xl font-black text-cream/80 tabular-nums"
                  data-testid="stats-win-rate"
                >
                  {winRate(stats.wins, stats.games_played)}
                </span>
                <p className="text-cream/30 text-[10px]">
                  <span data-testid="stats-games-played">{stats.games_played}</span> games
                </p>
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
            <p className="text-cream/70 text-sm font-semibold">
              {stats.current_streak > 0 ? '\uD83D\uDD25 ' : ''}
              <span data-testid="stats-current-streak">{stats.current_streak}</span>-game win streak
            </p>
            <p className="text-cream/30 text-xs mt-0.5">
              Best: <span data-testid="stats-best-streak">{stats.best_streak}</span>
            </p>
          </div>

          {/* Skunk stats */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
            <p className="text-[10px] text-gold/50 uppercase tracking-widest mb-3">Skunk Record</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-black text-cream/80 tabular-nums" data-testid="stats-skunks-given">{stats.skunks_given}</p>
                <p className="text-cream/30 text-[10px]">Skunks Given</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-cream/80 tabular-nums" data-testid="stats-skunks-received">{stats.skunks_received}</p>
                <p className="text-cream/30 text-[10px]">Skunks Rec&apos;d</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-cream/80 tabular-nums" data-testid="stats-double-skunks-given">{stats.double_skunks_given}</p>
                <p className="text-cream/30 text-[10px]">Double Given</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-cream/80 tabular-nums" data-testid="stats-double-skunks-received">{stats.double_skunks_received}</p>
                <p className="text-cream/30 text-[10px]">Double Rec&apos;d</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest upgrade nudge */}
      {!loading && user?.isGuest && (
        <button
          className="mt-6 text-gold/50 hover:text-gold/80 text-xs transition-colors"
          onClick={() => setShowAuthModal(true)}
          data-testid="stats-guest-nudge"
        >
          Sign in to keep your stats across devices
        </button>
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          upgradeMode={!!user?.isGuest}
        />
      )}
    </div>
  );
}
