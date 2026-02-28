import { useLocation, useNavigate } from 'react-router-dom';
import type { HandStatsSnapshot, DecisionSnapshot } from '@/engine/types';
import { cn } from '@/lib/utils';
import { ScoreBreakdown } from '@/components/stats/ScoreBreakdown';
import { HandByHandChart } from '@/components/stats/HandByHandChart';
import { AveragesBests } from '@/components/stats/AveragesBests';
import { DiscardStrategyReview } from '@/components/stats/DiscardStrategyReview';

interface PostGameState {
  playerIndex: number;
  totalScore: number;
  handStatsHistory: HandStatsSnapshot[];
  decisionLog: DecisionSnapshot[];
}

interface AveragesBestsData {
  avgPegging: number;
  bestPegging: number;
  avgHand: number;
  bestHand: number;
  avgCrib: number;
  bestCrib: number;
}

function computeAveragesBests(
  history: readonly HandStatsSnapshot[],
  playerIndex: number,
): AveragesBestsData {
  if (history.length === 0) {
    return {
      avgPegging: 0,
      bestPegging: 0,
      avgHand: 0,
      bestHand: 0,
      avgCrib: 0,
      bestCrib: 0,
    };
  }

  let sumPegging = 0;
  let sumHand = 0;
  let sumCrib = 0;
  let bestPegging = 0;
  let bestHand = 0;
  let bestCrib = 0;
  let dealerHandCount = 0;

  for (const snap of history) {
    const s = snap.stats[playerIndex];
    if (!s) continue;

    sumPegging += s.pegging;
    sumHand += s.hand;
    bestPegging = Math.max(bestPegging, s.pegging);
    bestHand = Math.max(bestHand, s.hand);

    // Crib: only count hands where this player was dealer
    if (snap.dealerIndex === playerIndex) {
      sumCrib += s.crib;
      bestCrib = Math.max(bestCrib, s.crib);
      dealerHandCount++;
    }
  }

  return {
    avgPegging: sumPegging / history.length,
    bestPegging,
    avgHand: sumHand / history.length,
    bestHand,
    avgCrib: dealerHandCount > 0 ? sumCrib / dealerHandCount : 0,
    bestCrib,
  };
}

export function PostGameSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as PostGameState | null;

  if (!state) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0D0D1A' }}
      >
        <div className="text-center">
          <p className="text-cream/50 mb-4">No game data available.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-xl bg-gold text-skunk-dark font-bold"
          >
            Back to Game
          </button>
        </div>
      </div>
    );
  }

  const { playerIndex, totalScore, handStatsHistory, decisionLog } = state;

  // Compute totals from handStatsHistory
  let totalPegging = 0;
  let totalHand = 0;
  let totalCrib = 0;

  for (const snap of handStatsHistory) {
    const s = snap.stats[playerIndex];
    if (!s) continue;
    totalPegging += s.pegging;
    totalHand += s.hand;
    totalCrib += s.crib;
  }

  const averagesBests = computeAveragesBests(handStatsHistory, playerIndex);
  const hasDiscardDecisions = decisionLog.some((d) => d.type === 'discard');

  return (
    <div
      className="min-h-screen overflow-y-auto"
      style={{ background: '#0D0D1A' }}
      data-testid="post-game-summary"
    >
      <div className="max-w-sm mx-auto px-4 py-8 flex flex-col gap-4">
        {/* Heading */}
        <h1
          className="text-2xl font-black text-center font-display"
          style={{ color: '#d4a843' }}
        >
          Game Summary
        </h1>

        {/* Score Breakdown */}
        <ScoreBreakdown
          totalScore={totalScore}
          totalPegging={totalPegging}
          totalHand={totalHand}
          totalCrib={totalCrib}
        />

        {/* Hand-by-Hand Chart (only if > 1 hand) */}
        {handStatsHistory.length > 1 && (
          <HandByHandChart
            history={handStatsHistory}
            playerIndex={playerIndex}
          />
        )}

        {/* Averages & Bests */}
        <AveragesBests {...averagesBests} />

        {/* Discard Strategy Review (only if discard decisions exist) */}
        {hasDiscardDecisions && (
          <DiscardStrategyReview decisions={decisionLog} />
        )}

        {/* Navigation buttons */}
        <div className="flex flex-col gap-2.5 mt-2">
          <button
            className={cn(
              'w-full rounded-xl py-3.5 px-6 font-bold text-base',
              'transition-all duration-150 active:scale-[0.97]',
              'bg-gold text-skunk-dark shadow-lg shadow-gold/20 hover:bg-gold-bright',
            )}
            onClick={() => navigate('/')}
            data-testid="play-again-btn"
          >
            Play Again
          </button>
          <button
            className={cn(
              'w-full rounded-xl py-3 px-6 font-semibold text-sm',
              'border border-white/10 text-cream/55',
              'hover:border-white/20 hover:text-cream/80 transition-all duration-150',
            )}
            onClick={() => navigate('/')}
            data-testid="main-menu-btn"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
