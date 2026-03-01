import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { fetchGameHistory, type GameHistoryItem } from '@/lib/gameApi';
import { cn } from '@/lib/utils';

export function HistoryPage() {
  const auth = useAuthContext();
  const { user, loading: authLoading } = auth;
  const navigate = useNavigate();

  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const data = await fetchGameHistory(user.id);
      if (!cancelled) {
        setGames(data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return (
    <div className="min-h-screen bg-felt-gradient px-4 py-6">
      <div className="mx-auto max-w-sm">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg px-3 py-1.5 text-sm text-cream/60 hover:text-cream/90 transition-colors"
          >
            ← Back
          </button>
          <h1 className="font-display text-xl font-bold text-gold">Game History</h1>
        </div>

        {/* Unauthenticated */}
        {!authLoading && !user && (
          <div
            data-testid="history-unauthenticated"
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-8 text-center"
          >
            <p className="text-cream/60 text-sm">Sign in to see your game history.</p>
          </div>
        )}

        {/* Loading */}
        {loading && user && (
          <div data-testid="history-loading" className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.03]"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && user && games.length === 0 && (
          <div
            data-testid="history-empty"
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-10 text-center"
          >
            <p className="font-display text-gold text-base mb-1">No games yet</p>
            <p className="text-cream/50 text-sm">Finish an online game to see your history here.</p>
          </div>
        )}

        {/* Game list */}
        {!loading && games.length > 0 && (
          <div className="space-y-3">
            {games.map((game) => (
              <GameHistoryCard key={game.gameId} game={game} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function GameHistoryCard({ game }: { game: GameHistoryItem }) {
  const date = new Date(game.playedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      data-testid={`game-card-${game.gameId}`}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4"
    >
      <div className="flex items-center justify-between">

        {/* Opponent info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-skunk-green/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-skunk-green">
              {game.opponentIsAi ? 'AI' : (game.opponentName[0] ?? '?').toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-cream text-sm font-semibold truncate">{game.opponentName}</p>
            <p className="text-cream/40 text-xs">{date}</p>
          </div>
        </div>

        {/* Score + result */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <span className="text-cream font-bold tabular-nums">{game.myScore}</span>
            <span className="text-cream/40 mx-1">–</span>
            <span className="text-cream/60 tabular-nums">{game.opponentScore}</span>
          </div>
          <span
            data-testid={`result-badge-${game.gameId}`}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-bold',
              game.iWon
                ? 'bg-skunk-green/20 text-skunk-green'
                : 'bg-red-500/15 text-red-400',
            )}
          >
            {game.iWon ? 'Win' : 'Loss'}
          </span>
        </div>

      </div>
    </div>
  );
}
